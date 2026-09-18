/**
 * ═════════════════════════════════════════════════════════════════════════════
 * 🚗 CATALOGUE DES VÉHICULES & CONCESSIONNAIRE SAAQ (/api/vehicles)
 * ═════════════════════════════════════════════════════════════════════════════
 * 
 * Flotte & Concessionnaire du Comté de Portneuf :
 *  - 🚙 Véhicules Civils & Pick-ups québécois (F-150, Silverado, Civic)
 *  - 🚔 Véhicules d'Intervention (SQ Interceptor, Tahoe, Ambulances)
 *  - 🚜 Machinerie & Voirie MTQ (Chasse-neige Mack, Saleuses)
 *  - 📋 Immatriculation SAAQ, Plaquage & Taxes de vente (TPS+TVQ)
 * ═════════════════════════════════════════════════════════════════════════════
 */

import { createFileRoute } from "@tanstack/react-router";

export type VehicleCategory =
  | "civilian"
  | "pickup_suv"
  | "police"
  | "emergency"
  | "heavy_truck"
  | "winter_mtq"
  | "motorcycle";

export interface VehicleCatalogItem {
  id: string;
  name: string;
  brand: string;
  modelYear: number;
  category: VehicleCategory;
  categoryLabel: string;
  price: number;
  fuelCapacityLiters: number;
  fuelType: "essence_ordinaire" | "super" | "diesel" | "electrique";
  fuelConsumptionPer100Km: number;
  topSpeedKmh: number;
  accelerationScore: number; // 0-100
  handlingScore: number;     // 0-100
  brakingScore: number;      // 0-100
  trunkCapacityKg: number;
  seatsCount: number;
  drivetrain: "FWD" | "RWD" | "AWD" | "4x4";
  availableAtDealer: boolean;
  requiredLicense: "classe_5" | "classe_1" | "classe_4a" | "classe_6a";
  winterRating: "moyen" | "bon" | "excellent" | "extreme_4x4";
  description: string;
}

