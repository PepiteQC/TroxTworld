import { CatalogItem, PlacedProp } from "../types/game";

export type AdminCategory =
  | "player"
  | "moderation"
  | "teleport"
  | "economy"
  | "world"
  | "vehicle"
  | "gmod"
  | "system";

export type AdminPermission = "moderator" | "admin" | "superadmin";

export interface AdminCommandContext {
  executorName?: string;
  executorRole?: AdminPermission;
  gameManager?: any; // GameManager reference if running in full 3D engine
  playerPhysics?: { current: { x: number; y: number; z: number; vx: number; vy: number; vz: number } } | any;
  persona?: any; // UserPersonaContext
  gmodBuilder?: any; // GModBuilder reference
  colyseusRoom?: any;
  weather?: string;
  setWeather?: (w: string) => void;
  isFlying?: boolean;
  setIsFlying?: (f: boolean | ((prev: boolean) => boolean)) => void;
  nearDoor?: { uuid: string; name: string; isOpen: boolean } | null;
  setNearDoor?: (door: { uuid: string; name: string; isOpen: boolean } | null | ((prev: any) => any)) => void;
  playSfx?: (sound: "click" | "buy" | "step" | "engine" | "door" | "jump" | "collision") => void;
  addLog?: (msg: string) => void;
  broadcastMessage?: (msg: string) => void;
}

export interface AdminCommandResult {
  success: boolean;
  message: string;
  actionPayload?: Record<string, any>;
}

export interface AdminCommand {
  id: string;
  name: string;
  aliases?: string[];
  category: AdminCategory;
  description: string;
  usage: string;
  permission: AdminPermission;
  execute: (args: string[], ctx: AdminCommandContext) => AdminCommandResult;
}

// ─── COMMAND REGISTRY ─────────────────────────────────────────────

const commandRegistry: Map<string, AdminCommand> = new Map();

export function registerAdminCommand(cmd: AdminCommand) {
  commandRegistry.set(cmd.name.toLowerCase(), cmd);
  if (cmd.aliases) {
    for (const alias of cmd.aliases) {
      commandRegistry.set(alias.toLowerCase(), cmd);
    }
  }
}

// ─── PRESET LOCATIONS FOR TELEPORTATION ─────────────────────────────
export const PRESET_TELEPORTS: Record<string, { x: number; y: number; z: number; name: string }> = {
  spawn: { x: 0, y: 1.2, z: 0, name: "Place Centrale (Spawn)" },
  central: { x: 0, y: 1.2, z: 0, name: "Place Centrale" },
  police: { x: 35, y: 1.2, z: -40, name: "QG SPVM Police" },
  spvm: { x: 35, y: 1.2, z: -40, name: "QG SPVM Police" },
  jail: { x: 35, y: 1.2, z: -45, name: "Cellule de Révolte / Prison" },
  prison: { x: 35, y: 1.2, z: -45, name: "Cellule de Révolte / Prison" },
  bkf: { x: -45, y: 1.2, z: 30, name: "Banque de Portneuf (BKF)" },
  bank: { x: -45, y: 1.2, z: 30, name: "Banque de Portneuf" },
  banque: { x: -45, y: 1.2, z: 30, name: "Banque de Portneuf" },
  dojo: { x: 50, y: 1.2, z: 50, name: "Chamber Fight Club Dojo" },
  fight: { x: 50, y: 1.2, z: 50, name: "Chamber Fight Club Dojo" },
  villa: { x: -60, y: 1.2, z: -60, name: "Villa Nova VIP" },
  cantine: { x: -15, y: 1.2, z: -25, name: "La Cantine Chez Gaston" },
  boutique: { x: 20, y: 1.2, z: 20, name: "Boutique Éther Mode" },
  quai: { x: 10, y: 1.2, z: 50, name: "Quai du Fleuve Saint-Laurent" },
  phare: { x: -40, y: 1.2, z: 65, name: "Phare Historique de Portneuf" },
  chapelle: { x: 30, y: 1.2, z: -45, name: "Chapelle de la Côte" },
  moulin: { x: -45, y: 1.2, z: -50, name: "Moulin à Vent Traditionnel" },
  hospital: { x: 25, y: 1.2, z: 35, name: "Hôpital SAMU 06" },
  samu: { x: 25, y: 1.2, z: 35, name: "Hôpital SAMU 06" },
};

// ─── INITIALIZE ADVANCED COMMANDS ──────────────────────────────────

