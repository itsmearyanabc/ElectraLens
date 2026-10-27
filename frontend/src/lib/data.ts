// Deterministic synthetic dataset for ElectraLens
// All data is fictional and for demonstration purposes only

export interface DatasetVersion {
  id: string;
  label: string;
  date: string;
  totalRecords: number;
  source: string;
  hash: string;
}

export interface ComparisonResult {
  baselineId: string;
  targetId: string;
  additions: number;
  deletions: number;
  corrections: number;
  totalBaseline: number;
  totalTarget: number;
  period: string;
  computedAt: string;
}

export interface Finding {
  id: string;
  ruleId: string;
  ruleName: string;
  ruleVersion: string;
  area: string;
  areaCode: string;
  observedValue: number;
  denominator: number;
  expectedBaseline: number;
  effectSize: number;
  rateRatio: number;
  statisticalTest: string;
  pValue: number;
  confidenceInterval: [number, number];
  adjustedQValue: number;
  testsPerformed: number;
  signalStrength: 'weak' | 'moderate' | 'strong';
  reviewStatus: 'pending' | 'reviewed' | 'published' | 'disputed';
  explanation: string;
  alternativeExplanations: string[];
  limitations: string[];
  detectionCriterion: string;
  methodologyVersion: string;
  baselineVersion: string;
  targetVersion: string;
  category: 'addition-rate' | 'deletion-rate' | 'duplicate-detection' | 'age-distribution' | 'name-pattern';
  publicationStatus: 'draft' | 'published' | 'retracted';
}

export interface BoothInfo {
  code: string;
  name: string;
  address: string;
  partsServed: string[];
  accessibilityNotes: string;
  source: string;
  lastVerified: string;
  isSynthetic: true;
}

export interface StatisticalRule {
  id: string;
  name: string;
  description: string;
  category: string;
  detectionCriterion: string;
  statisticalTest: string;
  threshold: string;
  limitations: string[];
  version: string;
  benchmarkPrecision: string;
  benchmarkRecall: string;
}

export interface PublicationManifest {
  id: string;
  version: number;
  publishedAt: string;
  reportHash: string;
  aggregateHash: string;
  manifestHash: string;
  previousManifestHash: string | null;
  reportContent: string;
  aggregateContent: string;
  publisher: string;
  status: 'published' | 'superseded';
}

// ============ DATASET VERSIONS ============
export const datasetVersions: DatasetVersion[] = [
  {
    id: 'v2024-Q1-draft',
    label: 'Q1 2024 Draft Roll',
    date: '2024-01-15',
    totalRecords: 1847293,
    source: 'Synthetic electoral roll — DEMO DATA',
    hash: '51c4c5b5a0c39852a45494ae0037d755723a6ac782efa3dde6587feec43d8b06',
  },
  {
    id: 'v2024-Q2-final',
    label: 'Q2 2024 Final Roll',
    date: '2024-04-01',
    totalRecords: 1862847,
    source: 'Synthetic electoral roll — DEMO DATA',
    hash: '7818c5a4ef67d90014489be00b981d3f2c27d1038f3e29af48691b7df28119e0',
  },
  {
    id: 'v2024-Q3-draft',
    label: 'Q3 2024 Draft Roll',
    date: '2024-07-01',
    totalRecords: 1879512,
    source: 'Synthetic electoral roll — DEMO DATA',
    hash: '085c1c82f088bd8ec951f9593a7dbb2e6bc0cd3d763e5f351fa4d123f9c7f144',
  },
];

// ============ COMPARISON RESULT ============
// Comparison between Q1 Draft and Q2 Final
export const primaryComparison: ComparisonResult = {
  baselineId: 'v2024-Q1-draft',
  targetId: 'v2024-Q2-final',
  additions: 24891,
  deletions: 9337,
  corrections: 3842,
  totalBaseline: 1847293,
  totalTarget: 1862847, // 1847293 + 24891 - 9337 = 1862847 ✓
  period: 'January 2024 — April 2024',
  computedAt: '2024-04-15T10:30:00Z',
};

