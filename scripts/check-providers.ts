// Queries every provider once and prints what came back.
//   bun run check:providers                → GBP-BDT
//   bun run check:providers EUR-BDT        → one corridor, from its default country
//   bun run check:providers EUR-BDT ES     → one corridor from one sending country (or "all" of them)
//   bun run check:providers all            → every corridor, each from its default country
import { CORRIDORS, DEFAULT_CORRIDOR, getCorridor, inCountry, type Corridor } from "../src/lib/corridors";
import { fetchSnapshot } from "../src/lib/snapshot";

const [arg = DEFAULT_CORRIDOR, countryArg] = process.argv.slice(2);
const bases = arg === "all" ? [...CORRIDORS] : [getCorridor(arg)];
if (bases.some((c) => !c)) {
  console.error(`Unknown corridor "${arg}". Use one of: ${CORRIDORS.map((c) => c.id).join(", ")}, or all.`);
  process.exit(1);
}
const corridors: Corridor[] = bases.flatMap((c) =>
  countryArg === "all" ? c!.sendCountries.map((country) => inCountry(c!, country)) : [inCountry(c!, countryArg)],
);

for (const corridor of corridors) {
  const started = Date.now();
  const snap = await fetchSnapshot(corridor);
  const secs = ((Date.now() - started) / 1000).toFixed(1);
  console.log(
    `\n${corridor.id} from ${corridor.sendCountry}  mid-market: ${snap.midMarket ?? "unavailable"}  (${snap.providers.length} providers, ${secs}s)\n`,
  );
  for (const p of snap.providers) {
    if (p.status === "error") {
      console.log(`✗ ${p.name.padEnd(15)} ${p.error}`);
      continue;
    }
    const summary = p.quotes
      .map((q) => `${q.method}@${q.sendAmount}: ${q.rate.toFixed(2)} +${q.fee.toFixed(2)}${q.promo ? "*" : ""}`)
      .join("  ");
    console.log(`✓ ${p.name.padEnd(15)} ${summary}${p.note ? `  [${p.note}]` : ""}`);
  }
}