export const VEHICLES_CATALOG: VehicleCatalogItem[] = [
  // ── PICK-UPS & 4X4 QUÉBÉCOIS ──
  {
    id: "pickup",
    name: "Ford F-150 SuperCrew 4x4",
    brand: "Ford",
    modelYear: 2024,
    category: "pickup_suv",
    categoryLabel: "Camionnette Pleine Grandeur",
    price: 48500,
    fuelCapacityLiters: 98,
    fuelType: "essence_ordinaire",
    fuelConsumptionPer100Km: 12.4,
    topSpeedKmh: 175,
    accelerationScore: 72,
    handlingScore: 68,
    brakingScore: 70,
    trunkCapacityKg: 850,
    seatsCount: 5,
    drivetrain: "4x4",
    availableAtDealer: true,
    requiredLicense: "classe_5",
    winterRating: "excellent",
    description: "Le véhicule le plus populaire au Québec. Idéal pour les rangs de campagne, les remorques et l'hiver.",
  },
  {
    id: "silverado",
    name: "Chevrolet Silverado 1500 Z71",
    brand: "Chevrolet",
    modelYear: 2023,
    category: "pickup_suv",
    categoryLabel: "Camionnette Hors-Route",
    price: 46900,
    fuelCapacityLiters: 91,
    fuelType: "essence_ordinaire",
    fuelConsumptionPer100Km: 13.0,
    topSpeedKmh: 170,
    accelerationScore: 70,
    handlingScore: 65,
    brakingScore: 68,
    trunkCapacityKg: 900,
    seatsCount: 5,
    drivetrain: "4x4",
    availableAtDealer: true,
    requiredLicense: "classe_5",
    winterRating: "excellent",
    description: "Suspension tout-terrain surélevée, boîte de vitesses renforcée pour les chantiers et forêts.",
  },

  // ── CIVILS ÉCONOMIQUES ──
  {
    id: "sedan",
    name: "Honda Civic Touring",
    brand: "Honda",
    modelYear: 2024,
    category: "civilian",
    categoryLabel: "Berline Compacte",
    price: 28400,
    fuelCapacityLiters: 47,
    fuelType: "essence_ordinaire",
    fuelConsumptionPer100Km: 6.8,
    topSpeedKmh: 205,
    accelerationScore: 78,
    handlingScore: 86,
    brakingScore: 82,
    trunkCapacityKg: 220,
    seatsCount: 5,
    drivetrain: "FWD",
    availableAtDealer: true,
    requiredLicense: "classe_5",
    winterRating: "bon",
    description: "Économique à la pompe, agile en ville et confortable pour les trajets quotidiens sur la 138.",
  },
  {
    id: "crownvic",
    name: "Ford Crown Victoria LX",
    brand: "Ford",
    modelYear: 2011,
    category: "civilian",
    categoryLabel: "Grande Berline V8",
    price: 6500,
    fuelCapacityLiters: 72,
    fuelType: "essence_ordinaire",
    fuelConsumptionPer100Km: 14.5,
    topSpeedKmh: 190,
    accelerationScore: 64,
    handlingScore: 58,
    brakingScore: 60,
    trunkCapacityKg: 350,
    seatsCount: 6,
    drivetrain: "RWD",
    availableAtDealer: true,
    requiredLicense: "classe_5",
    winterRating: "moyen",
    description: "Carcasse indestructible sur châssis en acier, propulsion arrière légendaire.",
  },

  // ── POLICE SQ & URGENCE ──
  {
    id: "police_utility",
    name: "Ford Police Interceptor Utility (SQ)",
    brand: "Ford",
    modelYear: 2024,
    category: "police",
    categoryLabel: "Véhicule de Patrouille Policière",
    price: 62000,
    fuelCapacityLiters: 80,
    fuelType: "essence_ordinaire",
    fuelConsumptionPer100Km: 13.8,
    topSpeedKmh: 235,
    accelerationScore: 88,
    handlingScore: 84,
    brakingScore: 88,
    trunkCapacityKg: 400,
    seatsCount: 4,
    drivetrain: "AWD",
    availableAtDealer: false,
    requiredLicense: "classe_5",
    winterRating: "excellent",
    description: "Autopatrouille officielle de la Sûreté du Québec avec gyros intégrés, pare-buffle et grille de séparation.",
  },
  {
    id: "ambulance_crestline",
    name: "Ambulance Crestline Type III",
    brand: "Ford/Crestline",
    modelYear: 2023,
    category: "emergency",
    categoryLabel: "Ambulance de Soins Intensifs",
    price: 145000,
    fuelCapacityLiters: 150,
    fuelType: "diesel",
    fuelConsumptionPer100Km: 18.0,
    topSpeedKmh: 160,
    accelerationScore: 55,
    handlingScore: 60,
    brakingScore: 72,
    trunkCapacityKg: 1200,
    seatsCount: 4,
    drivetrain: "RWD",
    availableAtDealer: false,
    requiredLicense: "classe_4a",
    winterRating: "bon",
    description: "Ambulance paramédicale entièrement équipée avec brancard hydraulique et support respiratoire.",
  },

  // ── POIDS LOURDS & CHASSE-NEIGE MTQ ──
  {
    id: "chasse_neige_mack",
    name: "Camion Charrue Mack Granite MTQ",
    brand: "Mack Trucks",
    modelYear: 2024,
    category: "winter_mtq",
    categoryLabel: "Déneigeur Lourd 10 Roues",
    price: 285000,
    fuelCapacityLiters: 380,
    fuelType: "diesel",
    fuelConsumptionPer100Km: 34.0,
    topSpeedKmh: 105,
    accelerationScore: 40,
    handlingScore: 50,
    brakingScore: 65,
    trunkCapacityKg: 12000,
    seatsCount: 2,
    drivetrain: "4x4",
    availableAtDealer: false,
    requiredLicense: "classe_1",
    winterRating: "extreme_4x4",
    description: "Véhicule officiel du ministère des Transports équipé d'une lame avant biseautée, aile latérale et trémie à sel.",
  },
  {
    id: "semi_fret",
    name: "Tracteur Routier Kenworth T680",
    brand: "Kenworth",
    modelYear: 2023,
    category: "heavy_truck",
    categoryLabel: "Tracteur Semi-Remorque Fret",
    price: 195000,
    fuelCapacityLiters: 450,
    fuelType: "diesel",
    fuelConsumptionPer100Km: 31.5,
    topSpeedKmh: 120,
    accelerationScore: 45,
    handlingScore: 52,
    brakingScore: 68,
    trunkCapacityKg: 34000,
    seatsCount: 2,
    drivetrain: "AWD",
    availableAtDealer: true,
    requiredLicense: "classe_1",
    winterRating: "bon",
    description: "Tracteur lourd pour remorques fermées 53 pieds et doubles remorques B-Train.",
  },
];

