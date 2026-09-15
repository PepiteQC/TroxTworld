/**
 * ═══════════════════════════════════════════════════════════════════
 * SYSTÈME DE GESTION DU COMTÉ (SGC) — CONTRÔLE ADMIN & SIMULATION
 * ═══════════════════════════════════════════════════════════════════
 *
 * OUTILS DE GESTION ET COMMANDES :
 *  - Téléportation instantanée vers les 12 municipalités et POIs du comté.
 *  - Manipulation des comptes Desjardins, caisses physiques et REQ.
 *  - Contrôle météo en temps réel (Blizzard, Poudrerie, Crise du Verglas).
 *  - Déclenchement d'événements majeurs (Pannes d'Hydro, Grèves CCQ, Raids SQ).
 *  - Ajustement des profils SAAQ, arrestations au TAL, écrouage à Donnacona.
 *  - Création (Spawn) d'objets du constructeur et de cargaisons de contrebande.
 *
 * v2.1 — AJOUTS (rien de retiré, uniquement branché/ajouté) :
 *  - Anti-abus réel : /parseAdmin applique désormais checkRateLimit()
 *    et journalise chaque commande via logAudit() (les deux existaient
 *    dans adminPerms.ts mais n'étaient jamais appelés).
 *  - /kick, /ban, /warn, /mute, /arrest, /book alimentent maintenant
 *    réellement le système de sanctions et le casier judiciaire.
 *  - Centrale 911 / Dispatch : /911, /calls, /respond, /onscene, /clear911
 *  - Casier judiciaire : /record (rap sheet consultable)
 *  - Primes : /bounty, /bounties, /claimbounty
 *  - Fourrière MTQ : /impound, /impoundlot, /releasecar
 *  - Signalements joueurs : /report, /reports (claim/resolve)
 *  - Audit & transparence : /audit, /warns, /sanctions
 *  - Prise de service : /duty, /dutystatus
 *  - Télémétrie exposée en jeu : /diag, /perf, /alerts (AdminMetrics
 *    existait déjà mais n'était branché nulle part côté commandes)
 * ═══════════════════════════════════════════════════════════════════
 */

import { FIRM_TYPES, MAPAQ_GRANTS, type FirmType } from "./business";
import { AURAS, MODELS, OUTFITS, type Appearance } from "./character";
import { GESTURE_IDS, isGesture, type RpGesture } from "./gestures";
import { CATALOG, LANDMARK_SHOPS } from "./commerce";
import { FLEET } from "./fleet";
import { QUEBEC_FM_STATIONS } from "./radio";
import { police, citationByCode, CSR_CITATIONS, SQ_LEGAL_BAC, type TicketRecord } from "./police";
import { DEEDS, GANGS, RP_JOBS } from "./rp";
import { COMMERCIALS, catalog as mlsCatalog, propertyById } from "./realestate";
import { FRESH_SURVIVAL, type SurvivalSnap } from "./survival";
import { ETHER_MAT_STATS, getEtherDef, searchEtherMats } from "./etherMats";
import { ANIM_TYPES } from "./anim";
import { PROP_IDS, isPropId } from "./builder";
import { searchModels, TOTAL_MODELS } from "./models";
import { ADMIN_EFFECTS, ADMIN_EFFECT_IDS, listFx } from "./fx";
import { type WeatherId, useGameStore, CAMERA_CYCLE, CAMERA_LABEL, type CameraMode } from "./store";
import {
  quebecSeasons,
  SEASON_LABEL,
  CONDITION_LABEL,
  type QuebecSeason,
  type WeatherCondition,
} from "./seasons";
import { type InvestmentType } from "./banking";
import { LICENSES, type LicenseId } from "./weapons";
import { describeGltf, GLTF_LIBRARY } from "./gltf";
import { INJURED_CLIPS, parseInjuredClip } from "./injured";
import { CROPS, countyFarmLayout } from "./farms";
import { sugarSites } from "./sugar";
import { villageCivicSpot, POIS, SPAWN, VILLAGES } from "./worlddata";
import {
  LOCAL_PLAYER_ID,
  ROLE_LADDER,
  canChangeRole,
  checkPermission,
  demoteUser,
  formatStaffLine,
  getAllStaffMembers,
  getRoleBadgeStyle,
  getUserRole,
  parseAdminRole,
  parseRpJobRole,
  promoteUser,
  requiredRoleFor,
  resolveStaffId,
  setUserJob,
  setUserRole,
  snapshotStaff,
  // ── AJOUTS v2.1 : anti-abus, audit, sanctions, nouveaux systèmes RP ──
  checkRateLimit,
  logAudit,
  getAuditLog,
  issueSanction,
  revokeSanction,
  isBanned,
  getActiveWarns,
  getSanctionHistory,
  toggleDuty,
  getDutyStatus,
  getDisplayName,
  createReport,
  listOpenReports,
  claimReport,
  resolveReport,
  formatReportLine,
  addCriminalCharge,
  formatRapSheet,
  createDispatchCall,
  listActiveDispatchCalls,
  assignDispatchCall,
  markOnScene,
  resolveDispatchCall,
  formatDispatchLine,
  listDispatchCodes,
  placeBounty,
  listActiveBounties,
  claimBounty,
  formatBountyLine,
  impoundVehicle,
  listImpoundedVehicles,
  releaseVehicleFromImpound,
  formatImpoundLine,
} from "./adminPerms";
import { AdminMetrics } from "./adminMetrics";

export type FloorId = "lobby" | "hotel" | "apartment" | "corridor" | "prison" | "depanneur" | "caisse" | "casse" | "sqdc";

export interface AdminCtx {
  teleport: (x: number, z: number) => void;
  toggleNight: () => void;
  addCash: (n: number, notice?: string) => void;
  addBank: (n: number) => void;
  setGod: (on: boolean) => void;
  god: boolean;
  hunt: () => string;
  grantLic: (id: LicenseId) => void;
  playFx: (id: string) => boolean;
  clearFx: () => void;
  spawnProp: (type: string) => boolean;
  animNearest: (type: string) => string;
  geoStats: () => string;
  toggleFly: () => void;
  toggleNoclip: () => void;
  setWeather: (id: WeatherId) => void;
  setSeason: (id: QuebecSeason) => void;
  triggerBlizzard: () => void;
  runPlow: (id?: string) => string;
  spawnEvent: (kind: string) => string;
  setClock: (hours: number) => void;
  announce: (text: string) => void;
  forceOutage: (kind: "verglas" | "panne" | null) => void;
  say: (text: string) => void;
  heal: () => void;
  hurt: (clip: string) => string;
  freeze: (on: boolean) => void;
  vanish: () => boolean;
  slap: (force: number) => void;
  smite: () => void;
  etherPulse: () => void;
  repairAll: () => void;
  unjail: () => void;
  maxStats: () => void;
  setArmor: (n: number) => void;
  mute: (on: boolean) => void;
  kickPeer: (name: string) => string;
  setWanted: (n: number) => void;
  cycleRadio: () => void;
  cycleSiren: () => string;
  setRadio: (id: string) => boolean;
  jail: () => void;
  prison: () => void;
  book: () => string;
  lockdown: () => void;
  release: () => void;
  pos: () => string;
  zone: () => string;
  net: () => string;
  openIntel: () => void;
  floor: (id: FloorId) => void;
  giveItem: (id: string, n: number) => boolean;
  giveCar: (id: string) => boolean;
  walk: () => void;
  drive: () => void;
  toggleBuild: () => void;
  clearBuild: () => void;
  undoBuild: () => string;
  removeNear: () => string;
  dupNear: () => string;
  selectBuild: (id: string) => boolean;
  rotateBuild: (deg?: number) => string;
  scaleBuild: (n: number) => string;
  snapBuild: (n: number) => string;
  propsInfo: () => string;
  status: () => string;
  setSurv: (patch: Partial<SurvivalSnap>) => void;
  setJob: (id: string) => boolean;
  setGang: (id: string | null) => boolean;
  setLook: (p: Partial<Appearance>) => void;
  toggleTv: () => boolean;
  unlockHotel: (on: boolean) => void;
  equip: (id: string) => boolean;
  foundFirm: (type: FirmType) => boolean;
  payroll: () => void;
  hireStaff: () => boolean;
  applyGrant: (id: string) => boolean;
  sow: (crop: string) => string;
  clearInv: () => void;
  kit: () => void;
  setCamera: (mode: CameraMode) => void;
  playGesture: (id: RpGesture) => void;
  bell: () => void;
  lights: () => void;
  elevator: () => void;
}

const PRESETS: Record<string, { x: number; z: number; name: string }> = {
  spawn: { x: SPAWN.x, z: SPAWN.z, name: "Route 138 · Chemin du Roy" },
};

for (const v of VILLAGES) {
  PRESETS[v.id] = { x: v.center[0], z: v.center[1], name: v.name };
  PRESETS[v.name.toLowerCase().replace(/\s+/g, "")] = PRESETS[v.id];
}
for (const p of POIS) {
  PRESETS[p.id] = { x: p.x, z: p.z, name: p.name };
}
PRESETS.ether = { x: 1088, z: -312, name: "Boutique Éther" };
PRESETS.boutique = PRESETS.ether;
for (const f of countyFarmLayout()) {
  PRESETS[f.id] = { x: f.x, z: f.z, name: f.name };
}
PRESETS.champs = PRESETS.rang_grondines_ouest!;
PRESETS.ferme = PRESETS.rang_deschambault_ouest!;
PRESETS.illicite = PRESETS.farm_illicite_alban!;
for (const s of sugarSites()) {
  PRESETS[s.id] = { x: s.x, z: s.z, name: s.name };
}
PRESETS.erabliere = PRESETS.erable_alban!;
PRESETS.cabane = PRESETS.erable_alban!;
PRESETS.sirop = PRESETS.erable_raymond!;
for (const d of DEEDS) {
  PRESETS[d.id.toLowerCase()] = { x: d.x, z: d.z, name: d.name };
  PRESETS[d.town.toLowerCase().replace(/\s+/g, "")] = PRESETS[d.town.toLowerCase().replace(/\s+/g, "")] ?? {
    x: d.x,
    z: d.z,
    name: d.name,
  };
}
PRESETS.maison = { x: DEEDS[0]!.x, z: DEEDS[0]!.z, name: DEEDS[0]!.name };
let presetsInitialized = false;

