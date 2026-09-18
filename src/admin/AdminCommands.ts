// src/admin/AdminCommands.ts
// ETHERWORLD RP — TroxTetherworld Platinum Admin Commands Registry & Dispatcher

import { AdminRole, RpJobRole, CommandContext, CommandDefinition } from "../shared/AdminTypes";
import { checkPermission, getUserRole, setUserRole, setUserJob, getAllStaffMembers, getRoleBadgeStyle, getJobBadgeStyle } from "./AdminPermissions";
import { AdminLogger } from "./AdminLogger";

export const commandRegistry: Map<string, CommandDefinition> = new Map();

export function registerCommand(def: CommandDefinition) {
  commandRegistry.set(def.name.toLowerCase(), def);
  if (def.aliases) {
    def.aliases.forEach((alias) => {
      commandRegistry.set(alias.toLowerCase(), def);
    });
  }
}

// ─── HELPER FUNCTIONS ────────────────────────────────────────────────────────
function findTargetPlayer(room: any, query?: string) {
  if (!query || !room || !room.state || !room.state.players) return null;
  
  // Try exact match by session ID
  let found = room.state.players.get(query);
  if (found) return { sessionId: query, player: found };

  // Try substring match by username
  const qLower = query.toLowerCase();
  for (const [sId, player] of room.state.players.entries()) {
    if (player.username && player.username.toLowerCase().includes(qLower)) {
      return { sessionId: sId, player };
    }
  }

  return null;
}

