import fs from 'fs/promises';
import path from 'path';
import {fetchAMMPoolId} from "../../../../raydium/Pool/fetch_pool";   
const tokens_path = path.join(__dirname, "tokens.txt");
export async function fetchPoolsFromTokens(){
    let res:string[] = [];
    const fileContent = await fs.readFile(tokens_path, 'utf8');
  
    // Split the file content into an array of addresses
    const tokensList = fileContent.trim().split('\n');
    for(const token of tokensList){
        if(token==="") continue;
        const pool = await fetchAMMPoolId(token);
        res.push(pool);
    }
    return res;
}


