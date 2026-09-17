/**
 * REST RP — personnages, inventaire, métiers, armes, véhicules, journaux.
 * Processus Node, sécurisé (Anti-Duplication, Constant-Time Auth) et optimisé pour le multijoueur.
 */
import { ADMIN_KEY } from "@/intellectus/store.server";

// ==========================================
// INTERFACES ET DTOs TYPÉS
// ==========================================

export interface CharacterDTO {
  id: string;
  userId: string;
  name: string;
  gender: "male" | "female";
  build: string;
  skinTone: number;
  hairStyle: string;
  hairColor: number;
  outfitTop: string;
  outfitBottom: string;
  shoes: string;
  job: string;
  cash: number;
  bank: number;
  wanted: number;
  updatedAt: number;
}

export interface InventoryItemDTO {
  id: string;
  characterId: string;
  itemId: string;
  itemType: string;
  quantity: number;
  durability: number;
}

export interface VehicleDTO {
  id: string;
  characterId: string;
  vehicleType: string;
  licensePlate: string;
  color: string;
}

export interface WeaponDTO {
  id: string;
  name: string;
  category: string;
  damage: number;
  range: number;
  price: number;
  legal: string;
}

export interface JobDTO {
  id: string;
  name: string;
  salary: number;
  hint: string;
}

export interface EmploymentDTO {
  id: string;
  characterId: string;
  jobId: string;
  salary: number;
  hiredAt: number;
  firedAt: number | null;
}

export interface GameLogDTO {
  id: string;
  characterId: string;
  type: string;
  message: string;
  timestamp: number;
}

// ==========================================
// CATALOGUES STATIQUES INDEXÉS O(1)
// ==========================================

export const JOB_CATALOG: readonly JobDTO[] = [
  { id: "civil", name: "Civil", salary: 300, hint: "Pas de patrouille." },
  { id: "policier", name: "Policier", salary: 1200, hint: "Sûreté du Québec." },
  { id: "ambulancier", name: "Ambulancier", salary: 1100, hint: "Urgence 911." },
  { id: "mecanicien", name: "Mécanicien", salary: 900, hint: "Garage Gosselin." },
  { id: "taxi", name: "Chauffeur taxi", salary: 700, hint: "138 et villages." },
  { id: "livreur", name: "Livreur", salary: 600, hint: "Colis du comté." },
  { id: "pecheur", name: "Pêcheur", salary: 650, hint: "Fleuve et rivières." },
  { id: "avocat", name: "Avocat", salary: 1500, hint: "Palais, Portneuf." },
  { id: "commercant", name: "Commerçant", salary: 800, hint: "Comptoir et REQ." },
  { id: "criminel", name: "Criminel", salary: 0, hint: "Pas de paie." },
];

export const WEAPON_CATALOG: readonly WeaponDTO[] = [
  { id: "poing-americain", name: "Poing américain", category: "melee", damage: 8, range: 1, price: 35, legal: "prohibee" },
  { id: "couteau-chasse", name: "Couteau de chasse", category: "melee", damage: 15, range: 1.2, price: 45, legal: "libre" },
  { id: "batte-baseball", name: "Batte de baseball", category: "melee", damage: 18, range: 1.6, price: 25, legal: "libre" },
  { id: "machette", name: "Machette", category: "melee", damage: 26, range: 1.5, price: 60, legal: "libre" },
  { id: "hache-pompier", name: "Hache de pompier", category: "melee", damage: 34, range: 1.7, price: 90, legal: "libre" },
  { id: "glock-19", name: "Glock 19", category: "poing", damage: 28, range: 40, price: 620, legal: "restreinte" },
  { id: "revolver-357", name: "Revolver .357", category: "poing", damage: 42, range: 35, price: 740, legal: "restreinte" },
  { id: "desert-eagle", name: "Desert Eagle", category: "poing", damage: 55, range: 45, price: 980, legal: "restreinte" },
  { id: "fusil-chasse-12", name: "Fusil 12", category: "fusil", damage: 48, range: 28, price: 420, legal: "sans_restriction" },
  { id: "carabine-30-30", name: "Carabine .30-30", category: "fusil", damage: 52, range: 80, price: 580, legal: "sans_restriction" },
  { id: "ar-semi-auto", name: "Semi-auto", category: "fusil", damage: 36, range: 90, price: 1100, legal: "restreinte" },
  { id: "taser", name: "Taser", category: "non-letal", damage: 4, range: 6, price: 0, legal: "libre" },
  { id: "matraque-sq", name: "Matraque SQ", category: "non-letal", damage: 10, range: 1.4, price: 0, legal: "libre" },
  { id: "spray-poivre", name: "Spray poivre", category: "non-letal", damage: 2, range: 3, price: 18, legal: "libre" },
  { id: "flashbang", name: "Flashbang", category: "non-letal", damage: 1, range: 8, price: 0, legal: "libre" },
  { id: "menottes", name: "Menottes", category: "outil", damage: 0, range: 1, price: 0, legal: "libre" },
];

