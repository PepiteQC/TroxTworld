/**
<<<<<<< HEAD
 * ═════════════════════════════════════════════════════════════════════════════
 * 👁️ PANNEAU INTELLECTUS — TÉLÉMÉTRIE LIVE, 3E ŒIL & CONSOLE D'ADMINISTRATION
 * Fichier: /src/game/IntellectusOverlay.tsx
 * Architecture : Single-State Update, Zero-GC Static Lookups, Render Optimized.
 * ═════════════════════════════════════════════════════════════════════════════
 */

import {
  useEffect,
  useState,
  useCallback,
  useRef,
  useMemo,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import {
  Activity,
  Radio,
  Shield,
  Terminal,
  Users,
  X,
  Search,
  Copy,
  Check,
  Zap,
} from "lucide-react";
=======
 * Panneau Intellectus — Données live, métriques et console d'administration.
 * Fichier: /src/game/IntellectusOverlay.tsx
 * Architecture : Single-State Update, Static Allocations, Render Optimized.
 */
import { useEffect, useState, useCallback, useRef, useMemo, type KeyboardEvent } from "react";
import { Activity, Radio, Shield, Terminal, Users, X, Search, Copy, Check } from "lucide-react";
>>>>>>> 40ca88498f1da4389cc3b6d228bfb6917f394158
import {
  intellectusClient,
  type BusHistoryEntry,
  type CommandRecordDTO,
  type IntellectusHealth,
  type RPPlayerDTO,
  type ThirdEyeStats,
} from "@/intellectus/IntellectusClient";
import {
  heartbeatPayload,
  liveBus,
  liveCommands,
  liveHealth,
  livePlayers,
  liveThirdEye,
  pushCommand,
} from "@/intellectus/kernel";
import { useGameStore } from "./store";
import type { PortneufEngine } from "./engine";
import {
  CONDITION_LABEL,
  PLOW_STATUS_LABEL,
  SEASON_LABEL,
  type QuebecSeason,
  type SnowPlowStatus,
  type WeatherCondition,
} from "./seasons";
import { AdminMetrics } from "./adminMetrics";

<<<<<<< HEAD
// ─── 1. CONSTANTES & ALLOCATIONS STATIQUES ───────────────────────────────────
=======
// ==========================================
// CONSTANTES & ALLOCATIONS STATIQUES (ZERO-GC)
// ==========================================
>>>>>>> 40ca88498f1da4389cc3b6d228bfb6917f394158

type TabId = "sante" | "oeil" | "monde" | "bus";

const TABS: ReadonlyArray<{ id: TabId; label: string }> = [
  { id: "sante", label: "Santé" },
  { id: "oeil", label: "3e Œil" },
  { id: "monde", label: "Monde" },
  { id: "bus", label: "Bus / Logs" },
] as const;

<<<<<<< HEAD
const QUICK_COMMANDS = [
  "/tp caisse",
  "/meteo neige",
  "/meteo pluie",
  "/zone",
  "/net",
  "/heal",
] as const;

=======
>>>>>>> 40ca88498f1da4389cc3b6d228bfb6917f394158
interface DashboardState {
  online: boolean;
  health: IntellectusHealth | null;
  eye: ThirdEyeStats | null;
  players: RPPlayerDTO[];
  bus: BusHistoryEntry[];
  cmds: CommandRecordDTO[];
  latency: number;
<<<<<<< HEAD
  fps: number;
=======
>>>>>>> 40ca88498f1da4389cc3b6d228bfb6917f394158
}

interface Props {
  engine: PortneufEngine | null;
}

<<<<<<< HEAD
// ─── 2. COMPOSANT PRINCIPAL INTELLECTUS OVERLAY ─────────────────────────────
=======
// ==========================================
// COMPOSANT PRINCIPAL
// ==========================================
>>>>>>> 40ca88498f1da4389cc3b6d228bfb6917f394158

export function IntellectusOverlay({ engine }: Props) {
  const [tab, setTab] = useState<TabId>("sante");
  const [searchQuery, setSearchQuery] = useState("");
  const [commandExecuting, setCommandExecuting] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
<<<<<<< HEAD

  // État unifié pour éviter les re-renders en cascade
=======
  
  // État unifié pour éviter la cascade de renders
>>>>>>> 40ca88498f1da4389cc3b6d228bfb6917f394158
  const [metrics, setMetrics] = useState<DashboardState>({
    online: false,
    health: null,
    eye: null,
    players: [],
    bus: [],
    cmds: [],
    latency: 0,
<<<<<<< HEAD
    fps: 60,
  });

  // Gestion du terminal et historique
=======
  });
  
  // Refs pour l'historique du terminal
