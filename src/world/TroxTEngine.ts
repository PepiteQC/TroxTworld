// ═══════════════════════════════════════════════════════════════════════════
//  TROXT ENGINE — CERVEAU NEURAL OFFICIEL (CONNECTÉ AU SERVEUR)
//  src/systems/TroxTEngine.ts
//  Commandes locales + Serveur Intellectus + Colyseus + Persistance SQLite
// ═══════════════════════════════════════════════════════════════════════════

import {
  toggleFly,
  toggleGod,
  toggleNoclip,
  toggleBuild,
  toggleLight,
  setActiveScene,
  setDoorLocked,
  setGlobal,
  addPlaced,
  clearAllPlaced,
  addChat,
  useGameState,
  type ActiveScene,
} from '../store';
import { intellectusClient } from '../intellectus/IntellectusClient';
import type { PlayerContext } from '../world/InteractionSystem';

// ── Types ─────────────────────────────────────────────────────
export interface TroxTMessage {
  id: string;
  role: 'user' | 'troxt' | 'system' | 'thought' | 'server';
  text: string;
  timestamp: number;
  senderId?: string; // Pour les messages multi-joueurs
}

export interface SkillResult {
  ok: boolean;
  summary: string;
  detail?: unknown;
  serverSync?: boolean; // Si l'action doit être envoyée au serveur
}

export type SkillHandler = (
  params: Record<string, unknown>,
  context: { playerId: string; isAdmin: boolean }
) => SkillResult | Promise<SkillResult>;

interface Skill {
  description: string;
  aliases: string[];
  handler: SkillHandler;
  adminOnly?: boolean; // Nécessite des droits admin
  requiresGodMode?: boolean; // Nécessite le mode Dieu
}

// ── Utility ───────────────────────────────────────────────────
const uid = () => Math.random().toString(36).slice(2, 10).toUpperCase();
const snap = () => useGameState.getState();

// ── Contexte du Joueur (à récupérer depuis Colyseus) ────────────
let currentPlayerId: string | null = null;
let currentPlayerContext: PlayerContext | null = null;

export function setPlayerContext(id: string, ctx: PlayerContext) {
  currentPlayerId = id;
  currentPlayerContext = ctx;
}

