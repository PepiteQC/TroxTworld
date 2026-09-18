// ═══════════════════════════════════════════════════════════════════════════
//  BENEDICTUS — VALIDATION DE CONTRATS AUX FRONTIÈRES
//  server/intellectus/Benedictus.ts
//  Valide TOUT avant que ça touche la logique serveur. Chaque payload client
//  passe par un contrat déclaré. Protection frontière = anti-cheat structurel.
// ═══════════════════════════════════════════════════════════════════════════

import {
  Contract,
  FieldRule,
  ValidationResult,
  ValidationError,
} from './types';

export class Benedictus {
  private static instance: Benedictus;
  private contracts = new Map<string, Contract>();

  static getInstance(): Benedictus {
    if (!Benedictus.instance) Benedictus.instance = new Benedictus();
    return Benedictus.instance;
  }

  /**
   * Déclarer un contrat. Idempotent : re-déclarer remplace.
   */
  register(contract: Contract): void {
    this.contracts.set(contract.contractName, contract);
  }

  registerMany(contracts: Contract[]): void {
    contracts.forEach((c) => this.register(c));
  }

  has(contractName: string): boolean {
    return this.contracts.has(contractName);
  }

  /**
   * Valider un objet contre un contrat déclaré.
   */
  validate(contractName: string, data: any): ValidationResult {
    const contract = this.contracts.get(contractName);
    if (!contract) {
      return {
        valid: false,
        errors: [{ field: '_contract', message: `Contrat inconnu: ${contractName}` }],
      };
    }
    return this.validateAgainst(contract, data);
  }

