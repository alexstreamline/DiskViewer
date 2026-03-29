import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as d3 from "d3";
import { useDiskStore, useCurrentNode } from "../../store/diskStore";
import { FileNode } from "../../types";
import { CATEGORY_COLORS } from "../../types";
import { formatSize, truncateEnd } from "../../utils/format";
import { Tooltip } from "./Tooltip";

interface TooltipState {
  x: number;
  y: number;
  node: FileNode;
}

export default function TreeMap() {
  const currentNode = useCurrentNode();
  const setCurrentPath = useDiskStore((s) => s.setCurrentPath);
  const tree = useDiskStore((s) => s.tree);

  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 400 });
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        setDimensions({ width, height });
      }
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  const layout = useMemo(() => {
    if (!currentNode) return null;
    const { width, height } = dimensions;

    const root = d3
      .hierarchy<FileNode>(currentNode, (d) => (d.is_dir ? d.children : null))
      .sum((d) => (d.is_dir ? 0 : d.size))
      .sort((a, b) => (b.value ?? 0) - (a.value ?? 0));

    d3.treemap<FileNode>()
      .size([width, height])
      .paddingOuter(4)
      .paddingTop(20)
      .paddingInner(2)
      .tile(d3.treemapSquarify)(root);

    const tiles = root.leaves();
    const dirLabels = root.descendants().filter((d) => d.depth === 1 && d.data.is_dir);

    return { tiles, dirLabels, root };
  }, [currentNode, dimensions]);

  const totalSize = tree?.size ?? 0;

  const handleMouseMove = useCallback(
    (e: React.MouseEvent, node: FileNode) => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      setTooltip({ x: e.clientX - rect.left, y: e.clientY - rect.top, node });
    },
    []
  );

  if (!layout) return null;

  return (
    <div ref={containerRef} style={{ position: "relative", width: "100%", height: "100%" }}>
      <svg width={dimensions.width} height={dimensions.height}>
        {/* File rectangles */}
        {layout.tiles.map((d) => {
          const w = (d as d3.HierarchyRectangularNode<FileNode>).x1 - (d as d3.HierarchyRectangularNode<FileNode>).x0;
          const h = (d as d3.HierarchyRectangularNode<FileNode>).y1 - (d as d3.HierarchyRectangularNode<FileNode>).y0;
          const x0 = (d as d3.HierarchyRectangularNode<FileNode>).x0;
          const y0 = (d as d3.HierarchyRectangularNode<FileNode>).y0;
          const color = CATEGORY_COLORS[d.data.category];
          const showLabel = w > 60 && h > 30;

          return (
            <g
              key={d.data.path}
              transform={`translate(${x0},${y0})`}
              onMouseEnter={(e) => handleMouseMove(e, d.data)}
              onMouseMove={(e) => handleMouseMove(e, d.data)}
              onMouseLeave={() => setTooltip(null)}
            >
              <rect width={w} height={h} fill={color} fillOpacity={0.85} />
              {showLabel && (
                <text
                  x={4}
                  y={14}
                  fill="#fff"
                  fontSize={10}
                  fontFamily="'Segoe UI', system-ui, sans-serif"
                  style={{ pointerEvents: "none" }}
                >
                  {truncateEnd(d.data.name, Math.floor(w / 6))}
                </text>
              )}
              {showLabel && h > 50 && (
                <text
                  x={4}
                  y={26}
                  fill="rgba(255,255,255,0.7)"
                  fontSize={9}
                  fontFamily="'Segoe UI', system-ui, sans-serif"
                  style={{ pointerEvents: "none" }}
                >
                  {formatSize(d.data.size)}
                </text>
              )}
            </g>
          );
        })}

        {/* Directory header bars */}
        {layout.dirLabels.map((d) => {
          const rd = d as d3.HierarchyRectangularNode<FileNode>;
          const w = rd.x1 - rd.x0;
          const pct = totalSize > 0 ? ((d.value ?? 0) / totalSize * 100).toFixed(1) : "0";
          const showLabel = w >= 40;

          return (
            <g
              key={d.data.path}
              transform={`translate(${rd.x0},${rd.y0})`}
              onClick={() => setCurrentPath(d.data.path)}
              style={{ cursor: "pointer" }}
            >
              <rect width={w} height={18} fill="#0f0f1a" fillOpacity={0.75} />
              {showLabel && (
                <text
                  x={4}
                  y={13}
                  fontSize={10}
                  fontFamily="'Segoe UI', system-ui, sans-serif"
                  style={{ pointerEvents: "none" }}
                >
                  <tspan fill="#9FE1CB">{truncateEnd(d.data.name, Math.floor(w / 7))}</tspan>
                  <tspan fill="#555"> {pct}%</tspan>
                </text>
              )}
            </g>
          );
        })}
      </svg>

      {tooltip && (
        <Tooltip
          node={tooltip.node}
          totalSize={totalSize}
          x={tooltip.x}
          y={tooltip.y}
          containerWidth={dimensions.width}
          containerHeight={dimensions.height}
        />
      )}
    </div>
  );
}
