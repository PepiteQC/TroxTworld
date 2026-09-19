import { useState } from "react";
import { Backpack, Car, X, Shield, Scale, FileText } from "lucide-react";
import {
  bagCapacity,
  bagGroup,
  bagValue,
  bagWeight,
  formatCad,
  itemById,
  sellPrice,
  type BagGroup,
  type ShopItem,
} from "../../commerce";
import type { PortneufEngine } from "../../engine";
import { FLEET, persoFleet, proFleet, type VehicleId } from "../../fleet";
import { ProductThumb } from "./productThumb";
import { persist, useGameStore } from "../../store";
import { getWeapon } from "../../weapons";

// Filtres immersifs et bien traduits
const FILTERS: { id: BagGroup; label: string }[] = [
  { id: "all", label: "Tout afficher" },
  { id: "food", label: "Ravitaillement" },
  { id: "gear", label: "Outillage" },
  { id: "wear", label: "Garde-robe" },
  { id: "hunt", label: "Chasse & Survie" },
  { id: "loot", label: "Récupération" },
];

export function InventoryOverlay({ engine }: { engine: PortneufEngine | null }) {
  const inventory = useGameStore((s) => s.inventory);
  const notice = useGameStore((s) => s.notice);
  const equipped = useGameStore((s) => s.equippedTool);
  const pack = useGameStore((s) => s.equippedPack);

  const [filter, setFilter] = useState<BagGroup>("all");
  const [openId, setOpenId] = useState<string | null>(null);

  const cap = bagCapacity(pack);
  const inventoryMap = inventory as Record<string, number>;

  const bag = Object.entries(inventoryMap)
    .filter(([, n]) => Number(n) > 0)
    .map(([id, n]) => ({ item: itemById(id), n: Number(n) }))
    .filter((x): x is { item: ShopItem; n: number } => Boolean(x.item))
    .filter((x) => filter === "all" || bagGroup(x.item) === filter)
    .sort((a, b) => b.item.weight * b.n - a.item.weight * a.n);

  const kg = bagWeight(inventoryMap);
  const fill = cap > 0 ? kg / cap : 0;
  const overload = fill > 1;
  const worth = bagValue(inventoryMap);

  const applyGear = (id: string) => {
    const item = itemById(id);
    const ok = useGameStore.getState().useItem(id);

    if (ok && item?.use === "wear") {
      engine?.applyAppearance(useGameStore.getState().appearance);
    }

    engine?.walker.setHeld(useGameStore.getState().equippedTool);
    engine?.walker.setPack(useGameStore.getState().equippedPack);
  };

  return (
    <div className="absolute inset-0 z-40 flex items-end justify-center bg-bg/85 px-3 py-4 backdrop-blur-md sm:items-center">
      <div className="hud-panel w-full max-w-lg rounded-xl border border-border-strong bg-background p-5 shadow-2xl">
        {/* En-tête de l'inventaire */}
        <div className="flex items-start justify-between gap-3 border-b border-border pb-4">
          <div>
            <p className="text-[10px] font-bold tracking-[0.25em] text-accent uppercase">
              Équipement de transport
            </p>
            <h2 className="font-display text-3xl italic font-black text-fg">Inventaire</h2>

            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
              <span className="flex items-center gap-1.5 font-medium">
                <Backpack className={`size-3.5 ${overload ? "text-danger" : "text-accent"}`} />
                {kg.toLocaleString("fr-CA", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} / {cap} kg
                {pack && <span className="text-[10px] bg-surface-2 px-1.5 py-0.5 rounded text-accent">Équipé</span>}
              </span>
              <span>•</span>
              <span className="text-subtle">
                Valeur marchande : <strong className="text-fg font-semibold">{formatCad(worth)}</strong>
              </span>
            </div>

            {/* Jauge de charge */}
            <div className="mt-3 flex items-center gap-2">
              <div className="h-2 w-44 overflow-hidden rounded-full bg-surface-2">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    overload ? "bg-danger animate-pulse" : fill > 0.85 ? "bg-accent" : "bg-ok"
                  }`}
                  style={{ width: `${Math.min(100, fill * 100)}%` }}
                />
              </div>
              {overload && (
                <span className="text-[10px] font-bold uppercase tracking-wider text-danger animate-pulse">
                  ⚠️ Surcharge active
                </span>
              )}
            </div>
          </div>

          <button
            type="button"
            className="flex size-10 items-center justify-center rounded-lg bg-surface hover:bg-surface-2 text-muted hover:text-fg transition-colors"
            onClick={() => useGameStore.getState().closeInventory()}
            aria-label="Fermer l'inventaire"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Filtres de catégories */}
        <div className="mt-4 flex flex-wrap gap-1.5">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={`h-8 rounded-lg px-3 text-xs font-medium transition-all ${
                filter === f.id
                  ? "bg-accent text-accent-fg shadow-sm"
                  : "bg-surface text-muted hover:bg-surface-2 hover:text-fg"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {notice && (
          <div className="mt-3 rounded-lg bg-accent/10 border border-accent/20 px-3 py-2 text-xs text-accent">
            {notice}
          </div>
        )}

        {/* Liste des items */}
        {bag.length === 0 ? (
          <div className="mt-8 py-12 text-center">
            <p className="text-sm text-subtle">
              {filter === "all"
                ? "Votre sac est vide. Allez faire des provisions au dépanneur ou parlez à Ti-Guy."
                : "Aucun objet de cette catégorie dans vos poches."}
            </p>
          </div>
        ) : (
          <ul className="mt-4 max-h-[42vh] space-y-1.5 overflow-y-auto pr-1">
            {bag.map(({ item, n }) => {
              const on = openId === item.id;
              const worn = equipped === item.id || pack === item.id;
              const stackKg = Math.round(item.weight * n * 10) / 10;

              return (
                <li
                  key={item.id}
                  className={`rounded-lg border transition-all ${
                    on 
                      ? "border-accent/40 bg-surface shadow-sm" 
                      : "border-border bg-surface-2 hover:border-border-strong"
                  }`}
                >
                  <button
                    type="button"
                    className="flex w-full items-center gap-3 p-3 text-left"
                    onClick={() => setOpenId(on ? null : item.id)}
                  >
                    <ProductThumb
                      id={item.id}
                      icon={item.icon}
                      alt={item.name}
                      className="size-12 rounded-md object-cover shadow-inner bg-background"
                    />

                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5 text-sm font-semibold text-fg">
                        {item.name}
                        <span className="text-xs text-accent font-bold">×{n}</span>
                        {worn && (
                          <span className="rounded bg-accent/15 px-1.5 py-0.5 text-[9px] font-bold text-accent uppercase tracking-wider">
                            Équipé
                          </span>
                        )}
                      </span>

                      <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted">
                        <span>{stackKg} kg</span>
                        <span className="text-subtle">•</span>
                        <span>Valeur : {formatCad(sellPrice(item) * n)}</span>
                        
                        {item.hunger && (
                          <>
                            <span className="text-subtle">•</span>
                            <span className="text-ok font-medium">Faim +{item.hunger}%</span>
                          </>
                        )}
                        {item.thirst && (
                          <>
                            <span className="text-subtle">•</span>
                            <span className="text-ok font-medium">Soif +{item.thirst}%</span>
                          </>
                        )}

                        {/* Réglementation Légale des Armes (Québec / Canada) */}
                        {(() => {
                          const weapon = getWeapon(item.id);
                          if (!weapon) return null;

                          if (weapon.policeOnly) {
                            return (
                              <span className="inline-flex items-center gap-1 rounded bg-danger/10 px-1.5 py-0.5 text-[10px] font-bold text-danger">
                                <Shield className="size-3" /> Matériel SQ d'ordonnance
                              </span>
                            );
                          }
                          if (weapon.legal === "prohibee") {
                            return (
                              <span className="inline-flex items-center gap-1 rounded bg-danger/10 px-1.5 py-0.5 text-[10px] font-bold text-danger">
                                <Scale className="size-3" /> Arme Prohibée (Illégale)
                              </span>
                            );
                          }
                          if (weapon.need.length) {
                            return (
                              <span className="inline-flex items-center gap-1 rounded bg-accent/10 px-1.5 py-0.5 text-[10px] font-bold text-accent">
                                <FileText className="size-3" /> Enregistrement PPA obligatoire
                              </span>
                            );
                          }
                          return null;
                        })()}
                      </span>
                    </span>
                  </button>

                  {/* Options d'interaction de l'item */}
                  {on && (
                    <div className="grid grid-cols-2 gap-1.5 border-t border-border bg-surface-2/50 p-2.5 rounded-b-lg">
                      {(item.use === "tool" || item.use === "wear") && (
                        <button
                          type="button"
                          className="h-9 rounded-md bg-accent px-3 text-xs font-bold text-accent-fg hover:opacity-90 transition-opacity"
                          onClick={() => applyGear(item.id)}
                        >
                          {worn ? "Déséquiper" : item.use === "wear" ? "Enfiler le vêtement" : "Prendre en main"}
                        </button>
                      )}

                      {item.use && item.use !== "tool" && item.use !== "wear" && (
                        <button
                          type="button"
                          className="h-9 rounded-md bg-accent px-3 text-xs font-bold text-accent-fg hover:opacity-90 transition-opacity"
                          onClick={() => useGameStore.getState().useItem(item.id)}
                        >
                          {item.use === "drink"
                            ? "S'hydrater"
                            : item.use === "eat"
                              ? "Consommer"
                              : "Utiliser l'objet"}
                        </button>
                      )}

                      <button
                        type="button"
                        className="h-9 rounded-md border border-border bg-background text-xs font-medium text-muted hover:text-fg transition-colors"
                        onClick={() => useGameStore.getState().dropItem(item.id, 1)}
                      >
                        Se délester de (1)
                      </button>

                      {n > 1 && (
                        <button
                          type="button"
                          className="h-9 rounded-md border border-border bg-background text-xs font-medium text-muted hover:text-fg transition-colors"
                          onClick={() => useGameStore.getState().dropItem(item.id, n)}
                        >
                          Tout jeter
                        </button>
                      )}

                      <button
                        type="button"
                        className="h-9 col-span-2 rounded-md border border-border bg-background hover:bg-surface text-xs font-bold text-ok hover:text-ok-fg transition-all"
                        onClick={() => useGameStore.getState().sellStack(item.id)}
                      >
                        Vendre le lot au marchand ({formatCad(sellPrice(item) * n)})
                      </button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

export function GarageOverlay({ engine }: { engine: PortneufEngine | null }) {
  const cash = useGameStore((s) => s.cash);
  const vehicleId = useGameStore((s) => s.vehicleId);
  const owned = useGameStore((s) => s.ownedVehicles);
  const notice = useGameStore((s) => s.notice);
  const firm = useGameStore((s) => s.firm);

  const take = (id: VehicleId) => {
    const s = useGameStore.getState();
    const ok = s.ownedVehicles.includes(id) ? s.equipVehicle(id) : s.buyVehicle(id);

    if (ok) {
      engine?.swapVehicle(id);
      persist();
    }
  };

  return (
    <div className="absolute inset-0 z-40 flex items-end justify-center bg-bg/85 px-3 py-4 backdrop-blur-md sm:items-center">
      <div className="hud-panel w-full max-w-lg rounded-xl border border-border-strong bg-background p-5 shadow-2xl">
        {/* En-tête du Garage */}
        <div className="flex items-start justify-between gap-3 border-b border-border pb-4">
          <div>
            <p className="text-[10px] font-bold tracking-[0.25em] text-accent uppercase">
              Garage municipal Gosselin & Fils
            </p>
            <h2 className="font-display text-3xl italic font-black text-fg">Gestion du Parc-Auto</h2>

            <div className="mt-1.5 flex flex-wrap gap-x-3 text-xs text-muted">
              <span className="font-medium text-fg">
                Solde personnel : {formatCad(cash)}
              </span>
              {firm && (
                <>
                  <span className="text-subtle">•</span>
                  <span className="text-accent font-semibold">
                    Trésorerie {firm.tradeName} : {formatCad(firm.balance)}
                  </span>
                </>
              )}
            </div>
          </div>

          <button
            type="button"
            className="flex size-10 items-center justify-center rounded-lg bg-surface hover:bg-surface-2 text-muted hover:text-fg transition-colors"
            onClick={() => useGameStore.getState().closeGarage()}
            aria-label="Fermer le garage"
          >
            <X className="size-5" />
          </button>
        </div>

        {notice && (
          <div className="mt-3 rounded-lg bg-accent/10 border border-accent/20 px-3 py-2 text-xs text-accent">
            {notice}
          </div>
        )}

        <div className="mt-4 max-h-[50vh] overflow-y-auto pr-1 space-y-4">
          {/* Section Véhicules Personnels */}
          <div>
            <p className="text-[10px] font-bold tracking-[0.15em] text-subtle uppercase mb-2">
              Véhicules Personnels (Immatriculation Individuelle)
            </p>
            <FleetList list={persoFleet()} owned={owned} on={vehicleId} take={take} />
          </div>

          {/* Section Véhicules Commerciaux */}
          <div className="border-t border-border/60 pt-4">
            <div className="flex justify-between items-center mb-2">
              <p className="text-[10px] font-bold tracking-[0.15em] text-subtle uppercase">
                Gamme Commerciale & Utilitaire
              </p>
              {firm && (
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-accent/15 text-accent uppercase">
                  {firm.type}
                </span>
              )}
            </div>

            {!firm ? (
              <div className="rounded-lg bg-surface-2 border border-border p-3 text-xs text-muted">
                ⚠️ <strong className="text-fg">Enregistrement au REQ requis :</strong> Vous devez enregistrer votre entreprise auprès du Registre des entreprises du Québec pour acquérir et gérer une flotte commerciale.
              </div>
            ) : (
              <FleetList list={proFleet()} owned={owned} on={vehicleId} take={take} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function FleetList({
  list,
  owned,
  on,
  take,
}: {
  list: typeof FLEET;
  owned: VehicleId[];
  on: VehicleId;
  take: (id: VehicleId) => void;
}) {
  return (
    <ul className="space-y-1.5">
      {list.map((v) => {
        const have = owned.includes(v.id);
        const active = on === v.id;

        return (
          <li key={v.id}>
            <button
              type="button"
              onClick={() => take(v.id)}
              className={`flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-all ${
                active
                  ? "border-accent bg-accent/5 ring-1 ring-accent"
                  : "border-border bg-surface-2 hover:border-border-strong hover:bg-surface"
              }`}
            >
              <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-background border border-border shadow-inner">
                <Car className={`size-5 ${active ? "text-accent animate-pulse" : "text-muted"}`} />
              </span>

              <span className="min-w-0 flex-1">
                <span className="block text-sm font-bold text-fg">{v.name}</span>
                <span className="block text-xs text-muted mt-0.5">
                  {v.hint} • Vitesse max : <strong className="text-subtle font-semibold">{Math.round(v.maxSpeed * 3.6)} km/h</strong>
                </span>
              </span>

              <span className="shrink-0 text-right">
                {active ? (
                  <span className="inline-flex items-center rounded bg-ok/10 px-2.5 py-1 text-xs font-bold text-ok uppercase tracking-wide">
                    Actif
                  </span>
                ) : have ? (
                  <span className="inline-flex items-center rounded bg-surface border border-border px-2.5 py-1 text-xs font-bold text-muted hover:text-fg">
                    Sortir le véhicule
                  </span>
                ) : (
                  <span className="text-sm font-black text-accent bg-accent/10 px-2.5 py-1 rounded">
                    {formatCad(v.price)}
                  </span>
                )}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}