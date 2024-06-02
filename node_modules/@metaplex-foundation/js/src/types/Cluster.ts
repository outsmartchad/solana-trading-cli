import { Connection } from '@solana/web3.js';

export type Cluster =
  | 'mainnet-beta'
  | 'devnet'
  | 'testnet'
  | 'localnet'
  | 'custom';

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

export const resolveClusterFromConnection = (
  connection: Connection
): Cluster => {
  return resolveClusterFromEndpoint(connection.rpcEndpoint);
};

export const resolveClusterFromEndpoint = (endpoint: string): Cluster => {
  const domain = new URL(endpoint).hostname;
  if (MAINNET_BETA_DOMAINS.includes(domain)) return 'mainnet-beta';
  if (DEVNET_DOMAINS.includes(domain)) return 'devnet';
  if (TESTNET_DOMAINS.includes(domain)) return 'testnet';
  if (LOCALNET_DOMAINS.includes(domain)) return 'localnet';
  return 'custom';
};
