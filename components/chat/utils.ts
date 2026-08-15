import type { AgentLite } from "@/components/chat/RoutingBreadcrumb";
import type { MessageContentBlock } from "@/lib/agents/types";

export function buildAgentsById(
  agents: { id: string; name: string; icon: string }[]
): Record<string, AgentLite> {
  const map: Record<string, AgentLite> = {};
  for (const a of agents) map[a.id] = { name: a.name, icon: a.icon };
  return map;
}

/** Pulls the display text out of a message's content, whether it's a plain string or content blocks. */
export function extractText(content: string | MessageContentBlock[]): string {
  if (typeof content === "string") return content;
  return content
    .filter((b): b is Extract<MessageContentBlock, { type: "text" }> => b.type === "text")
    .map((b) => b.text)
    .join("\n");
}
