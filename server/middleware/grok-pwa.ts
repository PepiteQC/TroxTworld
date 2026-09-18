/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 📱 TROXTWORLD PWA & OPEN GRAPH MIDDLEWARE — ENTERPRISE EDITION v3.0
 * ═══════════════════════════════════════════════════════════════════════════
 *  Middleware Nitro v3 / H3 pour l'écosystème TroxTWorld / Portneuf RP
 *
 *  Fonctionnalités :
 *   ✔ Web App Manifest dynamique (Android, iOS, Desktop, Windows tiles)
 *   ✔ Écran d'installation guidé (détection iOS/Safari, Android, Desktop)
 *   ✔ Injection Open Graph & Twitter Cards optimisée (streaming HTML)
 *   ✔ Splash screens iOS multi-résolutions (iPhone SE → iPad Pro 12.9")
 *   ✔ Shortcuts d'application (raccourcis dynamiques Jeu, Carte, Boutique)
 *   ✔ Service Worker registration & offline fallback
 *   ✔ Détection UA intelligente (mobile / tablet / desktop / bot)
 *   ✔ Cache-Control différencié selon type de ressource
 *   ✔ Sécurité : Nonce CSP, headers sécurité (X-Frame-Options, HSTS)
 *   ✔ Télémétrie légère (compteurs install, manifest hits)
 *   ✔ Rate limiting basique sur les endpoints coûteux
 *   ✔ Logging structuré avec niveaux (info/warn/error)
 *   ✔ Gestion d'erreurs robuste avec fallbacks
 * ═══════════════════════════════════════════════════════════════════════════
 */

import installPageTemplate from "../../scripts/install-page.html?raw";
import { grokOgIdentity } from "virtual:grok-og-identity";
import {
  acceptsHtml,
  createHeadInjector,
  isDocumentPath,
  isInstallQuery,
  renderInstallPageHtml,
  renderWebManifest,
} from "../../scripts/grok-pwa-shared.mjs";

// ─────────────────────────────────────────────────────────────────────────
//  TYPES & INTERFACES
// ─────────────────────────────────────────────────────────────────────────

interface TroxtPwaEvent {
  url: URL;
  req: { method: string; headers: Headers };
}

interface SiteIdentity {
  name: string;
  title: string;
  description: string;
  themeColor: string;
  backgroundColor?: string;
  categories?: string[];
  lang?: string;
  dir?: "ltr" | "rtl";
}

interface DeviceInfo {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isIOS: boolean;
  isAndroid: boolean;
  isSafari: boolean;
  isChrome: boolean;
  isBot: boolean;
  platform: "ios" | "android" | "windows" | "mac" | "linux" | "unknown";
}

interface TelemetryCounters {
  manifestHits: number;
  installPageViews: number;
  headInjections: number;
  serviceWorkerRequests: number;
  errors: number;
  lastReset: number;
}

interface AppShortcut {
  name: string;
  short_name: string;
  description: string;
  url: string;
  icons: Array<{ src: string; sizes: string; type: string }>;
}

// ─────────────────────────────────────────────────────────────────────────
//  CONSTANTES & CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────

const DEFAULT_SITE_IDENTITY: SiteIdentity = {
  name: "TroxTWorld",
  title: "TroxTWorld — Comté de Portneuf RP",
  description:
    "Simulation roleplay multijoueur 3D en temps réel dans le comté de Portneuf, Québec. " +
    "Vivez votre vie virtuelle avec métiers, immobilier, police SQ, et bien plus.",
  themeColor: "#0f172a",
  backgroundColor: "#020617",
  categories: ["games", "social", "entertainment", "roleplay"],
  lang: "fr-CA",
  dir: "ltr",
};

const APP_SHORTCUTS: AppShortcut[] = [
  {
    name: "Rejoindre le monde",
    short_name: "Jouer",
    description: "Se connecter instantanément à Portneuf",
    url: "/game?action=quick-join",
    icons: [{ src: "/icons/shortcut-play.png", sizes: "192x192", type: "image/png" }],
  },
  {
    name: "Carte régionale",
    short_name: "Carte",
    description: "Ouvrir la carte interactive de Portneuf",
    url: "/map",
    icons: [{ src: "/icons/shortcut-map.png", sizes: "192x192", type: "image/png" }],
  },
  {
    name: "Marché boursier",
    short_name: "Boutique",
    description: "Accéder à la boutique et au marché MLS",
    url: "/shop",
    icons: [{ src: "/icons/shortcut-shop.png", sizes: "192x192", type: "image/png" }],
  },
  {
    name: "Mon Citoyen",
    short_name: "Profil",
    description: "Gérer votre citoyen RP",
    url: "/profile",
    icons: [{ src: "/icons/shortcut-profile.png", sizes: "192x192", type: "image/png" }],
  },
];

// Splash screens iOS (Apple Human Interface Guidelines)
const IOS_SPLASH_SCREENS = [
  { device: "iPhone 15 Pro Max", width: 1290, height: 2796, ratio: 3 },
  { device: "iPhone 15 Pro", width: 1179, height: 2556, ratio: 3 },
  { device: "iPhone 14 Plus", width: 1284, height: 2778, ratio: 3 },
  { device: "iPhone 14", width: 1170, height: 2532, ratio: 3 },
  { device: "iPhone SE", width: 750, height: 1334, ratio: 2 },
  { device: "iPad Pro 12.9", width: 2048, height: 2732, ratio: 2 },
  { device: "iPad Pro 11", width: 1668, height: 2388, ratio: 2 },
  { device: "iPad Air", width: 1640, height: 2360, ratio: 2 },
  { device: "iPad Mini", width: 1488, height: 2266, ratio: 2 },
];

const MANIFEST_PATHS = new Set([
  "/__troxt/manifest.webmanifest",
  "/__troxt/manifest.json",
  "/__grok/manifest.webmanifest",
  "/__grok/manifest.json",
  "/manifest.webmanifest",
  "/manifest.json",
  "/site.webmanifest",
]);

const SERVICE_WORKER_PATHS = new Set([
  "/sw.js",
  "/service-worker.js",
  "/__troxt/sw.js",
]);

const OFFLINE_FALLBACK_PATH = "/__troxt/offline.html";

// Rate limiting simple (fenêtre glissante en mémoire)
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 300;
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

// Télémétrie en mémoire (réinitialisée toutes les 24h)
const telemetry: TelemetryCounters = {
  manifestHits: 0,
  installPageViews: 0,
  headInjections: 0,
  serviceWorkerRequests: 0,
  errors: 0,
  lastReset: Date.now(),
};

// ─────────────────────────────────────────────────────────────────────────
//  UTILITAIRES : LOGGING STRUCTURÉ
// ─────────────────────────────────────────────────────────────────────────

type LogLevel = "info" | "warn" | "error" | "debug";

function log(level: LogLevel, message: string, meta?: Record<string, unknown>): void {
  const timestamp = new Date().toISOString();
  const prefix = `[TroxtPWA][${timestamp}][${level.toUpperCase()}]`;

  const payload = meta ? `${message} ${JSON.stringify(meta)}` : message;

  switch (level) {
    case "error":
      console.error(`${prefix} ${payload}`);
      break;
    case "warn":
      console.warn(`${prefix} ${payload}`);
      break;
    case "debug":
      if (process.env.DEBUG_PWA === "true") {
        console.debug(`${prefix} ${payload}`);
      }
      break;
    default:
      console.log(`${prefix} ${payload}`);
  }
}

// ─────────────────────────────────────────────────────────────────────────
//  UTILITAIRES : DÉTECTION D'APPAREIL & USER AGENT
// ─────────────────────────────────────────────────────────────────────────

function detectDevice(userAgent: string): DeviceInfo {
  const ua = userAgent.toLowerCase();

  const isBot = /bot|crawler|spider|slurp|facebookexternalhit|whatsapp|telegram|discordbot/i.test(ua);
  const isIOS = /iphone|ipad|ipod/i.test(ua);
  const isAndroid = /android/i.test(ua);
  const isTablet = /ipad|tablet|(android(?!.*mobile))/i.test(ua);
  const isMobile = /mobile|iphone|ipod|blackberry|windows phone/i.test(ua) && !isTablet;
  const isSafari = /safari/i.test(ua) && !/chrome|crios|fxios/i.test(ua);
  const isChrome = /chrome|crios/i.test(ua) && !/edge|edg\//i.test(ua);

  let platform: DeviceInfo["platform"] = "unknown";
  if (isIOS) platform = "ios";
  else if (isAndroid) platform = "android";
  else if (/windows/i.test(ua)) platform = "windows";
  else if (/mac/i.test(ua)) platform = "mac";
  else if (/linux/i.test(ua)) platform = "linux";

  return {
    isMobile,
    isTablet,
    isDesktop: !isMobile && !isTablet,
    isIOS,
    isAndroid,
    isSafari,
    isChrome,
    isBot,
    platform,
  };
}

// ─────────────────────────────────────────────────────────────────────────
//  UTILITAIRES : SÉCURITÉ (NONCE CSP, HEADERS SÉCURITÉ)
// ─────────────────────────────────────────────────────────────────────────

function generateNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes)).replace(/[+/=]/g, "");
}