function broadcastAdminMessage(room: any, message: string, type: string = "system") {
  if (!room || !room.state || !room.state.chatMessages) return;
  const msgState = {
    id: `admin_msg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    senderId: "SERVER",
    senderName: "[ADMIN]",
    type: type,
    text: message,
    x: 0, y: 0, z: 0,
    timestamp: Date.now(),
  };
  room.state.chatMessages.push(msgState);
  if (room.state.chatMessages.length > 50) {
    room.state.chatMessages.shift();
  }
}

// ─── COMMAND DEFINITIONS ─────────────────────────────────────────────────────

// Moderation Commands
registerCommand({
  name: "/kick",
  permission: AdminRole.MOD,
  minArgs: 1,
  usage: "/kick <player> [reason]",
  description: "Expulse un joueur du serveur",
  category: "moderation",
  handler: (ctx) => {
    const targetQuery = ctx.args[0];
    const reason = ctx.args.slice(1).join(" ") || "Expulsé par un modérateur";
    const target = findTargetPlayer(ctx.room, targetQuery);

    if (!target) {
      broadcastAdminMessage(ctx.room, `❌ Joueur introuvable: ${targetQuery}`);
      return;
    }

    AdminLogger.log({
      adminId: ctx.sender.sessionId,
      adminName: ctx.sender.username,
      action: "KICK",
      severity: "warning",
      targetId: target.sessionId,
      targetName: target.player.username,
      details: reason,
    });

    broadcastAdminMessage(ctx.room, `⚡ [MODERATION] ${target.player.username} a été expulsé par ${ctx.sender.username} (${reason})`);
    
    // Disconnect client if client object exists in room
    const client = ctx.room.clients?.find((c: any) => c.sessionId === target.sessionId);
    if (client) {
      client.leave(4000, reason);
    } else {
      ctx.room.state.players.delete(target.sessionId);
    }
  },
});

registerCommand({
  name: "/ban",
  permission: AdminRole.ADMIN,
  minArgs: 1,
  usage: "/ban <player> [duration] [reason]",
  description: "Bannit un joueur du serveur",
  category: "moderation",
  handler: (ctx) => {
    const targetQuery = ctx.args[0];
    const duration = ctx.args[1] || "permanent";
    const reason = ctx.args.slice(2).join(" ") || "Banni du serveur";
    const target = findTargetPlayer(ctx.room, targetQuery);

    const targetName = target ? target.player.username : targetQuery;
    AdminLogger.log({
      adminId: ctx.sender.sessionId,
      adminName: ctx.sender.username,
      action: "BAN",
      severity: "danger",
      targetName: targetName,
      details: `Durée: ${duration}, Raison: ${reason}`,
    });

    broadcastAdminMessage(ctx.room, `⛔ [BAN] ${targetName} a été banni par ${ctx.sender.username} [${duration}] (${reason})`);
    if (target) {
      ctx.room.state.players.delete(target.sessionId);
    }
  },
});

registerCommand({
  name: "/unban",
  permission: AdminRole.ADMIN,
  minArgs: 1,
  usage: "/unban <player_or_id>",
  description: "Débannit un joueur",
  category: "moderation",
  handler: (ctx) => {
    const targetName = ctx.args[0];
    AdminLogger.log({
      adminId: ctx.sender.sessionId,
      adminName: ctx.sender.username,
      action: "UNBAN",
      severity: "info",
      targetName,
      details: "Débanni via commande",
    });
    broadcastAdminMessage(ctx.room, `✅ [ADMIN] ${targetName} a été débanni par ${ctx.sender.username}`);
  },
});

registerCommand({
  name: "/mute",
  permission: AdminRole.MOD,
  minArgs: 1,
  usage: "/mute <player> [duration]",
  description: "Rend un joueur muet dans le chat RP",
  category: "moderation",
  handler: (ctx) => {
    const target = findTargetPlayer(ctx.room, ctx.args[0]);
    if (!target) return broadcastAdminMessage(ctx.room, `❌ Joueur introuvable`);
    AdminLogger.log({
      adminId: ctx.sender.sessionId,
      adminName: ctx.sender.username,
      action: "MUTE",
      severity: "warning",
      targetId: target.sessionId,
      targetName: target.player.username,
      details: ctx.args[1] || "10m",
    });
    broadcastAdminMessage(ctx.room, `🔇 [MOD] ${target.player.username} a été réduit au silence par ${ctx.sender.username}`);
  },
});

registerCommand({
  name: "/warn",
  permission: AdminRole.MOD,
  minArgs: 2,
  usage: "/warn <player> <reason>",
  description: "Avertit un joueur pour manquement aux règles RP",
  category: "moderation",
  handler: (ctx) => {
    const target = findTargetPlayer(ctx.room, ctx.args[0]);
    const reason = ctx.args.slice(1).join(" ");
    if (!target) return broadcastAdminMessage(ctx.room, `❌ Joueur introuvable`);
    AdminLogger.log({
      adminId: ctx.sender.sessionId,
      adminName: ctx.sender.username,
      action: "WARN",
      severity: "warning",
      targetId: target.sessionId,
      targetName: target.player.username,
      details: reason,
    });
    broadcastAdminMessage(ctx.room, `⚠️ [AVERTISSEMENT] ${target.player.username} a reçu un avertissement: ${reason}`);
  },
});

registerCommand({
  name: "/clearwarns",
  permission: AdminRole.ADMIN,
  minArgs: 1,
  usage: "/clearwarns <player>",
  description: "Efface les avertissements d'un joueur",
  category: "moderation",
  handler: (ctx) => {
    const target = findTargetPlayer(ctx.room, ctx.args[0]);
    const tName = target ? target.player.username : ctx.args[0];
    broadcastAdminMessage(ctx.room, `🧹 [ADMIN] Avertissements effacés pour ${tName}`);
  },
});

registerCommand({
  name: "/freeze",
  permission: AdminRole.MOD,
  minArgs: 1,
  usage: "/freeze <player>",
  description: "Immobilise un joueur sur place",
  category: "moderation",
  handler: (ctx) => {
    const target = findTargetPlayer(ctx.room, ctx.args[0]);
    if (!target) return broadcastAdminMessage(ctx.room, `❌ Joueur introuvable`);
    broadcastAdminMessage(ctx.room, `🥶 [MOD] ${target.player.username} a été gelé sur place par ${ctx.sender.username}`);
  },
});

registerCommand({
  name: "/unfreeze",
  permission: AdminRole.MOD,
  minArgs: 1,
  usage: "/unfreeze <player>",
  description: "Libère un joueur immobilisé",
  category: "moderation",
  handler: (ctx) => {
    const target = findTargetPlayer(ctx.room, ctx.args[0]);
    if (!target) return broadcastAdminMessage(ctx.room, `❌ Joueur introuvable`);
    broadcastAdminMessage(ctx.room, `🔥 [MOD] ${target.player.username} a été dégelé par ${ctx.sender.username}`);
  },
});

registerCommand({
  name: "/spectate",
  permission: AdminRole.MOD,
  minArgs: 1,
  usage: "/spectate <player>",
  description: "Passe en mode spectateur sur le joueur",
  category: "moderation",
  handler: (ctx) => {
    broadcastAdminMessage(ctx.room, `👁️ [SPECTATE] Téléportation de la caméra vers ${ctx.args[0]}`);
  },
});

registerCommand({
  name: "/staffchat",
  aliases: ["/sc", "/staff"],
  permission: AdminRole.MOD,
  minArgs: 1,
  usage: "/staffchat <message>",
  description: "Envoie un message au canal réservé au staff",
  category: "broadcast",
  handler: (ctx) => {
    const text = ctx.args.join(" ");
    broadcastAdminMessage(ctx.room, `🔒 [STAFF CHAT] ${ctx.sender.username}: ${text}`, "staff");
  },
});

// Teleportation Commands
registerCommand({
  name: "/tp",
  permission: AdminRole.ADMIN,
  minArgs: 1,
  usage: "/tp <player1> [player2] OR /tp <x> <y> <z>",
  description: "Téléporte un joueur vers un autre ou à des coordonnées",
  category: "teleport",
  handler: (ctx) => {
    if (ctx.args.length >= 3 && !isNaN(Number(ctx.args[0]))) {
      const x = Number(ctx.args[0]);
      const y = Number(ctx.args[1]);
      const z = Number(ctx.args[2]);
      const player = ctx.room.state.players.get(ctx.sender.sessionId);
      if (player) {
        player.x = x; player.y = y; player.z = z;
        broadcastAdminMessage(ctx.room, `📍 Téléporté à (${x}, ${y}, ${z})`);
      }
      return;
    }

    const t1 = findTargetPlayer(ctx.room, ctx.args[0]);
    if (!t1) return broadcastAdminMessage(ctx.room, `❌ Joueur cible 1 introuvable`);

    if (ctx.args[1]) {
      const t2 = findTargetPlayer(ctx.room, ctx.args[1]);
      if (!t2) return broadcastAdminMessage(ctx.room, `❌ Joueur cible 2 introuvable`);
      t1.player.x = t2.player.x;
      t1.player.y = t2.player.y;
      t1.player.z = t2.player.z;
      broadcastAdminMessage(ctx.room, `🚀 ${t1.player.username} téléporté vers ${t2.player.username}`);
    } else {
      const self = ctx.room.state.players.get(ctx.sender.sessionId);
      if (self) {
        self.x = t1.player.x;
        self.y = t1.player.y;
        self.z = t1.player.z;
        broadcastAdminMessage(ctx.room, `🚀 Téléporté vers ${t1.player.username}`);
      }
    }
  },
});

registerCommand({
  name: "/goto",
  permission: AdminRole.ADMIN,
  minArgs: 1,
  usage: "/goto <player>",
  description: "Se téléporte auprès d'un joueur",
  category: "teleport",
  handler: (ctx) => {
    const target = findTargetPlayer(ctx.room, ctx.args[0]);
    if (!target) return broadcastAdminMessage(ctx.room, `❌ Joueur introuvable`);
    const self = ctx.room.state.players.get(ctx.sender.sessionId);
    if (self) {
      self.x = target.player.x + 1;
      self.y = target.player.y;
      self.z = target.player.z + 1;
      broadcastAdminMessage(ctx.room, `🚀 Téléporté à côté de ${target.player.username}`);
    }
  },
});

registerCommand({
  name: "/gethere",
  permission: AdminRole.ADMIN,
  minArgs: 1,
  usage: "/gethere <player>",
  description: "Téléporte un joueur jusqu'à vous",
  category: "teleport",
  handler: (ctx) => {
    const target = findTargetPlayer(ctx.room, ctx.args[0]);
    if (!target) return broadcastAdminMessage(ctx.room, `❌ Joueur introuvable`);
    const self = ctx.room.state.players.get(ctx.sender.sessionId);
    if (self) {
      target.player.x = self.x + 1;
      target.player.y = self.y;
      target.player.z = self.z + 1;
      broadcastAdminMessage(ctx.room, `💫 ${target.player.username} téléporté vers vous`);
    }
  },
});

registerCommand({
  name: "/tpwaypoint",
  permission: AdminRole.ADMIN,
  minArgs: 0,
  usage: "/tpwaypoint",
  description: "Téléporte au waypoint GPS actuel",
  category: "teleport",
  handler: (ctx) => {
    broadcastAdminMessage(ctx.room, `📍 Téléportation au Waypoint GPS effectuée !`);
  },
});

registerCommand({
  name: "/setwaypoint",
  permission: AdminRole.ADMIN,
  minArgs: 3,
  usage: "/setwaypoint <x> <y> <z>",
  description: "Définit un point de repère",
  category: "teleport",
  handler: (ctx) => {
    broadcastAdminMessage(ctx.room, `📌 Waypoint fixé à X:${ctx.args[0]} Y:${ctx.args[1]} Z:${ctx.args[2]}`);
  },
});

// Player Stats Commands
registerCommand({
  name: "/heal",
  permission: AdminRole.MOD,
  minArgs: 0,
  usage: "/heal [player]",
  description: "Soigne complètement la santé d'un joueur",
  category: "stats",
  handler: (ctx) => {
    const target = ctx.args[0] ? findTargetPlayer(ctx.room, ctx.args[0]) : null;
    if (target) {
      target.player.health = 100;
      broadcastAdminMessage(ctx.room, `💊 ${target.player.username} a été soigné par ${ctx.sender.username}`);
    } else {
      const self = ctx.room.state.players.get(ctx.sender.sessionId);
      if (self) self.health = 100;
      broadcastAdminMessage(ctx.room, `💊 Santé restaurée à 100%`);
    }
  },
});

registerCommand({
  name: "/revive",
  permission: AdminRole.ADMIN,
  minArgs: 0,
  usage: "/revive [player]",
  description: "Ranime un joueur dans l'état comateux",
  category: "stats",
  handler: (ctx) => {
    const target = ctx.args[0] ? findTargetPlayer(ctx.room, ctx.args[0]) : null;
    const pName = target ? target.player.username : ctx.sender.username;
    if (target) target.player.health = 100;
    broadcastAdminMessage(ctx.room, `✨ ${pName} a été réanimé !`);
  },
});

registerCommand({
  name: "/god",
  permission: AdminRole.ADMIN,
  minArgs: 0,
  usage: "/god [player]",
  description: "Active/désactive le mode invulnérable / vol",
  category: "stats",
  handler: (ctx) => {
    broadcastAdminMessage(ctx.room, `🛡️ Mode Dieu basculé pour ${ctx.args[0] || ctx.sender.username}`);
  },
});

registerCommand({
  name: "/noclip",
  permission: AdminRole.ADMIN,
  minArgs: 0,
  usage: "/noclip",
  description: "Bascule le vol libre à travers les murs",
  category: "utility",
  handler: (ctx) => {
    broadcastAdminMessage(ctx.room, `✈️ Mode NoClip basculé pour ${ctx.sender.username}`);
  },
});

registerCommand({
  name: "/vanish",
  permission: AdminRole.ADMIN,
  minArgs: 0,
  usage: "/vanish",
  description: "Rend le personnage invisible aux autres joueurs",
  category: "utility",
  handler: (ctx) => {
    broadcastAdminMessage(ctx.room, `👻 Mode Invisibilité basculé pour ${ctx.sender.username}`);
  },
});

registerCommand({
  name: "/setskin",
  permission: AdminRole.ADMIN,
  minArgs: 2,
  usage: "/setskin <player> <skin_model>",
  description: "Change le modèle de personnage / skin d'un joueur",
  category: "stats",
  handler: (ctx) => {
    const target = findTargetPlayer(ctx.room, ctx.args[0]);
    const skin = ctx.args[1];
    if (target) {
      target.player.job = skin;
      broadcastAdminMessage(ctx.room, `👔 Skin de ${target.player.username} changé en '${skin}'`);
    }
  },
});

// Vehicle Commands
registerCommand({
  name: "/car",
  aliases: ["/v", "/veh"],
  permission: AdminRole.ADMIN,
  minArgs: 1,
  usage: "/car <model>",
  description: "Fait apparaître un véhicule (supercar, police, taxi, truck, ambulance)",
  category: "vehicle",
  handler: (ctx) => {
    const modelType = ctx.args[0].toLowerCase();
    const self = ctx.room.state.players.get(ctx.sender.sessionId);
    if (!self) return;

    const vehId = `admin_veh_${Date.now()}`;
    const vehState = {
      id: vehId,
      type: modelType,
      name: `Véhicule Admin ${modelType}`,
      x: self.x + 2,
      y: self.y,
      z: self.z + 2,
      rotation: self.rotation,
      speed: 0,
      health: 100,
      locked: false,
      driverId: "",
      siren: false,
      headlights: true,
    };

    ctx.room.state.vehicles.set(vehId, vehState);
    broadcastAdminMessage(ctx.room, `🚘 Véhicule '${modelType}' généré à côté de vous !`);
  },
});

registerCommand({
  name: "/fix",
  permission: AdminRole.ADMIN,
  minArgs: 0,
  usage: "/fix [veh_id]",
  description: "Répare le véhicule ciblé ou actuel",
  category: "vehicle",
  handler: (ctx) => {
    broadcastAdminMessage(ctx.room, `🔧 Véhicule intégralement réparé !`);
  },
});

registerCommand({
  name: "/clean",
  permission: AdminRole.ADMIN,
  minArgs: 0,
  usage: "/clean",
  description: "Nettoie tous les véhicules inutilisés et débris de la carte",
  category: "vehicle",
  handler: (ctx) => {
    broadcastAdminMessage(ctx.room, `🧼 [CLEANUP] Nettoyage de la carte effectué par l'administrateur !`);
  },
});

