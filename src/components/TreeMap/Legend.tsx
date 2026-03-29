import React from "react";
import { useDiskStore } from "../../store/diskStore";
import { CATEGORY_COLORS, CATEGORY_LABELS, FileCategory } from "../../types";

export function Legend() {
  const stats = useDiskStore((s) => s.stats);
  if (!stats) return null;

  const presentCategories = stats.by_category.map((c) => c.category);

  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: "4px 12px",
        padding: "4px 12px",
        flexShrink: 0,
      }}
    >
      {presentCategories.map((cat) => (
        <div
          key={cat}
          style={{ display: "flex", alignItems: "center", gap: 5 }}
        >
          <div
            style={{
              width: 10,
              height: 10,
              borderRadius: 2,
              background: CATEGORY_COLORS[cat as FileCategory],
              flexShrink: 0,
            }}
          />
          <span style={{ fontSize: 11, color: "#aaa" }}>
            {CATEGORY_LABELS[cat as FileCategory]}
          </span>
        </div>
      ))}
    </div>
  );
}
