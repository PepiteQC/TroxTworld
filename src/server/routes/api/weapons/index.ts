/**
 * ═══════════════════════════════════════════════════════════════════
 * 🔫 TROXTWORLD / ETHERWORLD — CATALOGUE D'ARMES & MUNITIONS (/api/weapons/)
 * ═══════════════════════════════════════════════════════════════════
 * 
 * Armurerie Légale & Marché Clandestin du Comté de Portneuf :
 *  - 📜 Armes certifiées SIAF / Permis PPA (Chasse, Sport, Police)
 *  - ☠️ Marché Noir & Contrebande (Armes prohibées, numéros meulés)
 *  - 📦 Boîtes de Munitions, Chargeurs & Calibres
 *  - 🔭 Accessoires Tactiques (Viseurs, Silencieux, Lampes)
 * ═══════════════════════════════════════════════════════════════════
 */

import { createFileRoute } from "@tanstack/react-router";
import { handleRpRest } from "@/server/rpRest.server";

export type GunClass = "handgun" | "shotgun" | "rifle" | "smg" | "sniper" | "melee" | "less_lethal";
export type LegalCategory = "non_restricted" | "restricted" | "prohibited";

export interface WeaponCatalogItem {
  id: string;
  name: string;
  classification: GunClass;
  caliber: string;
  legalCategory: LegalCategory;
  legalCategoryLabel: string;
  requiredPermits: string[];
  isProhibited: boolean;
  legalForHunting: boolean;
  legalPrice: number;
  blackMarketPrice: number;
  weightKg: number;
  magCapacity: number;
  damageRating: number; // 1 à 100
  rangeRating: number;  // 1 à 100
  accuracyRating: number;
  availableInStore: boolean;
  blackMarketOnly: boolean;
  description: string;
}

export interface AmmoCatalogItem {
  id: string;
  name: string;
  caliber: string;
  boxQuantity: number;
  pricePerBox: number;
  blackMarketPrice: number;
  weightKg: number;
  compatibleWeapons: string[];
}

export interface AttachmentCatalogItem {
  id: string;
  name: string;
  slot: "muzzle" | "optic" | "underbarrel" | "magazine" | "skin";
  price: number;
  blackMarketPrice: number;
  compatibleWeapons: string[];
  description: string;
}

// ═══════════════════════════════════════════════════════════
// CATALOGUE DE RÉFÉRENCE DES ARMES DU COMTÉ
// ═══════════════════════════════════════════════════════════

