// Queries every provider once and prints what came back. Run: bun run check:providers
import { fetchSnapshot } from "../src/lib/snapshot";

const started = Date.now();
const snap = await fetchSnapshot();
console.log(`Mid-market: ${snap.midMarket ?? "unavailable"}  (${((Date.now() - started) / 1000).toFixed(1)}s)\n`);
for (const p of snap.providers) {
  if (p.status === "error") {
    console.log(`✗ ${p.name.padEnd(15)} ${p.error}`);
    continue;
  }
  const summary = p.quotes
    .map((q) => `${q.method}@£${q.sendAmount}: ${q.rate.toFixed(2)} +£${q.fee.toFixed(2)}`)
    .join("  ");
  console.log(`✓ ${p.name.padEnd(15)} ${summary}${p.note ? `  [${p.note}]` : ""}`);
}