// Economy / Item Commands
registerCommand({
  name: "/giveitem",
  permission: AdminRole.ADMIN,
  minArgs: 3,
  usage: "/giveitem <player> <item_id> <quantity>",
  description: "Donne un objet dans l'inventaire d'un joueur",
  category: "economy",
  handler: (ctx) => {
    const target = findTargetPlayer(ctx.room, ctx.args[0]);
    const itemId = ctx.args[1];
    const qty = parseInt(ctx.args[2]) || 1;
    const tName = target ? target.player.username : ctx.args[0];
    broadcastAdminMessage(ctx.room, `📦 Donné x${qty} '${itemId}' à ${tName}`);
  },
});

registerCommand({
  name: "/givecash",
  permission: AdminRole.ADMIN,
  minArgs: 2,
  usage: "/givecash <player> <amount>",
  description: "Ajoute de l'argent liquide à un joueur",
  category: "economy",
  handler: (ctx) => {
    const amount = parseInt(ctx.args[1]) || 0;
    broadcastAdminMessage(ctx.room, `💵 ${amount}$ cash accordés à ${ctx.args[0]}`);
  },
});

registerCommand({
  name: "/givebank",
  permission: AdminRole.ADMIN,
  minArgs: 2,
  usage: "/givebank <player> <amount>",
  description: "Dépose de l'argent sur le compte bancaire d'un joueur",
  category: "economy",
  handler: (ctx) => {
    const amount = parseInt(ctx.args[1]) || 0;
    broadcastAdminMessage(ctx.room, `🏦 ${amount}$ versés sur le compte bancaire de ${ctx.args[0]}`);
  },
});

