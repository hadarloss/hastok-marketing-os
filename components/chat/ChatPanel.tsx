"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { RoutingBreadcrumb, type AgentLite } from "@/components/chat/RoutingBreadcrumb";
import type { ChatMessage, RoutingInfo } from "@/components/chat/useAgentChat";
import type { Team } from "@/lib/agents/types";
import { cn } from "@/lib/utils";

export interface SaveContext {
  team: Team;
  deliverableType?: string;
}

export function ChatPanel({
  messages,
  onSend,
  isStreaming,
  error,
  routing,
  agentsById,
  placeholder = "כתבו הודעה...",
  emptyState,
  saveContext,
}: {
  messages: ChatMessage[];
  onSend: (text: string) => void;
  isStreaming: boolean;
  error: string | null;
  routing: RoutingInfo | null;
  agentsById: Record<string, AgentLite>;
  placeholder?: string;
  emptyState?: React.ReactNode;
  saveContext?: SaveContext;
}) {
  const [draft, setDraft] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  const handleSend = () => {
    if (!draft.trim()) return;
    onSend(draft);
    setDraft("");
  };

  return (
    <div className="flex flex-1 min-h-0 flex-col">
      {routing && (
        <div className="p-3 pb-0">
          <RoutingBreadcrumb routing={routing} agentsById={agentsById} />
        </div>
      )}

      <div className="flex-1 min-h-0 overflow-y-auto p-4 flex flex-col gap-3">
        {messages.length === 0 && emptyState}
        {messages.map((message, i) => (
          <MessageBubble
            key={i}
            message={message}
            agent={message.agentId ? agentsById[message.agentId] : undefined}
            saveContext={saveContext}
            isLast={i === messages.length - 1}
            isStreaming={isStreaming}
          />
        ))}
        {error && (
          <div className="self-stretch rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="border-t border-border p-3 flex gap-2 items-end">
        <Textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder={placeholder}
          disabled={isStreaming}
          className="min-h-11"
        />
        <Button onClick={handleSend} disabled={isStreaming || !draft.trim()}>
          {isStreaming ? "כותב..." : "שליחה"}
        </Button>
      </div>
    </div>
  );
}

function MessageBubble({
  message,
  agent,
  saveContext,
  isLast,
  isStreaming,
}: {
  message: ChatMessage;
  agent?: AgentLite;
  saveContext?: SaveContext;
  isLast: boolean;
  isStreaming: boolean;
}) {
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const isUser = message.role === "user";
  const showSave =
    !isUser && saveContext && message.agentId && message.content && !(isLast && isStreaming);

  const handleSave = async () => {
    if (!saveContext || !message.agentId) return;
    setSaveState("saving");
    try {
      const res = await fetch("/api/outputs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          team: saveContext.team,
          agentId: message.agentId,
          content: message.content,
          deliverableType: saveContext.deliverableType ?? "general",
        }),
      });
      if (!res.ok) throw new Error();
      setSaveState("saved");
    } catch {
      setSaveState("error");
    }
  };

  return (
    <div className={cn("flex flex-col max-w-[85%] gap-1", isUser ? "self-end items-end" : "self-start items-start")}>
      {!isUser && agent && (
        <div className="text-xs text-muted-foreground flex items-center gap-1 px-1">
          <span aria-hidden>{agent.icon}</span>
          <span>{agent.name}</span>
        </div>
      )}
      <div
        className={cn(
          "rounded-2xl px-3.5 py-2.5 text-sm whitespace-pre-wrap leading-relaxed",
          isUser ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
        )}
      >
        {message.content || (isLast && isStreaming ? "…" : "")}
      </div>
      {showSave && (
        <button
          onClick={handleSave}
          disabled={saveState === "saving" || saveState === "saved"}
          className="text-xs text-muted-foreground hover:text-foreground px-1 underline underline-offset-2 disabled:no-underline"
        >
          {saveState === "idle" && "💾 שמור כפלט"}
          {saveState === "saving" && "שומר..."}
          {saveState === "saved" && "✓ נשמר בתוצרים"}
          {saveState === "error" && "שגיאה בשמירה — נסה/י שוב"}
        </button>
      )}
    </div>
  );
}
