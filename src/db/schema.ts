// ═══════════════════════════════════════════════════════════════════════════
//  DATABASE SCHEMA (POSTGRESQL / PGADMIN / DRIZZLE ORM)
//  src/db/schema.ts
//  Architecture RP Avancée · Enums Natifs · Inventaires Polymorphes · Auto-Dates
// ═══════════════════════════════════════════════════════════════════════════

import {
  pgTable,
  text,
  varchar,
  integer,
  boolean,
  timestamp,
  jsonb,
  real,
  index,
  uniqueIndex,
  pgEnum,
  serial,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// ─────────────────────────────────────────────────────────────────────────────
// 0. ENUMS POSTGRESQL (Types stricts et ultra-performants)
// ─────────────────────────────────────────────────────────────────────────────
export const roleEnum = pgEnum('user_role', ['citizen', 'mod', 'admin', 'owner']);
export const genderEnum = pgEnum('character_gender', ['male', 'female']);
export const itemOwnerEnum = pgEnum('item_owner_type', ['character', 'vehicle', 'property', 'gang']);
export const propTypeEnum = pgEnum('property_type', ['house', 'hotel_room', 'business', 'warehouse', 'garage']);

// ─────────────────────────────────────────────────────────────────────────────
// 1. COMPTES UTILISATEURS & SESSIONS (AUTH / DISCORD / WEB)
// ─────────────────────────────────────────────────────────────────────────────
export const users = pgTable(
  'users',
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    name: varchar('name', { length: 64 }).notNull(),
    email: varchar('email', { length: 255 }).notNull().unique(),
    emailVerified: boolean('email_verified').default(false).notNull(),
    role: roleEnum('role').default('citizen').notNull(),
    banned: boolean('banned').default(false).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' })
      .defaultNow()
      .$onUpdateFn(() => new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex('idx_users_email').on(table.email),
    index('idx_users_name').on(table.name),
  ]
);

export const sessions = pgTable('sessions', {
  id: varchar('id', { length: 64 }).primaryKey(),
  userId: varchar('user_id', { length: 64 }).notNull().references(() => users.id, { onDelete: 'cascade' }),
  token: text('token').notNull().unique(),
  expiresAt: timestamp('expires_at', { withTimezone: true, mode: 'date' }).notNull(),
  ipAddress: varchar('ip_address', { length: 45 }),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. GANGS, FACTIONS & BUSINESS (SQDC, Fermes, etc.)
// ─────────────────────────────────────────────────────────────────────────────
export const gangs = pgTable('gangs', {
  id: varchar('id', { length: 64 }).primaryKey(),
  name: varchar('name', { length: 64 }).notNull().unique(),
  color: varchar('color', { length: 16 }).default('#FFFFFF').notNull(),
  leaderId: varchar('leader_id', { length: 64 }),
  reputation: integer('reputation').default(0).notNull(),
  treasury: integer('treasury').default(0).notNull(),
  isBusiness: boolean('is_business').default(false).notNull(), // Ex: True pour SQDC ou Portneuf Auto
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. PERSONNAGES CITOYENS
// ─────────────────────────────────────────────────────────────────────────────
export const characters = pgTable(
  'characters',
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    userId: varchar('user_id', { length: 64 }).notNull().references(() => users.id, { onDelete: 'cascade' }),
    firstName: varchar('first_name', { length: 32 }).notNull(),
    lastName: varchar('last_name', { length: 32 }).notNull(),
    gender: genderEnum('gender').default('male').notNull(),
    phoneNumber: varchar('phone_number', { length: 20 }).unique(),
    job: varchar('job', { length: 32 }).default('civil').notNull(),
    gangId: varchar('gang_id', { length: 64 }).references(() => gangs.id, { onDelete: 'set null' }),

    // Économie
    cash: integer('cash').default(500).notNull(),
    bank: integer('bank').default(2500).notNull(),
    dirtyMoney: integer('dirty_money').default(0).notNull(),

    // État Physique GTA Style
    health: integer('health').default(100).notNull(),
    armor: integer('armor').default(0).notNull(),
    hunger: integer('hunger').default(100).notNull(),
    thirst: integer('thirst').default(100).notNull(),
    stress: integer('stress').default(0).notNull(),
    isDead: boolean('is_dead').default(false).notNull(),

    // Justice SQ
    wantedLevel: integer('wanted_level').default(0).notNull(),
    isHandcuffed: boolean('is_handcuffed').default(false).notNull(),
    inJailUntil: timestamp('in_jail_until', { withTimezone: true, mode: 'date' }),

    // Coordonnées 3D
    posX: real('pos_x').default(0.0).notNull(),
    posY: real('pos_y').default(1.0).notNull(),
    posZ: real('pos_z').default(10.0).notNull(),
    rotation: real('rotation').default(0.0).notNull(),
    currentZone: varchar('current_zone', { length: 64 }).default('Portneuf').notNull(),
    interiorId: varchar('interior_id', { length: 64 }), // Null si en extérieur

    // Apparence
    appearance: jsonb('appearance').default({}),
    
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).defaultNow().$onUpdateFn(() => new Date()).notNull(),
  },
  (table) => [
    index('idx_chars_user').on(table.userId),
    index('idx_chars_name').on(table.firstName, table.lastName),
    index('idx_chars_phone').on(table.phoneNumber),
  ]
);

// ─────────────────────────────────────────────────────────────────────────────
// 4. SYSTÈME TÉLÉPHONIQUE IN-GAME (Mobile)
// ─────────────────────────────────────────────────────────────────────────────
export const phoneMessages = pgTable('phone_messages', {
  id: varchar('id', { length: 64 }).primaryKey(),
  senderId: varchar('sender_id', { length: 64 }).notNull().references(() => characters.id, { onDelete: 'cascade' }),
  receiverNumber: varchar('receiver_number', { length: 20 }).notNull(),
  content: text('content').notNull(),
  isRead: boolean('is_read').default(false).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
});

export const phoneContacts = pgTable('phone_contacts', {
  id: varchar('id', { length: 64 }).primaryKey(),
  characterId: varchar('character_id', { length: 64 }).notNull().references(() => characters.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 64 }).notNull(),
  number: varchar('number', { length: 20 }).notNull(),
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. PROPRIÉTÉS, CHAMBRES D'HÔTEL & TÉLÉPHONES DE BUREAU
// ─────────────────────────────────────────────────────────────────────────────
export const properties = pgTable(
  'properties',
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    name: varchar('name', { length: 128 }).notNull(),
    type: propTypeEnum('type').default('house').notNull(),
    price: integer('price').notNull(),

    ownerId: varchar('owner_id', { length: 64 }).references(() => characters.id, { onDelete: 'set null' }),
    locked: boolean('locked').default(true).notNull(),
    
    // Feature Room Service : Téléphone fixe de la chambre/maison
    hasDeskPhone: boolean('has_desk_phone').default(false).notNull(),
    deskPhoneExt: varchar('desk_phone_ext', { length: 10 }), 

    posX: real('pos_x').notNull(),
    posY: real('pos_y').notNull(),
    posZ: real('pos_z').notNull(),
    interiorTemplate: varchar('interior_template', { length: 64 }),
    
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).defaultNow().$onUpdateFn(() => new Date()).notNull(),
  },
  (table) => [
    index('idx_props_owner').on(table.ownerId),
  ]
);

// ─────────────────────────────────────────────────────────────────────────────
// 6. VÉHICULES & TÉLÉMÉTRIE MÉCANIQUE
// ─────────────────────────────────────────────────────────────────────────────
export const vehicles = pgTable(
  'vehicles',
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    ownerId: varchar('owner_id', { length: 64 }).references(() => characters.id, { onDelete: 'cascade' }),
    model: varchar('model', { length: 64 }).notNull(),
    plate: varchar('plate', { length: 16 }).notNull().unique(),
    
    primaryColor: varchar('primary_color', { length: 32 }).default('#c0c0c0').notNull(),
    mods: jsonb('mods').default({}), // Tuning

    // Télémétrie mécanique
    fuel: real('fuel').default(100).notNull(),
    engineHealth: real('engine_health').default(1000).notNull(),
    bodyHealth: real('body_health').default(1000).notNull(),
    mileageKm: real('mileage_km').default(0).notNull(),

    // État
    locked: boolean('locked').default(true).notNull(),
    isImpounded: boolean('is_impounded').default(false).notNull(),
    garageId: varchar('garage_id', { length: 64 }), // Null si garé dans la rue

    posX: real('pos_x'),
    posY: real('pos_y'),
    posZ: real('pos_z'),
    rotation: real('rotation'),
    
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).defaultNow().$onUpdateFn(() => new Date()).notNull(),
  },
  (table) => [
    uniqueIndex('idx_vehicles_plate').on(table.plate),
    index('idx_vehicles_owner').on(table.ownerId),
    index('idx_vehicles_garage').on(table.garageId),
  ]
);

