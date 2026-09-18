/**
 * TROXTWORLD — SQDC Storage Hub
 */
export { createInventory, type StockLine, type StoreInventory } from "./inventory";
export { createSafe, type SafeSystem } from "./safe";
export { createDeliverySystem, type Delivery, type DeliverySystem } from "./deliveries";

import { createInventory, type StoreInventory } from "./inventory";
import { createSafe, type SafeSystem } from "./safe";
import { createDeliverySystem, type DeliverySystem } from "./deliveries";

export interface SqdcStorage {
  inventory: StoreInventory;
  safe: SafeSystem;
  deliveries: DeliverySystem;
}

export function buildSqdcStorage(seed?: Parameters<typeof createInventory>[0]): SqdcStorage {
  return {
    inventory: createInventory(seed),
    safe: createSafe(),
    deliveries: createDeliverySystem(),
  };
}