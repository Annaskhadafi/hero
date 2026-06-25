import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

const projectRoot = process.cwd();

function read(relativePath) {
  return readFileSync(path.join(projectRoot, relativePath), "utf8");
}

test("generic upload proxy stays authenticated and prefix scoped", () => {
  const source = read("app/api/uploads/[...path]/route.ts");

  assert.match(source, /getServerSession/);
  assert.match(source, /session\?\.user\?\.email/);
  assert.match(source, /ALLOWED_UPLOAD_PREFIXES/);
  assert.match(source, /"attendance-photos"/);
  assert.match(source, /"profile-photos"/);
  assert.match(source, /"upload"/);
  assert.match(source, /isAllowedUploadPath\(path\)/);
  assert.match(source, /Cache-Control": "private, max-age=300"/);
  assert.doesNotMatch(source, /`upload\/\$\{relativePath\}`/);
});

test("upload server actions require a session", () => {
  const source = read("app/actions/upload.ts");

  assert.match(source, /async function requireUploadSession/);
  assert.match(source, /session\?\.user\?\.email/);
  assert.match(source, /uploadFile\(formData: FormData\)[\s\S]*requireUploadSession/);
  assert.match(source, /uploadImageFromUrl\(imageUrl: string\)[\s\S]*requireUploadSession/);
  assert.match(source, /uploadCurhatAttachment\(formData: FormData\)[\s\S]*requireUploadSession/);
});
