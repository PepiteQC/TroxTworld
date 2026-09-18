/**
 * TROXTWORLD — Inventaire SQDC par allée
 */
export interface StockLine {
  itemId: string;
  quantity: number;
  maxCapacity: number;
  reorderThreshold: number;
  wholesalePrice: number;
  retailPrice: number;
  aisle: string;
  lastRestock: number;
}

export interface StoreInventory {
  lines: Map<string, StockLine>;
  addStock: (itemId: string, qty: number) => boolean;
  removeStock: (itemId: string, qty: number) => boolean;
  getLowStock: () => StockLine[];
  getStock: (itemId: string) => StockLine | null;
  allLines: () => StockLine[];
}

export function createInventory(seed: Array<Omit<StockLine, "lastRestock">> = []): StoreInventory {
  const lines = new Map<string, StockLine>();
  for (const s of seed) {
    lines.set(s.itemId, { ...s, lastRestock: Date.now() });
  }

  return {
    lines,
    addStock: (itemId, qty) => {
      const line = lines.get(itemId);
      if (!line) return false;
      const space = line.maxCapacity - line.quantity;
      const add = Math.min(qty, space);
      line.quantity += add;
      line.lastRestock = Date.now();
      return add > 0;
    },
    removeStock: (itemId, qty) => {
      const line = lines.get(itemId);
      if (!line || line.quantity < qty) return false;
      line.quantity -= qty;
      return true;
    },
    getLowStock: () => Array.from(lines.values()).filter((l) => l.quantity <= l.reorderThreshold),
    getStock: (itemId) => lines.get(itemId) ?? null,
    allLines: () => Array.from(lines.values()),
  };
}