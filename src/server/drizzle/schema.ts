// ═══════════════════════════════════════════════════════════════════════════
//  DRIZZLE SCHEMA — UNIFICATION ET PERSISTANCE DU MONDE RP (SQLITE)
//  server/drizzle/schema.ts
//  100% Compatible better-sqlite3 · Gestion automatisée des dates (timestamp_ms)
// ═══════════════════════════════════════════════════════════════════════════

import {
  sqliteTable,
  text,
  integer,
  real,
  index,
  uniqueIndex,
} from 'drizzle-orm/sqlite-core';
import { relations } from 'drizzle-orm';

// ─────────────────────────────────────────────────────────────────────────
//  1. COMPTES — Identité globale du joueur derrière son écran
// ─────────────────────────────────────────────────────────────────────────

export const accounts = sqliteTable(
  'accounts',
  {
    id: text('id').primaryKey(),
    username: text('username').notNull(),
    email: text('email'),
    passwordHash: text('password_hash'),
    role: text('role', { enum: ['player', 'moderator', 'admin', 'owner'] })
      .notNull()
      .default('player'),
    
    // Dates gérées de façon fluide sous forme d'objets Date JS
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
    lastLoginAt: integer('last_login_at', { mode: 'timestamp_ms' }),
    banExpiresAt: integer('ban_expires_at', { mode: 'timestamp_ms' }),
    
    totalPlaytimeSeconds: integer('total_playtime_seconds').notNull().default(0),
    banned: integer('banned', { mode: 'boolean' }).notNull().default(false),
    banReason: text('ban_reason'),
    trustScore: integer('trust_score').notNull().default(100),
  },
  (t) => ({
    usernameIdx: uniqueIndex('accounts_username_idx').on(t.username),
    emailIdx: index('accounts_email_idx').on(t.email),
  })
);

// ─────────────────────────────────────────────────────────────────────────
//  2. PERSONNAGES — Un compte peut posséder plusieurs citoyens RP
// ─────────────────────────────────────────────────────────────────────────

export const characters = sqliteTable(
  'characters',
  {
    id: text('id').primaryKey(),
    accountId: text('account_id')
      .notNull()
      .references(() => accounts.id, { onDelete: 'cascade' }),

    // Identité RP
    firstName: text('first_name').notNull(),
    lastName: text('last_name').notNull(),
    gender: text('gender', { enum: ['male', 'female'] }).notNull().default('male'),
    nationality: text('nationality').notNull().default('Québécoise'),
    dateOfBirth: text('date_of_birth'),
    phoneNumber: text('phone_number'),

    // Apparence morphologique et cosmétique (JSON CharacterCreator)
    appearance: text('appearance', { mode: 'json' }).notNull().default('{}'),
    activeAura: text('active_aura'),

    // Coordonnées de sauvegarde de déconnexion
    posX: real('pos_x').notNull().default(0),
    posY: real('pos_y').notNull().default(1),
    posZ: real('pos_z').notNull().default(10),
    rotation: real('rotation').notNull().default(0),
    currentZone: text('current_zone').default('Portneuf'),
    interiorId: text('interior_id'), // Chambre d'hôtel / corridor / etc.

    // Portefeuille
    cash: integer('cash').notNull().default(500),
    bank: integer('bank').notNull().default(2500),
    dirtyMoney: integer('dirty_money').notNull().default(0),

    // Emploi & Fiche de paye
    job: text('job').notNull().default('Civil'),
    jobGrade: integer('job_grade').notNull().default(0),
    jobHoursWorked: real('job_hours_worked').notNull().default(0),
    onDuty: integer('on_duty', { mode: 'boolean' }).notNull().default(false),
    lastPaycheckAt: integer('last_paycheck_at', { mode: 'timestamp_ms' }),

    // Métriques vitales & État RP
    health: integer('health').notNull().default(100),
    armor: integer('armor').notNull().default(0),
    hunger: integer('hunger').notNull().default(100),
    thirst: integer('thirst').notNull().default(100),
    stress: integer('stress').notNull().default(0),
    isDead: integer('is_dead', { mode: 'boolean' }).notNull().default(false),
    isCuffed: integer('is_cuffed', { mode: 'boolean' }).notNull().default(false),
    inJailUntil: integer('in_jail_until', { mode: 'timestamp_ms' }),
    wantedLevel: integer('wanted_level').notNull().default(0),
    bounty: integer('bounty').notNull().default(0),

    // Appartenance à un gang
    gangId: text('gang_id'),
    gangRank: text('gang_rank'),

    // Métadonnées
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
    lastSeenAt: integer('last_seen_at', { mode: 'timestamp_ms' }),
    playtimeSeconds: integer('playtime_seconds').notNull().default(0),
    spawnCount: integer('spawn_count').notNull().default(0),
  },
  (t) => ({
    accountIdx: index('characters_account_idx').on(t.accountId),
    nameIdx: index('characters_name_idx').on(t.firstName, t.lastName),
    gangIdx: index('characters_gang_idx').on(t.gangId),
    zoneIdx: index('characters_zone_idx').on(t.currentZone),
  })
);

