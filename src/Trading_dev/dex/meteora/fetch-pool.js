async function fetchDLMMPoolId(tokenAddress) {
  const url = `https://dlmm-api.meteora.ag/pair/all_by_groups?sort_key=tvl&order_by=desc&search_term=${tokenAddress}&include_unknown=false`;
  const response = await (await fetch(url)).json();
  // check if the string start with "SOL" or end with "SOL"

  const listOfGroups = response.groups;
    for (const group of listOfGroups) {
        const name = group.name;
        if(name.startsWith("SOL") || name.endsWith("SOL")){
            return group.pairs[0].address;
        }
    }
  console.log("No DLMM Pool ID found for the given token address: ", tokenAddress);
  return ""; // return empty string if no DLMMPool ID is found
}

async function main() {
  const tokenAddress = "7GCihgDB8fe6KNjn2MYtkzZcRjQy3t9GHdC8uHYmW2hr";
  const poolId = await fetchDLMMPoolId(tokenAddress);
  console.log(poolId);
}

//main();

module.exports = { fetchDLMMPoolId };