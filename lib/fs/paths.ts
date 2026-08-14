import path from "path";

/** Joins path segments under `base` and rejects any attempt to escape it (path traversal guard). */
export function safeJoin(base: string, ...segments: string[]): string {
  const resolved = path.resolve(base, ...segments);
  const resolvedBase = path.resolve(base);
  if (resolved !== resolvedBase && !resolved.startsWith(resolvedBase + path.sep)) {
    throw new Error(`Path escapes allowed directory: ${segments.join("/")}`);
  }
  return resolved;
}

const HEBREW_RANGE = "֐-׿";
const SLUG_DISALLOWED = new RegExp(`[^a-z0-9${HEBREW_RANGE}]+`, "g");

/** A slug safe to use as a filename: lowercase latin/digits/Hebrew, dashes only. */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(SLUG_DISALLOWED, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}
