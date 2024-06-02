export type JWKPublicInterface = {
    kty: string;
    e: string;
    n: string;
};
export type JWKInterface = {
    d?: string;
    p?: string;
    q?: string;
    dp?: string;
    dq?: string;
    qi?: string;
} & JWKPublicInterface;