// ============ FINDINGS ============
export const findings: Finding[] = [
  {
    id: 'FND-2024-001',
    ruleId: 'RULE-ADD-01',
    ruleName: 'Unusual Addition Rate',
    ruleVersion: '1.2',
    area: 'Vidyanagar Assembly — Synthetic District',
    areaCode: 'SYN-VID-01',
    observedValue: 1847,
    denominator: 42150,
    expectedBaseline: 987,
    effectSize: 0.87,
    rateRatio: 1.87,
    statisticalTest: 'Two-proportion z-test',
    pValue: 0.0003,
    confidenceInterval: [1.52, 2.31],
    adjustedQValue: 0.0042,
    testsPerformed: 14,
    signalStrength: 'strong',
    reviewStatus: 'published',
    explanation: 'The addition rate in this synthetic constituency (4.38%) is 1.87× the district average (2.34%). This exceeds the detection threshold after multiple-testing correction.',
    alternativeExplanations: [
      'New residential development may have increased eligible population in this area.',
      'A prior registration drive may have targeted this constituency, resulting in delayed batch processing of applications.',
    ],
    limitations: [
      'This analysis uses synthetic data and does not represent any real constituency.',
      'The baseline period may not account for seasonal registration patterns.',
    ],
    detectionCriterion: 'Rate ratio > 1.5 AND adjusted q-value < 0.05',
    methodologyVersion: '1.0.0',
    baselineVersion: 'v2024-Q1-draft',
    targetVersion: 'v2024-Q2-final',
    category: 'addition-rate',
    publicationStatus: 'published',
  },
  {
    id: 'FND-2024-002',
    ruleId: 'RULE-DEL-01',
    ruleName: 'Unusual Deletion Rate',
    ruleVersion: '1.1',
    area: 'Lakshminagar Assembly — Synthetic District',
    areaCode: 'SYN-LAK-01',
    observedValue: 892,
    denominator: 38720,
    expectedBaseline: 412,
    effectSize: 1.16,
    rateRatio: 2.17,
    statisticalTest: 'Two-proportion z-test',
    pValue: 0.00008,
    confidenceInterval: [1.71, 2.74],
    adjustedQValue: 0.0011,
    testsPerformed: 14,
    signalStrength: 'strong',
    reviewStatus: 'published',
    explanation: 'The deletion rate in this synthetic constituency (2.30%) is 2.17× the district average (1.06%). This exceeds the detection threshold after multiple-testing correction.',
    alternativeExplanations: [
      'A large housing complex demolition or redevelopment project may have displaced residents.',
      'Routine de-duplication or deceased-voter cleanup may have been concentrated in this area.',
    ],
    limitations: [
      'This analysis uses synthetic data and does not represent any real constituency.',
      'Deletion reasons are not available in the published aggregate data.',
    ],
    detectionCriterion: 'Rate ratio > 1.5 AND adjusted q-value < 0.05',
    methodologyVersion: '1.0.0',
    baselineVersion: 'v2024-Q1-draft',
    targetVersion: 'v2024-Q2-final',
    category: 'deletion-rate',
    publicationStatus: 'published',
  },
  {
    id: 'FND-2024-003',
    ruleId: 'RULE-DUP-01',
    ruleName: 'Potential Duplicate Cluster',
    ruleVersion: '1.0',
    area: 'Rajpur Ward — Synthetic District',
    areaCode: 'SYN-RAJ-01',
    observedValue: 47,
    denominator: 15230,
    expectedBaseline: 12,
    effectSize: 2.92,
    rateRatio: 3.92,
    statisticalTest: 'Poisson exact test',
    pValue: 0.00001,
    confidenceInterval: [2.87, 5.23],
    adjustedQValue: 0.00014,
    testsPerformed: 14,
    signalStrength: 'strong',
    reviewStatus: 'reviewed',
    explanation: 'The number of records sharing identical name-age-gender triples within this synthetic ward (47) is 3.92× the expected count based on demographic baselines.',
    alternativeExplanations: [
      'Common names in certain demographic groups can produce false duplicate signals.',
      'Family registrations at the same address with similar names may not represent true duplicates.',
    ],
    limitations: [
      'This analysis uses synthetic data and does not represent any real area.',
      'True duplicate detection requires identity verification beyond name-age matching.',
    ],
    detectionCriterion: 'Observed duplicates > 3× expected AND Poisson p-value < 0.01',
    methodologyVersion: '1.0.0',
    baselineVersion: 'v2024-Q1-draft',
    targetVersion: 'v2024-Q2-final',
    category: 'duplicate-detection',
    publicationStatus: 'published',
  },
  {
    id: 'FND-2024-004',
    ruleId: 'RULE-AGE-01',
    ruleName: 'Age Distribution Anomaly',
    ruleVersion: '1.0',
    area: 'Govindpura Block — Synthetic District',
    areaCode: 'SYN-GOV-01',
    observedValue: 312,
    denominator: 24891,
    expectedBaseline: 198,
    effectSize: 0.58,
    rateRatio: 1.58,
    statisticalTest: 'Chi-squared goodness-of-fit',
    pValue: 0.012,
    confidenceInterval: [1.21, 2.06],
    adjustedQValue: 0.084,
    testsPerformed: 14,
    signalStrength: 'weak',
    reviewStatus: 'pending',
    explanation: 'The proportion of new additions in the 18–21 age group (1.25%) is 1.58× higher than the district baseline (0.80%). However, after multiple-testing correction, this does not reach significance (q = 0.084).',
    alternativeExplanations: [
      'A college or university in the area may result in higher first-time voter registrations.',
      'Awareness campaigns targeting young voters may have increased registration in this age group.',
    ],
    limitations: [
      'This analysis uses synthetic data.',
      'The adjusted q-value does not meet the significance threshold of 0.05.',
      'Age distribution analysis is sensitive to small-area demographic composition.',
    ],
    detectionCriterion: 'Age-group rate ratio > 1.5 AND chi-squared p-value < 0.05',
    methodologyVersion: '1.0.0',
    baselineVersion: 'v2024-Q1-draft',
    targetVersion: 'v2024-Q2-final',
    category: 'age-distribution',
    publicationStatus: 'draft',
  },
  {
    id: 'FND-2024-005',
    ruleId: 'RULE-ADD-01',
    ruleName: 'Unusual Addition Rate',
    ruleVersion: '1.2',
    area: 'Shantinagar Ward — Synthetic District',
    areaCode: 'SYN-SHA-01',
    observedValue: 1203,
    denominator: 29840,
    expectedBaseline: 698,
    effectSize: 0.72,
    rateRatio: 1.72,
    statisticalTest: 'Two-proportion z-test',
    pValue: 0.0018,
    confidenceInterval: [1.38, 2.15],
    adjustedQValue: 0.0126,
    testsPerformed: 14,
    signalStrength: 'moderate',
    reviewStatus: 'published',
    explanation: 'The addition rate in this synthetic area (4.03%) is 1.72× the district average (2.34%).',
    alternativeExplanations: [
      'Construction of new apartment complexes may have brought new residents to the area.',
      'The area may have been part of a voter awareness initiative that encouraged registration.',
    ],
    limitations: [
      'This analysis uses synthetic data.',
      'The effect size, while significant, is at the lower end of the detection range.',
    ],
    detectionCriterion: 'Rate ratio > 1.5 AND adjusted q-value < 0.05',
    methodologyVersion: '1.0.0',
    baselineVersion: 'v2024-Q1-draft',
    targetVersion: 'v2024-Q2-final',
    category: 'addition-rate',
    publicationStatus: 'published',
  },
];

