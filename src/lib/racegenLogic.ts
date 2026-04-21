// Racegen rolling logic — top-down generational walk.
//
// We generate ancestry top-down: pick 8 great-grandparents, walk down through
// grandparents and parents to a single subject. Each leaf (GGP) contributes
// equal DNA share (12.5%). Mate selection uses a precomputed mate-weight table
// per race that combines the race's `mate_up_probability` with each candidate's
// base weight, producing realistic mixed ancestry without recursion games.

import {
  EvoNode,
  EvoEdge,
  resolveEffectiveTags,
  getChildIds,
  getParentIds,
  getFamilyAncestor,
} from "./evolutionGraph";
import { TRAITS } from "@/data/traits";

// ---------- public types (kept stable for the page) ----------

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
  /** Aggregated DNA breakdown by leaf race+variant label (granular). */
  dna: { label: string; pct: number }[];
  /** Race-grouped header makeup, e.g. "Dwarf (50% Gold, 25% Shield)". */
  headerMakeup: { raceLabel: string; pct: number; variants: { label: string; pct: number }[] }[];
  secondaryIdentities: SecondaryIdentity[];
  hijackedDna?: { label: string; pct: number }[];
  inheritedHostTags?: string[];
  traits: { pos: string; neu: string; neg: string };
  effectiveTags: string[];
  transformations: AppliedTransformation[];
}

// ---------- tunables ----------

/** Generations of ancestry above the subject. 3 ⇒ 8 great-grandparents. */
const ANCESTRY_DEPTH = 3;
/** Display threshold for the header makeup line (in percent). */
const HEADER_MAKEUP_MIN_PCT = 33;
/** Hidden families: races inside these are not rolled by Racegen. */
const EXCLUDED_FAMILY_LABELS = new Set(["Undead", "Modron"]);
/** Races inside these families reproduce by being made, not born. They use
 *  the "created" flow: a single instance + a separately generated creator. */
const CREATED_FAMILY_LABELS = new Set(["Construct"]);

// ---------- helpers ----------

function rand<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function weightedPick<T>(items: { weight: number; value: T }[]): T | null {
  if (!items.length) return null;
  const total = items.reduce((s, it) => s + Math.max(0.0001, it.weight), 0);
  let r = Math.random() * total;
  for (const it of items) {
    r -= Math.max(0.0001, it.weight);
    if (r <= 0) return it.value;
  }
  return items[items.length - 1].value;
}

