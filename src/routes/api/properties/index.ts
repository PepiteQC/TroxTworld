/**
 * ═════════════════════════════════════════════════════════════════════════════
 * CATALOGUE IMMOBILIER MLS CENTRIS — MRC DE PORTNEUF (/api/properties)
 * ═════════════════════════════════════════════════════════════════════════════
 * 
 * Registre foncier et annonces immobilières :
 *  - Filtrage multi-critères : village, type de bien, fourchette de prix.
 *  - Recherche par disponibilité (À vendre / À louer).
 * ═════════════════════════════════════════════════════════════════════════════
 */

import { createFileRoute } from "@tanstack/react-router";

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
  ownerId: string | null;
  ownerName: string | null;
  surfaceSqFt: number;
  bedrooms: number;
  bathrooms: number;
  locked: boolean;
  features: string[];
}

export const PROPERTIES_REGISTRY: PropertySummary[] = [
  {
    id: "H-PNF-01",
    name: "Maison d'Époque du Chef-Lieu",
    town: "Portneuf",
    address: "24 rue Notre-Dame",
    type: "house",
    price: 285000,
    monthlyRent: 1450,
    forSale: true,
    forRent: false,
    ownerId: null,
    ownerName: null,
    surfaceSqFt: 2200,
    bedrooms: 3,
    bathrooms: 2,
    locked: true,
    features: ["Garage double", "Thermopompe", "Cour clôturée", "Proche fleuve Saint-Laurent"],
  },
  {
    id: "H-DNC-02",
    name: "Bungalow Traditionnel du 2e Rang",
    town: "Donnacona",
    address: "142 2e Rang",
    type: "house",
    price: 210000,
    monthlyRent: 1150,
    forSale: false,
    forRent: true,
    ownerId: "corp-tremblay",
    ownerName: "Gestion Immobilière Tremblay",
    surfaceSqFt: 1650,
    bedrooms: 2,
    bathrooms: 1,
    locked: true,
    features: ["Terrain boisé", "Poêle à bois", "Sous-sol aménageable"],
  },
  {
    id: "H-HOTEL-214",
    name: "Suite 214 — Hôtel Pont-Rouge",
    town: "Pont-Rouge",
    address: "100 rue du Pont",
    type: "hotel_room",
    price: 95000,
    monthlyRent: 850,
    forSale: false,
    forRent: true,
    ownerId: "hotel-pont-rouge-inc",
    ownerName: "Hôtel Pont-Rouge Inc.",
    surfaceSqFt: 580,
    bedrooms: 1,
    bathrooms: 1,
    locked: true,
    features: ["Service aux chambres", "Câblodistribution incluse", "Ascenseur direct"],
  },
  {
    id: "COM-GARAGE-01",
    name: "Garage Mécanique & Dépannage 138",
    town: "Portneuf",
    address: "Route 138 Ouest",
    type: "commercial",
    price: 420000,
    monthlyRent: 2400,
    forSale: true,
    forRent: true,
    ownerId: null,
    ownerName: null,
    surfaceSqFt: 3800,
    bedrooms: 0,
    bathrooms: 1,
    locked: true,
    features: ["Ponts élévateurs", "Compresseur industriel", "Stationnement commercial"],
  },
  {
    id: "FRM-RAY-01",
    name: "Ferme Laitière & Érablière du Rang Saint-Ignace",
    town: "Saint-Raymond",
    address: "510 Rang Saint-Ignace",
    type: "farm",
    price: 680000,
    monthlyRent: 3500,
    forSale: true,
    forRent: false,
    ownerId: null,
    ownerName: null,
    surfaceSqFt: 12500,
    bedrooms: 4,
    bathrooms: 2,
    locked: true,
    features: ["Grange chauffée", "Cabane à sucre équipée", "Terre cultivable 40 arpents"],
  },
];

const JSON_HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store, no-cache",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
} as const;

async function handleGetProperties({ request }: { request: Request }): Promise<Response> {
  const url = new URL(request.url);

  try {
    const town = url.searchParams.get("town")?.toLowerCase();
    const type = url.searchParams.get("type")?.toLowerCase();
    const forSale = url.searchParams.get("forSale");
    const forRent = url.searchParams.get("forRent");
    const maxPrice = Number(url.searchParams.get("maxPrice")) || Infinity;
    const minPrice = Number(url.searchParams.get("minPrice")) || 0;

    let list = [...PROPERTIES_REGISTRY];

    if (town) list = list.filter((p) => p.town.toLowerCase() === town);
    if (type) list = list.filter((p) => p.type.toLowerCase() === type);
    if (forSale === "true") list = list.filter((p) => p.forSale);
    if (forRent === "true") list = list.filter((p) => p.forRent);
    if (minPrice > 0) list = list.filter((p) => p.price >= minPrice);
    if (Number.isFinite(maxPrice)) list = list.filter((p) => p.price <= maxPrice);

    return new Response(
      JSON.stringify({
        ok: true,
        registry: "Centris MLS — Registre Foncier de Portneuf",
        count: list.length,
        properties: list,
        timestamp: Date.now(),
      }),
      { status: 200, headers: JSON_HEADERS }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        ok: false,
        error: "internal_server_error",
        message: error instanceof Error ? error.message : "Erreur inconnue",
      }),
      { status: 500, headers: JSON_HEADERS }
    );
  }
}

export const Route = createFileRoute("/api/properties/")({
  server: {
    handlers: {
      GET: handleGetProperties,
      OPTIONS: async () => new Response(null, { status: 204, headers: JSON_HEADERS }),
    },
  },
});