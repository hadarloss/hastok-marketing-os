"use client";

import { useCallback, useState } from "react";
import type { Team } from "@/lib/agents/types";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  agentId?: string;
}

export interface RoutingInfo {
  from: string;
  to: string;
  reason: string;
}

interface UseAgentChatOptions {
  /** Chat directly with this agent, bypassing lead routing. */
  agentId?: string;
  /** Route through this team's lead — required when agentId is not set. */
  team?: Team;
}

export function useAgentChat({ agentId, team }: UseAgentChatOptions) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [activeAgentId, setActiveAgentId] = useState<string | undefined>(agentId);
  const [routing, setRouting] = useState<RoutingInfo | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || isStreaming) return;
      setError(null);
      setRouting(null);

      const history = messages.map((m) => ({ role: m.role, content: m.content }));
      setMessages((prev) => [
        ...prev,
        { role: "user", content: text },
        { role: "assistant", content: "", agentId: activeAgentId },
      ]);
      setIsStreaming(true);

      let assistantText = "";
      let resolvedAgentId = activeAgentId;

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            agentId: activeAgentId,
            team: activeAgentId ? undefined : team,
            message: text,
            history,
          }),
        });

        if (!res.ok || !res.body) {
          const data = await res.json().catch(() => ({ error: "שגיאה לא ידועה" }));
          throw new Error(data.error || "שגיאה בשליחת ההודעה");
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          const parts = buffer.split("\n\n");
          buffer = parts.pop() ?? "";

          for (const part of parts) {
            if (!part.startsWith("data: ")) continue;
            const event = JSON.parse(part.slice(6));

            if (event.type === "routing") {
              resolvedAgentId = event.to;
              setActiveAgentId(event.to);
              setRouting({ from: event.from, to: event.to, reason: event.reason });
              setMessages((prev) => {
                const copy = [...prev];
                copy[copy.length - 1] = { ...copy[copy.length - 1], agentId: event.to };
                return copy;
              });
            } else if (event.type === "token") {
              assistantText += event.text;
              const finalAgentId = resolvedAgentId;
              setMessages((prev) => {
                const copy = [...prev];
                copy[copy.length - 1] = {
                  ...copy[copy.length - 1],
                  content: assistantText,
                  agentId: finalAgentId,
                };
                return copy;
              });
            } else if (event.type === "error") {
              setError(event.message);
            }
          }
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setIsStreaming(false);
      }
    },
    [messages, activeAgentId, team, isStreaming]
  );

  return { messages, sendMessage, isStreaming, error, routing, activeAgentId };
}
