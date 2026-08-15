import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AddMemoryEntryForm } from "@/components/memory/AddMemoryEntryForm";
import { readMemoryLog, parseMemoryLog, MemoryEntryType } from "@/lib/fs/memoryLog";

const TYPE_LABELS: Record<MemoryEntryType, string> = {
  correction: "תיקון",
  new_rule: "כלל חדש",
  preference: "העדפה",
  note: "הערה",
};

export default async function MemoryLogPage() {
  const raw = await readMemoryLog();
  const entries = parseMemoryLog(raw);

  return (
    <div className="p-6 max-w-3xl mx-auto w-full flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">🧠 יומן זיכרון דינאמי</h1>
        <p className="text-muted-foreground mt-1">
          כללים, תיקונים והעדפות שנצברו לאורך זמן. כל הסוכנים קוראים את היומן הזה לפני מענה.
        </p>
      </div>

      <AddMemoryEntryForm />

      <div className="flex flex-col gap-3">
        {entries.length === 0 && (
          <p className="text-sm text-muted-foreground">אין עדיין רשומות ביומן.</p>
        )}
        {entries.map((entry, i) => (
          <Card key={i}>
            <CardContent className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <Badge variant="secondary">{TYPE_LABELS[entry.type]}</Badge>
                <span className="text-xs text-muted-foreground">{entry.date}</span>
              </div>
              <p className="text-sm">{entry.summary}</p>
              <p className="text-xs text-muted-foreground">מקור: {entry.agent}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
