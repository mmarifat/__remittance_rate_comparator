import type { NextRequest } from "next/server";
import { getDb, type Db } from "@/db/client";
import { hashKey, KEY_PREFIX, recordRequest, type RequestRecord } from "@/db/tenants";
import { ApiError, errorResponse } from "./http";
import { planOf, type Plan } from "./plans";

export interface ApiContext {
  request: NextRequest;
  params: URLSearchParams;
  db: Db;
  caller: RequestRecord;
  plan: Plan;
  /** When the request was counted: the moment its limits and month were judged by. */
  now: Date;
}

/** The API key from `Authorization: Bearer …` or `X-API-Key`. Never from the query string, which ends up in logs. */
function readKey(request: NextRequest): string | undefined {
  const auth = request.headers.get("authorization");
  const bearer = auth?.match(/^Bearer\s+(\S+)$/i)?.[1];
  return bearer ?? request.headers.get("x-api-key")?.trim() ?? undefined;
}

function limitHeaders(plan: Plan, caller: RequestRecord, now: number): Record<string, string> {
  return {
    "X-RateLimit-Limit": String(plan.requestsPerMinute),
    "X-RateLimit-Remaining": String(Math.max(0, plan.requestsPerMinute - caller.minuteRequests)),
    "X-RateLimit-Reset": String(Math.max(1, Math.ceil((caller.windowEndsAt.getTime() - now) / 1000))),
    "X-Quota-Limit": String(plan.requestsPerMonth),
    "X-Quota-Remaining": String(Math.max(0, plan.requestsPerMonth - caller.monthRequests)),
  };
}

/**
 * Wraps a v1 route: checks the API key, checks and counts the request against the caller's plan, and turns
 * errors into `{ error: { code, message } }`. Responses are never cached: they depend on the key.
 */
export function apiRoute(handler: (ctx: ApiContext) => Promise<unknown>) {
  return async (request: NextRequest): Promise<Response> => {
    const db = getDb();
    if (!db) return errorResponse(new ApiError(503, "not_configured", "The API isn't set up on this deployment."));

    const key = readKey(request);
    if (!key) {
      return errorResponse(
        new ApiError(401, "missing_api_key", "Send your API key as `Authorization: Bearer <key>`.", {
          "WWW-Authenticate": "Bearer",
        }),
      );
    }

    // One clock reading for the whole request, so the limits, their reset times and the month agree.
    const at = new Date();
    let caller: RequestRecord | null;
    try {
      // Malformed keys can't exist, so skip the database for them.
      caller = key.startsWith(KEY_PREFIX) ? await recordRequest(db, hashKey(key), at) : null;
    } catch (err) {
      console.error("[api] usage check failed", err);
      return errorResponse(new ApiError(503, "unavailable", "The API is temporarily unavailable. Try again shortly."));
    }
    if (!caller) {
      return errorResponse(
        new ApiError(401, "invalid_api_key", "This API key isn't valid, or has been revoked or has expired.", {
          "WWW-Authenticate": 'Bearer error="invalid_token"',
        }),
      );
    }
    if (caller.status !== "active") {
      return errorResponse(new ApiError(403, "account_suspended", "This account is suspended. Contact us to restore access."));
    }

    const plan = planOf(caller.plan);
    const now = at.getTime();
    const headers = limitHeaders(plan, caller, now);
    if (caller.refused === "rate_limited") {
      return errorResponse(
        new ApiError(429, "rate_limited", `Each API key on your plan can make ${plan.requestsPerMinute} requests a minute.`, {
          "Retry-After": headers["X-RateLimit-Reset"],
        }),
        headers,
      );
    }
    if (caller.refused === "quota_exceeded") {
      const today = new Date(now);
      const nextMonth = Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + 1, 1);
      const reset = String(Math.ceil((nextMonth - now) / 1000));
      return errorResponse(
        new ApiError(429, "quota_exceeded", `Your plan's ${plan.requestsPerMonth} requests this month are used up.`, {
          "Retry-After": reset,
          "X-Quota-Reset": reset,
        }),
        headers,
      );
    }

    try {
      const body = await handler({ request, params: request.nextUrl.searchParams, db, caller, plan, now: at });
      return Response.json(body, { headers: { ...headers, "Cache-Control": "private, no-store" } });
    } catch (err) {
      if (err instanceof ApiError) return errorResponse(err, headers);
      console.error(`[api] ${request.nextUrl.pathname} failed`, err);
      return errorResponse(new ApiError(500, "internal_error", "Something went wrong on our side."), headers);
    }
  };
}
