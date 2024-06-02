/* eslint-disable @typescript-eslint/ban-ts-comment */

import { PublicKey } from '@solana/web3.js'
import BN from 'bn.js'

export function inspectPublicKey() {
  // @ts-ignore
  PublicKey.prototype.inspect = function () {
    return `<PublicKey: ${this.toString()}>`
  }
}

export function inspectBN() {
  // @ts-ignore
  BN.prototype.inspect = function () {
    // @ts-ignore
    return `<${this.red ? 'BN-R' : 'BN'}: ${this.toString()}>`
  }
}

export function inspectAll() {
  inspectPublicKey()
  inspectBN()
}
