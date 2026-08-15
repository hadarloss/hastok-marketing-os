import OpenAI from "openai";

export class MissingOmniRouteConfigError extends Error {
  constructor() {
    super(
      "OMNIROUTE_BASE_URL לא הוגדר. הוסיפו אותו לקובץ .env.local (ראו .env.example) והפעילו מחדש את השרת."
    );
    this.name = "MissingOmniRouteConfigError";
  }
}

let client: OpenAI | null = null;

/**
 * Server-side only. Never import this from a "use client" component.
 * OmniRoute exposes an OpenAI-compatible Chat Completions endpoint (self-hosted,
 * MIT-licensed) in front of many providers — this is the same `openai` SDK used for
 * direct OpenAI, just pointed at a different base URL.
 */
export function getOmniRouteClient(): OpenAI {
  const baseURL = process.env.OMNIROUTE_BASE_URL;
  if (!baseURL) {
    throw new MissingOmniRouteConfigError();
  }
  if (!client) {
    client = new OpenAI({
      baseURL,
      // OmniRoute works keyless out of the box for its built-in free providers; a real
      // key is only required once auth is turned on for your instance. The SDK still
      // requires a non-empty string, so fall back to a placeholder.
      apiKey: process.env.OMNIROUTE_API_KEY || "omniroute-local",
    });
  }
  return client;
}

/** "auto" lets OmniRoute's own routing pick a model; override per-agent with a specific combo id. */
export const DEFAULT_OMNIROUTE_MODEL = "auto";
export const OMNIROUTE_MAX_TOKENS = 4096;
