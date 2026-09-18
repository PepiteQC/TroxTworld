/**
 * Panneau Panier / Caisse enregistreuse — Interface d'achat fluide avec contrôles d'identité et de solde.
 * Fichier: src/game/panier.tsx
 */
import { Minus, Plus, ShoppingCart, X, Trash2, ShieldAlert, CreditCard, IdCard } from "lucide-react";
import { cartTotals, formatCad } from "./commerce";
import { ProductThumb } from "./productThumb";
import { useGameStore } from "./store";

export function CartOverlay() {
  // Sélection des données du store
  const cart = useGameStore((s) => s.cart);
  const cash = useGameStore((s) => s.cash);
  const inventory = useGameStore((s) => s.inventory) ?? {};
  const notice = useGameStore((s) => s.notice);

  // Actions du store
  const closeCart = useGameStore((s) => s.closeCart);
  const addToCart = useGameStore((s) => s.addToCart);
  const removeFromCart = useGameStore((s) => s.removeFromCart);
  const clearCart = useGameStore((s) => s.clearCart);
  const checkoutCart = useGameStore((s) => s.checkoutCart);

  // Calculs financiers
  const { lines, count, subtotal, tax, total } = cartTotals(cart);
  
  // Détection des restrictions d'âge / articles réglementés
  const gated = lines.find((l) => l.item.restricted);
  const hasId = (inventory.identite ?? 0) > 0 || (inventory.identity ?? 0) > 0;
  
  // Validation des conditions de paiement
  const isAffordable = cash >= total;
  const isIdApproved = !gated || hasId;
  const canPay = count > 0 && isAffordable && isIdApproved;

  return (
    <div className="absolute inset-0 z-55 flex items-end justify-center bg-black/75 px-3 py-4 backdrop-blur-md sm:items-center">
      <div className="flex max-h-[92dvh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-white/10 bg-neutral-900/95 p-6 shadow-2xl text-neutral-200">
        
        {/* En-tête */}
        <div className="flex items-start justify-between gap-3 border-b border-white/5 pb-4">
          <div>
            <p className="text-[10px] font-semibold tracking-[0.25em] text-cyan-400 uppercase">Caisse enregistreuse</p>
            <h2 className="font-serif text-3xl font-bold italic text-white flex items-center gap-2 mt-0.5">
              Votre Panier
            </h2>
            <p className="mt-1 flex items-center gap-1.5 text-xs text-neutral-400">
              <ShoppingCart className="size-3.5 text-neutral-500" />
              {count} article{count > 1 ? "s" : ""} · TPS+TVQ (14,975 %)
            </p>
          </div>
          <button
            type="button"
            className="flex size-10 items-center justify-center rounded-xl bg-white/5 text-neutral-400 hover:bg-white/10 hover:text-white transition-all"
            onClick={closeCart}
            aria-label="Fermer le panier"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Message d'erreur ou d'information système */}
        {notice && (
          <div className="mt-4 rounded-lg bg-amber-500/10 border border-amber-500/20 px-3 py-2 text-xs text-amber-400 font-medium">
            {notice}
          </div>
        )}

        {/* Corps du panier (Déroulant) */}
        <div className="flex-1 min-h-0 overflow-y-auto py-4">
          {lines.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center text-neutral-500">
              <ShoppingCart className="size-12 stroke-[1.5] text-neutral-600 mb-3 animate-bounce" />
              <p className="text-sm">Votre panier est vide.</p>
              <p className="text-xs mt-1 max-w-[240px]">
                Approchez-vous d'un article en magasin et appuyez sur <kbd className="px-1 py-0.5 rounded bg-white/10 text-white font-mono text-[10px]">E</kbd> pour l'ajouter.
              </p>
            </div>
          ) : (
            <ul className="space-y-2 pr-1">
              {lines.map(({ item, qty }) => {
                const isItemRestricted = item.restricted;
                return (
                  <li
                    key={item.id}
                    className="group flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.02] p-3 hover:bg-white/[0.04] transition-all"
                  >
                    <div className="relative">
                      <ProductThumb id={item.id} icon={item.icon} alt={item.name} className="size-14 rounded-lg bg-black/40" />
                      {isItemRestricted && (
                        <span className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-[9px] font-bold text-white border border-neutral-900 shadow">
                          18+
                        </span>
                      )}
                    </div>
                    
                    <div className="min-w-0 flex-1">
                      <span className="block text-sm font-medium text-white truncate">{item.name}</span>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="font-mono text-xs text-cyan-400 font-semibold">{formatCad(item.price)}</span>
                        {isItemRestricted && (
                          <span className="inline-flex items-center gap-1 rounded bg-red-500/10 px-1.5 py-0.5 text-[10px] text-red-400 font-semibold uppercase">
                            <ShieldAlert className="size-3" />
                            Restreint
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 bg-black/30 p-1 rounded-lg border border-white/5">
                      <button
                        type="button"
                        className="flex size-7 items-center justify-center rounded-md text-neutral-400 hover:bg-white/10 hover:text-white transition-colors"
                        onClick={() => removeFromCart(item.id)}
                        aria-label="Retirer une unité"
                      >
                        <Minus className="size-3.5" />
                      </button>
                      <span className="font-mono w-5 text-center text-xs font-bold text-white">{qty}</span>
                      <button
                        type="button"
                        className="flex size-7 items-center justify-center rounded-md text-neutral-400 hover:bg-white/10 hover:text-white transition-colors"
                        onClick={() => addToCart(item.id)}
                        aria-label="Ajouter une unité"
                      >
                        <Plus className="size-3.5" />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Pied de Panier & Totaux */}
        <div className="border-t border-white/5 pt-4 space-y-3.5">
          <div className="rounded-xl bg-black/25 p-3 space-y-1.5 border border-white/5 text-xs font-mono">
            <div className="flex justify-between text-neutral-400">
              <span>Sous-total</span>
              <span>{formatCad(subtotal)}</span>
            </div>
            <div className="flex justify-between text-neutral-400">
              <span>Taxes combinées (TPS + TVQ)</span>
              <span>{formatCad(tax)}</span>
            </div>
            
            <div className="flex justify-between items-baseline border-t border-white/5 pt-2 mt-1">
              <span className="text-sm font-bold text-white font-serif">Montant Total</span>
              <span className={`text-xl font-bold ${isAffordable ? "text-emerald-400" : "text-red-400 animate-pulse"}`}>
                {formatCad(total)}
              </span>
            </div>

            <div className="flex justify-between text-[11px] border-t border-white/5 pt-1.5 mt-1">
              <span className="text-neutral-500">Votre argent disponible :</span>
              <span className={`font-semibold ${isAffordable ? "text-neutral-300" : "text-red-400"}`}>
                {formatCad(cash)}
              </span>
            </div>
          </div>

          {/* Alertes d'autorisation d'achat */}
          {gated && (
            <div className={`flex items-center gap-2 rounded-lg p-2.5 border text-xs ${
              hasId 
                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" 
                : "bg-red-500/10 border-red-500/20 text-red-400"
            }`}>
              {hasId ? (
                <>
                  <IdCard className="size-4 shrink-0" />
                  <span>Pièce d'identité validée ({gated.item.restricted} ans +).</span>
                </>
              ) : (
                <>
                  <ShieldAlert className="size-4 shrink-0 animate-bounce" />
                  <span>
                    <strong>Contrôle requis :</strong> Cet achat contient des produits réglementés ({gated.item.restricted} ans +). Permis d'identité manquant.
                  </span>
                </>
              )}
            </div>
          )}

          {!isAffordable && count > 0 && (
            <div className="flex items-center gap-2 rounded-lg bg-red-500/10 border border-red-500/20 p-2.5 text-xs text-red-400">
              <CreditCard className="size-4 shrink-0" />
              <span>Solde insuffisant pour finaliser la transaction.</span>
            </div>
          )}

          {/* Boutons d'action */}
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              className="flex h-11 items-center justify-center gap-2 rounded-xl border border-white/10 text-xs font-semibold text-neutral-400 hover:bg-red-500/10 hover:border-red-500/20 hover:text-red-400 disabled:opacity-30 disabled:pointer-events-none transition-all"
              onClick={clearCart}
              disabled={count === 0}
            >
              <Trash2 className="size-4" />
              Vider le panier
            </button>
            <button
              type="button"
              className="h-11 rounded-xl font-bold text-xs shadow-lg uppercase tracking-wider transition-all disabled:opacity-20 disabled:pointer-events-none bg-cyan-400 text-black hover:bg-cyan-300"
              disabled={!canPay}
              onClick={checkoutCart}
            >
              Procéder au paiement
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}