import { writeFile } from "node:fs/promises";
import { chromium } from "playwright";

const JOBS = [
  { src: "/models/male_casual.fbx", out: "public/models/male_casual.glb", maxTex: 1024 },
  { src: "/models/male_shirt.fbx", out: "public/models/male_shirt.glb", maxTex: 1024 },
  { src: "/models/male_longsleeve.fbx", out: "public/models/male_longsleeve.glb", maxTex: 1024 },
  { src: "/models/male_suit.fbx", out: "public/models/male_suit.glb", maxTex: 1024 },
  { src: "/models/bear.fbx", out: "public/models/bear.glb", maxTex: 1024 },
  { src: "/models/lada.fbx", out: "public/models/lada.glb", maxTex: 512 },
  { src: "/models/jetta.fbx", out: "public/models/jetta.glb", maxTex: 512 },
  { src: "/models/loft.fbx", out: "public/models/loft.raw.glb", maxTex: 512 },
];

const html = `<!doctype html>
<html><head>
<script type="importmap">
{ "imports": {
  "three": "https://unpkg.com/three@0.186.0/build/three.module.js",
  "three/addons/": "https://unpkg.com/three@0.186.0/examples/jsm/"
}}
</script>
</head><body>
<script type="module">
import * as THREE from "three";
import { FBXLoader } from "three/addons/loaders/FBXLoader.js";
import { GLTFExporter } from "three/addons/exporters/GLTFExporter.js";
import { mergeVertices } from "three/addons/utils/BufferGeometryUtils.js";

const loader = new FBXLoader();
const exporter = new GLTFExporter();

function prune(root, maxTex) {
  const dump = [];
  const fallback = document.createElement("canvas");
  fallback.width = 4;
  fallback.height = 4;
  const ctx = fallback.getContext("2d");
  if (ctx) {
    ctx.fillStyle = "#888";
    ctx.fillRect(0, 0, 4, 4);
  }
  root.traverse((obj) => {
    if (obj.isLight || obj.isCamera || obj.isLine) dump.push(obj);
    const mesh = obj;
    if (!mesh.isMesh || !mesh.geometry) return;
    let geo = mesh.geometry;
    if (!geo.index) {
      try { geo = mergeVertices(geo, 1e-4); mesh.geometry = geo; } catch {}
    }
    if (geo.attributes.color) geo.deleteAttribute("color");
    if (geo.attributes.tangent) geo.deleteAttribute("tangent");
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const mat of mats) {
      if (!mat) continue;
      for (const key of ["map", "normalMap", "roughnessMap", "metalnessMap", "aoMap", "emissiveMap", "alphaMap", "bumpMap", "displacementMap", "specularMap"]) {
        const tex = mat[key];
        if (!tex) continue;
        const img = tex.image;
        const w = img && (img.width || img.videoWidth || 0);
        const h = img && (img.height || img.videoHeight || 0);
        if (!img || !w || !h) {
          mat[key] = null;
          continue;
        }
        const c = document.createElement("canvas");
        c.width = Math.min(maxTex, w);
        c.height = Math.min(maxTex, h);
        try {
          c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
          tex.image = c;
          tex.needsUpdate = true;
        } catch {
          mat[key] = null;
        }
      }
    }
  });
  for (const o of dump) o.parent?.remove(o);
}

window.convertFbx = async (url, maxTex, out) => {
  const obj = await loader.loadAsync(url);
  const keys = ["map", "normalMap", "roughnessMap", "metalnessMap", "aoMap", "emissiveMap", "alphaMap", "bumpMap"];
  const start = performance.now();
  while (performance.now() - start < 20000) {
    let pending = 0;
    obj.traverse((o) => {
      const mats = o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : [];
      for (const m of mats) {
        if (!m) continue;
        for (const k of keys) {
          const t = m[k];
          if (t && !(t.image && (t.image.width > 0 || t.image.videoWidth > 0))) pending++;
        }
      }
    });
    if (pending === 0) break;
    await new Promise((r) => setTimeout(r, 250));
  }
  prune(obj, maxTex);
  const buf = await exporter.parseAsync(obj, { binary: true, maxTextureSize: maxTex, animations: obj.animations ?? [] });
  const bytes = buf instanceof ArrayBuffer ? new Uint8Array(buf) : new Uint8Array(await buf.arrayBuffer());
  const step = 1 << 20;
  for (let i = 0; i < bytes.length; i += step) {
    const slice = bytes.subarray(i, i + step);
    let bin = "";
    for (let j = 0; j < slice.length; j++) bin += String.fromCharCode(slice[j]);
    await window.saveChunk(out, btoa(bin), i === 0);
  }
  return bytes.length;
};
</script>
</body></html>`;

const browser = await chromium.launch({ headless: true, args: ["--disable-web-security"] });
const page = await browser.newPage();
page.setDefaultTimeout(420000);
const chunks = new Map();
await page.exposeFunction("saveChunk", async (out, b64, reset) => {
  const buf = Buffer.from(b64, "base64");
  const prev = reset ? [] : chunks.get(out) ?? [];
  prev.push(buf);
  chunks.set(out, prev);
});
await page.setContent(html, { waitUntil: "domcontentloaded" });
await page.waitForFunction(() => typeof window.convertFbx === "function", { timeout: 90000 });

const only = process.argv[2];
for (const job of JOBS) {
  if (only && !job.src.includes(only) && !job.out.includes(only)) continue;
  const url = "http://127.0.0.1:8080" + job.src;
  console.log("convert", job.src, "…");
  const t0 = Date.now();
  try {
    const bytes = await page.evaluate(
      async ({ url, maxTex, out }) => window.convertFbx(url, maxTex, out),
      { url, maxTex: job.maxTex, out: job.out },
    );
    const parts = chunks.get(job.out) ?? [];
    const buf = Buffer.concat(parts);
    await writeFile(job.out, buf);
    chunks.delete(job.out);
    console.log("  ok", (buf.length / 1e6).toFixed(2), "MB in", ((Date.now() - t0) / 1000).toFixed(1), "s (src bytes", bytes, ")");
  } catch (err) {
    console.error("  FAIL", job.src, err?.message || err);
  }
}
await browser.close();
