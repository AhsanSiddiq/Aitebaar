import { describe, expect, it } from "vitest";
import { classByDpd, classify, worstClass } from "./classification";

describe("R-8 classification", () => {
  it.each([
    [0, "REGULAR"], [59, "REGULAR"], [60, "OAEM"], [89, "OAEM"], [90, "SUBSTANDARD"],
    [179, "SUBSTANDARD"], [180, "DOUBTFUL"], [364, "DOUBTFUL"], [365, "LOSS"],
  ])("DPD %i → %s", (dpd, cls) => expect(classByDpd(dpd)).toBe(cls));

  it("takes the worst of DPD, grade and subjective override", () => {
    expect(classify({ dpd: 0, orrGrade: 7 }).sbpClass).toBe("OAEM");
    expect(classify({ dpd: 95, orrGrade: 3 }).sbpClass).toBe("SUBSTANDARD");
    expect(classify({ dpd: 0, orrGrade: 4, subjective: { sbpClass: "DOUBTFUL", reason: "Fraud identified" } }).sbpClass).toBe("DOUBTFUL");
  });

  it("requires a reason for subjective downgrade", () => {
    expect(() => classify({ dpd: 0, subjective: { sbpClass: "OAEM", reason: " " } })).toThrow();
  });

  it("R-9: restructuring does not upgrade — prior class is a floor", () => {
    expect(classify({ dpd: 0, orrGrade: 5, restructured: true, priorClass: "SUBSTANDARD" }).sbpClass).toBe("SUBSTANDARD");
    expect(classify({ dpd: 0, orrGrade: 5, restructured: false, priorClass: "SUBSTANDARD" }).sbpClass).toBe("REGULAR");
  });

  it("worstClass ignores nulls", () => {
    expect(worstClass(null, "OAEM", undefined)).toBe("OAEM");
    expect(worstClass()).toBe("REGULAR");
  });
});