// ─────────────────────────────────────────────────────────────────────────
//  3. INVENTAIRE — Anti-duplication d'objets (Piles uniques)
// ─────────────────────────────────────────────────────────────────────────

export const inventoryItems = sqliteTable(
  'inventory_items',
  {
    id: text('id').primaryKey(),
    ownerType: text('owner_type', {
      enum: ['character', 'vehicle', 'property', 'ground', 'gang'],
    }).notNull(),
    ownerId: text('owner_id').notNull(),

    itemId: text('item_id').notNull(),
    itemName: text('item_name').notNull(),
    category: text('category').notNull(),
    quantity: integer('quantity').notNull().default(1),
    slot: integer('slot'), // Coordonnée de grille d'inventaire
    weight: real('weight').notNull().default(0),

    // Métadonnées d'instance (Durabilité, numéros de série d'armes)
    durability: integer('durability'),
    serialNumber: text('serial_number'),
    metadata: text('metadata', { mode: 'json' }).default('{}'),

    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
  },
  (t) => ({
    ownerIdx: index('inventory_owner_idx').on(t.ownerType, t.ownerId),
    itemIdx: index('inventory_item_idx').on(t.itemId),
    serialIdx: uniqueIndex('inventory_serial_idx').on(t.serialNumber),
  })
);

// ─────────────────────────────────────────────────────────────────────────
//  4. VÉHICULES POSSÉDÉS
// ─────────────────────────────────────────────────────────────────────────

export const vehicles = sqliteTable(
  'vehicles',
  {
    id: text('id').primaryKey(),
    ownerId: text('owner_id').references(() => characters.id, { onDelete: 'set null' }),
    ownerType: text('owner_type', { enum: ['character', 'gang', 'job', 'state'] })
      .notNull()
      .default('character'),

    model: text('model').notNull(),
    displayName: text('display_name').notNull(),
    plate: text('plate').notNull(), // Plaque d'immatriculation SAAQ
    vin: text('vin').notNull(),   // Numéro de châssis unique

    // Customisation esthétique
    primaryColor: text('primary_color').notNull().default('#c0c0c0'),
    secondaryColor: text('secondary_color'),
    mods: text('mods', { mode: 'json' }).default('{}'),

    // Télémétrie mécanique
    fuel: real('fuel').notNull().default(100),
    engineHealth: real('engine_health').notNull().default(100),
    bodyHealth: real('body_health').notNull().default(100),
    mileageKm: real('mileage_km').notNull().default(0),

    // Positionnement & Stockage
    posX: real('pos_x'),
    posY: real('pos_y'),
    posZ: real('pos_z'),
    rotation: real('rotation'),
    garageId: text('garage_id'), // Null si garé dehors dans la rue
    isStored: integer('is_stored', { mode: 'boolean' }).notNull().default(true),
    isImpounded: integer('is_impounded', { mode: 'boolean' }).notNull().default(false),
    impoundFee: integer('impound_fee').notNull().default(0),

    // Papiers légaux
    isStolen: integer('is_stolen', { mode: 'boolean' }).notNull().default(false),
    insuranceExpiresAt: integer('insurance_expires_at', { mode: 'timestamp_ms' }),
    registrationExpiresAt: integer('registration_expires_at', { mode: 'timestamp_ms' }),

    purchasePrice: integer('purchase_price'),
    purchasedAt: integer('purchased_at', { mode: 'timestamp_ms' }),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
  },
  (t) => ({
    ownerIdx: index('vehicles_owner_idx').on(t.ownerId),
    plateIdx: uniqueIndex('vehicles_plate_idx').on(t.plate),
    vinIdx: uniqueIndex('vehicles_vin_idx').on(t.vin),
    garageIdx: index('vehicles_garage_idx').on(t.garageId),
  })
);

// ─────────────────────────────────────────────────────────────────────────
//  5. PROPRIÉTÉS ET BIENS IMMOBILIERS
// ─────────────────────────────────────────────────────────────────────────

