const { spawn } = require('child_process');

const p = spawn('npx.cmd', ['drizzle-kit', 'push', '--config=drizzle.config.ts'], {
  stdio: ['pipe', 'pipe', 'pipe'],
  shell: true,
  cwd: process.cwd()
});

p.stdout.on('data', (data) => {
  process.stdout.write(data);
  const output = data.toString();
  
  if (output.includes('Yes, truncate the table')) {
    // Send Down Arrow + Enter
    p.stdin.write('\x1B[B\r');
  }
});

p.stderr.on('data', (data) => {
  process.stderr.write(data);
});

p.on('close', (code) => {
  process.exit(code);
});
