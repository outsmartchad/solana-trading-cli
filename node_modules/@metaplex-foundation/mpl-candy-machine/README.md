# JavaScript client for Mpl Candy Machine

A Umi-compatible JavaScript library for candy machines.

## Getting started

1. First, if you're not already using Umi, [follow these instructions to install the Umi framework](https://github.com/metaplex-foundation/umi/blob/main/docs/installation.md).
2. Next, install this library using the package manager of your choice.
   ```sh
   npm install @metaplex-foundation/mpl-candy-machine
   ```
2. Finally, register the library with your Umi instance like so.
   ```ts
   import { mplCandyMachine } from '@metaplex-foundation/mpl-candy-machine';
   umi.use(mplCandyMachine());
   ```

You can learn more about this library's API by reading its generated [TypeDoc documentation](https://mpl-candy-machine-js-docs.vercel.app).

## Contributing

Check out the [Contributing Guide](./CONTRIBUTING.md) the learn more about how to contribute to this library.
