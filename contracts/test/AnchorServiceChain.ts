// The anchor service's chain adapter against the real compiled contract on a local chain.
import { expect } from 'chai';
import { network } from 'hardhat';

import {
  EthersChain,
  REGISTRY_ABI,
  type EthersChainOptions,
  seriesIdOf,
  toBytes32,
  ZERO_HASH,
} from '../../services/anchor/src/chain.ts';

const { ethers } = await network.create();

async function accounts() {
  const [admin, publisher] = await ethers.getSigners();
  if (!admin || !publisher) throw new Error('need two test accounts');
  return { admin, publisher };
}

async function setup(options: Partial<EthersChainOptions> = {}) {
  const { admin, publisher } = await accounts();
  const registry = await ethers.deployContract('ElectraLensRegistry', [
    admin.address,
    publisher.address,
  ]);
  await registry.waitForDeployment();
  const deployBlock = await ethers.provider.getBlockNumber();
  const chain = new EthersChain(publisher, await registry.getAddress(), {
    network: 'hardhat',
    chainId: 31337n,
    ...options,
  });
  return { registry, chain, deployBlock, publisher };
}

describe('anchor service chain adapter (EthersChain)', function () {
  it('uses an ABI that matches the compiled contract exactly', async function () {
    const { registry } = await setup();
    // 'minimal' keeps types, `indexed`, mutability and return types, so any drift fails here.
    const shape = (f: { type: string; format: (style: 'minimal') => string }) =>
      f.format('minimal');
    const isCallable = (f: { type: string }) => ['function', 'event', 'error'].includes(f.type);
    const compiled = new Set(registry.interface.fragments.filter(isCallable).map(shape));
    const service = new ethers.Interface(REGISTRY_ABI as unknown as string[]);
    for (const fragment of service.fragments.filter(isCallable)) {
      expect(compiled.has(shape(fragment)), shape(fragment)).to.equal(true);
    }
  });

  it('anchors, then finds the event by manifest hash and lists every anchor', async function () {
    const { chain, deployBlock } = await setup();
    const series = seriesIdOf('DEMO-HR');
    const first = toBytes32('a'.repeat(64));
    const second = toBytes32('b'.repeat(64));

    const receipt = await chain.anchor(series, first, ZERO_HASH);
    expect(receipt.sequence).to.equal(1n);
    expect(await chain.isAnchored(first)).to.equal(true);
    expect(await chain.latest(series)).to.equal(first);
    expect(await chain.count(series)).to.equal(1n);

    await chain.anchor(series, second, first);
    const found = await chain.findAnchor(second, deployBlock);
    expect(found?.sequence).to.equal(2n);
    expect(found?.seriesId).to.equal(series);
    expect(await chain.findAnchor(toBytes32('c'.repeat(64)), deployBlock)).to.equal(null);

    const events = await chain.anchoredEvents(deployBlock);
    expect(events.map((e) => e.manifestHash)).to.deep.equal([first, second]);
  });

  it('reads logs in chunks smaller than the chain', async function () {
    const { admin, publisher } = await accounts();
    const registry = await ethers.deployContract('ElectraLensRegistry', [
      admin.address,
      publisher.address,
    ]);
    const deployBlock = await ethers.provider.getBlockNumber();
    const chain = new EthersChain(publisher, await registry.getAddress(), {
      network: 'hardhat',
      chainId: 31337n,
      logChunk: 1,
    });
    const series = seriesIdOf('DEMO-HR');
    let previous = ZERO_HASH;
    for (const digit of ['1', '2', '3']) {
      const hash = toBytes32(digit.repeat(64));
      await chain.anchor(series, hash, previous);
      previous = hash;
    }
    expect((await chain.anchoredEvents(deployBlock)).length).to.equal(3);
  });

  it('lists retractions so reconciliation can compare them with the database', async function () {
    const { registry, chain, deployBlock, publisher } = await setup();
    const series = seriesIdOf('DEMO-HR');
    const manifest = toBytes32('9'.repeat(64));
    await chain.anchor(series, manifest, ZERO_HASH);
    await registry.connect(publisher).getFunction('retract')(
      series,
      manifest,
      toBytes32('8'.repeat(64)),
    );
    const [retraction, ...rest] = await chain.retractedEvents(deployBlock);
    expect(rest).to.deep.equal([]);
    expect(retraction?.manifestHash).to.equal(manifest);
    expect(retraction?.seriesId).to.equal(series);
  });

  it('reports the publisher balance and address', async function () {
    const { chain } = await setup();
    const { publisher } = await accounts();
    expect(await chain.publisherAddress()).to.equal(publisher.address);
    expect((await chain.publisherBalance()) > 0n).to.equal(true);
  });

  it('refuses a stale previous hash before spending anything', async function () {
    const { chain, publisher } = await setup();
    const nonce = await ethers.provider.getTransactionCount(publisher.address);
    const error = await chain
      .anchor(seriesIdOf('DEMO-HR'), toBytes32('d'.repeat(64)), toBytes32('e'.repeat(64)))
      .then(
        () => null,
        (e: unknown) => e,
      );
    expect(String(error)).to.contain('UnexpectedPrevious');
    expect(await ethers.provider.getTransactionCount(publisher.address)).to.equal(nonce);
  });

  it('replaces a stalled transaction with higher fees at the same nonce', async function () {
    const bumps: bigint[] = [];
    const { chain, publisher } = await setup({
      timeoutMs: 300,
      onFeeBump: (fees) => {
        bumps.push(fees.maxFeePerGas);
        // Mine only after the replacement has reached the mempool.
        setTimeout(() => void ethers.provider.send('evm_mine', []), 150);
      },
    });
    const nonce = await ethers.provider.getTransactionCount(publisher.address);
    await ethers.provider.send('evm_setAutomine', [false]);
    try {
      const receipt = await chain.anchor(
        seriesIdOf('DEMO-HR'),
        toBytes32('f'.repeat(64)),
        ZERO_HASH,
      );
      expect(bumps).to.have.length(1);
      const mined = await ethers.provider.getTransaction(receipt.txHash);
      expect(mined?.nonce).to.equal(nonce);
      expect(mined?.maxFeePerGas).to.equal(bumps[0]);
      expect(await chain.count(seriesIdOf('DEMO-HR'))).to.equal(1n);
    } finally {
      await ethers.provider.send('evm_setAutomine', [true]);
    }
  });
});