// ============ BOOTH INFO ============
export const syntheticBooths: BoothInfo[] = [
  {
    code: 'SYN-B001',
    name: 'Government Primary School, Vidyanagar',
    address: '23, Main Road, Vidyanagar, Synthetic District — FICTIONAL LOCATION',
    partsServed: ['Part 1', 'Part 2', 'Part 3'],
    accessibilityNotes: 'Ramp access available. Ground floor polling.',
    source: 'Synthetic demonstration data',
    lastVerified: '2024-03-15',
    isSynthetic: true,
  },
  {
    code: 'SYN-B002',
    name: 'Community Hall, Lakshminagar',
    address: '45, Second Cross, Lakshminagar, Synthetic District — FICTIONAL LOCATION',
    partsServed: ['Part 4', 'Part 5'],
    accessibilityNotes: 'Step-free access. Accessible restroom available.',
    source: 'Synthetic demonstration data',
    lastVerified: '2024-03-15',
    isSynthetic: true,
  },
];

// ============ STATISTICAL RULES ============
export const statisticalRules: StatisticalRule[] = [
  {
    id: 'RULE-ADD-01',
    name: 'Unusual Addition Rate',
    description: 'Detects constituencies where the rate of new voter additions significantly exceeds the district or state average for the same revision period.',
    category: 'Addition Rate Analysis',
    detectionCriterion: 'Rate ratio > 1.5 AND Benjamini-Hochberg adjusted q-value < 0.05',
    statisticalTest: 'Two-proportion z-test with continuity correction',
    threshold: 'Rate ratio exceeding 1.5× the comparison baseline',
    limitations: [
      'Cannot distinguish between legitimate population growth and irregular additions.',
      'Sensitive to baseline period selection.',
      'Small constituencies may produce unstable rate estimates.',
    ],
    version: '1.2',
    benchmarkPrecision: 'Not yet benchmarked',
    benchmarkRecall: 'Not yet benchmarked',
  },
  {
    id: 'RULE-DEL-01',
    name: 'Unusual Deletion Rate',
    description: 'Detects constituencies where the rate of voter deletions significantly exceeds the district or state average.',
    category: 'Deletion Rate Analysis',
    detectionCriterion: 'Rate ratio > 1.5 AND Benjamini-Hochberg adjusted q-value < 0.05',
    statisticalTest: 'Two-proportion z-test with continuity correction',
    threshold: 'Rate ratio exceeding 1.5× the comparison baseline',
    limitations: [
      'Cannot determine the reason for deletions (death, migration, de-duplication, or other).',
      'Deletion data does not include reason codes in published aggregate data.',
    ],
    version: '1.1',
    benchmarkPrecision: 'Not yet benchmarked',
    benchmarkRecall: 'Not yet benchmarked',
  },
  {
    id: 'RULE-DUP-01',
    name: 'Potential Duplicate Cluster',
    description: 'Identifies wards or polling-station areas with an unusually high number of records sharing identical name, age, and gender combinations.',
    category: 'Duplicate Detection',
    detectionCriterion: 'Observed duplicates > 3× expected count AND Poisson exact test p-value < 0.01',
    statisticalTest: 'Poisson exact test',
    threshold: 'Observed-to-expected ratio exceeding 3.0',
    limitations: [
      'Name-age-gender matching produces false positives in communities with common naming patterns.',
      'True duplicate confirmation requires identity verification beyond statistical matching.',
      'Does not account for legitimate family members with similar details.',
    ],
    version: '1.0',
    benchmarkPrecision: 'Not yet benchmarked',
    benchmarkRecall: 'Not yet benchmarked',
  },
  {
    id: 'RULE-AGE-01',
    name: 'Age Distribution Anomaly',
    description: 'Detects unusual concentrations of new registrations in specific age brackets compared to the demographic baseline.',
    category: 'Age Distribution Analysis',
    detectionCriterion: 'Age-group rate ratio > 1.5 AND chi-squared goodness-of-fit p-value < 0.05',
    statisticalTest: 'Chi-squared goodness-of-fit test',
    threshold: 'Age-group rate ratio exceeding 1.5× the baseline distribution',
    limitations: [
      'Age distribution varies naturally by area (university towns, retirement communities).',
      'Self-reported ages may contain errors.',
      'Small sample sizes in age brackets can produce spurious results.',
    ],
    version: '1.0',
    benchmarkPrecision: 'Not yet benchmarked',
    benchmarkRecall: 'Not yet benchmarked',
  },
];

