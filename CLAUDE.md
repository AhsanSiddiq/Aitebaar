# Aitebaar — Project Specification & Context for Claude Code

*(Master build document — supersedes the earlier AITEBAAR_BUILD_SPEC.md)*

**How to use this file:** This is `CLAUDE.md` at the repo root (Claude Code reads it automatically as persistent context). Build in the order in §16 — the v0 prototype scope comes first. When something is ambiguous, prefer the simplest thing that makes a pilot feel real to a lender, and leave a `// TODO`. This is an idea-stage product, incubated at NIC, being built for pilots with real lenders. It must look and behave like a real product, but it runs on realistic seed data and user uploads, not live licensed feeds.

> **Project decisions (recorded during build)**
> - Exchange for listed borrowers is **PSX** (Pakistan Stock Exchange). PSX events are seeded for v0 and sit behind an adapter interface (`lib/integrations/exchange.ts`) so a licensed feed can replace the seed later without UI changes.
> - Build status: see `README.md` → "Build progress".

## 1. One-paragraph description

Aitebaar (Urdu: اعتبار — trust / creditworthiness) is an SBP-native credit origination, analysis, and monitoring workbench for Pakistani lenders. It is the tool a credit analyst or relationship manager uses to make and then continuously watch a lending decision: pull or upload a borrower's financials, auto-spread them into a standard template, compute a full set of credit ratios with benchmarking, read the notes to the accounts for red flags, assemble a digital credit proposal, assign an internal risk rating (ICRR → ORR/FRR) mapped to SBP regulation, and then monitor that borrower continuously through news and exchange-announcement signals that fire early-warning alerts between formal reviews. Today this work is done manually in Word and Excel on a slow annual cycle, and the gap between reviews is where losses hide. Aitebaar closes both.

**One-liner:** Know your borrower's risk — before it's too late.

## 3. Who uses it (target customers & roles)

**Beachhead customers (sell here first):** non-bank lenders and mid-tier institutions where the buying decision is fast and the current tooling is weakest — DFIs, NBFCs, leasing companies, microfinance banks, and digital lenders. Then mid-tier commercial banks. Tier-1 banks are a later, slower motion. (Rationale: shorter procurement, more reachable, acute pain, no entrenched incumbent in the origination workflow.)

**User roles (model as RBAC):**

- **Relationship Manager (RM)** — owns borrowers, maintains the credit proposal, uploads financials, actions alerts. Default demo user.
- **Credit Analyst / Risk Officer** — runs and validates ratios and ratings, approves ORR/FRR.
- **Chief Risk Officer (CRO) / Approver** — final sign-off, portfolio and concentration view.
- **Admin** — users, reference data, thresholds, tenant settings.

Multi-tenant by lender (each tenant sees only its own book). Seed one tenant ("Demo Lender Ltd") with all roles.

## 4. DOMAIN PRIMER — READ BEFORE CODING

Treat these as authoritative; they are the part Claude Code will otherwise get wrong, and getting them right is the product's credibility.

### 4.1 The credit-review lifecycle being digitized

For each borrower a lender maintains a credit proposal (credit application / CAM memo) and an internal risk rating, reviewed at least annually and on every new facility, renewal, or enhancement. Aitebaar digitizes the proposal, automates the analysis inside it, and keeps it live between reviews.

### 4.2 ICRR and the two-tier rating (exact)

ICRR = Internal Credit Risk Rating — the system SBP requires (Guidelines on Internal Credit Risk Rating Systems, 2007). It is two-tier, producing two outputs:

1. **ORR — Obligor Risk Rating.** Risk of borrower default. Same borrower ⇒ same ORR across all facilities. Driven by quantitative (ratios, trends, benchmarking) and qualitative (management, industry, group, market position, conduct) factors.
2. **FRR — Facility Risk Rating.** Loss severity given default for a specific facility — collateral, security coverage, seniority, guarantees (an LGD-style view). Same borrower can have different FRRs across facilities.