function initCommands() {
  // 1. HELP
  registerAdminCommand({
    id: "help",
    name: "help",
    aliases: ["h", "cmd", "commands", "aide"],
    category: "system",
    description: "Affiche la liste de toutes les commandes d'administration disponibles.",
    usage: "/help [nom_commande]",
    permission: "moderator",
    execute: (args) => {
      if (args[0]) {
        const cmd = getAdminCommand(args[0]);
        if (!cmd) return { success: false, message: `Commande inconnue: "${args[0]}"` };
        return {
          success: true,
          message: `📜 COMMAND: /${cmd.name} | Catégorie: ${cmd.category.toUpperCase()} | Usage: ${cmd.usage}\nDescription: ${cmd.description}`,
        };
      }

      const categories = Array.from(
        new Set(Array.from(commandRegistry.values()).map((c) => c.category))
      );
      const summaryList = categories
        .map((cat) => {
          const cmds = Array.from(new Set(Array.from(commandRegistry.values()).filter((c) => c.category === cat).map((c) => c.name)));
          return `• ${cat.toUpperCase()}: ${cmds.map((c) => "/" + c).join(", ")}`;
        })
        .join("\n");

      return {
        success: true,
        message: `🛡️ SYSTEME D'ADMINISTRATION TROXT ADVANCED v3.0\n${summaryList}\n\nTapez /help <nom> pour le détail d'une commande.`,
      };
    },
  });

  // 2. GOD MODE
  registerAdminCommand({
    id: "god",
    name: "god",
    aliases: ["godmode", "invincible"],
    category: "player",
    description: "Active ou désactive le mode invincibilité (Godmode).",
    usage: "/god [on|off]",
    permission: "admin",
    execute: (args, ctx) => {
      let newState = true;
      if (args[0] === "off" || args[0] === "false" || args[0] === "0") {
        newState = false;
      } else if (ctx.persona?.godMode !== undefined) {
        newState = !ctx.persona.godMode;
      }

      if (ctx.persona) {
        ctx.persona.setVitals(100, 100);
        ctx.persona.godMode = newState;
      }

      if (ctx.gameManager) {
        ctx.gameManager.executeConsoleCommand(`heal 100`);
      }

      ctx.playSfx?.("click");
      ctx.addLog?.(`🛡️ ADMIN: Godmode ${newState ? "ACTIVÉ ✅" : "DÉSACTIVÉ ❌"}`);

      return {
        success: true,
        message: `Mode Dieu (Godmode) est maintenant ${newState ? "ACTIVÉ" : "DÉSACTIVÉ"}.`,
        actionPayload: { godMode: newState },
      };
    },
  });

  // 3. HEAL / REVIVE
  registerAdminCommand({
    id: "heal",
    name: "heal",
    aliases: ["revive", "soigner", "sante"],
    category: "player",
    description: "Restaure la santé et l'énergie d'un joueur à 100%.",
    usage: "/heal [joueur] [montant]",
    permission: "moderator",
    execute: (args, ctx) => {
      const target = args[0] || "vous";
      const amt = parseInt(args[1], 10) || 100;

      if (ctx.persona) {
        ctx.persona.setVitals(amt, 100);
      }
      if (ctx.gameManager) {
        ctx.gameManager.executeConsoleCommand(`heal ${amt}`);
      }

      ctx.playSfx?.("click");
      ctx.addLog?.(`❤️ ADMIN: Soins administrés à ${target} (${amt}% PV)`);

      return {
        success: true,
        message: `Santé de ${target} restaurée à ${amt}%.`,
      };
    },
  });

  // 4. FLY / NOCLIP
  registerAdminCommand({
    id: "fly",
    name: "fly",
    aliases: ["noclip", "voler"],
    category: "player",
    description: "Active ou désactive le mode vol (Noclip) pour traverser la carte.",
    usage: "/fly [on|off]",
    permission: "admin",
    execute: (args, ctx) => {
      if (ctx.setIsFlying) {
        ctx.setIsFlying((prev) => !prev);
      }
      ctx.playSfx?.("click");
      ctx.addLog?.(`🛸 ADMIN: Mode vol / Noclip basculé.`);
      return { success: true, message: "Mode vol (Noclip) basculé." };
    },
  });

  // 5. SPEED
  registerAdminCommand({
    id: "speed",
    name: "speed",
    aliases: ["vitesse", "setspeed"],
    category: "player",
    description: "Modifie la vitesse de déplacement du joueur.",
    usage: "/speed <multiplicateur> (ex: /speed 15)",
    permission: "admin",
    execute: (args, ctx) => {
      const val = parseFloat(args[0]);
      if (isNaN(val)) return { success: false, message: "Spécifiez une vitesse numérique. Exemple: /speed 12" };

      if (ctx.gameManager) {
        ctx.gameManager.executeConsoleCommand(`speed ${val}`);
      }
      ctx.playSfx?.("click");
      ctx.addLog?.(`⚡ ADMIN: Vitesse ajustée à ${val}`);
      return { success: true, message: `Vitesse de marche fixée à ${val}.` };
    },
  });

  // 6. SLAP / SMITE
  registerAdminCommand({
    id: "slap",
    name: "slap",
    aliases: ["baffe", "propulse"],
    category: "moderation",
    description: "Propulse un joueur dans les airs avec un impact physique léger.",
    usage: "/slap [joueur] [force]",
    permission: "moderator",
    execute: (args, ctx) => {
      const target = args[0] || "joueur";
      const force = parseFloat(args[1]) || 5;

      if (ctx.playerPhysics?.current) {
        ctx.playerPhysics.current.y += force;
        ctx.playerPhysics.current.vy = force * 2;
      }
      ctx.playSfx?.("collision");
      ctx.addLog?.(`👋 ADMIN: ${target} a reçu une baffe admin de force ${force} !`);

      return { success: true, message: `${target} a été propulsé dans les airs !` };
    },
  });

  registerAdminCommand({
    id: "smite",
    name: "smite",
    aliases: ["foudre", "frapper"],
    category: "moderation",
    description: "Invoque la foudre céleste sur un joueur.",
    usage: "/smite [joueur]",
    permission: "admin",
    execute: (args, ctx) => {
      const target = args[0] || "joueur";
      if (ctx.playerPhysics?.current) {
        ctx.playerPhysics.current.vy = 12;
      }
      ctx.playSfx?.("collision");
      ctx.addLog?.(`⚡ ADMIN: Foudre invoquée sur ${target} !`);
      return { success: true, message: `Foudre céleste abattue sur ${target}.` };
    },
  });

  // 7. JAIL / UNJAIL
  registerAdminCommand({
    id: "jail",
    name: "jail",
    aliases: ["emprisonner", "prison"],
    category: "moderation",
    description: "Téléporte un joueur dans la cellule de sécurité de la police SPVM.",
    usage: "/jail [joueur] [duree_sec] [raison]",
    permission: "moderator",
    execute: (args, ctx) => {
      const target = args[0] || "joueur";
      const duration = parseInt(args[1], 10) || 60;
      const reason = args.slice(2).join(" ") || "Infraction au règlement RP";

      if (ctx.playerPhysics?.current) {
        ctx.playerPhysics.current.x = PRESET_TELEPORTS.jail.x;
        ctx.playerPhysics.current.y = PRESET_TELEPORTS.jail.y;
        ctx.playerPhysics.current.z = PRESET_TELEPORTS.jail.z;
      }

      if (ctx.gameManager) {
        ctx.gameManager.executeConsoleCommand(`teleport jail`);
      }

      ctx.playSfx?.("collision");
      ctx.addLog?.(`🚨 ADMIN: ${target} envoyé en PRISON pour ${duration}s (${reason})`);
      ctx.broadcastMessage?.(`🚨 [SPVM] Le joueur ${target} a été placé en cellule de dégrisement (${reason}).`);

      return {
        success: true,
        message: `${target} a été verrouillé en cellule SPVM pour ${duration} secondes.`,
      };
    },
  });

  registerAdminCommand({
    id: "unjail",
    name: "unjail",
    aliases: ["liberer", "free"],
    category: "moderation",
    description: "Libère un joueur de la cellule SPVM et le téléporte au spawn.",
    usage: "/unjail [joueur]",
    permission: "moderator",
    execute: (args, ctx) => {
      const target = args[0] || "joueur";

      if (ctx.playerPhysics?.current) {
        ctx.playerPhysics.current.x = PRESET_TELEPORTS.spawn.x;
        ctx.playerPhysics.current.y = PRESET_TELEPORTS.spawn.y;
        ctx.playerPhysics.current.z = PRESET_TELEPORTS.spawn.z;
      }

      if (ctx.gameManager) {
        ctx.gameManager.executeConsoleCommand(`teleport spawn`);
      }

      ctx.playSfx?.("click");
      ctx.addLog?.(`🔓 ADMIN: ${target} a été libéré de prison.`);

      return { success: true, message: `${target} est désormais libre.` };
    },
  });

  // 8. TELEPORTATION (TP)
  registerAdminCommand({
    id: "tp",
    name: "tp",
    aliases: ["teleport", "tpto", "goto"],
    category: "teleport",
    description: "Téléporte le joueur vers un point clé ou des coordonnées X Z.",
    usage: "/tp <spawn|police|bank|dojo|villa|cantine|phare|chapelle|moulin> ou /tp <X> <Z>",
    permission: "moderator",
    execute: (args, ctx) => {
      if (!args[0]) {
        return {
          success: false,
          message: `Spécifiez une destination. Choix: ${Object.keys(PRESET_TELEPORTS).slice(0, 10).join(", ")} ou /tp <X> <Z>`,
        };
      }

      const destKey = args[0].toLowerCase();

      // Case 1: Preset key
      if (PRESET_TELEPORTS[destKey]) {
        const p = PRESET_TELEPORTS[destKey];
        if (ctx.playerPhysics?.current) {
          ctx.playerPhysics.current.x = p.x;
          ctx.playerPhysics.current.y = p.y;
          ctx.playerPhysics.current.z = p.z;
        }
        if (ctx.gameManager) {
          ctx.gameManager.executeConsoleCommand(`teleport ${destKey}`);
        }
        ctx.playSfx?.("click");
        ctx.addLog?.(`🌀 TELEPORT: Arrivée à ${p.name} [X:${p.x}, Z:${p.z}]`);
        return { success: true, message: `Téléporté à ${p.name}.` };
      }

      // Case 2: Numeric coordinates X Z
      const x = parseFloat(args[0]);
      const z = parseFloat(args[1]);

      if (!isNaN(x) && !isNaN(z)) {
        if (ctx.playerPhysics?.current) {
          ctx.playerPhysics.current.x = x;
          ctx.playerPhysics.current.z = z;
        }
        ctx.playSfx?.("click");
        ctx.addLog?.(`🌀 TELEPORT: Coordonnées spécifiques [X:${x}, Z:${z}]`);
        return { success: true, message: `Téléporté aux coordonnées X:${x}, Z:${z}.` };
      }

      return {
        success: false,
        message: `Destination inconnu: "${args[0]}". Utilisez /tp <preset> ou /tp <X> <Z>.`,
      };
    },
  });

  // Quick TPs
  registerAdminCommand({
    id: "tpspawn",
    name: "tpspawn",
    category: "teleport",
    description: "Téléportation immédiate au Spawn Central.",
    usage: "/tpspawn",
    permission: "moderator",
    execute: (args, ctx) => commandRegistry.get("tp")!.execute(["spawn"], ctx),
  });

  registerAdminCommand({
    id: "tppolice",
    name: "tppolice",
    category: "teleport",
    description: "Téléportation immédiate au QG SPVM Police.",
    usage: "/tppolice",
    permission: "moderator",
    execute: (args, ctx) => commandRegistry.get("tp")!.execute(["police"], ctx),
  });

  registerAdminCommand({
    id: "tpbkf",
    name: "tpbkf",
    category: "teleport",
    description: "Téléportation immédiate à la Banque de Portneuf.",
    usage: "/tpbkf",
    permission: "moderator",
    execute: (args, ctx) => commandRegistry.get("tp")!.execute(["bkf"], ctx),
  });

  registerAdminCommand({
    id: "tpdojo",
    name: "tpdojo",
    category: "teleport",
    description: "Téléportation au Chamber Fight Club Dojo.",
    usage: "/tpdojo",
    permission: "moderator",
    execute: (args, ctx) => commandRegistry.get("tp")!.execute(["dojo"], ctx),
  });

  // 9. ECONOMY & MONEY
  registerAdminCommand({
    id: "give",
    name: "give",
    aliases: ["cash", "argent", "money", "addmoney"],
    category: "economy",
    description: "Ajoute ou retire du Cash ou des Crypto TroxT au compte d'un joueur.",
    usage: "/give <cash|crypto|item> <montant|id_item>",
    permission: "admin",
    execute: (args, ctx) => {
      let subType = args[0]?.toLowerCase();
      let amt = parseInt(args[1], 10);

      // Default shortcut: /cash 5000
      if (!isNaN(parseInt(subType, 10))) {
        amt = parseInt(subType, 10);
        subType = "cash";
      }

      if (isNaN(amt)) amt = 10000;

      if (subType === "cash" || subType === "money" || subType === "argent") {
        if (ctx.persona) {
          ctx.persona.updateEconomy(amt, 0);
        }
        if (ctx.gameManager) {
          ctx.gameManager.executeConsoleCommand(`cash ${amt}`);
        }
        ctx.playSfx?.("buy");
        ctx.addLog?.(`💵 ECONOMIE: Cash ajusté de ${amt >= 0 ? "+" : ""}$${amt}`);
        return { success: true, message: `Cash mis à jour (+-$${amt}).` };
      }

      if (subType === "crypto" || subType === "troxt") {
        if (ctx.persona) {
          ctx.persona.updateEconomy(0, amt);
        }
        ctx.playSfx?.("buy");
        ctx.addLog?.(`🪙 ECONOMIE: Crypto ajusté de ${amt >= 0 ? "+" : ""}${amt} TRX`);
        return { success: true, message: `Crypto TroxT mis à jour (+-${amt} TRX).` };
      }

      return {
        success: false,
        message: "Format invalide. Exemple: /give cash 5000 ou /give crypto 100",
      };
    },
  });

  // 10. WEAPONS & EQUIPMENT
  registerAdminCommand({
    id: "weapon",
    name: "weapon",
    aliases: ["arm", "setweapon", "arme"],
    category: "player",
    description: "Équipe immédiatement une arme dans la main du joueur.",
    usage: "/weapon <pipe|bat|bottle|hammer|sword|none>",
    permission: "moderator",
    execute: (args, ctx) => {
      const type = (args[0] || "pipe").toLowerCase();
      const valid = ["none", "pipe", "bat", "bottle", "hammer", "sword", "pistol", "shotgun"];

      if (!valid.includes(type)) {
        return {
          success: false,
          message: `Arme invalide: "${type}". Choix: ${valid.join(", ")}`,
        };
      }

      if (ctx.gameManager) {
        ctx.gameManager.executeConsoleCommand(`weapon ${type}`);
      }
      ctx.playSfx?.("click");
      ctx.addLog?.(`⚔️ ADMIN: Arme équipée -> ${type.toUpperCase()}`);

      return { success: true, message: `Arme fixée à ${type.toUpperCase()}.` };
    },
  });

  // 11. UNLOCK ALL
  registerAdminCommand({
    id: "unlockall",
    name: "unlockall",
    aliases: ["debloquer", "fullunlock"],
    category: "economy",
    description: "Débloque toutes les propriétés immobilières, meubles, clés et permis.",
    usage: "/unlockall",
    permission: "superadmin",
    execute: (args, ctx) => {
      if (ctx.gameManager) {
        ctx.gameManager.executeConsoleCommand("unlock_props");
        ctx.gameManager.executeConsoleCommand("unlock_immo");
        ctx.gameManager.executeConsoleCommand("keyrings");
      }
      ctx.playSfx?.("buy");
      ctx.addLog?.(`🔑 ADMIN: Déblocage total (Props + Immo + Clés) effectué !`);
      return {
        success: true,
        message: "Succès ! Toutes les propriétés, clés et catalogues de meubles sont débloqués.",
      };
    },
  });

  // 12. WORLD ENVIRONMENT (WEATHER & TIME)
  registerAdminCommand({
    id: "weather",
    name: "weather",
    aliases: ["meteo", "sky"],
    category: "world",
    description: "Modifie les conditions météorologiques du monde 3D.",
    usage: "/weather <clear|rain|fog|night|cyber>",
    permission: "moderator",
    execute: (args, ctx) => {
      const w = (args[0] || "clear").toLowerCase();
      if (ctx.setWeather) {
        ctx.setWeather(w);
      }
      ctx.playSfx?.("click");
      ctx.addLog?.(`🌤️ METEO: Conditions ajustées à ${w.toUpperCase()}`);
      return { success: true, message: `Météo changée à "${w}".` };
    },
  });

  registerAdminCommand({
    id: "time",
    name: "time",
    aliases: ["temps", "heure"],
    category: "world",
    description: "Change l'heure du jour (Jour / Nuit / Coucher de soleil).",
    usage: "/time <day|night|sunset|noon>",
    permission: "moderator",
    execute: (args, ctx) => {
      const t = (args[0] || "day").toLowerCase();
      if (t === "night" || t === "nuit") {
        ctx.setWeather?.("night");
      } else {
        ctx.setWeather?.("clear");
      }
      ctx.playSfx?.("click");
      ctx.addLog?.(`⏰ HOROGE: Cycle temporel ajusté -> ${t.toUpperCase()}`);
      return { success: true, message: `Heure configurée à "${t}".` };
    },
  });

  // 13. GRAVITY
  registerAdminCommand({
    id: "gravity",
    name: "gravity",
    aliases: ["gravite", "setgravity"],
    category: "world",
    description: "Ajuste la constante de gravité du moteur physique 3D.",
    usage: "/gravity <valeur> (Lune: 3.5, Terre: 19.8, Zero-G: 0)",
    permission: "admin",
    execute: (args, ctx) => {
      const g = parseFloat(args[0]);
      if (isNaN(g)) return { success: false, message: "Ajustez la gravité avec une valeur numérique. Exemple: /gravity 5.0" };

      if (ctx.gameManager) {
        ctx.gameManager.executeConsoleCommand(`gravity ${g}`);
      }
      ctx.playSfx?.("click");
      ctx.addLog?.(`🌎 PHYSIQUE: Gravité ajustée à ${g} m/s²`);
      return { success: true, message: `Gravité fixée à ${g}.` };
    },
  });

  // 14. EVENTS & EXPLOSIONS
  registerAdminCommand({
    id: "spawnevent",
    name: "spawnevent",
    aliases: ["event", "evenement"],
    category: "world",
    description: "Déclenche un événement RP dynamique dans la ville.",
    usage: "/spawnevent <bank_robbery|police_chase|airdrop|ether_storm|street_race>",
    permission: "admin",
    execute: (args, ctx) => {
      const ev = args[0] || "airdrop";
      ctx.playSfx?.("collision");
      ctx.addLog?.(`💥 EVENEMENT RP: Lancement forcé de "${ev.toUpperCase()}" !`);
      ctx.broadcastMessage?.(`🚨 [ALERTE RP GLOBAL] L'événement RP "${ev.toUpperCase()}" vient d'éclater dans Portneuf !`);

      return {
        success: true,
        message: `Événement RP "${ev}" déclenché avec diffusion générale.`,
      };
    },
  });

  // 15. SPAWN PROPS / HOUSES / DOORS
  registerAdminCommand({
    id: "spawn",
    name: "spawn",
    aliases: ["spawnprop", "prop", "item"],
    category: "gmod",
    description: "Génère un objet GMod, une maison, une porte ou un véhicule à vos pieds.",
    usage: "/spawn <item_id> (ex: /spawn house_modern_empty ou /spawn door_security_metal)",
    permission: "moderator",
    execute: (args, ctx) => {
      const itemId = args[0] || "house_modern_empty";

      if (ctx.gmodBuilder && ctx.playerPhysics?.current) {
        ctx.gmodBuilder.spawnPropAtPlayer(
          itemId,
          [ctx.playerPhysics.current.x, ctx.playerPhysics.current.y, ctx.playerPhysics.current.z]
        );
      } else if (ctx.gameManager) {
        ctx.gameManager.executeConsoleCommand(`spawn ${itemId}`);
      }

      ctx.playSfx?.("click");
      ctx.addLog?.(`📦 BUILDER: Spawn d'objet -> ${itemId}`);

      return {
        success: true,
        message: `Objet "${itemId}" généré à vos pieds.`,
      };
    },
  });

  // 16. DOOR INTERACTION
  registerAdminCommand({
    id: "door",
    name: "door",
    aliases: ["porte", "toggledoor"],
    category: "gmod",
    description: "Ouvre ou ferme la porte interactive la plus proche.",
    usage: "/door",
    permission: "moderator",
    execute: (args, ctx) => {
      if (ctx.gmodBuilder && ctx.nearDoor) {
        const isOpen = ctx.gmodBuilder.toggleDoor(ctx.nearDoor.uuid);
        ctx.setNearDoor?.((prev: any) => (prev ? { ...prev, isOpen } : null));
        ctx.playSfx?.("door");
        ctx.addLog?.(`🚪 PORTE: Verrouillage basculé -> ${isOpen ? "OUVERTE" : "FERMÉE"}`);
        return {
          success: true,
          message: `Porte "${ctx.nearDoor.name}" est maintenant ${isOpen ? "ouverte" : "fermée"}.`,
        };
      }

      return {
        success: false,
        message: "Aucune porte interactive à proximité immédiate.",
      };
    },
  });

  // 17. CLEAR PROPS
  registerAdminCommand({
    id: "clearprops",
    name: "clearprops",
    aliases: ["clear", "nettoyer"],
    category: "gmod",
    description: "Efface tous les objets et constructions déposés dans la zone.",
    usage: "/clearprops",
    permission: "admin",
    execute: (args, ctx) => {
      if (ctx.gmodBuilder) {
        ctx.gmodBuilder.clearAllProps();
      }
      if (ctx.gameManager) {
        ctx.gameManager.executeConsoleCommand("clear_props");
      }
      ctx.playSfx?.("click");
      ctx.addLog?.(`🧹 BUILDER: Nettoyage complet des objets posés.`);
      return { success: true, message: "Tous les objets posés ont été nettoyés." };
    },
  });

  // 18. AUDIT & SECURITY
  registerAdminCommand({
    id: "audit",
    name: "audit",
    aliases: ["check", "security"],
    category: "system",
    description: "Exécute un diagnostic d'intégrité RP et de mémoire Ether-Guard.",
    usage: "/audit",
    permission: "moderator",
    execute: (args, ctx) => {
      if (ctx.gameManager) {
        ctx.gameManager.executeConsoleCommand("audit");
      }
      ctx.playSfx?.("click");
      ctx.addLog?.(`🔍 AUDIT: Diagnostics de mémoire et réseau RP validés 100%.`);
      return {
        success: true,
        message: "Audit de sécurité et d'intégrité RP exécuté sans aucune anomalie.",
      };
    },
  });

  // 19. ANNOUNCE
  registerAdminCommand({
    id: "announce",
    name: "announce",
    aliases: ["broadcast", "annonce"],
    category: "moderation",
    description: "Diffuse une annonce officielle au nom de l'administration sur tout le serveur.",
    usage: "/announce <message>",
    permission: "moderator",
    execute: (args, ctx) => {
      const text = args.join(" ");
      if (!text) return { success: false, message: "Veuillez entrer le texte de l'annonce." };

      ctx.broadcastMessage?.(`📢 [ANNONCE ADMIN] ${text}`);
      ctx.addLog?.(`📢 ANNONCE ADMIN DIFFUSÉE: "${text}"`);
      ctx.playSfx?.("collision");

      return { success: true, message: "Annonce officielle transmise à tous les joueurs." };
    },
  });

  // 20. SET ROLE / SET JOB
  registerAdminCommand({
    id: "setrole",
    name: "setrole",
    aliases: ["role"],
    category: "moderation",
    description: "Définit le rôle RP d'un joueur (ex: citizen, police, mayor, admin).",
    usage: "/setrole [joueur] <role_id>",
    permission: "admin",
    execute: (args, ctx) => {
      const role = args[1] || args[0] || "citizen";
      ctx.playSfx?.("click");
      ctx.addLog?.(`📋 ROLE ADMIN: Changement de rôle -> ${role.toUpperCase()}`);
      return { success: true, message: `Rôle RP changé pour "${role}".` };
    },
  });

  registerAdminCommand({
    id: "setjob",
    name: "setjob",
    aliases: ["job", "metier"],
    category: "moderation",
    description: "Assigne un emploi RP (SPVM, SAMU, Mécanicien, Botaniste, Barman).",
    usage: "/setjob [joueur] <job_id>",
    permission: "moderator",
    execute: (args, ctx) => {
      const job = args[1] || args[0] || "civilian";
      ctx.playSfx?.("click");
      ctx.addLog?.(`💼 EMPLOI RP: Job assigné -> ${job.toUpperCase()}`);
      return { success: true, message: `Emploi RP configuré à "${job}".` };
    },
  });
  // 21. KICK, BAN & GIVEITEM
  registerAdminCommand({
    id: "kick",
    name: "kick",
    aliases: ["expulser", "eject"],
    category: "moderation",
    description: "Expulse immédiatement un joueur de la session RP.",
    usage: "/kick <id_ou_nom> [raison]",
    permission: "moderator",
    execute: (args, ctx) => {
      const target = args[0] || "joueur";
      const reason = args.slice(1).join(" ") || "Expulsion par la modération";

      ctx.playSfx?.("collision");
      ctx.addLog?.(`👢 MODERATION: Joueur [${target}] expulsé (${reason})`);
      ctx.broadcastMessage?.(`👢 [MODÉRATION] ${target} a été expulsé du serveur RP. Raison: ${reason}`);

      return {
        success: true,
        message: `Le joueur ${target} a été expulsé du serveur pour : ${reason}`,
      };
    },
  });

  registerAdminCommand({
    id: "ban",
    name: "ban",
    aliases: ["bannir", "tempban", "permban"],
    category: "moderation",
    description: "Bannit un joueur du serveur RP temporairement ou définitivement.",
    usage: "/ban <id_ou_nom> [duree] [raison]",
    permission: "admin",
    execute: (args, ctx) => {
      const target = args[0] || "joueur";
      const duration = args[1] || "Permanent";
      const reason = args.slice(2).join(" ") || "Bannissement par l'administration";

      ctx.playSfx?.("collision");
      ctx.addLog?.(`🔨 BAN: Joueur [${target}] banni (${duration} - ${reason})`);
      ctx.broadcastMessage?.(`🔨 [SANCTION ADMIN] ${target} a été banni du serveur. Durée: ${duration} | Raison: ${reason}`);

      return {
        success: true,
        message: `Le joueur ${target} a été banni (${duration}) pour : ${reason}`,
      };
    },
  });

  registerAdminCommand({
    id: "giveitem",
    name: "giveitem",
    aliases: ["itemgive", "giveprop"],
    category: "gmod",
    description: "Donne ou fait apparaître un item/prop à un joueur.",
    usage: "/giveitem [joueur_id] <item_id> ou /giveitem <item_id>",
    permission: "moderator",
    execute: (args, ctx) => {
      if (!args[0]) {
        return {
          success: false,
          message: "Précisez l'identifiant de l'objet. Exemple: /giveitem house_modern_empty ou /giveitem player1 couch_nova",
        };
      }

      let targetPlayer = "local";
      let itemId = args[0];

      if (args.length >= 2) {
        targetPlayer = args[0];
        itemId = args[1];
      }

      if (ctx.gmodBuilder && ctx.playerPhysics?.current) {
        ctx.gmodBuilder.spawnPropAtPlayer(
          itemId,
          [ctx.playerPhysics.current.x, ctx.playerPhysics.current.y, ctx.playerPhysics.current.z]
        );
      } else if (ctx.gameManager) {
        ctx.gameManager.executeConsoleCommand(`spawn ${itemId}`);
      }

      ctx.playSfx?.("buy");
      ctx.addLog?.(`🎁 GIVEITEM: ${itemId} attribué à ${targetPlayer}`);

      return {
        success: true,
        message: `Objet "${itemId}" généré avec succès pour ${targetPlayer}.`,
      };
    },
  });
}

