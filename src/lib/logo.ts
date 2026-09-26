import { readFile } from "node:fs/promises";
import { join } from "node:path";

/** public/logo.svg as a data URI, for images generated with next/og. */
export async function logoDataUri(): Promise<string> {
  const svg = await readFile(join(process.cwd(), "public/logo.svg"));
  return `data:image/svg+xml;base64,${svg.toString("base64")}`;
}
