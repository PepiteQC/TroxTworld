import { Flame, Hammer, KeyRound, Landmark, Lock, Unlock, Wallet, Wrench, X, Zap } from "lucide-react";
import { useState } from "react";
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
  houseValue,
  type RenoGroup,
} from "./house";
import { deedById, withTax } from "./rp";
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

const AMOUNTS = [50, 100, 250, 500];

export function AtmOverlay() {
  const cash = useGameStore((s) => s.cash);
  const bank = useGameStore((s) => s.bank);
  const notice = useGameStore((s) => s.notice);
  return (
    <div className="absolute inset-0 z-40 flex items-end justify-center bg-bg/70 px-3 py-4 backdrop-blur-sm sm:items-center">
      <div className="w-full max-w-sm rounded-xl border border-border-strong bg-surface p-4 shadow-hud">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] tracking-[0.2em] text-subtle uppercase">Guichet</p>
            <h2 className="font-display text-2xl italic">Desjardins</h2>
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
        <p className="mt-3 text-sm text-muted">
          Compte <span className="hud-num text-fg">{formatCad(bank)}</span>
          {" · "}espèces <span className="hud-num text-fg">{formatCad(cash)}</span>
        </p>
        <p className="mt-1 text-[11px] text-subtle">Retrait · frais 1 %</p>
        <div className="mt-4 space-y-2">
          {AMOUNTS.map((n) => (
            <div key={n} className="flex gap-2">
              <button
                type="button"
                className="flex-1 rounded-md border border-border bg-surface-2 px-3 py-2 text-sm"
                onClick={() => useGameStore.getState().atmOp("deposit", n)}
              >
                Déposer {n}&nbsp;$
              </button>
              <button
                type="button"
                className="flex-1 rounded-md border border-border bg-surface-2 px-3 py-2 text-sm"
                onClick={() => useGameStore.getState().atmOp("withdraw", n)}
              >
                Retirer {n}&nbsp;$
              </button>
            </div>
          ))}
        </div>
        {notice && <p className="mt-3 text-sm text-accent">{notice}</p>}
        <p className="mt-3 flex items-center gap-1.5 text-[10px] text-subtle">
          <Wallet className="size-3" />
          TPS+TVQ n'est pas sur le guichet
        </p>
      </div>
    </div>
  );
}

const TABS: { id: "travaux" | "garage" | "cles" | "services"; label: string }[] = [
  { id: "travaux", label: "Travaux" },
  { id: "garage", label: "Garage" },
  { id: "cles", label: "Clés" },
  { id: "services", label: "Chauffage" },
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
  const [tab, setTab] = useState<"travaux" | "garage" | "cles" | "services">("travaux");
  const deed = deedById(deedId ?? "");
  if (!deed) return null;
  const mine = owned.includes(deed.id);
  const { tax, total } = withTax(deed.price);
  const state = houses[deed.id] ?? emptyHouse(deed.id);
  const value = houseValue(deed, state);
  const refresh = () => engine?.refreshHouses();

  return (
    <div className="absolute inset-0 z-40 flex items-end justify-center bg-bg/70 px-3 py-4 backdrop-blur-sm sm:items-center">
      <div className="hud-panel flex max-h-[min(88dvh,720px)] w-full max-w-lg flex-col overflow-hidden rounded-xl p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] tracking-[0.2em] text-subtle uppercase">{deed.town}</p>
            <h2 className="font-display text-2xl italic">{deed.name}</h2>
            <p className="mt-1 text-sm text-muted">
              {mine ? (
                <>
                  Évaluation <span className="hud-num text-fg">{formatCad(value)}</span>
                  {" · "}
                  {state.renos.length} travaux
                </>
              ) : (
                <>
                  Coquille vide · {formatCad(deed.price)} + TPS+TVQ {formatCad(tax)}
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
              Sol, murs, portes, fenêtres. Le reste se construit : cuisine, sous-sol, garage, piscine.
            </p>
            <button
              type="button"
              className="mt-4 w-full rounded-md bg-accent px-3 py-2.5 text-sm text-accent-fg"
              onClick={() => {
                const ok = useGameStore.getState().buyDeed();
                if (ok) refresh();
              }}
            >
              Acheter · clés incluses
            </button>
          </>
        )}

        {mine && (
          <>
            <div className="mt-3 grid grid-cols-4 gap-1 rounded-lg border border-border p-1">
              {TABS.map((t) => (
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
            </div>
          </>
        )}

        {notice && <p className="mt-3 text-sm text-accent">{notice}</p>}
        <p className="mt-3 flex items-center gap-1.5 text-[10px] text-subtle">
          <Landmark className="size-3" />
          {mine ? "La valeur monte avec les travaux" : "Banque d'abord, espèces ensuite"}
        </p>
      </div>
    </div>
  );
}
