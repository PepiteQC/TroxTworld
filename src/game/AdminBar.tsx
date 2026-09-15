// ═══════════════════════════════════════════════════════════════════════════
//  ETHERWORLD QC — CONSOLE SGC (ADMINISTRATION)
//  src/game/AdminBar.tsx
//  Terminal d'administration avec historique, catégories et design immersif
//
//  v2.1 — AJOUTS (rien de retiré) :
//   - Chips corrigées pour correspondre aux vraies commandes de admin.ts
//     (plusieurs chips d'origine appelaient des commandes inexistantes :
//     /players, /cuff, /dirty, /spawn_loot, /realty, /plow_route…)
//   - Nouvelles catégories : 🚨 911/Casier/Fourrière, 🛡️ Signalements & Audit
//   - Badge de télémétrie live (FPS/Ping/État) dans l'en-tête, alimenté par
//     AdminMetrics qui existait déjà mais n'était jamais affiché nulle part.
//   - Badge de prise de service (🟢/🔴) alimenté par adminPerms.
//   - Fermeture de la console avec Échap.
// ═══════════════════════════════════════════════════════════════════════════

import React, { useEffect, useRef, useState } from "react";
import { Terminal, X, Zap, Snowflake, Shield, Landmark, MapPin, BadgeCheck, AlertTriangle, Activity, Radio, Gavel, Car, Flag } from "lucide-react";
import { ADMIN_CHIPS } from "./admin";
import { getRoleBadgeStyle, isOnDuty, LOCAL_PLAYER_ID } from "./adminPerms";
import { AdminMetrics, type SystemHealthStatus } from "./adminMetrics";
import type { PortneufEngine } from "./engine";
import { persist, useGameStore } from "./store";

// Catégorisation des puces d'administration rapides pour l'UI.
// v2.1 : chaque chip correspond désormais réellement à une commande
// existante dans admin.ts (avant, plusieurs n'avaient aucun handler).
const CHIP_GROUPS = [
  {
    category: "🌍 Services & Serveur",
    color: "border-orange-500/20 text-orange-400 bg-orange-500/5",
    chips: ["/help", "/status", "/announce [TXT]", "/event panne", "/hq", "/stafflist", "/diag"],
  },
  {
    category: "🚔 Ordre, SQ & SAAQ",
    color: "border-blue-500/20 text-blue-400 bg-blue-500/5",
    chips: ["/job policier", "/car sq", "/siren", "/radar", "/alcotest 120", "/wanted 3", "/jail", "/ticket CSR-329-GEV"],
  },
  {
    category: "🚨 911, Casier & Fourrière",
    color: "border-red-500/20 text-red-400 bg-red-500/5",
    chips: ["/911 code_3", "/calls", "/respond [ID]", "/record [ID]", "/bounty [ID] [MONTANT]", "/impound [VEH]", "/impoundlot"],
  },
  {
    category: "🛡️ Signalements, Audit & Sanctions",
    color: "border-pink-500/20 text-pink-400 bg-pink-500/5",
    chips: ["/duty", "/report [TXT]", "/reports", "/warn [ID] [RAISON]", "/warns [ID]", "/sanctions [ID]", "/audit"],
  },
  {
    category: "🌦️ Climat, Météo & Temps",
    color: "border-cyan-500/20 text-cyan-400 bg-cyan-500/5",
    chips: ["/time 8", "/time 23", "/weather rain", "/weather clear", "/season automne", "/plow", "/blizzard"],
  },
  {
    category: "📍 TP & Villes (Route 138)",
    color: "border-fuchsia-500/20 text-fuchsia-400 bg-fuchsia-500/5",
    chips: ["/tp spawn", "/tp donnacona", "/tp raymond", "/tp depanneur", "/tp prison", "/lieux"],
  },
  {
    category: "💰 Économie & RP",
    color: "border-emerald-500/20 text-emerald-400 bg-emerald-500/5",
    chips: ["/givecash 5000", "/mls", "/firm depanneur", "/pay", "/heal", "/kit"],
  },
  {
    category: "🏗️ Rénovations & Ateliers",
    color: "border-lime-500/20 text-lime-400 bg-lime-500/5",
    chips: ["/build", "/select sofa", "/spawn piano", "/undo", "/clearbuild"],
  },
];

