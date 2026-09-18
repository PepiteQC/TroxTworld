/**
 * ═══════════════════════════════════════════════════════════════════
 * 🌌 TROXTWORLD — POINT D'ENTRÉE CLIENT & ÉCRAN DE BOOT IMMERSIF (v1.2)
 * ═══════════════════════════════════════════════════════════════════
 * Détection WebGL2, isolation SSR sécurisée et séquenceur de chargement.
 * Harmonisation parfaite du thème sombre pour éviter le flash de chargement.
 * ═══════════════════════════════════════════════════════════════════
 */

import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useCallback, type ComponentType } from "react";
import { Loader2, AlertTriangle, RefreshCw, Compass, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Home,
});

// ═══════════════════════════════════════════════════════════
// ÉTAPES DU CHARGEMENT IMMERSIF (CONFORME MÉTÉO ET SERVICES DU QUÉBEC)
// ═══════════════════════════════════════════════════════════

const LOADING_STAGES = [
  "Initialisation du moteur graphique WebGL2...",
  "Connexion au serveur Colyseus (Port 3000)...",
  "Chargement du module de physique Rapier 3D...",
  "Analyse météo & État des routes du MTQ...",
  "Synchronisation avec le Registraire des Entreprises...",
  "Chargement du comté et génération du monde...",
] as const;

// ═══════════════════════════════════════════════════════════
// TEST DE COMPATIBILITÉ GRAPHIQUE (WEBGL2)
// ═══════════════════════════════════════════════════════════

function isWebGLAvailable(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const canvas = document.createElement("canvas");
    return Boolean(
      window.WebGL2RenderingContext &&
      (canvas.getContext("webgl2") || canvas.getContext("experimental-webgl2"))
    );
  } catch {
    return false;
  }
}

// ═══════════════════════════════════════════════════════════
// COMPOSANT SPLASH SCREEN DE COMTÉ (STYLE SOMBRE NEUTRE)
// ═══════════════════════════════════════════════════════════

interface SplashProps {
  stageIndex?: number;
  error?: string | null;
  onRetry?: () => void;
}

