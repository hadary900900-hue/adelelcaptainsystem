const { spawn } = require('child_process');
const path = require('path');

const viteBin = path.join(__dirname, 'apps', 'web', 'node_modules', 'vite', 'bin', 'vite.js');
console.log('Building web app via vite:', viteBin);

const proc = spawn(process.execPath, [viteBin, 'build', 'apps/web'], {
  cwd: __dirname,
  stdio: 'inherit'
});

proc.on('close', (code) => {
  console.log('Vite build exited with code:', code);
  process.exit(code);
});
