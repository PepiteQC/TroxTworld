// ═══════════════════════════════════════════════════════════════════════════
//  EXPRESS REST API ROUTES v1.0 — TROXTWORLD / PORTNEUF RP
//  server/routes/api.ts
//  Authentification JWT, Création Citoyen, Inventaire Anti-Dupe, Métiers & Garages
// ═══════════════════════════════════════════════════════════════════════════

import { Router, Request, Response, NextFunction } from 'express';
import { and, eq, desc, or } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from '../../src/db';
import {
  users,
  characters,
  inventoryItems,
  vehicles,
  weapons,
  jobs,
  employments,
  gameLogs,
} from '../../src/db/schema';

const router = Router();

// ─────────────────────────────────────────────────────────────────────────
//  AUTHENTIFICATION JWT & SÉCURITÉ
// ─────────────────────────────────────────────────────────────────────────

interface JWTPayload {
  userId: string;
  username: string;
}

// Étend l'interface Request d'Express pour inclure l'utilisateur connecté
export interface AuthenticatedRequest extends Request {
  user?: JWTPayload;
}

const JWT_SECRET = process.env.JWT_SECRET || 'troxt-dev-super-secret-key-change-me-in-prod';

function generateToken(payload: JWTPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch {
    return null;
  }
}

// Middleware de vérification du Token JWT
export async function authenticateToken(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: "Jeton d'authentification manquant" });
  }

  const payload = verifyToken(token);
  if (!payload) {
    return res.status(403).json({ error: 'Jeton invalide ou expiré' });
  }

  req.user = payload;
  next();
}

/**
 * Helper : cast sûr d'un paramètre de route Express vers string
 * Express peut renvoyer `string | string[]` selon le routeur.
 */
function routeString(value: unknown): string {
  if (Array.isArray(value)) return String(value[0] ?? '');
  return String(value ?? '');
}

/**
 * Garde-fou Anti-Exploit : Vérifie que le personnage appartient bien au compte connecté
 */
async function verifyCharacterOwnership(userId: string, characterId: string): Promise<boolean> {
  try {
    const char = await db.query.characters.findFirst({
      where: and(eq(characters.id, characterId), eq(characters.userId, userId)),
    });
    return Boolean(char);
  } catch {
    return false;
  }
}

// ─────────────────────────────────────────────────────────────────────────
//  ROUTES AUTHENTIFICATION (/api/auth)
// ─────────────────────────────────────────────────────────────────────────

