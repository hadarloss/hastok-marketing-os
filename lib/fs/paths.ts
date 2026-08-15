import path from "path";
import { promises as fs } from "fs";

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

/**
 * Copies `templatePath` to `realPath` the first time only — if `realPath`
 * already exists (including real data written by actual use), it's left
 * untouched. This is how runtime data (business profile, memory log)
 * survives `git pull` + redeploy: the real files are gitignored, only the
 * templates are tracked, so a deploy can never overwrite live data with
 * whatever's in the repo.
 */
export async function ensureSeededFromTemplate(realPath: string, templatePath: string): Promise<void> {
  try {
    await fs.access(realPath);
  } catch {
    const template = await fs.readFile(templatePath, "utf-8");
    await fs.writeFile(realPath, template, "utf-8");
  }
}
