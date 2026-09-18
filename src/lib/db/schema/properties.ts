import { pgTable, text, integer, boolean, timestamp } from "drizzle-orm/pg-core";

export const dbProperties = pgTable("properties", {
  id: text("id").primaryKey(),                 // prop_loft_pontrouge, etc.
  name: text("name").notNull(),                // Nom commercial
  address: text("address").notNull(),          // Adresse civique
  price: integer("price").notNull(),           // Prix d'achat MLS
  ownerId: text("owner_id"),                   // ID du citoyen propriétaire (null si libre)
  isLocked: boolean("is_locked").default(true).notNull(),
  type: text("type").default("apartment").notNull(), // apartment|house|loft|garage|industrial
  inventoryId: text("inventory_id"),           // Coffre de maison associé
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
