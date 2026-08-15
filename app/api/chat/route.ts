import { z } from "zod";
import { NextRequest } from "next/server";
import { getAgentById, getTeamTree } from "@/lib/agents/registry";
import { routeToAgent, streamAgentReply, ConversationMessage } from "@/lib/agents/router";
import { readBusinessProfile } from "@/lib/fs/businessProfile";
import { readMemoryLog } from "@/lib/fs/memoryLog";
import { getAnthropicClient, MissingApiKeyError } from "@/lib/anthropic/client";
import { ChatStreamEvent, Team } from "@/lib/agents/types";

// Generous but bounded cap on a single attachment's base64 payload (~15MB raw file).
const MAX_BASE64_LENGTH = 20_000_000;

const ContentBlockSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("text"), text: z.string().min(1) }),
  z.object({
    type: z.literal("image"),
    source: z.object({
      type: z.literal("base64"),
      media_type: z.enum(["image/jpeg", "image/png", "image/gif", "image/webp"]),
      data: z.string().max(MAX_BASE64_LENGTH),
    }),
  }),
  z.object({
    type: z.literal("document"),
    source: z.object({
      type: z.literal("base64"),
      media_type: z.literal("application/pdf"),
      data: z.string().max(MAX_BASE64_LENGTH),
    }),
    title: z.string().optional(),
  }),
]);

const MessageContentSchema = z.union([z.string().min(1), z.array(ContentBlockSchema).min(1)]);

const ChatRequestSchema = z.object({
  agentId: z.string().optional(),
  team: z.enum(["marketing", "branding"]).optional(),
  message: MessageContentSchema,
  history: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: MessageContentSchema }))
    .default([]),
});

function sseLine(event: ChatStreamEvent): Uint8Array {
  return new TextEncoder().encode(`data: ${JSON.stringify(event)}\n\n`);
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = ChatRequestSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.message }, { status: 400 });
  }
  const { agentId, team, message, history } = parsed.data;

  if (!agentId && !team) {
    return Response.json(
      { error: "יש לספק agentId (שיחה ישירה) או team (ניתוב דרך מנהל צוות)." },
      { status: 400 }
    );
  }

  // Fail fast on missing API key with a clean JSON error instead of an opening a stream that immediately errors.
  try {
    getAnthropicClient();
  } catch (error) {
    if (error instanceof MissingApiKeyError) {
      return Response.json({ error: error.message }, { status: 500 });
    }
    throw error;
  }

  const [businessProfile, memoryLog] = await Promise.all([
    readBusinessProfile(),
    readMemoryLog(),
  ]);

  const fullHistory: ConversationMessage[] = [...history, { role: "user", content: message }];

  const stream = new ReadableStream({
    async start(controller) {
      try {
        let targetAgentId = agentId ?? null;

        if (!targetAgentId && team) {
          const { lead, specialists } = await getTeamTree(team as Team);
          if (!lead) {
            controller.enqueue(sseLine({ type: "error", message: `לא נמצא מנהל צוות עבור ${team}` }));
            controller.close();
            return;
          }
          const decision = await routeToAgent(lead, specialists, fullHistory, businessProfile, memoryLog);
          targetAgentId = decision.agentId;
          controller.enqueue(
            sseLine({ type: "routing", from: lead.id, to: decision.agentId, reason: decision.reason })
          );
        }

        const agent = await getAgentById(targetAgentId!);
        if (!agent) {
          controller.enqueue(sseLine({ type: "error", message: `סוכן לא נמצא: ${targetAgentId}` }));
          controller.close();
          return;
        }

        await streamAgentReply(agent, fullHistory, businessProfile, memoryLog, {
          onText: (delta) => controller.enqueue(sseLine({ type: "token", text: delta })),
          onDone: () => {
            controller.enqueue(sseLine({ type: "done", handoff: null }));
            controller.close();
          },
          onError: (error) => {
            controller.enqueue(sseLine({ type: "error", message: error.message }));
            controller.close();
          },
        });
      } catch (error) {
        controller.enqueue(
          sseLine({ type: "error", message: error instanceof Error ? error.message : String(error) })
        );
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
