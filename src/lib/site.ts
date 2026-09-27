export const SITE_NAME = "Remittance Rate Comparator";

export const SITE_DESCRIPTION =
  "Compare live money transfer rates to Bangladesh from the UK, eurozone, US and Canada, best rate first: Remitly, Wise, Taptap Send, Western Union, XE, Ria, SonaliPay and more.";

/** Canonical origin. Vercel sets VERCEL_PROJECT_PRODUCTION_URL; NEXT_PUBLIC_SITE_URL overrides it for a custom domain. */
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "http://localhost:3000");

export const REPO_URL = "https://github.com/mmarifat/__remittance_rate_comparator";

/** Hourly rate history per corridor, written by .github/workflows/rate-history.yml to the `data` branch. */
export const HISTORY_BASE_URL = "https://raw.githubusercontent.com/mmarifat/__remittance_rate_comparator/data/history";

export const AUTHOR = {
  name: "Md Minhaz Ahamed Rifat",
  github: "https://github.com/mmarifat",
  linkedin: "https://www.linkedin.com/in/mmarifat6/",
};