// ── Skill Registry (Local + Server) ──────────────────────────────
const SKILLS: Record<string, Skill> = {
  // ── COMMANDES LOCALES (Client-only) ────────────────────────────
  get_world_state: {
    description: 'État du monde (scène, météo, heure, mode)',
    aliases: ['état', 'etat', 'world', 'monde', 'status', 'info', 'statut'],
    handler: () => {
      const s = snap();
      return {
        ok: true,
        summary:
          `🌍 Scène: ${s.activeScene} | 🕐 ${String(s.timeOfDay).padStart(2, '0')}h | ` +
          `🌤 ${s.weather} | ✈️ Vol: ${s.flyMode ? 'ON' : 'OFF'} | 🛡 God: ${s.isGodMode ? 'ON' : 'OFF'} | ` +
          `🔨 Build: ${s.buildMode ? 'ON' : 'OFF'} | 📦 Objets: ${s.placedObjects.length}`,
      };
    },
  },

  fly: {
    description: 'Activer/désactiver le mode vol',
    aliases: ['fly', 'vol', 'voler'],
    handler: () => {
      const was = snap().flyMode;
      toggleFly();
      return {
        ok: true,
        summary: was ? '✈️ Vol désactivé.' : '✈️ Vol activé ! WASD pour voler.',
        serverSync: false, // Action locale uniquement
      };
    },
  },

  god: {
    description: 'Activer/désactiver le god mode',
    aliases: ['god', 'dieu', 'invincible'],
    handler: (_, ctx) => {
      if (!ctx.isAdmin && !ctx.requiresGodMode) {
        return { ok: false, summary: '❌ Permission refusée : nécessite des droits admin.' };
      }
      const was = snap().isGodMode;
      toggleGod();
      return {
        ok: true,
        summary: was ? '🛡 God mode désactivé.' : '🛡 God mode activé. Tu es invincible.',
        serverSync: true,
      };
    },
    adminOnly: true,
  },

  noclip: {
    description: 'Traverser les murs (noclip)',
    aliases: ['noclip', 'clip', 'traverser', 'ghost'],
    handler: (_, ctx) => {
      if (!ctx.isAdmin) {
        return { ok: false, summary: '❌ Permission refusée : nécessite des droits admin.' };
      }
      const was = snap().noclipMode;
      toggleNoclip();
      return {
        ok: true,
        summary: was ? '👻 Noclip OFF.' : '👻 Noclip ON — traverse tout !',
        serverSync: false,
      };
    },
    adminOnly: true,
  },

  build: {
    description: 'Ouvrir/fermer le builder',
    aliases: ['build', 'builder', 'construire', 'bâtir'],
    handler: () => {
      const was = snap().buildMode;
      toggleBuild();
      return {
        ok: true,
        summary: was ? '🔨 Builder fermé.' : '🔨 Builder ouvert — appuie B pour toggle.',
        serverSync: false,
      };
    },
  },

  scene: {
    description: 'Changer de scène',
    aliases: ['scene', 'scène', 'aller', 'go', 'goto'],
    handler: (params) => {
      const scenes: ActiveScene[] = ['world', 'room', 'corridor', 'hotel'];
      const name = String(params.scene || params.arg || '').toLowerCase();
      const target = scenes.find((s) => name.includes(s));
      if (!target) {
        return {
          ok: false,
          summary: `❌ Scène inconnue. Choix: ${scenes.join(', ')}`,
        };
      }
      setActiveScene(target);
      const labels: Record<ActiveScene, string> = {
        world: '🌍 Monde',
        room: '🛏 Chambre 4201',
        corridor: '🚪 Corridor',
        hotel: '🏨 Hôtel',
      };
      return {
        ok: true,
        summary: `🚀 Téléportation → ${labels[target]}`,
        serverSync: true, // Le serveur doit valider le téléport
      };
    },
  },

  weather: {
    description: 'Changer la météo (Admin)',
    aliases: ['weather', 'météo', 'meteo', 'pluie', 'neige', 'soleil', 'brouillard'],
    handler: (params, ctx) => {
      if (!ctx.isAdmin) {
        return { ok: false, summary: '❌ Permission refusée : nécessite des droits admin.' };
      }
      const map: Record<string, string> = {
        clear: 'clear',
        clair: 'clear',
        soleil: 'clear',
        beau: 'clear',
        rain: 'rain',
        pluie: 'rain',
        pluvieux: 'rain',
        snow: 'snow',
        neige: 'snow',
        neigeux: 'snow',
        fog: 'fog',
        brouillard: 'fog',
        brume: 'fog',
      };
      const arg = String(params.arg || params.weather || '').toLowerCase();
      const found = Object.entries(map).find(([k]) => arg.includes(k));
      if (!found) {
        return { ok: false, summary: '❌ Météo: clear | rain | snow | fog' };
      }
      setGlobal({ weather: found[1] as any });
      const icons: Record<string, string> = {
        clear: '☀️',
        rain: '🌧',
        snow: '❄️',
        fog: '🌫',
      };
      return {
        ok: true,
        summary: `${icons[found[1]]} Météo → ${found[1]}`,
        serverSync: true,
      };
    },
    adminOnly: true,
  },

  time: {
    description: 'Changer l\'heure (Admin)',
    aliases: ['time', 'heure', 'jour', 'nuit'],
    handler: (params, ctx) => {
      if (!ctx.isAdmin) {
        return { ok: false, summary: '❌ Permission refusée : nécessite des droits admin.' };
      }
      let h = parseInt(String(params.arg || params.hour || params.time || ''), 10);
      const arg = String(params.raw || '').toLowerCase();
      if (arg.includes('jour') || arg.includes('day') || arg.includes('midi')) h = 12;
      if (arg.includes('nuit') || arg.includes('night') || arg.includes('soir')) h = 22;
      if (arg.includes('matin') || arg.includes('morning') || arg.includes('aube')) h = 6;
      if (isNaN(h) || h < 0 || h > 23) {
        return { ok: false, summary: '❌ Heure: /time <0-23>' };
      }
      setGlobal({ timeOfDay: h });
      const period =
        h < 6 ? '🌙' : h < 12 ? '🌅' : h < 18 ? '☀️' : h < 21 ? '🌇' : '🌃';
      return {
        ok: true,
        summary: `${period} Heure → ${String(h).padStart(2, '0')}:00`,
        serverSync: true,
      };
    },
    adminOnly: true,
  },

  lights: {
    description: 'Lumières ON/OFF',
    aliases: ['lights', 'lumière', 'lumières', 'lampe'],
    handler: () => {
      const s = snap();
      const on = Object.values(s.lights).some((l) => !l.isOn);
      Object.keys(s.lights).forEach((id) => {
        if (s.lights[id].isOn !== on) toggleLight(id);
      });
      return {
        ok: true,
        summary: on ? '💡 Toutes les lumières ON' : '🌑 Toutes les lumières OFF',
        serverSync: false,
      };
    },
  },

  lock: {
    description: 'Verrouiller/déverrouiller une porte',
    aliases: ['lock', 'unlock', 'verrou', 'verrouiller', 'déverrouiller'],
    handler: (params) => {
      const raw = String(params.raw || '').toLowerCase();
      const doLock = raw.includes('lock') || raw.includes('verrou');
      const id = raw.includes('bath') ? 'bathroom' : 'main';
      setDoorLocked(id, doLock);
      return {
        ok: true,
        summary: `🔐 Porte ${id} ${doLock ? 'verrouillée' : 'déverrouillée'}`,
        serverSync: true,
      };
    },
  },

  // ── COMMANDES SERVEUR (Multi-Joueurs) ────────────────────────────
  say: {
    description: 'Parler dans le chat global',
    aliases: ['say', 'dire', 'parler'],
    handler: async (params) => {
      const message = params.raw?.replace(/^\/say\s+/, '').trim();
      if (!message) {
        return { ok: false, summary: '❌ Usage: /say <message>' };
      }
      if (!currentPlayerId) {
        return { ok: false, summary: '❌ Non connecté au serveur.' };
      }
      const result = await intellectusClient.dispatch('chat.say', {
        playerId: currentPlayerId,
        message,
      });
      if (!result?.ok) {
        return { ok: false, summary: `❌ Erreur: ${result?.error || 'Message non envoyé'}` };
      }
      return {
        ok: true,
        summary: `💬 [Global] Toi: ${message}`,
        serverSync: true,
      };
    },
  },

  me: {
    description: 'Faire une action RP visible par tous',
    aliases: ['me', 'action', 'rp'],
    handler: async (params) => {
      const action = params.raw?.replace(/^\/me\s+/, '').trim();
      if (!action) {
        return { ok: false, summary: '❌ Usage: /me <action>' };
      }
      if (!currentPlayerId) {
        return { ok: false, summary: '❌ Non connecté au serveur.' };
      }
      const result = await intellectusClient.dispatch('chat.emote', {
        playerId: currentPlayerId,
        action,
      });
      if (!result?.ok) {
        return { ok: false, summary: `❌ Erreur: ${result?.error || 'Action non envoyée'}` };
      }
      return {
        ok: true,
        summary: `* ${currentPlayerContext?.name || 'Toi'} ${action}`,
        serverSync: true,
      };
    },
  },

  ooc: {
    description: 'Parler hors-jeu (OOC)',
    aliases: ['ooc', 'horsjeu', 'hrp'],
    handler: async (params) => {
      const message = params.raw?.replace(/^\/ooc\s+/, '').trim();
      if (!message) {
        return { ok: false, summary: '❌ Usage: /ooc <message>' };
      }
      if (!currentPlayerId) {
        return { ok: false, summary: '❌ Non connecté au serveur.' };
      }
      const result = await intellectusClient.dispatch('chat.ooc', {
        playerId: currentPlayerId,
        message,
      });
      if (!result?.ok) {
        return { ok: false, summary: `❌ Erreur: ${result?.error || 'Message non envoyé'}` };
      }
      return {
        ok: true,
        summary: `(( OOC: ${message} ))`,
        serverSync: true,
      };
    },
  },

  pm: {
    description: 'Envoyer un message privé',
    aliases: ['pm', 'msg', 'whisper', 'chuchoter'],
    handler: async (params) => {
      const raw = String(params.raw || '').replace(/^\/pm\s+/, '').trim();
      const [target, ...messageParts] = raw.split(' ');
      const message = messageParts.join(' ');
      if (!target || !message) {
        return { ok: false, summary: '❌ Usage: /pm <joueur> <message>' };
      }
      if (!currentPlayerId) {
        return { ok: false, summary: '❌ Non connecté au serveur.' };
      }
      const result = await intellectusClient.dispatch('chat.private', {
        senderId: currentPlayerId,
        targetId: target,
        message,
      });
      if (!result?.ok) {
        return { ok: false, summary: `❌ Erreur: ${result?.error || 'Joueur introuvable'}` };
      }
      return {
        ok: true,
        summary: `💌 [PM → ${target}] ${message}`,
        serverSync: true,
      };
    },
  },

  spawn: {
    description: 'Spawner un objet dans le monde (Admin)',
    aliases: ['spawn', 'crée', 'create', 'ajouter', 'add', 'placer'],
    handler: async (params, ctx) => {
      if (!ctx.isAdmin) {
        return { ok: false, summary: '❌ Permission refusée : nécessite des droits admin.' };
      }
      const TYPES = [
        'cube',
        'sphere',
        'cylinder',
        'wall',
        'pillar',
        'tree',
        'rock',
        'bench',
        'streetlight',
        'ramp',
        'fence',
        'barrel',
        'crate',
        'table',
        'chair',
      ];
      const raw = String(params.raw || '').toLowerCase();
      const type = TYPES.find((t) => raw.includes(t)) || 'cube';
      const spread = () => (Math.random() - 0.5) * 8;
      const pos = [spread(), 0, spread()];
      // Envoi au serveur pour validation
      const result = await intellectusClient.dispatch('world.spawn_object', {
        playerId: currentPlayerId,
        type,
        position: pos,
      });
      if (!result?.ok) {
        return { ok: false, summary: `❌ Erreur: ${result?.error || 'Spawn refusé'}` };
      }
      // Si le serveur valide, on applique localement
      addPlaced({
        type,
        position: pos as [number, number, number],
        rotation: 0,
        scale: 1,
      });
      return {
        ok: true,
        summary: `📦 ${type} spawné dans le monde !`,
        serverSync: true,
      };
    },
    adminOnly: true,
  },

  clearbuilt: {
    description: 'Effacer tous les objets placés (Admin)',
    aliases: ['clear', 'clearbuilt', 'effacer', 'supprimer tout', 'reset objets'],
    handler: async (_, ctx) => {
      if (!ctx.isAdmin) {
        return { ok: false, summary: '❌ Permission refusée : nécessite des droits admin.' };
      }
      const result = await intellectusClient.dispatch('world.clear_objects', {
        playerId: currentPlayerId,
      });
      if (!result?.ok) {
        return { ok: false, summary: `❌ Erreur: ${result?.error || 'Action refusée'}` };
      }
      clearAllPlaced();
      return {
        ok: true,
        summary: '🗑 Tous les objets effacés.',
        serverSync: true,
      };
    },
    adminOnly: true,
  },

  help: {
    description: 'Aide — liste des commandes',
    aliases: ['help', 'aide', 'commandes', 'commands', '?'],
    handler: () => ({
      ok: true,
      summary:
        '📖 **Commandes TroxT (v4.1.0 - OFFICIEL)**\n\n' +
        '🔹 **Locales (Client):**\n' +
        '  • état / info — état du monde\n' +
        '  • fly — mode vol\n' +
        '  • build — builder mode\n' +
        '  • scene <room|corridor|hotel|world>\n' +
        '  • lights on|off\n' +
        '  • lock|unlock <main|bathroom>\n\n' +
        '🔹 **Serveur (Multi-Joueurs):**\n' +
        '  • /say <message> — parler globalement\n' +
        '  • /me <action> — action RP (*Jean boit*)\n' +
        '  • /ooc <message> — hors-jeu\n' +
        '  • /pm <joueur> <message> — message privé\n\n' +
        '🔹 **Admin (Droits requis):**\n' +
        '  • god — invincibilité\n' +
        '  • noclip — traverser les murs\n' +
        '  • weather <clear|rain|snow|fog>\n' +
        '  • time <0-23> / jour / nuit\n' +
        '  • spawn <type> — spawner un objet\n' +
        '  • clear — effacer les objets\n' +
        '  • version — version du moteur',
    }),
  },

  ping: {
    description: 'Ping au serveur',
    aliases: ['ping', 'latence'],
    handler: async () => {
      if (!currentPlayerId) {
        return { ok: false, summary: '❌ Non connecté au serveur.' };
      }
      const start = Date.now();
      const result = await intellectusClient.dispatch('system.ping', {
        playerId: currentPlayerId,
      });
      const latency = Date.now() - start;
      if (!result?.ok) {
        return { ok: false, summary: `❌ Serveur hors ligne: ${result?.error}` };
      }
      return {
        ok: true,
        summary: `🏓 Pong ! Latence: ${latency}ms`,
        serverSync: true,
      };
    },
  },

  version: {
    description: 'Version du moteur',
    aliases: ['version', 'ver', 'about'],
    handler: () => ({
      ok: true,
      summary:
        '🧠 **TroxT Neural Core v4.1.0-OFFICIEL**\n' +
        'EtherWorld RP v1.2.0 | Node.js 24 | Colyseus 0.15\n' +
        `Mode: ${currentPlayerId ? 'CONNECTÉ' : 'LOCAL_DEV'} | Skills: ${Object.keys(SKILLS).length}`,
    }),
  },

  introspect: {
    description: 'Introspection cognitive',
    aliases: ['introspect', 'introspection', 'cerveau', 'brain', 'toi', 'qui'],
    handler: () => {
      const s = snap();
      return {
        ok: true,
        summary:
          '🧠 **TroxT — Introspection:**\n' +
          `• Conscience: 7/10 | Charge: ${s.placedObjects.length * 5}%\n` +
          `• Objets gérés: ${s.placedObjects.length}\n` +
          `• Scène active: ${s.activeScene}\n` +
          `• Modules: Forge, Prism, Lens, Weave\n` +
          `• Mémoire: ${s.chatMessages.length} messages\n` +
          `• Status: ${currentPlayerId ? 'ONLINE (SERVEUR)' : 'LOCAL_DEV'}`,
      };
    },
  },
};