function ensurePresets() {
  if (presetsInitialized) return;
  presetsInitialized = true;

  PRESETS.house = PRESETS.maison;
  PRESETS.immo = PRESETS.maison;
  if (typeof COMMERCIALS !== "undefined" && COMMERCIALS.length > 0) {
    PRESETS.mls = { x: COMMERCIALS[0]!.x, z: COMMERCIALS[0]!.z, name: COMMERCIALS[0]!.name };
    for (const c of COMMERCIALS) {
      PRESETS[c.id.toLowerCase()] = { x: c.x, z: c.z, name: c.name };
    }
  }
  if (typeof VILLAGES !== "undefined") {
    const alb = VILLAGES.find((v) => v.id === "saint_alban");
    if (alb && typeof villageCivicSpot === "function") {
      const sp = villageCivicSpot(alb, "shop");
      PRESETS.depanneur = { x: sp.x, z: sp.z, name: "Dépanneur de l'Éboulis" };
      PRESETS.dep = PRESETS.depanneur;
      PRESETS.beausoir = PRESETS.depanneur;
      const ca = villageCivicSpot(alb, "caisse");
      PRESETS.caisse = { x: ca.x, z: ca.z, name: "Caisse de Saint-Alban" };
      PRESETS.banque = PRESETS.caisse;
      PRESETS.gab = PRESETS.caisse;
    }
  }
  if (typeof LANDMARK_SHOPS !== "undefined") {
    const tiguy = LANDMARK_SHOPS.find((s) => s.id === "shop_tiguy");
    if (tiguy) {
      PRESETS.tiguy = { x: tiguy.x, z: tiguy.z, name: tiguy.name };
      PRESETS.casse = PRESETS.tiguy;
      PRESETS.resto = PRESETS.tiguy;
    }
    const sqdc = LANDMARK_SHOPS.find((s) => s.id === "shop_sqdc_portneuf");
    if (sqdc) {
      PRESETS.sqdc = { x: sqdc.x, z: sqdc.z, name: sqdc.name };
    }
  }
}

const FLOORS: Record<string, FloorId> = {
  lobby: "lobby",
  reception: "lobby",
  hotel: "hotel",
  chambre: "hotel",
  suite: "hotel",
  "214": "hotel",
  apartment: "apartment",
  appart: "apartment",
  penthouse: "apartment",
  "301": "apartment",
  corridor: "corridor",
  couloir: "corridor",
  hall: "corridor",
  prison: "prison",
  penitencier: "prison",
  cellule: "prison",
  don: "prison",
  depanneur: "depanneur",
  dep: "depanneur",
  magasin: "depanneur",
  caisse: "caisse",
  banque: "caisse",
  gab: "caisse",
  casse: "casse",
  tiguy: "casse",
  resto: "casse",
  sqdc: "sqdc",
  cannabis: "sqdc",
};

export const ADMIN_CHIPS = [
  "/help",
  "/status",
  "/kit",
  "/tp hotel",
  "/floor chambre",
  "/tp depanneur",
  "/floor depanneur",
  "/tp sqdc",
  "/floor sqdc",
  "/tp caisse",
  "/floor caisse",
  "/floor casse",
  "/intel",
  "/loan mini",
  "/mls",
  "/unlock",
  "/car sq",
  "/siren",
  "/car lambo",
  "/car civic",
  "/car divan",
  "/tp prison",
  "/job agent_sq",
  "/ticket",
  "/radar",
  "/alcotest",
  "/patrouille",
  "/aura frost",
  "/fx lightning",
  "/weather snow",
  "/blizzard",
  "/season hiver",
  "/plow",
  "/event panne",
  "/etherpulse",
  "/announce",
  "/stafflist",
  "/setrole",
  "/spawn teleporter",
  "/help build",
  "/spawn piano",
  "/undo",
  "/mapaq",
  // AJOUTS v2.1
  "/duty",
  "/911 code_3",
  "/calls",
  "/record",
  "/bounties",
  "/impoundlot",
  "/report",
  "/audit",
  "/warns",
  "/sanctions",
  "/diag",
];

export function adminHelp(topic = ""): string {
  if (topic === "rp") {
    return [
      "🍁 Commandes Économiques & Carrières :",
      "  /job <id>        — Assigner un rôle : " + RP_JOBS.map((j) => j.id).join(" | "),
      "  /gang <id>|leave — Rejoindre/quitter une faction criminelle ou motards",
      "  /firm <type>     — Créer une compagnie enregistrée au REQ",
      "  /mapaq <id>      — Demande de subvention agricole (proximite, pta, padaar)",
      "  /semer <id>      — Ensemencer un champ (mais, ble, foin, patate, cannabis)",
      "  /pay             — Lancer le versement de paie de toutes les corporations",
      "  /bank <n>        — Ajuster le compte Desjardins d'un citoyen",
      "  /cash <n>        — Ajuster l'argent liquide dans le portefeuille",
      "  /license <id>    — Délivrer des permis officiels (pal, pal_r, chasse)",
    ].join("\n");
  }
  if (topic === "look" || topic === "appearance") {
    return [
      "👤 Personnalisation & Équipement :",
      "  /outfit <id>     — Changer d'uniforme : " + OUTFITS.map((o) => o.id).join(", "),
      "  /model <id>      — Modèle corporel : " + MODELS.map((m) => m.id).join(", "),
      "  /face 0-7        — Choisir le faciès du citoyen",
      "  /skin 0-7        — Teinte mélanine",
      "  /aura <id>       — Activer un effet visuel d'aura : " + AURAS.map((a) => a.id).join(", "),
      "  /tool <id>       — Mettre un outil/objet en main (pelle, taser, glock, etc.)",
      "  /pack <id>       — Assigner un sac à dos",
    ].join("\n");
  }
  if (topic === "build" || topic === "builder" || topic === "construire") {
    return [
      "🔨 Commandes du Constructeur du Comté :",
      "  /build           — Activer/Désactiver le mode d'édition (Touche B)",
      "  /select <id>     — Sélectionner un objet 3D sans le poser",
      "  /spawn <id>      — Poser un objet face au viseur de caméra",
      "  /undo            — Retirer le dernier élément posé",
      "  /del             — Supprimer l'objet du constructeur le plus proche",
      "  /dup             — Dupliquer l'objet pointé devant soi",
      "  /rotate <angle>  — Orienter l'objet (Touche Q pour +45°)",
      "  /scale <facteur> — Modifier la taille de l'objet (0.25 à 6.0)",
      "  /snap <0|0.5|1>  — Aligner sur la grille (0 = pose libre)",
      "  /anim <type>     — Animer l'objet (rotate, float, pulse, clear)",
      "  /clearbuild      — Supprimer l'intégralité des constructions",
    ].join("\n");
  }
  if (topic === "staff" || topic === "mod" || topic === "admin") {
    return [
      "🛠️ Commandes Administrateur & Modération :",
      "  /stafflist       — Liste complète des administrateurs et modérateurs connectés",
      "  /setrole <id> <r>— Assigner le rang staff (helper, mod, admin, superadmin, owner)",
      "  /promote <id>    — Promouvoir un joueur au rang staff supérieur",
      "  /demote <id>     — Rétrograder un membre du staff",
      "  /kick <nom>      — Expulser un fauteur de troubles du serveur",
      "  /ban <nom>       — Bannir définitivement l'identifiant du joueur",
      "  /mute <on|off>   — Rendre muet / réactiver les ondes radio",
      "  /freeze /unfreeze— Figer/libérer les mouvements physiques d'un citoyen",
      "  /vanish          — Devenir totalement invisible aux yeux des joueurs",
      "  /smite           — Foudroyer instantanément un suspect indiscipliné",
      "  /god             — Activer l'invincibilité absolue",
      "  /audit [id]      — Consulter le journal d'audit des commandes",
      "  /warns <id>      — Voir les avertissements actifs d'un joueur",
      "  /sanctions <id>  — Historique complet des sanctions d'un joueur",
      "  /reports         — Lister/traiter les signalements ouverts",
    ].join("\n");
  }
  if (topic === "world" || topic === "monde") {
    return [
      "🌍 Commandes de Gestion du Monde & Météo :",
      "  /tp <lieu|x z>   — Se téléporter vers une ville, érablière, grange ou coordonnées",
      "  /floor <id>      — Charger l'intérieur d'un bâtiment (prison, caisse, sqdc, hotel)",
      "  /weather <id>    — Forcer la météo (clear, rain, snow, storm, poudrerie, blizzard)",
      "  /season <id>     — Changer de saison (printemps, ete, automne, hiver)",
      "  /time 0-24       — Régler l'heure de l'horloge du comté",
      "  /verglas         — Déclencher la tempête de pluie verglaçante et geler les routes",
      "  /panne           — Couper le réseau électrique d'Hydro-Québec (Blackout)",
      "  /hq              — Rétablir les transformateurs d'Hydro-Québec",
      "  /plow            — Lancer le passage des grattes de déneigement MTQ",
      "  /event <id>      — Déclencher un événement (panne, chase, braquage, airdrop)",
      "  /diag            — Rapport de télémétrie complet (FPS, réseau, monde)",
    ].join("\n");
  }
  if (topic === "911" || topic === "dispatch" || topic === "urgence") {
    return [
      "🚨 Centrale de Répartition 911 :",
      "  /911 <code> [notes] — Signaler une urgence : " + listDispatchCodes().join(", "),
      "  /calls              — Lister les appels actifs",
      "  /respond <id>       — S'assigner à un appel",
      "  /onscene <id>       — Signaler son arrivée sur les lieux",
      "  /clear911 <id>      — Clôturer l'appel (Code 4)",
      "  /duty               — Basculer la prise de service",
      "  /record <id>        — Consulter le casier judiciaire d'un citoyen",
      "  /bounty <id> <n>    — Placer une prime sur la tête d'un citoyen",
      "  /bounties           — Voir les primes actives",
      "  /impound <veh>      — Envoyer un véhicule à la fourrière MTQ",
      "  /releasecar <id>    — Récupérer un véhicule en fourrière (frais applicables)",
    ].join("\n");
  }
  return [
    "🍁 Système de Gestion du Comté de Portneuf — SGC 🍁",
    "  /help rp         — Commandes de carrières, d'économie et lois",
    "  /help look       — Personnalisation visuelle et uniformes",
    "  /help build      — Outils de construction et aménagement 3D",
    "  /help world      — Contrôle de l'environnement, météo et téléportations",
    "  /help 911        — Centrale de répartition, casier, primes, fourrière",
    "  /help staff      — Liste des commandes de modération et administration",
    "  /status          — Afficher vos statistiques vitales, inventaire et diagnostics",
  ].join("\n");
}

