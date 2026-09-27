// Queries every provider once and prints what came back.
//   bun run check:providers            → GBP-BDT
//   bun run check:providers EUR-BDT    → one corridor
//   bun run check:providers all        → every corridor
import { CORRIDORS, DEFAULT_CORRIDOR, getCorridor } from "../src/lib/corridors";
import { fetchSnapshot } from "../src/lib/snapshot";

const arg = process.argv[2] ?? DEFAULT_CORRIDOR;
const corridors = arg === "all" ? CORRIDORS : [getCorridor(arg)];
if (corridors.some((c) => !c)) {
  console.error(`Unknown corridor "${arg}". Use one of: ${CORRIDORS.map((c) => c.id).join(", ")}, or all.`);
  process.exit(1);
}

for (const corridor of corridors) {
  const started = Date.now();
  const snap = await fetchSnapshot(corridor!);
  const secs = ((Date.now() - started) / 1000).toFixed(1);
  console.log(`\n${corridor!.id}  mid-market: ${snap.midMarket ?? "unavailable"}  (${snap.providers.length} providers, ${secs}s)\n`);
  for (const p of snap.providers) {
    if (p.status === "error") {
      console.log(`✗ ${p.name.padEnd(15)} ${p.error}`);
      continue;
    }
    const summary = p.quotes
      .map((q) => `${q.method}@${q.sendAmount}: ${q.rate.toFixed(2)} +${q.fee.toFixed(2)}`)
      .join("  ");
    console.log(`✓ ${p.name.padEnd(15)} ${summary}${p.note ? `  [${p.note}]` : ""}`);
  }
}
