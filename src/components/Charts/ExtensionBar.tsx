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
import { formatSize } from "../../utils/format";

const COLORS = [
  "#1D9E75", "#378ADD", "#7F77DD", "#EF9F27", "#5DCAA5",
  "#D85A30", "#E24B4A", "#888780", "#B4B2A9", "#4DAEEA",
  "#A878DD", "#F0C040",
];

export default function ExtensionBar() {
  const stats = useDiskStore((s) => s.stats);

  if (!stats) {
    return (
      <div style={{ padding: 16, color: "#555", fontSize: 12 }}>Нет данных</div>
    );
  }

  const data = stats.by_extension.slice(0, 12).map((e) => ({
    ext: `.${e.extension}`,
    size: e.size,
    count: e.count,
  }));

  return (
    <div style={{ padding: "12px 8px" }}>
      <div style={{ fontSize: 11, color: "#666", marginBottom: 8, paddingLeft: 4 }}>
        Топ расширений по размеру
      </div>
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={data} margin={{ left: 4, right: 8, top: 4, bottom: 40 }}>
          <XAxis
            dataKey="ext"
            tick={{ fontSize: 9, fill: "#555", angle: -35, textAnchor: "end" }}
            axisLine={false}
            tickLine={false}
            interval={0}
          />
          <YAxis
            tickFormatter={formatSize}
            tick={{ fontSize: 9, fill: "#555" }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            formatter={(value: number, name: string, props: { payload?: { ext?: string; count?: number } }) => [
              `${formatSize(value)} (${props.payload?.count?.toLocaleString()} файлов)`,
              props.payload?.ext ?? "",
            ]}
            contentStyle={{ background: "#1a1a2e", border: "1px solid #2a2a3e", fontSize: 11 }}
            itemStyle={{ color: "#ccc" }}
          />
          <Bar dataKey="size" radius={[3, 3, 0, 0]}>
            {data.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
