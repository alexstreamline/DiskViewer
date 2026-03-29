import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  ResponsiveContainer,
} from "recharts";
import { useDiskStore } from "../../store/diskStore";
import { CATEGORY_COLORS, FileCategory } from "../../types";
import { formatSize, truncateEnd } from "../../utils/format";

export default function TopFilesBar() {
  const stats = useDiskStore((s) => s.stats);

  if (!stats) {
    return (
      <div style={{ padding: 16, color: "#555", fontSize: 12 }}>Нет данных</div>
    );
  }

  const data = stats.largest_files.slice(0, 10).map((f) => ({
    name: truncateEnd(f.name, 22),
    fullName: f.name,
    size: f.size,
    path: f.path,
    category: f.category,
  }));

  return (
    <div style={{ padding: "12px 8px" }}>
      <div style={{ fontSize: 11, color: "#666", marginBottom: 8, paddingLeft: 4 }}>
        Топ-10 крупнейших файлов
      </div>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={data} layout="vertical" margin={{ left: 4, right: 12, top: 4, bottom: 4 }}>
          <XAxis
            type="number"
            tickFormatter={formatSize}
            tick={{ fontSize: 9, fill: "#555" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            type="category"
            dataKey="name"
            width={90}
            tick={{ fontSize: 10, fill: "#aaa" }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            formatter={(value: number) => formatSize(value)}
            labelFormatter={(_: unknown, payload: { payload?: { fullName?: string; path?: string } }[]) => {
              const p = payload?.[0]?.payload;
              return p ? `${p.fullName}\n${p.path}` : "";
            }}
            contentStyle={{ background: "#1a1a2e", border: "1px solid #2a2a3e", fontSize: 11 }}
            itemStyle={{ color: "#ccc" }}
          />
          <Bar dataKey="size" radius={[0, 3, 3, 0]}>
            {data.map((entry, i) => (
              <Cell
                key={i}
                fill={CATEGORY_COLORS[entry.category as FileCategory]}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
