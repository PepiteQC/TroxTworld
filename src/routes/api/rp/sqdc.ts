/**
 * ═════════════════════════════════════════════════════════════════════════════
 * 🍁 SQDC — SOCIÉTÉ QUÉBÉCOISE DU CANNABIS (Succursale Portneuf v3.0)
 * ═════════════════════════════════════════════════════════════════════════════
 * 
 * Réglementation Québec (Loi encadrant le cannabis, RLRQ c C-5.3) :
 *  - 🔞 Âge minimum légal : 21 ans révolus.
 *  - ⚖️ Limite maximale de possession publique : 30.0g d'équivalent séché.
 *  - 🧪 Plafond de puissance québécois : 30.0% THC max (300 mg/g).
 *  - 🧾 Facturation officielle avec ventilation TPS (5%) et TVQ (9.975%).
 *  - 📦 Numéros de lots Santé Canada, sceaux d'accise et inventaire en temps réel.
 * ═════════════════════════════════════════════════════════════════════════════
 */

import { createFileRoute } from "@tanstack/react-router";
import { eq } from "drizzle-orm";
import { db } from "../../../db";
import { characters, inventoryItems, gameLogs } from "../../../db/schema";
import { handleIntellectus } from "@/intellectus/http.server";

// ─── 1. NORMES ET LÉGISLATION QUÉBÉCOISE ────────────────────────────────────

export const SQDC_LAW = {
  MINIMUM_AGE: 21,
  MAX_TRANSACTION_GRAMS: 30.0,
  MAX_THC_PERCENTAGE: 30.0,
  TPS_RATE: 0.05,
  TVQ_RATE: 0.09975,
  COMBINED_TAX: 0.14975,
} as const;

export type CannabisCategory =
  | "fleurs_sechees"
  | "moulus"
  | "pre_roules"
  | "haschich"
  | "huiles_capsules"
  | "boissons_comestibles";

export type StrainType = "Sativa" | "Indica" | "Hybride" | "CBD";

export interface SqdcProduct {
  id: string;
  name: string;
  producer: string;                    // Micro-producteur québécois certifié
  strain: StrainType;
  category: CannabisCategory;
  thcPct: number;                      // Pourcentage réel (Max 30%)
  cbdPct: number;
  formatGrams: number;                 // Format du contenant (ex: 3.5g, 28g)
  driedEquivalenceGrams: number;       // Équivalent légal en cannabis séché (Santé Canada)
  priceCad: number;                    // Prix unitaire avant taxes
  stockUnits: number;                  // Nombre d'unités en rayon
  terpenesMain: string[];
}

export interface SqdcCartItem {
  productId: string;
  quantityUnits: number;
}

export interface SqdcReceipt {
  receiptNumber: string;
  timestamp: number;
  customerName: string;
  totalGramsPurchased: number;
  subtotal: number;
  tps: number;
  tvq: number;
  total: number;
  lotNumber: string;
  exciseStamp: string;
  cashierBadge: string;
}

// ─── 2. CATALOGUE OFFICIEL DE LA SUCCURSALE DE DONNACONA ─────────────────────

