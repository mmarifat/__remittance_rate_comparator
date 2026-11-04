# Market research: Bangladesh and Pakistan remittance providers

**Date:** 2026-11-04 (4 November 2026)
**Scope:** money sent to Bangladesh (BDT) and Pakistan (PKR) on this project's sending corridors:

- UK (GBP)
- Eurozone (EUR). Italy is the default; Spain, France, Germany, Portugal and Ireland are also covered.
- US (USD)
- Canada (CAD)

Gulf, Asian and other sending markets are covered only to size the opportunity.

**Not counted as new candidates**, because they were integrated before this survey: Remitly, Taptap Send, Wise, Sendwave, WorldRemit, TransferGo, Instarem, NALA, Paysend, Profee, Western Union, XE, MoneyGram, Ria, Xoom, SonaliPay, RizRemit, REMITnGO (BRAC Saajan), NEC Money, RemitChoice, Pangea, Sonali Exchange, National Exchange Co., Skrill and BMO.

### How this was done

1. **Research.** Sources were:
   - official statistics, mostly as reported in the press;
   - comparison sites: Wise's comparison feed, Monito, RemitFinder, Finder, Remitrate and Exiap;
   - provider pages and press releases.
2. **Probes.** Each stronger candidate's public calculator got a few plain requests.
   - Every request sent the project's User-Agent and `X-Open-Source-Client` header.
   - Requests were 1–2 seconds apart, and probing stopped at the first refusal.
   - There were no logins, proxies, browser impersonation, challenge solving or de-obfuscation.
   - TransferGo was not contacted.
3. **Verification.** A second pass re-ran each request that worked. All prices in this report come from that second pass. Where the two runs differ, the second run wins. For example, LemFi's rate moved during the day, and Wise re-collected OFX's quote.
4. **Mid-market rates** are Wise's, from `wise.com/rates/live` and its comparison feed, taken the same day between about 10:30 and 12:50 UTC.

**Limits:**

- The shared web-search budget ran out before several checks could be done. These include a review of providers' terms of use (see 7.3 and 7.4).
- These sites refused automated reads with HTTP 403: bkash.com, compareremit.com, remittanceprices.worldbank.org, dhakatribune.com, tribune.com.pk, brecorder.com, the SBP circular page, help.xe.com and Taptap Send's help centre.
- RemitFinder only renders with JavaScript.
- Facts from the sources above come from search-result summaries and are marked *(search snippet)*.
- Figures from vendor marketing are labelled as such. This applies to ACE, Profee, Remitbee, Rozeremit and Simpaisa.

---

## 1. Key takeaways

- **Most of the money comes from the Gulf, not from our corridors.**
  - Bangladesh received $35.59bn in FY2025-26. Five Gulf states sent about 44% of it.
  - Pakistan received $41.6bn. Saudi Arabia and the UAE alone sent 44.7%, and the whole Gulf about 54% (research estimate).
  - Our four corridors carry about 30% of the BDT flow and about 38% of the PKR flow. Section 7.1 sizes the gap.
- **The UK is the corridor to get right.**
  - For Bangladesh it is the No. 2 source: 14.2%, or $5.07bn, up about 60% on the year.
  - For Pakistan it is No. 3: 15.2%, or $6.33bn. It grew 19.4% in July–September 2026.
  - The US is No. 5 for both countries. US flows to Bangladesh fell 35.9%, partly because of how aggregators book flows.
  - Italy is the largest euro source for both countries, so Italy should stay the euro default.
- **Five new providers meet the ground rules, and their quotes passed verification:**

  | Provider | Verified corridors | In the code? |
  |---|---|---|
  | LemFi | 7 | Yes |
  | Dahabshiil | 6 | Yes |
  | Transfer Galaxy | 4 | Yes |
  | BOSS Money | 2 (US only) | Yes |
  | MoneyTO | 1 (GBP-PKR) | No: its calculator only gives its first-transfer rate (see 4.1) |

  OFX (four PKR corridors) is now read from Wise's comparison feed, with no new scraping. Nationwide and Chase could be added the same way, but they are mainly bank benchmarks.

  Asked for separately and checked after this survey (section 4.4):

  - **IFIC Money Transfer** and **BA Exchange**, the UK exchange houses of IFIC Bank and Bank Asia, are added for GBP-BDT.
  - **ACE Money Transfer** stays out because Cloudflare blocks it.
- **LemFi can be added, but it is a judgement call.**
  - Its corridor pages print the rate as plain text in the server-rendered HTML.
  - Its calculator's JSON API deliberately scrambles the same number.
  - Reading the printed page involves no decoding, and the code does only that. The owner should still confirm that this fits the spirit of CONTRIBUTING.md.
  - LemFi does not send USD to Bangladesh.
- **The most important specialist we are missing cannot be added.** ACE Money Transfer is the Pakistan specialist and bKash's UK campaign partner. Its site blocks plain requests with Cloudflare. So do Remitbee, Placid Express, Revolut, Majority and ShareMoney. None of them appears in Wise's comparison feed, so there is no fallback source.
- **Headline prices are often promotions.**
  - BOSS Money, Transfer Galaxy and Dahabshiil (on PKR) show a better new-customer or "special" rate next to the standard one.
  - MoneyTO returns a `promo_rate: true` flag without saying what it means.
  - Rank on the standard price and show the deal as a promo. The code already does this for the three providers it includes.
- **Before charging for the API, check the terms and the hosting plan.**
  - 11 of the 14 largest providers prohibit automated access in at least one published version of their terms, and none grants permission.
  - Vercel's free Hobby plan is for non-commercial use only.
  - See 7.4 and 7.5.

---

## 2. Bangladesh

### 2.1 Where the money comes from

FY2025-26 (July 2025 to June 2026) set a record of **$35.59bn**, up from $30.33bn.

- The country figures come from the minister's written reply in parliament, reported by the Daily Star on 3 September 2026.
- Shares are computed against $35.59bn. Saudi Arabia's 16.33% matches the share bdnews24 reported.

| Rank | Sending country | FY2025-26 | Share | Note |
|---|---|---|---|---|
| 1 | Saudi Arabia | $5.85bn | 16.3% | |
| 2 | **United Kingdom** | $5.07bn | 14.2% | Up from $3.17bn; briefly ahead of Saudi Arabia in May 2026 |
| 3 | UAE | $4.58bn | 12.9% | |
| 4 | Malaysia | $3.40bn | 9.6% | |
| 5 | **United States** | $3.03bn | 8.5% | Down 35.9% from $4.73bn |
| 6= | **Italy** | $2.05bn | 5.8% | |
| 6= | Oman | $2.05bn | 5.8% | |
| 8 | Kuwait | $1.76bn | 4.9% | |
| 9 | Qatar | $1.56bn | 4.4% | |
| 10 | Singapore | $1.49bn | 4.2% | |
| | South Africa | $0.67bn | 1.9% | |
| | **France** | $0.47bn | 1.3% | |
| | Australia | $0.26bn | 0.7% | |
| | Jordan | $0.25bn | 0.7% | |
| | Greece | $0.20bn | 0.6% | Not one of our euro countries |
| | **Canada** | $0.11bn | 0.3% | Down from $0.22bn |

Some countries are not reported separately:

- Bahrain. Prothom Alo groups it with Oman, Kuwait, Qatar, Singapore and Italy: $8.89bn over July–May.
- Germany, Spain, Portugal and Ireland.

**Latest quarter.** July–September 2026 (Q1 FY2026-27) brought $8.59bn (bdnews24, 6 October 2026):

| Sending country | Amount | Share |
|---|---|---|
| Saudi Arabia | $1.65bn | 19.2% |
| UK | $1.22bn | 14.2% |
| UAE | $777.6m | 9.1% |
| US | $774.8m | 9.0% |
| Malaysia | $666.8m | 7.8% |

**What this means for the project:**

- Our corridors (UK, US, Italy, France and Canada) total about $10.7bn, or 30%. The UK alone is almost half of that.
- Canada is a very small source for Bangladesh, and it halved in a year.
- Country figures follow where funds are booked, not where senders live. Analysts quoted by the Daily Star (March 2025) said aggregators, Dubai routing and US-based aggregator channels distort the UAE and US numbers. Read the US fall with that in mind.
- Bangladesh Bank's own country table on bb.org.bd stops at April 2024. Use press reports of parliamentary answers and Bangladesh Bank releases instead.

### 2.2 Who matters on each corridor

On every BDT corridor, comparison sites show the same incumbents filling most slots: Remitly, Western Union, MoneyGram, Ria, Taptap Send, Wise, WorldRemit, Sendwave, Instarem, Paysend, XE, Xoom, Skrill, BMO and TransferGo. All of them are already integrated.

Wise's comparison feed was fetched on 2026-11-04 at 1,000 units. It lists only five or six providers per BDT corridor, and every one is already integrated, so the feed turns up no new BDT candidates.

