import { Flame, Hammer, KeyRound, Landmark, Lock, Unlock, Wallet, Wrench, X, Zap } from "lucide-react";
import { useEffect, useState } from "react";
import { atmStatus } from "./banking";
// CORRECTION: CAISSE_NIP n'existe pas dans ./caisse, défini localement
const CAISSE_NIP = "1234";
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

const AMOUNTS = [20, 40, 60, 100, 200];

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
      if (mode === "to-firm" || mode === "from-firm") ok = st.transferBank(mode, amount);
      else ok = st.atmOp(mode, amount);
      setUi(ok ? "receipt" : "error");
      if (!ok) setErr(useGameStore.getState().notice || "Opération refusée");
    }, 900);
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
      setErr("NIP incorrect");
      setPin("");
    }
  };

  return (
    <div className="absolute inset-0 z-40 flex items-end justify-center bg-bg/70 px-3 py-4 backdrop-blur-sm sm:items-center">
      <div className="w-full max-w-sm rounded-xl border border-border-strong bg-surface p-4 shadow-hud">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] tracking-[0.2em] text-subtle uppercase">Guichet automatique</p>
            <h2 className="font-display text-2xl italic">Caisse populaire</h2>
          </div>
          <button
            type="button"
            className="flex size-10 items-center justify-center rounded-md text-muted hover:text-fg"
            onClick={() => useGameStore.getState().closeAtm()}
            aria-label="Fermer"
          >
            <X className="size-5" />
          </button>
        </div>
        <div className="mt-3 rounded-lg bg-[#0d2a3a] px-3 py-4 text-center text-[#e8f4ec]">
          {ui === "idle" && (
            <>
              <p className="font-display text-2xl italic">{vault.broken ? "Hors service" : "Bienvenue"}</p>
              <p className="mt-1 text-sm text-[#8ab4c8]">
                {vault.broken ? "Technicien en route" : locked ? "Compte verrouillé" : "Insérez votre carte pour commencer"}
              </p>
            </>
          )}
          {ui === "pin" && (
            <>
              <p className="text-sm">Entrez votre NIP</p>
              <p className="mt-2 font-display text-3xl tracking-[0.4em]">{[0, 1, 2, 3].map((i) => (i < pin.length ? "●" : "○")).join(" ")}</p>
              {err && <p className="mt-2 text-xs text-danger">{err}</p>}
              <p className="mt-2 text-[11px] text-[#8ab4c8]">Membre · 1234</p>
            </>
          )}
          {ui === "menu" && (
            <p className="text-sm">Choisissez une opération</p>
          )}
          {(ui === "amount" || ui === "deposit" || ui === "transfer") && (
            <>
              <p className="text-sm">
                {ui === "deposit" ? "Montant du dépôt" : ui === "transfer" ? "Montant du virement" : "Montant du retrait"}
              </p>
              <p className="mt-1 font-display text-4xl italic">{formatCad(amount)}</p>
              {ui === "amount" && (
                <p className="mt-1 text-[11px] text-[#8ab4c8]">
                  Multiples de 20 $ · {desk ? "comptoir" : `caisse GAB ${formatCad(vault.cash ?? 0)}`}
                </p>
              )}
            </>
          )}
          {ui === "processing" && <p className="font-display text-xl italic">Traitement en cours…</p>}
          {ui === "balance" && (
            <>
              <p className="text-sm">Solde du compte</p>
              <p className="mt-1 font-display text-4xl italic">{formatCad(bank)}</p>
              <p className="mt-1 text-[11px] text-[#8ab4c8]">Compte chèques · espèces {formatCad(cash)}</p>
            </>
          )}
          {ui === "receipt" && (
            <>
              <p className="font-display text-xl italic">Opération réussie</p>
              <p className="mt-1 text-sm text-[#8ab4c8]">Reprenez votre carte</p>
            </>
          )}
          {ui === "error" && (
            <>
              <p className="font-display text-xl italic text-danger">Opération refusée</p>
              <p className="mt-1 text-sm">{err || notice}</p>
            </>
          )}
        </div>

        {ui === "idle" && !vault.broken && !locked && (
          <button type="button" className="mt-3 h-11 w-full rounded-md border border-border-strong bg-surface-2 text-sm" onClick={() => setUi("pin")}>
            Insérer la carte
          </button>
        )}
        {ui === "pin" && (
          <div className="mt-3 grid grid-cols-3 gap-1.5">
            {["1", "2", "3", "4", "5", "6", "7", "8", "9", "C", "0", "OK"].map((k) => (
              <button
                key={k}
                type="button"
                className="h-10 rounded-md border border-border bg-surface-2 text-sm"
                onClick={() => {
                  if (k === "C") {
                    setPin("");
                    setErr("");
                  } else if (k === "OK") confirmPin();
                  else digit(k);
                }}
              >
                {k === "C" ? "Annuler" : k === "OK" ? "Entrée" : k}
              </button>
            ))}
          </div>
        )}
        {ui === "menu" && (
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button type="button" className="h-10 rounded-md border border-border bg-surface-2 text-sm" onClick={() => { setMode("withdraw"); setUi("amount"); }}>
              1 — Retrait
            </button>
            <button type="button" className="h-10 rounded-md border border-border bg-surface-2 text-sm" onClick={() => { setMode("deposit"); setUi("deposit"); }}>
              2 — Dépôt
            </button>
            <button type="button" className="h-10 rounded-md border border-border bg-surface-2 text-sm" onClick={() => setUi("balance")}>
              3 — Solde
            </button>
            <button
              type="button"
              className="h-10 rounded-md border border-border bg-surface-2 text-sm"
              disabled={!firm}
              onClick={() => { setMode("to-firm"); setUi("transfer"); }}
            >
              4 — Virement REQ
            </button>
            <button type="button" className="h-10 rounded-md border border-border bg-surface-2 text-sm" onClick={() => { setUi("idle"); setPin(""); }}>
              0 — Annuler
            </button>
          </div>
        )}
        {(ui === "amount" || ui === "deposit" || ui === "transfer") && (
          <div className="mt-3 space-y-2">
            <div className="flex flex-wrap gap-1.5">
              {AMOUNTS.map((n) => (
                <button
                  key={n}
                  type="button"
                  className={`h-9 flex-1 rounded-md border px-2 text-xs ${amount === n ? "border-border-strong bg-surface-2 text-fg" : "border-border bg-surface text-muted"}`}
                  onClick={() => setAmount(n)}
                >
                  {n}&nbsp;$
                </button>
              ))}
            </div>
            <button type="button" className="h-11 w-full rounded-md border border-border-strong bg-surface-2 text-sm" onClick={() => setUi("processing")}>
              Entrée
            </button>
            <button type="button" className="h-9 w-full rounded-md border border-border text-xs text-muted" onClick={() => setUi("menu")}>
              0 — Annuler
            </button>
          </div>
        )}
        {(ui === "balance" || ui === "receipt" || ui === "error") && (
          <button
            type="button"
            className="mt-3 h-11 w-full rounded-md border border-border-strong bg-surface-2 text-sm"
            onClick={() => {
              setUi("idle");
              setPin("");
              setErr("");
            }}
          >
            Reprendre la carte
          </button>
        )}
        {notice && ui === "receipt" && <p className="mt-3 text-sm text-accent">{notice}</p>}
        <p className="mt-3 flex items-center gap-1.5 text-[10px] text-subtle">
          <Wallet className="size-3" />
          Compte {formatCad(bank)} · espèces {formatCad(cash)} · {vault.broken ? "hors service" : desk ? "comptoir" : `GAB ${formatCad(vault.cash ?? 0)}`}
        </p>
      </div>
    </div>
  );
}

