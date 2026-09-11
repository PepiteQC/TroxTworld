import { useState } from "react";
import { ITEM_ICONS } from "./itemIcons";
import type { ShopItem } from "./commerce";

function productSrc(id: string) {
  return `/products/${id}.jpg`;
}

export function ProductThumb({
  id,
  icon,
  alt,
  className = "size-12",
}: {
  id: string;
  icon: ShopItem["icon"];
  alt: string;
  className?: string;
}) {
  const [ok, setOk] = useState(true);
  const Icon = ITEM_ICONS[icon];
  if (!ok) {
    return (
      <span className={`flex shrink-0 items-center justify-center rounded-md bg-surface ${className}`}>
        <Icon className="size-4 text-accent" />
      </span>
    );
  }
  return (
    <img
      src={productSrc(id)}
      alt={alt}
      className={`shrink-0 rounded-md object-cover ${className}`}
      onError={() => setOk(false)}
    />
  );
}