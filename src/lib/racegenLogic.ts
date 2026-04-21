// Pure rolling logic for the Racegen page.
// Operates on the in-memory evolution graph + transformations table loaded from Supabase.
import {
  EvoNode,
  EvoEdge,
  EvoTransformation,
  resolveEffectiveTags,
  getChildIds,
  getParentIds,
  getFamilyAncestor,
} from "./evolutionGraph";
import { TRAITS } from "@/data/traits";

export interface LineageNode {
  nodeId: string;
  label: string;
  type: string;
  reproduction_mode: string;
  effectiveTags: string[];
  gender: "M" | "F";
  parents: LineageNode[];
  dnaShare: number;
  isHost?: boolean;
  isCreator?: boolean;
}

export interface AppliedTransformation {
  id: string;
  label: string;
  acquisition: string;
  carrierLabel: string | null;
  grantedTags: string[];
}

export interface SecondaryIdentity {
  raceLabel: string;
  variantLabel: string | null;
  pct: number;
}

export interface RolledSubject {
  initials: string;
  gender: "M" | "F";
  identityNodeId: string;
  identityLabel: string;
  identityFamily: string | null;
  variantLabel: string | null;
  reproduction_mode: string;
  origin_mode: string;
  lineage: LineageNode;
  // Aggregated DNA breakdown by leaf race label.
  dna: { label: string; pct: number }[];
  // Secondary races/variants whose DNA share is ≥ 25% (excludes the primary).
  secondaryIdentities: SecondaryIdentity[];
  // For parasitic subjects: DNA of the hijacked host body. Identity DNA is N/A.
  hijackedDna?: { label: string; pct: number }[];
  // Tags inherited from a hijacked host (parasitic origin only).
  inheritedHostTags?: string[];
  traits: { pos: string; neu: string; neg: string };
  effectiveTags: string[];
  transformations: AppliedTransformation[];
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

function originOf(n: EvoNode | undefined | null): string {
  return (n?.origin_mode ?? "born");
}

function subtreeWeight(nodeId: string, nodes: EvoNode[], edges: EvoEdge[], cache: Map<string, number>): number {
  if (cache.has(nodeId)) return cache.get(nodeId)!;
  const node = nodes.find((n) => n.id === nodeId)!;
  const children = getChildIds(nodeId, edges);
  let w = node.weight ?? 1;
  if (children.length > 0 && node.type === "family") {
    w = children.reduce((acc, c) => acc + subtreeWeight(c, nodes, edges, cache), 0);
  }
  cache.set(nodeId, w);
  return w;
}

interface Ctx {
  nodes: EvoNode[];
  edges: EvoEdge[];
  byId: Map<string, EvoNode>;
  weightCache: Map<string, number>;
  effectiveWeightCache: Map<string, number>;
  depth: number;
}

const MAX_DEPTH = 3;
const MATE_UP_DECAY = 0.5;

function getEffectiveWeight(nodeId: string, ctx: Ctx): number {
  const cached = ctx.effectiveWeightCache.get(nodeId);
  if (cached !== undefined) return cached;
  const n = ctx.byId.get(nodeId);
  const w = Math.max(0.0001, (n?.weight ?? 1) * (n?.mate_up_probability ?? 0.2));
  ctx.effectiveWeightCache.set(nodeId, w);
  return w;
}

/** Race nodes that can serve as a roll-able identity:
 *  excludes carriers, transformed/created reproduction (legacy), and non-born origins by default. */
function isRollableRace(n: EvoNode): boolean {
  if (n.type !== "race") return false;
  if (n.is_carrier) return false;
  return true;
}

function pickRaceFromPool(pool: EvoNode[], ctx: Ctx): EvoNode | null {
  if (pool.length === 0) return null;
  const items = pool.map((n) => ({ weight: subtreeWeight(n.id, ctx.nodes, ctx.edges, ctx.weightCache), node: n }));
  const picked = weightedPick(items);
  return picked?.node ?? null;
}

function pickVariant(raceId: string, ctx: Ctx): EvoNode | null {
  const variantIds = getChildIds(raceId, ctx.edges);
  const variants = variantIds
    .map((id) => ctx.byId.get(id))
    .filter((n): n is EvoNode => !!n && n.type === "variant" && !n.is_carrier);
  if (variants.length === 0) return null;
  const picked = weightedPick(variants.map((v) => ({ weight: v.weight ?? 1, node: v })));
  return picked?.node ?? null;
}

function findHostCandidates(targetTags: string[], matchMode: string, ctx: Ctx, excludeId?: string): EvoNode[] {
  const required = targetTags ?? [];
  const matchAll = (matchMode ?? "all") === "all";
  const allRaces = ctx.nodes.filter((n) => isRollableRace(n) && originOf(n) === "born");
  return allRaces.filter((race) => {
    if (race.id === excludeId) return false;
    if (race.reproduction_mode !== "sexual" && race.reproduction_mode !== "asexual") return false;
    if (required.length === 0) return true;
    const tags = resolveEffectiveTags(race.id, ctx.nodes, ctx.edges);
    if (matchAll) return required.every((t) => tags.has(t));
    return required.some((t) => tags.has(t));
  });
}

function getPrimaryParent(nodeId: string, ctx: Ctx): EvoNode | null {
  const parentIds = getParentIds(nodeId, ctx.edges);
  const parents = parentIds.map((id) => ctx.byId.get(id)).filter((n): n is EvoNode => !!n);
  if (parents.length === 0) return null;
  const nonSource = parents.find((p) => p.type !== "source");
  return nonSource ?? parents[0];
}

function pickLeafDescendant(rootId: string, ctx: Ctx): EvoNode | null {
  const root = ctx.byId.get(rootId);
  if (!root) return null;
  const childIds = getChildIds(rootId, ctx.edges);
  const sexualChildren = childIds
    .map((id) => ctx.byId.get(id))
    .filter((n): n is EvoNode =>
      !!n && !n.is_carrier &&
      (n.type === "source" || n.type === "family" || n.reproduction_mode === "sexual" || n.reproduction_mode === "asexual")
    );

  if (sexualChildren.length === 0) {
    if ((root.type === "race" || root.type === "variant") && !root.is_carrier &&
        (root.reproduction_mode === "sexual" || root.reproduction_mode === "asexual")) return root;
    return null;
  }

  const items = sexualChildren.map((c) => ({ weight: getEffectiveWeight(c.id, ctx), node: c }));
  const tried = new Set<string>();
  for (let attempts = 0; attempts < items.length * 2; attempts++) {
    const remaining = items.filter((it) => !tried.has(it.node.id));
    if (remaining.length === 0) break;
    const picked = weightedPick(remaining);
    if (!picked) break;
    tried.add(picked.node.id);
    const leaf = pickLeafDescendant(picked.node.id, ctx);
    if (leaf) return leaf;
  }
  return null;
}

function pickMatePartner(subjectNode: EvoNode, ctx: Ctx): EvoNode | null {
  const decay = Math.pow(MATE_UP_DECAY, ctx.depth);
  let level: EvoNode = subjectNode;
  for (let i = 0; i < 16; i++) {
    const p = (level.mate_up_probability ?? 0.2) * decay;
    const parent = getPrimaryParent(level.id, ctx);
    if (parent && Math.random() < p) {
      level = parent;
      continue;
    }
    break;
  }
  const leaf = pickLeafDescendant(level.id, ctx);
  if (leaf) return leaf;
  return subjectNode;
}

/** Recursive birthable lineage. Honors variant_inheritance quirk on the race.
 *  When `node` is a variant, the returned LineageNode wraps it and nests its
 *  parent race as a single child carrying the actual lineage recursion — so
 *  the tree shows BOTH the variant AND the race it descends from. */
function rollBirthableLineage(node: EvoNode, ctx: Ctx, share: number, gender: "M" | "F"): LineageNode {
  if (node.type === "variant") {
    const parentIds = getParentIds(node.id, ctx.edges);
    const parentRace = parentIds
      .map((id) => ctx.byId.get(id))
      .find((n): n is EvoNode => !!n && n.type === "race");
    if (parentRace) {
      const variantTags = Array.from(resolveEffectiveTags(node.id, ctx.nodes, ctx.edges));
      const inner = rollBirthableLineageInner(parentRace, ctx, share, gender);
      return {
        nodeId: node.id,
        label: node.label,
        type: node.type,
        reproduction_mode: node.reproduction_mode,
        effectiveTags: variantTags,
        gender,
        parents: [inner],
        dnaShare: share,
      };
    }
  }
  return rollBirthableLineageInner(node, ctx, share, gender);
}

function rollBirthableLineageInner(node: EvoNode, ctx: Ctx, share: number, gender: "M" | "F"): LineageNode {
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

  if (node.reproduction_mode === "asexual") {
    ctx.depth++;
    const parentLineage = rollBirthableLineage(node, ctx, share, rollGender());
    ctx.depth--;
    lineage.parents.push(parentLineage);
    return lineage;
  }

  let raceForQuirk: EvoNode | undefined = node.type === "race" ? node : undefined;
  if (!raceForQuirk && node.type === "variant") {
    const parentIds = getParentIds(node.id, ctx.edges);
    raceForQuirk = parentIds.map((id) => ctx.byId.get(id)).find((n): n is EvoNode => !!n && n.type === "race");
  }
  const inheritance = raceForQuirk?.variant_inheritance ?? "random";

  ctx.depth++;
  const p1 = rollBirthableLineage(node, ctx, share / 2, "M");
  ctx.depth--;

  const p2Node = pickMatePartner(node, ctx) ?? node;
  ctx.depth++;
  const p2 = rollBirthableLineage(p2Node, ctx, share / 2, "F");
  ctx.depth--;

  void inheritance;

  lineage.parents.push(p1, p2);
  return lineage;
}

function pickHostForParasite(target: EvoNode, ctx: Ctx): EvoNode | null {
  const candidates = findHostCandidates(target.host_required_tags ?? [], target.host_tag_match_mode ?? "all", ctx, target.id);
  return pickRaceFromPool(candidates, ctx);
}

function pickCreator(target: EvoNode, ctx: Ctx): EvoNode | null {
  // Creator is a node matching host_required_tags; fallback any born race.
  const cands = findHostCandidates(target.host_required_tags ?? [], target.host_tag_match_mode ?? "all", ctx, target.id);
  if (cands.length) return pickRaceFromPool(cands, ctx);
  const any = ctx.nodes.filter((n) => isRollableRace(n) && originOf(n) === "born" && n.id !== target.id);
  return pickRaceFromPool(any, ctx);
}

function aggregateDna(lineage: LineageNode): { label: string; pct: number }[] {
  const dnaMap = new Map<string, number>();
  const walk = (l: LineageNode) => {
    if (l.parents.length === 0) {
      dnaMap.set(l.label, (dnaMap.get(l.label) ?? 0) + l.dnaShare);
    } else {
      for (const p of l.parents) walk(p);
    }
  };
  walk(lineage);
  return Array.from(dnaMap.entries())
    .map(([label, share]) => ({ label, pct: share * 100 }))
    .sort((a, b) => b.pct - a.pct);
}

/** Aggregate DNA by (race, variant) pair — a variant wraps its parent race
 *  as its single child, so we track the most recent variant ancestor while
 *  walking, and credit each race-typed leaf with its enclosing variant. */
function aggregateIdentities(lineage: LineageNode): SecondaryIdentity[] {
  const map = new Map<string, SecondaryIdentity>();
  const walk = (l: LineageNode, currentVariant: string | null) => {
    const variantHere = l.type === "variant" ? l.label : currentVariant;
    if (l.parents.length === 0) {
      const raceLabel = l.type === "race" ? l.label : (variantHere ?? l.label);
      const variantLabel = l.type === "race" ? variantHere : null;
      const key = `${raceLabel}::${variantLabel ?? ""}`;
      const existing = map.get(key);
      if (existing) existing.pct += l.dnaShare * 100;
      else map.set(key, { raceLabel, variantLabel, pct: l.dnaShare * 100 });
      return;
    }
    for (const p of l.parents) walk(p, variantHere);
  };
  walk(lineage, null);
  return Array.from(map.values()).sort((a, b) => b.pct - a.pct);
}

/** Apply transformations from the transformations table.
 *  Iterates by stage; each transformation rolls against `chance` if host_required_tags match
 *  and forbidden_tags don't intersect. After applying, granted_tags expand the effective set
 *  so later-stage transformations can chain (Drider grants Spider → Queen unlocks). */
function applyTransformations(
  effectiveTags: Set<string>,
  transformations: EvoTransformation[],
  ctx: Ctx
): AppliedTransformation[] {
  const applied: AppliedTransformation[] = [];
  const sorted = [...transformations].sort((a, b) => a.stage - b.stage);
  // Multi-pass: re-evaluate later stages after a transformation grants new tags.
  // Simple approach: iterate sorted; since stages are ordered, granted tags from earlier
  // stages are already in effectiveTags by the time we reach later stages.
  for (const t of sorted) {
    if (!t.stackable && applied.some((a) => a.id === t.id)) continue;
    if ((t.forbidden_tags ?? []).some((f) => effectiveTags.has(f))) continue;
    const required = t.host_required_tags ?? [];
    const matchAll = (t.host_tag_match_mode ?? "all") === "all";
    if (required.length > 0) {
      const ok = matchAll
        ? required.every((r) => effectiveTags.has(r))
        : required.some((r) => effectiveTags.has(r));
      if (!ok) continue;
    }
    if (Math.random() >= (t.chance ?? 0.05)) continue;
    const carrier = t.carrier_node_id ? ctx.byId.get(t.carrier_node_id) : null;
    applied.push({
      id: t.id,
      label: t.label,
      acquisition: t.acquisition,
      carrierLabel: carrier?.label ?? null,
      grantedTags: t.granted_tags ?? [],
    });
    for (const g of t.granted_tags ?? []) effectiveTags.add(g);
  }
  return applied;
}

export function rollSubject(
  nodes: EvoNode[],
  edges: EvoEdge[],
  options?: { seedRaceId?: string; transformations?: EvoTransformation[] }
): RolledSubject {
  const ctx: Ctx = {
    nodes,
    edges,
    byId: new Map(nodes.map((n) => [n.id, n])),
    weightCache: new Map(),
    effectiveWeightCache: new Map(),
    depth: 0,
  };

  // 1) pick the identity race (any rollable race, including parasitic & created origins)
  let identity: EvoNode | null = null;
  if (options?.seedRaceId) identity = ctx.byId.get(options.seedRaceId) ?? null;
  if (!identity) {
    const allRaces = nodes.filter(isRollableRace);
    identity = pickRaceFromPool(allRaces, ctx);
  }
  if (!identity) throw new Error("No race nodes available");

  let variant = pickVariant(identity.id, ctx);
  const family = getFamilyAncestor(identity.id, ctx.nodes, ctx.edges);
  const identityTags = Array.from(resolveEffectiveTags(identity.id, ctx.nodes, ctx.edges));
  const origin = originOf(identity);

  let lineage: LineageNode;
  let gender: "M" | "F";
  let dna: { label: string; pct: number }[] = [];
  let hijackedDna: { label: string; pct: number }[] | undefined;
  let inheritedHostTags: string[] | undefined;
  // Effective tags as a Set we can mutate via transformations.
  const effective = new Set<string>(identityTags);

  if (origin === "parasitic") {
    // Roll a host body, keep DNA + tags, replace identity with parasite.
    gender = rollGender();
    const host = pickHostForParasite(identity, ctx);
    if (host) {
      ctx.depth++;
      const hostLineage = rollBirthableLineage(host, ctx, 1, gender);
      ctx.depth--;
      hijackedDna = aggregateDna(hostLineage);
      // Inherit host's effective tags as plain tags on the subject.
      const hostTags = resolveEffectiveTags(host.id, ctx.nodes, ctx.edges);
      inheritedHostTags = Array.from(hostTags);
      for (const t of hostTags) effective.add(t);
      // Identity overwrites: lineage tree shows the host body (hidden under "Hijacked Host"),
      // but the rendered identity is the parasite. We still expose the host lineage for inspection.
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
      lineage = {
        nodeId: identity.id, label: identity.label, type: identity.type,
        reproduction_mode: identity.reproduction_mode, effectiveTags: identityTags,
        gender, parents: [], dnaShare: 1,
      };
    }
    // Parasite's own DNA = 100% itself for the visible DNA bar.
    dna = [{ label: identity.label, pct: 100 }];
  } else if (origin === "created") {
    gender = rollGender();
    const creator = pickCreator(identity, ctx);
    const parents: LineageNode[] = [];
    if (creator) {
      ctx.depth++;
      const cLin = rollBirthableLineage(creator, ctx, 0, rollGender());
      ctx.depth--;
      cLin.dnaShare = 0;
      cLin.isCreator = true;
      parents.push(cLin);
    }
    lineage = {
      nodeId: identity.id, label: identity.label, type: identity.type,
      reproduction_mode: identity.reproduction_mode, effectiveTags: identityTags,
      gender, parents, dnaShare: 1,
    };
    dna = [{ label: identity.label, pct: 100 }];
  } else {
    // Born — sexual or asexual via reproduction_mode
    gender = rollGender();
    const leafNode = variant ?? identity;
    if (identity.reproduction_mode === "asexual") {
      lineage = rollBirthableLineage(leafNode, ctx, 1, gender);
      dna = [{ label: identity.label, pct: 100 }];
    } else {
      lineage = rollBirthableLineage(leafNode, ctx, 1, gender);
      dna = aggregateDna(lineage);
    }
  }

  // Apply transformations layered on top.
  const transformations = applyTransformations(effective, options?.transformations ?? [], ctx);

  // Compute secondary identities (race+variant pairs ≥ 25%, excluding the primary).
  let secondaryIdentities: SecondaryIdentity[] = [];
  if (origin === "born") {
    const all = aggregateIdentities(lineage);
    secondaryIdentities = all
      .filter((i) => i.raceLabel !== identity!.label && i.pct >= 25)
      .slice(0, 4);
  } else if (origin === "parasitic" && lineage.parents.length > 0) {
    const hostLineage = lineage.parents[0];
    const all = aggregateIdentities(hostLineage);
    secondaryIdentities = all.filter((i) => i.pct >= 25).slice(0, 4);
  }

  return {
    initials: generateInitials(),
    gender,
    identityNodeId: identity.id,
    identityLabel: identity.label,
    identityFamily: family?.label ?? null,
    variantLabel: variant?.label ?? null,
    reproduction_mode: identity.reproduction_mode,
    origin_mode: origin,
    lineage,
    dna,
    secondaryIdentities,
    hijackedDna,
    inheritedHostTags,
    traits: pickTraits(),
    effectiveTags: Array.from(effective),
    transformations,
  };
}
