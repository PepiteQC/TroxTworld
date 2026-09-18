/**
 * TROXTWORLD — SQDC Permissions granulaires
 */
import type { SqdcRole } from "./roles";

export interface SqdcPermissions {
  // Vente
  canSell: boolean;
  canRefund: boolean;
  canVoidTransaction: boolean;
  canSetPrices: boolean;
  // Gestion
  canManageStock: boolean;
  canOrderStock: boolean;
  canDeliver: boolean;
  // RH
  canHire: boolean;
  canFire: boolean;
  canPromote: boolean;
  canSanction: boolean;
  canSetSchedule: boolean;
  // Sécurité
  canAccessSafe: boolean;
  canViewCameras: boolean;
  canBanCustomers: boolean;
  canTriggerLockdown: boolean;
  // Boutique
  canOpenStore: boolean;
  canCloseStore: boolean;
  canAccessReserve: boolean;
  canViewReports: boolean;
}

const P = (o: Partial<SqdcPermissions>): SqdcPermissions => ({
  canSell: false, canRefund: false, canVoidTransaction: false, canSetPrices: false,
  canManageStock: false, canOrderStock: false, canDeliver: false,
  canHire: false, canFire: false, canPromote: false, canSanction: false, canSetSchedule: false,
  canAccessSafe: false, canViewCameras: false, canBanCustomers: false, canTriggerLockdown: false,
  canOpenStore: false, canCloseStore: false, canAccessReserve: false, canViewReports: false,
  ...o,
});

export const ROLE_PERMISSIONS: Record<SqdcRole, SqdcPermissions> = {
  directeur: P({
    canSell: true, canRefund: true, canVoidTransaction: true, canSetPrices: true,
    canManageStock: true, canOrderStock: true, canDeliver: true,
    canHire: true, canFire: true, canPromote: true, canSanction: true, canSetSchedule: true,
    canAccessSafe: true, canViewCameras: true, canBanCustomers: true, canTriggerLockdown: true,
    canOpenStore: true, canCloseStore: true, canAccessReserve: true, canViewReports: true,
  }),
  gerant: P({
    canSell: true, canRefund: true, canVoidTransaction: true,
    canManageStock: true, canOrderStock: true,
    canHire: true, canSanction: true, canSetSchedule: true,
    canAccessSafe: true, canViewCameras: true, canBanCustomers: true, canTriggerLockdown: true,
    canOpenStore: true, canCloseStore: true, canAccessReserve: true, canViewReports: true,
  }),
  superviseur: P({
    canSell: true, canRefund: true, canVoidTransaction: true,
    canManageStock: true, canSanction: true,
    canViewCameras: true, canBanCustomers: true, canTriggerLockdown: true,
    canAccessReserve: true, canViewReports: true,
  }),
  caissier: P({ canSell: true, canAccessReserve: true }),
  conseiller: P({ canAccessReserve: true }),
  securite: P({
    canViewCameras: true, canBanCustomers: true, canTriggerLockdown: true,
    canAccessReserve: true,
  }),
  commis: P({ canManageStock: true, canOrderStock: true, canAccessReserve: true }),
  livreur: P({ canDeliver: true }),
  stagiaire: P({ canAccessReserve: true }),
  client: P({}),
  trespasser: P({}),
};

export function hasPermission(
  permissions: SqdcPermissions,
  key: keyof SqdcPermissions,
): boolean {
  return permissions[key] === true;
}