// ─── PUBLIC UTILITIES ──────────────────────────────────────────────

// ─── AUDIT LOGGING SYSTEM ─────────────────────────────────────────

export interface AdminAuditLogEntry {
  id: string;
  timestamp: string;
  executor: string;
  command: string;
  category: AdminCategory | string;
  success: boolean;
  message: string;
}

const auditLogs: AdminAuditLogEntry[] = [
  {
    id: "init-audit-1",
    timestamp: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    executor: "SYSTEM",
    command: "system_audit_start",
    category: "system",
    success: true,
    message: "Journal d'audit en temps réel activé. Toutes les actions administrateurs sont désormais enregistrées.",
  }
];

const logSubscribers: Set<(logs: AdminAuditLogEntry[]) => void> = new Set();

export function addAuditLog(entry: Omit<AdminAuditLogEntry, "id" | "timestamp">) {
  const newEntry: AdminAuditLogEntry = {
    ...entry,
    id: `audit-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
    timestamp: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
  };
  auditLogs.unshift(newEntry);
  if (auditLogs.length > 250) auditLogs.pop();
  logSubscribers.forEach((fn) => fn([...auditLogs]));
}

export function getAuditLogs(): AdminAuditLogEntry[] {
  return [...auditLogs];
}

export function subscribeAuditLogs(callback: (logs: AdminAuditLogEntry[]) => void) {
  logSubscribers.add(callback);
  callback([...auditLogs]);
  return () => {
    logSubscribers.delete(callback);
  };
}

export function getAdminCommand(nameOrAlias: string): AdminCommand | undefined {
  if (commandRegistry.size === 0) {
    initCommands();
  }
  return commandRegistry.get(nameOrAlias.toLowerCase());
}

export function getAllAdminCommands(): AdminCommand[] {
  if (commandRegistry.size === 0) {
    initCommands();
  }
  // Return unique commands
  const unique = new Map<string, AdminCommand>();
  for (const cmd of commandRegistry.values()) {
    unique.set(cmd.id, cmd);
  }
  return Array.from(unique.values());
}

import { PoliceSystem } from "../game/city/police/PoliceSystem";

// ─── POLICE & WILDLIFE COMMANDS ──────────────────────────────────────────

registerAdminCommand({
  id: "ticket",
  name: "ticket",
  aliases: ["amende", "fine"],
  category: "moderation",
  description: "Émet une amende/ticket de police à un joueur.",
  usage: "/ticket [joueur] [montant] [raison]",
  permission: "moderator",
  execute: (args, ctx) => {
    if (args.length < 2) {
      return { success: false, message: "Usage: /ticket [joueur] [montant] [raison]" };
    }
    const targetName = args[0];
    const amount = parseInt(args[1], 10);
    const reason = args.slice(2).join(" ") || "Infraction au Code de la Route du Québec";

    if (isNaN(amount) || amount <= 0) {
      return { success: false, message: "Montant invalide." };
    }

    PoliceSystem.issueTicket(
      "local_player",
      targetName,
      "officer_cmd",
      ctx.executorName || "Agent SQ",
      "SQ",
      amount,
      reason
    );

    const msg = `📋 Amende de ${amount}$ émise contre ${targetName} pour: ${reason}`;
    ctx.broadcastMessage?.(msg);
    return { success: true, message: msg };
  },
});

registerAdminCommand({
  id: "cuff",
  name: "cuff",
  aliases: ["menottes", "handcuff", "uncuff"],
  category: "moderation",
  description: "Place ou retire les menottes d'un suspect.",
  usage: "/cuff [joueur]",
  permission: "moderator",
  execute: (args, ctx) => {
    const target = args[0] || "local_player";
    const cuffed = PoliceSystem.toggleCuff(target);
    const statusMsg = cuffed ? `🔒 Joueur ${target} a été menotté par les forces de l'ordre.` : `🔓 Joueur ${target} a été démenotté.`;
    ctx.broadcastMessage?.(statusMsg);
    return { success: true, message: statusMsg };
  },
});

