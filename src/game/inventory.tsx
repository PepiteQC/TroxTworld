import { useState } from "react";
import { Backpack, Car, X } from "lucide-react";
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
} from "./commerce";
import type { PortneufEngine } from "./engine";
import { FLEET, persoFleet, proFleet, type VehicleId } from "./fleet";
import { ProductThumb } from "./productThumb";
import { persist, useGameStore } from "./store";
import { getWeapon } from "./weapons";

const FILTERS: { id: BagGroup; label: string }[] = [
  { id: "all", label: "Tout" },
  { id: "food", label: "Table" },
  { id: "gear", label: "Outils" },
  { id: "wear", label: "Habits" },
  { id: "hunt", label: "Chasse" },
  { id: "loot", label: "Coffre" },
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
    <div className="absolute inset-0 z-40 flex items-end justify-center bg-bg/70 px-3 py-4 backdrop-blur-sm sm:items-center">
      <div className="hud-panel w-full max-w-lg rounded-xl p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] tracking-[0.25em] text-subtle uppercase">Sac</p>
            <h2 className="font-display text-3xl italic">Inventaire</h2>

            <p className="mt-1 flex items-center gap-1.5 text-sm text-muted">
              <Backpack className="size-3.5 text-accent" />
              {kg.toLocaleString("fr-CA")} / {cap} kg
              {pack ? " · porté" : ""}
              {overload ? " · surcharge" : ""}
            </p>

            <p className="hud-num mt-0.5 text-[11px] text-subtle">
              Revente {formatCad(worth)}
            </p>

            <div className="mt-2 h-1.5 w-44 overflow-hidden rounded-full bg-surface-2">
              <div
                className={`h-full rounded-full ${
                  overload ? "bg-danger" : fill > 0.8 ? "bg-accent" : "bg-ok"
                }`}
                style={{ width: `${Math.min(100, fill * 100)}%` }}
              />
            </div>
          </div>

          <button
            type="button"
            className="flex size-11 items-center justify-center rounded-md text-muted hover:text-fg"
            onClick={() => useGameStore.getState().closeInventory()}
            aria-label="Fermer le sac"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="mt-3 flex flex-wrap gap-1">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={`h-8 rounded-md px-2.5 text-[11px] ${
                filter === f.id
                  ? "border border-border-strong bg-surface-2 text-fg"
                  : "border border-border bg-surface text-muted"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {notice && <p className="mt-3 text-sm text-accent">{notice}</p>}

        {bag.length === 0 ? (
          <p className="mt-6 text-center text-sm text-subtle">
            {filter === "all"
              ? "Sac vide — dépanneur, chasse, ou Ti-Guy."
              : "Rien dans cette poche."}
          </p>
        ) : (
          <ul className="mt-4 max-h-[48vh] space-y-1 overflow-auto">
            {bag.map(({ item, n }) => {
              const on = openId === item.id;
              const worn = equipped === item.id || pack === item.id;
              const stackKg = Math.round(item.weight * n * 10) / 10;

              return (
                <li
                  key={item.id}
                  className={`rounded-lg border px-3 py-2.5 ${
                    on ? "border-border-strong bg-surface" : "border-border bg-surface-2"
                  }`}
                >
                  <button
                    type="button"
                    className="flex w-full items-center gap-3 text-left"
                    onClick={() => setOpenId(on ? null : item.id)}
                  >
                    <ProductThumb
                      id={item.id}
                      icon={item.icon}
                      alt={item.name}
                      className="size-12"
                    />

                    <span className="min-w-0 flex-1">
                      <span className="block text-sm text-fg">
                        {item.name}
                        <span className="text-subtle"> · ×{n}</span>
                        {worn ? <span className="text-accent"> · sur soi</span> : null}
                      </span>

                      <span className="block text-xs text-muted">
                        {stackKg} kg · {formatCad(sellPrice(item) * n)}
                        {item.hunger ? ` · faim +${item.hunger}` : ""}
                        {item.thirst ? ` · soif +${item.thirst}` : ""}
                        {(() => {
                          const weapon = getWeapon(item.id);
                          if (!weapon) return null;

                          const tag =
                            weapon.policeOnly
                              ? " · SQ"
                              : weapon.legal === "prohibee"
                                ? " · prohibée"
                                : weapon.need.length
                                  ? " · PAL"
                                  : "";

                          return tag;
                        })()}
                      </span>
                    </span>
                  </button>

                  {on && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {(item.use === "tool" || item.use === "wear") && (
                        <button
                          type="button"
                          className="h-9 flex-1 rounded-md border border-border-strong bg-surface text-xs text-fg"
                          onClick={() => applyGear(item.id)}
                        >
                          {worn ? "Ranger" : item.use === "wear" ? "Porter" : "Équiper"}
                        </button>
                      )}

                      {item.use && item.use !== "tool" && item.use !== "wear" && (
                        <button
                          type="button"
                          className="h-9 flex-1 rounded-md border border-border-strong bg-surface text-xs text-fg"
                          onClick={() => useGameStore.getState().useItem(item.id)}
                        >
                          {item.use === "drink"
                            ? "Boire"
                            : item.use === "eat"
                              ? "Manger"
                              : "Utiliser"}
                        </button>
                      )}

                      <button
                        type="button"
                        className="h-9 flex-1 rounded-md border border-border bg-surface text-xs text-muted"
                        onClick={() => useGameStore.getState().dropItem(item.id, 1)}
                      >
                        Jeter 1
                      </button>

                      {n > 1 && (
                        <button
                          type="button"
                          className="h-9 flex-1 rounded-md border border-border bg-surface text-xs text-muted"
                          onClick={() => useGameStore.getState().dropItem(item.id, n)}
                        >
                          Jeter tout
                        </button>
                      )}

                      <button
                        type="button"
                        className="h-9 flex-1 rounded-md border border-border bg-surface text-xs text-muted"
                        onClick={() => useGameStore.getState().sellStack(item.id)}
                      >
                        Vendre
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
    <div className="absolute inset-0 z-40 flex items-end justify-center bg-bg/70 px-3 py-4 backdrop-blur-sm sm:items-center">
      <div className="hud-panel w-full max-w-lg rounded-xl p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] tracking-[0.25em] text-subtle uppercase">
              Garage Gosselin
            </p>
            <h2 className="font-display text-3xl italic">Véhicules</h2>

            <p className="mt-1 text-sm text-muted">
              {formatCad(cash)}
              {firm ? ` · caisse ${formatCad(firm.balance)}` : ""}
            </p>
          </div>

          <button
            type="button"
            className="flex size-11 items-center justify-center rounded-md text-muted hover:text-fg"
            onClick={() => useGameStore.getState().closeGarage()}
            aria-label="Fermer le garage"
          >
            <X className="size-5" />
          </button>
        </div>

        {notice && <p className="mt-3 text-sm text-accent">{notice}</p>}

        <p className="mt-4 text-[10px] tracking-[0.2em] text-subtle uppercase">
          Personnel
        </p>

        <FleetList list={persoFleet()} owned={owned} on={vehicleId} take={take} />

        <p className="mt-4 text-[10px] tracking-[0.2em] text-subtle uppercase">
          Commercial
        </p>

        <p className="mt-1 text-xs text-muted">
          {firm ? `${firm.tradeName} · ${firm.type}` : "Immatriculez au REQ pour acheter."}
        </p>

        <FleetList list={proFleet()} owned={owned} on={vehicleId} take={take} />
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
    <ul className="mt-2 space-y-1">
      {list.map((v) => {
        const have = owned.includes(v.id);
        const active = on === v.id;

        return (
          <li key={v.id}>
            <button
              type="button"
              onClick={() => take(v.id)}
              className={`flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left ${
                active ? "border-border-strong bg-surface-2" : "border-border bg-surface"
              }`}
            >
              <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-surface">
                <Car className="size-4 text-accent" />
              </span>

              <span className="min-w-0 flex-1">
                <span className="block text-sm text-fg">{v.name}</span>
                <span className="block text-xs text-muted">
                  {v.hint} · {Math.round(v.maxSpeed * 3.6)} km/h
                </span>
              </span>

              <span className="hud-num shrink-0 text-sm text-fg">
                {active ? "En route" : have ? "Prendre" : formatCad(v.price)}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}