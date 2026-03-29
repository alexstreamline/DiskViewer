import React from "react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useDiskStore } from "../../store/diskStore";
import { CATEGORY_COLORS, CATEGORY_LABELS, FileCategory } from "../../types";
import { formatSize } from "../../utils/format";

export default function CategoryPie() {
  const stats = useDiskStore((s) => s.stats);
  const filter = useDiskStore((s) => s.filter);
  const setFilter = useDiskStore((s) => s.setFilter);

  if (!stats) {
    return (
      <div style={{ padding: 16, color: "#555", fontSize: 12 }}>Нет данных</div>
    );
  }

  const data = stats.by_category.map((c) => ({
    name: c.label,
    value: c.size,
    count: c.count,
    category: c.category,
  }));

  const activeCategory = filter.category;

  const handleClick = (entry: { category: FileCategory }) => {
    if (activeCategory === entry.category) {
      setFilter({ category: undefined });
    } else {
      setFilter({ category: entry.category });
    }
  };

  return (
    <div style={{ padding: "12px 8px" }}>
      <div style={{ fontSize: 11, color: "#666", marginBottom: 8, paddingLeft: 4 }}>
        Распределение по типам
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={50}
            outerRadius={80}
            dataKey="value"
            onClick={handleClick}
          >
            {data.map((entry) => (
              <Cell
                key={entry.category}
                fill={CATEGORY_COLORS[entry.category as FileCategory]}
                opacity={
                  !activeCategory || activeCategory === entry.category ? 1 : 0.3
                }
                style={{ cursor: "pointer" }}
              />
            ))}
          </Pie>
          <Tooltip
            formatter={(value: number) => formatSize(value)}
            contentStyle={{ background: "#1a1a2e", border: "1px solid #2a2a3e", fontSize: 11 }}
            itemStyle={{ color: "#ccc" }}
          />
        </PieChart>
      </ResponsiveContainer>

      {/* Legend list */}
      <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 8 }}>
        {data.map((entry) => {
          const pct = stats.total_size > 0
            ? ((entry.value / stats.total_size) * 100).toFixed(1)
            : "0";
          return (
            <div
              key={entry.category}
              onClick={() => handleClick(entry)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                cursor: "pointer",
                opacity: !activeCategory || activeCategory === entry.category ? 1 : 0.4,
                padding: "2px 4px",
                borderRadius: 3,
              }}
            >
              <div
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 2,
                  background: CATEGORY_COLORS[entry.category as FileCategory],
                  flexShrink: 0,
                }}
              />
              <span style={{ fontSize: 11, color: "#aaa", flex: 1 }}>{entry.name}</span>
              <span style={{ fontSize: 10, color: "#666" }}>{pct}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
