import { execSync } from 'child_process';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoPath = dirname(__dirname); // d:/[01] PROJECT/HERO

try {
  // Use GIT_DIR and GIT_WORK_TREE to bypass the path parser bug
  const env = { ...process.env, GIT_DIR: repoPath + '/.git', GIT_WORK_TREE: repoPath };
  
  console.log(execSync('git add .', { env, cwd: repoPath }).toString());
  console.log(execSync('git commit -m "feat(lms): update certificate layout and permissions"', { env, cwd: repoPath }).toString());
  console.log(execSync('git push', { env, cwd: repoPath }).toString());
} catch (e) {
  console.error('Error stdout:', e.stdout ? e.stdout.toString() : '');
  console.error('Error stderr:', e.stderr ? e.stderr.toString() : '');
}
