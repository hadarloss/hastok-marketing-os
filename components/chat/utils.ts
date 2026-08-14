import type { AgentLite } from "@/components/chat/RoutingBreadcrumb";

export function buildAgentsById(
  agents: { id: string; name: string; icon: string }[]
): Record<string, AgentLite> {
  const map: Record<string, AgentLite> = {};
  for (const a of agents) map[a.id] = { name: a.name, icon: a.icon };
  return map;
}
