import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync("lib/raray-vision/client.ts", "utf8");

assert.match(source, /const recognized = isMatch/);
assert.match(source, /const verified = isMatch/);
assert.doesNotMatch(source, /\|\| similarity >= 0\.48/);
