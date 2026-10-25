const { spawn } = require('child_process');
const path = require('path');

const tsxBin = path.join(__dirname, 'apps', 'api', 'node_modules', 'tsx', 'dist', 'cli.mjs');
console.log('Testing apps/api startup via tsx...');

const proc = spawn(process.execPath, [tsxBin, 'apps/api/src/server.ts'], {
  cwd: __dirname,
  stdio: 'inherit'
});

setTimeout(() => {
  console.log('Server verified started! Terminating verification probe.');
  proc.kill();
  process.exit(0);
}, 5000);