export const properties = sqliteTable(
  'properties',
  {
    id: text('id').primaryKey(),
    ownerId: text('owner_id').references(() => characters.id, { onDelete: 'set null' }),
    ownerType: text('owner_type', { enum: ['character', 'gang', 'state', 'npc'] })
      .notNull()
      .default('state'),

    name: text('name').notNull(),
    address: text('address').notNull(),
    villageName: text('village_name').notNull(),
    propertyType: text('property_type', {
      enum: ['maison', 'appartement', 'commerce', 'entrepot', 'garage', 'ferme', 'chalet'],
    })
      .notNull()
      .default('maison'),

    // Coordonnées mondes (Entrées de portes)
    posX: real('pos_x').notNull(),
    posY: real('pos_y').notNull(),
    posZ: real('pos_z').notNull(),
    entranceX: real('entrance_x'),
    entranceY: real('entrance_y'),
    entranceZ: real('entrance_z'),
    interiorTemplate: text('interior_template').default('default_house'),

    // Tarification & Taxes municipale
    price: integer('price').notNull(),
    forSale: integer('for_sale', { mode: 'boolean' }).notNull().default(true),
    rentPerDay: integer('rent_per_day'),
    taxPerWeek: integer('tax_per_week').notNull().default(0),
    taxDueAt: integer('tax_due_at', { mode: 'timestamp_ms' }),

    // Améliorations
    bedrooms: integer('bedrooms').notNull().default(2),
    garageSlots: integer('garage_slots').notNull().default(0),
    storageCapacity: real('storage_capacity').notNull().default(50),
    hasAlarm: integer('has_alarm', { mode: 'boolean' }).notNull().default(false),

    // Sécurité
    locked: integer('locked', { mode: 'boolean' }).notNull().default(true),
    condition: integer('condition').notNull().default(100),
    lastRobbedAt: integer('last_robbed_at', { mode: 'timestamp_ms' }),

    purchasedAt: integer('purchased_at', { mode: 'timestamp_ms' }),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
  },
  (t) => ({
    ownerIdx: index('properties_owner_idx').on(t.ownerId),
    villageIdx: index('properties_village_idx').on(t.villageName),
    saleIdx: index('properties_sale_idx').on(t.forSale),
  })
);

// Double d'accès de clés (Maisons et Véhicules partagés)
export const accessKeys = sqliteTable(
  'access_keys',
  {
    id: text('id').primaryKey(),
    characterId: text('character_id')
      .notNull()
      .references(() => characters.id, { onDelete: 'cascade' }),
    targetType: text('target_type', { enum: ['property', 'vehicle'] }).notNull(),
    targetId: text('target_id').notNull(),
    grantedBy: text('granted_by'),
    grantedAt: integer('granted_at', { mode: 'timestamp_ms' }).notNull(),
    expiresAt: integer('expires_at', { mode: 'timestamp_ms' }),
  },
  (t) => ({
    charIdx: index('keys_char_idx').on(t.characterId),
    targetIdx: index('keys_target_idx').on(t.targetType, t.targetId),
    uniqueKey: uniqueIndex('keys_unique_idx').on(t.characterId, t.targetType, t.targetId),
  })
);

// ─────────────────────────────────────────────────────────────────────────
//  6. LICENCES, PERMIS & CONTRÔLE LÉGAL
// ─────────────────────────────────────────────────────────────────────────

export const licenses = sqliteTable(
  'licenses',
  {
    id: text('id').primaryKey(),
    characterId: text('character_id')
      .notNull()
      .references(() => characters.id, { onDelete: 'cascade' }),
    licenseType: text('license_type', {
      enum: ['conduire', 'arme', 'chasse', 'peche', 'bateau', 'avion', 'commerce'],
    }).notNull(),
    issuedAt: integer('issued_at', { mode: 'timestamp_ms' }).notNull(),
    expiresAt: integer('expires_at', { mode: 'timestamp_ms' }),
    points: integer('points').notNull().default(0), // Points d'inaptitude SAAQ
    suspended: integer('suspended', { mode: 'boolean' }).notNull().default(false),
    suspendedUntil: integer('suspended_until', { mode: 'timestamp_ms' }),
  },
  (t) => ({
    charIdx: index('licenses_char_idx').on(t.characterId),
    uniqueLicense: uniqueIndex('licenses_unique_idx').on(t.characterId, t.licenseType),
  })
);

