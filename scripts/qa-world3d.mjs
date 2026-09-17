import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";

const url = process.argv[2] || "http://127.0.0.1:8080/?qa=1";
const out = process.argv[3] || "/workspace/screenshots";
await mkdir(out, { recursive: true });

const browser = await chromium.launch({ args: ["--no-sandbox", "--disable-dev-shm-usage"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
page.setDefaultTimeout(120000);
await page.goto(url, { waitUntil: "domcontentloaded" });
await page.waitForFunction(() => window.__portneuf && window.__store && !window.__store.getState().loading, { timeout: 120000 });
await page.waitForTimeout(700);

const boot = await page.evaluate(() => {
  const e = window.__portneuf;
  e.vehicle.speed = 0;
  window.__controlsTest?.interact?.();
  const items = e.world.worldItems.slots?.length ?? e.world.worldItems.group.children.length;
  return { mode: e.mode, items, playing: window.__store.getState().playing };
});
console.log("boot", JSON.stringify(boot));

await page.evaluate(() => {
  const e = window.__portneuf;
  const first = e.world.worldItems.group.children[0];
  if (first) e.teleport(first.position.x, first.position.z + 3);
  if (e.mode === "drive") {
    e.vehicle.speed = 0;
    window.__controlsTest?.interact?.();
  }
});
await page.waitForTimeout(600);

await page.evaluate(() => window.__store.getState().openGesture());
await page.waitForTimeout(400);
await page.screenshot({ path: `${out}/gestes-roue.png` });

await page.evaluate(() => window.__portneuf.playGesture("surrender"));
await page.waitForTimeout(500);
await page.screenshot({ path: `${out}/geste-rendre.png` });

await page.evaluate(() => {
  const e = window.__portneuf;
  e.cycleCamera();
  e.cycleCamera();
  e.cycleCamera();
});
await page.waitForTimeout(400);
const cam = await page.evaluate(() => window.__store.getState().cameraMode);
console.log("camera", cam);
await page.screenshot({ path: `${out}/camera-modes.png` });

const loot = await page.evaluate(() => {
  const e = window.__portneuf;
  const near = e.world.worldItems.nearest(e.walker.x, e.walker.z, 8);
  if (near) {
    const got = e.world.worldItems.collect(near.id);
    if (got) {
      window.__store.getState().addItem(got.itemId, 1);
      window.__store.getState().lootItem(got.id);
      window.__store.getState().addCash(got.cash, got.name);
    }
    return got;
  }
  return null;
});
console.log("loot", JSON.stringify(loot));

await page.evaluate(() => window.__portneuf.playGesture("none"));
await browser.close();
if (!boot.items) {
  console.error("no world items");
  process.exit(1);
}