// ============ PUBLICATION MANIFESTS ============
export const publicationManifests: PublicationManifest[] = [
  {
    id: 'PUB-2024-001',
    version: 1,
    publishedAt: '2024-04-20T14:00:00Z',
    reportHash: '', // Will be computed
    aggregateHash: '', // Will be computed
    manifestHash: '', // Will be computed
    previousManifestHash: null,
    reportContent: JSON.stringify({
      title: 'ElectraLens Synthetic Analysis Report — Q1→Q2 2024',
      period: 'January 2024 to April 2024',
      baseline: 'v2024-Q1-draft',
      target: 'v2024-Q2-final',
      findingsCount: 5,
      publishedFindings: 4,
      generatedAt: '2024-04-20T14:00:00Z',
      disclaimer: 'This report contains entirely synthetic data for demonstration purposes.',
    }, null, 2),
    aggregateContent: JSON.stringify({
      comparison: {
        baseline: 'v2024-Q1-draft',
        target: 'v2024-Q2-final',
        additions: 24891,
        deletions: 9337,
        corrections: 3842,
        totalBaseline: 1847293,
        totalTarget: 1862847,
      },
      findingSummary: {
        total: 5,
        strong: 3,
        moderate: 1,
        weak: 1,
      },
      generatedAt: '2024-04-20T14:00:00Z',
    }, null, 2),
    publisher: 'ElectraLens Synthetic Publisher',
    status: 'published',
  },
];

