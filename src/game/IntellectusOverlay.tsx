/**
 * Panneau Intellectus — Données live, métriques et console d'administration.
 * Fichier: /src/game/IntellectusOverlay.tsx
 */
import { useEffect, useState, useCallback, useRef, type KeyboardEvent } from "react";
import { Activity, Radio, Shield, Terminal, Users, X } from "lucide-react";
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

type Tab = "sante" | "oeil" | "monde" | "bus";

interface Props {
  engine: PortneufEngine | null;
}

export function IntellectusOverlay({ engine }: Props) {
  const [tab, setTab] = useState<Tab>("sante");
  const [online, setOnline] = useState(false);
  const [health, setHealth] = useState<IntellectusHealth | null>(null);
  const [eye, setEye] = useState<ThirdEyeStats | null>(null);
  const [players, setPlayers] = useState<RPPlayerDTO[]>([]);
  const [bus, setBus] = useState<BusHistoryEntry[]>([]);
  const [cmds, setCmds] = useState<CommandRecordDTO[]>([]);
  
  // Console state
  const [line, setLine] = useState("");
  const [log, setLog] = useState<string[]>([]);
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);

  // Store Zustand
  const season = useGameStore((s) => s.season);
  const wxCondition = useGameStore((s) => s.wxCondition);
  const wxTemp = useGameStore((s) => s.wxTemp);
  const snowCm = useGameStore((s) => s.snowCm);
  const plowStatus = useGameStore((s) => s.plowStatus);
  const eventBanner = useGameStore((s) => s.eventBanner);
  const closeIntel = useGameStore((s) => s.closeIntel);

  useEffect(() => {
    let active = true;
    let timerId: number;

    const tick = async () => {
      if (!active) return;
      try {
        const remote = await intellectusClient.getHealth();
        if (!active) return;

        if (remote) {
          setOnline(true);
          setHealth(remote);

          const [remoteEye, remotePlayers, remoteBus, remoteCmds] = await Promise.all([
            intellectusClient.getThirdEye(),
            intellectusClient.getPlayers(),
            intellectusClient.getBus(),
            intellectusClient.getCommands(),
          ]);

          if (!active) return;
          setEye(remoteEye ?? liveThirdEye());
          setPlayers(remotePlayers ?? []);
          setBus(remoteBus?.history ?? liveBus().history);
          setCmds(remoteCmds?.records ?? liveCommands().records);
        } else {
          setOnline(false);
          setHealth(liveHealth());
          setEye(liveThirdEye());
          setPlayers(livePlayers());
          setBus(liveBus().history);
          setCmds(liveCommands().records);
        }
      } catch (error) {
        if (active) {
          setOnline(false);
          setHealth(liveHealth());
          setEye(liveThirdEye());
        }
      } finally {
        if (active) {
          timerId = window.setTimeout(tick, 2000);
        }
      }
    };

    void tick();

    return () => {
      active = false;
      window.clearTimeout(timerId);
    };
  }, []);

  const run = useCallback(async () => {
    const raw = line.trim();
    if (!raw) return;

    setHistory((prev) => [raw, ...prev.filter((c) => c !== raw)].slice(0, 50));
    setHistoryIndex(-1);
    setLine("");

    const local = engine?.runAdmin(raw);
    pushCommand(raw, local?.ok ?? false, local?.ok ? undefined : local?.message);

    const remote = await intellectusClient.dispatch(raw, {}, "local");
    const msg = local?.message ?? remote?.error ?? (remote?.ok ? "Exécuté avec succès" : "Commande transmise");

    setLog((prev) => [`${local?.ok || remote?.ok ? "✔" : "✖"} ${raw} → ${msg}`, ...prev].slice(0, 10));
    intellectusClient.clearCache();
  }, [line, engine]);

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowUp") {
      e.preventDefault();
      if (history.length === 0) return;
      const nextIdx = Math.min(historyIndex + 1, history.length - 1);
      setHistoryIndex(nextIdx);
      setLine(history[nextIdx] ?? "");
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (historyIndex <= 0) {
        setHistoryIndex(-1);
        setLine("");
      } else {
        const prevIdx = historyIndex - 1;
        setHistoryIndex(prevIdx);
        setLine(history[prevIdx] ?? "");
      }
    }
  };

  const risk = eye?.stats.riskLevel ?? "GREEN";
  const riskCls =
    risk === "RED"
      ? "text-red-500"
      : risk === "ORANGE"
      ? "text-amber-500"
      : risk === "YELLOW"
      ? "text-yellow-400"
      : "text-emerald-400";

  return (
    <div className="absolute inset-0 z-40 flex items-end justify-center bg-black/70 px-3 py-4 backdrop-blur-sm sm:items-center">
      <div className="flex max-h-[min(640px,88dvh)] w-full max-w-lg flex-col overflow-hidden rounded-xl border border-white/10 bg-neutral-900 text-neutral-200 shadow-2xl">
        {/* En-tête */}
        <div className="flex items-start justify-between gap-3 px-4 pt-3 pb-2 border-b border-white/5">
          <div>
            <p className="flex items-center gap-1.5 text-[10px] font-semibold tracking-[0.2em] text-neutral-400 uppercase">
              <Activity className="size-3 text-cyan-400 animate-pulse" />
              Noyau Intellectus
            </p>
            <p className="mt-0.5 text-xs text-neutral-400">
              <span className={online ? "text-emerald-400 font-medium" : "text-amber-400 font-medium"}>
                {online ? "Serveur Live" : "Noyau Local"}
              </span>
              {" · Niveau de Risque : "}
              <span className={`font-semibold ${riskCls}`}>{risk}</span>
            </p>
          </div>
          <button
            type="button"
            className="flex size-8 items-center justify-center rounded-lg text-neutral-400 hover:bg-white/5 hover:text-white transition-colors"
            onClick={() => closeIntel()}
            aria-label="Fermer"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Navigation Onglets */}
        <div className="flex gap-1 px-4 pt-2.5 pb-1 bg-black/20">
          {(
            [
              ["sante", "Santé"],
              ["oeil", "3e Œil"],
              ["monde", "Monde"],
              ["bus", "Bus / Logs"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              className={`h-7 rounded px-3 text-xs font-medium transition-colors ${
                tab === id
                  ? "bg-white/10 text-white shadow-sm"
                  : "text-neutral-400 hover:text-neutral-200 hover:bg-white/5"
              }`}
              onClick={() => setTab(id)}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Corps des onglets */}
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3 text-sm">
          {tab === "sante" && health && (
            <ul className="space-y-2 font-mono text-xs text-neutral-300">
              <li className="rounded bg-black/30 p-2 border border-white/5">
                <strong className="text-cyan-400">Arcadius</strong> : {health.arcadius.channels} canaux · {health.arcadius.totalSubscriptions} abonnements
              </li>
              <li className="rounded bg-black/30 p-2 border border-white/5">
                <strong className="text-cyan-400">Benedictus</strong> : {health.benedictus.contracts.length} contrats actifs
              </li>
              <li className="rounded bg-black/30 p-2 border border-white/5">
                <strong className="text-cyan-400">Decaprius</strong> : {health.decaprius.totalRecords} commandes · moyenne {health.decaprius.avgExecutionMs}ms
              </li>
              <li className="rounded bg-black/30 p-2 border border-white/5">
                <strong className="text-cyan-400">Lotus</strong> : {health.lotus.snapshots} snapshots · {health.lotus.openTransactions} tx ouvertes
              </li>
              <li className="rounded bg-black/30 p-2 border border-white/5">
                <strong className="text-cyan-400">Momentus</strong> : {health.momentus.enabledTasks} tâches · {health.momentus.activeTimers} timers
              </li>
            </ul>
          )}

          {tab === "oeil" && eye && (
            <div className="space-y-3">
              <div className="rounded bg-black/30 p-3 border border-white/5">
                <p className={`font-mono text-xl font-bold ${riskCls}`}>{eye.stats.riskLevel}</p>
                <p className="mt-1 text-xs text-neutral-400">
                  Menaces détectées : {eye.stats.totalThreats} · Score de confiance moyen : {eye.stats.avgTrustScore} · Joueurs bannis : {eye.stats.bannedPlayers}
                </p>
              </div>
              <ul className="space-y-2">
                {eye.threats.length === 0 && <li className="text-xs text-neutral-500 italic">Aucune menace active.</li>}
                {eye.threats.map((t, i) => (
                  <li key={`${t.type}-${i}`} className="rounded border border-red-500/20 bg-red-950/20 p-2.5">
                    <p className="flex items-center gap-1.5 text-xs font-semibold text-red-400">
                      <Shield className="size-3" />
                      {t.type} · Sévérité : {t.severity}
                    </p>
                    <p className="mt-1 text-[11px] text-neutral-300">{t.details}</p>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {tab === "monde" && (
            <div className="space-y-3">
              <div className="rounded border border-white/10 bg-black/30 p-3">
                <p className="text-[10px] font-semibold tracking-wider text-neutral-400 uppercase">Comté de Portneuf</p>
                <p className="mt-1 text-sm font-medium text-neutral-100">
                  {SEASON_LABEL[season as QuebecSeason]} · {CONDITION_LABEL[wxCondition as WeatherCondition]} · {Math.round(wxTemp)}°C
                </p>
                <p className="mt-0.5 text-xs text-neutral-400">
                  Neige : {Math.round(snowCm)} cm · Déneigement : {PLOW_STATUS_LABEL[plowStatus as SnowPlowStatus]} · {AdminMetrics.getMetrics().fps} FPS
                </p>
                {eventBanner && <p className="mt-2 text-xs font-medium text-amber-400">{eventBanner}</p>}
              </div>

              <div className="space-y-1.5">
                <p className="text-[10px] font-semibold uppercase text-neutral-500">Citoyens connectés ({players.length})</p>
                {players.length === 0 && <p className="text-xs text-neutral-500 italic">Aucun citoyen indexé.</p>}
                {players.map((p) => (
                  <div key={p.id} className="flex items-center justify-between rounded border border-white/5 bg-black/20 px-3 py-2">
                    <span className="flex items-center gap-2 text-xs font-medium text-neutral-200">
                      <Users className="size-3 text-cyan-400" />
                      {p.name}
                    </span>
                    <span className="text-[11px] text-neutral-400">
                      {p.job} · <span className={p.wanted > 0 ? "text-amber-400 font-bold" : ""}>{p.wanted}★</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === "bus" && (
            <ul className="space-y-1.5 font-mono text-[11px] text-neutral-400">
              {bus.length === 0 && cmds.length === 0 && <li className="text-neutral-500 italic">Bus d'événements vide.</li>}
              {cmds.slice(0, 5).map((c) => (
                <li key={c.commandId} className="flex items-center gap-2 bg-black/20 px-2 py-1 rounded">
                  <span className={c.status === "SUCCESS" ? "text-emerald-400" : "text-red-400"}>[{c.status}]</span>
                  <span className="text-neutral-200">{c.commandName}</span>
                </li>
              ))}
              {bus.slice(0, 5).map((b) => (
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
            <div className="mb-2 max-h-16 overflow-y-auto space-y-0.5 font-mono text-[11px]">
              {log.slice(0, 3).map((l, i) => (
                <p key={i} className="text-neutral-300 truncate">
                  {l}
                </p>
              ))}
            </div>
          )}
          <div className="flex items-center gap-2 rounded-md border border-white/10 bg-black/50 px-2.5">
            <Terminal className="size-3.5 text-neutral-500" />
            <input
              type="text"
              value={line}
              onChange={(e) => setLine(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="/tp caisse  ·  /meteo neige  ·  /zone"
              className="h-9 flex-1 bg-transparent font-mono text-xs text-white placeholder:text-neutral-600 focus:outline-none"
            />
          </div>
        </form>
      </div>
    </div>
  );
}

export function startIntellectusHeartbeat(): number {
  const beat = () => {
    void intellectusClient.pushHeartbeat(heartbeatPayload());
  };
  beat();
  return window.setInterval(beat, 2500);
}