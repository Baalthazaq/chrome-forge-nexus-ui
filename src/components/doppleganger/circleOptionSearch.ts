export interface ComboItem {
  label: string;
  depth: number;
  ancestors: string[];
}

export interface ComboGroup {
  heading: string;
  items: ComboItem[];
}

/** Find the item whose label exactly matches the given text (first match wins). */
export function findExactMatch(groups: ComboGroup[], text: string): ComboItem | null {
  const query = text.trim().toLowerCase();
  if (!query) return null;
  for (const group of groups) {
    for (const item of group.items) {
      if (item.label.toLowerCase() === query) return item;
    }
  }
  return null;
}

export function filterCircleOptions(groups: ComboGroup[], text: string): ComboGroup[] {
  const query = text.trim().toLowerCase();
  if (!query) return groups;

  return groups.map((group) => {
    const keep = new Set<number>();
    const stack: number[] = [];
    group.items.forEach((item, index) => {
      stack.length = item.depth;
      if (item.label.toLowerCase().includes(query)) {
        keep.add(index);
        for (const ancestor of stack) keep.add(ancestor);
      }
      stack.push(index);
    });
    return { ...group, items: group.items.filter((_, index) => keep.has(index)) };
  }).filter((group) => group.items.length > 0);
}