⚠️ **ICRR is the system; ORR and FRR are its two outputs. Do not treat "ICRR" and "ORR" as parallel ratings.**

Internal grade scale 1–9 (1 strongest, 9 loss), each grade with a description, mapped to the SBP classification bands below.

### 4.3 SBP asset classification (Prudential Regulation R-8)

R-8 covers classification AND provisioning. Classify exposures on time-based and subjective criteria into: Regular/Performing, OAEM (Other Assets Especially Mentioned — early watch), Substandard, Doubtful, Loss. Subjective downgrade is permitted regardless of days-past-due. Model as an enum driven by (a) days-past-due, (b) subjective override with reason, (c) internal grade.

### 4.4 Prudential Regulations to surface in the product

- **R-1** — single/large borrower and group exposure limits (% of the lender's equity/capital). Powers concentration monitoring (flag when a borrower/group nears the limit).
- **R-8** — classification and provisioning.
- **R-9** — rescheduling / restructuring (a restructure does not by itself upgrade a classification). Track a `restructured` flag separate from status.

### 4.5 IFRS 9 — ECL & staging (for the light, transparent engine)

- ECL = PD × LGD × EAD, per facility, over time, discounted, under scenarios.
- Stages: Stage 1 performing → 12-month ECL; Stage 2 SICR (significant increase in credit risk since origination) → lifetime ECL; Stage 3 credit-impaired/default → lifetime ECL.
- Two-track (SBP-specific): Stage 1 & 2 per IFRS 9; Stage 3 = higher of (IFRS 9 ECL, PR provision) at borrower/facility level.
- SBP PD floor: minimum 0.5% 12-month PD on any Stage 1 exposure.
- Macro scenarios: at least three probability-weighted (base/upside/downside); report the weighted ECL.
- SICR triggers (Stage 1 → 2): e.g., ORR downgrade by N notches since origination, 30+ DPD, covenant breach, watch-list flag. Make configurable.

### 4.6 Glossary

Exposure, Facility, Obligor/Borrower, Group (related borrowers), Collateral/Security, FSV (Forced Sale Value), Covenant, Days Past Due (DPD), Watch-list, Spreading (standardising financials into a common template), Notes to the Accounts, Contingencies & Commitments, Going Concern, Pledge/Charge, Guarantee.

## 5. Core modules

Build as cleanly separated features. [v0] = in the first prototype; [v1] = next; [later] = integration/expansion.

### Module 1 — Financial Spreading & Analysis [v0]

- Ingest financials: structured manual entry template, or upload (PDF/Excel) with AI-assisted extraction into the template (§10). Support 3+ years for trends.
- Compute the full ratio set (§6). Store per period.
- Benchmarking: vs prior year (trend), vs sector median, vs named peers. Seed sector medians.
- Export per-borrower analysis (CSV/PDF).

### Module 2 — Notes Intelligence [v0]

- AI reads the notes to the accounts + contingencies and flags red flags: contingent liabilities, pledged/charged assets, going-concern wording, covenant breaches, related-party exposure, litigation, auditor qualifications, subsequent events.
- Each flag: severity (Low/Med/High), exact source snippet, plain-language explanation. Human accept/dismiss with a note.

### Module 3 — Credit Proposal (digital CAM memo) [v0]

- A living document per borrower: facility structure, purpose, exposure, security, financial summary, rating recommendation, conditions/covenants, approver sign-offs. Auto-populated from the engines; editable; versioned; exportable to PDF.

### Module 4 — Internal Rating Engine (ICRR → ORR + FRR) [v0]

- Transparent, rule-based scorecard synthesising quantitative ratios + qualitative inputs + notes flags into an ORR (1–9) with a visible component breakdown ("why this grade").
- FRR per facility from collateral/security/seniority.
- Map ORR → SBP classification band. Versioned with rationale, override, and approval trail.

### Module 5 — Monitoring & Early Warning [v0 — this is the differentiator]

- Per-borrower feed of news (source, headline, date, sentiment Pos/Neu/Neg, impact Low/Med/High, extracted risk signal) rolled into a Composite Risk Score (0–10) over a rolling window.
- Exchange/PSX event tracking for listed borrowers (dividends, board/management changes, defaults, penalties, material info, results), classified by type + risk impact. Seeded/mock for v0 (live PSX data needs a licence — §17); build the ingestion interface for a future licensed feed.
- Alerts on: rating downgrade, SICR/stage migration, high-impact news/event, covenant breach, exposure-limit breach. Each links to the borrower and is actionable.

### Module 6 — Portfolio Dashboard & Concentration [v0]

- Table of all borrowers: exposure, ORR, FRR, stage, classification, composite risk score, status (Clear / Watch / Alert).
- KPI strip; concentration vs R-1 limits (borrower & group); alerts feed.

### Module 7 — Profile / Confidence Scoring [v1]

- Qualitative profile per borrower: company history, group structure, ownership, management, major buyers, major suppliers, market position. Each section gets a confidence score (data completeness + reliability). Feeds the qualitative side of the ORR.

### Module 8 — IFRS 9 ECL (light, transparent) [v1; integration-ready later]

- Staging + PD/LGD/EAD + 3-scenario + two-track + 0.5% PD floor (§7), with the full working shown. Built so it can defer to an external ECL engine (e.g., a FineIT integration) when the lender has one — Aitebaar then displays and monitors rather than computes.

**Integrations [later]** — see §11. Bureau data (Tasdeeq), financial-statement feed (licensed redistributor), external ECL engine, core-banking/LOS import.

## 6. Credit ratios

Compute all; guard divide-by-zero, show "n/a" if inputs missing. Group in the UI; show value, prior-year value, trend arrow, benchmark for each.

- **Liquidity:** Current Ratio = CA/CL · Quick = (CA−Inventory)/CL · Cash = (Cash+Equiv)/CL · Net Working Capital = CA−CL
- **Leverage/Solvency:** Debt-to-Equity = Total Debt/Equity · Debt-to-Assets = Total Debt/Total Assets · Gearing = Total Liabilities/Total Assets · Debt/EBITDA
- **Coverage/Debt-service:** ICR = EBIT/Interest · EBITDA Interest Coverage = EBITDA/Interest · DSCR = (EBITDA − Cash Taxes)/(Interest + Current Portion of LTD) (document the exact definition in code)
- **Profitability:** Gross Margin · Operating Margin · EBITDA Margin · Net Margin · ROA = NI/Assets · ROE = NI/Equity · ROCE = EBIT/(Assets−CL)
- **Efficiency:** Asset Turnover = Revenue/Assets · DIO = Inventory/COGS×365 · DSO = Receivables/Revenue×365 · DPO = Payables/COGS×365 · Cash Conversion Cycle = DIO+DSO−DPO
- **Cash Flow:** OCF Ratio = OCF/CL · OCF/Total Debt · Free Cash Flow = OCF−Capex

Keep ratio definitions and thresholds in one editable config module.

## 7. Rating & ECL logic

**ORR (transparent scorecard, not a black box):**

- Quantitative sub-score (~60%): each key ratio scored vs banded thresholds (strong/adequate/weak/poor) → weighted points; trend & benchmark deltas adjust.
- Qualitative sub-score (~40%): management, industry, group support, market position, conduct, profile completeness, notes red-flags (as penalties).
- Aggregate 0–100 → ORR grade 1–9 via a mapping table; show every component's contribution.
- Override allowed with mandatory reason (store model grade vs final grade). Version everything.

**FRR:** from security coverage (FSV of collateral / exposure), collateral type/quality, seniority, guarantees → grade A–F (LGD proxy, feeds ECL).

**ECL (light engine):** stage → PD (ORR→PD table, 0.5% floor on Stage 1; 100% Stage 3) → LGD (from FRR/collateral) → EAD (outstanding + CCF×undrawn) → per-scenario ECL (12-mo Stage 1; lifetime Stage 2/3) → probability-weight → for Stage 3 take max(IFRS9, PR provision). Display full working. All weights/tables in editable config.

## 8. Data model (core entities)

Lender(tenant: name, capital/equity for R-1) · User(role, lenderId) · Borrower(name, ticker?, sector, listed?, groupId, ownership, description) · Group · Facility(borrowerId, type, sanctioned/outstanding, currency, pricing, maturity, seniority, DPD, restructured, classification) · Collateral(facilityId, type, value, FSV, chargeType) · FinancialStatement(borrowerId, period, type, source, status) · FinancialLineItem(statementId, key, value — standardised spreading keys) · RatioResult(borrowerId, period, ratioKey, value, benchmark, trend) · NotesFlag(borrowerId, statementId, category, severity, sourceSnippet, explanation, status) · NewsItem(borrowerId, source, headline, url, date, sentiment, impact, riskSignal) · ExchangeEvent(borrowerId, type, date, description, riskImpact) · Rating(borrowerId, orrGrade, score, quantScore, qualScore, sbpClassification, modelGrade, finalGrade, rationale, version, approvedBy, effectiveDate) · FacilityRating(facilityId, frrGrade, securityCoverage) · EclResult(facilityId, stage, pd, lgd, ead, scenarioBreakdown, ifrs9Ecl, prProvision, finalEcl, asOf) · CreditProposal(borrowerId, version, content, status, approvals[]) · ProfileScore(borrowerId, section, score, notes) · Alert(lenderId, borrowerId, type, severity, message, status, createdAt) · AuditLog(actor, action, entity, before/after, timestamp)

## 9. Screens / information architecture

- **Auth** — role-based login, seeded demo users.
- **Portfolio Dashboard [v0]** — KPI strip (total exposure, #borrowers, weighted ORR, #alerts), borrower table (sortable/filterable, colour-coded status), concentration widget vs R-1, alerts feed.
- **Borrower Detail (tabbed):**
  1. Overview [v0] — snapshot: exposure, ORR, FRR, classification, composite risk score, status.
  2. Financials & Ratios [v0] — spreading table (multi-year), ratio panels by category with trend + benchmark, charts.
  3. Notes Intelligence [v0] — red-flag list with source snippets, accept/dismiss.
  4. Monitoring [v0] — news feed (sentiment/impact), exchange events, composite-score gauge, alert history.
  5. Rating [v0] — ORR scorecard (component breakdown), FRR per facility, history/versions, override + approval.
  6. Credit Proposal [v0] — the digital CAM memo, editable, versioned, export PDF.
  7. Profile & Confidence [v1] — company/group/owners/buyers/suppliers with confidence scores.
  8. IFRS 9 / ECL [v1] — stage, PD/LGD/EAD, scenario table, two-track max, final ECL (or external-engine view).
- **Financial Upload [v0]** — upload PDF/Excel → AI extraction → review/correct → save.
- **Alerts Inbox [v0]** — actionable list.
- **Admin [v0-lite]** — users, reference data (sector medians, thresholds, PD/LGD tables, scenario weights), seed/reset demo.

Every AI-generated element shows its source and is human-editable.

## 10. AI features & how to implement them

Use an LLM API (Anthropic Claude). Keep AI grounded, explainable, human-gated — never let it silently change a number.

- **Statement extraction:** uploaded PDF/Excel text → structured JSON into the spreading template (strict schema, JSON-only). Always show for human review before saving.
- **Notes red-flag analysis:** notes/contingencies text → JSON array `{category, severity, sourceSnippet, explanation}`; must quote the exact snippet.
- **News/event classification:** article/announcement text → `{sentiment, impact, riskSignal, type}`; composite score computed in code, not by the LLM.
- **Credit-proposal drafting assist:** first-draft narrative for CAM sections from structured data; human edits and signs off.

Rules: JSON-only + Zod-validated + safe parsing; every output cites its source; human confirmation on anything affecting a rating/number/classification; store model + prompt version for audit; graceful degradation to manual entry if the API is down; API key in env vars.

## 11. Integrations (design the seams now; implement [later])

Aitebaar's strategy is to consume, not rebuild. Build clean adapter interfaces from day one even if v0 uses uploads/seed:

- **Bureau data — Tasdeeq:** account conduct, DPD, cross-lender exposure, defaults → feed ORR qualitative + SICR triggers.
- **Financial-statement feed — licensed PSX redistributor (e.g., Sarmaaya):** listed-borrower financials + announcements (replaces scraping).
- **External ECL engine (e.g., FineIT):** where the lender already computes ECL, Aitebaar displays/monitors instead of computing.
- **Core-banking / LOS import:** loan-book and DPD ingestion (CSV first, API later).

Start all of these as CSV/manual import behind an interface; swap to APIs without touching the UI.

## 12. Tech stack (buildable, pilot-ready)

- Framework: Next.js (App Router) + TypeScript
- UI: Tailwind CSS + shadcn/ui + lucide-react
- Charts: Recharts
- DB: SQLite + Prisma for the prototype (portable, zero-config); structured to swap to Postgres
- Auth: NextAuth (credentials) with RBAC; seeded users
- AI: Anthropic API via server actions/route handlers (key in `.env`)
- File parsing: a PDF text extractor (`unpdf`/`pdf-parse`) + `xlsx`
- PDF export: server-side (Puppeteer or `@react-pdf`) for proposal/analysis
- Validation: Zod on all inputs and all LLM JSON
- Tests: unit tests on the ratio + scorecard + ECL math (these must be correct)

Single Next.js app; no premature microservices. Prioritise a clean, seeded, clickable pilot over completeness.

## 13. Architecture & project structure

- `app/` — routes (dashboard, borrowers/[id] tabs, upload, alerts, admin, auth)
- `lib/finance/` — pure, unit-tested functions: `ratios.ts`, `scorecard.ts` (ORR/FRR), `ecl.ts`, `classification.ts`
- `lib/ai/` — LLM clients + prompt templates + Zod schemas
- `lib/integrations/` — adapter interfaces (bureau, financials, ecl, corebanking, exchange/PSX) with CSV/mock implementations
- `lib/db/` — Prisma client + queries
- `config/` — ratio thresholds, sector medians, ORR→PD, LGD, scenario weights, grade mappings, R-1 limits (Admin-editable)
- `prisma/` — schema + `seed.ts`
- `components/` — KPI cards, ratio panel, scorecard breakdown, ECL table, status badge, alert item

Keep the finance math pure and centralised — it's the trust core.

## 14. Design system (brand)

Institutional fintech — a risk officer's cockpit: data-dense but calm and premium, not a playful consumer app.

- **Colours:** Emerald `#046A38` (deep `#013D2B`) · Ink Navy `#0B1F3A` · Gold `#C9A227` (sparingly) · Mint/Teal `#17B890` (interactive) · Paper `#F7F6F1`. Risk semantics: Clear/Low = green, Watch/Med = amber `#E0A800`, Alert/High = red `#C0392B`.
- **Type:** geometric sans for headings (Sora/Poppins), legible sans for data/body (Inter). Tabular figures for all numbers.
- **Feel:** generous whitespace, clear hierarchy, subtle borders over heavy shadows, dashboard cards, colour-coded status badges, sparklines/trend arrows on ratios. Light mode first; dark optional. The name means trust — the UI should feel calm, credible, a "trust seal."

## 15. Seed / demo data (make the pilot sing)

Seed one lender ("Demo Lender Ltd", with a capital figure for R-1) and 6–8 borrowers across sectors (cement, fertiliser/chemicals, power, textile, shipping, FMCG), a mix of listed and unlisted, spanning the risk spectrum — at least one Clear, one Watch, one Alert. For each: 3 years of financials, computed ratios, a few notes red-flags, a realistic news set (one high-impact negative item on the Alert borrower), one or two exchange events, an ORR/FRR, an ECL touching all three stages somewhere in the book, and a partially filled credit proposal + profile.

Use clearly fictional names (e.g., "Summit Cement Ltd", "Indus Fertilizer", "Zenith Power", "Ravi Textiles"). Never present real companies' data as a real lender's holdings. Show a visible "Demo data — illustrative" badge. Provide an Admin "reset demo" action (reseeds cleanly for repeated pilot runs).

## 16. Build plan (prototype-first — do this order)

**v0 — the pilot prototype (build this first, end to end):**

1. **Scaffold** — Next.js + TS + Tailwind + shadcn + Prisma/SQLite + NextAuth; brand theme; seeded users; dashboard shell.
2. **Data model + seed** — full schema + rich seed (§15). Portfolio dashboard renders seeded borrowers with status colours + KPI strip.
3. **Financials & ratios** — spreading template (manual + upload-with-AI-extraction) + ratio engine + benchmarks/trends + charts + unit tests.
4. **Notes intelligence** — AI red-flags with source snippets, accept/dismiss.
5. **Rating engine** — ORR scorecard + FRR + classification + history/override/approval.
6. **Monitoring & early warning** — news feed + exchange events (seeded) + composite score + alerts inbox.
7. **Credit proposal** — digital CAM memo, versioned, PDF export.
8. **Concentration + polish** — R-1 concentration, empty/loading states, "reset demo", export buttons, demo-data badge, final visual pass.

→ This v0 is what your co-founder walks into warm lender contacts as a pilot. It is the full origination-plus-monitoring loop on seed data.

**v1 — after first pilot feedback:** Profile/confidence scoring; light IFRS 9 ECL engine with full working; deeper benchmarking.

**later — once inside an account:** Live integrations (Tasdeeq, financials feed, external ECL, core-banking import); ML-based PD calibration on the lender's own default data; regulatory-report exports; SSO + bank-grade security.

Deliver a working, seeded app at every step, not a half-built everything.

## 17. Guardrails, compliance & non-goals

- **No live licensed data in v0.** PSX/market data and most news feeds require a licence — use seed data + user uploads + optional user-supplied text summarised by the LLM. Build the interface for a future licensed feed; don't scrape.
- **Decision-support only.** No auto-approval, auto-classification, or auto-rating without human confirmation. Every AI output explainable, sourced, editable, audit-logged.
- **Sensitive-data posture.** Treat borrower/financial data as sensitive even in demo: RBAC, no secrets in the repo, `.env` for keys, audit log on changes. Offer on-prem/VPC deployment as a production option (banks won't hand data to a random SaaS) — note it; don't need full implementation for v0.
- **Numbers must be right.** Ratio, scorecard, and ECL math is the trust core — unit-test it. Wrong finance math kills credibility with bankers.
- **Integrate, don't rebuild.** Do not try to beat FineIT on ECL compute or become a bureau/market-data company. Stay the workflow + intelligence layer.
- **Not building:** core banking, payments, a credit-rating-agency product, consumer credit scoring, live trading/market feeds, mobile app — all out of scope.

## 18. Why this exists (context for anyone reading)

Pakistani lenders still run credit origination and review manually, on an annual cycle, and miss the news, exchange, and regulatory signals that move between reviews. The compliance-computation corner (IFRS 9 ECL) is well served by incumbents; the origination workflow and continuous early-warning layer is not. Aitebaar fills that gap for the lenders the big suites ignore — non-bank lenders and mid-tier institutions first — and is built to plug into the data and engines that already exist rather than replace them.

Build for a live, seeded, clickable pilot aimed at real lenders. Realistic over exhaustive. Explainable over clever. Correct math, always.
