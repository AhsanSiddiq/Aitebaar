/**
 * Demo book for "Demo Lender Ltd" (§15). Every company, ticker, person and
 * headline here is FICTIONAL and illustrative. Do not replace with real
 * companies' data presented as a lender's holdings.
 *
 * Amounts are PKR millions. Pakistan's fiscal year ends 30 June.
 */
import type { Spread } from "@/config/spreading";
import type {
  ChargeType,
  CollateralType,
  ExchangeEventType,
  FacilityType,
  Ifrs9Stage,
  NotesFlagCategory,
  SbpClass,
  Sector,
  Seniority,
  Sentiment,
  Severity,
  AlertType,
} from "@/lib/domain";

export const LENDER = {
  name: "Demo Lender Ltd",
  institutionType: "DFI",
  equity: 24_000,
};

export const DEMO_PASSWORD = "aitebaar-demo";
export const DEMO_LENDER_ID = "demo-lender";

export const USERS = [
  { email: "rm@demolender.pk", name: "Sana Malik", role: "RM" },
  { email: "analyst@demolender.pk", name: "Bilal Qureshi", role: "ANALYST" },
  { email: "cro@demolender.pk", name: "Ayesha Rahman", role: "CRO" },
  { email: "admin@demolender.pk", name: "Hamza Siddiqui", role: "ADMIN" },
] as const;

export const PERIODS = [
  { period: "FY2023", periodEnd: "2023-06-30", rate: 0.17 },
  { period: "FY2024", periodEnd: "2024-06-30", rate: 0.22 },
  { period: "FY2025", periodEnd: "2025-06-30", rate: 0.16 },
] as const;

/** Year drivers → a balanced spread (see buildSpread). */
export interface YearDrivers {
  revenue: number;
  grossMargin: number;
  sgaPct: number;
  depreciation: number;
  otherIncome?: number;
  stb: number; // short-term borrowings
  cpltd: number; // current portion of LTD
  ltd: number; // long-term debt
  fixedAssets: number;
  otherNca: number;
  cash: number;
  recDays: number;
  invDays: number;
  payDays: number;
  otherCa: number;
  otherCl: number;
  otherNcl: number;
  ocfConversion: number; // OCF as share of EBITDA (before tax)
  capex: number;
}

export function buildSpread(d: YearDrivers, rate: number): Spread {
  const cogs = d.revenue * (1 - d.grossMargin);
  const sga = d.revenue * d.sgaPct;
  const otherIncome = d.otherIncome ?? 0;
  const ebit = d.revenue - cogs - sga - d.depreciation + otherIncome;
  const debt = d.stb + d.cpltd + d.ltd;
  const financeCost = debt * rate;
  const pbt = ebit - financeCost;
  // Pakistan: 29% corporate rate; minimum/turnover tax of 1.25% when loss-making.
  const taxExpense = pbt > 0 ? pbt * 0.29 : d.revenue * 0.0125;
  const netIncome = pbt - taxExpense;
  const receivables = (d.revenue * d.recDays) / 365;
  const inventory = (cogs * d.invDays) / 365;
  const payables = (cogs * d.payDays) / 365;
  const currentAssets = d.cash + receivables + inventory + d.otherCa;
  const totalAssets = currentAssets + d.fixedAssets + d.otherNca;
  const currentLiabilities = payables + d.stb + d.cpltd + d.otherCl;
  const totalLiabilities = currentLiabilities + d.ltd + d.otherNcl;
  const ebitda = ebit + d.depreciation;
  const taxesPaid = taxExpense * 0.9;
  const r = (x: number) => Math.round(x * 10) / 10;
  return {
    revenue: r(d.revenue),
    cogs: r(cogs),
    sellingAdminExpenses: r(sga),
    depreciation: r(d.depreciation),
    otherIncome: r(otherIncome),
    financeCost: r(financeCost),
    taxExpense: r(taxExpense),
    netIncome: r(netIncome),
    cash: r(d.cash),
    receivables: r(receivables),
    inventory: r(inventory),
    otherCurrentAssets: r(d.otherCa),
    currentAssets: r(currentAssets),
    fixedAssets: r(d.fixedAssets),
    otherNonCurrentAssets: r(d.otherNca),
    totalAssets: r(totalAssets),
    payables: r(payables),
    shortTermBorrowings: r(d.stb),
    currentPortionLtd: r(d.cpltd),
    otherCurrentLiabilities: r(d.otherCl),
    currentLiabilities: r(currentLiabilities),
    longTermDebt: r(d.ltd),
    otherNonCurrentLiabilities: r(d.otherNcl),
    totalLiabilities: r(totalLiabilities),
    equity: r(totalAssets - totalLiabilities),
    operatingCashFlow: r(ebitda * d.ocfConversion - taxesPaid),
    capex: r(d.capex),
    taxesPaid: r(taxesPaid),
  };
}

export interface SeedCollateral {
  type: CollateralType;
  description: string;
  marketValue: number;
  fsv: number;
  chargeType: ChargeType;
}

export interface SeedFacility {
  ref: string;
  type: FacilityType;
  sanctioned: number;
  outstanding: number;
  pricing: string;
  eir: number;
  sanctionDate: string;
  maturityDate: string;
  seniority: Seniority;
  dpd: number;
  restructured?: boolean;
  classification: SbpClass;
  classificationReason?: string;
  purpose: string;
  covenants?: { text: string; status: "MET" | "BREACHED" | "WATCH" }[];
  collateral: SeedCollateral[];
}

export interface SeedBorrower {
  key: string;
  name: string;
  sector: Sector;
  listed: boolean;
  ticker?: string;
  group?: string;
  ownership: string;
  description: string;
  watchList?: boolean;
  nextReviewInDays: number;
  stage: Ifrs9Stage;
  stageReason: string;
  years: [YearDrivers, YearDrivers, YearDrivers];
  auditor: string;
  ratings: { orr: number; modelGrade?: number; quant: number; qual: number; monthsAgo: number; rationale: string; overrideReason?: string }[];
  facilities: SeedFacility[];
  notes: { category: NotesFlagCategory; severity: Severity; snippet: string; explanation: string; status?: "OPEN" | "ACCEPTED" | "DISMISSED" }[];
  notesFiller: string;
  news: { daysAgo: number; source: string; headline: string; summary: string; sentiment: Sentiment; impact: Severity; riskSignal: string }[];
  psx?: { daysAgo: number; type: ExchangeEventType; title: string; description: string; sentiment: Sentiment; riskImpact: Severity }[];
  proposal: Record<string, string>;
  profile: { section: string; content: string; score: number }[];
}

const base = (o: Partial<YearDrivers> & Pick<YearDrivers, "revenue" | "grossMargin">): YearDrivers => ({
  sgaPct: 0.06,
  depreciation: 0,
  stb: 0,
  cpltd: 0,
  ltd: 0,
  fixedAssets: 0,
  otherNca: 0,
  cash: 0,
  recDays: 30,
  invDays: 60,
  payDays: 45,
  otherCa: 0,
  otherCl: 0,
  otherNcl: 0,
  ocfConversion: 0.8,
  capex: 0,
  ...o,
});

