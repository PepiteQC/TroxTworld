import { createFileRoute } from "@tanstack/react-router";
import { handleRpRest } from "@/server/rpRest.server";

async function handleServerRequest({ request }: { request: Request }): Promise<Response> {
  try {
    return await handleRpRest(request);
  } catch (err) {
    return new Response(
      JSON.stringify({ ok: false, error: "internal_server_error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

export const Route = createFileRoute("/api/properties/$id")({
  server: {
    handlers: {
      GET: handleServerRequest,
      POST: handleServerRequest,
      OPTIONS: handleServerRequest,
    },
  },
});
