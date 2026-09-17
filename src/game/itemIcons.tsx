/**
 * EtherWorld / TroxTWorld — Registre & Composant des Icônes d'Inventaire.
 * Compatible .ts et .tsx sans erreur de parseur JSX.
 */

import React from "react";
import {
  Axe,
  Backpack,
  Beer,
  Binoculars,
  Coffee,
  Cookie,
  Crosshair,
  CupSoda,
  Droplets,
  FileText,
  Fuel,
  Gem,
  Hammer,
  HardHat,
  HeartPulse,
  KeyRound,
  Leaf,
  Newspaper,
  Package,
  Pill,
  Sandwich,
  ShieldAlert,
  Shirt,
  Shovel,
  Utensils,
  Wrench,
  type LucideIcon,
  type LucideProps,
} from "lucide-react";
import type { ShopItem } from "./commerce";

export const ITEM_ICONS: Readonly<Record<ShopItem["icon"], LucideIcon>> = {
  utensils: Utensils,
  coffee: Coffee,
  beer: Beer,
  cookie: Cookie,
  droplets: Droplets,
  fuel: Fuel,
  cup: CupSoda,
  sandwich: Sandwich,
  newspaper: Newspaper,
  shirt: Shirt,
  binoculars: Binoculars,
  plus: HeartPulse,
  leaf: Leaf,
  wrench: Wrench,
  key: KeyRound,
  crosshair: Crosshair,
  hammer: Hammer,
  shovel: Shovel,
  axe: Axe,
  hardhat: HardHat,
  vest: ShieldAlert,
  backpack: Backpack,
  gem: Gem,
  pill: Pill,
  file: FileText,
};

export function getItemColorClass(iconKey: ShopItem["icon"]): string {
  switch (iconKey) {
    case "plus":
      return "text-rose-400";
    case "droplets":
    case "cup":
      return "text-sky-400";
    case "coffee":
      return "text-amber-600";
    case "beer":
      return "text-amber-400";
    case "utensils":
    case "sandwich":
    case "cookie":
      return "text-orange-400";
    case "leaf":
      return "text-emerald-400";
    case "pill":
      return "text-purple-400";
    case "gem":
      return "text-cyan-300";
    case "crosshair":
    case "axe":
      return "text-red-400";
    case "wrench":
    case "hammer":
    case "shovel":
    case "hardhat":
      return "text-amber-500";
    case "fuel":
      return "text-yellow-500";
    case "key":
      return "text-yellow-300";
    case "file":
    case "newspaper":
      return "text-slate-400";
    default:
      return "text-slate-300";
  }
}

export interface ItemIconProps extends LucideProps {
  icon?: ShopItem["icon"] | string;
  autoColor?: boolean;
}

export function ItemIcon({
  icon,
  autoColor = false,
  className = "",
  size = 16,
  ...props
}: ItemIconProps) {
  const IconComponent = (icon && ITEM_ICONS[icon as ShopItem["icon"]]) || Package;
  const colorClass = autoColor && icon ? getItemColorClass(icon as ShopItem["icon"]) : "";

  return React.createElement(IconComponent, {
    size,
    className: `shrink-0 ${colorClass} ${className}`.trim(),
    ...props,
  });
}