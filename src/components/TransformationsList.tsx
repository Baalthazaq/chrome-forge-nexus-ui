import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import type { EvoTransformation, EvoNode } from "@/lib/evolutionGraph";

interface Props {
  /** Compact mode for use inside a side panel/sheet. */
  compact?: boolean;
}

export default function TransformationsList({ compact = false }: Props) {
  const [rows, setRows] = useState<EvoTransformation[]>([]);
  const [nodes, setNodes] = useState<EvoNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    (async () => {
      const [tRes, nRes] = await Promise.all([
        supabase.from("evolution_transformations").select("*").order("stage").order("label"),
        supabase.from("evolution_nodes").select("*"),
      ]);
      setRows(((tRes.data ?? []) as unknown) as EvoTransformation[]);
      setNodes(((nRes.data ?? []) as unknown) as EvoNode[]);
      setLoading(false);
    })();
  }, []);

  const carriers = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes]);

  const filtered = useMemo(() => {
    const f = filter.trim().toLowerCase();
    if (!f) return rows;
    return rows.filter(
      (r) =>
        r.label.toLowerCase().includes(f) ||
        (r.description ?? "").toLowerCase().includes(f) ||
        (r.granted_tags ?? []).some((t) => t.toLowerCase().includes(f)) ||
        (r.host_required_tags ?? []).some((t) => t.toLowerCase().includes(f)),
    );
  }, [rows, filter]);

  const grouped = useMemo(() => {
    const m = new Map<number, EvoTransformation[]>();
    for (const r of filtered) {
      const s = r.stage ?? 0;
      if (!m.has(s)) m.set(s, []);
      m.get(s)!.push(r);
    }
    return Array.from(m.entries()).sort(([a], [b]) => a - b);
  }, [filtered]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Input
        placeholder="Search transformations…"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
      />
      {grouped.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-6">No transformations found.</p>
      )}
      {grouped.map(([stage, list]) => (
        <div key={stage} className="space-y-2">
          <h3 className="text-xs uppercase tracking-wide text-muted-foreground">
            Stage {stage}
          </h3>
          <div className={compact ? "space-y-2" : "grid gap-3 md:grid-cols-2"}>
            {list.map((r) => {
              const carrierIds = r.carrier_node_ids ?? [];
              const carrierLabels = carrierIds.map((id) => carriers.get(id)?.label).filter(Boolean);
              const carrierLabel = carrierLabels.length ? carrierLabels.join(" × ") : null;
              return (
                <Card key={r.id} className="p-3 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="font-semibold">{r.label}</h4>
                    <Badge variant="outline" className="capitalize">
                      {r.acquisition}
                    </Badge>
                    {carrierLabel && <Badge variant="secondary">via {carrierLabel}</Badge>}
                    {r.stackable && <Badge variant="outline">stackable</Badge>}
                  </div>
                  {r.description && (
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {r.description}
                    </p>
                  )}
                  {(r.granted_tags ?? []).length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      <span className="text-[10px] uppercase text-muted-foreground mr-1">grants</span>
                      {r.granted_tags.map((t) => (
                        <Badge key={t} variant="secondary" className="text-[10px]">
                          {t}
                        </Badge>
                      ))}
                    </div>
                  )}
                  {(r.powers ?? []).length > 0 && (
                    <div className="space-y-1.5 pt-1 border-t border-border/50">
                      {r.powers!.map((p, i) => (
                        <div key={i} className="text-sm">
                          <span className="font-bold tracking-wide">{p.name}:</span>{" "}
                          <span className="text-muted-foreground whitespace-pre-wrap">{p.description}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {(r.host_required_tags ?? []).length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      <span className="text-[10px] uppercase text-muted-foreground mr-1">
                        requires {r.host_tag_match_mode === "any" ? "any of" : "all of"}
                      </span>
                      {r.host_required_tags.map((t) => (
                        <Badge key={t} variant="outline" className="text-[10px]">
                          {t}
                        </Badge>
                      ))}
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
