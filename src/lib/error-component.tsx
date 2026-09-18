/**
 * ═════════════════════════════════════════════════════════════════════════════
 * ÉCRAN D'ERREUR GLOBAL DU JEU (ERROR BOUNDARY) — TROXTWORLD / PORTNEUF RP
 * ═════════════════════════════════════════════════════════════════════════════
 * 
 * Gestionnaire d'incident visuel et fonctionnel :
 *  - Récupération d'incident avec actions : Recharger, Retour à l'accueil, Reset cache.
 *  - Copie rapide du rapport d'erreur formaté pour le support Discord.
 *  - Affichage pliable de la pile d'appels techniques (Stack Trace).
 * ═════════════════════════════════════════════════════════════════════════════
 */

import { useState, useCallback } from "react";
import type { ErrorComponentProps } from "@tanstack/react-router";
import { 
  AlertTriangle, 
  RotateCcw, 
  Home, 
  Copy, 
  Check, 
  ChevronDown, 
  ChevronUp, 
  Trash2 
} from "lucide-react";

const FALLBACK_MESSAGE = "Une erreur inattendue est survenue dans le comté de Portneuf.";

function extractErrorInfo(error: unknown): { message: string; stack?: string } {
  if (error instanceof Error) {
    return {
      message: error.message || FALLBACK_MESSAGE,
      stack: error.stack,
    };
  }
  if (typeof error === "string" && error.trim().length > 0) {
    return { message: error };
  }
  if (typeof error === "object" && error !== null) {
    try {
      return { message: JSON.stringify(error, null, 2) };
    } catch {
      return { message: FALLBACK_MESSAGE };
    }
  }
  return { message: FALLBACK_MESSAGE };
}

export function AppErrorComponent({ error, reset }: ErrorComponentProps) {
  const [showDetails, setShowDetails] = useState(false);
  const [copied, setCopied] = useState(false);

  const { message, stack } = extractErrorInfo(error);

  // Copier le rapport d'incident dans le presse-papier
  const copyReport = useCallback(() => {
    const report = [
      `[RAPPORT D'INCIDENT TROXTWORLD]`,
      `Date : ${new Date().toISOString()}`,
      `URL : ${window.location.href}`,
      `Navigateur : ${navigator.userAgent}`,
      `Erreur : ${message}`,
      stack ? `\n--- Stack Trace ---\n${stack}` : "",
    ].join("\n");

    navigator.clipboard.writeText(report).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  }, [message, stack]);

  // Réinitialisation complète en cas de corruption de données locales
  const handleHardReset = useCallback(() => {
    if (window.confirm("Voulez-vous réinitialiser le cache local du jeu ? Cela peut résoudre les problèmes de sauvegarde corrompue.")) {
      try {
        localStorage.clear();
        sessionStorage.clear();
      } finally {
        window.location.href = "/";
      }
    }
  }, []);

  return (
    <main
      role="alert"
      className="relative flex min-h-[100dvh] w-full flex-col items-center justify-center bg-neutral-950 px-4 py-8 text-neutral-200"
      style={{
        backgroundImage: "radial-gradient(ellipse 60% 50% at 50% 30%, rgba(220, 38, 38, 0.08), transparent 80%)",
      }}
    >
      <div className="flex w-full max-w-lg flex-col items-center text-center">
        {/* Icône d'incident avec halo lumineux */}
        <div className="relative mb-4 flex size-16 items-center justify-center rounded-2xl border border-red-500/30 bg-red-950/40 text-red-400 shadow-2xl shadow-red-950/60 backdrop-blur-md">
          <AlertTriangle className="size-8 stroke-[1.75]" />
          <div className="absolute inset-0 rounded-2xl bg-red-500/10 blur-xl -z-10" />
        </div>

        {/* Titre & Description */}
        <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-red-400">
          Incident Système
        </p>
        <h1 className="mt-1 font-serif text-2xl font-bold tracking-tight text-white sm:text-3xl">
          Le Comté n'a pas pu s'afficher
        </h1>
        <p className="mt-2 text-sm text-neutral-400 max-w-md">
          Un problème technique a interrompu la simulation en temps réel.
        </p>

        {/* Boîte d'erreur mise en évidence */}
        <div className="mt-5 w-full rounded-xl border border-white/10 bg-white/[0.03] p-4 text-left backdrop-blur-md">
          <div className="flex items-start justify-between gap-3">
            <span className="font-mono text-xs font-medium text-red-300 break-words line-clamp-3">
              {message}
            </span>
            <button
              type="button"
              onClick={copyReport}
              className="flex shrink-0 items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-[11px] font-medium text-neutral-300 hover:bg-white/10 hover:text-white transition-all active:scale-95"
              title="Copier le rapport d'erreur"
            >
              {copied ? (
                <>
                  <Check className="size-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Copié !</span>
                </>
              ) : (
                <>
                  <Copy className="size-3.5 text-neutral-400" />
                  <span>Copier</span>
                </>
              )}
            </button>
          </div>

          {/* Section Détails Techniques (Stack Trace) */}
          {stack && (
            <div className="mt-3 border-t border-white/5 pt-2.5">
              <button
                type="button"
                onClick={() => setShowDetails((prev) => !prev)}
                className="flex items-center gap-1 text-[11px] font-medium text-neutral-500 hover:text-neutral-300 transition-colors"
              >
                {showDetails ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
                <span>{showDetails ? "Masquer les détails techniques" : "Afficher les détails techniques"}</span>
              </button>

              {showDetails && (
                <pre className="mt-2 max-h-44 overflow-auto rounded-lg bg-black/50 p-2.5 font-mono text-[10px] leading-relaxed text-neutral-400 border border-white/5 select-all">
                  {stack}
                </pre>
              )}
            </div>
          )}
        </div>

        {/* Boutons d'actions */}
        <div className="mt-6 flex w-full flex-col gap-2.5 sm:flex-row">
          <button
            type="button"
            onClick={() => {
              if (reset) reset();
              else window.location.reload();
            }}
            className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-white px-4 text-xs font-bold text-neutral-950 shadow-lg shadow-white/10 hover:bg-neutral-200 transition-all active:scale-98"
          >
            <RotateCcw className="size-4" />
            Réessayer
          </button>

          <button
            type="button"
            onClick={() => {
              window.location.href = "/";
            }}
            className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 text-xs font-semibold text-white hover:bg-white/10 transition-all active:scale-98"
          >
            <Home className="size-4" />
            Retour à l'accueil
          </button>
        </div>

        {/* Réinitialisation de secours */}
        <button
          type="button"
          onClick={handleHardReset}
          className="mt-6 flex items-center gap-1.5 text-xs text-neutral-500 hover:text-red-400 transition-colors"
        >
          <Trash2 className="size-3.5" />
          <span>Vider le cache local et réparer</span>
        </button>
      </div>
    </main>
  );
}