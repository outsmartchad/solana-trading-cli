
// use two cores to run the two functions
// 1. copy_sell
// 2. copy_buy
const { fork } = require('child_process');

// Run copy_sell in a separate process
const copySellingProcess = fork('C:\\Users\\User\\Desktop\\solana-memecoin-cli\\src\\Trading\\memecoin_trading_strategies\\copy_trading\\copy-sell.js');

// Run copy_buy in a separate process
const copyBuyingProcess = fork('C:\\Users\\User\\Desktop\\solana-memecoin-cli\\src\\Trading\\memecoin_trading_strategies\\copy_trading\\copy-buy.js');

copyBuyingProcess.on('exit', (code) => {
    console.log('copy_buy process exited with code:', code);
  });
// Handle the exit event for each child process
copySellingProcess.on('exit', (code) => {
    console.log('copy_sell process exited with code:', code);
  });
  