import { useCallback, useEffect, useRef, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useDiskStore } from "../../store/diskStore";
import { FlatFile, CATEGORY_LABELS, FileCategory, CATEGORY_COLORS } from "../../types";
import { formatSize, formatDate } from "../../utils/format";
import { ContextMenu } from "./ContextMenu";

const ROW_HEIGHT = 32;

const COLUMNS = [
  { key: "name",      label: "Имя",     width: 260 },
  { key: "category",  label: "Тип",     width: 100 },
  { key: "extension", label: "Расш.",   width: 60  },
  { key: "size",      label: "Размер",  width: 90  },
  { key: "modified",  label: "Изменён", width: 110 },
  { key: "path",      label: "Путь",    width: 300 },
] as const;

type ColKey = (typeof COLUMNS)[number]["key"];

interface CtxMenu { file: FlatFile; x: number; y: number }

export default function FileTable() {
  const files = useDiskStore((s) => s.files);
  const totalFiles = useDiskStore((s) => s.totalFiles);
  const page = useDiskStore((s) => s.page);
  const isLoadingFiles = useDiskStore((s) => s.isLoadingFiles);
  const sortBy = useDiskStore((s) => s.sortBy);
  const sortDesc = useDiskStore((s) => s.sortDesc);
  const setSortBy = useDiskStore((s) => s.setSortBy);
  const loadFiles = useDiskStore((s) => s.loadFiles);

  const parentRef = useRef<HTMLDivElement>(null);
  const [ctxMenu, setCtxMenu] = useState<CtxMenu | null>(null);

  const virtualizer = useVirtualizer({
    count: files.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 10,
  });

  const handleScroll = useCallback(() => {
    const el = parentRef.current;
    if (!el) return;
    const { scrollTop, clientHeight, scrollHeight } = el;
    if (scrollTop + clientHeight >= scrollHeight - 200 && files.length < totalFiles && !isLoadingFiles) {
      loadFiles(page + 1);
    }
  }, [files.length, totalFiles, isLoadingFiles, loadFiles, page]);

  useEffect(() => {
    const el = parentRef.current;
    if (!el) return;
    el.addEventListener("scroll", handleScroll, { passive: true });
    return () => el.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  const handleHeaderClick = (col: ColKey) => {
    const colToSort = col === "modified" ? "modified" : col === "name" ? "name" : "size";
    if (colToSort === sortBy) {
      setSortBy(sortBy, !sortDesc);
    } else {
      setSortBy(colToSort as "size" | "name" | "modified", true);
    }
  };

  const handleContextMenu = (e: React.MouseEvent, file: FlatFile) => {
    e.preventDefault();
    setCtxMenu({ file, x: e.clientX, y: e.clientY });
  };

  const items = virtualizer.getVirtualItems();
  const paddingTop = items.length > 0 ? items[0].start : 0;
  const paddingBottom = items.length > 0 ? virtualizer.getTotalSize() - items[items.length - 1].end : 0;

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {/* Header */}
      <div style={{
        display: "flex",
        background: "var(--bg-secondary)",
        borderBottom: "1px solid var(--border)",
        flexShrink: 0,
      }}>
        {COLUMNS.map((col) => {
          const colSort = col.key === "modified" ? "modified" : col.key === "name" ? "name" : "size";
          const isActive = colSort === sortBy;
          return (
            <div
              key={col.key}
              onClick={() => handleHeaderClick(col.key)}
              style={{
                width: col.width,
                flexShrink: 0,
                padding: "6px 8px",
                fontSize: 11,
                color: isActive ? "var(--accent-hover)" : "var(--text-hint)",
                cursor: "pointer",
                userSelect: "none",
                display: "flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              {col.label}
              {isActive && <span style={{ fontSize: 9 }}>{sortDesc ? "▼" : "▲"}</span>}
            </div>
          );
        })}
      </div>

      {/* Rows */}
      <div ref={parentRef} style={{ flex: 1, overflowY: "auto", overflowX: "auto" }}>
        <div style={{ height: virtualizer.getTotalSize(), position: "relative" }}>
          <div style={{ height: paddingTop }} />
          {items.map((vRow) => {
            const file = files[vRow.index];
            if (!file) return null;
            const isEven = vRow.index % 2 === 0;
            return (
              <div
                key={vRow.key}
                style={{
                  height: ROW_HEIGHT,
                  display: "flex",
                  alignItems: "center",
                  background: isEven ? "var(--bg-primary)" : "var(--bg-secondary)",
                  cursor: "pointer",
                  borderBottom: "1px solid var(--border)",
                }}
                onContextMenu={(e) => handleContextMenu(e, file)}
              >
                <Cell width={260} style={{ color: "var(--text-primary)", fontWeight: 500 }}>
                  {file.name}
                </Cell>
                <Cell width={100}>
                  <span style={{ color: CATEGORY_COLORS[file.category as FileCategory], fontSize: 11 }}>
                    {CATEGORY_LABELS[file.category as FileCategory]}
                  </span>
                </Cell>
                <Cell width={60} style={{ color: "var(--text-hint)" }}>
                  {file.extension ? `.${file.extension}` : "—"}
                </Cell>
                <Cell width={90} style={{ color: "var(--text-primary)", textAlign: "right" }}>
                  {formatSize(file.size)}
                </Cell>
                <Cell width={110} style={{ color: "var(--text-muted)" }}>
                  {formatDate(file.last_modified)}
                </Cell>
                <Cell width={300} style={{ color: "var(--text-hint)", fontSize: 10 }}>
                  {file.path}
                </Cell>
              </div>
            );
          })}
          <div style={{ height: paddingBottom }} />
        </div>
      </div>

      {isLoadingFiles && (
        <div style={{ padding: "4px 12px", fontSize: 10, color: "var(--text-hint)", borderTop: "1px solid var(--border)" }}>
          Загрузка…
        </div>
      )}

      {ctxMenu && (
        <ContextMenu
          file={ctxMenu.file}
          x={ctxMenu.x}
          y={ctxMenu.y}
          onClose={() => setCtxMenu(null)}
        />
      )}
    </div>
  );
}

function Cell({
  children,
  width,
  style,
}: {
  children: React.ReactNode;
  width: number;
  style?: React.CSSProperties;
}) {
  return (
    <div style={{
      width,
      flexShrink: 0,
      padding: "0 8px",
      fontSize: 12,
      overflow: "hidden",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap",
      ...style,
    }}>
      {children}
    </div>
  );
}
