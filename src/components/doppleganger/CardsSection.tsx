import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Plus, X, Layers, BookOpen, PenTool, Globe, Package, ChevronDown, Pencil, Archive, ArrowUp, Filter } from "lucide-react";
import { useState, useEffect } from "react";
import type { CharacterSheet, GameCard, SelectedCard } from "@/data/gameCardTypes";
import { getUnlockedSubclassTiers, getMulticlassInfo, type LevelUpChoices } from "@/lib/levelUpUtils";

interface Props {
  sheet: CharacterSheet;
  updateSheet: (updates: Partial<CharacterSheet>) => Promise<void>;
  gameCards: GameCard[];
  ancestryCards: GameCard[];
  communityCards: GameCard[];
  selectedSubclass: GameCard | undefined;
  selectedClass: GameCard | undefined;
  domainCards: GameCard[];
  domains: string[];
  isEditing: boolean;
  classCards: GameCard[];
}

export function CardsSection({
  sheet, updateSheet, gameCards,
  ancestryCards, communityCards, selectedSubclass, selectedClass,
  domainCards, domains, isEditing, classCards,
}: Props) {
  const [showAddCard, setShowAddCard] = useState(false);
  const [addType, setAddType] = useState<'domain' | 'other' | 'blank'>('domain');
  const [selectedDomainId, setSelectedDomainId] = useState('');
  const [customTitle, setCustomTitle] = useState('');
  const [customContent, setCustomContent] = useState('');
  const [customCategory, setCustomCategory] = useState('');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editNewCategory, setEditNewCategory] = useState('');
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});
  // Filter state — defaults to character's level/class/domains
  const [filterMaxLevel, setFilterMaxLevel] = useState<number>(sheet.level || 1);
  const [filterClasses, setFilterClasses] = useState<string[]>(sheet.class ? [sheet.class] : []);
  const [filterDomains, setFilterDomains] = useState<string[]>(domains);

  // Re-sync filter defaults when character changes
  useEffect(() => { setFilterMaxLevel(sheet.level || 1); }, [sheet.level]);
  useEffect(() => { setFilterClasses(sheet.class ? [sheet.class] : []); }, [sheet.class]);
  useEffect(() => { setFilterDomains(domains); }, [domains.join('|')]);

  const isSectionOpen = (key: string) => openSections[key] !== false;
  const toggleSection = (key: string, open: boolean) => setOpenSections(prev => ({ ...prev, [key]: open }));

  const selectedCards = sheet.selected_card_ids || [];
  const choices = (sheet.level_up_choices || {}) as LevelUpChoices;
  const unlockedSubTiers = getUnlockedSubclassTiers(choices);
  const multiclasses = getMulticlassInfo(choices);
  const domainVaultIds: string[] = (sheet.domain_vault_ids || []) as string[];

  // Auto-included cards
  const autoCards: { title: string; content: string; source: string }[] = [];

  if (selectedClass) {
    const classMeta = selectedClass.metadata as any;
    if (classMeta?.class_feature) {
      autoCards.push({ title: `${selectedClass.name} Class Feature`, content: classMeta.class_feature, source: `Class` });
    }
    if (classMeta?.hope_feature) {
      autoCards.push({ title: `${selectedClass.name} Hope Feature`, content: classMeta.hope_feature, source: `Class` });
    }
  }

  if (sheet.ancestry) {
    const knownSources = [...new Set(ancestryCards.map(c => c.source))].filter(Boolean);
    if (knownSources.includes(sheet.ancestry)) {
      ancestryCards
        .filter(c => c.source === sheet.ancestry)
        .forEach(c => autoCards.push({ title: c.name, content: c.content || '', source: `Ancestry: ${c.source}` }));
    }
  }

  if (sheet.community) {
    communityCards
      .filter(c => c.source === sheet.community)
      .forEach(c => autoCards.push({ title: c.name, content: c.content || '', source: `Community: ${c.source}` }));
  }

  // Subclass: Foundation always shows, Specialization/Mastery only if unlocked via level-up
  if (selectedSubclass) {
    const meta = selectedSubclass.metadata as any;
    if (meta?.foundation) autoCards.push({ title: `${selectedSubclass.name} Foundation`, content: meta.foundation, source: `Subclass` });
    if (unlockedSubTiers >= 1 && meta?.specialization) autoCards.push({ title: `${selectedSubclass.name} Specialization`, content: meta.specialization, source: `Subclass (Unlocked)` });
    if (unlockedSubTiers >= 2 && meta?.mastery) autoCards.push({ title: `${selectedSubclass.name} Mastery`, content: meta.mastery, source: `Subclass (Unlocked)` });
  }

  // Multiclass auto-cards
  multiclasses.forEach(mc => {
    const mcClass = classCards.find(c => c.name === mc.class);
    if (mcClass) {
      const classMeta = mcClass.metadata as any;
      if (classMeta?.class_feature) autoCards.push({ title: `${mc.class} Class Feature`, content: classMeta.class_feature, source: 'Multiclass' });
    }
    const mcSub = gameCards.find(c => c.card_type === 'subclass' && c.name === mc.subclass && c.source === mc.class);
    if (mcSub) {
      const meta = mcSub.metadata as any;
      if (meta?.foundation) autoCards.push({ title: `${mc.subclass} Foundation`, content: meta.foundation, source: 'Multiclass Subclass' });
    }
  });

  const availableDomains = domainCards.filter(c => {
    const meta = c.metadata as any;
    return domains.includes(meta?.domain || c.source) && (meta?.level || 0) <= sheet.level;
  });

  const allDomains = domainCards.filter(c => {
    const meta = c.metadata as any;
    return (meta?.level || 0) <= sheet.level;
  });

  const otherCards = gameCards.filter(c => {
    if (c.card_type === 'ancestry' || c.card_type === 'community') return true;
    // Class-restricted "Other" categories (e.g. Beast Shape for Druids)
    const meta = c.metadata as any;
    if (meta?.category) return true;
    return false;
  });

  // Class restriction options derived from "Other" cards
  const otherClassRestrictions = [...new Set(
    otherCards
      .map(c => (c.metadata as any)?.class_restriction)
      .filter(Boolean) as string[]
  )];

  const getCardCategory = (sc: SelectedCard): string => {
    if (sc.custom) return (sc as any).category || 'Custom';
    const card = gameCards.find(c => c.id === sc.card_id);
    if (!card) return 'Other';
    if (card.card_type === 'domain') return 'Domain Cards';
    if (card.card_type === 'ancestry') return 'Ancestry';
    if (card.card_type === 'community') return 'Community';
    return 'Other';
  };

  const getCardDetails = (sc: SelectedCard) => {
    if (sc.custom) return { title: sc.title || 'Custom Card', content: sc.content || '', source: (sc as any).category || 'Custom', recallCost: null, cardId: null };
    const card = gameCards.find(c => c.id === sc.card_id);
    if (!card) return { title: 'Unknown', content: '', source: '', recallCost: null, cardId: null };
    const meta = card.metadata as any;
    const source = card.card_type === 'ancestry' ? ''
      : card.card_type === 'community' ? `Community: ${card.source || ''}`
      : `${card.source || ''} ${meta?.type || ''} Lv${meta?.level || '?'}`;
    return { title: card.name, content: card.content || '', source, recallCost: meta?.recall_cost ?? null, cardId: card.id };
  };

  // Group selected cards by category, excluding vaulted domain cards
  const grouped: Record<string, { sc: SelectedCard; i: number }[]> = {};
  selectedCards.forEach((sc, i) => {
    // Check if this domain card is vaulted
    if (!sc.custom && sc.card_id && domainVaultIds.includes(sc.card_id)) return;
    const cat = getCardCategory(sc);
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push({ sc, i });
  });

  // Vaulted domain cards
  const vaultedCards = selectedCards
    .map((sc, i) => ({ sc, i }))
    .filter(({ sc }) => !sc.custom && sc.card_id && domainVaultIds.includes(sc.card_id));

  const categoryOrder = Object.keys(grouped).sort((a, b) => {
    if (a === 'Domain Cards') return -1;
    if (b === 'Domain Cards') return 1;
    return a.localeCompare(b);
  });

  const existingCategories = [...new Set(
    selectedCards.filter(sc => sc.custom && (sc as any).category).map(sc => (sc as any).category as string)
  )];
  const categoryOptions = [...new Set([...domains.filter(Boolean), 'Domain Cards', ...existingCategories])];

  const addCard = () => {
    const cardId = selectedDomainId;
    if ((addType === 'domain' || addType === 'other') && cardId) {
      const card = gameCards.find(c => c.id === cardId);
      if (card) {
        updateSheet({ selected_card_ids: [...selectedCards, { card_id: card.id }] });
      }
    } else if (addType === 'blank' && customTitle) {
      const resolvedCategory = customCategory === '__new__' ? newCategoryName : customCategory;
      updateSheet({
        selected_card_ids: [...selectedCards, { custom: true, title: customTitle, content: customContent, category: resolvedCategory || 'Custom' } as any],
      });
    }
    setShowAddCard(false);
    setSelectedDomainId('');
    setCustomTitle('');
    setCustomContent('');
    setCustomCategory('');
    setNewCategoryName('');
  };

  const removeCard = (index: number) => {
    // Also remove from vault if vaulted
    const sc = selectedCards[index];
    if (sc?.card_id && domainVaultIds.includes(sc.card_id)) {
      updateSheet({
        selected_card_ids: selectedCards.filter((_, i) => i !== index),
        domain_vault_ids: domainVaultIds.filter(id => id !== sc.card_id),
      });
    } else {
      updateSheet({ selected_card_ids: selectedCards.filter((_, i) => i !== index) });
    }
  };

  const vaultCard = (cardId: string) => {
    updateSheet({ domain_vault_ids: [...domainVaultIds, cardId] });
  };

  const unvaultCard = (cardId: string) => {
    updateSheet({ domain_vault_ids: domainVaultIds.filter(id => id !== cardId) });
  };

  const startEdit = (index: number, sc: SelectedCard) => {
    setEditingIndex(index);
    setEditTitle(sc.title || '');
    setEditContent(sc.content || '');
    setEditCategory((sc as any).category || 'Custom');
    setEditNewCategory('');
  };

  const saveEdit = () => {
    if (editingIndex === null) return;
    const resolvedCat = editCategory === '__new__' ? editNewCategory : editCategory;
    const updated = [...selectedCards];
    updated[editingIndex] = { ...updated[editingIndex], title: editTitle, content: editContent, category: resolvedCat || 'Custom' } as any;
    updateSheet({ selected_card_ids: updated });
    setEditingIndex(null);
  };

  const cancelEdit = () => setEditingIndex(null);

  const addTypeOptions: { key: typeof addType; label: string; icon: any }[] = [
    { key: 'domain', label: 'Domain', icon: BookOpen },
    { key: 'other', label: 'Other', icon: Package },
    { key: 'blank', label: 'Blank', icon: PenTool },
  ];

  // Master lists for checkbox filters
  const allClassNames = [...new Set(classCards.map(c => c.name).filter(Boolean))].sort();
  const allDomainNames = [...new Set(domainCards.map(c => {
    const meta = c.metadata as any;
    return meta?.domain || c.source;
  }).filter(Boolean))].sort() as string[];

  const toggleInArray = (arr: string[], value: string, setter: (v: string[]) => void) => {
    setter(arr.includes(value) ? arr.filter(x => x !== value) : [...arr, value]);
  };

  const getListForType = () => {
    let list: GameCard[] = [];
    if (addType === 'domain') list = domainCards;
    else if (addType === 'other') list = otherCards;
    else return [];

    return list.filter(c => {
      const meta = c.metadata as any;
      // Max-level filter (applies to cards that have a level)
      const lvl = meta?.level;
      if (typeof lvl === 'number' && lvl > filterMaxLevel) return false;

      if (addType === 'domain') {
        const dom = meta?.domain || c.source;
        if (filterDomains.length > 0 && !filterDomains.includes(dom)) return false;
      }

      if (addType === 'other') {
        const restriction = meta?.class_restriction;
        // If card has a class restriction, only show when that class is checked
        if (restriction) {
          if (filterClasses.length > 0 && !filterClasses.includes(restriction)) return false;
        }
      }
      return true;
    });
  };

  const renderCard = (sc: SelectedCard, globalIndex: number, showVaultButton = false) => {
    const details = getCardDetails(sc);
    const isEditingThis = editingIndex === globalIndex;

    if (isEditingThis) {
      return (
        <div key={globalIndex} className="p-3 bg-purple-900/20 border border-purple-500/40 rounded-lg space-y-2">
          <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} className="bg-gray-900/50 border-gray-600 text-gray-100 text-sm" />
          <Textarea value={editContent} onChange={(e) => setEditContent(e.target.value)} className="bg-gray-900/50 border-gray-600 text-gray-100 text-sm" rows={3} />
          <Select value={editCategory} onValueChange={setEditCategory}>
            <SelectTrigger className="bg-gray-900/50 border-gray-600 text-gray-100 text-sm">
              <SelectValue placeholder="Category..." />
            </SelectTrigger>
            <SelectContent>
              {categoryOptions.map(cat => (
                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
              ))}
              <SelectItem value="Custom">Custom (no domain)</SelectItem>
              <SelectItem value="__new__">+ New Category...</SelectItem>
            </SelectContent>
          </Select>
          {editCategory === '__new__' && (
            <Input value={editNewCategory} onChange={(e) => setEditNewCategory(e.target.value)} placeholder="New category name..." className="bg-gray-900/50 border-gray-600 text-gray-100 text-sm" />
          )}
          <div className="flex gap-2">
            <Button size="sm" onClick={saveEdit}>Save</Button>
            <Button size="sm" variant="outline" onClick={cancelEdit} className="border-gray-600 text-gray-300">Cancel</Button>
          </div>
        </div>
      );
    }

    const isDomainCard = !sc.custom && sc.card_id && gameCards.find(c => c.id === sc.card_id)?.card_type === 'domain';

    return (
      <div key={globalIndex} className="p-3 bg-purple-900/20 border border-purple-500/20 rounded-lg">
        <div className="flex justify-between items-start mb-1">
          <span className="text-white text-sm font-semibold">{details.title}</span>
          <div className="flex items-center gap-2 shrink-0 ml-2">
            {details.recallCost != null && (
              <span className="text-amber-400 text-xs font-medium">Recall: {details.recallCost}</span>
            )}
            <span className="text-gray-500 text-xs">{details.source}</span>
            {isDomainCard && showVaultButton && (
              <button onClick={() => sc.card_id && vaultCard(sc.card_id)} className="text-gray-500 hover:text-amber-400" title="Move to Vault">
                <Archive className="w-3 h-3" />
              </button>
            )}
            {isEditing && sc.custom && (
              <button onClick={() => startEdit(globalIndex, sc)} className="text-gray-500 hover:text-blue-400">
                <Pencil className="w-3 h-3" />
              </button>
            )}
            {isEditing && (
              <button onClick={() => removeCard(globalIndex)} className="text-gray-500 hover:text-red-400">
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
        <div className="text-gray-300 text-xs whitespace-pre-wrap">{details.content}</div>
      </div>
    );
  };

  return (
    <Card className="p-4 bg-gray-900/30 border-gray-700/50 mb-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <Layers className="w-5 h-5 text-purple-400" />
          Cards
        </h3>
        {isEditing && (
          <Button variant="outline" size="sm" onClick={() => setShowAddCard(!showAddCard)} className="border-gray-600 text-gray-300">
            <Plus className="w-4 h-4 mr-1" />
            Add Card
          </Button>
        )}
      </div>

      {/* Add Card Form */}
      {showAddCard && isEditing && (
        <div className="p-3 bg-gray-800/50 rounded-lg mb-3 space-y-2">
          <div className="flex gap-2 flex-wrap">
            {addTypeOptions.map(({ key, label, icon: Icon }) => (
              <Button
                key={key}
                variant={addType === key ? 'default' : 'outline'}
                size="sm"
                onClick={() => { setAddType(key); setSelectedDomainId(''); }}
                className={addType === key ? '' : 'border-gray-600 text-gray-400'}
              >
                <Icon className="w-3 h-3 mr-1" />
                {label}
              </Button>
            ))}
          </div>

          {addType !== 'blank' ? (
            <div className="space-y-2">
              {/* Filter dropdowns */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <Select value={addType} onValueChange={(v: any) => { setAddType(v); setSelectedDomainId(''); }}>
                  <SelectTrigger className="bg-gray-900/50 border-gray-600 text-gray-100 text-xs h-8">
                    <SelectValue placeholder="Category..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="domain">Domain</SelectItem>
                    <SelectItem value="open-domain">Open-Domain</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={filterTier} onValueChange={setFilterTier}>
                  <SelectTrigger className="bg-gray-900/50 border-gray-600 text-gray-100 text-xs h-8">
                    <SelectValue placeholder="Level..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Levels</SelectItem>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
                      <SelectItem key={n} value={String(n)}>Level {n}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={filterClass}
                  onValueChange={setFilterClass}
                  disabled={addType !== 'other'}
                >
                  <SelectTrigger className="bg-gray-900/50 border-gray-600 text-gray-100 text-xs h-8">
                    <SelectValue placeholder="Class..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Classes</SelectItem>
                    {sheet.class && <SelectItem value="mine">My Class ({sheet.class})</SelectItem>}
                    {otherClassRestrictions.map(cls => (
                      <SelectItem key={cls} value={cls}>{cls}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Select value={selectedDomainId} onValueChange={setSelectedDomainId}>
                <SelectTrigger className="bg-gray-900/50 border-gray-600 text-gray-100 text-sm">
                  <SelectValue placeholder={`Select a ${addType} card...`} />
                </SelectTrigger>
                <SelectContent>
                  {getListForType().map(c => {
                    const meta = c.metadata as any;
                    const label = c.card_type === 'domain'
                      ? `${c.name} (${c.source} Lv${meta?.level})${meta?.type ? ` — ${meta.type}` : ''}`
                      : c.card_type === 'ancestry' ? c.name
                      : `${c.name} (${c.source || c.card_type}${meta?.level ? ` Lv${meta.level}` : ''})`;
                    return <SelectItem key={c.id} value={c.id}>{label}</SelectItem>;
                  })}
                </SelectContent>
              </Select>
              {selectedDomainId && (() => {
                const card = getListForType().find(c => c.id === selectedDomainId);
                return card?.content ? (
                  <div className="mt-2 p-3 bg-gray-800/60 border border-gray-700 rounded-md text-sm text-gray-300 whitespace-pre-wrap max-h-48 overflow-y-auto">
                    {card.content}
                  </div>
                ) : null;
              })()}
              {getListForType().length === 0 && (
                <div className="text-gray-500 text-xs mt-1">
                  {addType === 'domain' && domains.length === 0
                    ? 'Select a class first to see available domain cards.'
                    : 'No matching cards for the selected filters.'}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <Input value={customTitle} onChange={(e) => setCustomTitle(e.target.value)} placeholder="Card title..." className="bg-gray-900/50 border-gray-600 text-gray-100 text-sm" />
              <Textarea value={customContent} onChange={(e) => setCustomContent(e.target.value)} placeholder="Card content..." className="bg-gray-900/50 border-gray-600 text-gray-100 text-sm" rows={3} />
              <Select value={customCategory} onValueChange={setCustomCategory}>
                <SelectTrigger className="bg-gray-900/50 border-gray-600 text-gray-100 text-sm">
                  <SelectValue placeholder="Pick a category..." />
                </SelectTrigger>
                <SelectContent>
                  {categoryOptions.map(cat => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                  <SelectItem value="Custom">Custom (no domain)</SelectItem>
                  <SelectItem value="__new__">+ New Category...</SelectItem>
                </SelectContent>
              </Select>
              {customCategory === '__new__' && (
                <Input value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} placeholder="New category name..." className="bg-gray-900/50 border-gray-600 text-gray-100 text-sm" />
              )}
            </div>
          )}

          <Button size="sm" onClick={addCard} disabled={addType === 'blank' ? !customTitle : !selectedDomainId}>
            Add
          </Button>
        </div>
      )}

      {/* Auto-included cards */}
      {autoCards.length > 0 && (
        <div className="mb-3">
          <Collapsible open={isSectionOpen('auto')} onOpenChange={(v) => toggleSection('auto', v)}>
            <CollapsibleTrigger className="flex items-center gap-2 w-full text-left mb-2">
              <span className="text-xs text-gray-500 uppercase tracking-wider flex-1">Auto-included</span>
              <ChevronDown className={`w-3.5 h-3.5 text-gray-500 transition-transform duration-200 ${isSectionOpen('auto') ? 'rotate-180' : ''}`} />
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {autoCards.map((card, i) => (
                  <div key={i} className="p-3 bg-gray-800/30 border border-gray-700/30 rounded-lg">
                    <div className="flex justify-between items-start mb-1">
                      <span className="text-white text-sm font-semibold">{card.title}</span>
                      <span className="text-gray-500 text-xs shrink-0 ml-2">{card.source}</span>
                    </div>
                    <div className="text-gray-300 text-xs whitespace-pre-wrap">{card.content}</div>
                  </div>
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>
      )}

      {/* Selected cards grouped by category */}
      {categoryOrder.map(cat => {
        const items = grouped[cat];
        const sectionKey = `cat-${cat}`;
        const icon = cat === 'Domain Cards' ? <BookOpen className="w-3.5 h-3.5 text-blue-400" /> : null;
        const showVault = cat === 'Domain Cards';
        return (
          <div key={cat} className="mb-3">
            <Collapsible open={isSectionOpen(sectionKey)} onOpenChange={(v) => toggleSection(sectionKey, v)}>
              <CollapsibleTrigger className="flex items-center gap-2 w-full text-left mb-2">
                {icon}
                <span className="text-xs text-gray-500 uppercase tracking-wider flex-1">{cat}</span>
                <ChevronDown className={`w-3.5 h-3.5 text-gray-500 transition-transform duration-200 ${isSectionOpen(sectionKey) ? 'rotate-180' : ''}`} />
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {items.map(({ sc, i }) => renderCard(sc, i, showVault))}
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>
        );
      })}

      {/* Domain Vault */}
      {vaultedCards.length > 0 && (
        <div className="mb-3">
          <Collapsible open={isSectionOpen('vault')} onOpenChange={(v) => toggleSection('vault', v)}>
            <CollapsibleTrigger className="flex items-center gap-2 w-full text-left mb-2">
              <Archive className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-xs text-amber-400/80 uppercase tracking-wider flex-1">Domain Vault ({vaultedCards.length})</span>
              <ChevronDown className={`w-3.5 h-3.5 text-gray-500 transition-transform duration-200 ${isSectionOpen('vault') ? 'rotate-180' : ''}`} />
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {vaultedCards.map(({ sc, i }) => {
                  const details = getCardDetails(sc);
                  return (
                    <div key={i} className="p-3 bg-amber-900/10 border border-amber-500/20 rounded-lg">
                      <div className="flex justify-between items-start mb-1">
                        <span className="text-white text-sm font-semibold">{details.title}</span>
                        <div className="flex items-center gap-2 shrink-0 ml-2">
                          {details.recallCost != null && (
                            <span className="text-amber-400 text-xs font-medium">Recall: {details.recallCost}</span>
                          )}
                          <span className="text-gray-500 text-xs">{details.source}</span>
                          <button onClick={() => sc.card_id && unvaultCard(sc.card_id)} className="text-amber-400 hover:text-green-400" title="Restore from Vault">
                            <ArrowUp className="w-3 h-3" />
                          </button>
                          {isEditing && (
                            <button onClick={() => removeCard(i)} className="text-gray-500 hover:text-red-400">
                              <X className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="text-gray-400 text-xs whitespace-pre-wrap">{details.content}</div>
                    </div>
                  );
                })}
              </div>
            </CollapsibleContent>
          </Collapsible>
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
