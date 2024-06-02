import { MetaplexError } from './MetaplexError';

/** @group Errors */
export class IrysError extends MetaplexError {
  readonly name: string = 'IrysError';
  constructor(message: string, cause?: Error) {
    super(message, 'plugin', 'Irys', cause);
  }
}

/** @group Errors */
export class FailedToInitializeIrysError extends IrysError {
  readonly name: string = 'FailedToInitializeIrysError';
  constructor(cause: Error) {
    const message =
      'Irys could not be initialized. ' +
      'Please check the underlying error below for more details.';
    super(message, cause);
  }
}

/** @group Errors */
export class FailedToConnectToIrysAddressError extends IrysError {
  readonly name: string = 'FailedToConnectToIrysAddressError';
  constructor(address: string, cause: Error) {
    const message =
      `Irys could not connect to the provided address [${address}]. ` +
      'Please ensure the provided address is valid. Some valid addresses include: ' +
      '"https://node1.irys.xyz" for mainnet and "https://devnet.irys.xyz" for devnet';
    super(message, cause);
  }
}

/** @group Errors */
export class AssetUploadFailedError extends IrysError {
  readonly name: string = 'AssetUploadFailedError';
  constructor(status: number) {
    const message =
      `The asset could not be uploaded to the Irys network and ` +
      `returned the following status code [${status}].`;
    super(message);
  }
}

/** @group Errors */
export class IrysWithdrawError extends IrysError {
  readonly name: string = 'IrysWithdrawError';
  constructor(error: string) {
    const message =
      `The balance could not be withdrawn from the Irys network and ` +
      `returned the following error: ${error}.`;
    super(message);
  }
}
