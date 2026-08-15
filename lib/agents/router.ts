import { getAnthropicClient, DEFAULT_MODEL, MAX_TOKENS } from "@/lib/anthropic/client";
import { AgentDef, ConversationMessage } from "@/lib/agents/types";

export type { ConversationMessage };

export interface RoutingDecision {
  agentId: string;
  reason: string;
  deliverableType: string;
}

/** Business profile + memory log, appended to every agent's persona so it answers with real context. */
export function buildContextBlock(businessProfile: string, memoryLog: string): string {
  return [
    "\n\n---\n",
    "## תיק העסק (context/BUSINESS_PROFILE.md)\n",
    businessProfile.trim() || "_(עדיין לא הוגדר תיק עסק — הציעו למשתמש לעבור אונבורדינג עם אוריתה)_",
    "\n\n## יומן זיכרון דינאמי — כללים והעדפות שנצברו (context/MEMORY_LOG.md)\n",
    memoryLog.trim() || "_(אין עדיין רשומות)_",
  ].join("\n");
}

export function buildAgentSystemPrompt(
  agent: AgentDef,
  businessProfile: string,
  memoryLog: string
): string {
  return agent.systemPrompt + buildContextBlock(businessProfile, memoryLog);
}

function buildRosterText(specialists: AgentDef[]): string {
  return specialists
    .map((s) => `- ${s.id} — ${s.icon} ${s.name} (${s.role}): ${s.description}`)
    .join("\n");
}

const ROUTE_TOOL_NAME = "route_to_agent";

/**
 * Asks the team lead to pick which specialist should handle a new request,
 * using forced tool-use for a reliable, non-hallucinated agent id.
 */
export async function routeToAgent(
  lead: AgentDef,
  specialists: AgentDef[],
  history: ConversationMessage[],
  businessProfile: string,
  memoryLog: string
): Promise<RoutingDecision> {
  const client = getAnthropicClient();

  const systemPrompt =
    lead.systemPrompt +
    "\n\n---\n\n## רשימת הסוכנים בצוות שלך (לצורך ניתוב בלבד — אלה המזהים היחידים התקפים)\n" +
    buildRosterText(specialists) +
    buildContextBlock(businessProfile, memoryLog);

  const specialistIds = specialists.map((s) => s.id);

  const response = await client.messages.create({
    model: lead.model || DEFAULT_MODEL,
    max_tokens: 1024,
    system: systemPrompt,
    messages: history.map((m) => ({ role: m.role, content: m.content })),
    tools: [
      {
        name: ROUTE_TOOL_NAME,
        description: "בחר/י את הסוכן המומחה המתאים ביותר לטיפול בבקשה הנוכחית.",
        input_schema: {
          type: "object",
          properties: {
            agent_id: {
              type: "string",
              enum: specialistIds,
              description: "המזהה (id) המדויק של הסוכן שנבחר",
            },
            reason: {
              type: "string",
              description: "הסבר קצר למה נבחר סוכן זה",
            },
            deliverable_type: {
              type: "string",
              description: "סוג התוצר הצפוי מהניתוב הזה, לדוגמה: social_post, funnel_plan",
            },
          },
          required: ["agent_id", "reason"],
        },
      },
    ],
    tool_choice: { type: "tool", name: ROUTE_TOOL_NAME },
  });

  const toolUse = response.content.find((block) => block.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use") {
    throw new Error("המנהל לא החזיר החלטת ניתוב תקינה.");
  }

  const input = toolUse.input as {
    agent_id: string;
    reason: string;
    deliverable_type?: string;
  };

  if (!specialistIds.includes(input.agent_id)) {
    throw new Error(`המנהל ניתב לסוכן לא קיים: ${input.agent_id}`);
  }

  return {
    agentId: input.agent_id,
    reason: input.reason,
    deliverableType: input.deliverable_type ?? "general",
  };
}

export interface StreamCallbacks {
  onText: (delta: string) => void;
  onDone: (fullText: string) => void;
  onError: (error: Error) => void;
}

/** Streams a single agent's reply using its persona as the system prompt. */
export async function streamAgentReply(
  agent: AgentDef,
  history: ConversationMessage[],
  businessProfile: string,
  memoryLog: string,
  callbacks: StreamCallbacks
): Promise<void> {
  const client = getAnthropicClient();
  const systemPrompt = buildAgentSystemPrompt(agent, businessProfile, memoryLog);

  const stream = client.messages.stream({
    model: agent.model || DEFAULT_MODEL,
    max_tokens: MAX_TOKENS,
    system: systemPrompt,
    messages: history.map((m) => ({ role: m.role, content: m.content })),
  });

  stream.on("text", (delta) => callbacks.onText(delta));

  try {
    const finalText = await stream.finalText();
    callbacks.onDone(finalText);
  } catch (error) {
    callbacks.onError(error instanceof Error ? error : new Error(String(error)));
  }
}