// ── Réponses Chat ─────────────────────────────────────────────
const CHAT_RESPONSES: [RegExp, string[]][] = [
  [/bonjour|salut|coucou|hello|hi\b/i, [
    '👋 Salut ! Je suis TroxT, le cerveau neural d\'EtherWorld. Tape `/help` pour voir ce que je peux faire.',
    'Bonjour ! En quoi puis-je t\'aider ?',
  ]],
  [/merci|thanks|thx/i, ['Avec plaisir ! 🧠', 'De rien ! Je suis là pour ça.']],
  [/beau|super|cool|parfait|nickel|excellent/i, [
    '✨ Merci ! Je fais de mon mieux.',
    'Content que ça te plaise !',
  ]],
  [/génère|generate|procédural|procédure/i, [
    '🏗 AutoBuilder activé — tape `/spawn cube` ou `/spawn tree` pour commencer !',
  ]],
  [/qui.*tu|c.*quoi|présente/i, [
    '🧠 Je suis **TroxT** — le cerveau neural d\'EtherWorld RP.\n' +
      'Je peux contrôler le monde, spawner des objets, changer la scène, la météo, l\'heure.\n' +
      'Tape `/help` pour la liste complète.',
  ]],
];

// ── Parseur d'Intention ────────────────────────────────────────
function parseIntent(text: string): { skill: string | null; params: Record<string, unknown> } {
  const t = text.trim().toLowerCase();

  // Vérifie d'abord les commandes avec /
  if (t.startsWith('/')) {
    const cmd = t.slice(1).split(' ')[0];
    for (const [skillId, skill] of Object.entries(SKILLS)) {
      if (skill.aliases.includes(cmd)) {
        return { skill: skillId, params: { raw: t } };
      }
    }
    return { skill: null, params: { raw: t } };
  }

  // Puis les intentions naturelles
  for (const [skillId, skill] of Object.entries(SKILLS)) {
    for (const alias of skill.aliases) {
      if (t.includes(alias)) {
        const idx = t.indexOf(alias);
        const after = t.slice(idx + alias.length).trim();
        const numMatch = text.match(/\b(\d+)\b/);
        return {
          skill: skillId,
          params: {
            arg: after,
            raw: t,
            hour: numMatch ? parseInt(numMatch[1]) : NaN,
            time: numMatch ? parseInt(numMatch[1]) : NaN,
          },
        };
      }
    }
  }

  return { skill: null, params: { raw: t } };
}

