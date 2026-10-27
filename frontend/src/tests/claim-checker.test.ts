import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { evaluateClaim } from "../lib/data";

describe("Claim Checker Verdict Logic", () => {
  test("Consistent claim returns consistent verdict within tolerance", () => {
    // Vidyanagar addition rate is 4.38%
    const res = evaluateClaim(
      "Vidyanagar Assembly",
      "Addition rate",
      "January 2024 — April 2024",
      "4.4",
      "equal to"
    );
    assert.equal(res.verdict, "consistent");
    assert.ok(res.reasoning.includes("within ±10%"));
  });

  test("Contradicted claim returns contradicted verdict", () => {
    // Lakshminagar deletion rate is 2.30%, claimed is 8.5%
    const res = evaluateClaim(
      "Lakshminagar Assembly",
      "Deletion rate",
      "January 2024 — April 2024",
      "8.5",
      "equal to"
    );
    assert.equal(res.verdict, "contradicted");
    assert.ok(res.reasoning.includes("differs"));
  });

  test("Claims alleging fraud, rigging, or intent return cannot-establish", () => {
    const res1 = evaluateClaim(
      "Rajpur Ward",
      "Addition rate",
      "January 2024 — April 2024",
      "deliberate fraud and illegal registration",
      "equal to"
    );
    assert.equal(res1.verdict, "cannot-establish");
    assert.ok(
      res1.reasoning.includes("Cannot be established") ||
      res1.reasoning.includes("intent, fraud, or wrongdoing")
    );

    const res2 = evaluateClaim(
      "Vidyanagar Assembly",
      "fraudulent additions",
      "January 2024 — April 2024",
      "1000",
      "greater than"
    );
    assert.equal(res2.verdict, "cannot-establish");
  });

  test("Unmatched area returns insufficient-data with explicit explanation", () => {
    const res = evaluateClaim(
      "NonExistent Area Territory",
      "Addition rate",
      "January 2024 — April 2024",
      "3.5",
      "equal to"
    );
    assert.equal(res.verdict, "insufficient-data");
    assert.ok(res.reasoning.includes("No data is available"));
  });
});
