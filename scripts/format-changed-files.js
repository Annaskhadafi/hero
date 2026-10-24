const { execFileSync, spawnSync } = require('node:child_process')
const fs = require('node:fs')
const path = require('node:path')

const root = execFileSync('git', ['rev-parse', '--show-toplevel'], {
  encoding: 'utf8',
}).trim()
const supportedExtensions = new Set(['.js', '.jsx', '.ts', '.tsx', '.json', '.css', '.md'])
const ignoredPrefixes = ['.agents/', '.e2e/', 'output/']
const changedFiles = new Set()

function gitLines(args) {
  return execFileSync('git', args, {
    cwd: root,
    encoding: 'utf8',
    maxBuffer: 10 * 1024 * 1024,
  })
    .split(/\r?\n/)
    .map((file) => file.trim().replaceAll('\\', '/'))
    .filter(Boolean)
}

const baseRef =
  process.env.FORMAT_CHECK_BASE_REF ||
  (process.env.GITHUB_BASE_REF ? `origin/${process.env.GITHUB_BASE_REF}` : null)

if (baseRef) {
  try {
    for (const file of gitLines([
      'diff',
      '--name-only',
      '--diff-filter=ACMR',
      `${baseRef}...HEAD`,
    ])) {
      changedFiles.add(file)
    }
  } catch {
    console.error(`Could not compare formatting changes with base ref "${baseRef}".`)
    console.error('Fetch the base branch or set FORMAT_CHECK_BASE_REF to an available ref.')
    process.exit(2)
  }
}

for (const file of gitLines(['diff', '--name-only', '--diff-filter=ACMR', 'HEAD'])) {
  changedFiles.add(file)
}
for (const file of gitLines(['ls-files', '--others', '--exclude-standard'])) {
  changedFiles.add(file)
}

const files = [...changedFiles]
  .filter((file) => supportedExtensions.has(path.posix.extname(file).toLowerCase()))
  .filter((file) => !ignoredPrefixes.some((prefix) => file.startsWith(prefix)))
  // Keep repository instruction files untouched; they are not application source.
  .filter((file) => file !== 'AGENTS.md')
  .filter((file) => fs.existsSync(path.join(root, file)))
  .sort()

if (files.length === 0) {
  console.log('No changed source/documentation files to format-check.')
  process.exit(0)
}

console.log(`Checking formatting for ${files.length} changed file(s).`)
const prettierCli = require.resolve('prettier/bin/prettier.cjs')
const result = spawnSync(process.execPath, [prettierCli, '--check', ...files], {
  cwd: root,
  stdio: 'inherit',
})

if (result.error) {
  console.error(`Unable to run Prettier: ${result.error.message}`)
  process.exit(2)
}
process.exit(result.status ?? 1)