export const BORROWERS: SeedBorrower[] = [
  {
    key: "summit",
    name: "Summit Cement Ltd",
    sector: "CEMENT",
    listed: true,
    ticker: "SMTC",
    ownership: "Sponsor family 58%, institutions 24%, free float 18%",
    description: "Integrated grey cement producer with two kilns in the north zone (illustrative capacity 4.2m tpa), selling domestically and exporting clinker.",
    nextReviewInDays: 140,
    stage: 1,
    stageReason: "Performing; no SICR triggers since origination.",
    auditor: "Illustrative Chartered Accountants A",
    years: [
      base({ revenue: 48_000, grossMargin: 0.26, sgaPct: 0.05, depreciation: 2_400, stb: 3_000, cpltd: 1_200, ltd: 8_000, fixedAssets: 52_000, otherNca: 2_500, cash: 2_200, recDays: 8, invDays: 55, payDays: 40, otherCa: 3_000, otherCl: 2_500, otherNcl: 6_000, ocfConversion: 0.85, capex: 3_500 }),
      base({ revenue: 56_000, grossMargin: 0.28, sgaPct: 0.05, depreciation: 2_500, stb: 2_800, cpltd: 1_200, ltd: 6_800, fixedAssets: 53_500, otherNca: 2_600, cash: 3_400, recDays: 8, invDays: 52, payDays: 42, otherCa: 3_200, otherCl: 2_700, otherNcl: 6_200, ocfConversion: 0.86, capex: 3_800 }),
      base({ revenue: 61_000, grossMargin: 0.3, sgaPct: 0.05, depreciation: 2_600, stb: 2_500, cpltd: 1_200, ltd: 5_600, fixedAssets: 55_000, otherNca: 2_700, cash: 5_100, recDays: 9, invDays: 50, payDays: 44, otherCa: 3_300, otherCl: 2_900, otherNcl: 6_300, ocfConversion: 0.88, capex: 4_000 }),
    ],
    ratings: [
      { orr: 3, quant: 76, qual: 74, monthsAgo: 13, rationale: "Strong margins on cost-efficient kilns; deleveraging on track." },
      { orr: 3, quant: 79, qual: 75, monthsAgo: 2, rationale: "Improving coverage as finance cost falls with the policy rate; leverage below sector median." },
    ],
    facilities: [
      {
        ref: "SMTC-TF-01", type: "TERM_FINANCE", sanctioned: 3_000, outstanding: 2_600, pricing: "6M KIBOR + 1.50%", eir: 0.135,
        sanctionDate: "2022-09-15", maturityDate: "2029-09-15", seniority: "SENIOR_SECURED", dpd: 0, classification: "REGULAR",
        purpose: "Waste-heat recovery plant (BMR)", covenants: [{ text: "DSCR ≥ 1.30x", status: "MET" }, { text: "Debt/Equity ≤ 1.0x", status: "MET" }],
        collateral: [{ type: "PLANT_MACHINERY", description: "First pari passu charge over plant & machinery (Line II)", marketValue: 6_200, fsv: 4_650, chargeType: "FIRST_PARI_PASSU" }],
      },
      {
        ref: "SMTC-RF-01", type: "RUNNING_FINANCE", sanctioned: 2_000, outstanding: 1_400, pricing: "1M KIBOR + 1.00%", eir: 0.125,
        sanctionDate: "2025-01-10", maturityDate: "2026-12-31", seniority: "SENIOR_SECURED", dpd: 0, classification: "REGULAR",
        purpose: "Working capital (coal & packing material)",
        collateral: [{ type: "STOCK_RECEIVABLES", description: "Hypothecation of stocks and receivables with 25% margin", marketValue: 2_600, fsv: 1_950, chargeType: "HYPOTHECATION" }],
      },
      {
        ref: "SMTC-LC-01", type: "LETTER_OF_CREDIT", sanctioned: 800, outstanding: 200, pricing: "0.15% per quarter", eir: 0.12,
        sanctionDate: "2025-01-10", maturityDate: "2026-12-31", seniority: "SENIOR_SECURED", dpd: 0, classification: "REGULAR",
        purpose: "Import of coal",
        collateral: [{ type: "CASH_MARGIN", description: "10% cash margin + lien on import documents", marketValue: 80, fsv: 80, chargeType: "LIEN" }],
      },
    ],
    notes: [
      { category: "CONTINGENT_LIABILITY", severity: "MEDIUM", snippet: "The Competition Commission has issued a show-cause notice alleging price coordination; the Company has filed an appeal and no provision has been recognised.", explanation: "An adverse ruling could bring a material penalty that is not provided for in the accounts.", status: "ACCEPTED" },
      { category: "PLEDGED_ASSETS", severity: "LOW", snippet: "Plant and machinery of Line II is subject to a first pari passu charge in favour of the lenders under the syndicated term finance.", explanation: "Core production assets are already charged, limiting fresh security available for new facilities." },
    ],
    notesFiller: "The Company is a public limited company incorporated in Pakistan and listed on the Pakistan Stock Exchange. Revenue is recognised when control of cement is transferred to the customer at dispatch.",
    news: [
      { daysAgo: 12, source: "Financial daily", headline: "Northern cement despatches rise 9% as construction picks up", summary: "Industry despatches improved for the quarter; Summit's share broadly stable.", sentiment: "POSITIVE", impact: "LOW", riskSignal: "Volume recovery supports cash flows" },
      { daysAgo: 41, source: "Sector report", headline: "Coal import costs ease on softer international prices", summary: "Lower coal costs expected to widen margins for kiln operators.", sentiment: "POSITIVE", impact: "MEDIUM", riskSignal: "Input-cost relief" },
      { daysAgo: 66, source: "National daily", headline: "Competition regulator hearing on cement pricing adjourned", summary: "Hearing on alleged price coordination adjourned to next quarter.", sentiment: "NEGATIVE", impact: "LOW", riskSignal: "Regulatory penalty overhang" },
    ],
    psx: [
      { daysAgo: 58, type: "RESULTS", title: "Financial results for the year ended 30 June 2025", description: "Profit after tax up 38% year on year; EPS PKR 31.2 (illustrative).", sentiment: "POSITIVE", riskImpact: "LOW" },
      { daysAgo: 58, type: "DIVIDEND", title: "Final cash dividend of PKR 8.00 per share", description: "Board recommends final cash dividend (illustrative).", sentiment: "POSITIVE", riskImpact: "LOW" },
    ],
    proposal: {
      purpose: "Annual review and renewal of working-capital lines; no enhancement requested.",
      facilityStructure: "TF PKR 3,000m (BMR, amortising to 2029), RF PKR 2,000m, LC sight PKR 800m.",
      borrowerBackground: "Listed cement producer, 30+ years of operations, sponsor-managed with professional CFO.",
      financialSummary: "",
      security: "First pari passu charge on Line II P&M; hypothecation of stocks/receivables; cash margin on LCs.",
      ratingRecommendation: "",
      conditions: "",
    },
    profile: [
      { section: "HISTORY", content: "Incorporated 1992; second line commissioned 2016.", score: 85 },
      { section: "OWNERSHIP", content: "Sponsor family 58%.", score: 80 },
      { section: "MANAGEMENT", content: "CEO (sponsor), CFO ex-Big 4.", score: 70 },
      { section: "MARKET_POSITION", content: "~7% national share (illustrative).", score: 60 },
    ],
  },
  {
    key: "indus",
    name: "Indus Fertilizer Ltd",
    sector: "FERTILISER",
    listed: true,
    ticker: "IFZL",
    group: "Indus Group",
    ownership: "Indus Holdings (Pvt) Ltd 61%, institutions 22%, free float 17%",
    description: "Urea manufacturer on a concessionary gas allocation; flagship of the Indus Group.",
    nextReviewInDays: 210,
    stage: 1,
    stageReason: "Performing; rating upgraded since origination.",
    auditor: "Illustrative Chartered Accountants B",
    years: [
      base({ revenue: 95_000, grossMargin: 0.32, sgaPct: 0.07, depreciation: 3_200, stb: 2_500, cpltd: 1_500, ltd: 9_000, fixedAssets: 60_000, otherNca: 6_000, cash: 14_000, recDays: 5, invDays: 25, payDays: 60, otherCa: 6_000, otherCl: 9_000, otherNcl: 8_000, ocfConversion: 0.9, capex: 4_500 }),
      base({ revenue: 118_000, grossMargin: 0.33, sgaPct: 0.07, depreciation: 3_300, stb: 2_200, cpltd: 1_500, ltd: 7_500, fixedAssets: 61_000, otherNca: 6_500, cash: 17_500, recDays: 5, invDays: 24, payDays: 62, otherCa: 6_500, otherCl: 10_500, otherNcl: 8_200, ocfConversion: 0.9, capex: 4_800 }),
      base({ revenue: 131_000, grossMargin: 0.34, sgaPct: 0.07, depreciation: 3_400, stb: 2_000, cpltd: 1_500, ltd: 6_000, fixedAssets: 62_000, otherNca: 7_000, cash: 21_000, recDays: 6, invDays: 22, payDays: 63, otherCa: 7_000, otherCl: 11_500, otherNcl: 8_300, ocfConversion: 0.9, capex: 5_000 }),
    ],
    ratings: [
      { orr: 3, quant: 80, qual: 76, monthsAgo: 12, rationale: "Strong cash generation; gas-price policy risk noted." },
      { orr: 2, quant: 86, qual: 78, monthsAgo: 1, rationale: "Net cash position and very strong coverage; upgraded one notch." },
    ],
    facilities: [
      {
        ref: "IFZL-TF-01", type: "TERM_FINANCE", sanctioned: 4_000, outstanding: 3_600, pricing: "6M KIBOR + 1.10%", eir: 0.13,
        sanctionDate: "2023-03-01", maturityDate: "2030-03-01", seniority: "SENIOR_SECURED", dpd: 0, classification: "REGULAR",
        purpose: "Ammonia plant efficiency upgrade", covenants: [{ text: "DSCR ≥ 1.50x", status: "MET" }, { text: "Current ratio ≥ 1.0x", status: "MET" }],
        collateral: [{ type: "PLANT_MACHINERY", description: "First pari passu charge over urea plant", marketValue: 7_000, fsv: 5_250, chargeType: "FIRST_PARI_PASSU" }],
      },
      {
        ref: "IFZL-RF-01", type: "RUNNING_FINANCE", sanctioned: 2_500, outstanding: 1_600, pricing: "1M KIBOR + 0.75%", eir: 0.12,
        sanctionDate: "2025-07-01", maturityDate: "2026-06-30", seniority: "SENIOR_SECURED", dpd: 0, classification: "REGULAR",
        purpose: "Working capital",
        collateral: [{ type: "STOCK_RECEIVABLES", description: "Hypothecation of stocks & receivables", marketValue: 3_000, fsv: 2_250, chargeType: "HYPOTHECATION" }],
      },
      {
        ref: "IFZL-BG-01", type: "GUARANTEE", sanctioned: 600, outstanding: 400, pricing: "0.20% per quarter", eir: 0.12,
        sanctionDate: "2025-07-01", maturityDate: "2026-06-30", seniority: "SENIOR_UNSECURED", dpd: 0, classification: "REGULAR",
        purpose: "Performance guarantee to gas utility",
        collateral: [{ type: "CORPORATE_GUARANTEE", description: "Corporate guarantee of Indus Holdings (Pvt) Ltd", marketValue: 0, fsv: 0, chargeType: "LIEN" }],
      },
    ],
    notes: [
      { category: "RELATED_PARTY", severity: "MEDIUM", snippet: "During the year the Company advanced PKR 2,150 million to Chenab Chemicals Limited, an associated company, at 6M KIBOR + 0.5%, repayable on demand.", explanation: "Cash is being upstreamed/side-streamed to a group company; it increases group interdependence and reduces cash available to our facilities." },
      { category: "CONTINGENT_LIABILITY", severity: "LOW", snippet: "Gas Infrastructure Development Cess of PKR 1,320 million is disputed and stayed by the High Court; no provision has been made.", explanation: "If the stay is vacated, a cash outflow of about 1% of revenue could arise." },
    ],
    notesFiller: "The Company manufactures and markets urea fertiliser. Gas is supplied under a long-term allocation at a notified price.",
    news: [
      { daysAgo: 9, source: "Financial daily", headline: "Urea offtake strong ahead of rabi sowing", summary: "Dealers report healthy demand and stable prices.", sentiment: "POSITIVE", impact: "LOW", riskSignal: "Demand stable" },
      { daysAgo: 37, source: "Wire service", headline: "Government reviews concessionary gas pricing for fertiliser plants", summary: "Ministry considering moving plants to a uniform gas tariff; no decision yet.", sentiment: "NEGATIVE", impact: "MEDIUM", riskSignal: "Feedstock-cost policy risk" },
    ],
    psx: [
      { daysAgo: 51, type: "RESULTS", title: "Financial results for the year ended 30 June 2025", description: "Record revenue; net cash position maintained (illustrative).", sentiment: "POSITIVE", riskImpact: "LOW" },
    ],
    proposal: {
      purpose: "Renewal of RF and BG lines; term finance in amortisation.",
      facilityStructure: "TF PKR 4,000m, RF PKR 2,500m, BG PKR 600m.",
      borrowerBackground: "Flagship of Indus Group; group exposure includes Chenab Chemicals Ltd.",
      financialSummary: "Revenue PKR 131bn (FY25), net cash, DSCR comfortably above 3x.",
      security: "First pari passu on urea plant; hypothecation; corporate guarantee of holding company for BG.",
      ratingRecommendation: "ORR 2 recommended (upgrade from 3).",
      conditions: "Group exposure to be monitored against R-1 group limit.",
    },
    profile: [
      { section: "HISTORY", content: "Commissioned 1998.", score: 85 },
      { section: "GROUP", content: "Indus Group: fertiliser, chemicals.", score: 75 },
      { section: "OWNERSHIP", content: "Indus Holdings 61%.", score: 85 },
      { section: "MANAGEMENT", content: "Professional management; group CFO.", score: 75 },
      { section: "SUPPLIERS", content: "Gas utility (single source).", score: 55 },
    ],
  },
  {
    key: "chenab",
    name: "Chenab Chemicals Ltd",
    sector: "CHEMICALS",
    listed: true,
    ticker: "CHNC",
    group: "Indus Group",
    ownership: "Indus Holdings (Pvt) Ltd 52%, free float 48%",
    description: "Soda ash and caustic soda producer; supplies glass, detergent and textile processors.",
    nextReviewInDays: 75,
    stage: 1,
    stageReason: "Performing; one-notch movement only.",
    auditor: "Illustrative Chartered Accountants B",
    years: [
      base({ revenue: 22_000, grossMargin: 0.27, sgaPct: 0.07, depreciation: 900, stb: 3_500, cpltd: 800, ltd: 5_500, fixedAssets: 14_000, otherNca: 1_000, cash: 900, recDays: 40, invDays: 70, payDays: 50, otherCa: 1_200, otherCl: 1_500, otherNcl: 1_200, ocfConversion: 0.75, capex: 1_200 }),
      base({ revenue: 24_500, grossMargin: 0.26, sgaPct: 0.07, depreciation: 950, stb: 4_000, cpltd: 800, ltd: 5_200, fixedAssets: 14_300, otherNca: 1_000, cash: 800, recDays: 42, invDays: 72, payDays: 48, otherCa: 1_300, otherCl: 1_600, otherNcl: 1_250, ocfConversion: 0.72, capex: 1_100 }),
      base({ revenue: 25_800, grossMargin: 0.25, sgaPct: 0.07, depreciation: 1_000, stb: 4_400, cpltd: 800, ltd: 4_800, fixedAssets: 14_500, otherNca: 1_000, cash: 1_400, recDays: 45, invDays: 75, payDays: 48, otherCa: 1_300, otherCl: 1_700, otherNcl: 1_300, ocfConversion: 0.7, capex: 1_000 }),
    ],
    ratings: [
      { orr: 4, quant: 68, qual: 70, monthsAgo: 11, rationale: "Adequate margins; reliance on intra-group funding noted." },
      { orr: 4, quant: 66, qual: 68, monthsAgo: 3, rationale: "Margins softening on gas curtailment; leverage stable." },
    ],
    facilities: [
      {
        ref: "CHNC-TF-01", type: "TERM_FINANCE", sanctioned: 2_500, outstanding: 2_400, pricing: "6M KIBOR + 1.75%", eir: 0.14,
        sanctionDate: "2024-02-01", maturityDate: "2030-02-01", seniority: "SENIOR_SECURED", dpd: 0, classification: "REGULAR",
        purpose: "Captive coal-fired boiler", covenants: [{ text: "DSCR ≥ 1.25x", status: "MET" }],
        collateral: [{ type: "LAND_BUILDING", description: "Mortgage over factory land & building", marketValue: 3_200, fsv: 2_400, chargeType: "FIRST_PARI_PASSU" }],
      },
      {
        ref: "CHNC-RF-01", type: "RUNNING_FINANCE", sanctioned: 2_000, outstanding: 1_500, pricing: "1M KIBOR + 1.25%", eir: 0.13,
        sanctionDate: "2025-04-01", maturityDate: "2026-03-31", seniority: "SENIOR_SECURED", dpd: 0, classification: "REGULAR",
        purpose: "Working capital",
        collateral: [{ type: "STOCK_RECEIVABLES", description: "Hypothecation of stocks & receivables", marketValue: 2_000, fsv: 1_500, chargeType: "HYPOTHECATION" }],
      },
      {
        ref: "CHNC-LC-01", type: "LETTER_OF_CREDIT", sanctioned: 600, outstanding: 300, pricing: "0.15% per quarter", eir: 0.12,
        sanctionDate: "2025-04-01", maturityDate: "2026-03-31", seniority: "SENIOR_SECURED", dpd: 0, classification: "REGULAR",
        purpose: "Import of salt and coal",
        collateral: [{ type: "CASH_MARGIN", description: "15% cash margin", marketValue: 90, fsv: 90, chargeType: "LIEN" }],
      },
    ],
    notes: [
      { category: "RELATED_PARTY", severity: "MEDIUM", snippet: "Loan from Indus Fertilizer Limited, an associated company, of PKR 2,150 million is unsecured and repayable on demand.", explanation: "An on-demand intra-group loan could be called, creating a refinancing need; it also links Chenab's credit to the group." },
      { category: "SUBSEQUENT_EVENT", severity: "LOW", snippet: "Subsequent to the year end, gas supply to the plant was curtailed by 30% for the winter months.", explanation: "Production and margins likely lower in H1 FY26." },
    ],
    notesFiller: "The Company is principally engaged in the manufacture of soda ash, caustic soda and allied chemicals.",
    news: [
      { daysAgo: 20, source: "Wire service", headline: "Gas curtailment to industry extended through winter", summary: "Industrial gas supply cut for captive users through February.", sentiment: "NEGATIVE", impact: "MEDIUM", riskSignal: "Production disruption" },
      { daysAgo: 70, source: "Sector report", headline: "Soda ash import duties raised, supporting local producers", summary: "Regulatory duty increase shields domestic producers.", sentiment: "POSITIVE", impact: "LOW", riskSignal: "Pricing support" },
    ],
    psx: [
      { daysAgo: 30, type: "BOARD_CHANGE", title: "Change of directors", description: "Nominee director of Indus Holdings replaced (illustrative).", sentiment: "NEUTRAL", riskImpact: "LOW" },
    ],
    proposal: {
      purpose: "Annual review.",
      facilityStructure: "TF PKR 2,500m, RF PKR 2,000m, LC PKR 600m.",
      borrowerBackground: "Indus Group chemicals arm.",
      financialSummary: "",
      security: "",
      ratingRecommendation: "",
      conditions: "",
    },
    profile: [
      { section: "GROUP", content: "Indus Group.", score: 70 },
      { section: "BUYERS", content: "Glass and detergent makers.", score: 50 },
    ],
  },
  {
    key: "zenith",
    name: "Zenith Power Ltd",
    sector: "POWER",
    listed: true,
    ticker: "ZNTH",
    ownership: "Sponsors 70%, free float 30%",
    description: "RFO/RLNG-fired independent power producer (illustrative 400 MW) selling to the central power purchaser under a long-term PPA.",
    watchList: true,
    nextReviewInDays: 30,
    stage: 2,
    stageReason: "SICR: placed on watch-list (receivable build-up from power purchaser).",
    auditor: "Illustrative Chartered Accountants C",
    years: [
      base({ revenue: 38_000, grossMargin: 0.3, sgaPct: 0.02, depreciation: 2_800, stb: 12_000, cpltd: 3_500, ltd: 22_000, fixedAssets: 70_000, otherNca: 1_000, cash: 1_500, recDays: 210, invDays: 30, payDays: 120, otherCa: 2_000, otherCl: 2_000, otherNcl: 3_000, ocfConversion: 0.55, capex: 600 }),
      base({ revenue: 42_000, grossMargin: 0.3, sgaPct: 0.02, depreciation: 2_800, stb: 15_000, cpltd: 3_500, ltd: 19_000, fixedAssets: 67_500, otherNca: 1_000, cash: 1_100, recDays: 260, invDays: 30, payDays: 130, otherCa: 2_000, otherCl: 2_200, otherNcl: 3_000, ocfConversion: 0.4, capex: 500 }),
      base({ revenue: 40_000, grossMargin: 0.29, sgaPct: 0.02, depreciation: 2_800, stb: 18_000, cpltd: 3_500, ltd: 16_000, fixedAssets: 65_000, otherNca: 1_000, cash: 700, recDays: 310, invDays: 30, payDays: 140, otherCa: 2_100, otherCl: 2_300, otherNcl: 3_000, ocfConversion: 0.3, capex: 400 }),
    ],
    ratings: [
      { orr: 5, quant: 60, qual: 58, monthsAgo: 12, rationale: "Contracted cash flows offset by power purchaser payment delays." },
      { orr: 6, quant: 52, qual: 54, monthsAgo: 2, rationale: "Receivable days above 300; short-term borrowings funding the gap. Downgraded one notch." },
    ],
    facilities: [
      {
        ref: "ZNTH-TF-01", type: "TERM_FINANCE", sanctioned: 3_000, outstanding: 2_600, pricing: "6M KIBOR + 2.00%", eir: 0.145,
        sanctionDate: "2019-06-30", maturityDate: "2029-06-30", seniority: "SENIOR_SECURED", dpd: 0, classification: "REGULAR",
        purpose: "Project finance (syndicated) participation", covenants: [{ text: "DSCR ≥ 1.20x", status: "WATCH" }, { text: "Debt service reserve 6 months", status: "MET" }],
        collateral: [{ type: "PLANT_MACHINERY", description: "First pari passu charge over power plant (share of syndicate)", marketValue: 3_600, fsv: 2_700, chargeType: "FIRST_PARI_PASSU" }],
      },
      {
        ref: "ZNTH-RF-01", type: "RUNNING_FINANCE", sanctioned: 1_500, outstanding: 1_200, pricing: "1M KIBOR + 1.50%", eir: 0.135,
        sanctionDate: "2025-05-01", maturityDate: "2026-04-30", seniority: "SENIOR_SECURED", dpd: 0, classification: "REGULAR",
        purpose: "Fuel purchase financing",
        collateral: [{ type: "STOCK_RECEIVABLES", description: "Ranking charge over receivables from power purchaser", marketValue: 1_200, fsv: 600, chargeType: "RANKING" }],
      },
    ],
    notes: [
      { category: "CONTINGENT_LIABILITY", severity: "HIGH", snippet: "Trade debts include PKR 21,400 million overdue from the power purchaser, of which PKR 9,800 million is past due over one year; delayed payment interest is accrued but not received.", explanation: "Over half the receivable book is overdue; cash flow depends on government circular-debt settlements, not on the plant's performance." },
      { category: "COVENANT_BREACH", severity: "MEDIUM", snippet: "The Company obtained a waiver from the syndicate for the current ratio covenant as at 30 June 2025.", explanation: "A covenant was breached and waived — the lenders' cushion is being used." },
      { category: "LITIGATION", severity: "LOW", snippet: "The Company has initiated arbitration under the PPA for recovery of capacity payments withheld.", explanation: "Recovery depends on a lengthy arbitration outcome." },
    ],
    notesFiller: "The Company owns and operates a thermal power plant and sells electricity under a 25-year Power Purchase Agreement.",
    news: [
      { daysAgo: 6, source: "National daily", headline: "Circular debt crosses new high as payments to IPPs slow", summary: "Power-sector payables to producers rose again in the quarter.", sentiment: "NEGATIVE", impact: "MEDIUM", riskSignal: "Liquidity stress from receivable delays" },
      { daysAgo: 28, source: "Wire service", headline: "Government proposes renegotiation of legacy IPP tariffs", summary: "Task force seeks revised tariffs with several thermal IPPs.", sentiment: "NEGATIVE", impact: "MEDIUM", riskSignal: "Tariff/contract renegotiation risk" },
      { daysAgo: 54, source: "Financial daily", headline: "Partial circular-debt settlement released to power producers", summary: "One-off payment eases near-term liquidity.", sentiment: "POSITIVE", impact: "MEDIUM", riskSignal: "Temporary liquidity relief" },
    ],
    psx: [
      { daysAgo: 15, type: "MATERIAL_INFO", title: "Material information: tariff renegotiation", description: "Company has received a proposal from the government task force for revised tariff terms (illustrative).", sentiment: "NEGATIVE", riskImpact: "MEDIUM" },
      { daysAgo: 60, type: "DIVIDEND", title: "Dividend passed for FY2025", description: "Board decides not to declare a dividend to conserve liquidity.", sentiment: "NEGATIVE", riskImpact: "LOW" },
    ],
    proposal: {
      purpose: "Interim review triggered by watch-list placement.",
      facilityStructure: "Syndicate TF participation PKR 3,000m; RF PKR 1,500m.",
      borrowerBackground: "",
      financialSummary: "Receivable days 310 (FY25) vs 210 (FY23). STB up 50% to fund the gap.",
      security: "",
      ratingRecommendation: "ORR 6 (from 5). IFRS 9 Stage 2.",
      conditions: "",
    },
    profile: [
      { section: "BUYERS", content: "Single offtaker under PPA.", score: 40 },
      { section: "MARKET_POSITION", content: "Merit-order position weakening.", score: 45 },
    ],
  },
  {
    key: "ravi",
    name: "Ravi Textiles Ltd",
    sector: "TEXTILE",
    listed: true,
    ticker: "RVTX",
    group: "Ravi Group",
    ownership: "Sponsor family 64%, free float 36%",
    description: "Vertically integrated spinning-weaving-processing mill exporting home textiles to Europe and the US.",
    watchList: true,
    nextReviewInDays: 7,
    stage: 3,
    stageReason: "Credit-impaired: 95 days past due on both facilities; default notice from TFC trustee.",
    auditor: "Illustrative Chartered Accountants D",
    years: [
      base({ revenue: 31_000, grossMargin: 0.13, sgaPct: 0.07, depreciation: 1_100, stb: 9_000, cpltd: 1_800, ltd: 6_500, fixedAssets: 21_000, otherNca: 500, cash: 600, recDays: 60, invDays: 110, payDays: 70, otherCa: 1_000, otherCl: 1_200, otherNcl: 900, ocfConversion: 0.6, capex: 800 }),
      base({ revenue: 28_500, grossMargin: 0.11, sgaPct: 0.07, depreciation: 1_100, stb: 11_500, cpltd: 1_800, ltd: 6_200, fixedAssets: 20_300, otherNca: 500, cash: 350, recDays: 68, invDays: 125, payDays: 85, otherCa: 1_000, otherCl: 1_400, otherNcl: 900, ocfConversion: 0.4, capex: 300 }),
      base({ revenue: 24_000, grossMargin: 0.09, sgaPct: 0.075, depreciation: 1_100, stb: 13_000, cpltd: 1_800, ltd: 6_000, fixedAssets: 19_500, otherNca: 500, cash: 150, recDays: 75, invDays: 140, payDays: 105, otherCa: 900, otherCl: 1_700, otherNcl: 900, ocfConversion: 0.3, capex: 100 }),
    ],
    ratings: [
      { orr: 6, quant: 50, qual: 52, monthsAgo: 12, rationale: "Thin margins; high short-term leverage; export demand soft." },
      { orr: 7, quant: 42, qual: 44, monthsAgo: 5, rationale: "Losses in FY24; coverage below 1x. Placed on watch-list." },
      { orr: 8, modelGrade: 8, quant: 30, qual: 34, monthsAgo: 0, rationale: "95 DPD; going-concern uncertainty; TFC default notice. Substandard." },
    ],
    facilities: [
      {
        ref: "RVTX-RF-01", type: "RUNNING_FINANCE", sanctioned: 1_800, outstanding: 1_700, pricing: "1M KIBOR + 2.50%", eir: 0.15,
        sanctionDate: "2024-10-01", maturityDate: "2025-09-30", seniority: "SENIOR_SECURED", dpd: 95, classification: "SUBSTANDARD",
        purpose: "Export working capital (raw cotton)", covenants: [{ text: "Current ratio ≥ 1.10x", status: "BREACHED" }],
        collateral: [{ type: "STOCK_RECEIVABLES", description: "Hypothecation of cotton & yarn stocks", marketValue: 1_500, fsv: 1_050, chargeType: "HYPOTHECATION" }],
      },
      {
        ref: "RVTX-TF-01", type: "TERM_FINANCE", sanctioned: 1_500, outstanding: 1_200, pricing: "6M KIBOR + 2.75%", eir: 0.155,
        sanctionDate: "2021-12-01", maturityDate: "2027-12-01", seniority: "SENIOR_SECURED", dpd: 95, classification: "SUBSTANDARD",
        purpose: "Weaving BMR", covenants: [{ text: "DSCR ≥ 1.20x", status: "BREACHED" }, { text: "Debt/Equity ≤ 2.0x", status: "BREACHED" }],
        collateral: [
          { type: "LAND_BUILDING", description: "Ranking charge over mill land & building", marketValue: 1_400, fsv: 980, chargeType: "RANKING" },
          { type: "PERSONAL_GUARANTEE", description: "Personal guarantees of sponsor directors", marketValue: 0, fsv: 0, chargeType: "LIEN" },
        ],
      },
    ],
    notes: [
      { category: "GOING_CONCERN", severity: "HIGH", snippet: "These conditions indicate the existence of a material uncertainty which may cast significant doubt about the Company's ability to continue as a going concern.", explanation: "The auditor and directors themselves flag that the company may not survive without refinancing — the strongest single red flag in a set of accounts." },
      { category: "AUDITOR_QUALIFICATION", severity: "HIGH", snippet: "We were unable to obtain sufficient appropriate audit evidence regarding the net realisable value of stock-in-trade amounting to PKR 7,850 million.", explanation: "A qualified opinion on inventory — the main working-capital security — means the stock value backing our RF may be overstated." },
      { category: "COVENANT_BREACH", severity: "HIGH", snippet: "The Company was not in compliance with the debt service coverage and gearing covenants of its term finance agreements as at the reporting date.", explanation: "Multiple covenant breaches give lenders acceleration rights; cross-default risk." },
      { category: "LITIGATION", severity: "MEDIUM", snippet: "A winding-up petition has been filed by a supplier for unpaid dues of PKR 312 million, which the Company is contesting.", explanation: "Creditor action has started; could escalate if other creditors join." },
    ],
    notesFiller: "The Company is engaged in spinning, weaving, dyeing and stitching of home textile products for export.",
    news: [
      { daysAgo: 3, source: "Financial daily", headline: "Ravi Textiles misses TFC profit payment; trustee issues event-of-default notice", summary: "The company failed to pay the quarterly profit on its listed term finance certificates; the trustee has served a default notice and called a meeting of TFC holders.", sentiment: "NEGATIVE", impact: "HIGH", riskSignal: "Payment default on public debt" },
      { daysAgo: 18, source: "Regional press", headline: "Workers protest unpaid wages at Ravi Textiles' weaving unit", summary: "Two months of wages outstanding; production halted on one shift.", sentiment: "NEGATIVE", impact: "MEDIUM", riskSignal: "Operational stress, liquidity shortfall" },
      { daysAgo: 35, source: "Sector report", headline: "Home-textile exports fall 11% as EU orders slow", summary: "Exporters report order cancellations and price pressure.", sentiment: "NEGATIVE", impact: "MEDIUM", riskSignal: "Sector demand decline" },
      { daysAgo: 62, source: "Wire service", headline: "Mill sale talks between Ravi Group and foreign buyer stall", summary: "Sponsors' plan to sell a spinning unit to raise liquidity is on hold.", sentiment: "NEGATIVE", impact: "LOW", riskSignal: "Asset-sale plan uncertain" },
    ],
    psx: [
      { daysAgo: 3, type: "DEFAULT", title: "Non-payment of profit on TFC (event of default)", description: "Company informs the exchange that profit due on its TFC issue was not paid on the due date (illustrative).", sentiment: "NEGATIVE", riskImpact: "HIGH" },
      { daysAgo: 25, type: "MATERIAL_INFO", title: "Material information: closure of one weaving unit", description: "Temporary closure of a weaving unit due to working-capital constraints (illustrative).", sentiment: "NEGATIVE", riskImpact: "MEDIUM" },
      { daysAgo: 80, type: "PENALTY", title: "Late filing of annual accounts", description: "Exchange notice for delayed submission of annual audited accounts (illustrative).", sentiment: "NEGATIVE", riskImpact: "LOW" },
    ],
    proposal: {
      purpose: "Remedial review: classification, provisioning and workout options.",
      facilityStructure: "RF PKR 1,800m (expired, 95 DPD); TF PKR 1,500m (95 DPD).",
      borrowerBackground: "Ravi Group flagship; group also includes Sutlej Spinning (Pvt) Ltd (restructured).",
      financialSummary: "Revenue down 23% over two years; gross margin 5%; net loss; equity eroding.",
      security: "Hypothecation of stocks (qualified NRV); ranking charge on mill land; sponsor PGs.",
      ratingRecommendation: "ORR 8 — Substandard. IFRS 9 Stage 3.",
      conditions: "",
    },
    profile: [
      { section: "HISTORY", content: "Family mill since 1985.", score: 70 },
      { section: "GROUP", content: "Ravi Group: Ravi Textiles, Sutlej Spinning.", score: 60 },
      { section: "MANAGEMENT", content: "Second-generation sponsor CEO; CFO resigned FY25.", score: 35 },
    ],
  },
  {
    key: "sutlej",
    name: "Sutlej Spinning (Pvt) Ltd",
    sector: "TEXTILE",
    listed: false,
    group: "Ravi Group",
    ownership: "Ravi Group sponsor family 100%",
    description: "Private spinning mill supplying yarn to Ravi Textiles and third-party weavers.",
    watchList: true,
    nextReviewInDays: 45,
    stage: 2,
    stageReason: "SICR: facility restructured (R-9) and ORR downgraded since origination.",
    auditor: "Illustrative Chartered Accountants E",
    years: [
      base({ revenue: 9_500, grossMargin: 0.12, sgaPct: 0.05, depreciation: 400, stb: 1_800, cpltd: 400, ltd: 1_600, fixedAssets: 5_200, otherNca: 100, cash: 200, recDays: 70, invDays: 90, payDays: 60, otherCa: 300, otherCl: 300, otherNcl: 200, ocfConversion: 0.6, capex: 200 }),
      base({ revenue: 8_800, grossMargin: 0.1, sgaPct: 0.05, depreciation: 400, stb: 2_100, cpltd: 400, ltd: 1_400, fixedAssets: 5_000, otherNca: 100, cash: 120, recDays: 80, invDays: 95, payDays: 70, otherCa: 300, otherCl: 350, otherNcl: 200, ocfConversion: 0.5, capex: 100 }),
      base({ revenue: 8_600, grossMargin: 0.1, sgaPct: 0.05, depreciation: 400, stb: 2_000, cpltd: 200, ltd: 1_700, fixedAssets: 4_800, otherNca: 100, cash: 150, recDays: 85, invDays: 90, payDays: 70, otherCa: 300, otherCl: 350, otherNcl: 200, ocfConversion: 0.55, capex: 80 }),
    ],
    ratings: [
      { orr: 5, quant: 58, qual: 60, monthsAgo: 14, rationale: "Adequate as captive supplier." },
      { orr: 7, modelGrade: 6, quant: 50, qual: 46, monthsAgo: 4, rationale: "TF rescheduled under R-9; related-party receivables from Ravi Textiles.", overrideReason: "Analyst override one notch worse: 62% of receivables are due from Ravi Textiles, which is in default." },
    ],
    facilities: [
      {
        ref: "SUTL-TF-01", type: "TERM_FINANCE", sanctioned: 1_000, outstanding: 1_000, pricing: "6M KIBOR + 2.50%", eir: 0.15,
        sanctionDate: "2022-04-01", maturityDate: "2030-04-01", seniority: "SENIOR_SECURED", dpd: 0, restructured: true, classification: "OAEM",
        classificationReason: "Rescheduled in Jul 2025 (R-9); classification retained, not upgraded on restructure.",
        purpose: "Spinning BMR (rescheduled: 18-month grace, tenor +3 years)", covenants: [{ text: "DSCR ≥ 1.10x (revised)", status: "WATCH" }],
        collateral: [{ type: "LAND_BUILDING", description: "Exclusive mortgage over spinning unit", marketValue: 1_250, fsv: 940, chargeType: "EXCLUSIVE" }],
      },
      {
        ref: "SUTL-RF-01", type: "RUNNING_FINANCE", sanctioned: 600, outstanding: 400, pricing: "1M KIBOR + 2.25%", eir: 0.145,
        sanctionDate: "2025-07-01", maturityDate: "2026-06-30", seniority: "SENIOR_SECURED", dpd: 0, classification: "OAEM",
        purpose: "Working capital",
        collateral: [{ type: "STOCK_RECEIVABLES", description: "Hypothecation of cotton stocks", marketValue: 500, fsv: 350, chargeType: "HYPOTHECATION" }],
      },
    ],
    notes: [
      { category: "RELATED_PARTY", severity: "HIGH", snippet: "Trade debts include PKR 1,240 million receivable from Ravi Textiles Limited, a related party, of which PKR 610 million is overdue by more than 180 days.", explanation: "Most of the receivables come from a group company that is itself in default — contagion risk." },
      { category: "PLEDGED_ASSETS", severity: "LOW", snippet: "Shares of the Company held by the sponsors are pledged with a commercial bank as security for facilities of an associated company.", explanation: "Sponsor equity is already pledged elsewhere in the group." },
    ],
    notesFiller: "The Company is a private limited company engaged in the manufacture and sale of cotton yarn.",
    news: [
      { daysAgo: 3, source: "Financial daily", headline: "Ravi Group flagship defaults on TFC profit", summary: "Group contagion concerns for associated companies.", sentiment: "NEGATIVE", impact: "MEDIUM", riskSignal: "Group contagion" },
      { daysAgo: 35, source: "Sector report", headline: "Spinning mills cut shifts on high energy tariffs", summary: "Several mills reduce capacity utilisation.", sentiment: "NEGATIVE", impact: "LOW", riskSignal: "Sector margin squeeze" },
    ],
    proposal: {
      purpose: "Post-restructuring review.",
      facilityStructure: "TF PKR 1,000m (rescheduled), RF PKR 600m.",
      borrowerBackground: "",
      financialSummary: "",
      security: "Exclusive mortgage over spinning unit; hypothecation of stocks.",
      ratingRecommendation: "ORR 7 (model 6, override −1 for related-party exposure).",
      conditions: "",
    },
    profile: [{ section: "GROUP", content: "Ravi Group captive supplier.", score: 55 }],
  },
  {
    key: "karakoram",
    name: "Karakoram Shipping (Pvt) Ltd",
    sector: "SHIPPING",
    listed: false,
    ownership: "Founders 80%, private equity 20%",
    description: "Owner-operator of three Supramax bulk carriers on time-charter and spot voyages (illustrative).",
    nextReviewInDays: 60,
    stage: 2,
    stageReason: "SICR: ORR downgraded 2 notches since origination; DSCR covenant breach.",
    auditor: "Illustrative Chartered Accountants F",
    years: [
      base({ revenue: 14_000, grossMargin: 0.3, sgaPct: 0.04, depreciation: 1_600, stb: 1_200, cpltd: 1_800, ltd: 10_800, fixedAssets: 26_000, otherNca: 300, cash: 1_400, recDays: 40, invDays: 15, payDays: 35, otherCa: 600, otherCl: 700, otherNcl: 500, ocfConversion: 0.8, capex: 400 }),
      base({ revenue: 16_500, grossMargin: 0.31, sgaPct: 0.04, depreciation: 1_700, stb: 1_300, cpltd: 1_800, ltd: 9_000, fixedAssets: 25_500, otherNca: 300, cash: 1_900, recDays: 42, invDays: 15, payDays: 35, otherCa: 600, otherCl: 700, otherNcl: 500, ocfConversion: 0.8, capex: 900 }),
      base({ revenue: 13_800, grossMargin: 0.32, sgaPct: 0.045, depreciation: 1_700, stb: 1_500, cpltd: 1_800, ltd: 7_200, fixedAssets: 24_000, otherNca: 300, cash: 1_600, recDays: 55, invDays: 15, payDays: 45, otherCa: 600, otherCl: 800, otherNcl: 500, ocfConversion: 0.75, capex: 300 }),
    ],
    ratings: [
      { orr: 4, quant: 67, qual: 66, monthsAgo: 18, rationale: "Strong charter rates; modern fleet." },
      { orr: 5, quant: 60, qual: 60, monthsAgo: 9, rationale: "Charter rates normalising." },
      { orr: 6, quant: 50, qual: 56, monthsAgo: 1, rationale: "Freight market down; DSCR below covenant at 1.0x. SICR — Stage 2." },
    ],
    facilities: [
      {
        ref: "KRKS-TF-01", type: "TERM_FINANCE", sanctioned: 2_000, outstanding: 1_800, pricing: "6M KIBOR + 2.25%", eir: 0.145,
        sanctionDate: "2023-01-15", maturityDate: "2030-01-15", seniority: "SENIOR_SECURED", dpd: 0, classification: "REGULAR",
        purpose: "Acquisition of second-hand Supramax vessel", covenants: [{ text: "DSCR ≥ 1.25x", status: "BREACHED" }, { text: "Loan-to-value ≤ 70%", status: "MET" }],
        collateral: [{ type: "PLANT_MACHINERY", description: "First preferred mortgage over MV 'Illustrative Star'", marketValue: 2_700, fsv: 2_025, chargeType: "EXCLUSIVE" }],
      },
      {
        ref: "KRKS-RF-01", type: "RUNNING_FINANCE", sanctioned: 500, outstanding: 300, pricing: "1M KIBOR + 2.00%", eir: 0.14,
        sanctionDate: "2025-03-01", maturityDate: "2026-02-28", seniority: "SENIOR_UNSECURED", dpd: 0, classification: "REGULAR",
        purpose: "Bunker and port-cost financing",
        collateral: [{ type: "CORPORATE_GUARANTEE", description: "Guarantee of founders' holding company", marketValue: 0, fsv: 0, chargeType: "LIEN" }],
      },
    ],
    notes: [
      { category: "COVENANT_BREACH", severity: "MEDIUM", snippet: "As at 30 June 2025 the debt service coverage ratio was 1.0 times against a covenant of 1.25 times; the lender has not waived the breach as at the date of authorisation of these financial statements.", explanation: "An unwaived covenant breach: the lender can accelerate, and it is a SICR trigger." },
      { category: "PLEDGED_ASSETS", severity: "LOW", snippet: "All three vessels are subject to first preferred mortgages in favour of financing institutions.", explanation: "No unencumbered vessels remain as fresh security." },
    ],
    notesFiller: "The Company owns and operates dry-bulk vessels under Pakistani flag.",
    news: [
      { daysAgo: 10, source: "Industry wire", headline: "Dry-bulk index slides to 18-month low", summary: "Supramax rates fall sharply on weaker grain and coal trade.", sentiment: "NEGATIVE", impact: "MEDIUM", riskSignal: "Revenue pressure" },
      { daysAgo: 30, source: "Industry wire", headline: "Red Sea diversions keep voyage costs elevated", summary: "Longer routes raise bunker consumption.", sentiment: "NEGATIVE", impact: "MEDIUM", riskSignal: "Cost pressure" },
      { daysAgo: 48, source: "Trade journal", headline: "Karakoram Shipping wins 12-month charter with grain trader", summary: "Fixed-rate charter for one vessel (illustrative).", sentiment: "POSITIVE", impact: "LOW", riskSignal: "Partial revenue visibility" },
    ],
    proposal: {
      purpose: "Interim review following covenant breach.",
      facilityStructure: "",
      borrowerBackground: "Founder-led shipping company, 3 vessels.",
      financialSummary: "",
      security: "",
      ratingRecommendation: "",
      conditions: "",
    },
    profile: [],
  },
  {
    key: "margalla",
    name: "Margalla Foods (Pvt) Ltd",
    sector: "FMCG",
    listed: false,
    ownership: "Founder 75%, family 25%",
    description: "Packaged snacks and biscuits with nationwide distribution through 120 distributors.",
    nextReviewInDays: 180,
    stage: 1,
    stageReason: "Performing.",
    auditor: "Illustrative Chartered Accountants A",
    years: [
      base({ revenue: 18_000, grossMargin: 0.27, sgaPct: 0.16, depreciation: 500, stb: 2_400, cpltd: 300, ltd: 1_800, fixedAssets: 6_500, otherNca: 200, cash: 1_300, recDays: 20, invDays: 55, payDays: 50, otherCa: 800, otherCl: 600, otherNcl: 300, ocfConversion: 0.75, capex: 900 }),
      base({ revenue: 21_500, grossMargin: 0.27, sgaPct: 0.16, depreciation: 550, stb: 2_500, cpltd: 300, ltd: 1_600, fixedAssets: 7_100, otherNca: 200, cash: 1_500, recDays: 20, invDays: 55, payDays: 52, otherCa: 850, otherCl: 600, otherNcl: 300, ocfConversion: 0.75, capex: 1_100 }),
      base({ revenue: 24_800, grossMargin: 0.28, sgaPct: 0.16, depreciation: 600, stb: 2_500, cpltd: 300, ltd: 1_300, fixedAssets: 7_700, otherNca: 200, cash: 1_800, recDays: 20, invDays: 55, payDays: 54, otherCa: 900, otherCl: 600, otherNcl: 300, ocfConversion: 0.78, capex: 1_200 }),
    ],
    ratings: [
      { orr: 4, quant: 67, qual: 66, monthsAgo: 12, rationale: "Growing brand; founder-dependent." },
      { orr: 4, quant: 70, qual: 66, monthsAgo: 2, rationale: "Revenue +15%; margins stable; low leverage." },
    ],
    facilities: [
      {
        ref: "MRGF-RF-01", type: "RUNNING_FINANCE", sanctioned: 1_200, outstanding: 1_000, pricing: "1M KIBOR + 1.50%", eir: 0.13,
        sanctionDate: "2025-08-01", maturityDate: "2026-07-31", seniority: "SENIOR_SECURED", dpd: 0, classification: "REGULAR",
        purpose: "Working capital (flour, oil, packaging)", covenants: [{ text: "Current ratio ≥ 1.0x", status: "MET" }],
        collateral: [{ type: "STOCK_RECEIVABLES", description: "Hypothecation of stocks & receivables", marketValue: 1_300, fsv: 975, chargeType: "HYPOTHECATION" }],
      },
      {
        ref: "MRGF-LS-01", type: "LEASE", sanctioned: 800, outstanding: 700, pricing: "6M KIBOR + 2.00%", eir: 0.14,
        sanctionDate: "2024-11-01", maturityDate: "2028-11-01", seniority: "SENIOR_SECURED", dpd: 0, classification: "REGULAR",
        purpose: "Distribution vehicles & packing line",
        collateral: [{ type: "PLANT_MACHINERY", description: "Title of leased assets", marketValue: 760, fsv: 570, chargeType: "EXCLUSIVE" }],
      },
    ],
    notes: [
      { category: "RELATED_PARTY", severity: "LOW", snippet: "The Company rents its head office from the Chief Executive at a monthly rent of PKR 2.4 million.", explanation: "Minor related-party arrangement; arm's-length terms should be confirmed." },
    ],
    notesFiller: "The Company manufactures and distributes packaged food products.",
    news: [
      { daysAgo: 22, source: "Trade journal", headline: "Margalla Foods opens new distribution hub in Multan", summary: "Expansion into south Punjab (illustrative).", sentiment: "POSITIVE", impact: "LOW", riskSignal: "Growth" },
      { daysAgo: 75, source: "Financial daily", headline: "Food inflation eases; packaged-food volumes recover", summary: "Sector volumes up on lower inflation.", sentiment: "POSITIVE", impact: "LOW", riskSignal: "Demand recovery" },
    ],
    proposal: {
      purpose: "Annual review; enhancement of RF by PKR 300m requested.",
      facilityStructure: "RF PKR 1,200m (→ 1,500m), lease PKR 800m.",
      borrowerBackground: "Founder-led FMCG company, 15 years.",
      financialSummary: "",
      security: "",
      ratingRecommendation: "",
      conditions: "",
    },
    profile: [
      { section: "HISTORY", content: "Founded 2010.", score: 75 },
      { section: "MANAGEMENT", content: "Founder CEO; key-person risk.", score: 50 },
    ],
  },
];

