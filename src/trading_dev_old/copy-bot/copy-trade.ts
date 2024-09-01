
// use two cores to run the two functions
// 1. copy_sell
// 2. copy_buy
import { fork } from 'child_process';
import path from 'path';
const copySellPath = path.join(__dirname, 'copy-sell.js');
const copyBuyPath = path.join(__dirname, 'copy-buy.js');
// Run copy_sell in a separate process
const copySellingProcess = fork(copySellPath);

// Run copy_buy in a separate process
const copyBuyingProcess = fork(copyBuyPath);

copyBuyingProcess.on('exit', (code) => {
    console.log('copy_buy process exited with code:', code);
  });
// Handle the exit event for each child process
copySellingProcess.on('exit', (code) => {
    console.log('copy_sell process exited with code:', code);
  });
  