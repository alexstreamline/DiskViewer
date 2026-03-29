import React from "react";
import { FileNode } from "../../types";
import { CATEGORY_COLORS, CATEGORY_LABELS } from "../../types";
import { formatSize, formatRelativeDate } from "../../utils/format";

interface TooltipProps {
  node: FileNode;
  totalSize: number;
  x: number;
  y: number;
  containerWidth: number;
  containerHeight: number;
}

export function Tooltip({ node, totalSize, x, y, containerWidth, containerHeight }: TooltipProps) {
  const pct = totalSize > 0 ? ((node.size / totalSize) * 100).toFixed(1) : "0";
  const color = CATEGORY_COLORS[node.category];
  const label = CATEGORY_LABELS[node.category];

  // Keep tooltip inside container
  const tooltipW = 240;
  const tooltipH = 160;
  const left = x + tooltipW > containerWidth ? x - tooltipW - 8 : x + 12;
  const top = y + tooltipH > containerHeight ? y - tooltipH - 8 : y + 12;

  return (
    <div
      style={{
        position: "absolute",
        left,
        top,
        background: "#1a1a2e",
        border: "1px solid #2a2a3e",
        borderRadius: 6,
        padding: "10px 12px",
        width: tooltipW,
        pointerEvents: "none",
        zIndex: 100,
        fontSize: 12,
      }}
    >
      <div style={{ fontWeight: 700, fontSize: 13, color: "#e0e0ff", marginBottom: 6, wordBreak: "break-all" }}>
        {node.name}
      </div>
      <Row label="Размер" value={formatSize(node.size)} />
      <Row label="% от корня" value={`${pct}%`} />
      <Row label="Тип" value={<span style={{ color }}>{label}</span>} />
      {node.extension && <Row label="Расширение" value={`.${node.extension}`} />}
      <Row label="Изменён" value={formatRelativeDate(node.last_modified)} />
      <div style={{ marginTop: 6, fontSize: 10, color: "#444", wordBreak: "break-all" }}>
        {node.path}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginBottom: 3 }}>
      <span style={{ color: "#555" }}>{label}</span>
      <span style={{ color: "#ccc" }}>{value}</span>
    </div>
  );
}
