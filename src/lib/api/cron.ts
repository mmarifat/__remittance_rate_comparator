import { timingSafeEqual } from "node:crypto";

/**
 * Internal jobs (the daily clean-up) authenticate with CRON_SECRET, sent as
 * `Authorization: Bearer <secret>`. Vercel Cron sends this header itself when CRON_SECRET is set.
 * Without the secret configured, the jobs refuse everything.
 */
export function isAuthorizedJob(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const given = Buffer.from(request.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  return given.length === expected.length && timingSafeEqual(given, expected);
}
