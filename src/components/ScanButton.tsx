import React from "react";
import { useScan } from "../hooks/useScan";
import { truncateMiddle } from "../utils/format";

export default function ScanButton() {
  const { startScan, cancelScan, isScanning, progress, error, scanPath } = useScan();

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "8px 12px",
        background: "#0d0d1a",
        borderBottom: "1px solid #2a2a3e",
        flexShrink: 0,
      }}
    >
      {!isScanning ? (
        <button
          onClick={startScan}
          style={{
            padding: "6px 16px",
            background: "#0F6E56",
            color: "#9FE1CB",
            border: "none",
            borderRadius: 4,
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
            background: "#993C1D",
            color: "#ffaa88",
            border: "none",
            borderRadius: 4,
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
          <div style={{ fontSize: 12, color: "#888" }}>
            <span style={{ color: "#9FE1CB", fontWeight: 600 }}>
              {progress.files_scanned.toLocaleString()}
            </span>{" "}
            файлов &nbsp;·&nbsp;
            <span style={{ color: "#9FE1CB" }}>
              {(progress.bytes_scanned / 1024 / 1024).toFixed(1)} MB
            </span>
          </div>
          <div style={{ fontSize: 10, color: "#555" }}>
            {truncateMiddle(progress.current_path, 60)}
          </div>
        </div>
      )}

      {!isScanning && scanPath && !progress && (
        <div style={{ fontSize: 11, color: "#888" }}>
          {truncateMiddle(scanPath, 80)}
        </div>
      )}

      {error && (
        <div style={{ fontSize: 11, color: "#E24B4A" }}>{error}</div>
      )}
    </div>
  );
}
