/**
 * ═════════════════════════════════════════════════════════════════════════════
 * 🏦 CAISSE DESJARDINS DE PORTNEUF — SYSTÈME BANCAIRE & FINANCES RP v3.0
 * ═════════════════════════════════════════════════════════════════════════════
 * 
 * Système Financier & Normes Bancaires Québécoises :
 *  - 🔒 Transactions Atomiques Anti-Duplication (Isolation ACID Drizzle ORM).
 *  - 📲 Virements Interac sécurisés de citoyen à citoyen.
 *  - 📊 Cote de Crédit Desjardins/SAAQ (300-850) & Prêts de relance commerciale.
 *  - 🧼 Blanchiment d'argent sale (Dirty Cash) & Frais de commission.
 *  - 🚔 Saisies judiciaires d'avoirs criminels par la Sûreté du Québec.
 * ═════════════════════════════════════════════════════════════════════════════
 */

import { createFileRoute } from "@tanstack/react-router";
import { eq, sql } from "drizzle-orm";
import { db } from "../../../db";
import { characters, gameLogs } from "../../../db/schema";
import { handleIntellectus } from "@/intellectus/http.server";

// ─── 1. TYPES & INTERFACES BANCAIRES ────────────────────────────────────────

export type TransactionType =
  | "deposit"
  | "withdraw"
  | "transfer"
  | "interac"
  | "loan_pay"
  | "loan_request"
  | "salary"
  | "seizure"
  | "robbery"
  | "launder";

export interface BankTransaction {
  id: string;
  timestamp: number;
  type: TransactionType;
  amount: number;
  description: string;
  targetAccount?: string;
}

export interface BankAccount {
  accountId: string;          // Norme Desjardins : Inst-Transit-Folio (815-30114-XXXXXXX)
  ownerId: string;
  ownerName: string;
  balance: number;            // Solde bancaire liquide vérifié
  dirtyBalance: number;       // Argent sale non blanchi (braquages / trafic)
  loanBalance: number;        // Solde de la dette en cours
  creditScore: number;        // Cote de crédit québécoise (300 à 850)
  transactions: BankTransaction[];
}

// Constantes Desjardins Québec
const DESJARDINS_INSTITUTION = "815";
const DESJARDINS_TRANSIT = "30114"; // Succursale Donnacona / Portneuf

const CORS_HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store, no-cache",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Player-Id, X-Admin-Key",
} as const;

// ─── 2. UTILITAIRE : GÉNÉRATION DU NUMÉRO DE FOLIO ──────────────────────────

/**
 * Génère un numéro de compte Desjardins déterministe à 7 chiffres pour le joueur.
 */
function generateDesjardinsFolio(charId: string): string {
  let hash = 0;
  for (let i = 0; i < charId.length; i++) {
    hash = charId.charCodeAt(i) + ((hash << 5) - hash);
  }
  const folio = Math.abs(hash % 9000000) + 1000000;
  return `${DESJARDINS_INSTITUTION}-${DESJARDINS_TRANSIT}-${folio}`;
}

// ─── 3. GESTIONNAIRE DE REQUÊTES SERVEUR ────────────────────────────────────

