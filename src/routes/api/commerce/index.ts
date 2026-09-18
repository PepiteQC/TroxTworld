/**
 * Registre des Commerces & Inventaires (/api/commerce)
 * Fichier: src/routes/api/commerce/index.ts
 */
import { createFileRoute } from "@tanstack/react-router";

export interface ShopItem {
  id: string;
  name: string;
  price: number;
  category: "food" | "drink" | "cannabis" | "hardware" | "clothing" | "fuel";
  restrictedAge?: number; // 18+ (SQDC / Tabac / Alcool)
  stock: number;
}

export interface StoreDefinition {
  id: string;
  name: string;
  town: string;
  type: "depanneur" | "sqdc" | "station_service" | "quincaillerie";
  items: ShopItem[];
}

const STORES_REGISTRY: StoreDefinition[] = [
  {
    id: "dep-portneuf",
    name: "Dépanneur du Rang Portneuf",
    town: "Portneuf",
    type: "depanneur",
    items: [
      { id: "poutine", name: "Poutine Traditionnelle", price: 12.50, category: "food", stock: 25 },
      { id: "tourtiere", name: "Part de Tourtière du Lac", price: 8.75, category: "food", stock: 15 },
      { id: "slush", name: "Slush Bleue Framboise", price: 3.50, category: "drink", stock: 50 },
      { id: "tabac", name: "Paquet de Cigarettes", price: 18.00, category: "clothing", restrictedAge: 18, stock: 40 },
    ],
  },
  {
    id: "sqdc-donnacona",
    name: "Succursale SQDC Donnacona",
    town: "Donnacona",
    type: "sqdc",
    items: [
      { id: "fleur_indica", name: "Fleur Séchée Indica 3.5g", price: 28.90, category: "cannabis", restrictedAge: 21, stock: 60 },
      { id: "preroll", name: "Joints Pré-roulés (x3)", price: 16.50, category: "cannabis", restrictedAge: 21, stock: 80 },
      { id: "huile_cbd", name: "Gouttes d'Huile CBD", price: 34.00, category: "cannabis", restrictedAge: 21, stock: 30 },
    ],
  },
];

const JSON_HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
} as const;

export const Route = createFileRoute("/api/commerce/")({
  server: {
    handlers: {
      GET: async () => new Response(JSON.stringify({ ok: true, stores: STORES_REGISTRY }), { status: 200, headers: JSON_HEADERS }),
      OPTIONS: async () => new Response(null, { status: 204, headers: JSON_HEADERS }),
    },
  },
});

