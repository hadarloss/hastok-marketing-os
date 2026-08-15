import { promises as fs } from "fs";
import path from "path";
import { ensureSeededFromTemplate } from "@/lib/fs/paths";

const CONTEXT_DIR = path.join(process.cwd(), "context");
const MEMORY_LOG_PATH = path.join(CONTEXT_DIR, "MEMORY_LOG.md");
const TEMPLATE_PATH = path.join(CONTEXT_DIR, "MEMORY_LOG.template.md");

export type MemoryEntryType = "correction" | "new_rule" | "preference" | "note";

export interface MemoryEntry {
  date: string; // ISO-ish, as written
  type: MemoryEntryType;
  agent: string;
  summary: string;
}

export async function readMemoryLog(): Promise<string> {
  await ensureSeededFromTemplate(MEMORY_LOG_PATH, TEMPLATE_PATH);
  return fs.readFile(MEMORY_LOG_PATH, "utf-8");
}

export async function appendMemoryEntry(entry: {
  agent: string;
  type: MemoryEntryType;
  summary: string;
}): Promise<void> {
  await ensureSeededFromTemplate(MEMORY_LOG_PATH, TEMPLATE_PATH);
  const now = new Date();
  const stamp = now.toISOString().slice(0, 16).replace("T", " ");
  const block = [
    `## ${stamp} — ${entry.type}`,
    `**Agent:** ${entry.agent}`,
    `**Type:** ${entry.type}`,
    `**Summary:** ${entry.summary}`,
    "",
    "---",
    "",
  ].join("\n");

  await fs.appendFile(MEMORY_LOG_PATH, block, "utf-8");
}

const ENTRY_HEADER_RE = /^## (.+?) — (correction|new_rule|preference|note)$/;

/** Parses the append-only markdown log into structured entries for the UI viewer. */
export function parseMemoryLog(raw: string): MemoryEntry[] {
  const entries: MemoryEntry[] = [];
  const blocks = raw.split(/\n(?=## )/g);

  for (const block of blocks) {
    const lines = block.trim().split("\n");
    const headerMatch = lines[0]?.match(ENTRY_HEADER_RE);
    if (!headerMatch) continue;

    const [, date, type] = headerMatch;
    const agentLine = lines.find((l) => l.startsWith("**Agent:**"));
    const summaryLine = lines.find((l) => l.startsWith("**Summary:**"));

    entries.push({
      date,
      type: type as MemoryEntryType,
      agent: agentLine?.replace("**Agent:**", "").trim() ?? "",
      summary: summaryLine?.replace("**Summary:**", "").trim() ?? "",
    });
  }

  return entries.reverse(); // newest first for the viewer
}
