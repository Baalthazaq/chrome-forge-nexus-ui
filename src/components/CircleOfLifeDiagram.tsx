import { useMemo, useRef, useState } from "react";
import { Download } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface CircleNodeRow {
  id: string;
  label: string;
  type: string;
  color: string | null;
  y: number;
}

interface CircleEdgeRow {
  id: string;
  parent_id: string;
  child_id: string;
}

interface CircleOfLifeDiagramProps {
  nodes: CircleNodeRow[];
  edges: CircleEdgeRow[];
  className?: string;
}

interface LayoutNode {
  id: string;
  label: string;
  type: string;
  depth: number;
  angle: number;
  startAngle: number;
  endAngle: number;
  radius: number;
  color: string;
  parentId: string | null;
  x: number;
  y: number;
}

const ROOT_ID = "__root__";

const FAMILY_COLORS: Record<string, string> = {
  Aberration: "hsl(285 75% 55%)",
  Avian: "hsl(200 90% 55%)",
  Beastfolk: "hsl(28 85% 52%)",
  Construct: "hsl(220 12% 55%)",
  Draconic: "hsl(355 80% 55%)",
  Dragon: "hsl(8 88% 55%)",
  Dwarven: "hsl(38 75% 48%)",
  Elemental: "hsl(185 85% 50%)",
  Elven: "hsl(160 70% 48%)",
  Fey: "hsl(135 65% 50%)",
  Giant: "hsl(15 65% 45%)",
  Gnome: "hsl(52 85% 55%)",
  Goblinoid: "hsl(75 60% 42%)",
  Halfling: "hsl(65 55% 52%)",
  Human: "hsl(42 70% 58%)",
  Lycan: "hsl(18 55% 40%)",
  Monstrosity: "hsl(305 50% 48%)",
  Orcish: "hsl(115 45% 40%)",
  Planar: "hsl(325 80% 58%)",
  Plant: "hsl(95 60% 42%)",
  Reptilian: "hsl(105 55% 40%)",
  Shapeshifter: "hsl(255 60% 62%)",
  Undead: "hsl(245 20% 45%)",
};

function parseHsl(s: string | null | undefined): { h: number; s: number; l: number } | null {
  if (!s) return null;
  const m = s.match(/hsl\(\s*([\d.]+)\s+([\d.]+)%\s+([\d.]+)%\s*\)/i);
  if (!m) return null;
  return { h: parseFloat(m[1]), s: parseFloat(m[2]), l: parseFloat(m[3]) };
}
function hslToString(c: { h: number; s: number; l: number }) {
  return `hsl(${c.h.toFixed(0)} ${c.s.toFixed(0)}% ${c.l.toFixed(0)}%)`;
}
function blendHsl(list: ({ h: number; s: number; l: number } | null)[]) {
  const valid = list.filter(Boolean) as { h: number; s: number; l: number }[];
  if (!valid.length) return { h: 220, s: 10, l: 60 };
  let xs = 0, ys = 0, ss = 0, ls = 0;
  for (const c of valid) {
    const r = (c.h * Math.PI) / 180;
    xs += Math.cos(r);
    ys += Math.sin(r);
    ss += c.s;
    ls += c.l;
  }
  let h = (Math.atan2(ys / valid.length, xs / valid.length) * 180) / Math.PI;
  if (h < 0) h += 360;
  return { h, s: ss / valid.length, l: ls / valid.length };
}

