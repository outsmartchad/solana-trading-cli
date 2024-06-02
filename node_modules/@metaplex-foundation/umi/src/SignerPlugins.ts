import { createSignerFromKeypair, generateSigner, Keypair } from './Keypair';
import type { UmiPlugin } from './UmiPlugin';
import type { Signer } from './Signer';

/**
 * Umi plugin that sets the identity and the payer to the given signer.
 * @category Signers and PublicKeys
 */
export const signerIdentity = (signer: Signer, setPayer = true): UmiPlugin => ({
  install(umi) {
    umi.identity = signer;
    if (setPayer) {
      umi.payer = signer;
    }
  },
});

/**
 * Umi plugin that only sets the payer to the given signer.
 * @category Signers and PublicKeys
 */
export const signerPayer = (signer: Signer): UmiPlugin => ({
  install(umi) {
    umi.payer = signer;
  },
});

/**
 * Umi plugin that sets the identity and the payer to a randomly generated signer.
 * @category Signers and PublicKeys
 */
export const generatedSignerIdentity = (setPayer = true): UmiPlugin => ({
  install(umi) {
    const signer = generateSigner(umi);
    umi.use(signerIdentity(signer, setPayer));
  },
});

/**
 * Umi plugin that only sets the payer to a randomly generated signer.
 * @category Signers and PublicKeys
 */
export const generatedSignerPayer = (): UmiPlugin => ({
  install(umi) {
    const signer = generateSigner(umi);
    umi.use(signerPayer(signer));
  },
});

/**
 * Umi plugin that sets the identity and the payer to a provided keypair.
 * @category Signers and PublicKeys
 */
export const keypairIdentity = (
  keypair: Keypair,
  setPayer = true
): UmiPlugin => ({
  install(umi) {
    const signer = createSignerFromKeypair(umi, keypair);
    umi.use(signerIdentity(signer, setPayer));
  },
});

/**
 * Umi plugin that only sets the payer to a provided keypair.
 * @category Signers and PublicKeys
 */
export const keypairPayer = (keypair: Keypair): UmiPlugin => ({
  install(umi) {
    const signer = createSignerFromKeypair(umi, keypair);
    umi.use(signerPayer(signer));
  },
});
