declare module 'bn.js' {
  export default class BN {
    constructor(number: string | number | bigint | Buffer | number[], base?: number, endian?: 'le' | 'be');
  }
}
