import { manifestV1, type ManifestV1 } from '@electralens/schemas';

import { hashDocument } from './hash.ts';

/** Validates a manifest against `manifest_v1`. */
export function buildManifest(input: ManifestV1): ManifestV1 {
  return manifestV1.parse(input);
}

/** The value anchored on-chain: SHA-256 of the manifest's RFC 8785 form. */
export function manifestHash(manifest: ManifestV1): string {
  return hashDocument(manifestV1.parse(manifest));
}
