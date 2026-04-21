import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Loader2, Dices, ChevronDown, ChevronRight, Bug } from "lucide-react";
import { toast } from "sonner";
import { EvoNode, EvoEdge, EvoTransformation } from "@/lib/evolutionGraph";
import { LineageNode, RolledSubject, rollSubject, isActiveRace } from "@/lib/racegenLogic";

const ORIGIN_BADGE: Record<string, { label: string; cls: string; icon?: any }> = {
  parasitic: { label: "Parasitic", cls: "bg-violet-900/50 text-violet-200 border-violet-700/60", icon: Bug },
  created: { label: "Created", cls: "bg-amber-900/50 text-amber-200 border-amber-700/60" },
};

function LineageTreeView({ node, depth = 0 }: { node: LineageNode; depth?: number }) {
  const [open, setOpen] = useState(depth < 2);
  const hasKids = node.parents.length > 0;
  const badge = MODE_BADGE[node.reproduction_mode];
  const role = node.isHost ? "Hijacked Host" : node.isCreator ? "Creator" : null;
  return (
    <div className="text-xs" style={{ marginLeft: depth === 0 ? 0 : 12 }}>
      <div className="flex items-center gap-1.5 py-0.5">
        {hasKids ? (
          <button onClick={() => setOpen((o) => !o)} className="text-muted-foreground hover:text-foreground">
            {open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
          </button>
        ) : (
          <span className="w-3" />
        )}
        <span className="text-muted-foreground">{node.gender === "M" ? "♂" : "♀"}</span>
        <span className="font-medium">{node.label}</span>
        {role && <Badge variant="outline" className="text-[9px] py-0 px-1 h-4">{role}</Badge>}
        {badge && (
          <span title={badge.tip} className={`inline-flex items-center justify-center text-[9px] font-bold w-4 h-4 rounded border ${badge.cls}`}>
            {badge.letter}
          </span>
        )}
        {node.dnaShare > 0 && depth > 0 && (
          <span className="text-muted-foreground text-[10px]">({(node.dnaShare * 100).toFixed(0)}%)</span>
        )}
      </div>
      {open && hasKids && (
        <div className="border-l border-border ml-1.5 pl-1">
          {node.parents.map((p, i) => (
            <LineageTreeView key={i} node={p} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

function SubjectCard({ subject }: { subject: RolledSubject }) {
  const badge = MODE_BADGE[subject.reproduction_mode];
  const originBadge = ORIGIN_BADGE[subject.origin_mode];
  const OriginIcon = originBadge?.icon;
  const isParasitic = subject.origin_mode === "parasitic";
  const visibleDna = isParasitic && subject.hijackedDna ? subject.hijackedDna : subject.dna;

  // Filter out the structural tags from chips
  const tagChips = subject.effectiveTags
    .filter((t) => !["family", "race", "variant"].includes(t))
    .slice(0, 12);

  return (
    <Card className="p-4 space-y-3 bg-card/80 border-border">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="text-2xl font-bold tracking-wider">{subject.initials}</div>
          <div className="text-sm text-muted-foreground">
            <span className="text-foreground font-semibold">{subject.gender === "M" ? "♂ Male" : "♀ Female"}</span>
            {" · "}
            {subject.variantLabel ? `${subject.variantLabel} ` : ""}
            <span className="text-foreground">{subject.identityLabel}</span>
          </div>
          {(subject.secondaryIdentities?.length ?? 0) > 0 && (
            <div className="mt-1 space-y-0.5">
              {subject.secondaryIdentities!.map((s, i) => (
                <div key={i} className="text-xs text-muted-foreground">
                  {s.variantLabel ? `${s.variantLabel} ` : ""}
                  <span className="text-foreground/80">{s.raceLabel}</span>
                  <span className="ml-1 text-[10px]">({s.pct.toFixed(0)}%)</span>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="flex flex-col items-end gap-1">
          {originBadge && (
            <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 h-5 rounded border ${originBadge.cls}`}>
              {OriginIcon && <OriginIcon className="h-3 w-3" />}
              {originBadge.label}
            </span>
          )}
          {badge && (
            <span title={badge.tip} className={`inline-flex items-center justify-center text-xs font-bold w-6 h-6 rounded border ${badge.cls}`}>
              {badge.letter}
            </span>
          )}
        </div>
      </div>

      {/* Transformations stack */}
      {subject.transformations.length > 0 && (
        <div className="space-y-1 border-l-2 border-fuchsia-600/40 pl-2">
          <div className="text-[10px] uppercase text-muted-foreground tracking-wider flex items-center gap-1">
            <Sparkles className="h-3 w-3" /> Transformations
          </div>
          {subject.transformations.map((t) => (
            <div key={t.id} className="flex items-center gap-1.5 text-xs">
              <Badge className="bg-fuchsia-900/40 text-fuchsia-100 border-fuchsia-700/60 hover:bg-fuchsia-900/40 text-[10px] py-0 px-1.5 h-5">
                {t.label}
              </Badge>
              <span className="text-[10px] text-muted-foreground">
                {t.acquisition === "afflicted" && t.carrierLabel
                  ? `via ${t.carrierLabel}`
                  : t.acquisition === "innate"
                  ? "innate"
                  : t.acquisition}
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="space-y-1">
        <div className="text-[10px] uppercase text-muted-foreground tracking-wider">
          {isParasitic ? "Hijacked DNA" : "DNA"}
        </div>
        <div className="flex h-2 rounded overflow-hidden bg-muted">
          {visibleDna.map((d, i) => (
            <div
              key={i}
              title={`${d.label} ${d.pct.toFixed(1)}%`}
              style={{ width: `${d.pct}%`, backgroundColor: `hsl(${(i * 67) % 360} 60% 55%)` }}
            />
          ))}
        </div>
        <div className="flex flex-wrap gap-1 text-[10px] text-muted-foreground">
          {visibleDna.slice(0, 6).map((d, i) => (
            <span key={i}>{d.label} {d.pct.toFixed(1)}%</span>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-1 text-[11px]">
        <div className="bg-emerald-950/40 border border-emerald-800/50 rounded p-1.5">
          <div className="text-emerald-300/80 text-[9px] uppercase">Positive</div>
          <div>{subject.traits.pos}</div>
        </div>
        <div className="bg-slate-800/40 border border-slate-700/50 rounded p-1.5">
          <div className="text-slate-300/80 text-[9px] uppercase">Neutral</div>
          <div>{subject.traits.neu}</div>
        </div>
        <div className="bg-rose-950/40 border border-rose-800/50 rounded p-1.5">
          <div className="text-rose-300/80 text-[9px] uppercase">Negative</div>
          <div>{subject.traits.neg}</div>
        </div>
      </div>

      {tagChips.length > 0 && (
        <div>
          <div className="text-[10px] uppercase text-muted-foreground tracking-wider mb-1">Tags</div>
          <div className="flex flex-wrap gap-1">
            {tagChips.map((t) => (
              <Badge key={t} variant="outline" className="text-[9px] py-0 px-1 h-4">{t}</Badge>
            ))}
          </div>
        </div>
      )}

      <details className="text-xs">
        <summary className="cursor-pointer text-muted-foreground hover:text-foreground select-none">
          {isParasitic ? "Host body lineage" : "Lineage"}
        </summary>
        <div className="mt-2">
          <LineageTreeView node={subject.lineage} />
        </div>
      </details>
    </Card>
  );
}

const Racegen = () => {
  const navigate = useNavigate();
  const [nodes, setNodes] = useState<EvoNode[]>([]);
  const [edges, setEdges] = useState<EvoEdge[]>([]);
  const [transformations, setTransformations] = useState<EvoTransformation[]>([]);
  const [loading, setLoading] = useState(true);
  const [batchSize, setBatchSize] = useState(8);
  const [results, setResults] = useState<RolledSubject[]>([]);
  const [seedRaceId, setSeedRaceId] = useState<string>("any");

  useEffect(() => {
    (async () => {
      const [nRes, eRes, tRes] = await Promise.all([
        supabase.from("evolution_nodes").select("*"),
        supabase.from("evolution_edges").select("*"),
        supabase.from("evolution_transformations").select("*"),
      ]);
      if (nRes.error || eRes.error) {
        toast.error("Failed to load evolution graph");
        setLoading(false);
        return;
      }
      setNodes((nRes.data ?? []) as unknown as EvoNode[]);
      setEdges((eRes.data ?? []) as EvoEdge[]);
      setTransformations((tRes.data ?? []) as unknown as EvoTransformation[]);
      setLoading(false);
    })();
  }, []);

  const races = useMemo(
    () => nodes.filter((n) => n.type === "race" && !n.is_carrier).sort((a, b) => a.label.localeCompare(b.label)),
    [nodes]
  );

  const generate = () => {
    if (nodes.length === 0) {
      toast.error("No evolution data loaded");
      return;
    }
    try {
      const out: RolledSubject[] = [];
      for (let i = 0; i < batchSize; i++) {
        out.push(rollSubject(nodes, edges, {
          seedRaceId: seedRaceId !== "any" ? seedRaceId : undefined,
          transformations,
        }));
      }
      setResults(out);
    } catch (e: any) {
      toast.error(e?.message ?? "Roll failed");
    }
  };

  if (loading) {
    return (
      <div className="dark min-h-screen bg-background text-foreground flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="dark min-h-screen bg-background text-foreground p-6">
      <div className="max-w-[1800px] mx-auto space-y-4">
        <header className="space-y-2">
          <Button variant="ghost" size="sm" onClick={() => navigate("/admin")} className="-ml-2">
            <ArrowLeft className="h-4 w-4 mr-1" /> Back to Admin
          </Button>
          <h1 className="text-4xl font-bold tracking-tight">Racegen</h1>
          <p className="text-muted-foreground">
            Procedural ancestry generator — driven live by the Circle of Life graph and transformation table.
          </p>
        </header>

        <Card className="p-4 flex flex-wrap items-end gap-3">
          <div>
            <Label className="text-xs">Batch size</Label>
            <Input
              type="number" min={1} max={50} value={batchSize}
              onChange={(e) => setBatchSize(Math.max(1, Math.min(50, Number(e.target.value) || 1)))}
              className="w-24"
            />
          </div>
          <div>
            <Label className="text-xs">Seed race (optional)</Label>
            <select
              value={seedRaceId}
              onChange={(e) => setSeedRaceId(e.target.value)}
              className="h-10 rounded-md border border-input bg-background px-3 text-sm min-w-[200px]"
            >
              <option value="any">Any (weighted)</option>
              {races.map((r) => (
                <option key={r.id} value={r.id}>{r.label}</option>
              ))}
            </select>
          </div>
          <Button onClick={generate}>
            <Dices className="h-4 w-4 mr-1" /> Generate
          </Button>
          <span className="text-xs text-muted-foreground ml-auto">
            {nodes.length} nodes • {races.length} races • {transformations.length} transformations
          </span>
        </Card>

        {results.length === 0 ? (
          <Card className="p-12 text-center text-muted-foreground">
            Click Generate to roll a batch of subjects.
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {results.map((s, i) => (
              <SubjectCard key={i} subject={s} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Racegen;
