import { afterEach, describe, expect, it, vi } from "vitest";
import { CORRIDORS, getCorridor, inCountry } from "./corridors";
import { providers } from "./providers";
import { homeFor, parseLink } from "./link";
import { corridorPages, linkMetadata, linkSeo, titledCorridor, type LinkSeo } from "./seo";
import { SITE_DESCRIPTION } from "./site";
import { supports } from "./snapshot";

const servedBy = (id: string, country: string) =>
  providers.filter((p) => supports(p, inCountry(getCorridor(id)!, country))).length;

const allText = (seo: LinkSeo) =>
  [seo.title, seo.headline, seo.description, seo.imageAlt, seo.card.line, ...seo.card.chips, ...seo.keywords].join("\n");

const paramsOf = (path: string) => Object.fromEntries(new URL(path, "https://example.com").searchParams);

describe("linkSeo", () => {
  it("keeps the generic Bangladesh and Pakistan wording for a bare address", () => {
    const seo = linkSeo({});
    expect(seo.title).toBe("Remittance Rate Comparator: live money transfer rates to Bangladesh and Pakistan");
    expect(seo.description).toBe(SITE_DESCRIPTION);
    expect(seo.canonical).toBe("/");
    expect(seo.image).toBe("/og");
    expect(seo.keywords).toEqual(expect.arrayContaining(["GBP to BDT", "GBP to PKR", "bKash", "JazzCash"]));
    expect(seo.card.line).toBe("GBP · EUR · USD · CAD → BDT · PKR");
  });

  it("describes the corridor a shared link names", () => {
    const seo = linkSeo({ from: "GBP", to: "PKR", country: "GB", amount: "500" });
    expect(seo.title).toBe("Send money from the UK to Pakistan: live GBP to PKR rates | Remittance Rate Comparator");
    expect(seo.headline).toBe("Send money from the UK to Pakistan: live GBP to PKR rates");
    expect(seo.description).toContain("best rate first, fees included");
    expect(seo.description).toContain(`Compare ${servedBy("GBP-PKR", "GB")} services, including Remitly,`);
    expect(seo.description).toContain("JazzCash / Easypaisa");
    expect(seo.canonical).toBe("/?from=GBP&to=PKR");
    expect(seo.image).toBe("/og?from=GBP&to=PKR");
    expect(seo.card.line).toBe("GBP → PKR · United Kingdom → Pakistan");
    expect(seo.card.chips).toEqual(["Best rate first", "Fees included", `${servedBy("GBP-PKR", "GB")} services`]);
  });

  it("reads links case-insensitively and takes the first of repeated values", () => {
    expect(linkSeo({ from: ["gbp", "EUR"], to: "pkr" })).toEqual(linkSeo({ from: "GBP", to: "PKR" }));
    expect(linkSeo({ from: "eur", to: "pkr", country: ["es", "FR"] }).canonical).toBe("/?from=EUR&to=PKR&country=ES");
  });

  it("names the sending country only when it isn't the corridor's default", () => {
    const spain = linkSeo({ from: "EUR", to: "PKR", country: "ES" });
    expect(spain.headline).toBe("Send money from Spain to Pakistan: live EUR to PKR rates");
    expect(spain.description).toContain(`Compare ${servedBy("EUR-PKR", "ES")} services`);
    expect(spain.canonical).toBe("/?from=EUR&to=PKR&country=ES");
    expect(spain.image).toBe("/og?from=EUR&to=PKR&country=ES");

    for (const country of [undefined, "IT", "US", "nowhere"]) {
      const seo = linkSeo({ from: "EUR", to: "BDT", country });
      expect(seo.headline).toBe("Send money from Italy to Bangladesh: live EUR to BDT rates");
      expect(seo.canonical).toBe("/?from=EUR&to=BDT");
    }
  });

  it("describes a destination when the link names only where the money goes", () => {
    for (const params of [{ to: "PKR" }, { from: "xxx", to: "PKR" }, { to: "pkr", country: "ES" }]) {
      const seo = linkSeo(params);
      expect(seo.headline).toBe("Send money to Pakistan: live GBP, EUR, USD and CAD to PKR rates");
      expect(seo.description).toContain("from the UK, the eurozone, the US and Canada");
      expect(seo.canonical).toBe("/?to=PKR");
      expect(seo.image).toBe("/og?to=PKR");
    }
  });

  it("describes a sending currency when the link names only where the money comes from", () => {
    for (const params of [{ from: "CAD" }, { from: "cad", to: "JPY" }]) {
      const seo = linkSeo(params);
      expect(seo.headline).toBe("Send money from Canada: live CAD to BDT and PKR rates");
      expect(seo.description).toContain("from Canada to Bangladesh and Pakistan");
      expect(seo.canonical).toBe("/?from=CAD");
    }
    expect(linkSeo({ from: "EUR" }).headline).toBe("Send money from the eurozone: live EUR to BDT and PKR rates");
  });

  it("falls back to the generic wording when the link names nothing it knows", () => {
    for (const params of [{ from: "xxx" }, { to: "JPY" }, { country: "ES" }, { from: "", to: "" }, { to: "constructor" }]) {
      expect(linkSeo(params)).toEqual(linkSeo({}));
    }
  });

  it("never mentions the other destination", () => {
    const pages = [
      ...CORRIDORS.flatMap((c) => c.sendCountries.map((country) => ({ to: c.to, seo: linkSeo({ from: c.from, to: c.to, country }) }))),
      { to: "BDT", seo: linkSeo({ to: "BDT" }) },
      { to: "PKR", seo: linkSeo({ to: "PKR" }) },
    ];
    for (const { to, seo } of pages) {
      const other = to === "PKR" ? /bangladesh|taka|bkash|nagad|bdt/i : /pakistan|rupee|jazzcash|easypaisa|pkr/i;
      expect(allText(seo)).not.toMatch(other);
    }
  });

  it("keeps every headline short enough to show in full in search results", () => {
    const links = [
      ...CORRIDORS.flatMap((c) => c.sendCountries.map((country) => ({ from: c.from, to: c.to, country }))),
      { to: "BDT" },
      { to: "PKR" },
      ...CORRIDORS.map((c) => ({ from: c.from })),
    ];
    for (const link of links) expect(linkSeo(link).headline.length).toBeLessThanOrEqual(65);
  });

  it("gives each page one address: its canonical and image links describe it again", () => {
    for (const path of ["/", "/?from=gbp&to=PKR&country=GB&amount=500", "/?to=PKR", "/?from=EUR&to=PKR&country=ES", "/?from=CAD"]) {
      const seo = linkSeo(paramsOf(path));
      expect(linkSeo(paramsOf(seo.canonical))).toEqual(seo);
      expect(linkSeo(paramsOf(seo.image)).image).toBe(seo.image);
    }
  });
});