>>>>>>> 40ca88498f1da4389cc3b6d228bfb6917f394158
  const [line, setLine] = useState("");
  const [log, setLog] = useState<string[]>([]);
  const historyRef = useRef<string[]>([]);
  const historyIndexRef = useRef<number>(-1);
  const inputRef = useRef<HTMLInputElement>(null);

<<<<<<< HEAD
  // Sélecteurs Zustand
=======
  // Sélecteurs Zustand optimisés
>>>>>>> 40ca88498f1da4389cc3b6d228bfb6917f394158
  const season = useGameStore((s) => s.season);
  const wxCondition = useGameStore((s) => s.wxCondition);
  const wxTemp = useGameStore((s) => s.wxTemp);
  const snowCm = useGameStore((s) => s.snowCm);
  const plowStatus = useGameStore((s) => s.plowStatus);
  const eventBanner = useGameStore((s) => s.eventBanner);
  const closeIntel = useGameStore((s) => s.closeIntel);

<<<<<<< HEAD
  // ─── BOUCLE DE SYNCHRONISATION (POLLING 2000ms) ───────────────────────────

=======
  // ==========================================
  // BOUCLE DE SYNCHRONISATION (POLLING)
  // ==========================================
  
>>>>>>> 40ca88498f1da4389cc3b6d228bfb6917f394158
  useEffect(() => {
    let active = true;
    let timerId: ReturnType<typeof setTimeout>;

    const tick = async () => {
      if (!active) return;
<<<<<<< HEAD
      const startTime = performance.now();

=======
      
      const startTime = performance.now();
      
>>>>>>> 40ca88498f1da4389cc3b6d228bfb6917f394158
      try {
        const remoteHealth = await intellectusClient.getHealth();
        if (!active) return;

<<<<<<< HEAD
        const currentFps = AdminMetrics.getMetrics?.()?.fps ?? 60;

=======
>>>>>>> 40ca88498f1da4389cc3b6d228bfb6917f394158
        if (remoteHealth) {
          const [remoteEye, remotePlayers, remoteBus, remoteCmds] = await Promise.all([
            intellectusClient.getThirdEye(),
            intellectusClient.getPlayers(),
            intellectusClient.getBus(),
            intellectusClient.getCommands(),
          ]);

          if (!active) return;
<<<<<<< HEAD

          const latency = Math.round(performance.now() - startTime);

=======
          
          const latency = performance.now() - startTime;
          
>>>>>>> 40ca88498f1da4389cc3b6d228bfb6917f394158
          setMetrics({
            online: true,
            health: remoteHealth,
            eye: remoteEye ?? liveThirdEye(),
            players: remotePlayers ?? [],
            bus: remoteBus?.history ?? liveBus().history,
            cmds: remoteCmds?.records ?? liveCommands().records,
<<<<<<< HEAD
            latency,
            fps: currentFps,
          });
        } else {
          // Fallback noyau local
=======
            latency: Math.round(latency),
          });
        } else {
          // Fallback Local
>>>>>>> 40ca88498f1da4389cc3b6d228bfb6917f394158
          setMetrics({
            online: false,
            health: liveHealth(),
            eye: liveThirdEye(),
            players: livePlayers(),
            bus: liveBus().history,
            cmds: liveCommands().records,
            latency: 0,
<<<<<<< HEAD
            fps: currentFps,
          });
        }
      } catch (error) {
        console.error("[Intellectus] Erreur de synchronisation:", error);
=======
          });
        }
      } catch (error) {
        console.error("[Intellectus] Polling error:", error);
>>>>>>> 40ca88498f1da4389cc3b6d228bfb6917f394158
        if (active) {
          setMetrics((prev) => ({
            ...prev,
            online: false,
            health: liveHealth(),
            eye: liveThirdEye(),
            latency: 0,
<<<<<<< HEAD
            fps: AdminMetrics.getMetrics?.()?.fps ?? 60,
=======
>>>>>>> 40ca88498f1da4389cc3b6d228bfb6917f394158
          }));
        }
      } finally {
        if (active) {
          timerId = setTimeout(tick, 2000);
        }
      }
    };

    void tick();

    return () => {
      active = false;
<<<<<<< HEAD
      if (timerId) clearTimeout(timerId);
    };
  }, []);

  // ─── RACCOURCI CLAVIER ÉCHAP ──────────────────────────────────────────────

  useEffect(() => {
    const handleGlobalKeyDown = (e: globalThis.KeyboardEvent) => {
=======
      if (timerId) {
        clearTimeout(timerId);
      }
    };
  }, []);

  // ==========================================
  // RACCOURCIS CLAVIER
  // ==========================================

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
>>>>>>> 40ca88498f1da4389cc3b6d228bfb6917f394158
      if (e.key === "Escape") {
        closeIntel();
      }
    };

