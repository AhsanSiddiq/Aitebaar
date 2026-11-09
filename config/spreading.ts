/**
 * Standard spreading template. Every financial statement — manual, uploaded or
 * fed — is normalised into these keys (PKR, millions). Derived figures
 * (EBIT, EBITDA, total debt …) are computed in lib/finance/ratios.ts, not stored.
 */
export const LINE_ITEMS = [
  // Income statement
  { key: "revenue", label: "Net revenue", section: "IS" },
  { key: "cogs", label: "Cost of sales", section: "IS" },
  { key: "sellingAdminExpenses", label: "Selling, distribution & admin", section: "IS" },
  { key: "depreciation", label: "Depreciation & amortisation", section: "IS" },
  { key: "otherIncome", label: "Other operating income", section: "IS" },
  { key: "financeCost", label: "Finance cost (interest)", section: "IS" },
  { key: "taxExpense", label: "Taxation", section: "IS" },
  { key: "netIncome", label: "Profit / (loss) after tax", section: "IS" },
  // Balance sheet
  { key: "cash", label: "Cash & cash equivalents", section: "BS" },
  { key: "receivables", label: "Trade receivables", section: "BS" },
  { key: "inventory", label: "Stock-in-trade", section: "BS" },
  { key: "otherCurrentAssets", label: "Other current assets", section: "BS" },
  { key: "currentAssets", label: "Total current assets", section: "BS" },
  { key: "fixedAssets", label: "Property, plant & equipment", section: "BS" },
  { key: "otherNonCurrentAssets", label: "Other non-current assets", section: "BS" },
  { key: "totalAssets", label: "Total assets", section: "BS" },
  { key: "payables", label: "Trade & other payables", section: "BS" },
  { key: "shortTermBorrowings", label: "Short-term borrowings", section: "BS" },
  { key: "currentPortionLtd", label: "Current portion of long-term debt", section: "BS" },
  { key: "otherCurrentLiabilities", label: "Other current liabilities", section: "BS" },
  { key: "currentLiabilities", label: "Total current liabilities", section: "BS" },
  { key: "longTermDebt", label: "Long-term financing", section: "BS" },
  { key: "otherNonCurrentLiabilities", label: "Other non-current liabilities", section: "BS" },
  { key: "totalLiabilities", label: "Total liabilities", section: "BS" },
  { key: "equity", label: "Total equity", section: "BS" },
  // Cash flow
  { key: "operatingCashFlow", label: "Cash from operations", section: "CF" },
  { key: "capex", label: "Capital expenditure", section: "CF" },
  { key: "taxesPaid", label: "Taxes paid", section: "CF" },
] as const;

export type LineItemKey = (typeof LINE_ITEMS)[number]["key"];
export type Spread = Partial<Record<LineItemKey, number>>;