function buildSecurityHeaders(host: string, isDev = false): Record<string, string> {
  const headers: Record<string, string> = {
    "x-content-type-options": "nosniff",
    "x-frame-options": "SAMEORIGIN",
    "referrer-policy": "strict-origin-when-cross-origin",
    "permissions-policy":
      "geolocation=(self), microphone=(self), camera=(self), payment=(), usb=()",
  };

  if (!isDev) {
    headers["strict-transport-security"] = "max-age=63072000; includeSubDomains; preload";
  }

  return headers;
}

// ─────────────────────────────────────────────────────────────────────────
//  UTILITAIRES : RATE LIMITING
// ─────────────────────────────────────────────────────────────────────────

function checkRateLimit(clientKey: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(clientKey);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(clientKey, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }

  if (entry.count >= RATE_LIMIT_MAX_REQUESTS) {
    return false;
  }

  entry.count++;
  return true;
}

// Nettoyage périodique de la map de rate limiting (évite les fuites mémoire)
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitMap.entries()) {
    if (now > entry.resetAt) rateLimitMap.delete(key);
  }
}, RATE_LIMIT_WINDOW_MS);

// ─────────────────────────────────────────────────────────────────────────
//  UTILITAIRES : TÉLÉMÉTRIE
// ─────────────────────────────────────────────────────────────────────────

