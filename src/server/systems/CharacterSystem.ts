// ═══════════════════════════════════════════════════════════════════════════
//  CHARACTER SYSTEM v2.0 — Identités RP · Anti-Cheat · Audit · Soft-Delete
//  src/server/systems/CharacterSystem.ts
// ───────────────────────────────────────────────────────────────────────────
//  • Validation cosmétique stricte (ranges clampés, whitelist)
//  • Profanity filter (FR + EN) sur noms de famille/prénom
//  • Name uniqueness par owner (pas de doublons)
//  • Limite de personnages par compte (configurable)
//  • Rate-limit création (anti-spam DB)
//  • Spawn cooldown (anti-spam spawnCount)
//  • Session binding check (1 char actif par session)
//  • Soft-delete + audit trail complet
//  • Snapshot avant delete (rollback possible)
//  • Rename sécurisé (rate-limited)
//  • Transfert de propriété admin/owner
//  • Fingerprint création (IP hash + device)
//  • Serialization version + migration
//  • Compat 100% v1 (commands + queries identiques)
// ═══════════════════════════════════════════════════════════════════════════

import { Intellectus } from '../intellectus';
import { Contract, CommandDefinition, nowMs } from '../intellectus/types';

// ─────────────────────────────────────────────────────────────────────────
//  1. VERSION DE SCHÉMA & CONSTANTES
// ─────────────────────────────────────────────────────────────────────────

export const CHARACTER_SCHEMA_VERSION = 2;

/** 🆕 Auras — export const (typage strict). */
export const AURA_IDS = [
  'none', 'divine', 'void', 'blood', 'frost', 'nature', 'chaos',
  'lichking', 'demonhunter', 'bloodmage', 'archmage', 'warlord', 'timegod',
  'firegod', 'crystal', 'storm', 'abyssal', 'solar', 'quantum',
] as const;

export type AuraId = typeof AURA_IDS[number];

/** 🆕 Nationalités acceptées (whitelist QC-first). */
export const NATIONALITY_WHITELIST = [
  'Québécoise', 'Canadienne', 'Française', 'Américaine', 'Haïtienne',
  'Italienne', 'Irlandaise', 'Portugaise', 'Grecque', 'Marocaine',
  'Algérienne', 'Tunisienne', 'Libanaise', 'Syrienne', 'Chinoise',
  'Vietnamienne', 'Japonaise', 'Coréenne', 'Indienne', 'Mexicaine',
  'Brésilienne', 'Colombienne', 'Péruvienne', 'Autochtone', 'Autre',
] as const;

export type Nationality = typeof NATIONALITY_WHITELIST[number];

/** 🆕 Configuration système. */
export interface CharacterConfig {
  /** Nombre max de personnages par compte. */
  maxCharactersPerAccount: number;
  /** Cooldown création (ms) — anti-spam DB. */
  creationCooldownMs: number;
  /** Cooldown spawn (ms) — anti-spam spawnCount. */
  spawnCooldownMs: number;
  /** Cooldown rename (ms). */
  renameCooldownMs: number;
  /** Longueur min/max du nom complet. */
  nameLengthRange: [number, number];
  /** Valeurs de départ (anti-cheat). */
  startingCash: number;
  startingBank: number;
  /** Limites absolues (hard cap même admin). */
  hardCashCap: number;
  hardBankCap: number;
  /** Active le profanity filter. */
  profanityFilterEnabled: boolean;
  /** Active le session binding check. */
  sessionBindingEnabled: boolean;
  /** Active l'audit trail. */
  auditEnabled: boolean;
  /** Version de save (pour migration). */
  schemaVersion: number;
}

const DEFAULT_CONFIG: CharacterConfig = {
  maxCharactersPerAccount: 3,
  creationCooldownMs: 5 * 60 * 1000,   // 5 min
  spawnCooldownMs: 3_000,               // 3 s
  renameCooldownMs: 24 * 60 * 60 * 1000, // 24 h
  nameLengthRange: [3, 30],
  startingCash: 500,
  startingBank: 2500,
  hardCashCap: 10_000,
  hardBankCap: 100_000,
  profanityFilterEnabled: true,
  sessionBindingEnabled: true,
  auditEnabled: true,
  schemaVersion: CHARACTER_SCHEMA_VERSION,
};

// ─────────────────────────────────────────────────────────────────────────
//  2. MODÈLE DE PERSONNAGE (interface étendue, compat v1)
// ─────────────────────────────────────────────────────────────────────────