const WEAPONS_CATALOG: WeaponCatalogItem[] = [
  // ── PISTOLETS ──
  {
    id: "glock",
    name: "Glock 19 Gen 5",
    classification: "handgun",
    caliber: "9×19mm Parabellum",
    legalCategory: "restricted",
    legalCategoryLabel: "Arme restreinte (Tir sportif / Police)",
    requiredPermits: ["pal_r", "att_transport"],
    isProhibited: false,
    legalForHunting: false,
    legalPrice: 850,
    blackMarketPrice: 2200,
    weightKg: 0.85,
    magCapacity: 15,
    damageRating: 45,
    rangeRating: 35,
    accuracyRating: 80,
    availableInStore: true,
    blackMarketOnly: false,
    description: "Pistolet semi-automatique fiable et léger, arme de service de la Sûreté du Québec.",
  },
  {
    id: "beretta",
    name: "Beretta 92FS Inox",
    classification: "handgun",
    caliber: "9×19mm Parabellum",
    legalCategory: "restricted",
    legalCategoryLabel: "Arme restreinte",
    requiredPermits: ["pal_r", "att_transport"],
    isProhibited: false,
    legalForHunting: false,
    legalPrice: 980,
    blackMarketPrice: 2400,
    weightKg: 0.95,
    magCapacity: 15,
    damageRating: 46,
    rangeRating: 40,
    accuracyRating: 85,
    availableInStore: true,
    blackMarketOnly: false,
    description: "Pistolet italien de précision en acier inoxydable brossé.",
  },
  {
    id: "colt1911",
    name: "Colt M1911 Classic .45",
    classification: "handgun",
    caliber: ".45 ACP",
    legalCategory: "restricted",
    legalCategoryLabel: "Arme restreinte",
    requiredPermits: ["pal_r", "att_transport"],
    isProhibited: false,
    legalForHunting: false,
    legalPrice: 1150,
    blackMarketPrice: 2800,
    weightKg: 1.1,
    magCapacity: 8,
    damageRating: 60,
    rangeRating: 30,
    accuracyRating: 75,
    availableInStore: true,
    blackMarketOnly: false,
    description: "Légende américaine à fort pouvoir d'arrêt chambrée en gros calibre .45 ACP.",
  },

  // ── FUSILS DE CHASSE & TACTIQUES ──
  {
    id: "shotgun",
    name: "Remington 870 Tactical",
    classification: "shotgun",
    caliber: "Calibre 12",
    legalCategory: "non_restricted",
    legalCategoryLabel: "Arme sans restriction (Chasse / Sport)",
    requiredPermits: ["pal"],
    isProhibited: false,
    legalForHunting: true,
    legalPrice: 620,
    blackMarketPrice: 1400,
    weightKg: 3.4,
    magCapacity: 7,
    damageRating: 95,
    rangeRating: 25,
    accuracyRating: 50,
    availableInStore: true,
    blackMarketOnly: false,
    description: "Fusil à pompe à réarmement manuel, arme idéale pour la sécurité et la chasse en forêt.",
  },
  {
    id: "sawed_off",
    name: "Fusil Calibre 12 à Canon Scié",
    classification: "shotgun",
    caliber: "Calibre 12",
    legalCategory: "prohibited",
    legalCategoryLabel: "Arme Prohibée (Canon scié clandestin)",
    requiredPermits: [],
    isProhibited: true,
    legalForHunting: false,
    legalPrice: 0,
    blackMarketPrice: 1800,
    weightKg: 1.8,
    magCapacity: 2,
    damageRating: 100,
    rangeRating: 15,
    accuracyRating: 30,
    availableInStore: false,
    blackMarketOnly: true,
    description: "Fusil artisanal scié compact, dissimulable sous un manteau. Extrêmement dangereux.",
  },

  // ── CARABINES & SNIPERS ──
  {
    id: "carabine",
    name: "Tikka T3x Hunter .308",
    classification: "sniper",
    caliber: ".308 Winchester",
    legalCategory: "non_restricted",
    legalCategoryLabel: "Carabine de grande chasse (Sans restriction)",
    requiredPermits: ["pal"],
    isProhibited: false,
    legalForHunting: true,
    legalPrice: 1250,
    blackMarketPrice: 2600,
    weightKg: 3.2,
    magCapacity: 5,
    damageRating: 90,
    rangeRating: 95,
    accuracyRating: 98,
    availableInStore: true,
    blackMarketOnly: false,
    description: "Carabine finlandaise de précision à verrou pour la chasse à l'orignal et au chevreuil.",
  },
  {
    id: "ruger22",
    name: "Ruger 10/22 Carbine",
    classification: "rifle",
    caliber: ".22 Long Rifle",
    legalCategory: "non_restricted",
    legalCategoryLabel: "Carabine petit calibre (Sans restriction)",
    requiredPermits: ["pal"],
    isProhibited: false,
    legalForHunting: true,
    legalPrice: 380,
    blackMarketPrice: 850,
    weightKg: 2.3,
    magCapacity: 10,
    damageRating: 25,
    rangeRating: 50,
    accuracyRating: 88,
    availableInStore: true,
    blackMarketOnly: false,
    description: "Carabine semi-automatique économique pour le tir récréatif et les petits gibiers.",
  },

  // ── FUSILS D'ASSAUT & AUTOMATIQUES (MILITAIRE / MARCHÉ NOIR) ──
  {
    id: "c7",
    name: "Colt Canada C7A2 OTAN",
    classification: "rifle",
    caliber: "5.56×45mm OTAN",
    legalCategory: "prohibited",
    legalCategoryLabel: "Arme Militaire Prohibée",
    requiredPermits: [],
    isProhibited: true,
    legalForHunting: false,
    legalPrice: 0,
    blackMarketPrice: 6500,
    weightKg: 3.3,
    magCapacity: 30,
    damageRating: 70,
    rangeRating: 80,
    accuracyRating: 88,
    availableInStore: false,
    blackMarketOnly: true,
    description: "Fusil d'assaut standard des Forces armées et des unités tactiques du GTI.",
  },
  {
    id: "ak74",
    name: "Kalashnikov AK-74M",
    classification: "rifle",
    caliber: "5.45×39mm",
    legalCategory: "prohibited",
    legalCategoryLabel: "Arme Prohibée (Contrebande)",
    requiredPermits: [],
    isProhibited: true,
    legalForHunting: false,
    legalPrice: 0,
    blackMarketPrice: 5800,
    weightKg: 3.4,
    magCapacity: 30,
    damageRating: 75,
    rangeRating: 75,
    accuracyRating: 78,
    availableInStore: false,
    blackMarketOnly: true,
    description: "Fusil d'assaut robuste importé clandestinement par les réseaux criminels.",
  },
  {
    id: "mp5",
    name: "Heckler & Koch MP5A3",
    classification: "smg",
    caliber: "9×19mm Parabellum",
    legalCategory: "prohibited",
    legalCategoryLabel: "Pistolet mitrailleur prohibé",
    requiredPermits: [],
    isProhibited: true,
    legalForHunting: false,
    legalPrice: 0,
    blackMarketPrice: 4900,
    weightKg: 2.8,
    magCapacity: 30,
    damageRating: 55,
    rangeRating: 55,
    accuracyRating: 92,
    availableInStore: false,
    blackMarketOnly: true,
    description: "Pistolet mitrailleur ultra-compact à cadence de tir très élevée et recul maîtrisé.",
  },

  // ── MATÉRIEL NON-LÉTAL & POLICE ──
  {
    id: "taser",
    name: "Axon Taser X26P",
    classification: "less_lethal",
    caliber: "Dards 50 000V",
    legalCategory: "prohibited",
    legalCategoryLabel: "Équipement réservé Police",
    requiredPermits: [],
    isProhibited: true,
    legalForHunting: false,
    legalPrice: 1400,
    blackMarketPrice: 3200,
    weightKg: 0.45,
    magCapacity: 1,
    damageRating: 15,
    rangeRating: 10,
    accuracyRating: 90,
    availableInStore: false,
    blackMarketOnly: false,
    description: "Arme à impulsion électrique pour neutralisation immédiate non létale.",
  },
  {
    id: "baton_police",
    name: "Bâton Télescopique ASP 21\"",
    classification: "melee",
    caliber: "Corps à corps",
    legalCategory: "non_restricted",
    legalCategoryLabel: "Arme blanche / Outil",
    requiredPermits: [],
    isProhibited: false,
    legalForHunting: false,
    legalPrice: 85,
    blackMarketPrice: 160,
    weightKg: 0.5,
    magCapacity: 0,
    damageRating: 30,
    rangeRating: 5,
    accuracyRating: 100,
    availableInStore: true,
    blackMarketOnly: false,
    description: "Bâton en acier trempé pliable pour autodéfense et maintien de l'ordre.",
  },
  {
    id: "hache",
    name: "Hache de Bûcheron Forgée",
    classification: "melee",
    caliber: "Corps à corps",
    legalCategory: "non_restricted",
    legalCategoryLabel: "Outil de coupe forestière",
    requiredPermits: [],
    isProhibited: false,
    legalForHunting: false,
    legalPrice: 65,
    blackMarketPrice: 90,
    weightKg: 1.8,
    magCapacity: 0,
    damageRating: 50,
    rangeRating: 5,
    accuracyRating: 100,
    availableInStore: true,
    blackMarketOnly: false,
    description: "Hache en acier forgé et manche en hickory pour le bûcheronnage et le combat.",
  },
];