const JSON_HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Player-Id",
} as const;

async function handleGetVehicles({ request }: { request: Request }): Promise<Response> {
  const url = new URL(request.url);
  const categoryFilter = url.searchParams.get("category") as VehicleCategory | undefined;
  const dealerOnly = url.searchParams.get("dealer") === "true";
  const maxPrice = parseInt(url.searchParams.get("maxPrice") || "0", 10);
  const search = url.searchParams.get("search")?.toLowerCase();

  let list = [...VEHICLES_CATALOG];

  if (dealerOnly) list = list.filter((v) => v.availableAtDealer);
  if (categoryFilter) list = list.filter((v) => v.category === categoryFilter);
  if (maxPrice > 0) list = list.filter((v) => v.price <= maxPrice);

  if (search) {
    list = list.filter(
      (v) =>
        v.name.toLowerCase().includes(search) ||
        v.brand.toLowerCase().includes(search) ||
        v.description.toLowerCase().includes(search)
    );
  }

  return new Response(
    JSON.stringify({
      ok: true,
      total: list.length,
      dealerName: "Concessionnaire Portneuf Auto & Camions",
      vehicles: list,
      timestamp: Date.now(),
    }),
    { status: 200, headers: JSON_HEADERS }
  );
}

async function handlePostVehiclePurchase({ request }: { request: Request }): Promise<Response> {
  try {
    const body = await request.json();
    const { action, vehicleId, buyerId = "local_player", customColor = "#ffffff" } = body;

    if (!action || !vehicleId) {
      return new Response(
        JSON.stringify({ ok: false, error: "Identifiant de véhicule ou action manquante." }),
        { status: 400, headers: JSON_HEADERS }
      );
    }

    const veh = VEHICLES_CATALOG.find((v) => v.id === vehicleId);
    if (!veh) {
      return new Response(
        JSON.stringify({ ok: false, error: "Modèle de véhicule introuvable au catalogue." }),
        { status: 404, headers: JSON_HEADERS }
      );
    }

    const nowTs = Date.now();
    // Générateur de plaque québécoise SAAQ (ex: G48 KLA)
    const letter = () => String.fromCharCode(65 + Math.floor(Math.random() * 26));
    const num = () => Math.floor(10 + Math.random() * 90);
    const saaqPlate = `${letter()}${num()} ${letter()}${letter()}${letter()}`;
    const vinNumber = `2FTNE1E${Math.floor(10000000 + Math.random() * 90000000)}`;

    const tvqTpsTax = Math.round(veh.price * 0.14975);
    const saaqRegFee = 245.0;
    const totalPaid = veh.price + tvqTpsTax + saaqRegFee;

    return new Response(
      JSON.stringify({
        ok: true,
        message: `Achat de votre [${veh.name}] complété avec succès chez Portneuf Auto.`,
        registration: {
          plateNumber: saaqPlate,
          vin: vinNumber,
          vehicleModel: veh.id,
          vehicleName: veh.name,
          color: customColor,
          ownerId: buyerId,
          registeredAt: nowTs,
          invoice: {
            vehiclePrice: veh.price,
            taxesQc: tvqTpsTax,
            saaqRegistration: saaqRegFee,
            totalPaid,
          },
        },
      }),
      { status: 201, headers: JSON_HEADERS }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ ok: false, error: "Corps JSON invalide ou erreur interne." }),
      { status: 400, headers: JSON_HEADERS }
    );
  }
}

export const Route = createFileRoute("/api/vehicles/")({
  server: {
    handlers: {
      GET: handleGetVehicles,
      POST: handlePostVehiclePurchase,
      OPTIONS: async () => new Response(null, { status: 204, headers: JSON_HEADERS }),
    },
  },
});