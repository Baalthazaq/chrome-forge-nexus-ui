import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Loader2, Dices, ChevronDown, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { EvoNode, EvoEdge } from "@/lib/evolutionGraph";
import { LineageNode, RolledSubject, rollSubject } from "@/lib/racegenLogic";

const MODE_BADGE: Record<string, { letter: string; tip: string; cls: string }> = {
  asexual: { letter: "A", tip: "Asexual", cls: "bg-emerald-700/40 text-emerald-200 border-emerald-600/60" },
  transformed: { letter: "T", tip: "Transformed", cls: "bg-fuchsia-700/40 text-fuchsia-200 border-fuchsia-600/60" },
  created: { letter: "C", tip: "Created", cls: "bg-amber-700/40 text-amber-200 border-amber-600/60" },
};

function LineageTreeView({ node, depth = 0 }: { node: LineageNode; depth?: number }) {
  const [open, setOpen] = useState(depth < 2);
  const hasKids = node.parents.length > 0;
  const badge = MODE_BADGE[node.reproduction_mode];
  const role = node.isHost ? "Host" : node.isCreator ? "Creator" : null;
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
  return (
    <Card className="p-4 space-y-3 bg-card/80 border-border">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-2xl font-bold tracking-wider">{subject.initials}</div>
          <div className="text-sm text-muted-foreground">
            <span className="text-foreground font-semibold">{subject.gender === "M" ? "♂ Male" : "♀ Female"}</span>
            {" · "}
            {subject.variantLabel ? `${subject.variantLabel} ` : ""}
            <span className="text-foreground">{subject.identityLabel}</span>
            {subject.identityFamily && (
              <span className="text-muted-foreground"> ({subject.identityFamily})</span>
            )}
          </div>
        </div>
        {badge && (
          <span title={badge.tip} className={`inline-flex items-center justify-center text-xs font-bold w-6 h-6 rounded border ${badge.cls}`}>
            {badge.letter}
          </span>
        )}
      </div>

      <div className="space-y-1">
        <div className="text-[10px] uppercase text-muted-foreground tracking-wider">DNA</div>
        <div className="flex h-2 rounded overflow-hidden bg-muted">
          {subject.dna.map((d, i) => (
            <div
              key={i}
              title={`${d.label} ${d.pct.toFixed(1)}%`}
              style={{ width: `${d.pct}%`, backgroundColor: `hsl(${(i * 67) % 360} 60% 55%)` }}
            />
          ))}
        </div>
        <div className="flex flex-wrap gap-1 text-[10px] text-muted-foreground">
          {subject.dna.slice(0, 6).map((d, i) => (
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

      {subject.effectiveTags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {subject.effectiveTags.filter(t => !["family", "race", "variant"].includes(t)).slice(0, 8).map((t) => (
            <Badge key={t} variant="outline" className="text-[9px] py-0 px-1 h-4">{t}</Badge>
          ))}
        </div>
      )}

      <details className="text-xs">
        <summary className="cursor-pointer text-muted-foreground hover:text-foreground select-none">Lineage</summary>
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
  const [loading, setLoading] = useState(true);
  const [batchSize, setBatchSize] = useState(8);
  const [results, setResults] = useState<RolledSubject[]>([]);
  const [seedRaceId, setSeedRaceId] = useState<string>("any");

  useEffect(() => {
    (async () => {
      const [{ data: n, error: nErr }, { data: e, error: eErr }] = await Promise.all([
        supabase.from("evolution_nodes").select("*"),
        supabase.from("evolution_edges").select("*"),
      ]);
      if (nErr || eErr) {
        toast.error("Failed to load evolution graph");
        setLoading(false);
        return;
      }
      setNodes((n ?? []) as unknown as EvoNode[]);
      setEdges((e ?? []) as EvoEdge[]);
      setLoading(false);
    })();
  }, []);

  const races = useMemo(() => nodes.filter((n) => n.type === "race").sort((a, b) => a.label.localeCompare(b.label)), [nodes]);

  const generate = () => {
    if (nodes.length === 0) {
      toast.error("No evolution data loaded");
      return;
    }
    try {
      const out: RolledSubject[] = [];
      for (let i = 0; i < batchSize; i++) {
        out.push(rollSubject(nodes, edges, seedRaceId !== "any" ? { seedRaceId } : undefined));
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
            Procedural ancestry generator — driven live by the Circle of Life graph.
            Edit nodes, tags, and reproduction modes there; this page reflects them on the next roll.
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
            {nodes.length} nodes • {races.length} races
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