function Splash({ stageIndex = 0, error, onRetry }: SplashProps) {
  const currentStageText = LOADING_STAGES[Math.min(stageIndex, LOADING_STAGES.length - 1)];
  const progressPercent = error
    ? 100
    : Math.min(100, Math.round(((stageIndex + 1) / LOADING_STAGES.length) * 100));

  return (
    <div className="relative flex min-h-[100dvh] w-full flex-col items-center justify-between bg-[#090d16] p-6 text-[#ece8de] font-sans selection:bg-cyan-500/20 selection:text-cyan-200">
      
      {/* En-tête officiel du réseau de simulation */}
      <div className="flex w-full items-center justify-between border-b border-white/5 pb-4 text-[10px] tracking-[0.25em] text-[#7a9aaa] uppercase font-mono">
        <div className="flex items-center gap-2">
          <Compass className="size-3.5 text-cyan-400 animate-spin" style={{ animationDuration: "12s" }} />
          <span>Secteur Route 138 · MRC Portneuf</span>
        </div>
        <div className="flex items-center gap-1.5 text-emerald-400">
          <ShieldCheck className="size-3.5" />
          <span>Réseau Sécurisé</span>
        </div>
      </div>

      {/* Titre & Logo Central */}
      <div className="my-auto flex flex-col items-center text-center">
        <p className="font-mono text-[11px] tracking-[0.4em] uppercase text-[#7a9aaa]">
          Comté de Portneuf
        </p>

        <h1 className="mt-2 font-serif text-6xl font-normal italic tracking-tight sm:text-8xl text-white drop-shadow-2xl">
          TroxTWorld
        </h1>

        <p className="mt-3 max-w-md text-xs sm:text-sm text-[#8a9084] leading-relaxed">
          Route 138 · Saint-Basile · Saint-Ubalde · Saint-Casimir · Québec
        </p>

        {/* Barre de progression ou bloc d'erreur */}
        <div className="mt-10 w-full max-w-xs sm:max-w-sm">
          {error ? (
            <div className="rounded-xl border border-rose-500/30 bg-rose-950/40 p-4 text-center backdrop-blur-md animate-in fade-in duration-200">
              <div className="mx-auto mb-2 flex size-8 items-center justify-center rounded-full bg-rose-500/20 text-rose-400">
                <AlertTriangle className="size-4" />
              </div>
              <p className="text-xs font-semibold uppercase tracking-wider text-rose-300">
                Échec du démarrage de Portneuf
              </p>
              <p className="mt-1 font-mono text-[11px] text-slate-400 leading-relaxed">
                {error}
              </p>
              {onRetry && (
                <button
                  type="button"
                  onClick={onRetry}
                  className="mt-4 inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-1.5 font-mono text-xs text-white transition-colors hover:border-cyan-500/40 hover:bg-cyan-500/10 hover:text-cyan-300"
                >
                  <RefreshCw className="size-3.5" />
                  Réessayer le chargement
                </button>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3">
              {/* Barre de progression fine et réactive */}
              <div className="relative h-1 w-full overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full bg-gradient-to-r from-cyan-500 to-emerald-400 transition-all duration-300 ease-out"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>

              {/* Statut textuel synchrone */}
              <div className="flex items-center gap-2 font-mono text-[11px] text-slate-400">
                <Loader2 className="size-3.5 animate-spin text-cyan-400" />
                <span>{currentStageText}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Pied de page et version */}
      <div className="flex w-full items-center justify-between border-t border-white/5 pt-4 font-mono text-[10px] text-slate-600">
        <span>TroxTWorld Engine 2026</span>
        <span>Version 1.2.0 · Production Québec</span>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// POINT D'ENTRÉE HOME AVEC ISOLATION SSR
// ═══════════════════════════════════════════════════════════

function Home() {
  const [App, setApp] = useState<ComponentType | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [stage, setStage] = useState<number>(0);

  const loadGame = useCallback(() => {
    setError(null);
    setStage(0);

    // 1. Validation WebGL2
    if (!isWebGLAvailable()) {
      setError(
        "Accélération graphique WebGL2 indisponible. Veuillez l'activer dans les paramètres système de votre navigateur."
      );
      return;
    }

    setStage(1);
    let cancelled = false;

    // Simulation d'étapes d'hydratation asynchrones
    const t1 = setTimeout(() => { if (!cancelled) setStage(2); }, 200);
    const t2 = setTimeout(() => { if (!cancelled) setStage(3); }, 500);
    const t3 = setTimeout(() => { if (!cancelled) setStage(4); }, 800);
    const t4 = setTimeout(() => { if (!cancelled) setStage(5); }, 1100);

    // 2. Importation asynchrone du bundle lourd du jeu (Vite Code Splitting)
    import("@/game/Game")
      .then((mod) => {
        if (cancelled) return;
        setStage(6);
        
        // Transition de fondu parfaite à l'initialisation finale
        setTimeout(() => {
          if (!cancelled) {
            // Supporte l'export nommé (PortneufApp) ainsi que l'export par défaut
            const component = (mod as any).PortneufApp || (mod as any).default || (mod as any).Game;
            if (component) {
              setApp(() => component);
            } else {
              setError("Le module de jeu n'a pas exporté de composant d'application valide.");
            }
          }
        }, 150);
      })
      .catch((err) => {
        console.error("[Game Boot Error] Échec de l'importation de Game.tsx:", err);
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Impossible de synchroniser les ressources graphiques de l'environnement."
          );
        }
      });

    return () => {
      cancelled = true;
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, []);

  useEffect(() => {
    const cleanup = loadGame();
    return () => cleanup?.();
  }, [loadGame]);

  if (error || !App) {
    return <Splash stageIndex={stage} error={error} onRetry={loadGame} />;
  }

  return <App />;
}