function generateInitials(): string {
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const r = Math.random();
  const count = r > 0.9 ? 1 : r > 0.6 ? 3 : 2;
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

// ---------- active-pool filtering ----------

/** Is this race a "created" race (e.g. Construct) — handled via the creator flow? */
export function isCreatedRace(node: EvoNode, nodes: EvoNode[], edges: EvoEdge[]): boolean {
  if (node.type !== "race") return false;
  if (node.is_carrier) return false;
  const family = getFamilyAncestor(node.id, nodes, edges);
  if (family && EXCLUDED_FAMILY_LABELS.has(family.label)) return false;
  return (node.origin_mode ?? "born") === "created" || family?.label === "Construct" || (family ? CREATED_FAMILY_LABELS.has(family.label) : false);
}

/** A born/sexual race that Racegen rolls via full ancestry. */
export function isBornRace(node: EvoNode, nodes: EvoNode[], edges: EvoEdge[]): boolean {
  if (node.type !== "race") return false;
  if (node.is_carrier) return false;
  if ((node.origin_mode ?? "born") !== "born") return false;
  if (node.reproduction_mode !== "sexual") return false;
  const family = getFamilyAncestor(node.id, nodes, edges);
  if (family && EXCLUDED_FAMILY_LABELS.has(family.label)) return false;
  if (family && CREATED_FAMILY_LABELS.has(family.label)) return false;
  return true;
}

/** Any race Racegen will roll (born or created). Used by the seed dropdown. */
export function isActiveRace(node: EvoNode, nodes: EvoNode[], edges: EvoEdge[]): boolean {
  return isBornRace(node, nodes, edges) || isCreatedRace(node, nodes, edges);
}

// ---------- generation context ----------

interface RaceInfo {
  race: EvoNode;
  variants: EvoNode[]; // pickable variant nodes (non-carrier)
  family: EvoNode | null;
  familyLabel: string | null;
  /** Effective base weight for picking this race in a uniform pool. */
  weight: number;
  /** mate_up_probability — controls how willing this race is to mate outside its variant. */
  mateChance: number;
  /** variant_inheritance: random | mother | father */
  variantInheritance: string;
}

interface Ctx {
  nodes: EvoNode[];
  edges: EvoEdge[];
  byId: Map<string, EvoNode>;
  activeRaces: RaceInfo[];
  byRaceId: Map<string, RaceInfo>;
  /** Per-race precomputed mate-pick distribution. */
  mateTable: Map<string, { weight: number; raceId: string }[]>;
}

function buildRaceInfo(race: EvoNode, ctx: Omit<Ctx, "activeRaces" | "byRaceId" | "mateTable">): RaceInfo {
  const variants = getChildIds(race.id, ctx.edges)
    .map((id) => ctx.byId.get(id))
    .filter((n): n is EvoNode => !!n && n.type === "variant" && !n.is_carrier);
  const family = getFamilyAncestor(race.id, ctx.nodes, ctx.edges);
  return {
    race,
    variants,
    family,
    familyLabel: family?.label ?? null,
    weight: Math.max(0.0001, race.weight ?? 1),
    mateChance: Math.max(0, Math.min(1, race.mate_up_probability ?? 0.2)),
    variantInheritance: race.variant_inheritance ?? "random",
  };
}

/**
 * For each active race, build a mate distribution:
 *   weight(target) = base_weight(target) * affinity(self → target)
 *
 * Affinity tiers (multiplicative on top of base weight):
 *   - same race                      → 1.0       (baseline; "stays in race")
 *   - same family, different race    → mateChance
 *   - cross-family                   → mateChance * mateChance / 2  (rarer)
 *
 * The "stays in race" baseline is huge compared to the cross terms because
 * race weights are small integers (~1–7) but combine multiplicatively. We
 * therefore *boost* the same-race weight so most pairings remain in-race.
 */
function buildMateTable(ctx: Omit<Ctx, "mateTable">): Map<string, { weight: number; raceId: string }[]> {
  const SAME_RACE_BIAS = 8; // bias toward staying in race
  const out = new Map<string, { weight: number; raceId: string }[]>();
  for (const self of ctx.activeRaces) {
    const dist: { weight: number; raceId: string }[] = [];
    for (const other of ctx.activeRaces) {
      let mult: number;
      if (other.race.id === self.race.id) {
        mult = SAME_RACE_BIAS;
      } else if (other.familyLabel && other.familyLabel === self.familyLabel) {
        mult = self.mateChance;
      } else {
        mult = self.mateChance * self.mateChance * 0.5;
      }
      const w = other.weight * mult;
      if (w > 0) dist.push({ weight: w, raceId: other.race.id });
    }
    out.set(self.race.id, dist);
  }
  return out;
}

function makeCtx(nodes: EvoNode[], edges: EvoEdge[]): Ctx {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const partial = { nodes, edges, byId };
  const activeRaces = nodes
    .filter((n) => isActiveRace(n, nodes, edges))
    .map((r) => buildRaceInfo(r, partial));
  const byRaceId = new Map(activeRaces.map((r) => [r.race.id, r]));
  const ctxBase = { ...partial, activeRaces, byRaceId };
  const mateTable = buildMateTable(ctxBase);
  return { ...ctxBase, mateTable };
}

// ---------- variant + race picking ----------

function pickVariantFor(info: RaceInfo): EvoNode | null {
  if (!info.variants.length) return null;
  return weightedPick(info.variants.map((v) => ({ weight: Math.max(0.0001, v.weight ?? 1), value: v })));
}

function pickRandomActiveRace(ctx: Ctx): RaceInfo {
  const items = ctx.activeRaces.map((r) => ({ weight: r.weight, value: r }));
  return weightedPick(items)!;
}

function pickMateRace(self: RaceInfo, ctx: Ctx, mateChanceOverride?: number): RaceInfo {
  // If an override mate-chance is supplied (e.g. "use the more open parent"),
  // rebuild the row on the fly using the override.
  let dist = ctx.mateTable.get(self.race.id) ?? [];
  if (mateChanceOverride !== undefined && Math.abs(mateChanceOverride - self.mateChance) > 0.001) {
    const SAME_RACE_BIAS = 8;
    dist = ctx.activeRaces.map((other) => {
      let mult: number;
      if (other.race.id === self.race.id) mult = SAME_RACE_BIAS;
      else if (other.familyLabel && other.familyLabel === self.familyLabel) mult = mateChanceOverride;
      else mult = mateChanceOverride * mateChanceOverride * 0.5;
      return { weight: other.weight * mult, raceId: other.race.id };
    });
  }
  const items = dist.map((d) => ({ weight: d.weight, value: ctx.byRaceId.get(d.raceId)! })).filter((i) => i.value);
  const picked = weightedPick(items);
  return picked ?? self;
}

// ---------- top-down lineage construction ----------

interface AncestorPick {
  info: RaceInfo;
  variant: EvoNode | null;
  gender: "M" | "F";
}

function makePick(info: RaceInfo, gender: "M" | "F"): AncestorPick {
  return { info, variant: pickVariantFor(info), gender };
}

/**
 * Roll the child of two parents:
 * - Race comes from one of the parents (50/50 weighted by their base weights).
 * - Variant follows variant_inheritance: random uses the chosen race's variant table,
 *   "mother" forces the mother's variant if she is the chosen race, "father" likewise.
 * - mateChance for the next mate filter = max of the two parents' mate chances.
 */
function rollChild(mother: AncestorPick, father: AncestorPick, ctx: Ctx, gender: "M" | "F"): { pick: AncestorPick; nextMateChance: number } {
  // Pick the race side: weighted by the parents' base weights so heavier races dominate ties.
  type Side = { parent: "M" | "F"; info: RaceInfo; variant: EvoNode | null };
  const items: { weight: number; value: Side }[] = [
    { weight: mother.info.weight, value: { parent: "M", info: mother.info, variant: mother.variant } },
    { weight: father.info.weight, value: { parent: "F", info: father.info, variant: father.variant } },
  ];
  const sideRaw = weightedPick(items)!;
  const childInfo = sideRaw.info;

  // Resolve variant via the child race's variant_inheritance quirk.
  let variant: EvoNode | null = null;
  if (childInfo.variants.length) {
    const inh = childInfo.variantInheritance;
    if (inh === "mother" && mother.info.race.id === childInfo.race.id && mother.variant) variant = mother.variant;
    else if (inh === "father" && father.info.race.id === childInfo.race.id && father.variant) variant = father.variant;
    else if (sideRaw.parent === "M" && mother.variant && mother.info.race.id === childInfo.race.id) variant = mother.variant;
    else if (sideRaw.parent === "F" && father.variant && father.info.race.id === childInfo.race.id) variant = father.variant;
    else variant = pickVariantFor(childInfo);
  }

  const nextMateChance = Math.max(mother.info.mateChance, father.info.mateChance);
  return { pick: { info: childInfo, variant, gender }, nextMateChance };
}

function pickToLineage(pick: AncestorPick, ctx: Ctx, share: number, parents: LineageNode[]): LineageNode {
  const { race } = pick.info;
  const tagSourceId = pick.variant?.id ?? race.id;
  const effTags = Array.from(resolveEffectiveTags(tagSourceId, ctx.nodes, ctx.edges));
  const variantPart = pick.variant ? ` (${pick.variant.label})` : "";
  const nodeKey = `${race.id}::${pick.variant?.id ?? ""}`;
  return {
    nodeId: nodeKey,
    label: `${race.label}${variantPart}`,
    type: race.type,
    reproduction_mode: race.reproduction_mode,
    effectiveTags: effTags,
    gender: pick.gender,
    parents,
    dnaShare: share,
  };
}

/**
 * Top-down build:
 *   level 0 = subject's parents (called "level 0" in the recursion meaning "the
 *   level we're currently producing"). We start at the top: produce the 8 GGPs
 *   (depth = ANCESTRY_DEPTH), walk down combining couples into children.
 */
function buildBranch(
  ctx: Ctx,
  seed: AncestorPick,
  remainingDepth: number,
  shareAtThisLevel: number,
  childGender: "M" | "F",
): { node: LineageNode; pick: AncestorPick; mateChanceForNextMate: number } {
  // Mother is the seeded line for this branch. Father is rolled via mate table.
  const motherGender: "M" | "F" = "F";
  const fatherGender: "M" | "F" = "M";

  const motherSeed = { ...seed, gender: motherGender };
  const fatherInfo = pickMateRace(seed.info, ctx);
  const fatherSeed: AncestorPick = makePick(fatherInfo, fatherGender);

  if (remainingDepth <= 1) {
    // These ARE the leaves (great-grandparents at top recursion entry, or just leaves).
    // Combine to produce *this level's* node.
    const motherLeaf = pickToLineage(motherSeed, ctx, shareAtThisLevel / 2, []);
    const fatherLeaf = pickToLineage(fatherSeed, ctx, shareAtThisLevel / 2, []);
    const { pick: childPick, nextMateChance } = rollChild(motherSeed, fatherSeed, ctx, childGender);
    const childNode = pickToLineage(childPick, ctx, shareAtThisLevel, [motherLeaf, fatherLeaf]);
    return { node: childNode, pick: childPick, mateChanceForNextMate: nextMateChance };
  }

  // Recurse: each parent has their own ancestry above them.
  const motherBranch = buildBranch(ctx, motherSeed, remainingDepth - 1, shareAtThisLevel / 2, motherGender);
  const fatherBranch = buildBranch(ctx, fatherSeed, remainingDepth - 1, shareAtThisLevel / 2, fatherGender);
  const { pick: childPick, nextMateChance } = rollChild(motherBranch.pick, fatherBranch.pick, ctx, childGender);
  const childNode = pickToLineage(childPick, ctx, shareAtThisLevel, [motherBranch.node, fatherBranch.node]);
  return { node: childNode, pick: childPick, mateChanceForNextMate: nextMateChance };
}

/**
 * Produce a subject + lineage tree. The subject's seed race anchors one
 * great-grandparent line (the maternal line of the subject's mother). All
 * other lineage members are rolled via the mate table.
 */
function rollLineage(seedInfo: RaceInfo, ctx: Ctx, subjectGender: "M" | "F"): { lineage: LineageNode; subjectPick: AncestorPick } {
  const seed = makePick(seedInfo, "F");
  const branch = buildBranch(ctx, seed, ANCESTRY_DEPTH, 1, subjectGender);
  return { lineage: branch.node, subjectPick: branch.pick };
}

// ---------- DNA aggregation ----------

function aggregateDna(lineage: LineageNode): { label: string; pct: number }[] {
  const map = new Map<string, number>();
  const walk = (l: LineageNode) => {
    if (!l.parents.length) {
      map.set(l.label, (map.get(l.label) ?? 0) + l.dnaShare);
    } else for (const p of l.parents) walk(p);
  };
  walk(lineage);
  return Array.from(map.entries()).map(([label, share]) => ({ label, pct: share * 100 })).sort((a, b) => b.pct - a.pct);
}

function aggregateIdentities(lineage: LineageNode): SecondaryIdentity[] {
  const map = new Map<string, SecondaryIdentity>();
  const walk = (l: LineageNode) => {
    if (!l.parents.length) {
      const m = l.label.match(/^(.+?)\s+\((.+)\)$/);
      const raceLabel = m ? m[1] : l.label;
      const variantLabel = m ? m[2] : null;
      const key = `${raceLabel}::${variantLabel ?? ""}`;
      const existing = map.get(key);
      if (existing) existing.pct += l.dnaShare * 100;
      else map.set(key, { raceLabel, variantLabel, pct: l.dnaShare * 100 });
      return;
    }
    for (const p of l.parents) walk(p);
  };
  walk(lineage);
  return Array.from(map.values()).sort((a, b) => b.pct - a.pct);
}

/**
 * Group the leaf identities by race for the header line. The primary race
 * (the subject's anchor identity) is always shown. Other races are shown only
 * if they hit HEADER_MAKEUP_MIN_PCT. Variants inside each race are listed in
 * descending order.
 */
function buildHeaderMakeup(
  identities: SecondaryIdentity[],
  primaryRaceLabel: string,
): { raceLabel: string; pct: number; variants: { label: string; pct: number }[] }[] {
  const byRace = new Map<string, { pct: number; variants: { label: string; pct: number }[] }>();
  for (const id of identities) {
    const slot = byRace.get(id.raceLabel) ?? { pct: 0, variants: [] };
    slot.pct += id.pct;
    if (id.variantLabel) slot.variants.push({ label: id.variantLabel, pct: id.pct });
    byRace.set(id.raceLabel, slot);
  }
  const out: { raceLabel: string; pct: number; variants: { label: string; pct: number }[] }[] = [];
  for (const [raceLabel, slot] of byRace.entries()) {
    if (raceLabel === primaryRaceLabel || slot.pct >= HEADER_MAKEUP_MIN_PCT) {
      out.push({
        raceLabel,
        pct: slot.pct,
        variants: slot.variants.sort((a, b) => b.pct - a.pct),
      });
    }
  }
  // Primary first, then descending by share.
  out.sort((a, b) => {
    if (a.raceLabel === primaryRaceLabel) return -1;
    if (b.raceLabel === primaryRaceLabel) return 1;
    return b.pct - a.pct;
  });
  return out;
}

// ---------- public API ----------

export function rollSubject(
  nodes: EvoNode[],
  edges: EvoEdge[],
  options?: { seedRaceId?: string; transformations?: unknown },
): RolledSubject {
  void options?.transformations; // transformations are no longer applied (excluded by plan)
  const ctx = makeCtx(nodes, edges);
  if (!ctx.activeRaces.length) throw new Error("No active races available for Racegen");

  // Pick the seed race
  let seedInfo: RaceInfo | undefined;
  if (options?.seedRaceId) seedInfo = ctx.byRaceId.get(options.seedRaceId);
  if (!seedInfo) seedInfo = pickRandomActiveRace(ctx);

  const gender = rollGender();
  const { lineage, subjectPick } = rollLineage(seedInfo, ctx, gender);

  const dna = aggregateDna(lineage);
  const identities = aggregateIdentities(lineage);

  // Subject identity is determined by the DNA majority — the race with the
  // highest aggregate percentage wins, then the highest variant within it.
  // This avoids the final child-roll producing a "Painted Elf" who is 63% Hob.
  const racePctMap = new Map<string, number>();
  for (const id of identities) {
    racePctMap.set(id.raceLabel, (racePctMap.get(id.raceLabel) ?? 0) + id.pct);
  }
  const dominantRaceLabel = Array.from(racePctMap.entries()).sort((a, b) => b[1] - a[1])[0][0];
  const dominantVariant = identities
    .filter((i) => i.raceLabel === dominantRaceLabel && i.variantLabel)
    .sort((a, b) => b.pct - a.pct)[0];
  const subjectRaceLabel = dominantRaceLabel;
  const subjectVariantLabel = dominantVariant?.variantLabel ?? null;

  // Resolve the dominant race's RaceInfo + variant node for tags/family.
  const dominantInfo =
    ctx.activeRaces.find((r) => r.race.label === dominantRaceLabel) ?? subjectPick.info;
  const dominantVariantNode = subjectVariantLabel
    ? dominantInfo.variants.find((v) => v.label === subjectVariantLabel) ?? null
    : null;

  const headerMakeup = buildHeaderMakeup(identities, subjectRaceLabel);

  const secondaryIdentities = identities
    .filter((i) => !(i.raceLabel === subjectRaceLabel && i.variantLabel === subjectVariantLabel))
    .filter((i) => i.pct >= HEADER_MAKEUP_MIN_PCT)
    .slice(0, 4);

  const tagSourceId = dominantVariantNode?.id ?? dominantInfo.race.id;
  const effective = Array.from(resolveEffectiveTags(tagSourceId, ctx.nodes, ctx.edges));

  return {
    initials: generateInitials(),
    gender,
    identityNodeId: dominantInfo.race.id,
    identityLabel: subjectRaceLabel,
    identityFamily: dominantInfo.familyLabel,
    variantLabel: subjectVariantLabel,
    reproduction_mode: "sexual",
    origin_mode: "born",
    lineage,
    dna,
    headerMakeup,
    secondaryIdentities,
    traits: pickTraits(),
    effectiveTags: effective,
    transformations: [],
  };
}