<<<<<<< HEAD
    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, [closeIntel]);

  // Focus automatique du terminal lors du passage sur l'onglet Bus
=======
    window.addEventListener("keydown", handleKeyDown as any);
    return () => window.removeEventListener("keydown", handleKeyDown as any);
  }, [closeIntel]);

  // Auto-focus sur l'input quand on change d'onglet
>>>>>>> 40ca88498f1da4389cc3b6d228bfb6917f394158
  useEffect(() => {
    if (tab === "bus" && inputRef.current) {
      inputRef.current.focus();
    }
  }, [tab]);

<<<<<<< HEAD
  // ─── EXÉCUTION DES COMMANDES ADMIN ────────────────────────────────────────

  const runCommand = useCallback(
    async (cmdToRun?: string) => {
      const raw = (cmdToRun ?? line).trim();
      if (!raw || commandExecuting) return;

      setCommandExecuting(true);

      // Historique de navigation
      const currentHistory = historyRef.current;
      const idx = currentHistory.indexOf(raw);
      if (idx !== -1) currentHistory.splice(idx, 1);
      currentHistory.unshift(raw);
      if (currentHistory.length > 50) currentHistory.pop();

      historyIndexRef.current = -1;
      setLine("");

      try {
        // 1. Exécution locale sur le moteur
        const local = engine?.runAdmin(raw);
        pushCommand(raw, local?.ok ?? false, local?.ok ? undefined : local?.message);

        // 2. Dispatch distant vers le serveur Intellectus
        const remote = await intellectusClient.dispatch(raw, {}, "local");
        const msg =
          local?.message ??
          remote?.error ??
          (remote?.ok ? "Exécuté avec succès" : "Commande transmise");

        const success = local?.ok || remote?.ok;
        const logEntry = `${success ? "✔" : "✖"} ${raw} → ${msg}`;

        setLog((prev) => [logEntry, ...prev].slice(0, 20));
        intellectusClient.clearCache();
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : "Erreur d'exécution";
        setLog((prev) => [`✖ ${raw} → ${errorMsg}`, ...prev].slice(0, 20));
      } finally {
        setCommandExecuting(false);
      }
    },
    [line, engine, commandExecuting]
  );

  const handleInputKeyDown = useCallback(
    (e: ReactKeyboardEvent<HTMLInputElement>) => {
      const history = historyRef.current;

      if (e.key === "ArrowUp") {
        e.preventDefault();
        if (history.length === 0) return;

        const nextIdx = Math.min(historyIndexRef.current + 1, history.length - 1);
        historyIndexRef.current = nextIdx;
        setLine(history[nextIdx] ?? "");
      } else if (e.key === "ArrowDown") {
        e.preventDefault();

        if (historyIndexRef.current <= 0) {
          historyIndexRef.current = -1;
          setLine("");
        } else {
          const prevIdx = historyIndexRef.current - 1;
          historyIndexRef.current = prevIdx;
          setLine(history[prevIdx] ?? "");
        }
      } else if (e.key === "Enter") {
        e.preventDefault();
        void runCommand();
      }
    },
    [runCommand]
  );
