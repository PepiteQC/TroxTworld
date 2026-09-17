import { createFileRoute } from "@tanstack/react-router";
import { handleIntellectus } from "@/intellectus/http.server";

export type TransactionType = "deposit" | "withdraw" | "transfer" | "interac" | "loan_pay" | "salary" | "seizure" | "robbery";

export interface BankAccount {
  accountId: string;
  ownerId: string;
  ownerName: string;
  balance: number;
  dirtyBalance: number; // Argent sale non blanchi
  loanBalance: number;  // Prêt Caisse Populaire actif
  creditScore: number;  // Score de crédit (0-800)
  transactions: Array<{
    id: string;
    timestamp: number;
    type: TransactionType;
    amount: number;
    description: string;
    targetAccount?: string;
  }>;
}

const activeAccounts = new Map<string, BankAccount>();

async function handleServerRequest({ request }: { request: Request }): Promise<Response> {
  const url = new URL(request.url);
  const method = request.method.toUpperCase();
  const headers = {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };

  if (method === "OPTIONS") return new Response(null, { status: 204, headers });

  try {
    if (method === "GET") {
      const ownerId = url.searchParams.get("playerId") || "local_player";
      let account = activeAccounts.get(ownerId);
      
      if (!account) {
        account = {
          accountId: `ACCT-${Math.floor(100000 + Math.random() * 900000)}`,
          ownerId,
          ownerName: "Citoyen",
          balance: 2500,
          dirtyBalance: 0,
          loanBalance: 0,
          creditScore: 650,
          transactions: [{ id: "tx_init", timestamp: Date.now(), type: "deposit", amount: 2500, description: "Solde initial d'arrivée" }],
        };
        activeAccounts.set(ownerId, account);
      }

      return new Response(JSON.stringify({ ok: true, account }), { status: 200, headers });
    }

    if (method === "POST") {
      const body = await request.json();
      const { action, playerId, amount, targetId, description = "" } = body;
      
      const account = activeAccounts.get(playerId || "local_player");
      if (!account) return new Response(JSON.stringify({ ok: false, error: "account_not_found" }), { status: 404, headers });

      const value = Math.max(0, parseInt(amount, 10) || 0);

      switch (action) {
        case "deposit":
          account.balance += value;
          account.transactions.unshift({ id: `tx_${Date.now()}`, timestamp: Date.now(), type: "deposit", amount: value, description });
          break;
        case "withdraw":
          if (account.balance < value) return new Response(JSON.stringify({ ok: false, error: "insufficient_funds" }), { status: 400, headers });
          account.balance -= value;
          account.transactions.unshift({ id: `tx_${Date.now()}`, timestamp: Date.now(), type: "withdraw", amount: value, description });
          break;
        case "interac_send":
          if (account.balance < value) return new Response(JSON.stringify({ ok: false, error: "insufficient_funds" }), { status: 400, headers });
          account.balance -= value;
          account.transactions.unshift({ id: `tx_${Date.now()}`, timestamp: Date.now(), type: "interac", amount: value, description: `Virement Interac vers ${targetId || "bénéficiaire"}` });
          break;
        case "loan_request":
          if (account.creditScore < 600) return new Response(JSON.stringify({ ok: false, error: "loan_denied" }), { status: 400, headers });
          account.balance += value;
          account.loanBalance += value;
          account.transactions.unshift({ id: `tx_${Date.now()}`, timestamp: Date.now(), type: "deposit", amount: value, description: "Prêt approuvé par le conseiller" });
          break;
        case "rob_vault":
          account.dirtyBalance += value; // Le braquage donne de l'argent sale
          account.transactions.unshift({ id: `tx_${Date.now()}`, timestamp: Date.now(), type: "robbery", amount: value, description: "Butin de coffre-fort" });
          break;
        default:
          return new Response(JSON.stringify({ ok: false, error: "unknown_action" }), { status: 400, headers });
      }

      try { await handleIntellectus(request); } catch {}
      return new Response(JSON.stringify({ ok: true, account }), { status: 200, headers });
    }

    return new Response(JSON.stringify({ ok: false, error: "method_not_allowed" }), { status: 405, headers });
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: "server_error" }), { status: 500, headers });
  }
}

export const Route = createFileRoute("/api/rp/banking")({
  server: {
    handlers: { GET: handleServerRequest, POST: handleServerRequest, OPTIONS: handleServerRequest },
  },
});
