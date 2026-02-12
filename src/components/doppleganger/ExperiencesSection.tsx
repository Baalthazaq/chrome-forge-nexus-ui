import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, X, BookOpen } from "lucide-react";
import type { CharacterSheet, Experience } from "@/data/gameCardTypes";

interface Props {
  sheet: CharacterSheet;
  updateSheet: (updates: Partial<CharacterSheet>) => Promise<void>;
}

export function ExperiencesSection({ sheet, updateSheet }: Props) {
  const experiences = sheet.experiences || [];

  const addExperience = () => {
    updateSheet({ experiences: [...experiences, { text: '', value: 0 }] });
  };

  const updateExperience = (index: number, field: keyof Experience, val: string | number) => {
    const updated = experiences.map((exp, i) =>
      i === index ? { ...exp, [field]: field === 'value' ? Number(val) || 0 : val } : exp
    );
    updateSheet({ experiences: updated });
  };

  const removeExperience = (index: number) => {
    updateSheet({ experiences: experiences.filter((_, i) => i !== index) });
  };

  return (
    <Card className="p-4 bg-gray-900/30 border-gray-700/50 mb-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-emerald-400" />
          Experiences
        </h3>
        <Button variant="outline" size="sm" onClick={addExperience} className="border-gray-600 text-gray-300 hover:text-white">
          <Plus className="w-4 h-4 mr-1" />
          Add
        </Button>
      </div>

      <div className="space-y-2">
        {experiences.map((exp, i) => (
          <div key={i} className="flex items-center gap-2">
            <Input
              value={exp.text}
              onChange={(e) => updateExperience(i, 'text', e.target.value)}
              placeholder="Experience description..."
              className="flex-1 bg-gray-800/50 border-gray-600 text-sm"
            />
            <Input
              type="number"
              value={exp.value}
              onChange={(e) => updateExperience(i, 'value', e.target.value)}
              className="w-16 text-center bg-gray-800/50 border-gray-600 text-sm"
            />
            <button onClick={() => removeExperience(i)} className="text-gray-500 hover:text-red-400 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
        {experiences.length === 0 && (
          <div className="text-gray-500 text-sm text-center py-4">No experiences yet. Add one above.</div>
        )}
      </div>
    </Card>
  );
}
