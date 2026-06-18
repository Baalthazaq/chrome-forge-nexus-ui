import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useState, useEffect } from "react";

export type ConflictAction = "update" | "ignore" | "new";

interface Props {
  open: boolean;
  existing: any | null;
  incoming: any | null;
  remainingCount: number;
  onResolve: (action: ConflictAction, applyToAll: boolean) => void;
}

const FIELDS = [
  "character_class", "level", "ancestry", "job", "company",
  "agility", "strength", "finesse", "instinct", "presence", "knowledge",
];

export function ImportConflictDialog({ open, existing, incoming, remainingCount, onResolve }: Props) {
  const [applyToAll, setApplyToAll] = useState(false);
  useEffect(() => { if (open) setApplyToAll(false); }, [open]);

  if (!existing || !incoming) return null;

  const fmt = (v: any) => (v === null || v === undefined || v === "" ? "—" : String(v));

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Duplicate name: {incoming.character_name}</DialogTitle>
          <DialogDescription>
            A character with this name already exists. Choose what to do for this row.
            {remainingCount > 0 && ` ${remainingCount} more conflict${remainingCount === 1 ? "" : "s"} after this.`}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-3 gap-2 text-sm border rounded-md p-3 bg-muted/30 max-h-80 overflow-auto">
          <div className="font-semibold">Field</div>
          <div className="font-semibold">Existing</div>
          <div className="font-semibold">Incoming</div>
          {FIELDS.map(f => {
            const a = fmt(existing[f]); const b = fmt(incoming[f]);
            const diff = a !== b;
            return (
              <>
                <div key={f + "k"} className="text-muted-foreground">{f}</div>
                <div key={f + "a"}>{a}</div>
                <div key={f + "b"} className={diff ? "text-primary font-medium" : ""}>{b}</div>
              </>
            );
          })}
        </div>

        {remainingCount > 0 && (
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={applyToAll} onCheckedChange={(v) => setApplyToAll(!!v)} />
            Apply this choice to all remaining conflicts
          </label>
        )}

        <div className="flex gap-2 justify-end flex-wrap">
          <Button variant="outline" onClick={() => onResolve("ignore", applyToAll)}>Ignore</Button>
          <Button variant="outline" onClick={() => onResolve("new", applyToAll)}>Create as new</Button>
          <Button onClick={() => onResolve("update", applyToAll)}>Update existing</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
