const { Connection } = require("@solana/web3.js");
const dev_endpoint = "<YOUR_DEVNET_API_ENDPOINT>";
const main_endpoint = "<YOUR_MAINNET_API_ENDPOINT>";
const connection = new Connection(main_endpoint);
const dev_connection = new Connection(dev_endpoint, "confirmed");

module.exports = { connection, dev_connection, dev_endpoint, main_endpoint };
