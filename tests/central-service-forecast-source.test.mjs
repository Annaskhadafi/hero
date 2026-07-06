import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const projectRoot = process.cwd();

function read(relativePath) {
  return readFileSync(path.join(projectRoot, relativePath), "utf8");
}

test("central service forecast fetches realtime USD to IDR rate through server action", () => {
  const actionSource = read("app/actions/central-service-forecast.ts");
  const pageSource = read("app/dashboard/central-service/forecast/client-page.tsx");
  const dailySource = read("app/dashboard/central-service/forecast/daily/client-page.tsx");

  assert.match(actionSource, /export async function getRealtimeExchangeRate/);
  assert.match(actionSource, /v6\.exchangerate-api\.com\/v6\/06e9b7015f4acef21c8bad94\/latest\/USD/);
  assert.match(actionSource, /conversion_rates\?\.IDR/);
  assert.match(pageSource, /getRealtimeExchangeRate\(\)/);
  assert.doesNotMatch(pageSource, /open\.er-api\.com/);
  assert.match(dailySource, /getRealtimeExchangeRate\(\)/);
  assert.doesNotMatch(dailySource, /open\.er-api\.com/);
  assert.match(dailySource, /customer: item\?\.item\.customer/);
  assert.match(dailySource, /periodId: item\?\.period\.id\?\.toString\(\)/);
});

test("daily SAP actual syncs latest remark and locks submitted USD amount", () => {
  const actionSource = read("app/actions/central-service-forecast.ts");
  const dailySource = read("app/dashboard/central-service/forecast/daily/client-page.tsx");

  assert.match(actionSource, /async function syncLatestActualRemark/);
  assert.match(actionSource, /orderBy\(desc\(centralServiceForecastActuals\.updateDate\), desc\(centralServiceForecastActuals\.createdAt\), desc\(centralServiceForecastActuals\.id\)\)/);
  assert.match(actionSource, /set\(\{ remark: latestActual\?\.remark \?\? "", updatedAt: new Date\(\) \}\)/);
  assert.match(actionSource, /await syncLatestActualRemark\(tx, data\.forecastItemId\)/);
  assert.match(actionSource, /const \{ exchangeRate: _exchangeRate, \.\.\.actualData \} = data/);
  assert.match(dailySource, /exchangeRate: "15000"/);
  assert.match(dailySource, /handleActualRateChange/);
  assert.match(dailySource, /handleFetchActualRate/);
  assert.match(dailySource, /Kurs USD API \/ Manual/);
  assert.match(dailySource, /USD tersimpan mengikuti kurs saat submit/);
  assert.match(dailySource, /amountUsd: amountIdr > 0 \? \(amountIdr \/ Number\(rate\)\)\.toFixed\(2\) : prev\.amountUsd/);
});
