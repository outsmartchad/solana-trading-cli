import type Api from "./lib/api";
import type FallbackApi from "./lib/fallbackApi";
export type NetworkInfoInterface = {
    network: string;
    version: number;
    release: number;
    height: number;
    current: string;
    blocks: number;
    peers: number;
    queue_length: number;
    node_state_latency: number;
};
export type PeerList = string[];
export default class Network {
    private api;
    constructor(api: Api | FallbackApi);
    getInfo(): Promise<NetworkInfoInterface>;
    getPeers(): Promise<PeerList>;
}
