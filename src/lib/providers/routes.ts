import type { Corridor, CorridorId, CountryCode } from "../corridors";

interface RouteBase {
  /** The page users start a transfer on; a function when it differs by sending country. */
  url: string | ((sendCountry: CountryCode) => string);
  /** For corridors with several sending countries (euros): the only ones this provider serves. */
  countries?: readonly CountryCode[];
}

/**
 * A provider's settings per corridor: the page users start a transfer on, plus whatever its API
 * needs for that route. Keeping both in one entry means a corridor can't be switched on without
 * the request details that make it work.
 */
export type Routes<P extends object = object> = Partial<Record<CorridorId, P & RouteBase>>;

function lookup<P extends object>(routes: Routes<P>, corridor: Corridor): (P & RouteBase) | undefined {
  const route = routes[corridor.id as CorridorId];
  if (!route || (route.countries && !route.countries.includes(corridor.sendCountry))) return undefined;
  return route;
}

/** Builds a provider's `urlFor`: the link for a corridor and sending country, or undefined where it isn't offered. */
export function urlsFrom(routes: Routes): (corridor: Corridor) => string | undefined {
  return (corridor) => {
    const route = lookup(routes, corridor);
    if (!route) return undefined;
    return typeof route.url === "function" ? route.url(corridor.sendCountry) : route.url;
  };
}

export function routeFor<P extends object>(routes: Routes<P>, corridor: Corridor): P & RouteBase {
  const route = lookup(routes, corridor);
  if (!route) throw new Error(`Not offered for ${corridor.id} from ${corridor.sendCountry}`);
  return route;
}