// ── Traitement Principal ────────────────────────────────────────
export async function processMessage(
  text: string,
  playerId?: string,
  playerContext?: PlayerContext
): Promise<TroxTMessage[]> {
  // Mise à jour du contexte si fourni
  if (playerId && playerContext) {
    setPlayerContext(playerId, playerContext);
  }

  const trimmed = text.trim();
  const lower = trimmed.toLowerCase();
  const results: TroxTMessage[] = [];

  const push = (role: TroxTMessage['role'], txt: string, senderId?: string) => {
    results.push({
      id: uid(),
      role,
      text: txt,
      timestamp: Date.now(),
      senderId,
    });
  };

  // Commande directe (/) → passe directement au parseur
  if (trimmed.startsWith('/')) {
    const { skill: skillId, params } = parseIntent(trimmed);
    if (skillId && SKILLS[skillId]) {
      const skill = SKILLS[skillId];
      if (skill.adminOnly && !playerContext?.job?.includes('Admin')) {
        push('troxt', '❌ Permission refusée : commande admin uniquement.');
        return results;
      }
      await delay(200 + Math.random() * 300);
      try {
        const result = await skill.handler(params, {
          playerId: playerId || '',
          isAdmin: playerContext?.job?.includes('Admin') || false,
          requiresGodMode: playerContext?.isGodMode || false,
        });
        push('troxt', result.summary);
        if (result.ok && result.serverSync) {
          addChat('TroxT', `Action: ${skillId} — ${result.summary.split('\n')[0]}`, 'admin');
        }
      } catch (e) {
        push('troxt', `❌ Erreur: ${String(e)}`);
      }
      return results;
    }
  }

  // Réponses chat naturelles
  for (const [pattern, replies] of CHAT_RESPONSES) {
    if (pattern.test(lower)) {
      await delay(300 + Math.random() * 400);
      push('troxt', replies[Math.floor(Math.random() * replies.length)]);
      return results;
    }
  }

  // Intent parse pour les commandes naturelles
  const { skill: skillId, params } = parseIntent(lower);
  if (skillId && SKILLS[skillId]) {
    const skill = SKILLS[skillId];
    if (skill.adminOnly && !playerContext?.job?.includes('Admin')) {
      push('troxt', '❌ Permission refusée : commande admin uniquement.');
      return results;
    }
    await delay(200 + Math.random() * 300);
    try {
      const result = await skill.handler(params, {
        playerId: playerId || '',
        isAdmin: playerContext?.job?.includes('Admin') || false,
        requiresGodMode: playerContext?.isGodMode || false,
      });
      push('troxt', result.summary);
      if (result.ok && result.serverSync) {
        addChat('TroxT', `Action: ${skillId} — ${result.summary.split('\n')[0]}`, 'admin');
      }
    } catch (e) {
      push('troxt', `❌ Erreur: ${String(e)}`);
    }
    return results;
  }

  // Fallback
  await delay(400 + Math.random() * 600);
  const fallbacks = [
    `Hmm, je n'ai pas compris « ${trimmed} ». Tape \`/help\` pour voir mes capacités.`,
    `🤔 Requête non reconnue. Tape \`/help\` pour la liste des commandes.`,
    `Je suis connecté au serveur ! Tape \`/help\` pour voir ce que je peux faire.`,
  ];
  push('troxt', fallbacks[Math.floor(Math.random() * fallbacks.length)]);
  return results;
}

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export { SKILLS };