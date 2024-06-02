import * as avro from "avsc";
export declare const tagParser: avro.Type;
export declare const tagsParser: avro.Type;
export declare function serializeTags(tags: {
    name: string;
    value: string;
}[]): Uint8Array;
