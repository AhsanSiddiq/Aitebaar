import type { ExchangeEventType, Sentiment, Severity } from "@/lib/domain";

/**
 * Rule-based classification of PSX announcement titles into event type +
 * sentiment + risk impact. Deterministic and explainable; the LLM classifier
 * (§10) can refine later and is always human-reviewable.
 */
interface Rule {
  test: RegExp;
  type: ExchangeEventType;
  sentiment: Sentiment;
  impact: Severity;
}

const RULES: Rule[] = [
  { test: /winding[- ]up|insolven|liquidat|bankrupt/i, type: "DEFAULT", sentiment: "NEGATIVE", impact: "HIGH" },
  { test: /default|non[- ]?payment|defaulter|unable to (pay|meet)|missed payment|delay in (payment|redemption)/i, type: "DEFAULT", sentiment: "NEGATIVE", impact: "HIGH" },
  { test: /penalt|fine imposed|show[- ]cause|non[- ]?compliance|suspension of trading|suspended|placed in.*segment/i, type: "PENALTY", sentiment: "NEGATIVE", impact: "MEDIUM" },
  { test: /(no|not|pass(ed)?)\s+(any\s+)?(cash\s+)?dividend|dividend.*not.*declared/i, type: "DIVIDEND", sentiment: "NEGATIVE", impact: "LOW" },
  { test: /dividend|bonus|right shares|payout|book closure/i, type: "DIVIDEND", sentiment: "POSITIVE", impact: "LOW" },
  { test: /resign\w*.*(chief executive|ceo|cfo|chief financial)|(chief executive|ceo|cfo|chief financial).*resign/i, type: "MANAGEMENT_CHANGE", sentiment: "NEGATIVE", impact: "MEDIUM" },
  { test: /chief executive|\bceo\b|\bcfo\b|chief financial|company secretary|change in management|managing director/i, type: "MANAGEMENT_CHANGE", sentiment: "NEUTRAL", impact: "LOW" },
  { test: /director|board of directors|election of|casual vacancy|chairman/i, type: "BOARD_CHANGE", sentiment: "NEUTRAL", impact: "LOW" },
  { test: /financial results|accounts for|quarterly|half[- ]yearly|annual report|transmission of.*(accounts|report)/i, type: "RESULTS", sentiment: "NEUTRAL", impact: "LOW" },
  { test: /closure|shut ?down|fire|flood|strike|litigation|restructur|reschedul|loss of|curtail|suspend/i, type: "MATERIAL_INFO", sentiment: "NEGATIVE", impact: "MEDIUM" },
  { test: /material information|price sensitive/i, type: "MATERIAL_INFO", sentiment: "NEUTRAL", impact: "LOW" },
];

export function classifyAnnouncement(title: string): { type: ExchangeEventType; sentiment: Sentiment; riskImpact: Severity; rule: string } {
  for (const r of RULES) if (r.test.test(title)) return { type: r.type, sentiment: r.sentiment, riskImpact: r.impact, rule: r.test.source };
  return { type: "MATERIAL_INFO", sentiment: "NEUTRAL", riskImpact: "LOW", rule: "default" };
}