=======
  // ==========================================
  // LOGIQUE DU TERMINAL
  // ==========================================
  
  const run = useCallback(async () => {
    const raw = line.trim();
    if (!raw || commandExecuting) return;

    setCommandExecuting(true);

    // Gestion de l'historique
    const currentHistory = historyRef.current;
    const idx = currentHistory.indexOf(raw);
    if (idx !== -1) currentHistory.splice(idx, 1);
    currentHistory.unshift(raw);
    if (currentHistory.length > 50) currentHistory.pop();
    
    historyIndexRef.current = -1;
    setLine("");

    try {
      // Exécution locale
      const local = engine?.runAdmin(raw);
      pushCommand(raw, local?.ok ?? false, local?.ok ? undefined : local?.message);

      // Exécution distante
      const remote = await intellectusClient.dispatch(raw, {}, "local");
      const msg = local?.message ?? remote?.error ?? (remote?.ok ? "Exécuté avec succès" : "Commande transmise");

      const success = local?.ok || remote?.ok;
      const logEntry = `${success ? "✔" : "✖"} ${raw} → ${msg}`;
      
      setLog((prev) => [logEntry, ...prev].slice(0, 20));
      
      intellectusClient.clearCache();
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Erreur inconnue";
      setLog((prev) => [`✖ ${raw} → ${errorMsg}`, ...prev].slice(0, 20));
    } finally {
      setCommandExecuting(false);
    }
  }, [line, engine, commandExecuting]);

  const handleKeyDown = useCallback((e: KeyboardEvent<HTMLInputElement>) => {
    const history = historyRef.current;
    
    if (e.key === "ArrowUp") {
      e.preventDefault();
      if (history.length === 0) return;
      
      const nextIdx = Math.min(historyIndexRef.current + 1, history.length - 1);
      historyIndexRef.current = nextIdx;
      setLine(history[nextIdx] ?? "");
      
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      
      if (historyIndexRef.current <= 0) {
        historyIndexRef.current = -1;
        setLine("");
      } else {
        const prevIdx = historyIndexRef.current - 1;
        historyIndexRef.current = prevIdx;
        setLine(history[prevIdx] ?? "");
      }
    } else if (e.key === "Enter") {
      e.preventDefault();
      void run();
    }
  }, [run]);
