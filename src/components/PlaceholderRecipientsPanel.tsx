import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { formatHex } from "@/lib/currency";
import { Trash2, ArrowRightLeft, Pencil } from "lucide-react";

interface Placeholder {
  id: string;
  name: string;
  balance: number;
  notes: string | null;
  resolved_to_user_id: string | null;
  resolved_at: string | null;
  created_at: string;
}

interface Props {
  profiles: { user_id: string; character_name: string; credits?: number }[];
  onChange?: () => void;
}

export default function PlaceholderRecipientsPanel({ profiles, onChange }: Props) {
  const { toast } = useToast();
  const [items, setItems] = useState<Placeholder[]>([]);
  const [showResolved, setShowResolved] = useState(false);
  const [loading, setLoading] = useState(true);

  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<Placeholder | null>(null);
  const [editName, setEditName] = useState("");
  const [editNotes, setEditNotes] = useState("");

  const [resolveOpen, setResolveOpen] = useState(false);
  const [resolving, setResolving] = useState<Placeholder | null>(null);
  const [resolveTarget, setResolveTarget] = useState<string>("");

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("placeholder_recipients")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setItems(data as Placeholder[]);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const visible = items.filter((i) => showResolved ? true : !i.resolved_to_user_id);

  const openEdit = (p: Placeholder) => {
    setEditing(p);
    setEditName(p.name);
    setEditNotes(p.notes || "");
    setEditOpen(true);
  };

  const saveEdit = async () => {
    if (!editing) return;
    const { error } = await supabase
      .from("placeholder_recipients")
      .update({ name: editName.trim(), notes: editNotes || null })
      .eq("id", editing.id);
    if (error) return toast({ title: "Error", description: error.message, variant: "destructive" });
    toast({ title: "Saved" });
    setEditOpen(false);
    load();
    onChange?.();
  };

  const remove = async (p: Placeholder) => {
    if (p.balance !== 0 && !confirm(`This placeholder still holds ${formatHex(p.balance)}. Delete anyway?`)) return;
    const { error } = await supabase.from("placeholder_recipients").delete().eq("id", p.id);
    if (error) return toast({ title: "Error", description: error.message, variant: "destructive" });
    toast({ title: "Deleted" });
    load();
    onChange?.();
  };

  const openResolve = (p: Placeholder) => {
    setResolving(p);
    setResolveTarget("");
    setResolveOpen(true);
  };

  const doResolve = async () => {
    if (!resolving || !resolveTarget) return;
    const target = profiles.find((p) => p.user_id === resolveTarget);
    if (!target) return;

    // Transfer balance into target profile
    if (resolving.balance !== 0) {
      const newCredits = (target.credits ?? 0) + resolving.balance;
      const { error: upErr } = await supabase
        .from("profiles")
        .update({ credits: newCredits })
        .eq("user_id", resolveTarget);
      if (upErr) return toast({ title: "Error", description: upErr.message, variant: "destructive" });

      await supabase.from("transactions").insert({
        user_id: resolveTarget,
        transaction_type: "credit",
        amount: resolving.balance,
        description: `Resolved placeholder: ${resolving.name}`,
        status: "completed",
        placeholder_recipient_id: resolving.id,
      } as any);
    }

    const { error } = await supabase
      .from("placeholder_recipients")
      .update({
        resolved_to_user_id: resolveTarget,
        resolved_at: new Date().toISOString(),
        balance: 0,
      })
      .eq("id", resolving.id);
    if (error) return toast({ title: "Error", description: error.message, variant: "destructive" });

    toast({ title: "Resolved", description: `${resolving.name} → ${target.character_name}` });
    setResolveOpen(false);
    load();
    onChange?.();
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Placeholder Recipients</CardTitle>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowResolved((v) => !v)}>
            {showResolved ? "Hide Resolved" : "Show Resolved"}
          </Button>
          <Button variant="outline" size="sm" onClick={load}>Refresh</Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : visible.length === 0 ? (
          <p className="text-sm text-muted-foreground">No placeholder recipients yet. Players create these by sending Hex to a typed name that doesn't exist.</p>
        ) : (
          <div className="space-y-2">
            {visible.map((p) => (
              <div key={p.id} className="flex items-start justify-between gap-3 p-3 rounded border">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium">{p.name}</span>
                    {p.resolved_to_user_id ? (
                      <Badge variant="secondary">Resolved → {profiles.find((pr) => pr.user_id === p.resolved_to_user_id)?.character_name || "Unknown"}</Badge>
                    ) : (
                      <Badge>Active</Badge>
                    )}
                    <span className="text-xs text-muted-foreground">created {new Date(p.created_at).toLocaleDateString()}</span>
                  </div>
                  {p.notes && <p className="text-xs text-muted-foreground mt-1">{p.notes}</p>}
                </div>
                <div className="text-right shrink-0">
                  <div className="font-mono text-sm">{formatHex(p.balance)}</div>
                  <div className="flex gap-1 mt-2 justify-end">
                    {!p.resolved_to_user_id && (
                      <Button size="sm" variant="outline" onClick={() => openResolve(p)} title="Resolve to user">
                        <ArrowRightLeft className="w-3 h-3" />
                      </Button>
                    )}
                    <Button size="sm" variant="outline" onClick={() => openEdit(p)} title="Edit"><Pencil className="w-3 h-3" /></Button>
                    <Button size="sm" variant="outline" onClick={() => remove(p)} title="Delete"><Trash2 className="w-3 h-3" /></Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Placeholder</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm">Name</label>
              <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
            </div>
            <div>
              <label className="text-sm">Admin notes</label>
              <Textarea value={editNotes} onChange={(e) => setEditNotes(e.target.value)} rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button onClick={saveEdit}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={resolveOpen} onOpenChange={setResolveOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Resolve "{resolving?.name}"</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Transfer {resolving ? formatHex(resolving.balance) : ""} to a real character. The placeholder will be marked resolved.
            </p>
            <Select value={resolveTarget} onValueChange={setResolveTarget}>
              <SelectTrigger><SelectValue placeholder="Pick a character…" /></SelectTrigger>
              <SelectContent>
                {profiles.map((p) => (
                  <SelectItem key={p.user_id} value={p.user_id}>{p.character_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResolveOpen(false)}>Cancel</Button>
            <Button onClick={doResolve} disabled={!resolveTarget}>Resolve</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