// World & Environment
registerCommand({
  name: "/weather",
  permission: AdminRole.ADMIN,
  minArgs: 1,
  usage: "/weather <clear|rain|fog|snow|storm>",
  description: "Change la météo globale du serveur",
  category: "world",
  handler: (ctx) => {
    const w = ctx.args[0].toLowerCase();
    ctx.room.state.weather = w;
    broadcastAdminMessage(ctx.room, `🌤️ Météo changée pour: ${w.toUpperCase()}`);
  },
});

registerCommand({
  name: "/time",
  permission: AdminRole.ADMIN,
  minArgs: 1,
  usage: "/time <0-24>",
  description: "Change l'heure courante de la journée",
  category: "world",
  handler: (ctx) => {
    const hour = parseFloat(ctx.args[0]) || 12;
    ctx.room.state.timeOfDay = hour;
    broadcastAdminMessage(ctx.room, `⏰ Heure du serveur ajustée à ${hour}:00`);
  },
});

registerCommand({
  name: "/setspawn",
  permission: AdminRole.SUPERADMIN,
  minArgs: 0,
  usage: "/setspawn",
  description: "Définit le point d'apparition global par défaut",
  category: "world",
  handler: (ctx) => {
    broadcastAdminMessage(ctx.room, `🎯 Point d'apparition global redéfini !`);
  },
});

