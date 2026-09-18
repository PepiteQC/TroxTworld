import { pgTable, text, integer, boolean, timestamp } from "drizzle-orm/pg-core";

export const dbFactionOfficers = pgTable("faction_officers", {
  badgeNumber: text("badge_number").primaryKey(), // SQ-101, MED-102
  playerId: text("player_id").unique().notNull(),
  playerName: text("player_name").notNull(),
  factionId: text("faction_id").notNull(),       // sq_portneuf, ems_portneuf
  factionType: text("faction_type").notNull(),   // police|ems|fire|coroner
  grade: integer("grade").default(0).notNull(),
  rankTitle: text("rank_title").notNull(),       // Cadet, Agent, Lieutenant
  onDuty: boolean("on_duty").default(false).notNull(),
  arrestsCount: integer("arrests_count").default(0).notNull(),
  medicalInterventionsCount: integer("medical_interventions_count").default(0).notNull(),
  recruitedAt: timestamp("recruited_at").defaultNow().notNull(),
});

export const dbDispatchCalls = pgTable("dispatch_calls", {
  id: text("id").primaryKey(),
  callerName: text("caller_name").notNull(),
  callerPhone: text("caller_phone"),
  code: text("code").notNull(),                  // 10-71, 10-50
  category: text("category").notNull(),          // police|ems|fire
  description: text("description").notNull(),
  posX: integer("pos_x").notNull(),
  posY: integer("pos_y").notNull(),
  posZ: integer("pos_z").notNull(),
  zoneName: text("zone_name"),
  status: text("status").default("pending").notNull(), // pending|responding|resolved|cancelled
  createdAt: timestamp("created_at").defaultNow().notNull(),
  resolvedAt: timestamp("resolved_at"),
});
