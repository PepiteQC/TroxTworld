/**
 * src/systems/access-control/core/AccessControlTypes.ts
 * 
 * Types for permanent ownership + temporary access + lock events.
 * 
 * Anti-casse (verbatim):
 * - Conserver un journal immuable des accès et changements sensibles.
 * - Ne jamais supprimer définitivement un titre de propriété → archived status.
 * - Ne jamais conserver un NIP, une carte ou une clé sous forme lisible.
 * - Stable IDs.
 * - Simulator first.
 */

export type AccessMethod = 'keycard' | 'keypad' | 'connected_app' | 'mechanical_key' | 'emergency_override';

export type AccessResult = 'granted' | 'denied' | 'expired' | 'revoked' | 'simulated' | 'error';

export interface AccessLog {
  id: string;
  timestamp: string;           // ISO
  buildingId: string;
  roomId?: string;
  doorId: string;
  lockId: string;
  method: AccessMethod;
  result: AccessResult;
  actorId?: string;            // user or system
  reason?: string;
  // NEVER log the actual code / card data
  metadata?: Record<string, unknown>;
  // immutable — append only
}

export type PropertyTitleStatus =
  | 'DRAFT'
  | 'OFFERED'
  | 'RESERVED'
  | 'UNDER_REVIEW'
  | 'SIGNING'
  | 'CLOSING'
  | 'ACTIVE'
  | 'TRANSFER_PENDING'
  | 'SUSPENDED'
  | 'ENDED'
  | 'ARCHIVED'; // never delete

export interface PropertyTitle {
  id: string;
  roomId: string;
  ownerIds: string[];
  legalReference?: string;
  status: PropertyTitleStatus;
  effectiveAt?: string;
  endedAt?: string;
  occupancyPolicyId: string;
  createdAt: string;
  updatedAt: string;
  // archived versions live alongside (new doc with ARCHIVED status)
}

export interface TemporaryAccess {
  id: string;
  roomId: string;
  guestId: string;
  grantorId: string; // owner or front-desk
  method: AccessMethod;
  validFrom: string;
  validUntil: string;
  revokedAt?: string;
  createdAt: string;
  // No raw secrets stored
}

export interface Ownership {
  id: string;
  roomId: string;
  ownerIds: string[];
  status: PropertyTitleStatus;
  createdAt: string;
  updatedAt: string;
}
