import { promises as fs } from "fs";
import path from "path";
import { safeJoin, slugify } from "@/lib/fs/paths";
import { HandoffRecord, Team } from "@/lib/agents/types";

const OUTPUTS_DIR = path.join(process.cwd(), "outputs");

function folderForTeam(team: Team): "marketing_campaigns" | "brand_assets" {
  return team === "branding" ? "brand_assets" : "marketing_campaigns";
}

export interface OutputFile {
  filename: string;
  team: Team;
  content: string;
  meta: HandoffRecord | null;
}

export interface OutputSummary {
  filename: string;
  team: Team;
  title: string;
  agentId: string;
  deliverableType: string;
  createdAt: string;
}

export async function saveOutput(params: {
  team: Team;
  agentId: string;
  content: string;
  handoff: HandoffRecord;
}): Promise<string> {
  const folder = folderForTeam(params.team);
  const dir = safeJoin(OUTPUTS_DIR, folder);
  await fs.mkdir(dir, { recursive: true });

  const baseName = `${params.handoff.task_id}-${slugify(params.agentId)}`;
  const mdPath = safeJoin(dir, `${baseName}.md`);
  const metaPath = safeJoin(dir, `${baseName}.meta.json`);
  const relativePath = `outputs/${folder}/${baseName}.md`;

  const handoffWithPath: HandoffRecord = { ...params.handoff, output_path: relativePath };
  await fs.writeFile(mdPath, params.content, "utf-8");
  await fs.writeFile(metaPath, JSON.stringify(handoffWithPath, null, 2), "utf-8");

  return relativePath;
}

async function listTeamOutputs(team: Team): Promise<OutputSummary[]> {
  const folder = folderForTeam(team);
  const dir = safeJoin(OUTPUTS_DIR, folder);

  let files: string[];
  try {
    files = await fs.readdir(dir);
  } catch {
    return [];
  }

  const mdFiles = files.filter((f) => f.endsWith(".md"));
  const summaries: OutputSummary[] = [];

  for (const file of mdFiles) {
    const baseName = file.replace(/\.md$/, "");
    const metaPath = safeJoin(dir, `${baseName}.meta.json`);
    let meta: HandoffRecord | null = null;
    try {
      meta = JSON.parse(await fs.readFile(metaPath, "utf-8"));
    } catch {
      // no companion metadata — still list the file
    }

    summaries.push({
      filename: file,
      team,
      title: baseName,
      agentId: meta?.to_agent ?? "unknown",
      deliverableType: meta?.deliverable_type ?? "unknown",
      createdAt: meta?.created_at ?? "",
    });
  }

  return summaries.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export async function listOutputs(team?: Team): Promise<OutputSummary[]> {
  if (team) return listTeamOutputs(team);
  const [marketing, branding] = await Promise.all([
    listTeamOutputs("marketing"),
    listTeamOutputs("branding"),
  ]);
  return [...marketing, ...branding].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export async function getOutput(team: Team, filename: string): Promise<OutputFile | null> {
  const folder = folderForTeam(team);
  const dir = safeJoin(OUTPUTS_DIR, folder);
  const safeName = path.basename(filename); // defense in depth against traversal via filename param
  const mdPath = safeJoin(dir, safeName);

  let content: string;
  try {
    content = await fs.readFile(mdPath, "utf-8");
  } catch {
    return null;
  }

  const baseName = safeName.replace(/\.md$/, "");
  const metaPath = safeJoin(dir, `${baseName}.meta.json`);
  let meta: HandoffRecord | null = null;
  try {
    meta = JSON.parse(await fs.readFile(metaPath, "utf-8"));
  } catch {
    // no companion metadata
  }

  return { filename: safeName, team, content, meta };
}