async function handleServerRequest({ request }: { request: Request }): Promise<Response> {
  const url = new URL(request.url);
  const method = request.method.toUpperCase();

  if (method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  try {
    // ── 1. GET : CONSULTATION DU COMPTE & HISTORIQUE DES TRANSACTIONS ──
    if (method === "GET") {
      const playerId = url.searchParams.get("playerId") || request.headers.get("X-Player-Id") || "local_player";

      const [char] = await db
        .select()
        .from(characters)
        .where(eq(characters.id, playerId))
        .limit(1);

      if (!char) {
        return new Response(
          JSON.stringify({ ok: false, error: "character_not_found", message: "Membre Desjardins introuvable." }),
          { status: 404, headers: CORS_HEADERS }
        );
      }

      const account: BankAccount = {
        accountId: generateDesjardinsFolio(char.id),
        ownerId: char.id,
        ownerName: char.name,
        balance: char.bank,
        dirtyBalance: (char as any).dirtyBalance ?? 0,
        loanBalance: (char as any).loanBalance ?? 0,
        creditScore: (char as any).creditScore ?? 680,
        transactions: ((char as any).bankTransactions as BankTransaction[]) ?? [
          {
            id: "tx_init",
            timestamp: Date.now(),
            type: "deposit",
            amount: char.bank,
            description: "Solde initial certifié par la Caisse",
          },
        ],
      };

      return new Response(JSON.stringify({ ok: true, account }), { status: 200, headers: CORS_HEADERS });
    }

    // ── 2. POST : MUTATIONS BANCAIRES SÉCURISÉES (ANTI-DUPE) ──
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

      const { action, playerId, amount, targetId, description = "" } = body;
      const value = Math.max(0, parseInt(amount, 10) || 0);
      const charId = playerId || request.headers.get("X-Player-Id") || "local_player";

      if (!action) {
        return new Response(
          JSON.stringify({ ok: false, error: "missing_action", message: "Action bancaire requise." }),
          { status: 400, headers: CORS_HEADERS }
        );
      }

      // Exécution de la transaction SQL atomique
      const transactionResult = await db.transaction(async (tx: any) => {
        const [char] = await tx
          .select()
          .from(characters)
          .where(eq(characters.id, charId))
          .limit(1);

        if (!char) {
          return { ok: false, error: "character_not_found", message: "Compte source introuvable.", status: 404 };
        }

        const currentTxs: BankTransaction[] = ((char as any).bankTransactions as BankTransaction[]) ?? [];
        const currentDirty = (char as any).dirtyBalance ?? 0;
        const currentLoan = (char as any).loanBalance ?? 0;
        const currentCredit = (char as any).creditScore ?? 680;
        const nowTs = Date.now();

        switch (action) {
          // A. DÉPÔT D'ESPÈCES AU GUICHET (ATM)
          case "deposit": {
            if (value <= 0) return { ok: false, error: "invalid_amount", message: "Montant de dépôt invalide.", status: 400 };
            if (char.cash < value) {
              return { ok: false, error: "insufficient_cash", message: "Fonds insuffisants en espèces.", status: 400 };
            }

            const newTx: BankTransaction = {
              id: `tx_${nowTs}_${Math.random().toString(36).slice(2, 6)}`,
              timestamp: nowTs,
              type: "deposit",
              amount: value,
              description: description || "Dépôt d'espèces au guichet automatique",
            };

            await tx
              .update(characters)
              .set({
                cash: char.cash - value,
                bank: char.bank + value,
                bankTransactions: [newTx, ...currentTxs].slice(0, 30) as any,
              })
              .where(eq(characters.id, charId));
            break;
          }

          // B. RETRAIT D'ESPÈCES AU GUICHET DESJARDINS
          case "withdraw": {
            if (value <= 0) return { ok: false, error: "invalid_amount", message: "Montant de retrait invalide.", status: 400 };
            if (char.bank < value) {
              return { ok: false, error: "insufficient_bank_funds", message: "Solde bancaire insuffisant.", status: 400 };
            }

            const newTx: BankTransaction = {
              id: `tx_${nowTs}_${Math.random().toString(36).slice(2, 6)}`,
              timestamp: nowTs,
              type: "withdraw",
              amount: value,
              description: description || "Retrait de fonds au guichet",
            };

            await tx
              .update(characters)
              .set({
                cash: char.cash + value,
                bank: char.bank - value,
                bankTransactions: [newTx, ...currentTxs].slice(0, 30) as any,
              })
              .where(eq(characters.id, charId));
            break;
          }

          // C. VIREMENT INTERAC SÉCURISÉ
          case "interac_send": {
            if (value <= 0) return { ok: false, error: "invalid_amount", message: "Montant de virement invalide.", status: 400 };
            if (!targetId) return { ok: false, error: "missing_target_id", message: "Destinataire du virement manquant.", status: 400 };

            const interacFee = char.bank >= 1000 ? 0 : 1.0; // Gratuit dès 1000$ de solde, sinon 1$ de frais de réseau
            const totalCost = value + interacFee;

            if (char.bank < totalCost) {
              return {
                ok: false,
                error: "insufficient_funds_for_interac",
                message: `Solde insuffisant pour le virement Interac (Requis: ${totalCost} $ CAD avec frais).`,
                status: 400,
              };
            }

            const [targetChar] = await tx
              .select()
              .from(characters)
              .where(eq(characters.id, targetId))
              .limit(1);

            if (!targetChar) {
              return { ok: false, error: "recipient_not_found", message: "Bénéficiaire Interac introuvable.", status: 404 };
            }

            const senderTx: BankTransaction = {
              id: `tx_out_${nowTs}`,
              timestamp: nowTs,
              type: "interac",
              amount: value,
              description: `Virement Interac envoyé vers ${targetChar.name}`,
              targetAccount: generateDesjardinsFolio(targetChar.id),
            };

            // Débit de l'expéditeur
            await tx
              .update(characters)
              .set({
                bank: char.bank - totalCost,
                bankTransactions: [senderTx, ...currentTxs].slice(0, 30) as any,
              })
              .where(eq(characters.id, charId));

            // Crédit du destinataire
            const targetTxs: BankTransaction[] = ((targetChar as any).bankTransactions as BankTransaction[]) ?? [];
            const recipientTx: BankTransaction = {
              id: `tx_in_${nowTs}`,
              timestamp: nowTs,
              type: "deposit",
              amount: value,
              description: `Virement Interac reçu de ${char.name}`,
              targetAccount: generateDesjardinsFolio(char.id),
            };

            await tx
              .update(characters)
              .set({
                bank: targetChar.bank + value,
                bankTransactions: [recipientTx, ...targetTxs].slice(0, 30) as any,
              })
              .where(eq(characters.id, targetId));

            // Journalisation
            await tx.insert(gameLogs).values({
              id: `log_${nowTs}_${Math.random().toString(36).slice(2, 6)}`,
              characterId: charId,
              type: "interac_transfer",
              message: `Virement Interac de ${value} $ CAD de [${char.name}] vers [${targetChar.name}] (Frais: ${interacFee} $)`,
            });
            break;
          }

          // D. VERSEMENT DE SALAIRE DIRECT (Employeur / État)
          case "salary_payout": {
            if (value <= 0) return { ok: false, error: "invalid_amount", status: 400 };

            const salaryTx: BankTransaction = {
              id: `tx_sal_${nowTs}`,
              timestamp: nowTs,
              type: "salary",
              amount: value,
              description: description || "Dépôt direct de paie périodique",
            };

            await tx
              .update(characters)
              .set({
                bank: char.bank + value,
                bankTransactions: [salaryTx, ...currentTxs].slice(0, 30) as any,
              })
              .where(eq(characters.id, charId));
            break;
          }

          // E. DEMANDE DE PRÊT PERSONNEL / COMMERCIAL DESJARDINS
          case "loan_request": {
            if (currentCredit < 580) {
              return {
                ok: false,
                error: "credit_score_too_low",
                message: `Demande de prêt refusée. Votre cote de crédit (${currentCredit}) est inférieure au seuil minimal de 580.`,
                status: 400,
              };
            }
            if (currentLoan + value > 75000) {
              return {
                ok: false,
                error: "loan_limit_exceeded",
                message: "Capacité d'endettement maximale atteinte (75 000 $ CAD).",
                status: 400,
              };
            }

            const loanTx: BankTransaction = {
              id: `tx_loan_${nowTs}`,
              timestamp: nowTs,
              type: "loan_request",
              amount: value,
              description: `Prêt Desjardins octroyé (${value} $ CAD)`,
            };

            await tx
              .update(characters)
              .set({
                bank: char.bank + value,
                loanBalance: currentLoan + value,
                creditScore: Math.max(300, currentCredit - 12),
                bankTransactions: [loanTx, ...currentTxs].slice(0, 30) as any,
              } as any)
              .where(eq(characters.id, charId));
            break;
          }

          // F. REMBOURSEMENT DE PRÊT BANCAIRE
          case "loan_pay": {
            if (currentLoan <= 0) {
              return { ok: false, error: "no_active_loans", message: "Vous n'avez aucun prêt actif à rembourser.", status: 400 };
            }
            if (char.bank < value) {
              return { ok: false, error: "insufficient_bank_funds", message: "Fonds bancaires insuffisants.", status: 400 };
            }

            const paidAmount = Math.min(currentLoan, value);

            const loanPayTx: BankTransaction = {
              id: `tx_repay_${nowTs}`,
              timestamp: nowTs,
              type: "loan_pay",
              amount: paidAmount,
              description: `Remboursement de dette bancaire (-${paidAmount} $ CAD)`,
            };

            await tx
              .update(characters)
              .set({
                bank: char.bank - paidAmount,
                loanBalance: currentLoan - paidAmount,
                creditScore: Math.min(850, currentCredit + 20), // Rembourser améliore la cote de crédit
                bankTransactions: [loanPayTx, ...currentTxs].slice(0, 30) as any,
              } as any)
              .where(eq(characters.id, charId));
            break;
          }

          // G. BLANCHIMENT D'ARGENT SALE (LAUNDERING)
          case "launder": {
            if (currentDirty < value || value <= 0) {
              return { ok: false, error: "insufficient_dirty_funds", message: "Fonds illicites insuffisants pour cette opération.", status: 400 };
            }

            const commissionRate = 0.30; // 30% de frais prélevés par le réseau clandestin
            const cleanAmount = Math.round(value * (1 - commissionRate));

            const launderTx: BankTransaction = {
              id: `tx_clean_${nowTs}`,
              timestamp: nowTs,
              type: "launder",
              amount: cleanAmount,
              description: `Dépôt commercial certifié (Frais de service: 30%)`,
            };

            await tx
              .update(characters)
              .set({
                dirtyBalance: currentDirty - value,
                bank: char.bank + cleanAmount,
                bankTransactions: [launderTx, ...currentTxs].slice(0, 30) as any,
              } as any)
              .where(eq(characters.id, charId));
            break;
          }

          // H. SAISIE JUDICIAIRE / CONFISCATION POLICIÈRE (SQ)
          case "police_seizure": {
            if (currentDirty <= 0 && char.bank <= 0) {
              return { ok: false, error: "no_funds_to_seize", message: "Aucun actif saisissable sur ce compte.", status: 400 };
            }

            const seizedDirty = currentDirty;
            const seizureTx: BankTransaction = {
              id: `tx_seize_${nowTs}`,
              timestamp: nowTs,
              type: "seizure",
              amount: seizedDirty,
              description: `Saisie d'avoirs criminels par la Sûreté du Québec (Mandat 487)`,
            };

            await tx
              .update(characters)
              .set({
                dirtyBalance: 0,
                bankTransactions: [seizureTx, ...currentTxs].slice(0, 30) as any,
              } as any)
              .where(eq(characters.id, charId));

            await tx.insert(gameLogs).values({
              id: `log_${nowTs}_${Math.random().toString(36).slice(2, 6)}`,
              characterId: charId,
              type: "police_seizure_asset",
              message: `Saisie de ${seizedDirty} $ CAD d'argent sale sur le compte de [${char.name}] par la SQ.`,
            });
            break;
          }

          default:
            return { ok: false, error: "unknown_action", message: "Action bancaire non reconnue.", status: 400 };
        }

        return { ok: true, status: 200 };
      });

      if (!transactionResult.ok) {
        return new Response(
          JSON.stringify({ ok: false, error: transactionResult.error, message: transactionResult.message }),
          { status: transactionResult.status, headers: CORS_HEADERS }
        );
      }

      // Récupération de l'état du compte après la transaction
      const [updatedChar] = await db
        .select()
        .from(characters)
        .where(eq(characters.id, charId))
        .limit(1);

      const account: BankAccount = {
        accountId: generateDesjardinsFolio(updatedChar.id),
        ownerId: updatedChar.id,
        ownerName: updatedChar.name,
        balance: updatedChar.bank,
        dirtyBalance: (updatedChar as any).dirtyBalance ?? 0,
        loanBalance: (updatedChar as any).loanBalance ?? 0,
        creditScore: (updatedChar as any).creditScore ?? 680,
        transactions: ((updatedChar as any).bankTransactions as BankTransaction[]) ?? [],
      };

      try {
        await handleIntellectus(request);
      } catch {
        // Ignorer si hors-ligne
      }

      return new Response(
        JSON.stringify({ ok: true, message: "Opération bancaire effectuée avec succès.", account }),
        { status: 200, headers: CORS_HEADERS }
      );
    }

    return new Response(
      JSON.stringify({ ok: false, error: "method_not_allowed" }),
      { status: 405, headers: CORS_HEADERS }
    );
  } catch (err) {
    console.error("❌ [Banking REST Error]:", err);
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

export const Route = createFileRoute("/api/rp/banking")({
  server: {
    handlers: {
      GET: handleServerRequest,
      POST: handleServerRequest,
      OPTIONS: handleServerRequest,
    },
  },
});
