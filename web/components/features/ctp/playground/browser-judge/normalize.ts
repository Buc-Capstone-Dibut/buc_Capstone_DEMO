export function normalizeOutput(raw: string): string {
  return raw
    .split("\n")
    .map((line) => line.trimEnd())
    .join("\n")
    .trim();
}