const HEALTH_COLOR: Record<SystemHealthStatus, string> = {
  OPTIMAL: "text-emerald-400",
  STABLE: "text-cyan-400",
  DEGRADED: "text-amber-400",
  CRITICAL: "text-red-400",
};

export function AdminBar({ engine }: { engine: PortneufEngine | null }) {
  const [line, setLine] = useState("");
  // Historique des commandes tapées pour la navigation avec les flèches
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  const [log, setLog] = useState<{ text: string, isError: boolean, timestamp: string }[]>([
    { text: "💻 Console SGC de Portneuf prête. Entrez /help pour l'index.", isError: false, timestamp: new Date().toLocaleTimeString("fr-CA", { hour12: false }) }
  ]);

  const inputRef = useRef<HTMLInputElement>(null);
  const adminRole = useGameStore((s) => s.adminRole);
  const badge = getRoleBadgeStyle(adminRole);

  // AJOUT v2.1 — télémétrie live et statut de service, rafraîchis en polling
  // léger (ces deux états ne sont pas dans le store Zustand persisté).
  const [liveMetrics, setLiveMetrics] = useState(() => AdminMetrics.getMetrics());
  const [onDuty, setOnDuty] = useState(() => isOnDuty(LOCAL_PLAYER_ID));

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => {
      setLiveMetrics(AdminMetrics.getMetrics());
      setOnDuty(isOnDuty(LOCAL_PLAYER_ID));
    }, 2000);
    return () => window.clearInterval(id);
  }, []);

  // AJOUT v2.1 — Échap ferme la console, comme la plupart des terminaux RP.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") useGameStore.getState().closeConsole();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const run = (raw = line.trim()) => {
    if (!engine || !raw) return;

    // Remplacer les placeholders [...] par rien si l'admin clique trop vite
    const cleanRaw = raw.replace(/ \[.*?\]/g, "");

    const res = engine.runAdmin(cleanRaw);
    const timeStr = new Date().toLocaleTimeString("fr-CA", { hour12: false });

    // Ajout aux logs avec détection de succès/erreur
    setLog((prev) => [
      {
        text: `${res.ok ? "✓" : "✗"} ${cleanRaw}\n  ↳ ${res.message}`,
        isError: !res.ok,
        timestamp: timeStr
      },
      ...prev
    ].slice(0, 50)); // Garde les 50 dernières entrées

    // Ajout à l'historique des commandes
    if (cleanRaw !== history[0]) {
      setHistory((prev) => [cleanRaw, ...prev].slice(0, 20));
    }

    setLine("");
    setHistoryIndex(-1);
    setOnDuty(isOnDuty(LOCAL_PLAYER_ID));
    persist();
  };

  // Gestion des flèches directionnelles pour l'historique
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowUp") {
      e.preventDefault();
      if (historyIndex < history.length - 1) {
        const nextIndex = historyIndex + 1;
        setHistoryIndex(nextIndex);
        setLine(history[nextIndex]);
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (historyIndex > 0) {
        const prevIndex = historyIndex - 1;
        setHistoryIndex(prevIndex);
        setLine(history[prevIndex]);
      } else if (historyIndex === 0) {
        setHistoryIndex(-1);
        setLine("");
      }
    }
  };

  return (
    <div className="absolute inset-x-0 bottom-0 z-40 flex justify-center p-4 animate-fade-in pointer-events-none">
      <div className="hud-panel pointer-events-auto w-full max-w-3xl rounded-2xl p-4 !bg-[#0b131a]/95 backdrop-blur-md border border-slate-800 shadow-2xl">

        {/* EN-TÊTE CONSOLE */}
        <div className="mb-3 flex items-center justify-between border-b border-slate-800/80 pb-3">
          <p className="flex flex-wrap items-center gap-2 text-[11px] tracking-[0.25em] text-slate-400 uppercase font-bold">
            <Terminal className="size-4 text-emerald-500 animate-pulse" />
            CONSOLE SGC PORTNEUF
            <span className={`px-2 py-0.5 rounded text-[9px] tracking-[0.14em] font-extrabold ml-2 border shadow-sm ${badge.border} ${badge.bg} ${badge.color}`}>
              {badge.label}
            </span>
            {/* AJOUT v2.1 — badge de prise de service */}
            <span
              className={`px-2 py-0.5 rounded text-[9px] tracking-[0.14em] font-extrabold border shadow-sm ${
                onDuty ? "border-emerald-500 bg-emerald-500/10 text-emerald-400" : "border-slate-700 bg-slate-900/60 text-slate-500"
              }`}
              title="Basculer avec /duty"
            >
              {onDuty ? "🟢 EN SERVICE" : "🔴 HORS SERVICE"}
            </span>
            {/* AJOUT v2.1 — télémétrie live (AdminMetrics existait mais n'était affiché nulle part) */}
            <span className={`flex items-center gap-1 px-2 py-0.5 rounded text-[9px] tracking-[0.1em] font-bold border border-slate-800 bg-slate-900/60 ${HEALTH_COLOR[liveMetrics.healthStatus]}`}>
              <Activity className="size-3" />
              {liveMetrics.fps} FPS · {liveMetrics.pingMs}ms · {liveMetrics.healthStatus}
            </span>
          </p>
          <button
            type="button"
            className="flex size-7 items-center justify-center rounded-md bg-slate-900/60 border border-slate-800 text-slate-400 hover:text-white hover:bg-red-500/20 hover:border-red-500/50 transition-colors"
            onClick={() => useGameStore.getState().closeConsole()}
            aria-label="Fermer la console"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* ONGLETS DES GROUPES DE COMMANDES (CHIPS CLASSÉES) */}
        <div className="mb-4 space-y-3 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
          {CHIP_GROUPS.map((group) => (
            <div key={group.category} className="space-y-1.5">
              <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold block">{group.category}</span>
              <div className="flex flex-wrap gap-1.5">
                {group.chips.map((c) => (
                  <button
                    key={c}
                    type="button"
                    className={`rounded-md border px-2.5 py-1 font-mono text-[10px] transition-all hover:brightness-125 active:scale-95 ${group.color}`}
                    onClick={() => {
                      if (c.includes("[")) {
                        setLine(c.split(" [")[0] + " ");
                        inputRef.current?.focus();
                      } else {
                        run(c);
                      }
                    }}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* LOG DE SORTIE DE LA CONSOLE (TERMINAL CRT STYLE) */}
        <div className="mb-3 max-h-40 min-h-[5rem] overflow-y-auto rounded-lg bg-[#05090c] border border-slate-900/80 p-3 font-mono text-[11px] leading-relaxed pr-2 flex flex-col-reverse gap-2 custom-scrollbar shadow-inner">
          {log.map((l, i) => (
            <p key={i} className={`whitespace-pre-wrap border-b border-slate-900/50 pb-1.5 last:border-0 ${l.isError ? 'text-red-400' : 'text-emerald-400/90'}`}>
              <span className="text-slate-600 mr-2">[{l.timestamp}]</span>
              {l.text}
            </p>
          ))}
        </div>

        {/* INPUT DE SAISIE */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            run();
          }}
        >
          <div className="relative group">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono text-emerald-500 text-sm font-bold group-focus-within:text-emerald-400 transition-colors">$</span>
            <input
              ref={inputRef}
              value={line}
              onChange={(e) => setLine(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Entrez une commande (/tp donnacona) ou utilisez les flèches ⬆/⬇ pour l'historique..."
              className="h-11 w-full rounded-xl border border-slate-700/50 bg-[#0a1118] pl-8 pr-3 font-mono text-xs text-white outline-none placeholder:text-slate-600 focus:border-emerald-500/60 focus:bg-[#0d1620] focus:ring-1 focus:ring-emerald-500/20 transition-all shadow-sm"
              autoComplete="off"
              spellCheck="false"
            />
          </div>
        </form>
      </div>

      {/* Styles globaux pour la scrollbar (à mettre dans ton fichier CSS principal idéalement) */}
      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #334155; }
      `}} />
    </div>
  );
}