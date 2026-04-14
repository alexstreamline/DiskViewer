import { useDiskStore } from "../store/diskStore";
import { formatSize, truncateEnd } from "../utils/format";

interface CardProps {
  title: string;
  value: string;
  subtitle?: string;
  accent?: string;
}

function Card({ title, value, subtitle, accent }: CardProps) {
  return (
    <div
      style={{
        background: "#1e1e35",
        border: "1px solid #2a2a3e",
        borderRadius: 6,
        padding: "8px 12px",
      }}
    >
      <div style={{ fontSize: 10, color: "#666", marginBottom: 4 }}>{title}</div>
      <div style={{ fontSize: 20, fontWeight: 700, color: accent ?? "#e0e0ff" }}>{value}</div>
      {subtitle && (
        <div style={{ fontSize: 10, color: "#888", marginTop: 2 }}>{subtitle}</div>
      )}
    </div>
  );
}

export default function StatCards() {
  const stats = useDiskStore((s) => s.stats);
  if (!stats) return null;

  const largestFile = stats.largest_files[0];
  const uniqueExtensions = new Set(
    stats.largest_files.concat(stats.oldest_files, stats.newest_files).map((f) => f.extension)
  ).size;

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(4, 1fr)",
        gap: 8,
        padding: "8px 12px",
        flexShrink: 0,
      }}
    >
      <Card
        title="Всего файлов"
        value={stats.total_files.toLocaleString()}
        subtitle={`${stats.total_dirs.toLocaleString()} папок`}
      />
      <Card
        title="Занято"
        value={formatSize(stats.total_size)}
      />
      <Card
        title="Крупнейший файл"
        value={largestFile ? formatSize(largestFile.size) : "—"}
        subtitle={largestFile ? truncateEnd(largestFile.name, 24) : undefined}
        accent="#EF9F27"
      />
      <Card
        title="Типов файлов"
        value={String(stats.by_category.length)}
        subtitle={`${uniqueExtensions} расширений`}
      />
    </div>
  );
}
