/**
 * 💼 PANNEAU CARRIÈRES, CONTRATS & DISPATCH TRANSPORT — TROXTWORLD
 * Fichier: src/game/JobsOverlay.tsx
 */
import { useEffect, useState, useCallback, useRef } from "react";
import { 
  Truck, X, Snowflake, Factory, MapPin, AlertTriangle, 
  Radio, PhoneCall, Star, Briefcase, TrendingUp, Calendar, 
  DollarSign, AlertCircle, CheckCircle, ShieldAlert, PocketKnife, Loader2
} from "lucide-react";
import { formatCad } from "./commerce";
import { useGameStore, persist } from "./store";
import { getUnionState } from "./haul";
import { getNearestVillage } from "./worlddata";
import { triggerNotification } from "./phone";
import { jobsApi } from "./rpApi"; // NOUVEAU : Connexion directe au pont d'API serveur

export interface HaulJob {
  id: string;
  kind: string;
  title: string;
  from: { name: string; x: number; z: number };
  to: { name: string; x: number; z: number };
  reward: number;
  pay: number;
  cargoKg: number;
  weightKg: number;
  loaded: boolean;
  dangerousGoods: boolean;
  perishable: boolean;
}

export function JobsOverlay() {
  const board = useGameStore((s) => s.jobBoard);
  const activeGig = useGameStore((s) => s.job);
  const notice = useGameStore((s) => s.notice);
  const closeJobs = useGameStore((s) => s.closeJobs);
  const playerId = useGameStore((s) => s.playerId) || "local_player";

  const [activeTab, setActiveTab] = useState<"career" | "dispatch">("career");
  const [contract, setContract] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [weatherAlert, setWeatherAlert] = useState<string | null>(null);

  // Valeurs calculées en temps réel (pour le chronomètre du shift actif)
  const [liveShiftHours, setLiveShiftHours] = useState(0);
  const [liveShiftEarnings, setLiveShiftEarnings] = useState(0);

  const union = getUnionState();

  // 1. Charger le contrat du joueur depuis le serveur PostgreSQL / PGlite
  const fetchContract = useCallback(async () => {
    setIsLoading(true);
    const res = await jobsApi.getMyContract();
    setIsLoading(false);
    if (res.ok && res.data?.employed) {
      setContract(res.data.contract);
    } else {
      setContract(null);
    }
  }, []);

  useEffect(() => {
    void fetchContract();

    const date = new Date();
    const month = date.getMonth();
    if (month >= 10 || month <= 2) {
      setWeatherAlert("❄️ Alerte de voirie MTQ — Chaussée glissante sur la 138. Pneus d'hiver obligatoires.");
    } else {
      setWeatherAlert(null);
    }
  }, [fetchContract]);

  // 2. Chronomètre en temps réel du quart de travail en cours
  useEffect(() => {
    if (!contract?.activeShift) {
      setLiveShiftHours(0);
      setLiveShiftEarnings(0);
      return;
    }

    const interval = setInterval(() => {
      const elapsedMs = Date.now() - contract.activeShift.clockedInAt;
      const hours = Math.round((elapsedMs / 3600000) * 1000) / 1000;
      setLiveShiftHours(hours);
      setLiveShiftEarnings(Math.round(hours * contract.hourlyWage * 100) / 100);
    }, 1000);

    return () => clearInterval(interval);
  }, [contract]);

  // ─── ACTIONS DE CARRIÈRE (RESEAU) ──────────────────────────────────────────

  const handleClockIn = async () => {
    setIsLoading(true);
    const res = await jobsApi.clockIn();
    setIsLoading(false);
    if (res.ok) {
      triggerNotification("Ressources Humaines", res.data.message);
      void fetchContract();
    } else {
      triggerNotification("Erreur de pointage", res.error || "Impossible de débuter le quart.");
    }
  };

  const handleClockOut = async () => {
    setIsLoading(true);
    const res = await jobsApi.clockOut();
    setIsLoading(false);
    if (res.ok) {
      triggerNotification("Caisse Desjardins", res.data.message);
      void fetchContract();
    } else {
      triggerNotification("Erreur de pointage", res.error || "Impossible de terminer le quart.");
    }
  };

  const handleCNESSTClaim = async () => {
    if (window.confirm("Déclarer un accident de travail pour blessure corporelle à la CNESST ?")) {
      setIsLoading(true);
      const res = await jobsApi.reportInjury("Entorse lombaire sévère survenue lors d'un effort physique");
      setIsLoading(false);
      if (res.ok) {
        triggerNotification("CNESST Québec", res.data.message);
        void fetchContract();
      } else {
        triggerNotification("CNESST", res.error || "Dossier refusé.");
      }
    }
  };

  const handleQuitJob = async () => {
    if (window.confirm("Voulez-vous vraiment démissionner et résilier votre contrat d'embauche ?")) {
      setIsLoading(true);
      const res = await jobsApi.quit();
      setIsLoading(false);
      if (res.ok) {
        triggerNotification("Ressources Humaines", res.data.message);
        void fetchContract();
      }
    }
  };

  return (
    <div className="absolute inset-0 z-40 flex items-end justify-center bg-black/75 px-3 py-4 backdrop-blur-md sm:items-center">
      <div className="flex max-h-[92dvh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#111922]/95 p-6 shadow-2xl text-neutral-200">
        
        {/* EN-TÊTE PRINCIPALE */}
        <div className="flex items-start justify-between gap-3 border-b border-white/5 pb-4">
          <div>
            <p className="text-[10px] font-semibold tracking-[0.35em] text-emerald-400 uppercase">Ministère du Travail & SAAQ</p>
            <h2 className="font-serif text-3xl font-bold italic text-white mt-0.5">Emplois & Dispatch</h2>
          </div>
          <button
            type="button"
            className="flex size-10 items-center justify-center rounded-xl bg-white/5 text-neutral-400 hover:bg-white/10 hover:text-white transition-all"
            onClick={closeJobs}
            aria-label="Fermer"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* ONGLETS DE NAVIGATION */}
        <div className="mt-4 flex gap-1 bg-black/20 p-1 rounded-lg border border-white/5">
          <button
            onClick={() => { setActiveTab("career"); void fetchContract(); }}
            className={`flex flex-1 items-center justify-center gap-2 rounded-md py-2.5 text-xs font-bold transition-all ${
              activeTab === "career" ? "bg-white/10 text-white shadow-sm" : "text-neutral-400 hover:text-white"
            }`}
          >
            <Briefcase className="size-4" />
            Mon Dossier Carrière
          </button>
          <button
            onClick={() => setActiveTab("dispatch")}
            className={`flex flex-1 items-center justify-center gap-2 rounded-md py-2.5 text-xs font-bold transition-all ${
              activeTab === "dispatch" ? "bg-white/10 text-white shadow-sm" : "text-neutral-400 hover:text-white"
            }`}
          >
            <Truck className="size-4" />
            Dispatch Fret & Gigs
          </button>
        </div>

        {/* CORPS DE L'ONGLET (Déroulant) */}
        <div className="flex-1 min-h-0 overflow-y-auto py-4">
          {isLoading && (
            <div className="flex items-center justify-center py-12 gap-2 text-xs text-emerald-400 font-mono">
              <Loader2 className="size-4 animate-spin" />
              <span>Synchronisation en cours...</span>
            </div>
          )}

          {/* CONTENU : MON EMPLOI (CARRIÈRE RÉALISTE) */}
          {activeTab === "career" && !isLoading && (
            <div className="space-y-4">
              {!contract ? (
                <div className="rounded-xl border border-white/5 bg-white/[0.02] p-8 text-center text-neutral-400">
                  <Briefcase className="mx-auto mb-3 size-12 stroke-[1.25] text-neutral-500 animate-pulse" />
                  <p className="text-base font-semibold text-white">Vous n'avez pas de contrat d'embauche.</p>
                  <p className="mt-1.5 text-xs max-w-sm mx-auto leading-relaxed">
                    Visitez un lieu d'embauche du comté (Chantiers, SQDC, Poste de police, Garages) ou démarrez un boulot d'appoint dans l'onglet "Dispatch".
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Carte d'identité professionnelle PBR */}
                  <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.03] p-5">
                    <div className="flex items-start justify-between border-b border-emerald-500/10 pb-4">
                      <div>
                        <p className="text-[10px] font-bold tracking-[0.25em] text-emerald-400 uppercase">Titre Professionnel</p>
                        <h3 className="font-serif text-2xl font-bold italic text-white mt-1">{contract.jobTitle}</h3>
                        <p className="text-xs text-emerald-300/60 font-medium mt-0.5">Secteur d'activité syndiqué</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-bold tracking-[0.25em] text-neutral-500 uppercase">Taux Horaire</p>
                        <p className="font-mono text-xl font-bold text-emerald-400 mt-1">{formatCad(contract.hourlyWage)}/h</p>
                      </div>
                    </div>

                    {/* Affichage du quart de travail actif */}
                    {contract.isOnDuty && contract.activeShift ? (
                      <div className="mt-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-3.5 space-y-1">
                        <div className="flex items-center justify-between text-xs font-semibold text-emerald-400">
                          <span className="flex items-center gap-1.5 animate-pulse">
                            <span className="h-2 w-2 rounded-full bg-emerald-400" />
                            Quart en cours...
                          </span>
                          <span className="font-mono text-[10px]">ID: {contract.activeShift.shiftId}</span>
                        </div>
                        <div className="flex justify-between text-sm pt-2">
                          <span className="text-neutral-400">Durée du quart :</span>
                          <span className="font-mono font-bold text-white">{liveShiftHours.toFixed(3)} heures</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-neutral-400">Salaire brut accumulé :</span>
                          <span className="font-mono font-bold text-white text-base">{formatCad(liveShiftEarnings)}</span>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-4 rounded-lg bg-neutral-950/20 border border-white/5 p-3 text-center text-xs text-neutral-400">
                        Vous n'êtes pas en service. Poinçonnez pour commencer à accumuler votre salaire.
                      </div>
                    )}

                    {/* Statistiques cumulées */}
                    <div className="mt-4 grid grid-cols-2 gap-3">
                      <div className="rounded-lg bg-black/25 p-3 border border-white/5">
                        <div className="flex items-center gap-2 text-[10px] uppercase font-bold text-neutral-400">
                          <TrendingUp className="size-3.5 text-cyan-400" /> Expérience Cumulée
                        </div>
                        <p className="mt-1 text-lg font-bold text-white">{contract.hoursWorkedTotal.toFixed(1)}h</p>
                        <p className="text-[10px] text-neutral-500 mt-0.5">Heures de service totales</p>
                      </div>
                      <div className="rounded-lg bg-black/25 p-3 border border-white/5">
                        <div className="flex items-center gap-2 text-[10px] uppercase font-bold text-neutral-400">
                          <DollarSign className="size-3.5 text-yellow-400" /> Gains de Carrière
                        </div>
                        <p className="mt-1 text-lg font-bold text-yellow-400">{formatCad(contract.careerEarningsTotal)}</p>
                        <p className="text-[10px] text-neutral-500 mt-0.5">Revenus nets Desjardins</p>
                      </div>
                    </div>

                    {/* Actions de Pointage et Médicales */}
                    <div className="mt-4 grid grid-cols-3 gap-2">
                      {!contract.isOnDuty ? (
                        <button
                          type="button"
                          onClick={handleClockIn}
                          className="flex h-10 items-center justify-center gap-2 rounded-xl bg-emerald-400 text-black text-xs font-bold uppercase transition-all hover:bg-emerald-300"
                        >
                          Poinçonner (In)
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={handleClockOut}
                          className="flex h-10 items-center justify-center gap-2 rounded-xl bg-red-500 text-white text-xs font-bold uppercase transition-all hover:bg-red-400"
                        >
                          Terminer (Out)
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={handleCNESSTClaim}
                        disabled={contract.cnesstActive}
                        className="flex h-10 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 text-xs font-bold hover:bg-red-500/10 hover:text-red-400 disabled:opacity-30 transition-all"
                      >
                        <ShieldAlert className="size-4" />
                        Accident (CNESST)
                      </button>

                      <button
                        type="button"
                        onClick={handleQuitJob}
                        className="flex h-10 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 text-xs font-bold text-neutral-400 hover:bg-red-500/10 hover:text-red-400 transition-all"
                      >
                        Démissionner
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* CONTENU : DISPATCH TRANSPORT */}
          {activeTab === "dispatch" && (
            <div className="space-y-4">
              {/* BANNIÈRE D'ALERTE SYNDICALE / MÉTÉO */}
              {union.isStrikeActive && (
                <div className="flex items-center gap-3 rounded-xl border border-red-500/20 bg-red-500/[0.03] p-3 text-xs text-red-400">
                  <AlertTriangle className="size-5 shrink-0 animate-bounce" />
                  <span>
                    <strong>Grève des Teamsters :</strong> Piquet de grève actif à {union.convoyProtestLocation ? getVillageName(union.convoyProtestLocation.x, union.convoyProtestLocation.z) : "un secteur rural"}. +35% de prime de danger pour les traversées.
                  </span>
                </div>
              )}
              {weatherAlert && (
                <div className="flex items-center gap-3 rounded-xl border border-blue-500/20 bg-blue-500/[0.03] p-3 text-xs text-blue-300">
                  <Snowflake className="size-5 shrink-0" />
                  <span>{weatherAlert}</span>
                </div>
              )}

              {/* CONTRAT DE DISPATCH ACTIF */}
              {activeGig && (
                <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.03] p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold tracking-[0.25em] text-emerald-400 uppercase">Contrat de Fret en cours</span>
                    <span className="rounded bg-emerald-500/20 px-2 py-0.5 text-[9px] font-bold text-emerald-300 uppercase animate-pulse">En Transit</span>
                  </div>
                  <div>
                    <h4 className="font-serif text-xl font-bold italic text-white">{activeGig.title}</h4>
                    <p className="flex items-center gap-1.5 text-xs text-neutral-400 mt-1">
                      <MapPin className="size-3.5 text-neutral-500" />
                      {activeGig.loaded ? "Destination" : "Lieu de chargement"} : <strong>{activeGig.loaded ? activeGig.to.name : activeGig.from.name}</strong>
                    </p>
                  </div>

                  <div className="flex items-center gap-2 text-[10px] font-bold uppercase">
                    <span className="bg-black/30 border border-white/5 rounded px-2 py-0.5 text-neutral-300">
                      {activeGig.weightKg.toLocaleString("fr-CA")} kg
                    </span>
                    {activeGig.dangerousGoods && (
                      <span className="bg-red-500/10 border border-red-500/20 text-red-400 rounded px-2 py-0.5">
                        Matières Dangereuses
                      </span>
                    )}
                    {activeGig.perishable && (
                      <span className="bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded px-2 py-0.5">
                        Froid / Périssable
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between border-t border-white/5 pt-3 mt-2">
                    <span className="font-mono text-xl font-bold text-emerald-400">{formatCad(activeGig.pay)}</span>
                    <button
                      type="button"
                      onClick={() => useGameStore.getState().abandonJob()}
                      className="rounded-lg border border-red-500/15 bg-red-500/5 px-3 py-1.5 text-[10px] font-bold text-red-400 hover:bg-red-500/10 transition-colors"
                    >
                      Abandonner le fret
                    </button>
                  </div>
                </div>
              )}

              {/* TABLEAU DES COURSES DISPONIBLES */}
              <div className="border-t border-white/5 pt-4 space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">Offres de chargement disponibles ({board.length})</p>
                {board.length === 0 ? (
                  <p className="text-xs text-neutral-500 italic py-4 text-center">Aucune cargaison disponible dans le comté.</p>
                ) : (
                  <ul className="space-y-2">
                    {board.map((offer: HaulJob) => (
                      <JobRow key={offer.id} offer={offer} busy={Boolean(activeGig)} />
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
        </div>

        {/* PIED DE PAGE */}
        <div className="mt-auto flex items-center justify-between border-t border-white/5 pt-3 text-[10px] font-mono text-neutral-500">
          <span className="flex items-center gap-1.5">
            <Radio className="size-3.5 text-neutral-600" />
            Canal CB 14 · Dispatch Portneuf
          </span>
          <span className="flex items-center gap-1.5">
            <PhoneCall className="size-3.5 text-neutral-600" />
            418-555-0187
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── COMPOSANTS SECONDAIRES ─────────────────────────────────────────────────

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
        className="flex w-full items-center gap-3 rounded-xl border border-white/5 bg-white/[0.02] p-3 text-left hover:bg-white/[0.04] disabled:opacity-30 disabled:pointer-events-none transition-all"
      >
        <span className={`flex size-11 shrink-0 items-center justify-center rounded-xl ${isDanger ? "bg-red-500/10 border border-red-500/20" : "bg-black/30 border border-white/5"}`}>
          {kindIcon}
        </span>
        
        <div className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-white truncate">{offer.title}</span>
          <span className="flex items-center gap-1 text-xs text-neutral-400 mt-0.5 truncate">
            <MapPin className="size-3" />
            {offer.from.name} → {offer.to.name}
          </span>
          <div className="flex items-center gap-2 mt-1 text-[10px] font-bold uppercase">
            <span className="text-neutral-500">{offer.weightKg.toLocaleString("fr-CA")} kg</span>
            {offer.dangerousGoods && <span className="text-red-400">Matières Dangereuses</span>}
            {offer.perishable && <span className="text-blue-400">Froid</span>}
          </div>
        </div>

        <div className="shrink-0 text-right">
          <span className={`font-mono text-sm font-bold ${busy ? "text-neutral-500" : "text-emerald-400"}`}>
            {formatCad(offer.pay)}
          </span>
          {isJobBlockedByStrike(offer) && (
            <span className="block text-[9px] text-red-400 font-bold uppercase mt-0.5">Bonus grève +35%</span>
          )}
        </div>
      </button>
    </li>
  );
}

function getKindIcon(kind: string) {
  switch (kind) {
    case "camionneur_lourd": return <Truck className="size-5 text-amber-500" />;
    case "laitier": return <Factory className="size-5 text-blue-400" />;
    case "siropier": return <Star className="size-5 text-yellow-400" />;
    case "deblayeur_neige": return <Snowflake className="size-5 text-cyan-400" />;
    case "taxi": return <PhoneCall className="size-5 text-yellow-400" />;
    default: return <Truck className="size-5 text-emerald-400" />;
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
  const village = getNearestVillage(x, z);
  return village?.name ?? "secteur rural";
}