const { spawn } = require('child_process');
const path = require('path');

const prismaBin = path.join(__dirname, 'node_modules', '.pnpm', 'prisma@6.19.3_typescript@5.9.3', 'node_modules', 'prisma', 'build', 'index.js');
console.log('Using prisma binary:', prismaBin);

const proc = spawn(process.execPath, [prismaBin, 'db', 'push', '--schema', 'packages/database/prisma/schema.prisma', '--accept-data-loss'], {
  cwd: __dirname,
  stdio: 'inherit'
});

proc.on('close', (code) => {
  console.log('Prisma db push exited with code:', code);
  process.exit(code);
});