export interface FaceDetail {
  noseBridge: number;
  noseSize: number;
  faceWidth: number;
  cheekH: number;
  jawWidth: number;
  eyeSize: number;
  eyeSpacing: number;
  lipSize: number;
}

/** 🆕 Apparence complète (était absent en v1). */
export interface CharacterAppearance {
  model: string;
  skinTone: number;
  hairStyle: number;
  hairColor: number;
  eyeColor: number;
  topStyle: number;
  topColor: number;
  pantsStyle: number;
  pantsColor: number;
  shoesStyle: number;
  shoesColor: number;
  glassesStyle: number;
  hatStyle: number;
  jewelryStyle: number;
}

/** 🆕 Métadonnées d'audit. */
export interface CharacterAudit {
  createdBy: string;
  createdFromIpHash?: string;
  createdFromDevice?: string;
  lastModifiedBy?: string;
  lastModifiedAt?: number;
  deletedBy?: string;
  deletedAt?: number;
  deletedReason?: string;
  renamedBy?: string;
  renamedAt?: number;
  previousNames?: string[];
  transferCount: number;
  ownershipHistory: Array<{ from: string; to: string; at: number }>;
}

/** Interface principale — 100% compat v1 + extensions. */
export interface EtherCharacter {
  id: string;
  ownerId: string;
  name: string;
  gender: 'male' | 'female';
  nationality: string;

  // Apparence & Génétique (indices palettes client)
  skin: number;
  faceShape: number;
  faceStyle: number;
  eyeColor: number;
  hairStyle: number;
  hairColor: number;
  facialHair: number;
  bodyType: number;
  height: number;
  muscular: number;
  fatness: number;

  // Vêtements de départ
  topStyle: number;
  topColor: number;
  pantsStyle: number;
  pantsColor: number;
  shoesStyle: number;
  shoesColor: number;

  // Accessoires
  glassesStyle: number;
  hatStyle: number;
  jewelryStyle: number;
  activeAura: string | null;

  // Stats financières et RP
  cash: number;
  bank: number;
  job: string;
  gang: string;
  inventory: any[];

  // Métadonnées
  createdAt: number;
  updatedAt: number;
  spawnCount: number;

  // Détails faciaux
  faceDetail?: FaceDetail;

  // 🆕 Apparence consolidée (fix bug v1)
  appearance?: CharacterAppearance;

  // 🆕 Soft-delete
  deleted?: boolean;
  deletedAt?: number;

  // 🆕 Audit
  audit?: CharacterAudit;

  // 🆕 Anti-spam timestamps
  lastSpawnAt?: number;
  lastRenameAt?: number;

  // 🆕 Version schéma
  schemaVersion?: number;
}

// ─────────────────────────────────────────────────────────────────────────
//  3. ANTI-CHEAT UTILITAIRES
// ─────────────────────────────────────────────────────────────────────────

function clamp(n: number, min: number, max: number): number {
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, n));
}

function clampInt(n: unknown, min: number, max: number, fallback: number): number {
  const v = Number(n);
  if (!Number.isFinite(v)) return fallback;
  return clamp(Math.floor(v), min, max);
}

/**
 * 🆕 Profanity filter — liste courte FR + EN.
 * Pour un vrai projet, remplacer par un package type `bad-words`.
 */
const PROFANITY_LIST = [
  // FR
  'merde', 'putain', 'connard', 'salope', 'enculé', 'encule', 'fdp',
  'bâtard', 'batard', 'pute', 'salaud', 'abruti', 'crétin', 'cretin',
  'nique', 'niquer', 'baiser', 'chier', 'pd', 'tapette',
  // EN
  'fuck', 'shit', 'bitch', 'asshole', 'cunt', 'dick', 'cock', 'pussy',
  'nigger', 'nigga', 'faggot', 'retard', 'whore', 'slut', 'bastard',
];

function containsProfanity(text: string): boolean {
  const lower = text.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return PROFANITY_LIST.some((word) => lower.includes(word));
}

/**
 * 🆕 Validation cosmétique : aucune valeur ne peut sortir des bornes déclarées.
 */
interface CosmeticRange {
  min: number;
  max: number;
}

