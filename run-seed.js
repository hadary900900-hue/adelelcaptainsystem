const { spawn } = require('child_process');
const path = require('path');

const tsxBin = path.join(__dirname, 'apps', 'api', 'node_modules', 'tsx', 'dist', 'cli.mjs');
console.log('Running seed via tsx:', tsxBin);

const proc = spawn(process.execPath, [tsxBin, 'packages/database/src/seed.ts'], {
  cwd: __dirname,
  stdio: 'inherit'
});

proc.on('close', (code) => {
  console.log('Seed exited with code:', code);
  process.exit(code);
});
