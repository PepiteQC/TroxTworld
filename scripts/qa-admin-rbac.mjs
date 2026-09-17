import { chromium } from "playwright";

const url = process.argv[2] || "http://127.0.0.1:8080/?qa=1";
const out = process.argv[3] || "/workspace/screenshots";

const browser = await chromium.launch({ args: ["--no-sandbox", "--disable-dev-shm-usage"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
page.setDefaultTimeout(120000);
await page.goto(url, { waitUntil: "domcontentloaded" });
await page.waitForFunction(() => window.__portneuf && window.__store && !window.__store.getState().loading, { timeout: 120000 });
await page.waitForTimeout(800);

const who = await page.evaluate(() => {
  const e = window.__portneuf;
  const s = window.__store.getState();
  const a = e.runAdmin("/whoami");
  const list = e.runAdmin("/stafflist");
  return {
    role: s.adminRole,
    who: a,
    list: list.message,
    hud: s.appearance?.name,
  };
});
console.log("who", JSON.stringify(who));

await page.screenshot({ path: `${out}/staff-hud-intellectus.png` });

await page.evaluate(() => window.__store.getState().openConsole());
await page.waitForTimeout(300);
await page.screenshot({ path: `${out}/staff-console.png` });
await page.evaluate(() => window.__store.getState().closeConsole());

await page.evaluate(() => window.__store.getState().openPhone());
await page.waitForTimeout(400);
await page.getByText("Staff", { exact: true }).click();
await page.waitForTimeout(400);
await page.screenshot({ path: `${out}/staff-phone-roster.png` });

const denied = await page.evaluate(() => {
  const e = window.__portneuf;
  e.runAdmin("/setrole me helper");
  const tp = e.runAdmin("/tp hotel");
  const kit = e.runAdmin("/kit");
  const back = e.runAdmin("/setrole me intellectus");
  return {
    role: window.__store.getState().adminRole,
    tp,
    kit,
    back,
  };
});
console.log("gate", JSON.stringify(denied));

await page.evaluate(() => window.__store.getState().closePhone());
await browser.close();

if (who.role !== "intellectus_ai") {
  console.error("expected intellectus_ai default");
  process.exit(1);
}
if (!denied.tp || denied.tp.ok !== false) {
  console.error("helper should be denied /tp");
  process.exit(1);
}
if (!denied.back || denied.back.ok !== true) {
  console.error("self setrole intellectus failed");
  process.exit(1);
}
console.log("rbac ok");
