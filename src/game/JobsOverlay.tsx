import { 
  Truck, X, Snowflake, Factory, MapPin, AlertTriangle, 
  Radio, PhoneCall, Star, Briefcase, TrendingUp, Calendar, 
  DollarSign, AlertCircle, CheckCircle 
} from "lucide-react";
import { formatCad } from "./commerce";
import type { HaulJob, HaulKind } from "./jobs";
import { 
  getPlayerContract, 
  JOB_CATALOG 
} from "./jobs"; // NOUVEAU : Import des fonctions de carrière
import { persist, useGameStore } from "./store";
import { getUnionState } from "./haul";
import { useEffect, useState } from "react";

// Stubs professionnels de carrière TroxTWorld
export function evaluateEmployee(playerId: string) {
  return { message: "Félicitations ! Vos supérieurs ont évalué vos performances à 94% ce trimestre. Un bonus de rendement vous est accordé." };
}
export function takeSickDay(playerId: string) {
  return { message: "Votre demande de congé de maladie a été validée pour aujourd'hui. Vos indemnités Desjardins couvriront votre absence." };
}
export function processBiWeeklyPayroll(playerId: string) {
  return { message: "Traitement de paie réussi. Un montant net de 1 485,50 $ CAD a été versé sur votre compte Desjardins." };
}
import { getNearestVillage } from "./worlddata";
import { triggerNotification } from "./phone";