const AMMO_CATALOG: AmmoCatalogItem[] = [
  { id: "ammo_9mm", name: "Boîte 9×19mm Parabellum (50)", caliber: "9×19mm", boxQuantity: 50, pricePerBox: 32, blackMarketPrice: 90, weightKg: 0.6, compatibleWeapons: ["glock", "beretta", "mp5"] },
  { id: "ammo_45acp", name: "Boîte .45 ACP FMJ (50)", caliber: ".45 ACP", boxQuantity: 50, pricePerBox: 45, blackMarketPrice: 120, weightKg: 0.9, compatibleWeapons: ["colt1911"] },
  { id: "ammo_12ga", name: "Boîte Calibre 12 00-Buck (25)", caliber: "12 Gauge", boxQuantity: 25, pricePerBox: 38, blackMarketPrice: 95, weightKg: 1.1, compatibleWeapons: ["shotgun", "sawed_off"] },
  { id: "ammo_556", name: "Boîte 5.56×45mm OTAN (100)", caliber: "5.56mm", boxQuantity: 100, pricePerBox: 85, blackMarketPrice: 240, weightKg: 1.3, compatibleWeapons: ["c7"] },
  { id: "ammo_308", name: "Boîte .308 Win Chasse (20)", caliber: ".308 Win", boxQuantity: 20, pricePerBox: 55, blackMarketPrice: 140, weightKg: 0.8, compatibleWeapons: ["carabine"] },
  { id: "ammo_22lr", name: "Brique .22 LR (500)", caliber: ".22 LR", boxQuantity: 500, pricePerBox: 48, blackMarketPrice: 95, weightKg: 1.7, compatibleWeapons: ["ruger22"] },
  { id: "ammo_taser", name: "Cartouches Taser X26P (2)", caliber: "Dards", boxQuantity: 2, pricePerBox: 65, blackMarketPrice: 150, weightKg: 0.1, compatibleWeapons: ["taser"] },
];

