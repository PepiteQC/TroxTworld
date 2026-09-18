import { 
  Building2, 
  CheckCircle2, 
  CreditCard, 
  FileText, 
  Flame, 
  Hammer, 
  Home, 
  KeyRound, 
  Landmark, 
  Lock, 
  ThermometerSnowflake, 
  Unlock, 
  Wallet, 
  Wrench, 
  X, 
  Zap 
} from "lucide-react";
import { useEffect, useState } from "react";
import { atmStatus } from "./banking";
import { formatCad } from "./commerce";
import type { PortneufEngine } from "./engine";
import {
  BASEMENT_FITS,
  DOOR_SLOTS,
  GARAGE_BAYS,
  GARAGE_FITS,
  KEY_ROLES,
  RENO_CATALOG,
  emptyHouse,
  hasReno,
  type RenoGroup,
} from "./house";
import { deedById, withTax } from "./rp";
import {
  KIND_LABEL,
  ZONE_LABEL,
  conditionOf,
  evaluatedValue,
  isHouseDeed,
  ownedIds,
  propertyById,
} from "./realestate";
import { useGameStore } from "./store";
import {
  HEAT_CATALOG,
  WATER_CATALOG,
  FURNACE_REPAIR,
  PIPE_THAW,
  heatById,
  heatHint,
  monthlyBill,
  outageLabel,
  waterById,
} from "./utilities";

// NIP par défaut membre Desjardins
const CAISSE_NIP = "1234";
const AMOUNTS = [20, 40, 60, 100, 200, 500];

type AtmUi =
  | "idle"
  | "pin"
  | "menu"
  | "amount"
  | "deposit"
  | "transfer"
  | "processing"
  | "balance"
  | "receipt"
  | "error";

// ═════════════════════════════════════════════════════════════════════════════
// 1. GUICHET AUTOMATIQUE BANCAIRE (GAB DESJARDINS ACCÈSD)
// ═════════════════════════════════════════════════════════════════════════════

