/**
 * TROXTWORLD — Rapports RH SQDC
 */
import { ROLE_META, type SqdcRole } from "./roles";
import { getAllEmployees, getTimesheetsForStore } from "./jobs";

export interface StoreStaffReport {
  storeId: string;
  generatedAt: number;
  totalEmployees: number;
  onDuty: number;
  totalHoursThisWeek: number;
  totalPaidThisWeek: number;
  averagePerformance: number;
  averageHourlyRate: number;
  rolesBreakdown: Record<SqdcRole, number>;
  topSellers: Array<{ playerId: string; playerName: string; salesCount: number; revenue: number }>;
  topHours: Array<{ playerId: string; playerName: string; hours: number }>;
  strikesTotal: number;
}

export function generateStaffReport(storeId: string): StoreStaffReport {
  const employees = getAllEmployees(storeId);
  const weekAgo = Date.now() - 7 * 24 * 3600 * 1000;
  const weekTimesheets = getTimesheetsForStore(storeId).filter((ts) => ts.clockIn >= weekAgo);

  const totalHours = weekTimesheets.reduce((s, ts) => s + ts.hoursWorked, 0);
  const totalPaid = weekTimesheets.reduce((s, ts) => s + ts.netPay, 0);

  const rolesBreakdown = {} as Record<SqdcRole, number>;
  (Object.keys(ROLE_META) as SqdcRole[]).forEach((r) => { rolesBreakdown[r] = 0; });
  employees.forEach((e) => { rolesBreakdown[e.role]++; });

  const topSellers = [...employees]
    .sort((a, b) => b.salesRevenue - a.salesRevenue)
    .slice(0, 5)
    .map((e) => ({
      playerId: e.playerId,
      playerName: e.playerName,
      salesCount: e.salesCount,
      revenue: Math.round(e.salesRevenue * 100) / 100,
    }));

  const topHours = [...employees]
    .sort((a, b) => b.hoursWorked - a.hoursWorked)
    .slice(0, 5)
    .map((e) => ({
      playerId: e.playerId,
      playerName: e.playerName,
      hours: Math.round(e.hoursWorked * 100) / 100,
    }));

  return {
    storeId,
    generatedAt: Date.now(),
    totalEmployees: employees.length,
    onDuty: employees.filter((e) => e.isClockedIn).length,
    totalHoursThisWeek: Math.round(totalHours * 100) / 100,
    totalPaidThisWeek: Math.round(totalPaid * 100) / 100,
    averagePerformance: employees.length > 0
      ? Math.round(employees.reduce((s, e) => s + e.performanceRating, 0) / employees.length)
      : 0,
    averageHourlyRate: employees.length > 0
      ? Math.round((employees.reduce((s, e) => s + e.hourlyRate, 0) / employees.length) * 100) / 100
      : 0,
    rolesBreakdown,
    topSellers,
    topHours,
    strikesTotal: employees.reduce((s, e) => s + e.strikes, 0),
  };
}

export function formatReport(report: StoreStaffReport): string {
  const lines = [
    `📊 RAPPORT RH — ${report.storeId}`,
    `👥 Employés : ${report.totalEmployees} (en poste : ${report.onDuty})`,
    `⏱️ Heures/semaine : ${report.totalHoursThisWeek}h`,
    `💰 Masse salariale/semaine : ${report.totalPaidThisWeek}$`,
    `⭐ Performance moy. : ${report.averagePerformance}/100`,
    `💵 Taux moyen : ${report.averageHourlyRate}$/h`,
    `⚠️ Avertissements totaux : ${report.strikesTotal}`,
  ];
  if (report.topSellers.length > 0) {
    lines.push("🏆 Top vendeurs :");
    report.topSellers.forEach((s, i) => {
      lines.push(`  ${i + 1}. ${s.playerName} — ${s.salesCount} ventes · ${s.revenue}$`);
    });
  }
  return lines.join("\n");
}