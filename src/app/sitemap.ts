import type { MetadataRoute } from "next";
import { corridorPages } from "@/lib/seo";
import { SITE_URL } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: SITE_URL, changeFrequency: "hourly", priority: 1 },
    // Next writes these into <loc> as they are, so the query's & has to be escaped for the XML.
    ...corridorPages().map((page) => ({
      url: `${SITE_URL}${page}`.replaceAll("&", "&amp;"),
      changeFrequency: "hourly" as const,
      priority: 0.8,
    })),
  ];
}
