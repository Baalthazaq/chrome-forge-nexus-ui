// Shared helpers for the evolution graph (Circle of Life + Racegen).
// Operates on plain arrays of nodes/edges loaded from Supabase.

export interface EvoNode {
  id: string;
  label: string;
  type: string; // 'family' | 'race' | 'variant' (free text in DB)
  color: string | null;
  weight: number;
  mate_up_probability: number;
  reproduction_mode: string; // 'sexual' | 'asexual' | 'transformed' | 'created'
  tags: string[];
  host_required_tags: string[];
  host_tag_match_mode: string; // 'all' | 'any'
}

export interface EvoEdge {
  id: string;
  parent_id: string;
  child_id: string;
}

/**
 * Resolve effective tags for a node by walking ancestors.
 * - A node's own tags ∪ all ancestor tags
 * - A `!Foo` entry on any node REMOVES `Foo` from the effective set
 *   (overrides additions made anywhere in the chain)
 * - Family + Race + Variant labels are auto-added as tags so transformations
 *   can target a specific lineage without separate columns.
 */
export function resolveEffectiveTags(
  nodeId: string,
  nodes: EvoNode[],
  edges: EvoEdge[]
): Set<string> {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const parentsOf = new Map<string, string[]>();
  for (const n of nodes) parentsOf.set(n.id, []);
  for (const e of edges) parentsOf.get(e.child_id)?.push(e.parent_id);

  const additions = new Set<string>();
  const removals = new Set<string>();
  const visited = new Set<string>();

  const walk = (id: string) => {
    if (visited.has(id)) return;
    visited.add(id);
    const node = byId.get(id);
    if (!node) return;
    // Auto-tag with the node's own label so e.g. "Dragon" or "Drow" is targetable.
    // Source-typed nodes are excluded — "The Source" is structural, not a tag.
    if (node.type !== "source") additions.add(node.label);
    for (const raw of node.tags ?? []) {
      const t = raw.trim();
      if (!t) continue;
      if (t.startsWith("!")) removals.add(t.slice(1));
      else additions.add(t);
    }
    for (const pid of parentsOf.get(id) ?? []) walk(pid);
  };
  walk(nodeId);

  for (const r of removals) additions.delete(r);
  return additions;
}

/** All ancestor node ids (excluding self) */
export function getAncestorIds(
  nodeId: string,
  edges: EvoEdge[]
): Set<string> {
  const parentsOf = new Map<string, string[]>();
  for (const e of edges) {
    if (!parentsOf.has(e.child_id)) parentsOf.set(e.child_id, []);
    parentsOf.get(e.child_id)!.push(e.parent_id);
  }
  const out = new Set<string>();
  const stack = [...(parentsOf.get(nodeId) ?? [])];
  while (stack.length) {
    const id = stack.pop()!;
    if (out.has(id)) continue;
    out.add(id);
    for (const p of parentsOf.get(id) ?? []) stack.push(p);
  }
  return out;
}

/** Direct children of a node */
export function getChildIds(nodeId: string, edges: EvoEdge[]): string[] {
  return edges.filter((e) => e.parent_id === nodeId).map((e) => e.child_id);
}

/** Direct parents of a node */
export function getParentIds(nodeId: string, edges: EvoEdge[]): string[] {
  return edges.filter((e) => e.child_id === nodeId).map((e) => e.parent_id);
}

/** Find the family ancestor (type === 'family') for a node, if any.
 *  "The Source" (type 'source') is intentionally NOT a family — it sits above families. */
export function getFamilyAncestor(
  nodeId: string,
  nodes: EvoNode[],
  edges: EvoEdge[]
): EvoNode | null {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const self = byId.get(nodeId);
  if (self?.type === "family") return self;
  for (const aid of getAncestorIds(nodeId, edges)) {
    const a = byId.get(aid);
    if (a?.type === "family") return a;
  }
  return null;
}

/** Find the Source ancestor (type === 'source') for a node, if any. */
export function getSourceAncestor(
  nodeId: string,
  nodes: EvoNode[],
  edges: EvoEdge[]
): EvoNode | null {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const self = byId.get(nodeId);
  if (self?.type === "source") return self;
  for (const aid of getAncestorIds(nodeId, edges)) {
    const a = byId.get(aid);
    if (a?.type === "source") return a;
  }
  return null;
}
