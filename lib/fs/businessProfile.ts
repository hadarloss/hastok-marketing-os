import { promises as fs } from "fs";
import path from "path";

const CONTEXT_DIR = path.join(process.cwd(), "context");
const BUSINESS_PROFILE_PATH = path.join(CONTEXT_DIR, "BUSINESS_PROFILE.md");

export async function readBusinessProfile(): Promise<string> {
  return fs.readFile(BUSINESS_PROFILE_PATH, "utf-8");
}

/** Full-document overwrite — the profile is a structured doc the user/onboarding agent rewrites wholesale. */
export async function writeBusinessProfile(markdown: string): Promise<void> {
  await fs.writeFile(BUSINESS_PROFILE_PATH, markdown, "utf-8");
}

/** True while the profile is still the unfilled template shipped with the repo. */
export function isProfileTemplate(content: string): boolean {
  return content.includes("_status: template_");
}
