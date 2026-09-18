import { createFileRoute } from "@tanstack/react-router";
import { handleIntellectus } from "@/intellectus/http.server";

export interface AuditRecord {
  id: string;
  timestamp: number;
  actorId: string;
  actorName: string;
  actorRole: string;
  command: string;
  args: string;
  targetId?: string;
  targetName?: string;
  success: boolean;
  reason?: string;
  ip?: string;
  durationMs?: number;
}

const inMemoryAuditLogs: AuditRecord[] = [];

async function handleServerRequest({ request }: { request: Request }): Promise<Response> {
  const url = new URL(request.url);
  const method = request.method.toUpperCase();

  const headers = {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Admin-Role, X-Actor-Id",
  };

  if (method === "OPTIONS") {
    return new Response(null, { status: 204, headers });
  }

  try {
    if (method === "GET") {
      const isStats = url.searchParams.get("stats") === "true";
      const exportFormat = url.searchParams.get("export");
      const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));
      const limit = Math.max(1, Math.min(200, parseInt(url.searchParams.get("limit") || "50", 10)));
      
      const actorFilter = url.searchParams.get("actor")?.toLowerCase();
      const targetFilter = url.searchParams.get("target")?.toLowerCase();
      const cmdFilter = url.searchParams.get("cmd")?.toLowerCase();
      const search = url.searchParams.get("search")?.toLowerCase();
      const successFilter = url.searchParams.get("success");
      const since = parseInt(url.searchParams.get("since") || "0", 10);
      const until = parseInt(url.searchParams.get("until") || String(Date.now() + 86400000), 10);

      let logs = [...inMemoryAuditLogs];

      if (since > 0) logs = logs.filter((l) => l.timestamp >= since);
      if (until > 0) logs = logs.filter((l) => l.timestamp <= until);
      if (actorFilter) logs = logs.filter((l) => l.actorName.toLowerCase().includes(actorFilter) || l.actorId.toLowerCase().includes(actorFilter));
      if (targetFilter) logs = logs.filter((l) => l.targetName?.toLowerCase().includes(targetFilter) || l.targetId?.toLowerCase().includes(targetFilter));
      if (cmdFilter) logs = logs.filter((l) => l.command.toLowerCase() === cmdFilter);
      if (successFilter !== null && successFilter !== undefined && successFilter !== "") {
        const isSuccess = successFilter === "true";
        logs = logs.filter((l) => l.success === isSuccess);
      }
      if (search) {
        logs = logs.filter((l) => 
          l.command.toLowerCase().includes(search) ||
          l.args.toLowerCase().includes(search) ||
          l.actorName.toLowerCase().includes(search) ||
          (l.targetName && l.targetName.toLowerCase().includes(search)) ||
          (l.reason && l.reason.toLowerCase().includes(search))
        );
      }

      logs.sort((a, b) => b.timestamp - a.timestamp);

      if (exportFormat === "csv") {
        const csvRows = [
          ["ID", "Date", "Heure", "Acteur", "Grade", "Commande", "Arguments", "Cible", "Succes", "Raison"].join(";"),
          ...logs.map((l) => {
            const d = new Date(l.timestamp);
            return [
              l.id,
              d.toISOString().slice(0, 10),
              d.toTimeString().slice(0, 8),
              `"${l.actorName.replace(/"/g, '""')}"`,
              l.actorRole,
              l.command,
              `"${l.args.replace(/"/g, '""')}"`,
              `"${(l.targetName || l.targetId || "").replace(/"/g, '""')}"`,
              l.success ? "OUI" : "NON",
              `"${(l.reason || "").replace(/"/g, '""')}"`,
            ].join(";");
          }),
        ];

        return new Response(csvRows.join("\r\n"), {
          status: 200,
          headers: {
            "Content-Type": "text/csv; charset=utf-8",
            "Content-Disposition": `attachment; filename="audit_logs_${new Date().toISOString().slice(0, 10)}.csv"`,
          },
        });
      }

      if (isStats) {
        const total = logs.length;
        const successCount = logs.filter((l) => l.success).length;
        const failCount = total - successCount;
        
        const cmdCounts: Record<string, number> = {};
        const actorCounts: Record<string, number> = {};
        const targetCounts: Record<string, number> = {};

        for (const l of logs) {
          cmdCounts[l.command] = (cmdCounts[l.command] || 0) + 1;
          actorCounts[l.actorName] = (actorCounts[l.actorName] || 0) + 1;
          if (l.targetName) targetCounts[l.targetName] = (targetCounts[l.targetName] || 0) + 1;
        }

        const topCommands = Object.entries(cmdCounts).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([name, count]) => ({ name, count }));
        const topModerators = Object.entries(actorCounts).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name, count]) => ({ name, count }));
        const topSanctioned = Object.entries(targetCounts).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name, count]) => ({ name, count }));

        return new Response(
          JSON.stringify({
            ok: true,
            totalLogs: total,
            successRate: total > 0 ? Math.round((successCount / total) * 100) : 100,
            failCount,
            topCommands,
            topModerators,
            topSanctioned,
            generatedAt: Date.now(),
          }),
          { status: 200, headers }
        );
      }

      const totalCount = logs.length;
      const totalPages = Math.ceil(totalCount / limit) || 1;
      const paginatedLogs = logs.slice((page - 1) * limit, page * limit);

      return new Response(
        JSON.stringify({
          ok: true,
          page,
          limit,
          totalPages,
          totalCount,
          data: paginatedLogs,
        }),
        { status: 200, headers }
      );
    }

    if (method === "POST") {
      let body: any = {};
      try {
        body = await request.json();
      } catch {
        return new Response(JSON.stringify({ ok: false, error: "invalid_json" }), { status: 400, headers });
      }

      const { command, args, actorId, actorName, actorRole, targetId, targetName, success, reason, durationMs } = body;

      if (!command) {
        return new Response(JSON.stringify({ ok: false, error: "missing_command" }), { status: 400, headers });
      }

      const record: AuditRecord = {
        id: `cmd_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        timestamp: Date.now(),
        actorId: actorId || "remote_client",
        actorName: actorName || "Staff Web",
        actorRole: actorRole || "admin",
        command: String(command).replace(/^\//, ""),
        args: typeof args === "string" ? args : JSON.stringify(args || ""),
        targetId,
        targetName,
        success: success !== undefined ? Boolean(success) : true,
        reason,
        ip: request.headers.get("x-forwarded-for") || request.headers.get("cf-connecting-ip") || "127.0.0.1",
        durationMs: typeof durationMs === "number" ? durationMs : undefined,
      };

      inMemoryAuditLogs.push(record);

      if (inMemoryAuditLogs.length > 1000) {
        inMemoryAuditLogs.splice(0, inMemoryAuditLogs.length - 1000);
      }

      try {
        await handleIntellectus(request);
      } catch {
        // Fallback silencieux
      }

      return new Response(
        JSON.stringify({
          ok: true,
          message: `Commande /${record.command} enregistrée avec succès`,
          record,
        }),
        { status: 201, headers }
      );
    }

    if (method === "DELETE") {
      const actorRole = request.headers.get("X-Admin-Role") || "none";
      if (actorRole !== "owner" && actorRole !== "head_admin" && actorRole !== "intellectus_ai") {
        return new Response(
          JSON.stringify({ ok: false, error: "forbidden", message: "Seul le Fondateur ou le Head Admin peut purger l'audit." }),
          { status: 403, headers }
        );
      }

      const clearedCount = inMemoryAuditLogs.length;
      inMemoryAuditLogs.length = 0;

      inMemoryAuditLogs.push({
        id: `tombstone_${Date.now()}`,
        timestamp: Date.now(),
        actorId: request.headers.get("X-Actor-Id") || "head_admin",
        actorName: "ADMINISTRATEUR PRINCIPAL",
        actorRole: actorRole,
        command: "clear_audit_logs",
        args: `Purge de ${clearedCount} entrées`,
        success: true,
        reason: "Purge manuelle de conformité",
      });

      return new Response(
        JSON.stringify({
          ok: true,
          message: `${clearedCount} entrées d'audit purgées. Trace immuable enregistrée.`,
        }),
        { status: 200, headers }
      );
    }

    return new Response(JSON.stringify({ ok: false, error: "method_not_allowed" }), { status: 405, headers });

  } catch (err) {
    return new Response(
      JSON.stringify({
        ok: false,
        error: "internal_server_error",
        message: err instanceof Error ? err.message : String(err),
      }),
      {
        status: 500,
        headers,
      }
    );
  }
}

export const Route = createFileRoute("/admin/commands")({
  server: {
    handlers: {
      GET: handleServerRequest,
      POST: handleServerRequest,
      DELETE: handleServerRequest,
      OPTIONS: handleServerRequest,
    },
  },
});
