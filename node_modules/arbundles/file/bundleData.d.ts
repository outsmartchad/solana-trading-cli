import { Signer } from "../src/signing";
import FileBundle from "./FileBundle";
import FileDataItem from "./FileDataItem";
export declare function bundleAndSignData(dataItems: FileDataItem[], signer: Signer, dir?: string): Promise<FileBundle>;
