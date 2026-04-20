// Pure rolling logic for the Racegen page.
// Operates on the in-memory evolution graph loaded from Supabase.
import {
  EvoNode,
  EvoEdge,
  resolveEffectiveTags,
  getChildIds,
  getParentIds,
  getFamilyAncestor,
} from "./evolutionGraph";
import { TRAITS } from "@/data/traits";

export interface LineageNode {
  // Source node from the graph this lineage entry resolved to
  nodeId: string;
  label: string;
  type: string;
  reproduction_mode: string;
  effectiveTags: string[];
  gender: "M" | "F";
  // For sexual lineages, parents.length === 2; asexual = 1; transformed = 1 (the host); created = 1 (creator)
  parents: LineageNode[];
  // Per-race DNA percent contribution to the rolled subject
  dnaShare: number;
  // For transformed nodes, the host they were rolled from (kept distinct from "parents" tree
  // for clarity in UI; we still place it in parents for tree rendering).
  isHost?: boolean;
  isCreator?: boolean;
}

export interface RolledSubject {
  initials: string;
  gender: "M" | "F";
  identityNodeId: string;
  identityLabel: string;
  identityFamily: string | null;
  variantLabel: string | null; // chosen variant under the identity, if any
  reproduction_mode: string;
  lineage: LineageNode;
  // Aggregated DNA breakdown by race-level node label.
  dna: { label: string; pct: number }[];
  traits: { pos: string; neu: string; neg: string };
  effectiveTags: string[];
}

// ---------- helpers ----------
function rand<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function weightedPick<T extends { weight: number }>(items: T[]): T | null {
  if (items.length === 0) return null;
  const total = items.reduce((s, it) => s + Math.max(0.0001, it.weight), 0);
  let r = Math.random() * total;
  for (const it of items) {
    r -= Math.max(0.0001, it.weight);
    if (r <= 0) return it;
  }
  return items[items.length - 1];
}

function generateInitials(): string {
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const r = Math.random();
  let count = 2;
  if (r > 0.9) count = 1;
  else if (r > 0.6) count = 3;
  let res = "";
  for (let i = 0; i < count; i++) {
    res += letters[Math.floor(Math.random() * 26)] + ".";
    if (i < count - 1) res += " ";
  }
  return res;
}

function rollGender(): "M" | "F" {
  return Math.random() < 0.5 ? "M" : "F";
}

function pickTraits() {
  return { pos: rand(TRAITS.pos), neu: rand(TRAITS.neu), neg: rand(TRAITS.neg) };
}

// Recursive subtree weight (used to weight families by what they contain).
function subtreeWeight(nodeId: string, nodes: EvoNode[], edges: EvoEdge[], cache: Map<string, number>): number {
  if (cache.has(nodeId)) return cache.get(nodeId)!;
  const node = nodes.find((n) => n.id === nodeId)!;
  const children = getChildIds(nodeId, edges);
  let w = node.weight ?? 1;
  if (children.length > 0) {
    // For families, sum descendants so families that have many heavy races bubble up.
    if (node.type === "family") {
      w = children.reduce((acc, c) => acc + subtreeWeight(c, nodes, edges, cache), 0);
    }
  }
  cache.set(nodeId, w);
  return w;
}

// ---------- core rolling ----------

interface Ctx {
  nodes: EvoNode[];
  edges: EvoEdge[];
  byId: Map<string, EvoNode>;
  weightCache: Map<string, number>;
  // Block infinite recursion / category cycling.
  depth: number;
}

const MAX_DEPTH = 6;

/** Roll a leaf race + variant identity from a given pool of race-type nodes (weighted). */
function pickRaceFromPool(pool: EvoNode[], ctx: Ctx): EvoNode | null {
  if (pool.length === 0) return null;
  const items = pool.map((n) => ({ weight: subtreeWeight(n.id, ctx.nodes, ctx.edges, ctx.weightCache), node: n }));
  const picked = weightedPick(items);
  return picked?.node ?? null;
}

/** Get all descendant 'race' nodes under a family (or just return the node if it's already race-typed) */
function getRaceDescendants(nodeId: string, ctx: Ctx): EvoNode[] {
  const node = ctx.byId.get(nodeId);
  if (!node) return [];
  if (node.type === "race") return [node];
  const out: EvoNode[] = [];
  const stack = getChildIds(nodeId, ctx.edges);
  const seen = new Set<string>();
  while (stack.length) {
    const cid = stack.pop()!;
    if (seen.has(cid)) continue;
    seen.add(cid);
    const c = ctx.byId.get(cid);
    if (!c) continue;
    if (c.type === "race") out.push(c);
    else stack.push(...getChildIds(cid, ctx.edges));
  }
  return out;
}

/** Pick a variant child of a race (if any). Variants are weighted. */
function pickVariant(raceId: string, ctx: Ctx): EvoNode | null {
  const variantIds = getChildIds(raceId, ctx.edges);
  const variants = variantIds
    .map((id) => ctx.byId.get(id))
    .filter((n): n is EvoNode => !!n && n.type === "variant");
  if (variants.length === 0) return null;
  const picked = weightedPick(variants.map((v) => ({ weight: v.weight ?? 1, node: v })));
  return picked?.node ?? null;
}

