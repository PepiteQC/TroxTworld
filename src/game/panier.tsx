import { Minus, Plus, ShoppingCart, X } from "lucide-react";
import { cartTotals, formatCad } from "./commerce";
import { ProductThumb } from "./productThumb";
import { useGameStore } from "./store";

export function CartOverlay() {
  const cart = useGameStore((s) => s.cart);
  const cash = useGameStore((s) => s.cash);
  const inventory = useGameStore((s) => s.inventory);
  const notice = useGameStore((s) => s.notice);
  const { lines, count, subtotal, tax, total } = cartTotals(cart);
  const gated = lines.find((l) => l.item.restricted);
  const hasId = (inventory.identite ?? 0) > 0;
  const canPay = count > 0 && cash >= total && (!gated || hasId);

  return (
    <div className="absolute inset-0 z-40 flex items-end justify-center bg-bg/70 px-3 py-4 backdrop-blur-sm sm:items-center">
      <div className="hud-panel w-full max-w-lg rounded-xl p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] tracking-[0.25em] text-subtle uppercase">Caisse</p>
            <h2 className="font-display text-3xl italic">Panier</h2>
            <p className="mt-1 flex items-center gap-1.5 text-sm text-muted">
              <ShoppingCart className="size-3.5 text-accent" />
              {count} article{count > 1 ? "s" : ""} · TPS+TVQ 14,975 %
            </p>
          </div>
          <button
            type="button"
            className="flex size-11 items-center justify-center rounded-md text-muted hover:text-fg"
            onClick={() => useGameStore.getState().closeCart()}
            aria-label="Fermer le panier"
          >
            <X className="size-5" />
          </button>
        </div>
        {notice && <p className="mt-3 text-sm text-accent">{notice}</p>}
        {lines.length === 0 ? (
          <p className="mt-6 text-sm text-muted">Panier vide. E sur un vêtement pour ajouter.</p>
        ) : (
          <ul className="mt-4 max-h-[40vh] space-y-1 overflow-auto">
            {lines.map(({ item, qty }) => {
              return (
                <li key={item.id} className="flex items-center gap-3 rounded-lg border border-border bg-surface-2 px-3 py-2.5">
                  <ProductThumb id={item.id} icon={item.icon} alt={item.name} className="size-12" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm text-fg">{item.name}</span>
                    <span className="hud-num text-[11px] text-subtle">{formatCad(item.price)}</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <button
                      type="button"
                      className="flex size-8 items-center justify-center rounded-md border border-border text-muted hover:text-fg"
                      onClick={() => useGameStore.getState().removeFromCart(item.id)}
                      aria-label="Retirer"
                    >
                      <Minus className="size-3.5" />
                    </button>
                    <span className="hud-num w-6 text-center text-sm text-fg">{qty}</span>
                    <button
                      type="button"
                      className="flex size-8 items-center justify-center rounded-md border border-border text-muted hover:text-fg"
                      onClick={() => useGameStore.getState().addToCart(item.id)}
                      aria-label="Ajouter"
                    >
                      <Plus className="size-3.5" />
                    </button>
                  </span>
                </li>
              );
            })}
          </ul>
        )}
        <div className="mt-4 space-y-1 border-t border-border pt-3 text-sm">
          <div className="flex justify-between text-muted">
            <span>Sous-total</span>
            <span className="hud-num">{formatCad(subtotal)}</span>
          </div>
          <div className="flex justify-between text-muted">
            <span>TPS + TVQ</span>
            <span className="hud-num">{formatCad(tax)}</span>
          </div>
          <div className="flex justify-between text-fg">
            <span>Total</span>
            <span className="hud-num text-lg">{formatCad(total)}</span>
          </div>
          <p className="text-[11px] text-subtle">Caisse {formatCad(cash)}</p>
          {gated && (
            <p className={`text-[11px] ${hasId ? "text-ok" : "text-danger"}`}>
              {hasId
                ? `Identité vérifiée · ${gated.item.restricted} ans`
                : `${gated.item.restricted} ans · pièce d'identité requise`}
            </p>
          )}
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <button
            type="button"
            className="h-11 rounded-md border border-border text-sm text-muted hover:text-fg"
            onClick={() => useGameStore.getState().clearCart()}
            disabled={count === 0}
          >
            Vider
          </button>
          <button
            type="button"
            className="h-11 rounded-md bg-accent text-sm text-bg disabled:opacity-40"
            disabled={!canPay}
            onClick={() => useGameStore.getState().checkoutCart()}
          >
            Payer
          </button>
        </div>
      </div>
    </div>
  );
}