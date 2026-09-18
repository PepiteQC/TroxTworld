/**
 * ═══════════════════════════════════════════════════════════════════
 * 🏠 TROXTWORLD / ETHERWORLD — REGISTRE IMMOBILIER MLS & TAL (/api/rp/properties)
 * ═══════════════════════════════════════════════════════════════════
 * 
 * Système Foncier, Transactions Notariées & Gestion Locative :
 *  - 📜 Actes de vente notariés & Taxe de bienvenue
 *  - 📝 Baux locatifs conformes au Tribunal administratif du logement (TAL)
 *  - 🔑 Serrures intelligentes, codes NIP & double des clés
 *  - 🛠️ Rénovations, Aménagements & Systèmes d'alarme
 * ═══════════════════════════════════════════════════════════════════
 */

import { createFileRoute } from "@tanstack/react-router";
import { handleIntellectus } from "@/intellectus/http.server";

export type PropertyType = "house" | "apartment" | "hotel_room" | "commercial" | "warehouse" | "garage" | "farm" | "mansion";
export type ListingStatus = "owned" | "for_sale" | "for_rent" | "foreclosed" | "unlisted";

export interface PropertyListing {
  id: string;
  cadastreNumber: string;
  name: string;
  address: string;
  town: string;
  type: PropertyType;
  marketPrice: number;
  salePrice?: number;
  monthlyRent?: number;
  status: ListingStatus;
  owner: {
    id: string | null;
    name: string | null;
    purchasedAt?: number;
    purchasePrice?: number;
  };
  tenant: {
    id: string | null;
    name: string | null;
    leaseSignedAt?: number;
    monthlyRentDue?: number;
  };
  security: {
    isLocked: boolean;
    pinCode?: string;
    keyHolders: string[];
    alarmInstalled: boolean;
    alarmTriggered: boolean;
  };
  utilities: {
    heatType: "plinthes" | "electrique" | "thermopompe" | "central" | "foyer" | "poele";
    waterType: "municipal" | "puits";
    hydroConnected: boolean;
    structuralIntegrity: number; // 0 à 100%
  };
  location: {
    x: number;
    y: number;
    z: number;
    interiorKind: string;
  };
  features: string[];
}

export interface RealEstateMarketStats {
  totalPropertiesCount: number;
  ownedCount: number;
  forSaleCount: number;
  forRentCount: number;
  averageHousePrice: number;
  totalMarketValuation: number;
  occupancyRatePct: number;
  monthlyTotalRentalVolume: number;
}

// ═══════════════════════════════════════════════════════════
// REGISTRE EN MÉMOIRE DU PARC IMMOBILIER (PORTNEUF MLS)
// ═══════════════════════════════════════════════════════════

const now = Date.now();

