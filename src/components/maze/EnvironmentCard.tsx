import { EnvironmentCard as EnvCard } from '@/hooks/useMazeData';

interface EnvironmentCardDisplayProps {
  card: EnvCard;
  areaName: string;
  isAdmin?: boolean;
}

export const EnvironmentCardDisplay = ({ card, areaName, isAdmin = false }: EnvironmentCardDisplayProps) => {
  if (!card || (!card.tier && !card.type && !card.features?.length)) return null;

  const visible = card.visible_fields || {};
  // Default to true if not set
  const showImpulses = isAdmin || visible.impulses !== false;
  const showDifficulty = isAdmin || visible.difficulty !== false;
  const showAdversaries = isAdmin || visible.adversaries !== false;
  const showFeatures = isAdmin || visible.features !== false;

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
      {showImpulses && card.impulses && card.impulses.length > 0 && (
        <div>
          <span className="text-xs text-gray-400 font-mono">Impulses: </span>
          <span className="text-sm text-gray-300">{card.impulses.join(', ')}</span>
        </div>
      )}

      {/* Difficulty & Adversaries */}
      {(showDifficulty || showAdversaries) && (card.difficulty || card.potential_adversaries) && (
        <div className="bg-gray-800/60 rounded p-2 space-y-1">
          {showDifficulty && card.difficulty && (
            <div>
              <span className="text-xs text-gray-400 font-mono font-bold">Difficulty: </span>
              <span className="text-sm text-gray-200">{card.difficulty}</span>
            </div>
          )}
          {showAdversaries && card.potential_adversaries && (
            <div>
              <span className="text-xs text-gray-400 font-mono font-bold">Potential adversaries: </span>
              <span className="text-sm text-gray-200">{card.potential_adversaries}</span>
            </div>
          )}
        </div>
      )}

      {/* Features */}
      {showFeatures && card.features && card.features.length > 0 && (
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

      {/* Hidden fields indicator for players */}
      {!isAdmin && (visible.impulses === false || visible.difficulty === false || visible.adversaries === false || visible.features === false) && (
        <p className="text-xs text-gray-600 italic font-mono">Some information is hidden.</p>
      )}
    </div>
  );
};
