// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  ETHERWORLD — client/doors/schema/CorridorTypes.ts                      ║
// ║  Édition TroxTWorld Master Intellectus · TroxTetherworld RP              ║
// ║  Types & Configurations des Portes, Corridors & Contrôle d'Accès 3D     ║
// ║  Portneuf, Québec 🍁 · fr-CA · v6.0 Ultra Premium                        ║
// ╚══════════════════════════════════════════════════════════════════════════╝

'use strict';

/** Niveaux d'accès autorisés pour les cartes RFID et badges de sécurité. */
export type CardAccessLevel = 'guest' | 'resident' | 'vip' | 'staff' | 'admin';

/** Niveau d'accès étendu (alias rétrocompatible de CardAccessLevel). */
export type ExtendedCardAccessLevel = CardAccessLevel;

export interface ApartmentDoorConfig {
  id:        string;
  position:  [number, number, number];
  rotation:  [number, number, number];
  isLocked:  boolean;
  lightOn:   boolean;
  occupied:  boolean;
  number:    string;
  doorColor: string;
}

export interface CorridorLightConfig {
  id:        string;
  position:  [number, number, number];
  intensity: number;
  color:     string;
}

export interface DecorItem {
  id:       string;
  type:     'plant' | 'bench';
  position: [number, number, number];
}

/** Code couleur associé à chaque niveau d'accès de carte de sécurité. */
export const CARD_COLORS: Record<CardAccessLevel, string> = {
  guest:    '#9ca3af',
  resident: '#22c55e',
  vip:      '#a855f7',
  staff:    '#3b82f6',
  admin:    '#ef4444',
};

export interface CorridorApartment {
  id:          string;
  number:      string;
  floor:       number;
  side:        'left' | 'right';
  position:    [number, number, number];
  rotation:    [number, number, number];
  accessLevel: ExtendedCardAccessLevel;
  doorState:   'closed' | 'open' | 'locked';
  isLocked:    boolean;
  occupied:    boolean;
  forRent:     boolean;
  owner?:      string;
  rent?:       number;
  doorColor:   string;
  lightOn:     boolean;
}