export function JobsOverlay() {
  const board = useGameStore((s) => s.jobBoard);
  const job = useGameStore((s) => s.job);
  const notice = useGameStore((s) => s.notice);
  // Assure-toi que playerId est disponible dans ton store, sinon adapte cette ligne
  const playerId = useGameStore((s) => (s as any).playerId) || "local_player"; 

  const [activeTab, setActiveTab] = useState<"career" | "dispatch">("career");
  const [contract, setContract] = useState<any>(null);
  const union = getUnionState();
  const [weatherAlert, setWeatherAlert] = useState<string | null>(null);

  // Charger les données du contrat au montage
  useEffect(() => {
    const currentContract = getPlayerContract(playerId);
    setContract(currentContract);

    const date = new Date();
    const month = date.getMonth();
    if (month >= 10 || month <= 2) {
      setWeatherAlert("❄️ Alerte de chute de neige — Pneus d'hiver obligatoires depuis le 1er décembre.");
    } else {
      setWeatherAlert(null);
    }
  }, [playerId]);

  // Actions de carrière
  const handleEvaluation = () => {
    const result = evaluateEmployee(playerId);
    triggerNotification("Ressources Humaines", result.message);
    setContract(getPlayerContract(playerId)); // Rafraîchir l'affichage
  };

  const handleSickDay = () => {
    const result = takeSickDay(playerId);
    triggerNotification("Ressources Humaines", result.message);
    setContract(getPlayerContract(playerId));
  };

  const handleClaimPay = () => {
    const result = processBiWeeklyPayroll(playerId);
    triggerNotification("Banque Desjardins", result.message);
    setContract(getPlayerContract(playerId));
  };

  return (
    <div className="absolute inset-0 z-40 flex items-end justify-center bg-bg/70 px-3 py-4 backdrop-blur-sm sm:items-center">
      <div className="hud-panel w-full max-w-2xl rounded-xl p-5 !bg-[#14212b]">
        
        {/* EN-TÊTE PRINCIPALE */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] tracking-[0.35em] text-emerald-400/70 uppercase">Comté de Portneuf & Rive-Nord</p>
            <h2 className="font-display text-3xl italic text-white">Centre d'Emploi & Dispatch</h2>
          </div>
          <button
            type="button"
            className="flex size-11 items-center justify-center rounded-md text-muted hover:text-white"
            onClick={() => useGameStore.getState().closeJobs()}
            aria-label="Fermer"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* ONGLETS DE NAVIGATION */}
        <div className="mt-4 flex gap-2 border-b border-border pb-2">
          <button
            onClick={() => setActiveTab("career")}
            className={`flex items-center gap-2 rounded-t-lg px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === "career" ? "bg-surface-2 text-white" : "text-muted hover:text-white"
            }`}
          >
            <Briefcase className="size-4" /> Mon Emploi
          </button>
          <button
            onClick={() => setActiveTab("dispatch")}
            className={`flex items-center gap-2 rounded-t-lg px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === "dispatch" ? "bg-surface-2 text-white" : "text-muted hover:text-white"
            }`}
          >
            <Truck className="size-4" /> Dispatch Transport
          </button>
        </div>

        {/* CONTENU DE L'ONGLET : MON EMPLOI (CARRIÈRE RÉALISTE) */}
        {activeTab === "career" && (
          <div className="mt-4 space-y-4">
            {!contract ? (
              <div className="rounded-lg border border-border bg-surface/50 p-6 text-center">
                <Briefcase className="mx-auto mb-3 size-10 text-muted" />
                <p className="text-lg font-medium text-white">Vous êtes actuellement sans emploi.</p>
                <p className="mt-1 text-sm text-muted">
                  Passez à l'onglet "Dispatch" pour des gigs, ou rendez-vous dans les bureaux d'embauche en ville.
                </p>
              </div>
            ) : (
              <>
                {/* Carte d'identité professionnelle */}
                <div className="rounded-lg border border-emerald-600/30 bg-emerald-900/10 p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-[10px] tracking-[0.25em] text-emerald-300 uppercase">Poste Actuel</p>
                      <h3 className="font-display text-2xl italic text-white">{contract.jobTitle}</h3>
                      <p className="text-sm text-emerald-200/70">{(JOB_CATALOG as any)[contract.jobId]?.department}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] tracking-[0.25em] text-muted uppercase">Salaire Horaire</p>
                      <p className="hud-num text-xl text-emerald-300">{formatCad(contract.hourlyWage)}/h</p>
                    </div>
                  </div>

                  {/* Statistiques de performance */}
                  <div className="mt-4 grid grid-cols-2 gap-4">
                    <div className="rounded bg-surface/50 p-3">
                      <div className="flex items-center gap-2 text-xs text-muted">
                        <TrendingUp className="size-4 text-blue-400" /> Performance
                      </div>
                      <div className="mt-1 flex items-end gap-2">
                        <span className="text-2xl font-bold text-white">{Math.floor(contract.performanceScore)}%</span>
                        <span className="mb-1 text-xs text-muted">/ 100</span>
                      </div>
                      <div className="mt-2 h-1.5 w-full rounded-full bg-surface-2">
                        <div 
                          className="h-full rounded-full bg-blue-500 transition-all" 
                          style={{ width: `${contract.performanceScore}%` }} 
                        />
                      </div>
                    </div>
                    <div className="rounded bg-surface/50 p-3">
                      <div className="flex items-center gap-2 text-xs text-muted">
                        <DollarSign className="size-4 text-yellow-400" /> Paie en attente (Bi-hebdo)
                      </div>
                      <p className="mt-1 text-2xl font-bold text-yellow-300">{formatCad(contract.accumulatedNetPay)}</p>
                      <p className="text-[10px] text-muted">Prochaine paie automatique dans 14 jours</p>
                    </div>
                  </div>

                  {/* Avertissements */}
                  {contract.warnings > 0 && (
                    <div className="mt-3 flex items-center gap-2 rounded border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
                      <AlertCircle className="size-4 shrink-0" />
                      <span>⚠️ {contract.warnings}/3 avertissements disciplinaires. Risque de licenciement.</span>
                    </div>
                  )}

                  {/* Boutons d'action RH */}
                  <div className="mt-4 grid grid-cols-3 gap-2">
                    <button
                      onClick={handleEvaluation}
                      className="flex items-center justify-center gap-2 rounded-md border border-emerald-500/30 bg-emerald-500/10 py-2 text-xs font-medium text-emerald-300 hover:bg-emerald-500/20"
                    >
                      <CheckCircle className="size-4" /> Évaluation
                    </button>
                    <button
                      onClick={handleSickDay}
                      disabled={contract.sickDaysUsed >= 5}
                      className="flex items-center justify-center gap-2 rounded-md border border-blue-500/30 bg-blue-500/10 py-2 text-xs font-medium text-blue-300 hover:bg-blue-500/20 disabled:opacity-40"
                    >
                      <Calendar className="size-4" /> Jour Maladie ({5 - contract.sickDaysUsed})
                    </button>
                    <button
                      onClick={handleClaimPay}
                      disabled={contract.accumulatedNetPay <= 0}
                      className="flex items-center justify-center gap-2 rounded-md border border-yellow-500/30 bg-yellow-500/10 py-2 text-xs font-medium text-yellow-300 hover:bg-yellow-500/20 disabled:opacity-40"
                    >
                      <DollarSign className="size-4" /> Réclamer Paie
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* CONTENU DE L'ONGLET : DISPATCH TRANSPORT (TON CODE EXISTANT AMÉLIORÉ) */}
        {activeTab === "dispatch" && (
          <div className="mt-4 space-y-4">
            {/* BANNIÈRE D'ALERTE SYNDICALE / MÉTÉO */}
            {union.isStrikeActive && (
              <div className="flex items-center gap-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2">
                <AlertTriangle className="size-5 shrink-0 text-red-400" />
                <span className="text-xs text-red-300">
                  ⛔ Grève rotative des Teamsters en cours à {union.convoyProtestLocation ? getVillageName(union.convoyProtestLocation.x, union.convoyProtestLocation.z) : "un secteur rural"}. 
                  Les livraisons traversant ce point sont à risque (+35% paye de danger).
                </span>
              </div>
            )}
            {weatherAlert && (
              <div className="flex items-center gap-3 rounded-lg border border-blue-500/30 bg-blue-500/10 px-3 py-2">
                <Snowflake className="size-5 shrink-0 text-blue-300" />
                <span className="text-xs text-blue-200">{weatherAlert}</span>
              </div>
            )}
            {notice && <p className="text-sm text-accent">{notice}</p>}

            {/* CONTRAT ACTIF DÉTAILLÉ */}
            {job && (
              <div className="rounded-lg border border-emerald-600/30 bg-emerald-900/10 px-3 py-3">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] tracking-[0.25em] text-emerald-300 uppercase">Contrat actif</p>
                  <span className="rounded bg-emerald-500/20 px-2 py-0.5 text-[10px] font-medium text-emerald-200">EN ROUTE</span>
                </div>
                <p className="font-display text-xl italic text-white">{job.title}</p>
                <div className="mt-2 flex items-center gap-2 text-sm text-muted">
                  <MapPin className="size-4 text-emerald-400" />
                  <span>{job.loaded ? "Livrer à" : "Charger à"} · {job.loaded ? job.to.name : job.from.name}</span>
                  {(job.to as any).sector === "sucre" && <Factory className="size-4 text-amber-400" />}
                </div>
                <div className="mt-2 flex items-center gap-2 text-sm text-muted">
                  <span className="text-xs">{job.weightKg.toLocaleString("fr-CA")} kg</span>
                  {job.dangerousGoods && <span className="rounded bg-red-500/20 px-1.5 py-0.5 text-[10px] text-red-200">⚠️ DG</span>}
                  {job.perishable && <span className="rounded bg-blue-500/20 px-1.5 py-0.5 text-[10px] text-blue-200">❄️ PÉRISSABLE</span>}
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
            <div className="border-t border-border pt-3">
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
          </div>
        )}

        {/* PIED DE PAGE */}
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
// COMPOSANTS SECONDAIRES (Conservés de ton code original)
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
        <span className={`flex size-10 shrink-0 items-center justify-center rounded-md ${isDanger ? "bg-red-500/20" : "bg-surface-2"}`}>
          {kindIcon}
        </span>
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

function getKindIcon(kind: HaulKind) {
  switch (kind) {
    case "camionneur_lourd": return <Truck className="size-5 text-orange-400" />;
    case "laitier": return <Factory className="size-5 text-blue-300" />;
    case "siropier": return <Star className="size-5 text-amber-300" />;
    case "deblayeur_neige": return <Snowflake className="size-5 text-cyan-300" />;
    case "taxi": return <PhoneCall className="size-5 text-yellow-300" />;
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
  return village?.name ?? "secteur inconnu";
}