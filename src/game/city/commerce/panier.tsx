import {
  useEffect,
  useRef,
  useState,
  useCallback,
  useMemo,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { Minus, Plus, ShoppingCart, X, AlertCircle, Check, Trash2, Loader2 } from "lucide-react";
import { cartTotals, formatCad, bagWeight } from "./commerce";
import { ProductThumb } from "./productThumb";
import { useGameStore } from "./store";

// ═══════════════════════════════════════════════════════════════════════════
//  TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface CartOverlayProps {
  /** Override : callback custom pour checkout (async) */
  onCheckout?: () => Promise<{ ok: boolean; error?: string }> | void;
  /** Affiche la confirmation de vidage */
  confirmClear?: boolean;
  /** Affiche le poids total du panier */
  showWeight?: boolean;
  /** Montant pourboire actuel en $ (opt-in) */
  enableTips?: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════
//  HOOKS INTERNES
// ═══════════════════════════════════════════════════════════════════════════

/** Focus trap : garde le focus dans le modal */
function useFocusTrap(containerRef: React.RefObject<HTMLDivElement | null>, active: boolean) {
  useEffect(() => {
    if (!active || !containerRef.current) return;
    const container = containerRef.current;
    const previousActive = document.activeElement as HTMLElement | null;

    // Focus initial
    const focusables = container.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );
    focusables[0]?.focus();

    const onKeyDown = (e: globalThis.KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const items = container.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      previousActive?.focus?.();
    };
  }, [containerRef, active]);
}

/** Escape pour fermer */
function useEscapeClose(onClose: () => void, active: boolean) {
  useEffect(() => {
    if (!active) return;
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose, active]);
}

