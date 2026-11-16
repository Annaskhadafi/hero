import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import {
  HERO_PRODUCTION_APP_URL,
  getEmailAppUrl,
  getPublicAppUrl,
  getServerAuthBaseUrl,
  isLocalAppOrigin,
  replaceLocalAppUrlsForEmail,
} from "../lib/auth-config.ts";
import { EMAIL_TEMPLATE_PRESETS } from "../lib/email-template-presets.ts";

test("isLocalAppOrigin identifies localhost and loopback URLs only", () => {
  assert.equal(isLocalAppOrigin("http://localhost:3000"), true);
  assert.equal(isLocalAppOrigin("http://127.0.0.1:3000/dashboard"), true);
  assert.equal(isLocalAppOrigin("https://0.0.0.0:3000"), true);
  assert.equal(isLocalAppOrigin("https://hero.chitraparatama.com"), false);
  assert.equal(isLocalAppOrigin("https://hero.chitraparatama.com/dashboard/approval"), false);
});

test("email URL helpers ignore localhost env vars and always use hero.chitraparatama.com", () => {
  const prevEnv = {
    EMAIL_APP_URL: process.env.EMAIL_APP_URL,
    PUBLIC_APP_URL: process.env.PUBLIC_APP_URL,
    BETTER_AUTH_URL: process.env.BETTER_AUTH_URL,
    NEXT_PUBLIC_BETTER_AUTH_URL: process.env.NEXT_PUBLIC_BETTER_AUTH_URL,
    APP_URL: process.env.APP_URL,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  };

  try {
    delete process.env.EMAIL_APP_URL;
    delete process.env.PUBLIC_APP_URL;
    process.env.BETTER_AUTH_URL = "http://localhost:3000";
    process.env.NEXT_PUBLIC_BETTER_AUTH_URL = "http://localhost:3000";
    process.env.APP_URL = "http://127.0.0.1:3000";
    process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";

    assert.equal(getEmailAppUrl(), HERO_PRODUCTION_APP_URL);
    assert.equal(
      getEmailAppUrl("/dashboard/approval"),
      "https://hero.chitraparatama.com/dashboard/approval",
    );
    assert.equal(getPublicAppUrl(), HERO_PRODUCTION_APP_URL);
    // Auth server URL may keep localhost in local dev while email links stay on production domain
    assert.equal(getServerAuthBaseUrl(), "http://localhost:3000");
  } finally {
    Object.assign(process.env, prevEnv);
    for (const [k, v] of Object.entries(prevEnv)) {
      if (v === undefined) delete process.env[k];
    }
  }
});

test("replaceLocalAppUrlsForEmail rewrites localhost:3000 and 127.0.0.1:3000 links in email bodies", () => {
  const html =
    '<a href="http://localhost:3000/dashboard/approval">Open</a> <a href="http://127.0.0.1:3000/review/ptw/abc">PTW</a>';
  const rewritten = replaceLocalAppUrlsForEmail(html);
  assert.equal(
    rewritten,
    '<a href="https://hero.chitraparatama.com/dashboard/approval">Open</a> <a href="https://hero.chitraparatama.com/review/ptw/abc">PTW</a>',
  );
  assert.equal(rewritten.includes("localhost"), false);
  assert.equal(rewritten.includes("127.0.0.1"), false);
});

test("email template presets and email sender sources contain no localhost:3000 URLs", () => {
  for (const preset of EMAIL_TEMPLATE_PRESETS) {
    const serialized = JSON.stringify(preset);
    assert.equal(
      /localhost:3000|127\.0\.0\.1:3000/i.test(serialized),
      false,
      `Preset ${preset.templateCode} still contains localhost`,
    );
  }

  const emailFiles = [
    "lib/summary-email.ts",
    "lib/workflow-email.ts",
    "lib/email-delivery.ts",
    "lib/auth-email.ts",
    "app/actions/rfr.ts",
    "app/actions/contract-review.ts",
    "app/actions/contract-review-tests.ts",
    "app/actions/leader-performance.ts",
    "app/actions/interviews.ts",
    "app/actions/recruitment.ts",
    "app/actions/training-requests.ts",
  ];

  for (const rel of emailFiles) {
    const content = fs.readFileSync(path.join(process.cwd(), rel), "utf8");
    assert.equal(
      /localhost:3000|127\.0\.0\.1:3000/i.test(content),
      false,
      `${rel} should not contain localhost:3000 or 127.0.0.1:3000`,
    );
  }
});
