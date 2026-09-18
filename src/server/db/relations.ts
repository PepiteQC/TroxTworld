/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  ETHERWORLD — src/server/db/relations.ts                     ║
 * ║  Relations Drizzle ORM · Liaison modulaire des schémas RPG   ║
 * ║  Portneuf, Québec 🍁 · fr-CA · TroxTetherworld v7.0 Enterprise ║
 * ╚══════════════════════════════════════════════════════════════╝
 */

'use strict';

import { relations } from "drizzle-orm";
import { players } from "../schemas/players";
import { characters } from "../schemas/characters";
import { inventories, containerVaults } from "../schemas/inventories";
import { vehicles, vehicleModels } from "../schemas/vehicles";
import { houses } from "../schemas/houses";
import { worldObjects, worldObjectStates, zonePortals, zones } from "../schemas/world";
import { items, shops, shopItems } from "../schemas/shops";
import { bankAccounts, transactions, bankLoans } from "../schemas/economy";
import { chatMessages, radioChannels } from "../schemas/chat";
import { gameSessions, sessionTelemetryLogs } from "../schemas/sessions";
import { factions, factionMembers } from "../schemas/factions";

// ── RELATIONS PLAYERS ─────────────────────────────────────────
export const playersRelations = relations(players, ({ many }) => ({
    characters: many(characters),
    vehicles: many(vehicles),
    houses: many(houses),
    bankAccounts: many(bankAccounts),
    bankLoans: many(bankLoans),
    chatMessages: many(chatMessages),
    gameSessions: many(gameSessions),
    factionMemberships: many(factionMembers),
}));

// ── RELATIONS CHARACTERS ──────────────────────────────────────
export const charactersRelations = relations(characters, ({ one, many }) => ({
    player: one(players, {
        fields: [characters.playerId],
        references: [players.id],
    }),
    inventory: many(inventories),
    containerVaults: many(containerVaults),
    factionMemberships: many(factionMembers),
}));

// ── RELATIONS INVENTORIES & ITEMS ─────────────────────────────
export const inventoriesRelations = relations(inventories, ({ one }) => ({
    character: one(characters, {
        fields: [inventories.characterId],
        references: [characters.id],
    }),
    item: one(items, {
        fields: [inventories.itemId],
        references: [items.id],
    }),
}));

export const itemsRelations = relations(items, ({ many }) => ({
    inventories: many(inventories),
    shopItems: many(shopItems),
}));

// ── RELATIONS SHOPS ───────────────────────────────────────────
export const shopsRelations = relations(shops, ({ one, many }) => ({
    owner: one(players, {
        fields: [shops.ownerId],
        references: [players.id],
    }),
    shopItems: many(shopItems),
}));

export const shopItemsRelations = relations(shopItems, ({ one }) => ({
    shop: one(shops, {
        fields: [shopItems.shopId],
        references: [shops.id],
    }),
    item: one(items, {
        fields: [shopItems.itemId],
        references: [items.id],
    }),
}));

// ── RELATIONS VEHICLES ────────────────────────────────────────
export const vehicleModelsRelations = relations(vehicleModels, ({ many }) => ({
    vehicles: many(vehicles),
}));

export const vehiclesRelations = relations(vehicles, ({ one }) => ({
    owner: one(players, {
        fields: [vehicles.ownerId],
        references: [players.id],
    }),
    model: one(vehicleModels, {
        fields: [vehicles.modelId],
        references: [vehicleModels.id],
    }),
}));

// ── RELATIONS HOUSES ──────────────────────────────────────────
export const housesRelations = relations(houses, ({ one }) => ({
    owner: one(players, {
        fields: [houses.ownerId],
        references: [players.id],
    }),
    tenant: one(players, {
        fields: [houses.tenantId],
        references: [players.id],
    }),
}));

