import { useMemo, useRef, useState } from "react";
import { Download } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  buildCircleLayout,
  ROOT_ID,
  type CircleEdgeRow,
  type CircleNodeRow,
  type LayoutNode,
} from "@/components/circle-of-life-layout";

interface CircleOfLifeDiagramProps {
  nodes: CircleNodeRow[];
  edges: CircleEdgeRow[];
  className?: string;
}

export function CircleOfLifeDiagram({ nodes, edges, className }: CircleOfLifeDiagramProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [focusId, setFocusId] = useState<string | null>(null);

  const layout = useMemo(() => buildCircleLayout(nodes, edges), [nodes, edges]);

  const childMap = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const l of layout.links) {
      if (!map.has(l.from.id)) map.set(l.from.id, []);
      map.get(l.from.id)!.push(l.to.id);
    }
    return map;
  }, [layout.links]);

  const parentMap = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const l of layout.links) {
      if (!map.has(l.to.id)) map.set(l.to.id, []);
      map.get(l.to.id)!.push(l.from.id);
    }
    return map;
  }, [layout.links]);

  const { highlightedNodes, highlightedLinks } = useMemo(() => {
    if (!focusId || focusId === ROOT_ID) {
      return { highlightedNodes: new Set<string>(), highlightedLinks: new Set<string>() };
    }
    const hN = new Set<string>([focusId]);
    const hL = new Set<string>();
    // Forward (descendants, branching)
    const fwd = [focusId];
    while (fwd.length) {
      const cur = fwd.shift()!;
      for (const c of childMap.get(cur) ?? []) {
        hL.add(`${cur}->${c}`);
        if (!hN.has(c)) { hN.add(c); fwd.push(c); }
      }
    }
    // Backward (ancestors, branching — all parents)
    const bwd = [focusId];
    while (bwd.length) {
      const cur = bwd.shift()!;
      for (const p of parentMap.get(cur) ?? []) {
        hL.add(`${p}->${cur}`);
        if (!hN.has(p)) { hN.add(p); bwd.push(p); }
      }
    }
    return { highlightedNodes: hN, highlightedLinks: hL };
  }, [childMap, focusId, parentMap]);

  const handleExportSvg = () => {
    if (!svgRef.current) return;
    const xml = new XMLSerializer().serializeToString(svgRef.current);
    const blob = new Blob([xml], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "circle-of-life.svg";
    a.click();
    URL.revokeObjectURL(url);
  };

  const size = layout.size;
  const cx = size / 2;
  const cy = size / 2;
  const focusNode = focusId ? layout.nodes.find((n) => n.id === focusId) : null;
  let vbX = 0, vbY = 0, vbW = size, vbH = size;
  if (focusNode && focusId !== ROOT_ID) {
    vbW = size * 0.55;
    vbH = size * 0.55;
    vbX = Math.max(0, Math.min(size - vbW, focusNode.x - vbW / 2));
    vbY = Math.max(0, Math.min(size - vbH, focusNode.y - vbH / 2));
  }

  const linkPath = (a: LayoutNode, b: LayoutNode) => {
    const midR = (a.radius + b.radius) / 2;
    const midA = b.angle;
    const mxp = cx + Math.cos(midA) * midR;
    const myp = cy + Math.sin(midA) * midR;
    return `M ${a.x} ${a.y} Q ${mxp} ${myp} ${b.x} ${b.y}`;
  };

  const fontFor = (depth: number) => {
    if (depth === 0) return 18;
    if (depth === 1) return 14;
    if (depth === 2) return 11;
    return 10;
  };

  return (
    <Card className={`p-4 ${className ?? ""}`.trim()}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold">Circle of Life</h2>
          <p className="text-sm text-muted-foreground">
            Generated from the current evolution tree, with The Source at the center. Click a node to focus; click the background to reset.
          </p>
        </div>
        <Button variant="outline" onClick={handleExportSvg} className="gap-2">
          <Download className="h-4 w-4" /> Export SVG
        </Button>
      </div>

      <div className="w-full overflow-auto">
        <svg
          ref={svgRef}
          viewBox={`${vbX} ${vbY} ${vbW} ${vbH}`}
          className="h-auto w-full transition-all duration-500 ease-in-out"
          style={{ maxHeight: "85vh" }}
          onClick={(e) => { if (e.target === e.currentTarget) setFocusId(null); }}
        >
          {layout.guideRadii.map((radius, i) => (
            <circle key={i} cx={cx} cy={cy} r={radius} fill="none"
              stroke="hsl(var(--border))" strokeDasharray="2 8" strokeWidth={1} />
          ))}

          <g>
            {layout.links.map((l, i) => {
              const key = `${l.from.id}->${l.to.id}`;
              const isHighlighted = highlightedLinks.has(key);
              const isHover = hoverId && (l.from.id === hoverId || l.to.id === hoverId);
              const dimmed = focusId && !isHighlighted;
              return (
                <path key={i} d={linkPath(l.from, l.to)} fill="none"
                  stroke={l.to.color}
                  strokeOpacity={dimmed ? 0.08 : isHighlighted || isHover ? 1 : 0.6}
                   strokeWidth={(isHighlighted ? 1.6 : 1) * (l.to.depth <= 1.5 ? 2.5 : l.to.depth <= 2.5 ? 1.6 : 1)}
                  style={{ transition: "stroke-opacity 300ms, stroke-width 300ms" }} />
              );
            })}
          </g>

          <g>
            {layout.nodes.map((n) => {
               const r = n.depth === 0 ? 28 : n.depth <= 1.5 ? 14 : n.depth <= 2.5 ? 8 : 5;
              const angDeg = (n.angle * 180) / Math.PI;
              const flip = n.angle > Math.PI / 2 && n.angle < (3 * Math.PI) / 2;
              const labelRot = flip ? angDeg + 180 : angDeg;
              const labelOffset = r + 8;
              const lx = flip ? -labelOffset : labelOffset;
              const anchor = flip ? "end" : "start";
              const isRoot = n.depth === 0;
              const isHighlighted = highlightedNodes.has(n.id);
              const isFocus = focusId === n.id;
              const dimmed = focusId && !isHighlighted && !isRoot;

              return (
                <g key={n.id}
                  onMouseEnter={() => setHoverId(n.id)}
                  onMouseLeave={() => setHoverId(null)}
                  onClick={(e) => {
                    e.stopPropagation();
                    setFocusId((cur) => (n.id === ROOT_ID ? null : cur === n.id ? null : n.id));
                  }}
                  style={{ cursor: "pointer" }}>
                  <circle cx={n.x} cy={n.y} r={isFocus ? r * 1.4 : r}
                    fill={n.color}
                    stroke={isFocus ? "hsl(45 95% 70%)" : "hsl(var(--background))"}
                    strokeWidth={isFocus ? 3 : 1.5}
                    opacity={dimmed ? 0.18 : hoverId && hoverId !== n.id && !focusId ? 0.7 : 1}
                    style={{ transition: "opacity 300ms, r 300ms, stroke-width 300ms" }} />

                  {isRoot ? (
                    <text x={n.x} y={n.y + 5} textAnchor="middle"
                      fontSize={fontFor(0)} fontWeight="bold"
                      fill="hsl(var(--background))" style={{ pointerEvents: "none" }}>
                      ✶
                    </text>
                  ) : (
                    <g transform={`translate(${n.x} ${n.y}) rotate(${labelRot})`}>
                      <text x={lx} y={3} textAnchor={anchor}
                        fontSize={fontFor(n.depth)}
                         fontWeight={n.depth <= 1.5 ? 700 : n.depth <= 2.5 ? 600 : 400}
                        fill="hsl(var(--foreground))"
                        stroke="hsl(var(--background))" strokeWidth={3} paintOrder="stroke"
                        opacity={dimmed ? 0.25 : 1}
                        style={{ pointerEvents: "none", transition: "opacity 300ms" }}>
                        {n.label}
                      </text>
                    </g>
                  )}
                </g>
              );
            })}
          </g>

          <text x={cx} y={cy + 50} textAnchor="middle"
            fontSize={14} fill="hsl(var(--muted-foreground))" fontStyle="italic">
            The Source
          </text>
        </svg>
      </div>
    </Card>
  );
}

export default CircleOfLifeDiagram;
