import React, { useState } from "react";
import { useDiskStore } from "../../store/diskStore";
import { FileCategory, CATEGORY_LABELS } from "../../types";

const CATEGORIES: FileCategory[] = [
  "image", "video", "audio", "document", "code",
  "archive", "executable", "data", "other",
];

const SIZE_OPTIONS = [
  { label: "Любой размер", value: undefined },
  { label: "> 1 MB",       value: 1_000_000 },
  { label: "> 10 MB",      value: 10_000_000 },
  { label: "> 100 MB",     value: 100_000_000 },
  { label: "> 1 GB",       value: 1_000_000_000 },
];

const AGE_OPTIONS = [
  { label: "Любой возраст", value: undefined },
  { label: "> 30 дней",     value: 30 },
  { label: "> 180 дней",    value: 180 },
  { label: "> 1 года",      value: 365 },
  { label: "> 2 лет",       value: 730 },
  { label: "> 5 лет",       value: 1825 },
];

const selectStyle: React.CSSProperties = {
  background: "#0d0d1a",
  color: "#ccc",
  border: "1px solid #2a2a3e",
  borderRadius: 4,
  padding: "3px 6px",
  fontSize: 11,
  cursor: "pointer",
};

const inputStyle: React.CSSProperties = {
  background: "#0d0d1a",
  color: "#ccc",
  border: "1px solid #2a2a3e",
  borderRadius: 4,
  padding: "3px 8px",
  fontSize: 11,
  outline: "none",
  width: 160,
};

export default function FilterPanel() {
  const filter = useDiskStore((s) => s.filter);
  const setFilter = useDiskStore((s) => s.setFilter);
  const resetFilter = useDiskStore((s) => s.resetFilter);
  const totalFiles = useDiskStore((s) => s.totalFiles);
  const files = useDiskStore((s) => s.files);

  const [nameInput, setNameInput] = useState("");

  const hasFilter =
    filter.category !== undefined ||
    filter.min_size !== undefined ||
    filter.older_than_days !== undefined ||
    filter.name_contains !== undefined;

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setNameInput(val);
    if (val.length === 0) {
      setFilter({ name_contains: undefined });
    } else if (val.length >= 2) {
      setFilter({ name_contains: val });
    }
  };

  const handleReset = () => {
    setNameInput("");
    resetFilter();
  };

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "6px 12px",
        background: "#0d0d1a",
        borderBottom: "1px solid #2a2a3e",
        flexShrink: 0,
        flexWrap: "wrap",
      }}
    >
      <input
        value={nameInput}
        onChange={handleNameChange}
        placeholder="Поиск по имени…"
        style={inputStyle}
      />

      <select
        value={filter.category ?? ""}
        onChange={(e) =>
          setFilter({ category: (e.target.value as FileCategory) || undefined })
        }
        style={selectStyle}
      >
        <option value="">Все типы</option>
        {CATEGORIES.map((cat) => (
          <option key={cat} value={cat}>
            {CATEGORY_LABELS[cat]}
          </option>
        ))}
      </select>

      <select
        value={filter.min_size ?? ""}
        onChange={(e) =>
          setFilter({ min_size: e.target.value ? Number(e.target.value) : undefined })
        }
        style={selectStyle}
      >
        {SIZE_OPTIONS.map((o) => (
          <option key={o.label} value={o.value ?? ""}>
            {o.label}
          </option>
        ))}
      </select>

      <select
        value={filter.older_than_days ?? ""}
        onChange={(e) =>
          setFilter({
            older_than_days: e.target.value ? Number(e.target.value) : undefined,
          })
        }
        style={selectStyle}
      >
        {AGE_OPTIONS.map((o) => (
          <option key={o.label} value={o.value ?? ""}>
            {o.label}
          </option>
        ))}
      </select>

      {hasFilter && (
        <button
          onClick={handleReset}
          style={{
            background: "none",
            border: "1px solid #E24B4A",
            color: "#E24B4A",
            borderRadius: 4,
            padding: "3px 10px",
            fontSize: 11,
            cursor: "pointer",
          }}
        >
          Сбросить
        </button>
      )}

      <span style={{ marginLeft: "auto", fontSize: 10, color: "#666" }}>
        {files.length.toLocaleString()} / {totalFiles.toLocaleString()} файлов
      </span>
    </div>
  );
}
