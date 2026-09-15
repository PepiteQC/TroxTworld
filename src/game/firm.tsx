import { useState } from "react";
import { X } from "lucide-react";
import {
  canOperate,
  FIRM_TYPES,
  firmSpec,
  MAPAQ_GRANTS,
  canApplyGrant,
  PERMIT_FEES,
  seasonalFactor,
  startupTotal,
  stockValue,
  type FirmType,
} from "./business";
import { FLEET } from "./fleet";
import { formatCad, itemById, type ShopItem } from "./commerce";
import { ITEM_ICONS } from "./itemIcons";
import { persist, useGameStore } from "./store";

export function FirmOverlay() {
  const firm = useGameStore((s) => s.firm);
  const notice = useGameStore((s) => s.notice);
  const cash = useGameStore((s) => s.cash);
  const [name, setName] = useState(firm?.tradeName ?? "");

  return (
    <div className="absolute inset-0 z-40 flex items-end justify-center bg-bg/70 px-3 py-4 backdrop-blur-sm sm:items-center">
      <div className="hud-panel w-full max-w-lg rounded-xl p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] tracking-[0.25em] text-subtle uppercase">Registraire</p>
            <h2 className="font-display text-3xl italic">{firm ? firm.tradeName : "Entreprise"}</h2>
            <p className="mt-1 text-sm text-muted">
              {firm ? `NEQ ${firm.neq} · ${firm.village}` : "Immatriculation, permis, caisse distincte."}
            </p>
          </div>
          <button
            type="button"
            className="flex size-11 items-center justify-center rounded-md text-muted hover:text-fg"
            onClick={() => useGameStore.getState().closeFirm()}
            aria-label="Fermer l'entreprise"
          >
            <X className="size-5" />
          </button>
        </div>
        {notice && <p className="mt-3 text-sm text-accent">{notice}</p>}
        {!firm ? (
          <FoundForm cash={cash} name={name} setName={setName} />
        ) : (
          <ManageFirm />
        )}
      </div>
    </div>
  );
}