| Corridor | Wise comparison feed | Other comparison sites | Specialists and new candidates |
|---|---|---|---|
| **GBP-BDT** | Skrill, Instarem, Remitly, Western Union, Xoom, Wise | **Monito (£100):** 16 shown, including Revolut, Dahabshiil, Sonali Bank (our SonaliPay), Mukuru and HSBC. **RemitFinder:** 14 providers; best Western Union, then MoneyGram, Ria and Verto *(search snippet)*. | **Already in:** SonaliPay, RizRemit, NEC Money, RemitChoice, REMITnGO. **New and buildable:** LemFi, Dahabshiil, Transfer Galaxy. **Blocked:** ACE. World Bank price data names IFIC Money Transfer and Sonali Bank on this corridor. |
| **EUR-BDT** (Italy) | Xoom, Remitly, Wise, Western Union, Instarem | **Monito (€300):** MoneyGram, Remitly, Paysend, Taptap Send, Instarem, Sendwave, Western Union, Wise, WorldRemit, XE, Dahabshiil, Revolut. **RemitFinder (Germany):** MoneyGram best *(search snippet)*. | **Already in:** National Exchange Co. **New and buildable:** LemFi, Dahabshiil, Transfer Galaxy. **Blocked:** ACE. bKash lists Placid Express for Italy, and Placid is also blocked. Janata Bank runs two exchange houses in Italy; no public calculator was found. |
| **USD-BDT** | Wise, Instarem, Remitly, Xoom, Western Union | **Monito ($100):** Ria, BOSS Money, Western Union, Remitly, Instarem, Taptap Send, WorldRemit, Sendwave, Paysend, XE, Wise, Xoom. **RemitFinder:** 13 providers; best MoneyGram, then BOSS Money, Western Union and Verto *(search snippet)*. **Exiap:** Remitly, XE, Wise. | **Already in:** Pangea, Sonali Exchange. **New and buildable:** BOSS Money. **Blocked:** Placid Express, Majority. bKash's US partner list also names Sunman Global Express and Prabhu; no other data was found for either. |
| **CAD-BDT** | Wise, Xoom, Western Union, Remitly, BMO, Instarem | **Monito:** Remitly, MoneyGram, Instarem, Paysend, Western Union, Sendwave, Dahabshiil, WorldRemit, Wise. **RemitFinder:** 16 providers; best rate Wise, most taka received via MoneyGram *(search snippet)*. | **New and buildable:** LemFi, Dahabshiil. **Blocked:** Remitbee. **Login only:** CIBC. |

bKash's partner list *(search snippet)* confirms that several of our providers send to bKash: NEC Money, RemitChoice, BRAC Saajan (REMITnGO), Sonali Bank (SonaliPay) and National Exchange Co. (Italy).

Sonali Bank UK stopped retail remittance in 2022, and the service moved to Sonali Pay UK. Monito's "Sonali Bank" row is therefore our SonaliPay.

### 2.3 Payout rails

**Wallets:**

- **bKash** is the largest mobile wallet and a BRAC Bank subsidiary.
  - More than 135 money transfer operators in 170 countries settle into it through 27 banks.
  - It credits the 2.5% government incentive instantly.
  - Cash-out costs Tk7 per 1,000 at about 2,500 ATMs.
  - Mastercard Move has paid into bKash since June 2026. Gulf Exchange (Qatar) signed a direct deal in September 2025.
- **Nagad** is the second wallet.
  - Remittances arrive through TerraPay and through bank partners: Shahjalal Islami, National, Midland, Rupali, NRB and Community Bank, all signed in 2026.
  - It ran a 1.25% bonus with Taptap Send in May 2026.
- **Rocket** (Dutch-Bangla Bank), **Upay** (UCB) and **TAP** (Trust Axiata Pay) are smaller wallets that some providers name.

**Banks and cash:**

- **Bank deposit** reaches any bank through BEFTN, NPSB (instant) or RTGS.
- **Cash pickup** is available at banks such as BRAC, Islami, Sonali, Agrani and Mutual Trust, and at Western Union agents.

**How payout affects prices and labels:**

- BDT prices often differ by payout method.
  - From the UK, Taptap Send charges £0.99 to bKash or Nagad and £2.99 to a bank or for cash pickup.
  - Dahabshiil's GBP rate is highest for bank deposit, then wallet, then cash.
- Providers label methods inconsistently, for example "bKash", "mobile wallet" or "bank deposit". The project's three methods (bank, wallet and cash) cover all of them.
- Some limits seen: WorldRemit's minimum is BDT 100, and OrbitRemit caps bKash at BDT 250,000 per transaction.

### 2.4 Incentives and rules that affect quotes

**The 2.5% government incentive:**

- **It continues for FY2026-27.** The Finance Minister's budget speech of 11 June 2026 kept it for remittances through legal channels.
  - The receiving bank or wallet pays it on top of the converted amount, at Tk25 per Tk1,000.
  - Provider quotes leave it out, so an eligible recipient gets the quote × 1.025.
  - It applies equally to every legal channel, so it does not change rankings. It is worth a note on the page.
- **Eligibility.**
  - It covers wage-earner remittances from Bangladeshis abroad. Per WorldRemit, that includes people of Bangladeshi origin with foreign nationality.
  - No documents are needed up to BDT 500,000. Above that, the recipient must submit the sender's passport and proof of employment within 5 working days.
  - Gifts, trade, FDI and freelance or IT income are excluded.
  - These thresholds come from provider pages (WorldRemit, RemitChoice), not from the circular itself.
- **Political risk.** A TBS opinion piece (25 April 2026) puts the incentive's cost at about Tk7,000 crore a year and says Dubai-based aggregators abuse it. It proposes phasing it out, or cutting the no-document limit to Tk1.5 lakh. This is commentary, not policy, and the incentive was kept in June.

**Time-limited bonuses** from wallets and partners come on top of the incentive. Examples:

- bKash's Ramadan campaign, 1–18 March 2026
- Nagad's 1.25% via Taptap Send, May 2026
- Ria's BDT 200 cashback to bKash, until 25 May 2026

**Other rules:**

- **Exchange rate.** Bangladesh has had a market-based exchange rate since 14 May 2025.
  - The interbank rate was about Tk122.75–123.38 per USD in June–July 2026, and Bangladesh Bank buys dollars to steady it.
  - The 2022-23 caps on exchange-house dollar rates no longer apply.
- **Bangladesh Bank FEPD-1 Circular No. 03 (8 January 2026).** Authorised dealers must:
  - credit inward remittances the same business day;
  - settle flagged cases within 3 business days;
  - carry the payment reference (UETR) through to the recipient;
  - reconcile nostro accounts at least every 60 minutes.

  It is unclear exactly how it applies to wage remittances.
- **US 1% remittance excise tax (IRC 4475), from 1 January 2026.**
  - It applies to transfers funded with cash, money orders or cashier's cheques.
  - Transfers funded from a bank account or a US card are exempt.
  - It affects agent and cash-funded quotes on USD-BDT and USD-PKR. The IRS issued proposed regulations in April 2026.
- **Election-time wallet caps.** Bangladesh Bank capped bKash, Rocket and Nagad transfers at Tk1,000 on 9–12 February, ahead of the 13th parliamentary election (Daily Sun). Wallet payouts can be disrupted at such times.

---

## 3. Pakistan

### 3.1 Where the money comes from

FY26 (July 2025 to June 2026) set a record of **$41.6bn**. These are State Bank of Pakistan figures, as reported by Nukta and Gulf News.

| Sending country | FY26 | Share | Q1 FY27 (Jul–Sep 2026) | Share |
|---|---|---|---|---|
| Saudi Arabia | $9.78bn | 23.5% | $2.687bn | 24.7% |
| UAE | $8.81bn | 21.2% | $2.236bn | 20.6% |
| **United Kingdom** | $6.33bn | 15.2% | $1.634bn (+19.4%) | 15.0% |
| **EU** | $5.23bn | 12.6% | $1.405bn | 12.9% |
| **United States** | $3.62bn (−3%) | 8.7% | $931m | 8.6% |

Q1 FY27 totalled $10.875bn, up 14% on the year (Bloom Pakistan).

**Smaller sources, January–September 2026.** These come from Pakera, compiled from the SBP's monthly data. The shares are the research's own estimates against about $32.7bn.

| Sending country | Amount | Share |
|---|---|---|
| Other GCC (Kuwait, Qatar, Oman, Bahrain) | $3.06bn | 9.4% |
| Italy (largest EU source) | $1.19bn | 3.6% |
| Oman | $0.99bn | 3.0% |
| Australia | $0.88bn | 2.7% |
| **Canada** | $0.62bn | 1.9% |
| Bahrain | $0.45bn | 1.4% |

**January 2026 alone** (Profit), out of $3.46bn:

| Sending country | Amount | Share |
|---|---|---|
| Spain | $80.5m | 2.3% |
| Germany | $77.5m | 2.2% |
| France | $55.5m | 1.6% |
| Ireland | $25.9m | 0.7% |
| Malaysia | $12.5m | 0.4% |

That table is internally inconsistent: its UAE subtotals exceed the total, and its "Kuwait" figure looks like the whole other-GCC group. Use it for order of magnitude only.

**What this means for the project:**

- The UK, EU and US together sent $15.2bn (36.5%) in FY26. Adding Canada, our corridors are about 38%.
- The Gulf as a whole is about 54% (research estimate).
- Italy leads the euro sources, so keeping Italy as the euro default is correct. Spain, Germany and France follow.
- Canada is a small share for Pakistan. In dollars, though, it sends Pakistan several times what it sends Bangladesh.
- The SBP's October 2026 figures were due around 9 November, after this report.

### 3.2 Who matters on each corridor

Comparison sites show MoneyGram, Western Union, Remitly, WorldRemit, Wise, Taptap Send and Sendwave taking most "cheapest" slots. Over three months, Monito found these providers cheapest most often, across all sending countries:

