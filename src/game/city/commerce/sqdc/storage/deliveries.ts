/**
 * TROXTWORLD — Livraisons SQDC
 */
export interface Delivery {
  id: string;
  customerId: string;
  customerName: string;
  address: { x: number; z: number };
  items: Array<{ itemId: string; qty: number }>;
  total: number;
  status: "pending" | "assigned" | "in_transit" | "delivered" | "failed";
  driverId: string | null;
  orderedAt: number;
  deliveredAt: number | null;
  tipAmount: number;
}

export interface DeliverySystem {
  create: (d: Omit<Delivery, "id" | "status" | "driverId" | "orderedAt" | "deliveredAt" | "tipAmount">) => Delivery;
  accept: (deliveryId: string, driverId: string) => boolean;
  complete: (deliveryId: string, driverId: string) => number;
  list: () => Delivery[];
  listForDriver: (driverId: string) => Delivery[];
}

export function createDeliverySystem(): DeliverySystem {
  const deliveries: Delivery[] = [];

  return {
    create: (d) => {
      const delivery: Delivery = {
        ...d,
        id: `del_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        status: "pending",
        driverId: null,
        orderedAt: Date.now(),
        deliveredAt: null,
        tipAmount: 0,
      };
      deliveries.push(delivery);
      return delivery;
    },
    accept: (deliveryId, driverId) => {
      const d = deliveries.find((x) => x.id === deliveryId);
      if (!d || d.status !== "pending") return false;
      d.driverId = driverId;
      d.status = "assigned";
      return true;
    },
    complete: (deliveryId, driverId) => {
      const d = deliveries.find((x) => x.id === deliveryId);
      if (!d || d.driverId !== driverId) return 0;
      d.status = "delivered";
      d.deliveredAt = Date.now();
      return Math.round(d.total * 0.1 * 100) / 100 + d.tipAmount;
    },
    list: () => deliveries,
    listForDriver: (driverId) => deliveries.filter((d) => d.driverId === driverId),
  };
}