export const SQDC_CATALOG: SqdcProduct[] = [
  // ── Fleurs Séchées (3.5g & Once 28g) ──
  {
    id: "fleur_de_lise_cerise",
    name: "Cerise sur le Gâteau (3.5g)",
    producer: "Fleur de Lise (Origine Québec)",
    strain: "Sativa",
    category: "fleurs_sechees",
    thcPct: 24.5,
    cbdPct: 0.1,
    formatGrams: 3.5,
    driedEquivalenceGrams: 3.5,
    priceCad: 28.9,
    stockUnits: 140,
    terpenesMain: ["Myrcène", "Limonène", "Caryophyllène"],
  },
  {
    id: "tribal_gelato_mint",
    name: "Gelato Mint (3.5g)",
    producer: "Tribal (Cannara Biotech, Valleyfield)",
    strain: "Indica",
    category: "fleurs_sechees",
    thcPct: 26.2,
    cbdPct: 0.1,
    formatGrams: 3.5,
    driedEquivalenceGrams: 3.5,
    priceCad: 25.6,
    stockUnits: 95,
    terpenesMain: ["Farnésène", "Caryophyllène", "Limonène"],
  },
  {
    id: "bleuh_h26_indica",
    name: "H26 Indica Élevé (3.5g)",
    producer: "Bleuh (Micro-Québec)",
    strain: "Indica",
    category: "fleurs_sechees",
    thcPct: 28.5,
    cbdPct: 0.05,
    formatGrams: 3.5,
    driedEquivalenceGrams: 3.5,
    priceCad: 29.8,
    stockUnits: 80,
    terpenesMain: ["Limonène", "Myrcène"],
  },
  {
    id: "gros_plaisirs_once",
    name: "Gros Plaisirs Once (28g)",
    producer: "Pure Laine Cannabis (Matane)",
    strain: "Hybride",
    category: "fleurs_sechees",
    thcPct: 22.0,
    cbdPct: 0.1,
    formatGrams: 28.0,
    driedEquivalenceGrams: 28.0,
    priceCad: 139.9,
    stockUnits: 30,
    terpenesMain: ["Pinène", "Caryophyllène"],
  },

  // ── Pré-Roulés ──
  {
    id: "nugz_early_lemon_joints",
    name: "Early Lemon Berry Pré-Roulés (3 x 0.5g)",
    producer: "Nugz (Cannara Biotech)",
    strain: "Sativa",
    category: "pre_roules",
    thcPct: 21.0,
    cbdPct: 0.2,
    formatGrams: 1.5,
    driedEquivalenceGrams: 1.5,
    priceCad: 11.2,
    stockUnits: 210,
    terpenesMain: ["Limonène", "Ocimène"],
  },
  {
    id: "tribal_terple_joint",
    name: "Terple Pré-Roulé Simple (1 x 1g)",
    producer: "Tribal",
    strain: "Hybride",
    category: "pre_roules",
    thcPct: 25.0,
    cbdPct: 0.1,
    formatGrams: 1.0,
    driedEquivalenceGrams: 1.0,
    priceCad: 8.5,
    stockUnits: 300,
    terpenesMain: ["Myrcène", "Terpinolène"],
  },

  // ── Haschich Québécois (Plafond 30% respecté) ──
  {
    id: "tremblant_hashish",
    name: "Haschich Traditionnel Tremblant (3.5g)",
    producer: "Tremblant Cannabis",
    strain: "Indica",
    category: "haschich",
    thcPct: 29.8,
    cbdPct: 2.5,
    formatGrams: 3.5,
    driedEquivalenceGrams: 14.0, // 1g de Haschich = 4g équiv. séché (Santé Canada)
    priceCad: 44.9,
    stockUnits: 65,
    terpenesMain: ["Caryophyllène", "Humulène"],
  },

  // ── Bien-Être & CBD ──
  {
    id: "nordet_cbd_huile",
    name: "Huile Nordet CBD 1000mg (30ml)",
    producer: "Médicabilis Québec",
    strain: "CBD",
    category: "huiles_capsules",
    thcPct: 0.8,
    cbdPct: 33.3,
    formatGrams: 30.0,
    driedEquivalenceGrams: 5.0,
    priceCad: 36.5,
    stockUnits: 75,
    terpenesMain: ["Bisabolol"],
  },

  // ── Boissons Prêtes à Boire ──
  {
    id: "mollo_5_lime",
    name: "Mollo 5mg Lime Givrée (355ml)",
    producer: "Mollo (Hexo)",
    strain: "Hybride",
    category: "boissons_comestibles",
    thcPct: 1.4,
    cbdPct: 1.4,
    formatGrams: 355.0,
    driedEquivalenceGrams: 5.1,
    priceCad: 6.2,
    stockUnits: 180,
    terpenesMain: ["Limonène"],
  },
];

const productMap = new Map<string, SqdcProduct>(SQDC_CATALOG.map((p) => [p.id, p]));

// ─── 3. ÉTAT DE LA SUCCURSALE EN MÉMOIRE VIVE ────────────────────────────────

