import hardhatToolboxMochaEthersPlugin from '@nomicfoundation/hardhat-toolbox-mocha-ethers';
import { configVariable, defineConfig } from 'hardhat/config';

export default defineConfig({
  plugins: [hardhatToolboxMochaEthersPlugin],
  solidity: {
    profiles: {
      default: { version: '0.8.34' },
      production: {
        version: '0.8.34',
        settings: { optimizer: { enabled: true, runs: 200 } },
      },
    },
  },
  networks: {
    hardhatMainnet: { type: 'edr-simulated', chainType: 'l1' },
    // Ethereum Hoodi testnet (chain 560048). Testnet only: ElectraLens never spends real funds.
    hoodi: {
      type: 'http',
      chainType: 'l1',
      chainId: 560048,
      url: configVariable('HOODI_RPC_URL'),
      // The dedicated publisher hot wallet (see scripts/new-wallet.ts), never a personal key.
      accounts: [configVariable('HOODI_PRIVATE_KEY')],
    },
  },
});