export function AtmOverlay() {
  const cash = useGameStore((s) => s.cash);
  const bank = useGameStore((s) => s.bank);
  const notice = useGameStore((s) => s.notice);
  const atmId = useGameStore((s) => s.atmId);
  const economy = useGameStore((s) => s.economy);
  const firm = useGameStore((s) => s.firm);

  const [ui, setUi] = useState<AtmUi>("idle");
  const [pin, setPin] = useState("");
  const [amount, setAmount] = useState(20);
  const [mode, setMode] = useState<"withdraw" | "deposit" | "to-firm" | "from-firm">("withdraw");
  const [err, setErr] = useState("");

  const vault = atmStatus(economy, atmId);
  const desk = (atmId ?? "").startsWith("desk") || atmId === "atm_caisse";
  const locked = economy.locked;

  useEffect(() => {
    if (ui !== "processing") return;
    const t = window.setTimeout(() => {
      const st = useGameStore.getState();
      let ok = false;
      if (mode === "to-firm" || mode === "from-firm") {
        ok = st.transferBank(mode, amount);
      } else {
        ok = st.atmOp(mode, amount);
      }
      setUi(ok ? "receipt" : "error");
      if (!ok) setErr(useGameStore.getState().notice || "Transaction refusée par l'institution");
    }, 850);
    return () => window.clearTimeout(t);
  }, [ui, mode, amount]);

  const digit = (d: string) => {
    if (pin.length >= 4) return;
    setPin(pin + d);
  };

  const confirmPin = () => {
    if (pin === economy.pin || pin === CAISSE_NIP) {
      setUi("menu");
      setErr("");
    } else {
      setErr("NIP invalide. 3 essais avant blocage.");
      setPin("");
    }
  };

  return (
    <div className="absolute inset-0 z-40 flex items-end justify-center bg-bg/85 px-3 py-4 backdrop-blur-md sm:items-center">
      <div className="w-full max-w-sm rounded-2xl border border-border-strong bg-surface p-4 shadow-2xl">
        {/* En-tête GAB */}
        <div className="flex items-start justify-between gap-3 border-b border-border pb-3">
          <div className="flex items-center gap-2">
            <div className="flex size-9 items-center justify-center rounded-lg bg-[#005c3e] text-white">
              <Landmark className="size-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold tracking-[0.2em] text-accent uppercase">Réseau AccèsD · Interac</p>
              <h2 className="font-display text-xl italic font-black text-fg">Caisse Desjardins</h2>
            </div>
          </div>
          <button
            type="button"
            className="flex size-9 items-center justify-center rounded-lg text-muted hover:bg-surface-2 hover:text-fg transition-colors"
            onClick={() => useGameStore.getState().closeAtm()}
            aria-label="Fermer le guichet"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Écran cathodique / digital du guichet Desjardins */}
        <div className="mt-3 rounded-xl border border-[#0e4832] bg-[#072419] p-4 text-center text-[#e5f5ec] shadow-inner">
          {ui === "idle" && (
            <>
              <p className="font-display text-2xl italic font-bold">
                {vault.broken ? "Guichet hors d'usage" : "Bienvenue chez Desjardins"}
              </p>
              <p className="mt-1 text-xs text-[#8cd6b4]">
                {vault.broken
                  ? "Appel de service logé chez Diebold"
                  : locked
                  ? "Carte retenue par mesure de sécurité"
                  : "Insérez votre carte de débit ou crédit pour débuter"}
              </p>
            </>
          )}

          {ui === "pin" && (
            <>
              <p className="text-xs font-semibold uppercase tracking-wider text-[#8cd6b4]">Authentification membre</p>
              <p className="mt-1 text-sm text-fg">Composez votre NIP confidentiel</p>
              <p className="mt-2 font-display text-3xl tracking-[0.45em] text-accent">
                {[0, 1, 2, 3].map((i) => (i < pin.length ? "●" : "○")).join(" ")}
              </p>
              {err && <p className="mt-2 text-xs font-bold text-danger animate-pulse">{err}</p>}
              <p className="mt-2 text-[10px] text-subtle">NIP de démonstration : 1234</p>
            </>
          )}

          {ui === "menu" && (
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-[#8cd6b4]">Session active · Compte Chèques</p>
              <p className="mt-1 font-display text-xl italic font-bold">Que désirez-vous faire ?</p>
            </div>
          )}

          {(ui === "amount" || ui === "deposit" || ui === "transfer") && (
            <>
              <p className="text-xs font-bold uppercase tracking-wider text-[#8cd6b4]">
                {ui === "deposit"
                  ? "Dépôt d'espèces"
                  : ui === "transfer"
                  ? "Virement commercial (REQ)"
                  : "Retrait d'argent comptant"}
              </p>
              <p className="mt-1 font-display text-3xl italic font-black text-fg">{formatCad(amount)}</p>
              {ui === "amount" && (
                <p className="mt-1 text-[11px] text-[#8cd6b4]">
                  Billets de 20 $ CAD · {desk ? "Comptoir caissier" : `Réserve GAB : ${formatCad(vault.cash ?? 0)}`}
                </p>
              )}
            </>
          )}

          {ui === "processing" && (
            <div className="py-2">
              <p className="font-display text-xl italic font-bold animate-pulse">Communication avec la Caisse…</p>
              <p className="mt-1 text-xs text-[#8cd6b4]">Vérification du solde et comptage des billets</p>
            </div>
          )}

          {ui === "balance" && (
            <>
              <p className="text-xs font-bold uppercase tracking-wider text-[#8cd6b4]">État de compte officiel</p>
              <p className="mt-1 font-display text-3xl italic font-black text-fg">{formatCad(bank)}</p>
              <p className="mt-1 text-xs text-[#8cd6b4]">
                Liquidités en poche : <strong className="text-fg">{formatCad(cash)}</strong>
              </p>
            </>
          )}

          {ui === "receipt" && (
            <div className="py-1">
              <CheckCircle2 className="mx-auto size-7 text-ok" />
              <p className="mt-1 font-display text-xl italic font-bold text-ok">Transaction approuvée</p>
              <p className="text-xs text-[#8cd6b4]">N'oubliez pas votre carte et vos billets.</p>
            </div>
          )}

          {ui === "error" && (
            <div className="py-1">
              <p className="font-display text-xl italic font-bold text-danger">Transaction refusée</p>
              <p className="mt-1 text-xs text-danger/90">{err || notice || "Fonds insuffisants ou limite dépassée."}</p>
            </div>
          )}
        </div>

        {/* Clavier et actions GAB */}
        {ui === "idle" && !vault.broken && !locked && (
          <button
            type="button"
            className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-accent text-sm font-bold text-accent-fg hover:opacity-90 transition-opacity"
            onClick={() => setUi("pin")}
          >
            <CreditCard className="size-4" />
            Insérer la carte de débit
          </button>
        )}

        {ui === "pin" && (
          <div className="mt-3 grid grid-cols-3 gap-1.5">
            {["1", "2", "3", "4", "5", "6", "7", "8", "9", "C", "0", "OK"].map((k) => (
              <button
                key={k}
                type="button"
                className={`h-11 rounded-lg border text-sm font-bold transition-all ${
                  k === "C"
                    ? "border-danger/30 bg-danger/10 text-danger hover:bg-danger/20"
                    : k === "OK"
                    ? "border-ok/30 bg-ok/15 text-ok hover:bg-ok/25 font-black"
                    : "border-border bg-surface-2 hover:bg-surface hover:border-border-strong text-fg"
                }`}
                onClick={() => {
                  if (k === "C") {
                    setPin("");
                    setErr("");
                  } else if (k === "OK") confirmPin();
                  else digit(k);
                }}
              >
                {k === "C" ? "Effacer" : k === "OK" ? "Valider" : k}
              </button>
            ))}
          </div>
        )}

        {ui === "menu" && (
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              type="button"
              className="h-11 rounded-lg border border-border bg-surface-2 p-2 text-left text-xs font-bold hover:border-accent hover:bg-surface transition-all"
              onClick={() => { setMode("withdraw"); setUi("amount"); }}
            >
              💵 1 — Retrait comptant
            </button>
            <button
              type="button"
              className="h-11 rounded-lg border border-border bg-surface-2 p-2 text-left text-xs font-bold hover:border-accent hover:bg-surface transition-all"
              onClick={() => { setMode("deposit"); setUi("deposit"); }}
            >
              📥 2 — Dépôt d'argent
            </button>
            <button
              type="button"
              className="h-11 rounded-lg border border-border bg-surface-2 p-2 text-left text-xs font-bold hover:border-accent hover:bg-surface transition-all"
              onClick={() => setUi("balance")}
            >
              📄 3 — Vérifier solde
            </button>
            <button
              type="button"
              className="h-11 rounded-lg border border-border bg-surface-2 p-2 text-left text-xs font-bold disabled:opacity-40 hover:border-accent hover:bg-surface transition-all"
              disabled={!firm}
              onClick={() => { setMode("to-firm"); setUi("transfer"); }}
            >
              🏢 4 — Virement REQ
            </button>
            <button
              type="button"
              className="col-span-2 h-9 rounded-lg border border-border text-xs text-muted hover:text-fg hover:bg-surface-2 transition-colors"
              onClick={() => { setUi("idle"); setPin(""); }}
            >
              0 — Annuler et éjecter la carte
            </button>
          </div>
        )}

        {(ui === "amount" || ui === "deposit" || ui === "transfer") && (
          <div className="mt-3 space-y-2">
            <div className="grid grid-cols-3 gap-1.5">
              {AMOUNTS.map((n) => (
                <button
                  key={n}
                  type="button"
                  className={`h-9 rounded-lg border text-xs font-bold transition-all ${
                    amount === n
                      ? "border-accent bg-accent text-accent-fg"
                      : "border-border bg-surface-2 text-muted hover:border-border-strong hover:text-fg"
                  }`}
                  onClick={() => setAmount(n)}
                >
                  {n} $ CAD
                </button>
              ))}
            </div>

            <button
              type="button"
              className="h-11 w-full rounded-lg bg-accent text-sm font-bold text-accent-fg hover:opacity-90 transition-opacity"
              onClick={() => setUi("processing")}
            >
              Confirmer l'opération ({formatCad(amount)})
            </button>

            <button
              type="button"
              className="h-9 w-full rounded-lg border border-border text-xs text-muted hover:text-fg"
              onClick={() => setUi("menu")}
            >
              Retour au menu principal
            </button>
          </div>
        )}

        {(ui === "balance" || ui === "receipt" || ui === "error") && (
          <button
            type="button"
            className="mt-3 h-11 w-full rounded-lg bg-surface-2 border border-border-strong text-sm font-bold text-fg hover:bg-surface transition-colors"
            onClick={() => {
              setUi("idle");
              setPin("");
              setErr("");
            }}
          >
            Terminer et reprendre ma carte
          </button>
        )}

        {notice && ui === "receipt" && <p className="mt-2 text-center text-xs text-accent font-medium">{notice}</p>}

        <p className="mt-3 flex items-center justify-between border-t border-border pt-2 text-[10px] text-subtle">
          <span className="flex items-center gap-1">
            <Wallet className="size-3 text-accent" />
            Solde chèques : <strong className="text-fg">{formatCad(bank)}</strong>
          </span>
          <span>Espèces : <strong className="text-fg">{formatCad(cash)}</strong></span>
        </p>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// 2. GESTION IMMOBILIÈRE, ACTES NOTARIÉS & CENTRIS / TAL
// ═════════════════════════════════════════════════════════════════════════════

const TABS: { id: "travaux" | "garage" | "cles" | "services" | "marche"; label: string }[] = [
  { id: "travaux", label: "Travaux RBQ" },
  { id: "garage", label: "Garage" },
  { id: "cles", label: "Serrurerie" },
  { id: "services", label: "Hydro & Chauffage" },
  { id: "marche", label: "Centris & Baux" },
];

const GROUPS: { id: RenoGroup; label: string }[] = [
  { id: "maison", label: "Bâtiment principal" },
  { id: "soussol", label: "Sous-sol & Fondation" },
  { id: "garage", label: "Garage & Atelier" },
  { id: "terrain", label: "Terrain & Aménagement" },
];

export function DeedOverlay({ engine }: { engine: PortneufEngine | null }) {
  const deedId = useGameStore((s) => s.deedId);
  const owned = useGameStore((s) => s.ownedProps);
  const cash = useGameStore((s) => s.cash);
  const bank = useGameStore((s) => s.bank);
  const notice = useGameStore((s) => s.notice);
  const houses = useGameStore((s) => s.houses);
  const inventory = useGameStore((s) => s.inventory);
  const realty = useGameStore((s) => s.realty);

  const [tab, setTab] = useState<"travaux" | "garage" | "cles" | "services" | "marche">("travaux");

  const prop = propertyById(deedId ?? "");
  const deed = deedById(deedId ?? "");

  if (!prop && !deed) return null;

  const p = prop ?? {
    id: deed!.id,
    kind: "house" as const,
    zone: "village" as const,
    name: deed!.name,
    address: deed!.town,
    town: deed!.town,
    x: deed!.x,
    z: deed!.z,
    price: deed!.price,
    bedrooms: 3,
    bathrooms: 1,
    squareFeet: 1400,
    furnished: false,
    features: [],
    rentPerDay: 28,
    garageCapacity: 1,
    municipalEvaluation: Math.round(deed!.price * 0.8),
    hydroAccountNumber: `HQ-815-${deed!.id.split("-").pop()}`,
  };

  const mine = ownedIds(owned, realty).includes(p.id);
  const house = isHouseDeed(p.id);
  const { totalTax, total } = withTax(p.price);
  const state = houses[p.id] ?? emptyHouse(p.id);

  const value = evaluatedValue(p, state);
  const cond = conditionOf(realty, p.id);
  const rental = realty.rentals[p.id];
  const mortgage = realty.mortgages[p.id];
  const listed = realty.listings[p.id]?.listed;

  const refresh = () => engine?.refreshHouses();

  return (
    <div className="absolute inset-0 z-40 flex items-end justify-center bg-bg/85 px-3 py-4 backdrop-blur-md sm:items-center">
      <div className="hud-panel flex max-h-[min(90dvh,750px)] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-border-strong bg-background p-5 shadow-2xl">
        {/* En-tête Foncier / Notarié */}
        <div className="flex items-start justify-between gap-3 border-b border-border pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded bg-accent/15 px-1.5 py-0.5 text-[9px] font-bold text-accent uppercase">
                {p.town} · {KIND_LABEL[p.kind]}
              </span>
              <span className="text-[10px] text-subtle uppercase tracking-wider">{ZONE_LABEL[p.zone]}</span>
            </div>
            <h2 className="font-display text-2xl italic font-black text-fg mt-1">{p.name}</h2>
            <p className="mt-1 text-xs text-muted">
              {mine ? (
                <>
                  Évaluation municipale : <strong className="text-fg">{formatCad(value)}</strong>
                  {" • "}
                  Indice de salubrité : <strong className={cond < 50 ? "text-danger" : "text-ok"}>{Math.round(cond)}%</strong>
                  {rental ? ` • Locataire TAL : ${rental.tenantName}` : ""}
                </>
              ) : (
                <>
                  {house ? "Résidence unifamiliale" : p.furnished ? "Meublé complet" : "Bâtisse à rénover"} • {formatCad(p.price)} + Taxes ({formatCad(totalTax)})
                </>
              )}
            </p>
          </div>

          <button
            type="button"
            className="flex size-9 items-center justify-center rounded-lg bg-surface hover:bg-surface-2 text-muted hover:text-fg transition-colors"
            onClick={() => useGameStore.getState().closeDeed()}
            aria-label="Fermer l'acte notarié"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Section Achat & Hypothèque pour les non-propriétaires */}
        {!mine && (
          <div className="mt-4 flex flex-col gap-3">
            <div className="rounded-xl bg-surface-2 p-3 border border-border">
              <div className="flex justify-between items-baseline">
                <span className="text-xs text-muted uppercase font-bold tracking-wider">Coût total d'acquisition</span>
                <span className="font-display text-2xl italic font-black text-fg">{formatCad(total)}</span>
              </div>
              <p className="mt-1 text-[11px] text-subtle">
                Incluant droit de mutation (taxe de bienvenue) et TPS/TVQ.
              </p>
              <div className="mt-2 flex gap-4 text-xs text-muted border-t border-border pt-2">
                <span>🛏️ {p.bedrooms ?? 2} ch.</span>
                <span>🚿 {p.bathrooms ?? 1} sdb</span>
                <span>📐 {p.squareFeet} pi²</span>
                <span>⚡ Compte HQ : {p.hydroAccountNumber}</span>
              </div>
            </div>

            <p className="text-[11px] text-muted">
              Solde Desjardins : <strong className="text-fg">{formatCad(bank)}</strong> • Espèces : <strong className="text-fg">{formatCad(cash)}</strong>
            </p>

            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                className="rounded-xl bg-accent px-2 py-3 text-xs font-bold text-accent-fg hover:opacity-90 transition-opacity"
                onClick={() => {
                  const ok = useGameStore.getState().buyProperty("cash");
                  if (ok) refresh();
                }}
              >
                Comptant (Cash)
              </button>
              <button
                type="button"
                className="rounded-xl border border-border-strong bg-surface-2 px-2 py-3 text-xs font-bold text-fg hover:bg-surface transition-colors"
                onClick={() => {
                  const ok = useGameStore.getState().buyProperty("bank");
                  if (ok) refresh();
                }}
              >
                Débit Caisse
              </button>
              <button
                type="button"
                className="rounded-xl border border-border-strong bg-surface-2 px-2 py-3 text-xs font-bold text-fg hover:bg-surface transition-colors"
                onClick={() => {
                  const ok = useGameStore.getState().buyProperty("mortgage");
                  if (ok) refresh();
                }}
              >
                Hypothèque Desjardins (20%)
              </button>
            </div>

            <button
              type="button"
              className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-xs font-semibold text-muted hover:text-fg hover:bg-surface-2 transition-colors"
              onClick={() => useGameStore.getState().bookVisit()}
            >
              Contacter le courtier pour une visite libre
            </button>
          </div>
        )}

        {/* Onglets de gestion pour le propriétaire */}
        {mine && (
          <>
            <div className="mt-3 flex gap-1 rounded-xl bg-surface-2 p-1 border border-border">
              {(house ? TABS : TABS.filter((t) => t.id === "marche")).map((t) => (
                <button
                  key={t.id}
                  type="button"
                  className={`flex-1 rounded-lg py-2 text-xs font-bold transition-all ${
                    tab === t.id
                      ? "bg-accent text-accent-fg shadow-sm"
                      : "text-muted hover:text-fg hover:bg-surface"
                  }`}
                  onClick={() => setTab(t.id)}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <div className="mt-3 min-h-0 flex-1 space-y-4 overflow-y-auto pr-1">
              {/* ONGLET : TRAVAUX & RÉNOVATIONS RBQ */}
              {tab === "travaux" &&
                GROUPS.map((g) => (
                  <div key={g.id}>
                    <p className="mb-2 text-[10px] font-bold tracking-[0.2em] text-accent uppercase">{g.label}</p>
                    <ul className="space-y-1.5">
                      {RENO_CATALOG.filter((r) => r.group === g.id).map((r) => {
                        const on = hasReno(state, r.id);
                        const { total: cost } = withTax(r.price);
                        return (
                          <li key={r.id}>
                            <button
                              type="button"
                              disabled={on}
                              onClick={() => {
                                const ok = useGameStore.getState().buyReno(r.id);
                                if (ok) refresh();
                              }}
                              className="flex w-full items-center gap-3 rounded-xl border border-border bg-surface-2 p-3 text-left transition-all hover:border-border-strong disabled:opacity-50"
                            >
                              <div className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${on ? "bg-ok/15 text-ok" : "bg-surface text-accent"}`}>
                                <Hammer className="size-4" />
                              </div>
                              <span className="min-w-0 flex-1">
                                <span className="block text-sm font-bold text-fg">{r.label}</span>
                                <span className="block text-xs text-muted">{r.hint}</span>
                              </span>
                              <span className="shrink-0 text-xs font-black">
                                {on ? <span className="text-ok">Livré / Installé</span> : formatCad(cost)}
                              </span>
                            </button>
                          </li>
                        );
                      })}
                    </ul>

                    {/* Sous-sol & Aménagements spéciaux */}
                    {g.id === "soussol" && hasReno(state, "soussol") && (
                      <div className="mt-2 grid grid-cols-2 gap-1.5">
                        {BASEMENT_FITS.map((b) => (
                          <button
                            key={b.id}
                            type="button"
                            onClick={() => {
                              const ok = useGameStore.getState().setBasement(b.id);
                              if (ok) refresh();
                            }}
                            className={`rounded-lg border p-2.5 text-left text-xs transition-all ${
                              state.basement === b.id
                                ? "border-accent bg-accent/10 font-bold text-accent"
                                : "border-border bg-surface-2 text-muted hover:text-fg"
                            }`}
                          >
                            {b.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}

              {/* ONGLET : GARAGE ET ATELIER */}
              {tab === "garage" && (
                <div className="space-y-4">
                  {!hasReno(state, "garage") ? (
                    <div className="rounded-xl border border-dashed border-border p-6 text-center text-xs text-muted">
                      ⚠️ Aucun garage érigé sur le terrain. Faites construire une structure dans l'onglet <strong>Travaux RBQ</strong>.
                    </div>
                  ) : (
                    <>
                      <div>
                        <p className="text-[10px] font-bold tracking-[0.2em] text-accent uppercase mb-2">
                          Capacité de stationnement intérieur
                        </p>
                        <div className="grid grid-cols-3 gap-2">
                          {GARAGE_BAYS.map((b) => (
                            <button
                              key={b.n}
                              type="button"
                              onClick={() => {
                                const ok = useGameStore.getState().setGarageBays(b.n);
                                if (ok) refresh();
                              }}
                              className={`rounded-xl border p-3 text-center text-xs transition-all ${
                                state.garageBays === b.n
                                  ? "border-accent bg-accent/10 font-bold text-accent"
                                  : "border-border bg-surface-2 text-muted hover:text-fg"
                              }`}
                            >
                              <span className="block font-bold">{b.label}</span>
                              {b.price > 0 && <span className="block text-[10px] text-subtle mt-0.5">+{formatCad(b.price)}</span>}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <p className="text-[10px] font-bold tracking-[0.2em] text-accent uppercase mb-2">
                          Équipements et établis d'artisan
                        </p>
                        <ul className="space-y-1.5">
                          {GARAGE_FITS.map((f) => {
                            const on = state.garageFits.includes(f.id);
                            return (
                              <li key={f.id}>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const ok = useGameStore.getState().toggleGarageFit(f.id);
                                    if (ok) refresh();
                                  }}
                                  className="flex w-full items-center gap-3 rounded-xl border border-border bg-surface-2 p-3 text-left hover:border-border-strong transition-all"
                                >
                                  <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-surface text-accent">
                                    <Wrench className="size-4" />
                                  </div>
                                  <span className="min-w-0 flex-1">
                                    <span className="block text-sm font-bold text-fg">{f.label}</span>
                                    <span className="block text-xs text-muted">{f.hint}</span>
                                  </span>
                                  <span className="text-xs font-black text-fg">
                                    {on ? <span className="text-ok">En place</span> : formatCad(withTax(f.price).total)}
                                  </span>
                                </button>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* ONGLET : SERRURERIE & CONTRÔLE D'ACCÈS */}
              {tab === "cles" && (
                <div className="space-y-4">
                  <div>
                    <p className="text-[10px] font-bold tracking-[0.2em] text-accent uppercase mb-2">
                      Trousseau de clés du propriétaire
                    </p>
                    <p className="text-xs text-muted mb-2">
                      Clé maîtresse : <strong>{inventory.cle_maison ?? 0}</strong> • Doubles autorisés : <strong>{inventory.double_cle ?? 0}</strong>
                    </p>

                    <ul className="space-y-1.5">
                      {KEY_ROLES.filter((r) => r.id !== "guest").map((r) => {
                        const on = state.keychain.includes(r.id);
                        return (
                          <li key={r.id}>
                            <button
                              type="button"
                              disabled={r.id === "owner" || on}
                              onClick={() => useGameStore.getState().cutHouseKey(r.id)}
                              className="flex w-full items-center gap-3 rounded-xl border border-border bg-surface-2 p-3 text-left hover:border-border-strong disabled:opacity-60 transition-all"
                            >
                              <KeyRound className="size-4 text-accent" />
                              <span className="min-w-0 flex-1">
                                <span className="block text-sm font-bold text-fg">{r.label}</span>
                                <span className="block text-xs text-muted">{r.hint}</span>
                              </span>
                              <span className="text-xs font-bold text-subtle">
                                {r.id === "owner" || on ? "Détenue" : "Tailler double (25 $)"}
                              </span>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </div>

                  <div>
                    <p className="text-[10px] font-bold tracking-[0.2em] text-accent uppercase mb-2">
                      Verrous et pênes dormants
                    </p>
                    <ul className="space-y-1.5">
                      {DOOR_SLOTS.map((d) => {
                        const locked = state.doors[d.id];
                        return (
                          <li key={d.id}>
                            <button
                              type="button"
                              onClick={() => useGameStore.getState().toggleDoorLock(d.id)}
                              className="flex w-full items-center gap-3 rounded-xl border border-border bg-surface-2 p-3 text-left hover:border-border-strong transition-all"
                            >
                              {locked ? <Lock className="size-4 text-danger" /> : <Unlock className="size-4 text-ok" />}
                              <span className="flex-1 text-sm font-semibold text-fg">{d.label}</span>
                              <span className={`text-xs font-bold ${locked ? "text-danger" : "text-ok"}`}>
                                {locked ? "Barricadée" : "Déverrouillée"}
                              </span>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                </div>
              )}

              {/* ONGLET : HYDRO-QUÉBEC, EAU & CHAUFFAGE */}
              {tab === "services" && (
                <div className="space-y-4">
                  <div className="rounded-xl border border-border bg-surface-2 p-3">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-xs font-bold text-fg">
                        <Flame className="size-4 text-accent" />
                        {heatById(state.heat).label}
                      </span>
                      <span className="font-display text-lg italic font-black text-fg">
                        {Math.round(state.indoorC)} °C
                      </span>
                    </div>

                    <p className="mt-1 text-xs text-muted">
                      {heatHint(state, useGameStore.getState().gridOutage, useGameStore.getState().surv.ambient)}
                    </p>

                    {useGameStore.getState().gridOutage && (
                      <p className="mt-2 rounded bg-danger/10 p-2 text-xs font-bold text-danger">
                        ⚠️ {outageLabel(useGameStore.getState().gridOutage!.kind)}
                      </p>
                    )}
                  </div>

                  {/* Options de chauffage */}
                  <div>
                    <p className="text-[10px] font-bold tracking-[0.2em] text-accent uppercase mb-2">
                      Systèmes de chauffage certifiés
                    </p>
                    <ul className="space-y-1.5">
                      {HEAT_CATALOG.map((h) => {
                        const on = state.heat === h.id;
                        const { total } = withTax(h.id === "thermopompe" ? Math.max(0, h.price - 80) : h.price);
                        return (
                          <li key={h.id}>
                            <button
                              type="button"
                              disabled={on}
                              onClick={() => {
                                const ok = useGameStore.getState().installHeat(h.id);
                                if (ok) refresh();
                              }}
                              className="flex w-full items-center gap-3 rounded-xl border border-border bg-surface-2 p-3 text-left disabled:opacity-60 transition-all hover:border-border-strong"
                            >
                              <span className="min-w-0 flex-1">
                                <span className="block text-sm font-bold text-fg">{h.label}</span>
                                <span className="block text-xs text-muted">{h.hint}</span>
                              </span>
                              <span className="text-xs font-black text-fg">
                                {on ? <span className="text-ok">Actif</span> : h.price === 0 ? "Standard" : formatCad(total)}
                              </span>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </div>

                  {/* Contrôles des utilités */}
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      className="rounded-xl border border-border bg-surface p-2.5 text-xs font-bold text-fg hover:bg-surface-2 transition-colors"
                      onClick={() => {
                        useGameStore.getState().toggleHeat();
                        refresh();
                      }}
                    >
                      {state.heatOn ? "Éteindre thermostat" : "Activer chauffage"}
                    </button>

                    <button
                      type="button"
                      className="rounded-xl border border-border bg-surface p-2.5 text-xs font-bold text-fg hover:bg-surface-2 transition-colors"
                      onClick={() => {
                        useGameStore.getState().toggleHydro();
                        refresh();
                      }}
                    >
                      Disjoncteur HQ : {state.hydroOn ? "ON" : "OFF"}
                    </button>

                    <button
                      type="button"
                      className="rounded-xl border border-border bg-surface p-2.5 text-xs font-bold text-fg hover:bg-surface-2 transition-colors"
                      onClick={() => {
                        useGameStore.getState().toggleWater();
                        refresh();
                      }}
                    >
                      Valve d'eau : {state.waterOn ? "OUVERTE" : "FERMÉE"}
                    </button>

                    <button
                      type="button"
                      className="rounded-xl border border-border bg-surface p-2.5 text-xs font-bold text-fg hover:bg-surface-2 transition-colors"
                      onClick={() => useGameStore.getState().loadWood(1)}
                    >
                      Corde de bois : {state.wood.toFixed(0)}/8
                    </button>
                  </div>

                  {/* Dépannage d'urgence hivernale */}
                  {state.broke && (
                    <button
                      type="button"
                      className="w-full rounded-xl bg-danger p-3 text-xs font-bold text-danger-fg shadow-lg animate-pulse"
                      onClick={() => {
                        useGameStore.getState().repairFurnace();
                        refresh();
                      }}
                    >
                      Appel de service chauffagiste (Fournaise en panne) · {formatCad(withTax(FURNACE_REPAIR).total)}
                    </button>
                  )}

                  {state.frozen && (
                    <button
                      type="button"
                      className="w-full rounded-xl bg-accent p-3 text-xs font-bold text-accent-fg shadow-lg animate-pulse"
                      onClick={() => {
                        useGameStore.getState().thawPipes();
                        refresh();
                      }}
                    >
                      Dégeler la tuyauterie éclatée · {formatCad(withTax(PIPE_THAW).total)}
                    </button>
                  )}

                  {/* Approvisionnement en eau */}
                  <div>
                    <p className="text-[10px] font-bold tracking-[0.2em] text-accent uppercase mb-2">
                      Réseau d'aqueduc & puits artésien
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      {WATER_CATALOG.map((w) => (
                        <button
                          key={w.id}
                          type="button"
                          onClick={() => {
                            const ok = useGameStore.getState().setWater(w.id);
                            if (ok) refresh();
                          }}
                          className={`rounded-xl border p-2.5 text-left text-xs transition-all ${
                            state.water === w.id
                              ? "border-accent bg-accent/10 font-bold text-accent"
                              : "border-border bg-surface-2 text-muted hover:text-fg"
                          }`}
                        >
                          <span className="block font-bold">{w.label}</span>
                          <span className="block text-[10px] text-subtle mt-0.5">{w.hint}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {(() => {
                    const bill = monthlyBill(state, 1);
                    return (
                      <div className="rounded-xl bg-surface p-3 border border-border text-xs text-muted">
                        <span className="font-bold text-fg">Estimation mensuelle des charges :</span> Hydro-Québec {formatCad(bill.hydro)} • Eau {formatCad(bill.water)} • Entretien {formatCad(bill.maint)}
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* ONGLET : CENTRIS, BAUX DU TAL & REVENTE */}
              {(tab === "marche" || !house) && (
                <div className="space-y-4">
                  <div className="rounded-xl border border-border bg-surface-2 p-3 text-xs text-muted">
                    <p>Indice de préservation : <strong className="text-fg">{Math.round(cond)}%</strong></p>
                    <p className="mt-1">Revenu locatif de référence : <strong className="text-fg">{formatCad(p.rentPerDay)}/jour</strong></p>
                    {mortgage && (
                      <p className="mt-1 text-danger">
                        Prélèvement hypothécaire Desjardins : <strong>{formatCad(mortgage.monthlyPayment)}/mois</strong>
                      </p>
                    )}
                  </div>

                  {/* Gestion locative TAL */}
                  {rental ? (
                    <button
                      type="button"
                      className="w-full rounded-xl border border-danger/40 bg-danger/10 p-3 text-xs font-bold text-danger hover:bg-danger/20 transition-colors"
                      onClick={() => useGameStore.getState().evictTenant()}
                    >
                      Avis de résiliation de bail TAL ({rental.tenantName} · {rental.daysLeft} jours restants)
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="w-full rounded-xl border border-border-strong bg-surface-2 p-3 text-xs font-bold text-fg hover:bg-surface transition-colors"
                      onClick={() => useGameStore.getState().rentOut()}
                    >
                      Publier une offre de location (Bail standard TAL)
                    </button>
                  )}

                  {/* Mise en marché Centris */}
                  {listed ? (
                    <button
                      type="button"
                      className="w-full rounded-xl border border-border bg-surface-2 p-3 text-xs font-bold text-muted hover:text-fg transition-colors"
                      onClick={() => useGameStore.getState().unlistProperty()}
                    >
                      Retirer l'inscription du registre Centris (MLS)
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="w-full rounded-xl bg-accent p-3 text-xs font-bold text-accent-fg hover:opacity-90 transition-opacity"
                      onClick={() => useGameStore.getState().listProperty()}
                    >
                      Inscrire sur Centris (+15% de plus-value marchande)
                    </button>
                  )}

                  <button
                    type="button"
                    className="w-full rounded-xl border border-border bg-surface p-3 text-xs font-bold text-fg hover:bg-surface-2 transition-colors"
                    onClick={() => useGameStore.getState().maintainRealty()}
                  >
                    Travaux de conciergerie et d'entretien préventif (40 $ CAD)
                  </button>

                  {/* Visiteurs et droits de visite */}
                  <div>
                    <p className="text-[10px] font-bold tracking-[0.2em] text-accent uppercase mb-2">
                      Registre des clés et invités autorisés
                    </p>

                    {(realty.access[p.id] ?? []).length === 0 && (
                      <p className="text-xs text-subtle italic">Aucun tiers ne possède de clé d'accès.</p>
                    )}

                    {(realty.access[p.id] ?? []).map((n: string) => (
                      <div
                        key={n}
                        className="flex items-center justify-between rounded-lg border border-border bg-surface p-2.5 text-xs text-fg mb-1"
                      >
                        <span>👤 {n}</span>
                        <button
                          type="button"
                          className="text-[11px] font-bold text-danger hover:underline"
                          onClick={() => useGameStore.getState().revokeRealtyAccess(n)}
                        >
                          Révoquer accès
                        </button>
                      </div>
                    ))}

                    {/* Visites immobilières planifiées */}
                    {realty.visits.filter((v: any) => v.propertyId === p.id).map((v: any) => (
                      <div
                        key={v.id}
                        className="flex items-center justify-between rounded-lg border border-accent/40 bg-accent/10 p-2.5 text-xs text-fg mb-1"
                      >
                        <span>Demande de visite : <strong>{v.name}</strong></span>
                        <button
                          type="button"
                          className="rounded bg-accent px-2 py-1 text-[10px] font-bold text-accent-fg"
                          onClick={() => useGameStore.getState().grantRealtyAccess(v.name)}
                        >
                          Autoriser la visite
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {notice && <p className="mt-3 text-center text-xs font-semibold text-accent">{notice}</p>}

        <div className="mt-3 flex items-center justify-between border-t border-border pt-2 text-[10px] text-subtle">
          <span className="flex items-center gap-1">
            <Landmark className="size-3 text-accent" />
            {mine ? "Gestion foncière MRC de Portneuf" : "Bureau d'enregistrement des actes notariés"}
          </span>
          <span>Baux conformes TAL</span>
        </div>
      </div>
    </div>
  );
}