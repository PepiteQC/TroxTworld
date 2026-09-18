// ═══════════════════════════════════════════════════════════════════════════
//  BUILDER COMMANDS — MOTEUR DE CONSTRUCTION 3D, PROPS & FORGE
//  server/intellectus/commands/BuilderCommands.ts
//  Spawn d'objets · Annulation (Undo) · Persistance · Nettoyage · Intégrité 3D
// ═══════════════════════════════════════════════════════════════════════════

import type { IKernel } from '../types';

export interface CommandOptions {
  permission?: 'user' | 'moderator' | 'admin' | 'root';
  rateLimit?: number;
  description?: string;
}

export interface DecapriusCommands {
  register: (
    name: string,
    handler: (params: any, ctx: any) => Promise<any> | any,
    options?: CommandOptions
  ) => void;
}

export interface PlacedProp {
  id: string;
  type: string;
  ownerId: string;
  position: [number, number, number];
  rotation: [number, number, number] | number;
  scale: number;
  frozen: boolean;
  health: number; // 0 à 100
  createdAt: number;
}

export function registerBuilderCommands(
  commands: DecapriusCommands,
  kernel: IKernel
): void {

  // Helper d'enregistrement multitype (build:cmd, forge:cmd, prop:cmd)
  const reg = (
    name: string,
    handler: (params: any, ctx: any) => Promise<any> | any,
    opts?: CommandOptions
  ) => {
    commands.register(name, handler, opts);
    commands.register(name.replace('build:', 'forge:'), handler, opts);
    commands.register(name.replace('build:', 'prop:'), handler, opts);
    commands.register(name.replace(':', '.'), handler, opts);
  };

  // ── 🔨 1. SPAWN PROP — Poser un objet 3D dans le monde ───────────────────
  reg('build:spawnProp', async (params, ctx) => {
    const ownerId = ctx?.playerId || params?.ownerId || 'admin';
    const type = params?.type || params?.itemId || params?.model || 'cube';
    
    const x = Number(params?.x ?? params?.position?.[0] ?? 0);
    const y = Number(params?.y ?? params?.position?.[1] ?? 1.0);
    const z = Number(params?.z ?? params?.position?.[2] ?? 0);
    const rotation = params?.rotation ?? 0;
    const scale = Number(params?.scale) || 1.0;
    const frozen = params?.frozen !== undefined ? Boolean(params.frozen) : true;

    const propId = params?.id || `prop_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    const newProp: PlacedProp = {
      id: propId,
      type,
      ownerId,
      position: [x, y, z],
      rotation,
      scale,
      frozen,
      health: 100,
      createdAt: Date.now(),
    };

    // 1. Sauvegarde persistante dans LotusStore
    kernel.memory?.lotusStore?.set?.('placed_props', propId, newProp);

    // 2. Émission de l'événement de spawn pour le rendu des autres joueurs
    if (kernel.bus) {
      await kernel.bus.emit(
        'builder:prop_spawned',
        {
          prop: newProp,
          author: ctx?.sender?.username || ownerId,
          timestamp: Date.now(),
        },
        'normal',
        'BuilderEngine'
      );
    }

    return {
      ok: true,
      action: 'SPAWN_PROP',
      prop: newProp,
      message: `📦 Objet [${type}] placé avec succès.`,
    };
  }, {
    permission: 'user',
    rateLimit: 300,
    description: 'Pose un objet ou bloc 3D dans le monde (cube, mur, rampe, banc, arbre, etc.)',
  });

  // ── 🗑️ 2. REMOVE PROP — Supprimer un objet spécifique ────────────────────
  reg('build:removeProp', async (params, ctx) => {
    const propId = params?.propId || params?.id;
    if (!propId) return { ok: false, error: 'propId requis' };

    const prop: PlacedProp = kernel.memory?.lotusStore?.get?.('placed_props', propId);
    const isAdmin = ctx?.isAdmin || ctx?.permission === 'admin' || ctx?.permission === 'moderator';

    // Vérification de propriété (sauf pour les admins)
    if (prop && !isAdmin && ctx?.playerId && prop.ownerId !== ctx.playerId) {
      return { ok: false, error: 'Vous n\'êtes pas le propriétaire de cet objet.' };
    }

    // Suppression du store
    kernel.memory?.lotusStore?.delete?.('placed_props', propId);

    if (kernel.bus) {
      await kernel.bus.emit(
        'builder:prop_removed',
        { propId, removedBy: ctx?.playerId || 'system' },
        'normal',
        'BuilderEngine'
      );
    }

    return {
      ok: true,
      action: 'REMOVE_PROP',
      propId,
      message: '🗑 Objet retiré du monde.',
    };
  }, {
    permission: 'user',
    description: 'Supprime un objet 3D spécifique par son identifiant',
  });

  // ── ⏪ 3. UNDO — Annuler la dernière pose d'objet ─────────────────────────
  reg('build:undo', async (_params, ctx) => {
    const ownerId = ctx?.playerId || 'admin';
    const allProps: PlacedProp[] = kernel.memory?.lotusStore?.values?.('placed_props') || [];

    // Trouve le dernier objet posé par ce joueur
    const userProps = allProps
      .filter((p) => p.ownerId === ownerId)
      .sort((a, b) => b.createdAt - a.createdAt);

    if (userProps.length === 0) {
      return { ok: false, error: 'Aucun objet récent à annuler.' };
    }

    const lastProp = userProps[0];
    kernel.memory?.lotusStore?.delete?.('placed_props', lastProp.id);

    if (kernel.bus) {
      await kernel.bus.emit(
        'builder:prop_removed',
        { propId: lastProp.id, removedBy: ownerId },
        'normal',
        'BuilderEngine'
      );
    }

    return {
      ok: true,
      action: 'UNDO_PROP',
      removedPropId: lastProp.id,
      message: `⏪ Dernier objet [${lastProp.type}] annulé.`,
    };
  }, {
    permission: 'user',
    description: 'Annule la dernière construction posée par le joueur',
  });

  // ── 🧹 4. CLEAR PROPS — Nettoyage complet ou par joueur ──────────────────
  reg('build:clearProps', async (params, ctx) => {
    const targetOwnerId = params?.ownerId;
    const allProps: PlacedProp[] = kernel.memory?.lotusStore?.values?.('placed_props') || [];
    let clearedCount = 0;

    for (const prop of allProps) {
      if (!targetOwnerId || prop.ownerId === targetOwnerId) {
        kernel.memory?.lotusStore?.delete?.('placed_props', prop.id);
        clearedCount++;
      }
    }

    if (kernel.bus) {
      await kernel.bus.emit(
        'builder:props_cleared',
        {
          clearedCount,
          ownerId: targetOwnerId || 'all',
          admin: ctx?.sender?.username || ctx?.playerId || 'Admin',
        },
        'high',
        'BuilderEngine'
      );
    }

    return {
      ok: true,
      action: 'CLEAR_PROPS',
      clearedCount,
      ownerId: targetOwnerId || 'all',
      message: `🧹 ${clearedCount} objet(s) de construction supprimé(s).`,
    };
  }, {
    permission: 'admin',
    description: 'Supprime tous les objets de construction du serveur ou d\'un joueur ciblé',
  });

  // ── 🛡️ 5. REPAIR STRUCTURE — Réparer l'intégrité physique ────────────────
  reg('build:repairStructure', async (params, ctx) => {
    const propId = params?.propId || params?.id;
    const allProps: PlacedProp[] = kernel.memory?.lotusStore?.values?.('placed_props') || [];
    let repairedCount = 0;

    for (const prop of allProps) {
      if (!propId || prop.id === propId) {
        prop.health = 100;
        kernel.memory?.lotusStore?.set?.('placed_props', prop.id, prop);
        repairedCount++;
      }
    }

    if (kernel.bus) {
      await kernel.bus.emit(
        'builder:structure_repaired',
        { propId: propId || 'all', repairedCount, admin: ctx?.playerId },
        'normal',
        'BuilderEngine'
      );
    }

    return {
      ok: true,
      action: 'REPAIR_STRUCTURE',
      repairedCount,
      message: `🛡️ ${repairedCount} structure(s) réparée(s) à 100% d'intégrité.`,
    };
  }, {
    permission: 'moderator',
    description: 'Répare la santé physique et la stabilité des structures construites',
  });

  console.log('🏗️ [BuilderCommands] 5 commandes du Builder Engine enregistrées');
}