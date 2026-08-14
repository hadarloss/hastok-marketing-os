import { z } from "zod";

export const TeamSchema = z.enum(["marketing", "branding", "core"]);
export type Team = z.infer<typeof TeamSchema>;

export const AgentKindSchema = z.enum(["lead", "specialist", "core"]);
export type AgentKind = z.infer<typeof AgentKindSchema>;

export const AgentFrontmatterSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  role: z.string().min(1),
  team: TeamSchema,
  reports_to: z.string().nullable().default(null),
  kind: AgentKindSchema,
  icon: z.string().min(1),
  description: z.string().min(1),
  output_types: z.array(z.string()).default([]),
  order: z.number().default(0),
  model: z.string().default("claude-sonnet-5"),
});

export type AgentFrontmatter = z.infer<typeof AgentFrontmatterSchema>;

export interface AgentDef extends AgentFrontmatter {
  /** The markdown body — used as the agent's system prompt. */
  systemPrompt: string;
  filePath: string;
}

export const HandoffStatusSchema = z.enum([
  "queued",
  "in_progress",
  "done",
  "blocked",
  "revised",
]);
export type HandoffStatus = z.infer<typeof HandoffStatusSchema>;

export interface HandoffRecord {
  task_id: string;
  from_agent: string;
  to_agent: string;
  status: HandoffStatus;
  deliverable_type: string;
  output_path: string | null;
  requested_by: string;
  created_at: string;
  updated_at: string;
  notes: string;
}

export interface RoutingEvent {
  type: "routing";
  from: string;
  to: string;
  reason: string;
}

export interface TokenEvent {
  type: "token";
  text: string;
}

export interface DoneEvent {
  type: "done";
  handoff: HandoffRecord | null;
}

export interface ErrorEvent {
  type: "error";
  message: string;
}

export type ChatStreamEvent = RoutingEvent | TokenEvent | DoneEvent | ErrorEvent;