// ============ AREA BREAKDOWN for comparison ============
export interface AreaBreakdown {
  areaCode: string;
  areaName: string;
  additions: number;
  deletions: number;
  corrections: number;
  totalRecords: number;
  additionRate: number;
  deletionRate: number;
}

export const areaBreakdowns: AreaBreakdown[] = [
  { areaCode: 'SYN-VID-01', areaName: 'Vidyanagar Assembly', additions: 1847, deletions: 423, corrections: 187, totalRecords: 42150, additionRate: 4.38, deletionRate: 1.00 },
  { areaCode: 'SYN-LAK-01', areaName: 'Lakshminagar Assembly', additions: 1102, deletions: 892, corrections: 245, totalRecords: 38720, additionRate: 2.85, deletionRate: 2.30 },
  { areaCode: 'SYN-RAJ-01', areaName: 'Rajpur Ward', additions: 487, deletions: 198, corrections: 89, totalRecords: 15230, additionRate: 3.20, deletionRate: 1.30 },
  { areaCode: 'SYN-GOV-01', areaName: 'Govindpura Block', additions: 312, deletions: 178, corrections: 67, totalRecords: 24891, additionRate: 1.25, deletionRate: 0.71 },
  { areaCode: 'SYN-SHA-01', areaName: 'Shantinagar Ward', additions: 1203, deletions: 456, corrections: 201, totalRecords: 29840, additionRate: 4.03, deletionRate: 1.53 },
  { areaCode: 'SYN-KRI-01', areaName: 'Krishnapuram Assembly', additions: 2340, deletions: 1120, corrections: 398, totalRecords: 87540, additionRate: 2.67, deletionRate: 1.28 },
  { areaCode: 'SYN-GAN-01', areaName: 'Gandhinagar Block', additions: 3456, deletions: 1345, corrections: 512, totalRecords: 145230, additionRate: 2.38, deletionRate: 0.93 },
  { areaCode: 'SYN-NEH-01', areaName: 'Nehru Nagar Assembly', additions: 4210, deletions: 1567, corrections: 623, totalRecords: 178450, additionRate: 2.36, deletionRate: 0.88 },
  { areaCode: 'SYN-AMB-01', areaName: 'Ambedkar Ward', additions: 1890, deletions: 734, corrections: 289, totalRecords: 72340, additionRate: 2.61, deletionRate: 1.01 },
  { areaCode: 'SYN-PAT-01', areaName: 'Patel Colony Block', additions: 2987, deletions: 1098, corrections: 412, totalRecords: 124560, additionRate: 2.40, deletionRate: 0.88 },
  { areaCode: 'SYN-SAR-01', areaName: 'Saraswati Nagar Assembly', additions: 1654, deletions: 623, corrections: 234, totalRecords: 67890, additionRate: 2.44, deletionRate: 0.92 },
  { areaCode: 'SYN-TAG-01', areaName: 'Tagore Gardens Block', additions: 1345, deletions: 489, corrections: 178, totalRecords: 54320, additionRate: 2.48, deletionRate: 0.90 },
  { areaCode: 'SYN-BHA-01', areaName: 'Bharat Nagar Assembly', additions: 1456, deletions: 567, corrections: 198, totalRecords: 61230, additionRate: 2.38, deletionRate: 0.93 },
  { areaCode: 'SYN-IND-01', areaName: 'Indira Colony Ward', additions: 602, deletions: 647, corrections: 209, totalRecords: 59902, additionRate: 1.00, deletionRate: 1.08 },
];

// Verify total consistency: sum of area additions should approximate primaryComparison.additions
// Sum = 24891 ✓ (we carefully constructed the area breakdowns to sum correctly)

// ============ CLAIM CHECK TYPES ============
export type ClaimVerdict = 
  | 'consistent' 
  | 'contradicted' 
  | 'disputed' 
  | 'insufficient-data' 
  | 'cannot-establish';

export interface ClaimResult {
  verdict: ClaimVerdict;
  parsedClaim: {
    area: string;
    metric: string;
    period: string;
    claimedValue: number | string;
    direction: string;
  };
  publishedValues: Record<string, number | string>;
  method: string;
  sources: string[];
  limitations: string[];
  reasoning: string;
}

// ============ HELPER FUNCTIONS ============

export function getDatasetVersion(id: string): DatasetVersion | undefined {
  return datasetVersions.find(v => v.id === id);
}

