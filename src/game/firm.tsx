import { useMemo, useState, type ReactNode } from "react";
import {
  X,
  Store,
  Wallet,
  BadgeCheck,
  Truck,
  Package,
  Landmark,
  Users,
  AlertTriangle,
  CheckCircle2,
  CalendarDays,
  KeyRound,
  Coins,
  Building2,
  ClipboardList,
  Leaf,
  ShieldCheck,
  Briefcase,
} from "lucide-react";

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

const PERMITS = PERMIT_FEES as Record<string, { label: string; fee: number }>;

type IconType = typeof Store;
type TabId = "apercu" | "permis" | "subventions" | "flotte" | "stock";

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function formatStatus(status: string) {
  const clean = String(status ?? "").split("_").join(" ");
  return clean.charAt(0).toUpperCase() + clean.slice(1);
}

function Badge({
  tone = "muted",
  children,
}: {
  tone?: "ok" | "warn" | "muted" | "accent";
  children: ReactNode;
}) {
  const tones: Record<string, string> = {
    ok: "border-border-strong bg-surface-2 text-accent",
    warn: "border-border-strong bg-surface-2 text-danger",
    muted: "border-border bg-surface text-muted",
    accent: "border-border-strong bg-surface-2 text-fg",
  };

  return (
    <span
      className={cx(
        "inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] font-medium",
        tones[tone]
      )}
    >
      {children}
    </span>
  );
}

function Callout({
  icon: Icon,
  tone = "warn",
  children,
}: {
  icon: IconType;
  tone?: "warn" | "info" | "ok";
  children: ReactNode;
}) {
  const tones: Record<string, string> = {
    warn: "border-border-strong bg-surface-2 text-danger",
    info: "border-border bg-surface text-muted",
    ok: "border-border-strong bg-surface-2 text-accent",
  };

  return (
    <div className={cx("flex items-start gap-2 rounded-lg border px-3 py-2 text-xs", tones[tone])}>
      <Icon className="mt-0.5 size-4 shrink-0" />
      <div>{children}</div>
    </div>
  );
}

function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "muted",
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  icon: IconType;
  tone?: "muted" | "ok" | "warn";
}) {
  const valueTone =
    tone === "ok" ? "text-accent" : tone === "warn" ? "text-danger" : "text-fg";

  return (
    <div className="rounded-lg border border-border bg-surface px-3 py-2.5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] uppercase tracking-[0.18em] text-subtle">{label}</p>
        <Icon className="size-3.5 text-muted" />
      </div>
      <p className={cx("hud-num mt-1 text-lg leading-none", valueTone)}>{value}</p>
      {hint ? <p className="mt-1 text-[11px] text-subtle">{hint}</p> : null}
    </div>
  );
}

function ActionButton({
  onClick,
  disabled,
  children,
  tone = "default",
  title,
}: {
  onClick: () => void;
  disabled?: boolean;
  children: ReactNode;
  tone?: "default" | "primary" | "danger";
  title?: string;
}) {
  const tones: Record<string, string> = {
    default: "border-border bg-surface text-muted hover:text-fg",
    primary: "border-border-strong bg-surface-2 text-fg",
    danger: "border-border bg-surface text-danger",
  };

  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={cx(
        "h-10 rounded-md border px-3 text-xs transition-colors disabled:cursor-not-allowed disabled:opacity-40",
        tones[tone]
      )}
    >
      {children}
    </button>
  );
}

function TabButton({
  active,
  onClick,
  icon: Icon,
  label,
  badge,
}: {
  active: boolean;
  onClick: () => void;
  icon: IconType;
  label: string;
  badge?: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        "flex shrink-0 items-center gap-2 rounded-md border px-3 py-2 text-xs transition-colors",
        active
          ? "border-border-strong bg-surface-2 text-fg"
          : "border-border bg-surface text-muted hover:text-fg"
      )}
    >
      <Icon className="size-3.5" />
      <span>{label}</span>
      {badge ? (
        <span className="hud-num rounded bg-bg px-1.5 py-0.5 text-[10px] text-accent">{badge}</span>
      ) : null}
    </button>
  );
}

