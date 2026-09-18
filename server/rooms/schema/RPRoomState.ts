/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 📦 RP ROOM STATE — SCHÉMAS COLYSEUS SYNCHRONISÉS (RPRoomState)
 * ═══════════════════════════════════════════════════════════════════════════
 * Compression delta binaire automatique · Optimisation bande passante
 * - Types numériques optimisés (float32, uint8, int32)
 * - Synchronisation partielle (delta encoding)
 * - Gestion mémoire efficace (MapSchema/ArraySchema)
 */

import { Schema, MapSchema, ArraySchema, type } from "@colyseus/schema";

// ─────────────────────────────────────────────────────────────────────────────
// 1. SCHÉMA DU JOUEUR (REMOTE PLAYER) - COMPRESSION BINAIRE OPTIMALE
// ─────────────────────────────────────────────────────────────────────────────
export class PlayerSchema extends Schema {
  @type("string") id: string = "";
  @type("string") username: string = "Citoyen";
  @type("string") job: string = "Civil";
  @type("string") aura: string = "none";

  // Coordonnées 3D (float32 : précision suffisante avec 4 octets)
  @type("float32") x: number = 0.0;
  @type("float32") y: number = 1.0;
  @type("float32") z: number = 10.0;
  @type("float32") rotation: number = 0.0;
  @type("float32") velocity: number = 0.0;
  @type("string") animation: string = "idle";

  // Stats vitales (uint8 : 1 octet par valeur, plage 0-255)
  @type("uint8") health: number = 100;
  @type("uint8") armor: number = 0;
  @type("uint8") stamina: number = 100;
  @type("uint8") hunger: number = 100;
  @type("uint8") thirst: number = 100;
  @type("float32") bodyTemp: number = 37.0;

  // Statut criminel (uint8/boolean)
  @type("uint8") wanted: number = 0;
  @type("boolean") isFrozen: boolean = false;
  @type("boolean") isHandcuffed: boolean = false;
  @type("boolean") inJail: boolean = false;
  @type("boolean") onDuty: boolean = false;

  // Économie (int32 : supporte valeurs négatives)
  @type("int32") cash: number = 500;
  @type("int32") bank: number = 2500;
  @type("string") gang: string = "Aucun";
  @type("string") vehicleId: string = "";
  @type("boolean") voiceActive: boolean = false;
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. SCHÉMA DE VÉHICULE (VEHICLE DATA)
// ─────────────────────────────────────────────────────────────────────────────
export class VehicleSchema extends Schema {
  @type("string") id: string = "";
  @type("string") type: string = "civil";
  @type("string") name: string = "Véhicule";
  @type("string") plate: string = "PNF-138";

  // Physique (float32)
  @type("float32") x: number = 0.0;
  @type("float32") y: number = 0.0;
  @type("float32") z: number = 0.0;
  @type("float32") rotation: number = 0.0;
  @type("float32") speed: number = 0.0;

  // Mécanique (uint8)
  @type("uint8") health: number = 100;
  @type("uint8") fuel: number = 80;
  @type("boolean") locked: boolean = false;
  @type("boolean") engineOn: boolean = false;

  // Conducteur
  @type("string") driverId: string = "";
  @type("boolean") siren: boolean = false;
  @type("boolean") headlights: boolean = true;
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. SCHÉMA DES OBJETS POSÉS (BUILDER PROPS)
// ─────────────────────────────────────────────────────────────────────────────
export class PlacedPropSchema extends Schema {
  @type("string") id: string = "";
  @type("string") type: string = "cube";
  @type("string") ownerId: string = "";

  // Transformation (float32)
  @type("float32") x: number = 0.0;
  @type("float32") y: number = 0.0;
  @type("float32") z: number = 0.0;
  @type("float32") rotation: number = 0.0;
  @type("float32") scale: number = 1.0;

  @type("boolean") frozen: boolean = true;
  @type("uint8") health: number = 100;
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. SCHÉMA DU CHAT TEXTUEL RP
// ─────────────────────────────────────────────────────────────────────────────
export class ChatMessageSchema extends Schema {
  @type("string") id: string = "";
  @type("string") senderId: string = "";
  @type("string") senderName: string = "Citoyen";
  @type("string") messageType: string = "local";
  @type("string") text: string = "";

  // Origine spatiale
  @type("float32") x: number = 0.0;
  @type("float32") y: number = 0.0;
  @type("float32") z: number = 0.0;
  @type("float64") timestamp: number = Date.now();
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. SCHÉMA DES PROPRIÉTÉS IMMOBILIÈRES
// ─────────────────────────────────────────────────────────────────────────────
export class PropertySchema extends Schema {
  @type("string") id: string = "";
  @type("string") name: string = "";
  @type("string") ownerId: string = "";
  @type("int32") price: number = 0;
  @type("boolean") locked: boolean = true;
}

// ═══════════════════════════════════════════════════════════════════════════
// SCHÉMA PRINCIPAL DE LA SALLE RP (STATE REPLICATED)
// ═══════════════════════════════════════════════════════════════════════════
export class RPRoomState extends Schema {
  // Collections répliquées
  @type({ map: PlayerSchema }) players = new MapSchema<PlayerSchema>();
  @type({ map: VehicleSchema }) vehicles = new MapSchema<VehicleSchema>();
  @type({ map: PlacedPropSchema }) placedProps = new MapSchema<PlacedPropSchema>();
  @type({ map: PropertySchema }) properties = new MapSchema<PropertySchema>();
  @type([ChatMessageSchema]) chatMessages = new ArraySchema<ChatMessageSchema>();

  // Variables globales
  @type("float32") timeOfDay: number = 12.0;
  @type("string") weather: string = "ensoleille";
  @type("string") riskLevel: string = "GREEN";
  @type("uint16") playerCount: number = 0;
}
