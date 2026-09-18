/**
 * ═════════════════════════════════════════════════════════════════════════════
 * 🏠 REGISTRE FONCIER & MUNICIPAL — TRANSACTIONS, BAUX ET SERRURES v3.0
 * ═════════════════════════════════════════════════════════════════════════════
 * 
 * Gestionnaire immobilier officiel du Comté de Portneuf :
 *  - Persistance Drizzle ORM (PostgreSQL).
 *  - Droits de mutation immobilière (Taxe de bienvenue québécoise).
 *  - Baux officiels du Tribunal administratif du logement (TAL).
 *  - Serrurerie, gestion des doubles de clés (Keyholders) et codes NIP.
 *  - Systèmes d'alarme résidentiels ADT & Alertes 911 Sûreté du Québec.
 * ═════════════════════════════════════════════════════════════════════════════
 */

import { createFileRoute } from "@tanstack/react-router";
import { eq, sql } from "drizzle-orm";
import {
  pgTable,
  text,
  varchar,
  integer,
  boolean,
  real,
  timestamp,
  jsonb,
} from "drizzle-orm/pg-core";
import { db } from "../../../db";
import { characters, gameLogs } from "../../../db/schema";
import { handleIntellectus } from "@/intellectus/http.server";

// ─── 1. SCHÉMA DRIZZLE ORM (PROPRIÉTÉS & BAUX) ───────────────────────────────

export const properties = pgTable("properties", {
  id: varchar("id", { length: 64 }).primaryKey(),
  cadastreNumber: varchar("cadastre_number", { length: 32 }).notNull().unique(),
  name: text("name").notNull(),
  address: text("address").notNull(),
  town: varchar("town", { length: 64 }).notNull(),
  type: text("type").notNull(), // "house" | "apartment" | "commercial" | "warehouse" | "garage" | "farm"
  marketPrice: integer("market_price").notNull(),
  salePrice: integer("sale_price"),
  monthlyRent: integer("monthly_rent"),
  status: varchar("status", { length: 32 }).default("unlisted").notNull(), // "for_sale" | "for_rent" | "owned" | "unlisted"
  ownerId: varchar("owner_id", { length: 64 }),
  ownerName: text("owner_name"),
  tenantId: varchar("tenant_id", { length: 64 }),
  tenantName: text("tenant_name"),
  leaseSignedAt: timestamp("lease_signed_at", { withTimezone: true }),
  isLocked: boolean("is_locked").default(true).notNull(),
  pinCode: varchar("pin_code", { length: 16 }),
  keyHolders: jsonb("key_holders").$type<string[]>().default([]).notNull(),
  alarmInstalled: boolean("alarm_installed").default(false).notNull(),
  alarmTriggered: boolean("alarm_triggered").default(false).notNull(),
  heatType: text("heat_type").default("plinthes").notNull(), // "plinthes" | "thermopompe" | "central"
  waterType: text("water_type").default("municipal").notNull(), // "municipal" | "puits"
  hydroConnected: boolean("hydro_connected").default(true).notNull(),
  structuralIntegrity: integer("structural_integrity").default(100).notNull(),
  x: real("x").notNull(),
  y: real("y").notNull(),
  z: real("z").notNull(),
  interiorKind: varchar("interior_kind", { length: 64 }).notNull(),
  features: jsonb("features").$type<string[]>().default([]).notNull(),
});

export type PropertyType =
  | "house"
  | "apartment"
  | "hotel_room"
  | "commercial"
  | "warehouse"
  | "garage"
  | "farm"
  | "mansion";

export type ListingStatus = "owned" | "for_sale" | "for_rent" | "foreclosed" | "unlisted";

const CORS_HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store, no-cache",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Peer-Id, X-Session-Token, X-Actor-Id, X-Actor-Name",
} as const;

// ─── 2. FISCALITÉ QUÉBÉCOISE (TAXE DE BIENVENUE) ─────────────────────────────

/**
 * Calcule les Droits de mutation immobilière selon les barèmes officiels du Québec :
 *  - 0,5 % sur les premiers 58 900 $
 *  - 1,0 % sur la tranche de 58 900,01 $ à 294 600 $
 *  - 1,5 % sur l'excédent de 294 600 $
 */
export function calculateWelcomeTax(price: number): number {
  let tax = 0;
  let remaining = price;

  // Tranche 1 (0.5%)
  const step1 = Math.min(remaining, 58900);
  tax += step1 * 0.005;
  remaining -= step1;
  if (remaining <= 0) return Math.round(tax * 100) / 100;

  // Tranche 2 (1.0%)
  const step2 = Math.min(remaining, 294600 - 58900);
  tax += step2 * 0.01;
  remaining -= step2;
  if (remaining <= 0) return Math.round(tax * 100) / 100;

  // Tranche 3 (1.5%)
  tax += remaining * 0.015;

  return Math.round(tax * 100) / 100;
}