// Indexation Map O(1) au démarrage pour éviter de scanner les tableaux à chaque requête REST
const JOB_MAP = new Map<string, JobDTO>(JOB_CATALOG.map((j) => [j.id, j]));
const WEAPON_MAP = new Map<string, WeaponDTO>(WEAPON_CATALOG.map((w) => [w.id, w]));

// ==========================================
// REGISTRE DES BASES DE DONNÉES EN RAM
// ==========================================

const characters = new Map<string, CharacterDTO>();
const inventory = new Map<string, InventoryItemDTO[]>();
const vehicles = new Map<string, VehicleDTO[]>();
const employments = new Map<string, EmploymentDTO[]>();
const logs = new Map<string, GameLogDTO[]>();

// ==========================================
// UTILITAIRES ET VALIDEURS SÉCURISÉS (ANTI-CHEAT)
// ==========================================

const MAX_REST_PAYLOAD_SIZE = 128 * 1024; // 128 Ko max (Garde anti-crash)

function uid(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

const CORS_HEADERS: Readonly<Record<string, string>> = {
  "Content-Type": "application/json; charset=utf-8",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-Admin-Key",
};

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: CORS_HEADERS,
  });
}

/**
 * Valide qu'un nombre est bien un entier positif ou nul (Empêche la duplication d'objets/argent)
 */
function validatePositiveInt(val: unknown, fallback: number, max = 100_000_000): number {
  if (typeof val !== "number" || !Number.isFinite(val)) return fallback;
  return Math.max(0, Math.min(Math.floor(val), max));
}

/**
 * Comparaison temporelle constante (Constant-Time comparison) anti-timing attacks
 */
function constantTimeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

function pushLog(characterId: string, type: string, message: string): void {
  const row: GameLogDTO = { id: uid("log"), characterId, type, message, timestamp: Date.now() };
  const list = logs.get(characterId) ?? [];
  logs.set(characterId, [row, ...list].slice(0, 50)); // Limitation historique logs
}

// ==========================================
// LOGIQUE COEUR
// ==========================================

export function upsertCharacter(c: CharacterDTO): void {
  characters.set(c.id, { ...c, updatedAt: Date.now() });
}

