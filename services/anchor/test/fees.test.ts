import { describe, expect, it } from 'vitest';

import { bump, sendUntilMined, type FeeBumpDeps, type Fees } from '../src/fees.ts';

const START: Fees = { maxFeePerGas: 100n, maxPriorityFeePerGas: 10n };
const coded = (code: string) => Object.assign(new Error(code), { code });

/** A chain where each sent fee level is mined or not according to the script. */
function fakeChain(script: { mines?: number; rejectSend?: Record<number, string> }) {
  const sent: Fees[] = [];
  const mined = new Set<string>();
  const deps: FeeBumpDeps<{ hash: string }> = {
    send: async (fees) => {
      const reject = script.rejectSend?.[sent.length];
      sent.push(fees);
      if (reject) throw coded(reject);
      const hash = `0x${sent.length}`;
      if (script.mines === sent.length) mined.add(hash);
      return hash;
    },
    wait: async (hash) => (mined.has(hash) ? { hash } : null),
    receipt: async (hash) => (mined.has(hash) ? { hash } : null),
  };
  return { deps, sent, mined };
}

describe('sendUntilMined', () => {
  it('returns the first receipt when the transaction is mined in time', async () => {
    const { deps, sent } = fakeChain({ mines: 1 });
    expect(await sendUntilMined(deps, START, 3)).toEqual({ hash: '0x1' });
    expect(sent).toEqual([START]);
  });

  it('resends at the same nonce with higher fees when a fee level stalls', async () => {
    const { deps, sent } = fakeChain({ mines: 3 });
    const bumps: number[] = [];
    const receipt = await sendUntilMined(deps, START, 3, (_fees, attempt) => bumps.push(attempt));
    expect(receipt).toEqual({ hash: '0x3' });
    expect(sent).toEqual([START, bump(START), bump(bump(START))]);
    expect(bumps).toEqual([1, 2]);
  });

  it('raises both fees by more than the 10% nodes require to replace', () => {
    const next = bump(START);
    expect(next.maxFeePerGas * 100n >= START.maxFeePerGas * 110n).toBe(true);
    expect(next.maxPriorityFeePerGas * 100n >= START.maxPriorityFeePerGas * 110n).toBe(true);
  });

  it('accepts an earlier fee level that was mined after its own wait gave up', async () => {
    const { deps, mined } = fakeChain({});
    let waits = 0;
    const late: FeeBumpDeps<{ hash: string }> = {
      ...deps,
      wait: async (hash) => {
        waits += 1;
        if (waits === 2) mined.add('0x1'); // the first level lands while the second is waiting
        return deps.wait(hash);
      },
    };
    expect(await sendUntilMined(late, START, 3)).toEqual({ hash: '0x1' });
  });

  it('treats an ethers TIMEOUT error like a stalled wait', async () => {
    const { deps } = fakeChain({ mines: 2 });
    let first = true;
    const throwing: FeeBumpDeps<{ hash: string }> = {
      ...deps,
      wait: async (hash) => {
        if (first) {
          first = false;
          throw coded('TIMEOUT');
        }
        return deps.wait(hash);
      },
    };
    expect(await sendUntilMined(throwing, START, 3)).toEqual({ hash: '0x2' });
  });

  it('finds the earlier fee level when the resend finds the nonce already used', async () => {
    const { deps, mined } = fakeChain({ rejectSend: { 1: 'NONCE_EXPIRED' } });
    let checks = 0;
    const landed: FeeBumpDeps<{ hash: string }> = {
      ...deps,
      receipt: async (hash) => {
        checks += 1;
        if (checks > 1) mined.add('0x1'); // mined between the stalled check and the resend
        return deps.receipt(hash);
      },
    };
    expect(await sendUntilMined(landed, START, 3)).toEqual({ hash: '0x1' });
  });

  it('refuses to claim a nonce used by a transaction it did not send', async () => {
    const { deps } = fakeChain({ rejectSend: { 0: 'NONCE_EXPIRED' } });
    await expect(sendUntilMined(deps, START, 3)).rejects.toThrow('did not send');
  });

  it('outbids a lost transaction that holds the nonce at a higher fee', async () => {
    const { deps, sent } = fakeChain({ mines: 2, rejectSend: { 0: 'REPLACEMENT_UNDERPRICED' } });
    expect(await sendUntilMined(deps, START, 3)).toEqual({ hash: '0x2' });
    expect(sent).toEqual([START, bump(START)]);
  });

  it('gives up after the last fee level and names every transaction it sent', async () => {
    const { deps, sent } = fakeChain({});
    await expect(sendUntilMined(deps, START, 2)).rejects.toThrow(
      'not mined after 3 fee levels: 0x1, 0x2, 0x3',
    );
    expect(sent).toHaveLength(3);
  });

  it('passes other send errors straight through', async () => {
    const { deps } = fakeChain({ rejectSend: { 0: 'INSUFFICIENT_FUNDS' } });
    await expect(sendUntilMined(deps, START, 3)).rejects.toThrow('INSUFFICIENT_FUNDS');
  });
});
