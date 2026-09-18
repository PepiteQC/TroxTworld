/**
 * ═══════════════════════════════════════════════════════════════════
 * 🔫 TROXTWORLD / ETHERWORLD — API BALISTIQUE & ARMES (/api/weapons/$id)
 * ═══════════════════════════════════════════════════════════════════
 * 
 * Fiche Technique, Balistique & Registre SIAF / PPA du Québec :
 *  - 🎯 Balistique (Dégâts, Vélocité m/s, Pénétration de blindage, Recul)
 *  - 📜 Classification PPA (Sans restriction, Restreinte, Prohibée)
 *  - 🔍 Numéro de série & Enregistrement SIAF (Intact vs Meulé/Limé)
 *  - 🔧 Accessoires (Silencieux, Viseurs, Lampes, Chargeurs étendus)
 *  - 🧹 Durabilité, Encrassement carbone & Déblocage d'enrayage
 * ═══════════════════════════════════════════════════════════════════
 */

import { createFileRoute } from "@tanstack/react-router";
import { handleRpRest } from "@/server/rpRest.server";

export type GunClass = "handgun" | "shotgun" | "rifle" | "smg" | "sniper" | "melee" | "less_lethal";
export type LegalCategory = "non_restricted" | "restricted" | "prohibited";
export type SerialStatus = "intact" | "defaced" | "scratched" | "military_unregistered";

export interface WeaponAttachment {
  id: string;
  name: string;
  slot: "muzzle" | "optic" | "underbarrel" | "magazine" | "skin";
  installed: boolean;
  bonus: {
    damageMultiplier?: number;
    rangeMeters?: number;
    recoilReductionPct?: number;
    silenced?: boolean;
    magCapacityAdd?: number;
  };
}

export interface WeaponTechSpec {
  id: string;
  name: string;
  modelCode: string;
  classification: GunClass;
  caliber: string;
  magazineCapacity: number;
  fireRateRpm: number;
  muzzleVelocityMs: number;
  effectiveRangeMeters: number;
  
  // Balistique & Dégâts
  damage: {
    headshot: number;
    torso: number;
    limbs: number;
    armorPenetrationPct: number;
  };
  
  // Légalité & SIAF Québec
  legal: {
    category: LegalCategory;
    categoryLabel: string;
    requiredPermits: Array<"pal" | "pal_r" | "att_transport" | "siaf_cert">;
    isProhibited: boolean;
    legalForHunting: boolean;
  };

  // État de l'arme
  durability: number;        // 0 à 100%
  carbonBuildup: number;     // 0 (neuf) à 100% (très encrassé)
  jamChancePct: number;      // Risque d'enrayage lors du tir
  serialNumber: string;
  serialStatus: SerialStatus;

  // Accessoires compatibles & installés
  attachments: WeaponAttachment[];
  customSkin?: string;
  description: string;
}

// ═══════════════════════════════════════════════════════════
// CATALOGUE DE BALISTIQUE DES ARMES DU COMTÉ
// ═══════════════════════════════════════════════════════════

