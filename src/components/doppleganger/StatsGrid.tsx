import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { STAT_SKILLS, type StatName } from "@/data/gameCardTypes";

interface Props {
  profile: any;
  displayUser: any;
  onStatChange: (stat: string, value: number) => void;
  isEditing: boolean;
}

const STAT_COLORS: Record<StatName, string> = {
  agility: 'text-green-400 border-green-500/30',
  strength: 'text-red-400 border-red-500/30',
  finesse: 'text-blue-400 border-blue-500/30',
  instinct: 'text-yellow-400 border-yellow-500/30',
  presence: 'text-pink-400 border-pink-500/30',
  knowledge: 'text-cyan-400 border-cyan-500/30',
};

export function StatsGrid({ profile, onStatChange, isEditing }: Props) {
  const stats = Object.keys(STAT_SKILLS) as StatName[];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
      {stats.map((stat) => {
        const value = profile?.[stat] ?? 0;
        const skills = STAT_SKILLS[stat];
        const colorClass = STAT_COLORS[stat];

        return (
          <Card key={stat} className={`p-3 bg-gray-900/30 border-gray-700/50 ${colorClass.split(' ')[1]}`}>
            <div className="text-center mb-2">
              <div className={`text-xs uppercase tracking-wider ${colorClass.split(' ')[0]} mb-1`}>
                {stat}
              </div>
              {isEditing ? (
                <Input
                  type="number"
                  value={value}
                  onChange={(e) => onStatChange(stat, Number(e.target.value) || 0)}
                  className="w-16 h-10 text-center text-xl font-bold bg-gray-800/50 border-gray-600 text-gray-100 mx-auto"
                />
              ) : (
                <div className={`text-2xl font-bold ${colorClass.split(' ')[0]}`}>{value}</div>
              )}
            </div>
            <div className="space-y-0.5">
              {skills.map((skill) => (
                <div key={skill} className="text-xs text-gray-400 text-center">
                  {skill}
                </div>
              ))}
            </div>
          </Card>
        );
      })}
    </div>
  );
}
