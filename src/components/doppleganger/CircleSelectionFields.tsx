import { useEffect, useState } from "react";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CircleCombobox } from "./CircleCombobox";
import { readCircleSelections, writeCircleSelections } from "./circleSelections";

export function CircleSelectionFields({ label, kind, value, onChange, isEditing }: {
  label: string;
  kind: "races" | "transformations";
  value: string | null | undefined;
  onChange: (value: string | null) => void;
  isEditing: boolean;
}) {
  const [entries, setEntries] = useState<string[]>(() => readCircleSelections(value));
  useEffect(() => {
    setEntries((current) => {
      // Preserve unsaved blank rows when a filled selection is saved.
      if (isEditing && writeCircleSelections(current) === (value || null)) return current;
      return readCircleSelections(value);
    });
  }, [value, isEditing]);

  const save = (next: string[]) => {
    setEntries(next);
    onChange(writeCircleSelections(next));
  };

  const visible = isEditing ? (entries.length ? entries : [""]) : readCircleSelections(value);
  if (!visible.length) return null;

  return (
    <div className="min-w-0 space-y-2">
      {visible.map((entry, index) => (
        <div key={index} className="flex items-end gap-1">
          <div className="min-w-0 flex-1">
            <CircleCombobox
              label={index === 0 ? label : `${label} ${index + 1}`}
              kind={kind}
              value={entry}
              onChange={(selection) => save(visible.map((item, i) => i === index ? selection : item))}
              isEditing={isEditing}
            />
          </div>
          {isEditing && (
            <Button type="button" variant="ghost" size="icon" className="h-9 w-8 shrink-0 text-muted-foreground"
              aria-label={`Remove ${label.toLowerCase()} ${index + 1}`} title={`Remove ${label.toLowerCase()}`}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => save(visible.filter((_, i) => i !== index))}>
              <X />
            </Button>
          )}
        </div>
      ))}
      {isEditing && (
        <Button type="button" variant="outline" size="icon" className="h-7 w-7"
          aria-label={`Add ${label.toLowerCase()}`} title={`Add ${label.toLowerCase()}`}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => setEntries([...visible, ""])}>
          <Plus />
        </Button>
      )}
    </div>
  );
}