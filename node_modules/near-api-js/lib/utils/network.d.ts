export interface Network {
    name: string;
    chainId: string;
    _defaultProvider?: (providers: any) => any;
}
