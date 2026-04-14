import {
  BarChart, Bar, XAxis, YAxis, Tooltip, Cell, ResponsiveContainer,
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
    return <div style={{ padding: 16, color: "var(--text-hint)", fontSize: 12 }}>Нет данных</div>;
  }

  const data = stats.by_extension.slice(0, 12).map((e) => ({
    ext: `.${e.extension}`,
    size: e.size,
    count: e.count,
  }));

  return (
    <div style={{ padding: "12px 8px", height: "100%", boxSizing: "border-box" }}>
      <ResponsiveContainer width="100%" height="90%">
        <BarChart data={data} margin={{ left: 4, right: 8, top: 4, bottom: 40 }}>
          <XAxis
            dataKey="ext"
            tick={<RotatedTick />}
            axisLine={false}
            tickLine={false}
            interval={0}
          />
          <YAxis
            tickFormatter={formatSize}
            tick={{ fontSize: 9, fill: "var(--text-hint)" }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            formatter={(value: number, _name: string, props: { payload?: { ext?: string; count?: number } }) => [
              `${formatSize(value)} (${props.payload?.count?.toLocaleString()} файлов)`,
              props.payload?.ext ?? "",
            ]}
            contentStyle={{ background: "var(--bg-surface)", border: "1px solid var(--border)", fontSize: 11 }}
            itemStyle={{ color: "var(--text-primary)" }}
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

function RotatedTick(props: {
  x?: number; y?: number; payload?: { value: string };
}) {
  const { x = 0, y = 0, payload } = props;
  return (
    <g transform={`translate(${x},${y})`}>
      <text
        x={0} y={0} dy={4}
        textAnchor="end"
        fill="var(--text-hint)"
        fontSize={9}
        transform="rotate(-35)"
      >
        {payload?.value}
      </text>
    </g>
  );
}
