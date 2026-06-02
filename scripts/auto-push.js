const { spawn } = require('child_process');

const child = spawn('npx', ['drizzle-kit', 'push'], {
  stdio: ['pipe', 'inherit', 'inherit'],
  shell: true
});

child.stdin.write('\n'); // Send Enter key for the first prompt
child.stdin.write('\n'); // Send Enter key just in case

// Keep sending enter every 2 seconds if it's still waiting
const interval = setInterval(() => {
  try {
    child.stdin.write('\n');
  } catch (e) {}
}, 2000);

child.on('close', (code) => {
  clearInterval(interval);
  console.log(`db:push exited with code ${code}`);
  process.exit(code);
});
