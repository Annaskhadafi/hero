import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

const projectRoot = process.cwd();

function read(relativePath) {
  return readFileSync(path.join(projectRoot, relativePath), "utf8");
}

test("mobile shell hides unauthorized links and shows access notice", () => {
  const shellSource = read("components/mobile/mobile-app-shell.tsx");
  const servicesSource = read("components/mobile/mobile-dashboard-services.tsx");
  const layoutSource = read("app/mobile/layout.tsx");

  assert.match(layoutSource, /buildMobileAllowedLinks/);
  assert.match(shellSource, /isMobileHrefAllowed\(item\.href, allowedLinks\)/);
  assert.match(shellSource, /Anda tidak memiliki akses/);
  assert.match(servicesSource, /visibleServices = mainServices\.filter\(isServiceAllowed\)/);
  assert.match(servicesSource, /allowedResources\.has\(service\.resource\)/);
});