// Fiche de casier judiciaire (SQ)
export const criminalRecords = sqliteTable(
  'criminal_records',
  {
    id: text('id').primaryKey(),
    characterId: text('character_id')
      .notNull()
      .references(() => characters.id, { onDelete: 'cascade' }),
    offense: text('offense').notNull(),
    description: text('description'),
    fine: integer('fine').notNull().default(0),
    jailMinutes: integer('jail_minutes').notNull().default(0),
    officerId: text('officer_id'),
    officerName: text('officer_name'),
    villageName: text('village_name'),
    paid: integer('paid', { mode: 'boolean' }).notNull().default(false),
    occurredAt: integer('occurred_at', { mode: 'timestamp_ms' }).notNull(),
  },
  (t) => ({
    charIdx: index('records_char_idx').on(t.characterId),
    dateIdx: index('records_date_idx').on(t.occurredAt),
  })
);

// ─────────────────────────────────────────────────────────────────────────
//  7. SYSTEME CARCÉRAL DE PORTNEUF (CELLULES & REGISTRE)
// ─────────────────────────────────────────────────────────────────────────

export const prisonCells = sqliteTable(
  'prison_cells',
  {
    id: text('id').primaryKey(),
    block: text('block').notNull(),
    floor: integer('floor').notNull(),
    cellNumber: integer('cell_number').notNull(),
    capacity: integer('capacity').notNull().default(2),

    posX: real('pos_x').notNull(),
    posY: real('pos_y').notNull(),
    posZ: real('pos_z').notNull(),

    locked: integer('locked', { mode: 'boolean' }).notNull().default(true),
    isOpen: integer('is_open', { mode: 'boolean' }).notNull().default(false),
    outOfService: integer('out_of_service', { mode: 'boolean' }).notNull().default(false),
    layout: text('layout', { mode: 'json' }),
  },
  (t) => ({
    blockIdx: index('cells_block_idx').on(t.block),
  })
);

export const inmates = sqliteTable(
  'inmates',
  {
    id: text('id').primaryKey(),
    characterId: text('character_id').notNull(),
    name: text('name').notNull(),
    bookingNumber: text('booking_number').notNull().unique(),

    bookedAt: integer('booked_at', { mode: 'timestamp_ms' }).notNull(),
    bookedBy: text('booked_by'),

    charges: text('charges', { mode: 'json' }).notNull().default('[]'),
    propertySeized: text('property_seized', { mode: 'json' }).default('[]'),

    totalSentenceMinutes: integer('total_sentence_minutes').notNull(),
    servedMinutes: real('served_minutes').notNull().default(0),
    releaseAt: integer('release_at', { mode: 'timestamp_ms' }).notNull(),
    goodBehaviorCredits: integer('good_behavior_credits').notNull().default(0),

    securityLevel: text('security_level').notNull().default('moyenne'),
    cellId: text('cell_id').references(() => prisonCells.id),
    block: text('block'),

    inSolitary: integer('in_solitary', { mode: 'boolean' }).notNull().default(false),
    solitaryUntil: integer('solitary_until', { mode: 'timestamp_ms' }),
    incidents: integer('incidents').notNull().default(0),
    gangAffiliation: text('gang_affiliation'),
    workAssignment: text('work_assignment'),
  },
  (t) => ({
    characterIdx: index('inmates_character_idx').on(t.characterId),
    cellIdx: index('inmates_cell_idx').on(t.cellId),
    releaseIdx: index('inmates_release_idx').on(t.releaseAt),
  })
);

// ─────────────────────────────────────────────────────────────────────────
//  8. GANGS & ORGANISATIONS
// ─────────────────────────────────────────────────────────────────────────

export const gangs = sqliteTable(
  'gangs',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    color: text('color').notNull().default('#dc2626'),
    leaderId: text('leader_id').references(() => characters.id),
    treasury: integer('treasury').notNull().default(0),
    reputation: integer('reputation').notNull().default(0),
    level: integer('level').notNull().default(1),
    maxMembers: integer('max_members').notNull().default(20),
    territories: text('territories', { mode: 'json' }).default('[]'),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  },
  (t) => ({
    nameIdx: uniqueIndex('gangs_name_idx').on(t.name),
  })
);

// ─────────────────────────────────────────────────────────────────────────
//  9. ÉTAT COFFRES & PORTES DU MONDE
// ─────────────────────────────────────────────────────────────────────────

