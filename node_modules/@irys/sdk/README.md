# Irys SDK

![](./assets/irys-SDK.png?raw=true)


The [Irys SDK](http://docs.irys.xyz/developer-docs/irys-sdk) is a typesafe SDK for interacting with [Irys](https://irys.xyz).

## What is Irys?

Irys is the only provenance layer. It enables users to scale permanent data and precisely attribute its origin. Data uploaded to Irys is permanent, precise, and unconstrained. Learn [more in our docs](http://docs.irys.xyz/overview/about).


## How Irys works

![](./assets/provenance-machine.jpg?raw=true)

When you upload data to Irys, you are immediately issued a receipt. This [receipt](https://docs.irys.xyz/learn/receipts) contains an ID that can be used to instantly download your data, along with attribution, authorship details, and timestamp accurate to the millisecond. The receipt acts as cryptographic proof of time and can be trustlessly verified as a safeguard against potentially malicious behavior.

Next, Irys [includes your transaction in a bundle](http://docs.irys.xyz/learn/transaction-lifecycle) and submits it to Arweave where it is permanently stored. Irys guarantees your transaction will be finalized on Arweave (>= 50 block confirmations) and seeded to >=5 miners.

For more details, including a video overview, [see our docs](http://docs.irys.xyz/overview/about).

## Why Irys offers
- Volumetric scaling: [Can handle 50K+ Transactions Per Second (TPS)](https://youtu.be/JKEivHKDXAo) and [limitless data volumes](http://docs.irys.xyz/learn/volumetric-scaling).
- Instant uploads: Upload data to Irys in as little as 8ms.
- Frictionless integration: [3-4 lines of code](http://docs.irys.xyz/developer-docs/irys-sdk) to integrate Irys.
- Pay in any token: Sign and pay to use Irys in [14 supported tokens](http://docs.irys.xyz/overview/supported-tokens).

## Getting started

### Install the SDK

Using npm:

```console
npm install @irys/sdk
```

or yarn:
```console
yarn add @irys/sdk
```

### Connect to an Irys node

Connect to [one of our three nodes](http://docs.irys.xyz/overview/nodes):

```js
const getIrys = async () => {
	const url = "https://devnet.irys.xyz";
	const providerUrl = "https://rpc-mumbai.maticvigil.com";
	const token = "matic";
 
	const irys = new Irys({
		url, // URL of the node you want to connect to
		token, // Token used for payment
		key: process.env.PRIVATE_KEY, // ETH or SOL private key
		config: { providerUrl }, // Optional provider URL, only required when using Devnet
	});
	return irys;
};
```

### Upload

```js
const uploadData = async () => {
	const irys = await getIrys();
	const dataToUpload = "GM world.";
	try {
		const receipt = await irys.upload(dataToUpload);
		console.log(`Data uploaded ==> https://arweave.net/${receipt.id}`);
	} catch (e) {
		console.log("Error uploading data ", e);
	}
};
```

For more code examples, including code showing how to upload files and folders, see [our docs](http://docs.irys.xyz/developer-docs/irys-sdk).

## Irys in the browser

When using [Irys in the browser](http://docs.irys.xyz/developer-docs/irys-sdk/irys-in-the-browser), the end user's injected provider is used to sign transactions and pay for uploads. See our docs for [code examples](http://docs.irys.xyz/developer-docs/irys-sdk/irys-in-the-browser). 

## UI toolkit

To help kickstart your next project, we've released the [Provenance Toolkit](http://docs.irys.xyz/developer-docs/provenance-toolkit), a full suite of open source UI components.

## Video

We also have a [video](https://www.youtube.com/watch?v=eGFYxJPaEjg) teaching how to build with Irys.

## Support

If you have any questions or just want to brainstorm about how to integrate Irys into your project, reach out to us in [Discord](https://discord.irys.xyz).