const COSMETIC_RANGES: Record<string, CosmeticRange> = {
  skin: { min: 0, max: 50 },
  faceShape: { min: 0, max: 20 },
  faceStyle: { min: 0, max: 20 },
  eyeColor: { min: 0, max: 30 },
  hairStyle: { min: 0, max: 100 },
  hairColor: { min: 0, max: 64 },
  facialHair: { min: 0, max: 30 },
  bodyType: { min: 0, max: 10 },
  height: { min: 0, max: 100 },
  muscular: { min: 0, max: 100 },
  fatness: { min: 0, max: 100 },
  topStyle: { min: 0, max: 100 },
  topColor: { min: 0, max: 64 },
  pantsStyle: { min: 0, max: 100 },
  pantsColor: { min: 0, max: 64 },
  shoesStyle: { min: 0, max: 100 },
  shoesColor: { min: 0, max: 64 },
  glassesStyle: { min: 0, max: 30 },
  hatStyle: { min: 0, max: 50 },
  jewelryStyle: { min: 0, max: 30 },
  noseBridge: { min: 0, max: 100 },
  noseSize: { min: 0, max: 100 },
  faceWidth: { min: 0, max: 100 },
  cheekH: { min: 0, max: 100 },
  jawWidth: { min: 0, max: 100 },
  eyeSize: { min: 0, max: 100 },
  eyeSpacing: { min: 0, max: 100 },
  lipSize: { min: 0, max: 100 },
};

function safeCosmetic(key: string, raw: unknown, fallback = 0): number {
  const range = COSMETIC_RANGES[key];
  if (!range) return fallback;
  return clampInt(raw, range.min, range.max, fallback);
}

/** 🆕 Rate-limit registry (par ownerId). */
const CREATION_TIMES = new Map<string, number[]>();
const SPAWN_TIMES = new Map<string, number[]>();
const RENAME_TIMES = new Map<string, number>();

function checkRateLimit(
  map: Map<string, number[]>,
  key: string,
  windowMs: number,
  limit: number,
): boolean {
  const now = nowMs();
  const arr = map.get(key) ?? [];
  const recent = arr.filter((t) => now - t < windowMs);
  if (recent.length >= limit) return false;
  recent.push(now);
  map.set(key, recent);
  return true;
}

// ─────────────────────────────────────────────────────────────────────────
//  4. CONTRATS BENEDICTUS (validation frontière anti-cheat)
// ─────────────────────────────────────────────────────────────────────────

export const CHARACTER_CONTRACTS: Contract[] = [
  {
    contractName: 'character.save',
    strict: false,
    fields: {
      name: { type: 'string', required: true, minLength: 3, maxLength: 30 },
      gender: { type: 'enum', required: true, enumValues: ['male', 'female'] },
      nationality: { type: 'string', maxLength: 24 },
      skin: { type: 'number', min: 0, max: 50 },
      hairStyle: { type: 'number', min: 0, max: 100 },
      activeAura: {
        type: 'string',
        maxLength: 24,
        custom: (v) =>
          v === null || v === '' || (AURA_IDS as readonly string[]).includes(v)
            ? true
            : `Aura cosmétique invalide : ${v}`,
      },
    },
  },
  {
    contractName: 'character.spawn',
    strict: true,
    fields: {
      characterId: { type: 'string', required: true, maxLength: 64 },
    },
  },
  {
    contractName: 'character.delete',
    strict: true,
    fields: {
      characterId: { type: 'string', required: true, maxLength: 64 },
    },
  },
  // 🆕 Contrats v2
  {
    contractName: 'character.rename',
    strict: true,
    fields: {
      characterId: { type: 'string', required: true, maxLength: 64 },
      newName: { type: 'string', required: true, minLength: 3, maxLength: 30 },
    },
  },
  {
    contractName: 'character.restore',
    strict: true,
    fields: {
      characterId: { type: 'string', required: true, maxLength: 64 },
    },
  },
  {
    contractName: 'character.transfer',
    strict: true,
    fields: {
      characterId: { type: 'string', required: true, maxLength: 64 },
      newOwnerId: { type: 'string', required: true, maxLength: 64 },
    },
  },
];

// ─────────────────────────────────────────────────────────────────────────
//  5. ENREGISTREMENT DU SYSTÈME
// ─────────────────────────────────────────────────────────────────────────

