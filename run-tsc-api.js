const { spawn } = require('child_process');
const path = require('path');

const tscBin = path.join(__dirname, 'node_modules', 'typescript', 'bin', 'tsc');
console.log('Running tsc for apps/api...');

const proc = spawn(process.execPath, [tscBin, '-p', 'apps/api/tsconfig.json', '--noEmit'], {
  cwd: __dirname,
  stdio: 'inherit'
});

proc.on('close', (code) => {
  console.log('TypeScript check exited with code:', code);
  process.exit(code);
});