export function CircleOfLifeDiagram({ nodes, edges, className }: CircleOfLifeDiagramProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [focusId, setFocusId] = useState<string | null>(null);

  const layout = useMemo(() => {
    if (!nodes.length) {
      return { nodes: [] as LayoutNode[], links: [] as { from: LayoutNode; to: LayoutNode }[], size: 1900 };
    }

    const byId = new Map(nodes.map((n) => [n.id, n]));
    const childrenOf = new Map<string, string[]>();
    const parentsOf = new Map<string, string[]>();
    for (const n of nodes) {
      childrenOf.set(n.id, []);
      parentsOf.set(n.id, []);
    }
    for (const e of edges) {
      if (childrenOf.has(e.parent_id) && byId.has(e.child_id)) {
        childrenOf.get(e.parent_id)!.push(e.child_id);
        parentsOf.get(e.child_id)!.push(e.parent_id);
      }
    }

    const families = nodes
      .filter((n) => n.type === "family")
      .sort((a, b) => (a.y ?? 0) - (b.y ?? 0) || a.label.localeCompare(b.label));

    const familyAncestors = (id: string): string[] => {
      const seen = new Set<string>();
      const out: string[] = [];
      const stack = [id];
      while (stack.length) {
        const cur = stack.pop()!;
        for (const p of parentsOf.get(cur) ?? []) {
          if (seen.has(p)) continue;
          seen.add(p);
          const pn = byId.get(p);
          if (pn?.type === "family") out.push(p);
          stack.push(p);
        }
      }
      return out;
    };

    const leafCountOf = (rootId: string): number => {
      const visited = new Set<string>();
      let count = 0;
      const walk = (id: string) => {
        if (visited.has(id)) return;
        visited.add(id);
        const kids = childrenOf.get(id) ?? [];
        if (!kids.length) { count += 1; return; }
        for (const k of kids) walk(k);
      };
      walk(rootId);
      return Math.max(1, count);
    };

    const familyLeaves = families.map((f) => ({ f, leaves: leafCountOf(f.id) }));
    const totalLeaves = familyLeaves.reduce((s, x) => s + x.leaves, 0) || 1;

    const depthOf = new Map<string, number>();
    const computeDepth = (id: string, seen: Set<string>): number => {
      if (seen.has(id)) return 1;
      seen.add(id);
      const node = byId.get(id);
      if (node?.type === "family") return 1;
      const parents = parentsOf.get(id) ?? [];
      if (!parents.length) return 1;
      let best = 1;
      for (const p of parents) {
        const d = computeDepth(p, seen) + 1;
        if (d > best) best = d;
      }
      seen.delete(id);
      return best;
    };
    for (const n of nodes) {
      depthOf.set(n.id, n.type === "family" ? 1 : computeDepth(n.id, new Set()));
    }

    const size = 1700;
    const cx = size / 2;
    const cy = size / 2;
    const ringRadii = [0, size * 0.13, size * 0.26, size * 0.4];

    const out: LayoutNode[] = [];
    const links: { from: LayoutNode; to: LayoutNode }[] = [];
    const root: LayoutNode = {
      id: ROOT_ID, label: "The Source", type: "root", depth: 0,
      angle: 0, startAngle: 0, endAngle: Math.PI * 2, radius: 0,
      color: "hsl(45 90% 70%)", parentId: null, x: cx, y: cy,
    };
    out.push(root);

    const colorFor = (n: CircleNodeRow): string => {
      if (n.type === "family") {
        return FAMILY_COLORS[n.label] ?? n.color ?? "hsl(220 30% 60%)";
      }
      const fams = familyAncestors(n.id);
      const hsls = fams.map((fid) =>
        parseHsl(FAMILY_COLORS[byId.get(fid)?.label ?? ""] ?? byId.get(fid)?.color ?? null)
      );
      const blended = blendHsl(hsls);
      const bump = n.type === "race" ? 12 : n.type === "variant" ? 24 : 0;
      const sCut = n.type === "variant" ? 16 : 8;
      return hslToString({
        h: blended.h,
        s: Math.max(15, blended.s - sCut),
        l: Math.min(85, blended.l + bump),
      });
    };

    // STEP 1: Walk tree in family order to collect leaves in display order.
    const sortKids = (ids: string[]) =>
      [...ids].sort((a, b) => (byId.get(a)?.y ?? 0) - (byId.get(b)?.y ?? 0));

    const leafOrder: string[] = [];
    const seenLeaf = new Set<string>();
    const walkLeaves = (id: string) => {
      const kids = sortKids((childrenOf.get(id) ?? []).filter((k) => byId.has(k)));
      if (!kids.length) {
        if (!seenLeaf.has(id)) { seenLeaf.add(id); leafOrder.push(id); }
        return;
      }
      for (const k of kids) walkLeaves(k);
    };
    for (const f of families) walkLeaves(f.id);

    // STEP 2: Place all leaves equidistantly on the outer ring.
    const totalLeavesN = Math.max(1, leafOrder.length);
    const stepA = (Math.PI * 2) / totalLeavesN;
    const startLeafA = -Math.PI / 2 + stepA / 2;
    const angleOf = new Map<string, number>();
    leafOrder.forEach((id, i) => angleOf.set(id, startLeafA + i * stepA));

    // STEP 3: Interior nodes = circular mean of descendant-leaf angles.
    const leafDescendants = (id: string): string[] => {
      const acc: string[] = [];
      const seen = new Set<string>();
      const walk = (cur: string) => {
        if (seen.has(cur)) return;
        seen.add(cur);
        const kids = childrenOf.get(cur) ?? [];
        if (!kids.length) { acc.push(cur); return; }
        for (const k of kids) walk(k);
      };
      walk(id);
      return acc;
    };
    const circularMean = (angles: number[]): number => {
      let xs = 0, ys = 0;
      for (const a of angles) { xs += Math.cos(a); ys += Math.sin(a); }
      return Math.atan2(ys / angles.length, xs / angles.length);
    };
    for (const n of nodes) {
      if (angleOf.has(n.id)) continue;
      const leaves = leafDescendants(n.id);
      const angles = leaves.map((l) => angleOf.get(l)).filter((a): a is number => a !== undefined);
      if (angles.length) angleOf.set(n.id, circularMean(angles));
    }

    // STEP 4: Materialize nodes onto their depth ring.
    const nodeMap = new Map<string, LayoutNode>();
    for (const n of nodes) {
      const a = angleOf.get(n.id);
      if (a === undefined) continue;
      const depth = depthOf.get(n.id) ?? 1;
      const radius = ringRadii[Math.min(depth, ringRadii.length - 1)];
      const ln: LayoutNode = {
        id: n.id, label: n.label, type: n.type, depth,
        angle: a, startAngle: a, endAngle: a, radius,
        color: colorFor(n), parentId: null,
        x: cx + Math.cos(a) * radius,
        y: cy + Math.sin(a) * radius,
      };
      out.push(ln);
      nodeMap.set(n.id, ln);
    }

    // STEP 5: Build links from edges; connect top-level families to root.
    for (const e of edges) {
      const from = nodeMap.get(e.parent_id);
      const to = nodeMap.get(e.child_id);
      if (!from || !to) continue;
      links.push({ from, to });
    }
    for (const f of families) {
      const ln = nodeMap.get(f.id);
      if (ln) links.push({ from: root, to: ln });
    }

    return { nodes: out, links, size };
  }, [nodes, edges]);

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
          {[0.13, 0.26, 0.4].map((r, i) => (
            <circle key={i} cx={cx} cy={cy} r={size * r} fill="none"
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
                  strokeWidth={(isHighlighted ? 1.6 : 1) * (l.to.depth === 1 ? 2.5 : l.to.depth === 2 ? 1.6 : 1)}
                  style={{ transition: "stroke-opacity 300ms, stroke-width 300ms" }} />
              );
            })}
          </g>

          <g>
            {layout.nodes.map((n) => {
              const r = n.depth === 0 ? 28 : n.depth === 1 ? 14 : n.depth === 2 ? 8 : 5;
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
                        fontWeight={n.depth <= 1 ? 700 : n.depth === 2 ? 600 : 400}
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
