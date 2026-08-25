export function finiteNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function safeFixed(value: unknown, digits = 1, fallback = "—"): string {
  const numeric = finiteNumber(value);
  return numeric === null ? fallback : numeric.toFixed(digits);
}
