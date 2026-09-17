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
await page.waitForTimeout(600);

const startBtn = page.getByRole("button", { name: /prendre la route/i });
if (await startBtn.count()) {
  await startBtn.click();
  await page.waitForTimeout(500);
}

const boot = await page.evaluate(() => {
  const e = window.__portneuf;
  const s = window.__store.getState();
  if (!s.playing) window.__controlsTest?.interact?.();
  if (e.mode === "drive") {
    e.vehicle.speed = 0;
    window.__controlsTest?.interact?.();
  }
  e.walker.applyLook({ ...e.walker.look, model: "voyageur" });
  e.walker.speed = 2.2;
  const anim = e.walker.anim;
  return {
    playing: window.__store.getState().playing,
    mode: e.mode,
    mixer: !!anim?.bound,
    action: anim?.currentActionName ?? null,
    units: e.world ? 1 : 0,
    patrol: e.runAdmin("/patrouille"),
  };
});
console.log("boot", JSON.stringify(boot));

await page.waitForTimeout(400);
await page.screenshot({ path: `${out}/sq-walk-mixer.png` });

const ticket = await page.evaluate(() => {
  const r = window.__portneuf.runAdmin("/ticket CSR-328-2");
  const s = window.__store.getState();
  return { r, citation: s.citation, demerit: s.demeritPoints, open: s.citationOpen };
});
console.log("ticket", JSON.stringify(ticket));
await page.waitForTimeout(400);
await page.screenshot({ path: `${out}/sq-constat.png` });

await page.evaluate(() => window.__store.getState().payCitation());
await page.waitForTimeout(200);

const bac = await page.evaluate(() => {
  window.__portneuf.runAdmin("/boire");
  window.__portneuf.runAdmin("/boire");
  window.__portneuf.runAdmin("/boire");
  const test = window.__portneuf.runAdmin("/alcotest");
  const s = window.__store.getState();
  return { test, bac: s.bloodAlcohol, suspend: s.licenseSuspendedUntil, citation: s.citation };
});
console.log("alcotest", JSON.stringify(bac));
await page.waitForTimeout(400);
await page.screenshot({ path: `${out}/sq-alcotest.png` });

await page.evaluate(() => window.__store.getState().closeCitation());
await page.evaluate(() => window.__store.getState().openPhone());
await page.waitForTimeout(400);
const surete = page.getByText("Sûreté", { exact: true }).first();
if (await surete.count()) {
  await surete.click({ timeout: 4000, force: true }).catch(() => {});
}
await page.waitForTimeout(400);
await page.screenshot({ path: `${out}/sq-phone-patrouille.png` });

await page.evaluate(() => window.__store.getState().closePhone?.() ?? window.__store.setState({ phoneOpen: false, paused: false }));
await page.waitForTimeout(200);

const radar = await page.evaluate(() => window.__portneuf.runAdmin("/radar PORTNEUF-104"));
console.log("radar", JSON.stringify(radar));

await browser.close();
if (!boot.mixer) {
  console.error("mixer not bound");
  process.exit(1);
}
if (!ticket.citation) {
  console.error("ticket overlay missing");
  process.exit(1);
}
