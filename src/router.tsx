/**
 * ═══════════════════════════════════════════════════════════════════
 * 🌐 TROXTWORLD / ETHERWORLD — CONFIGURATION TANSTACK ROUTER
 * ═══════════════════════════════════════════════════════════════════
 * 
 *  - Initialisation de l'arbre de routes généré (routeTree.gen.ts)
 *  - Gestion globale des erreurs et des pages non trouvées (404)
 *  - Module Augmentation pour l'autocomplétion et le typage strict
 *  - Préchargement intelligent au survol (intent preloading)
 * ═══════════════════════════════════════════════════════════════════
 */

import { createRouter } from "@tanstack/react-router";
import { AppErrorComponent } from "@/lib/error-component";
import { routeTree } from "./routeTree.gen";

export function getRouter() {
  return createRouter({
    routeTree,
    defaultErrorComponent: AppErrorComponent,
    defaultPreload: "intent", // Précharge les assets et routes dès que le joueur survole un lien/bouton
    scrollRestoration: true,
  });
}

// ── MODULE AUGMENTATION POUR LE TYPAGE STRICT DANS TOUTE L'APPLICATION ──
declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof getRouter>;
  }
}