import { useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { filterCircleOptions, findExactMatch, type ComboGroup } from "./circleOptionSearch";
export type { ComboItem, ComboGroup } from "./circleOptionSearch";

let cache: Promise<{ races: ComboGroup[]; transformations: ComboGroup[] }> | null = null;

function loadCircleOptions() {
  if (cache) return cache;
  cache = (async () => {
    const [nRes, eRes, tRes] = await Promise.all([
      supabase.from("evolution_nodes").select("id,label,type"),
      supabase.from("evolution_edges").select("parent_id,child_id"),
      supabase.from("evolution_transformations").select("label,stage").order("stage").order("label"),
    ]);
    const nodes = (nRes.data ?? []) as { id: string; label: string; type: string }[];
    const edges = (eRes.data ?? []) as { parent_id: string; child_id: string }[];
    const byId = new Map(nodes.map((n) => [n.id, n]));
    const children = new Map<string, string[]>();
    for (const e of edges) {
      const siblings = children.get(e.parent_id) ?? [];
      siblings.push(e.child_id);
      children.set(e.parent_id, siblings);
    }
    const placed = new Set<string>();
    const races: ComboGroup[] = [];
    const sources = nodes.filter((n) => n.type === "source").sort((a, b) => a.label.localeCompare(b.label));
    for (const src of sources) {
      const items: ComboGroup["items"] = [];
      const seen = new Set<string>([src.id]);
      const walk = (id: string, depth: number, ancestors: string[]) => {
        const kids = (children.get(id) ?? [])
          .map((k) => byId.get(k))
          .filter((k): k is NonNullable<typeof k> => !!k && k.type !== "source")
          .sort((a, b) => a.label.localeCompare(b.label));
        for (const k of kids) {
          if (seen.has(k.id)) continue;
          seen.add(k.id);
          placed.add(k.id);
          items.push({ label: k.label, depth, ancestors });
          walk(k.id, depth + 1, [k.label, ...ancestors]);
        }
      };
      walk(src.id, 0, []);
      races.push({ heading: src.label, items });
    }

    const orphans = nodes.filter((n) => n.type !== "source" && !placed.has(n.id));
    if (orphans.length) races.push({ heading: "Other", items: orphans.map((n) => ({ label: n.label, depth: 0, ancestors: [] })) });

    const tMap = new Map<number, ComboGroup["items"]>();
    for (const t of (tRes.data ?? []) as { label: string; stage: number | null }[]) {
      const s = t.stage ?? 0;
      const items = tMap.get(s) ?? [];
      items.push({ label: t.label, depth: 0, ancestors: [] });
      tMap.set(s, items);
    }
    const transformations = [...tMap.entries()].sort(([a], [b]) => a - b).map(([s, items]) => ({
      heading: `Stage ${s}`,
      items: items.map((i) => ({ ...i, ancestors: [] })),
    }));
    return { races, transformations };
  })();
  return cache;
}

export function CircleCombobox({ label, kind, value, onChange, isEditing }: {
  label: string;
  kind: "races" | "transformations";
  value: string;
  onChange: (val: string) => void;
  isEditing: boolean;
}) {
  const [groups, setGroups] = useState<ComboGroup[]>([]);
  const [open, setOpen] = useState(false);
  const [text, setText] = useState(value);

  useEffect(() => { setText(value); }, [value]);
  useEffect(() => {
    // Load once per session (cached) so view mode can also show the direct parent.
    loadCircleOptions().then((d) => setGroups(d[kind]));
  }, [kind]);

  const filtered = useMemo(() => filterCircleOptions(groups, text), [groups, text]);
  // When the typed text exactly matches a known option, show its direct parent beside it.
  const directParent = findExactMatch(groups, text)?.ancestors?.[0] ?? null;
  const viewParent = findExactMatch(groups, value)?.ancestors?.[0] ?? null;

  if (!isEditing) {
    if (!value.trim()) return null;
    return (
      <div>
        <label className="text-gray-300 text-xs mb-1 block">{label}</label>
        <div className="text-lg font-bold text-white">
          {value || "—"}
          {viewParent && (
            <span className="ml-2 text-sm font-normal text-gray-400">└ {viewParent}</span>
          )}
        </div>
      </div>
    );
  }

  const pick = (v: string) => { setText(v); onChange(v); setOpen(false); };
  const exact = groups.some((g) => g.items.some((i) => i.label.toLowerCase() === text.trim().toLowerCase()));

  return (
    <div className="relative">
      <label className="text-gray-300 text-xs mb-1 block">{label}</label>
      <div className="relative">
        <Input
          value={text}
          onChange={(e) => { setText(e.target.value); if (!open) setOpen(true); }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => { setOpen(false); if (text !== value) onChange(text.trim()); }, 150)}
          placeholder={`Type or select ${label.toLowerCase()}...`}
          className={`bg-gray-800/50 border-gray-600 text-gray-100 text-sm ${directParent ? "pr-28" : ""}`}
        />
        {directParent && (
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 whitespace-nowrap">
            └ {directParent}
          </span>
        )}
      </div>
      {open && (
        <div className="absolute top-full left-0 mt-1 w-[520px] max-w-[90vw] bg-gray-800 border border-gray-600 rounded-md shadow-lg z-50 max-h-96 overflow-y-auto py-1">
          {text.trim() && !exact && (
            <button
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => pick(text.trim())}
              className="w-full text-left px-3 py-2 text-sm text-purple-300 hover:bg-gray-700"
            >
              Use custom “{text.trim()}”
            </button>
          )}
          {filtered.length === 0 && <div className="px-3 py-2 text-sm text-gray-400">No matches</div>}
          {filtered.map((g) => (
            <div key={g.heading}>
              <div className="sticky top-0 bg-gray-900 px-3 py-1.5 text-xs uppercase tracking-wider font-semibold text-gray-300 border-y border-gray-700">
                {g.heading}
              </div>
              {g.items.map((i, idx) => (
                <button
                  key={`${i.label}-${idx}`}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => pick(i.label)}
                  style={{ paddingLeft: 12 + i.depth * 16 }}
                  className={`w-full text-left pr-3 py-1.5 text-sm hover:bg-gray-700 ${i.depth === 0 ? "text-gray-100 font-medium" : "text-gray-300"}`}
                >
                  {i.depth > 0 && <span className="text-gray-500 mr-1">└</span>}
                  {i.label}
                </button>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
