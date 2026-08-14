import { z } from "zod";
import { NextRequest } from "next/server";
import { readBusinessProfile, writeBusinessProfile, isProfileTemplate } from "@/lib/fs/businessProfile";

export async function GET() {
  const content = await readBusinessProfile();
  return Response.json({ content, isTemplate: isProfileTemplate(content) });
}

const UpdateSchema = z.object({ content: z.string().min(1) });

export async function PUT(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = UpdateSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.message }, { status: 400 });
  }

  await writeBusinessProfile(parsed.data.content);
  return Response.json({ content: parsed.data.content, isTemplate: isProfileTemplate(parsed.data.content) });
}
