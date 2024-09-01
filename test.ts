import { spawn } from 'child_process';
import path from "path";
import { logger } from './src/utils';
const config_path = path.join(__dirname, 'src/helpers/config.ts');
const wrap_sol_path = path.join(__dirname, 'src/helpers/wrap_sol.ts');
const unwrap_sol_path = path.join(__dirname, 'src/helpers/unwrap_sol.ts');   
const meteora_buy_path = path.join(__dirname, 'src/meteora/buy.ts');
const meteora_sell_path = path.join(__dirname, 'src/meteora/sell.ts');
const orca_buy_path = path.join(__dirname, 'src/orca/buy.ts');
const orca_sell_path = path.join(__dirname, 'src/orca/sell.ts');
const raydium_buy_path = path.join(__dirname, 'src/raydium/buy.ts');
const raydium_sell_path = path.join(__dirname, 'src/raydium/sell.ts');
const pumpfun_buy_path = path.join(__dirname, 'src/pumpfunsdk/pumpdotfun-sdk/src/buy.ts');
const pumpfun_sell_path = path.join(__dirname, 'src/pumpfunsdk/pumpdotfun-sdk/src/sell.ts');
const pumpfun_createAndBuy_path = path.join(__dirname, 'src/pumpfunsdk/pumpdotfun-sdk/src/createAndBuy.ts');
const boost_volume_path = path.join(__dirname, 'src/memecoin_dev/market-making_dev/boost_volume.ts');
const create_token_path = path.join(__dirname, 'src/token/create.ts');
const burn_token_path = path.join(__dirname, 'src/token/burn.ts');
const copy_trade_path = path.join(__dirname, 'src/grpc_streaming_dev/grpc-copy-bot/src/streaming/copy-trade.ts');
const pumpfun_sniper_path = path.join(__dirname, 'src/grpc_streaming_dev/grpc-pf-sniper/src/streaming/snipe-create.ts');
async function runSHScript(scriptPath: string) {
    return new Promise((resolve, reject) => {
        const child = spawn('ts-node', [scriptPath, " -h"], {
            stdio: 'inherit',
            shell: true,
        });
      
        child.on('close', (code) => {
            //console.log(`Child process for ${scriptPath} exited with code ${code}`);
            resolve(code); // Resolve the promise when the process exits
        });
      
        child.on('error', (err) => {
            //console.error(`Error running ${scriptPath}:`, err);
            reject(err); // Reject the promise on error
        });
    });
  }
/**
 * please run this before using the cli
 */

async function test(){
    logger.info("Testing helper scripts...");
    await runSHScript(config_path);
    await runSHScript(wrap_sol_path);
    await runSHScript(unwrap_sol_path);
    logger.info("Testing Meteora scripts...");
    await runSHScript(meteora_buy_path);
    await runSHScript(meteora_sell_path);
    logger.info("Testing Orca scripts...");
    await runSHScript(orca_buy_path);
    await runSHScript(orca_sell_path);
    logger.info("Testing Raydium scripts...");
    await runSHScript(raydium_buy_path);
    await runSHScript(raydium_sell_path);
    logger.info("Testing Pumpfun scripts...");
    await runSHScript(pumpfun_buy_path);
    await runSHScript(pumpfun_sell_path);
    await runSHScript(pumpfun_createAndBuy_path); 
    logger.info("Testing Memecoin scripts...");
    await runSHScript(boost_volume_path);
    await runSHScript(create_token_path);
    await runSHScript(burn_token_path);
    logger.info("Testing grpc Streaming scripts...");
    await runSHScript(copy_trade_path);
    await runSHScript(pumpfun_sniper_path);

    logger.info("All tests passed!");
}
test();