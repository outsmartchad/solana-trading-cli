# Irys Query SDK

The Irys Query SDK is a powerful package that simplifies querying Irys and Arweave
	
It features:

-   Single Main Class: Use the Query class as a single point of entry to query Irys and Arweave
-   Ease of Use: The package is designed to be intuitive, saving you the complexity of dealing directly with GraphQL.

## Installation

You can install via npm:

```console
npm install @irys/query
```

and yarn:

```console
yarn add @irys/query
```

TODO: Install instructions may change once the package is pushed

## Imports

Import the Irys Query package with:

```js
import Query from "@irys/query";
```

## Creating A Query Object

Start by instantiating a new `Query` object, this is a shared instance you can reuse each time you want to execute a new query.

```js
const myQuery = new Query();
```

Then execute a query by chaining together a series of functions that collaboratively narrow down the results returned.

To retrieve the 20 latest transactions with the tag `Content-Type` set to `image/png` on Irys, use the following:

```js
const results = await myQuery
	.search("irys:transactions")
	.tags([{ name: "Content-Type", values: ["image/png"] }])
	.sort("ASC")
	.limit(20);
```

## Changing Default Query Endpoints

The `Query` class simplifies querying Irys and Arweave by abstracting GraphQL complexities. Internally, it links to a GraphQL endpoint for query execution. Typically, the default endpoint suffices, but sometimes you might need a different query location, for example, when connecting Irys' Node 2, Devnet, or an alternative Arweave endpoint.

To change the endpoint, pass the desired URL to the Query class constructor.

When connecting to Irys, any of these values may be used:

-   https://node1.irys.xyz/graphql (DEFAULT)
-   https://node2.irys.xyz/graphql
-   https://devnet.irys.xyz/graphql

When querying Arweave, any of these values may be used:

-   https://arweave.net/graphql (DEFAULT)
-   https://arweave.dev/graphql
-   https://arweave-search.goldsky.com/graphql

```js
const myQuery = new Query({ url: "https://node2.bundlr.network/graphql" });
```

## Changing Between Irys and Arweave Searches

Use the `search()` function to change between searching Irys and Arweave.

-   `irys:transactions`: Searches transactions uploaded to Arweave via to any of Irys' nodes
-   `arweave:transactions`: Searches all transactions posted to Arweave
-   `arweave:blocks`: Searches all of Arweave for a specific block

```js
const results = await myQuery.search("irys:transactions");
```
## Searching By Timestamp

Use the `fromTimestamp()` and `toTimestamp()` functions to search for transactions by timestamp. Results returned are `>= fromTimestamp` and `< toTimestamp`.