function SectionTitle({
  icon: Icon,
  children,
  right,
}: {
  icon: IconType;
  children: ReactNode;
  right?: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <p className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.2em] text-subtle">
        <Icon className="size-3.5" />
        {children}
      </p>
      {right}
    </div>
  );
}

export function FirmOverlay() {
  const firm = useGameStore((s) => s.firm);
  const notice = useGameStore((s) => s.notice);
  const cash = useGameStore((s) => s.cash);
  const [name, setName] = useState(firm?.tradeName ?? "");

  const spec = firm ? firmSpec(firm.type) : null;
  const op = firm ? canOperate(firm) : null;
  const season = firm ? seasonalFactor(firm.type, new Date().getMonth() + 1) : 1;

  return (
    <div className="absolute inset-0 z-40 flex items-end justify-center bg-bg/70 px-3 py-4 backdrop-blur-sm sm:items-center">
      <div className="hud-panel w-full max-w-2xl rounded-xl p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.25em] text-subtle">
              <Briefcase className="size-3.5" />
              Registraire
            </p>
            <h2 className="font-display text-3xl italic">
              {firm ? firm.tradeName : "Entreprise"}
            </h2>
            <p className="mt-1 text-sm text-muted">
              {firm
                ? `NEQ ${firm.neq} · ${firm.village} · ${spec?.label ?? firm.type}`
                : "Immatriculation, permis, caisse distincte."}
            </p>

            {firm ? (
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <Badge tone={firm.isOpen ? "ok" : "muted"}>
                  <Store className="size-3" />
                  {firm.isOpen ? "Ouverte" : "Fermée"}
                </Badge>
                <Badge tone={op?.ok ? "ok" : "warn"}>
                  <ShieldCheck className="size-3" />
                  {op?.ok ? "Opérationnelle" : "Permis manquants"}
                </Badge>
                <Badge tone={season >= 1 ? "ok" : "muted"}>
                  <CalendarDays className="size-3" />
                  Saison ×{season.toFixed(2)}
                </Badge>
                <Badge tone="muted">
                  <Users className="size-3" />
                  {firm.staff ?? 0} employé{(firm.staff ?? 0) === 1 ? "" : "s"}
                </Badge>
              </div>
            ) : null}
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

        {notice ? <p className="mt-3 text-sm text-accent">{notice}</p> : null}

        {!firm ? (
          <FoundForm cash={cash} name={name} setName={setName} />
        ) : (
          <ManageFirm />
        )}
      </div>
    </div>
  );
}

