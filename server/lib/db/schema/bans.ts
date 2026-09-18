import { pgTable, text, timestamp, boolean } from "drizzle-orm/pg-core";

export const dbBans = pgTable("bans", {
  id: text("id").primaryKey(),                 // ban_...
  playerId: text("player_id").notNull(),       // ID de session / compte
  playerName: text("player_name").notNull(),
  ipAddress: text("ip_address"),               // Pour ban IP
  hardwareId: text("hardware_id"),             // Empreinte HWID anti-double compte
  reason: text("reason").notNull(),            // Raison administrative ou anti-cheat trigger
  bannedBy: text("banned_by").default("ThirdEye Anti-Cheat").notNull(),
  active: boolean("active").default(true).notNull(),
  bannedAt: timestamp("banned_at").defaultNow().notNull(),
  expiresAt: timestamp("expires_at"),          // null si permanent
});
