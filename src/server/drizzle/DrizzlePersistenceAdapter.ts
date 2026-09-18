// ═══════════════════════════════════════════════════════════════════════════
//  DRIZZLE PERSISTENCE ADAPTER — IMPLÉMENTATION SQLITE ULTRA-PERFORMANTE
//  server/drizzle/DrizzlePersistenceAdapter.ts
//  Transactions atomiques · Écritures groupées (Batching) · Zéro duplication
// ═══════════════════════════════════════════════════════════════════════════

import { eq, and } from 'drizzle-orm';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import {
  characters, inventoryItems, vehicles, properties,
  accessKeys, licenses, criminalRecords, worldState,
  transactions, sessions,
} from './schema';
import type {
  PersistenceAdapter, PlayerSaveState, PlayerDelta,
} from '../systems/PersistenceService';

function uid(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9).toUpperCase()}`;
}

export class DrizzlePersistenceAdapter implements PersistenceAdapter {
  constructor(private db: BetterSQLite3Database<any>) {}

  // ─────────────────────────────────────────────────────────────────────────
  //  1. CHARGEMENT ET RESTAURATION (LOAD)
  // ─────────────────────────────────────────────────────────────────────────

  async loadPlayer(characterId: string): Promise<PlayerSaveState | null> {
    const rows = await this.db.select().from(characters)
      .where(eq(characters.id, characterId)).limit(1);
    const c = rows[0];
    if (!c) return null;

    // Chargement parallèle de toutes les tables dépendantes pour minimiser la latence
    const [inv, vehs, props, keys, lics, records] = await Promise.all([
      this.db.select().from(inventoryItems)
        .where(and(
          eq(inventoryItems.ownerType, 'character'),
          eq(inventoryItems.ownerId, characterId)
        )),
      this.db.select().from(vehicles).where(eq(vehicles.ownerId, characterId)),
      this.db.select().from(properties).where(eq(properties.ownerId, characterId)),
      this.db.select().from(accessKeys).where(eq(accessKeys.characterId, characterId)),
      this.db.select().from(licenses).where(eq(licenses.characterId, characterId)),
      this.db.select().from(criminalRecords).where(eq(criminalRecords.characterId, characterId)),
    ]);

    return {
      characterId: c.id,
      accountId: c.accountId,
      identity: {
        firstName: c.firstName,
        lastName: c.lastName,
        gender: c.gender as 'male' | 'female',
        nationality: c.nationality,
        phoneNumber: c.phoneNumber ?? undefined,
        appearance: (c.appearance as Record<string, any>) ?? {},
        activeAura: c.activeAura,
      },
      position: {
        x: c.posX,
        y: c.posY,
        z: c.posZ,
        rotation: c.rotation,
        zone: c.currentZone ?? 'Portneuf',
        interiorId: c.interiorId,
      },
      economy: { cash: c.cash, bank: c.bank, dirtyMoney: c.dirtyMoney },
      job: {
        name: c.job,
        grade: c.jobGrade,
        hoursWorked: c.jobHoursWorked,
        onDuty: c.onDuty,
        lastPaycheckAt: c.lastPaycheckAt ? c.lastPaycheckAt.getTime() : null,
      },
      status: {
        health: c.health,
        armor: c.armor,
        hunger: c.hunger,
        thirst: c.thirst,
        stress: c.stress,
        isDead: c.isDead,
        isCuffed: c.isCuffed,
        inJailUntil: c.inJailUntil ? c.inJailUntil.getTime() : null,
        wantedLevel: c.wantedLevel,
        bounty: c.bounty,
      },
      gang: { id: c.gangId, rank: c.gangRank },
      inventory: inv.map((i) => ({
        id: i.id,
        itemId: i.itemId,
        itemName: i.itemName,
        category: i.category,
        quantity: i.quantity,
        slot: i.slot ?? undefined,
        weight: i.weight,
        durability: i.durability ?? undefined,
        serialNumber: i.serialNumber ?? undefined,
        metadata: (i.metadata as Record<string, any>) ?? {},
      })),
      vehicles: vehs.map((v) => ({
        id: v.id,
        model: v.model,
        displayName: v.displayName,
        plate: v.plate,
        vin: v.vin,
        primaryColor: v.primaryColor,
        secondaryColor: v.secondaryColor ?? undefined,
        mods: (v.mods as Record<string, any>) ?? {},
        fuel: v.fuel,
        engineHealth: v.engineHealth,
        bodyHealth: v.bodyHealth,
        mileageKm: v.mileageKm,
        garageId: v.garageId,
        isStored: v.isStored,
        isImpounded: v.isImpounded,
        isStolen: v.isStolen,
        position: v.posX !== null ? {
          x: v.posX!,
          y: v.posY!,
          z: v.posZ!,
          rotation: v.rotation!,
        } : undefined,
      })),
      properties: props.map((p) => ({
        id: p.id,
        name: p.name,
        address: p.address,
        villageName: p.villageName,
        propertyType: p.propertyType,
        locked: p.locked,
        condition: p.condition,
        taxDueAt: p.taxDueAt ? p.taxDueAt.getTime() : null,
      })),
      keys: keys.map((k) => ({
        targetType: k.targetType as 'property' | 'vehicle',
        targetId: k.targetId,
      })),
      licenses: lics.map((l) => ({
        licenseType: l.licenseType,
        issuedAt: l.issuedAt.getTime(),
        expiresAt: l.expiresAt ? l.expiresAt.getTime() : null,
        points: l.points,
        suspended: l.suspended,
      })),
      criminalRecord: records.map((r) => ({
        offense: r.offense,
        fine: r.fine,
        jailMinutes: r.jailMinutes,
        paid: r.paid,
        occurredAt: r.occurredAt.getTime(),
        officerName: r.officerName ?? undefined,
      })),
      meta: {
        createdAt: c.createdAt.getTime(),
        updatedAt: c.updatedAt.getTime(),
        lastSeenAt: c.lastSeenAt ? c.lastSeenAt.getTime() : c.updatedAt.getTime(),
        playtimeSeconds: c.playtimeSeconds,
        spawnCount: c.spawnCount,
      },
    };
  }

  async loadPlayersByAccount(accountId: string): Promise<PlayerSaveState[]> {
    const rows = await this.db.select({ id: characters.id }).from(characters)
      .where(eq(characters.accountId, accountId));
    const states = await Promise.all(rows.map((r) => this.loadPlayer(r.id)));
    return states.filter((s): s is PlayerSaveState => s !== null);
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  2. SAUVEGARDE COMPLÈTE TRANSACTIONNELLE (CHECKPOINT)
  // ─────────────────────────────────────────────────────────────────────────

  async savePlayer(state: PlayerSaveState): Promise<void> {
    const now = new Date();

    this.db.transaction((tx) => {
      // A. Personnage (Upsert)
      tx.insert(characters).values({
        id: state.characterId,
        accountId: state.accountId,
        firstName: state.identity.firstName,
        lastName: state.identity.lastName,
        gender: state.identity.gender,
        nationality: state.identity.nationality,
        phoneNumber: state.identity.phoneNumber,
        appearance: state.identity.appearance,
        activeAura: state.identity.activeAura,
        posX: state.position.x,
        posY: state.position.y,
        posZ: state.position.z,
        rotation: state.position.rotation,
        currentZone: state.position.zone,
        interiorId: state.position.interiorId,
        cash: state.economy.cash,
        bank: state.economy.bank,
        dirtyMoney: state.economy.dirtyMoney,
        job: state.job.name,
        jobGrade: state.job.grade,
        jobHoursWorked: state.job.hoursWorked,
        onDuty: state.job.onDuty,
        lastPaycheckAt: state.job.lastPaycheckAt ? new Date(state.job.lastPaycheckAt) : null,
        health: state.status.health,
        armor: state.status.armor,
        hunger: state.status.hunger,
        thirst: state.status.thirst,
        stress: state.status.stress,
        isDead: state.status.isDead,
        isCuffed: state.status.isCuffed,
        inJailUntil: state.status.inJailUntil ? new Date(state.status.inJailUntil) : null,
        wantedLevel: state.status.wantedLevel,
        bounty: state.status.bounty,
        gangId: state.gang.id,
        gangRank: state.gang.rank,
        createdAt: new Date(state.meta.createdAt),
        updatedAt: now,
        lastSeenAt: now,
        playtimeSeconds: state.meta.playtimeSeconds,
        spawnCount: state.meta.spawnCount,
      }).onConflictDoUpdate({
        target: characters.id,
        set: {
          posX: state.position.x,
          posY: state.position.y,
          posZ: state.position.z,
          rotation: state.position.rotation,
          currentZone: state.position.zone,
          interiorId: state.position.interiorId,
          cash: state.economy.cash,
          bank: state.economy.bank,
          dirtyMoney: state.economy.dirtyMoney,
          job: state.job.name,
          jobGrade: state.job.grade,
          jobHoursWorked: state.job.hoursWorked,
          onDuty: state.job.onDuty,
          lastPaycheckAt: state.job.lastPaycheckAt ? new Date(state.job.lastPaycheckAt) : null,
          health: state.status.health,
          armor: state.status.armor,
          hunger: state.status.hunger,
          thirst: state.status.thirst,
          stress: state.status.stress,
          isDead: state.status.isDead,
          isCuffed: state.status.isCuffed,
          inJailUntil: state.status.inJailUntil ? new Date(state.status.inJailUntil) : null,
          wantedLevel: state.status.wantedLevel,
          bounty: state.status.bounty,
          gangId: state.gang.id,
          gangRank: state.gang.rank,
          activeAura: state.identity.activeAura,
          appearance: state.identity.appearance,
          updatedAt: now,
          lastSeenAt: now,
          playtimeSeconds: state.meta.playtimeSeconds,
          spawnCount: state.meta.spawnCount,
        },
      }).run();

      // B. Remplacement sécurisé de l'inventaire
      tx.delete(inventoryItems).where(and(
        eq(inventoryItems.ownerType, 'character'),
        eq(inventoryItems.ownerId, state.characterId)
      )).run();

      for (const item of state.inventory) {
        tx.insert(inventoryItems).values({
          id: item.id || uid('inv'),
          ownerType: 'character',
          ownerId: state.characterId,
          itemId: item.itemId,
          itemName: item.itemName,
          category: item.category,
          quantity: item.quantity,
          slot: item.slot,
          weight: item.weight,
          durability: item.durability,
          serialNumber: item.serialNumber,
          metadata: item.metadata ?? {},
          createdAt: now,
          updatedAt: now,
        }).run();
      }

      // C. Sauvegarde des véhicules (Jamais purgés, Upsert)
      for (const v of state.vehicles) {
        tx.insert(vehicles).values({
          id: v.id,
          ownerId: state.characterId,
          ownerType: 'character',
          model: v.model,
          displayName: v.displayName,
          plate: v.plate,
          vin: v.vin,
          primaryColor: v.primaryColor,
          secondaryColor: v.secondaryColor,
          mods: v.mods,
          fuel: v.fuel,
          engineHealth: v.engineHealth,
          bodyHealth: v.bodyHealth,
          mileageKm: v.mileageKm,
          posX: v.position?.x,
          posY: v.position?.y,
          posZ: v.position?.z,
          rotation: v.position?.rotation,
          garageId: v.garageId,
          isStored: v.isStored,
          isImpounded: v.isImpounded,
          isStolen: v.isStolen,
          createdAt: now,
          updatedAt: now,
        }).onConflictDoUpdate({
          target: vehicles.id,
          set: {
            fuel: v.fuel,
            engineHealth: v.engineHealth,
            bodyHealth: v.bodyHealth,
            mileageKm: v.mileageKm,
            posX: v.position?.x,
            posY: v.position?.y,
            posZ: v.position?.z,
            rotation: v.position?.rotation,
            garageId: v.garageId,
            isStored: v.isStored,
            isImpounded: v.isImpounded,
            mods: v.mods,
            updatedAt: now,
          },
        }).run();
      }

      // D. Propriétés immobilières
      for (const p of state.properties) {
        tx.update(properties).set({
          ownerId: state.characterId,
          locked: p.locked,
          condition: p.condition,
          taxDueAt: p.taxDueAt ? new Date(p.taxDueAt) : null,
          updatedAt: now,
        }).where(eq(properties.id, p.id)).run();
      }

      // E. Clés d'accès physique
      tx.delete(accessKeys).where(eq(accessKeys.characterId, state.characterId)).run();
      for (const k of state.keys) {
        tx.insert(accessKeys).values({
          id: uid('key'),
          characterId: state.characterId,
          targetType: k.targetType,
          targetId: k.targetId,
          grantedAt: now,
        }).run();
      }

      // F. Permis de conduire & Licences
      for (const l of state.licenses) {
        tx.insert(licenses).values({
          id: uid('lic'),
          characterId: state.characterId,
          licenseType: l.licenseType as any,
          issuedAt: new Date(l.issuedAt),
          expiresAt: l.expiresAt ? new Date(l.expiresAt) : null,
          points: l.points,
          suspended: l.suspended,
        }).onConflictDoUpdate({
          target: [licenses.characterId, licenses.licenseType],
          set: {
            points: l.points,
            suspended: l.suspended,
            expiresAt: l.expiresAt ? new Date(l.expiresAt) : null,
          },
        }).run();
      }
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  3. ÉCRITURE PAR LOT DES AUTOSAVES (FAST BATCHING)
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * ⚡ Version ultra-rapide exécutée dans une unique transaction SQLite
   */
  async applyDeltaBatch(deltas: PlayerDelta[]): Promise<void> {
    const now = new Date();

    this.db.transaction((tx) => {
      for (const delta of deltas) {
        const patch: Record<string, any> = { updatedAt: now };

        if (delta.position) {
          patch.posX = delta.position.x;
          patch.posY = delta.position.y;
          patch.posZ = delta.position.z;
          patch.rotation = delta.position.rotation;
          patch.currentZone = delta.position.zone;
        }
        if (delta.economy) {
          if (delta.economy.cash !== undefined) patch.cash = delta.economy.cash;
          if (delta.economy.bank !== undefined) patch.bank = delta.economy.bank;
          if (delta.economy.dirtyMoney !== undefined) patch.dirtyMoney = delta.economy.dirtyMoney;
        }
        if (delta.status) {
          const s = delta.status;
          if (s.health !== undefined) patch.health = s.health;
          if (s.armor !== undefined) patch.armor = s.armor;
          if (s.hunger !== undefined) patch.hunger = s.hunger;
          if (s.thirst !== undefined) patch.thirst = s.thirst;
          if (s.stress !== undefined) patch.stress = s.stress;
          if (s.wantedLevel !== undefined) patch.wantedLevel = s.wantedLevel;
          if (s.isDead !== undefined) patch.isDead = s.isDead;
        }
        if (delta.job) {
          if (delta.job.name) patch.job = delta.job.name;
          if (delta.job.onDuty !== undefined) patch.onDuty = delta.job.onDuty;
          if (delta.job.hoursWorked !== undefined) patch.jobHoursWorked = delta.job.hoursWorked;
        }
        if (delta.playtimeSeconds !== undefined) {
          patch.playtimeSeconds = delta.playtimeSeconds;
        }

        tx.update(characters).set(patch)
          .where(eq(characters.id, delta.characterId)).run();
      }
    });
  }

  // Fallback unitaire
  async applyDelta(delta: PlayerDelta): Promise<void> {
    await this.applyDeltaBatch([delta]);
  }

  async deletePlayer(characterId: string): Promise<void> {
    // Les contraintes SQL Cascade du schéma suppriment l'inventaire et les dépendances liées.
    await this.db.delete(characters).where(eq(characters.id, characterId));
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  4. ETAT DU MONDE (COFFRES & PORTES)
  // ─────────────────────────────────────────────────────────────────────────

  async saveWorldState(
    id: string, type: string, state: any, village?: string
  ): Promise<void> {
    await this.db.insert(worldState).values({
      id,
      stateType: type,
      villageName: village,
      state,
      updatedAt: new Date(),
    }).onConflictDoUpdate({
      target: worldState.id,
      set: { state, updatedAt: new Date() },
    });
  }

  async loadWorldState(type?: string): Promise<Array<{ id: string; state: any }>> {
    const rows = type
      ? await this.db.select().from(worldState).where(eq(worldState.stateType, type))
      : await this.db.select().from(worldState);
    return rows.map((r) => ({ id: r.id, state: r.state }));
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  5. TRANSACTIONS FINANCIÈRES & TEMPS DE JEU (SESSIONS)
  // ─────────────────────────────────────────────────────────────────────────

  async logTransaction(tx: {
    characterId: string;
    type: string;
    amount: number;
    balanceAfter: number;
    account: string;
    counterpartyId?: string;
    description?: string;
    villageName?: string;
  }): Promise<void> {
    await this.db.insert(transactions).values({
      id: uid('tx'),
      characterId: tx.characterId,
      type: tx.type,
      amount: tx.amount,
      balanceAfter: tx.balanceAfter,
      account: tx.account as any,
      counterpartyId: tx.counterpartyId,
      description: tx.description,
      villageName: tx.villageName,
      createdAt: new Date(),
    });
  }

  async openSession(characterId: string): Promise<string> {
    const id = uid('sess');
    await this.db.insert(sessions).values({
      id,
      characterId,
      startedAt: new Date(),
    });
    return id;
  }

  async closeSession(sessionId: string, reason: string, snapshot: any): Promise<void> {
    const rows = await this.db.select().from(sessions)
      .where(eq(sessions.id, sessionId)).limit(1);
    const s = rows[0];
    if (!s) return;

    const now = new Date();
    const duration = Math.round((now.getTime() - s.startedAt.getTime()) / 1000);

    await this.db.update(sessions).set({
      endedAt: now,
      durationSeconds: duration,
      disconnectReason: reason,
      lastSnapshot: snapshot,
    }).where(eq(sessions.id, sessionId));
  }
}

// ─────────────────────────────────────────────────────────────────────────
//  6. METHODE FACTORY (INITIALISATION DU CONTEXTE SQLITE WAL)
// ─────────────────────────────────────────────────────────────────────────

export async function createDrizzleAdapter(
  dbPath = './data/etherworld.db'
): Promise<DrizzlePersistenceAdapter | null> {
  try {
    const sqliteMod: any = await import('better-sqlite3').catch(() => null);
    const drizzleMod: any = await import('drizzle-orm/better-sqlite3').catch(() => null);
    
    if (!sqliteMod || !drizzleMod) {
      console.warn('⚠️ [Drizzle] better-sqlite3 ou drizzle-orm manquants — Persistance mémoire temporaire active.');
      return null;
    }

    const Database = sqliteMod.default ?? sqliteMod;
    const sqlite = new Database(dbPath);
    
    // Activation des optimisations SQLite pour l'écriture concurrente
    sqlite.pragma('journal_mode = WAL');
    sqlite.pragma('synchronous = NORMAL');
    sqlite.pragma('foreign_keys = ON'); // Sécurité des clés cascades activée

    const db = drizzleMod.drizzle(sqlite);
    console.log(`💾 [Drizzle] Adaptateur SQLite connecté et optimisé : ${dbPath}`);
    return new DrizzlePersistenceAdapter(db);
  } catch (err) {
    console.warn('⚠️ [Drizzle] Échec de la connexion à la base de données :', err);
    return null;
  }
}