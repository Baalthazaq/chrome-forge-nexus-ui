// Shared helpers for the evolution graph (Circle of Life + Racegen).
// Operates on plain arrays of nodes/edges loaded from Supabase.

export interface EvoNode {
  id: string;
  label: string;
  type: string; // 'source' | 'node' (legacy values 'family'|'race'|'variant' still tolerated)
  color: string | null;
  weight: number;
  mate_up_probability: number;
  // null means: inherit from nearest ancestor with an explicit value.
  reproduction_mode: string | null;
  tags: string[];
  /** Tags this node can breed with. Inherited; suppressible with `!Tag`. */
  mate_tags: string[];
  is_carrier?: boolean;
}

export interface EvoEdge {
  id: string;
  parent_id: string;
  child_id: string;
}

export interface EvoTransformation {
  id: string;
  label: string;
  description: string | null;
  granted_tags: string[];
  host_required_tags: string[];
  host_tag_match_mode: string; // 'all' | 'any'
  forbidden_tags: string[];
  acquisition: string; // 'innate' | 'afflicted'
  carrier_node_id: string | null;
  stackable: boolean;
  stage: number;
  chance: number;
  powers?: { name: string; description: string }[] | null;
}

/** Walk all ancestor ids of a node (excluding self), in BFS order. */
function ancestorWalkOrdered(nodeId: string, edges: EvoEdge[]): string[] {
  const parentsOf = new Map<string, string[]>();
  for (const e of edges) {
    if (!parentsOf.has(e.child_id)) parentsOf.set(e.child_id, []);
    parentsOf.get(e.child_id)!.push(e.parent_id);
  }
  const out: string[] = [];
  const seen = new Set<string>();
  const queue = [...(parentsOf.get(nodeId) ?? [])];
  while (queue.length) {
    const id = queue.shift()!;
    if (seen.has(id)) continue;
    seen.add(id);
    out.push(id);
    for (const p of parentsOf.get(id) ?? []) queue.push(p);
  }
  return out;
}

/** Generic accumulator for inheritable tag-style fields with `!` suppression.
 *  Walks self + ancestors, unions positive entries, removes `!Foo` suppressions. */
function resolveInheritedTagSet(
  nodeId: string,
  nodes: EvoNode[],
  edges: EvoEdge[],
  field: (n: EvoNode) => string[],
  includeSelfLabel: boolean,
): Set<string> {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const additions = new Set<string>();
  const removals = new Set<string>();

  const visit = (id: string) => {
    const node = byId.get(id);
    if (!node) return;
    if (includeSelfLabel && node.type !== "source") additions.add(node.label);
    for (const raw of field(node) ?? []) {
      const t = raw.trim();
      if (!t) continue;
      if (t.startsWith("!")) removals.add(t.slice(1));
      else additions.add(t);
    }
  };

  visit(nodeId);
  for (const aid of ancestorWalkOrdered(nodeId, edges)) visit(aid);

  for (const r of removals) additions.delete(r);
  return additions;
}

/**
 * Resolve effective identity tags for a node by walking ancestors.
 * - A node's own tags ∪ all ancestor tags
 * - `!Foo` removes `Foo` for self + descendants
 * - Each non-source node's `label` is auto-added so e.g. "Drow" is targetable.
 */
export function resolveEffectiveTags(
  nodeId: string,
  nodes: EvoNode[],
  edges: EvoEdge[],
): Set<string> {
  return resolveInheritedTagSet(nodeId, nodes, edges, (n) => n.tags, true);
}

/**
 * Resolve effective mate-compatibility tags. Inherited and `!`-suppressible
 * just like identity tags, but does NOT auto-include node labels.
 */
export function resolveEffectiveMateTags(
  nodeId: string,
  nodes: EvoNode[],
  edges: EvoEdge[],
): Set<string> {
  return resolveInheritedTagSet(nodeId, nodes, edges, (n) => n.mate_tags ?? [], false);
}

/**
 * Resolve effective reproduction mode by walking up until we hit the nearest
 * ancestor (or self) with an explicit non-null value. Source nodes are skipped.
 * Returns null if nothing in the chain sets it.
 */
export function resolveReproductionMode(
  nodeId: string,
  nodes: EvoNode[],
  edges: EvoEdge[],
): string | null {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const self = byId.get(nodeId);
  if (self && self.type !== "source" && self.reproduction_mode) {
    return self.reproduction_mode;
  }
  for (const aid of ancestorWalkOrdered(nodeId, edges)) {
    const a = byId.get(aid);
    if (!a || a.type === "source") continue;
    if (a.reproduction_mode) return a.reproduction_mode;
  }
  return null;
}

/** All ancestor node ids (excluding self) */
export function getAncestorIds(
  nodeId: string,
  edges: EvoEdge[]
): Set<string> {
  return new Set(ancestorWalkOrdered(nodeId, edges));
}

/** Direct children of a node */
export function getChildIds(nodeId: string, edges: EvoEdge[]): string[] {
  return edges.filter((e) => e.parent_id === nodeId).map((e) => e.child_id);
}

/** Direct parents of a node */
export function getParentIds(nodeId: string, edges: EvoEdge[]): string[] {
  return edges.filter((e) => e.child_id === nodeId).map((e) => e.parent_id);
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

/**
 * Legacy helper kept for back-compat with code that still uses the old
 * family/race/variant model. After the type collapse it returns the nearest
 * non-source ancestor that has any children — i.e. the "lineage anchor".
 */
export function getFamilyAncestor(
  nodeId: string,
  nodes: EvoNode[],
  edges: EvoEdge[]
): EvoNode | null {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  // Legacy fast path: if 'family' rows still exist somewhere, prefer them.
  for (const aid of [nodeId, ...ancestorWalkOrdered(nodeId, edges)]) {
    const a = byId.get(aid);
    if (a?.type === "family") return a;
  }
  // New model: return nearest non-source ancestor with children.
  const childrenOf = new Map<string, number>();
  for (const e of edges) childrenOf.set(e.parent_id, (childrenOf.get(e.parent_id) ?? 0) + 1);
  for (const aid of ancestorWalkOrdered(nodeId, edges)) {
    const a = byId.get(aid);
    if (!a || a.type === "source") continue;
    if ((childrenOf.get(aid) ?? 0) > 0) return a;
  }
  return null;
}
