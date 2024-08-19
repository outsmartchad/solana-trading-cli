const stateless = require("@lightprotocol/stateless.js");
const connection = stateless.createRpc(
  "https://zk-testnet.helius.dev:8899", // rpc
  "https://zk-testnet.helius.dev:8784", // zk compression rpc
  "https://zk-testnet.helius.dev:3001" // prover
);

/**
 * Main function that retrieves various information from the Solana network.
 * @returns {Promise<void>} A promise that resolves when the function completes.
 */
async function main() {
  let slot = await connection.getSlot();
  console.log("Slot: ", slot);

  let health = await connection.getIndexerHealth(slot);
  console.log("health: ", health);

  let leaderSchedule = await connection.getLeaderSchedule();
  console.log("Current leader schedule: ", leaderSchedule);

  let latestNonVotingSig = await connection.getLatestNonVotingSignatures(); 
  console.log(latestNonVotingSig);
}
main();
