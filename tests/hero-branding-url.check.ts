import assert from "node:assert/strict";
import test from "node:test";
import { resolveUploadUrl } from "../lib/resolve-upload-url";

test("bundled HERO assets retain their public URL while uploads use the proxy", () => {
  for (const path of [
    "/Hero%20Logo/bg%20hero.png",
    "/Hero Logo/hero landscape.png",
    "/logo-hero.png?v=hero-cat-20261012",
    "/icon-192.png?v=hero-cat-20261012",
    "/icon-512.png",
    "/icon-maskable-512.png",
    "/apple-touch-icon.png",
    "/favicon-16x16.png",
    "/favicon-32x32.png",
  ]) {
    assert.equal(resolveUploadUrl(path), path);
  }
  assert.equal(resolveUploadUrl("/activity-photos/evidence.png?X-Amz-Signature=expired"), "/api/uploads/activity-photos/evidence.png");
  assert.equal(resolveUploadUrl("evidence.png"), "/api/uploads/activity-photos/evidence.png");
  assert.equal(resolveUploadUrl("/dashboard/daily-activity/evidence.png"), "/api/uploads/activity-photos/evidence.png");
});