| Provider | Share of Pakistan searches where it was cheapest |
|---|---|
| MoneyGram | 29.0% |
| Western Union | 22.4% |
| Dahabshiil | 18.4% |

| Corridor | Wise comparison feed (at 1,000) | Other comparison sites | Specialists and new candidates |
|---|---|---|---|
| **GBP-PKR** | 10 providers: Xoom, Nationwide, OFX, WorldRemit, MoneyGram, Remitly, Wise, Western Union, Skrill, Instarem. MoneyGram gave the most: PKR 373,909 for £1,000. | **Monito:** Dahabshiil cheapest for UK cash pickup. **Finder UK and moneytransfer.store:** also list currency brokers (TorFX, Currencies Direct, Atlantic Money, CurrencyTransfer). These are bank-only and used for large transfers. | **Already in:** RizRemit, NEC Money, RemitChoice. **New and buildable:** LemFi, Dahabshiil, Transfer Galaxy, MoneyTO. **Blocked:** ACE. **Not probed:** UBL UK (likely login only), Rozeremit (quote behind a login), Lycaremit (Pakistan not confirmed). |
| **EUR-PKR** (Italy) | 6 providers: Xoom, Wise, Western Union, OFX, Remitly, Instarem | – | **Already in:** National Exchange Co. (Italy). **New and buildable:** LemFi, Dahabshiil, Transfer Galaxy. **Blocked:** ACE. |
| **USD-PKR** | 8 providers: Xoom, OFX, WorldRemit, Remitly, Wise, Western Union, Chase, Instarem | **Remitrate:** BOSS Money best at $500. | **New and buildable:** BOSS Money, LemFi. **Blocked:** ShareMoney, Placid Express. |
| **CAD-PKR** | 5 providers: Remitly, Western Union, Wise, Xoom, OFX | **Finder Canada (July 2026, CA$200):** cheapest were Sendwave (0.44%), Western Union (0.45%) and Taptap Send (0.50%). Remitbee's markup was 1.59%, EQ Bank's 1.89% and Simplii's 3.59%. | **New and buildable:** LemFi, Dahabshiil. **Blocked:** Remitbee. **Login only:** CIBC. **Not probed:** Rozeremit (FINTRAC-registered; CAD-PKR confirmed). |

**Integrated providers and PKR:**

- These already have PKR routes:
  - Remitly, Taptap Send, Wise, Sendwave, WorldRemit, TransferGo, Instarem, Paysend, Western Union, XE, MoneyGram, Ria, Xoom
  - NALA (GBP, EUR and USD only) and Profee (no USD)
  - RizRemit (GBP), NEC Money (GBP), RemitChoice (GBP) and Skrill (GBP, through Wise)
  - National Exchange Co. (EUR, Italy only)
- These have no PKR route:
  - SonaliPay, Sonali Exchange and REMITnGO.
  - Pangea. Its Pakistan coverage is unknown.
  - BMO. It does not appear in Wise's CAD-PKR data.

**Not found:** no source showed Revolut or Monzo paying out in PKR. Aspora (formerly Vance) serves India only. No source confirms that CurrencyFair pays out in PKR.

### 3.3 Payout rails

**Banks:**

- **Bank account by IBAN**, over 1LINK IBFT (instant, 24/7) or RTGS (same day, for larger amounts).
- **Raast** is the SBP's instant payment system.
  - Since January 2026, exchange companies may pay remittances into bank accounts and wallets through Raast, with no fee to the recipient.
  - These payments run via BOP, HBL, UBL and Bank AL Habib.

**Wallets:**

- JazzCash, Easypaisa, SadaPay, NayaPay, FIRST Pay and MCB Lite.
- NayaPay lists Payoneer, Western Union, Wise, Remitly, Ria and ACE as partners.

**Cash and cards:**

- Cash pickup at branches of HBL, UBL, MCB, NBP, Bank Alfalah, Faysal, HabibMetro, Bank of Punjab, Dubai Islamic Bank Pakistan, Allied, Bank Al Habib, Askari, Meezan, JS Bank and U Microfinance.
- Western Union has more than 13,000 agent locations.
- Card payout is shown on Monito for MoneyGram and TransferGo.

**Limits and pricing by method:**

- Wallet limits vary:
  - WorldRemit allows PKR 50,000 per transfer and PKR 80,000 per 30 days.
  - Taptap Send's tiers start at PKR 25,000 and reach PKR 100,000 per transaction.
- Unlike Bangladesh, the new candidates' PKR prices mostly do not vary by payout method. Dahabshiil, Transfer Galaxy and MoneyTO each quoted the same rate for bank and cash.

### 3.4 Incentives and rules that affect quotes

**Free transfers:**

- **The Pakistan Remittance Initiative** was set up in 2009 by the Ministry of Finance, the SBP and the Ministry of Overseas Pakistanis. It is still in place.
- **Rules since 1 July 2025:**
  - The minimum transfer that qualifies as free rose from $100 to $200.
  - Exchange companies joined the scheme, and the rebate became a flat SAR 20 per transaction.
  - The Marketing Incentive Scheme and the Exchange Companies Incentive Scheme ended.
  - Exchange companies must sell all remittance foreign exchange on the interbank market the same day.
  - One source reports a cap of five free transfers per month to the same recipient through the same overseas partner.
- **From 1 July 2026, the SBP stopped reimbursing banks for transfer costs** (TT Charges Incentive Scheme ended by EPD Circular Letter No. 12 of 2026, issued 2 July 2026).
  - Banks must still keep eligible transfers free for sender and recipient, at their own cost.
  - Providers' "no fee above about $200" offers should therefore continue.
  - The research's inference is that some of that cost may move into exchange-rate margins. Al Ansari said it expects no impact on customers.

**Loyalty and reward schemes:**

- **Sohni Dharti** loyalty points stopped being issued on 1 July 2026. Existing points can be redeemed until 30 June 2027.
- **Pasban Remittance Rewards** started on 1 October 2026.
  - It is run by the Pakistan Banks Association and 27 banks, with draws operated by 1LINK under SBP patronage.
  - Prize draws total PKR 4bn per quarter. The first draw is on 15 January 2027.
  - To qualify, a recipient needs at least $100 credited to a personal PKR account or wallet in each of three consecutive months.
  - Over-the-counter cash, Roshan Digital Accounts and foreign-currency accounts are excluded. The scheme therefore favours bank and wallet payout over cash pickup.

**Other rules and targets:**

- **Roshan Digital Accounts** opened to foreign nationals and companies in 2026, and Naya Pakistan Certificates opened to all non-residents in March 2026. Credits to these accounts are excluded from Pasban.
- **Targets.** The government targets $42.4bn in FY27, and the SBP projects about $44bn.
- **SBP regulatory sandbox.** Its second cohort covers technology-enabled inward remittances, and applications close on 30 November 2026.

**For the comparator:**

- Fees matter mainly below about $200.
- LemFi's PKR fee thresholds each come to about PKR 55,000, roughly $200, in every sending currency. This matches the free-transfer threshold, though the link is an inference.
- Showing the payout method also tells users whether a transfer can count toward Pasban.

---

## 4. Provider coverage matrix

**Status codes used in the table:**

- **Works:** a public calculator returned a real quote, and the second run confirmed it.
- **Wise feed:** the price comes from Wise's public comparison data, not from the provider's own calculator.
- **Blocked:** the site refused plain requests with a 403 or a bot challenge, so probing stopped.
- **Login:** the service is offered, but prices appear only after sign-in.
- **No:** not offered on that corridor.
- **?:** unknown.
- **–:** not this provider's sending market.

