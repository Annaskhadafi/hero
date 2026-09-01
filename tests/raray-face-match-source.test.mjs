import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync("lib/raray-vision/client.ts", "utf8");
const faceLoginSource = readFileSync("app/api/auth/face-login/route.ts", "utf8");
const attendanceSource = readFileSync("app/api/mobile/v2/face-recognition/route.ts", "utf8");

assert.match(source, /const recognized = isMatch/);
assert.match(source, /const verified = isMatch/);
assert.doesNotMatch(source, /\|\| similarity >= 0\.48/);
assert.match(faceLoginSource, /verifyRes\.status === "success" && verifyRes\.verified/);
assert.doesNotMatch(faceLoginSource, /local-1:1|Local embedding|cosineSimilarity/);
assert.match(attendanceSource, /if \(!rvResult\.verified\)/);
assert.doesNotMatch(attendanceSource, /CONFIDENCE_THRESHOLD/);