function FoundForm({ cash, name, setName }: { cash: number; name: string; setName: (v: string) => void }) {
  const [type, setType] = useState<FirmType>("cafe");
  const spec = firmSpec(type);
  const total = startupTotal(type);
  return (
    <>
      <label className="mt-4 block">
        <span className="text-[10px] tracking-[0.2em] text-subtle uppercase">Enseigne</span>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={spec.label}
          className="mt-1 h-11 w-full rounded-md border border-border bg-surface px-3 text-sm text-fg"
        />
      </label>
      <ul className="mt-3 max-h-[32vh] space-y-1 overflow-auto">
        {FIRM_TYPES.map((s) => (
          <li key={s.type}>
            <button
              type="button"
              onClick={() => setType(s.type)}
              className={`flex w-full items-start gap-3 rounded-lg border px-3 py-2.5 text-left ${
                type === s.type ? "border-border-strong bg-surface-2" : "border-border bg-surface"
              }`}
            >
              <span className="min-w-0 flex-1">
                <span className="block text-sm text-fg">{s.label}</span>
                <span className="block text-xs text-muted">{s.hint}</span>
              </span>
              <span className="hud-num shrink-0 text-sm text-fg">{formatCad(startupTotal(s.type))}</span>
            </button>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-xs text-muted">
        Capital {formatCad(spec.startup)} + permis. Caisse perso {formatCad(cash)}.
      </p>
      <button
        type="button"
        className="mt-3 h-11 w-full rounded-md border border-border-strong bg-surface-2 text-sm text-fg"
        onClick={() => {
          useGameStore.getState().foundFirm(type, name.trim() || spec.label);
          persist();
        }}
      >
        Immatriculer · {formatCad(total)}
      </button>
    </>
  );
}

function ManageFirm() {
  const firm = useGameStore((s) => s.firm)!;
  const inventory = useGameStore((s) => s.inventory);
  const op = canOperate(firm);

  const inventoryMap = inventory as Record<string, number>;
  const stockMap = firm.stock as Record<string, number>;

  const bag = Object.entries(inventoryMap)
    .filter(([, n]) => Number(n) > 0)
    .map(([id, n]) => ({ item: itemById(id), n: Number(n) }))
    .filter((x): x is { item: ShopItem; n: number } => Boolean(x.item));

  const stock = Object.entries(stockMap)
    .filter(([, n]) => Number(n) > 0)
    .map(([id, n]) => ({ item: itemById(id), n: Number(n) }))
    .filter((x): x is { item: ShopItem; n: number } => Boolean(x.item));

  return (
    <div className="mt-4 max-h-[52vh] space-y-3 overflow-auto">
      <div className="rounded-lg border border-border bg-surface-2 px-3 py-2.5">
        <p className="text-[10px] tracking-[0.2em] text-subtle uppercase">{firm.status.replace("_", " ")}</p>
        <p className="hud-num text-lg text-fg">{formatCad(firm.balance)}</p>
        <p className="text-xs text-muted">
          TPS/TVQ due {formatCad(firm.taxOwed)} · CA {formatCad(firm.lifetimeRevenue)} · {firm.staff ?? 0} employé{(firm.staff ?? 0) === 1 ? "" : "s"}
        </p>
        <p className="text-[11px] text-subtle">Saison ×{seasonalFactor(firm.type, new Date().getMonth() + 1).toFixed(2)}</p>
        <div className="mt-2 flex gap-1.5">
          <button
            type="button"
            className="h-10 flex-1 rounded-md border border-border-strong bg-surface text-xs text-fg"
            onClick={() => useGameStore.getState().toggleFirmOpen()}
          >
            {firm.isOpen ? "Fermer" : "Ouvrir"}
          </button>
          <button
            type="button"
            className="h-10 flex-1 rounded-md border border-border bg-surface text-xs text-muted"
            onClick={() => useGameStore.getState().withdrawFirm()}
          >
            Retirer
          </button>
          <button
            type="button"
            className="h-10 flex-1 rounded-md border border-border bg-surface text-xs text-muted"
            onClick={() => useGameStore.getState().payFirmTax()}
          >
            Remettre taxes
          </button>
        </div>
        <div className="mt-2 flex gap-1.5">
          <button
            type="button"
            className="h-10 flex-1 rounded-md border border-border bg-surface text-xs text-muted"
            onClick={() => useGameStore.getState().hireStaff()}
          >
            Embaucher 80 $
          </button>
          <button
            type="button"
            className="h-10 flex-1 rounded-md border border-border bg-surface text-xs text-muted"
            onClick={() => useGameStore.getState().fireStaff()}
          >
            Congédier
          </button>
        </div>
      </div>
      <div>
        <p className="text-[10px] tracking-[0.2em] text-subtle uppercase">Permis</p>
        <ul className="mt-1 space-y-1">
          {firmSpec(firm.type).permits.map((p) => {
            const held = firm.permits.some((x: { type: string }) => x.type === p);
            const spec = PERMIT_FEES[p];
            return (
              <li key={p} className="flex items-center justify-between rounded-md border border-border bg-surface px-3 py-2">
                <span className="text-sm text-fg">
                  {spec.label}
                  <span className="text-subtle"> · {held ? "valide" : "manquant"}</span>
                </span>
                {!held && (
                  <button
                    type="button"
                    className="h-9 rounded-md border border-border-strong bg-surface-2 px-3 text-xs text-fg"
                    onClick={() => useGameStore.getState().buyPermit(p)}
                  >
                    {formatCad(spec.fee)}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
        {!op.ok && <p className="mt-2 text-xs text-danger">En démarrage — permis manquants.</p>}
      </div>
      <div>
        <p className="text-[10px] tracking-[0.2em] text-subtle uppercase">Subventions MAPAQ</p>
        <ul className="mt-1 space-y-1">
          {MAPAQ_GRANTS.map((g) => {
            const paid = (firm.grants ?? {})[g.id];
            const check = canApplyGrant(firm, g.id);
            return (
              <li key={g.id} className="rounded-md border border-border bg-surface px-3 py-2">
                <div className="flex items-start justify-between gap-2">
                  <span className="min-w-0">
                    <span className="block text-sm text-fg">{g.short}</span>
                    <span className="block text-[11px] text-muted">{g.hint}</span>
                  </span>
                  {paid ? (
                    <span className="hud-num shrink-0 text-sm text-fg">{formatCad(paid)}</span>
                  ) : (
                    <button
                      type="button"
                      disabled={!check.ok}
                      className="h-9 shrink-0 rounded-md border border-border-strong bg-surface-2 px-3 text-xs text-fg disabled:opacity-40"
                      onClick={() => useGameStore.getState().applyMapaqGrant(g.id)}
                    >
                      {check.ok ? formatCad(check.amount) : "N/A"}
                    </button>
                  )}
                </div>
                {!paid && !check.ok && <p className="mt-1 text-[11px] text-subtle">{check.reason}</p>}
              </li>
            );
          })}
        </ul>
      </div>
      <div>
        <p className="text-[10px] tracking-[0.2em] text-subtle uppercase">Flotte</p>
        <ul className="mt-1 space-y-1">
          {FLEET.filter((v) => v.forFirm?.includes(firm.type)).map((v) => {
            const have = useGameStore.getState().ownedVehicles.includes(v.id);
            return (
              <li key={v.id} className="flex items-center justify-between rounded-md border border-border bg-surface px-3 py-2 text-sm">
                <span className="text-fg">
                  {v.name}
                  <span className="text-subtle"> · {have ? "au garage" : "requis"}</span>
                </span>
                {!have && (
                  <button
                    type="button"
                    className="h-9 rounded-md border border-border-strong bg-surface-2 px-3 text-xs text-fg"
                    onClick={() => useGameStore.getState().openGarage()}
                  >
                    {formatCad(v.price)}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      </div>
      {firmSpec(firm.type).model === "comptoir" && (
        <div>
          <p className="text-[10px] tracking-[0.2em] text-subtle uppercase">
            Stock · {formatCad(stockValue(firm.stock))}
          </p>
          {stock.length === 0 ? (
            <p className="mt-1 text-xs text-subtle">Transférez du sac pour vendre.</p>
          ) : (
            <ul className="mt-1 space-y-1">
              {stock.map(({ item, n }) => (
                <li key={item.id}>
                  <button
                    type="button"
                    className="flex w-full items-center justify-between rounded-md border border-border bg-surface px-3 py-2 text-sm text-fg"
                    onClick={() => useGameStore.getState().stockOut(item.id)}
                  >
                    <span>
                      {item.name} · ×{n}
                    </span>
                    <span className="text-xs text-muted">Sortir 1</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {bag.length > 0 && (
            <ul className="mt-2 space-y-1">
              {bag.slice(0, 8).map(({ item, n }) => {
                const Icon = ITEM_ICONS[item.icon];
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      className="flex w-full items-center gap-2 rounded-md border border-border bg-surface-2 px-3 py-2 text-left"
                      onClick={() => useGameStore.getState().stockIn(item.id)}
                    >
                      <Icon className="size-3.5 text-accent" />
                      <span className="flex-1 text-sm text-fg">
                        {item.name} · ×{n}
                      </span>
                      <span className="text-xs text-muted">En stock</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}