// Run hourly by .github/workflows/rate-history.yml:
//   bun scripts/record-rates.ts <history folder>
// For each corridor, appends the live site's current rates to <folder>/<corridor>.json, then opens a
// GitHub issue for any provider that has failed every check for 6 hours and closes it once it answers again.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { CORRIDORS, DEFAULT_CORRIDOR, type Corridor } from "../src/lib/corridors";
import { appendRecord, providerHealth, serializeHistory, toRecord, type History } from "../src/lib/history";
import type { RatesSnapshot } from "../src/lib/types";

const SITE_URL = process.env.SITE_URL ?? "https://remittance-rate-comparator.vercel.app";
const LABEL = "provider-health";
const dir = process.argv[2] ?? "history";
mkdirSync(dir, { recursive: true });

const github = process.env.GITHUB_TOKEN && process.env.GITHUB_REPOSITORY ? await openGitHub() : undefined;
let failures = 0;

// Each corridor is independent: one that fails is logged and skipped, and the rest are still recorded
// and committed by the workflow.
for (const corridor of CORRIDORS) {
  try {
    const res = await fetch(`${SITE_URL}/api/rates?corridor=${corridor.id}`, { signal: AbortSignal.timeout(60_000) });
    if (!res.ok) throw new Error(`HTTP ${res.status} from /api/rates`);
    const snapshot = (await res.json()) as RatesSnapshot;
    // An older deployment ignores ?corridor= and answers with GBP rates; never file those under another corridor.
    if (snapshot.corridor !== corridor.id) throw new Error(`asked for ${corridor.id}, got ${snapshot.corridor ?? "no corridor"}`);
    if (snapshot.providers.length === 0) continue;

    const file = join(dir, `${corridor.id}.json`);
    const history: History = existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : { records: [] };
    history.records = appendRecord(history.records, toRecord(snapshot));
    writeFileSync(file, serializeHistory(history));
    console.log(`${corridor.id}: recorded ${snapshot.updatedAt}; ${history.records.length} checks in history.`);

    await github?.syncHealthIssues(corridor, snapshot, history);
  } catch (err) {
    failures++;
    console.error(`${corridor.id}: skipped (${err instanceof Error ? err.message : err})`);
  }
}
if (failures === CORRIDORS.length) process.exit(1);

async function openGitHub() {
  const repo = process.env.GITHUB_REPOSITORY!;
  const token = process.env.GITHUB_TOKEN!;
  const api = async (path: string, init: RequestInit = {}) => {
    const r = await fetch(`https://api.github.com/repos/${repo}${path}`, {
      ...init,
      signal: AbortSignal.timeout(30_000),
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "Content-Type": "application/json",
      },
    });
    if (!r.ok && r.status !== 422) throw new Error(`GitHub ${init.method ?? "GET"} ${path}: HTTP ${r.status}`);
    return r.status === 204 ? null : r.json();
  };

  // Once per run: make sure the label exists (422 means it already does) and list open issues.
  await api("/labels", {
    method: "POST",
    body: JSON.stringify({ name: LABEL, color: "f5c04a", description: "Opened automatically when a provider stops answering" }),
  });
  const open = (await api(`/issues?labels=${LABEL}&state=open&per_page=100`)) as { number: number; body: string }[];

  return {
    async syncHealthIssues(corridor: Corridor, snapshot: RatesSnapshot, history: History) {
      const route = `${corridor.from} → ${corridor.to}`;
      const marker = (id: string) => `<!-- provider:${id}:${corridor.id} -->`;
      // Issues opened before corridors existed carry `<!-- provider:<id> -->` and are about GBP.
      const legacyMarker = (id: string) => `<!-- provider:${id} -->`;
      const openFor = (id: string) =>
        open.find(
          (i) =>
            i.body?.includes(marker(id)) || (corridor.id === DEFAULT_CORRIDOR && i.body?.includes(legacyMarker(id))),
        );

      const byId = new Map(snapshot.providers.map((p) => [p.id, p]));
      const { down, up } = providerHealth(history.records, [...byId.keys()]);

      for (const id of down) {
        if (openFor(id)) continue;
        const p = byId.get(id)!;
        const issue = (await api("/issues", {
          method: "POST",
          body: JSON.stringify({
            title: `Provider not responding: ${p.name} (${route})`,
            labels: [LABEL],
            body: [
              marker(id),
              `**${p.name}** hasn't returned a ${route} rate in any of the last 6 hourly checks of the live site.`,
              "",
              `Latest error: \`${p.error ?? "unknown"}\``,
              "",
              `It may have changed its calculator or started blocking our requests. To investigate, run \`bun run check:providers ${corridor.id}\` and see \`src/lib/providers/${id}.ts\` (the file name can differ slightly). [CONTRIBUTING.md](../blob/main/CONTRIBUTING.md) explains how providers work.`,
              "",
              "_Opened automatically by the rate history workflow. It closes itself when the provider answers again._",
            ].join("\n"),
          }),
        })) as { number: number; body: string };
        open.push(issue);
        console.log(`Opened issue #${issue.number} for ${p.name} (${route})`);
      }

      for (const id of up) {
        const issue = openFor(id);
        if (!issue) continue;
        const rate = history.records.at(-1)?.r[id];
        await api(`/issues/${issue.number}/comments`, {
          method: "POST",
          body: JSON.stringify({ body: `Answering again at ${snapshot.updatedAt} (rate ${rate}). Closing automatically.` }),
        });
        await api(`/issues/${issue.number}`, { method: "PATCH", body: JSON.stringify({ state: "closed" }) });
        open.splice(open.indexOf(issue), 1);
        console.log(`Closed issue #${issue.number} for ${id} (${route})`);
      }
    },
  };
}
