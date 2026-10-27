// Sends one transaction at a fixed nonce until it is mined, replacing it with higher fees when it
// stalls. Kept free of providers so the decisions can be tested without a chain.
import { isError } from 'ethers';

export interface Fees {
  maxFeePerGas: bigint;
  maxPriorityFeePerGas: bigint;
}

export interface FeeBumpDeps<R> {
  /** Signs and broadcasts the transaction at its fixed nonce with these fees; returns the hash. */
  send(fees: Fees): Promise<string>;
  /** The receipt once mined and confirmed; null (or an ethers TIMEOUT error) if it is not in time. */
  wait(hash: string): Promise<R | null>;
  /** The receipt if the transaction is already mined, else null. */
  receipt(hash: string): Promise<R | null>;
}

// Nodes replace a pending transaction only for at least 10% more on both fees; 25% clears that.
export function bump(fees: Fees): Fees {
  return {
    maxFeePerGas: (fees.maxFeePerGas * 125n) / 100n + 1n,
    maxPriorityFeePerGas: (fees.maxPriorityFeePerGas * 125n) / 100n + 1n,
  };
}

export async function sendUntilMined<R>(
  deps: FeeBumpDeps<R>,
  initial: Fees,
  maxBumps: number,
  onBump?: (fees: Fees, attempt: number) => void,
): Promise<R> {
  const sent: string[] = [];
  let fees = initial;
  for (let attempt = 0; ; attempt++) {
    let hash: string;
    try {
      hash = await deps.send(fees);
    } catch (error) {
      // Our nonce was used: an earlier fee level was mined between the timeout and this resend.
      if (isError(error, 'NONCE_EXPIRED')) return confirmEarlier(deps, sent, error);
      // A transaction we lost track of (a crash mid-flight) holds the nonce at a higher fee.
      if (isError(error, 'REPLACEMENT_UNDERPRICED') && attempt < maxBumps) {
        fees = bump(fees);
        onBump?.(fees, attempt + 1);
        continue;
      }
      throw error;
    }
    sent.push(hash);

    let receipt: R | null = null;
    try {
      receipt = await deps.wait(hash);
    } catch (error) {
      if (!isError(error, 'TIMEOUT')) throw error;
    }
    if (receipt) return receipt;

    // Any earlier fee level can still be the one that is mined.
    for (const earlier of sent) {
      if (await deps.receipt(earlier)) return confirmed(deps, earlier);
    }
    if (attempt >= maxBumps) {
      throw new Error(`transaction not mined after ${sent.length} fee levels: ${sent.join(', ')}`);
    }
    fees = bump(fees);
    onBump?.(fees, attempt + 1);
  }
}

async function confirmEarlier<R>(deps: FeeBumpDeps<R>, sent: string[], cause: unknown): Promise<R> {
  for (const hash of sent) {
    if (await deps.receipt(hash)) return confirmed(deps, hash);
  }
  throw new Error('nonce was used by a transaction this service did not send', { cause });
}

async function confirmed<R>(deps: FeeBumpDeps<R>, hash: string): Promise<R> {
  const receipt = await deps.wait(hash);
  if (!receipt) throw new Error(`transaction ${hash} was mined but not confirmed in time`);
  return receipt;
}
