/** Preserve existing single-value text while supporting multiple selections. */
export function readCircleSelections(value: string | null | undefined): string[] {
  if (!value?.trim()) return [];
  try {
    const parsed: unknown = JSON.parse(value);
    if (Array.isArray(parsed) && parsed.every((entry) => typeof entry === "string")) {
      return parsed.map((entry: string) => entry.trim()).filter(Boolean);
    }
  } catch {
    // Existing selections are plain text.
  }
  return [value.trim()];
}

export function writeCircleSelections(values: string[]): string | null {
  const nonempty = values.map((value) => value.trim()).filter(Boolean);
  if (nonempty.length === 0) return null;
  return nonempty.length === 1 ? nonempty[0] : JSON.stringify(nonempty);
}