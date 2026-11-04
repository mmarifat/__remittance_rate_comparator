import { describe, expect, it } from "vitest";
import { parseNationalExchangeRates } from "./providers/nationalexchange";
import { parsePangeaFees } from "./providers/pangea";
import { parseSonaliRates } from "./providers/sonaliexchange";
import { taptapQuotes } from "./providers/taptapsend";
import { parseLemfiPage } from "./providers/lemfi";
import { parseRemitOnePrice } from "./providers/remitone";
import { parseTransferGalaxyForm, parseTransferGalaxyQuote } from "./providers/transfergalaxy";
import { pickQuote } from "./compare";

// Trimmed from the providers' real pages, so a change in their markup shows up here first.

describe("Sonali Exchange rates page", () => {
  const html = `<p>Conversion Rate: 1 USD = 122.9 Taka</p><table><tr><td>$1 to $500</td><td>$2</td></tr>
    <tr><td>$501 to $1,000</td><td>$4</td></tr><tr><td>$1,001 to $2,000</td><td>$6</td></tr>
    <tr><td>$2,001 &amp; above</td><td>$8</td></tr></table>`;

  it("reads the rate and turns the commission slabs into quotes", () => {
    const quotes = parseSonaliRates(html);
    expect(pickQuote(quotes, 300, "bank")).toMatchObject({ rate: 122.9, fee: 2 });
    expect(pickQuote(quotes, 1000, "bank")?.fee).toBe(4);
    expect(pickQuote(quotes, 1500, "cash")?.fee).toBe(6);
    expect(pickQuote(quotes, 5000, "bank")?.fee).toBe(8);
  });
});

describe("National Exchange rates page", () => {
  const html = `<h3>Send Money to Asia</h3><div>Bangladesh</div><div>140.82</div><div>Bank Deposit - Any Bank</div>
    <div>Bangladesh</div><div>140.75</div><div>Cash Pay</div><div>Bangladesh</div><div>140.55</div><div>BKash/Nagad</div>
    <div>Bangladesh</div><div>140.75</div><div>BKash Cash Pickup</div><div>India</div><div>109.02</div><div>Bank Deposit</div>`;

  it("reads one rate per payout method and flags the fee as unpublished", () => {
    expect(parseNationalExchangeRates(html)).toEqual([
      { sendAmount: 1, rate: 140.82, fee: 0, method: "bank", feeUnknown: true },
      { sendAmount: 1, rate: 140.75, fee: 0, method: "cash", feeUnknown: true },
      { sendAmount: 1, rate: 140.55, fee: 0, method: "wallet", feeUnknown: true },
    ]);
  });
});

describe("National Exchange rates page, Pakistan rows", () => {
  const html = `<div>Nepal</div><div>170.00</div><div>Mobile Wallet</div><div>Pakistan</div><div>312.00</div><div>Bank Deposit - Any Bank</div>
    <div>Pakistan</div><div>310.00</div><div>Cash Pay</div><div>Pakistan</div><div>309.50</div><div>Mobile Wallet</div><div>Philippines</div><div>71.38</div><div>Bank Deposit</div>`;

  it("reads the country it's asked for, naming wallets the way the page does for Pakistan", () => {
    expect(parseNationalExchangeRates(html, "Pakistan")).toEqual([
      { sendAmount: 1, rate: 312, fee: 0, method: "bank", feeUnknown: true },
      { sendAmount: 1, rate: 310, fee: 0, method: "cash", feeUnknown: true },
      { sendAmount: 1, rate: 309.5, fee: 0, method: "wallet", feeUnknown: true },
    ]);
  });
});

describe("Taptap Send fees", () => {
  it("charges less for wallets than banks to Bangladesh", () => {
    const quotes = taptapQuotes({ from: "GBP", to: "BDT" }, 166);
    expect(pickQuote(quotes, 1000, "wallet")?.fee).toBe(0.99);
    expect(pickQuote(quotes, 1000, "bank")?.fee).toBe(2.99);
    expect(pickQuote(quotes, 1000, "cash")?.fee).toBe(2.99);
  });

  it("is free above a minimum to Pakistan, with a flat fee below it", () => {
    const quotes = taptapQuotes({ from: "GBP", to: "PKR" }, 369);
    expect(pickQuote(quotes, 100, "bank")?.fee).toBe(0.99);
    expect(pickQuote(quotes, 125, "bank")?.fee).toBe(0);
    expect(pickQuote(quotes, 1000, "wallet")?.fee).toBe(0);
  });
});

describe("Pangea Bangladesh page", () => {
  it("reads the fee for each delivery method", () => {
    const html = `<ul role="list"><li><strong>Bank Deposit:</strong> $4.95 USD</li><li><strong>Cash Pickup:</strong> $3.95 USD</li></ul>`;
    expect(parsePangeaFees(html)).toEqual({ bank: 4.95, cash: 3.95 });
  });
});

