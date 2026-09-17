/**
 * ═══════════════════════════════════════════════════════════════════
 * 🏠 TROXTWORLD / ETHERWORLD — CATALOGUE PROPRIÉTÉS (/api/properties/)
 * ═══════════════════════════════════════════════════════════════════
 * 
 * Registre Immobilier & Annonces Centris MLS du Comté :
 *  - 🏡 Maisons, Chalets, Suites d'hôtel, Garages & Terrains
 *  - 📜 Filtres de prix, localisation par village & Disponibilités
 * ═══════════════════════════════════════════════════════════════════
 */

import { createFileRoute } from "@tanstack/react-router";
import { handleRpRest } from "@/server/rpRest.server";

export interface PropertySummary {
  id: string;
  name: string;
  town: string;
  address: string;
  type: "house" | "hotel_room" | "commercial" | "warehouse" | "garage" | "farm";
  price: number;
  monthlyRent: number;
  forSale: boolean;
  forRent: boolean;
  ownerName: string | null;
  surfaceSqFt: number;
  bedrooms: number;
  bathrooms: number;
  features: string[];
}

const PROPERTIES_LIST: PropertySummary[] = [
  {
    id: "H-PNF",
    name: "Maison du Chef-Lieu",
    town: "Portneuf",
    address: "24 rue Notre-Dame",
    type: "house",
    price: 285000,
    monthlyRent: 1450,
    forSale: true,
    forRent: false,
    ownerName: null,
    surfaceSqFt: 2200,
    bedrooms: 3,
    bathrooms: 2,
    features: ["Garage double", "Thermopompe", "Cour clôturée", "Proche fleuve"],
  },
  {
    id: "H-DNC",
    name: "Bungalow du 2e Rang",
    town: "Donnacona",
    address: "142 2e Rang",
    type: "house",
    price: 210000,
    monthlyRent: 1150,
    forSale: false,
    forRent: true,
    ownerName: "Gestion Immobilière Tremblay",
    surfaceSqFt: 1650,
    bedrooms: 2,
    bathrooms: 1,
    features: ["Terrain boisé", "Foyer au bois", "Sous-sol aménageable"],
  },
  {
    id: "H-HOTEL-214",
    name: "Suite Royale 214 — Hôtel Pont-Rouge",
    town: "Pont-Rouge",
    address: "100 rue du Pont",
    type: "hotel_room",
    price: 95000,
    monthlyRent: 850,
    forSale: false,
    forRent: true,
    ownerName: "Hôtel Pont-Rouge Inc.",
    surfaceSqFt: 580,
    bedrooms: 1,
    bathrooms: 1,
    features: ["Service aux chambres", "TV Best Life", "Ascenseur direct"],
  },
  {
    id: "COM-GARAGE-01",
    name: "Garage & Atelier Mécanique",
    town: "Portneuf",
    address: "Route 138",
    type: "commercial",
    price: 420000,
    monthlyRent: 2400,
    forSale: true,
    forRent: true,
    ownerName: null,
    surfaceSqFt: 3800,
    bedrooms: 0,
    bathrooms: 1,
    features: ["Ponts élévateurs", "Compresseur industriel", "Parking clients"],
  },
];

async function handleServerRequest({ request }: { request: Request }): Promise<Response> {
  const url = new URL(request.url);
  const method = request.method.toUpperCase();

  const headers = {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };

  if (method === "OPTIONS") return new Response(null, { status: 204, headers });

  try {
    const town = url.searchParams.get("town")?.toLowerCase();
    const type = url.searchParams.get("type")?.toLowerCase();
    const forSaleOnly = url.searchParams.get("forSale") === "true";
    const forRentOnly = url.searchParams.get("forRent") === "true";

    let list = [...PROPERTIES_LIST];
    if (town) list = list.filter((p) => p.town.toLowerCase() === town);
    if (type) list = list.filter((p) => p.type === type);
    if (forSaleOnly) list = list.filter((p) => p.forSale);
    if (forRentOnly) list = list.filter((p) => p.forRent);

    return new Response(
      JSON.stringify({
        ok: true,
        total: list.length,
        registryName: "Registre Foncier & MLS Centris — Comté de Portneuf",
        properties: list,
        timestamp: Date.now(),
      }),
      { status: 200, headers }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ ok: false, error: "internal_server_error", message: err instanceof Error ? err.message : String(err) }),
      { status: 500, headers }
    );
  }
}

export const Route = createFileRoute("/api/properties/")({
  server: {
    handlers: {
      GET: handleServerRequest,
      OPTIONS: handleServerRequest,
    },
  },
});