/** Scroll lock body quand modal ouvert */
function useBodyScrollLock(active: boolean) {
  useEffect(() => {
    if (!active) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [active]);
}

/** Hook d'actions store memoïsées (évite les getState() répétés) */
function useCartActions() {
  return useMemo(
    () => ({
      closeCart: () => useGameStore.getState().closeCart(),
      clearCart: () => useGameStore.getState().clearCart(),
      addToCart: (id: string) => useGameStore.getState().addToCart(id),
      removeFromCart: (id: string) => useGameStore.getState().removeFromCart(id),
      checkoutCart: () => useGameStore.getState().checkoutCart(),
      setNotice: (msg: string | null) =>
        (useGameStore.getState() as any).setNotice?.(msg),
    }),
    [],
  );
}

// ═══════════════════════════════════════════════════════════════════════════
//  COMPOSANT PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════

export function CartOverlay({
  onCheckout,
  confirmClear = true,
  showWeight = true,
  enableTips = false,
}: CartOverlayProps = {}) {
  // ─── Store ───
  const cart = useGameStore((s) => s.cart);
  const cash = useGameStore((s) => s.cash);
  const inventory = useGameStore((s) => s.inventory);
  const notice = useGameStore((s) => s.notice);
  const actions = useCartActions();

  // ─── Totaux ───
  const totals = useMemo(() => cartTotals(cart), [cart]);
  const { lines, count, subtotal, tax, total } = totals;
  const weight = useMemo(
    () => (showWeight ? bagWeight(cart) : 0),
    [cart, showWeight],
  );

  // ─── Age gate ───
  const gated = useMemo(
    () => lines.find((l) => l.item.restricted),
    [lines],
  );
  const hasId = (inventory.identite ?? 0) > 0;
  const needsId = !!gated && !hasId;

  // ─── Payabilité ───
  const canPay = count > 0 && cash >= total && !needsId;

  // ─── État local ───
  const [isPaying, setIsPaying] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);
  const [confirmingClear, setConfirmingClear] = useState(false);
  const [tipPercent, setTipPercent] = useState(0);

  const rootRef = useRef<HTMLDivElement>(null);
  const isOpen = true; // Le composant n'est rendu que si ouvert — voir note

  // ─── Effets globaux ───
  useFocusTrap(rootRef, isOpen);
  useEscapeClose(actions.closeCart, isOpen);
  useBodyScrollLock(isOpen);

  // ─── Reset erreur à chaque changement de panier ───
  useEffect(() => {
    if (payError) setPayError(null);
  }, [count, total]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Pourboire ───
  const tipAmount = useMemo(
    () => (enableTips ? Math.round(subtotal * (tipPercent / 100) * 100) / 100 : 0),
    [enableTips, subtotal, tipPercent],
  );
  const grandTotal = useMemo(
    () => Math.round((total + tipAmount) * 100) / 100,
    [total, tipAmount],
  );
  const canPayWithTip = count > 0 && cash >= grandTotal && !needsId;

  // ─── Handlers ───
  const handleCheckout = useCallback(async () => {
    if (!canPayWithTip || isPaying) return;
    setPayError(null);
    setIsPaying(true);
    try {
      if (onCheckout) {
        const res = await onCheckout();
        if (res && !res.ok) {
          setPayError(res.error ?? "Échec du paiement");
          setIsPaying(false);
          return;
        }
      } else {
        const res = await actions.checkoutCart();
        if (res && typeof res === "object" && "ok" in res && !res.ok) {
          setPayError((res as any).error ?? "Échec du paiement");
          setIsPaying(false);
          return;
        }
      }
      // Succès : le parent fermera le panier
      setIsPaying(false);
    } catch (err) {
      setPayError(err instanceof Error ? err.message : "Erreur inconnue");
      setIsPaying(false);
    }
  }, [canPayWithTip, isPaying, onCheckout, actions]);

  const handleClear = useCallback(() => {
    if (!confirmClear) {
      actions.clearCart();
      return;
    }
    if (!confirmingClear) {
      setConfirmingClear(true);
      // Auto-cancel après 4s
      window.setTimeout(() => setConfirmingClear(false), 4000);
      return;
    }
    actions.clearCart();
    setConfirmingClear(false);
  }, [confirmClear, confirmingClear, actions]);

  // ─── Raccourci clavier global ───
  const onKeyDownContainer = useCallback(
    (e: ReactKeyboardEvent<HTMLDivElement>) => {
      // Entrée → payer
      if (e.key === "Enter" && (e.target as HTMLElement).tagName !== "BUTTON") {
        e.preventDefault();
        void handleCheckout();
      }
    },
    [handleCheckout],
  );

  // ═══════════════════════════════════════════════════════════════════════
  //  RENDER
  // ═══════════════════════════════════════════════════════════════════════

  return (
    <div
      ref={rootRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="cart-title"
      className="fixed inset-0 z-40 flex items-end justify-center bg-bg/70 px-3 py-4 backdrop-blur-sm sm:items-center"
      onKeyDown={onKeyDownContainer}
      style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
    >
      <div className="hud-panel w-full max-w-lg rounded-xl p-5 shadow-2xl">
        {/* ═══ En-tête ═══ */}
        <header className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] tracking-[0.25em] text-subtle uppercase">Caisse</p>
            <h2 id="cart-title" className="font-display text-3xl italic">Panier</h2>
            <p className="mt-1 flex items-center gap-1.5 text-sm text-muted">
              <ShoppingCart className="size-3.5 text-accent" aria-hidden />
              <span>
                {count} article{count > 1 ? "s" : ""}
                <span className="mx-1.5 text-subtle">·</span>
                TPS+TVQ 14,975 %
              </span>
              {showWeight && weight > 0 && (
                <>
                  <span className="mx-1.5 text-subtle">·</span>
                  <span className="hud-num">{weight.toFixed(1)} kg</span>
                </>
              )}
            </p>
          </div>
          <button
            type="button"
            className="flex size-11 items-center justify-center rounded-md text-muted transition hover:bg-surface-2 hover:text-fg focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"
            onClick={actions.closeCart}
            aria-label="Fermer le panier"
          >
            <X className="size-5" aria-hidden />
          </button>
        </header>

        {/* ═══ Notice ═══ */}
        {notice && (
          <div className="mt-3 flex items-start gap-2 rounded-md border border-accent/30 bg-accent/5 px-3 py-2 text-sm text-accent">
            <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
            <p className="flex-1">{notice}</p>
            {actions.setNotice && (
              <button
                type="button"
                className="text-xs text-accent/70 hover:text-accent"
                onClick={() => actions.setNotice(null)}
                aria-label="Masquer la notice"
              >
                <X className="size-3.5" aria-hidden />
              </button>
            )}
          </div>
        )}

        {/* ═══ Erreur paiement ═══ */}
        {payError && (
          <div
            role="alert"
            className="mt-3 flex items-start gap-2 rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger"
          >
            <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
            <p className="flex-1">{payError}</p>
          </div>
        )}

        {/* ═══ Contenu ═══ */}
        {lines.length === 0 ? (
          <p className="mt-6 text-sm text-muted">
            Panier vide. Appuyez sur <kbd className="rounded border border-border bg-surface-2 px-1.5 py-0.5 text-[10px]">E</kbd> sur un vêtement pour ajouter.
          </p>
        ) : (
          <ul
            className="mt-4 max-h-[40vh] space-y-1 overflow-auto pr-1"
            aria-label="Articles dans le panier"
          >
            {lines.map(({ item, qty }) => (
              <li
                key={item.id}
                className="flex items-center gap-3 rounded-lg border border-border bg-surface-2 px-3 py-2.5 transition hover:border-accent/40"
              >
                <ProductThumb
                  id={item.id}
                  icon={item.icon}
                  alt={item.name}
                  className="size-12 shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-fg">{item.name}</p>
                  <p className="hud-num text-[11px] text-subtle">
                    {formatCad(item.price)}
                    {item.weight && (
                      <span className="ml-1.5 opacity-60">
                        · {(item.weight * qty).toFixed(2)} kg
                      </span>
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-1" role="group" aria-label={`Quantité de ${item.name}`}>
                  <button
                    type="button"
                    className="flex size-8 items-center justify-center rounded-md border border-border text-muted transition hover:border-accent hover:text-fg focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"
                    onClick={() => actions.removeFromCart(item.id)}
                    aria-label={`Retirer un ${item.name}`}
                  >
                    <Minus className="size-3.5" aria-hidden />
                  </button>
                  <span
                    className="hud-num w-8 text-center text-sm text-fg tabular-nums"
                    aria-live="polite"
                  >
                    {qty}
                  </span>
                  <button
                    type="button"
                    className="flex size-8 items-center justify-center rounded-md border border-border text-muted transition hover:border-accent hover:text-fg focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"
                    onClick={() => actions.addToCart(item.id)}
                    aria-label={`Ajouter un ${item.name}`}
                  >
                    <Plus className="size-3.5" aria-hidden />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}

        {/* ═══ Pourboire (opt-in) ═══ */}
        {enableTips && lines.length > 0 && (
          <div className="mt-3 flex items-center gap-2 text-xs text-muted">
            <span>Pourboire :</span>
            {[0, 10, 15, 20].map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setTipPercent(p)}
                className={`rounded-md border px-2 py-1 transition ${
                  tipPercent === p
                    ? "border-accent bg-accent/10 text-accent"
                    : "border-border text-muted hover:border-accent/40 hover:text-fg"
                }`}
              >
                {p === 0 ? "Aucun" : `${p} %`}
              </button>
            ))}
            {tipAmount > 0 && (
              <span className="ml-auto hud-num text-accent">+ {formatCad(tipAmount)}</span>
            )}
          </div>
        )}

        {/* ═══ Totaux ═══ */}
        <div className="mt-4 space-y-1 border-t border-border pt-3 text-sm">
          <Row label="Sous-total" value={formatCad(subtotal)} />
          <Row label="TPS + TVQ" value={formatCad(tax)} />
          {enableTips && tipAmount > 0 && (
            <Row label="Pourboire" value={formatCad(tipAmount)} accent />
          )}
          <Row
            label="Total"
            value={formatCad(grandTotal)}
            bold
            ariaLive="polite"
          />
          <div className="flex justify-between text-[11px] text-subtle">
            <span>Caisse</span>
            <span className="hud-num">{formatCad(cash)}</span>
          </div>
          {cash < grandTotal && count > 0 && (
            <p className="text-[11px] text-danger">
              Fonds insuffisants — il manque {formatCad(grandTotal - cash)}
            </p>
          )}
          {gated && (
            <p className={`text-[11px] ${hasId ? "text-ok" : "text-danger"}`}>
              {hasId ? (
                <>
                  <Check className="mr-1 inline size-3" aria-hidden />
                  Identité vérifiée · {gated.item.restricted} ans
                </>
              ) : (
                <>
                  <AlertCircle className="mr-1 inline size-3" aria-hidden />
                  {gated.item.restricted} ans · pièce d'identité requise
                </>
              )}
            </p>
          )}
        </div>

        {/* ═══ Actions ═══ */}
        <div className="mt-4 grid grid-cols-2 gap-2">
          <button
            type="button"
            className={`flex h-11 items-center justify-center gap-2 rounded-md border text-sm transition focus-visible:ring-2 focus-visible:ring-danger focus-visible:outline-none ${
              confirmingClear
                ? "border-danger bg-danger/10 text-danger"
                : "border-border text-muted hover:border-danger/40 hover:text-danger"
            }`}
            onClick={handleClear}
            disabled={count === 0 || isPaying}
          >
            {confirmingClear ? (
              <>
                <Trash2 className="size-4" aria-hidden />
                Confirmer ?
              </>
            ) : (
              "Vider"
            )}
          </button>
          <button
            type="button"
            className="flex h-11 items-center justify-center gap-2 rounded-md bg-accent text-sm text-bg transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"
            disabled={!canPayWithTip || isPaying}
            onClick={handleCheckout}
            aria-busy={isPaying}
          >
            {isPaying ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden />
                Traitement…
              </>
            ) : (
              `Payer · ${formatCad(grandTotal)}`
            )}
          </button>
        </div>

        {/* ═══ Hint clavier (desktop) ═══ */}
        <p className="mt-3 hidden text-center text-[10px] text-subtle sm:block">
          <kbd className="rounded border border-border bg-surface-2 px-1.5 py-0.5">Entrée</kbd> payer
          <span className="mx-1.5 opacity-40">·</span>
          <kbd className="rounded border border-border bg-surface-2 px-1.5 py-0.5">Échap</kbd> fermer
        </p>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
//  SOUS-COMPOSANT — Row pour les totaux
// ═══════════════════════════════════════════════════════════════════════════

function Row({
  label,
  value,
  bold,
  accent,
  ariaLive,
}: {
  label: string;
  value: string;
  bold?: boolean;
  accent?: boolean;
  ariaLive?: "polite" | "off" | "assertive";
}) {
  return (
    <div
      className={`flex justify-between ${
        bold ? "text-fg text-base font-medium" : "text-muted"
      }`}
      aria-live={ariaLive}
    >
      <span>{label}</span>
      <span className={`hud-num ${bold ? "text-lg" : ""} ${accent ? "text-accent" : ""}`}>
        {value}
      </span>
    </div>
  );
}

export default CartOverlay;