export interface SeedAlert {
  borrower: string;
  type: AlertType;
  severity: Severity;
  title: string;
  message: string;
  daysAgo: number;
  status?: "OPEN" | "ACKNOWLEDGED" | "RESOLVED";
}

export const ALERTS: SeedAlert[] = [
  { borrower: "ravi", type: "HIGH_IMPACT_NEWS", severity: "HIGH", title: "TFC profit payment missed — default notice", message: "Trustee served an event-of-default notice on Ravi Textiles' listed TFC. Check cross-default clauses on our RF and TF.", daysAgo: 3 },
  { borrower: "ravi", type: "STAGE_MIGRATION", severity: "HIGH", title: "Stage 2 → Stage 3 (credit-impaired)", message: "Both facilities 95 DPD. ECL now lifetime with two-track test against R-8 Substandard provision.", daysAgo: 2 },
  { borrower: "ravi", type: "RATING_DOWNGRADE", severity: "HIGH", title: "ORR 7 → 8 (Substandard)", message: "Model grade 8 approved. Classification moves to Substandard under R-8.", daysAgo: 1 },
  { borrower: "zenith", type: "HIGH_IMPACT_NEWS", severity: "MEDIUM", title: "Circular debt at new high", message: "Power-sector arrears rising; Zenith receivable days already above 300.", daysAgo: 6 },
  { borrower: "zenith", type: "STAGE_MIGRATION", severity: "MEDIUM", title: "Stage 1 → Stage 2 (watch-list)", message: "Placed on watch-list; SICR trigger met.", daysAgo: 60, status: "ACKNOWLEDGED" },
  { borrower: "karakoram", type: "COVENANT_BREACH", severity: "MEDIUM", title: "DSCR covenant breached (1.0x vs 1.25x)", message: "Unwaived breach on KRKS-TF-01. Decide on waiver vs. reservation of rights.", daysAgo: 25 },
  { borrower: "karakoram", type: "RATING_DOWNGRADE", severity: "MEDIUM", title: "ORR 5 → 6", message: "Two notches below origination grade — SICR trigger; moved to Stage 2.", daysAgo: 30, status: "ACKNOWLEDGED" },
  { borrower: "indus", type: "EXPOSURE_LIMIT", severity: "MEDIUM", title: "Indus Group near R-1 group limit", message: "Group exposure is above 80% of the R-1 group limit (50% of equity). Single-borrower exposure to Indus Fertilizer is also above 90% of its limit.", daysAgo: 1 },
  { borrower: "sutlej", type: "RATING_DOWNGRADE", severity: "MEDIUM", title: "ORR 5 → 7 (override)", message: "Analyst override for related-party receivables from Ravi Textiles. Restructured under R-9.", daysAgo: 120, status: "RESOLVED" },
  { borrower: "chenab", type: "HIGH_IMPACT_NEWS", severity: "LOW", title: "Winter gas curtailment", message: "30% gas curtailment expected to reduce H1 FY26 production.", daysAgo: 20, status: "ACKNOWLEDGED" },
];

