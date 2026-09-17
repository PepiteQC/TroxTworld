import { chromium } from "playwright";

const url = process.argv[2] || "http://127.0.0.1:8080/?qa=1";
const out = process.argv[3] || "/workspace/screenshots";

const browser = await chromium.launch({ args: ["--no-sandbox", "--disable-dev-shm-usage"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
page.setDefaultTimeout(120000);
await page.goto(url, { waitUntil: "domcontentloaded" });
await page.waitForFunction(() => window.__portneuf && window.__store && !window.__store.getState().loading, { timeout: 120000 });
await page.waitForTimeout(700);

const probe = await page.evaluate(() => {
  const e = window.__portneuf;
  const car = e.runAdmin("/car sq");
  const tp = e.runAdmin("/tppolice");
  e.vehicle.yaw = 0.4;
  e.vehicle.snap();
  const bars = [];
  e.vehicle.group.traverse((o) => {
    if (o.name === "sq-lightbar") bars.push(true);
  });
  let worldBars = 0;
  e.world.group.traverse((o) => {
    if (o.name === "sq-lightbar") worldBars++;
  });
  return { car, tp, playerBar: bars.length, worldBars, kind: e.vehicle.kind };
});
console.log("probe", JSON.stringify(probe));

await page.waitForTimeout(500);
await page.screenshot({ path: `${out}/lightbar-sq-idle.png` });

const cycled = await page.evaluate(() => {
  const e = window.__portneuf;
  const a = e.runAdmin("/siren");
  const b = e.runAdmin("/siren");
  const c = e.runAdmin("/siren");
  e.vehicle.tickLightbar(2);
  return { a, b, c, mode: e.vehicle.sirenPattern(), hud: window.__store.getState().sirenMode };
});
console.log("cycle", JSON.stringify(cycled));

await page.waitForTimeout(400);
await page.screenshot({ path: `${out}/lightbar-sq-code3.png` });

await page.evaluate(() => {
  const e = window.__portneuf;
  e.runAdmin("/wanted 4");
  e.vehicle.yaw = Math.PI;
  e.vehicle.snap();
});
await page.waitForTimeout(800);
await page.screenshot({ path: `${out}/lightbar-chase.png` });

await browser.close();
if (!probe.playerBar || probe.worldBars < 2) {
  console.error("missing lightbars", probe);
  process.exit(1);
}
if (cycled.mode !== "code3_emergency") {
  console.error("expected code3", cycled);
  process.exit(1);
}
console.log("lightbar ok");
