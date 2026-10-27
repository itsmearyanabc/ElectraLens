import { sha256 } from '@noble/hashes/sha2.js';
import { bytesToHex, hexToBytes } from '@noble/hashes/utils.js';

import { jcsBytes } from './jcs.ts';
import type { Json } from './normalize.ts';

export { bytesToHex as toHex, hexToBytes as fromHex, sha256 };

/** SHA-256 of the document's RFC 8785 form, as lowercase hex. Used for reports, aggregates and manifests. */
export function hashDocument(doc: Json): string {
  return bytesToHex(sha256(jcsBytes(doc)));
}
