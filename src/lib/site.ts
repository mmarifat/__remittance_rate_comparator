export const SITE_NAME = "Remittance Rate Comparator";

export const SITE_DESCRIPTION =
  "Compare live GBP to BDT (pound to taka) rates from 21 money transfer services, best rate first: Remitly, Wise, Taptap Send, SonaliPay, RizRemit, Western Union, XE and more.";

/** Canonical origin. Vercel sets VERCEL_PROJECT_PRODUCTION_URL; NEXT_PUBLIC_SITE_URL overrides it for a custom domain. */
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "http://localhost:3000");

export const REPO_URL = "https://github.com/mmarifat/__remittance_rate_comparator";

/** Hourly rate history, written by .github/workflows/rate-history.yml to the `data` branch. */
export const HISTORY_URL = "https://raw.githubusercontent.com/mmarifat/__remittance_rate_comparator/data/history.json";

export const AUTHOR = {
  name: "Md Minhaz Ahamed Rifat",
  github: "https://github.com/mmarifat",
  linkedin: "https://www.linkedin.com/in/mmarifat6/",
};
