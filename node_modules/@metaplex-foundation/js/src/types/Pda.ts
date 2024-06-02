import { Buffer } from 'buffer';
import { PublicKey, PublicKeyInitData } from '@solana/web3.js';

export class Pda extends PublicKey {
  /** The bump used to generate the PDA. */
  public readonly bump: number;

  constructor(value: PublicKeyInitData, bump: number) {
    super(value);
    this.bump = bump;
  }

  static find(programId: PublicKey, seeds: Array<Buffer | Uint8Array>): Pda {
    const [publicKey, bump] = PublicKey.findProgramAddressSync(
      seeds,
      programId
    );

    return new Pda(publicKey, bump);
  }
}
