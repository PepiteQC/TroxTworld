/**
 * Panneau Intellectus — données live (client HTTP + noyau local).
 */
import { useEffect, useState } from "react";
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
import { CONDITION_LABEL, PLOW_STATUS_LABEL, SEASON_LABEL, type QuebecSeason, type SnowPlowStatus, type WeatherCondition } from "./seasons";
import { AdminMetrics } from "./adminMetrics";

type Tab = "sante" | "oeil" | "monde" | "bus";

export function IntellectusOverlay({ engine }: { engine: PortneufEngine | null }) {
  const [tab, setTab] = useState<Tab>("sante");
  const [online, setOnline] = useState(false);
  const [health, setHealth] = useState<IntellectusHealth | null>(null);
  const [eye, setEye] = useState<ThirdEyeStats | null>(null);
  const [players, setPlayers] = useState<RPPlayerDTO[]>([]);
  const [bus, setBus] = useState<BusHistoryEntry[]>([]);
  const [cmds, setCmds] = useState<CommandRecordDTO[]>([]);
  const [line, setLine] = useState("");
  const [log, setLog] = useState<string[]>([]);
  const season = useGameStore((s) => s.season);
  const wxCondition = useGameStore((s) => s.wxCondition);
  const wxTemp = useGameStore((s) => s.wxTemp);
  const snowCm = useGameStore((s) => s.snowCm);
  const plowStatus = useGameStore((s) => s.plowStatus);
  const eventBanner = useGameStore((s) => s.eventBanner);

  useEffect(() => {
    let dead = false;
    const tick = async () => {
      const remote = await intellectusClient.getHealth();
      if (dead) return;
      if (remote) {
        setOnline(true);
        setHealth(remote);
        setEye((await intellectusClient.getThirdEye()) ?? liveThirdEye());
        setPlayers(await intellectusClient.getPlayers());
        const b = await intellectusClient.getBus();
        setBus(b?.history ?? liveBus().history);
        const c = await intellectusClient.getCommands();
        setCmds(c?.records ?? liveCommands().records);
      } else {
        setOnline(false);
        setHealth(liveHealth());
        setEye(liveThirdEye());
        setPlayers(livePlayers());
        setBus(liveBus().history);
        setCmds(liveCommands().records);
      }
    };
    void tick();
    const id = window.setInterval(() => void tick(), 2000);
    return () => {
      dead = true;
      window.clearInterval(id);
    };
  }, []);

  const run = async () => {
    const raw = line.trim();
    if (!raw) return;
    setLine("");
    const local = engine?.runAdmin(raw);
    pushCommand(raw, local?.ok ?? false, local?.ok ? undefined : local?.message);
    const remote = await intellectusClient.dispatch(raw, {}, "local");
    const msg = local?.message ?? remote?.error ?? (remote?.ok ? "ok" : "aucune réponse");
    setLog((p) => [`${local?.ok || remote?.ok ? "ok" : "err"}  ${msg}`, ...p].slice(0, 8));
    intellectusClient.clearCache();
  };

  const risk = eye?.stats.riskLevel ?? "GREEN";
  const riskCls =
    risk === "RED" ? "text-danger" : risk === "ORANGE" ? "text-clay" : risk === "YELLOW" ? "text-accent" : "text-ok";

  return (
    <div className="absolute inset-0 z-40 flex items-end justify-center bg-bg/70 px-3 py-4 backdrop-blur-sm sm:items-center">
      <div className="flex max-h-[min(640px,88dvh)] w-full max-w-lg flex-col overflow-hidden rounded-xl border border-border-strong bg-surface shadow-hud">
        <div className="flex items-start justify-between gap-3 px-4 pt-3 pb-2">
          <div>
            <p className="flex items-center gap-1.5 text-[10px] tracking-[0.2em] text-subtle uppercase">
              <Activity className="size-3 text-accent" />
              Intellectus
            </p>
            <p className="mt-0.5 text-xs text-muted">
              <span className={online ? "text-ok" : "text-accent"}>{online ? "serveur live" : "noyau local"}</span>
              {" · "}
              <span className={riskCls}>{risk}</span>
            </p>
          </div>
          <button
            type="button"
            className="flex size-10 items-center justify-center rounded-md text-muted hover:text-fg"
            onClick={() => useGameStore.getState().closeIntel()}
            aria-label="Fermer"
          >
            <X className="size-5" />
          </button>
        </div>
        <div className="flex gap-1 px-4 pb-2">
          {(
            [
              ["sante", "Santé"],
              ["oeil", "3e œil"],
              ["monde", "Monde"],
              ["bus", "Bus"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              className={`h-8 rounded-md px-2.5 text-[11px] ${tab === id ? "border border-border-strong bg-surface-2 text-fg" : "text-muted"}`}
              onClick={() => setTab(id)}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-3 text-sm">
          {tab === "sante" && health && (
            <ul className="space-y-1.5 font-mono text-[12px] text-muted">
              <li>Arcadius · {health.arcadius.channels} canaux · {health.arcadius.totalSubscriptions} abonnés</li>
              <li>Benedictus · {health.benedictus.contracts.length} contrats</li>
              <li>Decaprius · {health.decaprius.totalRecords} cmd · {health.decaprius.avgExecutionMs} ms</li>
              <li>Lotus · {health.lotus.snapshots} snaps · tx {health.lotus.openTransactions}</li>
              <li>Momentus · {health.momentus.enabledTasks} tâches · {health.momentus.activeTimers} timers</li>
            </ul>
          )}
          {tab === "oeil" && eye && (
            <div>
              <p className={`font-display text-2xl italic ${riskCls}`}>{eye.stats.riskLevel}</p>
              <p className="mt-1 text-xs text-muted">
                menaces {eye.stats.totalThreats} · confiance {eye.stats.avgTrustScore} · bannis {eye.stats.bannedPlayers}
              </p>
              <ul className="mt-3 space-y-2">
                {eye.threats.length === 0 && <li className="text-xs text-subtle">Aucune menace récente</li>}
                {eye.threats.map((t, i) => (
                  <li key={`${t.type}-${i}`} className="rounded-md border border-border bg-surface-2 px-3 py-2">
                    <p className="flex items-center gap-1.5 text-xs">
                      <Shield className="size-3 text-accent" />
                      {t.type} · sev {t.severity}
                    </p>
                    <p className="mt-0.5 text-[11px] text-muted">{t.details}</p>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {tab === "monde" && (
            <div className="space-y-3">
              <div className="rounded-md border border-border bg-surface-2 px-3 py-2">
                <p className="text-[10px] tracking-[0.16em] text-subtle uppercase">Comté</p>
                <p className="mt-1 text-sm text-fg">
                  {SEASON_LABEL[season as QuebecSeason]} · {CONDITION_LABEL[wxCondition as WeatherCondition]} · {Math.round(wxTemp)} °C
                </p>
                <p className="text-[11px] text-muted">
                  {Math.round(snowCm)} cm · {PLOW_STATUS_LABEL[plowStatus as SnowPlowStatus]} · {AdminMetrics.getMetrics().fps} fps
                </p>
                {eventBanner && <p className="mt-1 text-[11px] text-accent">{eventBanner}</p>}
              </div>
              <ul className="space-y-1.5">
              {players.length === 0 && <li className="text-xs text-subtle">Aucun citoyen indexé</li>}
              {players.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-2 rounded-md border border-border bg-surface-2 px-3 py-2">
                  <span className="flex items-center gap-1.5 text-sm">
                    <Users className="size-3 text-accent" />
                    {p.name}
                  </span>
                  <span className="text-[11px] text-muted">
                    {p.job} · {p.wanted}★
                  </span>
                </li>
              ))}
            </ul>
            </div>
          )}
          {tab === "bus" && (
            <ul className="space-y-1 font-mono text-[11px] text-muted">
              {bus.length === 0 && cmds.length === 0 && <li className="text-subtle">Bus vide</li>}
              {cmds.slice(0, 8).map((c) => (
                <li key={c.commandId}>
                  {c.status} · {c.commandName}
                </li>
              ))}
              {bus.slice(0, 8).map((b) => (
                <li key={b.event.eventId} className="flex items-center gap-1">
                  <Radio className="size-3" />
                  {b.event.channel}/{b.event.type}
                </li>
              ))}
            </ul>
          )}
        </div>
        <form
          className="border-t border-border px-3 py-2"
          onSubmit={(e) => {
            e.preventDefault();
            void run();
          }}
        >
          {log[0] && <p className="mb-1 font-mono text-[11px] text-muted">{log[0]}</p>}
          <div className="flex gap-2">
            <Terminal className="mt-2.5 size-3.5 text-subtle" />
            <input
              value={line}
              onChange={(e) => setLine(e.target.value)}
              placeholder="/tp caisse  ·  /net  ·  /zone"
              className="h-10 flex-1 rounded-md border border-border bg-bg px-3 font-mono text-sm text-fg outline-none placeholder:text-subtle"
            />
          </div>
        </form>
      </div>
    </div>
  );
}

export function startIntellectusHeartbeat() {
  const beat = () => {
    void intellectusClient.pushHeartbeat(heartbeatPayload());
  };
  beat();
  return window.setInterval(beat, 2500);
}
