// B08.02: the registry is append-only, fork-proof and role-gated.
import { expect } from 'chai';
import { network } from 'hardhat';

const { ethers } = await network.create();

const ZERO = ethers.ZeroHash;
const series = (name: string) => ethers.id(name); // keccak256(utf8(series_id))
const hash = (n: number) => ethers.zeroPadValue(ethers.toBeHex(n), 32);

async function accounts() {
  const [admin, publisher, stranger, rotated] = await ethers.getSigners();
  if (!admin || !publisher || !stranger || !rotated) throw new Error('need four test accounts');
  return { admin, publisher, stranger, rotated };
}

async function deploy() {
  const { admin, publisher, stranger, rotated } = await accounts();
  const registry = await ethers.deployContract('ElectraLensRegistry', [
    admin.address,
    publisher.address,
  ]);
  await registry.waitForDeployment();
  return {
    registry,
    admin,
    publisher,
    stranger,
    rotated,
    asPublisher: registry.connect(publisher),
  };
}

describe('ElectraLensRegistry', function () {
  it('gives the admin and publisher roles to the constructor arguments, not the deployer', async function () {
    const { registry, admin, publisher, stranger } = await deploy();
    expect(await registry.hasRole(await registry.DEFAULT_ADMIN_ROLE(), admin.address)).to.equal(
      true,
    );
    expect(await registry.hasRole(await registry.PUBLISHER_ROLE(), publisher.address)).to.equal(
      true,
    );
    expect(await registry.hasRole(await registry.PUBLISHER_ROLE(), stranger.address)).to.equal(
      false,
    );
  });

  it('refuses a zero admin or publisher', async function () {
    const { admin } = await accounts();
    const factory = await ethers.getContractFactory('ElectraLensRegistry');
    await expect(
      ethers.deployContract('ElectraLensRegistry', [ethers.ZeroAddress, admin.address]),
    ).to.be.revertedWithCustomError(factory, 'ZeroAddress');
  });

  it('anchors the first manifest of a series with sequence 1', async function () {
    const { registry, asPublisher, publisher } = await deploy();
    await expect(asPublisher.anchor(series('DEMO-HR'), hash(1), ZERO))
      .to.emit(registry, 'Anchored')
      .withArgs(series('DEMO-HR'), 1n, hash(1), ZERO, publisher.address);
    expect(await registry.latest(series('DEMO-HR'))).to.equal(hash(1));
    expect(await registry.count(series('DEMO-HR'))).to.equal(1n);
    expect(await registry.anchored(hash(1))).to.equal(true);
    const first = await registry.entry(series('DEMO-HR'), 1n);
    expect(first.manifestHash).to.equal(hash(1));
    expect(first.previous).to.equal(ZERO);
    expect(first.publisher).to.equal(publisher.address);
  });

  it('chains each entry to the previous one', async function () {
    const { registry, asPublisher, publisher } = await deploy();
    await asPublisher.anchor(series('DEMO-HR'), hash(1), ZERO);
    await expect(asPublisher.anchor(series('DEMO-HR'), hash(2), hash(1)))
      .to.emit(registry, 'Anchored')
      .withArgs(series('DEMO-HR'), 2n, hash(2), hash(1), publisher.address);
    expect((await registry.entry(series('DEMO-HR'), 2n)).previous).to.equal(hash(1));
    expect(await registry.latest(series('DEMO-HR'))).to.equal(hash(2));
  });

  it('rejects a stale or forked previous hash', async function () {
    const { registry, asPublisher } = await deploy();
    await asPublisher.anchor(series('DEMO-HR'), hash(1), ZERO);
    await expect(asPublisher.anchor(series('DEMO-HR'), hash(2), ZERO))
      .to.be.revertedWithCustomError(registry, 'UnexpectedPrevious')
      .withArgs(ZERO, hash(1));
  });

  it('never anchors the same manifest twice, in any series', async function () {
    const { registry, asPublisher } = await deploy();
    await asPublisher.anchor(series('DEMO-HR'), hash(1), ZERO);
    await expect(asPublisher.anchor(series('DEMO-RJ'), hash(1), ZERO))
      .to.be.revertedWithCustomError(registry, 'AlreadyAnchored')
      .withArgs(hash(1));
  });

  it('refuses empty hashes and series ids', async function () {
    const { registry, asPublisher } = await deploy();
    await expect(asPublisher.anchor(series('DEMO-HR'), ZERO, ZERO)).to.be.revertedWithCustomError(
      registry,
      'EmptyHash',
    );
    await expect(asPublisher.anchor(ZERO, hash(1), ZERO)).to.be.revertedWithCustomError(
      registry,
      'EmptyHash',
    );
  });

  it('keeps series independent', async function () {
    const { registry, asPublisher } = await deploy();
    await asPublisher.anchor(series('DEMO-HR'), hash(1), ZERO);
    await asPublisher.anchor(series('DEMO-RJ'), hash(2), ZERO);
    expect(await registry.latest(series('DEMO-HR'))).to.equal(hash(1));
    expect(await registry.latest(series('DEMO-RJ'))).to.equal(hash(2));
    expect(await registry.latest(series('DEMO-UP'))).to.equal(ZERO);
  });

  it('lets only the publisher anchor', async function () {
    const { registry, stranger } = await deploy();
    await expect(registry.connect(stranger).anchor(series('DEMO-HR'), hash(1), ZERO))
      .to.be.revertedWithCustomError(registry, 'AccessControlUnauthorizedAccount')
      .withArgs(stranger.address, await registry.PUBLISHER_ROLE());
  });

  it('stops a compromised publisher key the moment the admin revokes it, and allows rotation', async function () {
    const { registry, admin, publisher, rotated, asPublisher } = await deploy();
    await asPublisher.anchor(series('DEMO-HR'), hash(1), ZERO);
    const role = await registry.PUBLISHER_ROLE();
    await registry.connect(admin).revokeRole(role, publisher.address);
    await expect(
      asPublisher.anchor(series('DEMO-HR'), hash(2), hash(1)),
    ).to.be.revertedWithCustomError(registry, 'AccessControlUnauthorizedAccount');
    await registry.connect(admin).grantRole(role, rotated.address);
    await registry.connect(rotated).anchor(series('DEMO-HR'), hash(2), hash(1));
    // History written before the compromise is untouched.
    expect((await registry.entry(series('DEMO-HR'), 1n)).manifestHash).to.equal(hash(1));
  });

  it('records a retraction as an event and never removes the entry', async function () {
    const { registry, asPublisher, publisher } = await deploy();
    await asPublisher.anchor(series('DEMO-HR'), hash(1), ZERO);
    await expect(asPublisher.retract(series('DEMO-HR'), hash(1), hash(99)))
      .to.emit(registry, 'Retracted')
      .withArgs(series('DEMO-HR'), hash(1), hash(99), publisher.address);
    expect(await registry.retracted(hash(1))).to.equal(true);
    expect(await registry.count(series('DEMO-HR'))).to.equal(1n);
    expect(await registry.latest(series('DEMO-HR'))).to.equal(hash(1));
    await expect(
      asPublisher.retract(series('DEMO-HR'), hash(1), hash(99)),
    ).to.be.revertedWithCustomError(registry, 'AlreadyRetracted');
  });

  it('only retracts manifests anchored in that series, with a reason', async function () {
    const { registry, asPublisher, stranger } = await deploy();
    await asPublisher.anchor(series('DEMO-HR'), hash(1), ZERO);
    await expect(
      asPublisher.retract(series('DEMO-RJ'), hash(1), hash(99)),
    ).to.be.revertedWithCustomError(registry, 'NotAnchoredInSeries');
    await expect(
      asPublisher.retract(series('DEMO-HR'), hash(5), hash(99)),
    ).to.be.revertedWithCustomError(registry, 'NotAnchoredInSeries');
    await expect(
      asPublisher.retract(series('DEMO-HR'), hash(1), ZERO),
    ).to.be.revertedWithCustomError(registry, 'EmptyHash');
    await expect(
      registry.connect(stranger).retract(series('DEMO-HR'), hash(1), hash(99)),
    ).to.be.revertedWithCustomError(registry, 'AccessControlUnauthorizedAccount');
  });

  it('reports a missing entry instead of returning zeros', async function () {
    const { registry } = await deploy();
    await expect(registry.entry(series('DEMO-HR'), 1n)).to.be.revertedWithCustomError(
      registry,
      'NoSuchEntry',
    );
    await expect(registry.entry(series('DEMO-HR'), 0n)).to.be.revertedWithCustomError(
      registry,
      'NoSuchEntry',
    );
  });

  it('has no function that can change or delete history', async function () {
    const { registry } = await deploy();
    const writes = registry.interface.fragments
      .filter((f) => f.type === 'function')
      .map((f) => f as unknown as { name: string; stateMutability: string })
      .filter((f) => f.stateMutability !== 'view' && f.stateMutability !== 'pure')
      .map((f) => f.name)
      .sort();
    // anchor and retract only append; the rest are OpenZeppelin role management.
    expect(writes).to.deep.equal(['anchor', 'grantRole', 'renounceRole', 'retract', 'revokeRole']);
  });
});
