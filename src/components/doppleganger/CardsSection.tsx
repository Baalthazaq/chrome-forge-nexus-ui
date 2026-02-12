import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, X, Layers, BookOpen, PenTool } from "lucide-react";
import { useState } from "react";
import type { CharacterSheet, GameCard, SelectedCard } from "@/data/gameCardTypes";

interface Props {
  sheet: CharacterSheet;
  updateSheet: (updates: Partial<CharacterSheet>) => Promise<void>;
  gameCards: GameCard[];
  ancestryCards: GameCard[];
  communityCards: GameCard[];
  selectedSubclass: GameCard | undefined;
  domainCards: GameCard[];
  domains: string[];
}

export function CardsSection({
  sheet, updateSheet, gameCards,
  ancestryCards, communityCards, selectedSubclass,
  domainCards, domains,
}: Props) {
  const [showAddCard, setShowAddCard] = useState(false);
  const [addType, setAddType] = useState<'domain' | 'blank'>('domain');
  const [selectedDomainId, setSelectedDomainId] = useState('');
  const [customTitle, setCustomTitle] = useState('');
  const [customContent, setCustomContent] = useState('');

  const selectedCards = sheet.selected_card_ids || [];

  // Auto-included cards
  const autoCards: { title: string; content: string; source: string }[] = [];

  // Ancestry cards
  if (sheet.ancestry) {
    ancestryCards
      .filter(c => c.source === sheet.ancestry)
      .forEach(c => autoCards.push({ title: c.name, content: c.content || '', source: `Ancestry: ${c.source}` }));
  }

  // Community card
  if (sheet.community) {
    communityCards
      .filter(c => c.source === sheet.community)
      .forEach(c => autoCards.push({ title: c.name, content: c.content || '', source: `Community: ${c.source}` }));
  }

  // Subclass foundation
  if (selectedSubclass) {
    const meta = selectedSubclass.metadata as any;
    if (meta?.foundation) {
      autoCards.push({ title: `${selectedSubclass.name} Foundation`, content: meta.foundation, source: `Subclass` });
    }
    if (sheet.level >= 5 && meta?.specialization) {
      autoCards.push({ title: `${selectedSubclass.name} Specialization`, content: meta.specialization, source: `Subclass (Lv5)` });
    }
    if (sheet.level >= 8 && meta?.mastery) {
      autoCards.push({ title: `${selectedSubclass.name} Mastery`, content: meta.mastery, source: `Subclass (Lv8)` });
    }
  }

  // Filtered domain cards for adding
  const availableDomains = domainCards.filter(c => {
    const meta = c.metadata as any;
    return domains.includes(meta?.domain || c.source) && (meta?.level || 0) <= sheet.level;
  });

  const addCard = () => {
    if (addType === 'domain' && selectedDomainId) {
      const card = gameCards.find(c => c.id === selectedDomainId);
      if (card) {
        updateSheet({
          selected_card_ids: [...selectedCards, { card_id: card.id }],
        });
      }
    } else if (addType === 'blank' && customTitle) {
      updateSheet({
        selected_card_ids: [...selectedCards, { custom: true, title: customTitle, content: customContent }],
      });
    }
    setShowAddCard(false);
    setSelectedDomainId('');
    setCustomTitle('');
    setCustomContent('');
  };

  const removeCard = (index: number) => {
    updateSheet({
      selected_card_ids: selectedCards.filter((_, i) => i !== index),
    });
  };

  const getCardDetails = (sc: SelectedCard) => {
    if (sc.custom) return { title: sc.title || 'Custom Card', content: sc.content || '', source: 'Custom' };
    const card = gameCards.find(c => c.id === sc.card_id);
    if (!card) return { title: 'Unknown', content: '', source: '' };
    const meta = card.metadata as any;
    return {
      title: card.name,
      content: card.content || '',
      source: `${card.source || ''} ${meta?.type || ''} Lv${meta?.level || '?'}`,
    };
  };

  return (
    <Card className="p-4 bg-gray-900/30 border-gray-700/50 mb-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <Layers className="w-5 h-5 text-purple-400" />
          Cards
        </h3>
        <Button variant="outline" size="sm" onClick={() => setShowAddCard(!showAddCard)} className="border-gray-600 text-gray-300">
          <Plus className="w-4 h-4 mr-1" />
          Add Card
        </Button>
      </div>

      {/* Add Card Form */}
      {showAddCard && (
        <div className="p-3 bg-gray-800/50 rounded-lg mb-3 space-y-2">
          <div className="flex gap-2">
            <Button
              variant={addType === 'domain' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setAddType('domain')}
              className={addType === 'domain' ? '' : 'border-gray-600 text-gray-400'}
            >
              <BookOpen className="w-3 h-3 mr-1" />
              Domain
            </Button>
            <Button
              variant={addType === 'blank' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setAddType('blank')}
              className={addType === 'blank' ? '' : 'border-gray-600 text-gray-400'}
            >
              <PenTool className="w-3 h-3 mr-1" />
              Blank
            </Button>
          </div>

          {addType === 'domain' ? (
            <div>
              <Select value={selectedDomainId} onValueChange={setSelectedDomainId}>
                <SelectTrigger className="bg-gray-900/50 border-gray-600 text-sm">
                  <SelectValue placeholder="Select a domain card..." />
                </SelectTrigger>
                <SelectContent>
                  {availableDomains.map(c => {
                    const meta = c.metadata as any;
                    return (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name} ({c.source} Lv{meta?.level}) — {meta?.type}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              {availableDomains.length === 0 && (
                <div className="text-gray-500 text-xs mt-1">
                  {domains.length === 0 ? 'Select a class first to see available domain cards.' : 'No matching domain cards for your level.'}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <Input
                value={customTitle}
                onChange={(e) => setCustomTitle(e.target.value)}
                placeholder="Card title..."
                className="bg-gray-900/50 border-gray-600 text-sm"
              />
              <Textarea
                value={customContent}
                onChange={(e) => setCustomContent(e.target.value)}
                placeholder="Card content..."
                className="bg-gray-900/50 border-gray-600 text-sm"
                rows={3}
              />
            </div>
          )}

          <Button size="sm" onClick={addCard} disabled={addType === 'domain' ? !selectedDomainId : !customTitle}>
            Add
          </Button>
        </div>
      )}

      {/* Auto-included cards */}
      {autoCards.length > 0 && (
        <div className="mb-3">
          <div className="text-xs text-gray-500 uppercase tracking-wider mb-2">Auto-included</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {autoCards.map((card, i) => (
              <div key={i} className="p-3 bg-gray-800/30 border border-gray-700/30 rounded-lg">
                <div className="flex justify-between items-start mb-1">
                  <span className="text-white text-sm font-semibold">{card.title}</span>
                  <span className="text-gray-500 text-xs shrink-0 ml-2">{card.source}</span>
                </div>
                <div className="text-gray-400 text-xs whitespace-pre-wrap line-clamp-4">{card.content}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Selected cards */}
      {selectedCards.length > 0 && (
        <div>
          <div className="text-xs text-gray-500 uppercase tracking-wider mb-2">Selected Cards</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {selectedCards.map((sc, i) => {
              const details = getCardDetails(sc);
              return (
                <div key={i} className="p-3 bg-purple-900/20 border border-purple-500/20 rounded-lg">
                  <div className="flex justify-between items-start mb-1">
                    <span className="text-white text-sm font-semibold">{details.title}</span>
                    <div className="flex items-center gap-1 shrink-0 ml-2">
                      <span className="text-gray-500 text-xs">{details.source}</span>
                      <button onClick={() => removeCard(i)} className="text-gray-500 hover:text-red-400">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                  <div className="text-gray-400 text-xs whitespace-pre-wrap line-clamp-4">{details.content}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {autoCards.length === 0 && selectedCards.length === 0 && (
        <div className="text-gray-500 text-sm text-center py-4">
          Select ancestry, community, and subclass to see auto-included cards.
        </div>
      )}
    </Card>
  );
}