interface SqdcBranchState {
  storeId: string;
  storeName: string;
  address: string;
  isOpen: boolean;
  safeBalanceCad: number;
  registerCashCad: number;
  activeCashierBadge: string | null;
  lastInventoryAudit: number;
}

const branchState: SqdcBranchState = {
  storeId: "sqdc_portneuf_01",
  storeName: "SQDC — Succursale 104 Portneuf (Donnacona)",
  address: "240 Route 138, Donnacona, QC G3M 1B7",
  isOpen: true,
  safeBalanceCad: 12500.0,
  registerCashCad: 850.0,
  activeCashierBadge: "EMP-4102",
  lastInventoryAudit: Date.now(),
};

const CORS_HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store, no-cache",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Admin-Key, X-Player-Id",
} as const;

function generateLotNumber(): string {
  const dateStr = new Date().toISOString().slice(2, 10).replace(/-/g, "");
  return `LOT-${dateStr}-${Math.floor(1000 + Math.random() * 9000)}`;
}

function generateExciseStamp(): string {
  return `ACCISE-QC-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
}

// ─── 4. GESTIONNAIRE DE REQUÊTES SERVEUR TANSTACK ────────────────────────────

async function handleServerRequest({ request }: { request: Request }): Promise<Response> {
  const url = new URL(request.url);
  const method = request.method.toUpperCase();

  if (method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  try {
    // ── 1. GET : CATALOGUE & INVENTAIRE EN TEMPS RÉEL ──
    if (method === "GET") {
      const categoryFilter = url.searchParams.get("category") as CannabisCategory | null;
      const strainFilter = url.searchParams.get("strain") as StrainType | null;

      let catalog = Array.from(productMap.values());

      if (categoryFilter) catalog = catalog.filter((p) => p.category === categoryFilter);
      if (strainFilter) catalog = catalog.filter((p) => p.strain === strainFilter);

      return new Response(
        JSON.stringify({
          ok: true,
          branch: {
            storeName: branchState.storeName,
            address: branchState.address,
            isOpen: branchState.isOpen,
            laws: {
              ageRequired: SQDC_LAW.MINIMUM_AGE,
              maxGramsAllowed: SQDC_LAW.MAX_TRANSACTION_GRAMS,
              maxThcPercent: SQDC_LAW.MAX_THC_PERCENTAGE,
            },
          },
          inventoryCount: catalog.length,
          catalog,
        }),
        { status: 200, headers: CORS_HEADERS }
      );
    }

    // ── 2. POST : ACHAT, RESTOCK & BRAQUAGE DU TIROIR-CAISSE ──
    if (method === "POST") {
      let body: any = {};
      try {
        body = await request.json();
      } catch {
        return new Response(
          JSON.stringify({ ok: false, error: "invalid_json" }),
          { status: 400, headers: CORS_HEADERS }
        );
      }

      const {
        action,
        playerId = "local_player",
        items = [],
        paymentMethod = "cash",
        amountCad = 0,
      } = body;

      // ── A. ACHAT EN SUCCURSALE AVEC CONTRÔLE DE LA LOI DE 30G ──
      if (action === "checkout" || action === "purchase") {
        const cartItems: SqdcCartItem[] = Array.isArray(items) ? items : [];

        if (cartItems.length === 0) {
          return new Response(
            JSON.stringify({ ok: false, error: "empty_cart", message: "Votre panier est vide." }),
            { status: 400, headers: CORS_HEADERS }
          );
        }

        let totalDriedEquivGrams = 0;
        let subtotal = 0;
        const purchaseLines: Array<{ product: SqdcProduct; qty: number }> = [];

        for (const item of cartItems) {
          const prod = productMap.get(item.productId);
          if (!prod) {
            return new Response(
              JSON.stringify({ ok: false, error: "invalid_product", message: `Produit introuvable (${item.productId})` }),
              { status: 404, headers: CORS_HEADERS }
            );
          }
          if (prod.stockUnits < item.quantityUnits) {
            return new Response(
              JSON.stringify({ ok: false, error: "out_of_stock", message: `Rupture de stock pour ${prod.name}.` }),
              { status: 400, headers: CORS_HEADERS }
            );
          }

          totalDriedEquivGrams += prod.driedEquivalenceGrams * item.quantityUnits;
          subtotal += prod.priceCad * item.quantityUnits;
          purchaseLines.push({ product: prod, qty: item.quantityUnits });
        }

        // 🛑 CONTRÔLE LÉGAL : MAXIMUM 30.0 GRAMMES PAR TRANSACTION
        if (totalDriedEquivGrams > SQDC_LAW.MAX_TRANSACTION_GRAMS) {
          return new Response(
            JSON.stringify({
              ok: false,
              error: "exceeds_legal_limit",
              message: `Refusé par la loi québécoise : Total de ${totalDriedEquivGrams.toFixed(1)}g dépasse la limite légale autorisée de 30.0g par transaction publique.`,
              currentGrams: totalDriedEquivGrams,
              maxAllowed: SQDC_LAW.MAX_TRANSACTION_GRAMS,
            }),
            { status: 400, headers: CORS_HEADERS }
          );
        }

        // Taxes TPS (5%) + TVQ (9.975%)
        const tps = Math.round(subtotal * SQDC_LAW.TPS_RATE * 100) / 100;
        const tvq = Math.round(subtotal * SQDC_LAW.TVQ_RATE * 100) / 100;
        const total = Math.round((subtotal + tps + tvq) * 100) / 100;

        // Transaction Atomique PostgreSQL (Paiement + Inventaire + Déduction)
        const txResult = await db.transaction(async (tx: any) => {
          const [char] = await tx
            .select()
            .from(characters)
            .where(eq(characters.id, playerId))
            .limit(1);

          if (!char) {
            return { ok: false, error: "character_not_found", message: "Citoyen introuvable.", status: 404 };
          }

          // 🛑 CONTRÔLE DE L'ÂGE LÉGAL (21 ANS MINIMUM)
          const charAge = (char as any).age ?? 22;
          if (charAge < SQDC_LAW.MINIMUM_AGE) {
            return {
              ok: false,
              error: "underage_buyer",
              message: "Vente interdite aux mineurs de 21 ans (Loi encadrant le cannabis, RLRQ c C-5.3).",
              status: 403,
            };
          }

          // Paiement
          if (paymentMethod === "cash") {
            if (char.cash < total) {
              return { ok: false, error: "insufficient_cash", message: "Fonds insuffisants en argent liquide.", status: 400 };
            }
            await tx.update(characters).set({ cash: char.cash - total }).where(eq(characters.id, playerId));
            branchState.registerCashCad += total;
          } else {
            if (char.bank < total) {
              return { ok: false, error: "insufficient_bank_funds", message: "Solde Desjardins insuffisant.", status: 400 };
            }
            await tx.update(characters).set({ bank: char.bank - total }).where(eq(characters.id, playerId));
            branchState.safeBalanceCad += total;
          }

          const lotNumber = generateLotNumber();
          const exciseStamp = generateExciseStamp();

          // Déduction stock & insertion dans l'inventaire
          for (const line of purchaseLines) {
            line.product.stockUnits -= line.qty;

            await tx.insert(inventoryItems).values({
              id: `sqdc_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
              characterId: playerId,
              itemId: line.product.id,
              itemType: "cannabis_sealed",
              quantity: line.qty,
              durability: 100, // Sceau de fraîcheur hermétique intact
            });
          }

          // Journalisation légale
          await tx.insert(gameLogs).values({
            id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            characterId: playerId,
            type: "sqdc_purchase",
            message: `Achat SQDC certifié : ${purchaseLines.map((l) => `${l.qty}x ${l.product.name}`).join(", ")} | Total: ${total} $ (Taxes TPS+TVQ: ${(tps + tvq).toFixed(2)} $) | Lot: ${lotNumber}`,
          });

          return { ok: true, lotNumber, exciseStamp, customerName: char.name };
        });

        if (!txResult.ok) {
          return new Response(
            JSON.stringify({ ok: false, error: txResult.error, message: txResult.message }),
            { status: txResult.status, headers: CORS_HEADERS }
          );
        }

        const receipt: SqdcReceipt = {
          receiptNumber: `REC-SQDC-${Date.now().toString().slice(-6)}`,
          timestamp: Date.now(),
          customerName: txResult.customerName || "Citoyen",
          totalGramsPurchased: totalDriedEquivGrams,
          subtotal,
          tps,
          tvq,
          total,
          lotNumber: txResult.lotNumber || "LOT-PORTNEUF",
          exciseStamp: txResult.exciseStamp || "ACCISE-QC",
          cashierBadge: branchState.activeCashierBadge || "CAISSE-AUTO",
        };

        try {
          await handleIntellectus(request);
        } catch {}

        return new Response(JSON.stringify({ ok: true, receipt }), { status: 200, headers: CORS_HEADERS });
      }

      // ── B. RÉAPPROVISIONNEMENT DE LA SUCCURSALE (RESTOCK) ──
      if (action === "restock" || action === "order_stock") {
        const { productId, quantityUnits = 50 } = body;
        const prod = productMap.get(productId);
        if (!prod) {
          return new Response(
            JSON.stringify({ ok: false, error: "product_not_found" }),
            { status: 404, headers: CORS_HEADERS }
          );
        }

        const addedUnits = Math.max(1, parseInt(quantityUnits, 10) || 50);
        prod.stockUnits += addedUnits;

        return new Response(
          JSON.stringify({
            ok: true,
            message: `Réception de ${addedUnits} contenants scellés de [${prod.name}]. Nouveau stock : ${prod.stockUnits} unités.`,
            product: prod,
          }),
          { status: 200, headers: CORS_HEADERS }
        );
      }

      // ── C. SCÉNARIO RP : BRAQUAGE DU TIROIR-CAISSE (ROBBERY) ──
      if (action === "rob_register") {
        const stolenCash = branchState.registerCashCad;
        branchState.registerCashCad = 50.0; // Fond de caisse minimal

        // Alerte 911 immédiate à la Sûreté du Québec
        await db.insert(gameLogs).values({
          id: `log_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          characterId: playerId,
          type: "police_911_alert",
          message: `🚨 ALARME SILENCIEUSE SQDC : Braquage à main armée en cours à la succursale de Donnacona (Butin: ${stolenCash.toFixed(2)} $ CAD).`,
        });

        // Relais vers Intellectus
        try {
          await handleIntellectus(request);
        } catch {}

        return new Response(
          JSON.stringify({
            ok: true,
            stolenAmount: stolenCash,
            message: `Tiroir-caisse forcé ! Vous avez dérobé ${stolenCash.toFixed(2)} $ CAD. L'alarme silencieuse de la SQ s'est déclenchée !`,
          }),
          { status: 200, headers: CORS_HEADERS }
        );
      }

      // ── D. GESTION DU COFFRE-FORT DE LA SUCCURSALE ──
      if (action === "deposit_safe" || action === "withdraw_safe") {
        const amount = Math.max(0, parseFloat(amountCad) || 0);

        if (action === "deposit_safe") {
          branchState.safeBalanceCad += amount;
        } else {
          if (branchState.safeBalanceCad < amount) {
            return new Response(
              JSON.stringify({ ok: false, error: "insufficient_safe_funds", message: "Fonds insuffisants dans le coffre-fort." }),
              { status: 400, headers: CORS_HEADERS }
            );
          }
          branchState.safeBalanceCad -= amount;
        }

        return new Response(
          JSON.stringify({
            ok: true,
            safeBalanceCad: branchState.safeBalanceCad,
            registerCashCad: branchState.registerCashCad,
          }),
          { status: 200, headers: CORS_HEADERS }
        );
      }

      return new Response(
        JSON.stringify({ ok: false, error: "unknown_action", message: "Action SQDC non reconnue." }),
        { status: 400, headers: CORS_HEADERS }
      );
    }

    return new Response(
      JSON.stringify({ ok: false, error: "method_not_allowed" }),
      { status: 405, headers: CORS_HEADERS }
    );
  } catch (err) {
    console.error("❌ [SQDC REST Error]:", err);
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

export const Route = createFileRoute("/api/rp/sqdc")({
  server: {
    handlers: {
      GET: handleServerRequest,
      POST: handleServerRequest,
      OPTIONS: handleServerRequest,
    },
  },
});
