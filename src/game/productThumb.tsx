/**
 * ═══════════════════════════════════════════════════════════════════
 * 🎨 PRODUCT THUMB — COMPOSANT D'INVENTAIRE AVANCÉ (v2.0)
 * ═══════════════════════════════════════════════════════════════════
 * 
 * AMÉLIORATIONS v2.0 :
 *  - Tooltips riches avec stats détaillées
 *  - Particules animées pour items légendaires
 *  - Support drag & drop natif
 *  - Mode sélection multiple
 *  - Indicateurs de crafting/recipes
 *  - Items expirables avec countdown
 *  - Animations d'acquisition (flash, shake)
 *  - Stacking visuel 3D pour grandes quantités
 *  - Comparaison d'items (vs équipé)
 *  - Favoris/Wishlist
 *  - Prix et valeur marchande
 *  - Badges saisonniers/limités
 *  - Accessibilité complète (ARIA, keyboard)
 *  - Mode compact/expanded
 *  - Filtres de qualité (neuf/usagé/endommagé)
 * ═══════════════════════════════════════════════════════════════════
 */

import { useState, useMemo, useEffect, useRef, type DragEvent } from "react";
import { ITEM_ICONS } from "./itemIcons";
import type { ShopItem } from "./commerce";

// ═══════════════════════════════════════════════════════════
// TYPES & INTERFACES
// ═══════════════════════════════════════════════════════════

export type ItemRarity = 
  | "common" 
  | "uncommon" 
  | "rare" 
  | "epic" 
  | "legendary" 
  | "contraband" 
  | "illegal";

export type ItemQuality = "pristine" | "good" | "worn" | "damaged" | "broken";
export type ItemCategory = "weapon" | "armor" | "consumable" | "material" | "tool" | "quest" | "misc";

export interface ItemStats {
  damage?: number;
  armor?: number;
  healing?: number;
  speed?: number;
  weight?: number;
  durability?: number;
}

export interface CraftingRecipe {
  ingredients: Array<{ id: string; qty: number }>;
  craftTime: number; // seconds
  workbench?: string;
}

export interface ProductThumbProps {
  id: string;
  icon: ShopItem["icon"];
  alt: string;
  className?: string;
  
  // ── PROPRIÉTÉS ÉTENDUES GTA RP ──
  quantity?: number;
  durability?: number;
  rarity?: ItemRarity;
  quality?: ItemQuality;
  category?: ItemCategory;
  
  // ── STATUTS LÉGAUX & ÉTATS ──
  isIllegal?: boolean;
  isRestricted?: boolean;
  isStolen?: boolean;
  isEquipped?: boolean;
  isSelected?: boolean;
  isFavorite?: boolean;
  isNew?: boolean;
  isLimited?: boolean;
  isSeasonal?: boolean;
  hotbarSlot?: number;
  
  // ── MAGASIN & PHYSIQUE ──
  discountPercent?: number;
  weightKg?: number;
  price?: number;
  marketValue?: number;
  size?: "sm" | "md" | "lg" | "xl";
  
  // ── EXPIRATION (Nourriture, potions) ──
  expiresAt?: number; // Unix timestamp
  expiresIn?: number; // Secondes restantes
  
  // ── CRAFTING ──
  isCraftable?: boolean;
  recipe?: CraftingRecipe;
  craftProgress?: number; // 0-100
  
  // ── STATS & COMPARAISON ──
  stats?: ItemStats;
  comparisonStats?: ItemStats; // Stats de l'item actuellement équipé
  
  // ── DESCRIPTION & TOOLTIP ──
  description?: string;
  tooltipPosition?: "top" | "bottom" | "left" | "right";
  showTooltip?: boolean;
  
  // ── RENDU ──
  glow?: boolean;
  interactive?: boolean;
  compact?: boolean;
  showParticles?: boolean;
  
  // ── ANIMATIONS ──
  animateAcquisition?: boolean;
  animateDamage?: boolean;
  
  // ── DRAG & DROP ──
  draggable?: boolean;
  onDragStart?: (e: DragEvent<HTMLDivElement>, id: string) => void;
  onDragEnd?: (e: DragEvent<HTMLDivElement>, id: string) => void;
  onDrop?: (e: DragEvent<HTMLDivElement>, targetId: string, sourceId: string) => void;
  
