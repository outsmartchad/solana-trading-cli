/// <reference types="node" />
import BN from "bn.js";
import { Buffer } from "buffer";
declare function keccak256(value: Buffer | BN | string | number): any;
export = keccak256;
