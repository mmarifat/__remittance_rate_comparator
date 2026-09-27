import { describe, expect, it } from "vitest";
import { parseNationalExchangeRates } from "./providers/nationalexchange";
import { parsePangeaFees } from "./providers/pangea";
import { parseSonaliRates } from "./providers/sonaliexchange";
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

describe("Pangea Bangladesh page", () => {
  it("reads the fee for each delivery method", () => {
    const html = `<ul role="list"><li><strong>Bank Deposit:</strong> $4.95 USD</li><li><strong>Cash Pickup:</strong> $3.95 USD</li></ul>`;
    expect(parsePangeaFees(html)).toEqual({ bank: 4.95, cash: 3.95 });
  });
});