export const worldState = sqliteTable(
  'world_state',
  {
    id: text('id').primaryKey(),
    stateType: text('state_type').notNull(), // 'door' | 'container'
    villageName: text('village_name'),
    state: text('state', { mode: 'json' }).notNull().default('{}'),
    respawnAt: integer('respawn_at', { mode: 'timestamp_ms' }),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
  },
  (t) => ({
    typeIdx: index('world_type_idx').on(t.stateType),
    villageIdx: index('world_village_idx').on(t.villageName),
    respawnIdx: index('world_respawn_idx').on(t.respawnAt),
  })
);

// ─────────────────────────────────────────────────────────────────────────
//  10. LOGGER DE TRANSACTIONS FINANCIÈRES (TRAÇABILITÉ ANTI-DUPE)
// ─────────────────────────────────────────────────────────────────────────

export const transactions = sqliteTable(
  'transactions',
  {
    id: text('id').primaryKey(),
    characterId: text('character_id').references(() => characters.id, { onDelete: 'set null' }),
    type: text('type').notNull(), // 'salary' | 'purchase' | 'transfer' | 'fine'
    amount: integer('amount').notNull(),
    balanceAfter: integer('balance_after').notNull(),
    account: text('account', { enum: ['cash', 'bank', 'dirty'] }).notNull(),
    counterpartyId: text('counterparty_id'),
    description: text('description'),
    villageName: text('village_name'),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  },
  (t) => ({
    charIdx: index('tx_char_idx').on(t.characterId),
    dateIdx: index('tx_date_idx').on(t.createdAt),
    typeIdx: index('tx_type_idx').on(t.type),
  })
);

// ─────────────────────────────────────────────────────────────────────────
//  11. HISTORIQUE DES SESSIONS JOUEURS
// ─────────────────────────────────────────────────────────────────────────

export const sessions = sqliteTable(
  'sessions',
  {
    id: text('id').primaryKey(),
    characterId: text('character_id')
      .notNull()
      .references(() => characters.id, { onDelete: 'cascade' }),
    startedAt: integer('started_at', { mode: 'timestamp_ms' }).notNull(),
    endedAt: integer('ended_at', { mode: 'timestamp_ms' }),
    durationSeconds: integer('duration_seconds'),
    disconnectReason: text('disconnect_reason'),
    lastSnapshot: text('last_snapshot', { mode: 'json' }),
  },
  (t) => ({
    charIdx: index('sessions_char_idx').on(t.characterId),
  })
);

// ─────────────────────────────────────────────────────────────────────────
//  12. RELATIONS DRIZZLE (JOIN QUERIES)
// ─────────────────────────────────────────────────────────────────────────

export const accountsRelations = relations(accounts, ({ many }) => ({
  characters: many(characters),
}));

export const charactersRelations = relations(characters, ({ one, many }) => ({
  account: one(accounts, { fields: [characters.accountId], references: [accounts.id] }),
  vehicles: many(vehicles),
  properties: many(properties),
  licenses: many(licenses),
  criminalRecords: many(criminalRecords),
  accessKeys: many(accessKeys),
  transactions: many(transactions),
  sessions: many(sessions),
}));

export const vehiclesRelations = relations(vehicles, ({ one }) => ({
  owner: one(characters, { fields: [vehicles.ownerId], references: [characters.id] }),
}));

export const propertiesRelations = relations(properties, ({ one }) => ({
  owner: one(characters, { fields: [properties.ownerId], references: [characters.id] }),
}));

export const prisonCellsRelations = relations(prisonCells, ({ many }) => ({
  occupants: many(inmates),
}));

export const inmatesRelations = relations(inmates, ({ one }) => ({
  cell: one(prisonCells, {
    fields: [inmates.cellId],
    references: [prisonCells.id],
  }),
}));

// ─────────────────────────────────────────────────────────────────────────
//  13. EXPORTS DES TYPES TYPESCRIPT INFÉRÉS
// ─────────────────────────────────────────────────────────────────────────

export type Account = typeof accounts.$inferSelect;
export type Character = typeof characters.$inferSelect;
export type NewCharacter = typeof characters.$inferInsert;
export type InventoryItem = typeof inventoryItems.$inferSelect;
export type Vehicle = typeof vehicles.$inferSelect;
export type Property = typeof properties.$inferSelect;
export type License = typeof licenses.$inferSelect;
export type CriminalRecord = typeof criminalRecords.$inferSelect;
export type PrisonCell = typeof prisonCells.$inferSelect;
export type Inmate = typeof inmates.$inferSelect;
export type NewInmate = typeof inmates.$inferInsert;
export type Gang = typeof gangs.$inferSelect;
export type WorldStateRow = typeof worldState.$inferSelect;
export type Transaction = typeof transactions.$inferSelect;
export type Session = typeof sessions.$inferSelect;