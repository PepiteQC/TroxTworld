/**
 * ═══════════════════════════════════════════════════════════════════════════
 * TROXTWORLD — SQDC Jobs · Point d'entrée unique
 *
 * Usage :
 *   import { hireEmployee, clockIn, clockOut, generateStaffReport } from "./jobs";
 *   // ou
 *   import * as SQDCJobs from "./jobs";
 * ═══════════════════════════════════════════════════════════════════════════
 */

/* ─── Rôles & Permissions ─── */
export {
  type SqdcRole,
  ROLE_RANK,
  ROLE_META,
  roleAtLeast,
  isEmployeeRole,
} from "./roles";

export {
  type SqdcPermissions,
  ROLE_PERMISSIONS,
  hasPermission,
} from "./permissions";

/* ─── Paie (constantes + calculs) ─── */
export {
  MIN_HOURLY_WAGE_QC,
  MAX_HOURLY_RATE,
  TPS_RATE,
  TVQ_RATE,
  OVERTIME_THRESHOLD,
  OVERTIME_MULTIPLIER,
  NIGHT_SHIFT_BONUS,
  SALES_COMMISSION,
  DEDUCTIONS_RATE,
  calculatePay,
  clampRate,
  formatPay,
  type PayBreakdown,
} from "./payroll";

/* ─── Engine central ─── */
export {
  type SqdcEmployee,
  getEmployee,
  getPlayerRole,
  getPlayerPermissions,
  getAllEmployees,
  getEmployeesOnDuty,
  createEmployeeRecord,
  removeEmployeeRecord,
  setPlayerRole,
  clearPlayerRole,
  updateEmployeeRole,
  updateEmployeeRate,
  setEmployeeClocked,
  addEmployeeCertification,
  registerTimesheet,
  closeTimesheet,
  getTimesheetsForStore,
  getTimesheetsForPlayer,
  recordSale,
  setPerformance,
  setupJobsNetworkSync,
  disposeJobsRegistry,
} from "./jobs";

/* ─── Candidatures ─── */
export {
  type JobApplication,
  submitApplication,
  reviewApplication,
  listApplications,
  getApplication,
  clearApplications,
} from "./applications";

/* ─── Contrats ─── */
export {
  type SalaryReview,
  hireEmployee,
  fireEmployee,
  resign,
  promoteEmployee,
  adjustSalary,
  getSalaryHistory,
  clearReviews,
} from "./contracts";

/* ─── Pointage ─── */
export {
  type Timesheet,
  clockIn,
  clockOut,
  getTimeSinceClockIn,
} from "./timeclock";

/* ─── Discipline ─── */
export {
  type Strike,
  type StrikeSeverity,
  issueStrike,
  getStrikes,
  isSuspended,
  liftSuspension,
  clearStrikes,
} from "./discipline";

/* ─── Certifications ─── */
export {
  type Certification,
  type CertificationMeta,
  CERTIFICATION_META,
  enrollCertification,
  hasCertification,
  listRequiredCertifications,
  listEmployeeCertifications,
} from "./certifications";

/* ─── Horaires ─── */
export {
  type Shift,
  setShift,
  removeShift,
  getShifts,
  getShiftsToday,
  getShiftsForDay,
  clearShifts,
} from "./schedules";

/* ─── Rapports ─── */
export {
  type StoreStaffReport,
  generateStaffReport,
  formatReport,
} from "./reports";

/* ─── Prompts ─── */
export {
  type JobsPromptContext,
  jobsPrompt,
} from "./prompts";