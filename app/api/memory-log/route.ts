import { z } from "zod";
import { NextRequest } from "next/server";
import { readMemoryLog, appendMemoryEntry, parseMemoryLog } from "@/lib/fs/memoryLog";

export async function GET() {
  const raw = await readMemoryLog();
  return Response.json({ raw, entries: parseMemoryLog(raw) });
}

const AppendSchema = z.object({
  agent: z.string().min(1),
  type: z.enum(["correction", "new_rule", "preference", "note"]),
  summary: z.string().min(1),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = AppendSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.message }, { status: 400 });
  }

  await appendMemoryEntry(parsed.data);
  const raw = await readMemoryLog();
  return Response.json({ raw, entries: parseMemoryLog(raw) }, { status: 201 });
}