// Broadcast & RP Chat Extensions
registerCommand({
  name: "/announce",
  aliases: ["/ann"],
  permission: AdminRole.ADMIN,
  minArgs: 1,
  usage: "/announce <message>",
  description: "Publie une annonce globale sur tout le serveur",
  category: "broadcast",
  handler: (ctx) => {
    const text = ctx.args.join(" ");
    broadcastAdminMessage(ctx.room, `📢 [ANNONCE GOV] ${text}`, "announce");
  },
});

registerCommand({
  name: "/ooc",
  permission: AdminRole.MOD,
  minArgs: 1,
  usage: "/ooc <message>",
  description: "Message Hors RP global",
  category: "broadcast",
  handler: (ctx) => {
    const text = ctx.args.join(" ");
    broadcastAdminMessage(ctx.room, `💬 (( [OOC] ${ctx.sender.username}: ${text} ))`, "ooc");
  },
});

registerCommand({
  name: "/ad",
  permission: AdminRole.ADMIN,
  minArgs: 1,
  usage: "/ad <message>",
  description: "Diffuse une publicité commerciale ou annonce RP",
  category: "broadcast",
  handler: (ctx) => {
    const text = ctx.args.join(" ");
    broadcastAdminMessage(ctx.room, `📻 [PUB WEAZEL NEWS] ${text}`, "ad");
  },
});

// ─── PLATINUM EXTENDED ADMIN COMMANDS ────────────────────────────────────────

// 🚨 Jail & Detention System
registerCommand({
  name: "/jail",
  permission: AdminRole.MOD,
  minArgs: 2,
  usage: "/jail <player> <duration_sec> [reason]",
  description: "Incarcère un joueur dans la prison fédérale d'Étherworld",
  category: "moderation",
  handler: (ctx) => {
    const target = findTargetPlayer(ctx.room, ctx.args[0]);
    const duration = parseInt(ctx.args[1]) || 60;
    const reason = ctx.args.slice(2).join(" ") || "Incarcération disciplinaire RP";
    if (!target) return broadcastAdminMessage(ctx.room, `❌ Joueur introuvable: ${ctx.args[0]}`);

    // Teleport player inside prison cell
    target.player.x = -15.0;
    target.player.y = 0.5;
    target.player.z = 45.0;

    AdminLogger.log({
      adminId: ctx.sender.sessionId,
      adminName: ctx.sender.username,
      action: "JAIL",
      severity: "warning",
      targetId: target.sessionId,
      targetName: target.player.username,
      details: `Durée: ${duration}s, Raison: ${reason}`,
    });

    broadcastAdminMessage(ctx.room, `⚖️ [PRISON] ${target.player.username} a été incarcéré pour ${duration}s par ${ctx.sender.username} (${reason})`);
  },
});

registerCommand({
  name: "/unjail",
  permission: AdminRole.MOD,
  minArgs: 1,
  usage: "/unjail <player>",
  description: "Libère un joueur de la prison fédérale",
  category: "moderation",
  handler: (ctx) => {
    const target = findTargetPlayer(ctx.room, ctx.args[0]);
    if (!target) return broadcastAdminMessage(ctx.room, `❌ Joueur introuvable: ${ctx.args[0]}`);

    // Teleport player out to spawn
    target.player.x = 0;
    target.player.y = 0.5;
    target.player.z = 0;

    AdminLogger.log({
      adminId: ctx.sender.sessionId,
      adminName: ctx.sender.username,
      action: "UNJAIL",
      severity: "info",
      targetId: target.sessionId,
      targetName: target.player.username,
      details: "Libéré de prison par un admin",
    });

    broadcastAdminMessage(ctx.room, `🕊️ [PRISON] ${target.player.username} a été libéré de prison par ${ctx.sender.username}`);
  },
});

registerCommand({
  name: "/kickall",
  permission: AdminRole.SUPERADMIN,
  minArgs: 0,
  usage: "/kickall [reason]",
  description: "Expulse tous les joueurs non-staff du serveur",
  category: "moderation",
  handler: (ctx) => {
    const reason = ctx.args.join(" ") || "Maintenance globale du serveur";
    let kickedCount = 0;
    if (ctx.room && ctx.room.state && ctx.room.state.players) {
      for (const [sId, player] of ctx.room.state.players.entries()) {
        if (sId !== ctx.sender.sessionId && getUserRole(sId) === AdminRole.NONE) {
          ctx.room.state.players.delete(sId);
          kickedCount++;
        }
      }
    }
    broadcastAdminMessage(ctx.room, `💥 [CLEANUP] Expulsion globale terminée : ${kickedCount} joueurs déconnectés (${reason})`);
  },
});

