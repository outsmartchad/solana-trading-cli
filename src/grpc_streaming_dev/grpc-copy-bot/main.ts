import { spawn } from 'child_process';
import path from 'path';

const scriptPath = path.join(__dirname, 'command.sh');

function runScript() {
  const child = spawn('sh', [scriptPath], {
    stdio: 'inherit',
    shell: true,
  });

  child.on('close', (code) => {
    console.log(`child process exited with code ${code}`);
    console.error('copy-trade.ts script closed or encountered an error, restarting...');
    runScript();
    
  });

  child.on('error', (err) => {
    console.error('Error running script.sh:', err);
    runScript();
  });
}
runScript();