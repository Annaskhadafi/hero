const { spawn } = require("child_process");

const child = spawn("npx.cmd", ["drizzle-kit", "push"], {
  cwd: "d:\\[01] PROJECT\\HERO",
  shell: true,
});

child.stdout.on("data", (data) => {
  const output = data.toString();
  process.stdout.write(output);
  if (output.includes("Is") || output.includes("create column") || output.includes("rename column")) {
    console.log("Found prompt, sending ENTER");
    child.stdin.write("\n");
  }
});

child.stderr.on("data", (data) => {
  process.stderr.write(data.toString());
});

child.on("close", (code) => {
  console.log(`Process exited with code ${code}`);
  process.exit(code);
});
