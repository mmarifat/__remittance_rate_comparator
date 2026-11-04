import { describe, expect, it } from "vitest";
import { destinationOf, findCorridor, getCorridor, inCountry } from "./corridors";
import { routeFor, urlsFrom, type Routes } from "./providers/routes";

const eur = getCorridor("EUR-BDT")!;

describe("corridors", () => {
  it("are found by their two currencies", () => {
    expect(findCorridor("gbp", "pkr")?.id).toBe("GBP-PKR");
    expect(findCorridor("EUR", "BDT")?.id).toBe("EUR-BDT");
    expect(findCorridor("JPY", "PKR")).toBeUndefined();
  });

  it("know where their money lands", () => {
    expect(destinationOf(getCorridor("USD-PKR")!).iso3).toBe("PAK");
    expect(destinationOf(eur).slug).toBe("bangladesh");
  });
});

describe("inCountry", () => {
  it("switches to a supported sending country and ignores anything else", () => {
    expect(inCountry(eur, "es").sendCountry).toBe("ES");
    expect(inCountry(eur, "US").sendCountry).toBe("IT");
    expect(inCountry(eur, null).sendCountry).toBe("IT");
  });
});

describe("provider routes", () => {
  const routes: Routes = {
    "EUR-BDT": { url: (country) => `https://example.com/${country.toLowerCase()}`, countries: ["IT", "ES"] },
  };

  it("builds a link per sending country and hides countries the provider doesn't serve", () => {
    const urlFor = urlsFrom(routes);
    expect(urlFor(inCountry(eur, "ES"))).toBe("https://example.com/es");
    expect(urlFor(inCountry(eur, "FR"))).toBeUndefined();
    expect(urlFor(getCorridor("USD-BDT")!)).toBeUndefined();
  });

  it("refuses to fetch where there's no route", () => {
    expect(() => routeFor(routes, inCountry(eur, "DE"))).toThrow("Not offered for EUR-BDT from DE");
  });
});