// ── RELATIONS WORLD & ZONES ───────────────────────────────────
export const zonesRelations = relations(zones, ({ many }) => ({
    worldObjects: many(worldObjects),
    portalsSource: many(zonePortals, { relationName: "sourceZone" }),
    portalsTarget: many(zonePortals, { relationName: "targetZone" }),
}));

export const worldObjectsRelations = relations(worldObjects, ({ one }) => ({
    zoneRef: one(zones, {
        fields: [worldObjects.zone],
        references: [zones.id],
    }),
    state: one(worldObjectStates, {
        fields: [worldObjects.id],
        references: [worldObjectStates.objectId],
    }),
}));

export const worldObjectStatesRelations = relations(worldObjectStates, ({ one }) => ({
    object: one(worldObjects, {
        fields: [worldObjectStates.objectId],
        references: [worldObjects.id],
    }),
}));

export const zonePortalsRelations = relations(zonePortals, ({ one }) => ({
    sourceZone: one(zones, {
        fields: [zonePortals.sourceZoneId],
        references: [zones.id],
        relationName: "sourceZone",
    }),
    targetZone: one(zones, {
        fields: [zonePortals.targetZoneId],
        references: [zones.id],
        relationName: "targetZone",
    }),
}));

// ── RELATIONS ECONOMY & BANKING ───────────────────────────────
export const bankAccountsRelations = relations(bankAccounts, ({ one, many }) => ({
    player: one(players, {
        fields: [bankAccounts.playerId],
        references: [players.id],
    }),
    loans: many(bankLoans),
    transactionsFrom: many(transactions, { relationName: "fromAccount" }),
    transactionsTo: many(transactions, { relationName: "toAccount" }),
}));

export const transactionsRelations = relations(transactions, ({ one }) => ({
    fromPlayer: one(players, {
        fields: [transactions.fromPlayerId],
        references: [players.id],
        relationName: "fromPlayer",
    }),
    toPlayer: one(players, {
        fields: [transactions.toPlayerId],
        references: [players.id],
        relationName: "toPlayer",
    }),
    fromAccount: one(bankAccounts, {
        fields: [transactions.fromAccountId],
        references: [bankAccounts.id],
        relationName: "fromAccount",
    }),
    toAccount: one(bankAccounts, {
        fields: [transactions.toAccountId],
        references: [bankAccounts.id],
        relationName: "toAccount",
    }),
}));

export const bankLoansRelations = relations(bankLoans, ({ one }) => ({
    player: one(players, {
        fields: [bankLoans.playerId],
        references: [players.id],
    }),
    account: one(bankAccounts, {
        fields: [bankLoans.accountId],
        references: [bankAccounts.id],
    }),
}));

// ── RELATIONS FACTIONS ────────────────────────────────────────
export const factionsRelations = relations(factions, ({ many }) => ({
    members: many(factionMembers),
}));

export const factionMembersRelations = relations(factionMembers, ({ one }) => ({
    faction: one(factions, {
        fields: [factionMembers.factionId],
        references: [factions.id],
    }),
    player: one(players, {
        fields: [factionMembers.playerId],
        references: [players.id],
    }),
    character: one(characters, {
        fields: [factionMembers.characterId],
        references: [characters.id],
    }),
}));

// ── RELATIONS CHAT & SESSIONS ─────────────────────────────────
export const chatMessagesRelations = relations(chatMessages, ({ one }) => ({
    sender: one(players, {
        fields: [chatMessages.senderId],
        references: [players.id],
    }),
    target: one(players, {
        fields: [chatMessages.targetId],
        references: [players.id],
    }),
}));

export const gameSessionsRelations = relations(gameSessions, ({ one, many }) => ({
    player: one(players, {
        fields: [gameSessions.playerId],
        references: [players.id],
    }),
    telemetryLogs: many(sessionTelemetryLogs),
}));

export const sessionTelemetryLogsRelations = relations(sessionTelemetryLogs, ({ one }) => ({
    session: one(gameSessions, {
        fields: [sessionTelemetryLogs.sessionId],
        references: [gameSessions.id],
    }),
}));