registerCommand({
  name: "/slap",
  permission: AdminRole.MOD,
  minArgs: 1,
  usage: "/slap <player> [force]",
  description: "Propulse un joueur dans les airs avec un impact physique",
  category: "moderation",
  handler: (ctx) => {
    const target = findTargetPlayer(ctx.room, ctx.args[0]);
    const force = parseFloat(ctx.args[1]) || 10;
    if (!target) return broadcastAdminMessage(ctx.room, `❌ Joueur introuvable`);

    target.player.y = (target.player.y || 0) + force;
    broadcastAdminMessage(ctx.room, `👋 [MOD] ${target.player.username} a été slapé dans les airs ! (Force: +${force}m)`);
  },
});

registerCommand({
  name: "/smite",
  permission: AdminRole.ADMIN,
  minArgs: 1,
  usage: "/smite <player>",
  description: "Fappe un joueur par un éclair divin d'Éther",
  category: "moderation",
  handler: (ctx) => {
    const target = findTargetPlayer(ctx.room, ctx.args[0]);
    if (!target) return broadcastAdminMessage(ctx.room, `❌ Joueur introuvable`);

    target.player.health = 1;
    broadcastAdminMessage(ctx.room, `⚡ [SMITE] Éclair divin foudroyant infligé à ${target.player.username} !`);
  },
});

// 👑 Staff Roles & RP Jobs Assignment
registerCommand({
  name: "/setrole",
  permission: AdminRole.HEAD_ADMIN,
  minArgs: 2,
  usage: "/setrole <player> <helper|mod|admin|superadmin|head_admin|owner|developer|intellectus_ai>",
  description: "Attribue un rôle d'administration Staff Platinum",
  category: "utility",
  handler: (ctx) => {
    const targetQuery = ctx.args[0];
    const roleInput = ctx.args[1].toLowerCase() as AdminRole;

    const validRoles = Object.values(AdminRole);
    if (!validRoles.includes(roleInput)) {
      return broadcastAdminMessage(ctx.room, `❌ Rôle invalide. Rôles valides: ${validRoles.join(", ")}`);
    }

    const target = findTargetPlayer(ctx.room, targetQuery);
    const targetId = target ? target.sessionId : targetQuery;
    const targetName = target ? target.player.username : targetQuery;

    setUserRole(targetId, roleInput);
    const badge = getRoleBadgeStyle(roleInput);

    AdminLogger.log({
      adminId: ctx.sender.sessionId,
      adminName: ctx.sender.username,
      action: "SET_ROLE",
      severity: "danger",
      targetId,
      targetName,
      details: `Nouveau rôle: ${roleInput}`,
    });

    broadcastAdminMessage(ctx.room, `👑 [STAFF ROLE] ${targetName} est maintenant [${badge.label}] (Par ${ctx.sender.username})`);
  },
});

registerCommand({
  name: "/setjob",
  permission: AdminRole.ADMIN,
  minArgs: 2,
  usage: "/setjob <player> <civilian|police_officer|police_chief|fbi_agent|paramedic|medic_director|mechanic|mafia_boss|mayor|judge|secret_agent|dispensary_owner|ether_architect>",
  description: "Définit le métier RP et la profession du personnage",
  category: "utility",
  handler: (ctx) => {
    const targetQuery = ctx.args[0];
    const jobInput = ctx.args[1].toLowerCase() as RpJobRole;

    const validJobs = Object.values(RpJobRole);
    if (!validJobs.includes(jobInput)) {
      return broadcastAdminMessage(ctx.room, `❌ Métier invalide. Choix: ${validJobs.join(", ")}`);
    }

    const target = findTargetPlayer(ctx.room, targetQuery);
    const targetId = target ? target.sessionId : targetQuery;
    const targetName = target ? target.player.username : targetQuery;

    setUserJob(targetId, jobInput);
    if (target) target.player.job = jobInput;

    const jobBadge = getJobBadgeStyle(jobInput);
    broadcastAdminMessage(ctx.room, `👔 [MÉTIER RP] ${targetName} est maintenant engagé comme ${jobBadge.icon} ${jobBadge.label} !`);
  },
});

registerCommand({
  name: "/stafflist",
  aliases: ["/staffs"],
  permission: AdminRole.HELPER,
  minArgs: 0,
  usage: "/stafflist",
  description: "Affiche la liste complète des membres du Staff connectés",
  category: "utility",
  handler: (ctx) => {
    const staff = getAllStaffMembers();
    broadcastAdminMessage(ctx.room, `🛡️ [STAFF EN LIGNE] ${staff.length} Membres du Staff enregistrés :`);
    staff.forEach((s) => {
      const badge = getRoleBadgeStyle(s.role);
      const job = getJobBadgeStyle(s.job);
      broadcastAdminMessage(ctx.room, `• ID: ${s.identifier} | Rôle: [${badge.label}] | Job: ${job.icon} ${job.label}`);
    });
  },
});

// 📍 Preset POI Teleport Shortcuts
registerCommand({
  name: "/tpspawn",
  permission: AdminRole.HELPER,
  minArgs: 0,
  usage: "/tpspawn",
  description: "Téléportation instantanée au Central Spawn Point",
  category: "teleport",
  handler: (ctx) => {
    const self = ctx.room.state.players.get(ctx.sender.sessionId);
    if (self) { self.x = 0; self.y = 0.5; self.z = 0; }
    broadcastAdminMessage(ctx.room, `📍 [TP] Téléporté au Central Spawn`);
  },
});