export function getFinding(id: string): Finding | undefined {
  return findings.find(f => f.id === id);
}

export function getPublishedFindings(): Finding[] {
  return findings.filter(f => f.publicationStatus === 'published');
}

export function getBooth(code: string): BoothInfo | undefined {
  return syntheticBooths.find(b => b.code === code);
}

export function getRule(id: string): StatisticalRule | undefined {
  return statisticalRules.find(r => r.id === id);
}

export function getAreaBreakdown(code: string): AreaBreakdown | undefined {
  return areaBreakdowns.find(a => a.areaCode === code);
}

export function evaluateClaim(
  area: string,
  metric: string,
  period: string,
  claimedValue: string,
  direction: string
): ClaimResult {
  // Check if claim is about intent/fraud/wrongdoing
  const intentKeywords = ['fraud', 'rigging', 'manipulation', 'intentional', 'deliberate', 'corrupt', 'misconduct'];
  if (intentKeywords.some(kw => claimedValue.toLowerCase().includes(kw) || direction.toLowerCase().includes(kw) || metric.toLowerCase().includes(kw))) {
    return {
      verdict: 'cannot-establish',
      parsedClaim: { area, metric, period, claimedValue, direction },
      publishedValues: {},
      method: 'Intent-based claims cannot be evaluated from aggregate statistical data.',
      sources: [],
      limitations: ['This tool evaluates claims against published aggregate data only. Claims about intent, fraud, or wrongdoing are outside the scope of statistical analysis.'],
      reasoning: 'Claims about intent, fraud, or wrongdoing cannot be established from this data. Statistical anomalies may have innocent explanations.',
    };
  }

  // Try to find matching area
  const matchedArea = areaBreakdowns.find(a => 
    a.areaName.toLowerCase().includes(area.toLowerCase()) ||
    a.areaCode.toLowerCase() === area.toLowerCase()
  );

  if (!matchedArea) {
    return {
      verdict: 'insufficient-data',
      parsedClaim: { area, metric, period, claimedValue, direction },
      publishedValues: {},
      method: 'Area lookup in synthetic dataset',
      sources: ['ElectraLens synthetic demonstration dataset'],
      limitations: ['The specified area was not found in the available synthetic dataset.'],
      reasoning: `No data is available for "${area}" in the current synthetic dataset. This tool can only evaluate claims against areas present in the demonstration data.`,
    };
  }

  const numericClaim = parseFloat(claimedValue);
  let publishedValue: number | undefined;
  let metricLabel = '';

  if (metric.toLowerCase().includes('addition')) {
    publishedValue = matchedArea.additionRate;
    metricLabel = 'Addition rate (%)';
  } else if (metric.toLowerCase().includes('deletion')) {
    publishedValue = matchedArea.deletionRate;
    metricLabel = 'Deletion rate (%)';
  } else if (metric.toLowerCase().includes('total') || metric.toLowerCase().includes('record')) {
    publishedValue = matchedArea.totalRecords;
    metricLabel = 'Total records';
  }

  if (publishedValue === undefined || isNaN(numericClaim)) {
    return {
      verdict: 'insufficient-data',
      parsedClaim: { area, metric, period, claimedValue, direction },
      publishedValues: { availableMetrics: 'addition rate, deletion rate, total records' as unknown as number },
      method: 'Metric matching against synthetic dataset',
      sources: ['ElectraLens synthetic demonstration dataset'],
      limitations: ['Could not match the claimed metric or parse the claimed value.'],
      reasoning: `The metric "${metric}" or value "${claimedValue}" could not be matched against the available synthetic data.`,
    };
  }

  // Compare
  const tolerance = 0.1; // 10% tolerance
  const ratio = numericClaim / publishedValue;
  const isClose = Math.abs(ratio - 1) <= tolerance;

  return {
    verdict: isClose ? 'consistent' : 'contradicted',
    parsedClaim: { area, metric, period, claimedValue: numericClaim, direction },
    publishedValues: { [metricLabel]: publishedValue },
    method: `Compared claimed value (${numericClaim}) against published ${metricLabel.toLowerCase()} (${publishedValue}) with ±10% tolerance.`,
    sources: ['ElectraLens synthetic demonstration dataset (v2024-Q1-draft → v2024-Q2-final)'],
    limitations: [
      'This evaluation uses synthetic demonstration data only.',
      'A ±10% tolerance is applied to account for rounding and aggregation differences.',
      'This tool checks consistency with published data only. Consistency does not prove the claim is true.',
    ],
    reasoning: isClose
      ? `The claimed value (${numericClaim}) is within ±10% of the published ${metricLabel.toLowerCase()} (${publishedValue}) for ${matchedArea.areaName}.`
      : `The claimed value (${numericClaim}) differs from the published ${metricLabel.toLowerCase()} (${publishedValue}) for ${matchedArea.areaName} by more than ±10%.`,
  };
}

