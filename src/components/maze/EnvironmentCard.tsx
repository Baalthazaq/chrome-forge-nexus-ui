import { EnvironmentCard as EnvCard } from '@/hooks/useMazeData';
import { Badge } from '@/components/ui/badge';

interface EnvironmentCardDisplayProps {
  card: EnvCard;
  areaName: string;
}

export const EnvironmentCardDisplay = ({ card, areaName }: EnvironmentCardDisplayProps) => {
  if (!card || (!card.tier && !card.type && !card.features?.length)) return null;

  return (
    <div className="bg-gray-900/80 border border-gray-700/50 rounded-lg p-4 space-y-3">
      {/* Header */}
      <div className="border-b border-gray-700/50 pb-2">
        <h3 className="text-lg font-bold text-gray-100">{areaName}</h3>
        {(card.tier || card.type) && (
          <p className="text-sm text-teal-400 font-mono">
            {card.tier ? `Tier ${card.tier}` : ''} {card.type || ''}
          </p>
        )}
      </div>

      {/* Impulses */}
      {card.impulses && card.impulses.length > 0 && (
        <div>
          <span className="text-xs text-gray-400 font-mono">Impulses: </span>
          <span className="text-sm text-gray-300">{card.impulses.join(', ')}</span>
        </div>
      )}

      {/* Difficulty & Adversaries */}
      {(card.difficulty || card.potential_adversaries) && (
        <div className="bg-gray-800/60 rounded p-2 space-y-1">
          {card.difficulty && (
            <div>
              <span className="text-xs text-gray-400 font-mono font-bold">Difficulty: </span>
              <span className="text-sm text-gray-200">{card.difficulty}</span>
            </div>
          )}
          {card.potential_adversaries && (
            <div>
              <span className="text-xs text-gray-400 font-mono font-bold">Potential adversaries: </span>
              <span className="text-sm text-gray-200">{card.potential_adversaries}</span>
            </div>
          )}
        </div>
      )}

      {/* Features */}
      {card.features && card.features.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-bold text-gray-200 border-b border-gray-700/30 pb-1">Features</h4>
          {card.features.map((feat, i) => (
            <div key={i} className="text-sm">
              <span className="font-bold text-gray-200">{feat.name}</span>
              {feat.type && (
                <span className="text-gray-400"> - {feat.type}:</span>
              )}
              <span className="text-gray-300 ml-1">{feat.description}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
