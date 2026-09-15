import { useState, useMemo } from "react";
import { ITEM_ICONS } from "./itemIcons";
import type { ShopItem } from "./commerce";

export type ItemRarity = "common" | "uncommon" | "rare" | "epic" | "legendary" | "contraband" | "illegal";

export interface ProductThumbProps {
  id: string;
  icon: ShopItem["icon"];
  alt: string;
  className?: string;
  
  // ── PROPRIÉTÉS ÉTENDUES GTA RP (OPTIONNELLES) ──
  quantity?: number;            // Quantité (ex: x5)
  durability?: number;          // Durabilité / Condition (0 à 100%)
  rarity?: ItemRarity;          // Niveau de rareté ou classe d'objet
  isIllegal?: boolean;          // Objet prohibé / illégal (Weed, arme non enregistrée)
  isRestricted?: boolean;       // Réservé 21+ ou Permis requis (SIAF, SAAQ)
  discountPercent?: number;     // Rabais (ex: 20 pour -20%)
  weightKg?: number;            // Poids en kilogrammes
  size?: "sm" | "md" | "lg" | "xl";
  glow?: boolean;               // Effet néon pulsé
  interactive?: boolean;        // Effet de hover et clic
  onClick?: () => void;
}

export function productSrc(id: string) {
  return `/products/${id}.webp`;
}

// Couleurs de bordure et de halo selon la rareté / légalité
const RARITY_STYLES: Record<ItemRarity, { border: string; glow: string; bg: string }> = {
  common: {
    border: "border-slate-700/60",
    glow: "group-hover:shadow-[0_0_12px_rgba(100,116,139,0.25)]",
    bg: "from-slate-900/90 to-slate-950/95",
  },
  uncommon: {
    border: "border-emerald-500/50",
    glow: "group-hover:shadow-[0_0_15px_rgba(16,185,129,0.35)]",
    bg: "from-emerald-950/40 via-slate-900/90 to-slate-950/95",
  },
  rare: {
    border: "border-sky-500/60",
    glow: "group-hover:shadow-[0_0_18px_rgba(14,165,233,0.45)]",
    bg: "from-sky-950/40 via-slate-900/90 to-slate-950/95",
  },
  epic: {
    border: "border-purple-500/60",
    glow: "group-hover:shadow-[0_0_20px_rgba(168,85,247,0.5)]",
    bg: "from-purple-950/40 via-slate-900/90 to-slate-950/95",
  },
  legendary: {
    border: "border-amber-500/70",
    glow: "group-hover:shadow-[0_0_22px_rgba(245,158,11,0.55)]",
    bg: "from-amber-950/40 via-slate-900/90 to-slate-950/95",
  },
  contraband: {
    border: "border-rose-500/80 animate-pulse",
    glow: "shadow-[0_0_18px_rgba(244,63,94,0.45)]",
    bg: "from-rose-950/50 via-slate-900/90 to-slate-950/95",
  },
  illegal: {
    border: "border-red-600/90 animate-pulse",
    glow: "shadow-[0_0_22px_rgba(220,38,38,0.55)]",
    bg: "from-red-950/60 via-slate-900/90 to-slate-950/95",
  },
};

export function ProductThumb({
  id,
  icon,
  alt,
  className = "size-12",
  quantity,
  durability,
  rarity = "common",
  isIllegal = false,
  isRestricted = false,
  discountPercent,
  weightKg,
  glow = true,
  interactive = true,
  onClick,
}: ProductThumbProps) {
  const [imgState, setImgState] = useState<"loading" | "ok" | "fallback_jpg" | "error">("loading");

  // Détermine la rareté effective (illégal prend la priorité)
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

  return (
    <div
      onClick={onClick}
      className={`group relative flex shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-gradient-to-b p-1 select-none transition-all duration-200 ${
        style.border
      } ${style.bg} ${glow ? style.glow : ""} ${
        interactive ? "cursor-pointer hover:scale-105 active:scale-95" : ""
      } ${className}`}
    >
      {/* ── 1. FOND RADIAL SUBTIL (EFFET AMBIANT GTA) ── */}
      <div className="pointer-events-none absolute inset-0 bg-radial from-white/5 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

      {/* ── 2. VISUEL PRINCIPAL (IMAGE OU ICÔNE) ── */}
      {imgState !== "error" ? (
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
          }`}
        />
      ) : (
        <span className="flex h-full w-full items-center justify-center rounded-md bg-slate-900/80">
          <IconComponent className="h-1/2 w-1/2 text-slate-300 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] transition-transform duration-300 group-hover:scale-110 group-hover:text-white" />
        </span>
      )}

      {/* ── 3. SQUELETTE DE CHARGEMENT ANIMÉ ── */}
      {imgState === "loading" && (
        <div className="absolute inset-0 animate-pulse rounded-lg bg-slate-800/60" />
      )}

      {/* ── 4. BADGES RP EN OVERLAY ── */}

      {/* Badge Illégal / Contrebande */}
      {(isIllegal || isRestricted) && (
        <div className="absolute top-1 left-1 flex items-center gap-0.5 rounded bg-red-600/90 px-1 py-0.2 text-[9px] font-bold tracking-wider text-white uppercase shadow-md backdrop-blur-xs">
          {isIllegal ? "PROHIBÉ" : "21+"}
        </div>
      )}

      {/* Badge Rabais (%) */}
      {discountPercent !== undefined && discountPercent > 0 && (
        <div className="absolute top-1 right-1 rounded bg-amber-500 px-1 py-0.2 text-[9px] font-black tracking-tight text-slate-950 shadow-md">
          -{discountPercent}%
        </div>
      )}

      {/* Badge Poids (kg) dans le coin inférieur gauche */}
      {weightKg !== undefined && weightKg > 0 && (
        <span className="absolute bottom-1 left-1 rounded bg-black/60 px-1 py-0.2 text-[8px] font-medium tracking-tight text-slate-400 backdrop-blur-xs">
          {weightKg}kg
        </span>
      )}

      {/* Badge Quantité (xN) dans le coin inférieur droit */}
      {quantity !== undefined && quantity > 1 && (
        <span className="absolute bottom-1 right-1 rounded-sm bg-slate-950/85 px-1 py-0.2 text-[10px] font-mono font-bold tracking-tight text-emerald-400 ring-1 ring-emerald-500/30 backdrop-blur-xs shadow-sm">
          x{quantity}
        </span>
      )}

      {/* ── 5. BARRE DE DURABILITÉ EN BAS ── */}
      {durability !== undefined && (
        <div className="absolute right-1 bottom-0.5 left-1 h-1 overflow-hidden rounded-full bg-slate-950/80 p-[0.5px]">
          <div
            className={`h-full rounded-full transition-all duration-300 ${durabilityColor}`}
            style={{ width: `${Math.max(4, Math.min(100, durability))}%` }}
          />
        </div>
      )}
    </div>
  );
}