// ============ i18n STRINGS ============
export type Locale = 'en' | 'hi';

export const strings: Record<Locale, Record<string, string>> = {
  en: {
    'nav.explore': 'Explore',
    'nav.compare': 'Compare',
    'nav.findings': 'Findings',
    'nav.methodology': 'Methodology',
    'nav.verify': 'Verify',
    'nav.claims': 'Claims',
    'nav.about': 'About',
    'nav.sources': 'Sources',
    'nav.privacy': 'Privacy',
    'badge.synthetic': 'Synthetic Data',
    'disclaimer.independence': 'ElectraLens is an independent civic-tech project. It is not affiliated with or endorsed by the Election Commission of India.',
    'hero.headline': 'Electoral changes, examined.',
    'hero.subhead': 'Explore changes between electoral-roll versions, understand unusual statistical patterns, and verify how published findings were produced.',
    'hero.cta.explore': 'Explore the data',
    'hero.cta.methodology': 'Understand the methodology',
    'finding.signal.strong': 'Strong signal',
    'finding.signal.moderate': 'Moderate signal',
    'finding.signal.weak': 'Weak signal',
    'finding.status.pending': 'Pending review',
    'finding.status.reviewed': 'Reviewed',
    'finding.status.published': 'Published',
    'finding.status.disputed': 'Disputed',
    'footer.disclaimer': 'ElectraLens is an independent civic-tech project. Not affiliated with or endorsed by the Election Commission of India.',
    'section.overview': 'Data overview',
    'section.findings': 'Selected findings',
    'section.howItWorks': 'How it works',
    'section.methodology': 'Methodology',
    'section.integrity': 'Integrity verification',
    'section.limitations': 'Limitations & neutrality',
  },
  hi: {
    'nav.explore': 'अन्वेषण करें',
    'nav.compare': 'तुलना करें',
    'nav.findings': 'निष्कर्ष',
    'nav.methodology': 'कार्यप्रणाली',
    'nav.verify': 'सत्यापन',
    'nav.claims': 'दावे',
    'nav.about': 'परिचय',
    'nav.sources': 'स्रोत',
    'nav.privacy': 'गोपनीयता',
    'badge.synthetic': 'सिंथेटिक डेटा',
    'disclaimer.independence': 'इलेक्ट्रालेंस एक स्वतंत्र नागरिक-तकनीक परियोजना है। यह भारत के चुनाव आयोग से संबद्ध नहीं है और न ही इसका समर्थन करता है।',
    'hero.headline': 'चुनावी परिवर्तन, जांचे गए।',
    'hero.subhead': 'मतदाता सूची संस्करणों के बीच परिवर्तनों का अन्वेषण करें, असामान्य सांख्यिकीय पैटर्न को समझें, और प्रकाशित निष्कर्षों का सत्यापन करें।',
    'hero.cta.explore': 'डेटा का अन्वेषण करें',
    'hero.cta.methodology': 'कार्यप्रणाली समझें',
    'finding.signal.strong': 'मजबूत संकेत',
    'finding.signal.moderate': 'मध्यम संकेत',
    'finding.signal.weak': 'कमजोर संकेत',
    'finding.status.pending': 'समीक्षा लंबित',
    'finding.status.reviewed': 'समीक्षित',
    'finding.status.published': 'प्रकाशित',
    'finding.status.disputed': 'विवादित',
    'footer.disclaimer': 'इलेक्ट्रालेंस एक स्वतंत्र नागरिक-तकनीक परियोजना है। भारत के चुनाव आयोग से संबद्ध या समर्थित नहीं।',
    'section.overview': 'डेटा अवलोकन',
    'section.findings': 'चयनित निष्कर्ष',
    'section.howItWorks': 'यह कैसे काम करता है',
    'section.methodology': 'कार्यप्रणाली',
    'section.integrity': 'अखंडता सत्यापन',
    'section.limitations': 'सीमाएं और तटस्थता',
  },
};
