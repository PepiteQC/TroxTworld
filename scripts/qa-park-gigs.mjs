import { chromium } from "playwright";

const url = process.argv[2] || "http://127.0.0.1:8080/?qa=1";
const out = process.argv[3] || "/workspace/screenshots";

const browser = await chromium.launch({ args: ["--no-sandbox", "--disable-dev-shm-usage"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
page.setDefaultTimeout(120000);
await page.goto(url, { waitUntil: "domcontentloaded" });
await page.waitForFunction(() => window.__portneuf && window.__store && !window.__store.getState().loading, { timeout: 120000 });
await page.waitForTimeout(900);

const spots = await page.evaluate(() => {
  const e = window.__portneuf;
  const list = { parks: [], cems: [] };
  e.world.group.traverse((o) => {
    if (o.name !== "parc" && o.name !== "cimetiere") return;
    const p = o.position.clone();
    o.getWorldPosition(p);
    const row = { x: p.x, y: p.y, z: p.z };
    if (o.name === "parc") list.parks.push(row);
    else list.cems.push(row);
  });
  return {
    parks: list.parks.length,
    cems: list.cems.length,
    park0: list.parks.sort((a, b) => Math.hypot(a.x - 1120, a.z + 340) - Math.hypot(b.x - 1120, b.z + 340))[0] ?? null,
    cem0: list.cems.sort((a, b) => Math.hypot(a.x - 1120, a.z + 340) - Math.hypot(b.x - 1120, b.z + 340))[0] ?? null,
    calls: e.renderer.info.render.calls,
  };
});
console.log(JSON.stringify(spots));

if (spots.park0) {
  await page.evaluate((p) => {
    const e = window.__portneuf;
    e.teleport(p.x, p.z + 18);
    e.vehicle.yaw = 0;
    e.vehicle.snap();
  }, spots.park0);
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${out}/parc-pontrouge.png` });
}

if (spots.cem0) {
  await page.evaluate((p) => {
    const e = window.__portneuf;
    e.teleport(p.x, p.z + 20);
    e.vehicle.yaw = 0;
    e.vehicle.snap();
  }, spots.cem0);
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${out}/cimetiere-paroissial.png` });
}

await page.evaluate(() => window.__store.getState().openPhone());
await page.waitForTimeout(400);
await page.getByText("Emploi", { exact: true }).click();
await page.waitForTimeout(400);
await page.screenshot({ path: `${out}/emploi-quarts.png` });

await page.evaluate(() => {
  window.__store.getState().closePhone();
  window.__portneuf.teleport(-620, -530);
});
await page.waitForTimeout(400);
const started = await page.evaluate(() => window.__store.getState().startGig("caissier_dep"));
await page.waitForTimeout(2500);
await page.screenshot({ path: `${out}/emploi-quart-actif.png` });

const gig = await page.evaluate(() => {
  const s = window.__store.getState();
  return { started: true, title: s.activeGig?.title ?? null, progress: s.activeGig?.progress ?? 0, notice: s.notice };
});
console.log("gig", JSON.stringify({ ...gig, started }));

await browser.close();
if (!spots.parks || !spots.cems) {
  console.error("missing park or cemetery");
  process.exit(1);
}
if (!gig.title) {
  console.error("gig did not start");
  process.exit(1);
}
console.log("ok", spots.parks, "parks", spots.cems, "cemeteries", "calls", spots.calls);