function incrementCounter(key: keyof TelemetryCounters): void {
  if (typeof telemetry[key] === "number") {
    (telemetry[key] as number)++;
  }

  // Reset quotidien de la télémétrie
  const now = Date.now();
  if (now - telemetry.lastReset > 86_400_000) {
    log("info", "Réinitialisation quotidienne de la télémétrie", { previous: { ...telemetry } });
    telemetry.manifestHits = 0;
    telemetry.installPageViews = 0;
    telemetry.headInjections = 0;
    telemetry.serviceWorkerRequests = 0;
    telemetry.errors = 0;
    telemetry.lastReset = now;
  }
}

// ─────────────────────────────────────────────────────────────────────────
//  UTILITAIRES : REQUÊTE HTTP
// ─────────────────────────────────────────────────────────────────────────

function requestHost(event: TroxtPwaEvent): string {
  return (
    event.req.headers.get("x-forwarded-host") ??
    event.req.headers.get("host") ??
    event.url.host
  );
}

function requestClientKey(event: TroxtPwaEvent): string {
  return (
    event.req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    event.req.headers.get("x-real-ip") ??
    "unknown"
  );
}

function requestUserAgent(event: TroxtPwaEvent): string {
  return event.req.headers.get("user-agent") ?? "";
}

// ─────────────────────────────────────────────────────────────────────────
//  MANIFEST WEBAPP ENRICHI
// ─────────────────────────────────────────────────────────────────────────