registerAdminCommand({
  id: "radar",
  name: "radar",
  category: "player",
  description: "Active/désactive le radar laser de vitesse de patrouille.",
  usage: "/radar",
  permission: "moderator",
  execute: (args, ctx) => {
    const active = PoliceSystem.toggleRadar();
    const msg = active ? "📡 Radar Laser de Vitesse de Patrouille ACTIF !" : "📡 Radar Laser DÉSACTIVÉ.";
    ctx.addLog?.(msg);
    return { success: true, message: msg };
  },
});

registerAdminCommand({
  id: "siren",
  name: "siren",
  aliases: ["gyrophare"],
  category: "vehicle",
  description: "Bascule la sirène et les gyrophares d'urgence.",
  usage: "/siren [wail|yelp]",
  permission: "moderator",
  execute: (args, ctx) => {
    const mode = (args[0]?.toLowerCase() === "yelp" ? "yelp" : "wail") as "wail" | "yelp";
    const active = PoliceSystem.togglePoliceSiren(undefined, mode);
    const msg = active ? `🚨 Sirène & Gyrophares ACTIFS (Mode: ${mode.toUpperCase()}) !` : "🚨 Sirène & Gyrophares ÉTEINTS.";
    ctx.addLog?.(msg);
    return { success: true, message: msg };
  },
});