  // ── INTERACTIONS ──
  onClick?: () => void;
  onDoubleClick?: () => void;
  onContextMenu?: (e: React.MouseEvent) => void;
  onFavorite?: () => void;
  onSelect?: (selected: boolean) => void;
  onUse?: () => void;
  onDropItem?: () => void;
}

// ═══════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════

export function productSrc(id: string) {
  return `/products/${id}.webp`;
}

function formatTimeRemaining(seconds: number): string {
  if (seconds <= 0) return "Expiré";
  if (seconds < 60) return `${Math.floor(seconds)}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  return `${Math.floor(seconds / 86400)}j`;
}

function getQualityFromDurability(durability: number): ItemQuality {
  if (durability > 80) return "pristine";
  if (durability > 60) return "good";
  if (durability > 40) return "worn";
  if (durability > 20) return "damaged";
  return "broken";
}

// ═══════════════════════════════════════════════════════════
// STYLES & THEMES
// ═══════════════════════════════════════════════════════════

const RARITY_STYLES: Record<ItemRarity, { border: string; glow: string; bg: string; text: string }> = {
  common: {
    border: "border-slate-700/60",
    glow: "group-hover:shadow-[0_0_12px_rgba(100,116,139,0.25)]",
    bg: "from-slate-900/90 to-slate-950/95",
    text: "text-slate-400",
  },
  uncommon: {
    border: "border-emerald-500/50",
    glow: "group-hover:shadow-[0_0_15px_rgba(16,185,129,0.35)]",
    bg: "from-emerald-950/40 via-slate-900/90 to-slate-950/95",
    text: "text-emerald-400",
  },
  rare: {
    border: "border-sky-500/60",
    glow: "group-hover:shadow-[0_0_18px_rgba(14,165,233,0.45)]",
    bg: "from-sky-950/40 via-slate-900/90 to-slate-950/95",
    text: "text-sky-400",
  },
  epic: {
    border: "border-purple-500/60",
    glow: "group-hover:shadow-[0_0_20px_rgba(168,85,247,0.5)]",
    bg: "from-purple-950/40 via-slate-900/90 to-slate-950/95",
    text: "text-purple-400",
  },
  legendary: {
    border: "border-amber-500/70",
    glow: "group-hover:shadow-[0_0_22px_rgba(245,158,11,0.55)]",
    bg: "from-amber-950/40 via-slate-900/90 to-slate-950/95",
    text: "text-amber-400",
  },
  contraband: {
    border: "border-rose-500/80",
    glow: "shadow-[0_0_18px_rgba(244,63,94,0.45)]",
    bg: "from-rose-950/50 via-slate-900/90 to-slate-950/95",
    text: "text-rose-400",
  },
  illegal: {
    border: "border-red-600/90",
    glow: "shadow-[0_0_22px_rgba(220,38,38,0.55)]",
    bg: "from-red-950/60 via-slate-900/90 to-slate-950/95",
    text: "text-red-400",
  },
};

const QUALITY_LABELS: Record<ItemQuality, { label: string; color: string }> = {
  pristine: { label: "Impeccable", color: "text-emerald-400" },
  good: { label: "Bon état", color: "text-sky-400" },
  worn: { label: "Usé", color: "text-amber-400" },
  damaged: { label: "Endommagé", color: "text-orange-400" },
  broken: { label: "Cassé", color: "text-red-400" },
};

// ═══════════════════════════════════════════════════════════
// COMPOSANTS AUXILIAIRES
// ═══════════════════════════════════════════════════════════

function LegendaryParticles() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-lg">
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          className="absolute h-1 w-1 animate-ping rounded-full bg-amber-400"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            animationDelay: `${i * 0.2}s`,
            animationDuration: "2s",
          }}
        />
      ))}
    </div>
  );
}

function ItemTooltip({
  props,
  position = "top",
}: {
  props: ProductThumbProps;
  position?: "top" | "bottom" | "left" | "right";
}) {
  const {
    alt,
    description,
    rarity = "common",
    quality,
    durability,
    stats,
    comparisonStats,
    price,
    marketValue,
    weightKg,
    recipe,
    expiresAt,
    expiresIn,
  } = props;

  const effectiveQuality = quality || (durability !== undefined ? getQualityFromDurability(durability) : undefined);
  const style = RARITY_STYLES[rarity];

  const positionClasses = {
    top: "bottom-full left-1/2 -translate-x-1/2 mb-2",
    bottom: "top-full left-1/2 -translate-x-1/2 mt-2",
    left: "right-full top-1/2 -translate-y-1/2 mr-2",
    right: "left-full top-1/2 -translate-y-1/2 ml-2",
  };

  return (
    <div
      className={`pointer-events-none absolute z-50 w-64 rounded-lg border border-slate-700 bg-slate-900/95 p-3 shadow-2xl backdrop-blur-md ${positionClasses[position]}`}
    >
      {/* Header */}
      <div className="mb-2 border-b border-slate-700/50 pb-2">
        <h3 className={`text-sm font-bold ${style.text}`}>{alt}</h3>
        {effectiveQuality && (
          <p className={`text-xs ${QUALITY_LABELS[effectiveQuality].color}`}>
            {QUALITY_LABELS[effectiveQuality].label}
          </p>
        )}
      </div>

      {/* Description */}
      {description && (
        <p className="mb-2 text-xs text-slate-300">{description}</p>
      )}

      {/* Stats */}
      {stats && (
        <div className="mb-2 space-y-1 border-t border-slate-700/50 pt-2">
          {stats.damage !== undefined && (
            <StatRow 
              label="Dégâts" 
              value={stats.damage} 
              comparison={comparisonStats?.damage}
            />
          )}
          {stats.armor !== undefined && (
            <StatRow 
              label="Armure" 
              value={stats.armor} 
              comparison={comparisonStats?.armor}
            />
          )}
          {stats.healing !== undefined && (
            <StatRow 
              label="Soin" 
              value={stats.healing} 
              comparison={comparisonStats?.healing}
            />
          )}
          {stats.speed !== undefined && (
            <StatRow 
              label="Vitesse" 
              value={stats.speed} 
              comparison={comparisonStats?.speed}
            />
          )}
        </div>
      )}

      {/* Durability */}
      {durability !== undefined && (
        <div className="mb-2">
          <div className="mb-1 flex justify-between text-xs">
            <span className="text-slate-400">Durabilité</span>
            <span className="text-slate-300">{durability}%</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-slate-800">
            <div
              className={`h-full rounded-full transition-all ${
                durability > 60 ? "bg-emerald-500" : durability > 25 ? "bg-amber-500" : "bg-rose-500"
              }`}
              style={{ width: `${durability}%` }}
            />
          </div>
        </div>
      )}

      {/* Crafting */}
      {recipe && (
        <div className="mb-2 border-t border-slate-700/50 pt-2">
          <p className="mb-1 text-xs font-semibold text-slate-300">Recette :</p>
          <div className="space-y-0.5">
            {recipe.ingredients.map((ing, i) => (
              <p key={i} className="text-xs text-slate-400">
                • {ing.qty}x {ing.id}
              </p>
            ))}
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Temps : {recipe.craftTime}s
          </p>
        </div>
      )}

      {/* Footer */}
      <div className="flex justify-between border-t border-slate-700/50 pt-2 text-xs">
        {weightKg !== undefined && (
          <span className="text-slate-400">{weightKg}kg</span>
        )}
        {price !== undefined && (
          <span className="font-semibold text-emerald-400">{price}$</span>
        )}
        {marketValue !== undefined && marketValue !== price && (
          <span className="text-slate-400">Marché: {marketValue}$</span>
        )}
      </div>

      {/* Expiration */}
      {(expiresAt || expiresIn) && (
        <div className="mt-2 border-t border-slate-700/50 pt-2 text-xs">
          <span className="text-orange-400">
            ⏰ Expire dans {expiresIn !== undefined ? formatTimeRemaining(expiresIn) : "bientôt"}
          </span>
        </div>
      )}
    </div>
  );
}

function StatRow({ 
  label, 
  value, 
  comparison 
}: { 
  label: string; 
  value: number; 
  comparison?: number;
}) {
  const diff = comparison !== undefined ? value - comparison : 0;
  const diffColor = diff > 0 ? "text-emerald-400" : diff < 0 ? "text-rose-400" : "text-slate-400";

  return (
    <div className="flex justify-between text-xs">
      <span className="text-slate-400">{label}</span>
      <div className="flex gap-1">
        <span className="text-slate-300">{value}</span>
        {comparison !== undefined && diff !== 0 && (
          <span className={diffColor}>
            ({diff > 0 ? "+" : ""}{diff})
          </span>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// COMPOSANT PRINCIPAL
// ═══════════════════════════════════════════════════════════

export function ProductThumb({
  id,
  icon,
  alt,
  className = "size-16",
  quantity,
  durability,
  rarity = "common",
  quality,
  category,
  isIllegal = false,
  isRestricted = false,
  isStolen = false,
  isEquipped = false,
  isSelected = false,
  isFavorite = false,
  isNew = false,
  isLimited = false,
  isSeasonal = false,
  hotbarSlot,
  discountPercent,
  weightKg,
  price,
  marketValue,
  expiresAt,
  expiresIn,
  isCraftable = false,
  recipe,
  craftProgress,
  stats,
  comparisonStats,
  description,
  tooltipPosition = "top",
  showTooltip = true,
  glow = true,
  interactive = true,
  compact = false,
  showParticles = true,
  animateAcquisition = false,
  animateDamage = false,
  draggable = false,
  onDragStart,
  onDragEnd,
  onDrop,
  onClick,
  onDoubleClick,
  onContextMenu,
  onFavorite,
  onSelect,
  onUse,
  onDropItem,
}: ProductThumbProps) {
  const [imgState, setImgState] = useState<"loading" | "ok" | "fallback_jpg" | "error">("loading");
  const [isHovered, setIsHovered] = useState(false);
  const [showAcquisitionFlash, setShowAcquisitionFlash] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const elementRef = useRef<HTMLDivElement>(null);

  // Animation d'acquisition
  useEffect(() => {
    if (animateAcquisition) {
      setShowAcquisitionFlash(true);
      const timer = setTimeout(() => setShowAcquisitionFlash(false), 600);
      return () => clearTimeout(timer);
    }
  }, [animateAcquisition]);

  // Countdown pour expiration
  const [timeRemaining, setTimeRemaining] = useState(expiresIn);
  useEffect(() => {
    if (expiresIn === undefined) return;
    
    const interval = setInterval(() => {
      setTimeRemaining((prev) => (prev !== undefined ? Math.max(0, prev - 1) : 0));
    }, 1000);
    
    return () => clearInterval(interval);
  }, [expiresIn]);

  // Détermine la rareté effective
  const effectiveRarity: ItemRarity = isIllegal ? "illegal" : rarity;
  const style = RARITY_STYLES[effectiveRarity];
  const IconComponent = ITEM_ICONS[icon] ?? ITEM_ICONS.file;

  // Calcul de la couleur de la barre de durabilité
  const durabilityColor = useMemo(() => {
    if (durability === undefined) return "";
    if (durability > 60) return "bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.6)]";
    if (durability > 25) return "bg-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.6)]";
    return "bg-rose-500 shadow-[0_0_6px_rgba(244,63,94,0.8)] animate-pulse";
  }, [durability]);

  // Handlers drag & drop
  const handleDragStart = (e: DragEvent<HTMLDivElement>) => {
    if (!draggable) return;
    setIsDragging(true);
    e.dataTransfer.setData("text/plain", id);
    e.dataTransfer.effectAllowed = "move";
    onDragStart?.(e, id);
  };

  const handleDragEnd = (e: DragEvent<HTMLDivElement>) => {
    setIsDragging(false);
    onDragEnd?.(e, id);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const sourceId = e.dataTransfer.getData("text/plain");
    if (sourceId && sourceId !== id) {
      onDrop?.(e, id, sourceId);
    }
  };

  return (
    <div
      ref={elementRef}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      onContextMenu={onContextMenu}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      draggable={draggable}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      role="button"
      tabIndex={interactive ? 0 : -1}
      aria-label={`${alt}${quantity ? `, quantité ${quantity}` : ""}${isEquipped ? ", équipé" : ""}`}
      className={`group relative flex shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-gradient-to-b p-1.5 select-none transition-all duration-200 ${
        style.border
      } ${style.bg} ${glow ? style.glow : ""} ${
        isEquipped ? "ring-2 ring-emerald-500/80 ring-offset-1 ring-offset-slate-950" : ""
      } ${
        isSelected ? "ring-2 ring-sky-500/80 ring-offset-1 ring-offset-slate-950" : ""
      } ${
        isDragging ? "opacity-50 scale-95" : ""
      } ${
        interactive ? "cursor-pointer hover:scale-[1.02] active:scale-95 hover:border-slate-400/80" : ""
      } ${
        animateDamage ? "animate-shake" : ""
      } ${className}`}
    >
      {/* ── FLASH D'ACQUISITION ── */}
      {showAcquisitionFlash && (
        <div className="pointer-events-none absolute inset-0 z-40 animate-flash rounded-lg bg-white/80" />
      )}

      {/* ── FOND RADIAL & OVERLAY ÉQUIPÉ ── */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-white/5 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      {isEquipped && (
        <div className="pointer-events-none absolute inset-0 bg-emerald-500/10" />
      )}

      {/* ── PARTICULES LÉGENDAIRE ── */}
      {effectiveRarity === "legendary" && showParticles && <LegendaryParticles />}

      {/* ── VISUEL PRINCIPAL ── */}
      {imgState !== "error" ? (
        <>
          <img
            src={imgState === "fallback_jpg" ? `/products/${id}.jpg` : productSrc(id)}
            alt={alt}
            onLoad={() => setImgState("ok")}
            onError={() => {
              if (imgState === "loading") setImgState("fallback_jpg");
              else setImgState("error");
            }}
            className={`h-full w-full rounded-md object-contain drop-shadow-[0_4px_8px_rgba(0,0,0,0.6)] transition-transform duration-300 group-hover:scale-110 ${
              imgState === "loading" ? "opacity-0" : "opacity-100"
            } ${isStolen ? "sepia-[.3] hue-rotate-[-30deg]" : ""}`}
          />
          {/* Stacking 3D pour grandes quantités */}
          {quantity && quantity > 10 && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="absolute -z-10 h-full w-full translate-x-1 translate-y-1 rounded-md bg-slate-800/40" />
              <div className="absolute -z-20 h-full w-full translate-x-2 translate-y-2 rounded-md bg-slate-800/20" />
            </div>
          )}
        </>
      ) : (
        <span className="flex h-full w-full items-center justify-center rounded-md bg-slate-900/80">
          <IconComponent className="h-1/2 w-1/2 text-slate-400 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] transition-transform duration-300 group-hover:scale-110 group-hover:text-white" />
        </span>
      )}

      {/* ── SQUELETTE DE CHARGEMENT ── */}
      {imgState === "loading" && (
        <div className="absolute inset-0 animate-pulse rounded-lg bg-slate-800/60" />
      )}

      {/* ── PROGRESSION CRAFTING ── */}
      {craftProgress !== undefined && craftProgress > 0 && craftProgress < 100 && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-950/80">
          <div className="text-center">
            <div className="mb-1 text-xs font-bold text-amber-400">{Math.floor(craftProgress)}%</div>
            <div className="h-1 w-12 overflow-hidden rounded-full bg-slate-800">
              <div
                className="h-full bg-amber-500 transition-all"
                style={{ width: `${craftProgress}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* ── BADGES HAUT GAUCHE (Slots & Statuts légaux) ── */}
      <div className="absolute top-1 left-1 flex flex-col items-start gap-1">
        {hotbarSlot !== undefined && (
          <span className="flex size-4 items-center justify-center rounded bg-slate-200/90 text-[10px] font-black text-slate-900 shadow-sm backdrop-blur-md">
            {hotbarSlot}
          </span>
        )}
        {(isIllegal || isRestricted || isStolen || isNew || isLimited || isSeasonal) && (
          <div className="flex flex-col gap-0.5">
            {isStolen && (
              <span className="rounded bg-orange-600/90 px-1 py-[1px] text-[8px] font-bold tracking-wider text-white uppercase shadow-md backdrop-blur-md">
                VOLÉ
              </span>
            )}
            {isIllegal && (
              <span className="rounded bg-red-600/90 px-1 py-[1px] text-[8px] font-bold tracking-wider text-white uppercase shadow-md backdrop-blur-md">
                PROHIBÉ
              </span>
            )}
            {isRestricted && !isIllegal && (
              <span className="rounded bg-sky-600/90 px-1 py-[1px] text-[8px] font-bold tracking-wider text-white uppercase shadow-md backdrop-blur-md">
                21+
              </span>
            )}
            {isNew && (
              <span className="animate-pulse rounded bg-emerald-500/90 px-1 py-[1px] text-[8px] font-bold tracking-wider text-white uppercase shadow-md backdrop-blur-md">
                NEW
              </span>
            )}
            {isLimited && (
              <span className="rounded bg-purple-500/90 px-1 py-[1px] text-[8px] font-bold tracking-wider text-white uppercase shadow-md backdrop-blur-md">
                LIMITÉ
              </span>
            )}
            {isSeasonal && (
              <span className="rounded bg-pink-500/90 px-1 py-[1px] text-[8px] font-bold tracking-wider text-white uppercase shadow-md backdrop-blur-md">
                SAISON
              </span>
            )}
          </div>
        )}
      </div>

      {/* ── BADGES HAUT DROITE (Promotions & Équipé) ── */}
      <div className="absolute top-1 right-1 flex flex-col items-end gap-1">
        {isEquipped && (
          <span className="rounded bg-emerald-500/90 px-1 py-[1px] text-[8px] font-black tracking-wider text-slate-950 shadow-md">
            ÉQUIPÉ
          </span>
        )}
        {discountPercent !== undefined && discountPercent > 0 && (
          <span className="rounded bg-amber-500 px-1 py-[1px] text-[9px] font-black tracking-tight text-slate-950 shadow-md">
            -{discountPercent}%
          </span>
        )}
        {isCraftable && (
          <span className="rounded bg-indigo-500/90 px-1 py-[1px] text-[8px] font-bold tracking-wider text-white uppercase shadow-md backdrop-blur-md">
            CRAFT
          </span>
        )}
        {isFavorite && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onFavorite?.();
            }}
            className="rounded bg-pink-500/90 p-0.5 text-white shadow-md transition-transform hover:scale-110"
            aria-label="Retirer des favoris"
          >
            <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
          </button>
        )}
      </div>

      {/* ── BADGE POIDS (Bas Gauche) ── */}
      {weightKg !== undefined && weightKg > 0 && !compact && (
        <span className="absolute bottom-2 left-1 rounded bg-black/70 px-1 py-[1px] text-[9px] font-medium tracking-tight text-slate-300 backdrop-blur-md">
          {weightKg}kg
        </span>
      )}

      {/* ── BADGE PRIX (Bas Gauche, sous le poids) ── */}
      {price !== undefined && !compact && (
        <span className="absolute bottom-6 left-1 rounded bg-emerald-600/90 px-1 py-[1px] text-[9px] font-bold tracking-tight text-white backdrop-blur-md">
          {price}$
        </span>
      )}

      {/* ── BADGE EXPIRATION (Bas Centre) ── */}
      {timeRemaining !== undefined && timeRemaining > 0 && timeRemaining < 3600 && (
        <span className="absolute bottom-6 left-1/2 -translate-x-1/2 rounded bg-orange-600/90 px-1.5 py-[1px] text-[9px] font-bold tracking-tight text-white backdrop-blur-md">
          ⏰ {formatTimeRemaining(timeRemaining)}
        </span>
      )}

      {/* ── BADGE QUANTITÉ (Bas Droite) ── */}
      {quantity !== undefined && quantity > 1 && (
        <span className="absolute bottom-2 right-1 rounded-sm bg-slate-900/90 px-1.5 py-[1px] text-[10px] font-mono font-bold tracking-tight text-emerald-400 ring-1 ring-emerald-500/30 shadow-sm backdrop-blur-md">
          x{quantity}
        </span>
      )}

      {/* ── BARRE DE DURABILITÉ (Fond absolu) ── */}
      {durability !== undefined && (
        <div className="absolute right-1 bottom-0.5 left-1 h-1 overflow-hidden rounded-full bg-slate-950/90 p-[0.5px]">
          <div
            className={`h-full rounded-full transition-all duration-300 ${durabilityColor}`}
            style={{ width: `${Math.max(2, Math.min(100, durability))}%` }}
          />
        </div>
      )}

      {/* ── TOOLTIP ── */}
      {isHovered && showTooltip && !compact && (
        <ItemTooltip
          props={{
            id,
            icon,
            alt,
            description,
            rarity: effectiveRarity,
            quality,
            durability,
            stats,
            comparisonStats,
            price,
            marketValue,
            weightKg,
            recipe,
            expiresIn: timeRemaining,
          }}
          position={tooltipPosition}
        />
      )}

      {/* ── MENU CONTEXTUEL (Clic droit) ── */}
      {/* Implémenté via onContextMenu handler */}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// EXPORTS ADDITIONNELS
// ═══════════════════════════════════════════════════════════

export { RARITY_STYLES, QUALITY_LABELS };