const inMemoryProperties: PropertyListing[] = [
  {
    id: "H-PNF",
    cadastreNumber: "CAD-PNF-001",
    name: "Maison du Chef-Lieu",
    address: "24 rue Notre-Dame",
    town: "Portneuf",
    type: "house",
    marketPrice: 285000,
    salePrice: 295000,
    monthlyRent: 1450,
    status: "for_sale",
    owner: { id: null, name: "Ville de Portneuf" },
    tenant: { id: null, name: null },
    security: {
      isLocked: true,
      pinCode: "1234",
      keyHolders: ["local_player"],
      alarmInstalled: true,
      alarmTriggered: false,
    },
    utilities: {
      heatType: "thermopompe",
      waterType: "municipal",
      hydroConnected: true,
      structuralIntegrity: 95,
    },
    location: { x: -420, y: 4.0, z: -28, interiorKind: "home" },
    features: ["Garage double", "Thermopompe 2024", "Cour clôturée", "Proche fleuve"],
  },
  {
    id: "H-DNC",
    cadastreNumber: "CAD-DNC-012",
    name: "Bungalow du 2e Rang",
    address: "142 2e Rang",
    town: "Donnacona",
    type: "house",
    marketPrice: 210000,
    monthlyRent: 1150,
    status: "for_rent",
    owner: { id: "investor_tremblay", name: "Gestion Immobilière Tremblay", purchasedAt: now - 86400000 * 90 },
    tenant: { id: null, name: null },
    security: {
      isLocked: true,
      pinCode: "4321",
      keyHolders: ["investor_tremblay"],
      alarmInstalled: false,
      alarmTriggered: false,
    },
    utilities: {
      heatType: "plinthes",
      waterType: "puits",
      hydroConnected: true,
      structuralIntegrity: 88,
    },
    location: { x: 440, y: 4.5, z: -40, interiorKind: "home" },
    features: ["Grand terrain boisé", "Foyer au bois", "Sous-sol aménageable"],
  },
  {
    id: "H-HOTEL-214",
    cadastreNumber: "CAD-HOT-214",
    name: "Suite Royale 214 — Hôtel Pont-Rouge",
    address: "100 rue du Pont",
    town: "Pont-Rouge",
    type: "hotel_room",
    marketPrice: 95000,
    monthlyRent: 850,
    status: "for_rent",
    owner: { id: "hotel_pont_rouge", name: "Hôtel Pont-Rouge Inc." },
    tenant: { id: "local_player", name: "Benoit Gagnon", leaseSignedAt: now - 86400000 * 5, monthlyRentDue: 850 },
    security: {
      isLocked: false,
      pinCode: "1234",
      keyHolders: ["local_player", "reception_hotel"],
      alarmInstalled: true,
      alarmTriggered: false,
    },
    utilities: {
      heatType: "central",
      waterType: "municipal",
      hydroConnected: true,
      structuralIntegrity: 100,
    },
    location: { x: 1164, y: 8.2, z: -340, interiorKind: "hotel" },
    features: ["Télévision Best Life", "Mini-bar", "Service aux chambres", "Ascenseur direct"],
  },
  {
    id: "COM-GARAGE-01",
    cadastreNumber: "CAD-BIZ-088",
    name: "Garage & Atelier Mécanique",
    address: "Route 138",
    town: "Portneuf",
    type: "commercial",
    marketPrice: 420000,
    salePrice: 440000,
    status: "for_sale",
    owner: { id: null, name: "Banque Nationale (Reprise)" },
    tenant: { id: null, name: null },
    security: {
      isLocked: true,
      pinCode: "9999",
      keyHolders: [],
      alarmInstalled: true,
      alarmTriggered: false,
    },
    utilities: {
      heatType: "central",
      waterType: "municipal",
      hydroConnected: true,
      structuralIntegrity: 90,
    },
    location: { x: -350, y: 4.2, z: 12, interiorKind: "boutique" },
    features: ["Ponts élévateurs", "Compresseur industriel", "Bureau d'accueil", "Parking clients"],
  },
];

// ═══════════════════════════════════════════════════════════
// HANDLERS SERVEUR
// ═══════════════════════════════════════════════════════════