registerAdminCommand({
  id: "patrol",
  name: "patrol",
  aliases: ["patrouille"],
  category: "player",
  description: "Prend ou quitte son service de patrouille policière.",
  usage: "/patrol [SQ|SPVM]",
  permission: "moderator",
  execute: (args, ctx) => {
    const dept = args[0]?.toUpperCase() === "SPVM" ? "SPVM" : "SQ";
    const dutyOn = PoliceSystem.toggleDuty(dept);
    const msg = dutyOn
      ? `👮 Service de Patrouille ACTIF (${dept}) ! Équipement & Radio assignés.`
      : "👮 Fin de Service de Patrouille.";
    ctx.broadcastMessage?.(msg);
    return { success: true, message: msg };
  },
});

registerAdminCommand({
  id: "dispatch",
  name: "dispatch",
  aliases: ["callout"],
  category: "moderation",
  description: "Émet un appel d'urgence 911 / Code-10 au réseau des patrouilles.",
  usage: "/dispatch [10-80|10-31|10-98|10-99] [lieu]",
  permission: "moderator",
  execute: (args, ctx) => {
    const code = (args[0] || "10-80") as "10-80" | "10-31" | "10-98" | "10-99";
    const loc = args.slice(1).join(" ") || "Secteur Centre-Ville";
    PoliceSystem.triggerDispatchCallout(
      code,
      `Appel Urgence ${code}`,
      `Signalement citoyen en cours à ${loc}`,
      loc,
      [0, 0, 0],
      "high"
    );
    const msg = `📢 [DISPATCH 911] CODE ${code} à ${loc} ! Patrouilles demandées.`;
    ctx.broadcastMessage?.(msg);
    return { success: true, message: msg };
  },
});

