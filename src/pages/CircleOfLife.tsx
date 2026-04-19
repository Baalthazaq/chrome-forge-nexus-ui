import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Download } from "lucide-react";
import { toast } from "sonner";

interface NodeRow {
  id: string;
  label: string;
  type: string;
  color: string | null;
  y: number;
}
interface EdgeRow {
  id: string;
  parent_id: string;
  child_id: string;
}

// Mirror of EvolutionTree palette so colors match across pages
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

interface LayoutNode {
  id: string;
  label: string;
  type: string;
  depth: number; // 0 = root, 1 = family, 2 = race, 3 = variant
  angle: number; // radians, center of slice
  startAngle: number;
  endAngle: number;
  radius: number;
  color: string;
  parentId: string | null;
}

const ROOT_ID = "__root__";

export default function CircleOfLife() {
  const svgRef = useRef<SVGSVGElement>(null);
  const [nodes, setNodes] = useState<NodeRow[]>([]);
  const [edges, setEdges] = useState<EdgeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [focusId, setFocusId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [{ data: n, error: ne }, { data: e, error: ee }] = await Promise.all([
        supabase.from("evolution_nodes").select("id,label,type,color,y"),
        supabase.from("evolution_edges").select("id,parent_id,child_id"),
      ]);
      if (ne || ee) {
        toast.error("Failed to load evolution data");
      } else {
        setNodes((n ?? []) as NodeRow[]);
        setEdges((e ?? []) as EdgeRow[]);
      }
      setLoading(false);
    })();
  }, []);

  // Build hierarchy with synthetic common ancestor
  const layout = useMemo(() => {
    if (!nodes.length) return { nodes: [] as LayoutNode[], links: [] as { from: LayoutNode; to: LayoutNode }[], size: 1200 };

    const byId = new Map(nodes.map((n) => [n.id, n]));
    // children adjacency
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

    // Roots = family nodes (or any node with no parent in graph)
    // Order families by their vertical position in the Evolution Tree (y ascending),
    // so the wheel preserves the manually-curated tree order instead of alphabetizing.
    const families = nodes
      .filter((n) => n.type === "family")
      .sort((a, b) => (a.y ?? 0) - (b.y ?? 0) || a.label.localeCompare(b.label));

    // Helper: family ancestors of any node (walk parents up; include 'family' types)
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

    // Compute leaf-count per family (each variant under family contributes 1; if no variants, races are leaves; if neither, family itself is 1)
    const leafCountOf = (rootId: string): number => {
      const visited = new Set<string>();
      let count = 0;
      const walk = (id: string) => {
        if (visited.has(id)) return;
        visited.add(id);
        const kids = childrenOf.get(id) ?? [];
        if (!kids.length) {
          count += 1;
          return;
        }
        for (const k of kids) walk(k);
      };
      walk(rootId);
      return Math.max(1, count);
    };

    // Total leaves to size angular slices
    const familyLeaves = families.map((f) => ({ f, leaves: leafCountOf(f.id) }));
    const totalLeaves = familyLeaves.reduce((s, x) => s + x.leaves, 0) || 1;

    // Determine MAX depth from any family root (so a node that is both a
    // direct child of a family AND a grandchild via another path is placed
    // at the deeper ring — keeps tiers visually consistent)
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

    // Size & rings — extra outer padding prevents variant labels from clipping/overlapping at the edge
    const size = 1700;
    const cx = size / 2;
    const cy = size / 2;
    const ringRadii = [0, size * 0.11, size * 0.22, size * 0.36]; // root, family, race, variant

    const out: LayoutNode[] = [];
    const links: { from: LayoutNode; to: LayoutNode }[] = [];

    // Synthetic root
    const root: LayoutNode = {
      id: ROOT_ID,
      label: "The Source",
      type: "root",
      depth: 0,
      angle: 0,
      startAngle: 0,
      endAngle: Math.PI * 2,
      radius: 0,
      color: "hsl(45 90% 70%)",
      parentId: null,
    };
    out.push(root);

    // Helper to compute color via family ancestor blend + lightening
    const colorFor = (n: NodeRow): string => {
      if (n.type === "family") {
        return FAMILY_COLORS[n.label] ?? n.color ?? "hsl(220 30% 60%)";
      }
      const fams = familyAncestors(n.id);
      const hsls = fams.map((fid) => parseHsl(FAMILY_COLORS[byId.get(fid)?.label ?? ""] ?? byId.get(fid)?.color ?? null));
      const blended = blendHsl(hsls);
      const bump = n.type === "race" ? 12 : n.type === "variant" ? 24 : 0;
      const sCut = n.type === "variant" ? 16 : 8;
      return hslToString({
        h: blended.h,
        s: Math.max(15, blended.s - sCut),
        l: Math.min(85, blended.l + bump),
      });
    };

    // Track which nodes have been placed to avoid duplicates from multi-parent edges
    const placed = new Set<string>();

    // Recursively place subtree within angular slice [startAngle, endAngle]
    const place = (id: string, startA: number, endA: number, parentId: string | null) => {
      if (placed.has(id)) return;
      const n = byId.get(id);
      if (!n) return;
      placed.add(id);
      const depth = depthOf.get(id) ?? 1;
      const midA = (startA + endA) / 2;
      const radius = ringRadii[Math.min(depth, ringRadii.length - 1)];
      const ln: LayoutNode = {
        id: n.id,
        label: n.label,
        type: n.type,
        depth,
        angle: midA,
        startAngle: startA,
        endAngle: endA,
        radius,
        color: colorFor(n),
        parentId,
      };
      out.push(ln);
      const parent = parentId ? out.find((x) => x.id === parentId) : null;
      if (parent) links.push({ from: parent, to: ln });

      const kids = (childrenOf.get(id) ?? [])
        .filter((k) => !placed.has(k))
        .sort((a, b) => (byId.get(a)?.y ?? 0) - (byId.get(b)?.y ?? 0));
      if (!kids.length) return;
      const kidLeaves = kids.map((k) => ({ k, leaves: leafCountOf(k) }));
      const totalK = kidLeaves.reduce((s, x) => s + x.leaves, 0) || 1;
      let cursor = startA;
      for (const { k, leaves } of kidLeaves) {
        const w = ((endA - startA) * leaves) / totalK;
        place(k, cursor, cursor + w, id);
        cursor += w;
      }
    };

    // Distribute families around full circle proportional to their leaf counts
    let cursor = -Math.PI / 2;
    const total = totalLeaves;
    for (const { f, leaves } of familyLeaves) {
      const w = (Math.PI * 2 * leaves) / total;
      place(f.id, cursor, cursor + w, ROOT_ID);
      cursor += w;
    }

    // Add dashed cross-links for any extra parent relationships not represented
    // by the primary placement (so multi-parent ancestry like Drow remains visible)
    const placedNodes = new Map(out.map((o) => [o.id, o]));
    const linkKey = new Set(links.map((l) => `${l.from.id}->${l.to.id}`));
    for (const e of edges) {
      const from = placedNodes.get(e.parent_id);
      const to = placedNodes.get(e.child_id);
      if (!from || !to) continue;
      const k = `${from.id}->${to.id}`;
      if (linkKey.has(k)) continue;
      linkKey.add(k);
      links.push({ from, to });
    }

    // Convert polar (angle, radius) → cartesian on each node, store on object via mutation
    for (const ln of out) {
      (ln as any).x = cx + Math.cos(ln.angle) * ln.radius;
      (ln as any).y = cy + Math.sin(ln.angle) * ln.radius;
    }

    return { nodes: out, links, size };
  }, [nodes, edges]);

  const handleExportSvg = () => {
    if (!svgRef.current) return;
    const svg = svgRef.current;
    const xml = new XMLSerializer().serializeToString(svg);
    const blob = new Blob([xml], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "circle-of-life.svg";
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const size = layout.size;
  const cx = size / 2;
  const cy = size / 2;

  // Build adjacency from the placed layout (use ALL links incl. cross-parent)
  const childMap = new Map<string, string[]>();
  const parentMap = new Map<string, string[]>();
  for (const l of layout.links) {
    if (!childMap.has(l.from.id)) childMap.set(l.from.id, []);
    childMap.get(l.from.id)!.push(l.to.id);
    if (!parentMap.has(l.to.id)) parentMap.set(l.to.id, []);
    parentMap.get(l.to.id)!.push(l.from.id);
  }

  // Forward = all descendants (branching). Backward = single chain to root (no branching, take first parent).
  const { highlightedNodes, highlightedLinks } = (() => {
    if (!focusId || focusId === ROOT_ID) {
      return { highlightedNodes: new Set<string>(), highlightedLinks: new Set<string>() };
    }
    const hN = new Set<string>([focusId]);
    const hL = new Set<string>();
    // Forward BFS
    const queue = [focusId];
    while (queue.length) {
      const cur = queue.shift()!;
      for (const c of childMap.get(cur) ?? []) {
        hL.add(`${cur}->${c}`);
        if (!hN.has(c)) {
          hN.add(c);
          queue.push(c);
        }
      }
    }
    // Backward chain — only first parent at each step
    let cur: string | undefined = focusId;
    const seen = new Set<string>([focusId]);
    while (cur) {
      const parents = parentMap.get(cur) ?? [];
      if (!parents.length) break;
      const p = parents[0];
      hL.add(`${p}->${cur}`);
      hN.add(p);
      if (seen.has(p)) break;
      seen.add(p);
      cur = p;
    }
    return { highlightedNodes: hN, highlightedLinks: hL };
  })();

  // Compute zoom viewBox: when focused, center on the focus node and tighten box
  const focusNode = focusId ? layout.nodes.find((n) => n.id === focusId) : null;
  let vbX = 0, vbY = 0, vbW = size, vbH = size;
  if (focusNode && focusId !== ROOT_ID) {
    const fx = (focusNode as any).x as number;
    const fy = (focusNode as any).y as number;
    // Zoom to ~45% of full size, centered on the focus point
    const zoom = 0.45;
    vbW = size * zoom;
    vbH = size * zoom;
    vbX = Math.max(0, Math.min(size - vbW, fx - vbW / 2));
    vbY = Math.max(0, Math.min(size - vbH, fy - vbH / 2));
  }

  const handleNodeClick = (id: string) => {
    if (id === ROOT_ID) {
      setFocusId(null);
      return;
    }
    setFocusId((cur) => (cur === id ? null : id));
  };

  // Curved link path: quadratic bezier through the radial midpoint
  const linkPath = (a: LayoutNode, b: LayoutNode) => {
    const ax = (a as any).x;
    const ay = (a as any).y;
    const bx = (b as any).x;
    const by = (b as any).y;
    // Control point: pull toward the parent's ring tangent for a nice arc
    const midR = (a.radius + b.radius) / 2;
    const midA = b.angle; // bend toward child angle
    const mxp = cx + Math.cos(midA) * midR;
    const myp = cy + Math.sin(midA) * midR;
    return `M ${ax} ${ay} Q ${mxp} ${myp} ${bx} ${by}`;
  };

  const fontFor = (depth: number) => {
    if (depth === 0) return 18;
    if (depth === 1) return 14;
    if (depth === 2) return 11;
    return 9;
  };

  return (
    <div className="min-h-screen bg-gray-900 text-foreground p-6">
      <div className="max-w-[1600px] mx-auto space-y-4">
        <Card className="p-4 bg-gray-800 border-gray-700 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold">Circle of Life</h1>
            <p className="text-sm text-muted-foreground">
              Radial view of the ancestry evolution tree, descending from a single common ancestor.
            </p>
          </div>
          <Button variant="outline" onClick={handleExportSvg} className="gap-2">
            <Download className="h-4 w-4" /> Export SVG
          </Button>
        </Card>

        <Card className="p-4 bg-gray-800 border-gray-700 overflow-hidden">
          <div className="w-full overflow-auto">
            <svg
              ref={svgRef}
              viewBox={`${vbX} ${vbY} ${vbW} ${vbH}`}
              className="w-full h-auto transition-all duration-500 ease-in-out"
              style={{ maxHeight: "85vh" }}
              onClick={(e) => {
                // Click on empty space resets focus
                if (e.target === e.currentTarget) setFocusId(null);
              }}
            >
              {/* Subtle ring guides */}
              {[0.13, 0.27, 0.42].map((r, i) => (
                <circle
                  key={i}
                  cx={cx}
                  cy={cy}
                  r={size * r}
                  fill="none"
                  stroke="hsl(220 10% 30%)"
                  strokeDasharray="2 6"
                  strokeWidth={1}
                />
              ))}

              {/* Links */}
              <g>
                {layout.links.map((l, i) => {
                  const key = `${l.from.id}->${l.to.id}`;
                  const isHighlighted = highlightedLinks.has(key);
                  const isHover =
                    hoverId && (l.from.id === hoverId || l.to.id === hoverId);
                  const dimmed = focusId && !isHighlighted;
                  return (
                    <path
                      key={i}
                      d={linkPath(l.from, l.to)}
                      fill="none"
                      stroke={l.to.color}
                      strokeOpacity={dimmed ? 0.08 : isHighlighted || isHover ? 1 : 0.55}
                      strokeWidth={
                        (isHighlighted ? 1.5 : 1) *
                        (l.to.depth === 1 ? 2.5 : l.to.depth === 2 ? 1.6 : 1)
                      }
                      style={{ transition: "stroke-opacity 300ms, stroke-width 300ms" }}
                    />
                  );
                })}
              </g>

              {/* Nodes */}
              <g>
                {layout.nodes.map((n) => {
                  const x = (n as any).x;
                  const y = (n as any).y;
                  const r =
                    n.depth === 0 ? 28 : n.depth === 1 ? 14 : n.depth === 2 ? 8 : 5;
                  const angDeg = (n.angle * 180) / Math.PI;
                  const flip = n.angle > Math.PI / 2 && n.angle < (3 * Math.PI) / 2;
                  const labelRot = flip ? angDeg + 180 : angDeg;
                  const labelOffset = r + 6;
                  const lx = flip ? -labelOffset : labelOffset;
                  const anchor = flip ? "end" : "start";
                  const isRoot = n.depth === 0;
                  const isHighlighted = highlightedNodes.has(n.id);
                  const isFocus = focusId === n.id;
                  const dimmed = focusId && !isHighlighted && !isRoot;

                  return (
                    <g
                      key={n.id}
                      onMouseEnter={() => setHoverId(n.id)}
                      onMouseLeave={() => setHoverId(null)}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleNodeClick(n.id);
                      }}
                      style={{ cursor: "pointer" }}
                    >
                      <circle
                        cx={x}
                        cy={y}
                        r={isFocus ? r * 1.4 : r}
                        fill={n.color}
                        stroke={isFocus ? "hsl(45 95% 70%)" : "hsl(220 15% 12%)"}
                        strokeWidth={isFocus ? 3 : 1.5}
                        opacity={dimmed ? 0.18 : hoverId && hoverId !== n.id && !focusId ? 0.6 : 1}
                        style={{ transition: "opacity 300ms, r 300ms, stroke-width 300ms" }}
                      />
                      {isRoot ? (
                        <text
                          x={x}
                          y={y + 5}
                          textAnchor="middle"
                          fontSize={fontFor(0)}
                          fontWeight="bold"
                          fill="hsl(220 15% 10%)"
                          style={{ pointerEvents: "none" }}
                        >
                          ✶
                        </text>
                      ) : (
                        <g transform={`translate(${x} ${y}) rotate(${labelRot})`}>
                          <text
                            x={lx}
                            y={3}
                            textAnchor={anchor}
                            fontSize={fontFor(n.depth)}
                            fontWeight={n.depth <= 1 ? 700 : n.depth === 2 ? 600 : 400}
                            fill="hsl(220 15% 92%)"
                            stroke="hsl(220 15% 8%)"
                            strokeWidth={3}
                            paintOrder="stroke"
                            opacity={dimmed ? 0.25 : 1}
                            style={{ pointerEvents: "none", transition: "opacity 300ms" }}
                          >
                            {n.label}
                          </text>
                        </g>
                      )}
                    </g>
                  );
                })}
              </g>

              {/* Center label */}
              <text
                x={cx}
                y={cy + 50}
                textAnchor="middle"
                fontSize={14}
                fill="hsl(45 60% 75%)"
                fontStyle="italic"
              >
                The Source
              </text>
            </svg>
          </div>
        </Card>
      </div>
    </div>
  );
}
