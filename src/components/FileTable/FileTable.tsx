import React, { useCallback, useEffect, useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { invoke } from "@tauri-apps/api/core";
import { useDiskStore } from "../../store/diskStore";
import { FlatFile } from "../../types";
import { CATEGORY_LABELS, FileCategory, CATEGORY_COLORS } from "../../types";
import { formatSize, formatDate } from "../../utils/format";

const ROW_HEIGHT = 32;

const COLUMNS = [
  { key: "name",     label: "Имя",       width: 260 },
  { key: "category", label: "Тип",       width: 100 },
  { key: "extension",label: "Расш.",     width: 60 },
  { key: "size",     label: "Размер",    width: 90 },
  { key: "modified", label: "Изменён",   width: 110 },
  { key: "path",     label: "Путь",      width: 300 },
] as const;

type ColKey = (typeof COLUMNS)[number]["key"];

export default function FileTable() {
  const files = useDiskStore((s) => s.files);
  const totalFiles = useDiskStore((s) => s.totalFiles);
  const page = useDiskStore((s) => s.page);
  const isLoadingFiles = useDiskStore((s) => s.isLoadingFiles);
  const sortBy = useDiskStore((s) => s.sortBy);
  const sortDesc = useDiskStore((s) => s.sortDesc);
  const setSortBy = useDiskStore((s) => s.setSortBy);
  const loadFiles = useDiskStore((s) => s.loadFiles);
  const tree = useDiskStore((s) => s.tree);

  const parentRef = useRef<HTMLDivElement>(null);

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
    if (
      scrollTop + clientHeight >= scrollHeight - 200 &&
      files.length < totalFiles &&
      !isLoadingFiles
    ) {
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

  const handleDoubleClick = async (file: FlatFile) => {
    try {
      await invoke("open_in_explorer", { path: file.path });
    } catch (e) {
      console.error(e);
    }
  };

  if (!tree) return null;

  const items = virtualizer.getVirtualItems();
  const paddingTop = items.length > 0 ? items[0].start : 0;
  const paddingBottom =
    items.length > 0
      ? virtualizer.getTotalSize() - items[items.length - 1].end
      : 0;

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          background: "#161625",
          borderBottom: "1px solid #2a2a3e",
          flexShrink: 0,
        }}
      >
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
                color: isActive ? "#9FE1CB" : "#666",
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
                  background: isEven ? "#0f0f1a" : "#111120",
                  cursor: "pointer",
                  borderBottom: "1px solid #1a1a2e",
                }}
                onDoubleClick={() => handleDoubleClick(file)}
              >
                <Cell width={260} style={{ color: "#ccc", fontWeight: 500 }}>
                  {file.name}
                </Cell>
                <Cell width={100}>
                  <span style={{ color: CATEGORY_COLORS[file.category as FileCategory], fontSize: 11 }}>
                    {CATEGORY_LABELS[file.category as FileCategory]}
                  </span>
                </Cell>
                <Cell width={60} style={{ color: "#666" }}>
                  {file.extension ? `.${file.extension}` : "—"}
                </Cell>
                <Cell width={90} style={{ color: "#e0e0ff", textAlign: "right" }}>
                  {formatSize(file.size)}
                </Cell>
                <Cell width={110} style={{ color: "#888" }}>
                  {formatDate(file.last_modified)}
                </Cell>
                <Cell width={300} style={{ color: "#444", fontSize: 10 }}>
                  {file.path}
                </Cell>
              </div>
            );
          })}
          <div style={{ height: paddingBottom }} />
        </div>
      </div>

      {isLoadingFiles && (
        <div
          style={{
            padding: "4px 12px",
            fontSize: 10,
            color: "#555",
            borderTop: "1px solid #2a2a3e",
          }}
        >
          Загрузка…
        </div>
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
    <div
      style={{
        width,
        flexShrink: 0,
        padding: "0 8px",
        fontSize: 12,
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
        ...style,
      }}
    >
      {children}
    </div>
  );
}
