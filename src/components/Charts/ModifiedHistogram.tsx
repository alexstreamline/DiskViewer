import React, { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { useDiskStore } from "../../store/diskStore";
import { FlatFile } from "../../types";
import { formatSize } from "../../utils/format";

const BUCKETS = [
  { label: "Сегодня",  maxDays: 1 },
  { label: "Неделя",   maxDays: 7 },
  { label: "Месяц",    maxDays: 30 },
  { label: "3 мес.",   maxDays: 90 },
  { label: "Полгода",  maxDays: 180 },
  { label: "Год",      maxDays: 365 },
  { label: "2 года",   maxDays: 730 },
  { label: "5 лет",    maxDays: 1825 },
  { label: "Старше",   maxDays: Infinity },
];

function buildHistogram(files: FlatFile[]) {
  const now = Date.now() / 1000;
  const buckets = BUCKETS.map((b) => ({ label: b.label, count: 0, size: 0, maxDays: b.maxDays }));

  for (const f of files) {
    const ageDays = (now - f.last_modified) / 86400;
    for (const b of buckets) {
      if (ageDays < b.maxDays) {
        b.count++;
        b.size += f.size;
        break;
      }
    }
  }

  return buckets.filter((b) => b.count > 0);
}

export default function ModifiedHistogram() {
  const stats = useDiskStore((s) => s.stats);

  const histData = useMemo(() => {
    if (!stats) return [];
    const all = [...stats.largest_files, ...stats.oldest_files, ...stats.newest_files];
    const deduped = Array.from(new Map(all.map((f) => [f.path, f])).values());
    return buildHistogram(deduped);
  }, [stats]);

  if (!stats) {
    return (
      <div style={{ padding: 16, color: "#555", fontSize: 12 }}>Нет данных</div>
    );
  }

  return (
    <div style={{ padding: "12px 8px" }}>
      <div style={{ fontSize: 11, color: "#666", marginBottom: 8, paddingLeft: 4 }}>
        Возраст файлов
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={histData} margin={{ left: 4, right: 8, top: 4, bottom: 4 }}>
          <XAxis
            dataKey="label"
            tick={{ fontSize: 9, fill: "#555" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 9, fill: "#555" }}
            tickFormatter={(v: number) => v.toLocaleString()}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            formatter={(value: number, name: string) =>
              name === "size" ? formatSize(value) : value.toLocaleString()
            }
            contentStyle={{ background: "#1a1a2e", border: "1px solid #2a2a3e", fontSize: 11 }}
            itemStyle={{ color: "#ccc" }}
          />
          <Bar dataKey="count" radius={[3, 3, 0, 0]}>
            {histData.map((entry, i) => (
              <Cell
                key={i}
                fill={entry.maxDays > 365 ? "#EF9F27" : "#1D9E75"}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <div style={{ fontSize: 10, color: "#666", marginTop: 6, paddingLeft: 4 }}>
        <span style={{ color: "#EF9F27" }}>■</span> старше года &nbsp;
        <span style={{ color: "#1D9E75" }}>■</span> новее года
      </div>
    </div>
  );
}