// ─────────────────────────────────────────────────────────────────────────────
// 7. INVENTAIRE POLYMORPHE (Poches, Coffre de char, Maison)
// ─────────────────────────────────────────────────────────────────────────────
export const inventoryItems = pgTable(
  'inventory_items',
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    ownerType: itemOwnerEnum('owner_type').notNull(), // Qui possède l'objet ? (Perso, Véhicule, Propriété)
    ownerId: varchar('owner_id', { length: 64 }).notNull(), // L'ID du perso, du véhicule ou de la propriété

    itemId: varchar('item_id', { length: 64 }).notNull(),
    itemName: varchar('item_name', { length: 128 }).notNull(),
    quantity: integer('quantity').default(1).notNull(),
    
    slot: integer('slot'), // Pour un UI d'inventaire en grille
    weight: real('weight').default(0).notNull(),
    durability: integer('durability').default(100).notNull(),
    metadata: jsonb('metadata').default({}), // Ex: Numéro de série d'une arme
    
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_inventory_owner').on(table.ownerType, table.ownerId),
  ]
);

// ─────────────────────────────────────────────────────────────────────────────
// 8. LOGS FINANCIERS & TICKETS SQ
// ─────────────────────────────────────────────────────────────────────────────
export const transactions = pgTable(
  'transactions',
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    characterId: varchar('character_id', { length: 64 }).notNull().references(() => characters.id, { onDelete: 'cascade' }),
    type: varchar('type', { length: 32 }).notNull(),
    amount: integer('amount').notNull(),
    account: varchar('account', { length: 32 }).default('bank').notNull(), // 'cash', 'bank', 'dirty'
    message: text('message'),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_tx_character').on(table.characterId),
  ]
);

