import { Truck, X, Snowflake, Factory, MapPin, AlertTriangle, Shield, Radio, Fuel, Gauge, Timer, Banknote, Star, PhoneCall } from "lucide-react";
import { formatCad } from "./commerce";
import type { HaulJob, HaulKind } from "./jobs";
import { persist, useGameStore } from "./store";
import { getUnionState } from "./haul";
import { useEffect, useState } from "react";

// ═══════════════════════════════════════════════════════════
// COMPOSANTS D'INTERFACE QUÉBÉCOIS
// ═══════════════════════════════════════════════════════════

export function JobsOverlay() {
  const board = useGameStore((s) => s.jobBoard);
  const job = useGameStore((s) => s.job);
  const notice = useGameStore((s) => s.notice);

  const union = getUnionState();
  const [weatherAlert, setWeatherAlert] = useState<string | null>(null);

  // Simulation météo SAAQ (hivers québécois)
  useEffect(() => {
    const date = new Date();
    const month = date.getMonth();
    if (month >= 10 || month <= 2) {
      setWeatherAlert("❄️ Alerte de chute de neige — Équipement de pneus d'hiver obligatoire depuis le 1er décembre.");
    } else {
      setWeatherAlert(null);
    }
  }, []);

  return (
    <div className="absolute inset-0 z-40 flex items-end justify-center bg-bg/70 px-3 py-4 backdrop-blur-sm sm:items-center">
      <div className="hud-panel w-full max-w-2xl rounded-xl p-5 !bg-[#14212b]">
        {/* EN-TÊTE PRINCIPALE */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] tracking-[0.35em] text-emerald-400/70 uppercase">Portneuf & Rive-Nord</p>
            <h2 className="font-display text-3xl italic text-white">Dispatch Transport</h2>
            <p className="mt-1 text-sm text-muted">
              6 métiers du Québec — Livreur, Laitier, Camionneur B-Train, Siropier, Taxi, Deneigeur.
            </p>
          </div>
          <button
            type="button"
            className="flex size-11 items-center justify-center rounded-md text-muted hover:text-white"
            onClick={() => useGameStore.getState().closeJobs()}
            aria-label="Fermer les emplois"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* BANNIÈRE D'ALERTE SYNDICALE / MÉTÉO */}
        {union.isStrikeActive && (
          <div className="mt-4 flex items-center gap-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2">
            <AlertTriangle className="size-5 shrink-0 text-red-400" />
            <span className="text-xs text-red-300">
              ⛔ Grève rotative des Teamsters en cours à {union.convoyProtestLocation ? getVillageName(union.convoyProtestLocation.x, union.convoyProtestLocation.z) : "un secteur rural"}. 
              Les livraisons traversant ce point sont à risque +35% paye de danger.
            </span>
          </div>
        )}
        {weatherAlert && (
          <div className="mt-2 flex items-center gap-3 rounded-lg border border-blue-500/30 bg-blue-500/10 px-3 py-2">
            <Snowflake className="size-5 shrink-0 text-blue-300" />
            <span className="text-xs text-blue-200">{weatherAlert}</span>
          </div>
        )}

        {notice && <p className="mt-3 text-sm text-accent">{notice}</p>}

        {/* CONTRAT ACTIF DÉTAILLÉ */}
        {job && (
          <div className="mt-4 rounded-lg border border-emerald-600/30 bg-emerald-900/10 px-3 py-3">
            <div className="flex items-center justify-between">
              <p className="text-[10px] tracking-[0.25em] text-emerald-300 uppercase">Contrat actif</p>
              <span className="rounded bg-emerald-500/20 px-2 py-0.5 text-[10px] font-medium text-emerald-200">EN ROUTE</span>
            </div>
            <p className="font-display text-xl italic text-white">{job.title}</p>
            <div className="mt-2 flex items-center gap-2 text-sm text-muted">
              <MapPin className="size-4 text-emerald-400" />
              <span>{job.loaded ? "Livrer à" : "Charger à"} · {job.loaded ? job.to.name : job.from.name}</span>
              {job.to.sector === "sucre" && <Factory className="size-4 text-amber-400" />}
            </div>
            <div className="mt-2 flex items-center gap-2 text-sm text-muted">
              <Gauge className="size-4 text-emerald-400" />
              <span>{job.weightKg.toLocaleString("fr-CA")} kg</span>
              {job.dangerousGoods && (
                <span className="ml-2 rounded bg-red-500/20 px-1.5 py-0.5 text-[10px] text-red-200">⚠️ MATIÈRE DANGEREUSE</span>
              )}
              {job.perishable && (
                <span className="ml-2 rounded bg-blue-500/20 px-1.5 py-0.5 text-[10px] text-blue-200">❄️ PÉRISSABLE</span>
              )}
            </div>
            <p className="hud-num mt-2 text-lg font-bold text-emerald-300">{formatCad(job.pay)}</p>
            <button
              type="button"
              className="mt-3 h-10 w-full rounded-md border border-red-500/40 bg-red-500/10 text-xs text-red-200 hover:bg-red-500/20"
              onClick={() => useGameStore.getState().abandonJob()}
            >
              ⚠️ Abandonner le contrat (pénalité de réputation)
            </button>
          </div>
        )}

        {/* TABLEAU DE DISPATCH */}
        <div className="mt-4 border-t border-border pt-3">
          <p className="text-[10px] tracking-[0.3em] text-subtle uppercase">Nouvelles courses de quart</p>
          {board.length === 0 ? (
            <p className="mt-2 text-sm text-muted">Aucun chargement disponible pour le moment.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {board.map((offer: HaulJob) => (
                <JobRow key={offer.id} offer={offer} busy={Boolean(job)} />
              ))}
            </ul>
          )}
        </div>

        {/* PIED DE PAGE DES TEAMSTERS */}
        <div className="mt-4 flex items-center justify-between border-t border-border pt-3 text-xs text-muted">
          <span className="flex items-center gap-1.5">
            <Radio className="size-3.5 text-emerald-400" />
            Canal 14 — Dispatch Portneuf
          </span>
          <span className="flex items-center gap-1.5">
            <PhoneCall className="size-3.5 text-emerald-400" />
            418-555-0187
          </span>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// LIGNE DE COURSE QUÉBÉCOISE
// ═══════════════════════════════════════════════════════════

function JobRow({ offer, busy }: { offer: HaulJob; busy: boolean }) {
  const kindIcon = getKindIcon(offer.kind);
  const isDanger = offer.dangerousGoods || isJobBlockedByStrike(offer);

  return (
    <li>
      <button
        type="button"
        disabled={busy}
        onClick={() => {
          useGameStore.getState().acceptJob(offer.id);
          persist();
        }}
        className="flex w-full items-center gap-3 rounded-lg border border-border bg-surface px-3 py-2.5 text-left disabled:opacity-40"
      >
        {/* ICÔNE DU VÉHICULE */}
        <span className={`flex size-10 shrink-0 items-center justify-center rounded-md ${isDanger ? "bg-red-500/20" : "bg-surface-2"}`}>
          {kindIcon}
        </span>

        {/* DÉTAILS DE LA COURSE */}
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-medium text-white">{offer.title}</span>
          <span className="flex items-center gap-1 text-xs text-muted">
            <MapPin className="size-3" />
            {offer.from.name} → {offer.to.name}
          </span>
          <span className="mt-0.5 flex items-center gap-2 text-[10px] text-muted">
            <span>{offer.weightKg.toLocaleString("fr-CA")} kg</span>
            {offer.dangerousGoods && <span className="text-red-400 font-semibold">DG</span>}
            {offer.perishable && <span className="text-blue-300">FROID</span>}
          </span>
        </span>

        {/* PRIX ET PÉNALITÉS */}
        <span className="shrink-0 text-right">
          <span className={`hud-num text-sm font-bold ${busy ? "text-muted" : "text-emerald-300"}`}>
            {formatCad(offer.pay)}
          </span>
          {isJobBlockedByStrike(offer) && (
            <span className="block text-[10px] text-red-400 font-medium">+35% Grève</span>
          )}
        </span>
      </button>
    </li>
  );
}

// ═══════════════════════════════════════════════════════════
// HELPERS D'ICÔNES ET DE GÉOLOCALISATION
// ═══════════════════════════════════════════════════════════

function getKindIcon(kind: HaulKind) {
  switch (kind) {
    case "camionneur_lourd":
      return <Truck className="size-5 text-orange-400" />;
    case "laitier":
      return <Factory className="size-5 text-blue-300" />;
    case "siropier":
      return <Star className="size-5 text-amber-300" />;
    case "deblayeur_neige":
      return <Snowflake className="size-5 text-cyan-300" />;
    case "taxi":
      return <PhoneCall className="size-5 text-yellow-300" />;
    default:
      return <Truck className="size-5 text-emerald-400" />;
  }
}

function isJobBlockedByStrike(job: HaulJob): boolean {
  const union = getUnionState();
  if (!union.isStrikeActive || !union.convoyProtestLocation) return false;
  const mouth = union.convoyProtestLocation;
  const dFrom = Math.hypot(job.from.x - mouth.x, job.from.z - mouth.z);
  const dTo = Math.hypot(job.to.x - mouth.x, job.to.z - mouth.z);
  return dFrom < 120 || dTo < 120;
}

function getVillageName(x: number, z: number): string {
  // Correspondance approximative avec les données géographiques
  return "secteur inconnu";
}

// ═══════════════════════════════════════════════════════════
// EXPORT DES FONCTIONS DE NOTIFICATIONS
// ═══════════════════════════════════════════════════════════

export function triggerJobNotification(title: string, body: string) {
  // Intégration avec phone.tsx pour les push notifications
  if (typeof window !== "undefined") {
    const event = new CustomEvent("phone:notification", {
      detail: { title, body, icon: "🚚" },
    });
    window.dispatchEvent(event);
  }
}