function buildEnrichedManifest(host: string, site: SiteIdentity): string {
  const baseUrl = `https://${host}`;

  const manifest = {
    id: "/",
    name: site.title,
    short_name: site.name,
    description: site.description,
    lang: site.lang ?? "fr-CA",
    dir: site.dir ?? "ltr",
    start_url: "/?utm_source=pwa&utm_medium=homescreen",
    scope: "/",
    display: "standalone",
    display_override: ["window-controls-overlay", "standalone", "minimal-ui", "browser"],
    orientation: "any",
    theme_color: site.themeColor,
    background_color: site.backgroundColor ?? "#020617",
    categories: site.categories ?? ["games"],
    prefer_related_applications: false,
    icons: [
      { src: "/icons/icon-72.png", sizes: "72x72", type: "image/png", purpose: "any" },
      { src: "/icons/icon-96.png", sizes: "96x96", type: "image/png", purpose: "any" },
      { src: "/icons/icon-128.png", sizes: "128x128", type: "image/png", purpose: "any" },
      { src: "/icons/icon-144.png", sizes: "144x144", type: "image/png", purpose: "any" },
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-256.png", sizes: "256x256", type: "image/png", purpose: "any" },
      { src: "/icons/icon-384.png", sizes: "384x384", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
      { src: "/icons/icon-monochrome.svg", sizes: "any", type: "image/svg+xml", purpose: "monochrome" },
    ],
    screenshots: [
      {
        src: "/screenshots/desktop-main.png",
        sizes: "1920x1080",
        type: "image/png",
        form_factor: "wide",
        label: "Vue principale de Portneuf en 3D",
      },
      {
        src: "/screenshots/desktop-map.png",
        sizes: "1920x1080",
        type: "image/png",
        form_factor: "wide",
        label: "Carte interactive de la MRC",
      },
      {
        src: "/screenshots/mobile-game.png",
        sizes: "1080x1920",
        type: "image/png",
        form_factor: "narrow",
        label: "Interface mobile de jeu",
      },
      {
        src: "/screenshots/mobile-profile.png",
        sizes: "1080x1920",
        type: "image/png",
        form_factor: "narrow",
        label: "Profil citoyen mobile",
      },
    ],
    shortcuts: APP_SHORTCUTS,
    related_applications: [],
    protocol_handlers: [
      { protocol: "web+troxt", url: "/handle?url=%s" },
    ],
    share_target: {
      action: "/share",
      method: "POST",
      enctype: "multipart/form-data",
      params: {
        title: "title",
        text: "text",
        url: "url",
      },
    },
    launch_handler: {
      client_mode: ["navigate-existing", "auto"],
    },
    edge_side_panel: {
      preferred_width: 400,
    },
  };

  return JSON.stringify(manifest, null, 2);
}

// ─────────────────────────────────────────────────────────────────────────
//  SPLASH SCREENS iOS (HTML LINK TAGS)
// ─────────────────────────────────────────────────────────────────────────

function buildIOSSplashLinks(): string {
  return IOS_SPLASH_SCREENS.map((s) => {
    const media = `(device-width: ${s.width / s.ratio}px) and (device-height: ${s.height / s.ratio}px) and (-webkit-device-pixel-ratio: ${s.ratio})`;
    return `<link rel="apple-touch-startup-image" media="${media}" href="/splash/apple-splash-${s.width}-${s.height}.png">`;
  }).join("\n");
}

// ─────────────────────────────────────────────────────────────────────────
//  SERVICE WORKER — SCRIPT MINIMAL EN LIGNE
// ─────────────────────────────────────────────────────────────────────────

function buildServiceWorkerScript(): string {
  return `
// TroxTWorld Service Worker v3.0
const CACHE_NAME = "troxt-cache-v3";
const OFFLINE_URL = "${OFFLINE_FALLBACK_PATH}";
const PRECACHE_URLS = [
  "/",
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  OFFLINE_URL,
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req).catch(() => caches.match(OFFLINE_URL))
    );
    return;
  }

  event.respondWith(
    caches.match(req).then((cached) => cached || fetch(req).then((res) => {
      const clone = res.clone();
      caches.open(CACHE_NAME).then((c) => c.put(req, clone)).catch(() => {});
      return res;
    }).catch(() => caches.match(OFFLINE_URL)))
  );
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") self.skipWaiting();
});
`.trim();
}

// ─────────────────────────────────────────────────────────────────────────
//  FALLBACK OFFLINE HTML
// ─────────────────────────────────────────────────────────────────────────

function buildOfflinePage(site: SiteIdentity): string {
  return `<!DOCTYPE html>
<html lang="${site.lang ?? "fr-CA"}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Hors ligne — ${site.name}</title>
  <meta name="theme-color" content="${site.themeColor}">
  <style>
    body { margin:0; font-family:-apple-system,BlinkMacSystemFont,sans-serif; background:${site.backgroundColor ?? "#020617"}; color:#e2e8f0; display:flex; align-items:center; justify-content:center; min-height:100vh; padding:1rem; text-align:center; }
    h1 { font-size:2rem; margin-bottom:.5rem; }
    p { opacity:.8; max-width:32rem; line-height:1.6; }
    button { margin-top:1.5rem; background:${site.themeColor}; color:#fff; border:none; padding:.75rem 1.5rem; border-radius:.5rem; cursor:pointer; font-size:1rem; }
    button:hover { opacity:.9; }
  </style>
</head>
<body>
  <main>
    <h1>📡 Vous êtes hors ligne</h1>
    <p>Impossible de rejoindre les serveurs de ${site.name}. Vérifiez votre connexion internet, puis réessayez.</p>
    <button onclick="location.reload()">🔄 Réessayer</button>
  </main>
</body>
</html>`;
}

// ─────────────────────────────────────────────────────────────────────────
//  INJECTION FLUIDE DES METATAGS DANS LE <HEAD> HTML (STREAMING)
// ─────────────────────────────────────────────────────────────────────────

function injectHeadStreaming(
  response: Response,
  host: string,
  device: DeviceInfo,
  nonce: string
): Response {
  const siteIdentity: SiteIdentity = grokOgIdentity?.site ?? DEFAULT_SITE_IDENTITY;

  const injector = createHeadInjector({
    host,
    site: siteIdentity,
    device,
    nonce,
    extraHead: [
      // Splash screens iOS
      ...(device.isIOS ? [buildIOSSplashLinks()] : []),
      // Preconnect vers CDN & API critiques
      `<link rel="preconnect" href="https://${host}" crossorigin>`,
      `<link rel="dns-prefetch" href="//${host}">`,
      // Meta iOS PWA
      device.isIOS ? `<meta name="apple-mobile-web-app-capable" content="yes">` : "",
      device.isIOS ? `<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">` : "",
      device.isIOS ? `<meta name="apple-mobile-web-app-title" content="${siteIdentity.name}">` : "",
      // Meta Android/Windows
      `<meta name="mobile-web-app-capable" content="yes">`,
      `<meta name="application-name" content="${siteIdentity.name}">`,
      `<meta name="msapplication-TileColor" content="${siteIdentity.themeColor}">`,
      `<meta name="msapplication-config" content="/browserconfig.xml">`,
      // Format detection
      `<meta name="format-detection" content="telephone=no">`,
    ].filter(Boolean).join("\n"),
  });

  incrementCounter("headInjections");

  const transformed = response.body!.pipeThrough(
    new TransformStream<Uint8Array, Uint8Array>({
      transform(chunk, controller) {
        try {
          for (const out of injector.push(chunk)) controller.enqueue(out);
        } catch (err) {
          log("error", "Erreur transform head injection", { err: String(err) });
          controller.enqueue(chunk);
        }
      },
      flush(controller) {
        try {
          for (const out of injector.flush()) controller.enqueue(out);
        } catch (err) {
          log("error", "Erreur flush head injection", { err: String(err) });
        }
      },
    }),
  );

  const headers = new Headers(response.headers);
  headers.delete("content-length");
  headers.set("x-troxt-pwa-injected", "true");

  // Ajout des headers de sécurité
  const isDev = process.env.NODE_ENV !== "production";
  for (const [key, value] of Object.entries(buildSecurityHeaders(host, isDev))) {
    headers.set(key, value);
  }

  return new Response(transformed, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

// ─────────────────────────────────────────────────────────────────────────
//  ROUTES SPÉCIALES : browserconfig.xml, robots.txt, offline
// ─────────────────────────────────────────────────────────────────────────

function buildBrowserConfigXml(themeColor: string): string {
  return `<?xml version="1.0" encoding="utf-8"?>
<browserconfig>
  <msapplication>
    <tile>
      <square150x150logo src="/icons/icon-144.png"/>
      <TileColor>${themeColor}</TileColor>
    </tile>
  </msapplication>
</browserconfig>`;
}

// ─────────────────────────────────────────────────────────────────────────
//  ENDPOINT DE TÉLÉMÉTRIE (DEBUG / ADMIN)
// ─────────────────────────────────────────────────────────────────────────

function buildTelemetryResponse(): Response {
  return new Response(
    JSON.stringify(
      {
        ...telemetry,
        uptime: Math.floor((Date.now() - telemetry.lastReset) / 1000),
        rateLimitMapSize: rateLimitMap.size,
        timestamp: new Date().toISOString(),
      },
      null,
      2,
    ),
    {
      headers: {
        "content-type": "application/json; charset=utf-8",
        "cache-control": "no-store",
      },
    },
  );
}

// ═════════════════════════════════════════════════════════════════════════
//  MIDDLEWARE PRINCIPAL
// ═════════════════════════════════════════════════════════════════════════

export default async function troxtPwaMiddleware(
  event: TroxtPwaEvent,
  next: () => unknown | Promise<unknown>,
): Promise<unknown> {
  try {
    const method = (event.req.method ?? "GET").toUpperCase();
    if (method !== "GET" && method !== "HEAD") return next();

    const path = event.url.pathname;
    const urlWithQuery = path + event.url.search;
    const host = requestHost(event);
    const userAgent = requestUserAgent(event);
    const device = detectDevice(userAgent);
    const clientKey = requestClientKey(event);

    // Rate limiting global (protection contre le scraping)
    if (!checkRateLimit(clientKey)) {
      log("warn", "Rate limit dépassé", { clientKey, path });
      return new Response("Too Many Requests", {
        status: 429,
        headers: { "retry-after": "60", "content-type": "text/plain" },
      });
    }

    const siteIdentity: SiteIdentity = grokOgIdentity?.site ?? DEFAULT_SITE_IDENTITY;

    // ─── 1. TÉLÉMÉTRIE ADMIN ─────────────────────────────────────
    if (path === "/__troxt/telemetry" || path === "/__troxt/stats") {
      return buildTelemetryResponse();
    }

    // ─── 2. WEB APP MANIFEST DYNAMIQUE ────────────────────────────
    if (MANIFEST_PATHS.has(path)) {
      incrementCounter("manifestHits");
      const manifestContent = buildEnrichedManifest(host, siteIdentity);
      log("debug", "Manifest servi", { host, path, device: device.platform });

      return new Response(manifestContent, {
        headers: {
          "content-type": "application/manifest+json; charset=utf-8",
          "cache-control": "public, max-age=3600, must-revalidate",
          "x-troxt-manifest-version": "3.0",
        },
      });
    }

    // ─── 3. SERVICE WORKER ────────────────────────────────────────
    if (SERVICE_WORKER_PATHS.has(path)) {
      incrementCounter("serviceWorkerRequests");
      return new Response(buildServiceWorkerScript(), {
        headers: {
          "content-type": "application/javascript; charset=utf-8",
          "cache-control": "public, max-age=0, must-revalidate",
          "service-worker-allowed": "/",
        },
      });
    }

    // ─── 4. OFFLINE FALLBACK PAGE ────────────────────────────────
    if (path === OFFLINE_FALLBACK_PATH) {
      return new Response(buildOfflinePage(siteIdentity), {
        headers: {
          "content-type": "text/html; charset=utf-8",
          "cache-control": "public, max-age=86400",
        },
      });
    }

    // ─── 5. BROWSERCONFIG.XML (WINDOWS TILES) ────────────────────
    if (path === "/browserconfig.xml") {
      return new Response(buildBrowserConfigXml(siteIdentity.themeColor), {
        headers: {
          "content-type": "application/xml; charset=utf-8",
          "cache-control": "public, max-age=86400",
        },
      });
    }

    // ─── 6. ÉCRAN D'INSTALLATION GUIDÉ (iOS / MOBILE) ────────────
    if (
      isInstallQuery(urlWithQuery) &&
      isDocumentPath(path) &&
      acceptsHtml(event.req.headers.get("accept"))
    ) {
      incrementCounter("installPageViews");
      log("info", "Écran d'installation servi", {
        platform: device.platform,
        isIOS: device.isIOS,
        isAndroid: device.isAndroid,
      });

      const html = renderInstallPageHtml(installPageTemplate, {
        host,
        url: urlWithQuery,
        device,
        site: siteIdentity,
      });

      return new Response(html, {
        headers: {
          "content-type": "text/html; charset=utf-8",
          "cache-control": "no-cache, no-store, must-revalidate",
          "x-troxt-install-page": "true",
        },
      });
    }

    // ─── 7. INJECTION OG POUR DOCUMENTS HTML ─────────────────────
    if (!isDocumentPath(path)) return next();

    const result = await next();

    if (
      result instanceof Response &&
      result.body &&
      String(result.headers.get("content-type") ?? "").includes("text/html") &&
      !result.headers.get("content-encoding")
    ) {
      const nonce = generateNonce();
      return injectHeadStreaming(result, host, device, nonce);
    }

    return result;
  } catch (err) {
    incrementCounter("errors");
    log("error", "Erreur fatale dans le middleware PWA", {
      err: String(err),
      path: event.url.pathname,
      stack: err instanceof Error ? err.stack : undefined,
    });

    // Fallback : laisse passer la requête vers le handler suivant
    return next();
  }
}

// ─────────────────────────────────────────────────────────────────────────
//  EXPORTS SECONDAIRES (POUR TESTS OU UTILITAIRES ADMIN)
// ─────────────────────────────────────────────────────────────────────────

export {
  detectDevice,
  buildEnrichedManifest,
  buildServiceWorkerScript,
  buildOfflinePage,
  telemetry,
  DEFAULT_SITE_IDENTITY,
  APP_SHORTCUTS,
  IOS_SPLASH_SCREENS,
};

export type { SiteIdentity, DeviceInfo, TelemetryCounters, TroxtPwaEvent };