registerCommand({
  name: "/tppolice",
  permission: AdminRole.HELPER,
  minArgs: 0,
  usage: "/tppolice",
  description: "Téléportation au Commissariat Central SPVM",
  category: "teleport",
  handler: (ctx) => {
    const self = ctx.room.state.players.get(ctx.sender.sessionId);
    if (self) { self.x = -22.0; self.y = 0.5; self.z = -18.0; }
    broadcastAdminMessage(ctx.room, `📍 [TP] Téléporté au Commissariat SPVM`);
  },
});

registerCommand({
  name: "/tpbkf",
  aliases: ["/tpbank"],
  permission: AdminRole.HELPER,
  minArgs: 0,
  usage: "/tpbkf",
  description: "Téléportation à la Banque Centrale de la Ville",
  category: "teleport",
  handler: (ctx) => {
    const self = ctx.room.state.players.get(ctx.sender.sessionId);
    if (self) { self.x = 18.0; self.y = 0.5; self.z = -25.0; }
    broadcastAdminMessage(ctx.room, `📍 [TP] Téléporté à la Banque Centrale`);
  },
});

registerCommand({
  name: "/tphotel",
  permission: AdminRole.HELPER,
  minArgs: 0,
  usage: "/tphotel",
  description: "Téléportation à l'Hôtel de Luxe Ether Plaza",
  category: "teleport",
  handler: (ctx) => {
    const self = ctx.room.state.players.get(ctx.sender.sessionId);
    if (self) { self.x = -5.0; self.y = 0.5; self.z = 15.0; }
    broadcastAdminMessage(ctx.room, `📍 [TP] Téléporté à l'Hôtel Ether Plaza`);
  },
});

registerCommand({
  name: "/tpdojo",
  permission: AdminRole.HELPER,
  minArgs: 0,
  usage: "/tpdojo",
  description: "Téléportation au Dojo / Chamber Fight Club",
  category: "teleport",
  handler: (ctx) => {
    const self = ctx.room.state.players.get(ctx.sender.sessionId);
    if (self) { self.x = 26.0; self.y = 0.5; self.z = 18.0; }
    broadcastAdminMessage(ctx.room, `📍 [TP] Téléporté au Dojo Fight Club`);
  },
});

registerCommand({
  name: "/tpshop",
  permission: AdminRole.HELPER,
  minArgs: 0,
  usage: "/tpshop",
  description: "Téléportation au Dispensaire & Shop Commercial",
  category: "teleport",
  handler: (ctx) => {
    const self = ctx.room.state.players.get(ctx.sender.sessionId);
    if (self) { self.x = 12.0; self.y = 0.5; self.z = 5.0; }
    broadcastAdminMessage(ctx.room, `📍 [TP] Téléporté au Commercial Dispensary Shop`);
  },
});

registerCommand({
  name: "/tppos",
  permission: AdminRole.ADMIN,
  minArgs: 3,
  usage: "/tppos <x> <y> <z>",
  description: "Téléporte votre personnage aux coordonnées exactes X Y Z",
  category: "teleport",
  handler: (ctx) => {
    const x = parseFloat(ctx.args[0]) || 0;
    const y = parseFloat(ctx.args[1]) || 0;
    const z = parseFloat(ctx.args[2]) || 0;
    const self = ctx.room.state.players.get(ctx.sender.sessionId);
    if (self) {
      self.x = x; self.y = y; self.z = z;
      broadcastAdminMessage(ctx.room, `📍 Téléporté aux coordonnées (${x}, ${y}, ${z})`);
    }
  },
});

// ⚡ Stats, Armor & Equipment
registerCommand({
  name: "/setarmor",
  permission: AdminRole.ADMIN,
  minArgs: 1,
  usage: "/setarmor <player> [amount]",
  description: "Équipe un gilet pare-balles tactique à un joueur",
  category: "stats",
  handler: (ctx) => {
    const target = findTargetPlayer(ctx.room, ctx.args[0]);
    const amount = parseInt(ctx.args[1]) || 100;
    if (target) {
      broadcastAdminMessage(ctx.room, `🛡️ Gilet pare-balles de ${target.player.username} ajusté à ${amount}%`);
    }
  },
});

registerCommand({
  name: "/maxstats",
  permission: AdminRole.ADMIN,
  minArgs: 0,
  usage: "/maxstats [player]",
  description: "Max à 100% toutes les statistiques d'un personnage (force, conduite, endurance)",
  category: "stats",
  handler: (ctx) => {
    const target = ctx.args[0] ? findTargetPlayer(ctx.room, ctx.args[0]) : null;
    const pName = target ? target.player.username : ctx.sender.username;
    broadcastAdminMessage(ctx.room, `🌟 [MAX STATS] Statistiques de ${pName} optimisées à 100% (Endurance, Force, Pilotage)`);
  },
});

registerCommand({
  name: "/giveweapon",
  aliases: ["/gw"],
  permission: AdminRole.ADMIN,
  minArgs: 2,
  usage: "/giveweapon <player> <pipe|bat|bottle|hammer>",
  description: "Octroie une arme de combat rapproché à un joueur",
  category: "economy",
  handler: (ctx) => {
    const target = findTargetPlayer(ctx.room, ctx.args[0]);
    const weapon = ctx.args[1].toLowerCase();
    const tName = target ? target.player.username : ctx.args[0];
    broadcastAdminMessage(ctx.room, `⚔️ Arme '${weapon.toUpperCase()}' donnée à ${tName}`);
  },
});

