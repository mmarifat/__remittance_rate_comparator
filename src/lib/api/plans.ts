/**
 * What each plan allows. An organization's `plan` column names one of these. The numbers are a
 * starting point; pricing isn't decided yet. History is the same for everyone: the last 30 days.
 */
export const PLANS = {
  free: { name: "Free", requestsPerMinute: 30, requestsPerMonth: 10_000 },
  pro: { name: "Pro", requestsPerMinute: 300, requestsPerMonth: 1_000_000 },
  enterprise: { name: "Enterprise", requestsPerMinute: 1_200, requestsPerMonth: 10_000_000 },
} as const;

export type PlanId = keyof typeof PLANS;
export type Plan = (typeof PLANS)[PlanId];

export const isPlanId = (id: string): id is PlanId => Object.hasOwn(PLANS, id);

/** An organization's plan; an unknown id (a plan removed from code) gets the free limits. */
export function planOf(id: string): Plan {
  return isPlanId(id) ? PLANS[id] : PLANS.free;
}
