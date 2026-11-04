/** An error the API reports to the caller as `{ error: { code, message } }` with this status. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly headers: Record<string, string> = {},
  ) {
    super(message);
  }
}

export function errorResponse(err: ApiError, headers: Record<string, string> = {}): Response {
  return Response.json(
    { error: { code: err.code, message: err.message } },
    { status: err.status, headers: { "Cache-Control": "no-store", ...headers, ...err.headers } },
  );
}
