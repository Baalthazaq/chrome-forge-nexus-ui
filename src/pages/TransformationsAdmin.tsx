import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAdmin } from "@/hooks/useAdmin";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, Save, Trash2, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import type { EvoTransformation, EvoNode } from "@/lib/evolutionGraph";

interface Draft {
  id?: string;
  label: string;
  description: string;
  granted_tags: string;
  host_required_tags: string;
  host_tag_match_mode: string;
  forbidden_tags: string;
  acquisition: string;
  carrier_node_id: string | null;
  stackable: boolean;
  stage: string;
  chance: string;
}

const empty = (): Draft => ({
  label: "",
  description: "",
  granted_tags: "",
  host_required_tags: "",
  host_tag_match_mode: "all",
  forbidden_tags: "",
  acquisition: "afflicted",
  carrier_node_id: null,
  stackable: false,
  stage: "0",
  chance: "5",
});

const fromRow = (r: EvoTransformation): Draft => ({
  id: r.id,
  label: r.label,
  description: r.description ?? "",
  granted_tags: (r.granted_tags ?? []).join(", "),
  host_required_tags: (r.host_required_tags ?? []).join(", "),
  host_tag_match_mode: r.host_tag_match_mode ?? "all",
  forbidden_tags: (r.forbidden_tags ?? []).join(", "),
  acquisition: r.acquisition ?? "afflicted",
  carrier_node_id: r.carrier_node_id ?? null,
  stackable: !!r.stackable,
  stage: String(r.stage ?? 0),
  chance: String(Math.round((r.chance ?? 0) * 100)),
});

const toPayload = (d: Draft) => ({
  label: d.label.trim(),
  description: d.description.trim() || null,
  granted_tags: d.granted_tags.split(",").map((t) => t.trim()).filter(Boolean),
  host_required_tags: d.host_required_tags.split(",").map((t) => t.trim()).filter(Boolean),
  host_tag_match_mode: d.host_tag_match_mode,
  forbidden_tags: d.forbidden_tags.split(",").map((t) => t.trim()).filter(Boolean),
  acquisition: d.acquisition,
  carrier_node_id: d.carrier_node_id || null,
  stackable: d.stackable,
  stage: Math.max(0, Math.floor(Number(d.stage) || 0)),
  chance: Math.min(1, Math.max(0, (Number(d.chance) || 0) / 100)),
});