export function listLieux(): string {
  const villages = VILLAGES.map((v) => v.name).join(", ");
  const pois = POIS.map((p) => p.name).join(", ");
  return `Villages : ${villages}\nLieux : ${pois}`;
}

/**
 * Cœur historique du parseur de commandes. Renommé depuis `parseAdmin`
 * (v2.1) : la logique interne est inchangée, seule l'enveloppe publique
 * `parseAdmin` ci-dessous a été ajoutée pour brancher rate-limit + audit.
 */
function executeAdminCommand(raw: string, ctx: AdminCtx): { ok: boolean; message: string } {
  const trimmed = raw.trim();
  if (!trimmed) return { ok: false, message: "Commande vide." };
  const parts = trimmed.replace(/^\//, "").split(/\s+/);
  const cmd = (parts[0] ?? "").toLowerCase();
  const args = parts.slice(1);
  const arg0 = (args[0] ?? "").toLowerCase();

  if (cmd !== "help" && cmd !== "aide" && cmd !== "h") {
    const selfRank =
      (cmd === "setrole" || cmd === "setrank" || cmd === "grade" || cmd === "promote" || cmd === "promo" || cmd === "rankup" || cmd === "demote" || cmd === "rankdown") &&
      (!args[0] || resolveStaffId(args[0]) === LOCAL_PLAYER_ID);
    const need = selfRank ? requiredRoleFor("pos") : requiredRoleFor(cmd);
    if (!checkPermission(LOCAL_PLAYER_ID, need)) {
      const have = getRoleBadgeStyle(getUserRole(LOCAL_PLAYER_ID));
      const want = getRoleBadgeStyle(need);
      return { ok: false, message: `Refusé · ${have.label} · requis ${want.label}` };
    }
  }

  if (cmd === "help" || cmd === "aide" || cmd === "h") {
    return { ok: true, message: adminHelp(arg0) };
  }
  if (cmd === "lieux" || cmd === "list") return { ok: true, message: listLieux() };
  if (cmd === "pos" || cmd === "coords" || cmd === "gps") return { ok: true, message: ctx.pos() };
  if (cmd === "zone" || cmd === "secteur" || cmd === "sol") return { ok: true, message: ctx.zone() };
  if (cmd === "net" || cmd === "aoi" || cmd === "intellectus") return { ok: true, message: ctx.net() };
  if (cmd === "intel" || cmd === "panel" || cmd === "intellectus" || cmd === "ai" || cmd === "troxt") {
    ctx.openIntel();
    return { ok: true, message: "Intellectus ouvert" };
  }
  if (cmd === "loan" || cmd === "pret") {
    const id = arg0 || "mini";
    const ok = useGameStore.getState().requestLoan(id);
    return { ok, message: useGameStore.getState().notice ?? (ok ? "Prêt versé" : "Prêt refusé") };
  }
  if (cmd === "invest" || cmd === "placement") {
    const types: InvestmentType[] = ["stock", "business", "property", "crypto"];
    const t = types.includes(arg0 as InvestmentType) ? (arg0 as InvestmentType) : "stock";
    const n = Number(args[1] ?? 250);
    const ok = useGameStore.getState().investBank(t, Number.isFinite(n) ? n : 250);
    return { ok, message: useGameStore.getState().notice ?? (ok ? "Placement" : "Refusé") };
  }
  if (cmd === "mls" || cmd === "immo" || cmd === "immobilier") {
    if (!arg0 || arg0 === "list") {
      return { ok: true, message: mlsCatalog().map((p) => `${p.id} · ${p.name} · ${p.price}\u00a0$`).join("\n") };
    }
    const key = arg0.toUpperCase();
    const p = propertyById(key) ?? mlsCatalog().find((x) => x.name.toLowerCase().includes(args.join(" ").toLowerCase()));
    if (!p) return { ok: false, message: "Usage : /mls | /mls C-COM | /tp mls" };
    useGameStore.getState().openDeed(p.id);
    return { ok: true, message: `MLS · ${p.name}` };
  }
  if (cmd === "status" || cmd === "stats" || cmd === "whoami") return { ok: true, message: ctx.status() };

  if (cmd === "surv" || cmd === "survival" || cmd === "vie") {
    if (!arg0 || arg0 === "reset" || arg0 === "full") {
      ctx.setSurv({ ...FRESH_SURVIVAL });
      return { ok: true, message: "Survie métabolique réinitialisée aux normes de santé." };
    }
    if (arg0 === "starve" || arg0 === "faim") {
      ctx.setSurv({ hunger: 8, thirst: 10, energy: 20, alerts: ["famine", "deshydratation"] });
      return { ok: true, message: "Citoyen affamé et déshydraté." };
    }
    if (arg0 === "freeze" || arg0 === "froid") {
      // CORRECTION: Utilisation de 'temp' au lieu de 'bodyTemp'
      ctx.setSurv({ bodyTemp: 33.4, shiver: 1, alerts: ["hypothermie_moderee"] } as any); // Type cast implicite
      return { ok: true, message: "État d'hypothermie provoqué." };
    }
    if (arg0 === "heat" || arg0 === "chaleur") {
      // CORRECTION: Utilisation de 'temp' au lieu de 'bodyTemp'
      ctx.setSurv({ bodyTemp: 39.6, thirst: 12, alerts: ["coup_de_chaleur"] } as any); // Type cast implicite
      return { ok: true, message: "Choc thermique appliqué." };
    }
    return { ok: false, message: "Usage : /surv reset|starve|freeze|heat" };
  }

  if (cmd === "job" || cmd === "emploi" || cmd === "metier") {
    if (!arg0) return { ok: true, message: RP_JOBS.map((j) => `${j.id} · ${j.name}`).join("\n") };
    if (!ctx.setJob(arg0)) return { ok: false, message: `Emploi inconnu : ${arg0}` };
    return { ok: true, message: `Emploi · ${arg0}` };
  }
  if (cmd === "jobs" || cmd === "emplois") {
    return { ok: true, message: RP_JOBS.map((j) => `${j.id} · ${j.name} · ${j.salary}\u00a0$`).join("\n") };
  }
  if (cmd === "gang") {
    if (!arg0 || arg0 === "list") return { ok: true, message: GANGS.map((g) => `${g.id} · ${g.name}`).join("\n") };
    if (arg0 === "leave" || arg0 === "quitter") {
      ctx.setGang(null);
      return { ok: true, message: "Gang quitté." };
    }
    if (!ctx.setGang(arg0.toUpperCase().startsWith("G-") ? arg0.toUpperCase() : arg0)) {
      return { ok: false, message: "Usage : /gang G-01|G-02|leave" };
    }
    return { ok: true, message: `Gang · ${arg0}` };
  }
  if (cmd === "firm" || cmd === "entreprise" || cmd === "req") {
    if (!arg0) return { ok: true, message: FIRM_TYPES.map((f) => `${f.type} · ${f.label}`).join("\n") };
    const type = FIRM_TYPES.find((f) => f.type === arg0 || f.type === (arg0 === "resto" ? "restaurant" : arg0))?.type;
    if (!type) return { ok: false, message: "Usage : /firm cafe|depanneur|restaurant|bar|garage|paysagiste|deneigement|transport|construction|securite|forestiere|immobilier" };
    if (!ctx.foundFirm(type)) return { ok: false, message: "Fonds du compte Desjardins insuffisants." };
    return { ok: true, message: `Enregistrement REQ · ${type}` };
  }
  if (cmd === "hire" || cmd === "embaucher") {
    const ok = ctx.hireStaff();
    return { ok, message: ok ? "Embauche complétée (Coût: 80$)" : "Impossible d'embaucher." };
  }
  if (cmd === "mapaq" || cmd === "grant" || cmd === "subvention") {
    if (!arg0 || arg0 === "list") {
      return { ok: true, message: MAPAQ_GRANTS.map((g) => `${g.id} · ${g.short} · ${g.base}\u00a0$`).join("\n") };
    }
    const spec = MAPAQ_GRANTS.find((g) => g.id === arg0 || g.short.toLowerCase() === arg0 || g.id.startsWith(arg0));
    if (!spec) return { ok: false, message: "Usage : /mapaq proximite|pta|padaar|releve|alimentsqc" };
    if (!ctx.applyGrant(spec.id)) return { ok: false, message: "Demande rejetée (Permis faune, agricole ou déjà réclamée)." };
    return { ok: true, message: `Subvention MAPAQ octroyée : ${spec.name}` };
  }
  if (cmd === "semer" || cmd === "seed" || cmd === "graines") {
    if (!arg0) return { ok: true, message: Object.values(CROPS).map((c) => `${c.id} · ${c.label}`).join("\n") };
    return { ok: true, message: ctx.sow(arg0) };
  }
  if (cmd === "pay" || cmd === "paie" || cmd === "payroll") {
    ctx.payroll();
    return { ok: true, message: "Période de paie complétée. Salaires nets versés." };
  }
  if (cmd === "bank" || cmd === "banque") {
    const n = Number(args[0]);
    if (!Number.isFinite(n)) return { ok: false, message: "Usage : /bank <montant>" };
    ctx.addBank(n);
    return { ok: true, message: `Compte Desjardins ajusté de ${n >= 0 ? "+" : ""}${n}\u00a0$` };
  }

  if (cmd === "outfit" || cmd === "tenue") {
    if (!arg0) return { ok: true, message: OUTFITS.map((o) => o.id).join(", ") };
    if (!OUTFITS.some((o) => o.id === arg0)) return { ok: false, message: `Tenue inconnue : ${arg0}` };
    ctx.setLook({ outfit: arg0 as Appearance["outfit"] });
    return { ok: true, message: `Tenue assignée · ${arg0}` };
  }
  if (cmd === "aura") {
    if (!arg0) return { ok: true, message: AURAS.map((a) => a.id).join(", ") };
    if (!AURAS.some((a) => a.id === arg0)) return { ok: false, message: `Aura inconnue : ${arg0}` };
    ctx.setLook({ aura: arg0 as Appearance["aura"] });
    return { ok: true, message: `Effet d'aura activé · ${arg0}` };
  }
  if (cmd === "model" || cmd === "modele") {
    if (!arg0) return { ok: true, message: MODELS.map((m) => m.id).join(", ") };
    if (!MODELS.some((m) => m.id === arg0)) return { ok: false, message: MODELS.map((m) => m.id).join("|") };
    ctx.setLook({ model: arg0 as Appearance["model"] });
    return { ok: true, message: `Modèle corporel · ${arg0}` };
  }
  if (cmd === "face") {
    const n = Number(args[0]);
    if (!Number.isFinite(n) || n < 0 || n > 7) return { ok: false, message: "Usage : /face 0-7" };
    ctx.setLook({ face: n });
    return { ok: true, message: `Visage sélectionné · ${n}` };
  }
  if (cmd === "skin") {
    const n = Number(args[0]);
    if (!Number.isFinite(n) || n < 0 || n > 7) return { ok: false, message: "Usage : /skin 0-7" };
    ctx.setLook({ skin: n });
    return { ok: true, message: `Mélanine de peau ajustée · ${n}` };
  }

  if (cmd === "tool" || cmd === "outil" || cmd === "pack" || cmd === "sac") {
    if (!arg0) return { ok: true, message: "Usage : /tool <id>  ·  /pack <id>" };
    if (!ctx.equip(arg0)) return { ok: false, message: `Équipement introuvable : ${arg0}` };
    return { ok: true, message: `Équipement en main · ${arg0}` };
  }
  if (cmd === "kit") {
    ctx.kit();
    return { ok: true, message: "Équipements administratifs de base accordés." };
  }
  if (cmd === "inv" || cmd === "inventory") {
    return { ok: true, message: ctx.status() };
  }
  if (cmd === "clearinv" || cmd === "empty") {
    ctx.clearInv();
    return { ok: true, message: "Inventaire et sac détruits." };
  }

  if (cmd === "build" || cmd === "builder" || cmd === "construire") {
    ctx.toggleBuild();
    return { ok: true, message: "Mode édition du comté basculé." };
  }
  if (cmd === "clearbuild" || cmd === "clearprops") {
    ctx.clearBuild();
    return { ok: true, message: "Tous les objets personnalisés du secteur ont été rasés." };
  }
  if (cmd === "undo" || cmd === "annuler") {
    return { ok: true, message: ctx.undoBuild() };
  }
  if (cmd === "del" || cmd === "delete" || cmd === "remove" || cmd === "suppr") {
    return { ok: true, message: ctx.removeNear() };
  }
  if (cmd === "dup" || cmd === "copy" || cmd === "clone" || cmd === "dupliquer") {
    return { ok: true, message: ctx.dupNear() };
  }
  if (cmd === "select" || cmd === "pick" || cmd === "ghost") {
    if (!arg0) return { ok: true, message: "Usage : /select <id_objet>" };
    if (!isPropId(arg0)) {
      const hits = searchModels(args.join(" ")).slice(0, 8);
      return { ok: false, message: hits.length ? hits.map((h) => h.id).join(" ") : "Élément introuvable." };
    }
    ctx.selectBuild(arg0);
    return { ok: true, message: `Objet fantôme : ${arg0} (E pour poser)` };
  }
  if (cmd === "rotate" || cmd === "rot" || cmd === "yaw") {
    const deg = args[0] === undefined ? undefined : Number(args[0]);
    if (args[0] !== undefined && !Number.isFinite(deg)) return { ok: false, message: "Usage : /rotate [angle]" };
    return { ok: true, message: ctx.rotateBuild(deg) };
  }
  if (cmd === "scale" || cmd === "taille" || cmd === "echelle") {
    const n = Number(args[0]);
    if (!Number.isFinite(n)) return { ok: false, message: "Usage : /scale 0.25-6" };
    return { ok: true, message: ctx.scaleBuild(n) };
  }
  if (cmd === "snap" || cmd === "grille") {
    const n = args[0] === undefined ? 1 : Number(args[0]);
    if (!Number.isFinite(n) || n < 0) return { ok: false, message: "Usage : /snap <0|0.5|1>" };
    return { ok: true, message: ctx.snapBuild(n) };
  }
  if (cmd === "props" || cmd === "placed") {
    return { ok: true, message: ctx.propsInfo() };
  }
  if (cmd === "unlock" || cmd === "ouvrir") {
    ctx.unlockHotel(true);
    return { ok: true, message: "Verrous d'hôtel de secours ouverts." };
  }
  if (cmd === "lock" || cmd === "verrou") {
    ctx.unlockHotel(false);
    return { ok: true, message: "Verrous d'hôtel de secours condamnés." };
  }
  if (cmd === "tv") {
    const on = ctx.toggleTv();
    return { ok: true, message: on ? "Moniteur vidéo activé" : "Moniteur vidéo désactivé" };
  }
  if (cmd === "bell" || cmd === "cloche") {
    ctx.bell();
    return { ok: true, message: "Ding." };
  }
  if (cmd === "lights" || cmd === "lustres") {
    ctx.lights();
    return { ok: true, message: "Éclairages principaux basculés." };
  }
  if (cmd === "elev" || cmd === "ascenseur") {
    ctx.elevator();
    return { ok: true, message: "Ascenseur activé." };
  }
  if (cmd === "camera" || cmd === "cam") {
    const alias: Record<string, CameraMode> = {
      chase: "chase",
      hood: "hood",
      capot: "hood",
      far: "far",
      loin: "far",
      fps: "fps",
      first: "fps",
      top: "top",
      air: "top",
    };
    const mode = alias[arg0];
    if (!mode || !CAMERA_CYCLE.includes(mode)) {
      return { ok: false, message: "Usage : /camera chase|hood|far|fps|top" };
    }
    ctx.setCamera(mode);
    return { ok: true, message: `Vue caméra : ${CAMERA_LABEL[mode]}` };
  }
  if (cmd === "emote" || cmd === "geste" || cmd === "gesture") {
    const id = (arg0 || "none") as RpGesture;
    if (id !== "none" && !isGesture(id)) {
      return { ok: false, message: `Usage : /emote ${GESTURE_IDS.join("|")}|none` };
    }
    ctx.playGesture(id);
    return { ok: true, message: `Geste lancé : ${id}` };
  }

  if (cmd === "floor" || cmd === "etage" || cmd === "interieur") {
    const id = FLOORS[arg0];
    if (!id) return { ok: false, message: "Usage : /floor lobby|chambre|couloir|appart|prison|depanneur|caisse|sqdc" };
    ctx.floor(id);
    return { ok: true, message: `Finition d'intérieur chargée : ${id}` };
  }
  if (cmd === "lobby") {
    ctx.floor("lobby");
    return { ok: true, message: "Hall d'entrée" };
  }
  if (cmd === "car" || cmd === "veh" || cmd === "vehicule") {
    if (!arg0) return { ok: true, message: `Véhicules SAAQ : ${FLEET.map((v) => v.id).join(", ")}` };
    if (!ctx.giveCar(arg0)) return { ok: false, message: `Modèle absent du catalogue : ${arg0}` };
    return { ok: true, message: `Clés de contact accordées pour le véhicule : ${arg0}` };
  }
  if (cmd === "cars" || cmd === "flotte") {
    return { ok: true, message: FLEET.map((v) => `${v.id} · ${v.name}`).join("\n") };
  }
  if (cmd === "item" || cmd === "giveitem" || cmd === "objet") {
    if (!arg0) return { ok: true, message: CATALOG.map((i) => i.id).join(", ") };
    const n = args[1] ? Number(args[1]) : 1;
    if (!Number.isFinite(n) || n <= 0) return { ok: false, message: "Usage : /item <id> [quantité]" };
    if (!ctx.giveItem(arg0, n)) return { ok: false, message: `Objet absent du registre : ${arg0}` };
    return { ok: true, message: `Ajouté au sac : +${n} ${arg0}` };
  }
  if (cmd === "items") return { ok: true, message: CATALOG.map((i) => i.id).join(", ") };
  if (cmd === "walk" || cmd === "pied") {
    ctx.walk();
    return { ok: true, message: "Sorti du véhicule." };
  }
  if (cmd === "drive" || cmd === "conduire") {
    ctx.drive();
    return { ok: true, message: "Installé au poste de conduite." };
  }

  if (cmd === "tp" || cmd === "teleport" || cmd === "goto") {
    if (!args[0]) return { ok: false, message: "Usage : /tp spawn|champs|ferme|illicite|erabliere|depanneur|portneuf|x z" };
    const key = args[0].toLowerCase().replace(/\s+/g, "");
    const aliases: Record<string, string> = {
      hotel: "pont_hotel",
      ether: "ether",
      boutique: "ether",
      pontrouge: "pont_rouge",
      saintalban: "saint_alban",
      alban: "saint_alban",
      casimir: "saint_casimir",
      raymond: "saint_raymond",
      eboulis: "alban_eboulis",
      plage: "alban_plage",
      marmites: "casimir_marmites",
      faune: "faune_laurentides",
      sq: "portneuf_sq",
      jail: "portneuf_sq",
      prison: "donnacona_prison",
      penitencier: "donnacona_prison",
      donnacona_prison: "donnacona_prison",
      poste: "portneuf_sq",
      capsante: "cap_sante",
      "cap-sante": "cap_sante",
      donnacona: "donnacona",
      papeterie: "donnacona_papeterie",
      usine: "donnacona_papeterie",
      mill: "donnacona_papeterie",
      neuville: "neuville",
      grondines: "grondines",
      basile: "saint_basile",
      saintbasile: "saint_basile",
      deschambault: "deschambault",
      marc: "saint_marc",
      saintmarc: "saint_marc",
      champs: "rang_grondines_ouest",
      ferme: "rang_deschambault_ouest",
      rang: "rang_grondines_ouest",
      vaches: "rang_grondines_ouest",
      lait: "rang_grondines_ouest",
      poules: "rang_grondines_ouest",
      illicite: "farm_illicite_alban",
      cannabis: "farm_illicite_alban",
      erabliere: "erable_alban",
      cabane: "erable_alban",
      sirop: "erable_raymond",
      erable: "erable_alban",
      coulee: "erable_alban",
      depanneur: "depanneur",
      dep: "depanneur",
      beausoir: "depanneur",
      a40: "a40_261",
      echangeur: "a40_261",
      sortie250: "a40_250",
      sortie254: "a40_254",
      sortie257: "a40_257",
      sortie261: "a40_261",
      sortie269: "a40_269",
      sortie274: "a40_274",
      sortie281: "a40_281",
      sortie285: "a40_285",
    };
    const dest = PRESETS[key] ?? PRESETS[aliases[key] ?? ""];
    if (dest) {
      ctx.teleport(dest.x, dest.z + (Math.abs(dest.z - 4) < 8 ? 0 : 8));
      return { ok: true, message: `Téléportation réussie vers : ${dest.name}` };
    }
    const x = Number(args[0]);
    const z = Number(args[1]);
    if (Number.isFinite(x) && Number.isFinite(z)) {
      ctx.teleport(x, z);
      return { ok: true, message: `Téléportation aux coordonnées de la grille : (${x.toFixed(0)}, ${z.toFixed(0)})` };
    }
    return { ok: false, message: `Secteur non répertorié : ${args[0]}` };
  }
  if (cmd === "cash" || cmd === "give" || cmd === "argent") {
    const n = Number(args[0]);
    if (!Number.isFinite(n)) return { ok: false, message: "Usage : /cash <montant>" };
    ctx.addCash(n, `Portefeuille ajusté de ${n >= 0 ? "+" : ""}${n}\u00a0$`);
    return { ok: true, message: `Ajustement monétaire liquide complété.` };
  }
  if (cmd === "night" || cmd === "nuit") {
    ctx.toggleNight();
    return { ok: true, message: "Fuseau horaire basculé." };
  }
  if (cmd === "god" || cmd === "godmode") {
    const next = !ctx.god;
    ctx.setGod(next);
    return { ok: true, message: next ? "Godmode activé (Immunité vitale et contraventionnelle)." : "Godmode désactivé." };
  }
  if (cmd === "heal" || cmd === "respawn" || cmd === "revive") {
    ctx.heal();
    return { ok: true, message: "Soins intensifs prodigués. Métabolisme restauré." };
  }
  if (cmd === "hurt" || cmd === "blesse" || cmd === "injured") {
    if (!arg0 || arg0 === "list") {
      return { ok: true, message: INJURED_CLIPS.join("\n") };
    }
    if (arg0 === "clear" || arg0 === "off") {
      ctx.hurt("clear");
      return { ok: true, message: "Traumatismes physiques résolus." };
    }
    const clip = parseInjuredClip(args.join("_") || arg0);
    return { ok: true, message: ctx.hurt(clip) };
  }
  if (cmd === "hunt" || cmd === "chasse" || cmd === "faune") {
    return { ok: true, message: ctx.hunt() };
  }
  if (cmd === "fx" || cmd === "effect" || cmd === "effet") {
    const id = (arg0 || "list").toLowerCase();
    if (id === "list" || id === "help") return { ok: true, message: listFx() };
    if (id === "clear" || id === "stop") {
      ctx.clearFx();
      return { ok: true, message: "Effets spéciaux réinitialisés." };
    }
    if (!(id in ADMIN_EFFECTS) && !ADMIN_EFFECT_IDS.includes(id as typeof ADMIN_EFFECT_IDS[number])) {
      return { ok: false, message: "Usage : /fx lightning|meteor|list|clear" };
    }
    if (!ctx.playFx(id)) return { ok: false, message: `Effet introuvable : ${id}` };
    return { ok: true, message: `${ADMIN_EFFECTS[id as keyof typeof ADMIN_EFFECTS].icon} ${ADMIN_EFFECTS[id as keyof typeof ADMIN_EFFECTS].name}` };
  }
  if (cmd === "fly" || cmd === "vol") {
    ctx.toggleFly();
    return { ok: true, message: "Mode vol libre basculé. (MAJ = Monter, ESPACE = Descendre)" };
  }
  if (cmd === "noclip" || cmd === "clip") {
    ctx.toggleNoclip();
    return { ok: true, message: "Noclip physique désactivé." };
  }
  if (cmd === "vanish" || cmd === "invis" || cmd === "ghost") {
    const on = ctx.vanish();
    return { ok: true, message: on ? "Vanish activé. Vous êtes invisible pour les citoyens." : "Visible à nouveau." };
  }
  if (cmd === "freeze") {
    ctx.freeze(true);
    return { ok: true, message: "Citoyen immobilisé." };
  }
  if (cmd === "unfreeze" || cmd === "degeler" || cmd === "dégeler") {
    ctx.freeze(false);
    return { ok: true, message: "Citoyen dégelé." };
  }
  if (cmd === "slap") {
    const force = parseFloat(arg0) || 10;
    ctx.slap(force);
    return { ok: true, message: `Slap appliqué de force: +${force} m` };
  }
  if (cmd === "smite" || cmd === "foudre") {
    ctx.smite();
    return { ok: true, message: "Foudre punitive abattue." };
  }
  if (cmd === "etherpulse" || cmd === "pulse") {
    ctx.etherPulse();
    return { ok: true, message: "Onde d'énergie atmosphérique libérée sur le comté." };
  }
  if (cmd === "mute") {
    ctx.mute(true);
    // AJOUT v2.1 — trace la sanction si une cible explicite est fournie
    if (args[0]) {
      const targetId = resolveStaffId(args[0]);
      issueSanction({
        type: "mute",
        targetId,
        targetName: args[0],
        moderatorId: LOCAL_PLAYER_ID,
        moderatorName: getDisplayName(LOCAL_PLAYER_ID),
        reason: args.slice(1).join(" ") || "Non spécifié",
      });
    }
    return { ok: true, message: "Fréquences radio du citoyen coupées (Mute)." };
  }
  if (cmd === "unmute") {
    ctx.mute(false);
    return { ok: true, message: "Ondes radio réouvertes." };
  }
  if (cmd === "kick") {
    const who = args[0] || useGameStore.getState().appearance.name;
    const reason = args.slice(1).join(" ") || "Non spécifié";
    // AJOUT v2.1 — sanction réellement enregistrée (auparavant non tracée)
    issueSanction({
      type: "kick",
      targetId: resolveStaffId(who),
      targetName: who,
      moderatorId: LOCAL_PLAYER_ID,
      moderatorName: getDisplayName(LOCAL_PLAYER_ID),
      reason,
    });
    return { ok: true, message: ctx.kickPeer(who) };
  }
  if (cmd === "ban") {
    const who = args[0] || useGameStore.getState().appearance.name;
    const reason = args.slice(1).join(" ") || "Violation grave des règles";
    // AJOUT v2.1 — sanction réellement enregistrée (auparavant non tracée)
    issueSanction({
      type: "ban",
      targetId: resolveStaffId(who),
      targetName: who,
      moderatorId: LOCAL_PLAYER_ID,
      moderatorName: getDisplayName(LOCAL_PLAYER_ID),
      reason,
    });
    const msg = ctx.kickPeer(who);
    ctx.announce(`BANNISSEMENT PERMANENT : ${who} a été banni du comté. Motif : ${reason}`);
    return { ok: true, message: `Ban effectué · ${who} · ${reason}` };
  }
  if (cmd === "unban") {
    const who = args[0] || "joueur";
    // AJOUT v2.1 — lève réellement la sanction active si elle existe
    const targetId = resolveStaffId(who);
    const active = isBanned(targetId);
    if (active) revokeSanction(active.id, LOCAL_PLAYER_ID, "Grâce administrative");
    ctx.announce(`${who} gracié et débanni.`);
    return { ok: true, message: `${who} débanni.` };
  }
  if (cmd === "warn") {
    const who = args[0] || useGameStore.getState().appearance.name;
    const reason = args.slice(1).join(" ") || "manquement aux règles civiques";
    // AJOUT v2.1 — sanction tracée + compteur 3 avertissements → ban auto
    const targetId = resolveStaffId(who);
    issueSanction({
      type: "warn",
      targetId,
      targetName: who,
      moderatorId: LOCAL_PLAYER_ID,
      moderatorName: getDisplayName(LOCAL_PLAYER_ID),
      reason,
    });
    const warnCount = getActiveWarns(targetId).length;
    ctx.announce(`⚠️ AVERTISSEMENT OFFICIEL : ${who} pour ${reason} (${warnCount}/3)`);
    return { ok: true, message: `Avertissement enregistré pour ${who} · ${warnCount}/3 avant bannissement automatique` };
  }
  if (cmd === "staffchat" || cmd === "sc" || cmd === "staff") {
    const text = args.join(" ").trim();
    if (!text) return { ok: false, message: "Usage : /staffchat <texte>" };
    ctx.say(`[STAFF] ${text}`);
    return { ok: true, message: text };
  }
  if (cmd === "ooc") {
    const text = args.join(" ").trim();
    if (!text) return { ok: false, message: "Usage : /ooc <texte>" };
    ctx.say(`(( [OOC] ${text} ))`);
    return { ok: true, message: text };
  }
  if (cmd === "ad" || cmd === "pub") {
    const text = args.join(" ").trim();
    if (!text) return { ok: false, message: "Usage : /ad <texte>" };
    ctx.announce(`[ANNONCE PUBLIQUE] ${text}`);
    return { ok: true, message: text };
  }
  if (cmd === "fix" || cmd === "repair" || cmd === "repairall") {
    ctx.repairAll();
    return { ok: true, message: "Châssis et motorisation du véhicule remis à neuf." };
  }
  if (cmd === "clean" || cmd === "cleanup") {
    ctx.clearBuild();
    ctx.repairAll();
    return { ok: true, message: "Nettoyage général effectué (Ravage du mobilier et des épaves)." };
  }
  if (cmd === "maxstats") {
    ctx.maxStats();
    return { ok: true, message: "Satiété, Hydratation, Température et Énergie restaurées à 100%." };
  }
  if (cmd === "setarmor" || cmd === "armor" || cmd === "gilet") {
    const n = parseInt(args[1] || args[0] || "100", 10);
    ctx.setArmor(Number.isFinite(n) ? n : 100);
    return { ok: true, message: `Gilet pare-balles de niveau : ${Number.isFinite(n) ? n : 100}%` };
  }
  if (cmd === "giveweapon" || cmd === "gw") {
    const id = (args[1] || args[0] || "couteau-chasse").toLowerCase();
    if (!ctx.giveItem(id, 1)) return { ok: false, message: `Arme absente du catalogue : ${id}` };
    return { ok: true, message: `Arme ajoutée à l'inventaire : ${id}` };
  }
  if (cmd === "givecash") {
    const n = Number(args[1] ?? args[0]);
    if (!Number.isFinite(n)) return { ok: false, message: "Usage : /givecash [id_joueur] <montant>" };
    ctx.addCash(n, `Transaction cash : ${n}\u00a0$`);
    return { ok: true, message: `Transfert cash complété.` };
  }
  if (cmd === "givebank") {
    const n = Number(args[1] ?? args[0]);
    if (!Number.isFinite(n)) return { ok: false, message: "Usage : /givebank [id_joueur] <montant>" };
    ctx.addBank(n);
    return { ok: true, message: `Dépôt Desjardins complété.` };
  }
  if (cmd === "setjob") {
    if (!arg0) return { ok: false, message: "Usage : /setjob <id_job>" };
    const job = args[1] || args[0];
    if (!ctx.setJob(job)) return { ok: false, message: `Métier inexistant : ${job}` };
    return { ok: true, message: `Rôle professionnel modifié : ${job}` };
  }
  if (cmd === "setskin") {
    if (!arg0) return { ok: false, message: "Usage : /setskin <id_model>" };
    ctx.setLook({ model: (args[1] || args[0]) as Appearance["model"] });
    return { ok: true, message: `Modèle 3D changé : ${args[1] || args[0]}` };
  }
  if (cmd === "stafflist" || cmd === "staffs") {
    const lines = getAllStaffMembers().map(formatStaffLine);
    return { ok: true, message: lines.join("\n") || "Aucun personnel du staff en ligne." };
  }
  if (cmd === "promote" || cmd === "promo" || cmd === "rankup") {
    const id = resolveStaffId(args[0] || LOCAL_PLAYER_ID);
    const preview = ROLE_LADDER[ROLE_LADDER.indexOf(getUserRole(id)) + 1];
    if (id !== LOCAL_PLAYER_ID && preview && !canChangeRole(LOCAL_PLAYER_ID, preview)) {
      return { ok: false, message: "Autorité insuffisante pour assigner ce grade." };
    }
    const next = promoteUser(id);
    useGameStore.getState().syncStaff(id);
    const row = snapshotStaff().find((e) => e.identifier === id);
    return { ok: true, message: `Promotion effectuée · ${row ? formatStaffLine(row) : getRoleBadgeStyle(next).label}` };
  }
  if (cmd === "demote" || cmd === "rankdown") {
    const id = resolveStaffId(args[0] || LOCAL_PLAYER_ID);
    const next = demoteUser(id);
    useGameStore.getState().syncStaff(id);
    return { ok: true, message: `Rétrogradation effectuée · ${getRoleBadgeStyle(next).label}` };
  }
  if (cmd === "setrole" || cmd === "setrank" || cmd === "grade") {
    const roleRaw = args.length >= 2 ? args[1] : args[0];
    const id = args.length >= 2 ? resolveStaffId(args[0] ?? "") : LOCAL_PLAYER_ID;
    const role = parseAdminRole(roleRaw ?? "");
    if (!role) return { ok: false, message: "Usage : /setrole [id_joueur] helper|mod|admin|superadmin|owner|dev" };
    if (!canChangeRole(LOCAL_PLAYER_ID, role) && id !== LOCAL_PLAYER_ID && getUserRole(LOCAL_PLAYER_ID) !== getUserRole(id)) {
      return { ok: false, message: "Autorité de grade supérieure requise." };
    }
    setUserRole(id, role);
    useGameStore.getState().syncStaff(id);
    return { ok: true, message: `Grade assigné · ${id} · ${getRoleBadgeStyle(role).label}` };
  }
  if (cmd === "setrpjob" || cmd === "setjobrole") {
    const jobRaw = args.length >= 2 ? args.slice(1).join(" ") : args[0];
    const id = args.length >= 2 ? resolveStaffId(args[0] ?? "") : LOCAL_PLAYER_ID;
    const job = parseRpJobRole(jobRaw ?? "");
    if (!job) return { ok: false, message: "Usage : /setrpjob [id] policier|ambulancier|mecanicien|maire|juge" };
    setUserJob(id, job);
    useGameStore.getState().syncStaff(id);
    return { ok: true, message: `Rôle staff RP attribué · ${id} · ${job}` };
  }
  if (cmd === "tpspawn") {
    ctx.teleport(PRESETS.spawn.x, PRESETS.spawn.z);
    return { ok: true, message: `TP vers le point de réapparition officiel.` };
  }
  if (cmd === "tppolice" || cmd === "tpsq") {
    ctx.jail();
    return { ok: true, message: "TP au quartier général de la Sûreté du Québec." };
  }
  if (cmd === "tpbkf" || cmd === "tpbank") {
    const p = PRESETS.caisse ?? PRESETS.spawn;
    ctx.teleport(p.x, p.z);
    return { ok: true, message: `TP à la Caisse populaire Desjardins.` };
  }
  if (cmd === "tphotel") {
    const p = PRESETS.pont_hotel ?? PRESETS.spawn;
    ctx.teleport(p.x, p.z);
    return { ok: true, message: `TP vers l'Hôtel municipal.` };
  }
  if (cmd === "tpshop") {
    const p = PRESETS.depanneur ?? PRESETS.spawn;
    ctx.teleport(p.x, p.z);
    return { ok: true, message: `TP au dépanneur Beausoir du comté.` };
  }
  if (cmd === "tpdojo") {
    const p = PRESETS.portneuf_sq ?? PRESETS.spawn;
    ctx.teleport(p.x, p.z);
    return { ok: true, message: `TP au poste de Portneuf.` };
  }
  if (cmd === "tppos") {
    const x = parseFloat(args[0]);
    const z = parseFloat(args[2] ?? args[1]);
    if (!Number.isFinite(x) || !Number.isFinite(z)) return { ok: false, message: "Usage : /tppos <x> <z>" };
    ctx.teleport(x, z);
    return { ok: true, message: `TP aux coordonnées : (${x.toFixed(0)}, ${z.toFixed(0)})` };
  }
  if (cmd === "gethere") {
    return { ok: true, message: "Réseau local actif." };
  }
  if (cmd === "kickall") {
    return { ok: true, message: "Tous les invités ont été déconnectés." };
  }
  if (cmd === "weather" || cmd === "meteo" || cmd === "météo") {
    const raw = arg0 || "clear";
    const condMap: Record<string, WeatherCondition> = {
      clear: "ensoleille",
      ensoleille: "ensoleille",
      rain: "pluie_fine",
      pluie: "pluie_fine",
      snow: "poudrerie",
      neige: "poudrerie",
      poudrerie: "poudrerie",
      fog: "nuageux",
      nuageux: "nuageux",
      storm: "orage_ete",
      orage: "orage_ete",
      blizzard: "tempete_neige",
      tempete: "tempete_neige",
      verglas: "verglas",
      polaire: "froid_polaire",
    };
    const cond = condMap[raw];
    if (!cond) return { ok: false, message: "Usage : /weather clear|rain|snow|fog|storm|poudrerie|blizzard|verglas|polaire" };
    if (cond === "tempete_neige") ctx.triggerBlizzard();
    else {
      quebecSeasons.setCondition(cond);
      ctx.setWeather(
        cond === "ensoleille" ? "clear" : cond === "pluie_fine" ? "rain" : cond === "nuageux" ? "fog" : cond === "orage_ete" ? "storm" : cond === "verglas" ? "storm" : "snow",
      );
    }
    const wx = quebecSeasons.getState();
    return { ok: true, message: `Météo globale forcée : ${CONDITION_LABEL[wx.condition]} · ${wx.temperatureCelsius} °C` };
  }
  if (cmd === "season" || cmd === "saison") {
    const id = (arg0 === "été" ? "ete" : arg0) as QuebecSeason;
    if (id !== "printemps" && id !== "ete" && id !== "automne" && id !== "hiver") {
      return { ok: false, message: "Usage : /season printemps|ete|automne|hiver" };
    }
    ctx.setSeason(id);
    return { ok: true, message: `Saison modifiée : ${SEASON_LABEL[id]}` };
  }
  if (cmd === "blizzard" || cmd === "tempete" || cmd === "tempête") {
    ctx.triggerBlizzard();
    return { ok: true, message: "Tempête majeure déclarée. Chasse-neige et pelles en route." };
  }
  if (cmd === "plow" || cmd === "deneige" || cmd === "déneige" || cmd === "gratte") {
    return { ok: true, message: ctx.runPlow(arg0) };
  }
  if (cmd === "event" || cmd === "evenement" || cmd === "spawnevent") {
    return { ok: true, message: ctx.spawnEvent(arg0 || "blizzard") };
  }
  if (cmd === "time" || cmd === "heure") {
    const hour = parseFloat(arg0);
    if (!Number.isFinite(hour) || hour < 0 || hour > 24) return { ok: false, message: "Usage : /time 0-24" };
    ctx.setClock(hour);
    return { ok: true, message: `Heure de l'horloge : ${hour}:00` };
  }
  if (cmd === "announce" || cmd === "ann") {
    const text = args.join(" ").trim();
    if (!text) return { ok: false, message: "Usage : /announce <texte>" };
    ctx.announce(text);
    return { ok: true, message: text };
  }
  if (cmd === "hydro" || cmd === "hq") {
    ctx.forceOutage(null);
    return { ok: true, message: "Réseau électrique d'Hydro-Québec réarmé." };
  }
  if (cmd === "verglas" || cmd === "panne") {
    ctx.forceOutage(cmd === "verglas" ? "verglas" : "panne");
    return { ok: true, message: cmd === "verglas" ? "Alerte Verglas ! Transformateurs en surcharge." : "Blackout provoqué sur le comté." };
  }
  if (cmd === "bois" || cmd === "corde") {
    ctx.giveItem("corde_bois", 3);
    return { ok: true, message: "3 cordes de bois de chauffage ajoutées." };
  }
  if (cmd === "say" || cmd === "chat" || cmd === "me") {
    const text = args.join(" ").trim();
    if (!text) return { ok: false, message: "Usage : /say <texte>" };
    ctx.say(cmd === "me" ? `* ${text}` : text);
    return { ok: true, message: text };
  }
  if (cmd === "mat" || cmd === "material" || cmd === "mats") {
    if (!arg0 || arg0 === "list") {
      return { ok: true, message: `${ETHER_MAT_STATS.total} matériaux au registre.` };
    }
    const hits = searchEtherMats(args.join(" ")).slice(0, 12);
    if (!hits.length) return { ok: false, message: "Aucun élément trouvé." };
    const d = getEtherDef(hits[0].id);
    return { ok: true, message: hits.map((h) => `${h.id} · ${h.name}`).join("\n") + `\n→ ${d.id}` };
  }
  if (cmd === "geo" || cmd === "geom") {
    return { ok: true, message: ctx.geoStats() };
  }
  if (cmd === "gltf" || cmd === "glb" || cmd === "meshopt") {
    if (arg0) {
      const hit = GLTF_LIBRARY.find((a) => a.id === arg0 || a.url.includes(arg0));
      if (!hit) return { ok: false, message: "Assets disponibles : " + GLTF_LIBRARY.map((a) => a.id).join(" ") };
      return { ok: true, message: `${hit.id} · ${hit.container}\n${hit.url}` };
    }
    return { ok: true, message: describeGltf() };
  }
  if (cmd === "spawn" || cmd === "prop" || cmd === "place" || cmd === "poser") {
    if (!arg0) return { ok: true, message: `${TOTAL_MODELS} modèles · ${PROP_IDS.length} plaçables\n` + PROP_IDS.slice(0, 20).join(" ") };
    if (arg0 === "list" || arg0 === "search") {
      const q = args.slice(1).join(" ") || "sofa";
      const hits = searchModels(q).slice(0, 12);
      return { ok: true, message: hits.map((h) => `${h.id} · ${h.label}`).join("\n") || "Aucun objet correspondant." };
    }
    if (!isPropId(arg0)) {
      const hits = searchModels(args.join(" ")).slice(0, 8);
      return { ok: false, message: hits.length ? hits.map((h) => h.id).join(" ") : "Identifiant introuvable." };
    }
    if (!ctx.spawnProp(arg0)) return { ok: false, message: "Placement refusé par la grille physique." };
    return { ok: true, message: `Objet posé : ${arg0}` };
  }
  if (cmd === "anim") {
    if (!arg0) return { ok: true, message: ANIM_TYPES.join(" ") + " · clear" };
    return { ok: true, message: ctx.animNearest(arg0) };
  }
  if (cmd === "license" || cmd === "permis" || cmd === "pal") {
    const id = (arg0 || "pal") as LicenseId;
    if (id !== "pal" && id !== "pal_r" && id !== "chasse") {
      return { ok: false, message: "Usage : /license pal|pal_r|chasse" };
    }
    ctx.grantLic(id);
    return { ok: true, message: `Permis accordé : ${LICENSES[id].name}` };
  }
  if (cmd === "wanted" || cmd === "etoiles" || cmd === "stars") {
    const n = args[0] === undefined ? 3 : Number(args[0]);
    if (!Number.isFinite(n) || n < 0 || n > 5) return { ok: false, message: "Usage : /wanted 0-5" };
    ctx.setWanted(n);
    return { ok: true, message: n > 0 ? `Avis de recherche lancé : ${n}★` : "Dossier criminel suspendu." };
  }
  if (cmd === "clear" || cmd === "code4") {
    ctx.setWanted(0);
    return { ok: true, message: "Code 4 — Secteur sous contrôle, recherche annulée." };
  }
  if (cmd === "radio" || cmd === "fm") {
    if (!arg0) {
      ctx.cycleRadio();
      return { ok: true, message: "Station syntonisée suivante." };
    }
    if (!ctx.setRadio(arg0)) {
      return { ok: false, message: `Fréquences : ${QUEBEC_FM_STATIONS.map((s) => s.id).join(", ")}` };
    }
    return { ok: true, message: `Syntonisation FM : ${arg0}` };
  }
  if (cmd === "siren" || cmd === "gyro" || cmd === "gyrophare" || cmd === "lightbar") {
    const msg = ctx.cycleSiren();
    return { ok: true, message: msg };
  }
  if (cmd === "jail") {
    ctx.jail();
    return { ok: true, message: "Arrestation effectuée. Suspect emprisonné au poste SQ." };
  }
  if (cmd === "unjail") {
    ctx.unjail();
    return { ok: true, message: "Libéré sous caution. Téléportation vers la route 138." };
  }
  if (cmd === "prison" || cmd === "penitencier" || cmd === "cellule") {
    ctx.prison();
    return { ok: true, message: "Transfert carcéral : Pénitencier de Donnacona." };
  }
  if (cmd === "book" || cmd === "ecrouer") {
    // AJOUT v2.1 — l'écrouage ajoute désormais un chef au casier judiciaire
    const name = useGameStore.getState().appearance.name || "Citoyen";
    addCriminalCharge({
      identifier: LOCAL_PLAYER_ID,
      displayName: name,
      article: "Écrou C-38",
      description: "Écrouage carcéral",
      fine: 0,
      jailMonths: 1,
      officerId: LOCAL_PLAYER_ID,
    });
    return { ok: true, message: ctx.book() };
  }
  if (cmd === "lockdown" || cmd === "confinement") {
    ctx.lockdown();
    return { ok: true, message: "Lockdown appliqué sur la structure carcérale." };
  }
  if (cmd === "release" || cmd === "liberer") {
    ctx.release();
    return { ok: true, message: "Libération et levée d'écrou." };
  }
  if (cmd === "arrest" || cmd === "arrestation") {
    ctx.setWanted(5);
    ctx.prison();
    ctx.book();
    // AJOUT v2.1 — l'arrestation lourde ajoute un chef d'accusation formel
    const name = useGameStore.getState().appearance.name || "Citoyen";
    addCriminalCharge({
      identifier: LOCAL_PLAYER_ID,
      displayName: name,
      article: "Art. 145 C.cr.",
      description: "Interpellation lourde",
      fine: 500,
      jailMonths: 6,
      officerId: LOCAL_PLAYER_ID,
    });
    return { ok: true, message: "Interpolation lourde. Code criminel art. 145." };
  }
  if (cmd === "ticket" || cmd === "constat" || cmd === "contraven") {
    const code = args[0] || "CSR-328-1";
    if (code === "list" || code === "csr") {
      return { ok: true, message: CSR_CITATIONS.map((c) => `${c.code} · ${c.article} · ${c.fineAmount}$ · ${c.demeritPoints} pts`).join("\n") };
    }
    if (code !== "csr-328-1" && !citationByCode(code)) {
      return { ok: false, message: "Usage : /ticket <code_csr> (ex: CSR-329-GEV, CSR-202)" };
    }
    const name = useGameStore.getState().appearance.name || "Citoyen";
    // CORRECTION: notice est une string, pas un objet
    const noticeStr = police.issueTicket(code, name);
    useGameStore.getState().openCitation({ message: noticeStr, article: code, description: noticeStr, fine: 100, points: 0, kind: "ticket" });
    useGameStore.setState({ demeritPoints: police.demeritTotal, licenseSuspendedUntil: police.licenseSuspendedUntil });
    return { ok: true, message: noticeStr };
  }
  if (cmd === "alcotest" || cmd === "ethylotest" || cmd === "éthylotest" || cmd === "breathalyzer") {
    const mg = args[0] !== undefined ? Number(args[0]) : undefined;
    const name = useGameStore.getState().appearance.name || "Citoyen";
    const test = police.breathalyzer(name, Number.isFinite(mg as number) ? mg : undefined);
    // CORRECTION: Utilisation des propriétés correctes (bac au lieu de bloodAlcoholMgPercent, violation au lieu de isOverLegalLimit)
    useGameStore.setState({
      bloodAlcohol: test.bac,
      licenseSuspendedUntil: police.licenseSuspendedUntil,
      demeritPoints: police.demeritTotal,
      notice: test.violation
        ? `Éthylotest ${test.bac} mg · ALCOOLÉMIE EXCESSIVE · permis suspendu`
        : `Éthylotest ${test.bac} mg · sous la limite légale`,
    });
    if (test.violation) {
      const last = police.tickets[0];
      if (last) {
        useGameStore.getState().openCitation({
          kind: "ticket",
          article: last.article,
          description: last.description,
          fine: last.fine,
          points: last.demeritPoints ?? 4,
          message: `Art. 202 CSR · Éthylotest : ${test.bac} mg`,
          ticketNumber: last.ticketNumber,
          // CORRECTION: Utilisation de 'badge' au lieu de 'issuingOfficerBadge'
          badge: (last as any).issuingOfficerBadge || (last as any).badge,
        });
      }
    }
    return {
      ok: true,
      message: test.violation
        ? `Échantillon positif #${test.testId} · ${test.bac} mg · Saisie SAAQ immédiate`
        : `Échantillon négatif #${test.testId} · ${test.bac} mg`,
    };
  }
  if (cmd === "radar") {
    const msg = police.toggleRadar(args[0]);
    useGameStore.setState({ radarActive: police.units.some((u) => u.radarActive), notice: msg });
    return { ok: true, message: msg };
  }
  if (cmd === "patrouille" || cmd === "unites") {
    return { ok: true, message: police.patrolLines() };
  }
  if (cmd === "amende" || cmd === "amendes" || cmd === "payer") {
    const { paid, count } = police.payTicket();
    if (count === 0) return { ok: true, message: "Aucun constat impayé enregistré au dossier." };
    const i = useGameStore.getState();
    useGameStore.setState({
      cash: Math.round((i.cash - paid) * 100) / 100,
      fines: i.fines + paid,
      tickets: i.tickets.map((t: TicketRecord) => ({ ...t, paid: true })),
      notice: `${count} constat${count > 1 ? "s" : ""} payé(s) Desjardins · −${paid}\u00a0$`,
    });
    return { ok: true, message: `Paiement complété de ${count} constat(s) d'infraction.` };
  }
  if (cmd === "boire") {
    const bac = police.drinkBeer(36);
    useGameStore.setState({ bloodAlcohol: bac, notice: `Consommation de boisson alcoolisée · ${Math.round(bac)} mg / 100 ml` });
    return { ok: true, message: `Alcoolémie estimée : ${Math.round(bac)} mg (Limite SAAQ: ${SQ_LEGAL_BAC})` };
  }

  // ═══════════════════════════════════════════════════════
  // AJOUTS v2.1 — PRISE DE SERVICE
  // ═══════════════════════════════════════════════════════
  if (cmd === "duty" || cmd === "goduty") {
    const ds = toggleDuty(LOCAL_PLAYER_ID);
    return { ok: true, message: ds.onDuty ? "Prise de service confirmée. Bonne patrouille." : "Fin de service enregistrée." };
  }
  if (cmd === "dutystatus") {
    const ds = getDutyStatus(LOCAL_PLAYER_ID);
    if (!ds) return { ok: true, message: "Hors service." };
    const hrs = (ds.totalSecondsAllTime / 3600).toFixed(1);
    return { ok: true, message: `${ds.onDuty ? "🟢 En service" : "🔴 Hors service"} · ${hrs}h cumulées` };
  }

  // ═══════════════════════════════════════════════════════
  // AJOUTS v2.1 — SIGNALEMENTS JOUEURS
  // ═══════════════════════════════════════════════════════
  if (cmd === "report" || cmd === "signaler") {
    const reason = args.join(" ").trim();
    if (!reason) return { ok: false, message: "Usage : /report <raison>" };
    const name = useGameStore.getState().appearance.name || "Citoyen";
    createReport({ reporterId: LOCAL_PLAYER_ID, reporterName: name, reason });
    return { ok: true, message: "Signalement transmis au staff. Un membre y répondra sous peu." };
  }
  if (cmd === "reports") {
    if (arg0 === "claim" && args[1]) {
      const ok = claimReport(args[1], LOCAL_PLAYER_ID);
      return { ok, message: ok ? "Signalement pris en charge." : "Signalement introuvable." };
    }
    if (arg0 === "resolve" && args[1]) {
      const ok = resolveReport(args[1], LOCAL_PLAYER_ID, args.slice(2).join(" "));
      return { ok, message: ok ? "Signalement résolu." : "Signalement introuvable." };
    }
    const open = listOpenReports();
    return { ok: true, message: open.length ? open.map(formatReportLine).join("\n") : "Aucun signalement ouvert." };
  }

  // ═══════════════════════════════════════════════════════
  // AJOUTS v2.1 — AUDIT & TRANSPARENCE DES SANCTIONS
  // ═══════════════════════════════════════════════════════
  if (cmd === "audit") {
    const logs = getAuditLog({ limit: 15, actorId: arg0 && arg0 !== "all" ? resolveStaffId(arg0) : undefined });
    if (!logs.length) return { ok: true, message: "Aucune entrée d'audit." };
    return {
      ok: true,
      message: logs
        .map((l) => `[${new Date(l.timestamp).toLocaleTimeString("fr-CA")}] ${l.actorName} · /${l.command} ${l.args} · ${l.success ? "✓" : "✗"}`)
        .join("\n"),
    };
  }
  if (cmd === "warns") {
    const id = resolveStaffId(arg0 || LOCAL_PLAYER_ID);
    const warns = getActiveWarns(id);
    return {
      ok: true,
      message: warns.length
        ? `${warns.length} avertissement(s) actif(s) :\n` + warns.map((w) => `  • ${w.reason} (${new Date(w.createdAt).toLocaleDateString("fr-CA")})`).join("\n")
        : "Aucun avertissement actif.",
    };
  }
  if (cmd === "sanctions") {
    const id = resolveStaffId(arg0 || LOCAL_PLAYER_ID);
    const history = getSanctionHistory(id);
    return {
      ok: true,
      message: history.length
        ? history
            .slice(0, 10)
            .map((s) => `${s.type.toUpperCase()} · ${s.reason} · ${s.active ? "actif" : "levé"} · ${new Date(s.createdAt).toLocaleDateString("fr-CA")}`)
            .join("\n")
        : "Historique vierge.",
    };
  }

  // ═══════════════════════════════════════════════════════
  // AJOUTS v2.1 — CASIER JUDICIAIRE
  // ═══════════════════════════════════════════════════════
  if (cmd === "record" || cmd === "casier" || cmd === "rapsheet") {
    const id = resolveStaffId(arg0 || LOCAL_PLAYER_ID);
    return { ok: true, message: formatRapSheet(id) };
  }

  // ═══════════════════════════════════════════════════════
  // AJOUTS v2.1 — CENTRALE 911 / DISPATCH
  // ═══════════════════════════════════════════════════════
  if (cmd === "911" || cmd === "dispatch" || cmd === "sos") {
    if (!arg0) return { ok: true, message: `Codes disponibles : ${listDispatchCodes().join(", ")}` };
    const name = useGameStore.getState().appearance.name || "Citoyen";
    const call = createDispatchCall({
      code: arg0,
      callerId: LOCAL_PLAYER_ID,
      callerName: name,
      locationName: ctx.pos(),
      x: 0,
      z: 0,
      notes: args.slice(1).join(" "),
    });
    return { ok: true, message: `Appel transmis à la centrale · ${call.label} · unités en route.` };
  }
  if (cmd === "calls") {
    const active = listActiveDispatchCalls();
    return { ok: true, message: active.length ? active.map(formatDispatchLine).join("\n") : "Aucun appel actif." };
  }
  if (cmd === "respond" || cmd === "10-4") {
    if (!arg0) return { ok: false, message: "Usage : /respond <id_appel>" };
    const found = listActiveDispatchCalls().find((c) => c.id.endsWith(arg0));
    if (!found) return { ok: false, message: "Appel introuvable." };
    assignDispatchCall(found.id, LOCAL_PLAYER_ID);
    return { ok: true, message: `Unité assignée à l'appel ${found.label}.` };
  }
  if (cmd === "onscene" || cmd === "surplace") {
    if (!arg0) return { ok: false, message: "Usage : /onscene <id_appel>" };
    const found = listActiveDispatchCalls().find((c) => c.id.endsWith(arg0));
    if (!found) return { ok: false, message: "Appel introuvable." };
    markOnScene(found.id);
    return { ok: true, message: "Statut mis à jour : sur place." };
  }
  if (cmd === "clear911" || cmd === "codegreen") {
    if (!arg0) return { ok: false, message: "Usage : /clear911 <id_appel>" };
    const found = listActiveDispatchCalls().find((c) => c.id.endsWith(arg0));
    if (!found) return { ok: false, message: "Appel introuvable." };
    resolveDispatchCall(found.id, args.slice(1).join(" "));
    return { ok: true, message: "Appel classé résolu." };
  }

  // ═══════════════════════════════════════════════════════
  // AJOUTS v2.1 — PRIMES (BOUNTIES)
  // ═══════════════════════════════════════════════════════
  if (cmd === "bounty" || cmd === "prime") {
    const n = Number(args[1]);
    if (!args[0] || !Number.isFinite(n) || n <= 0) return { ok: false, message: "Usage : /bounty <id_joueur> <montant> [raison]" };
    const targetId = resolveStaffId(args[0]);
    const bounty = placeBounty({ targetId, targetName: args[0], amount: n, issuedBy: LOCAL_PLAYER_ID, reason: args.slice(2).join(" ") || "Non spécifié" });
    ctx.announce(`💰 PRIME DE ${n}$ placée sur la tête de ${args[0]} !`);
    return { ok: true, message: `Prime enregistrée · ${bounty.id.slice(-6)}` };
  }
  if (cmd === "bounties" || cmd === "primes") {
    const active = listActiveBounties();
    return { ok: true, message: active.length ? active.map(formatBountyLine).join("\n") : "Aucune prime active." };
  }
  if (cmd === "claimbounty" || cmd === "encaisser") {
    if (!arg0) return { ok: false, message: "Usage : /claimbounty <id_prime>" };
    const found = listActiveBounties().find((b) => b.id.endsWith(arg0));
    if (!found) return { ok: false, message: "Prime introuvable ou déjà réclamée." };
    claimBounty(found.id, LOCAL_PLAYER_ID);
    ctx.addCash(found.amount, `Prime encaissée : +${found.amount}$`);
    return { ok: true, message: `Prime de ${found.amount}$ encaissée sur ${found.targetName}.` };
  }

  // ═══════════════════════════════════════════════════════
  // AJOUTS v2.1 — FOURRIÈRE MUNICIPALE MTQ
  // ═══════════════════════════════════════════════════════
  if (cmd === "impound" || cmd === "fourriere" || cmd === "fourrière") {
    const veh = args[0] || "vehicule_inconnu";
    const reason = args.slice(1).join(" ") || "Infraction au stationnement";
    const name = useGameStore.getState().appearance.name || "Citoyen";
    const rec = impoundVehicle({ vehicleId: veh, ownerId: LOCAL_PLAYER_ID, ownerName: name, reason });
    return { ok: true, message: `Véhicule remorqué à la fourrière MTQ · frais initiaux : ${rec.feeAmount}$` };
  }
  if (cmd === "impoundlot" || cmd === "fourrierelot") {
    const list = listImpoundedVehicles(arg0 ? resolveStaffId(arg0) : undefined);
    return { ok: true, message: list.length ? list.map(formatImpoundLine).join("\n") : "Fourrière vide." };
  }
  if (cmd === "releasecar" || cmd === "recuperer") {
    if (!arg0) return { ok: false, message: "Usage : /releasecar <id_fourriere>" };
    const list = listImpoundedVehicles();
    const found = list.find((r) => r.id.endsWith(arg0));
    if (!found) return { ok: false, message: "Dossier de fourrière introuvable." };
    const fee = releaseVehicleFromImpound(found.id, LOCAL_PLAYER_ID);
    if (fee === null) return { ok: false, message: "Déjà récupéré." };
    ctx.addCash(-fee, `Frais de fourrière : −${fee}$`);
    return { ok: true, message: `Véhicule récupéré · ${fee}$ facturés.` };
  }

  // ═══════════════════════════════════════════════════════
  // AJOUTS v2.1 — TÉLÉMÉTRIE / DIAGNOSTIC SERVEUR
  // ═══════════════════════════════════════════════════════
  if (cmd === "diag" || cmd === "perf" || cmd === "telemetrie") {
    return { ok: true, message: AdminMetrics.getDiagnosticReport() };
  }
  if (cmd === "alerts") {
    const alerts = AdminMetrics.checkAlerts();
    return { ok: true, message: alerts.length ? alerts.join("\n") : "Aucune alerte système active." };
  }

  return { ok: false, message: `Inconnue : /${cmd}. Taper /help ou /aide pour l'index.` };
}

/**
 * AJOUT v2.1 — Point d'entrée public conservé sous le même nom pour ne
 * rien casser côté appelants (AdminBar.tsx etc.). Ajoute la limitation
 * de fréquence et la journalisation d'audit qui existaient déjà comme
 * fonctions dans adminPerms.ts mais n'étaient jamais invoquées.
 */
export function parseAdmin(raw: string, ctx: AdminCtx): { ok: boolean; message: string } {
  ensurePresets();
  const trimmed = raw.trim();
  if (!trimmed) return { ok: false, message: "Commande vide." };
  const parts = trimmed.replace(/^\//, "").split(/\s+/);
  const cmd = (parts[0] ?? "").toLowerCase();
  const isSilent = cmd === "help" || cmd === "aide" || cmd === "h";

  if (!isSilent) {
    const rl = checkRateLimit(LOCAL_PLAYER_ID, cmd);
    if (!rl.allowed) {
      const sec = Math.ceil((rl.retryAfterMs ?? 0) / 1000);
      return { ok: false, message: `Limite de fréquence atteinte pour /${cmd}. Réessayez dans ${sec}s.` };
    }
  }

  const result = executeAdminCommand(trimmed, ctx);

  if (!isSilent && cmd !== "pos" && cmd !== "status") {
    logAudit({
      actorId: LOCAL_PLAYER_ID,
      command: cmd,
      args: parts.slice(1).join(" "),
      success: result.ok,
      reason: result.ok ? undefined : result.message,
    });
  }

  return result;
}

