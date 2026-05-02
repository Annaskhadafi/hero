import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

import dotenv from "dotenv";
import { Client } from "pg";
import { hashPassword } from "better-auth/crypto";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const repoRoot = path.resolve(__dirname, "..");
const appDir = path.join(repoRoot, "app");

dotenv.config({ path: path.join(repoRoot, ".env.local") });
dotenv.config({ path: path.join(repoRoot, ".env") });

const baseUrl = process.env.CAPTURE_BASE_URL || "http://localhost:3000";
const tempPassword = process.env.CAPTURE_TEMP_PASSWORD || "HeroTemp#2026";
const loginEmail = process.env.CAPTURE_LOGIN_EMAIL || "chitracreator25@gmail.com";
const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
const outputDir =
  process.env.CAPTURE_OUTPUT_DIR || path.join(repoRoot, "output", `screenshots-${timestamp}`);

const publicRoutes = new Set(["/sign-in", "/sign-up", "/forgot-password", "/reset-password", "/offline"]);
const skipRoutes = new Set(["/page"]);

function routeToFileName(route) {
  if (route === "/") return "root.png";
  return (
    route
      .replace(/^\//, "")
      .replace(/\//g, "__")
      .replace(/[:?&=#]/g, "_")
      .replace(/\[|\]/g, "_") + ".png"
  );
}

async function walkPages(dir, relativePrefix = "") {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const routes = [];

  for (const entry of entries) {
    if (entry.name === "api" || entry.name.startsWith("_")) continue;

    const absolutePath = path.join(dir, entry.name);
    const relativePath = path.join(relativePrefix, entry.name);

    if (entry.isDirectory()) {
      routes.push(...(await walkPages(absolutePath, relativePath)));
      continue;
    }

    if (entry.isFile() && /^page\.(tsx|ts|jsx|js)$/.test(entry.name)) {
      const routePath = `/${relativePrefix.replace(/\\/g, "/")}`.replace(/\/page$/, "");
      if (!skipRoutes.has(routePath)) {
        routes.push(routePath === "/app" ? "/" : routePath);
      }
    }
  }

  return routes;
}

async function getDynamicRoutes(client) {
  const dynamicRoutes = [];
  try {
    const activityResult = await client.query(`select id from activities order by id desc limit 1`);
    const activityId = activityResult.rows[0]?.id;
    if (activityId != null) {
      dynamicRoutes.push(`/mobile/activity/document/${activityId}`);
      dynamicRoutes.push(`/dashboard/activity-hub/document/${activityId}`);
    }
  } catch (error) {
    dynamicRoutes.push({
      route: "/mobile/activity/document/[sessionId]",
      skipped: `dynamic lookup failed: ${error instanceof Error ? error.message : String(error)}`,
    });
    dynamicRoutes.push({
      route: "/dashboard/activity-hub/document/[sessionId]",
      skipped: `dynamic lookup failed: ${error instanceof Error ? error.message : String(error)}`,
    });
  }
  return dynamicRoutes;
}

async function getOriginalPasswordHash(client) {
  const result = await client.query(
    `
      select a.id, a.password
      from account a
      inner join "user" u on u.id = a.user_id
      where a.provider_id = 'credential'
        and lower(u.email) = lower($1)
      limit 1
    `,
    [loginEmail],
  );

  if (!result.rows[0]) {
    throw new Error(`Credential account not found for ${loginEmail}`);
  }

  return result.rows[0];
}

async function setTemporaryPassword(client, accountId) {
  const passwordHash = await hashPassword(tempPassword);
  await client.query(`update account set password = $1, updated_at = now() where id = $2`, [passwordHash, accountId]);
  await client.query(
    `
      delete from session
      where user_id = (
        select user_id from account where id = $1
      )
    `,
    [accountId],
  );
}

async function restorePassword(client, accountId, originalHash) {
  await client.query(`update account set password = $1, updated_at = now() where id = $2`, [originalHash, accountId]);
  await client.query(
    `
      delete from session
      where user_id = (
        select user_id from account where id = $1
      )
    `,
    [accountId],
  );
}

async function login(page) {
  await page.goto(`${baseUrl}/sign-in`, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await page.waitForTimeout(1500);
  await page.locator('input[type="email"]').first().fill(loginEmail);
  await page.locator('input[type="password"]').first().fill(tempPassword);
  await page.locator('button[type="submit"]').first().click();
  await page.waitForLoadState("domcontentloaded");
  await page.waitForTimeout(2500);
}

async function capturePage(browserContext, route, index, total) {
  const page = await browserContext.newPage();
  const targetUrl = `${baseUrl}${route}`;
  const filePath = path.join(outputDir, routeToFileName(route));
  const record = {
    route,
    targetUrl,
    filePath,
    status: "ok",
    finalUrl: null,
    title: null,
    error: null,
  };

  try {
    await page.goto(targetUrl, { waitUntil: "domcontentloaded", timeout: 60_000 });
    await page.waitForTimeout(2000);
    record.finalUrl = page.url();
    record.title = await page.title();
    await page.screenshot({ path: filePath, fullPage: true });
    console.log(`[${index}/${total}] OK ${route} -> ${record.finalUrl}`);
  } catch (error) {
    record.status = "error";
    record.error = error instanceof Error ? error.message : String(error);
    try {
      await page.screenshot({ path: filePath, fullPage: true });
    } catch {}
    console.log(`[${index}/${total}] ERR ${route} -> ${record.error}`);
  } finally {
    await page.close();
  }

  return record;
}

async function main() {
  await fs.mkdir(outputDir, { recursive: true });

  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  const routeCandidates = await walkPages(appDir);
  const staticRoutes = routeCandidates
    .map((route) => route.replace(/\/+/g, "/"))
    .filter((route) => !route.includes("["))
    .sort((a, b) => a.localeCompare(b));
  const dynamicRoutes = await getDynamicRoutes(client);

  const routes = [...new Set([...publicRoutes, ...staticRoutes])];
  for (const dynamicRoute of dynamicRoutes) {
    if (typeof dynamicRoute === "string") {
      routes.push(dynamicRoute);
    }
  }

  const skipped = dynamicRoutes.filter((entry) => typeof entry !== "string");
  const { id: accountId, password: originalHash } = await getOriginalPasswordHash(client);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1600, height: 900 } });

  try {
    const records = [];

    const publicRouteList = routes.filter((route) => publicRoutes.has(route));
    const protectedRouteList = routes.filter((route) => !publicRoutes.has(route));

    for (let index = 0; index < publicRouteList.length; index += 1) {
      records.push(await capturePage(context, publicRouteList[index], index + 1, routes.length));
    }

    await setTemporaryPassword(client, accountId, originalHash);
    const page = await context.newPage();
    await login(page);
    await page.close();

    for (let index = 0; index < protectedRouteList.length; index += 1) {
      records.push(
        await capturePage(
          context,
          protectedRouteList[index],
          publicRouteList.length + index + 1,
          routes.length,
        ),
      );
    }

    const manifest = {
      generatedAt: new Date().toISOString(),
      baseUrl,
      outputDir,
      loginEmail,
      totalRoutes: routes.length,
      routes,
      skipped,
      records,
    };

    await fs.writeFile(path.join(outputDir, "manifest.json"), JSON.stringify(manifest, null, 2));
  } finally {
    await browser.close();
    await restorePassword(client, accountId, originalHash);
    await client.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
