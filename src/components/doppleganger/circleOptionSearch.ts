export interface ComboItem {
  label: string;
  depth: number;
  ancestors: string[];
}

export interface ComboGroup {
  heading: string;
  items: ComboItem[];
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