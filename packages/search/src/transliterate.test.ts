import { describe, expect, it } from "vitest";

import { buildProductSynonyms } from "./synonyms";
import { alphabetVariants, buildBrandSynonyms, cyrToLat, latToCyr } from "./transliterate";

describe("transliteration", () => {
  it("converts Cyrillic brand to Latin", () => {
    expect(cyrToLat("Тритон")).toBe("triton");
  });

  it("converts Latin brand to Cyrillic", () => {
    expect(latToCyr("triton")).toBe("тритон");
  });

  it("handles Latin digraphs", () => {
    expect(latToCyr("grohe")).toBe("грохе");
    expect(latToCyr("hansgrohe")).toBe("хансгрохе");
  });

  it("expands a query token across alphabets", () => {
    expect(alphabetVariants("triton").sort()).toEqual(["тритон", "triton"].sort());
    expect(alphabetVariants("тритон").sort()).toEqual(["тритон", "triton"].sort());
  });
});

describe("brand synonyms", () => {
  it("links a Cyrillic brand to its Latin form both ways", () => {
    const syn = buildBrandSynonyms(["Тритон"]);
    expect(syn["тритон"]).toContain("triton");
    expect(syn["triton"]).toContain("тритон");
  });

  it("handles multi-word brand names per token", () => {
    const syn = buildBrandSynonyms(["White Wave"]);
    expect(syn["white"]).toBeDefined();
    expect(syn["wave"]).toBeDefined();
  });
});

describe("product synonyms", () => {
  it("includes curated Russian plural groups", () => {
    const syn = buildProductSynonyms([]);
    expect(syn["ванны"]).toContain("ванна");
    expect(syn["смесители"]).toContain("смеситель");
  });

  it("merges curated and brand synonyms", () => {
    const syn = buildProductSynonyms(["Тритон"]);
    expect(syn["ванна"]).toBeDefined();
    expect(syn["тритон"]).toContain("triton");
  });
});