describe("no rates are fetched for metadata", () => {
  afterEach(() => vi.restoreAllMocks());

  it("never asks a provider or the network", () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const quoteSpies = providers.map((p) => vi.spyOn(p, "fetchQuotes"));
    linkSeo({});
    linkMetadata({ to: "PKR" });
    linkMetadata({ from: "EUR" });
    corridorPages();
    expect(fetchSpy).not.toHaveBeenCalled();
    for (const spy of quoteSpies) expect(spy).not.toHaveBeenCalled();
  });
});

describe("linkMetadata", () => {
  it("points the canonical, og:url and both share images at the link's corridor", () => {
    const meta = linkMetadata({ from: "EUR", to: "PKR", country: "ES" });
    expect(meta.alternates?.canonical).toBe("/?from=EUR&to=PKR&country=ES");
    expect(meta.openGraph).toMatchObject({
      url: "/?from=EUR&to=PKR&country=ES",
      title: "Send money from Spain to Pakistan: live EUR to PKR rates",
      images: [{ url: "/og?from=EUR&to=PKR&country=ES", width: 1200, height: 630 }],
    });
    expect(meta.twitter).toMatchObject({
      card: "summary_large_image",
      images: [{ url: "/og?from=EUR&to=PKR&country=ES" }],
    });
  });
});

describe("titledCorridor", () => {
  it("names the corridor and country the title names, which can differ from where the page starts", () => {
    const params = { from: "EUR", to: "BDT" };
    expect(titledCorridor(params)).toBe("EUR-BDT:IT");
    const start = parseLink(params, homeFor("ES"));
    expect(`${start.corridorId}:${start.country}`).toBe("EUR-BDT:ES");
    expect(titledCorridor({ from: "eur", to: "pkr", country: "es" })).toBe("EUR-PKR:ES");
    for (const other of [{}, { to: "PKR" }, { from: "EUR" }, { from: "xxx" }]) expect(titledCorridor(other)).toBeNull();
  });
});

describe("corridorPages", () => {
  it("lists every corridor from each of its sending countries once", () => {
    const pages = corridorPages();
    expect(pages).toHaveLength(CORRIDORS.reduce((n, c) => n + c.sendCountries.length, 0));
    expect(new Set(pages).size).toBe(pages.length);
    expect(pages).toEqual(expect.arrayContaining(["/?from=GBP&to=PKR", "/?from=EUR&to=BDT", "/?from=EUR&to=PKR&country=ES"]));
    expect(pages).not.toContain("/");
  });
});
