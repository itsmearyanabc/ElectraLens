// Cryptographic verification utilities for ElectraLens

/**
 * Canonicalise a JSON document by sorting keys and removing whitespace.
 * This ensures deterministic hashing regardless of key order or formatting.
 */
export function canonicalise(obj: unknown): string {
  if (obj === null || obj === undefined) return '';
  if (typeof obj !== 'object') return JSON.stringify(obj);
  
  if (Array.isArray(obj)) {
    return '[' + obj.map(canonicalise).join(',') + ']';
  }
  
  const sorted = Object.keys(obj as Record<string, unknown>).sort();
  const pairs = sorted.map(key => {
    const val = (obj as Record<string, unknown>)[key];
    return JSON.stringify(key) + ':' + canonicalise(val);
  });
  return '{' + pairs.join(',') + '}';
}

/**
 * Compute SHA-256 hash of a string using the Web Crypto API.
 */
export async function sha256(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Compute the hash of a canonicalised document.
 */
export async function computeDocumentHash(document: unknown): Promise<string> {
  const canonical = canonicalise(document);
  return sha256(canonical);
}

export interface VerificationStatus {
  reportHashMatch: boolean | null;
  aggregateHashMatch: boolean | null;
  manifestMatch: boolean | null;
  blockchainAnchor: 'verified' | 'not-configured' | 'failed' | 'pending';
  overallStatus: 'verified' | 'partial' | 'failed' | 'pending' | 'demo-mode';
  details: {
    computedReportHash?: string;
    expectedReportHash?: string;
    computedAggregateHash?: string;
    expectedAggregateHash?: string;
    computedManifestHash?: string;
    expectedManifestHash?: string;
    blockchainTxHash?: string;
    blockchainNetwork?: string;
    blockchainBlock?: number;
    blockchainTimestamp?: string;
  };
  errors: string[];
}

/**
 * Verify a publication manifest by recomputing hashes.
 * In demo mode, this computes hashes from the provided content and
 * verifies them against the manifest's stored hashes.
 */
export async function verifyPublication(manifest: {
  reportContent: string;
  aggregateContent: string;
  reportHash: string;
  aggregateHash: string;
  manifestHash: string;
}): Promise<VerificationStatus> {
  const errors: string[] = [];
  
  // Safe parse documents
  let reportObj: unknown;
  let aggregateObj: unknown;

  try {
    reportObj = typeof manifest.reportContent === 'string' ? JSON.parse(manifest.reportContent) : manifest.reportContent;
  } catch {
    reportObj = { content: manifest.reportContent };
    errors.push('Report content is not standard JSON; hashed as plain content.');
  }

  try {
    aggregateObj = typeof manifest.aggregateContent === 'string' ? JSON.parse(manifest.aggregateContent) : manifest.aggregateContent;
  } catch {
    aggregateObj = { content: manifest.aggregateContent };
    errors.push('Aggregate content is not standard JSON; hashed as plain content.');
  }

  const computedReportHash = await computeDocumentHash(reportObj);
  const computedAggregateHash = await computeDocumentHash(aggregateObj);
  
  // For demo mode: if stored hashes are empty, this is initial computation
  const isInitial = !manifest.reportHash || !manifest.aggregateHash;
  
  const reportHashMatch = isInitial ? true : computedReportHash === manifest.reportHash;
  const aggregateHashMatch = isInitial ? true : computedAggregateHash === manifest.aggregateHash;
  
  if (!reportHashMatch) {
    errors.push('Report hash does not match the committed value.');
  }
  if (!aggregateHashMatch) {
    errors.push('Aggregate hash does not match the committed value.');
  }
  
  // Compute manifest hash (hash of the two document hashes combined)
  const manifestData = { reportHash: computedReportHash, aggregateHash: computedAggregateHash };
  const computedManifestHash = await computeDocumentHash(manifestData);
  const manifestMatch = isInitial ? true : computedManifestHash === manifest.manifestHash;
  
  if (!manifestMatch && !isInitial) {
    errors.push('Manifest commitment hash does not match.');
  }
  
  const allMatch = reportHashMatch && aggregateHashMatch && manifestMatch;
  
  return {
    reportHashMatch,
    aggregateHashMatch,
    manifestMatch,
    blockchainAnchor: 'not-configured',
    overallStatus: isInitial ? 'demo-mode' : (allMatch ? 'verified' : 'failed'),
    details: {
      computedReportHash,
      expectedReportHash: manifest.reportHash || '(initial computation)',
      computedAggregateHash,
      expectedAggregateHash: manifest.aggregateHash || '(initial computation)',
      computedManifestHash,
      expectedManifestHash: manifest.manifestHash || '(initial computation)',
    },
    errors,
  };
}

/**
 * Simulate a tamper by modifying a value in the aggregate content
 * and showing how the hash changes.
 */
export async function demonstrateTamper(
  originalContent: string,
  fieldPath: string,
  newValue: unknown
): Promise<{
  originalHash: string;
  tamperedHash: string;
  match: boolean;
  originalValue: unknown;
  tamperedValue: unknown;
}> {
  const originalObj = JSON.parse(originalContent);
  const originalHash = await computeDocumentHash(originalObj);
  
  // Create tampered copy
  const tamperedObj = JSON.parse(originalContent);
  const pathParts = fieldPath.split('.');
  let current: Record<string, unknown> = tamperedObj;
  for (let i = 0; i < pathParts.length - 1; i++) {
    current = current[pathParts[i]] as Record<string, unknown>;
  }
  const originalValue = current[pathParts[pathParts.length - 1]];
  current[pathParts[pathParts.length - 1]] = newValue;
  
  const tamperedHash = await computeDocumentHash(tamperedObj);
  
  return {
    originalHash,
    tamperedHash,
    match: originalHash === tamperedHash,
    originalValue,
    tamperedValue: newValue,
  };
}
