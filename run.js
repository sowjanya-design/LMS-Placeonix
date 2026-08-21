const { spawn } = require('child_process');

const service = process.env.SERVICE_TYPE || 'backend';

console.log(`[Router] Starting service: ${service}`);

let cmd, args;

if (service === 'frontend') {
  cmd = 'npm';
  args = ['--prefix', 'frontend', 'start'];
} else {
  cmd = 'npm';
  args = ['--prefix', 'backend', 'start'];
}

const child = spawn(cmd, args, { stdio: 'inherit', shell: true });

child.on('error', (err) => {
  console.error(`[Router] Failed to start subprocess: ${err}`);
  process.exit(1);
});

child.on('exit', (code, signal) => {
  console.log(`[Router] Subprocess exited with code ${code} and signal ${signal}`);
  process.exit(code || 0);
});
