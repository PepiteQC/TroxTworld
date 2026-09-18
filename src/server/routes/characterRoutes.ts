// ═══════════════════════════════════════════════════════════════════════════
//  CHARACTER ROUTES — API REST PERSONNAGES & GESTION DES IDENTITÉS RP
//  server/routes/characterRoutes.ts
//  Création · Personnalisation · Spawns · Sauvegardes · Export/Import BDD
// ═══════════════════════════════════════════════════════════════════════════

import type { Express, Request, Response, NextFunction } from 'express';
import crypto from 'node:crypto';
import { intellectus } from '../intellectus';
import {
  getAllCharacters,
  getCharactersByOwner,
  getCharacterStats,
  EtherCharacter,
} from '../systems/CharacterSystem';

// ─── MIDDLEWARE SÉCURITÉ ADMIN ─────────────────────────────────────────────

function requireAdminMiddleware(req: Request, res: Response, next: NextFunction): void {
  const key = (req.headers['x-admin-key'] ?? req.query.adminKey ?? '') as string;
  const expected = process.env.ADMIN_KEY ?? 'troxt-dev-key';

  if (!key || key.length !== expected.length) {
    res.status(403).json({ ok: false, error: 'Accès refusé : Clé administrateur invalide' });
    return;
  }

  // Comparaison en temps constant anti-timing attacks
  const keyBuffer = Buffer.from(key);
  const expectedBuffer = Buffer.from(expected);
  
  if (!crypto.timingSafeEqual(keyBuffer, expectedBuffer)) {
    res.status(403).json({ ok: false, error: 'Accès refusé : Clé administrateur invalide' });
    return;
  }

  next();
}

// ─── VALIDATEUR DE DONNÉES DE PERSONNAGE ───────────────────────────────────