// POST /api/auth/register (Création de compte)
router.post('/auth/register', async (req: Request, res: Response) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Tous les champs sont obligatoires' });
    }

    const cleanUsername = String(username).trim();
    const cleanEmail = String(email).trim().toLowerCase();

    if (cleanUsername.length < 3 || cleanUsername.length > 32) {
      return res.status(400).json({ error: "Le nom d'utilisateur doit contenir entre 3 et 32 caractères" });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Le mot de passe doit contenir au moins 6 caractères' });
    }

    // Vérification d'existence (typage explicite pour éviter any)
    const existing = await db.query.users.findFirst({
      where: or(eq(users.name, cleanUsername), eq(users.email, cleanEmail)),
    });

    if (existing) {
      return res.status(409).json({ error: "Ce nom d'utilisateur ou email est déjà utilisé" });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const userId = `usr_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;

    const result = await db
      .insert(users)
      .values({
        id: userId,
        name: cleanUsername,
        email: cleanEmail,
        emailVerified: false,
      })
      .returning();

    const user = result[0];
    const token = generateToken({ userId: user.id, username: user.name });

    res.status(201).json({
      user: {
        id: user.id,
        username: user.name,
        email: user.email,
      },
      token,
    });
  } catch (error) {
    console.error('Erreur inscription :', error);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

// POST /api/auth/login (Connexion)
router.post('/auth/login', async (req: Request, res: Response) => {
  try {
    const { username, email } = req.body;

    if (!username && !email) {
      return res.status(400).json({ error: 'Identifiant requis' });
    }

    // Construction dynamique de la clause WHERE avec typage explicite
    const conditions = [];
    if (username) conditions.push(eq(users.name, String(username).trim()));
    if (email) conditions.push(eq(users.email, String(email).trim().toLowerCase()));

    if (conditions.length === 0) {
      return res.status(400).json({ error: 'Identifiant requis' });
    }

    const user = await db.query.users.findFirst({
      where: conditions.length === 1 ? conditions[0] : or(...conditions),
    });

    if (!user) {
      return res.status(401).json({ error: 'Identifiants invalides' });
    }

    const token = generateToken({ userId: user.id, username: user.name });

    res.json({
      user: {
        id: user.id,
        username: user.name,
        email: user.email,
      },
      token,
    });
  } catch (error) {
    console.error('Erreur connexion :', error);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

// ─────────────────────────────────────────────────────────────────────────
//  ROUTES PERSONNAGES RP (/api/characters)
// ─────────────────────────────────────────────────────────────────────────

// GET /api/characters (Liste des personnages du joueur)
router.get('/characters', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const userCharacters = await db.query.characters.findMany({
      where: eq(characters.userId, userId),
    });
    res.json(userCharacters);
  } catch (error) {
    console.error('Erreur lecture personnages :', error);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

// POST /api/characters (Création d'un nouveau citoyen dans le comté)
router.post('/characters', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const {
      firstName,
      lastName,
      name,
      gender,
      phoneNumber,
      appearance = {},
    } = req.body;

    // Support rétro-compatible : si on passe `name` au lieu de firstName/lastName
    const cleanFirstName = String(firstName ?? name ?? '').trim();
    const cleanLastName = String(lastName ?? '').trim();

    if (cleanFirstName.length < 2 || cleanFirstName.length > 32) {
      return res.status(400).json({ error: 'Le prénom doit contenir entre 2 et 32 caractères' });
    }

    const charId = `cit_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;

    const result = await db
      .insert(characters)
      .values({
        id: charId,
        userId,
        firstName: cleanFirstName,
        lastName: cleanLastName || cleanFirstName, // fallback si pas de nom fourni
        gender: gender === 'female' ? 'female' : 'male',
        phoneNumber: phoneNumber ? String(phoneNumber).trim() : null,
        appearance: appearance ?? {},
        job: 'civil',
        cash: 250,
        bank: 2500,
        dirtyMoney: 0,
        wantedLevel: 0,
        posX: 0,
        posY: 1,
        posZ: 10,
        rotation: 0,
        health: 100,
        armor: 0,
        hunger: 100,
        thirst: 100,
        stress: 0,
        isDead: false,
        isHandcuffed: false,
      })
      .returning();

    res.status(201).json(result[0]);
  } catch (error) {
    console.error('Erreur création citoyen :', error);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

// GET /api/characters/:id (Détails complets d'un citoyen)
router.get('/characters/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const characterId = routeString(req.params.id);
    const isOwner = await verifyCharacterOwnership(req.user!.userId, characterId);

    if (!isOwner) {
      return res.status(403).json({ error: 'Accès refusé à ce personnage' });
    }

    const character = await db.query.characters.findFirst({
      where: eq(characters.id, characterId),
    });

    if (!character) {
      return res.status(404).json({ error: 'Personnage introuvable' });
    }

    // Récupération de l'inventaire (polymorphe) et des véhicules associés
    const [inv, userVehicles] = await Promise.all([
      db.query.inventoryItems.findMany({
        where: and(eq(inventoryItems.ownerType, 'character'), eq(inventoryItems.ownerId, characterId)),
      }),
      db.query.vehicles.findMany({ where: eq(vehicles.ownerId, characterId) }),
    ]);

    res.json({
      ...character,
      inventory: inv,
      vehicles: userVehicles,
    });
  } catch (error) {
    console.error('Erreur fiche personnage :', error);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

// ─────────────────────────────────────────────────────────────────────────
//  INVENTAIRE SÉCURISÉ (ANTI-DUPLICATION)
// ─────────────────────────────────────────────────────────────────────────

// GET /api/characters/:characterId/inventory
router.get('/characters/:characterId/inventory', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const characterId = routeString(req.params.characterId);
    const isOwner = await verifyCharacterOwnership(req.user!.userId, characterId);
    if (!isOwner) return res.status(403).json({ error: 'Accès refusé' });

    const inv = await db.query.inventoryItems.findMany({
      where: and(eq(inventoryItems.ownerType, 'character'), eq(inventoryItems.ownerId, characterId)),
    });
    res.json(inv);
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// POST /api/characters/:characterId/inventory (Ajout d'item sécurisé)
router.post('/characters/:characterId/inventory', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const characterId = routeString(req.params.characterId);
    const isOwner = await verifyCharacterOwnership(req.user!.userId, characterId);
    if (!isOwner) return res.status(403).json({ error: 'Accès refusé' });

    const { itemId, itemName, itemType, quantity = 1, durability = 100, weight = 0, metadata = {} } = req.body;
    if (!itemId) return res.status(400).json({ error: "Identifiant d'objet requis" });

    // Anti-duplication : Forcer un entier positif non nul
    const cleanQty = Math.max(1, Math.min(Math.floor(Number(quantity) || 1), 10000));
    const cleanDurability = Math.max(0, Math.min(Math.floor(Number(durability) || 100), 100));

    const result = await db
      .insert(inventoryItems)
      .values({
        id: `inv_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
        ownerType: 'character',
        ownerId: characterId,
        itemId: String(itemId).trim(),
        itemName: String(itemName || itemType || 'item').trim(),
        quantity: cleanQty,
        weight: Number(weight) || 0,
        durability: cleanDurability,
        metadata: metadata ?? {},
      })
      .returning();

    res.status(201).json(result[0]);
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ─────────────────────────────────────────────────────────────────────────
//  ARMURERIE & MÉTIERS DU COMTÉ
// ─────────────────────────────────────────────────────────────────────────

router.get('/weapons', async (_req: Request, res: Response) => {
  try {
    const allWeapons = await db.query.weapons.findMany();
    res.json(allWeapons);
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.get('/jobs', async (_req: Request, res: Response) => {
  try {
    const allJobs = await db.query.jobs.findMany();
    res.json(allJobs);
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// POST /api/characters/:characterId/employment (Attribution de poste)
router.post('/characters/:characterId/employment', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const characterId = routeString(req.params.characterId);
    const isOwner = await verifyCharacterOwnership(req.user!.userId, characterId);
    if (!isOwner) return res.status(403).json({ error: 'Accès refusé' });

    const { jobId } = req.body;
    const cleanJobId = String(jobId || '').trim();

    const job = await db.query.jobs.findFirst({
      where: eq(jobs.id, cleanJobId),
    });

    if (!job) {
      return res.status(404).json({ error: 'Métier introuvable dans le cadastre' });
    }

    // Mise à jour du métier sur le personnage
    await db.update(characters).set({ job: cleanJobId }).where(eq(characters.id, characterId));

    // Création d'une trace d'emploi
    await db.insert(employments).values({
      id: `emp_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
      characterId,
      jobId: cleanJobId,
      salary: job.baseSalary,
    });

    // Log de l'événement
    await db.insert(gameLogs).values({
      id: `log_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
      characterId,
      event: 'job_hired',
      details: `Assigné au métier ${job.name}`,
      metadata: { jobId: cleanJobId },
    });

    res.status(201).json({ ok: true, job: cleanJobId, salary: job.baseSalary });
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ─────────────────────────────────────────────────────────────────────────
//  GARAGE & VÉHICULES
// ─────────────────────────────────────────────────────────────────────────

router.get('/characters/:characterId/vehicles', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const characterId = routeString(req.params.characterId);
    const isOwner = await verifyCharacterOwnership(req.user!.userId, characterId);
    if (!isOwner) return res.status(403).json({ error: 'Accès refusé' });

    const userVehicles = await db.query.vehicles.findMany({
      where: eq(vehicles.ownerId, characterId),
    });
    res.json(userVehicles);
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

export default router;