describe("LemFi corridor page", () => {
  // The page's visible rate plus its Nuxt payload: a flat array whose objects point at other entries by index.
  const page = (shown: string, payload: unknown[]) =>
    `<div class="rate"><span>1 GBP</span> = <span>${shown}</span></div><p>Transfer fee £0.00</p>` +
    `<script type="application/json" id="__NUXT_DATA__">${JSON.stringify(payload)}</script>`;
  const payload = (opts: { rate?: string; baseRate?: string; promotion?: boolean; sender?: string } = {}) => [
    ["ShallowReactive", 1],
    { data: 2, state: 10 },
    ["ShallowReactive", 3],
    { "currency-converter-v-0-0-0": 4 },
    { failure: 5, ageMs: 6, quote: 7 },
    null,
    0,
    { baseRate: 18, rate: 8, stale: 9, promotion: opts.promotion ? 19 : 5, fee: 11 },
    opts.rate ?? "370.42",
    false,
    ["Reactive", 12],
    { min: 13, max: 6, minTransactionAmount: 14 },
    { $scountry: 15 },
    0.99,
    148.32,
    { code: 16, currency: 17 },
    opts.sender ?? "GB",
    "GBP",
    opts.baseRate ?? opts.rate ?? "370.42",
    { title: 20 },
    "Welcome rate",
  ];
  const gbpPkr = { from: "GBP", to: "PKR" as const, sendCountry: "GB" as const };

  it("charges its small fee up to the threshold and nothing above it", () => {
    const quotes = parseLemfiPage(page("370.42 PKR", payload()), gbpPkr);
    expect(pickQuote(quotes, 100, "bank")).toMatchObject({ rate: 370.42, fee: 0.99 });
    expect(pickQuote(quotes, 148.32, "bank")?.fee).toBe(0.99);
    expect(pickQuote(quotes, 500, "bank")?.fee).toBe(0);
  });

  it("ranks on the standard rate when a promotion is on", () => {
    const quotes = parseLemfiPage(page("372.00 PKR", payload({ rate: "372.00", baseRate: "370.42", promotion: true })), gbpPkr);
    expect(quotes[0]).toMatchObject({ rate: 370.42, promo: { rate: 372 } });
  });

  it("refuses a page for another route", () => {
    // LemFi's US page for Bangladesh quotes rupees to India instead.
    expect(() => parseLemfiPage(page("94.55 INR", payload({ rate: "94.55" })), gbpPkr)).toThrow("GBP→INR");
    expect(() => parseLemfiPage(page("370.42 PKR", payload({ sender: "IT" })), gbpPkr)).toThrow("sending from IT");
  });
});

describe("RemitONE rates form", () => {
  const html = `<h3>Send Money From United Kingdom to Bangladesh (Account)</h3><p>Login or register below to send money</p>
    <div><b>GBP 1,000.00</b><span>Send Amount</span></div><div><b>168.000000</b><span>Rate</span></div>
    <div><b>BDT 168,000.00</b><span>Receive Amount</span></div><div><b>GBP 10.00</b><span>Total Charges</span></div>`;

  it("reads the rate and charges", () => {
    expect(parseRemitOnePrice(html, { from: "GBP", to: "BDT" })).toEqual({ rate: 168, fee: 10 });
  });

  it("refuses a price for another currency", () => {
    expect(() => parseRemitOnePrice(html, { from: "GBP", to: "PKR" })).toThrow("GBP→BDT");
  });
});

describe("Transfer Galaxy quote", () => {
  const fragment = (rateCell: string, feeCell: string) =>
    `<table class="index-table"><tbody><tr><th>You send</th><td>1000 GBP</td></tr>
    <tr><th>Exchange rate</th><td> ${rateCell} </td></tr><tr><th>Our fee</th><td> ${feeCell} </td></tr></tbody></table>`;
  const gbpPkr = { from: "GBP", to: "PKR" as const };

  it("separates the struck-through standard price from the new-customer offer", () => {
    const html = fragment(
      '<s><small>1 GBP = 367.2132 PKR</small></s><br /> <span class="text-brand">1 GBP = 369.0678 PKR</span>',
      '<s><small>1.00 GBP</small></s><br /> <span class="text-brand">0.00 GBP</span>',
    );
    expect(parseTransferGalaxyQuote(html, gbpPkr)).toEqual({ rate: 367.2132, fee: 1, offer: { rate: 369.0678, fee: 0 } });
  });

  it("reads a single price when there's no offer, and refuses other routes", () => {
    const html = fragment('<span class="text-brand">1 GBP = 367.2132 PKR</span>', '<span class="text-brand">1.00 GBP</span>');
    expect(parseTransferGalaxyQuote(html, gbpPkr)).toEqual({ rate: 367.2132, fee: 1, offer: undefined });
    expect(() => parseTransferGalaxyQuote(html, { from: "GBP", to: "BDT" })).toThrow("GBP→PKR");
    // As the site sends it, with the apostrophe HTML-encoded.
    expect(() => parseTransferGalaxyQuote("Currently your sending country doesn&#39;t support transaction for provided receiving country.", gbpPkr)).toThrow("Not offered");
  });

  it("reads the form's token and hidden fields", () => {
    const form = `<form id="aocForm"><input name="__RequestVerificationToken" type="hidden" value="tok123" />
      <input id="SendingCurrency" name="SendingCurrency" type="hidden" value="GBP" />
      <input data-val="true" id="CurrentPageId" name="CurrentPageId" type="hidden" value="55374" /></form>`;
    expect(parseTransferGalaxyForm(form)).toEqual({ __RequestVerificationToken: "tok123", SendingCurrency: "GBP", CurrentPageId: "55374" });
  });
});
