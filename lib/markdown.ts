import { promises as fs } from "fs";
import matter from "gray-matter";

export interface ParsedMarkdown<T = Record<string, unknown>> {
  data: T;
  content: string;
  filePath: string;
}

export async function readMarkdownFile<T = Record<string, unknown>>(
  filePath: string
): Promise<ParsedMarkdown<T>> {
  const raw = await fs.readFile(filePath, "utf-8");
  const { data, content } = matter(raw);
  return { data: data as T, content: content.trim(), filePath };
}