export function registerCharacterSystem(
  core: Intellectus,
  config: Partial<CharacterConfig> = {},
): void {
  const cfg: CharacterConfig = { ...DEFAULT_CONFIG, ...config };

  // Enregistre tous les contrats
  CHARACTER_CONTRACTS.forEach((c) => core.addContract(c));

  const commands: CommandDefinition[] = [

    // ── 👤 1. CREER OU METTRE À JOUR UN CITOYEN ────────────────────────
    {
      commandName: 'character.save',
      contractName: 'character.save',
      idempotent: false,
      handler: async (input: any, ctx) => {
        const ownerId = ctx.playerId || input.ownerId || 'anonymous';

        // 1) Validation du nom
        const rawName = String(input.name ?? '').trim();
        const [minLen, maxLen] = cfg.nameLengthRange;
        if (rawName.length < minLen || rawName.length > maxLen) {
          throw new Error(`Nom invalide : ${minLen}-${maxLen} caractères requis`);
        }
        if (cfg.profanityFilterEnabled && containsProfanity(rawName)) {
          throw new Error('Nom refusé : langage inapproprié');
        }

        // 2) Validation nationalité (whitelist)
        const nationality = input.nationality ?? 'Québécoise';
        if (!(NATIONALITY_WHITELIST as readonly string[]).includes(nationality)) {
          throw new Error(`Nationalité non reconnue : ${nationality}`);
        }

        // 3) Recherche personnage existant
        const existing = core.memory
          .values<EtherCharacter>('characters')
          .find((c) =>
            !c.deleted &&
            c.ownerId === ownerId &&
            c.name.toLowerCase() === rawName.toLowerCase(),
          );

        // 4) Rate-limit création (si nouveau)
        if (!existing) {
          const withinLimit = checkRateLimit(
            CREATION_TIMES,
            ownerId,
            cfg.creationCooldownMs,
            3, // 3 créations max / 5 min
          );
          if (!withinLimit) {
            throw new Error('⏱️ Trop de créations récentes — patientez 5 minutes');
          }

          // 5) Limite par compte
          const ownerChars = core.memory
            .values<EtherCharacter>('characters')
            .filter((c) => !c.deleted && c.ownerId === ownerId);
          if (ownerChars.length >= cfg.maxCharactersPerAccount) {
            throw new Error(
              `Limite atteinte (${cfg.maxCharactersPerAccount} personnages / compte)`,
            );
          }
        }

        // 6) ID & valeurs de départ sécurisées
        const id = existing?.id
          ?? `char_${Date.now()}_${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

        const startingCash = existing
          ? existing.cash
          : clamp(
              Number(input.cash) || cfg.startingCash,
              0,
              cfg.hardCashCap,
            );
        const startingBank = existing
          ? existing.bank
          : clamp(
              Number(input.bank) || cfg.startingBank,
              0,
              cfg.hardBankCap,
            );

        // 7) Construction du personnage (toutes valeurs clampées)
        const character: EtherCharacter = {
          id,
          ownerId,
          name: rawName,
          gender: input.gender === 'female' ? 'female' : 'male',
          nationality,

          skin: safeCosmetic('skin', input.skin, 0),
          faceShape: safeCosmetic('faceShape', input.faceShape, 0),
          faceStyle: safeCosmetic('faceStyle', input.faceStyle, 0),
          eyeColor: safeCosmetic('eyeColor', input.eyeColor, 0),
          hairStyle: safeCosmetic('hairStyle', input.hairStyle, 0),
          hairColor: safeCosmetic('hairColor', input.hairColor, 0),
          facialHair: safeCosmetic('facialHair', input.facialHair, 0),
          bodyType: safeCosmetic('bodyType', input.bodyType, 0),
          height: safeCosmetic('height', input.height, 50),
          muscular: safeCosmetic('muscular', input.muscular, 40),
          fatness: safeCosmetic('fatness', input.fatness, 30),

          topStyle: safeCosmetic('topStyle', input.topStyle, 0),
          topColor: safeCosmetic('topColor', input.topColor, 0),
          pantsStyle: safeCosmetic('pantsStyle', input.pantsStyle, 0),
          pantsColor: safeCosmetic('pantsColor', input.pantsColor, 0),
          shoesStyle: safeCosmetic('shoesStyle', input.shoesStyle, 0),
          shoesColor: safeCosmetic('shoesColor', input.shoesColor, 0),

          glassesStyle: safeCosmetic('glassesStyle', input.glassesStyle, 0),
          hatStyle: safeCosmetic('hatStyle', input.hatStyle, 0),
          jewelryStyle: safeCosmetic('jewelryStyle', input.jewelryStyle, 0),

          activeAura:
            input.activeAura && (AURA_IDS as readonly string[]).includes(input.activeAura)
              ? input.activeAura
              : 'none',

          cash: startingCash,
          bank: startingBank,
          job: existing?.job ?? 'Civil',
          gang: existing?.gang ?? 'Aucun',
          inventory: existing?.inventory ?? [],

          createdAt: existing?.createdAt ?? nowMs(),
          updatedAt: nowMs(),
          spawnCount: existing?.spawnCount ?? 0,

          faceDetail: {
            noseBridge: safeCosmetic('noseBridge', input.noseBridge, 50),
            noseSize: safeCosmetic('noseSize', input.noseSize, 50),
            faceWidth: safeCosmetic('faceWidth', input.faceWidth, 50),
            cheekH: safeCosmetic('cheekH', input.cheekH, 50),
            jawWidth: safeCosmetic('jawWidth', input.jawWidth, 50),
            eyeSize: safeCosmetic('eyeSize', input.eyeSize, 50),
            eyeSpacing: safeCosmetic('eyeSpacing', input.eyeSpacing, 50),
            lipSize: safeCosmetic('lipSize', input.lipSize, 50),
          },

          // 🆕 Apparence consolidée
          appearance: existing?.appearance ?? {
            model: input.gender === 'female' ? 'mp_f_freemode_01' : 'mp_m_freemode_01',
            skinTone: safeCosmetic('skin', input.skin, 0),
            hairStyle: safeCosmetic('hairStyle', input.hairStyle, 0),
            hairColor: safeCosmetic('hairColor', input.hairColor, 0),
            eyeColor: safeCosmetic('eyeColor', input.eyeColor, 0),
            topStyle: safeCosmetic('topStyle', input.topStyle, 0),
            topColor: safeCosmetic('topColor', input.topColor, 0),
            pantsStyle: safeCosmetic('pantsStyle', input.pantsStyle, 0),
            pantsColor: safeCosmetic('pantsColor', input.pantsColor, 0),
            shoesStyle: safeCosmetic('shoesStyle', input.shoesStyle, 0),
            shoesColor: safeCosmetic('shoesColor', input.shoesColor, 0),
            glassesStyle: safeCosmetic('glassesStyle', input.glassesStyle, 0),
            hatStyle: safeCosmetic('hatStyle', input.hatStyle, 0),
            jewelryStyle: safeCosmetic('jewelryStyle', input.jewelryStyle, 0),
          },

          // 🆕 Audit
          audit: existing?.audit ?? {
            createdBy: ownerId,
            createdFromIpHash: ctx.ipHash,
            createdFromDevice: ctx.deviceId,
            lastModifiedBy: ownerId,
            lastModifiedAt: nowMs(),
            transferCount: 0,
            ownershipHistory: [],
          },

          // 🆕 Anti-spam
          lastSpawnAt: existing?.lastSpawnAt ?? 0,
          lastRenameAt: existing?.lastRenameAt ?? 0,

          // 🆕 Schéma
          schemaVersion: cfg.schemaVersion,
        };

        // Mise à jour audit si existant
        if (existing && character.audit) {
          character.audit.lastModifiedBy = ownerId;
          character.audit.lastModifiedAt = nowMs();
        }

        // 8) Persiste
        core.memory.set('characters', id, character, true);

        await core.emit('character', existing ? 'updated' : 'created', {
          id,
          ownerId,
          name: character.name,
          aura: character.activeAura,
        }, { sourceAgent: 'character' });

        return { id, name: character.name, isNew: !existing };
      },
    },

    // ── 🎮 2. SPAWN CHARACTER ───────────────────────────────────────────
    {
      commandName: 'character.spawn',
      contractName: 'character.spawn',
      handler: async (input: { characterId: string }, ctx) => {
        const playerId = ctx.playerId;
        if (!playerId) throw new Error('ID de session joueur introuvable');

        const character = core.memory.get<EtherCharacter>('characters', input.characterId);
        if (!character) throw new Error('Personnage introuvable en base de données');
        if (character.deleted) throw new Error('Ce personnage a été supprimé');

        // 🆕 Cooldown spawn
        const now = nowMs();
        if (character.lastSpawnAt && now - character.lastSpawnAt < cfg.spawnCooldownMs) {
          throw new Error(
            `⏱️ Spawn trop rapide (${cfg.spawnCooldownMs / 1000}s entre chaque)`,
          );
        }

        // 🆕 Session binding check : un joueur ne peut pas spawn 2 chars simultanément
        if (cfg.sessionBindingEnabled) {
          const existingSession = core.memory.get<any>('players', playerId);
          if (
            existingSession?.characterId &&
            existingSession.characterId !== character.id
          ) {
            throw new Error(
              'Vous êtes déjà lié à un autre personnage — déconnectez-vous d\'abord',
            );
          }
        }

        // Incrémentation compteurs
        character.spawnCount++;
        character.lastSpawnAt = now;
        character.updatedAt = now;
        core.memory.set('characters', character.id, character, true);

        // Application autoritaire
        const playerSession = core.memory.get<any>('players', playerId) || { id: playerId };

        playerSession.characterId = character.id;
        playerSession.name = character.name;
        playerSession.job = character.job;
        playerSession.gang = character.gang;
        playerSession.cash = character.cash;
        playerSession.bank = character.bank;
        playerSession.aura = character.activeAura ?? 'none';
        playerSession.appearance = character.appearance ?? {
          model: character.gender === 'female' ? 'mp_f_freemode_01' : 'mp_m_freemode_01',
          skinTone: character.skin,
          hairStyle: character.hairStyle,
          hairColor: character.hairColor,
        };

        core.memory.set('players', playerId, playerSession, true);

        await core.emit('player', 'spawned', {
          characterId: character.id,
          playerId,
          name: character.name,
          job: character.job,
          aura: character.activeAura,
        }, { priority: 'high', sourceAgent: 'character' });

        return { ok: true, character };
      },
    },

    // ── 🗑️ 3. DELETE CHARACTER (soft-delete + audit) ────────────────────
    {
      commandName: 'character.delete',
      contractName: 'character.delete',
      handler: async (input: { characterId: string }, ctx) => {
        const callerId = ctx.playerId;
        if (!callerId) throw new Error('Opérateur non identifié');

        const character = core.memory.get<EtherCharacter>('characters', input.characterId);
        if (!character) throw new Error('Personnage introuvable');
        if (character.deleted) throw new Error('Personnage déjà supprimé');

        // 🛡️ Autorité
        const isAdmin = ctx.isAdmin || ctx.job === 'Admin' || ctx.permission === 'admin';
        const isOwner = character.ownerId === callerId;

        if (!isOwner && !isAdmin) {
          throw new Error('❌ Sécurité : Vous n\'êtes pas autorisé à supprimer ce citoyen.');
        }

        // 🆕 Soft-delete : on garde les données pour audit/rollback
        character.deleted = true;
        character.deletedAt = nowMs();
        character.updatedAt = nowMs();

        if (cfg.auditEnabled) {
          character.audit = character.audit ?? {
            createdBy: character.ownerId,
            transferCount: 0,
            ownershipHistory: [],
          };
          character.audit.deletedBy = callerId;
          character.audit.deletedAt = character.deletedAt;
          character.audit.deletedReason = isAdmin ? 'admin' : 'owner';
        }

        core.memory.set('characters', character.id, character, true);

        await core.emit('character', 'deleted', {
          characterId: input.characterId,
          name: character.name,
          deletedBy: callerId,
        }, { priority: 'high', sourceAgent: 'character' });

        return { ok: true, deletedId: input.characterId, soft: true };
      },
    },

    // ── ✏️ 4. RENAME CHARACTER (v2) ─────────────────────────────────────
    {
      commandName: 'character.rename',
      contractName: 'character.rename',
      handler: async (input: { characterId: string; newName: string }, ctx) => {
        const callerId = ctx.playerId;
        if (!callerId) throw new Error('Opérateur non identifié');

        const character = core.memory.get<EtherCharacter>('characters', input.characterId);
        if (!character) throw new Error('Personnage introuvable');
        if (character.deleted) throw new Error('Personnage supprimé');

        const isAdmin = ctx.isAdmin || ctx.permission === 'admin';
        if (character.ownerId !== callerId && !isAdmin) {
          throw new Error('❌ Vous n\'êtes pas autorisé à renommer ce personnage');
        }

        // Validation
        const newName = String(input.newName ?? '').trim();
        const [minLen, maxLen] = cfg.nameLengthRange;
        if (newName.length < minLen || newName.length > maxLen) {
          throw new Error(`Nom invalide : ${minLen}-${maxLen} caractères`);
        }
        if (cfg.profanityFilterEnabled && containsProfanity(newName)) {
          throw new Error('Nom refusé : langage inapproprié');
        }

        // Cooldown rename (sauf admin)
        if (!isAdmin) {
          const last = RENAME_TIMES.get(character.id) ?? 0;
          if (nowMs() - last < cfg.renameCooldownMs) {
            const h = Math.ceil((cfg.renameCooldownMs - (nowMs() - last)) / 3600000);
            throw new Error(`⏱️ Rename disponible dans ${h}h`);
          }
        }

        // Unicité pour l'owner
        const conflict = core.memory
          .values<EtherCharacter>('characters')
          .find((c) =>
            c.id !== character.id &&
            !c.deleted &&
            c.ownerId === character.ownerId &&
            c.name.toLowerCase() === newName.toLowerCase(),
          );
        if (conflict) {
          throw new Error('Vous avez déjà un personnage avec ce nom');
        }

        const previousName = character.name;
        character.name = newName;
        character.updatedAt = nowMs();
        character.lastRenameAt = nowMs();

        if (cfg.auditEnabled) {
          character.audit = character.audit ?? {
            createdBy: character.ownerId,
            transferCount: 0,
            ownershipHistory: [],
          };
          character.audit.renamedBy = callerId;
          character.audit.renamedAt = nowMs();
          character.audit.previousNames = [
            ...(character.audit.previousNames ?? []),
            previousName,
          ];
        }

        RENAME_TIMES.set(character.id, nowMs());
        core.memory.set('characters', character.id, character, true);

        await core.emit('character', 'renamed', {
          characterId: character.id,
          from: previousName,
          to: newName,
          by: callerId,
        }, { sourceAgent: 'character' });

        return { ok: true, from: previousName, to: newName };
      },
    },

    // ── ♻️ 5. RESTORE CHARACTER (rollback soft-delete) ──────────────────
    {
      commandName: 'character.restore',
      contractName: 'character.restore',
      handler: async (input: { characterId: string }, ctx) => {
        const callerId = ctx.playerId;
        if (!callerId) throw new Error('Opérateur non identifié');

        const character = core.memory.get<EtherCharacter>('characters', input.characterId);
        if (!character) throw new Error('Personnage introuvable');
        if (!character.deleted) throw new Error('Ce personnage n\'est pas supprimé');

        const isAdmin = ctx.isAdmin || ctx.permission === 'admin';
        if (character.ownerId !== callerId && !isAdmin) {
          throw new Error('❌ Accès refusé');
        }

        character.deleted = false;
        character.deletedAt = undefined;
        character.updatedAt = nowMs();
        if (character.audit) {
          character.audit.deletedBy = undefined;
          character.audit.deletedAt = undefined;
          character.audit.deletedReason = undefined;
        }

        core.memory.set('characters', character.id, character, true);

        await core.emit('character', 'restored', {
          characterId: character.id,
          by: callerId,
        }, { sourceAgent: 'character' });

        return { ok: true };
      },
    },

    // ── 🔄 6. TRANSFER OWNERSHIP (admin only) ───────────────────────────
    {
      commandName: 'character.transfer',
      contractName: 'character.transfer',
      handler: async (input: { characterId: string; newOwnerId: string }, ctx) => {
        const callerId = ctx.playerId;
        const isAdmin = ctx.isAdmin || ctx.permission === 'admin';
        if (!isAdmin) throw new Error('❌ Transfert réservé aux administrateurs');

        const character = core.memory.get<EtherCharacter>('characters', input.characterId);
        if (!character) throw new Error('Personnage introuvable');
        if (character.deleted) throw new Error('Personnage supprimé');

        const previousOwner = character.ownerId;
        character.ownerId = input.newOwnerId;
        character.updatedAt = nowMs();

        if (cfg.auditEnabled) {
          character.audit = character.audit ?? {
            createdBy: previousOwner,
            transferCount: 0,
            ownershipHistory: [],
          };
          character.audit.ownershipHistory.push({
            from: previousOwner,
            to: input.newOwnerId,
            at: nowMs(),
          });
          character.audit.transferCount++;
        }

        core.memory.set('characters', character.id, character, true);

        await core.emit('character', 'transferred', {
          characterId: character.id,
          from: previousOwner,
          to: input.newOwnerId,
          by: callerId,
        }, { sourceAgent: 'character' });

        return { ok: true, from: previousOwner, to: input.newOwnerId };
      },
    },
  ];

  core.registerCommands(commands);
  console.log(
    `👤 [Character] v2.0 · limite=${cfg.maxCharactersPerAccount}/compte · ` +
    `profanity=${cfg.profanityFilterEnabled ? 'ON' : 'OFF'} · ` +
    `audit=${cfg.auditEnabled ? 'ON' : 'OFF'}`,
  );
}

// ─────────────────────────────────────────────────────────────────────────
//  6. QUERIES (compat v1 + extensions)
// ─────────────────────────────────────────────────────────────────────────

/** v1 compat — exclut les soft-deleted. */
export function getAllCharacters(core: Intellectus): EtherCharacter[] {
  return (core.memory.values<EtherCharacter>('characters') || [])
    .filter((c) => !c.deleted)
    .sort((a, b) => b.updatedAt - a.updatedAt);
}

/** v1 compat. */
export function getCharactersByOwner(
  core: Intellectus,
  ownerId: string,
): EtherCharacter[] {
  return getAllCharacters(core).filter((c) => c.ownerId === ownerId);
}

/** 🆕 Récupère un personnage par ID (inclut soft-deleted si opts). */
export function getCharacterById(
  core: Intellectus,
  characterId: string,
  opts?: { includeDeleted?: boolean },
): EtherCharacter | null {
  const char = core.memory.get<EtherCharacter>('characters', characterId);
  if (!char) return null;
  if (char.deleted && !opts?.includeDeleted) return null;
  return char;
}

/** 🆕 Liste des personnages supprimés (soft-delete audit). */
export function getDeletedCharacters(core: Intellectus): EtherCharacter[] {
  return (core.memory.values<EtherCharacter>('characters') || [])
    .filter((c) => c.deleted)
    .sort((a, b) => (b.deletedAt ?? 0) - (a.deletedAt ?? 0));
}

/** 🆕 Recherche par nom (insensible à la casse). */
export function findCharactersByName(
  core: Intellectus,
  name: string,
  opts?: { exact?: boolean },
): EtherCharacter[] {
  const needle = name.toLowerCase().trim();
  return getAllCharacters(core).filter((c) => {
    const hay = c.name.toLowerCase();
    return opts?.exact ? hay === needle : hay.includes(needle);
  });
}

// ─────────────────────────────────────────────────────────────────────────
//  7. STATS (v1 compat + extensions)
// ─────────────────────────────────────────────────────────────────────────

export function getCharacterStats(core: Intellectus) {
  const all = getAllCharacters(core);
  const deleted = getDeletedCharacters(core);

  const byAura: Record<string, number> = {};
  const byNationality: Record<string, number> = {};
  const byOwner: Record<string, number> = {};
  let totalSpawns = 0;

  for (const c of all) {
    if (c.activeAura) byAura[c.activeAura] = (byAura[c.activeAura] ?? 0) + 1;
    if (c.nationality) byNationality[c.nationality] = (byNationality[c.nationality] ?? 0) + 1;
    byOwner[c.ownerId] = (byOwner[c.ownerId] ?? 0) + 1;
    totalSpawns += c.spawnCount || 0;
  }

  // 🆕 Top-N
  const topAuras = Object.entries(byAura)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([id, count]) => ({ id, count }));

  const topNationalities = Object.entries(byNationality)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, count]) => ({ name, count }));

  const topOwners = Object.entries(byOwner)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([ownerId, count]) => ({ ownerId, count }));

  return {
    // v1 compat
    total: all.length,
    totalSpawns,
    byAura,
    byNationality,
    withAura: all.filter((c) => c.activeAura && c.activeAura !== 'none').length,

    // v2 extensions
    deletedCount: deleted.length,
    avgSpawnPerChar: all.length > 0 ? Math.round(totalSpawns / all.length) : 0,
    topAuras,
    topNationalities,
    topOwners,
    schemaVersion: CHARACTER_SCHEMA_VERSION,
  };
}

/** 🆕 Health check : détecte les chars corrompus. */
export function auditCharacterIntegrity(core: Intellectus): {
  total: number;
  corrupt: number;
  issues: Array<{ id: string; problem: string }>;
} {
  const all = core.memory.values<EtherCharacter>('characters') || [];
  const issues: Array<{ id: string; problem: string }> = [];

  for (const c of all) {
    if (!c.id) issues.push({ id: '?', problem: 'id manquant' });
    if (!c.ownerId) issues.push({ id: c.id, problem: 'ownerId manquant' });
    if (!c.name) issues.push({ id: c.id, problem: 'name manquant' });
    if (c.cash < 0) issues.push({ id: c.id, problem: `cash négatif (${c.cash})` });
    if (c.bank < 0) issues.push({ id: c.id, problem: `bank négatif (${c.bank})` });
    if (!Number.isFinite(c.spawnCount)) {
      issues.push({ id: c.id, problem: `spawnCount invalide (${c.spawnCount})` });
    }
  }

  return {
    total: all.length,
    corrupt: issues.length,
    issues,
  };
}

/** 🆕 Reset rate-limits (debug/admin). */
export function resetRateLimits(): void {
  CREATION_TIMES.clear();
  SPAWN_TIMES.clear();
  RENAME_TIMES.clear();
}