const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs");
async function main() {
  fs.mkdirSync("output/playwright", { recursive: true });
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
  });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const response = await page.request.get("http://localhost:3002/api/sheets");
  assert.equal(response.status(), 200);
  let hang = false;
  let payload = await response.json(),
    requests = 0,
    fail = false,
    delay = 0;
  await page.route("**/api/sheets", async (route) => {
    requests++;
    if (hang) return;
    if (delay) await new Promise((r) => setTimeout(r, delay));
    await route.fulfill({
      status: fail ? 503 : 200,
      contentType: "application/json",
      body: JSON.stringify(
        fail ? { error: "QA connection unavailable" } : payload,
      ),
    });
  });
  await page.clock.install();
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("http://localhost:3002");
  await page
    .getByText("เชื่อมต่อแล้ว · " + payload.rows.length + " แถว")
    .waitFor();
  await page.waitForTimeout(800);
  assert.ok(
    (await page.locator(".recharts-label").count()) > 0,
    "chart values rendered",
  );
  for (const [width, height] of [
    [1440, 1000],
    [1536, 960],
    [1024, 900],
    [390, 844],
  ]) {
    await page.setViewportSize({ width, height });
    await page.waitForTimeout(400);
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
      "document overflow " + width,
    );
    await page.screenshot({
      path: `output/playwright/dashboard-${width}.png`,
      fullPage: true,
    });
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.getByRole("button", { name: /ปิดการขาย · ชนะ/ }).click();
  assert.ok(page.url().includes("status=Closed"));
  assert.equal(
    await page.locator("#data-table .count-label").textContent(),
    String(payload.rows.filter((r) => r.status === "Closed Won").length),
  );
  await page.getByRole("button", { name: /ปิดการขาย · ชนะ/ }).click();
  assert.ok(!page.url().includes("status="));
  await page.locator(".donut-legend button").first().click();
  assert.ok(page.url().includes("category="));
  const donutValue = await page
    .locator(".donut-total")
    .evaluate((el) => el.firstChild.textContent);
  const kpiValue = await page
    .getByRole("button", { name: /มูลค่ารวมแบบไม่ซ้ำ/ })
    .locator("strong")
    .textContent();
  assert.equal(donutValue, kpiValue);
  await page.getByRole("button", { name: "ล้างทั้งหมด", exact: true }).click();
  await page.locator(".recharts-bar-rectangle").first().click();
  assert.ok(page.url().includes("status="));
  await page.getByRole("button", { name: "ล้างทั้งหมด", exact: true }).click();
  await page
    .locator("#analytics .chart-selectors")
    .last()
    .getByRole("button")
    .first()
    .click();
  assert.ok(page.url().includes("dateFrom="));
  await page.getByRole("button", { name: "ล้างทั้งหมด", exact: true }).click();
  await page.locator(".rank-list button").first().click();
  assert.ok(page.url().includes("company="));
  await page.getByRole("button", { name: "ล้างทั้งหมด", exact: true }).click();
  await page.getByTitle("หน้าถัดไป").click();
  const pagination = await page.locator(".pagination").textContent();
  await page.getByRole("button", { name: "Refresh", exact: true }).click();
  await page
    .getByText("เชื่อมต่อแล้ว · " + payload.rows.length + " แถว")
    .waitFor();
  assert.equal(await page.locator(".pagination").textContent(), pagination);
  await page.locator("#data-table th button").first().click();
  assert.equal(await page.locator(".pagination").textContent(), pagination);
  await page.locator("#data-table").getByTitle("ดูรายละเอียด").first().click();
  await page.getByRole("dialog").waitFor();
  await page.keyboard.press("Tab");
  assert.ok(
    await page.evaluate(() =>
      document.querySelector("[role=dialog]").contains(document.activeElement),
    ),
  );
  const selectedCompany = await page
    .locator("#data-table tbody tr")
    .first()
    .locator("td")
    .first()
    .getAttribute("title");
  const selectedRow = payload.rows.find((r) => r.company === selectedCompany);
  payload = {
    ...payload,
    fingerprint: "qa-updated",
    rows: payload.rows.map((r) =>
      r.rowNumber === selectedRow.rowNumber
        ? { ...r, lossReason: "QA updated note" }
        : r,
    ),
  };
  await page.keyboard.press("Escape");
  assert.equal(await page.getByRole("dialog").count(), 0);
  fail = true;
  await page.getByRole("button", { name: "Refresh", exact: true }).click();
  await page.getByText("QA connection unavailable").waitFor();
  assert.equal(
    await page.locator("#data-table .count-label").textContent(),
    String(payload.rows.length),
  );
  fail = false;
  delay = 900;
  const before = requests;
  await page.getByRole("button", { name: "Refresh", exact: true }).click();
  await page.waitForTimeout(1200);
  assert.equal(requests, before + 1);
  delay = 0;
  await page.getByLabel("ค้นหา", { exact: true }).fill("Onsite");
  assert.ok(page.url().includes("query=Onsite"));
  const count = await page.locator("#data-table .count-label").textContent();
  assert.ok(Number(count) > 0 && Number(count) < payload.rows.length);
  const downloadPromise = page.waitForEvent("download");
  await page.getByTitle("Export Excel").click();
  const download = await downloadPromise;
  await download.saveAs("output/playwright/filtered-report.xlsx");
  await page.addInitScript(() => (window.print = () => {}));
  const popupPromise = page.waitForEvent("popup");
  await page.getByTitle("Export PDF").click();
  const popup = await popupPromise;
  await popup.waitForLoadState();
  assert.equal(await popup.locator("tbody tr").count(), Number(count));
  await popup.close();
  await page.getByRole("button", { name: "บันทึกมุมมอง", exact: true }).click();
  await page.getByLabel("ชื่อมุมมอง").fill("QA Onsite");
  await page.getByRole("button", { name: "บันทึก", exact: true }).click();
  assert.ok(
    await page.evaluate(() =>
      Object.values(localStorage).some((v) => v.includes("QA Onsite")),
    ),
  );
  await page.reload();
  await page
    .getByText("เชื่อมต่อแล้ว · " + payload.rows.length + " แถว")
    .waitFor();
  assert.equal(
    await page.getByLabel("ค้นหา", { exact: true }).inputValue(),
    "Onsite",
  );
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.getByRole("button", { name: "ล้างทั้งหมด", exact: true }).click();
  await page.screenshot({
    path: "output/playwright/reduced-motion.png",
    fullPage: true,
  });
  const ExcelJS = require("exceljs");
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile("output/playwright/filtered-report.xlsx");
  assert.equal(workbook.worksheets.length, 3);
  assert.equal(workbook.getWorksheet("รายการ").rowCount, Number(count) + 1);
  await page.locator("#data-table").getByTitle("ดูรายละเอียด").first().click();
  const company = await page
    .locator("#data-table tbody tr")
    .first()
    .locator("td")
    .first()
    .getAttribute("title");
  const cells = page.locator("#data-table tbody tr").first().locator("td");
  const createdAt = await cells.nth(1).getAttribute("title");
  const itemName = await cells.nth(2).getAttribute("title");
  const target = payload.rows.find(
    (r) =>
      r.company === company &&
      r.createdAt === createdAt &&
      r.itemName === itemName,
  );
  assert.ok(target, "locate exact selected row");
  payload = {
    ...payload,
    fingerprint: "qa-modal-live",
    rows: payload.rows.map((r) =>
      r.rowNumber === target.rowNumber
        ? { ...r, lossReason: "QA live modal" }
        : r,
    ),
  };
  await page.clock.fastForward(46000);
  await page.getByRole("dialog").getByText("QA live modal").waitFor();
  payload = {
    ...payload,
    fingerprint: "qa-row-deleted",
    rows: payload.rows.filter((r) => r.rowNumber !== target.rowNumber),
  };
  await page.clock.fastForward(46000);
  await page
    .getByRole("dialog")
    .getByText(/ไม่อยู่ในข้อมูลล่าสุด/)
    .waitFor();
  await page.keyboard.press("Escape");
  await page.evaluate(() => {
    window.__qaHidden = true;
    Object.defineProperty(document, "hidden", {
      configurable: true,
      get: () => window.__qaHidden,
    });
  });
  const paused = requests;
  await page.clock.fastForward(90000);
  assert.equal(requests, paused);
  await page.evaluate(() => {
    window.__qaHidden = false;
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await page
    .getByText("เชื่อมต่อแล้ว · " + payload.rows.length + " แถว")
    .waitFor();
  assert.equal(requests, paused + 1);
  await page.evaluate(() => (window.open = () => null));
  await page.getByTitle("Export PDF").click();
  await page.getByText(/popup/i).first().waitFor();
  hang = true;
  await page.getByRole("button", { name: "Refresh", exact: true }).click();
  await page.clock.fastForward(26000);
  await page.getByText("การเชื่อมต่อใช้เวลานานเกินไป กรุณาลองใหม่").waitFor();
  assert.equal(await page.locator('#data-table .count-label').textContent(),String(payload.rows.length));
  const livePage = await browser.newPage({viewport:{width:1440,height:1000}});
  const liveErrors=[];
  livePage.on('console',msg=>{if(msg.type()==='error') liveErrors.push(msg.text());});
  livePage.on('pageerror',e=>liveErrors.push(e.message));
  await livePage.goto('http://localhost:3002');
  await livePage.getByText('เชื่อมต่อแล้ว · '+(payload.rows.length+1)+' แถว').waitFor();
  await livePage.waitForTimeout(1000);
  assert.ok(await livePage.locator('.recharts-label').count()>0);
  await livePage.screenshot({path:'output/playwright/production-live.png',fullPage:true});
  assert.deepEqual(liveErrors,[]);
  assert.deepEqual(errors, []);
  console.log(
    JSON.stringify({
      result: "passed",
      rows: payload.rows.length,
      checks:
        "responsive, chart labels, KPI toggle, URL, pagination refresh/sort, modal keyboard/live/deleted, stale data, slow request, Excel download/reopen, PDF popup/blocked, saved view, reduced motion, 45s polling, hidden-tab pause/resume",
      requests,
    }),
  );
  await browser.close();
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