const TABS: { id: "travaux" | "garage" | "cles" | "services" | "marche"; label: string }[] = [
  { id: "travaux", label: "Travaux" },
  { id: "garage", label: "Garage" },
  { id: "cles", label: "Clés" },
  { id: "services", label: "Chauffage" },
  { id: "marche", label: "MLS" },
];

const GROUPS: { id: RenoGroup; label: string }[] = [
  { id: "maison", label: "Maison" },
  { id: "soussol", label: "Sous-sol" },
  { id: "garage", label: "Garage" },
  { id: "terrain", label: "Terrain" },
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
  const { tax, total } = withTax(p.price);
  const state = houses[p.id] ?? emptyHouse(p.id);
  // CORRECTION: evaluatedValue attend 2 arguments, pas 3
  const value = evaluatedValue(p, state);
  const cond = conditionOf(realty, p.id);
  const rental = realty.rentals[p.id];
  const mortgage = realty.mortgages[p.id];
  const listed = realty.listings[p.id]?.listed;
  const refresh = () => engine?.refreshHouses();

  return (
    <div className="absolute inset-0 z-40 flex items-end justify-center bg-bg/70 px-3 py-4 backdrop-blur-sm sm:items-center">
      <div className="hud-panel flex max-h-[min(88dvh,720px)] w-full max-w-lg flex-col overflow-hidden rounded-xl p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] tracking-[0.2em] text-subtle uppercase">
              {p.town} · {KIND_LABEL[p.kind]} · {ZONE_LABEL[p.zone]}
            </p>
            <h2 className="font-display text-2xl italic">{p.name}</h2>
            <p className="mt-1 text-sm text-muted">
              {mine ? (
                <>
                  Évaluation <span className="hud-num text-fg">{formatCad(value)}</span>
                  {" · "}
                  condition {Math.round(cond)}
                  {rental ? ` · ${rental.tenantName}` : ""}
                </>
              ) : (
                <>
                  {house ? "Coquille vide" : p.furnished ? "Meublé" : "Local nu"} · {formatCad(p.price)} + TPS+TVQ {formatCad(tax)}
                </>
              )}
            </p>
          </div>
          <button
            type="button"
            className="flex size-10 items-center justify-center rounded-md text-muted hover:text-fg"
            onClick={() => useGameStore.getState().closeDeed()}
            aria-label="Fermer"
          >
            <X className="size-5" />
          </button>
        </div>

        {!mine && (
          <>
            <p className="hud-num mt-3 text-lg text-fg">{formatCad(total)}</p>
            <p className="mt-1 text-[11px] text-subtle">
              Banque {formatCad(bank)} · espèces {formatCad(cash)}
            </p>
            <p className="mt-2 text-xs text-muted">
              {p.bedrooms ? `${p.bedrooms} ch. · ${p.bathrooms} sdb · ` : ""}
              {p.squareFeet} pi²
              {p.features.length ? ` · ${p.features.join(", ")}` : ""}
            </p>
            <div className="mt-4 grid grid-cols-3 gap-2">
              <button
                type="button"
                className="rounded-md bg-accent px-2 py-2.5 text-xs text-accent-fg"
                onClick={() => {
                  const ok = useGameStore.getState().buyProperty("cash");
                  if (ok) refresh();
                }}
              >
                Espèces
              </button>
              <button
                type="button"
                className="rounded-md border border-border-strong bg-surface-2 px-2 py-2.5 text-xs"
                onClick={() => {
                  const ok = useGameStore.getState().buyProperty("bank");
                  if (ok) refresh();
                }}
              >
                Caisse
              </button>
              <button
                type="button"
                className="rounded-md border border-border-strong bg-surface-2 px-2 py-2.5 text-xs"
                onClick={() => {
                  const ok = useGameStore.getState().buyProperty("mortgage");
                  if (ok) refresh();
                }}
              >
                Hypothèque 20 %
              </button>
            </div>
            <button
              type="button"
              className="mt-2 w-full rounded-md border border-border bg-surface-2 px-3 py-2 text-xs"
              onClick={() => useGameStore.getState().bookVisit()}
            >
              Demander une visite
            </button>
          </>
        )}

        {mine && (
          <>
            <div className="mt-3 grid grid-cols-5 gap-1 rounded-lg border border-border p-1">
              {(house ? TABS : TABS.filter((t) => t.id === "marche")).map((t) => (
                <button
                  key={t.id}
                  type="button"
                  className={`h-9 rounded-md text-xs ${tab === t.id ? "bg-surface-2 text-fg" : "text-muted"}`}
                  onClick={() => setTab(t.id)}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <div className="mt-3 min-h-0 flex-1 space-y-3 overflow-auto">
              {tab === "travaux" &&
                GROUPS.map((g) => (
                  <div key={g.id}>
                    <p className="mb-1 text-[10px] tracking-[0.2em] text-subtle uppercase">{g.label}</p>
                    <ul className="space-y-1">
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
                              className="flex w-full items-center gap-2 rounded-md border border-border bg-surface-2 px-3 py-2 text-left disabled:opacity-60"
                            >
                              <Hammer className={`size-3.5 ${on ? "text-ok" : "text-accent"}`} />
                              <span className="min-w-0 flex-1">
                                <span className="block text-sm text-fg">{r.label}</span>
                                <span className="block text-[11px] text-muted">{r.hint}</span>
                              </span>
                              <span className="hud-num text-xs text-fg">{on ? "fait" : formatCad(cost)}</span>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                    {g.id === "soussol" && hasReno(state, "soussol") && (
                      <div className="mt-2 grid grid-cols-2 gap-1">
                        {BASEMENT_FITS.map((b) => (
                          <button
                            key={b.id}
                            type="button"
                            onClick={() => {
                              const ok = useGameStore.getState().setBasement(b.id);
                              if (ok) refresh();
                            }}
                            className={`rounded-md border px-2 py-1.5 text-left text-[11px] ${
                              state.basement === b.id
                                ? "border-border-strong bg-surface-2 text-fg"
                                : "border-border bg-surface text-muted"
                            }`}
                          >
                            {b.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}

              {tab === "garage" && (
                <div className="space-y-3">
                  {!hasReno(state, "garage") ? (
                    <p className="text-sm text-muted">Bâtissez le garage d'abord — pas juste un spawn de voiture.</p>
                  ) : (
                    <>
                      <p className="flex items-center gap-1.5 text-[10px] tracking-[0.2em] text-subtle uppercase">
                        <Wrench className="size-3" />
                        Places
                      </p>
                      <div className="grid grid-cols-3 gap-1">
                        {GARAGE_BAYS.map((b) => (
                          <button
                            key={b.n}
                            type="button"
                            onClick={() => {
                              const ok = useGameStore.getState().setGarageBays(b.n);
                              if (ok) refresh();
                            }}
                            className={`rounded-md border px-2 py-2 text-xs ${
                              state.garageBays === b.n
                                ? "border-border-strong bg-surface-2 text-fg"
                                : "border-border bg-surface text-muted"
                            }`}
                          >
                            {b.label}
                            {b.price > 0 ? <span className="block text-[10px] text-subtle">{formatCad(b.price)}</span> : null}
                          </button>
                        ))}
                      </div>
                      <p className="text-[10px] tracking-[0.2em] text-subtle uppercase">Équipement</p>
                      <ul className="space-y-1">
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
                                className="flex w-full items-center gap-2 rounded-md border border-border bg-surface-2 px-3 py-2 text-left"
                              >
                                <span className="min-w-0 flex-1">
                                  <span className="block text-sm text-fg">{f.label}</span>
                                  <span className="block text-[11px] text-muted">{f.hint}</span>
                                </span>
                                <span className="hud-num text-xs text-fg">{on ? "posé" : formatCad(withTax(f.price).total)}</span>
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                      <p className="text-[11px] text-muted">
                        Rangés {state.parked.length}/{state.garageBays}
                        {state.garageFits.includes("mecanique") ? " · établi actif" : ""}
                      </p>
                    </>
                  )}
                </div>
              )}

              {tab === "cles" && (
                <div className="space-y-3">
                  <p className="flex items-center gap-1.5 text-[10px] tracking-[0.2em] text-subtle uppercase">
                    <KeyRound className="size-3" />
                    Trousseau
                  </p>
                  <p className="text-xs text-muted">
                    Clé maître {inventory.cle_maison ?? 0} · doubles {inventory.double_cle ?? 0}
                  </p>
                  <ul className="space-y-1">
                    {KEY_ROLES.filter((r) => r.id !== "guest").map((r) => {
                      const on = state.keychain.includes(r.id);
                      return (
                        <li key={r.id}>
                          <button
                            type="button"
                            disabled={r.id === "owner" || on}
                            onClick={() => useGameStore.getState().cutHouseKey(r.id)}
                            className="flex w-full items-center gap-2 rounded-md border border-border bg-surface-2 px-3 py-2 text-left disabled:opacity-70"
                          >
                            <span className="min-w-0 flex-1">
                              <span className="block text-sm text-fg">{r.label}</span>
                              <span className="block text-[11px] text-muted">{r.hint}</span>
                            </span>
                            <span className="text-[11px] text-subtle">{r.id === "owner" || on ? "taillée" : "25 $"}</span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                  <p className="text-[10px] tracking-[0.2em] text-subtle uppercase">Serrures</p>
                  <ul className="space-y-1">
                    {DOOR_SLOTS.map((d) => {
                      const locked = state.doors[d.id];
                      return (
                        <li key={d.id}>
                          <button
                            type="button"
                            onClick={() => useGameStore.getState().toggleDoorLock(d.id)}
                            className="flex w-full items-center gap-2 rounded-md border border-border bg-surface-2 px-3 py-2 text-left"
                          >
                            {locked ? <Lock className="size-3.5 text-danger" /> : <Unlock className="size-3.5 text-ok" />}
                            <span className="flex-1 text-sm text-fg">{d.label}</span>
                            <span className="text-[11px] text-muted">{locked ? "verrouillée" : "ouverte"}</span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}

              {tab === "services" && (
                <div className="space-y-3">
                  <p className="flex items-center gap-1.5 text-[10px] tracking-[0.2em] text-subtle uppercase">
                    <Flame className="size-3" />
                    {heatById(state.heat).label} · {Math.round(state.indoorC)} °C
                  </p>
                  <p className="text-xs text-muted">
                    {heatHint(state, useGameStore.getState().gridOutage, useGameStore.getState().surv.ambient)}
                  </p>
                  {useGameStore.getState().gridOutage && (
                    <p className="text-xs text-danger">{outageLabel(useGameStore.getState().gridOutage!.kind)}</p>
                  )}
                  <ul className="space-y-1">
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
                            className="flex w-full items-center gap-2 rounded-md border border-border bg-surface-2 px-3 py-2 text-left disabled:opacity-70"
                          >
                            <span className="min-w-0 flex-1">
                              <span className="block text-sm text-fg">{h.label}</span>
                              <span className="block text-[11px] text-muted">{h.hint}</span>
                            </span>
                            <span className="hud-num text-xs text-fg">
                              {on ? "posé" : h.price === 0 ? "inclus" : formatCad(total)}
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                  <div className="grid grid-cols-2 gap-1">
                    <button
                      type="button"
                      className="rounded-md border border-border bg-surface-2 px-2 py-2 text-xs"
                      onClick={() => {
                        useGameStore.getState().toggleHeat();
                        refresh();
                      }}
                    >
                      {state.heatOn ? "Couper chauffage" : "Allumer"}
                    </button>
                    <button
                      type="button"
                      className="rounded-md border border-border bg-surface-2 px-2 py-2 text-xs"
                      onClick={() => {
                        useGameStore.getState().toggleHydro();
                        refresh();
                      }}
                    >
                      Hydro {state.hydroOn ? "on" : "off"}
                    </button>
                    <button
                      type="button"
                      className="rounded-md border border-border bg-surface-2 px-2 py-2 text-xs"
                      onClick={() => {
                        useGameStore.getState().toggleWater();
                        refresh();
                      }}
                    >
                      Eau {state.waterOn ? "ouverte" : "fermée"}
                    </button>
                    <button
                      type="button"
                      className="rounded-md border border-border bg-surface-2 px-2 py-2 text-xs"
                      onClick={() => useGameStore.getState().loadWood(1)}
                    >
                      Bois {state.wood.toFixed(0)}/{8}
                    </button>
                  </div>
                  {state.broke && (
                    <button
                      type="button"
                      className="w-full rounded-md bg-accent px-3 py-2 text-sm text-accent-fg"
                      onClick={() => {
                        useGameStore.getState().repairFurnace();
                        refresh();
                      }}
                    >
                      Réparer fournaise · {formatCad(withTax(FURNACE_REPAIR).total)}
                    </button>
                  )}
                  {state.frozen && (
                    <button
                      type="button"
                      className="w-full rounded-md bg-accent px-3 py-2 text-sm text-accent-fg"
                      onClick={() => {
                        useGameStore.getState().thawPipes();
                        refresh();
                      }}
                    >
                      Dégeler tuyaux · {formatCad(withTax(PIPE_THAW).total)}
                    </button>
                  )}
                  <p className="flex items-center gap-1.5 text-[10px] tracking-[0.2em] text-subtle uppercase">
                    <Zap className="size-3" />
                    Eau
                  </p>
                  <div className="grid grid-cols-2 gap-1">
                    {WATER_CATALOG.map((w) => (
                      <button
                        key={w.id}
                        type="button"
                        onClick={() => {
                          const ok = useGameStore.getState().setWater(w.id);
                          if (ok) refresh();
                        }}
                        className={`rounded-md border px-2 py-2 text-left text-[11px] ${
                          state.water === w.id
                            ? "border-border-strong bg-surface-2 text-fg"
                            : "border-border bg-surface text-muted"
                        }`}
                      >
                        {w.label}
                        <span className="mt-0.5 block text-[10px] text-subtle">{w.hint}</span>
                      </button>
                    ))}
                  </div>
                  {(() => {
                    const bill = monthlyBill(state, 1);
                    return (
                      <p className="text-[11px] text-muted">
                        Facture type · Hydro {formatCad(bill.hydro)} · {waterById(state.water).label} {formatCad(bill.water)} · entretien {formatCad(bill.maint)}
                      </p>
                    );
                  })()}
                </div>
              )}

              {(tab === "marche" || !house) && (
                <div className="space-y-3">
                  <p className="text-xs text-muted">
                    Condition {Math.round(cond)} · loyer {formatCad(p.rentPerDay)}/jour
                    {mortgage ? ` · hypothèque ${formatCad(mortgage.monthlyPayment)}` : ""}
                  </p>
                  {rental ? (
                    <button
                      type="button"
                      className="w-full rounded-md border border-border bg-surface-2 px-3 py-2 text-sm"
                      onClick={() => useGameStore.getState().evictTenant()}
                    >
                      Évincer {rental.tenantName} · {rental.daysLeft} j
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="w-full rounded-md border border-border-strong bg-surface-2 px-3 py-2 text-sm"
                      onClick={() => useGameStore.getState().rentOut()}
                    >
                      Louer à un ménage du rang
                    </button>
                  )}
                  {listed ? (
                    <button
                      type="button"
                      className="w-full rounded-md border border-border bg-surface-2 px-3 py-2 text-sm"
                      onClick={() => useGameStore.getState().unlistProperty()}
                    >
                      Retirer du MLS
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="w-full rounded-md border border-border-strong bg-surface-2 px-3 py-2 text-sm"
                      onClick={() => useGameStore.getState().listProperty()}
                    >
                      Mettre en vente (+15 %)
                    </button>
                  )}
                  <button
                    type="button"
                    className="w-full rounded-md border border-border bg-surface-2 px-3 py-2 text-sm"
                    onClick={() => useGameStore.getState().maintainRealty()}
                  >
                    Entretien 40 $
                  </button>
                  <p className="text-[10px] tracking-[0.2em] text-subtle uppercase">Accès</p>
                  {(realty.access[p.id] ?? []).length === 0 && (
                    <p className="text-[11px] text-muted">Personne d'autre n'a la clé.</p>
                  )}
                  {(realty.access[p.id] ?? []).map((n: string) => (
                    <button
                      key={n}
                      type="button"
                      className="flex w-full items-center justify-between rounded-md border border-border bg-surface-2 px-3 py-2 text-sm"
                      onClick={() => useGameStore.getState().revokeRealtyAccess(n)}
                    >
                      <span>{n}</span>
                      <span className="text-[10px] text-subtle">retirer</span>
                    </button>
                  ))}
                  {realty.visits.filter((v: any) => v.propertyId === p.id).map((v: any) => (
                    <button
                      key={v.id}
                      type="button"
                      className="flex w-full items-center justify-between rounded-md border border-border-strong bg-surface-2 px-3 py-2 text-sm"
                      onClick={() => useGameStore.getState().grantRealtyAccess(v.name)}
                    >
                      <span>Visite · {v.name}</span>
                      <span className="text-[10px] text-accent">accorder</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {notice && <p className="mt-3 text-sm text-accent">{notice}</p>}
        <p className="mt-3 flex items-center gap-1.5 text-[10px] text-subtle">
          <Landmark className="size-3" />
          {mine ? "Loyers, MLS, hypothèque Caisse" : "Espèces, Caisse ou mise de fonds 20 %"}
        </p>
      </div>
    </div>
  );
}