/**
 * Caisse Populaire Desjardins de Portneuf — API Bancaire (/api/bank)
 * Fichier: src/routes/api/bank/index.ts
 */
import { createFileRoute } from "@tanstack/react-router";
import { PLAYERS_DB } from "../players/index";

export interface BankTransaction {
  id: string;
  type: "deposit" | "withdraw" | "transfer" | "salary";
  amount: number;
  fromId?: string;
  toId?: string;
  description: string;
  timestamp: number;
}

const TRANSACTIONS_LOG: BankTransaction[] = [];

const JSON_HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
} as const;

async function handleBankPost({ request }: { request: Request }): Promise<Response> {
  try {
    const body = (await request.json()) as {
      action: "deposit" | "withdraw" | "transfer";
      playerId: string;
      targetId?: string;
      amount: number;
    };

    const { action, playerId, targetId, amount } = body;
    if (!playerId || !amount || amount <= 0) {
      return new Response(
        JSON.stringify({ ok: false, error: "Paramètres bancaires invalides." }),
        { status: 400, headers: JSON_HEADERS }
      );
    }

    const citizen = PLAYERS_DB.get(playerId);
    if (!citizen) {
      return new Response(
        JSON.stringify({ ok: false, error: "Compte bancaire Desjardins introuvable." }),
        { status: 404, headers: JSON_HEADERS }
      );
    }

    switch (action) {
      case "deposit":
        if (citizen.cash < amount) {
          return new Response(
            JSON.stringify({ ok: false, error: "Fonds en liquide insuffisants pour ce dépôt." }),
            { status: 400, headers: JSON_HEADERS }
          );
        }
        citizen.cash -= amount;
        citizen.bank += amount;
        break;

      case "withdraw":
        if (citizen.bank < amount) {
          return new Response(
            JSON.stringify({ ok: false, error: "Solde bancaire insuffisant au guichet automatique." }),
            { status: 400, headers: JSON_HEADERS }
          );
        }
        citizen.bank -= amount;
        citizen.cash += amount;
        break;

      case "transfer":
        if (!targetId) {
          return new Response(
            JSON.stringify({ ok: false, error: "Destinataire du virement Interac manquant." }),
            { status: 400, headers: JSON_HEADERS }
          );
        }
        const target = PLAYERS_DB.get(targetId);
        if (!target) {
          return new Response(
            JSON.stringify({ ok: false, error: "Destinataire introuvable chez Desjardins." }),
            { status: 404, headers: JSON_HEADERS }
          );
        }
        if (citizen.bank < amount) {
          return new Response(
            JSON.stringify({ ok: false, error: "Solde insuffisant pour le virement Interac." }),
            { status: 400, headers: JSON_HEADERS }
          );
        }
        citizen.bank -= amount;
        target.bank += amount;
        break;

      default:
        return new Response(
          JSON.stringify({ ok: false, error: "Action bancaire inconnue." }),
          { status: 400, headers: JSON_HEADERS }
        );
    }

    const tx: BankTransaction = {
      id: `tx_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      type: action,
      amount,
      fromId: playerId,
      toId: targetId,
      description: `Opération ${action.toUpperCase()} Desjardins`,
      timestamp: Date.now(),
    };
    TRANSACTIONS_LOG.unshift(tx);

    return new Response(
      JSON.stringify({
        ok: true,
        transaction: tx,
        balance: { cash: citizen.cash, bank: citizen.bank },
        message: "Transaction complétée avec succès.",
      }),
      { status: 200, headers: JSON_HEADERS }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ ok: false, error: "Erreur de traitement bancaire" }),
      { status: 500, headers: JSON_HEADERS }
    );
  }
}

export const Route = createFileRoute("/api/bank/")({
  server: {
    handlers: {
      GET: async () => new Response(JSON.stringify({ ok: true, institution: "Caisse Desjardins de Portneuf", transactions: TRANSACTIONS_LOG.slice(0, 20) }), { status: 200, headers: JSON_HEADERS }),
      POST: handleBankPost,
      OPTIONS: async () => new Response(null, { status: 204, headers: JSON_HEADERS }),
    },
  },
});