export const policeTickets = pgTable('police_tickets', {
  id: varchar('id', { length: 64 }).primaryKey(),
  characterId: varchar('character_id', { length: 64 }).notNull().references(() => characters.id, { onDelete: 'cascade' }),
  article: varchar('article', { length: 64 }).notNull(),
  fine: integer('fine').notNull(),
  officerBadge: varchar('officer_badge', { length: 32 }).notNull(),
  paid: boolean('paid').default(false).notNull(),
  issuedAt: timestamp('issued_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
});

// ─────────────────────────────────────────────────────────────────────────────
// 9. ARMES & INVENTAIRE D'ARMES
// ─────────────────────────────────────────────────────────────────────────────
export const weapons = pgTable(
  'weapons',
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    characterId: varchar('character_id', { length: 64 }).references(() => characters.id, { onDelete: 'cascade' }),
    model: varchar('model', { length: 64 }).notNull(),
    serialNumber: varchar('serial_number', { length: 32 }).unique(),
    ammo: integer('ammo').default(0).notNull(),
    durability: integer('durability').default(100).notNull(),
    isEquipped: boolean('is_equipped').default(false).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_weapons_character').on(table.characterId),
    uniqueIndex('idx_weapons_serial').on(table.serialNumber),
  ]
);

// ─────────────────────────────────────────────────────────────────────────────
// 10. EMPLOIS & JOBS (Définitions et affectations)
// ─────────────────────────────────────────────────────────────────────────────
export const jobs = pgTable(
  'jobs',
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    name: varchar('name', { length: 64 }).notNull(),
    description: text('description'),
    baseSalary: integer('base_salary').default(0).notNull(),
    requirements: jsonb('requirements').default({}),
    isActive: boolean('is_active').default(true).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
  }
);

export const employments = pgTable(
  'employments',
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    characterId: varchar('character_id', { length: 64 }).references(() => characters.id, { onDelete: 'cascade' }),
    jobId: varchar('job_id', { length: 64 }).references(() => jobs.id, { onDelete: 'cascade' }),
    hiredAt: timestamp('hired_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
    firedAt: timestamp('fired_at', { withTimezone: true, mode: 'date' }),
    salary: integer('salary').default(0).notNull(),
  },
  (table) => [
    index('idx_employments_character').on(table.characterId),
    index('idx_employments_job').on(table.jobId),
  ]
);

// ─────────────────────────────────────────────────────────────────────────────
// 11. LOGS DE JEU (Événements, actions, audit)
// ─────────────────────────────────────────────────────────────────────────────
export const gameLogs = pgTable(
  'game_logs',
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    characterId: varchar('character_id', { length: 64 }).references(() => characters.id, { onDelete: 'cascade' }),
    event: varchar('event', { length: 64 }).notNull(),
    details: text('details'),
    metadata: jsonb('metadata').default({}),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_logs_character').on(table.characterId),
    index('idx_logs_event').on(table.event),
  ]
);

// ─────────────────────────────────────────────────────────────────────────────
// 12. ÉCONOMIE SOUTERRAINE & PLANQUES (Saint-Alban / Stash Houses)
// ─────────────────────────────────────────────────────────────────────────────
export const stashHouses = pgTable('stash_houses', {
  id: serial('id').primaryKey(),
  ownerId: text('owner_id').notNull(), // ID du joueur propriétaire
  name: text('name').notNull(),
  x: real('x').notNull(),
  z: real('z').notNull(),
  zoneName: text('zone_name').notNull(), // Ex: "Rang des Gars Chauds, Saint-Alban"
  isLocked: boolean('is_locked').default(true).notNull(),
  upgradeLevel: integer('upgrade_level').default(1).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
});

