import assert from "node:assert/strict";
import fs from "node:fs";
import sharp from "sharp";

const root = new URL("../", import.meta.url);
const read = (path) => fs.readFileSync(new URL(path, root));
const pngSize = (buffer) => ({
  width: buffer.readUInt32BE(16),
  height: buffer.readUInt32BE(20),
});

assert.deepEqual(pngSize(read("public/icon-192.png")), { width: 192, height: 192 });
assert.deepEqual(pngSize(read("public/icon-512.png")), { width: 512, height: 512 });
assert.deepEqual(pngSize(read("public/icon-maskable-512.png")), { width: 512, height: 512 });
assert.deepEqual(pngSize(read("public/favicon-32x32.png")), { width: 32, height: 32 });
assert.equal(read("app/favicon.ico").readUInt16LE(2), 1);

const maskable = await sharp(read("public/icon-maskable-512.png")).raw().toBuffer({ resolveWithObject: true });
assert.equal(maskable.info.channels, 3, "Maskable icon must have an opaque background");
for (let y = 0; y < 512; y++) {
  for (let x = 0; x < 512; x++) {
    const offset = (y * 512 + x) * 3;
    if (Math.min(...maskable.data.subarray(offset, offset + 3)) < 240) {
      assert.ok(Math.hypot(x - 256, y - 256) <= 204.8, "Brand mark must fit inside the maskable safe circle");
    }
  }
}

const metadata = fs.readFileSync(new URL("../app/layout.tsx", import.meta.url), "utf8");
assert.match(metadata, /hero-cat-20261012/);
assert.match(metadata, /favicon-16x16\.png/);
assert.match(metadata, /favicon-32x32\.png/);

console.log("HERO branding assets and metadata verified");
