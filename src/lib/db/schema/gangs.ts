import { pgTable, text, integer, timestamp } from "drizzle-orm/pg-core";

export const dbGangs = pgTable("gangs", {
  id: text("id").primaryKey(),                 // gang_motards, etc.
  name: text("name").notNull(),
  tag: text("tag").notNull(),                  // MC-66, SDF
  colorHex: text("color_hex").default("#ffffff").notNull(),
  leaderId: text("leader_id").notNull(),       // ID du chef de gang
  bankBalance: integer("bank_balance").default(0).notNull(), // Caisse noire
  reputation: integer("reputation").default(100).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const dbGangMembers = pgTable("gang_members", {
  id: text("id").primaryKey(),                 // Généré
  gangId: text("gang_id").references(() => dbGangs.id, { onDelete: "cascade" }).notNull(),
  playerId: text("player_id").notNull(),       // ID du joueur
  playerName: text("player_name").notNull(),
  rank: text("rank").default("recruit").notNull(), // leader|lieutenant|enforcer|member|recruit
  contributedFunds: integer("contributed_funds").default(0).notNull(),
  joinedAt: timestamp("joined_at").defaultNow().notNull(),
});

export const dbGangTerritories = pgTable("gang_territories", {
  id: text("id").primaryKey(),                 // turf_donnacona_docks, etc.
  name: text("name").notNull(),
  controllingGangId: text("controlling_gang_id").references(() => dbGangs.id, { onDelete: "set null" }),
  influencePercent: integer("influence_percent").default(0).notNull(),
  revenuePerCycle: integer("revenue_per_cycle").default(100).notNull(),
  lastContestedAt: timestamp("last_contested_at"),
});
