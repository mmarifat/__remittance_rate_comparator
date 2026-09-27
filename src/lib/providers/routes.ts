import type { Corridor, CorridorId } from "../corridors";

/**
 * A provider's settings per corridor: the page users start a transfer on, plus whatever its API
 * needs for that route. Keeping both in one entry means a corridor can't be switched on without
 * the request details that make it work.
 */
export type Routes<P extends object = object> = Partial<Record<CorridorId, P & { url: string }>>;

export function urlsOf(routes: Routes): Partial<Record<CorridorId, string>> {
  return Object.fromEntries(Object.entries(routes).map(([id, route]) => [id, route!.url]));
}

export function routeFor<P extends object>(routes: Routes<P>, corridor: Corridor): P & { url: string } {
  const route = routes[corridor.id as CorridorId];
  if (!route) throw new Error(`Not offered for ${corridor.id}`);
  return route;
}
