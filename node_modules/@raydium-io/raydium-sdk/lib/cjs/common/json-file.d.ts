export interface JsonFileMetaData {
    readonly name: string;
    readonly timestamp: string;
    readonly version: {
        major: number;
        minor: number;
        patch: number;
    };
}
