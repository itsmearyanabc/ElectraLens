import { buildModule } from '@nomicfoundation/hardhat-ignition/modules';

/**
 * Deploys ElectraLensRegistry. The deploying account needs no role: `admin` (an offline wallet
 * that can revoke and rotate the publisher) and `publisher` (the anchor service's hot wallet)
 * are passed in as parameters.
 */
export default buildModule('ElectraLensRegistry', (m) => {
  const admin = m.getParameter<string>('admin');
  const publisher = m.getParameter<string>('publisher');
  const registry = m.contract('ElectraLensRegistry', [admin, publisher]);
  return { registry };
});
