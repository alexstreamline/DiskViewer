import { useDiskStore } from "../store/diskStore";
import { truncateMiddle } from "../utils/format";

export default function ScanButton() {
  const startScan = useDiskStore((s) => s.startScan);
  const cancelScan = useDiskStore((s) => s.cancelScan);
  const isScanning = useDiskStore((s) => s.isScanning);
  const progress = useDiskStore((s) => s.progress);
  const error = useDiskStore((s) => s.error);
  const scanPath = useDiskStore((s) => s.scanPath);

  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      gap: 12,
      padding: "8px 12px",
      background: "var(--bg-secondary)",
      borderBottom: "1px solid var(--border)",
      flexShrink: 0,
    }}>
      {!isScanning ? (
        <button
          onClick={startScan}
          style={{
            padding: "6px 16px",
            background: "var(--accent)",
            color: "#fff",
            border: "none",
            borderRadius: 6,
            fontSize: 13,
            cursor: "pointer",
            fontWeight: 600,
          }}
        >
          Выбрать папку
        </button>
      ) : (
        <button
          onClick={cancelScan}
          style={{
            padding: "6px 16px",
            background: "var(--danger-bg)",
            color: "var(--danger)",
            border: "1px solid var(--danger)",
            borderRadius: 6,
            fontSize: 13,
            cursor: "pointer",
            fontWeight: 600,
          }}
        >
          Отмена
        </button>
      )}

      {isScanning && progress && (
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
            <span style={{ color: "var(--accent-hover)", fontWeight: 600 }}>
              {progress.files_scanned.toLocaleString()}
            </span>{" "}
            файлов &nbsp;·&nbsp;
            <span style={{ color: "var(--accent-hover)" }}>
              {(progress.bytes_scanned / 1024 / 1024).toFixed(1)} MB
            </span>
          </div>
          <div style={{ fontSize: 10, color: "var(--text-hint)" }}>
            {truncateMiddle(progress.current_path, 60)}
          </div>
        </div>
      )}

      {!isScanning && scanPath && (
        <div style={{ fontSize: 11, color: "var(--text-hint)" }}>
          {truncateMiddle(scanPath, 80)}
        </div>
      )}

      {error && (
        <div style={{ fontSize: 11, color: "var(--danger)" }}>{error}</div>
      )}
    </div>
  );
}
