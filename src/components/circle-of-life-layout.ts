export interface CircleNodeRow {
  id: string;
  label: string;
  type: string;
  color: string | null;
  y: number;
}

export interface CircleEdgeRow {
  id: string;
  parent_id: string;
  child_id: string;
}

export interface LayoutNode {
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

export interface CircleLayout {
  nodes: LayoutNode[];
  links: { from: LayoutNode; to: LayoutNode }[];
  size: number;
  guideRadii: number[];
}

export const ROOT_ID = "__root__";

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

const LAYOUT_SIZE = 1900;
const DEPTH_TO_RADIUS: Record<string, number> = {
  "0": 0,
  "1": 0.11,
  "1.5": 0.17,
  "2": 0.25,
  "2.5": 0.33,
  "3": 0.43,
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
  let xs = 0;
  let ys = 0;
  let ss = 0;
  let ls = 0;
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

function radiusForDepth(size: number, depth: number) {
  return size * (DEPTH_TO_RADIUS[String(depth)] ?? DEPTH_TO_RADIUS["3"]);
}

export function buildCircleLayout(nodes: CircleNodeRow[], edges: CircleEdgeRow[]): CircleLayout {
  if (!nodes.length) {
    return {
      nodes: [],
      links: [],
      size: LAYOUT_SIZE,
      guideRadii: Object.entries(DEPTH_TO_RADIUS)
        .filter(([depth]) => depth !== "0")
        .map(([, ratio]) => LAYOUT_SIZE * ratio),
    };
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

  const rootFamilies = families.filter((family) =>
    (parentsOf.get(family.id) ?? []).every((parentId) => byId.get(parentId)?.type !== "family"),
  );

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

  const colorFor = (n: CircleNodeRow): string => {
    if (n.type === "family") {
      return FAMILY_COLORS[n.label] ?? n.color ?? "hsl(220 30% 60%)";
    }
    const fams = familyAncestors(n.id);
    const hsls = fams.map((fid) =>
      parseHsl(FAMILY_COLORS[byId.get(fid)?.label ?? ""] ?? byId.get(fid)?.color ?? null),
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

  // Determine each node's "primary" parent — the deepest one in the tree.
  // For multi-parent leaves (edge cases like Umbragen ∈ Drow ∩ Elf, or Drider ∈ Spider ∩ Aberration),
  // this groups them with their most-specific parent's siblings instead of by raw y-coord.
  const depthFromRoot = new Map<string, number>();
  const computeDepth = (id: string, seen = new Set<string>()): number => {
    if (depthFromRoot.has(id)) return depthFromRoot.get(id)!;
    if (seen.has(id)) return 0;
    seen.add(id);
    const parents = (parentsOf.get(id) ?? []).filter((p) => byId.has(p));
    if (!parents.length) {
      depthFromRoot.set(id, 0);
      return 0;
    }
    const d = 1 + Math.max(...parents.map((p) => computeDepth(p, seen)));
    depthFromRoot.set(id, d);
    return d;
  };
  for (const n of nodes) computeDepth(n.id);

  const primaryParentOf = new Map<string, string | null>();
  for (const n of nodes) {
    const parents = (parentsOf.get(n.id) ?? []).filter((p) => byId.has(p));
    if (!parents.length) {
      primaryParentOf.set(n.id, null);
      continue;
    }
    // Pick the deepest parent; tie-break by lower y for stability.
    parents.sort((a, b) => {
      const dd = (depthFromRoot.get(b) ?? 0) - (depthFromRoot.get(a) ?? 0);
      if (dd !== 0) return dd;
      return (byId.get(a)?.y ?? 0) - (byId.get(b)?.y ?? 0);
    });
    primaryParentOf.set(n.id, parents[0]);
  }

  const sortKids = (ids: string[]) =>
    [...ids].sort((a, b) => (byId.get(a)?.y ?? 0) - (byId.get(b)?.y ?? 0));

  const leafOrder: string[] = [];
  const seenLeaf = new Set<string>();
  const walkLeaves = (id: string) => {
    const allKids = (childrenOf.get(id) ?? []).filter((k) => byId.has(k));
    // Only descend into kids whose primary parent is the current node — multi-parent
    // children get visited under their deepest parent so they cluster correctly.
    const kids = sortKids(allKids.filter((k) => primaryParentOf.get(k) === id));
    if (!kids.length) {
      if (!seenLeaf.has(id)) {
        seenLeaf.add(id);
        leafOrder.push(id);
      }
      return;
    }
    for (const k of kids) walkLeaves(k);
  };

  for (const family of (rootFamilies.length ? rootFamilies : families)) {
    walkLeaves(family.id);
  }

  nodes
    .filter((node) => (childrenOf.get(node.id) ?? []).length === 0)
    .sort((a, b) => (a.y ?? 0) - (b.y ?? 0) || a.label.localeCompare(b.label))
    .forEach((node) => {
      if (!seenLeaf.has(node.id)) leafOrder.push(node.id);
    });

  const totalLeavesN = Math.max(1, leafOrder.length);
  const stepA = (Math.PI * 2) / totalLeavesN;
  const startLeafA = -Math.PI / 2 + stepA / 2;
  const angleOf = new Map<string, number>();
  leafOrder.forEach((id, i) => angleOf.set(id, startLeafA + i * stepA));

  const leafDescendants = (id: string): string[] => {
    const acc: string[] = [];
    const seen = new Set<string>();
    const walk = (cur: string) => {
      if (seen.has(cur)) return;
      seen.add(cur);
      const kids = childrenOf.get(cur) ?? [];
      if (!kids.length) {
        acc.push(cur);
        return;
      }
      for (const k of kids) walk(k);
    };
    walk(id);
    return acc;
  };

  const circularMean = (angles: number[]): number => {
    let xs = 0;
    let ys = 0;
    for (const a of angles) {
      xs += Math.cos(a);
      ys += Math.sin(a);
    }
    return Math.atan2(ys / angles.length, xs / angles.length);
  };

  for (const n of nodes) {
    if (angleOf.has(n.id)) continue;
    const leaves = leafDescendants(n.id);
    const angles = leaves.map((l) => angleOf.get(l)).filter((a): a is number => a !== undefined);
    if (angles.length) angleOf.set(n.id, circularMean(angles));
  }

  const displayDepthOf = (id: string): number => {
    const node = byId.get(id);
    if (!node) return 3;
    const parentIds = parentsOf.get(id) ?? [];
    const hasFamilyParent = parentIds.some((parentId) => byId.get(parentId)?.type === "family");
    const hasChildren = (childrenOf.get(id) ?? []).length > 0;

    if (node.type === "family") return hasFamilyParent ? 1.5 : 1;
    if (node.type === "race") return 2;
    if (hasChildren) return 2.5;
    return 3;
  };

  const size = LAYOUT_SIZE;
  const cx = size / 2;
  const cy = size / 2;

  const out: LayoutNode[] = [];
  const links: { from: LayoutNode; to: LayoutNode }[] = [];
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
    x: cx,
    y: cy,
  };
  out.push(root);

  const nodeMap = new Map<string, LayoutNode>();
  for (const n of nodes) {
    const a = angleOf.get(n.id);
    if (a === undefined) continue;
    const depth = displayDepthOf(n.id);
    const radius = radiusForDepth(size, depth);
    const ln: LayoutNode = {
      id: n.id,
      label: n.label,
      type: n.type,
      depth,
      angle: a,
      startAngle: a,
      endAngle: a,
      radius,
      color: colorFor(n),
      parentId: null,
      x: cx + Math.cos(a) * radius,
      y: cy + Math.sin(a) * radius,
    };
    out.push(ln);
    nodeMap.set(n.id, ln);
  }

  for (const e of edges) {
    const from = nodeMap.get(e.parent_id);
    const to = nodeMap.get(e.child_id);
    if (!from || !to) continue;
    links.push({ from, to });
  }
  for (const family of (rootFamilies.length ? rootFamilies : families)) {
    const ln = nodeMap.get(family.id);
    if (ln) links.push({ from: root, to: ln });
  }

  const guideRadii = Object.entries(DEPTH_TO_RADIUS)
    .filter(([depth]) => depth !== "0")
    .map(([, ratio]) => size * ratio);

  return { nodes: out, links, size, guideRadii };
}