function validateCharacterInput(data: any): { valid: boolean; error?: string; clean?: Partial<EtherCharacter> } {
  if (!data || typeof data !== 'object') {
    return { valid: false, error: 'Payload de personnage invalide' };
  }

  const name = String(data.name || data.fullname || `${data.firstName || ''} ${data.lastName || ''}`).trim();
  if (name.length < 2 || name.length > 50) {
    return { valid: false, error: 'Le nom du personnage doit contenir entre 2 et 50 caractères' };
  }

  // Assainissement des valeurs
  const clean: Partial<EtherCharacter> = {
    id: data.id || `char_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    name,
    ownerId: String(data.ownerId || 'web_user'),
    gender: data.gender === 'female' ? 'female' : 'male',
    age: Math.max(18, Math.min(100, Number(data.age) || 25)),
    job: data.job || 'Civil',
    cash: Math.max(0, Math.min(5000, Number(data.cash) || 500)), // Plafond départ anti-triche
    bank: Math.max(0, Math.min(50000, Number(data.bank) || 2500)),
    aura: data.aura || 'none',
    appearance: data.appearance || {
      model: data.gender === 'female' ? 'mp_f_freemode_01' : 'mp_m_freemode_01',
      skinTone: Number(data.skinTone) || 0,
      hairStyle: Number(data.hairStyle) || 0,
      hairColor: String(data.hairColor || '#1a1a1a'),
      clothingTop: Number(data.clothingTop) || 0,
      clothingBottom: Number(data.clothingBottom) || 0,
      clothingShoes: Number(data.clothingShoes) || 0,
    },
    traits: Array.isArray(data.traits) ? data.traits : [],
    createdAt: data.createdAt || Date.now(),
    lastPlayed: Date.now(),
  };

  return { valid: true, clean };
}

// ─────────────────────────────────────────────────────────────────────────────
// ENREGISTREMENT DES ROUTES REST
// ─────────────────────────────────────────────────────────────────────────────

export function mountCharacterRoutes(app: Express): void {

  // ── 📋 1. LISTE COMPLÈTE (OwnerMenu / Admin) ─────────────────────────────
  app.get('/api/characters', (_req: Request, res: Response) => {
    try {
      // Utilise CharacterSystem ou interroge directement LotusStore en fallback
      let characters = [];
      if (typeof getAllCharacters === 'function') {
        characters = getAllCharacters(intellectus);
      } else {
        characters = intellectus.memory.values<EtherCharacter>('characters') || [];
      }
      res.json({ ok: true, characters, count: characters.length });
    } catch (err: any) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // ── 📊 2. STATISTIQUES GLOBALES (Compteurs & Répartitions) ───────────────
  app.get('/api/characters/stats', (_req: Request, res: Response) => {
    try {
      let stats = null;
      if (typeof getCharacterStats === 'function') {
        stats = getCharacterStats(intellectus);
      } else {
        const all = intellectus.memory.values<EtherCharacter>('characters') || [];
        stats = {
          total: all.length,
          byJob: all.reduce((acc: any, c: any) => {
            acc[c.job] = (acc[c.job] || 0) + 1;
            return acc;
          }, {}),
          totalCash: all.reduce((sum, c) => sum + (c.cash || 0), 0),
          totalBank: all.reduce((sum, c) => sum + (c.bank || 0), 0),
        };
      }
      res.json({ ok: true, stats });
    } catch (err: any) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // ── 👤 3. PERSONNAGES D'UN JOUEUR (Menu de sélection) ────────────────────
  app.get('/api/characters/owner/:ownerId', (req: Request, res: Response) => {
    try {
      const ownerId = req.params.ownerId;
      let characters: EtherCharacter[] = [];

      if (typeof getCharactersByOwner === 'function') {
        characters = getCharactersByOwner(intellectus, ownerId);
      } else {
        const all = intellectus.memory.values<EtherCharacter>('characters') || [];
        characters = all.filter((c) => c.ownerId === ownerId);
      }

      res.json({ ok: true, characters, count: characters.length });
    } catch (err: any) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // ── 🔍 4. UN PERSONNAGE PRÉCIS PAR ID ───────────────────────────────────
  app.get('/api/characters/:id', (req: Request, res: Response) => {
    try {
      const character = intellectus.memory.get<EtherCharacter>('characters', req.params.id);
      if (!character) {
        return res.status(404).json({ ok: false, error: 'Personnage introuvable' });
      }
      res.json({ ok: true, character });
    } catch (err: any) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // ── 💾 5. CRÉER OU SAUVEGARDER UN PERSONNAGE ────────────────────────────
  app.post('/api/characters/save', async (req: Request, res: Response) => {
    try {
      const { character: rawData, ownerId } = req.body ?? {};
      const validation = validateCharacterInput({ ...rawData, ownerId: ownerId || rawData?.ownerId });

      if (!validation.valid || !validation.clean) {
        return res.status(400).json({ ok: false, error: validation.error });
      }

      const character = validation.clean;

      // Sauvegarde dans LotusStore
      intellectus.memory.set('characters', character.id!, character, true);

      // Notification sur le bus
      await intellectus.emit('character', 'saved', {
        characterId: character.id,
        ownerId: character.ownerId,
        name: character.name,
      });

      res.status(201).json({
        ok: true,
        result: character,
        message: `✅ Personnage [${character.name}] enregistré avec succès.`,
      });
    } catch (err: any) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // ── 🎨 6. METTRE À JOUR L'APPARENCE (Barbier / Vêtements RP) ─────────────
  app.patch('/api/characters/:id/appearance', async (req: Request, res: Response) => {
    try {
      const characterId = req.params.id;
      const character = intellectus.memory.get<EtherCharacter>('characters', characterId);

      if (!character) {
        return res.status(404).json({ ok: false, error: 'Personnage introuvable' });
      }

      const { appearance, aura } = req.body ?? {};
      if (appearance) character.appearance = { ...character.appearance, ...appearance };
      if (aura) character.aura = aura;
      character.lastPlayed = Date.now();

      intellectus.memory.set('characters', characterId, character, true);

      await intellectus.emit('character', 'appearance_updated', {
        characterId,
        appearance: character.appearance,
      });

      res.json({ ok: true, character, message: '🎨 Apparence mise à jour.' });
    } catch (err: any) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // ── 🎮 7. FAIRE APPARAÎTRE DANS LE MONDE (Spawn) ─────────────────────────
  app.post('/api/characters/spawn', async (req: Request, res: Response) => {
    try {
      const { characterId, playerId } = req.body ?? {};
      if (!characterId) {
        return res.status(400).json({ ok: false, error: 'characterId requis' });
      }

      const character = intellectus.memory.get<EtherCharacter>('characters', characterId);
      if (!character) {
        return res.status(404).json({ ok: false, error: 'Personnage introuvable' });
      }

      // Initialisation du joueur actif
      const playerSession = {
        id: playerId || character.ownerId,
        characterId: character.id,
        name: character.name,
        job: character.job || 'Civil',
        cash: character.cash || 500,
        bank: character.bank || 2500,
        gang: character.gang || 'Aucun',
        aura: character.aura || 'none',
        appearance: character.appearance,
        health: 100,
        armor: 0,
        position: [0, 1, 10],
        rotation: 0,
        wanted: 0,
        lastSeen: Date.now(),
      };

      intellectus.memory.set('players', playerSession.id, playerSession, true);
      await intellectus.emit('player', 'spawned', playerSession);

      res.json({ ok: true, result: playerSession });
    } catch (err: any) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // ── 🗑️ 8. SUPPRIMER UN PERSONNAGE (Admin ou Propriétaire) ────────────────
  app.delete('/api/characters/:id', requireAdminMiddleware, async (req: Request, res: Response) => {
    try {
      const characterId = req.params.id;
      const character = intellectus.memory.get<EtherCharacter>('characters', characterId);

      if (!character) {
        return res.status(404).json({ ok: false, error: 'Personnage introuvable' });
      }

      intellectus.memory.delete('characters', characterId);
      await intellectus.emit('character', 'deleted', { characterId, name: character.name });

      res.json({ ok: true, message: `🗑 Personnage [${character.name}] supprimé.` });
    } catch (err: any) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // Alias POST pour compatibilité legacy avec OwnerMenu
  app.post('/api/characters/delete', requireAdminMiddleware, async (req: Request, res: Response) => {
    try {
      const { characterId } = req.body ?? {};
      if (!characterId) return res.status(400).json({ ok: false, error: 'characterId requis' });

      intellectus.memory.delete('characters', characterId);
      await intellectus.emit('character', 'deleted', { characterId });

      res.json({ ok: true, message: 'Personnage supprimé avec succès.' });
    } catch (err: any) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // ── 📤 9. EXPORTER LA BASE DE DONNÉES EN JSON ────────────────────────────
  app.get('/api/characters/export/json', requireAdminMiddleware, (_req: Request, res: Response) => {
    try {
      const characters = intellectus.memory.values<EtherCharacter>('characters') || [];
      const filename = `troxt_characters_backup_${new Date().toISOString().split('T')[0]}.json`;

      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.json({
        engine: 'TroxtWorld Intellectus',
        version: 1,
        exportedAt: new Date().toISOString(),
        count: characters.length,
        characters,
      });
    } catch (err: any) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // ── 📥 10. IMPORTER UN BACKUP JSON DANS LA BDD ───────────────────────────
  app.post('/api/characters/import', requireAdminMiddleware, (req: Request, res: Response) => {
    try {
      const { characters } = req.body ?? {};
      if (!Array.isArray(characters)) {
        return res.status(400).json({ ok: false, error: 'Format JSON invalide (tableau \'characters\' attendu)' });
      }

      let imported = 0;
      for (const char of characters) {
        if (char && char.id && char.name) {
          intellectus.memory.set('characters', char.id, char);
          imported++;
        }
      }

      // Sauvegarde immédiate sur disque
      intellectus.memory.snapshot('characters', 'admin_import');

      res.json({
        ok: true,
        importedCount: imported,
        message: `📥 Import réussi : ${imported} personnage(s) restauré(s).`,
      });
    } catch (err: any) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  console.log('👤 [Routes] 10 endpoints Personnages montés avec succès (/api/characters/*)');
}