async function handleServerRequest({ request }: { request: Request }): Promise<Response> {
  const url = new URL(request.url);
  const method = request.method.toUpperCase();

  const headers = {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Admin-Role, X-Actor-Id, X-Actor-Name",
  };

  if (method === "OPTIONS") {
    return new Response(null, { status: 204, headers });
  }

  try {
    // ── 1. GET : CONSULTATION DU REGISTRE, RECHERCHE, STATS & EXPORT ──
    if (method === "GET") {
      const isStats = url.searchParams.get("stats") === "true";
      const exportFormat = url.searchParams.get("export");
      const targetId = url.searchParams.get("id");

      const townFilter = url.searchParams.get("town")?.toLowerCase();
      const typeFilter = url.searchParams.get("type")?.toLowerCase() as PropertyType | undefined;
      const statusFilter = url.searchParams.get("status")?.toLowerCase() as ListingStatus | undefined;
      const ownerIdFilter = url.searchParams.get("ownerId");
      const maxPrice = parseInt(url.searchParams.get("maxPrice") || "0", 10);
      const search = url.searchParams.get("search")?.toLowerCase();

      // Consultation d'une propriété précise
      if (targetId) {
        const prop = inMemoryProperties.find((p) => p.id.toLowerCase() === targetId.toLowerCase());
        if (!prop) {
          return new Response(JSON.stringify({ ok: false, error: "property_not_found" }), { status: 404, headers });
        }
        return new Response(JSON.stringify({ ok: true, property: prop }), { status: 200, headers });
      }

      // Statistiques du marché immobilier
      if (isStats) {
        const totalVal = inMemoryProperties.reduce((acc, p) => acc + p.marketPrice, 0);
        const owned = inMemoryProperties.filter((p) => p.owner.id !== null).length;
        const total = inMemoryProperties.length;

        const stats: RealEstateMarketStats = {
          totalPropertiesCount: total,
          ownedCount: owned,
          forSaleCount: inMemoryProperties.filter((p) => p.status === "for_sale").length,
          forRentCount: inMemoryProperties.filter((p) => p.status === "for_rent").length,
          averageHousePrice: Math.round(totalVal / (total || 1)),
          totalMarketValuation: totalVal,
          occupancyRatePct: Math.round((owned / (total || 1)) * 100),
          monthlyTotalRentalVolume: inMemoryProperties.reduce((acc, p) => acc + (p.monthlyRent || 0), 0),
        };

        return new Response(JSON.stringify({ ok: true, data: stats, timestamp: Date.now() }), { status: 200, headers });
      }

      // Export CSV
      if (exportFormat === "csv") {
        const csvRows = [
          ["ID", "Cadastre", "Nom", "Adresse", "Ville", "Type", "Prix Vente", "Loyer", "Statut", "Proprietaire", "Locataire"].join(";"),
          ...inMemoryProperties.map((p) => [
            p.id,
            p.cadastreNumber,
            `"${p.name.replace(/"/g, '""')}"`,
            `"${p.address.replace(/"/g, '""')}"`,
            p.town,
            p.type,
            p.salePrice || p.marketPrice,
            p.monthlyRent || 0,
            p.status,
            `"${(p.owner.name || "A Vendre").replace(/"/g, '""')}"`,
            `"${(p.tenant.name || "Vacant").replace(/"/g, '""')}"`,
          ].join(";")),
        ];

        return new Response(csvRows.join("\r\n"), {
          status: 200,
          headers: {
            "Content-Type": "text/csv; charset=utf-8",
            "Content-Disposition": `attachment; filename="registre_foncier_portneuf_${new Date().toISOString().slice(0, 10)}.csv"`,
          },
        });
      }

      // Filtrage du catalogue
      let list = [...inMemoryProperties];

      if (townFilter) list = list.filter((p) => p.town.toLowerCase() === townFilter);
      if (typeFilter) list = list.filter((p) => p.type === typeFilter);
      if (statusFilter) list = list.filter((p) => p.status === statusFilter);
      if (ownerIdFilter) list = list.filter((p) => p.owner.id === ownerIdFilter || p.security.keyHolders.includes(ownerIdFilter));
      if (maxPrice > 0) list = list.filter((p) => (p.salePrice || p.marketPrice) <= maxPrice);

      if (search) {
        list = list.filter(
          (p) =>
            p.name.toLowerCase().includes(search) ||
            p.address.toLowerCase().includes(search) ||
            p.town.toLowerCase().includes(search) ||
            p.id.toLowerCase().includes(search)
        );
      }

      return new Response(
        JSON.stringify({
          ok: true,
          totalListings: list.length,
          properties: list,
          serverTimestamp: Date.now(),
        }),
        { status: 200, headers }
      );
    }

    // ── 2. POST : TRANSACTIONS IMMOBILIÈRES (ACHAT, BAIL, SERRURES, CLÉS) ──
    if (method === "POST") {
      let body: any = {};
      try {
        body = await request.json();
      } catch {
        return new Response(JSON.stringify({ ok: false, error: "invalid_json" }), { status: 400, headers });
      }

      const { action, propertyId } = body;
      const actorId = request.headers.get("X-Actor-Id") || body.actorId;
      const actorName = request.headers.get("X-Actor-Name") || body.actorName || "Citoyen";

      if (!action || !propertyId) {
        return new Response(JSON.stringify({ ok: false, error: "missing_action_or_property_id" }), { status: 400, headers });
      }

      const prop = inMemoryProperties.find((p) => p.id === propertyId);
      if (!prop) {
        return new Response(JSON.stringify({ ok: false, error: "property_not_found" }), { status: 404, headers });
      }

      const nowTs = Date.now();

      switch (action) {
        // ── A. ACHAT NOTARIÉ D'UNE PROPRIÉTÉ ──
        case "buy_property": {
          const finalPrice = prop.salePrice || prop.marketPrice;
          const welcomeTax = Math.round(finalPrice * 0.015); // Taxe de bienvenue 1.5%

          prop.owner = {
            id: actorId,
            name: actorName,
            purchasedAt: nowTs,
            purchasePrice: finalPrice,
          };
          prop.status = "owned";
          prop.salePrice = undefined;
          if (!prop.security.keyHolders.includes(actorId)) {
            prop.security.keyHolders.push(actorId);
          }

          return new Response(
            JSON.stringify({
              ok: true,
              message: `Félicitations ! Vous êtes le nouveau propriétaire notarié de [${prop.name}] (${finalPrice}\u00a0$ + ${welcomeTax}\u00a0$ taxe de bienvenue).`,
              property: prop,
              welcomeTax,
            }),
            { status: 200, headers }
          );
        }

        // ── B. SIGNATURE D'UN BAIL LOCATIF (TAL) ──
        case "sign_lease": {
          const rent = prop.monthlyRent || Math.round(prop.marketPrice * 0.005);

          prop.tenant = {
            id: actorId,
            name: actorName,
            leaseSignedAt: nowTs,
            monthlyRentDue: rent,
          };
          prop.status = "owned";
          if (!prop.security.keyHolders.includes(actorId)) {
            prop.security.keyHolders.push(actorId);
          }

          return new Response(
            JSON.stringify({
              ok: true,
              message: `Bail locatif enregistré au TAL pour [${prop.name}] à ${rent}\u00a0$/mois. Clés remises au locataire.`,
              property: prop,
            }),
            { status: 200, headers }
          );
        }

        // ── C. MISE EN VENTE / LOCATION SUR CENTRIS MLS ──
        case "list_property": {
          const { listType = "sale", price } = body;
          const numPrice = Math.max(100, parseInt(price, 10));

          if (listType === "sale") {
            prop.status = "for_sale";
            prop.salePrice = numPrice;
          } else {
            prop.status = "for_rent";
            prop.monthlyRent = numPrice;
          }

          return new Response(
            JSON.stringify({
              ok: true,
              message: `Propriété [${prop.name}] inscrite sur Centris MLS en ${listType === "sale" ? "vente" : "location"} à ${numPrice}\u00a0$.`,
              property: prop,
            }),
            { status: 200, headers }
          );
        }

        // ── D. VEROUILLAGE / DÉVERROUILLAGE & PIN ──
        case "toggle_lock": {
          prop.security.isLocked = !prop.security.isLocked;
          return new Response(
            JSON.stringify({
              ok: true,
              message: `Porte de [${prop.name}] maintenant ${prop.security.isLocked ? "verrouillée 🔒" : "déverrouillée 🔓"}.`,
              isLocked: prop.security.isLocked,
            }),
            { status: 200, headers }
          );
        }

        case "set_pin": {
          const { pin } = body;
          if (!pin || String(pin).length < 4) {
            return new Response(JSON.stringify({ ok: false, error: "invalid_pin_length" }), { status: 400, headers });
          }
          prop.security.pinCode = String(pin).trim();
          return new Response(
            JSON.stringify({
              ok: true,
              message: `Code NIP de la serrure mis à jour avec succès.`,
              pinCode: prop.security.pinCode,
            }),
            { status: 200, headers }
          );
        }

        // ── E. DOUBLE DES CLÉS (KEYHOLDERS) ──
        case "grant_keys": {
          const { targetId } = body;
          if (!targetId) {
            return new Response(JSON.stringify({ ok: false, error: "missing_target_id" }), { status: 400, headers });
          }
          if (!prop.security.keyHolders.includes(targetId)) {
            prop.security.keyHolders.push(targetId);
          }
          return new Response(
            JSON.stringify({
              ok: true,
              message: `Double des clés accordé au citoyen [${targetId}].`,
              keyHolders: prop.security.keyHolders,
            }),
            { status: 200, headers }
          );
        }

        case "revoke_keys": {
          const { targetId } = body;
          prop.security.keyHolders = prop.security.keyHolders.filter((id) => id !== targetId);
          return new Response(
            JSON.stringify({
              ok: true,
              message: `Clés révoquées pour [${targetId}].`,
              keyHolders: prop.security.keyHolders,
            }),
            { status: 200, headers }
          );
        }

        // ── F. RÉNOVATIONS & AMÉNAGEMENTS ──
        case "renovate_property": {
          const { upgradeType } = body;
          if (upgradeType === "alarm") {
            prop.security.alarmInstalled = true;
            prop.features.push("Système d'alarme ADT");
          } else if (upgradeType === "heat_pump") {
            prop.utilities.heatType = "thermopompe";
            prop.features.push("Thermopompe LogisVert 2026");
          } else if (upgradeType === "repair") {
            prop.utilities.structuralIntegrity = 100;
          }

          return new Response(
            JSON.stringify({
              ok: true,
              message: `Rénovation [${upgradeType}] complétée sur [${prop.name}].`,
              property: prop,
            }),
            { status: 200, headers }
          );
        }

        default:
          return new Response(JSON.stringify({ ok: false, error: "unknown_action" }), { status: 400, headers });
      }
    }

    // ── 3. DELETE : SAISIE FORCÉE / EXPROPRIATION / RETRAIT DU MARCHÉ ──
    if (method === "DELETE") {
      const propId = url.searchParams.get("id");
      if (!propId) {
        return new Response(JSON.stringify({ ok: false, error: "missing_property_id" }), { status: 400, headers });
      }

      const prop = inMemoryProperties.find((p) => p.id === propId);
      if (!prop) {
        return new Response(JSON.stringify({ ok: false, error: "property_not_found" }), { status: 404, headers });
      }

      prop.owner = { id: null, name: "Ville de Portneuf (Expropriation)" };
      prop.tenant = { id: null, name: null };
      prop.status = "for_sale";
      prop.security.keyHolders = [];
      prop.security.isLocked = true;

      return new Response(
        JSON.stringify({
          ok: true,
          message: `Propriété [${prop.name}] reprise et remise sur le marché municipal.`,
          property: prop,
        }),
        { status: 200, headers }
      );
    }

    return new Response(JSON.stringify({ ok: false, error: "method_not_allowed" }), { status: 405, headers });

  } catch (err) {
    return new Response(
      JSON.stringify({
        ok: false,
        error: "internal_server_error",
        message: err instanceof Error ? err.message : String(err),
      }),
      { status: 500, headers }
    );
  }
}

// ═══════════════════════════════════════════════════════════
// ROUTEUR TANSTACK
// ═══════════════════════════════════════════════════════════

export const Route = createFileRoute("/api/rp/properties")({
  server: {
    handlers: {
      GET: handleServerRequest,
      POST: handleServerRequest,
      DELETE: handleServerRequest,
      OPTIONS: handleServerRequest,
    },
  },
});