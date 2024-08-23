import stateless from "@lightprotocol/stateless.js";
const newConnection:any = stateless.createRpc(
  "https://zk-testnet.helius.dev:8899", // rpc
  "https://zk-testnet.helius.dev:8784", // zk compression rpc
  "https://zk-testnet.helius.dev:3001" // prover
);

/**
 * Main function that retrieves various information from the Solana network.
 * @returns {Promise<void>} A promise that resolves when the function completes.
 */
export async function main() {
  let slot = await newConnection.getSlot();
  console.log("Slot: ", slot);

  let health = await newConnection.getIndexerHealth(slot);
  console.log("health: ", health);

  let leaderSchedule = await newConnection.getLeaderSchedule();
  console.log("Current leader schedule: ", leaderSchedule);

  let latestNonVotingSig = await newConnection.getLatestNonVotingSignatures(); 
  console.log(latestNonVotingSig);
}
main();