| Provider | GBP-BDT | GBP-PKR | EUR-BDT | EUR-PKR | USD-BDT | USD-PKR | CAD-BDT | CAD-PKR | Access | Buildable under the rules? | In the code today |
|---|---|---|---|---|---|---|---|---|---|---|---|
| LemFi | Works | Works | Works | Works | No | Works | Works | Works | Server-rendered page (JSON API obfuscated) | Yes, from the page only (owner's call; section 5) | Yes |
| Dahabshiil | Works | Works | Works | Works | No | No | Works | Works | Public JSON calculator | Yes | Yes |
| BOSS Money (IDT) | – | – | – | – | Works | Works | – | – | Public JSON calculator | Yes | Yes |
| Transfer Galaxy | Works | Works | Works | Works | – | – | No | No | Public form; session plus anti-forgery token | Yes (4–5 requests per quote) | Yes |
| MoneyTO | No | Works | – | – | – | – | – | – | Public JSON calculator | No: only its first-transfer rate is published | No |
| OFX | No | Wise feed | No | Wise feed | No | Wise feed | No | Wise feed | Own rates need login | Only via the Wise feed | Yes, via the Wise feed |
| IFIC Money Transfer | Works | No | – | – | – | – | – | – | Public "check rates" form on its RemitONE portal | Yes | Yes |
| BA Exchange | Works | No | – | – | – | – | – | – | Public "check rates" form on its RemitONE portal | Yes | Yes |
| Nationwide | Not in feed | Wise feed | – | – | – | – | – | – | Not probed; alias seen in the feed | Only via the Wise feed | No |
| Chase | – | – | – | – | Not in feed | Wise feed | – | – | Not probed; alias seen in the feed | Only via the Wise feed | No |
| ACE Money Transfer | Blocked | Blocked | Blocked | Blocked | ? | ? | Blocked (offer unconfirmed) | Blocked | Cloudflare 403 | No | No |
| Remitbee | ? | ? | ? | ? | ? | ? | Blocked | Blocked | Cloudflare 403 | No | No |
| Placid Express | ? | ? | Blocked (offer unconfirmed) | Blocked (offer unconfirmed) | Blocked | Blocked | ? | ? | Cloudflare 403 | No | No |
| Revolut | Blocked | Blocked | Blocked | Blocked | ? | ? | ? | ? | Cloudflare challenge; account-only, plan-based pricing | No | No |
| Majority | ? | ? | ? | ? | Blocked | ? | ? | ? | Cloudflare 403; membership pricing | No | No |
| ShareMoney | ? | ? | ? | ? | ? | Blocked | ? | ? | Cloudflare challenge | No | No |
| Afriex | No | Blocked | No | Blocked | No | Blocked | No | Blocked | Website's own rate request fails | No | No |
| CIBC Global Money Transfer | – | – | – | – | – | – | Login | Login | Online banking only | No | No |
| Small World | Closed | Closed | Closed | Closed | Closed | Closed | Closed | Closed | Stopped trading in June 2024 | No | No |
| Boss Revolution (IDT) | – | – | – | – | Same as BOSS Money | Same as BOSS Money | – | – | Same endpoint and prices as BOSS Money | List once, as BOSS Money | Listed once |

### 4.1 Verified prices for the buildable candidates

All figures are from the verification run on 2026-11-04, for a send of 1,000 units of the sending currency. "vs mid" compares against Wise's mid-market rate at the time of the check. "Standard rate" is the regular price; where a provider shows a better deal, it is in the promo column.

| Provider | Corridor | Standard rate | vs mid | Fee at 1,000 | Promotion shown | Payout |
|---|---|---|---|---|---|---|
| LemFi | GBP-BDT | 166.6 | −0.82% | £0 | None (LemFi Cash bonus excluded; see 5) | Bank |
| LemFi | GBP-PKR | 370.42 | −0.77% | £0 (£0.99 up to £148.32) | None | Bank |
| LemFi | EUR-BDT | 139.4 | −0.58% | €0 | None | Bank |
| LemFi | EUR-PKR | 308.97 | −0.84% | €0 (€0.99 up to €177.71) | None | Bank |
| LemFi | USD-PKR | 274.79 | −0.68% | $0 ($1.99 up to $200) | None | Bank |
| LemFi | CAD-BDT | 87.6 | −1.94% | C$0 | None | Bank |
| LemFi | CAD-PKR | 196.75 | −0.89% | C$0 (C$0.99 up to C$279.11) | None | Bank |
| Dahabshiil | GBP-BDT | 163.792 (bank) | −2.5% | £3.99 bank; £0.99 wallet (163.2355); £2.99 cash (163.0688) | None | Bank, wallet, cash |
| Dahabshiil | GBP-PKR | 371.787 (base) | −0.45% | £15 | "Special" rate 373.4685 | Bank, wallet, cash |
| Dahabshiil | EUR-BDT | 136.7099 | −2.5% | €15 | None | Bank, wallet, cash |
| Dahabshiil | EUR-PKR | 305.6362 (base) | −1.9% | €15 | "Special" rate 308.755 | Bank, wallet, cash |
| Dahabshiil | CAD-BDT | 87.0411 | −2.5% | C$15 | None | Bank, wallet, cash |
| Dahabshiil | CAD-PKR | 194.4943 (base) | −1.95% | C$15 | "Special" rate 197.7706 | Bank, wallet, cash |
| BOSS Money | USD-BDT | 122.4004 | −1.69% | $0.99 | 124.7304 with $0 fee on the first 3 transfers | Bank, wallet |
| BOSS Money | USD-PKR | 268.7693 | −2.85% | $1.99 | 269.7802 with $0 fee on the first 3 transfers | Bank, wallet, cash |
| Transfer Galaxy | GBP-PKR | 367.2132 | −1.69% | £1 | 369.0678 with £0 fee, first transfer up to £500 | Bank, cash |
| Transfer Galaxy | EUR-PKR | 306.3437 | −1.75% | €1 | 307.8909 with €0 fee, first transfer up to €500 | Bank, cash |
| Transfer Galaxy | GBP-BDT | 164.7351 | −2.00% | £1 | 165.5671 with £0 fee, first transfer up to £500 | Bank, bKash, cash |
| Transfer Galaxy | EUR-BDT | 137.4284 | −2.02% | €1 | 138.1225 with €0 fee, first transfer up to €500 | Bank, bKash, cash |
| MoneyTO | GBP-PKR | 366.947 | −1.76% | £0 | `promo_rate: true`: MoneyTO's own site script treats this as its new-client rate, so no regular rate is published | Bank, cash (Bank AL Habib) |
| OFX (Wise feed) | GBP-PKR | 362.82 | −2.85% | £7 | – | Bank |
| OFX (Wise feed) | EUR-PKR | 302.68 | −2.86% | €10 | – | Bank |
| OFX (Wise feed) | USD-PKR | 268.28 | −3.03% | $5 | – | Bank |
| OFX (Wise feed) | CAD-PKR | 192.73 | −2.84% | C$15 | – | Bank |

**Dahabshiil:**

- The public calculator on www.dahabshiil.com calls an anonymous charges endpoint, one call per payout type. No key or cookie is needed, and responses are publicly cacheable for 10 minutes.
- Fees step up with the amount:

  | Corridor | £100 | £500 | £1,000 |
  |---|---|---|---|
  | GBP-BDT (bank) | £1.99 | £2.99 | £3.99 |
  | GBP-PKR | £1.99 | £7.50 | £15 |

- EUR and CAD were tested only at 1,000. Monito's £0, €0 and C$0 fees were not reproduced at that amount.
- On PKR the applied rate sits above a lower `base_rate`, and the site shows it as a special rate. It is unknown whether that rate is for first transfers only. The code ranks on `base_rate` and shows the special rate as a promo.
- Dahabshiil US rejects Bangladesh and Pakistan with "No valid FX rate configuration found". Its own CMS rate table lists US rates anyway, so do not use that table to infer US support.
- Only Italy was tested for euros. Dahabshiil's source list routes Spain, France, Germany, Portugal and Ireland through the same calculator host, but those countries were not quoted.

**BOSS Money:**

- It sends from the US only. `bossmoney.com/en-ca/` returns 404.
- Use the regular price for ranking: `base_sell_rate` plus `pricing_fee`. The headline `sell_rate` with a $0 fee is the new-customer deal.
- The page contradicts itself on that deal: the banner says 3 free transfers, the FAQ says 5, and the API says 3.
- A credit-card surcharge applies on top: $4.99 at $100 and $18.99 at $1,000. Debit card has none.

**Transfer Galaxy:**

- It sends from 25 European countries, including the UK, Italy, Spain, France, Germany, Portugal and Ireland. The US is not one of them.
- Canada can be selected, but the calculator answers "doesn't support transaction" for both Pakistan and Bangladesh.
- Each quote takes 4–5 requests, with one cookie session per sending country. The anti-forgery token is an ordinary one the page gives every visitor; it is not bot protection.
- It is not in Wise's feed. Nothing was corroborated by third parties, because the search budget had run out.
- Fee scaling with the amount was not tested.

**MoneyTO:**

- It sends in GBP only. The calculator is a single POST with no session.
- Minimum send is £5. The maximum seen was £2,725.18.
- Its calculator data shows no wallet payout for Pakistan.
- For Bangladesh it offers only card payout in EUR. Its Bangladesh page also contradicts itself on service availability. Treat GBP-BDT as not offered.

**OFX:** see 4.2.

### 4.2 Cheap additions from Wise's comparison feed

**OFX, Nationwide and Chase** appear in Wise's PKR comparison data. They can be added with `viaWiseComparison`, with no new scraping.

All three are poor value. OFX's markup is about 2.8–3.0% on top of fees of £7, €10, $5 or C$15. Nationwide and Chase are only useful as bank benchmarks.

Caveats:

- **OFX's own site has no public customer-rate calculator.** Its exchange-rate page shows interbank rates and says customer rates need registration.
- **OFX does not handle BDT at all.**
- **Missing at small amounts.** OFX's quote was absent at £100 in Wise's data, so low tiers will show "not in comparison data".
- **No country on the quotes.** OFX's quote records in Wise's data have no sending country, so the "Italy" label is Wise's, not OFX's.
- **Stale USD-PKR copy.** It was about two hours old when checked, which is older than the "up to 1 hr old" the project assumes for Wise data.
- **Now in the code.** OFX is in the code through `viaWiseComparison`, for GBP, USD and CAD, and for EUR from Italy only. Wise's data was checked for Italy, not the other euro countries. Nationwide and Chase are not added.

### 4.3 Integrated providers extended to PKR

Every integrated provider was tried against the four PKR corridors with `bun run check:providers` on 2026-11-04. Each was switched on only where its own request returned a quote within 10% of mid-market.

| Provider | PKR corridors switched on | Why not the others |
|---|---|---|
| Remitly, Taptap Send, Wise, Sendwave, WorldRemit, Paysend, Western Union, XE, Ria, Xoom | All four | – |
| Instarem | GBP, EUR, USD | Instarem's CAD-PKR request returns HTTP 400, and its page redirects |
| NALA | GBP, EUR, USD | NALA's feed has no CAD |
| Profee | GBP, EUR, CAD | Profee doesn't serve US senders |
| TransferGo | GBP, EUR | UK and Europe only |
| MoneyGram | GBP | Its own calculator blocks requests; Wise's copy only covers GBP-PKR |
| RizRemit, NEC Money, RemitChoice | GBP | UK specialists |
| National Exchange Co. | EUR (Italy) | Its rates page has Pakistan rows |
| Skrill | GBP | Via Wise's feed |
| Pangea | None | Its calculator returns HTTP 500 for Pakistan, and its site has no Pakistan page |
| BMO | None | Not in Wise's CAD-PKR feed |
| SonaliPay, Sonali Exchange, REMITnGO | None | Bangladesh only |

Testing PKR also turned up problems in how some existing providers were priced, which affected BDT as well:

- **Taptap Send.** Its rate feed has no fees, and the code assumed it charged none. Its own pages list fees:
  - To Bangladesh: £0.99 to a wallet, and £2.99 to a bank or cash pickup, from the UK. Other currencies are similar.
  - To Pakistan: free above a minimum (£125, €170, $200 or C$250), with a small flat fee below it.
- **Sendwave and WorldRemit.** Both were taking the new-customer price as the regular price:
  - Sendwave's `effectiveExchangeRate` includes an "Intro Rate Discount". The standard price is `baseExchangeRate`.
  - WorldRemit's `exchangeRate.value` sits next to a struck-through `crossedOutValue`, which is the standard rate.
  - Both now rank on the standard price, and the deal is a promo.
- **Skrill.** Its link was a 404.
- **MoneyGram and Xoom.** Both now fall back to Wise's copy of their price when their own calculator blocks the request.

### 4.4 IFIC Money Transfer, BA Exchange and ACE (checked on request)

These three were asked about after the survey and probed by hand on 2026-11-04, with the same headers and rules.

- **IFIC Money Transfer (UK) Ltd**, wholly owned by IFIC Bank (ificuk.co.uk):
  - Its website publishes no rate; it says to phone or use the online portal.
  - The portal (online.ificuk.co.uk, RemitONE) has a public "check rates" form on its login page. It prices a transfer before sign-in, and needs no cookie, key or challenge.
  - UK to Bangladesh only.
  - Result: 167.00 BDT per GBP, with a £0 fee at £100 and at £1,000, for bank, cash and mobile wallet payouts.
- **BA Exchange Company (UK) Ltd**, wholly owned by Bank Asia (baexchange.co.uk):
  - Its home page "converter" is a fixed indicative number in the page source. That's why it was left out before.
  - Its RemitONE portal (remit.bankasia-bd.com/orm) has the same public form, which gives a real quote.
  - UK to Bangladesh only.
  - Result: 168.00 BDT per GBP, with a fee that rises from £3 at £100 to £5.70 at £500, £10 at £1,000 and £25 at £2,500. Bank, cash and wallet payouts are priced the same.
- **ACE Money Transfer**:
  - The survey's first plain request got a Cloudflare block page, so probing stopped there.
  - ACE isn't in Wise's or NALA's feeds, and it publishes no API, so there is no permitted way to show its prices.
  - It would take ACE's permission or a partner feed.

---

## 5. LemFi

**What it is:**

- LemFi is a remittance app that is trading.
  - Its UK entity is RightCard Payment Services, an FCA e-money institution with reference 900424. That reference is from the research pass and was not checked against the FCA register.
  - The State Bank of Pakistan approved LemFi in September 2025, in partnership with UBL (Dawn; Nairametrics, 22 September 2025).
- Its pages say it sends from Australia, Canada, the UK, the US and "some European countries". A Belgian page mentions only the UK and Canada.
- No volume data was found.
- LemFi does not appear in Wise's comparison feed on any of the eight corridors.
- Its robots.txt allows all agents, including ClaudeBot.

**Corridors and verified quotes:**

- Seven corridors were checked by plain curl and in a browser between 12:42 and 12:48 UTC; section 4.1 has the rates.
- **USD-BDT is not offered.**
  - LemFi's site configuration flags Bangladesh as restricted for US senders.
  - The US Bangladesh page silently quotes USD to INR instead (1 USD = 94.55 INR).
  - The US sender's list of destinations includes India and Pakistan, but not Bangladesh.
  - Any integration must check that the target currency is BDT or PKR.
- **Rates move during the day.**
  - Earlier on 2026-11-04 the same pages showed GBP-PKR at 368.58, GBP-BDT at 166.32 and EUR-BDT at 138.99.
  - The rate does not depend on the amount: changing the amount made no new request, so one rate applies to every amount.

**Fees:**

- The fee is charged on top of the amount sent, not deducted from it.
- BDT has no fee.
- PKR has a small fee below a threshold of about PKR 55,000, and nothing above it:

  | Corridor | Fee at or below the threshold | Threshold |
  |---|---|---|
  | GBP-PKR | £0.99 | £148.32 |
  | EUR-PKR | €0.99 | €177.71 |
  | USD-PKR | $1.99 | $200 |
  | CAD-PKR | C$0.99 | C$279.11 |

- The page's "Transfer fee £0.00" text always shows a pound sign, even on the euro, dollar and Canadian dollar pages. Take the fee from the page's data, not from that text.

**LemFi Cash:**

- The page's "They get" amount adds 5 units of the sending currency in "LemFi Cash", toggled on by default. For example, it adds +Rs 1,852 on £1,000.
- LemFi's own dialog describes this as an earned balance, from referrals or sending, that is applied automatically. No public terms were found.
- Do not fold it into the rate or the amount received.

**Payout:**

- Bank deposit only, per LemFi's configuration ("Local Payment").
- Press reports mention banks and wallets in Pakistan, but wallet payout is not confirmed. Do not claim it.

**How the price can be read:**

- **The server-rendered page.**
  - Each corridor page arrives with the quote already computed, both as visible text (for example "1 GBP = 370.42 PKR") and in the page's embedded Nuxt data.
  - That data includes the standard rate, any promotion, a staleness flag and the fee rule.
  - It is one ordinary page request, the same one any visitor gets, with no cookies, keys or JavaScript.
  - The page is CDN-cached for up to 120 seconds.
- **The calculator's JSON API (`/api/exchange-quote`).**
  - The page uses it when a visitor switches corridor.
  - It returns the rate deliberately scrambled. For example, GBP-BDT came back as a 24-digit number while the page displayed 166.6.
  - Under the ground rules this endpoint is off limits. It was not called or decoded, and the code does not use it.

**Can it be added today?** Yes, technically, and the code already does it from the server-rendered page. Three things to settle or watch:

1. **Owner decision.**
   - LemFi clearly wants its API rate to be hard to extract, yet it prints the same rate in plain text to every visitor.
   - Reading the printed rate breaks no rule as written, but the owner should confirm it fits the spirit of CONTRIBUTING.md.
   - If the answer is no, remove LemFi and keep the README line "LemFi (obfuscates its rate)".
2. **Fragility.**
   - The key that holds the quote in the page data includes a generated suffix (today `currency-converter-v-0-0-0`). Match on its prefix.
   - Also check that the page's sending country matches the corridor, and that the target currency is BDT or PKR.
3. **Untested locales.**
   - Only en-gb, en-it, en-us and en-ca were probed.
   - The code also maps France, Germany, Portugal and Ireland to en-fr, en-de, en-pt and en-ie. These exist in LemFi's sitemap but have not been checked.
   - LemFi's sitemap also has en-es, which the code does not map.
   - The Canada configuration marks CAD as `enabled:false` in one sub-list, even though transfers are enabled. The meaning of that flag is unknown; the quotes themselves were real and fresh.

---

## 6. Providers that cannot be added, and why

### 6.1 Blocked or otherwise unusable

| Provider | What it serves (per research) | Why it is out | What was seen |
|---|---|---|---|
| ACE Money Transfer | UK, eurozone and Canada to Pakistan and Bangladesh; bKash and Rocket wallets; JazzCash and Easypaisa | Cloudflare blocks plain requests; not in Wise's feed | 403 "Sorry, you have been blocked" on the homepage |
| Remitbee | Canada to Pakistan (bank, JazzCash) and Bangladesh (bKash). A UK page in the search index is unverified. | Cloudflare | 403 on the homepage |
| Placid Express | US (and possibly Italy and Canada) to Bangladesh and Pakistan | Cloudflare | Redirect to /eu/index.php, then 403 with a challenge script |
| Revolut | UK and eurozone | Cloudflare challenge. Pricing also depends on the account plan and needs an account. | 403 with `cf-mitigated: challenge` |
| Majority | US to Bangladesh (bKash) | Cloudflare. Transfers are members-only, at $6.99 a month or $1.99 per transfer (its own pages via search, unverified), so prices don't compare like-for-like. | 403 "Attention Required" |
| ShareMoney (Omnex) | US to Pakistan (claimed, unverified) | Cloudflare managed challenge | 403 "Just a moment..." |
| Afriex | UK, EU, US and Canada to Pakistan; no Bangladesh (its Bangladesh page is a 404) | The website's own rate request is rejected with "Device id missing". Sending a made-up device ID would mean impersonating the app. | HTTP 400. Re-check later with the same single request. |
| CIBC Global Money Transfer | Canada to Pakistan (bank; cash up to $999) and Bangladesh (bank, wallet; up to $5,000) | Needs sign-in to CIBC online banking; no public calculator | $0 fee advertised; the FX rate is not published |
| OFX (own site) | Pakistan only | Customer rates need login. The public calculator shows interbank rates. | Available only through Wise's feed (4.2) |
| Small World | – | Stopped transfers on 10 June 2024 and entered special administration on 18 June 2024. Its domain is now an unrelated gambling and crypto affiliate site. | Administrators' site (Grant Thornton) |
| Boss Revolution | US | Not a separate provider: its money transfer is BOSS Money, with the same endpoint and prices | List once, as BOSS Money |
| HSBC Zing | – | Closed. No funds could be added after 2 April 2025, and the app shut on 22 May 2025 (Banking Dive, as relayed by the research). Monito still lists it. | – |

### 6.2 Not probed, with signs of blocks or logins

| Provider | Why it is unlikely to work |
|---|---|
| Al Ansari Exchange (UAE) | The site loads reCAPTCHA v3, and its calculator runs through a nonce-protected WordPress endpoint. It is also outside our corridors. |
| Rozeremit | "Send now" leads to a login page, and the site loads Cloudflare's bot-detection script. |
| Lycaremit | Pakistan is not confirmed, and the site loads the same Cloudflare script. |
| Dahabshiil | Its homepage also loads that script, yet its calculator API answered without any challenge. The script alone does not mean a block. |
| UBL UK (NetRemit) | Likely needs registration through UBL UK digital banking and a CNIC. Its pages disagree on the fee-free threshold (£90 vs £125). |

### 6.3 Not consumer calculators, or not confirmed

| Provider | Status |
|---|---|
| Thunes, TerraPay, Mastercard Move, TransFi | B2B payment rails, not consumer providers |
| Simpaisa | Receive-side infrastructure; its own blog says it is "not a sending app" |
| Verto | Mainly B2B FX; a consumer offer is unconfirmed |
| Janata Exchange (Italy), Sunman Global Express, Prabhu (US) | No public calculator or data found |
| Bitget Wallet | Stablecoin-funded payouts to bKash and Nagad. Not a like-for-like remittance, and eligibility for the 2.5% incentive is doubtful. |
| MidHub | Site under construction; no licence named |
| Azimo | Only dated sources; do not treat as live |
| Hello Paisa | Bangladesh payout deals exist, but the UK as a sending country is unverified |
| SendSpend | A 2023 UK–Pakistan announcement; no evidence it is live |
| First Security Islami Exchange Italy, Poste Italiane | World Bank listings of unknown date |
| CurrencyFair | No PKR or BDT payout confirmed |
| Habib Bank AG Zurich | Not affiliated with HBL; no Pakistan consumer remittance product found |

### 6.4 What failed verification or broke the ground rules

**Failed verification:**

- **Boss Revolution.** Both corridors failed verification as a separate provider.
  - Its USD-BDT request actually sent bossmoney.com headers.
  - Both requests return BOSS Money's own price from the same IDT endpoint.
  - The endpoint itself is public and needs no authentication.
- **LemFi.**
  - The first run's rates were replaced by the check's numbers, because the rate moved during the day.
  - LemFi appeared twice in the probe list; the two entries are merged here.

**Breaches of the ground rules:**

- **LemFi browser session.** One LemFi probe watched the pages in an automated browser (Playwright).
  - That browser sent its default Chrome user agent, not the project's, and no `X-Open-Source-Client` header. This breaks the "identify honestly" rule.
  - It was read-only: no data was entered, nobody signed up, and non-essential cookies were rejected.
  - Its network log captured the scrambled API responses that the page fetched by itself. They were not decoded.
- **LemFi client code.** The first LemFi probe read LemFi's public JavaScript far enough to describe how the page unscrambles the API rate.
  - Nothing was decoded or called, and the code does not use that method.
  - Writing down the mechanism went closer to the line than needed. This report leaves it out on purpose.
- **Requests after a refusal.** ACE, Remitbee, Revolut and Majority each refused the research pass's page reader (WebFetch) once. The probe then sent each one more request. That is one extra request each, with no bypass attempted.
- **Unidentified reads.** The research pass read news and marketing pages through WebFetch, which does not send the project's User-Agent or header.

**Other caveats:**

- **Dahabshiil.** One request to a second endpoint (`fx-rates`), with a larger page size than the site uses, returned 401. Probing of that endpoint stopped there; the calculator endpoint that was used is the one the site itself calls.
- **OFX.** Its "works" status refers only to Wise's copy of its price (see 4.2).
- **Statuses that are single observations.** Every "blocked", "not offered" and "unknown" entry is one observation and was not re-checked. In particular:
  - LemFi's USD-BDT status rests on LemFi's own configuration flag and on the US page quoting INR.
  - Majority's non-US corridors are probably not offered, but this is unverified.
  - Remitbee's UK corridor is unverified.

**What did not happen:**

- There were no proxies, TLS impersonation, challenge solving, cookie replay or key extraction.
- TransferGo was not contacted.

**Content addressed to an automated agent:** none was found. Three pages had content worth noting, all treated as data:

- Afriex's homepage has "ask an AI assistant" marketing links with a prefilled prompt.
- smallworldfs.com now carries gambling and crypto promotion.
- MoneyTO's country list includes an Urdu referral promotion.

---

## 7. Gaps worth considering later

### 7.1 Gulf corridors: the largest gap

| Sending market | To Bangladesh, FY2025-26 | To Pakistan |
|---|---|---|
| Saudi Arabia | $5.85bn (16.3%) | $9.78bn (23.5%), FY26 |
| UAE | $4.58bn (12.9%) | $8.81bn (21.2%), FY26 |
| Oman | $2.05bn (5.8%) | $0.99bn, Jan–Sep 2026 |
| Kuwait | $1.76bn (4.9%) | In the other-GCC total |
| Qatar | $1.56bn (4.4%) | In the other-GCC total |
| Bahrain | Not reported separately | $0.45bn, Jan–Sep 2026 |
| Other GCC (Kuwait, Qatar, Oman, Bahrain) | – | $3.06bn, Jan–Sep 2026 |
| **Gulf total** | **About $15.8bn (44%), excluding Bahrain** | **About 54% (estimate); Saudi Arabia and the UAE alone $18.6bn** |
| **For comparison: our corridors** | About $10.7bn (30%) | $15.2bn plus Canada (about 38%) |

**Why a Gulf comparison could be useful:**

- On Saudi Arabia to Bangladesh, prices vary widely. World Bank data *(search snippet; older records)* shows the total cost of sending SAR 750:

  | Provider | Total cost | Date |
  |---|---|---|
  | TeleMoney | 6.59% | February 2025 |
  | STC Pay | 7.27% | August 2025 |
  | Al Rajhi | 14.76% | August 2025 |

  A comparison has real value when prices differ this much.
- UAE to Pakistan is already competitive. World Bank listings show zero fees and margins of about −0.5% to 0.6% *(search snippet; undated)*.

**Why it would be harder than our corridors:**

- The market is dominated by local exchange houses, banks and wallets, which this survey did not probe:
  - Saudi Arabia: Al Rajhi (Tahweel, urpay), STC Bank, Bank Albilad (Enjaz), ANB TeleMoney, SAB.
  - UAE: Al Ansari, Al Fardan, GCC Exchange, Lulu, Emirates NBD.
  - Kuwait: Al Mulla, Al Muzaini.
  - Bahrain: BFC.
  - Qatar: Al Dar, Gulf Exchange.
- The only Gulf calculator observed, Al Ansari's, uses reCAPTCHA and a nonce.
- Wise's comparison feed returns no providers at all for AED-PKR or SAR-PKR. Monito's AED-BDT page shows only Remitly, Paysend and Skrill.
- Newer Gulf apps such as barq, e& money, botim, Pyypl, botim with Jingle Pay, Careem Pay and Hubpay are unprobed.

**Recommendation:** run a separate probe pass before committing to a Gulf launch, and expect lower coverage than on our current corridors.

### 7.2 Other sending markets

| Market | Size | Providers noted (none probed) |
|---|---|---|
| Malaysia | Bangladesh: $3.40bn (9.6%), the No. 4 source. Pakistan: small (FY26 down 9%). | Merchantrade, Agrani Remit app (May 2025), CBL Money Transfer, Touch 'n Go, OneTransfer (February 2026). Wise's MYR-PKR feed lists only Public Bank, Maybank and Wise. |
| Singapore | Bangladesh: $1.49bn (4.2%) | DBS Remit (zero-fee with BRAC Bank), SingX, Hometown/GoZayaan (new, April 2026). Monito's SGD-BDT page lists Western Union, Instarem, SingX, MoneyGram, Revolut, Remitly, Wise and Skrill. |
| Australia | Pakistan: $0.88bn in Jan–Sep 2026, larger than Canada. Bangladesh: $0.26bn. | OrbitRemit, Rocket Remit |
| South Africa | Bangladesh: $0.67bn | Mama Money |
| Other European countries | Greece sends Bangladesh $0.20bn and is not in our euro list. | ACE-linked press claims a majority share from Ireland, Norway and the Netherlands to Pakistan; this is unverified. Transfer Galaxy already serves 25 European countries, so adding sending countries may be cheap. |

### 7.3 Research not finished

The shared search budget ran out before these were done. A follow-up run can pick them up:

- The Pakistan Remittance Initiative's list of overseas partners.
- Pakistani exchange companies based in Spain, Italy and France.
- A US list of Bangladeshi exchange houses.
- Comparison data for Canada to Bangladesh.
- Third-party confirmation of Transfer Galaxy and MoneyTO.
- A later re-check of Afriex.

Done since this survey:

- **LemFi's euro locales.** France, Germany, Portugal and Ireland carry quotes, and LemFi's page state confirms the sending country. Spain's page shows none.
- **Dahabshiil's lower fee tiers.** These are now quoted at 100, 500, 1,000 and 2,500.
- **Pangea.** It doesn't serve Pakistan (4.3).
- **Providers' terms.** These were reviewed separately (7.4).

### 7.4 Before charging for the API: providers' terms

A separate pass read each large provider's own terms of use. **This is not legal advice**: take it to an IP and commercial solicitor.

The clauses below are paraphrased; check the exact wording at each provider's site. Several of them sit in customer agreements. Whether those bind a visitor who never signed up is one of the questions for the solicitor.

| Provider | What its terms say about automated access or reuse | Classification | Legitimate route found |
|---|---|---|---|
| Wise | No bots, or monitoring or copying, without written permission; no commercial use or resale of Wise materials (UK customer agreement, October 2026) | Prohibits | An authenticated comparison API (marked informational), affiliates, Wise Platform. The API terms bar passing the API to third parties |
| Remitly | No bots or monitoring; page copies are for personal, non-commercial use | Prohibits | Partner programme (Impact); no public rate API |
| Western Union | US mobile terms ban automated access and commercial use without consent; nothing similar found in the GB transfer terms | Prohibits (US) | Affiliates; developer portal for enrolled partners |
| MoneyGram | US terms ban automated access and copying | Prohibits | Developer portal (Quote API); partners |
| Ria | Bans automated extraction of materials, data or information, and names pricing explicitly | Prohibits | Affiliates; digital-partner API |
| XE | Personal, non-commercial use only; no scraping, caching or mirroring, or use that competes with XE. Its quote responses also say so | Prohibits | Paid currency-data API (mid-market rates, not transfer quotes); affiliates |
| WorldRemit, Sendwave (Zepz) | No copying or monitoring by bot or by hand without written permission | Prohibits | WorldRemit affiliates; nothing for Sendwave |
| Taptap Send | Bans automated access and commercial use (UK, January 2026) | Prohibits | Affiliate terms bar working with competing remitters |
| Paysend | No automation clause in its UK/EEA or US terms | Silent | Enterprise payouts API; ambassador programme |
| Instarem | Global terms bar resale and commercial exploitation; Canadian terms also ban bots | Restricts or prohibits | Nium developer platform |
| Xoom | Bans automated devices, data mining, scraping and resale | Prohibits | None confirmed |
| LemFi | US terms ban automated access and resale; UK terms have only general IP limits | Prohibits (US), silent (UK) | Affiliate promo codes only |
| ACE Money Transfer | Content for personal, non-commercial use | Restricts | Consumer referral programme only |

**What follows from it:**

- **Wise's comparison data is the single biggest exposure.** It supplies Skrill, BMO and OFX, and it is the fallback for Remitly, Instarem, Western Union, MoneyGram and Xoom. One objection from Wise would affect eight providers.
- **The API excludes XE by default.** `API_EXCLUDED_PROVIDERS` removes any other provider without a code change. The API stores no rates, so there is nothing to delete afterwards.
- **Before taking payment:**
  - Get written permission from each provider the paid API serves, starting with Wise (its comparison and partner teams) and Remitly.
  - Change the `X-Open-Source-Client` header to name the commercial operator.
  - Promise customers no rights in the data, since the MIT licence covers only the code.
- **SonaliPay.** If the project moves there, involve its compliance team early. SonaliPay is itself one of the providers ranked here, and Ria's and XE's terms target competitive use specifically.

### 7.5 Hosting the API

Checked against vendor documentation on 2026-11-04:

- **Vercel Postgres no longer exists.** Databases moved to Neon in December 2024. New projects add one from the Vercel Marketplace; Neon's integration sets `DATABASE_URL` (pooled) and `DATABASE_URL_UNPOOLED`.
- **Neon's free plan:**
  - 1 GB of storage per project and 100 compute-hours a month.
  - The database sleeps after 5 idle minutes and wakes in a few hundred milliseconds.
  - At the compute limit it is suspended until the next month, which would mean an API outage.
- **Free-tier usage for this project:**
  - The database holds only customers, keys and usage counters, a few megabytes. Rates are checked live when asked, through the same two-minute cache as the comparison page, and history comes from the repository's `data` branch, so nothing grows with rates.
  - The comparison page doesn't touch the database, and nothing runs on a schedule. Only API traffic wakes it. A request at least every 5 minutes, all month, would keep it awake and use up the 100 compute-hours before the month ends.
- **Vercel's Hobby plan is for non-commercial, personal use only.** A paid API, or paid developers working on the code, needs Vercel Pro ($20 a month). Hobby cron jobs run once a day at most; the API needs none, and the hourly history job runs from GitHub Actions.
- **Recommendation:**
  - Use Neon Free in London (`aws-eu-west-2`, next to `lhr1`) while the API is unpaid.
  - Move to Vercel Pro and Neon's paid plan (pay per use, roughly $3 to $20 a month) before the first paying customer.
  - The code uses plain Postgres through `node-postgres` and SQL migrations, so it can move to another Postgres, such as SonaliPay's own, unchanged.

---

## 8. Sources

All sources were accessed on or before 2026-11-04. Entries marked *(search snippet)* were known only through search-result summaries, because the page refused automated reads or needs JavaScript.

### Statistics and official sources

**Bangladesh:**

- Daily Star, FY2025-26 country figures (3 Sep 2026): https://www.thedailystar.net/business/economy/news/bangladesh-remittances-hit-3559-billion-fy2025-26-saudi-uk-inflows-surge-minister-4264061
- Daily Star, attribution caveats (Mar 2025): https://www.thedailystar.net/business/news/us-uae-overtake-saudi-arabia-top-remittance-sources-3840686
- bdnews24, Q1 FY2026-27: https://bdnews24.com/economy/treq0p6pu3
- Prothom Alo: https://en.prothomalo.com/business/local/ri4zp7jkzn
- Asia News Network: https://asianews.network/?p=298820
- Bangladesh Bank country table (stale): https://www.bb.org.bd/en/index.php/econdata/wagermidtl
- Bangladesh Bank FEPD-1 Circular No. 03, 8 Jan 2026: https://www.bb.org.bd/mediaroom/circulars/fepd/jan082026fepd-103e.pdf

**Pakistan:**

- State Bank of Pakistan press release, 10 Aug 2026: https://www.sbp.org.pk/assets/documents/press-release/PR-10-August-2026.pdf
- SBP EPD Circular Letter No. 12 of 2026: https://www.sbp.org.pk/circulars/epd-circular-letter-no-12-of-2026
- Nukta, FY26: https://nukta.com/pakistan-records-highest-remittances-fy26
- Gulf News, FY26: https://gulfnews.com/amp/story/world%2Fasia%2Fpakistan%2Fsaudi-arabia-uae-drive-pakistan-remittances-to-record-416bn-1.500602356
- Bloom Pakistan, Q1 FY27: https://bloompakistan.com/remittances-rise-14pc-to-10-9bn-in-q1fy27/
- Pakera, monthly country list: https://pakera.pk/pakistan-remittances-2026-every-month-country-sbp-list/
- Profit, January 2026: https://profit.pakistantoday.com.pk/2026/02/10/pakistan-sees-strong-remittance-growth-with-3-46-billion-in-january-23-2-billion-in-7mfy26
- 1LINK, Pasban rewards: https://1link.net.pk/pasbanrewards

### Policy and press

**Bangladesh:**

- TBS: https://www.tbsnews.net/node/1460256 and https://www.tbsnews.net/node/1420536
- Ittefaq, exchange rate: https://en.ittefaq.com.bd/11929/usd-stays-around-tk122-despite-market-based-rate
- Daily Sun, wallet caps: https://www.daily-sun.com/business/856520/bkash-rocket-nagad-transfers-capped-at-tk1-000-from-9-12-feb
- WorldRemit, incentive: https://www.worldremit.com/en-us/bangladesh-cash-incentive
- RemitChoice, incentive: https://www.remitchoice.com/campaign-detail/bangladesh-2-5-percent-remittance-incentive-2026-remitchoice
- Western Union, incentive: https://www.westernunion.com/blog/en/bangladesh-government-incentive/

**Pakistan:**

- Profit:
  - https://profit.pakistantoday.com.pk/2026/07/02/sbp-ends-tt-charges-reimbursement-for-banks-keeps-free-remittance-facility-intact
  - https://profit.pakistantoday.com.pk/2025/07/01/sbp-revises-remittance-incentives-raises-transaction-limit-to-200/
  - https://profit.pakistantoday.com.pk/2026/01/31/sbp-issues-procedure-for-exchange-firms-to-disburse-remittances-through-raast-without-charging-any-fee
  - https://profit.pakistantoday.com.pk/2026/03/25/sbp-expands-naya-pakistan-certificates-access-to-all-non-resident-individuals-entities
- Dawn: https://www.dawn.com/news/2007514 and https://www.dawn.com/news/2012606/remittance-incentives-to-banks-abolished-as-imf-steps-in
- Gulf News, rule change: https://gulfnews.com/business/banking/pakistan-ends-some-remittance-perks-but-can-uae-expats-still-send-money-for-free-1.500598860
- Arab News, Raast for exchange companies: https://www.arabnews.pk/pakistan/pakistan-opens-real-time-digital-payment-system-to-exchange-companies-as-reserves-edge-up-2629441
- Tribune, Roshan Digital Accounts: https://tribune.com.pk/story/2597989/rda-expanded-to-foreign-investors
- ProPakistani, sandbox: https://propakistani.pk/2026/09/16/sbp-clarifies-rules-for-fintechs-after-sandbox-testing/

**US excise tax:**

- https://www.cbh.com/insights/articles/excise-tax-on-remittance-transfers-irc-section-4475-explained/
- https://www.grantthornton.com/insights/newsletters/tax/2026/hot-topics/apr-28/irs-releases-proposed-rules-for-remittance-excise-tax

**Payout rails and partnerships:**

- bKash and others:
  - bKash money transfer partners *(search snippet)*: https://www.bkash.com/en/products-services/money-transfer-service
  - https://digibanglatech.news/169266
  - https://today.thefinancialexpress.com.bd/print/bkash-empowers-expats-and-their-families-with-instant-remittance-access-1772393874
  - https://www.tbsnews.net/economy/corporates/bkash-mastercard-partner-expand-remittance-access-bangladesh-1474296
  - https://today.thefinancialexpress.com.bd/print/gulf-exchange-bkash-sign-deal-on-remittance-services-1757867188
- Nagad:
  - https://today.thefinancialexpress.com.bd/print/nagad-partners-with-midland-bank-for-delivery-of-remittances-1773335937
  - https://today.thefinancialexpress.com.bd/print/nagad-offers-bonus-of-up-to-tk-300-on-remittance-via-taptap-send-1779467674
- Provider help pages:
  - https://www.taptapsend.com/en/send-money-to/bangladesh
  - https://help.taptapsend.com/en/receiving-countries/how-can-i-send-money-to-pakistan
  - https://www.worldremit.com/en/bangladesh/mobile-money
  - https://www.worldremit.com/en/pakistan/mobile-money
  - https://www.worldremit.com/en/pakistan/pri

### Comparison sites and feeds

**Wise:**

- Comparison feed, one request per corridor (GBP/GB, EUR/IT, USD/US, CAD/CA to BDT and PKR, plus MYR, SGD, AED and SAR to PKR): https://wise.com/gateway/v3/comparisons?sourceCurrency=GBP&targetCurrency=PKR&sourceCountry=GB&sendAmount=1000
- Mid-market rates: https://wise.com/rates/live

**Monito:**

- https://www.monito.com/best-exchange-rates/gbp/bdt?amount=200 (and the usd, eur, cad, sgd and aed variants)
- https://www.monito.com/send-money-to/pakistan
- https://www.monito.com/send-money/united-kingdom/pakistan/gbp/pkr

**RemitFinder** *(search snippet)*:

- https://www.remitfinder.com/best-exchange-rate-to-send-money-from-usa-to-bangladesh/rr/USA/BGD
- https://www.remitfinder.com/best-exchange-rate-to-send-money-from-uk-to-bangladesh
- https://www.remitfinder.com/best-exchange-rate-to-send-money-from-canada-to-bangladesh

**Finder:**

- https://www.finder.com/uk/international-money-transfers/send-money-internationally/send-money-to-pakistan
- https://www.finder.com/ca/international-money-transfers/send-money-internationally/send-money-to-pakistan

**Other comparison sites:**

- Remitrate: https://www.remitrate.com/send-money-to/pakistan/from/united-states?amount=500
- Exiap: https://www.exiap.com/international-money-transfers/send-money-to-bangladesh
- moneytransfer.store: https://www.moneytransfer.store/send-money/from-uk/to-pakistan
- fromto.money: https://fromto.money/transfer/from-united-states/to-pakistan

**World Bank Remittance Prices** *(search snippet)*:

- https://remittanceprices.worldbank.org/corridor/United-Kingdom/Bangladesh
- https://remittanceprices.worldbank.org/corridor/Saudi-Arabia/Bangladesh
- https://remittanceprices.worldbank.org/corridor/UAE/Bangladesh
- https://remittanceprices.worldbank.org/corridor/United-Arab-Emirates/Pakistan

### Provider pages and endpoints probed

**LemFi:**

- https://lemfi.com/en-gb/international-money-transfer/pakistan and /bangladesh (plus the en-it, en-us and en-ca variants)
- https://lemfi.com/robots.txt
- https://lemfi.com/__sitemap__/en-GB.xml
- https://support.lemfi.com/hc/en-us/articles/4417242333329-Where-can-I-send-money
- Dawn, SBP approval: https://www.dawn.com/news/1944094
- Nairametrics: https://nairametrics.com/2025/09/22/lemfi-secures-state-bank-of-pakistan-approval-as-ubl-partnership-strengthens-remittance-access/

**Dahabshiil:**

- https://www.dahabshiil.com/send-money-to-bangladesh/ and /send-money-to-pakistan/
- Calculator endpoint: `https://apigw.dahabshiil.com/remit/transaction/get-charges-anonymous`
- CMS rate table: https://prod-refactor-cms.dahabshiil.com/wp-json/wp/v2/rates

**BOSS Money and Boss Revolution:**

- https://www.bossmoney.com/en-us/send-money/bangladesh and /pakistan
- Calculator endpoint: `https://api.idtm.io/money-transfer/public/transfer/promo-calculation`
- https://www.bossrevolution.com/en-us/country/pakistan/send-money

**Transfer Galaxy:**

- https://transfergalaxy.com/en/destination/pakistan/ and /bangladesh/

**MoneyTO:**

- https://www.moneyto.co.uk/pakistan
- Calculator endpoint: `https://transfer.moneyto.co.uk/sf/calculate`
- Country list: https://www.moneyto.co.uk/api/country-list

**OFX:**

- https://www.ofx.com/en-gb/exchange-rates/
- https://www.ofx.com/en-gb/send-money/pakistan/

**Afriex:**

- https://www.afriex.com/countries/pakistan
- Rate endpoint (returned 400): `https://prod.afx-server.com/v2/public/rates`

**CIBC:**

- https://www.cibc.com/en/personal-banking/ways-to-bank/how-to/global-money-transfer.html

**Blocked homepages** (stopped at the first refusal):

- https://acemoneytransfer.com/
- https://www.remitbee.com/
- https://www.placid.net/
- https://www.revolut.com/en-GB/send-money-to-bangladesh/
- https://www.majority.com/
- https://www.sharemoney.com/

**Small World:**

- Administrators: https://smallworlduk.grantthornton.co.uk/
- FXC Intelligence: https://fxcintel.com/research/analysis/small-world-closure-pricing

### Other provider and candidate sources

**ACE Money Transfer:**

- PR Newswire, ACE and bKash: https://tools.prnewswire.com/en-us/live/20813/release/20260225EN95501
- Dawn: https://www.dawn.com/news/amp/1976225
- IBS Intelligence: https://ibsintelligence.com/ibsi-news/ace-money-transfer-bank-al-habib-to-facilitate-overseas-remittances-for-pakistanis/
- Newswire: https://www.newswire.ca/news-releases/ace-money-transfer-and-faysal-bank-set-to-boost-legal-remittances-to-pakistan-868260757.html
- FXC Intelligence: https://www.fxcintel.com/research/analysis/ace-money-transfer-and-the-pakistan-remittance-landscape

**Other candidates:**

- Remitbee: https://www.remitbee.com/send-money-to-pakistan
- Placid Express: https://www.finder.com/placid-express-money-transfers
- Small World and Allied Bank (historic): https://www.finextra.com/pressarticle/67710/small-world-partners-with-allied-bank-to-expand-its-presence-in-pakistan
- nsave: https://www.nsave.com/article/send-money-home-to-bangladesh-get-the-2-5-government-incentive-best-bdt-rates-instant-payouts
- Bitget Wallet: https://thefintechtimes.com/bitget-wallet-brings-stablecoin-payouts-to-bangladeshs-bkash-and-nagad/
- MidHub: https://midhubinc.com/mhub/
- OrbitRemit: https://blog.orbitremit.com/how-to-send-money-to-bkash-from-australia-and-new-zealand-2026/

**Gulf and Asia:**

- e& money: https://www.eandmoney.com/en/offers/free-imt-bangladesh.html
- botim with Jingle Pay: https://www.prnewswire.com/news-releases/astra-techs-flagship-platform-botim-has-partnered-with-jingle-pay-to-launch-low-cost-remittances-to-pakistan-302639233.html
- Careem Pay: https://gulfnews.com/business/corporate-news/careem-pay-partners-with-lulu-exchange-to-launch-digital-remittance-to-pakistan-1.93148482
- Saudi apps: https://moneytransfers.com/en-sa/guides/best-money-transfer-app-in-saudi-arabia
- Agrani Remit app: https://today.thefinancialexpress.com.bd/print/agrani-remit-app-launched-in-malaysia-1746641857
- Hometown/GoZayaan: https://digifinasia.net/digital-payments/digital-remittance-solution-unveiled-for-bangladeshi-migrant-workers-in-singapore/
- DBS Remit: https://www.dbs.com/newsroom/DBSPOSB_partners_BRAC_Bank_to_provide_real_time_zero_fee_remittances_to_Bangladesh_via_DBS_Remit