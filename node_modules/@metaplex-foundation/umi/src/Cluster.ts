/**
 * Defines the available Solana clusters.
 * @category Utils — Cluster
 */
export type Cluster =
  | 'mainnet-beta'
  | 'devnet'
  | 'testnet'
  | 'localnet'
  | 'custom';

/**
 * Helper type to helps the end-user selecting a cluster.
 * They can either provide a specific cluster or use the
 * special values 'current' or '*' to select the current
 * cluster or all clusters respectively.
 * @category Utils — Cluster
 */
export type ClusterFilter = Cluster | 'current' | '*';

const MAINNET_BETA_DOMAINS = [
  'api.mainnet-beta.solana.com',
  'ssc-dao.genesysgo.net',
];
const DEVNET_DOMAINS = [
  'api.devnet.solana.com',
  'psytrbhymqlkfrhudd.dev.genesysgo.net',
];
const TESTNET_DOMAINS = ['api.testnet.solana.com'];
const LOCALNET_DOMAINS = ['localhost', '127.0.0.1'];

/**
 * Helper method that tries its best to resolve a cluster from a given endpoint.
 * @category Utils — Cluster
 */
export const resolveClusterFromEndpoint = (endpoint: string): Cluster => {
  const domain = new URL(endpoint).hostname;
  if (MAINNET_BETA_DOMAINS.includes(domain)) return 'mainnet-beta';
  if (DEVNET_DOMAINS.includes(domain)) return 'devnet';
  if (TESTNET_DOMAINS.includes(domain)) return 'testnet';
  if (LOCALNET_DOMAINS.includes(domain)) return 'localnet';
  if (endpoint.includes('mainnet')) return 'mainnet-beta';
  if (endpoint.includes('devnet')) return 'devnet';
  if (endpoint.includes('testnet')) return 'testnet';
  if (endpoint.includes('local')) return 'localnet';
  return 'custom';
};
