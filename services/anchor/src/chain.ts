// The registry contract seen through ethers v6. Kept free of other workspace imports so the
// contract test suite can exercise it against a local chain.
import {
  Contract,
  ZeroHash,
  id,
  type EventLog,
  type Log,
  type Provider,
  type Signer,
  type TransactionReceipt,
} from 'ethers';

import { sendUntilMined, type Fees } from './fees.ts';

export const REGISTRY_ABI = [
  'function anchor(bytes32 seriesId, bytes32 manifestHash, bytes32 expectedPrevious) returns (uint256 sequence)',
  'function retract(bytes32 seriesId, bytes32 manifestHash, bytes32 reasonHash)',
  'function latest(bytes32 seriesId) view returns (bytes32)',
  'function count(bytes32 seriesId) view returns (uint256)',
  'function anchored(bytes32 manifestHash) view returns (bool)',
  'function retracted(bytes32 manifestHash) view returns (bool)',
  'event Anchored(bytes32 indexed seriesId, uint256 indexed sequence, bytes32 indexed manifestHash, bytes32 previous, address publisher)',
  'event Retracted(bytes32 indexed seriesId, bytes32 indexed manifestHash, bytes32 reasonHash, address publisher)',
  'error AlreadyAnchored(bytes32 manifestHash)',
  'error UnexpectedPrevious(bytes32 expected, bytes32 actual)',
  'error EmptyHash()',
  'error NotAnchoredInSeries(bytes32 seriesId, bytes32 manifestHash)',
  'error AlreadyRetracted(bytes32 manifestHash)',
  'error AccessControlUnauthorizedAccount(address account, bytes32 neededRole)',
] as const;

export const ZERO_HASH = ZeroHash;

/** On-chain series id: keccak256 of the UTF-8 series code. */
export const seriesIdOf = (seriesId: string): string => id(seriesId);

/** A 64-character lowercase hex hash as bytes32. */
export function toBytes32(hexHash: string): string {
  if (!/^[0-9a-f]{64}$/.test(hexHash))
    throw new Error('expected a 64-character lowercase hex hash');
  return `0x${hexHash}`;
}

export const fromBytes32 = (value: string): string => value.slice(2).toLowerCase();

export interface AnchorReceipt {
  txHash: string;
  blockNumber: number;
  logIndex: number;
  sequence: bigint;
}

export interface AnchoredEvent extends AnchorReceipt {
  seriesId: string;
  manifestHash: string;
}

export interface RetractedEvent {
  seriesId: string;
  manifestHash: string;
  txHash: string;
  blockNumber: number;
  logIndex: number;
}

export interface Chain {
  readonly network: string;
  readonly chainId: bigint;
  readonly address: string;
  latest(seriesId: string): Promise<string>;
  count(seriesId: string): Promise<bigint>;
  isAnchored(manifestHash: string): Promise<boolean>;
  /** Sends the transaction and waits for confirmation. */
  anchor(seriesId: string, manifestHash: string, previous: string): Promise<AnchorReceipt>;
  findAnchor(manifestHash: string, fromBlock: number): Promise<AnchoredEvent | null>;
  anchoredEvents(fromBlock: number): Promise<AnchoredEvent[]>;
  retractedEvents(fromBlock: number): Promise<RetractedEvent[]>;
  publisherAddress(): Promise<string>;
  publisherBalance(): Promise<bigint>;
}

export interface EthersChainOptions {
  network: string;
  chainId: bigint;
  confirmations?: number;
  /** How long one fee level may wait for confirmation before it is replaced. */
  timeoutMs?: number;
  /** Replacements with higher fees before giving up. */
  maxFeeBumps?: number;
  onFeeBump?: (fees: Fees, attempt: number) => void;
  /** Block range per eth_getLogs call; public RPCs cap it. */
  logChunk?: number;
}

export class EthersChain implements Chain {
  readonly network: string;
  readonly chainId: bigint;
  readonly address: string;
  readonly #signer: Signer;
  readonly #contract: Contract;
  readonly #confirmations: number;
  readonly #timeoutMs: number;
  readonly #maxFeeBumps: number;
  readonly #onFeeBump: EthersChainOptions['onFeeBump'];
  readonly #logChunk: number;

  constructor(signer: Signer, address: string, options: EthersChainOptions) {
    this.#signer = signer;
    this.address = address;
    this.network = options.network;
    this.chainId = options.chainId;
    this.#confirmations = options.confirmations ?? 1;
    this.#timeoutMs = options.timeoutMs ?? 180_000;
    this.#maxFeeBumps = options.maxFeeBumps ?? 3;
    this.#onFeeBump = options.onFeeBump;
    this.#logChunk = options.logChunk ?? 9_000;
    this.#contract = new Contract(address, REGISTRY_ABI, signer);
  }

