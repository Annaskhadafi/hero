import { spawn } from "child_process";

const args = process.argv.slice(2);
const p = spawn(process.platform === "win32" ? "npx.cmd" : "npx", ["drizzle-kit", "push", ...args], {
  stdio: ["pipe", "pipe", "inherit"],
  shell: true,
  env: {
    ...process.env,
    FORCE_COLOR: "1",
  },
});

p.stdout.on("data", (data: Buffer) => {
  process.stdout.write(data);
  const output = data.toString();

  const createColumnPrompt = output.includes("create column") && output.includes("rename column");
  const createTablePrompt = output.includes("table created or renamed from another table");

  if (createColumnPrompt || createTablePrompt) {
    // Default already "create table" or "create column", just press Enter
    p.stdin.write("\r");
    return;
  }

  const safePromptWithDefaultNo =
    output.includes("No, add the constraint without truncating the table") ||
    output.includes("You are about to add a not-null constraint");

  if (safePromptWithDefaultNo) {
    // "No" is already selected by default, just Enter to confirm
    p.stdin.write("\r");
    return;
  }

  const abortPrompt = output.includes("No, abort");

  if (abortPrompt) {
    // "No, abort" is default — just press Enter to abort
    p.stdin.write("\r");
    return;
  }

  const destructivePromptDetected =
    output.includes("data loss") ||
    output.includes("drop the table") ||
    output.includes("drop column") ||
    output.includes("truncate the table");

  if (destructivePromptDetected) {
    console.error("\n[db:push] Dihentikan demi keamanan. Ada prompt destruktif yang tidak dikenali aman.");
    p.kill("SIGTERM");
    process.exitCode = 1;
  }
});

p.on("close", (code) => {
  process.exit(code ?? 0);
});
