# @irys/arweave

![](./assets/irys-arweave-package.png?raw=true)

@irys/arweave is a TypeScript/JavaScript SDK for interacting with [Arweave](https://www.arweave.org/) and uploading data to the permaweb. It works in latest browsers and Node JS.

The package is a fork of [arweave-js](https://github.com/ArweaveTeam/arweave-js) that introduces better typing, Improved  NodeJS compatibility, and better support for using streams by integrating code from [arweave-stream-tx](https://github.com/CDDelta/arweave-stream-tx). 

> **Note:** 
> If you are planning to upload large batches of data transactions to Arweave, it is strongly advised that you use [ArBundles](https://github.com/Bundler-Network/arbundles) or [Irys](https://irys.xyz) instead of transactions with `@irys/arweave`. You can read about bundles and their advantages on the [Arwiki](https://arwiki.wiki/#/en/bundles).

- [Arweave JS](#arweave-js)
	- [Installation](#installation)
		- [Npm](#npm)
		- [Yarn](#yarn)
		- [Bundles](#bundles)
	- [Initialization](#initialization)
		- [Web bundles](#web-bundles)
		- [Initialization options](#initialization-options)
	- [Usage](#usage)
		- [Wallets and keys](#wallets-and-keys)
			- [Creating a new wallet and private key](#creating-a-new-wallet-and-private-key)
			- [Getting the wallet address for a private key](#getting-the-wallet-address-for-a-private-key)
			- [Getting an address balance](#getting-an-address-balance)
			- [Getting the last transaction ID from a wallet](#getting-the-last-transaction-id-from-a-wallet)
		- [Transactions](#transactions)
			- [Creating a data transaction](#creating-a-data-transaction)
			- [Creating a wallet to wallet transaction](#creating-a-wallet-to-wallet-transaction)
			- [Adding tags to a transaction](#adding-tags-to-a-transaction)
			- [Signing a transaction](#signing-a-transaction)
			- [Submitting a transaction](#submitting-a-transaction)
				- [Chunked uploading advanced options](#chunked-uploading-advanced-options)
		- [Streaming uploads](#streaming-uploads)
			- [Getting transaction status](#getting-transaction-status)
			- [Getting a transaction](#getting-a-transaction)
			- [Getting transaction data](#getting-transaction-data)
			- [Getting tags from transactions](#getting-tags-from-transactions)
		- [Blocks](#blocks)
			- [Getting a block by indep\_hash](#getting-a-block-by-indep_hash)
			- [Getting block by height](#getting-block-by-height)
			- [Getting current block](#getting-current-block)
		- [GraphQL](#graphql)
		- [License](#license)

## Installation

### Npm
```bash
npm install @irys/arweave
```

### Yarn
```
yarn add @irys/arweave
```

### Bundles

Include the package via import statement when possible. If a script tag is required, use the examples below.

```html
<!-- Latest -->
<script src="https://unpkg.com/@irys/arweave/build/web.bundle.js"></script>

<!-- Latest, minified-->
<script src="https://unpkg.com/@irys/arweave/build/web.bundle.min.js"></script>

<!-- Specific version -->
<script src="https://unpkg.com/@irys@1.0.0/arweave/build/web.bundle.js"></script>

<!-- Specific version, minified -->
<script src="https://unpkg.com/@irys@1.0.0/arweave/build/web.bundle.min.js"></script>
```


## Initialization

```js
import Arweave from "@irys/arweave";

// If you want to connect directly to a node
const arweave = new Arweave({ url: "http://127.0.0.1:1984" });

// Or to specify a gateway when running from NodeJS you might use
const arweave = new Arweave({ url: "https://arweave.net" });

// @irys/arweave includes a fallback capable request backend - requests can be specified to be gateway only or to try gateways and miners. Requests are forwarded to hosts in the order you specify, with gateways being used before miners if both can be used for a request.

// Specify multiple gateways and multiple miners - will request from arweave.net, arweave.dev, your-gateway, and the miners
const arweave = new Arweave(["https://arweave.net", "https://arweave.dev", "https://your-gateway"], {
  miners: ["http://127.0.0.1:1984", "http://52.38.214.72:1984"],
});

```


### Web bundles

```js
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Hello world</title>
    <script src="https://unpkg.com/@irys/arweave/build/web.bundle.js"></script>
    <script>
    const arweave = new Arweave({ url: "https://arweave.net" })
    arweave.network.getInfo().then(console.log);
    </script>
</head>
<body>

</body>
</html>
```

### Initialization options

```js
(
    gateways: string, URL, or ApiConfig - Array or single item
    options: {
        gateways?: same as above
        crypto?: Custom implementation of CryptoInterface
        miners?: same as gateways, but for miner nodes
    }

)
```

## Usage

### Wallets and keys

#### Creating a new wallet and private key

To generate a new wallet address and private key ([JWK](https://docs.arweave.org/developers/server/http-api#key-format)) use the function `arweave.wallets.generate()`. Once AR has been sent to the address for a new wallet, the key can then be used to sign outgoing transactions.

> Don't expose private keys or make them public as anyone with the key can use the corresponding wallet.

> Make sure your keys stored securely as they can never be recovered if lost.


```js
arweave.wallets.generate().then((key) => {
  console.log(key);
  // {
  //     "kty": "RSA",
  //     "n": "3WquzP5IVTIsv3XYJjfw5L-t4X34WoWHwOuxb9V8w...",
  //     "e": ...
});

```

#### Getting the wallet address for a private key

```js
arweave.wallets.jwkToAddress(key).then((address) => {
  console.log(address);
  //1seRanklLU_1VTGkEk7P0xAwMJfA7owA1JHW5KyZKlY
});
```

#### Getting an address balance

> All amounts are returned in [Winston](https://docs.arweave.org/developers/server/http-api#ar-and-winston).

```js
arweave.wallets.getBalance("1seRanklLU_1VTGkEk7P0xAwMJfA7owA1JHW5KyZKlY").then((balance) => {
  let winston = balance;
  let ar = arweave.utils.winstonToAr(balance);

  console.log(winston);
  //125213858712

  console.log(ar);
  //0.125213858712
});

```

#### Getting the last transaction ID from a wallet

```js
arweave.wallets.getLastTransactionID("1seRanklLU_1VTGkEk7P0xAwMJfA7owA1JHW5KyZKlY").then((transactionId) => {
  console.log(transactionId);
  //3pXpj43Tk8QzDAoERjHE3ED7oEKLKephjnVakvkiHF8
});

```

### Transactions

Transactions are the building blocks of Arweave. They can send [AR](https://docs.arweave.org/developers/server/http-api#ar-and-winston) between wallet addresses or store data on Arweave.

The create transaction methods create and return an unsigned transaction object. You must sign the transaction and submit it separately using the `transactions.sign()` and `transactions.submit()` methods.

If you don't pass a `key` argument when creating a transaction, @irys/arweave will attempt to use a browser-based wallet extension, such as [ArConnect](https://arconnect.io) or [Arweave.app](https://arweave.app) to sign the transaction.

**Modifying a transaction object after signing it will invalidate the signature,** causing it to be rejected by the network if submitted in that state. Transaction prices are based on the size of the data field, so modifying the data field after a transaction has been created isn't recommended as you'll need to manually update the price.

The transaction ID is a hash of the transaction signature, so a transaction ID can't be known until its contents are finalized and it has been signed.

#### Creating a data transaction

> **Note:** If you are planning to upload large batches of data transactions to Arweave, it is strongly advised that you use [ArBundles](https://github.com/Bundler-Network/arbundles) instead of transactions with `@irys/arweave`. You can read about bundles and their advantages on the [Arwiki](https://arwiki.wiki/#/en/preview/WUAtjfiDQEIqhsUcHXIFTn5ZmeDIE7If9hJREBLRgak).

Data transactions are used to store data on Arweave. They can contain HTML or any arbitrary data and are served like webpages.

```js
let key = await arweave.wallets.generate();

// Plain text
let transactionA = await arweave.createTransaction(
  {
    data: '<html><head><meta charset="UTF-8"><title>Hello world!</title></head><body></body></html>',
  },
  key,
);

// Buffer
let transactionB = await arweave.createTransaction(
  {
    data: Buffer.from("Some data", "utf8"),
  },
  key,
);

console.log(transactionA);
// Transaction {
//   format: 2,
//   id: 'ReUohI9tEmXQ6EN9H9IkRjY9bSdgql_OdLUCOeMEte0',
//   last_tx: 'Tk-0c7260Ya5zjfjzl4f6-W-vRO94qiqZMAScKBcYXc68v1Pd8bYfTbKWi7pepUF',
//   owner: 'kmM4O08BJB85RbxfQ2nkka9VNO6Czm2Tc_IGQNYCTSXRzO...',
//   tags: [],
//   target: '',
//   quantity: '0',
//   data: 'c29tZSBkYXRh',
//   data_size: '9',
//   data_root: 'qwKZUl7qWpCEmB3cpONKTYOcSmnmhb-_s8ggMTZwCU4',
//   data_tree: [],
//   reward: '7489274',
//   signature: 'JYdFPblDuT95ky7_wVss3Ax9e4Qygcd_lEcB07sDPUD_wNslOk...'
// }

```

#### Creating a wallet to wallet transaction

Wallet to wallet transactions facilitate payments from one wallet to another. Supply a target wallet, and AR quantity in Winston.

```js
let key = await arweave.wallets.generate();

// Send 10.5 AR to 1seRanklLU_1VTGkEk7P0xAwMJfA7owA1JHW5KyZKlY
let transaction = await arweave.createTransaction(
  {
    target: "1seRanklLU_1VTGkEk7P0xAwMJfA7owA1JHW5KyZKlY",
    quantity: arweave.utils.arToWinston("10.5"),
  },
  key,
);

console.log(transaction);
// Transaction {
//   format: 2,
//   id: 'v-n7hAc7cubeXSClh0beaOs1RjYFagyvpl2TkUOfbRg',
//   last_tx: 'Tk-0c7260Ya5zjfjzl4f6-W-vRO94qiqZMAScKBcYXc68v1Pd8bYfTbKWi7pepUF',
//   owner: 'kmM4O08BJB85RbxfQ2nkka9VNO6Czm2Tc_IGQNYCTSXRzOc6W9b...',
//   tags: [],
//   target: '1seRanklLU_1VTGkEk7P0xAwMJfA7owA1JHW5KyZKlY',
//   quantity: '10500000000000',
//   data: '',
//   data_size: '0',
//   data_root: '',
//   data_tree: [],
//   reward: '7468335',
//   signature: 'DnUOYbRSkhI4ZXg5fpYDCwPv8yvM5toAneSx4Jlg0zjIocqPs8giPP...'
// }

```

#### Adding tags to a transaction

Metadata can be added to transactions through tags, these are simple key/value pairs that can be used to document the contents of a transaction or provide related data.

[GraphQL](#graphql) uses tags when searching for transactions.

> The `Content-Type` tag is a reserved tag and is used to set the data content type. For example, a transaction with HTML data and a content type tag of `text/html` will be served as a HTML page and render correctly in browsers, if the content type is set to `text/plain` then it will be served as a plain text document and will not render in browsers.

> If you omit the `Content-Type` tag, browsers will be unable to render the content. 

```js
let key = await arweave.wallets.generate();

let transaction = await arweave.createTransaction(
  {
    data: '<html><head><meta charset="UTF-8"><title>Hello world!</title></head><body></body></html>',
  },
  key,
);

transaction.addTag("Content-Type", "text/html");
transaction.addTag("key2", "value2");

console.log(transaction);
// Transaction {
//   format: 2,
//   id: '',
//   last_tx: 'Tk-0c7260Ya5zjfjzl4f6-W-vRO94qiqZMAScKBcYXc68v1Pd8bYfTbKWi7pepUF',
//   owner: 'kmM4O08BJB85RbxfQ2nkka9VNO6Czm2Tc_IGQNYC...',
//   tags: [
//     Tag { name: 'Q29udGVudC1UeXBl', value: 'dGV4dC9odG1s' },
//     Tag { name: 'a2V5Mg', value: 'dmFsdWUy' }
//   ],
//   target: '',
//   quantity: '0',
//   data: 'PGh0bWw-PGhlYWQ-PG1ldGEgY2hhcnNldD0iVVRGLTgiPjx0aXRsZT5IZWxsbyB3b3JsZCE8L3RpdGxlPjwvaGVhZD48Ym9keT48L2JvZHk-PC9odG1sPg',
//   data_size: '88',
//   data_root: 'GQunzmbwk2_JPU7oJOmLrTMvj8v_7BJaF0weyjVn5Nc',
//   data_tree: [],
//   reward: '7673074',
//   signature: ''
// }

```

#### Signing a transaction

```js
let key = await arweave.wallets.generate();

let transaction = await arweave.createTransaction(
  {
    target: "1seRanklLU_1VTGkEk7P0xAwMJfA7owA1JHW5KyZKlY",
    quantity: arweave.utils.arToWinston("10.5"),
  },
  key,
);

await arweave.transactions.sign(transaction, key);

console.log(transaction);
// Transaction {
//   format: 2,
//   id: 'v-n7hAc7cubeXSClh0beaOs1RjYFagyvpl2TkUOfbRg',
//   last_tx: 'Tk-0c7260Ya5zjfjzl4f6-W-vRO94qiqZMAScKBcYXc68v1Pd8bYfTbKWi7pepUF',
//   owner: 'kmM4O08BJB85RbxfQ2nkka9VNO6Czm2Tc_IGQNYCTSXRzOc6W9b...',
//   tags: [],
//   target: '1seRanklLU_1VTGkEk7P0xAwMJfA7owA1JHW5KyZKlY',
//   quantity: '10500000000000',
//   data: '',
//   data_size: '0',
//   data_root: '',
//   data_tree: [],
//   reward: '7468335',
//   signature: 'DnUOYbRSkhI4ZXg5fpYDCwPv8yvM5toAneSx4Jlg0zjIocqPs8giPP...'
// }

```

#### Submitting a transaction

The preferred method of submitting a data transaction is to use chunk uploading. This method allows larger transaction sizes, resuming an upload if it's interrupted, and give progress updates while uploading.

> The following code has been simplified and ignores potential errors.

```js

let data = fs.readFileSync("path/to/file.pdf");

let transaction = await arweave.createTransaction({ data: data }, key);
transaction.addTag("Content-Type", "application/pdf");

await arweave.transactions.sign(transaction, key);

let uploader = await arweave.transactions.getUploader(transaction);

while (!uploader.isComplete) {
  await uploader.uploadChunk();
  console.log(`${uploader.pctComplete}% complete, ${uploader.uploadedChunks}/${uploader.totalChunks}`);
}
```

You can also submit transactions using `transactions.post()` which is suitable for small transactions or token transfers:

```js
let key = await arweave.wallets.generate();

let transaction = await arweave.createTransaction(
  {
    target: "1seRanklLU_1VTGkEk7P0xAwMJfA7owA1JHW5KyZKlY",
    quantity: arweave.ar.arToWinston("10.5"),
  },
  key,
);

await arweave.transactions.sign(transaction, key);

const response = await arweave.transactions.post(transaction);

console.log(response.status);
// 200 : not to be confused with getStatus === 200, see note below**


// HTTP response codes (200 - server received the transaction, 4XX - invalid transaction, 5XX - error)
```

The `200` responses means a node has received your transaction, it does not mean that the transaction has mined and confirmed, and that a txid can be used as if it's immutable. See [get a transaction status](#get-a-transaction-status) for more detail on how to correctly determine that your transaction has been mined and confirmed. This also applies to the `uploader()` method.


##### Chunked uploading advanced options

You can resume an upload from a saved uploader object that you have persisted in storage some using 
`JSON.stringify(uploader)` at any stage of the upload. To resume, parse it back into an object and pass it to `getUploader()` along with the transactions data:

```js
let data = fs.readFileSync("path/to/file.pdf"); // Get the same data
let resumeObject = JSON.parse(savedUploader); // Get uploader object from where you stored it.

let uploader = await arweave.transactions.getUploader(resumeObject, data);
while (!uploader.isComplete) {
  await uploader.uploadChunk();
}
```

When resuming the upload, you *must provide the same data* as the original upload. When you serialize the uploader object with `JSON.stringify()` to save it somewhere, it will not include the data.

You can also resume an upload from just the transaction ID and data, once it has been mined into a block. This can be useful if you didn't save the uploader somewhere but the upload got interrupted. This will re-upload all of the data from the beginning, since we don't know which parts have been uploaded:

```js
let data = fs.readFileSync("path/to/file.pdf"); // Get the same data
let resumeTxId = "mytxid"; // A transaction ID for a mined transaction that didn't complete the upload.

let uploader = await arweave.transactions.getUploader(resumeTxId, data);
while (!uploader.isComplete) {
  await uploader.uploadChunk();
  console.log(`${uploader.pctComplete}% complete`);
}
```

Alternatively:

```js
// Example of tx being accepted and mined, but the network is missing the data
import Arweave from "./node/index.js"; // Assumed locally built nodejs target
import ArweaveTransaction from "./node/lib/transaction.js";
import fs from "fs";

// Initialize a gateway connection
const arweave = Arweave.init({
  host: "arweave.net",
  port: 443,
  protocol: "https",
});

// The data that you paid for but is missing in the network
let missingData = fs.readFileSync("./myfile.mov");

// Get the tx headers from arweave.net/tx/{txid}
let txHeaders = require("./txheaders.json");

(async () => {
  const tx = new ArweaveTransaction.default(txHeaders);
  let uploader = await arweave.transactions.getUploader(tx, missingData);
  while (!uploader.isComplete) {
    await uploader.uploadChunk();
  }
})();
```

There is also an async iterator interface to chunk uploading, but this method means you'll need to ensure you are using a transpiler and polyfill for the asyncIterator symbol for some environments (Safari on iOS in particular). This method takes the same arguments for uploading/resuming a transaction as `getUploader()` and just has a slightly shorter syntax:

```js
for await (const uploader of arweave.transactions.upload(tx)) {
  console.log(`${uploader.pctComplete}% Complete`);
}
// done.
```

### Streaming uploads

@irys/arweave includes (for NodeJS) a modified version of [arweave-stream-tx](https://github.com/Bundlr-Network/arweave-stream-tx) to allow for the 
efficient uploading of transactions of arbitrary size.

```ts
import { pipeline } from "stream/promises";

const arweave = new Arweave(...)

const tx = await pipeline(createReadStream("./<path-to-file>"), createTransactionAsync({}))

await arweave.transactions.sign(tx)

await pipeline(createReadStream("./<path-to-file>"), uploadTransactionAsync(tx, arweave))

```


#### Getting transaction status

> Just like other blockchains (including Bitcoin and Ethereum), you should always ensure that your transaction has received enough block confirmations before you assume that the transaction has been fully accepted by the network.
> We strongly advise that you check the status and number of confirmations for a given txid before using it, even if you have received a ‘200’ status response.
```js
arweave.transactions.getStatus("bNbA3TEQVL60xlgCcqdz4ZPHFZ711cZ3hmkpGttDt_U").then((res) => {
  console.log(res);
  // {
  //  status: 200,
  //  confirmed: {
  //    block_height: 140151,
  //    block_indep_hash: 'OR1wue3oBSg3XWvH0GBlauAtAjBICVs2F_8YLYQ3aoAR7q6_3fFeuBOw7d-JTEdR',
  //    number_of_confirmations: 20
  //  }
  //}
});

```

#### Getting a transaction

Unlike `arweave-js` the returned data and tags are automatically decoded from base64.

>Due to how the API has evolved over time and with larger transaction support, the `data` field is no longer _guaranteed_ to be returned from the network as part of the transaction json, therefore, it is not recommended that you use this function for fetching data. You should use [`arweave.transactions.getData()`](#get-transaction-data) instead, as it will handle small transactions, as well as the reassembling of chunks for larger ones while benefiting from gateway optimisations.*

```js
const transaction = arweave.transactions.get("hKMMPNh_emBf8v_at1tFzNYACisyMQNcKzeeE1QE9p8").then((transaction) => {
  console.log(transaction);
  // Transaction {
  //   'format': 1,
  //   'id': 'hKMMPNh_emBf8v_at1tFzNYACisyMQNcKzeeE1QE9p8',
  //   'last_tx': 'GW7p6NoGJ495tAoUjU5GLxIH52gqOgk5j78gQv3j0ebvldAlw6VgIUv_lrMNGI72',
  //   'owner': 'warLaSbicZm1nx9ucf-_5i91CWgmNOcnFJfyJdloCtsbenBhLrcGH472kKTZyuEAp2lSKlZ0NFCT2r2z-0...',
  //   'tags': [
  //     {
  //       'name': 'QXBwLU5hbWU',
  //       'value': 'd2VpYm90LXNlYXJjaC13ZWlicw'
  //     }
  //   ],
  //   'target': ',
  //   'quantity': '0',
  //   'data': 'iVBORw0KGgoAAAANSUhEUgAAArIAAADGCAYAAAAuVWN-AAAACXBIWXMAAAsSAAA...'
  //   'data_size': '36795',
  //   'data_tree': [],
  //   'data_root': ',
  //   'reward': '93077980',
  //   'signature': 'RpohCHVl5vzGlG4R5ybeEuhs556Jv7rWOGaZCT69cpIei_j9b9sAetBlr0...'
  // }
});

```

#### Getting transaction data

You can get the transaction data from a transaction ID without having to get the entire transaction

```js
// Get the base64url encoded string
arweave.transactions.getData("bNbA3TEQVL60xlgCcqdz4ZPHFZ711cZ3hmkpGttDt_U").then((data) => {
  console.log(data);
  // CjwhRE9DVFlQRSBodG1sPgo...
});

// Get the data decoded to a Uint8Array for binary data
arweave.transactions.getData("bNbA3TEQVL60xlgCcqdz4ZPHFZ711cZ3hmkpGttDt_U", { decode: true }).then((data) => {
  console.log(data);
  // Uint8Array [10, 60, 33, 68, ...]
});

// Get the data decode as string data
arweave.transactions.getData("bNbA3TEQVL60xlgCcqdz4ZPHFZ711cZ3hmkpGttDt_U", { decode: true, string: true }).then((data) => {
  console.log(data);
  // <!DOCTYPE HTML>...
});
```

#### Getting tags from transactions

Unlike `arweave-js`, tags are automatically decoded:

```js
const transaction = arweave.transactions.get("bNbA3TEQVL60xlgCcqdz4ZPHFZ711cZ3hmkpGttDt_U").then((transaction) => {
  transaction["tags"].forEach(({ name, value }) => {
    console.log(`${name} : ${value}`);
  });
  // Content-Type : text/html
  // User-Agent : ArweaveDeploy/1.1.0
});
```

### Blocks

Blocks are base elements of Arweave's blockweave data structure.
Each block is linked to two prior blocks: the previous block in the "chain" (as with traditional blockchain
protocols), and a block from the previous history of the blockchain (the "recall block"). Each block contains
a list of zero to many transactions.


#### Getting a block by indep_hash
Gets block data for given independent hash. 

```js
const result = await arweave.blocks.getByHash("zbUPQFA4ybnd8h99KI9Iqh4mogXJibr0syEwuJPrFHhOhld7XBMOUDeXfsIGvYDp");
console.log(result);
// {
//   "nonce": "6jdzO4FzS4EVaQVcLBEmxm6uN5-1tqBXW24Pzp6JsRQ",
//   "previous_block": "iNgEv6vf9nIrxLWeEu-vPNHFftEh0kfOnx0qd6NKUOc8Z3WeMeOmAmdOHwSUFAGn",
//   "timestamp": 1624183433,
//   "last_retarget": 1624183433,
//   "diff": "115792089220940710686296942055695413965527953310049630981189590430430626054144",
//   "height": 711150,
//   "hash": "_____8V8BkM8Cyja5ZFJcc7HfX33eM4BKDAvcEBn22s",
//   "indep_hash": "zbUPQFA4ybnd8h99KI9Iqh4mogXJibr0syEwuJPrFHhOhld7XBMOUDeXfsIGvYDp",
//   "txs": [ ...
```

#### Getting block by height

```js
const result = await arweave.blocks.getByHeight(711150);
console.log(result);
// {
//   "nonce": "6jdzO4FzS4EVaQVcLBEmxm6uN5-1tqBXW24Pzp6JsRQ",
//   "previous_block": "iNgEv6vf9nIrxLWeEu-vPNHFftEh0kfOnx0qd6NKUOc8Z3WeMeOmAmdOHwSUFAGn",
//   "timestamp": 1624183433,
//   "last_retarget": 1624183433,
//   "diff": "115792089220940710686296942055695413965527953310049630981189590430430626054144",
//   "height": 711150,
//   "hash": "_____8V8BkM8Cyja5ZFJcc7HfX33eM4BKDAvcEBn22s",
//   "indep_hash": "zbUPQFA4ybnd8h99KI9Iqh4mogXJibr0syEwuJPrFHhOhld7XBMOUDeXfsIGvYDp",
//   "txs": [ ...
```


#### Getting current block
Gets a block data for current block, i.e., block with indep_hash:
```js
const { current } = await arweave.network.getInfo();
```

```js
const result = await arweave.blocks.getCurrent();
console.log(result);
// {
//   "indep_hash": "qoJwHSpzl6Ouo140HW2DTv1rGOrgfBEnHi5sHv-fJt_TsK7xA70F2QbjMCopLiMd",
//   ...
```

### GraphQL 

GraphQL (GQL) provides flexible querying and allows you to search for transactions by tags, wallet address, block height, and more. 

Please see the [GQL Guide](https://gql-guide.vercel.app/) for further details.


### License

This software is released under MIT license. See [LICENSE.md](./LICENSE.md) for full license details.