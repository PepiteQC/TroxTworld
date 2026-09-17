// ═══════════════════════════════════════════════════════════════════════════
//  RP ROOM STATE — SCHÉMAS COLYSEUS SYNCHRONISÉS (RPRoomState)
//  server/rooms/schema/RPRoomState.ts
//  Compression delta binaire automatique · Optimisation bande passante
// ═══════════════════════════════════════════════════════════════════════════

import { Schema, MapSchema, ArraySchema, type } from '@colyseus/schema';

// ─────────────────────────────────────────────────────────────────────────────
// 1. SCHÉMA DU JOUEUR (REMOTE PLAYER) - COMPRESSION BINAIRE OPTIMALE
// ─────────────────────────────────────────────────────────────────────────────
export class PlayerSchema extends Schema {
  @type('string') id = '';
  @type('string') username = 'Citoyen';
  @type('string') job = 'Civil';
  @type('string') aura = 'none';

  // Coordonnées de position 3D (Précision float32 : gain de 50% par paquet)
  @type('float32') x = 0.0;
  @type('float32') y = 1.0;
  @type('float32') z = 10.0;
  @type('float32') rotation = 0.0;
  @type('float32') velocity = 0.0;
  @type('string') animation = 'idle';

  // Stats Vitales & Survie (Type uint8 : de 0 à 255. Consomme seulement 1 octet)
  @type('uint8') health = 100;
  @type('uint8') armor = 0;
  @type('uint8') stamina = 100;
  @type('uint8') hunger = 100;        // Faim (0-100) pour système de survie
  @type('uint8') thirst = 100;        // Soif (0-100)
  @type('float32') bodyTemp = 37.0;   // Température corporelle (Hypothermie / Climat Québec)

  // Statut criminel & Sanctions (uint8 / boolean)
  @type('uint8') wanted = 0;          // Étoiles de recherche (0 à 5)
  @type('boolean') isFrozen = false;  // Immobilisation administrative (Staff freeze)
  @type('boolean') isHandcuffed = false; // Menotté par la SQ
  @type('boolean') inJail = false;    // Prisonnier à Donnacona
  @type('boolean') onDuty = false;    // En service staff administratif (Duty system)

  // Économie & Social (Type int32 : prend en compte les valeurs négatives / découverts)
  @type('int32') cash = 500;
  @type('int32') bank = 2500;
  @type('string') gang = 'Aucun';
  @type('string') vehicleId = '';     // ID du véhicule dans lequel le joueur se trouve
  @type('boolean') voiceActive = false; // Statut d'émission voix/radio
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. SCHÉMA DE VÉHICULE (VEHICLE DATA)
// ─────────────────────────────────────────────────────────────────────────────
export class VehicleSchema extends Schema {
  @type('string') id = '';
  @type('string') type = 'civil';    // supercar|pickup|police|snowmobile
  @type('string') name = 'Véhicule';
  @type('string') plate = 'PNF-138';  // Plaque d'immatriculation du comté

  // Vecteurs physiques (float32 pour fluidité d'interpolation client)
  @type('float32') x = 0.0;
  @type('float32') y = 0.0;
  @type('float32') z = 0.0;
  @type('float32') rotation = 0.0;
  @type('float32') speed = 0.0;

  // Statut mécanique & ressources (uint8)
  @type('uint8') health = 100;        // Santé moteur / Carrosserie (0-100)
  @type('uint8') fuel = 80;           // Jauge d'essence en litres (0-100)
  @type('boolean') locked = false;    // État du verrouillage des portières
  @type('boolean') engineOn = false;  // Moteur tournant

  // Conducteur & Cosmétiques
  @type('string') driverId = '';      // ID de session du conducteur
  @type('boolean') siren = false;     // État gyrophares / sirène SQ / EMS
  @type('boolean') headlights = true; // État des phares du véhicule
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. SCHÉMA DES OBJETS POSÉS (BUILDER / FORGE PROPS)
// ─────────────────────────────────────────────────────────────────────────────
export class PlacedPropSchema extends Schema {
  @type('string') id = '';
  @type('string') type = 'cube';
  @type('string') ownerId = '';

  // Coordonnées spatiales des props
  @type('float32') x = 0.0;
  @type('float32') y = 0.0;
  @type('float32') z = 0.0;
  @type('float32') rotation = 0.0;
  @type('float32') scale = 1.0;

  @type('boolean') frozen = true;    // Mobilité physique désactivée (Pas de gravité)
  @type('uint8') health = 100;        // Résistance aux impacts/tirs
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. SCHÉMA DU CHAT TEXTUEL RP
// ─────────────────────────────────────────────────────────────────────────────
export class ChatMessageSchema extends Schema {
  @type('string') id = '';
  @type('string') senderId = '';
  @type('string') senderName = 'Citoyen';
  @type('string') messageType = 'local';
  @type('string') text = '';

  // Origine spatiale pour le traitement 3D de proximité
  @type('float32') x = 0.0;
  @type('float32') y = 0.0;
  @type('float32') z = 0.0;
  @type('float64') timestamp = 0.0;  // Double précision pour stocker l'horodatage UNIX millisecondes
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. SCHÉMA DES PROPRIÉTÉS IMMOBILIÈRES (MLS REGISTRY)
// ─────────────────────────────────────────────────────────────────────────────
export class PropertySchema extends Schema {
  @type('string') id = '';
  @type('string') name = '';
  @type('string') ownerId = '';       // Vide ou ID du propriétaire
  @type('int32') price = 0;           // Prix d'achat MLS
  @type('boolean') locked = true;     // Verrouillage de la porte d'entrée
}

// ═══════════════════════════════════════════════════════════════════════════
//  SCHÉMA GÉNÉRAL DE LA SALLE RP (ROOM STATE REPLICATED)
// ═══════════════════════════════════════════════════════════════════════════
export class RPRoomState extends Schema {
  // Tables répliquées dynamiques
  @type({ map: PlayerSchema }) players = new MapSchema<PlayerSchema>();
  @type({ map: VehicleSchema }) vehicles = new MapSchema<VehicleSchema>();
  @type({ map: PlacedPropSchema }) placedProps = new MapSchema<PlacedPropSchema>();
  @type({ map: PropertySchema }) properties = new MapSchema<PropertySchema>();
  @type([ChatMessageSchema]) chatMessages = new ArraySchema<ChatMessageSchema>();

  // Variables globales environnementales (Rendues par tous les clients)
  @type('float32') timeOfDay = 12.0;  // Cycle horaire (0.00 à 24.00)
  @type('string') weather = 'ensoleille';
  @type('string') riskLevel = 'GREEN'; // Niveau de menace global (ThirdEye Alert)
  @type('uint16') playerCount = 0;    // Compteur de connexions répliqué (Consomme 2 octets au lieu de 8)
}