function FoundForm({
  cash,
  name,
  setName,
}: {
  cash: number;
  name: string;
  setName: (v: string) => void;
}) {
  const [type, setType] = useState<FirmType>("cafe");

  const spec = firmSpec(type);
  const total = startupTotal(type);
  const displayName = name.trim() || spec.label;
  const canAfford = cash >= total;
  const remaining = cash - total;

  const permitCost = spec.permits.reduce((acc, permitId) => {
    return acc + (PERMITS[permitId]?.fee ?? 0);
  }, 0);

  return (
    <>
      <label className="mt-4 block">
        <span className="text-[10px] uppercase tracking-[0.2em] text-subtle">Enseigne</span>
        <div className="mt-1 flex gap-2">
          <input
            value={name}
            maxLength={42}
            onChange={(e) => setName(e.target.value)}
            placeholder={spec.label}
            className="h-11 w-full rounded-md border border-border bg-surface px-3 text-sm text-fg outline-none"
          />
          <button
            type="button"
            className="h-11 shrink-0 rounded-md border border-border bg-surface px-3 text-xs text-muted hover:text-fg"
            onClick={() => setName(spec.label)}
          >
            Suggérer
          </button>
        </div>
        <p className="mt-1 text-[11px] text-subtle">
          Nom affiché sur les factures, la flotte et les permis.
        </p>
      </label>

      <div className="mt-4">
        <SectionTitle icon={Building2}>Type d’entreprise</SectionTitle>
        <ul className="mt-2 max-h-[28vh] space-y-1 overflow-auto pr-1">
          {FIRM_TYPES.map((s) => {
            const selected = type === s.type;
            const sSpec = firmSpec(s.type);
            const sTotal = startupTotal(s.type);

            return (
              <li key={s.type}>
                <button
                  type="button"
                  onClick={() => setType(s.type)}
                  className={cx(
                    "flex w-full items-start gap-3 rounded-lg border px-3 py-2.5 text-left",
                    selected ? "border-border-strong bg-surface-2" : "border-border bg-surface"
                  )}
                >
                  <Building2 className={cx("mt-0.5 size-4", selected ? "text-accent" : "text-muted")} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm text-fg">{s.label}</span>
                    <span className="block text-xs text-muted">{s.hint}</span>
                    <span className="mt-1 block text-[11px] text-subtle">
                      {sSpec.permits.length} permis · modèle {String(sSpec.model)}
                    </span>
                  </span>
                  <span className="hud-num shrink-0 text-sm text-fg">{formatCad(sTotal)}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="mt-4 rounded-lg border border-border bg-surface px-3 py-3">
        <SectionTitle icon={ClipboardList}>Résumé d’immatriculation</SectionTitle>

        <div className="mt-2 space-y-1 text-sm">
          <div className="flex items-center justify-between gap-2">
            <span className="text-muted">Enseigne</span>
            <span className="text-fg">{displayName}</span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-muted">Capital initial</span>
            <span className="hud-num text-fg">{formatCad(spec.startup)}</span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-muted">Permis estimés</span>
            <span className="hud-num text-fg">{formatCad(permitCost)}</span>
          </div>
          <div className="flex items-center justify-between gap-2 border-t border-border pt-1">
            <span className="text-muted">Total requis</span>
            <span className="hud-num text-fg">{formatCad(total)}</span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-muted">Caisse personnelle</span>
            <span className="hud-num text-fg">{formatCad(cash)}</span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-muted">{canAfford ? "Restant" : "Manquant"}</span>
            <span className={cx("hud-num", canAfford ? "text-accent" : "text-danger")}>
              {formatCad(Math.abs(remaining))}
            </span>
          </div>
        </div>

        {!canAfford ? (
          <div className="mt-3">
            <Callout icon={AlertTriangle} tone="warn">
              Fonds insuffisants pour immatriculer cette entreprise.
            </Callout>
          </div>
        ) : null}
      </div>

      <button
        type="button"
        disabled={!canAfford}
        className="mt-4 h-11 w-full rounded-md border border-border-strong bg-surface-2 text-sm text-fg disabled:cursor-not-allowed disabled:opacity-40"
        onClick={() => {
          useGameStore.getState().foundFirm(type, displayName);
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
  const ownedVehicles = useGameStore((s) => s.ownedVehicles) ?? [];

  const [tab, setTab] = useState<TabId>("apercu");
  const [confirmWithdraw, setConfirmWithdraw] = useState(false);
  const [stockFilter, setStockFilter] = useState("");

  const spec = firmSpec(firm.type);
  const op = canOperate(firm);
  const season = seasonalFactor(firm.type, new Date().getMonth() + 1);
  const stockVal = stockValue(firm.stock);

  const heldPermits = useMemo(() => {
    return new Set<string>((firm.permits ?? []).map((x: { type: string }) => x.type));
  }, [firm.permits]);

  const missingPermits = useMemo(() => {
    return spec.permits.filter((p) => !heldPermits.has(p));
  }, [spec.permits, heldPermits]);

  const missingPermitCost = useMemo(() => {
    return missingPermits.reduce((acc, p) => acc + (PERMITS[p]?.fee ?? 0), 0);
  }, [missingPermits]);

  const grantsReceived = useMemo(() => {
    return Object.values(firm.grants ?? {}).reduce((acc: number, v) => acc + Number(v || 0), 0);
  }, [firm.grants]);

  const availableGrants = useMemo(() => {
    return MAPAQ_GRANTS.filter((g) => {
      const paid = (firm.grants ?? {})[g.id];
      return !paid && canApplyGrant(firm, g.id).ok;
    }).length;
  }, [firm, MAPAQ_GRANTS]);

  const stockEntries = useMemo(() => {
    const stockMap = firm.stock as Record<string, number>;
    return Object.entries(stockMap)
      .filter(([, n]) => Number(n) > 0)
      .map(([id, n]) => ({ item: itemById(id), n: Number(n) }))
      .filter((x): x is { item: ShopItem; n: number } => Boolean(x.item));
  }, [firm.stock]);

  const bagEntries = useMemo(() => {
    const inventoryMap = inventory as Record<string, number>;
    return Object.entries(inventoryMap)
      .filter(([, n]) => Number(n) > 0)
      .map(([id, n]) => ({ item: itemById(id), n: Number(n) }))
      .filter((x): x is { item: ShopItem; n: number } => Boolean(x.item));
  }, [inventory]);

  const stockTotal = useMemo(() => stockEntries.reduce((acc, x) => acc + x.n, 0), [stockEntries]);
  const bagTotal = useMemo(() => bagEntries.reduce((acc, x) => acc + x.n, 0), [bagEntries]);

  const relevantFleet = useMemo(() => {
    return FLEET.filter((v) => v.forFirm?.includes(firm.type));
  }, [firm.type]);

  const ownedFleetCount = useMemo(() => {
    return relevantFleet.filter((v) => ownedVehicles.includes(v.id)).length;
  }, [relevantFleet, ownedVehicles]);

  const missingFleetCount = Math.max(0, relevantFleet.length - ownedFleetCount);

  const tabs: Array<{ id: TabId; label: string; icon: IconType; badge?: number }> = [
    { id: "apercu", label: "Tableau", icon: Store },
    { id: "permis", label: "Permis", icon: KeyRound, badge: missingPermits.length },
    { id: "subventions", label: "Subventions", icon: Leaf, badge: availableGrants },
    { id: "flotte", label: "Flotte", icon: Truck, badge: missingFleetCount },
  ];

  if (spec.model === "comptoir") {
    tabs.push({ id: "stock", label: "Stock", icon: Package, badge: stockTotal });
  }

  const run = (fn: () => void) => {
    fn();
    persist();
  };

  const onWithdraw = () => {
    if (!confirmWithdraw) {
      setConfirmWithdraw(true);
      window.setTimeout(() => setConfirmWithdraw(false), 2500);
      return;
    }

    run(() => useGameStore.getState().withdrawFirm());
    setConfirmWithdraw(false);
  };

  const q = stockFilter.trim().toLowerCase();
  const visibleStock = q
    ? stockEntries.filter((x) => x.item.name.toLowerCase().includes(q))
    : stockEntries;

  const visibleBag = q
    ? bagEntries.filter((x) => x.item.name.toLowerCase().includes(q))
    : bagEntries.slice(0, 12);

  return (
    <div className="mt-4">
      <div className="flex gap-1 overflow-auto pb-1">
        {tabs.map((t) => {
          const Icon = t.icon;
          return (
            <TabButton
              key={t.id}
              active={tab === t.id}
              onClick={() => setTab(t.id)}
              icon={Icon}
              label={t.label}
              badge={t.badge}
            />
          );
        })}
      </div>

      <div className="mt-3 max-h-[56vh] space-y-3 overflow-auto pr-1">
        {tab === "apercu" && (
          <div className="space-y-3">
            {!op.ok ? (
              <Callout icon={AlertTriangle} tone="warn">
                L’entreprise n’est pas encore opérationnelle : certains permis obligatoires sont manquants.
              </Callout>
            ) : null}

            {firm.taxOwed > firm.balance ? (
              <Callout icon={Landmark} tone="warn">
                Les taxes dues dépassent actuellement la caisse de l’entreprise.
              </Callout>
            ) : null}

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              <StatCard
                label="Caisse"
                value={formatCad(firm.balance)}
                icon={Wallet}
                tone={firm.balance > 0 ? "ok" : "warn"}
              />
              <StatCard
                label="Taxes dues"
                value={formatCad(firm.taxOwed)}
                icon={Landmark}
                tone={firm.taxOwed > 0 ? "warn" : "muted"}
              />
              <StatCard
                label="CA cumulé"
                value={formatCad(firm.lifetimeRevenue)}
                icon={Coins}
              />
              <StatCard
                label="Employés"
                value={firm.staff ?? 0}
                icon={Users}
                hint="Capacité de vente / opérations"
              />
              <StatCard
                label="Saison"
                value={`×${season.toFixed(2)}`}
                icon={CalendarDays}
                tone={season >= 1 ? "ok" : "muted"}
              />
              {spec.model === "comptoir" ? (
                <StatCard
                  label="Stock"
                  value={formatCad(stockVal)}
                  icon={Package}
                  hint={`${stockTotal} unité${stockTotal === 1 ? "" : "s"}`}
                />
              ) : (
                <StatCard
                  label="Modèle"
                  value={String(spec.model)}
                  icon={Store}
                  hint="Type d’exploitation"
                />
              )}
            </div>

            <div className="rounded-lg border border-border bg-surface-2 px-3 py-3">
              <SectionTitle icon={Store}>Actions rapides</SectionTitle>

              <div className="mt-2 grid grid-cols-2 gap-1.5 sm:grid-cols-4">
                <ActionButton
                  tone="primary"
                  disabled={!firm.isOpen && !op.ok}
                  onClick={() => run(() => useGameStore.getState().toggleFirmOpen())}
                >
                  {firm.isOpen ? "Fermer" : "Ouvrir"}
                </ActionButton>

                <ActionButton
                  disabled={firm.balance <= 0}
                  onClick={onWithdraw}
                  title="Retirer de l’argent de la caisse"
                >
                  {confirmWithdraw ? "Confirmer ?" : "Retirer"}
                </ActionButton>

                <ActionButton
                  disabled={firm.taxOwed <= 0}
                  onClick={() => run(() => useGameStore.getState().payFirmTax())}
                >
                  Remettre taxes
                </ActionButton>

                <ActionButton onClick={() => run(() => useGameStore.getState().openGarage())}>
                  Garage
                </ActionButton>
              </div>

              <div className="mt-2 grid grid-cols-2 gap-1.5">
                <ActionButton
                  disabled={firm.balance < 80}
                  onClick={() => run(() => useGameStore.getState().hireStaff())}
                >
                  Embaucher 80 $
                </ActionButton>
                <ActionButton
                  disabled={(firm.staff ?? 0) <= 0}
                  onClick={() => run(() => useGameStore.getState().fireStaff())}
                >
                  Congédier
                </ActionButton>
              </div>

              <p className="mt-2 text-[11px] text-subtle">
                Statut : {formatStatus(firm.status)} · NEQ {firm.neq} · {firm.village}
              </p>
            </div>

            <div className="grid gap-2 sm:grid-cols-3">
              <button
                type="button"
                className="rounded-lg border border-border bg-surface px-3 py-2.5 text-left hover:border-border-strong"
                onClick={() => setTab("permis")}
              >
                <p className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.18em] text-subtle">
                  <KeyRound className="size-3.5" />
                  Permis
                </p>
                <p className="hud-num mt-1 text-lg text-fg">
                  {heldPermits.size}/{spec.permits.length}
                </p>
                <p className="text-[11px] text-muted">
                  {missingPermits.length > 0
                    ? `${missingPermits.length} manquant${missingPermits.length === 1 ? "" : "s"} · ${formatCad(missingPermitCost)}`
                    : "Tous valides"}
                </p>
              </button>

              <button
                type="button"
                className="rounded-lg border border-border bg-surface px-3 py-2.5 text-left hover:border-border-strong"
                onClick={() => setTab("subventions")}
              >
                <p className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.18em] text-subtle">
                  <Leaf className="size-3.5" />
                  Subventions
                </p>
                <p className="hud-num mt-1 text-lg text-fg">{formatCad(Number(grantsReceived) || 0)}</p>
                <p className="text-[11px] text-muted">
                  {availableGrants > 0 ? `${availableGrants} disponible${availableGrants === 1 ? "" : "s"}` : "Aucune disponible"}
                </p>
              </button>

              <button
                type="button"
                className="rounded-lg border border-border bg-surface px-3 py-2.5 text-left hover:border-border-strong"
                onClick={() => setTab("flotte")}
              >
                <p className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.18em] text-subtle">
                  <Truck className="size-3.5" />
                  Flotte
                </p>
                <p className="hud-num mt-1 text-lg text-fg">
                  {ownedFleetCount}/{relevantFleet.length}
                </p>
                <p className="text-[11px] text-muted">
                  {missingFleetCount > 0
                    ? `${missingFleetCount} véhicule${missingFleetCount === 1 ? "" : "s"} requis`
                    : "Flotte complète"}
                </p>
              </button>
            </div>
          </div>
        )}

        {tab === "permis" && (
          <div className="space-y-2">
            <div className="rounded-lg border border-border bg-surface-2 px-3 py-2.5">
              <SectionTitle icon={ShieldCheck} right={<span className="hud-num text-xs text-fg">{heldPermits.size}/{spec.permits.length}</span>}>
                Permis requis
              </SectionTitle>
              <p className="mt-1 text-xs text-muted">
                {missingPermits.length > 0
                  ? `Coût restant estimé : ${formatCad(missingPermitCost)}`
                  : "Tous les permis requis sont valides."}
              </p>
            </div>

            {missingPermits.length > 0 ? (
              <Callout icon={KeyRound} tone="warn">
                {missingPermits.length} permis manquant{missingPermits.length === 1 ? "" : "s"} pour opérer pleinement.
              </Callout>
            ) : null}

            <ul className="space-y-1">
              {spec.permits.map((p) => {
                const held = heldPermits.has(p);
                const permit = PERMITS[p];

                return (
                  <li
                    key={p}
                    className="flex items-center justify-between gap-2 rounded-md border border-border bg-surface px-3 py-2"
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      {held ? (
                        <BadgeCheck className="size-4 shrink-0 text-accent" />
                      ) : (
                        <AlertTriangle className="size-4 shrink-0 text-danger" />
                      )}
                      <div className="min-w-0">
                        <p className="truncate text-sm text-fg">{permit?.label ?? p}</p>
                        <p className="text-[11px] text-subtle">{held ? "Valide" : "Manquant"}</p>
                      </div>
                    </div>

                    {!held ? (
                      <ActionButton
                        tone="primary"
                        onClick={() => run(() => useGameStore.getState().buyPermit(p))}
                      >
                        {formatCad(permit?.fee ?? 0)}
                      </ActionButton>
                    ) : (
                      <span className="text-xs text-accent">Actif</span>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {tab === "subventions" && (
          <div className="space-y-2">
            <div className="rounded-lg border border-border bg-surface-2 px-3 py-2.5">
              <SectionTitle icon={Leaf} right={<span className="hud-num text-xs text-fg">{formatCad(Number(grantsReceived) || 0)}</span>}>
                Subventions MAPAQ
              </SectionTitle>
              <p className="mt-1 text-xs text-muted">
                Montants reçus à vie. Certaines subventions exigent des conditions précises.
              </p>
            </div>

            <ul className="space-y-1">
              {MAPAQ_GRANTS.map((g) => {
                const paid = (firm.grants ?? {})[g.id];
                const check = canApplyGrant(firm, g.id);

                return (
                  <li key={g.id} className="rounded-md border border-border bg-surface px-3 py-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="flex items-center gap-1.5 text-sm text-fg">
                          {paid ? <CheckCircle2 className="size-4 text-accent" /> : <Leaf className="size-4 text-muted" />}
                          {g.short}
                        </p>
                        <p className="mt-0.5 text-[11px] text-muted">{g.hint}</p>
                      </div>

                      {paid ? (
                        <span className="hud-num shrink-0 text-sm text-fg">{formatCad(Number(paid))}</span>
                      ) : (
                        <ActionButton
                          tone="primary"
                          disabled={!check.ok}
                          onClick={() => run(() => useGameStore.getState().applyMapaqGrant(g.id))}
                        >
                          {check.ok ? formatCad(check.amount) : "N/A"}
                        </ActionButton>
                      )}
                    </div>

                    {!paid && !check.ok ? (
                      <p className="mt-1 text-[11px] text-subtle">{check.reason}</p>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {tab === "flotte" && (
          <div className="space-y-2">
            <div className="rounded-lg border border-border bg-surface-2 px-3 py-2.5">
              <SectionTitle icon={Truck} right={<span className="hud-num text-xs text-fg">{ownedFleetCount}/{relevantFleet.length}</span>}>
                Flotte requise
              </SectionTitle>
              <p className="mt-1 text-xs text-muted">
                Les véhicules nécessaires à l’exploitation s’achètent via le garage.
              </p>
            </div>

            {relevantFleet.length === 0 ? (
              <Callout icon={Truck} tone="info">
                Aucun véhicule requis pour ce type d’entreprise.
              </Callout>
            ) : (
              <ul className="space-y-1">
                {relevantFleet.map((v) => {
                  const owned = ownedVehicles.includes(v.id);

                  return (
                    <li
                      key={v.id}
                      className="flex items-center justify-between gap-2 rounded-md border border-border bg-surface px-3 py-2"
                    >
                      <div className="flex min-w-0 items-center gap-2">
                        <Truck className={cx("size-4 shrink-0", owned ? "text-accent" : "text-muted")} />
                        <div className="min-w-0">
                          <p className="truncate text-sm text-fg">{v.name}</p>
                          <p className="text-[11px] text-subtle">
                            {owned ? "Au garage" : "À acquérir"}
                          </p>
                        </div>
                      </div>

                      {owned ? (
                        <Badge tone="ok">
                          <CheckCircle2 className="size-3" />
                          Possédé
                        </Badge>
                      ) : (
                        <ActionButton
                          tone="primary"
                          onClick={() => run(() => useGameStore.getState().openGarage())}
                        >
                          {formatCad(v.price)}
                        </ActionButton>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}

        {tab === "stock" && spec.model === "comptoir" && (
          <div className="space-y-2">
            <div className="rounded-lg border border-border bg-surface-2 px-3 py-2.5">
              <SectionTitle
                icon={Package}
                right={<span className="hud-num text-xs text-fg">{formatCad(stockVal)}</span>}
              >
                Stock du comptoir
              </SectionTitle>
              <p className="mt-1 text-xs text-muted">
                {stockTotal} unité{stockTotal === 1 ? "" : "s"} en stock · {bagTotal} dans le sac
              </p>

              <input
                value={stockFilter}
                onChange={(e) => setStockFilter(e.target.value)}
                placeholder="Filtrer les items..."
                className="mt-2 h-10 w-full rounded-md border border-border bg-surface px-3 text-sm text-fg outline-none"
              />
            </div>

            <div className="grid gap-2 lg:grid-cols-2">
              <div className="rounded-lg border border-border bg-surface px-3 py-3">
                <p className="text-[10px] uppercase tracking-[0.18em] text-subtle">Entreprise</p>

                {visibleStock.length === 0 ? (
                  <p className="mt-2 text-xs text-subtle">
                    Aucun item en stock{q ? " pour ce filtre" : ""}. Transférez depuis le sac.
                  </p>
                ) : (
                  <ul className="mt-2 space-y-1">
                    {visibleStock.map(({ item, n }) => {
                      const Icon = ITEM_ICONS[item.icon] ?? Package;

                      return (
                        <li key={item.id}>
                          <button
                            type="button"
                            className="flex w-full items-center gap-2 rounded-md border border-border bg-surface-2 px-3 py-2 text-left"
                            onClick={() => run(() => useGameStore.getState().stockOut(item.id))}
                          >
                            <Icon className="size-3.5 text-accent" />
                            <span className="flex-1 text-sm text-fg">
                              {item.name} · ×{n}
                            </span>
                            <span className="text-xs text-muted">Sortir 1</span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>

              <div className="rounded-lg border border-border bg-surface px-3 py-3">
                <p className="text-[10px] uppercase tracking-[0.18em] text-subtle">Sac / inventaire</p>

                {visibleBag.length === 0 ? (
                  <p className="mt-2 text-xs text-subtle">
                    Aucun item disponible dans le sac{q ? " pour ce filtre" : ""}.
                  </p>
                ) : (
                  <ul className="mt-2 space-y-1">
                    {visibleBag.map(({ item, n }) => {
                      const Icon = ITEM_ICONS[item.icon] ?? Package;

                      return (
                        <li key={item.id}>
                          <button
                            type="button"
                            className="flex w-full items-center gap-2 rounded-md border border-border bg-surface-2 px-3 py-2 text-left"
                            onClick={() => run(() => useGameStore.getState().stockIn(item.id))}
                          >
                            <Icon className="size-3.5 text-muted" />
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

                {bagEntries.length > visibleBag.length ? (
                  <p className="mt-2 text-[11px] text-subtle">
                    {bagEntries.length - visibleBag.length} autre{bagEntries.length - visibleBag.length === 1 ? "" : "s"} item{bagEntries.length - visibleBag.length === 1 ? "" : "s"} non affiché{bagEntries.length - visibleBag.length === 1 ? "" : "s"}.
                  </p>
                ) : null}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
