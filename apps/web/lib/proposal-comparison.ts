export function toggleCompare(selected: readonly string[], id: string, max = 3): string[] {
  if (selected.includes(id)) return selected.filter((item) => item !== id);
  const limit = Number.isFinite(max) ? Math.min(3, Math.max(0, Math.floor(max))) : 3;
  return selected.length < limit ? [...selected, id] : [...selected];
}