// ─── 3. GESTIONNAIRE DE REQUÊTES SERVEUR TANSTACK ────────────────────────────

async function handleServerRequest({ request }: { request: Request }): Promise<Response> {
  const url = new URL(request.url);
  const method = request.method.toUpperCase();

  if (method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  try {
    // ── 1. GET : CONSULTATION DU REGISTRE FONCIER ──
    if (method === "GET") {
      const isStats = url.searchParams.get("stats") === "true";
      const targetId = url.searchParams.get("id");

      const townFilter = url.searchParams.get("town");
      const typeFilter = url.searchParams.get("type");
      const statusFilter = url.searchParams.get("status");
      const ownerIdFilter = url.searchParams.get("ownerId");

      // Consultation individuelle
      if (targetId) {
        const [prop] = await db
          .select()
          .from(properties)
          .where(eq(properties.id, targetId))
          .limit(1);

        if (!prop) {
          return new Response(
            JSON.stringify({ ok: false, error: "property_not_found", message: "Immeuble introuvable au cadastre." }),
            { status: 404, headers: CORS_HEADERS }
          );
        }
        return new Response(
          JSON.stringify({ ok: true, property: prop }),
          { status: 200, headers: CORS_HEADERS }
        );
      }

      // Statistiques globales du marché
      if (isStats) {
        const allProps = await db.select().from(properties);
        const totalVal = allProps.reduce((acc: number, p: any) => acc + p.marketPrice, 0);
        const owned = allProps.filter((p: any) => p.ownerId !== null).length;
        const total = allProps.length;

        const stats = {
          totalPropertiesCount: total,
          ownedCount: owned,
          forSaleCount: allProps.filter((p: any) => p.status === "for_sale").length,
          forRentCount: allProps.filter((p: any) => p.status === "for_rent").length,
          averageHousePrice: Math.round(totalVal / (total || 1)),
          totalMarketValuation: totalVal,
          occupancyRatePct: Math.round((owned / (total || 1)) * 100),
          monthlyTotalRentalVolume: allProps.reduce((acc: number, p: any) => acc + (p.monthlyRent || 0), 0),
        };

        return new Response(
          JSON.stringify({ ok: true, data: stats, timestamp: Date.now() }),
          { status: 200, headers: CORS_HEADERS }
        );
      }

      // Liste filtrée
      const results = await db.select().from(properties);
      let list = [...results];

      if (townFilter) list = list.filter((p) => p.town.toLowerCase() === townFilter.toLowerCase());
      if (typeFilter) list = list.filter((p) => p.type === typeFilter);
      if (statusFilter) list = list.filter((p) => p.status === statusFilter);
      if (ownerIdFilter) {
        list = list.filter(
          (p) => p.ownerId === ownerIdFilter || p.keyHolders.includes(ownerIdFilter)
        );
      }

      return new Response(
        JSON.stringify({ ok: true, totalListings: list.length, properties: list }),
        { status: 200, headers: CORS_HEADERS }
      );
    }

    // ── 2. POST : MUTATIONS FONCIÈRES, ACHATS, BAUX, SERRURES & ADT ──
    if (method === "POST") {
      const body = await request.json();
      const { action, propertyId } = body;
      const actorId = request.headers.get("X-Actor-Id") || body.actorId;
      const actorName = request.headers.get("X-Actor-Name") || body.actorName || "Citoyen";

      if (!action || !propertyId) {
        return new Response(
          JSON.stringify({ ok: false, error: "missing_action_or_property_id" }),
          { status: 400, headers: CORS_HEADERS }
        );
      }

      const [prop] = await db
        .select()
        .from(properties)
        .where(eq(properties.id, propertyId))
        .limit(1);

      if (!prop) {
        return new Response(
          JSON.stringify({ ok: false, error: "property_not_found" }),
          { status: 404, headers: CORS_HEADERS }
        );
      }

      switch (action) {
        // ── A. ACHAT NOTARIÉ AVEC TAXE DE BIENVENUE ──
        case "buy_property": {
          const price = prop.salePrice || prop.marketPrice;
          const welcomeTax = calculateWelcomeTax(price);
          const totalCost = price + welcomeTax;

          const transactionResult = await db.transaction(async (tx: any) => {
            const [buyer] = await tx
              .select()
              .from(characters)
              .where(eq(characters.id, actorId))
              .limit(1);

            if (!buyer) return { ok: false, error: "buyer_not_found", message: "Acheteur introuvable." };
            if (buyer.bank < totalCost) {
              return {
                ok: false,
                error: "insufficient_funds_on_caisse",
                message: `Solde Desjardins insuffisant. Montant requis avec taxe de bienvenue : ${totalCost} $ CAD.`,
              };
            }

            // Débit de l'acheteur
            await tx
              .update(characters)
              .set({ bank: buyer.bank - totalCost })
              .where(eq(characters.id, actorId));

            // Crédit de l'ancien propriétaire (s'il existe)
            if (prop.ownerId) {
              await tx
                .update(characters)
                .set({ bank: sql`${characters.bank} + ${price}` })
                .where(eq(characters.id, prop.ownerId));
            }

            // Transfert du titre foncier
            await tx
              .update(properties)
              .set({
                ownerId: actorId,
                ownerName: actorName,
                status: "owned",
                salePrice: null,
                keyHolders: [actorId],
              })
              .where(eq(properties.id, propertyId));

            // Journalisation
            await tx.insert(gameLogs).values({
              id: `log_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
              characterId: actorId,
              type: "realty_purchase",
              message: `Achat notarié : ${prop.name} pour ${price} $ (Taxe de bienvenue : ${welcomeTax} $)`,
            });

            return { ok: true, welcomeTax };
          });

          if (!transactionResult.ok) {
            return new Response(
              JSON.stringify({ ok: false, error: transactionResult.error, message: transactionResult.message }),
              { status: 400, headers: CORS_HEADERS }
            );
          }

          return new Response(
            JSON.stringify({
              ok: true,
              message: `Acte notarié scellé pour [${prop.name}]. Droits de mutation acquittés : ${transactionResult.welcomeTax} $ CAD.`,
              welcomeTax: transactionResult.welcomeTax,
            }),
            { status: 200, headers: CORS_HEADERS }
          );
        }

        // ── B. BAIL DU TAL (TRIBUNAL ADMINISTRATIF DU LOGEMENT) ──
        case "sign_lease": {
          const rent = prop.monthlyRent || Math.round(prop.marketPrice * 0.005);

          const transactionResult = await db.transaction(async (tx: any) => {
            const [tenant] = await tx
              .select()
              .from(characters)
              .where(eq(characters.id, actorId))
              .limit(1);

            if (!tenant) return { ok: false, error: "tenant_not_found" };
            if (tenant.bank < rent) {
              return { ok: false, error: "insufficient_funds_for_first_month", message: "Fonds insuffisants pour le 1er mois." };
            }

            // Prélèvement du 1er mois de loyer
            await tx
              .update(characters)
              .set({ bank: tenant.bank - rent })
              .where(eq(characters.id, actorId));

            if (prop.ownerId) {
              await tx
                .update(characters)
                .set({ bank: sql`${characters.bank} + ${rent}` })
                .where(eq(characters.id, prop.ownerId));
            }

            const updatedHolders = Array.from(new Set([actorId, prop.ownerId].filter(Boolean) as string[]));

            // Mise à jour du bail
            await tx
              .update(properties)
              .set({
                tenantId: actorId,
                tenantName: actorName,
                leaseSignedAt: new Date(),
                status: "owned",
                keyHolders: updatedHolders,
              })
              .where(eq(properties.id, propertyId));

            return { ok: true };
          });

          if (!transactionResult.ok) {
            return new Response(
              JSON.stringify({ ok: false, error: transactionResult.error, message: transactionResult.message }),
              { status: 400, headers: CORS_HEADERS }
            );
          }

          return new Response(
            JSON.stringify({
              ok: true,
              message: `Bail officiel du TAL signé. Logement [${prop.name}] loué pour ${rent} $/mois.`,
            }),
            { status: 200, headers: CORS_HEADERS }
          );
        }

        // ── C. SERRURERIE (VERROUILLAGE / DÉVERROUILLAGE) ──
        case "toggle_lock": {
          const isAuthorized =
            prop.ownerId === actorId ||
            prop.tenantId === actorId ||
            prop.keyHolders.includes(actorId);

          if (!isAuthorized) {
            return new Response(
              JSON.stringify({ ok: false, error: "unauthorized_key_holder", message: "Vous n'avez pas la clé de cette porte." }),
              { status: 403, headers: CORS_HEADERS }
            );
          }

          const newLockState = !prop.isLocked;
          await db
            .update(properties)
            .set({ isLocked: newLockState })
            .where(eq(properties.id, propertyId));

          return new Response(
            JSON.stringify({
              ok: true,
              message: `La porte de [${prop.name}] est maintenant ${newLockState ? "verrouillée 🔒" : "déverrouillée 🔓"}.`,
              isLocked: newLockState,
            }),
            { status: 200, headers: CORS_HEADERS }
          );
        }

        case "set_pin": {
          if (prop.ownerId !== actorId && prop.tenantId !== actorId) {
            return new Response(
              JSON.stringify({ ok: false, error: "unauthorized" }),
              { status: 403, headers: CORS_HEADERS }
            );
          }

          const { pin } = body;
          if (!pin || String(pin).trim().length < 4) {
            return new Response(
              JSON.stringify({ ok: false, error: "invalid_pin_format", message: "Le code NIP doit comporter au moins 4 chiffres." }),
              { status: 400, headers: CORS_HEADERS }
            );
          }

          await db
            .update(properties)
            .set({ pinCode: String(pin).trim() })
            .where(eq(properties.id, propertyId));

          return new Response(
            JSON.stringify({ ok: true, message: "Code d'accès numérique mis à jour." }),
            { status: 200, headers: CORS_HEADERS }
          );
        }

        // ── D. GESTION DU TROUSSEAU DE CLÉS ──
        case "grant_keys": {
          if (prop.ownerId !== actorId && prop.tenantId !== actorId) {
            return new Response(
              JSON.stringify({ ok: false, error: "unauthorized" }),
              { status: 403, headers: CORS_HEADERS }
            );
          }

          const { targetId } = body;
          if (!targetId) {
            return new Response(
              JSON.stringify({ ok: false, error: "missing_target_id" }),
              { status: 400, headers: CORS_HEADERS }
            );
          }

          const currentKeys = new Set(prop.keyHolders);
          currentKeys.add(targetId);

          await db
            .update(properties)
            .set({ keyHolders: Array.from(currentKeys) })
            .where(eq(properties.id, propertyId));

          return new Response(
            JSON.stringify({ ok: true, message: `Double des clés permanent accordé à [${targetId}].` }),
            { status: 200, headers: CORS_HEADERS }
          );
        }

        case "revoke_keys": {
          if (prop.ownerId !== actorId && prop.tenantId !== actorId) {
            return new Response(
              JSON.stringify({ ok: false, error: "unauthorized" }),
              { status: 403, headers: CORS_HEADERS }
            );
          }

          const { targetId } = body;
          const updatedKeys = prop.keyHolders.filter((id: any) => id !== targetId);

          await db
            .update(properties)
            .set({ keyHolders: updatedKeys })
            .where(eq(properties.id, propertyId));

          return new Response(
            JSON.stringify({ ok: true, message: "Double des clés révoqué." }),
            { status: 200, headers: CORS_HEADERS }
          );
        }

        // ── E. SÉCURITÉ ALARME ADT / EFFRACTION ──
        case "trigger_alarm": {
          if (!prop.alarmInstalled) {
            return new Response(
              JSON.stringify({ ok: false, error: "no_alarm_system" }),
              { status: 400, headers: CORS_HEADERS }
            );
          }

          await db
            .update(properties)
            .set({ alarmTriggered: true })
            .where(eq(properties.id, propertyId));

          // Alerte 911 transmise à la Sûreté du Québec
          await db.insert(gameLogs).values({
            id: `log_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            characterId: prop.ownerId || "system",
            type: "police_911_alert",
            message: `CENTRALE ADT : Intrusion confirmée à [${prop.address}, ${prop.town}]. Envoi prioritaire d'une patrouille SQ.`,
          });

          return new Response(
            JSON.stringify({
              ok: true,
              alarmTriggered: true,
              message: "Alarme ADT déclenchée. Sûreté du Québec dépêchée sur place.",
            }),
            { status: 200, headers: CORS_HEADERS }
          );
        }

        case "reset_alarm": {
          const isAuthorized =
            prop.ownerId === actorId ||
            prop.tenantId === actorId ||
            prop.keyHolders.includes(actorId);

          if (!isAuthorized) {
            return new Response(
              JSON.stringify({ ok: false, error: "unauthorized" }),
              { status: 403, headers: CORS_HEADERS }
            );
          }

          await db
            .update(properties)
            .set({ alarmTriggered: false })
            .where(eq(properties.id, propertyId));

          return new Response(
            JSON.stringify({ ok: true, alarmTriggered: false, message: "Centrale d'alarme réarmée." }),
            { status: 200, headers: CORS_HEADERS }
          );
        }

        default:
          return new Response(
            JSON.stringify({ ok: false, error: "unknown_action", message: "Action immobilière non reconnue." }),
            { status: 400, headers: CORS_HEADERS }
          );
      }
    }

    return new Response(
      JSON.stringify({ ok: false, error: "method_not_allowed" }),
      { status: 405, headers: CORS_HEADERS }
    );
  } catch (err) {
    console.error("❌ [Realty REST Error]:", err);
    return new Response(
      JSON.stringify({
        ok: false,
        error: "server_error",
        message: err instanceof Error ? err.message : String(err),
      }),
      { status: 500, headers: CORS_HEADERS }
    );
  }
}

// ─── ROUTEUR TANSTACK START ──────────────────────────────────────────────────

export const Route = createFileRoute("/api/rp/properties")({
  server: {
    handlers: {
      GET: handleServerRequest,
      POST: handleServerRequest,
      OPTIONS: handleServerRequest,
    },
  },
});
