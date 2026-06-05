import { spawn } from "child_process";

const args = process.argv.slice(2);
const p = spawn(process.platform === "win32" ? "npx.cmd" : "npx", ["drizzle-kit", "push", ...args], {
  stdio: ["pipe", "pipe", "inherit"],
  env: {
    ...process.env,
    FORCE_COLOR: "1",
  },
});

p.stdout.on("data", (data: Buffer) => {
  process.stdout.write(data);
  const output = data.toString();
  
  // Deteksi prompt dari Drizzle Kit yang menanyakan data loss / truncate
  if (
    output.includes("Yes, truncate the table") ||
    output.includes("No, add the constraint without truncating the table") ||
    output.includes("You are about to add a not-null constraint")
  ) {
    // Kirim Arrow Down (\x1B[B) lalu Enter (\r)
    p.stdin.write("\x1B[B\r");
  }
});

p.on("close", (code) => {
  process.exit(code ?? 0);
});
