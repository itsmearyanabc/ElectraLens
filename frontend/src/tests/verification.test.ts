import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  canonicalise,
  computeDocumentHash,
  demonstrateTamper,
  verifyPublication,
  sha256,
} from "../lib/verification";

describe("Cryptographic Verification & Tamper Detection", () => {
  test("Canonicalisation sorts keys alphabetically and removes whitespace differences", () => {
    const doc1 = { b: 2, a: 1, c: { z: 9, y: 8 } };
    const doc2 = { c: { y: 8, z: 9 }, a: 1, b: 2 };

    const canon1 = canonicalise(doc1);
    const canon2 = canonicalise(doc2);

    assert.equal(canon1, canon2, "Different key order must yield identical canonical representation");
    assert.equal(canon1, '{"a":1,"b":2,"c":{"y":8,"z":9}}');
  });

  test("SHA-256 produces valid 64-character lowercase hexadecimal hash", async () => {
    const hash = await sha256("ELECTRALENS_VERIFICATION_TEST");
    assert.equal(hash.length, 64);
    assert.match(hash, /^[0-9a-f]{64}$/);
  });

  test("Identical documents produce matching hashes", async () => {
    const docA = { title: "Test Report", additions: 24891 };
    const docB = { additions: 24891, title: "Test Report" };

    const hashA = await computeDocumentHash(docA);
    const hashB = await computeDocumentHash(docB);

    assert.equal(hashA, hashB, "Semantically identical documents must yield identical hash");
  });

  test("Tamper demonstration detects single value change", async () => {
    const originalJson = JSON.stringify({
      comparison: { additions: 24891, deletions: 9337 },
      title: "Synthetic Report",
    });

    const tamperResult = await demonstrateTamper(
      originalJson,
      "comparison.additions",
      99999
    );

    assert.equal(tamperResult.match, false, "Altered record must not match original hash");
    assert.notEqual(tamperResult.originalHash, tamperResult.tamperedHash);
    assert.equal(tamperResult.originalValue, 24891);
    assert.equal(tamperResult.tamperedValue, 99999);
  });
});
