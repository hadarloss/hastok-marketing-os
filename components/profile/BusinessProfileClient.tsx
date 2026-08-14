"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export function BusinessProfileClient({ initialContent }: { initialContent: string }) {
  const [content, setContent] = useState(initialContent);
  const [draft, setDraft] = useState(initialContent);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/business-profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: draft }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setContent(data.content);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end gap-2">
        {editing ? (
          <>
            <Button variant="ghost" onClick={() => { setDraft(content); setEditing(false); }} disabled={saving}>
              ביטול
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "שומר..." : "שמירה"}
            </Button>
          </>
        ) : (
          <Button variant="outline" onClick={() => setEditing(true)}>
            ✏️ עריכה
          </Button>
        )}
      </div>

      {editing ? (
        <Textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          className="min-h-[60vh] font-mono text-sm"
        />
      ) : (
        <article className="whitespace-pre-wrap rounded-lg border border-border p-5 text-sm leading-relaxed">
          {content}
        </article>
      )}
    </div>
  );
}