/** Find host candidates whose effective tags satisfy the host_required_tags filter.
 *  Hosts must be birthable races (sexual/asexual). Variants and transforms are skipped. */
function findHostCandidates(targetNode: EvoNode, ctx: Ctx): EvoNode[] {
  const required = targetNode.host_required_tags ?? [];
  const matchAll = (targetNode.host_tag_match_mode ?? "all") === "all";
  const allRaces = ctx.nodes.filter((n) => n.type === "race");
  return allRaces.filter((race) => {
    if (race.id === targetNode.id) return false;
    if (race.reproduction_mode !== "sexual" && race.reproduction_mode !== "asexual") return false;
    if (required.length === 0) return true;
    const tags = resolveEffectiveTags(race.id, ctx.nodes, ctx.edges);
    if (matchAll) return required.every((t) => tags.has(t));
    return required.some((t) => tags.has(t));
  });
}

/** A node "drives" reproduction if it has a non-default mode. Variants with transformed/created/asexual
 *  modes act as the identity for the rolled subject, overriding their parent race's mode. */
function isTransformIdentity(n: EvoNode): boolean {
  return n.reproduction_mode === "transformed" || n.reproduction_mode === "created";
}

/** Roll a "birthable" lineage subtree: handles sexual + asexual modes only. Used as the
 *  basis for both top-level rolls and as host lineages for transformed subjects. */
function rollBirthableLineage(node: EvoNode, ctx: Ctx, share: number, gender: "M" | "F"): LineageNode {
  const tags = Array.from(resolveEffectiveTags(node.id, ctx.nodes, ctx.edges));
  const lineage: LineageNode = {
    nodeId: node.id,
    label: node.label,
    type: node.type,
    reproduction_mode: node.reproduction_mode,
    effectiveTags: tags,
    gender,
    parents: [],
    dnaShare: share,
  };

  if (ctx.depth >= MAX_DEPTH) return lineage;

  // Asexual: single parent of same race.
  if (node.reproduction_mode === "asexual") {
    ctx.depth++;
    const parentLineage = rollBirthableLineage(node, ctx, share, rollGender());
    ctx.depth--;
    lineage.parents.push(parentLineage);
    return lineage;
  }

  // Sexual: two parents. One inherits this race; the other may "mate up" to a different family.
  const family = getFamilyAncestor(node.id, ctx.nodes, ctx.edges);
  const mateUp = Math.random() < (node.mate_up_probability ?? 0.33);

  // Parent 1: same race
  ctx.depth++;
  const p1 = rollBirthableLineage(node, ctx, share / 2, "M");
  ctx.depth--;

  // Parent 2: same family (default) or different family (mate-up)
  let p2Race: EvoNode = node;
  if (mateUp && family) {
    // pick a different family
    const otherFamilies = ctx.nodes.filter((n) => n.type === "family" && n.id !== family.id);
    const famPicked = pickRaceFromPool(otherFamilies, ctx);
    if (famPicked) {
      const races = getRaceDescendants(famPicked.id, ctx).filter(
        (r) => r.reproduction_mode === "sexual" || r.reproduction_mode === "asexual"
      );
      const r = pickRaceFromPool(races, ctx);
      if (r) p2Race = r;
    }
  } else if (family) {
    // pick another race in same family
    const sameFam = getRaceDescendants(family.id, ctx).filter(
      (r) => r.reproduction_mode === "sexual" || r.reproduction_mode === "asexual"
    );
    const r = pickRaceFromPool(sameFam, ctx);
    if (r) p2Race = r;
  }

  ctx.depth++;
  const p2 = rollBirthableLineage(p2Race, ctx, share / 2, "F");
  ctx.depth--;

  lineage.parents.push(p1, p2);
  return lineage;
}

/** Pick a host node for a transformed subject. Branch 1: parent is birthable race. Branch 2: tag-filtered random. */
function pickHostForTransformed(target: EvoNode, ctx: Ctx): EvoNode | null {
  // Branch 1: any direct parent that's a birthable race?
  const parentIds = getParentIds(target.id, ctx.edges);
  const birthableParent = parentIds
    .map((id) => ctx.byId.get(id))
    .find((n): n is EvoNode => !!n && n.type === "race" && (n.reproduction_mode === "sexual" || n.reproduction_mode === "asexual"));
  if (birthableParent) return birthableParent;

  // Branch 2: tag-filtered candidates from the wider graph.
  const candidates = findHostCandidates(target, ctx);
  return pickRaceFromPool(candidates, ctx);
}

