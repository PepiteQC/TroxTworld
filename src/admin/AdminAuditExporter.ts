// src/admin/AdminAuditExporter.ts
// ETHERWORLD RP — TroxTetherworld Platinum Audit Import/Export Tool

import { AdminLogger } from "./AdminLogger";

export function exportAdminReport(): void {
  const json = AdminLogger.exportAsJSON();
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `troxt_admin_audit_${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportAdminCSVReport(): void {
  const csv = AdminLogger.exportAsCSV();
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `troxt_admin_audit_${Date.now()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
