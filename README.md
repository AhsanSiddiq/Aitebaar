# Aitebaar (اعتبار)

**Know your borrower's risk — before it's too late.**

An SBP-native credit origination, analysis and monitoring workbench for Pakistani lenders. The full product spec lives in [`CLAUDE.md`](./CLAUDE.md).

> Everything in the demo book (companies, PSX tickers, people, headlines) is **fictional and illustrative**.

## Quick start

Requires Node 20+.

```bash
npm install
cp .env.example .env          # then set NEXTAUTH_SECRET (openssl rand -base64 32)
npm run setup                 # creates the SQLite DB and seeds Demo Lender Ltd
npm run dev                   # http://localhost:3000
```

Demo users (password `aitebaar-demo`; the login page has one-click role buttons):

| Role | Email |
| --- | --- |
| Relationship Manager (default) | rm@demolender.pk |
| Credit Analyst / Risk Officer | analyst@demolender.pk |
| Chief Risk Officer | cro@demolender.pk |
| Admin | admin@demolender.pk |

Other scripts: `npm test` (finance unit tests), `npm run lint` (type-check), `npm run db:reset` (drop, recreate and reseed). Admins can also reseed from **Admin → Reset demo data**.

## Build progress (§16)

| Step | Scope | Status |
| --- | --- | --- |
| 1 | Scaffold: Next.js + TS + Tailwind + Prisma/SQLite + NextAuth, brand theme, seeded users, shell | ✅ |
| 2 | Full data model + rich seed; portfolio dashboard (KPIs, borrower table, R-1 concentration, alerts) | ✅ |
| 3 | Financials & ratios: spreading template, upload + AI extraction, benchmarks, charts | ⏳ ratio engine + tests done; UI next |
| 4 | Notes intelligence (AI red flags, accept/dismiss) | seeded flags shown read-only |
| 5 | Rating engine: ORR scorecard, FRR, classification, override/approval | FRR + R-8 classification engines done |
| 6 | Monitoring & early warning: news, PSX events, composite score, alerts inbox | composite score done; read-only alerts page |
| 7 | Credit proposal (CAM memo, versioned, PDF) | seeded drafts in DB |
| 8 | Concentration + polish, reference-data admin | R-1 widget + reset demo done |

## Layout

```
app/                 routes: (app)/ dashboard, borrowers/[id], alerts, upload, admin; login; api/auth
config/              editable reference data: ratios + thresholds, sector medians, ORR scale/PD, FRR/LGD,
                     ECL scenarios + CCFs, R-1 limits, R-8 DPD bands + provisioning, composite-score weights
lib/finance/         pure, unit-tested math: ratios, classification (R-8/R-9), scorecard (FRR), ecl,
                     monitoring (composite score, status), concentration (R-1)
lib/integrations/    adapter seams: PSX exchange feed (seed adapter now), bureau, financials feed,
                     external ECL, core banking
lib/db/              Prisma client, tenant-scoped queries, seedDemo()
prisma/              schema.prisma, seed-data.ts (the fictional book), seed.ts
components/          UI: badges, KPI cards, portfolio table, concentration widget, alert item
```

## Design notes

- **ICRR is the system; ORR and FRR are its outputs.** ORR is per borrower (1–9), FRR per facility (A–F → LGD).
- **R-8 classification** is the worst of DPD band, ORR-implied band and any subjective downgrade (reason required). **R-9:** a restructured facility keeps its prior class as a floor; `restructured` is a separate flag.
- **IFRS 9:** Stage 1 uses 12-month ECL with the SBP 0.5% PD floor; Stage 2/3 are lifetime and discounted at the facility EIR; three weighted scenarios; Stage 3 takes max(IFRS 9 ECL, R-8 provision net of FSV).
- **Composite risk score (0–10)** is computed in code from news and PSX events over a 90-day window, never by an LLM.
- **PSX data:** v0 ingests seeded announcements through `SeedPsxAdapter`; a licensed feed implements the same `ExchangeFeedAdapter` interface. No scraping.
- **Multi-tenant:** every query is filtered by the signed-in user's `lenderId`.
- SQLite for the prototype; switching `provider` to `postgresql` is the intended path (enum-like fields are validated strings; JSON is stored as text).