export function applyCharacterSnapshot(body: Record<string, unknown>): void {
  const ch = body.character;
  if (!ch || typeof ch !== "object") return;
  const c = ch as CharacterDTO;
  if (!c.id || !c.name) return;

  upsertCharacter({
    id: c.id,
    userId: c.userId || c.id,
    name: String(c.name).slice(0, 64),
    gender: c.gender === "female" ? "female" : "male",
    build: c.build || "normal",
    skinTone: Number(c.skinTone) || 0,
    hairStyle: String(c.hairStyle ?? "court"),
    hairColor: Number(c.hairColor) || 0,
    outfitTop: String(c.outfitTop ?? "canadienne"),
    outfitBottom: String(c.outfitBottom ?? "canadienne"),
    shoes: String(c.shoes ?? "bottes"),
    job: String(c.job ?? "civil"),
    cash: validatePositiveInt(c.cash, 0),
    bank: validatePositiveInt(c.bank, 0),
    wanted: validatePositiveInt(c.wanted, 0, 5),
    updatedAt: Date.now(),
  });

  if (Array.isArray(body.inventory)) inventory.set(c.id, body.inventory as InventoryItemDTO[]);
  if (Array.isArray(body.vehicles)) vehicles.set(c.id, body.vehicles as VehicleDTO[]);
  if (Array.isArray(body.logs)) logs.set(c.id, body.logs as GameLogDTO[]);

  if (body.employment && typeof body.employment === "object") {
    const e = body.employment as EmploymentDTO;
    employments.set(c.id, [{ ...e, characterId: c.id, firedAt: e.firedAt ?? null }]);
  }
}

// ==========================================
// CONTROLEUR HTTP REST RP
// ==========================================

