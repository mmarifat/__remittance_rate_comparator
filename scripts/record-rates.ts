// Run hourly by .github/workflows/rate-history.yml:
//   bun scripts/record-rates.ts <path/to/history.json>
// Appends the live site's current rates to the history file, then opens a GitHub issue for any
// provider that has failed every check for 6 hours, and closes it once the provider answers again.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { appendRecord, providerHealth, serializeHistory, toRecord, type History } from "../src/lib/history";
import type { RatesSnapshot } from "../src/lib/types";

const SITE_URL = process.env.SITE_URL ?? "https://remittance-rate-comparator.vercel.app";
const file = process.argv[2] ?? "history.json";

const res = await fetch(`${SITE_URL}/api/rates`, { signal: AbortSignal.timeout(60_000) });
if (!res.ok) throw new Error(`HTTP ${res.status} from ${SITE_URL}/api/rates`);
const snapshot = (await res.json()) as RatesSnapshot;

const history: History = existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : { records: [] };
history.records = appendRecord(history.records, toRecord(snapshot));
writeFileSync(file, serializeHistory(history));
console.log(`Recorded ${snapshot.updatedAt}; ${history.records.length} checks in history.`);

const token = process.env.GITHUB_TOKEN;
const repo = process.env.GITHUB_REPOSITORY;
if (token && repo) await syncHealthIssues(token, repo);

async function syncHealthIssues(token: string, repo: string) {
  const LABEL = "provider-health";
  const api = async (path: string, init: RequestInit = {}) => {
    const r = await fetch(`https://api.github.com/repos/${repo}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "Content-Type": "application/json",
      },
    });
    if (!r.ok && r.status !== 422) throw new Error(`GitHub ${init.method ?? "GET"} ${path}: HTTP ${r.status}`);
    return r.status === 204 ? null : r.json();
  };

  // 422 means the label already exists.
  await api("/labels", {
    method: "POST",
    body: JSON.stringify({ name: LABEL, color: "f5c04a", description: "Opened automatically when a provider stops answering" }),
  });

  const byId = new Map(snapshot.providers.map((p) => [p.id, p]));
  const { down, up } = providerHealth(history.records, [...byId.keys()]);
  const open = (await api(`/issues?labels=${LABEL}&state=open&per_page=100`)) as { number: number; body: string }[];
  const openFor = (id: string) => open.find((i) => i.body?.includes(`<!-- provider:${id} -->`));

  for (const id of down) {
    if (openFor(id)) continue;
    const p = byId.get(id)!;
    await api("/issues", {
      method: "POST",
      body: JSON.stringify({
        title: `Provider not responding: ${p.name}`,
        labels: [LABEL],
        body: [
          `<!-- provider:${id} -->`,
          `**${p.name}** hasn't returned a rate in any of the last 6 hourly checks of the live site.`,
          "",
          `Latest error: \`${p.error ?? "unknown"}\``,
          "",
          `It may have changed its calculator or started blocking our requests. To investigate, run \`bun run check:providers\` and see \`src/lib/providers/${id}.ts\` (the file name can differ slightly). [CONTRIBUTING.md](../blob/main/CONTRIBUTING.md) explains how providers work.`,
          "",
          "_Opened automatically by the rate history workflow. It closes itself when the provider answers again._",
        ].join("\n"),
      }),
    });
    console.log(`Opened issue for ${p.name}`);
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
    console.log(`Closed issue #${issue.number} for ${id}`);
  }
}
