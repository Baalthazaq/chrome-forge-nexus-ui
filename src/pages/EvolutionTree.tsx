import { useMemo, useState } from "react";
import { RACES } from "@/data/racegenData";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

interface TreeNode {
  id: string;
  label: string;
  type: "family" | "race" | "variant";
  children: TreeNode[];
}

const FAMILY_COLORS: Record<string, string> = {
  Avian: "hsl(200 90% 60%)",
  Beastfolk: "hsl(30 80% 55%)",
  Giant: "hsl(15 70% 50%)",
  Aberration: "hsl(280 70% 60%)",
  Fey: "hsl(140 70% 55%)",
  Planar: "hsl(330 80% 60%)",
  Goblinoid: "hsl(80 60% 45%)",
  Shapeshifter: "hsl(260 60% 65%)",
  Draconic: "hsl(0 80% 55%)",
  Elven: "hsl(170 70% 55%)",
  Dwarven: "hsl(40 70% 50%)",
  Gnome: "hsl(50 80% 55%)",
  Construct: "hsl(220 15% 60%)",
  Dragon: "hsl(10 90% 55%)",
  Monstrosity: "hsl(290 50% 50%)",
  Plant: "hsl(110 60% 45%)",
  Undead: "hsl(240 20% 50%)",
  Halfling: "hsl(60 60% 55%)",
  Human: "hsl(35 75% 60%)",
  Reptilian: "hsl(100 50% 45%)",
  Elemental: "hsl(190 80% 55%)",
  Orcish: "hsl(120 30% 45%)",
  Lycan: "hsl(20 60% 45%)",
};

const NODE_W = 160;
const NODE_H = 44;
const COL_GAP = 90;
const ROW_GAP = 14;
const PAD = 24;

interface PositionedNode {
  node: TreeNode;
  x: number;
  y: number;
  height: number;
}

function layout(node: TreeNode, depth: number, yOffset: number): { positioned: PositionedNode[]; height: number } {
  const positioned: PositionedNode[] = [];
  if (node.children.length === 0) {
    positioned.push({ node, x: depth * (NODE_W + COL_GAP), y: yOffset, height: NODE_H });
    return { positioned, height: NODE_H + ROW_GAP };
  }
  let childY = yOffset;
  let totalHeight = 0;
  const childPositions: PositionedNode[] = [];
  for (const child of node.children) {
    const { positioned: childP, height: ch } = layout(child, depth + 1, childY);
    childPositions.push(...childP);
    childY += ch;
    totalHeight += ch;
  }
  // Find first/last child of this node to center
  const directChildPositions = node.children.map((c) =>
    childPositions.find((p) => p.node.id === c.id)!
  );
  const firstY = directChildPositions[0].y;
  const lastY = directChildPositions[directChildPositions.length - 1].y;
  const centerY = (firstY + lastY) / 2;
  positioned.push({ node, x: depth * (NODE_W + COL_GAP), y: centerY, height: NODE_H });
  positioned.push(...childPositions);
  return { positioned, height: Math.max(totalHeight, NODE_H + ROW_GAP) };
}

const EvolutionTree = () => {
  const [filter, setFilter] = useState("");

  const trees = useMemo<TreeNode[]>(() => {
    const families = Array.from(new Set(RACES.map((r) => r.family))).sort();
    return families.map((fam) => {
      const races = RACES.filter((r) => r.family === fam);
      return {
        id: `family-${fam}`,
        label: fam,
        type: "family",
        children: races.map((r) => ({
          id: `race-${r.name}`,
          label: r.name,
          type: "race",
          children: r.variants.map((v) => ({
            id: `variant-${r.name}-${v}`,
            label: v,
            type: "variant",
            children: [],
          })),
        })),
      } as TreeNode;
    });
  }, []);

  const filtered = useMemo(() => {
    if (!filter.trim()) return trees;
    const f = filter.toLowerCase();
    return trees.filter(
      (t) =>
        t.label.toLowerCase().includes(f) ||
        t.children.some(
          (r) =>
            r.label.toLowerCase().includes(f) ||
            r.children.some((v) => v.label.toLowerCase().includes(f))
        )
    );
  }, [trees, filter]);

  return (
    <div className="min-h-screen bg-background text-foreground p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <header className="space-y-2">
          <h1 className="text-4xl font-bold tracking-tight">Ancestry Evolution Tree</h1>
          <p className="text-muted-foreground">
            Each family is its own lineage — branching into races and their variants. No common ancestor.
          </p>
        </header>

        <Input
          placeholder="Filter by family, race, or variant…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="max-w-md"
        />

        <div className="space-y-8">
          {filtered.map((tree) => {
            const color = FAMILY_COLORS[tree.label] ?? "hsl(var(--primary))";
            const { positioned, height } = layout(tree, 0, PAD);
            const maxX = Math.max(...positioned.map((p) => p.x)) + NODE_W + PAD;
            const maxY = Math.max(...positioned.map((p) => p.y)) + NODE_H + PAD;

            // Build edges: parent -> child
            const edges: { from: PositionedNode; to: PositionedNode }[] = [];
            const walk = (n: TreeNode) => {
              const p = positioned.find((x) => x.node.id === n.id)!;
              for (const c of n.children) {
                const cp = positioned.find((x) => x.node.id === c.id)!;
                edges.push({ from: p, to: cp });
                walk(c);
              }
            };
            walk(tree);

            return (
              <Card key={tree.id} className="p-4 overflow-auto">
                <div className="flex items-center gap-3 mb-3">
                  <span
                    className="inline-block w-3 h-3 rounded-full"
                    style={{ backgroundColor: color }}
                  />
                  <h2 className="text-2xl font-semibold">{tree.label}</h2>
                  <span className="text-sm text-muted-foreground">
                    {tree.children.length} race{tree.children.length === 1 ? "" : "s"}
                  </span>
                </div>
                <svg width={maxX} height={maxY} style={{ display: "block" }}>
                  {edges.map((e, i) => {
                    const x1 = e.from.x + NODE_W;
                    const y1 = e.from.y + NODE_H / 2;
                    const x2 = e.to.x;
                    const y2 = e.to.y + NODE_H / 2;
                    const mx = (x1 + x2) / 2;
                    return (
                      <path
                        key={i}
                        d={`M ${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`}
                        stroke={color}
                        strokeOpacity={0.45}
                        strokeWidth={1.5}
                        fill="none"
                      />
                    );
                  })}
                  {positioned.map((p) => {
                    const isFamily = p.node.type === "family";
                    const isRace = p.node.type === "race";
                    return (
                      <g key={p.node.id} transform={`translate(${p.x}, ${p.y})`}>
                        <rect
                          width={NODE_W}
                          height={NODE_H}
                          rx={6}
                          fill="hsl(var(--card))"
                          stroke={color}
                          strokeWidth={isFamily ? 2.5 : isRace ? 1.75 : 1}
                          strokeOpacity={isFamily ? 1 : isRace ? 0.85 : 0.55}
                        />
                        <text
                          x={NODE_W / 2}
                          y={NODE_H / 2}
                          textAnchor="middle"
                          dominantBaseline="middle"
                          fill="hsl(var(--foreground))"
                          fontSize={isFamily ? 14 : isRace ? 13 : 12}
                          fontWeight={isFamily ? 700 : isRace ? 600 : 400}
                        >
                          {p.node.label}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default EvolutionTree;