export const illicitProductions = pgTable('illicit_productions', {
  id: serial('id').primaryKey(),
  stashId: integer('stash_id').references(() => stashHouses.id, { onDelete: 'cascade' }).notNull(),
  productType: text('product_type').notNull(), // Ex: "cannabis_pot_qc", "liqueur_maison"
  currentVolume: real('current_volume').default(0).notNull(),
  maxCapacity: real('max_capacity').default(100.0).notNull(),
  productionRate: real('production_rate').default(1.5).notNull(), // Unités par heure
  isRaidable: boolean('is_raidable').default(true).notNull(),
  lastUpdated: timestamp('last_updated', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
});

export const policeRaids = pgTable('police_raids', {
  id: serial('id').primaryKey(),
  stashId: integer('stash_id').references(() => stashHouses.id, { onDelete: 'cascade' }).notNull(),
  officerId: text('officer_id').notNull(), // Matricule du policier SQ
  confiscatedGoods: text('confiscated_goods').notNull(),
  finesIssued: integer('fines_issued').default(0).notNull(),
  timestamp: timestamp('timestamp', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
});

// ─────────────────────────────────────────────────────────────────────────────
// 13. SYSTÈME PÉNAL, CELLULES & CONTRAINTES (Sûreté du Québec)
// ─────────────────────────────────────────────────────────────────────────────
export const jailRecords = pgTable('jail_records', {
  id: serial('id').primaryKey(),
  playerId: text('player_id').notNull(),
  officerId: text('officer_id').notNull(),
  reason: text('reason').notNull(),
  bailAmount: integer('bail_amount').default(500).notNull(),
  sentenceDurationMinutes: integer('sentence_duration_minutes').default(15).notNull(),
  isJailed: boolean('is_jailed').default(true).notNull(),
  releasedAt: timestamp('released_at', { withTimezone: true, mode: 'date' }),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
});

export const playerConstraints = pgTable('player_constraints', {
  playerId: text('player_id').primaryKey(),
  isHandcuffed: boolean('is_handcuffed').default(false).notNull(),
  isEscorted: boolean('is_escorted').default(false).notNull(),
  escortedBy: text('escorted_by'),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
});

// ─────────────────────────────────────────────────────────────────────────────
// 14. RELATIONS DRIZZLE (Pour le Query Builder)
// ─────────────────────────────────────────────────────────────────────────────
export const usersRelations = relations(users, ({ many }) => ({
  characters: many(characters),
  sessions: many(sessions),
}));

export const charactersRelations = relations(characters, ({ one, many }) => ({
  user: one(users, { fields: [characters.userId], references: [users.id] }),
  gang: one(gangs, { fields: [characters.gangId], references: [gangs.id] }),
  vehicles: many(vehicles),
  properties: many(properties),
  phoneContacts: many(phoneContacts),
  phoneMessages: many(phoneMessages),
  tickets: many(policeTickets),
  transactions: many(transactions),
  weapons: many(weapons),
  employments: many(employments),
  gameLogs: many(gameLogs),
}));

export const jobsRelations = relations(jobs, ({ many }) => ({
  employments: many(employments),
}));

export const employmentsRelations = relations(employments, ({ one }) => ({
  character: one(characters, { fields: [employments.characterId], references: [characters.id] }),
  job: one(jobs, { fields: [employments.jobId], references: [jobs.id] }),
}));

export const stashHousesRelations = relations(stashHouses, ({ many }) => ({
  productions: many(illicitProductions),
  raids: many(policeRaids),
}));

export const illicitProductionsRelations = relations(illicitProductions, ({ one }) => ({
  stash: one(stashHouses, { fields: [illicitProductions.stashId], references: [stashHouses.id] }),
}));

export const policeRaidsRelations = relations(policeRaids, ({ one }) => ({
  stash: one(stashHouses, { fields: [policeRaids.stashId], references: [stashHouses.id] }),
}));

// Export global complet de ton schéma Drizzle
export const rpSchema = {
  users,
  sessions,
  gangs,
  characters,
  phoneMessages,
  phoneContacts,
  properties,
  vehicles,
  inventoryItems,
  transactions,
  policeTickets,
  weapons,
  jobs,
  employments,
  gameLogs,
  stashHouses,
  illicitProductions,
  policeRaids,
  jailRecords,
  playerConstraints,
};