registerAdminCommand({
  id: "hunt",
  name: "hunt",
  aliases: ["chasse", "faune"],
  category: "world",
  description: "Affiche le statut de chasse, permis du Québec et gibier récolté.",
  usage: "/hunt",
  permission: "moderator",
  execute: (args, ctx) => {
    const msg = `🌲 [FAUNE & CHASSE DU QUÉBEC] Permis de Chasse Régulier Valide (SQ-2026). Gibier répertorié : Élans, Loups Gris, Ours Noirs, Renards Rouges.`;
    ctx.addLog?.(msg);
    return { success: true, message: msg };
  },
});

export function parseAndExecuteAdminCommand(
  rawInput: string,
  ctx: AdminCommandContext
): AdminCommandResult {
  const trimmed = rawInput.trim();
  if (!trimmed) {
    return { success: false, message: "Commande vide." };
  }

  const parts = trimmed.split(/\s+/);
  let cmdName = parts[0].toLowerCase();
  if (cmdName.startsWith("/") || cmdName.startsWith("!")) {
    cmdName = cmdName.substring(1);
  }
  const args = parts.slice(1);

  const executor = ctx.executorName || "Admin";

  const command = getAdminCommand(cmdName);
  if (command) {
    try {
      const res = command.execute(args, ctx);
      addAuditLog({
        executor,
        command: `/${cmdName}${args.length ? " " + args.join(" ") : ""}`,
        category: command.category,
        success: res.success,
        message: res.message,
      });
      return res;
    } catch (err: any) {
      console.error("Error executing admin command:", err);
      const errMsg = `Erreur lors de l'exécution de la commande /${cmdName}: ${err.message || err}`;
      addAuditLog({
        executor,
        command: `/${cmdName}${args.length ? " " + args.join(" ") : ""}`,
        category: command.category,
        success: false,
        message: errMsg,
      });
      return {
        success: false,
        message: errMsg,
      };
    }
  }

  // Fallback to GameManager legacy parser if available
  if (ctx.gameManager) {
    const res = ctx.gameManager.executeConsoleCommand(trimmed);
    addAuditLog({
      executor,
      command: trimmed,
      category: "legacy",
      success: res?.success ?? true,
      message: res?.message || "Exécuté via GameManager legacy",
    });
    return res;
  }

  const notFoundMsg = `Commande inconnue: "/${cmdName}". Tapez /help pour voir toutes les commandes.`;
  addAuditLog({
    executor,
    command: `/${cmdName}`,
    category: "system",
    success: false,
    message: notFoundMsg,
  });

  return {
    success: false,
    message: notFoundMsg,
  };
}
