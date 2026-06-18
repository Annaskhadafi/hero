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

  const handledSafePrompt =
    output.includes("Yes, truncate the table") ||
    output.includes("No, add the constraint without truncating the table") ||
    output.includes("You are about to add a not-null constraint");

  if (handledSafePrompt) {
    // Kirim Arrow Down (\x1B[B) lalu Enter (\r)
    p.stdin.write("\x1B[B\r");
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