const ATTACHMENTS_CATALOG: AttachmentCatalogItem[] = [
  { id: "silencer_pistol", name: "Silencieux Pistolet 9mm", slot: "muzzle", price: 420, blackMarketPrice: 950, compatibleWeapons: ["glock", "beretta"], description: "Atténue les détonations et supprime le flash." },
  { id: "silencer_rifle", name: "Silencieux Tactique 5.56 / 7.62", slot: "muzzle", price: 680, blackMarketPrice: 1500, compatibleWeapons: ["c7", "ak74", "carabine"], description: "Silencieux militaire à absorption thermique." },
  { id: "scope_8x", name: "Lunette de Précision Leupold 8x", slot: "optic", price: 540, blackMarketPrice: 900, compatibleWeapons: ["carabine", "c7"], description: "Grossissement optique haute définition." },
  { id: "red_dot", name: "Point Rouge Holographique", slot: "optic", price: 280, blackMarketPrice: 500, compatibleWeapons: ["glock", "shotgun", "c7", "ak74", "mp5"], description: "Acquisition de cible ultra-rapide." },
  { id: "flashlight", name: "Lampe Tactique LED 1000 Lumens", slot: "underbarrel", price: 120, blackMarketPrice: 220, compatibleWeapons: ["glock", "shotgun", "c7"], description: "Éclairage puissant pour les interventions nocturnes." },
  { id: "ext_mag", name: "Chargeur Haute Capacité", slot: "magazine", price: 95, blackMarketPrice: 350, compatibleWeapons: ["glock", "c7", "ak74", "mp5"], description: "Augmente la capacité de munitions." },
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
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Admin-Role, X-Actor-Id",
  };

  if (method === "OPTIONS") {
    return new Response(null, { status: 204, headers });
  }

  try {
    // ── 1. GET : CONSULTATION DU CATALOGUE (ARMES, MUNITIONS, ACCESSOIRES) ──
    if (method === "GET") {
      const type = url.searchParams.get("type") || "weapons"; // "weapons" | "ammo" | "attachments" | "all"
      const market = url.searchParams.get("market"); // "legal" | "black_market"
      const categoryFilter = url.searchParams.get("category")?.toLowerCase() as GunClass | undefined;
      const legalFilter = url.searchParams.get("legal") as LegalCategory | undefined;
      const huntingOnly = url.searchParams.get("hunting") === "true";
      const maxPrice = parseInt(url.searchParams.get("maxPrice") || "0", 10);
      const search = url.searchParams.get("search")?.toLowerCase();
      const exportFormat = url.searchParams.get("export");

      // ── Export CSV du catalogue d'armes ──
      if (exportFormat === "csv") {
        const rows = [
          ["ID", "Nom", "Classe", "Calibre", "Legalite", "Prix Legal", "Prix Noir", "Capacite", "Chasse"].join(";"),
          ...WEAPONS_CATALOG.map((w) => [
            w.id,
            `"${w.name.replace(/"/g, '""')}"`,
            w.classification,
            w.caliber,
            w.legalCategory,
            w.legalPrice,
            w.blackMarketPrice,
            w.magCapacity,
            w.legalForHunting ? "OUI" : "NON",
          ].join(";")),
        ];

        return new Response(rows.join("\r\n"), {
          status: 200,
          headers: {
            "Content-Type": "text/csv; charset=utf-8",
            "Content-Disposition": `attachment; filename="catalogue_armes_portneuf_${new Date().toISOString().slice(0, 10)}.csv"`,
          },
        });
      }

      // ── Sous-catalogues Munitions & Accessoires ──
      if (type === "ammo") {
        return new Response(JSON.stringify({ ok: true, total: AMMO_CATALOG.length, ammo: AMMO_CATALOG }), { status: 200, headers });
      }

      if (type === "attachments") {
        return new Response(JSON.stringify({ ok: true, total: ATTACHMENTS_CATALOG.length, attachments: ATTACHMENTS_CATALOG }), { status: 200, headers });
      }

      // ── Filtrage du catalogue d'armes ──
      let weapons = [...WEAPONS_CATALOG];

      if (market === "legal") {
        weapons = weapons.filter((w) => w.availableInStore && !w.blackMarketOnly);
      } else if (market === "black_market") {
        weapons = weapons.filter((w) => w.blackMarketOnly || w.isProhibited || w.blackMarketPrice > 0);
      }

      if (categoryFilter) weapons = weapons.filter((w) => w.classification === categoryFilter);
      if (legalFilter) weapons = weapons.filter((w) => w.legalCategory === legalFilter);
      if (huntingOnly) weapons = weapons.filter((w) => w.legalForHunting);
      if (maxPrice > 0) {
        weapons = weapons.filter((w) => (market === "black_market" ? w.blackMarketPrice : w.legalPrice) <= maxPrice);
      }

      if (search) {
        weapons = weapons.filter((w) =>
          w.name.toLowerCase().includes(search) ||
          w.caliber.toLowerCase().includes(search) ||
          w.description.toLowerCase().includes(search)
        );
      }

      return new Response(
        JSON.stringify({
          ok: true,
          total: weapons.length,
          marketMode: market || "all",
          weapons,
          ammoCount: AMMO_CATALOG.length,
          attachmentsCount: ATTACHMENTS_CATALOG.length,
          serverTimestamp: Date.now(),
        }),
        { status: 200, headers }
      );
    }

    // ── 2. POST : ACHAT, COMMANDE OU ENREGISTREMENT D'ARME ──
    if (method === "POST") {
      let body: any = {};
      try {
        body = await request.json();
      } catch {
        return new Response(JSON.stringify({ ok: false, error: "invalid_json" }), { status: 400, headers });
      }

      const { action, weaponId, buyerId, buyerPermits = [], isBlackMarket = false } = body;

      if (!action || !weaponId) {
        return new Response(JSON.stringify({ ok: false, error: "missing_action_or_weapon_id" }), { status: 400, headers });
      }

      const weapon = WEAPONS_CATALOG.find((w) => w.id === weaponId);
      if (!weapon) {
        return new Response(JSON.stringify({ ok: false, error: "weapon_not_found" }), { status: 404, headers });
      }

      const nowTs = Date.now();

      switch (action) {
        // Achat en magasin légal avec vérification de permis PPA
        case "buy_weapon": {
          if (!isBlackMarket) {
            // Vérification des permis québécois requis
            const hasRequiredPermits = weapon.requiredPermits.every((p) => buyerPermits.includes(p));
            if (!hasRequiredPermits && weapon.requiredPermits.length > 0) {
              return new Response(
                JSON.stringify({
                  ok: false,
                  error: "missing_permits",
                  message: `Achat refusé : Permis requis manquant (${weapon.requiredPermits.join(", ")}).`,
                  requiredPermits: weapon.requiredPermits,
                }),
                { status: 403, headers }
              );
            }
          }

          const price = isBlackMarket ? weapon.blackMarketPrice : weapon.legalPrice;
          const tax = isBlackMarket ? 0 : Math.round(price * 0.14975); // TPS + TVQ 14.975%
          const siafNumber = isBlackMarket ? `DEFACED-${Math.random().toString(36).substring(2, 8).toUpperCase()}` : `SIAF-QC-${Math.floor(100000 + Math.random() * 900000)}`;

          return new Response(
            JSON.stringify({
              ok: true,
              message: `Achat de [${weapon.name}] complété (${price}\u00a0$ ${tax > 0 ? `+ ${tax}$ taxes` : ""}).`,
              weaponReceipt: {
                weaponId: weapon.id,
                name: weapon.name,
                serialNumber: siafNumber,
                isRegisteredSIAF: !isBlackMarket,
                purchasedAt: nowTs,
                totalPaid: price + tax,
                buyerId: buyerId || "client_anonyme",
              },
            }),
            { status: 201, headers }
          );
        }

        default:
          return new Response(JSON.stringify({ ok: false, error: "unknown_action" }), { status: 400, headers });
      }
    }

    return new Response(JSON.stringify({ ok: false, error: "method_not_allowed" }), { status: 405, headers });

  } catch (err) {
    return new Response(
      JSON.stringify({
        error: "internal_server_error",
        message: err instanceof Error ? err.message : String(err),
      }),
      {
        status: 500,
        headers,
      }
    );
  }
}

// ═══════════════════════════════════════════════════════════
// ROUTEUR TANSTACK
// ═══════════════════════════════════════════════════════════

export const Route = createFileRoute("/api/weapons/")({
  server: {
    handlers: {
      GET: handleServerRequest,
      POST: handleServerRequest,
      OPTIONS: handleServerRequest,
    },
  },
});