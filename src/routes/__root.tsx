/**
 * ═══════════════════════════════════════════════════════════════════
 * 🌌 TROXTWORLD — RACINE GLOBALE TANSTACK ROUTER & ARCHITECTURE SSR
 * ═══════════════════════════════════════════════════════════════════
 * Viewport verrouillé (Game-Ready), Dark Theme natif,
 * Métadonnées Open Graph Québec et hydratation étanche.
 * ═══════════════════════════════════════════════════════════════════
 */

import { createRootRoute, HeadContent, Outlet, Scripts } from "@tanstack/react-router";
import { AuthProvider } from "@/lib/auth/provider";
import { PreviewHostBridge } from "@/components/preview-host-bridge";
import appCss from "../styles.css?url";

const APP_NAME = "TroxTWorld — Comté de Portneuf RP";
const APP_DESC = "Simulation Roleplay québécoise en temps réel dans le comté de Portneuf. Route 138, SQ, Hydro-Québec, économie et survie.";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      {
        name: "viewport",
        content:
          "width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover",
      },
      { name: "color-scheme", content: "dark" },
      { title: APP_NAME },
      { name: "description", content: APP_DESC },
      { name: "theme-color", content: "#090d16" },

      // Balises Open Graph (Discord, Facebook, iMessage)
      { property: "og:type", content: "website" },
      { property: "og:title", content: APP_NAME },
      { property: "og:description", content: APP_DESC },
      { property: "og:site_name", content: "TroxTWorld" },
      { property: "og:image", content: "/og.jpg" }, // Image de prévisualisation par défaut

      // Cartes Twitter / X
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: APP_NAME },
      { name: "twitter:description", content: APP_DESC },
      { name: "twitter:image", content: "/og.jpg" },
    ],
    links: [
      { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
      { rel: "stylesheet", href: appCss },
      
      // Configuration PWA TroxTWorld
      { rel: "manifest", href: "/__troxt/manifest.webmanifest" },
      { rel: "apple-touch-icon", href: "/favicon.svg" },
      
      // Chargement ultra-rapide des polices Google Fonts
      { rel: "dns-prefetch", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Outfit:wght@400;500;600;700&display=swap",
      },
    ],
  }),
  component: RootDocument,
  notFoundComponent: RootNotFoundView,
  errorComponent: RootErrorView,
});

/**
 * Structure HTML/DOM Principale
 */
function RootDocument() {
  return (
    <html lang="fr" className="dark bg-[#090d16] text-slate-100 antialiased" suppressHydrationWarning>
      <head>
        <HeadContent />
        {/* Style critique inline pour verrouiller le viewport de jeu et masquer les scrollbars */}
        <style dangerouslySetInnerHTML={{ __html: `
          html, body {
            overflow: hidden !important;
            touch-action: none;
            -webkit-overflow-scrolling: none;
            user-select: none;
            -webkit-user-select: none;
          }
          ::-webkit-scrollbar {
            display: none !important;
          }
        `}} />
      </head>
      <body className="min-h-screen w-full overflow-hidden bg-[#090d16] font-sans select-none selection:bg-cyan-500/20 selection:text-cyan-200">
        <PreviewHostBridge />
        <AuthProvider>
          <Outlet />
        </AuthProvider>
        <Scripts />
      </body>
    </html>
  );
}

/**
 * Vue 404 Intégrée (Secteur non trouvé)
 */
function RootNotFoundView() {
  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-[#090d16] p-4 font-mono text-slate-200">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-black/40 p-6 text-center shadow-2xl backdrop-blur-md animate-in fade-in zoom-in-95 duration-200">
        <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-xl border border-cyan-500/20 bg-cyan-500/10 text-cyan-400">
          <span className="text-base font-bold">404</span>
        </div>
        <h1 className="text-xs font-semibold tracking-widest uppercase text-white">
          Secteur Non Cartographié
        </h1>
        <p className="mt-2 text-xs text-slate-400 leading-relaxed">
          Cette route réseau n'existe pas ou a été bloquée par le Ministère des Transports de TroxTWorld.
        </p>
        <a
          href="/"
          className="mt-6 inline-flex items-center justify-center rounded-lg border border-white/10 bg-white/5 px-4 py-2 font-mono text-xs font-semibold uppercase tracking-wider text-slate-200 transition-all hover:border-cyan-500/40 hover:bg-cyan-500/10 hover:text-cyan-300"
        >
          Retour au Comté
        </a>
      </div>
    </div>
  );
}

/**
 * Gestionnaire d'erreurs d'exécution
 */
function RootErrorView({ error }: { error: unknown }) {
  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-[#090d16] p-4 font-mono text-slate-200">
      <div className="w-full max-w-lg rounded-2xl border border-rose-500/30 bg-black/80 p-6 shadow-2xl backdrop-blur-md animate-in fade-in">
        <div className="flex items-center space-x-2 text-rose-400">
          <span className="size-2 rounded-full bg-rose-500 animate-pulse" />
          <h1 className="text-xs font-bold uppercase tracking-wider">
            Interruption Système TroxTWorld
          </h1>
        </div>
        <p className="mt-2 text-xs text-slate-400">
          Une exception critique a suspendu la simulation graphique.
        </p>
        <pre className="mt-4 max-h-40 overflow-auto rounded-lg border border-white/5 bg-black/60 p-3 text-[11px] text-rose-300 scrollbar-thin scrollbar-thumb-white/10">
          {error instanceof Error ? error.message : String(error)}
        </pre>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="mt-4 inline-flex items-center justify-center rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-white/10"
        >
          Réinitialiser la session
        </button>
      </div>
    </div>
  );
}