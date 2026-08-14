import path from "path";
import { promises as fs } from "fs";
import { readMarkdownFile } from "@/lib/markdown";
import { AgentDef, AgentFrontmatterSchema, Team } from "@/lib/agents/types";

const SKILLS_DIR = path.join(process.cwd(), "skills");

async function walkMarkdownFiles(dir: string): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walkMarkdownFiles(fullPath)));
    } else if (entry.isFile() && entry.name.endsWith(".md")) {
      files.push(fullPath);
    }
  }
  return files;
}

/**
 * Loads and validates every agent definition file under skills/.
 * No caching — the file count (~40) makes re-parsing on every call negligible,
 * and it avoids stale data while agent files are being edited during dev.
 */
export async function loadAgentRegistry(): Promise<AgentDef[]> {
  const files = await walkMarkdownFiles(SKILLS_DIR);
  const agents: AgentDef[] = [];
  const errors: string[] = [];

  for (const filePath of files) {
    const { data, content } = await readMarkdownFile(filePath);
    const result = AgentFrontmatterSchema.safeParse(data);
    if (!result.success) {
      errors.push(`${path.relative(process.cwd(), filePath)}: ${result.error.message}`);
      continue;
    }
    agents.push({ ...result.data, systemPrompt: content, filePath });
  }

  // Referential integrity: unique ids, valid reports_to.
  const idCounts = new Map<string, number>();
  for (const agent of agents) {
    idCounts.set(agent.id, (idCounts.get(agent.id) ?? 0) + 1);
  }
  for (const [id, count] of idCounts) {
    if (count > 1) errors.push(`Duplicate agent id "${id}" (${count} files)`);
  }
  const idSet = new Set(agents.map((a) => a.id));
  for (const agent of agents) {
    if (agent.reports_to && !idSet.has(agent.reports_to)) {
      errors.push(`Agent "${agent.id}" has reports_to="${agent.reports_to}" which does not exist`);
    }
  }

  if (errors.length > 0) {
    throw new Error(`Agent registry validation failed:\n${errors.join("\n")}`);
  }

  return agents.sort((a, b) => a.order - b.order);
}

export async function getAgentById(id: string): Promise<AgentDef | null> {
  const agents = await loadAgentRegistry();
  return agents.find((a) => a.id === id) ?? null;
}

export async function getLeadForTeam(team: Team): Promise<AgentDef | null> {
  const agents = await loadAgentRegistry();
  return agents.find((a) => a.team === team && a.kind === "lead") ?? null;
}

export async function getSpecialistsForTeam(team: Team): Promise<AgentDef[]> {
  const agents = await loadAgentRegistry();
  return agents
    .filter((a) => a.team === team && a.kind === "specialist")
    .sort((a, b) => a.order - b.order);
}

export interface TeamTree {
  lead: AgentDef | null;
  specialists: AgentDef[];
}

export async function getTeamTree(team: Team): Promise<TeamTree> {
  const [lead, specialists] = await Promise.all([
    getLeadForTeam(team),
    getSpecialistsForTeam(team),
  ]);
  return { lead, specialists };
}

export async function getCoreAgents(): Promise<AgentDef[]> {
  const agents = await loadAgentRegistry();
  return agents.filter((a) => a.team === "core").sort((a, b) => a.order - b.order);
}