Irys timestamps are accurate to the millisecond, so you need to provide a timestamp in millisecond format. You can convert from human readable time to UNIX timestamp using websites like [Epoch101](https://www.epoch101.com/ ), be sure to convert in “millisecond” format not “second”.

```js
const results = await myQuery
	.search("irys:transactions")
	.fromTimestamp(1688144401000)
	.toTimestamp(1688317201000);
```

## Searching By **Tags**

Use the `tags()` function to search [metadata tags](https://docs.bundlr.network/developer-docs/tags) attached to transactions during upload.

Search for a single tag name / value pair:

```js
const results = await myQuery.search("irys:transactions").tags([{ name: "Content-Type", values: ["image/png"] }]);
```

Search for a single tag name with a list of possible values. The search employs OR logic, returning transactions tagged with ANY provided value.

```js
const results = await myQuery
	.search("irys:transactions")
	.tags([{ name: "Content-Type", values: ["image/png", "image/jpg"] }]);
```

Search for multiple tags. The search employs AND logic, returning transactions tagged with ALL provided values.

```js
const results = await myQuery.search("irys:transactions").tags([
	{ name: "Content-Type", values: ["image/png"] },
	{ name: "Application-ID", values: ["myApp"] },
]);
```

You can also search Arweave by tags.

```js
const results = await myQuery
	.search("arweave:transactions")
	.tags([{ name: "Content-Type", values: ["image/png", "image/jpg"] }]);
```

## Search By **Transaction ID**

Use the `ids()` function to by transaction ID. The search employs OR logic, returning transactions tagged with ANY provided value:

```js
const results = await myQuery
	.search("irys:transactions")
	.ids(["xXyv3u9nHHWGiMJl_DMgLwwRdOTlIlQZyqaK_rOkNZw", "_xE7tG1kl2FgCUDgJ5jNJeVA6R5kuys7A6f1qfh9_Kw"]);
```

You can also search Arweave by transaction ID.

```js
const results = await myQuery
	.search("arweave:transactions")
	.ids(["xXyv3u9nHHWGiMJl_DMgLwwRdOTlIlQZyqaK_rOkNZw", "_xE7tG1kl2FgCUDgJ5jNJeVA6R5kuys7A6f1qfh9_Kw"]);
```

## Search By **Transaction Sender**

Use the `from()` function to search by wallet addresses used when signing and paying for the upload. Addresses from any of [Irys' supported chains](https://docs.bundlr.network/overview/supported-tokens) are accepted.

The search employs OR logic, returning transactions tagged with ANY provided value:

```js
const results = await myQuery
	.search("irys:transactions")
	.from(["UsWPlOBHRyfWcbrlC5sV3-pNUjOQEI5WmDxLnypc93I", "0x4adDE0b3C686B4453e007994edE91A7832CF3c99"]);
```

When searching Arweave by transaction sender, only Arweave addresses are accepted.

```js
const results = await myQuery
	.search("arweave:transactions")
	.from(["TrnCnIGq1tx8TV8NA7L2ejJJmrywtwRfq9Q7yNV6g2A"]);
```

## Search By **Transaction Recipient**

Use the `to()` function to search the wallet address of the transaction recipient. This search works on Arweave only and is used when there's a fund transfer.

```js
const results = await myQuery
	.search("arweave:transactions")
	.to("TrnCnIGq1tx8TV8NA7L2ejJJmrywtwRfq9Q7yNV6g2A");
```

## Search By Currency

Use the `currency()` function to search based on the token name used to pay for the upload. Any of [these values](https://docs.bundlr.network/overview/supported-tokens) are acceptable.

```js
const results = await myQuery
	.search("irys:transactions")
	.currency("solana");
```

## Search By Block ID

Use the `ids()` function to search for Arweave blocks with the specified IDs.

```js
const results = await myQuery
	.search("arweave:blocks")
	.ids(["R0ZLe4RvHxLJLzI1Z9ppyYVWFyHW4D1YrxXKuA9PGrwkk2QAuXCnD1xOJe-QOz4l"])

```

## Searching By Block Height

Use the `mixHeight()` and `maxHeight()` to search for blocks within the specified range.

```js
const results = await myQuery
	.search("arweave:blocks")
	.minHeight(1188272)
	.maxHeight(1188279);
```

## Sorting

Use the `sort()` function to sort results by timestamp in ascending order (`ASC`)

```js
const results = await myQuery
	.search("irys:transactions")
	.currency("ethereum")
	.sort("ASC");
```

or descending (`DESC`) order.

```js
const results = await myQuery
	.search("irys:transactions")
	.currency("matic")
	.sort("DESC");
```

## Obtaining Only The First Result

Use the `first()` function to return only the first result.

```js
const results = await myQuery
	.search("irys:transactions")
	.tags([{ name: "Content-Type", values: ["image/png"] }])
	.first();
```

## Limiting Search Results

Use the `limit()` function to limit the maximum number of results returned. This overrides the default value of 1000 results when searching Irys and 100 when searching Arweave directly.

```js
const results = await myQuery
	.search("irys:transactions")
	.ids(["xXyv3u9nHHWGiMJl_DMgLwwRdOTlIlQZyqaK_rOkNZw",       	
	      "_xE7tG1kl2FgCUDgJ5jNJeVA6R5kuys7A6f1qfh9_Kw"])
	.limit(20);
```

## Pagination / Streaming

Use the `stream()` function to manage large results sets. This function returns an iterable stream which will continuously yield results as long as your query keeps producing them.

```js
// Create the stream
const stream = await myQuery
	.search("irys:transactions")
	.currency("solana")
	.stream();

// Iterate over the results
for await (const result of stream) {
	console.log(result);
}
```

## Limiting Fields Returned

Use the `fields()` function to limit the fields returned. To limit the results, set a field's value to `false` or omit it entirely.

The fields available for retrieval depend on the search type, when searching `irys:transactions`, the following fields are available:

```js
.fields({
	id: true, // Transaction ID
	currency: true, // Currency used for payment
	address: true, // Cross-chain address used for signing and payment
	receipt: {
		deadlineHeight: true, // The block number by which the transaction must be finalized on Arweave
		signature: true, // A signed deep hash of the JSON receipt
		timestamp: true, // Timestamp, millisecond accurate, of the time the uploaded was verified
		version: true, // The receipt version, currently 1.0.0
	},
	tags: { // An array of tags associated with the upload
		name: true,
		value: true,
	},
	signature: true, // A signed deep hash of the JSON receipt
	timestamp: true, // Timestamp, millisecond accurate, of the time the uploaded was verified
})
```

When searching by `arweave:transactions` the following fields are available:

TODO: I need to sync with JB or Jesse on these, not sure what they all are

```js
.fields({
	id: true, // Transaction ID
	tags: {
		// Tags associated with the upload
		name: true,
		value: true,
	},
	anchor: true,
	block: {
		height: true, // Block height
		id: true, // Block ID
		previous: true, // Todo
		timestamp: true, // Block timestamp
	},
	bundledIn: {
		id: true,
	},
	data: {
		size: true,
		type: true,
	},
	fee: {
		ar: true,
		winston: true,
	},
	owner: {
		address: true,
		key: true,
	},
	quantity: {
		ar: true,
		winston: true,
	},
	recipient: true,
	signature: true,
})
```

When searching by `arweave:blocks` the following fields are available:

```js
.fields({
	height: true,
	id: true,
	previous: true,
	timestamp: true,
})
```
