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
const PARENT_SEP = " └ ";

/** Saved values keep the chosen parent so duplicate labels (e.g. two "Air"s) stay distinct. */
export function encodeCircleValue(label: string, parent?: string | null): string {
  return parent ? `${label}${PARENT_SEP}${parent}` : label;
}

export function decodeCircleValue(value: string): { label: string; parent: string | null } {
  const i = value.indexOf(PARENT_SEP);
  if (i === -1) return { label: value, parent: null };
  return { label: value.slice(0, i), parent: value.slice(i + PARENT_SEP.length) };
}
