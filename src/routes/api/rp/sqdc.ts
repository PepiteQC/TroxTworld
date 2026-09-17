import { createFileRoute } from "@tanstack/react-router";
import { handleIntellectus } from "@/intellectus/http.server";

export interface SqdcProduct {
  id: string;
  name: string;
  thcPct: number;
  cbdPct: number;
  stockGrams: number;
  pricePerGram: number;
}

const sqdcInventory: SqdcProduct[] = [
  { id: "jean_guy", name: "Jean Guy séché", thcPct: 22, cbdPct: 0.1, stockGrams: 5000, pricePerGram: 8.50 },
  { id: "cbd_boreal", name: "Béal Nord CBD", thcPct: 1, cbdPct: 14, stockGrams: 3500, pricePerGram: 7.20 },
  { id: "quebec_gold", name: "Or du Québec", thcPct: 26, cbdPct: 0.2, stockGrams: 2000, pricePerGram: 11.40 },
];

async function handleServerRequest({ request }: { request: Request }): Promise<Response> {
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
      return new Response(JSON.stringify({ ok: true, storeName: "SQDC Portneuf", inventory: sqdcInventory }), { status: 200, headers });
    }

    if (method === "POST") {
      const body = await request.json();
      const { action, productId, grams } = body;

      const product = sqdcInventory.find((p) => p.id === productId);
      if (!product) return new Response(JSON.stringify({ ok: false, error: "product_not_found" }), { status: 404, headers });

      const qty = Math.max(0, parseInt(grams, 10) || 0);

      switch (action) {
        case "purchase":
          if (product.stockGrams < qty) return new Response(JSON.stringify({ ok: false, error: "out_of_stock" }), { status: 400, headers });
          product.stockGrams -= qty;
          break;
        case "restock":
          product.stockGrams += qty;
          break;
        default:
          return new Response(JSON.stringify({ ok: false, error: "unknown_action" }), { status: 400, headers });
      }

      try { await handleIntellectus(request); } catch {}
      return new Response(JSON.stringify({ ok: true, product }), { status: 200, headers });
    }

    return new Response(JSON.stringify({ ok: false, error: "method_not_allowed" }), { status: 405, headers });
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: "server_error" }), { status: 500, headers });
  }
}

export const Route = createFileRoute("/api/rp/sqdc")({
  server: {
    handlers: { GET: handleServerRequest, POST: handleServerRequest, OPTIONS: handleServerRequest },
  },
});