  async latest(seriesId: string): Promise<string> {
    return (await this.#contract.getFunction('latest')(seriesId)) as string;
  }

  async count(seriesId: string): Promise<bigint> {
    return (await this.#contract.getFunction('count')(seriesId)) as bigint;
  }

  async isAnchored(manifestHash: string): Promise<boolean> {
    return (await this.#contract.getFunction('anchored')(manifestHash)) as boolean;
  }

  async anchor(seriesId: string, manifestHash: string, previous: string): Promise<AnchorReceipt> {
    const provider = this.#provider();
    const request = await this.#contract
      .getFunction('anchor')
      .populateTransaction(seriesId, manifestHash, previous);
    // Estimating first surfaces a revert (stale previous, duplicate hash) before anything is spent.
    const gasLimit = ((await this.#signer.estimateGas(request)) * 6n) / 5n;
    // The publisher wallet belongs to this service alone and sends one transaction at a time, so
    // the next nonce to be mined is ours; reusing it also replaces anything a crash left stuck.
    const nonce = await provider.getTransactionCount(await this.#signer.getAddress(), 'latest');
    const feeData = await provider.getFeeData();
    if (feeData.maxFeePerGas === null || feeData.maxPriorityFeePerGas === null) {
      throw new Error('chain does not report EIP-1559 fees');
    }
    const receipt = await sendUntilMined<TransactionReceipt>(
      {
        send: async (fees) =>
          (
            await this.#signer.sendTransaction({
              ...request,
              type: 2,
              chainId: this.chainId,
              nonce,
              gasLimit,
              ...fees,
            })
          ).hash,
        wait: (hash) => provider.waitForTransaction(hash, this.#confirmations, this.#timeoutMs),
        receipt: (hash) => provider.getTransactionReceipt(hash),
      },
      { maxFeePerGas: feeData.maxFeePerGas, maxPriorityFeePerGas: feeData.maxPriorityFeePerGas },
      this.#maxFeeBumps,
      this.#onFeeBump,
    );
    if (receipt.status !== 1) throw new Error('anchor transaction failed');
    for (const log of receipt.logs as Log[]) {
      const event = this.#parseAnchored(log);
      if (event && event.manifestHash === manifestHash.toLowerCase()) return event;
    }
    throw new Error('anchor transaction has no Anchored event');
  }

  async findAnchor(manifestHash: string, fromBlock: number): Promise<AnchoredEvent | null> {
    const filter = this.#contract.filters.Anchored?.(null, null, manifestHash);
    if (!filter) throw new Error('registry ABI has no Anchored event');
    const [first] = await this.#query(filter, fromBlock, (log) => this.#parseAnchored(log));
    return first ?? null;
  }

  async anchoredEvents(fromBlock: number): Promise<AnchoredEvent[]> {
    const filter = this.#contract.filters.Anchored?.();
    if (!filter) throw new Error('registry ABI has no Anchored event');
    return this.#query(filter, fromBlock, (log) => this.#parseAnchored(log));
  }

  async retractedEvents(fromBlock: number): Promise<RetractedEvent[]> {
    const filter = this.#contract.filters.Retracted?.();
    if (!filter) throw new Error('registry ABI has no Retracted event');
    return this.#query(filter, fromBlock, (log) => this.#parseRetracted(log));
  }

  async publisherAddress(): Promise<string> {
    return this.#signer.getAddress();
  }

  async publisherBalance(): Promise<bigint> {
    return this.#provider().getBalance(await this.#signer.getAddress());
  }

  #provider(): Provider {
    const provider = this.#signer.provider;
    if (!provider) throw new Error('signer has no provider');
    return provider;
  }

  async #query<E>(
    filter: Parameters<Contract['queryFilter']>[0],
    fromBlock: number,
    parse: (log: Log | EventLog) => E | null,
  ): Promise<E[]> {
    const head = await this.#provider().getBlockNumber();
    const events: E[] = [];
    for (let start = fromBlock; start <= head; start += this.#logChunk) {
      const end = Math.min(start + this.#logChunk - 1, head);
      for (const log of await this.#contract.queryFilter(filter, start, end)) {
        const event = parse(log);
        if (event) events.push(event);
      }
    }
    return events;
  }

  #parseAnchored(log: Log | EventLog): AnchoredEvent | null {
    const parsed = this.#contract.interface.parseLog(log);
    if (!parsed || parsed.name !== 'Anchored') return null;
    return {
      seriesId: (parsed.args[0] as string).toLowerCase(),
      sequence: parsed.args[1] as bigint,
      manifestHash: (parsed.args[2] as string).toLowerCase(),
      txHash: log.transactionHash,
      blockNumber: log.blockNumber,
      logIndex: log.index,
    };
  }

  #parseRetracted(log: Log | EventLog): RetractedEvent | null {
    const parsed = this.#contract.interface.parseLog(log);
    if (!parsed || parsed.name !== 'Retracted') return null;
    return {
      seriesId: (parsed.args[0] as string).toLowerCase(),
      manifestHash: (parsed.args[1] as string).toLowerCase(),
      txHash: log.transactionHash,
      blockNumber: log.blockNumber,
      logIndex: log.index,
    };
  }
}
