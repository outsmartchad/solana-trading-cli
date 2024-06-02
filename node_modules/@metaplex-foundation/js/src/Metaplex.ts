import { Connection } from '@solana/web3.js';
import { ReadApiConnection } from './utils/readApiConnection';
import { MetaplexPlugin, Cluster, resolveClusterFromConnection } from '@/types';
import { corePlugins } from '@/plugins/corePlugins';

export type MetaplexOptions = {
  cluster?: Cluster;
};

export class Metaplex {
  /** The connection object from Solana's SDK. */
  public readonly connection: Connection | ReadApiConnection;

  /** The cluster in which the connection endpoint belongs to. */
  public readonly cluster: Cluster;

  constructor(connection: Connection, options: MetaplexOptions = {}) {
    this.connection = connection;
    this.cluster = options.cluster ?? resolveClusterFromConnection(connection);
    this.use(corePlugins());
  }

  static make(connection: Connection, options: MetaplexOptions = {}) {
    return new this(connection, options);
  }

  use(plugin: MetaplexPlugin) {
    plugin.install(this);

    return this;
  }
}
