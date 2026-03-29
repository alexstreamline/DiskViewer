import React from "react";
import { useDiskStore, useBreadcrumb } from "../store/diskStore";

export default function Breadcrumb() {
  const crumbs = useBreadcrumb();
  const setCurrentPath = useDiskStore((s) => s.setCurrentPath);
  const currentPath = useDiskStore((s) => s.currentPath);

  if (crumbs.length === 0) return null;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 4,
        padding: "4px 12px",
        flexShrink: 0,
        fontSize: 11,
        color: "#888",
        background: "#0d0d1a",
        borderBottom: "1px solid #2a2a3e",
        flexWrap: "wrap",
      }}
    >
      {currentPath !== null && (
        <button
          onClick={() => {
            const parentCrumb = crumbs[crumbs.length - 2];
            setCurrentPath(parentCrumb ? parentCrumb.path : null);
          }}
          style={{
            background: "none",
            border: "none",
            color: "#9FE1CB",
            cursor: "pointer",
            fontSize: 13,
            marginRight: 4,
          }}
          title="Вверх"
        >
          ↑
        </button>
      )}

      {crumbs.map((node, i) => (
        <React.Fragment key={node.path}>
          {i > 0 && <span style={{ color: "#444" }}>/</span>}
          <button
            onClick={() => setCurrentPath(i === 0 ? null : node.path)}
            style={{
              background: "none",
              border: "none",
              color: i === crumbs.length - 1 ? "#e0e0ff" : "#9FE1CB",
              cursor: i === crumbs.length - 1 ? "default" : "pointer",
              fontSize: 11,
              padding: "1px 2px",
            }}
          >
            {node.name}
          </button>
        </React.Fragment>
      ))}
    </div>
  );
}
