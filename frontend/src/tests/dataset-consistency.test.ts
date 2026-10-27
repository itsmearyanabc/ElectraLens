import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  primaryComparison,
  datasetVersions,
  findings,
  areaBreakdowns,
  getDatasetVersion,
  getFinding,
  getBooth,
  syntheticBooths,
} from "../lib/data";

describe("Dataset Consistency & Integrity", () => {
  test("Net change arithmetic matches baseline and target totals", () => {
    const netCalculated = primaryComparison.totalBaseline + primaryComparison.additions - primaryComparison.deletions;
    assert.equal(
      netCalculated,
      primaryComparison.totalTarget,
      "Target electorate must equal baseline + additions - deletions"
    );
  });

  test("Area breakdowns additions sum equals total additions exactly", () => {
    const sumAdditions = areaBreakdowns.reduce((acc, a) => acc + a.additions, 0);
    assert.equal(
      sumAdditions,
      primaryComparison.additions,
      "Sum of additions across all subunits must match aggregate additions"
    );
  });

  test("All dataset versions have valid 64-character hex SHA-256 hashes", () => {
    for (const version of datasetVersions) {
      assert.match(
        version.hash,
        /^[0-9a-f]{64}$/,
        `Version ${version.id} must have a valid 64-char lowercase hex hash`
      );
    }
  });

  test("All findings reference existing baseline and target datasets", () => {
    for (const finding of findings) {
      const base = getDatasetVersion(finding.baselineVersion);
      const targ = getDatasetVersion(finding.targetVersion);
      assert.ok(base, `Finding ${finding.id} references valid baseline dataset`);
      assert.ok(targ, `Finding ${finding.id} references valid target dataset`);
    }
  });

  test("All findings have valid alternative explanations and limitations", () => {
    for (const finding of findings) {
      assert.ok(
        finding.alternativeExplanations.length >= 2,
        `Finding ${finding.id} must provide at least 2 non-malicious alternative explanations`
      );
      assert.ok(
        finding.limitations.length >= 1,
        `Finding ${finding.id} must document known analytical limitations`
      );
    }
  });

  test("Synthetic polling stations are strictly marked with fictional disclaimer", () => {
    for (const booth of syntheticBooths) {
      assert.equal(booth.isSynthetic, true, "Booth must have isSynthetic true flag");
      assert.ok(
        booth.address.includes("FICTIONAL") || booth.source.includes("Synthetic"),
        "Booth must explicitly declare synthetic provenance in address or source"
      );
    }
  });
});