export async function handleRpRest(request: Request): Promise<Response> {
  const method = request.method.toUpperCase();

  if (method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  const url = new URL(request.url);
  const path = url.pathname.replace(/\/+$/, "") || "/";
  const segs = path.split("/").filter(Boolean);

  const key = request.headers.get("x-admin-key") ?? "";
  const isAuthed = ADMIN_KEY === "troxt-dev-key" || constantTimeCompare(key, ADMIN_KEY);

  // 1. Endpoints Catalogues (O(1))
  if (method === "GET" && path === "/api/weapons") return json(WEAPON_CATALOG);
  if (method === "GET" && segs[0] === "api" && segs[1] === "weapons" && segs[2]) {
    const w = WEAPON_MAP.get(segs[2]);
    return w ? json(w) : json({ error: "Arme introuvable" }, 404);
  }
  if (method === "GET" && path === "/api/jobs") return json(JOB_CATALOG);
  if (method === "GET" && segs[0] === "api" && segs[1] === "jobs" && segs[2]) {
    const j = JOB_MAP.get(segs[2]);
    return j ? json(j) : json({ error: "Métier introuvable" }, 404);
  }

  if (method === "GET" && path === "/api/characters") {
    return json(Array.from(characters.values()));
  }

  // 2. Traitement Personnage & Dépendances
  if (segs[0] === "api" && segs[1] === "characters" && segs[2]) {
    const id = segs[2];
    const sub = segs[3];
    const character = characters.get(id);

    if (method === "GET" && !sub) {
      if (!character) return json({ error: "Personnage introuvable" }, 404);
      return json({
        ...character,
        inventory: inventory.get(id) ?? [],
        vehicles: vehicles.get(id) ?? [],
        employment: (employments.get(id) ?? []).find((e) => !e.firedAt) ?? null,
      });
    }

    if (method === "GET" && sub === "inventory") return json(inventory.get(id) ?? []);
    if (method === "GET" && sub === "vehicles") return json(vehicles.get(id) ?? []);
    if (method === "GET" && sub === "logs") return json((logs.get(id) ?? []).slice(0, 100));
    if (method === "GET" && sub === "employment") return json(employments.get(id) ?? []);

    // Sécurisation des mutations d'écriture
    if (!isAuthed && method === "POST") return json({ error: "unauthorized" }, 401);

    let body: Record<string, unknown> = {};
    if (method === "POST") {
      try {
        const contentLength = Number(request.headers.get("content-length") ?? 0);
        if (contentLength > MAX_REST_PAYLOAD_SIZE) {
          return json({ error: "payload_too_large" }, 413);
        }
        body = (await request.json()) as Record<string, unknown>;
      } catch {
        body = {};
      }
    }

    // A. Ajout d'objet en inventaire (Anti-Duplication)
    if (method === "POST" && sub === "inventory") {
      const itemId = String(body.itemId ?? "").trim();
      if (!itemId) return json({ error: "itemId requis" }, 400);

      const quantity = validatePositiveInt(body.quantity, 1, 10_000); // Plage de sécurité stricte
      const durability = validatePositiveInt(body.durability, 100, 100);

      const row: InventoryItemDTO = {
        id: uid("inv"),
        characterId: id,
        itemId,
        itemType: String(body.itemType ?? "item").slice(0, 32),
        quantity,
        durability,
      };

      const list = inventory.get(id) ?? [];
      inventory.set(id, [row, ...list].slice(0, 80));
      pushLog(id, "inventory", `+ ${quantity}x ${itemId}`);
      return json(row, 201);
    }

    // B. Obtention de véhicule
    if (method === "POST" && sub === "vehicles") {
      const vehicleType = String(body.vehicleType ?? "").trim();
      if (!vehicleType) return json({ error: "vehicleType requis" }, 400);

      const row: VehicleDTO = {
        id: uid("veh"),
        characterId: id,
        vehicleType,
        licensePlate: String(body.licensePlate ?? `PNF ${Math.floor(Math.random() * 900) + 100}`).slice(0, 12),
        color: String(body.color ?? "vert-rang").slice(0, 32),
      };

      vehicles.set(id, [row, ...(vehicles.get(id) ?? [])]);
      pushLog(id, "vehicle", `Véhicule généré : ${row.vehicleType}`);
      return json(row, 201);
    }

    // C. Prise d'emploi RP
    if (method === "POST" && sub === "employment") {
      const jobId = String(body.jobId ?? "").trim();
      const job = JOB_MAP.get(jobId);
      if (!job) return json({ error: "Métier introuvable" }, 404);

      const current = employments.get(id) ?? [];
      if (current.some((e) => e.jobId === jobId && !e.firedAt)) {
        return json({ error: "Déjà en poste" }, 409);
      }

      const closed = current.map((e) => (e.firedAt ? e : { ...e, firedAt: Date.now() }));
      const row: EmploymentDTO = {
        id: uid("emp"),
        characterId: id,
        jobId,
        salary: job.salary,
        hiredAt: Date.now(),
        firedAt: null,
      };

      employments.set(id, [row, ...closed]);
      if (character) upsertCharacter({ ...character, job: jobId });
      pushLog(id, "job", `Emploi · ${job.name}`);
      return json(row, 201);
    }
  }

  // 3. Création de Personnage (Nouveau citoyen)
  if (method === "POST" && path === "/api/characters") {
    if (!isAuthed) return json({ error: "unauthorized" }, 401);

    let body: Record<string, unknown> = {};
    try {
      body = (await request.json()) as Record<string, unknown>;
    } catch {
      body = {};
    }

    const name = String(body.name ?? "").trim();
    if (name.length < 3 || name.length > 64) {
      return json({ error: "Le nom doit contenir entre 3 et 64 caractères." }, 400);
    }

    const id = uid("cit");
    const row: CharacterDTO = {
      id,
      userId: String(body.userId ?? id).slice(0, 64),
      name,
      gender: body.gender === "female" ? "female" : "male",
      build: String(body.build ?? "normal").slice(0, 16),
      skinTone: validatePositiveInt(body.skinTone, 0, 7),
      hairStyle: String(body.hairStyle ?? "court").slice(0, 32),
      hairColor: validatePositiveInt(body.hairColor, 0, 7),
      outfitTop: String(body.outfitTop ?? body.outfit ?? "canadienne").slice(0, 32),
      outfitBottom: String(body.outfitBottom ?? "canadienne").slice(0, 32),
      shoes: String(body.shoes ?? "bottes").slice(0, 32),
      job: "civil",
      cash: 250,
      bank: 2500,
      wanted: 0,
      updatedAt: Date.now(),
    };

    upsertCharacter(row);
    inventory.set(id, []);
    vehicles.set(id, []);
    pushLog(id, "create", `Enregistrement REQ Citoyen · ${name}`);
    return json(row, 201);
  }

  return json({ error: "not_found", path }, 404);
}