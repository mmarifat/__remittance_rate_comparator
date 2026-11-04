// Manages API customers in the database in DATABASE_URL.
//   bun run admin list
//   bun run admin create-org "SonaliPay" [--plan free|pro|enterprise]
//   bun run admin create-key <organization id> "Production" [--expires 2027-12-31]  (works through that UTC day)
//   bun run admin revoke <key id>
//   bun run admin set-plan <organization id> <plan>
//   bun run admin suspend|activate <organization id>
import { connect, databaseUrl } from "../src/db/client";
import {
  createApiKey,
  createOrganization,
  listOrganizations,
  revokeApiKey,
  setPlan,
  setStatus,
} from "../src/db/tenants";
import { PLANS } from "../src/lib/api/plans";
import { parseIsoDate } from "../src/lib/isoDate";

const [command, ...rest] = process.argv.slice(2);
const flag = (name: string) => {
  const i = rest.indexOf(`--${name}`);
  if (i < 0) return undefined;
  const [, value] = rest.splice(i, 2);
  if (!value || value.startsWith("--")) fail(`--${name} needs a value.`);
  return value;
};

const url = databaseUrl();
if (!url) {
  console.error("Set DATABASE_URL (e.g. from `vercel env pull .env.local`) first.");
  process.exit(1);
}
const db = connect(url);

const fail = (message: string): never => {
  console.error(message);
  process.exit(1);
};

try {
  switch (command) {
    case "list": {
      for (const org of await listOrganizations(db)) {
        console.log(`${org.id}  ${org.name}  plan=${org.plan}  ${org.status}`);
        for (const k of org.keys) {
          const state = k.revokedAt ? "revoked" : k.expiresAt && k.expiresAt < new Date() ? "expired" : "live";
          console.log(`    ${k.id}  ${k.prefix}…  "${k.name}"  ${state}  last used ${k.lastUsedAt?.toISOString() ?? "never"}`);
        }
      }
      break;
    }
    case "create-org": {
      const plan = flag("plan") ?? "free";
      const [name] = rest;
      if (!name) fail(`Usage: create-org "<name>" [--plan ${Object.keys(PLANS).join("|")}]`);
      const org = await createOrganization(db, { name, plan });
      console.log(`Created ${org.name} (${org.id}) on the ${org.plan} plan.`);
      break;
    }
    case "create-key": {
      const expires = flag("expires");
      const [organizationId, name = "Default"] = rest;
      if (!organizationId) fail('Usage: create-key <organization id> "<name>" [--expires YYYY-MM-DD]');
      // The key works through that UTC day, and stops at the next midnight.
      let expiresAt: Date | undefined;
      if (expires !== undefined) {
        const day = parseIsoDate(expires);
        if (!day?.dateOnly) fail(`--expires takes a date as YYYY-MM-DD, e.g. 2027-12-31; got "${expires}".`);
        expiresAt = new Date(day!.date.getTime() + 86_400_000);
        if (expiresAt <= new Date()) fail(`${expires} has already passed.`);
      }
      const key = await createApiKey(db, { organizationId, name, expiresAt });
      console.log(`Key ${key.id} ("${key.name}"). Give this to the customer; it won't be shown again:\n\n  ${key.key}\n`);
      break;
    }
    case "revoke": {
      const [keyId] = rest;
      if (!keyId) fail("Usage: revoke <key id>");
      console.log((await revokeApiKey(db, keyId)) ? "Revoked." : "No live key with that id.");
      break;
    }
    case "set-plan": {
      const [organizationId, plan] = rest;
      if (!organizationId || !plan) fail(`Usage: set-plan <organization id> <${Object.keys(PLANS).join("|")}>`);
      const org = await setPlan(db, organizationId, plan);
      console.log(org ? `${org.name} is now on ${org.plan}.` : "No such organization.");
      break;
    }
    case "suspend":
    case "activate": {
      const [organizationId] = rest;
      if (!organizationId) fail(`Usage: ${command} <organization id>`);
      const org = await setStatus(db, organizationId, command === "suspend" ? "suspended" : "active");
      console.log(org ? `${org.name} is ${org.status}.` : "No such organization.");
      break;
    }
    default:
      fail("Commands: list, create-org, create-key, revoke, set-plan, suspend, activate. See the top of scripts/admin.ts.");
  }
} finally {
  await db.$client.end();
}