const WEAPON_DATABASE: Record<string, WeaponTechSpec> = {
  // ── PISTOLETS ──
  glock: {
    id: "glock",
    name: "Glock 19 Gen 5",
    modelCode: "G19-9X19",
    classification: "handgun",
    caliber: "9×19mm Parabellum",
    magazineCapacity: 15,
    fireRateRpm: 450,
    muzzleVelocityMs: 375,
    effectiveRangeMeters: 50,
    damage: { headshot: 85, torso: 34, limbs: 22, armorPenetrationPct: 35 },
    legal: {
      category: "restricted",
      categoryLabel: "Arme à feu à autorisation restreinte",
      requiredPermits: ["pal_r", "att_transport", "siaf_cert"],
      isProhibited: false,
      legalForHunting: false,
    },
    durability: 98,
    carbonBuildup: 12,
    jamChancePct: 1.5,
    serialNumber: "SIAF-QC-884219",
    serialStatus: "intact",
    attachments: [
      { id: "silencer_9mm", name: "Silencieux Osprey 9mm", slot: "muzzle", installed: false, bonus: { silenced: true, recoilReductionPct: 15 } },
      { id: "red_dot", name: "Viseur Point Rouge Trijicon RMR", slot: "optic", installed: true, bonus: { rangeMeters: 10 } },
      { id: "flashlight_tactical", name: "Lampe Tactique Streamlight", slot: "underbarrel", installed: true, bonus: {} },
      { id: "ext_mag_33", name: "Chargeur étendu 33 coups", slot: "magazine", installed: false, bonus: { magCapacityAdd: 18 } },
    ],
    customSkin: "Noir Mat Standard",
    description: "Le pistolet de service par excellence de la Sûreté du Québec. Fiable, léger et précis.",
  },

  beretta: {
    id: "beretta",
    name: "Beretta 92FS Inox",
    modelCode: "B92-INOX",
    classification: "handgun",
    caliber: "9×19mm Parabellum",
    magazineCapacity: 15,
    fireRateRpm: 420,
    muzzleVelocityMs: 381,
    effectiveRangeMeters: 50,
    damage: { headshot: 82, torso: 32, limbs: 20, armorPenetrationPct: 32 },
    legal: {
      category: "restricted",
      categoryLabel: "Arme à feu à autorisation restreinte",
      requiredPermits: ["pal_r", "att_transport", "siaf_cert"],
      isProhibited: false,
      legalForHunting: false,
    },
    durability: 92,
    carbonBuildup: 18,
    jamChancePct: 2.0,
    serialNumber: "SIAF-QC-491022",
    serialStatus: "intact",
    attachments: [
      { id: "skin_wood_grip", name: "Plaquettes en Noyer d'Italie", slot: "skin", installed: true, bonus: {} },
    ],
    customSkin: "Acier Inox Brossé",
    description: "Pistolet italien classique à carcasse en aluminium anodisé et glissière ouverte.",
  },

  // ── FUSILS À POMPE ──
  shotgun: {
    id: "shotgun",
    name: "Remington 870 Tactical",
    modelCode: "R870-12GA",
    classification: "shotgun",
    caliber: "Calibre 12 (00 Buckshot)",
    magazineCapacity: 7,
    fireRateRpm: 75,
    muzzleVelocityMs: 400,
    effectiveRangeMeters: 35,
    damage: { headshot: 180, torso: 110, limbs: 65, armorPenetrationPct: 45 },
    legal: {
      category: "non_restricted",
      categoryLabel: "Arme sans restriction (Chasse / Sport)",
      requiredPermits: ["pal", "siaf_cert"],
      isProhibited: false,
      legalForHunting: true,
    },
    durability: 95,
    carbonBuildup: 25,
    jamChancePct: 0.5,
    serialNumber: "SIAF-QC-119402",
    serialStatus: "intact",
    attachments: [
      { id: "choke_full", name: "Choke Plein Étranglement", slot: "muzzle", installed: true, bonus: { rangeMeters: 15, damageMultiplier: 1.1 } },
      { id: "shell_holder", name: "Porte-Cartouches Latéral (6)", slot: "magazine", installed: true, bonus: {} },
    ],
    customSkin: "Polymère Noir Tactique",
    description: "Fusil à pompe à réarmement manuel indestructible. Dévastateur à courte portée.",
  },

  // ── FUSILS D'ASSAUT & CARABINES ──
  c7: {
    id: "c7",
    name: "Colt Canada C7A2",
    modelCode: "C7A2-556",
    classification: "rifle",
    caliber: "5.56×45mm OTAN",
    magazineCapacity: 30,
    fireRateRpm: 800,
    muzzleVelocityMs: 915,
    effectiveRangeMeters: 400,
    damage: { headshot: 110, torso: 48, limbs: 30, armorPenetrationPct: 65 },
    legal: {
      category: "prohibited",
      categoryLabel: "Arme Prohibée (Usage Forces de l'Ordre / Militaire)",
      requiredPermits: [],
      isProhibited: true,
      legalForHunting: false,
    },
    durability: 96,
    carbonBuildup: 8,
    jamChancePct: 1.0,
    serialNumber: "MIL-CA-948201",
    serialStatus: "military_unregistered",
    attachments: [
      { id: "elcan_c79", name: "Optique Elcan C79 3.4x", slot: "optic", installed: true, bonus: { rangeMeters: 150 } },
      { id: "sup_556", name: "Silencieux SureFire SOCOM", slot: "muzzle", installed: false, bonus: { silenced: true } },
    ],
    customSkin: "Vert Armée Fédéral",
    description: "Carabine d'assaut standard des Forces armées canadiennes et du Groupe d'intervention SQ.",
  },

  ak74: {
    id: "ak74",
    name: "Kalashnikov AK-74M",
    modelCode: "AK-74M",
    classification: "rifle",
    caliber: "5.45×39mm",
    magazineCapacity: 30,
    fireRateRpm: 650,
    muzzleVelocityMs: 900,
    effectiveRangeMeters: 350,
    damage: { headshot: 115, torso: 52, limbs: 32, armorPenetrationPct: 70 },
    legal: {
      category: "prohibited",
      categoryLabel: "Arme Prohibée (Contrebande Clandestine)",
      requiredPermits: [],
      isProhibited: true,
      legalForHunting: false,
    },
    durability: 84,
    carbonBuildup: 45,
    jamChancePct: 1.2,
    serialNumber: "UNKNOWN-DEFACED",
    serialStatus: "defaced",
    attachments: [
      { id: "drum_mag_45", name: "Chargeur Tambour 45 coups", slot: "magazine", installed: true, bonus: { magCapacityAdd: 15 } },
    ],
    customSkin: "Bois Noyer & Acier Est-Européen",
    description: "Fusil de contrebande importé par les Hells Angels. Numéro de série complètement meulé.",
  },

  carabine: {
    id: "carabine",
    name: "Tikka T3x Hunter",
    modelCode: "T3X-308",
    classification: "sniper",
    caliber: ".308 Winchester (7.62×51mm)",
    magazineCapacity: 5,
    fireRateRpm: 40,
    muzzleVelocityMs: 860,
    effectiveRangeMeters: 800,
    damage: { headshot: 200, torso: 135, limbs: 75, armorPenetrationPct: 80 },
    legal: {
      category: "non_restricted",
      categoryLabel: "Carabine de Chasse (Sans restriction)",
      requiredPermits: ["pal", "siaf_cert"],
      isProhibited: false,
      legalForHunting: true,
    },
    durability: 99,
    carbonBuildup: 5,
    jamChancePct: 0.2,
    serialNumber: "SIAF-QC-720194",
    serialStatus: "intact",
    attachments: [
      { id: "scope_leupold_8x", name: "Lunette Leupold VX-3HD 3.5-10x", slot: "optic", installed: true, bonus: { rangeMeters: 400, damageMultiplier: 1.15 } },
      { id: "bipod_harris", name: "Bipied Harris Pivotant", slot: "underbarrel", installed: true, bonus: { recoilReductionPct: 40 } },
    ],
    customSkin: "Crosse en Bois Huilé Fin",
    description: "Carabine de précision à verrou finlandaise. Idéale pour la chasse au gros gibier (orignal).",
  },

  taser: {
    id: "taser",
    name: "Axon Taser X26P",
    modelCode: "X26P-YELLOW",
    classification: "less_lethal",
    caliber: "Cartouches à Dard 50 000 Volts",
    magazineCapacity: 1,
    fireRateRpm: 12,
    muzzleVelocityMs: 55,
    effectiveRangeMeters: 7.6,
    damage: { headshot: 15, torso: 10, limbs: 5, armorPenetrationPct: 10 },
    legal: {
      category: "prohibited",
      categoryLabel: "Arme à Impulsion (Réservée Police SQ)",
      requiredPermits: [],
      isProhibited: true,
      legalForHunting: false,
    },
    durability: 100,
    carbonBuildup: 0,
    jamChancePct: 0.1,
    serialNumber: "SQ-ASSET-0482",
    serialStatus: "military_unregistered",
    attachments: [
      { id: "laser_aim", name: "Double Visée Laser Rouge/Verte", slot: "optic", installed: true, bonus: {} },
    ],
    customSkin: "Jaune Sécurité Haute Visibilité",
    description: "Arme intermédiaire à impulsions électriques. Neutralise instantanément la cible par paralysie neuromusculaire.",
  },
};

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
    // Extraction sécurisée de l'ID de l'arme
    const pathParts = url.pathname.split("/").filter(Boolean);
    const weaponId = pathParts[pathParts.length - 1]?.toLowerCase() || "glock";

    // Recherche de l'arme
    const spec = WEAPON_DATABASE[weaponId] || WEAPON_DATABASE.glock!;

    // ── 1. GET : CONSULTATION DE LA FICHE BALISTIQUE ──
    if (method === "GET") {
      return new Response(
        JSON.stringify({
          ok: true,
          weapon: spec,
          serverTimestamp: Date.now(),
        }),
        { status: 200, headers }
      );
    }

    // ── 2. POST : MODIFICATIONS ARMURERIE & ACTIONS CLANDESTINES ──
    if (method === "POST") {
      let body: any = {};
      try {
        body = await request.json();
      } catch {
        return new Response(JSON.stringify({ ok: false, error: "invalid_json" }), { status: 400, headers });
      }

      const { action, attachmentId, newSerial } = body;

      if (!action) {
        return new Response(JSON.stringify({ ok: false, error: "missing_action" }), { status: 400, headers });
      }

      switch (action) {
        // Nettoyage de l'arme (enlève le carbone et réduit le risque d'enrayage)
        case "clean_weapon": {
          spec.carbonBuildup = 0;
          spec.jamChancePct = 0.2;
          return new Response(
            JSON.stringify({
              ok: true,
              message: `L'arme [${spec.name}] a été soigneusement nettoyée et huilée. Calamine éliminée.`,
              weapon: spec,
            }),
            { status: 200, headers }
          );
        }

        // Meuler / Limer le numéro de série (action clandestine)
        case "deface_serial": {
          spec.serialNumber = `DEFACED-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
          spec.serialStatus = "defaced";
          spec.legal.isProhibited = true;
          spec.legal.category = "prohibited";
          spec.legal.categoryLabel = "Arme Prohibée (Numéro de série meulé illégalement)";

          return new Response(
            JSON.stringify({
              ok: true,
              message: `Le numéro de série de [${spec.name}] a été meulé à la meuleuse. L'arme est désormais intraçable mais hautement illégale.`,
              weapon: spec,
            }),
            { status: 200, headers }
          );
        }

        // Enregistrer au registre officiel SIAF de la SQ
        case "register_siaf": {
          const siafNumber = newSerial || `SIAF-QC-${Math.floor(100000 + Math.random() * 900000)}`;
          spec.serialNumber = siafNumber;
          spec.serialStatus = "intact";

          return new Response(
            JSON.stringify({
              ok: true,
              message: `Arme [${spec.name}] enregistrée avec succès au Service d'immatriculation des armes à feu (SIAF : ${siafNumber}).`,
              weapon: spec,
            }),
            { status: 200, headers }
          );
        }

        // Installer / Retirer un accessoire
        case "toggle_attachment": {
          const att = spec.attachments.find((a) => a.id === attachmentId);
          if (!att) {
            return new Response(JSON.stringify({ ok: false, error: "attachment_not_found" }), { status: 404, headers });
          }

          att.installed = !att.installed;

          return new Response(
            JSON.stringify({
              ok: true,
              message: `Accessoire [${att.name}] ${att.installed ? "installé" : "retiré"}.`,
              attachment: att,
              weapon: spec,
            }),
            { status: 200, headers }
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

export const Route = createFileRoute("/api/weapons/$id")({
  server: {
    handlers: {
      GET: handleServerRequest,
      POST: handleServerRequest,
      OPTIONS: handleServerRequest,
    },
  },
});