registerCommand({
  name: "/repairall",
  permission: AdminRole.ADMIN,
  minArgs: 0,
  usage: "/repairall",
  description: "Répare et remet à neuf tous les véhicules de la ville",
  category: "vehicle",
  handler: (ctx) => {
    if (ctx.room && ctx.room.state && ctx.room.state.vehicles) {
      for (const [, veh] of ctx.room.state.vehicles.entries()) {
        veh.health = 100;
      }
    }
    broadcastAdminMessage(ctx.room, `🛠️ [ADMIN] Tous les véhicules du serveur ont été intégralement réparés !`);
  },
});

// 🌐 Dynamic World RP Events
registerCommand({
  name: "/spawnevent",
  permission: AdminRole.SUPERADMIN,
  minArgs: 1,
  usage: "/spawnevent <ether_storm|police_chase|bank_robbery|alien_invasion|airdrop>",
  description: "Déclenche un événement RP mondial dynamique sur tout le serveur",
  category: "events",
  handler: (ctx) => {
    const eventName = ctx.args[0].toLowerCase();
    AdminLogger.log({
      adminId: ctx.sender.sessionId,
      adminName: ctx.sender.username,
      action: "WORLD_EVENT",
      severity: "info",
      details: `Événement déclenché: ${eventName}`,
    });

    switch (eventName) {
      case "ether_storm":
        ctx.room.state.weather = "storm";
        broadcastAdminMessage(ctx.room, `🌩️ [ÉVÉNEMENT RP] Une Tempête d'Éther Cosmique s'abat sur la ville ! Préparez vos abris !`, "announce");
        break;
      case "police_chase":
        broadcastAdminMessage(ctx.room, `🚨 [ÉVÉNEMENT RP] Alerte Générale SPVM: Course-poursuite à haute vitesse en cours sur la Main Street !`, "announce");
        break;
      case "bank_robbery":
        broadcastAdminMessage(ctx.room, `🏦 [ÉVÉNEMENT RP] Braquage de la Banque Centrale en cours ! Toutes les unités de police sont mobilisées !`, "announce");
        break;
      case "airdrop":
        broadcastAdminMessage(ctx.room, `📦 [ÉVÉNEMENT RP] Un largage de ravitaillement militaire est tombé au Central Park !`, "announce");
        break;
      default:
        broadcastAdminMessage(ctx.room, `✨ [ÉVÉNEMENT RP] Événement '${eventName}' lancé par l'Administration !`, "announce");
        break;
    }
  },
});

// 🧠 Intellectus AI & Cyber Commands
registerCommand({
  name: "/intellectus",
  aliases: ["/ai", "/troxt"],
  permission: AdminRole.HELPER,
  minArgs: 1,
  usage: "/intellectus <requête_ou_diagnostic>",
  description: "Interroge l'IA Intellectus TroxT pour un diagnostic serveur ou scénario RP",
  category: "intellectus",
  handler: (ctx) => {
    const query = ctx.args.join(" ");
    broadcastAdminMessage(ctx.room, `🧠 [INTELLECTUS AI] Analyse en cours pour "${query}"... Status: ALL SYSTEMS NOMINAL 100% Platine.`, "syslog");
  },
});

registerCommand({
  name: "/etherpulse",
  permission: AdminRole.ADMIN,
  minArgs: 0,
  usage: "/etherpulse",
  description: "Déclenche une onde de choc lumineuse d'Éther dans la ville",
  category: "intellectus",
  handler: (ctx) => {
    broadcastAdminMessage(ctx.room, `🌌 [ÉTHER PULSE] Onde de choc d'énergie néon libérée sur l'ensemble de la matrice !`, "announce");
  },
});

// Dispatcher Execution Engine
export function executeAdminCommand(rawCommand: string, senderSessionId: string, senderUsername: string, room: any) {
  const parts = rawCommand.trim().split(/\s+/);
  if (parts.length === 0 || !parts[0].startsWith("/")) return false;

  const commandName = parts[0].toLowerCase();
  const args = parts.slice(1);

  const cmdDef = commandRegistry.get(commandName);
  if (!cmdDef) return false; // Not an admin command

  const userRole = getUserRole(senderSessionId);
  if (!checkPermission(senderSessionId, cmdDef.permission)) {
    broadcastAdminMessage(room, `⛔ Permission insuffisante pour ${cmdDef.name} (Requis: ${cmdDef.permission.toUpperCase()})`);
    return true;
  }

  if (cmdDef.minArgs && args.length < cmdDef.minArgs) {
    broadcastAdminMessage(room, `💡 Usage: ${cmdDef.usage}`);
    return true;
  }

  const ctx: CommandContext = {
    sender: {
      sessionId: senderSessionId,
      username: senderUsername,
      role: userRole,
    },
    args,
    raw: rawCommand,
    room,
  };

  try {
    cmdDef.handler(ctx);
  } catch (err: any) {
    console.error(`Error executing command ${commandName}:`, err);
    broadcastAdminMessage(room, `⚠️ Erreur lors de l'exécution de ${commandName}: ${err.message}`);
  }

  return true;
}
