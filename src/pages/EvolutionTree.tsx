import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { RACES } from "@/data/racegenData";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useAdmin } from "@/hooks/useAdmin";
import { toast } from "sonner";
import {
  Plus,
  Trash2,
  Link2,
  Unlink,
  Save,
  RotateCcw,
  Loader2,
  LayoutGrid,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface NodeRow {
  id: string;
  label: string;
  type: string;
  x: number;
  y: number;
  color: string | null;
}
interface EdgeRow {
  id: string;
  parent_id: string;
  child_id: string;
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

const NODE_W = 150;
const NODE_H = 40;
const COL_GAP = 90;
const ROW_GAP = 12;

// Build initial layout based on racegen hierarchy
function buildSeedLayout() {
  const nodes: Omit<NodeRow, "id">[] = [];
  const edges: { parentLabel: string; parentType: string; childLabel: string; childType: string }[] = [];
  const families = Array.from(new Set(RACES.map((r) => r.family))).sort();

  let yCursor = 40;
  for (const fam of families) {
    const color = FAMILY_COLORS[fam] ?? "hsl(220 50% 60%)";
    const races = RACES.filter((r) => r.family === fam);
    const famY = yCursor;
    const famX = 40;
    nodes.push({ label: fam, type: "family", x: famX, y: famY, color });

    let raceY = yCursor;
    for (const race of races) {
      const raceX = famX + NODE_W + COL_GAP;
      nodes.push({ label: race.name, type: "race", x: raceX, y: raceY, color });
      edges.push({ parentLabel: fam, parentType: "family", childLabel: race.name, childType: "race" });

      const variantStartY = raceY;
      for (let i = 0; i < race.variants.length; i++) {
        const v = race.variants[i];
        const vX = raceX + NODE_W + COL_GAP;
        const vY = variantStartY + i * (NODE_H + ROW_GAP);
        nodes.push({ label: v, type: "variant", x: vX, y: vY, color });
        edges.push({
          parentLabel: race.name,
          parentType: "race",
          childLabel: v,
          childType: "variant",
        });
      }
      raceY += Math.max(NODE_H + ROW_GAP, race.variants.length * (NODE_H + ROW_GAP));
    }
    yCursor = raceY + 60;
  }
  return { nodes, edges };
}

const EvolutionTree = () => {
  const { user } = useAuth();
  const { isAdmin } = useAdmin();
  const canEdit = !!user && isAdmin;

  const [nodes, setNodes] = useState<NodeRow[]>([]);
  const [edges, setEdges] = useState<EdgeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [linkSourceId, setLinkSourceId] = useState<string | null>(null);
  const [pendingPositions, setPendingPositions] = useState<Record<string, { x: number; y: number }>>({});
  const [saving, setSaving] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [newType, setNewType] = useState("race");
  const [newColor, setNewColor] = useState<string>(Object.values(FAMILY_COLORS)[0]);
  const [editBuffer, setEditBuffer] = useState<{ label: string; type: string; color: string } | null>(null);

  const svgRef = useRef<SVGSVGElement>(null);
  const dragState = useRef<{ id: string; offsetX: number; offsetY: number } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: nData, error: nErr }, { data: eData, error: eErr }] = await Promise.all([
      supabase.from("evolution_nodes").select("*"),
      supabase.from("evolution_edges").select("*"),
    ]);
    if (nErr || eErr) {
      toast.error("Failed to load evolution tree");
      setLoading(false);
      return;
    }
    if (!nData || nData.length === 0) {
      // Seed for first time (admin only)
      if (canEdit) {
        await seedFromRacegen();
        return;
      }
    }
    setNodes((nData ?? []) as NodeRow[]);
    setEdges((eData ?? []) as EdgeRow[]);
    setLoading(false);
  }, [canEdit]);

  const seedFromRacegen = async () => {
    const { nodes: seedNodes, edges: seedEdges } = buildSeedLayout();
    const { data: insertedNodes, error: nErr } = await supabase
      .from("evolution_nodes")
      .insert(seedNodes)
      .select();
    if (nErr || !insertedNodes) {
      toast.error("Seed failed: " + nErr?.message);
      setLoading(false);
      return;
    }
    // Map (label+type) -> id (collisions: there are none in racegen since variants are unique under their race; but variants like "Common" repeat across races. We'll match by closest occurrence using the order of seedNodes)
    // Build a positional id map using the same order
    const idByPos = insertedNodes.map((n: any) => n.id);
    // Map seedNodes index -> insertedNodes id (assume same order returned)
    const seedIdx = new Map<number, string>();
    seedNodes.forEach((_, i) => seedIdx.set(i, idByPos[i]));

    // Build label index for parents by (label,type)
    const findId = (label: string, type: string) => {
      const idx = seedNodes.findIndex((n) => n.label === label && n.type === type);
      return idx >= 0 ? seedIdx.get(idx)! : null;
    };

    const edgePayload: { parent_id: string; child_id: string }[] = [];
    // Walk seedEdges but resolve each child to the unique inserted variant in source order
    let variantCursor = 0;
    for (const e of buildSeedLayout().edges) {
      const parent = findId(e.parentLabel, e.parentType);
      // For child, find the next un-used inserted node matching (label,type)
      let childId: string | null = null;
      for (let i = variantCursor; i < seedNodes.length; i++) {
        if (seedNodes[i].label === e.childLabel && seedNodes[i].type === e.childType) {
          childId = seedIdx.get(i)!;
          if (e.childType === "variant") variantCursor = i + 1;
          break;
        }
      }
      if (parent && childId) edgePayload.push({ parent_id: parent, child_id: childId });
    }
    const { data: insertedEdges, error: eErr } = await supabase
      .from("evolution_edges")
      .insert(edgePayload)
      .select();
    if (eErr) {
      toast.error("Edge seed failed: " + eErr.message);
    }
    setNodes(insertedNodes as NodeRow[]);
    setEdges((insertedEdges ?? []) as EdgeRow[]);
    setLoading(false);
    toast.success("Seeded evolution tree from Racegen");
  };

  useEffect(() => {
    load();
  }, [load]);

  // Visible nodes after filter
  const visibleIds = useMemo(() => {
    if (!filter.trim()) return new Set(nodes.map((n) => n.id));
    const f = filter.toLowerCase();
    const direct = new Set(nodes.filter((n) => n.label.toLowerCase().includes(f)).map((n) => n.id));
    // Include ancestors and descendants of any matching node
    const result = new Set(direct);
    let changed = true;
    while (changed) {
      changed = false;
      for (const e of edges) {
        if (result.has(e.child_id) && !result.has(e.parent_id)) {
          result.add(e.parent_id);
          changed = true;
        }
        if (result.has(e.parent_id) && !result.has(e.child_id)) {
          result.add(e.child_id);
          changed = true;
        }
      }
    }
    return result;
  }, [filter, nodes, edges]);

  const getEffectiveXY = (n: NodeRow) => {
    const p = pendingPositions[n.id];
    return { x: p ? p.x : n.x, y: p ? p.y : n.y };
  };

  const bounds = useMemo(() => {
    let maxX = 800;
    let maxY = 600;
    for (const n of nodes) {
      const { x, y } = getEffectiveXY(n);
      maxX = Math.max(maxX, x + NODE_W + 60);
      maxY = Math.max(maxY, y + NODE_H + 60);
    }
    return { width: maxX, height: maxY };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes, pendingPositions]);

  const onMouseDownNode = (e: React.MouseEvent, n: NodeRow) => {
    setSelectedId(n.id);
    if (!canEdit) return;
    if (linkSourceId) return; // don't drag during linking
    e.preventDefault();
    const svg = svgRef.current;
    if (!svg) return;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const ctm = svg.getScreenCTM();
    if (!ctm) return;
    const local = pt.matrixTransform(ctm.inverse());
    const { x, y } = getEffectiveXY(n);
    dragState.current = { id: n.id, offsetX: local.x - x, offsetY: local.y - y };
  };

  const onMouseMoveSvg = (e: React.MouseEvent) => {
    if (!dragState.current) return;
    const svg = svgRef.current;
    if (!svg) return;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const ctm = svg.getScreenCTM();
    if (!ctm) return;
    const local = pt.matrixTransform(ctm.inverse());
    const { id, offsetX, offsetY } = dragState.current;
    setPendingPositions((prev) => ({
      ...prev,
      [id]: { x: Math.max(0, local.x - offsetX), y: Math.max(0, local.y - offsetY) },
    }));
  };

  const onMouseUpSvg = () => {
    dragState.current = null;
  };

  const savePositions = async () => {
    const ids = Object.keys(pendingPositions);
    if (ids.length === 0) return;
    setSaving(true);
    let failed = 0;
    for (const id of ids) {
      const { x, y } = pendingPositions[id];
      const { error } = await supabase
        .from("evolution_nodes")
        .update({ x, y })
        .eq("id", id);
      if (error) failed++;
    }
    if (failed) toast.error(`${failed} nodes failed to save`);
    else toast.success("Positions saved");
    // Apply to local state
    setNodes((prev) =>
      prev.map((n) => (pendingPositions[n.id] ? { ...n, ...pendingPositions[n.id] } : n))
    );
    setPendingPositions({});
    setSaving(false);
  };

  const discardPositions = () => setPendingPositions({});

  const autoLayout = () => {
    if (nodes.length === 0) return;

    // Build adjacency
    const parentsOf = new Map<string, string[]>();
    const childrenOf = new Map<string, string[]>();
    for (const n of nodes) {
      parentsOf.set(n.id, []);
      childrenOf.set(n.id, []);
    }
    for (const e of edges) {
      parentsOf.get(e.child_id)?.push(e.parent_id);
      childrenOf.get(e.parent_id)?.push(e.child_id);
    }

    // Column = depth (longest path from a root). Keeps original family→race→variant feel.
    const depth = new Map<string, number>();
    const visiting = new Set<string>();
    const computeDepth = (id: string): number => {
      if (depth.has(id)) return depth.get(id)!;
      if (visiting.has(id)) return 0;
      visiting.add(id);
      const ps = parentsOf.get(id) ?? [];
      const d = ps.length === 0 ? 0 : Math.max(...ps.map((p) => computeDepth(p) + 1));
      visiting.delete(id);
      depth.set(id, d);
      return d;
    };
    for (const n of nodes) computeDepth(n.id);

    // Group nodes by their root family ancestor (depth-0 reachable ancestor).
    // For multi-parent nodes, pick the family of the first parent (alphabetical) to keep stable.
    const familyOf = new Map<string, string>(); // node id -> family node id
    const findFamily = (id: string): string => {
      if (familyOf.has(id)) return familyOf.get(id)!;
      const ps = (parentsOf.get(id) ?? []).slice().sort();
      const fam = ps.length === 0 ? id : findFamily(ps[0]);
      familyOf.set(id, fam);
      return fam;
    };
    for (const n of nodes) findFamily(n.id);

    // Order families: start alphabetical, then greedily reorder so families that share
    // cross-family edges (a node in family A also linked to family B) sit adjacent.
    const familyIdsInit = Array.from(new Set(Array.from(familyOf.values())));
    familyIdsInit.sort((a, b) => {
      const al = nodes.find((n) => n.id === a)?.label ?? "";
      const bl = nodes.find((n) => n.id === b)?.label ?? "";
      return al.localeCompare(bl);
    });

    // Build cross-family link weights: number of edges crossing between two families.
    const famLink = new Map<string, number>(); // key "famA|famB" (sorted) -> count
    const famKey = (a: string, b: string) => (a < b ? `${a}|${b}` : `${b}|${a}`);
    for (const e of edges) {
      const fa = familyOf.get(e.parent_id);
      const fb = familyOf.get(e.child_id);
      if (fa && fb && fa !== fb) {
        famLink.set(famKey(fa, fb), (famLink.get(famKey(fa, fb)) ?? 0) + 1);
      }
    }
    // Greedy reorder: start with first family, then repeatedly pick the next unplaced
    // family with the strongest tie to the last placed one (fall back to alphabetical).
    const familyIds: string[] = [];
    const remaining = new Set(familyIdsInit);
    if (familyIdsInit.length) {
      familyIds.push(familyIdsInit[0]);
      remaining.delete(familyIdsInit[0]);
    }
    while (remaining.size) {
      const last = familyIds[familyIds.length - 1];
      let best: string | null = null;
      let bestScore = -1;
      for (const f of remaining) {
        const score = famLink.get(famKey(last, f)) ?? 0;
        if (score > bestScore) {
          bestScore = score;
          best = f;
        }
      }
      if (bestScore <= 0) {
        // No tie — pick the alphabetically-next remaining family for stability.
        best = Array.from(remaining).sort((a, b) => {
          const al = nodes.find((n) => n.id === a)?.label ?? "";
          const bl = nodes.find((n) => n.id === b)?.label ?? "";
          return al.localeCompare(bl);
        })[0];
      }
      familyIds.push(best!);
      remaining.delete(best!);
    }

    const STEP_X = NODE_W + COL_GAP;
    const STEP_Y = NODE_H + ROW_GAP;
    const FAMILY_GAP = 60;
    const TOP = 40;
    const LEFT = 40;

    const newPos: Record<string, { x: number; y: number }> = {};
    let yCursor = TOP;

    // Helper: collect all nodes in a subtree (for cross-link checks).
    const subtreeIds = new Map<string, Set<string>>();

    for (let famIdx = 0; famIdx < familyIds.length; famIdx++) {
      const famId = familyIds[famIdx];
      const prevFamId = familyIds[famIdx - 1] ?? null;
      const nextFamId = familyIds[famIdx + 1] ?? null;
      const famNodes = nodes.filter((n) => familyOf.get(n.id) === famId);
      // Group by depth column within the family
      const byDepth = new Map<number, NodeRow[]>();
      for (const n of famNodes) {
        const d = depth.get(n.id) ?? 0;
        if (!byDepth.has(d)) byDepth.set(d, []);
        byDepth.get(d)!.push(n);
      }
      const depths = Array.from(byDepth.keys()).sort((a, b) => a - b);

      const familyTop = yCursor;

      // Subtree-based layout (each parent centered on its children).
      const primaryParent = new Map<string, string | null>();
      for (const n of famNodes) {
        const ps = (parentsOf.get(n.id) ?? []).slice().sort();
        primaryParent.set(n.id, ps.length === 0 ? null : ps[0]);
      }
      const primaryChildren = new Map<string, NodeRow[]>();
      for (const n of famNodes) primaryChildren.set(n.id, []);
      for (const n of famNodes) {
        const pp = primaryParent.get(n.id);
        if (pp && primaryChildren.has(pp)) primaryChildren.get(pp)!.push(n);
      }
      const subtreeSize = new Map<string, number>();
      const computeSize = (id: string): number => {
        if (subtreeSize.has(id)) return subtreeSize.get(id)!;
        const cs = primaryChildren.get(id) ?? [];
        const s = 1 + cs.reduce((acc, c) => acc + computeSize(c.id), 0);
        subtreeSize.set(id, s);
        return s;
      };
      for (const n of famNodes) computeSize(n.id);

      // Collect all node ids in each subtree (for affinity scoring).
      const collectSubtree = (id: string): Set<string> => {
        if (subtreeIds.has(id)) return subtreeIds.get(id)!;
        const set = new Set<string>([id]);
        for (const c of primaryChildren.get(id) ?? []) {
          for (const x of collectSubtree(c.id)) set.add(x);
        }
        subtreeIds.set(id, set);
        return set;
      };
      for (const n of famNodes) collectSubtree(n.id);

      // Affinity score: how strongly a subtree links to a target family
      // (count of edges from any subtree node to/from a node in target family).
      const affinityToFamily = (subtreeRootId: string, targetFam: string | null): number => {
        if (!targetFam) return 0;
        const ids = subtreeIds.get(subtreeRootId)!;
        let score = 0;
        for (const e of edges) {
          const pIn = ids.has(e.parent_id);
          const cIn = ids.has(e.child_id);
          if (pIn && !cIn && familyOf.get(e.child_id) === targetFam) score++;
          else if (cIn && !pIn && familyOf.get(e.parent_id) === targetFam) score++;
        }
        return score;
      };

      // Recursive placement: kids with strong ties to the family ABOVE go to top,
      // kids with strong ties to the family BELOW go to bottom; rest sorted by size/alpha.
      const placeSubtree = (id: string, startY: number, aboveFam: string | null, belowFam: string | null): { top: number; bottom: number; centerY: number } => {
        const d = depth.get(id) ?? 0;
        const x = LEFT + d * STEP_X;
        const kidsRaw = (primaryChildren.get(id) ?? []).slice();

        // Score each kid: positive = belongs near top (links above), negative = near bottom.
        const kidScore = new Map<string, number>();
        for (const k of kidsRaw) {
          const up = affinityToFamily(k.id, aboveFam);
          const down = affinityToFamily(k.id, belowFam);
          kidScore.set(k.id, up - down);
        }
        const kids = kidsRaw.sort((a, b) => {
          const sa = kidScore.get(a.id)!;
          const sb = kidScore.get(b.id)!;
          if (sa !== sb) return sb - sa; // higher score (more upward affinity) first
          const za = subtreeSize.get(a.id) ?? 1;
          const zb = subtreeSize.get(b.id) ?? 1;
          if (za !== zb) return za - zb;
          return a.label.localeCompare(b.label);
        });

        if (kids.length === 0) {
          newPos[id] = { x, y: startY };
          return { top: startY, bottom: startY + STEP_Y, centerY: startY };
        }

        let cursor = startY;
        const childCenters: number[] = [];
        for (let i = 0; i < kids.length; i++) {
          const k = kids[i];
          // For nested levels, the "above"/"below" context is the previous/next sibling's subtree.
          // But for cross-family alignment we keep using outer family context — it still nudges
          // shared-category subtrees toward the top of their parent's slot.
          const r = placeSubtree(k.id, cursor, aboveFam, belowFam);
          childCenters.push(r.centerY);
          cursor = r.bottom;
        }
        const top = startY;
        const bottom = cursor;
        const centerY = (childCenters[0] + childCenters[childCenters.length - 1]) / 2;
        newPos[id] = { x, y: centerY };
        return { top, bottom, centerY };
      };

      // Roots within this family
      const roots = famNodes.filter((n) => !primaryParent.get(n.id) || !famNodes.some((m) => m.id === primaryParent.get(n.id)));
      // Sort roots themselves by affinity (above-linked roots first, below-linked last).
      roots.sort((a, b) => {
        const sa = affinityToFamily(a.id, prevFamId) - affinityToFamily(a.id, nextFamId);
        const sb = affinityToFamily(b.id, prevFamId) - affinityToFamily(b.id, nextFamId);
        if (sa !== sb) return sb - sa;
        return a.label.localeCompare(b.label);
      });

      let cursorY = familyTop;
      for (const r of roots) {
        const res = placeSubtree(r.id, cursorY, prevFamId, nextFamId);
        cursorY = res.bottom;
      }

      // Fallback for any unplaced nodes.
      for (const n of famNodes) {
        if (!newPos[n.id]) {
          const d = depth.get(n.id) ?? 0;
          newPos[n.id] = { x: LEFT + d * STEP_X, y: cursorY };
          cursorY += STEP_Y;
        }
      }

      const ys = famNodes.map((n) => newPos[n.id]?.y ?? familyTop);
      const minY = Math.min(...ys);
      const maxY = Math.max(...ys);
      const norm = familyTop - minY;
      for (const n of famNodes) {
        if (newPos[n.id]) newPos[n.id].y += norm;
      }
      yCursor = familyTop + (maxY - minY) + STEP_Y + FAMILY_GAP;
    }

    setPendingPositions(newPos);
    toast.success("Re-tidied — review then Save Layout");
  };


  const addEdge = async (parentId: string, childId: string) => {
    if (parentId === childId) {
      toast.error("Cannot link a node to itself");
      return;
    }
    if (edges.some((e) => e.parent_id === parentId && e.child_id === childId)) {
      toast.info("Link already exists");
      return;
    }
    const { data, error } = await supabase
      .from("evolution_edges")
      .insert({ parent_id: parentId, child_id: childId })
      .select()
      .single();
    if (error || !data) {
      toast.error("Failed to add link: " + error?.message);
      return;
    }
    setEdges((prev) => [...prev, data as EdgeRow]);
    toast.success("Link added");
  };

  const removeEdge = async (edgeId: string) => {
    const { error } = await supabase.from("evolution_edges").delete().eq("id", edgeId);
    if (error) {
      toast.error("Failed to remove link");
      return;
    }
    setEdges((prev) => prev.filter((e) => e.id !== edgeId));
  };

  const deleteNode = async (id: string) => {
    if (!confirm("Delete this node and all its links?")) return;
    const { error } = await supabase.from("evolution_nodes").delete().eq("id", id);
    if (error) {
      toast.error("Failed to delete");
      return;
    }
    setNodes((prev) => prev.filter((n) => n.id !== id));
    setEdges((prev) => prev.filter((e) => e.parent_id !== id && e.child_id !== id));
    if (selectedId === id) setSelectedId(null);
    toast.success("Node deleted");
  };

  const updateNode = async (
    id: string,
    updates: { label?: string; type?: string; color?: string }
  ) => {
    const { error } = await supabase.from("evolution_nodes").update(updates).eq("id", id);
    if (error) {
      toast.error("Failed to update: " + error.message);
      return;
    }
    setNodes((prev) => prev.map((n) => (n.id === id ? { ...n, ...updates } : n)));
    toast.success("Node updated");
  };

  const addNode = async () => {
    if (!newLabel.trim()) return;
    const { data, error } = await supabase
      .from("evolution_nodes")
      .insert({ label: newLabel.trim(), type: newType, color: newColor, x: 60, y: 60 })
      .select()
      .single();
    if (error || !data) {
      toast.error("Failed to add: " + error?.message);
      return;
    }
    setNodes((prev) => [...prev, data as NodeRow]);
    setAddOpen(false);
    setNewLabel("");
    toast.success("Node added");
  };

  const selectedNode = nodes.find((n) => n.id === selectedId) ?? null;

  useEffect(() => {
    if (selectedNode) {
      setEditBuffer({
        label: selectedNode.label,
        type: selectedNode.type,
        color: selectedNode.color ?? Object.values(FAMILY_COLORS)[0],
      });
    } else {
      setEditBuffer(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);
  const selectedParents = selectedNode
    ? edges.filter((e) => e.child_id === selectedNode.id)
    : [];
  const selectedChildren = selectedNode
    ? edges.filter((e) => e.parent_id === selectedNode.id)
    : [];

  if (loading) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground p-6">
      <div className="max-w-[1800px] mx-auto space-y-4">
        <header className="space-y-2">
          <h1 className="text-4xl font-bold tracking-tight">Ancestry Evolution Tree</h1>
          <p className="text-muted-foreground">
            A directed graph — drag nodes to rearrange. A node may have multiple parents
            (e.g. Drider can stem from both Drow and Spider).
          </p>
        </header>

        <div className="flex flex-wrap gap-2 items-center">
          <Input
            placeholder="Filter…"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="max-w-xs"
          />
          {canEdit && (
            <>
              <Button size="sm" variant="outline" onClick={() => setAddOpen(true)}>
                <Plus className="h-4 w-4 mr-1" /> Add Node
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={savePositions}
                disabled={Object.keys(pendingPositions).length === 0 || saving}
              >
                <Save className="h-4 w-4 mr-1" />
                Save Layout
                {Object.keys(pendingPositions).length > 0 &&
                  ` (${Object.keys(pendingPositions).length})`}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={autoLayout}
              >
                <LayoutGrid className="h-4 w-4 mr-1" /> Auto-Layout
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={discardPositions}
                disabled={Object.keys(pendingPositions).length === 0}
              >
                <RotateCcw className="h-4 w-4 mr-1" /> Discard
              </Button>
            </>
          )}
          <span className="text-xs text-muted-foreground ml-auto">
            {nodes.length} nodes • {edges.length} links
            {!canEdit && " • read-only (admin login required to edit)"}
          </span>
        </div>

        <div className="flex gap-4">
          <Card className="flex-1 overflow-auto" style={{ maxHeight: "75vh" }}>
            <svg
              ref={svgRef}
              width={bounds.width}
              height={bounds.height}
              onMouseMove={onMouseMoveSvg}
              onMouseUp={onMouseUpSvg}
              onMouseLeave={onMouseUpSvg}
              style={{ display: "block", cursor: dragState.current ? "grabbing" : "default" }}
            >
              {/* edges */}
              {edges.map((e) => {
                const from = nodes.find((n) => n.id === e.parent_id);
                const to = nodes.find((n) => n.id === e.child_id);
                if (!from || !to) return null;
                if (!visibleIds.has(from.id) || !visibleIds.has(to.id)) return null;
                const fp = getEffectiveXY(from);
                const tp = getEffectiveXY(to);
                const x1 = fp.x + NODE_W;
                const y1 = fp.y + NODE_H / 2;
                const x2 = tp.x;
                const y2 = tp.y + NODE_H / 2;
                const mx = (x1 + x2) / 2;
                const color = from.color ?? "hsl(var(--primary))";
                const highlighted =
                  selectedId && (e.parent_id === selectedId || e.child_id === selectedId);
                return (
                  <g key={e.id}>
                    <path
                      d={`M ${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`}
                      stroke={color}
                      strokeOpacity={highlighted ? 1 : 0.45}
                      strokeWidth={highlighted ? 2.5 : 1.5}
                      fill="none"
                    />
                    {canEdit && highlighted && (
                      <g
                        transform={`translate(${mx - 8}, ${(y1 + y2) / 2 - 8})`}
                        style={{ cursor: "pointer" }}
                        onClick={() => removeEdge(e.id)}
                      >
                        <circle r="9" cx="8" cy="8" fill="hsl(var(--destructive))" />
                        <text
                          x="8"
                          y="8"
                          textAnchor="middle"
                          dominantBaseline="middle"
                          fontSize="12"
                          fill="white"
                        >
                          ×
                        </text>
                      </g>
                    )}
                  </g>
                );
              })}

              {/* nodes */}
              {nodes.map((n) => {
                if (!visibleIds.has(n.id)) return null;
                const { x, y } = getEffectiveXY(n);
                const isSelected = n.id === selectedId;
                const isLinkSource = n.id === linkSourceId;
                const color = n.color ?? "hsl(var(--primary))";
                const isFamily = n.type === "family";
                const isRace = n.type === "race";
                return (
                  <g
                    key={n.id}
                    transform={`translate(${x}, ${y})`}
                    style={{ cursor: canEdit ? "grab" : "pointer" }}
                    onMouseDown={(e) => onMouseDownNode(e, n)}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (linkSourceId && linkSourceId !== n.id) {
                        addEdge(linkSourceId, n.id);
                        setLinkSourceId(null);
                      } else {
                        setSelectedId(n.id);
                      }
                    }}
                  >
                    <rect
                      width={NODE_W}
                      height={NODE_H}
                      rx={6}
                      fill="hsl(var(--card))"
                      stroke={isLinkSource ? "hsl(var(--primary))" : color}
                      strokeWidth={isSelected ? 3 : isFamily ? 2.5 : isRace ? 1.75 : 1.25}
                      strokeDasharray={isLinkSource ? "4 3" : undefined}
                    />
                    <text
                      x={NODE_W / 2}
                      y={NODE_H / 2}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fill="hsl(var(--foreground))"
                      fontSize={isFamily ? 14 : isRace ? 13 : 12}
                      fontWeight={isFamily ? 700 : isRace ? 600 : 400}
                      style={{ pointerEvents: "none" }}
                    >
                      {n.label}
                    </text>
                  </g>
                );
              })}
            </svg>
          </Card>

          {/* Side inspector */}
          <Card className="w-80 p-4 space-y-3 self-start sticky top-4">
            <h3 className="font-semibold">Inspector</h3>
            {!selectedNode && (
              <p className="text-sm text-muted-foreground">
                Click a node to select it. Drag to rearrange.
              </p>
            )}
            {selectedNode && (
              <div className="space-y-3">
                {canEdit && editBuffer ? (
                  <div className="space-y-2">
                    <div>
                      <Label className="text-xs uppercase text-muted-foreground">Label</Label>
                      <Input
                        value={editBuffer.label}
                        onChange={(e) =>
                          setEditBuffer({ ...editBuffer, label: e.target.value })
                        }
                      />
                    </div>
                    <div>
                      <Label className="text-xs uppercase text-muted-foreground">Type</Label>
                      <Select
                        value={editBuffer.type}
                        onValueChange={(v) => setEditBuffer({ ...editBuffer, type: v })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="family">Family</SelectItem>
                          <SelectItem value="race">Race</SelectItem>
                          <SelectItem value="variant">Variant</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs uppercase text-muted-foreground">Color</Label>
                      <Select
                        value={editBuffer.color}
                        onValueChange={(v) => setEditBuffer({ ...editBuffer, color: v })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(FAMILY_COLORS).map(([name, c]) => (
                            <SelectItem key={name} value={c}>
                              <span className="inline-flex items-center gap-2">
                                <span
                                  className="inline-block w-3 h-3 rounded-full"
                                  style={{ backgroundColor: c }}
                                />
                                {name}
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {(editBuffer.label !== selectedNode.label ||
                      editBuffer.type !== selectedNode.type ||
                      editBuffer.color !== (selectedNode.color ?? "")) && (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          className="flex-1"
                          onClick={() =>
                            updateNode(selectedNode.id, {
                              label: editBuffer.label.trim(),
                              type: editBuffer.type,
                              color: editBuffer.color,
                            })
                          }
                        >
                          <Save className="h-3 w-3 mr-1" /> Save
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            setEditBuffer({
                              label: selectedNode.label,
                              type: selectedNode.type,
                              color: selectedNode.color ?? Object.values(FAMILY_COLORS)[0],
                            })
                          }
                        >
                          Reset
                        </Button>
                      </div>
                    )}
                  </div>
                ) : (
                  <>
                    <div>
                      <div className="text-xs text-muted-foreground uppercase">Label</div>
                      <div className="font-semibold">{selectedNode.label}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground uppercase">Type</div>
                      <div className="capitalize">{selectedNode.type}</div>
                    </div>
                  </>
                )}
                <div>
                  <div className="text-xs text-muted-foreground uppercase mb-1">
                    Parents ({selectedParents.length})
                  </div>
                  <div className="space-y-1">
                    {selectedParents.length === 0 && (
                      <div className="text-xs text-muted-foreground">— none (root) —</div>
                    )}
                    {selectedParents.map((e) => {
                      const p = nodes.find((n) => n.id === e.parent_id);
                      return (
                        <div key={e.id} className="flex items-center justify-between text-sm">
                          <button
                            onClick={() => setSelectedId(e.parent_id)}
                            className="hover:underline text-left truncate"
                          >
                            {p?.label ?? "?"}
                          </button>
                          {canEdit && (
                            <button
                              onClick={() => removeEdge(e.id)}
                              className="text-destructive hover:opacity-70"
                              title="Remove parent link"
                            >
                              <Unlink className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground uppercase mb-1">
                    Children ({selectedChildren.length})
                  </div>
                  <div className="space-y-1 max-h-40 overflow-auto">
                    {selectedChildren.length === 0 && (
                      <div className="text-xs text-muted-foreground">— none —</div>
                    )}
                    {selectedChildren.map((e) => {
                      const c = nodes.find((n) => n.id === e.child_id);
                      return (
                        <div key={e.id} className="flex items-center justify-between text-sm">
                          <button
                            onClick={() => setSelectedId(e.child_id)}
                            className="hover:underline text-left truncate"
                          >
                            {c?.label ?? "?"}
                          </button>
                          {canEdit && (
                            <button
                              onClick={() => removeEdge(e.id)}
                              className="text-destructive hover:opacity-70"
                              title="Remove child link"
                            >
                              <Unlink className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
                {canEdit && (
                  <div className="space-y-2 pt-2 border-t border-border">
                    {linkSourceId === selectedNode.id ? (
                      <Button
                        variant="secondary"
                        size="sm"
                        className="w-full"
                        onClick={() => setLinkSourceId(null)}
                      >
                        Cancel link
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() => setLinkSourceId(selectedNode.id)}
                      >
                        <Link2 className="h-4 w-4 mr-1" /> Link as parent of…
                      </Button>
                    )}
                    {linkSourceId && linkSourceId !== selectedNode.id && (
                      <Button
                        variant="default"
                        size="sm"
                        className="w-full"
                        onClick={() => {
                          addEdge(linkSourceId, selectedNode.id);
                          setLinkSourceId(null);
                        }}
                      >
                        Make this a child of pending link source
                      </Button>
                    )}
                    <Button
                      variant="destructive"
                      size="sm"
                      className="w-full"
                      onClick={() => deleteNode(selectedNode.id)}
                    >
                      <Trash2 className="h-4 w-4 mr-1" /> Delete node
                    </Button>
                  </div>
                )}
              </div>
            )}
            {linkSourceId && (
              <div className="text-xs p-2 rounded bg-muted">
                Linking from: <strong>{nodes.find((n) => n.id === linkSourceId)?.label}</strong>
                <br />
                Click any other node to make it a child.
              </div>
            )}
          </Card>
        </div>
      </div>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Node</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Label</Label>
              <Input value={newLabel} onChange={(e) => setNewLabel(e.target.value)} />
            </div>
            <div>
              <Label>Type</Label>
              <Select value={newType} onValueChange={setNewType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="family">Family</SelectItem>
                  <SelectItem value="race">Race</SelectItem>
                  <SelectItem value="variant">Variant</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Color</Label>
              <Select value={newColor} onValueChange={setNewColor}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(FAMILY_COLORS).map(([name, c]) => (
                    <SelectItem key={name} value={c}>
                      <span className="inline-flex items-center gap-2">
                        <span
                          className="inline-block w-3 h-3 rounded-full"
                          style={{ backgroundColor: c }}
                        />
                        {name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setAddOpen(false)}>
              Cancel
            </Button>
            <Button onClick={addNode}>Add</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EvolutionTree;