export default function TransformationsAdmin() {
  const navigate = useNavigate();
  const { isAdmin, isLoading: adminLoading } = useAdmin();
  const [rows, setRows] = useState<EvoTransformation[]>([]);
  const [nodes, setNodes] = useState<EvoNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [newDraft, setNewDraft] = useState<Draft>(empty());

  const load = async () => {
    const [tRes, nRes] = await Promise.all([
      supabase.from("evolution_transformations").select("*").order("stage").order("label"),
      supabase.from("evolution_nodes").select("*"),
    ]);
    if (tRes.error || nRes.error) {
      toast.error("Failed to load transformations");
      setLoading(false);
      return;
    }
    const list = (tRes.data ?? []) as unknown as EvoTransformation[];
    setRows(list);
    setNodes((nRes.data ?? []) as unknown as EvoNode[]);
    const d: Record<string, Draft> = {};
    for (const r of list) d[r.id] = fromRow(r);
    setDrafts(d);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const carriers = useMemo(
    () => nodes.filter((n) => n.is_carrier).sort((a, b) => a.label.localeCompare(b.label)),
    [nodes],
  );

  const save = async (id: string) => {
    const d = drafts[id];
    if (!d?.label.trim()) {
      toast.error("Label required");
      return;
    }
    const { error } = await supabase
      .from("evolution_transformations")
      .update(toPayload(d))
      .eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Saved");
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this transformation?")) return;
    const { error } = await supabase.from("evolution_transformations").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Deleted");
    load();
  };

  const create = async () => {
    if (!newDraft.label.trim()) {
      toast.error("Label required");
      return;
    }
    const { error } = await supabase.from("evolution_transformations").insert(toPayload(newDraft));
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Created");
    setNewDraft(empty());
    load();
  };

  if (adminLoading || loading) {
    return (
      <div className="dark min-h-screen bg-background text-foreground flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="dark min-h-screen bg-background text-foreground flex items-center justify-center">
        <p>Admins only.</p>
      </div>
    );
  }

  const renderForm = (draft: Draft, onChange: (d: Draft) => void) => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      <div>
        <Label className="text-xs">Label</Label>
        <Input value={draft.label} onChange={(e) => onChange({ ...draft, label: e.target.value })} />
      </div>
      <div>
        <Label className="text-xs">Stage (apply order)</Label>
        <Input
          type="number"
          value={draft.stage}
          onChange={(e) => onChange({ ...draft, stage: e.target.value })}
        />
      </div>
      <div className="md:col-span-2">
        <Label className="text-xs">Description</Label>
        <Textarea
          rows={2}
          value={draft.description}
          onChange={(e) => onChange({ ...draft, description: e.target.value })}
        />
      </div>
      <div>
        <Label className="text-xs">Granted tags (comma separated)</Label>
        <Input
          value={draft.granted_tags}
          onChange={(e) => onChange({ ...draft, granted_tags: e.target.value })}
          placeholder="e.g. Spider, Undead"
        />
      </div>
      <div>
        <Label className="text-xs">Host required tags</Label>
        <Input
          value={draft.host_required_tags}
          onChange={(e) => onChange({ ...draft, host_required_tags: e.target.value })}
          placeholder="e.g. Drow"
        />
      </div>
      <div>
        <Label className="text-xs">Match mode</Label>
        <Select
          value={draft.host_tag_match_mode}
          onValueChange={(v) => onChange({ ...draft, host_tag_match_mode: v })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All required</SelectItem>
            <SelectItem value="any">Any required</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label className="text-xs">Forbidden tags</Label>
        <Input
          value={draft.forbidden_tags}
          onChange={(e) => onChange({ ...draft, forbidden_tags: e.target.value })}
          placeholder="e.g. Construct"
        />
      </div>
      <div>
        <Label className="text-xs">Acquisition</Label>
        <Select
          value={draft.acquisition}
          onValueChange={(v) => onChange({ ...draft, acquisition: v })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="innate">Innate</SelectItem>
            <SelectItem value="afflicted">Afflicted (via carrier)</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label className="text-xs">Carrier node</Label>
        <Select
          value={draft.carrier_node_id ?? "none"}
          onValueChange={(v) => onChange({ ...draft, carrier_node_id: v === "none" ? null : v })}
        >
          <SelectTrigger>
            <SelectValue placeholder="None" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">None</SelectItem>
            {carriers.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {carriers.length === 0 && (
          <p className="text-[10px] text-muted-foreground mt-1">
            Mark a node as "is_carrier" in Circle of Life to make it available here.
          </p>
        )}
      </div>
      <div>
        <Label className="text-xs">Chance per roll (%)</Label>
        <Input
          type="number"
          value={draft.chance}
          onChange={(e) => onChange({ ...draft, chance: e.target.value })}
        />
      </div>
      <div className="flex items-center gap-2 pt-6">
        <Switch
          checked={draft.stackable}
          onCheckedChange={(v) => onChange({ ...draft, stackable: v })}
        />
        <Label className="text-xs">Stackable with itself</Label>
      </div>
    </div>
  );

  return (
    <div className="dark min-h-screen bg-background text-foreground p-6">
      <div className="max-w-5xl mx-auto space-y-4">
        <header className="space-y-2">
          <Button variant="ghost" size="sm" onClick={() => navigate("/admin")} className="-ml-2">
            <ArrowLeft className="h-4 w-4 mr-1" /> Back to Admin
          </Button>
          <h1 className="text-4xl font-bold tracking-tight">Transformations</h1>
          <p className="text-muted-foreground">
            Data-driven modifiers layered on top of a rolled lineage. Stage controls apply order;
            granted tags can unlock further transformations.
          </p>
        </header>

        <Card className="p-4 space-y-3 border-dashed">
          <div className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            <h2 className="font-semibold">New transformation</h2>
          </div>
          {renderForm(newDraft, setNewDraft)}
          <div className="flex justify-end">
            <Button onClick={create}>
              <Plus className="h-4 w-4 mr-1" /> Create
            </Button>
          </div>
        </Card>

        <div className="space-y-3">
          {rows.map((r) => {
            const d = drafts[r.id];
            if (!d) return null;
            const carrier = carriers.find((c) => c.id === r.carrier_node_id);
            return (
              <Card key={r.id} className="p-4 space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-lg font-semibold">{r.label}</h3>
                  <Badge variant="outline">stage {r.stage}</Badge>
                  <Badge variant="outline">{r.acquisition}</Badge>
                  {carrier && <Badge variant="secondary">via {carrier.label}</Badge>}
                  <span className="ml-auto text-xs text-muted-foreground">
                    {Math.round((r.chance ?? 0) * 100)}% chance
                  </span>
                </div>
                {renderForm(d, (nd) => setDrafts({ ...drafts, [r.id]: nd }))}
                <div className="flex justify-end gap-2">
                  <Button variant="destructive" size="sm" onClick={() => remove(r.id)}>
                    <Trash2 className="h-4 w-4 mr-1" /> Delete
                  </Button>
                  <Button size="sm" onClick={() => save(r.id)}>
                    <Save className="h-4 w-4 mr-1" /> Save
                  </Button>
                </div>
              </Card>
            );
          })}
          {rows.length === 0 && (
            <p className="text-center text-muted-foreground py-8">
              No transformations yet. Use the form above to create one.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