  /**
   * Valider contre un contrat inline (sans l'enregistrer).
   */
  validateAgainst(contract: Contract, data: any): ValidationResult {
    const errors: ValidationError[] = [];
    const sanitized: Record<string, any> = {};

    if (typeof data !== 'object' || data === null) {
      return {
        valid: false,
        errors: [{ field: '_root', message: 'Le payload doit être un objet.' }],
      };
    }

    // Vérifier chaque champ déclaré
    for (const [fieldName, rule] of Object.entries(contract.fields)) {
      const value = data[fieldName];
      const fieldErrors = this.validateField(fieldName, value, rule);
      errors.push(...fieldErrors);
      if (fieldErrors.length === 0 && value !== undefined) {
        sanitized[fieldName] = value;
      }
    }

    // Mode strict : rejeter les champs non déclarés (protection frontière)
    if (contract.strict) {
      for (const key of Object.keys(data)) {
        if (!(key in contract.fields)) {
          errors.push({ field: key, message: `Champ non autorisé (mode strict): ${key}` });
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      sanitized: errors.length === 0 ? sanitized : undefined,
    };
  }

  private validateField(field: string, value: any, rule: FieldRule): ValidationError[] {
    const errors: ValidationError[] = [];

    // Requis
    if (value === undefined || value === null) {
      if (rule.required) {
        errors.push({ field, message: `Champ requis manquant: ${field}` });
      }
      return errors; // Si absent et non requis, on s'arrête
    }

    // Type
    switch (rule.type) {
      case 'string':
        if (typeof value !== 'string') {
          errors.push({ field, message: `${field} doit être une chaîne` });
        } else {
          if (rule.minLength !== undefined && value.length < rule.minLength)
            errors.push({ field, message: `${field}: min ${rule.minLength} caractères` });
          if (rule.maxLength !== undefined && value.length > rule.maxLength)
            errors.push({ field, message: `${field}: max ${rule.maxLength} caractères` });
          if (rule.pattern && !rule.pattern.test(value))
            errors.push({ field, message: `${field}: format invalide` });
        }
        break;

      case 'number':
        if (typeof value !== 'number' || Number.isNaN(value)) {
          errors.push({ field, message: `${field} doit être un nombre` });
        } else {
          if (rule.min !== undefined && value < rule.min)
            errors.push({ field, message: `${field}: min ${rule.min}` });
          if (rule.max !== undefined && value > rule.max)
            errors.push({ field, message: `${field}: max ${rule.max}` });
        }
        break;

      case 'boolean':
        if (typeof value !== 'boolean')
          errors.push({ field, message: `${field} doit être un booléen` });
        break;

      case 'enum':
        if (!rule.enumValues || !rule.enumValues.includes(value))
          errors.push({ field, message: `${field}: valeur non autorisée (${value})` });
        break;

      case 'vector3':
        if (
          !Array.isArray(value) ||
          value.length !== 3 ||
          value.some((n) => typeof n !== 'number' || Number.isNaN(n))
        ) {
          errors.push({ field, message: `${field} doit être un Vector3 [x,y,z]` });
        }
        break;

      case 'array':
        if (!Array.isArray(value)) {
          errors.push({ field, message: `${field} doit être un tableau` });
        } else if (rule.arrayOf) {
          value.forEach((item, i) => {
            errors.push(...this.validateField(`${field}[${i}]`, item, rule.arrayOf!));
          });
        }
        break;

      case 'object':
        if (typeof value !== 'object' || Array.isArray(value)) {
          errors.push({ field, message: `${field} doit être un objet` });
        } else if (rule.shape) {
          for (const [subField, subRule] of Object.entries(rule.shape)) {
            errors.push(...this.validateField(`${field}.${subField}`, value[subField], subRule));
          }
        }
        break;

      case 'any':
        break;
    }

    // Validation custom
    if (errors.length === 0 && rule.custom) {
      const result = rule.custom(value);
      if (result !== true) {
        errors.push({ field, message: result });
      }
    }

    return errors;
  }

  getContract(name: string): Contract | undefined {
    return this.contracts.get(name);
  }

  listContracts(): string[] {
    return Array.from(this.contracts.keys());
  }
}

export const benedictus = Benedictus.getInstance();

// ─────────────────────────────────────────────────────────────────────────
//  CONTRATS RP PRÉ-DÉCLARÉS — frontières client → serveur
//  Correspondent aux messages Colyseus du GameRoom.
// ─────────────────────────────────────────────────────────────────────────

export const RP_CONTRACTS: Contract[] = [
  {
    contractName: 'player.update',
    strict: true,
    fields: {
      position: { type: 'vector3', required: true },
      rotation: { type: 'number', required: true, min: -Math.PI * 2, max: Math.PI * 2 },
      animation: { type: 'string', maxLength: 24 },
      health: { type: 'number', min: 0, max: 100 },
      vehicleId: { type: 'string', maxLength: 64 },
      username: { type: 'string', maxLength: 32 },
      job: { type: 'string', maxLength: 32 },
      aura: { type: 'string', maxLength: 32 },
    },
  },
  {
    contractName: 'chat.message',
    strict: true,
    fields: {
      type: {
        type: 'enum',
        required: true,
        enumValues: ['local', 'whisper', 'shout', 'me', 'do', 'ooc', 'ad', 'system'],
      },
      text: { type: 'string', required: true, minLength: 1, maxLength: 500 },
    },
  },
  {
    contractName: 'vehicle.enter',
    strict: true,
    fields: {
      vehicleId: { type: 'string', required: true, maxLength: 64 },
      seat: { type: 'enum', enumValues: ['driver', 'passenger'] },
    },
  },
  {
    contractName: 'economy.transfer',
    strict: true,
    fields: {
      targetId: { type: 'string', required: true, maxLength: 64 },
      amount: { type: 'number', required: true, min: 1, max: 1_000_000 },
    },
  },
  {
    contractName: 'admin.command',
    strict: true,
    fields: {
      prompt: { type: 'string', required: true, minLength: 2, maxLength: 1200 },
    },
  },
  {
    contractName: 'build.place',
    strict: true,
    fields: {
      itemId: { type: 'string', required: true, maxLength: 64 },
      position: { type: 'vector3', required: true },
      rotationY: { type: 'number', min: -Math.PI * 2, max: Math.PI * 2 },
    },
  },
];