/**
 * Fictional PSX symbols for offline demos (PSX_DATA_SOURCE=seed). The five
 * listed demo borrowers plus look-alike names so fuzzy search has something to
 * disambiguate. A live sync adds the real PSX list alongside these.
 */
export const DEMO_PSX_SYMBOLS = [
  { symbol: "SMTC", name: "Summit Cement Limited", sectorName: "CEMENT" },
  { symbol: "IFZL", name: "Indus Fertilizer Limited", sectorName: "FERTILIZER" },
  { symbol: "CHNC", name: "Chenab Chemicals Limited", sectorName: "CHEMICAL" },
  { symbol: "ZNTH", name: "Zenith Power Limited", sectorName: "POWER GENERATION & DISTRIBUTION" },
  { symbol: "RVTX", name: "Ravi Textiles Limited", sectorName: "TEXTILE COMPOSITE" },
  { symbol: "SMTX", name: "Summit Textile Mills Limited", sectorName: "TEXTILE SPINNING" },
  { symbol: "INPC", name: "Indus Petrochemicals Limited", sectorName: "CHEMICAL" },
  { symbol: "CHGL", name: "Chenab Glass Limited", sectorName: "GLASS & CERAMICS" },
  { symbol: "RVSP", name: "Ravi Spinning Mills Limited", sectorName: "TEXTILE SPINNING" },
  { symbol: "MGPM", name: "Margalla Paper Mills Limited", sectorName: "PAPER, BOARD & PACKAGING" },
  { symbol: "ZNTX", name: "Zenith Textile Mills Limited", sectorName: "TEXTILE COMPOSITE" },
  { symbol: "KRKS", name: "Karakoram Steel Limited", sectorName: "ENGINEERING" },
  { symbol: "STSG", name: "Sutlej Sugar Mills Limited", sectorName: "SUGAR & ALLIED INDUSTRIES" },
];
