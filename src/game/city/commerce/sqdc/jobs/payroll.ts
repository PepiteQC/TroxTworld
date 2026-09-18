/**
 * TROXTWORLD — Paie SQDC (conforme QC)
 */
export const MIN_HOURLY_WAGE_QC = 15.75;
export const MAX_HOURLY_RATE = 75;
export const TPS_RATE = 0.05;
export const TVQ_RATE = 0.09975;
export const OVERTIME_THRESHOLD = 40;
export const OVERTIME_MULTIPLIER = 1.5;
export const NIGHT_SHIFT_BONUS = 1.25;
export const SALES_COMMISSION = 0.02;
/** Retenues à la source QC (RRQ, RQAP, impôt) — approximatif. */
export const DEDUCTIONS_RATE = 0.18;

export interface PayBreakdown {
  regularHours: number;
  overtimeHours: number;
  regularPay: number;
  overtimePay: number;
  nightBonus: number;
  commission: number;
  grossPay: number;
  netPay: number;
}

export function calculatePay(
  hours: number,
  hourlyRate: number,
  salesRevenue: number,
  clockOutHour: number,
): PayBreakdown {
  const regularHours = Math.min(hours, OVERTIME_THRESHOLD);
  const overtimeHours = Math.max(0, hours - OVERTIME_THRESHOLD);

  const regularPay = regularHours * hourlyRate;
  const overtimePay = overtimeHours * hourlyRate * OVERTIME_MULTIPLIER;

  const isNight = clockOutHour >= 22 || clockOutHour < 6;
  const basePay = regularPay + overtimePay;
  const nightBonus = isNight ? basePay * (NIGHT_SHIFT_BONUS - 1) : 0;

  const commission = Math.round(salesRevenue * SALES_COMMISSION * 100) / 100;

  const grossPay = Math.round((basePay + nightBonus + commission) * 100) / 100;
  const netPay = Math.round(grossPay * (1 - DEDUCTIONS_RATE) * 100) / 100;

  return {
    regularHours,
    overtimeHours,
    regularPay: Math.round(regularPay * 100) / 100,
    overtimePay: Math.round(overtimePay * 100) / 100,
    nightBonus: Math.round(nightBonus * 100) / 100,
    commission,
    grossPay,
    netPay,
  };
}

export function clampRate(rate: number): number {
  return Math.max(MIN_HOURLY_WAGE_QC, Math.min(MAX_HOURLY_RATE, rate));
}

export function formatPay(breakdown: PayBreakdown): string {
  const parts: string[] = [];
  parts.push(`${breakdown.regularHours.toFixed(2)}h`);
  if (breakdown.overtimeHours > 0) parts.push(`${breakdown.overtimeHours.toFixed(2)}h supp.`);
  if (breakdown.nightBonus > 0) parts.push(`+nuit ${breakdown.nightBonus.toFixed(2)}$`);
  if (breakdown.commission > 0) parts.push(`+comm. ${breakdown.commission.toFixed(2)}$`);
  parts.push(`= ${breakdown.netPay.toFixed(2)}$`);
  return parts.join(" · ");
}