/** Pick a creator for a 'created' subject. Uses mate_up_probability as climb-out chance. */
function pickCreator(target: EvoNode, ctx: Ctx): EvoNode | null {
  const family = getFamilyAncestor(target.id, ctx.nodes, ctx.edges);
  const climb = Math.random() < (target.mate_up_probability ?? 0.33);
  if (climb || !family) {
    // Pick from any other family's birthable races
    const others = ctx.nodes.filter(
      (n) => n.type === "race" &&
        (n.reproduction_mode === "sexual" || n.reproduction_mode === "asexual") &&
        getFamilyAncestor(n.id, ctx.nodes, ctx.edges)?.id !== family?.id
    );
    return pickRaceFromPool(others, ctx);
  }
  // Same family creators
  const same = getRaceDescendants(family.id, ctx).filter(
    (r) => r.id !== target.id && (r.reproduction_mode === "sexual" || r.reproduction_mode === "asexual")
  );
  return pickRaceFromPool(same, ctx);
}

/** Top-level: roll one full subject. */
export function rollSubject(nodes: EvoNode[], edges: EvoEdge[], options?: { seedRaceId?: string }): RolledSubject {
  const ctx: Ctx = {
    nodes,
    edges,
    byId: new Map(nodes.map((n) => [n.id, n])),
    weightCache: new Map(),
    depth: 0,
  };

  // 1) pick the identity race
  let identity: EvoNode | null = null;
  if (options?.seedRaceId) identity = ctx.byId.get(options.seedRaceId) ?? null;
  if (!identity) {
    // weighted pick across ALL race-type nodes (any mode allowed at top level)
    const allRaces = nodes.filter((n) => n.type === "race");
    identity = pickRaceFromPool(allRaces, ctx);
  }
  if (!identity) {
    throw new Error("No race nodes available");
  }

  let variant = pickVariant(identity.id, ctx);
  // If the chosen variant carries a transform/created mode, promote it to identity.
  // The original race becomes the lineage root for that transform's host search via tags.
  if (variant && isTransformIdentity(variant)) {
    identity = variant;
    variant = null; // variant has been promoted; no separate variant label
  }
  const family = getFamilyAncestor(identity.id, ctx.nodes, ctx.edges);
  const identityTags = Array.from(resolveEffectiveTags(identity.id, ctx.nodes, ctx.edges));

  let lineage: LineageNode;
  let gender: "M" | "F";

  switch (identity.reproduction_mode) {
    case "asexual": {
      gender = rollGender();
      lineage = rollBirthableLineage(identity, ctx, 1, gender);
      break;
    }
    case "transformed": {
      const host = pickHostForTransformed(identity, ctx);
      if (host) {
        ctx.depth++;
        const hostGender = rollGender();
        const hostLineage = rollBirthableLineage(host, ctx, 1, hostGender);
        ctx.depth--;
        gender = hostGender; // gender inherits from host
        // Wrap as a transformed lineage: identity sits on top, host below as a single "parent"
        lineage = {
          nodeId: identity.id,
          label: identity.label,
          type: identity.type,
          reproduction_mode: identity.reproduction_mode,
          effectiveTags: identityTags,
          gender,
          parents: [{ ...hostLineage, isHost: true }],
          dnaShare: 1,
        };
      } else {
        gender = rollGender();
        lineage = {
          nodeId: identity.id, label: identity.label, type: identity.type,
          reproduction_mode: identity.reproduction_mode, effectiveTags: identityTags,
          gender, parents: [], dnaShare: 1,
        };
      }
      break;
    }
    case "created": {
      gender = rollGender();
      const creator = pickCreator(identity, ctx);
      const parents: LineageNode[] = [];
      if (creator) {
        ctx.depth++;
        const cLin = rollBirthableLineage(creator, ctx, 0, rollGender());
        ctx.depth--;
        cLin.dnaShare = 0; // creator doesn't contribute DNA
        cLin.isCreator = true;
        parents.push(cLin);
      }
      lineage = {
        nodeId: identity.id, label: identity.label, type: identity.type,
        reproduction_mode: identity.reproduction_mode, effectiveTags: identityTags,
        gender, parents, dnaShare: 1,
      };
      break;
    }
    case "sexual":
    default: {
      gender = rollGender();
      lineage = rollBirthableLineage(identity, ctx, 1, gender);
      break;
    }
  }

  // Aggregate DNA: walk the lineage tree and sum dnaShare by leaf race label.
  // For transformed/created, the identity is 100% itself.
  const dnaMap = new Map<string, number>();
  if (identity.reproduction_mode === "transformed" || identity.reproduction_mode === "created" || identity.reproduction_mode === "asexual") {
    dnaMap.set(identity.label, 1);
  } else {
    const walk = (l: LineageNode) => {
      if (l.parents.length === 0) {
        dnaMap.set(l.label, (dnaMap.get(l.label) ?? 0) + l.dnaShare);
      } else {
        for (const p of l.parents) walk(p);
      }
    };
    walk(lineage);
  }
  const dna = Array.from(dnaMap.entries())
    .map(([label, share]) => ({ label, pct: share * 100 }))
    .sort((a, b) => b.pct - a.pct);

  return {
    initials: generateInitials(),
    gender,
    identityNodeId: identity.id,
    identityLabel: identity.label,
    identityFamily: family?.label ?? null,
    variantLabel: variant?.label ?? null,
    reproduction_mode: identity.reproduction_mode,
    lineage,
    dna,
    traits: pickTraits(),
    effectiveTags: identityTags,
  };
}