>>>>>>> 40ca88498f1da4389cc3b6d228bfb6917f394158

  const copyToClipboard = useCallback(async (text: string, index: number) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch (error) {
<<<<<<< HEAD
      console.error("Échec de la copie dans le presse-papier:", error);
    }
  }, []);

  // ─── MÉTRIQUES ET FILTRES ─────────────────────────────────────────────────

  const risk = useMemo(() => metrics.eye?.stats.riskLevel ?? "GREEN", [metrics.eye]);

  const riskCls = useMemo(() => {
    switch (risk) {
      case "RED":
        return "text-red-500";
      case "ORANGE":
        return "text-amber-500";
      case "YELLOW":
        return "text-yellow-400";
      default:
        return "text-emerald-400";
    }
  }, [risk]);

  const filteredPlayers = useMemo(() => {
    if (!searchQuery.trim()) return metrics.players;
    const query = searchQuery.toLowerCase();
    return metrics.players.filter(
      (p) => p.name.toLowerCase().includes(query) || p.job.toLowerCase().includes(query)
    );
  }, [metrics.players, searchQuery]);

  return (
    <div className="absolute inset-0 z-50 flex items-end justify-center bg-black/75 px-3 py-4 backdrop-blur-md sm:items-center">
      <div className="flex max-h-[min(660px,88dvh)] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-white/10 bg-neutral-900/95 text-neutral-200 shadow-2xl">
        
        {/* En-tête */}
        <div className="flex items-start justify-between gap-3 px-4 pt-3.5 pb-2.5 border-b border-white/5">
=======
      console.error("Failed to copy:", error);
    }
  }, []);

  // ==========================================
  // CALCULS OPTIMISÉS (useMemo)
  // ==========================================

  const risk = useMemo(() => metrics.eye?.stats.riskLevel ?? "GREEN", [metrics.eye]);
  
  const riskCls = useMemo(() => {
    switch (risk) {
      case "RED": return "text-red-500";
      case "ORANGE": return "text-amber-500";
      case "YELLOW": return "text-yellow-400";
      default: return "text-emerald-400";
    }
  }, [risk]);

  const fps = useMemo(() => AdminMetrics.getMetrics().fps, []);

  const filteredPlayers = useMemo(() => {
    if (!searchQuery.trim()) return metrics.players;
    const query = searchQuery.toLowerCase();
    return metrics.players.filter(p => 
      p.name.toLowerCase().includes(query) || 
      p.job.toLowerCase().includes(query)
    );
  }, [metrics.players, searchQuery]);

  // ==========================================
  // RENDU UI
  // ==========================================

  return (
    <div className="absolute inset-0 z-40 flex items-end justify-center bg-black/70 px-3 py-4 backdrop-blur-sm sm:items-center">
      <div className="flex max-h-[min(640px,88dvh)] w-full max-w-lg flex-col overflow-hidden rounded-xl border border-white/10 bg-neutral-900 text-neutral-200 shadow-2xl">
        
        {/* En-tête */}
        <div className="flex items-start justify-between gap-3 px-4 pt-3 pb-2 border-b border-white/5">
>>>>>>> 40ca88498f1da4389cc3b6d228bfb6917f394158
          <div>
            <p className="flex items-center gap-1.5 text-[10px] font-semibold tracking-[0.2em] text-neutral-400 uppercase">
              <Activity className="size-3 text-cyan-400 animate-pulse" />
              Noyau Intellectus
            </p>
            <p className="mt-0.5 text-xs text-neutral-400">
              <span className={metrics.online ? "text-emerald-400 font-medium" : "text-amber-400 font-medium"}>
                {metrics.online ? "Serveur Live" : "Noyau Local"}
              </span>
              {metrics.online && metrics.latency > 0 && (
<<<<<<< HEAD
                <span className="ml-1.5 text-neutral-500 font-mono">· {metrics.latency}ms</span>
=======
                <span className="ml-2 text-neutral-500">· {metrics.latency}ms</span>
>>>>>>> 40ca88498f1da4389cc3b6d228bfb6917f394158
              )}
              {" · Risque : "}
              <span className={`font-semibold ${riskCls}`}>{risk}</span>
            </p>
          </div>
          <button
            type="button"
            className="flex size-8 items-center justify-center rounded-lg text-neutral-400 hover:bg-white/5 hover:text-white transition-colors"
            onClick={closeIntel}
<<<<<<< HEAD
            aria-label="Fermer le panneau (Échap)"
            title="Fermer (Échap)"
=======
            aria-label="Fermer (Escape)"
            title="Fermer (Escape)"
>>>>>>> 40ca88498f1da4389cc3b6d228bfb6917f394158
          >
            <X className="size-4" />
          </button>
        </div>

<<<<<<< HEAD
        {/* Navigation des Onglets */}
=======
        {/* Navigation Onglets */}
>>>>>>> 40ca88498f1da4389cc3b6d228bfb6917f394158
        <div className="flex gap-1 px-4 pt-2.5 pb-1 bg-black/20">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
<<<<<<< HEAD
              className={`h-7 rounded-md px-3 text-xs font-semibold transition-all ${
=======
              className={`h-7 rounded px-3 text-xs font-medium transition-colors ${
>>>>>>> 40ca88498f1da4389cc3b6d228bfb6917f394158
                tab === t.id
                  ? "bg-white/10 text-white shadow-sm"
                  : "text-neutral-400 hover:text-neutral-200 hover:bg-white/5"
              }`}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Corps des onglets */}
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3 text-sm">
<<<<<<< HEAD
          {/* ONGLET SANTÉ */}
          {tab === "sante" && metrics.health && (
            <ul className="space-y-2 font-mono text-xs text-neutral-300">
              <li className="rounded-lg bg-black/30 p-2.5 border border-white/5">
                <strong className="text-cyan-400">Arcadius</strong> : {metrics.health.arcadius.channels} canaux · {metrics.health.arcadius.totalSubscriptions} abonnements
              </li>
              <li className="rounded-lg bg-black/30 p-2.5 border border-white/5">
                <strong className="text-cyan-400">Benedictus</strong> : {metrics.health.benedictus.contracts.length} contrats actifs
              </li>
              <li className="rounded-lg bg-black/30 p-2.5 border border-white/5">
                <strong className="text-cyan-400">Decaprius</strong> : {metrics.health.decaprius.totalRecords} commandes · moyenne {metrics.health.decaprius.avgExecutionMs}ms
              </li>
              <li className="rounded-lg bg-black/30 p-2.5 border border-white/5">
                <strong className="text-cyan-400">Lotus</strong> : {metrics.health.lotus.snapshots} snapshots · {metrics.health.lotus.openTransactions} transactions
              </li>
              <li className="rounded-lg bg-black/30 p-2.5 border border-white/5">
                <strong className="text-cyan-400">Momentus</strong> : {metrics.health.momentus.enabledTasks} tâches · {metrics.health.momentus.activeTimers} minuteries
=======
          {tab === "sante" && metrics.health && (
            <ul className="space-y-2 font-mono text-xs text-neutral-300">
              <li className="rounded bg-black/30 p-2 border border-white/5">
                <strong className="text-cyan-400">Arcadius</strong> : {metrics.health.arcadius.channels} canaux · {metrics.health.arcadius.totalSubscriptions} abonnements
              </li>
              <li className="rounded bg-black/30 p-2 border border-white/5">
                <strong className="text-cyan-400">Benedictus</strong> : {metrics.health.benedictus.contracts.length} contrats actifs
              </li>
              <li className="rounded bg-black/30 p-2 border border-white/5">
                <strong className="text-cyan-400">Decaprius</strong> : {metrics.health.decaprius.totalRecords} commandes · moyenne {metrics.health.decaprius.avgExecutionMs}ms
              </li>
              <li className="rounded bg-black/30 p-2 border border-white/5">
                <strong className="text-cyan-400">Lotus</strong> : {metrics.health.lotus.snapshots} snapshots · {metrics.health.lotus.openTransactions} tx ouvertes
              </li>
              <li className="rounded bg-black/30 p-2 border border-white/5">
                <strong className="text-cyan-400">Momentus</strong> : {metrics.health.momentus.enabledTasks} tâches · {metrics.health.momentus.activeTimers} timers
>>>>>>> 40ca88498f1da4389cc3b6d228bfb6917f394158
              </li>
            </ul>
          )}

<<<<<<< HEAD
          {/* ONGLET 3E ŒIL (ANTI-TRICHE) */}
          {tab === "oeil" && metrics.eye && (
            <div className="space-y-3">
              <div className="rounded-lg bg-black/30 p-3 border border-white/5">
                <p className={`font-mono text-xl font-bold ${riskCls}`}>{metrics.eye.stats.riskLevel}</p>
                <p className="mt-1 text-xs text-neutral-400">
                  Menaces détectées : {metrics.eye.stats.totalThreats} · Confiance : {metrics.eye.stats.avgTrustScore} · Bannis : {metrics.eye.stats.bannedPlayers}
=======
          {tab === "oeil" && metrics.eye && (
            <div className="space-y-3">
              <div className="rounded bg-black/30 p-3 border border-white/5">
                <p className={`font-mono text-xl font-bold ${riskCls}`}>{metrics.eye.stats.riskLevel}</p>
                <p className="mt-1 text-xs text-neutral-400">
                  Menaces : {metrics.eye.stats.totalThreats} · Confiance : {metrics.eye.stats.avgTrustScore} · Bannis : {metrics.eye.stats.bannedPlayers}
>>>>>>> 40ca88498f1da4389cc3b6d228bfb6917f394158
                </p>
              </div>
              <ul className="space-y-2">
                {metrics.eye.threats.length === 0 ? (
<<<<<<< HEAD
                  <li className="text-xs text-neutral-500 italic">Aucune menace active recensée.</li>
                ) : (
                  metrics.eye.threats.map((t, i) => (
                    <li key={`${t.type}-${i}`} className="rounded-lg border border-red-500/20 bg-red-950/20 p-2.5">
=======
                  <li className="text-xs text-neutral-500 italic">Aucune menace active.</li>
                ) : (
                  metrics.eye.threats.map((t, i) => (
                    <li key={`${t.type}-${i}`} className="rounded border border-red-500/20 bg-red-950/20 p-2.5">
>>>>>>> 40ca88498f1da4389cc3b6d228bfb6917f394158
                      <p className="flex items-center gap-1.5 text-xs font-semibold text-red-400">
                        <Shield className="size-3" />
                        {t.type} · Sévérité : {t.severity}
                      </p>
                      <p className="mt-1 text-[11px] text-neutral-300">{t.details}</p>
                    </li>
                  ))
                )}
              </ul>
            </div>
          )}

<<<<<<< HEAD
          {/* ONGLET MONDE & POPULATION */}
          {tab === "monde" && (
            <div className="space-y-3">
              <div className="rounded-lg border border-white/10 bg-black/30 p-3">
=======
          {tab === "monde" && (
            <div className="space-y-3">
              <div className="rounded border border-white/10 bg-black/30 p-3">
>>>>>>> 40ca88498f1da4389cc3b6d228bfb6917f394158
                <p className="text-[10px] font-semibold tracking-wider text-neutral-400 uppercase">Comté de Portneuf</p>
                <p className="mt-1 text-sm font-medium text-neutral-100">
                  {SEASON_LABEL[season as QuebecSeason]} · {CONDITION_LABEL[wxCondition as WeatherCondition]} · {Math.round(wxTemp)}°C
                </p>
<<<<<<< HEAD
                <p className="mt-0.5 text-xs text-neutral-400 font-mono">
                  Neige : {Math.round(snowCm)} cm · Déneigement : {PLOW_STATUS_LABEL[plowStatus as SnowPlowStatus]} · {metrics.fps} FPS
=======
                <p className="mt-0.5 text-xs text-neutral-400">
                  Neige : {Math.round(snowCm)} cm · Déneigement : {PLOW_STATUS_LABEL[plowStatus as SnowPlowStatus]} · {fps} FPS
>>>>>>> 40ca88498f1da4389cc3b6d228bfb6917f394158
                </p>
                {eventBanner && <p className="mt-2 text-xs font-medium text-amber-400">{eventBanner}</p>}
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-semibold uppercase text-neutral-500">
<<<<<<< HEAD
                    Citoyens enregistrés ({metrics.players.length})
=======
                    Citoyens connectés ({metrics.players.length})
>>>>>>> 40ca88498f1da4389cc3b6d228bfb6917f394158
                  </p>
                  {metrics.players.length > 5 && (
                    <div className="relative">
                      <Search className="absolute left-2 top-1/2 -translate-y-1/2 size-3 text-neutral-500" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Rechercher..."
                        className="h-6 w-32 rounded border border-white/10 bg-black/30 pl-7 pr-2 text-xs text-neutral-200 placeholder:text-neutral-600 focus:outline-none focus:border-cyan-500/50"
                      />
                    </div>
                  )}
                </div>
<<<<<<< HEAD

                {filteredPlayers.length === 0 ? (
                  <p className="text-xs text-neutral-500 italic py-2">
                    {searchQuery ? "Aucun citoyen correspondant." : "Aucun citoyen indexé."}
                  </p>
                ) : (
                  filteredPlayers.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between rounded-lg border border-white/5 bg-black/20 px-3 py-2"
                    >
=======
                
                {filteredPlayers.length === 0 ? (
                  <p className="text-xs text-neutral-500 italic">
                    {searchQuery ? "Aucun résultat." : "Aucun citoyen indexé."}
                  </p>
                ) : (
                  filteredPlayers.map((p) => (
                    <div key={p.id} className="flex items-center justify-between rounded border border-white/5 bg-black/20 px-3 py-2">
>>>>>>> 40ca88498f1da4389cc3b6d228bfb6917f394158
                      <span className="flex items-center gap-2 text-xs font-medium text-neutral-200">
                        <Users className="size-3 text-cyan-400" />
                        {p.name}
                      </span>
<<<<<<< HEAD
                      <span className="text-[11px] text-neutral-400 font-mono">
=======
                      <span className="text-[11px] text-neutral-400">
>>>>>>> 40ca88498f1da4389cc3b6d228bfb6917f394158
                        {p.job} · <span className={p.wanted > 0 ? "text-amber-400 font-bold" : ""}>{p.wanted}★</span>
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

<<<<<<< HEAD
          {/* ONGLET BUS & LOGS */}
          {tab === "bus" && (
            <div className="space-y-2">
              <ul className="space-y-1.5 font-mono text-[11px] text-neutral-400">
                {metrics.bus.length === 0 && metrics.cmds.length === 0 && (
                  <li className="text-neutral-500 italic py-2">Bus d'événements vide.</li>
                )}
                {metrics.cmds.slice(0, 5).map((c, i) => {
                  const isOk =
                    c.status.toLowerCase() === "ok" ||
                    c.status.toLowerCase() === "success";
                  return (
                    <li
                      key={c.commandId}
                      className="flex items-center gap-2 bg-black/20 px-2.5 py-1.5 rounded-lg border border-white/5 group"
                    >
                      <span className={isOk ? "text-emerald-400 font-bold" : "text-red-400 font-bold"}>
                        [{c.status.toUpperCase()}]
                      </span>
                      <span className="text-neutral-200 flex-1 truncate">{c.commandName}</span>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(c.commandName, i)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:text-white"
                        title="Copier la commande"
                      >
                        {copiedIndex === i ? (
                          <Check className="size-3 text-emerald-400" />
                        ) : (
                          <Copy className="size-3 text-neutral-500" />
                        )}
                      </button>
                    </li>
                  );
                })}
                {metrics.bus.slice(0, 5).map((b) => (
                  <li
                    key={b.event.eventId}
                    className="flex items-center gap-1.5 bg-black/20 px-2.5 py-1 rounded border border-white/5"
                  >
                    <Radio className="size-3 text-cyan-400" />
                    <span className="text-neutral-300">{b.event.channel}</span>/
                    <span className="text-neutral-400">{b.event.type}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Console / Terminal & Quick Commands */}
        <form
          className="border-t border-white/10 bg-black/40 p-2.5 space-y-2"
          onSubmit={(e) => {
            e.preventDefault();
            void runCommand();
          }}
        >
          {/* Suggestions de commandes rapides */}
          <div className="flex flex-wrap gap-1.5">
            {QUICK_COMMANDS.map((cmd) => (
              <button
                key={cmd}
                type="button"
                onClick={() => void runCommand(cmd)}
                disabled={commandExecuting}
                className="flex items-center gap-1 rounded bg-white/5 border border-white/10 px-2 py-0.5 font-mono text-[10px] text-neutral-400 hover:bg-white/10 hover:text-cyan-400 transition-all disabled:opacity-40"
              >
                <Zap className="size-2.5 text-cyan-400" />
                {cmd}
              </button>
            ))}
          </div>

          {log.length > 0 && (
            <div className="max-h-20 overflow-y-auto space-y-0.5 font-mono text-[11px] rounded bg-black/50 p-1.5 border border-white/5">
=======
          {tab === "bus" && (
            <ul className="space-y-1.5 font-mono text-[11px] text-neutral-400">
              {metrics.bus.length === 0 && metrics.cmds.length === 0 && (
                <li className="text-neutral-500 italic">Bus d'événements vide.</li>
              )}
              {metrics.cmds.slice(0, 5).map((c, i) => (
                <li key={c.commandId} className="flex items-center gap-2 bg-black/20 px-2 py-1 rounded group">
                  <span className={c.status === "ok" ? "text-emerald-400" : "text-red-400"}>[{c.status}]</span>
                  <span className="text-neutral-200 flex-1">{c.commandName}</span>
                  <button
                    onClick={() => copyToClipboard(c.commandName, i)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Copier"
                  >
                    {copiedIndex === i ? (
                      <Check className="size-3 text-emerald-400" />
                    ) : (
                      <Copy className="size-3 text-neutral-500 hover:text-neutral-300" />
                    )}
                  </button>
                </li>
              ))}
              {metrics.bus.slice(0, 5).map((b) => (
                <li key={b.event.eventId} className="flex items-center gap-1.5 bg-black/20 px-2 py-1 rounded">
                  <Radio className="size-3 text-cyan-400" />
                  <span>{b.event.channel}</span>/<span>{b.event.type}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Console / Terminal Input */}
        <form
          className="border-t border-white/10 bg-black/40 p-2.5"
          onSubmit={(e) => {
            e.preventDefault();
            void run();
          }}
        >
          {log.length > 0 && (
            <div className="mb-2 max-h-20 overflow-y-auto space-y-0.5 font-mono text-[11px]">
>>>>>>> 40ca88498f1da4389cc3b6d228bfb6917f394158
              {log.slice(0, 5).map((l, i) => (
                <p key={i} className="text-neutral-300 truncate" title={l}>
                  {l}
                </p>
              ))}
            </div>
          )}
<<<<<<< HEAD

          <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/50 px-2.5">
            <Terminal
              className={`size-3.5 shrink-0 ${
                commandExecuting ? "text-cyan-400 animate-pulse" : "text-neutral-500"
              }`}
            />
=======
          <div className="flex items-center gap-2 rounded-md border border-white/10 bg-black/50 px-2.5">
            <Terminal className={`size-3.5 ${commandExecuting ? "text-cyan-400 animate-pulse" : "text-neutral-500"}`} />
>>>>>>> 40ca88498f1da4389cc3b6d228bfb6917f394158
            <input
              ref={inputRef}
              type="text"
              value={line}
              onChange={(e) => setLine(e.target.value)}
<<<<<<< HEAD
              onKeyDown={handleInputKeyDown}
=======
              onKeyDown={handleKeyDown}
>>>>>>> 40ca88498f1da4389cc3b6d228bfb6917f394158
              placeholder="/tp caisse  ·  /meteo neige  ·  /zone"
              disabled={commandExecuting}
              maxLength={200}
              className="h-9 flex-1 bg-transparent font-mono text-xs text-white placeholder:text-neutral-600 focus:outline-none disabled:opacity-50"
            />
          </div>
        </form>
      </div>
    </div>
  );
}

<<<<<<< HEAD
// ─── MINUTERIE DE HEARTBEAT CLIENT ───────────────────────────────────────────

=======
// Export isolé pour ne pas forcer le montage du composant
>>>>>>> 40ca88498f1da4389cc3b6d228bfb6917f394158
export function startIntellectusHeartbeat(): number {
  const beat = () => {
    void intellectusClient.pushHeartbeat(heartbeatPayload());
  };
  beat();
  return window.setInterval(beat, 2500);
}