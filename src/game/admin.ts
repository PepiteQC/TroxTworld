import { FIRM_TYPES, MAPAQ_GRANTS, type FirmType } from "./business";
import { AURAS, MODELS, OUTFITS, type Appearance } from "./character";
import { CATALOG } from "./commerce";
import { FLEET } from "./fleet";
import { QUEBEC_FM_STATIONS } from "./radio";
import { DEEDS, GANGS, RP_JOBS } from "./rp";
import { FRESH_SURVIVAL, type SurvivalSnap } from "./survival";
import { ETHER_MAT_STATS, getEtherDef, searchEtherMats } from "./etherMats";
import { ANIM_TYPES } from "./anim";
import { PROP_IDS, isPropId } from "./builder";
import { searchModels, TOTAL_MODELS } from "./models";
import { ADMIN_EFFECTS, ADMIN_EFFECT_IDS, listFx } from "./fx";
import { type WeatherId } from "./store";
import { LICENSES, type LicenseId } from "./weapons";
import { describeGltf, GLTF_LIBRARY } from "./gltf";
import { INJURED_CLIPS, parseInjuredClip } from "./injured";
import { CROPS, countyFarmLayout } from "./farms";
import { sugarSites } from "./sugar";
import { villageCivicSpot, POIS, SPAWN, VILLAGES } from "./worlddata";

export type FloorId = "lobby" | "hotel" | "apartment" | "corridor" | "prison" | "depanneur";

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
  forceOutage: (kind: "verglas" | "panne" | null) => void;
  say: (text: string) => void;
  heal: () => void;
  hurt: (clip: string) => string;
  setWanted: (n: number) => void;
  cycleRadio: () => void;
  setRadio: (id: string) => boolean;
  jail: () => void;
  prison: () => void;
  book: () => string;
  lockdown: () => void;
  release: () => void;
  pos: () => string;
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
  setCamera: (mode: "chase" | "hood") => void;
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
PRESETS.house = PRESETS.maison;
PRESETS.immo = PRESETS.maison;
{
  const alb = VILLAGES.find((v) => v.id === "saint_alban");
  if (alb) {
    const sp = villageCivicSpot(alb, "shop");
    PRESETS.depanneur = { x: sp.x, z: sp.z, name: "Dépanneur de l'Éboulis" };
    PRESETS.dep = PRESETS.depanneur;
    PRESETS.beausoir = PRESETS.depanneur;
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
};

export const ADMIN_CHIPS = [
  "/help",
  "/status",
  "/kit",
  "/tp hotel",
  "/floor chambre",
  "/tp depanneur",
  "/floor depanneur",
  "/unlock",
  "/car sq",
  "/car lambo",
  "/car civic",
  "/car divan",
  "/tp prison",
  "/job policier",
  "/aura frost",
  "/fx lightning",
  "/spawn portal",
  "/gltf",
  "/hurt limp",
  "/spawn teleporter",
  "/help build",
  "/spawn piano",
  "/undo",
  "/mapaq",
];

export function adminHelp(topic = ""): string {
  if (topic === "rp") {
    return [
      "/job <id>     — " + RP_JOBS.map((j) => j.id).join(" "),
      "/gang G-01|G-02|leave",
      "/firm cafe|depanneur|resto|bar|garage|paysagiste|deneigement|transport|construction|securite|forestiere|immobilier",
      "/mapaq  — subventions Proximité · PTA · PADAAR",
      "/semer mais|ble|foin|patate|cannabis",
      "/tp champs|ferme|vaches|illicite|erabliere|maison|depanneur",
      "/pay          — paie immédiate",
      "/bank <n>     — dépôt Desjardins",
      "/wanted 0-5 /clear /jail /arrest /prison /book /lockdown",
      "/license pal|pal_r|chasse",
    ].join("\n");
  }
  if (topic === "look") {
    return [
      "/outfit " + OUTFITS.map((o) => o.id).join(" "),
      "/aura " + AURAS.map((a) => a.id).join(" "),
      "/model voyageur|troxt|casual|chemise|manches|costume",
      "/face 0-7  /skin 0-7",
      "/tool marteau|pelle|pistol|carabine|shotgun|ar15",
      "/pack sac|sac_rouge|sac_rando",
    ].join("\n");
  }
  if (topic === "build" || topic === "builder" || topic === "construire") {
    return [
      "/build            — ouvrir / fermer le builder  (touche B)",
      "/select sofa      — choisir le fantôme sans poser",
      "/spawn <id>       — poser devant soi  ·  /spawn list sofa",
      "/place /prop      — alias de /spawn",
      "/undo             — retirer le dernier objet",
      "/del              — retirer le plus proche",
      "/dup              — copier le plus proche devant soi",
      "/rotate [deg]     — +45° ou angle exact  (touche Q)",
      "/scale 0.5-6      — taille du fantôme",
      "/snap 0|0.5|1|2   — grille de pose  (0 = libre)",
      "/anim rotate|float|spin|bob|pulse|clear",
      "/clearbuild       — tout effacer  ·  /props  — compteur",
      "E pose  ·  Q tourne  ·  80 objets max",
    ].join("\n");
  }
  if (topic === "world") {
    return [
      "/tp <lieu|x z>  /lieux  /pos",
      "/floor lobby|chambre|couloir|appart|prison",
      "/unlock /lock   — portes d'hôtel",
      "/build /select /spawn /undo /del /dup /rotate /scale /snap /clearbuild",
      "/tv /bell /lights /elev",
      "/radio ckoi|energie|rythme|ici|wknd",
      "/night  /camera chase|hood",
      "/surv reset|full|starve|freeze|heat",
      "/hydro | /verglas | /panne | /bois",
      "/hunt",
      "/fx lightning|meteor|portal|banhammer|clear",
      "/fly /noclip /weather clear|rain|snow|fog|storm",
      "/hydro /verglas /panne /bois",
      "/say <texte>",
      "/mat béton|glass|list",
      "/spawn chair|portal|bomb|ar15|shotgun|injured  /anim rotate|float|clear  /geo",
      "/hurt limp|list|clear  /blesse",
      "/gltf  — formats GLB / meshopt / webp",
    ].join("\n");
  }
  return [
    "/help rp|look|world|build — pages",
    "/status /pos /kit /inv",
    "/tp <lieu>  /floor <étage>  /car <id>",
    "/item <id> [n]  /cash <n>  /bank <n>",
    "/job /outfit /aura /surv /unlock /god",
    "/fx lightning|meteor|list",
    "/hurt limp|clear  /spawn ar15|shotgun|injured",
  ].join("\n");
}

export function listLieux(): string {
  const villages = VILLAGES.map((v) => v.name).join(", ");
  const pois = POIS.map((p) => p.name).join(", ");
  return `Villages : ${villages}\nLieux : ${pois}`;
}

export function parseAdmin(raw: string, ctx: AdminCtx): { ok: boolean; message: string } {
  const trimmed = raw.trim();
  if (!trimmed) return { ok: false, message: "Commande vide." };
  const parts = trimmed.replace(/^\//, "").split(/\s+/);
  const cmd = (parts[0] ?? "").toLowerCase();
  const args = parts.slice(1);
  const arg0 = (args[0] ?? "").toLowerCase();

  if (cmd === "help" || cmd === "aide" || cmd === "h") {
    return { ok: true, message: adminHelp(arg0) };
  }
  if (cmd === "lieux" || cmd === "list") return { ok: true, message: listLieux() };
  if (cmd === "pos" || cmd === "coords" || cmd === "gps") return { ok: true, message: ctx.pos() };
  if (cmd === "status" || cmd === "stats" || cmd === "whoami") return { ok: true, message: ctx.status() };

  if (cmd === "surv" || cmd === "survival" || cmd === "vie") {
    if (!arg0 || arg0 === "reset" || arg0 === "full") {
      ctx.setSurv({ ...FRESH_SURVIVAL });
      return { ok: true, message: "Survie rétablie." };
    }
    if (arg0 === "starve" || arg0 === "faim") {
      ctx.setSurv({ hunger: 8, thirst: 10, energy: 20, alerts: ["famine", "deshydratation"] });
      return { ok: true, message: "Affamé." };
    }
    if (arg0 === "freeze" || arg0 === "froid") {
      ctx.setSurv({ bodyTemp: 33.4, shiver: 1, alerts: ["hypothermie_moderee"] });
      return { ok: true, message: "Hypothermie." };
    }
    if (arg0 === "heat" || arg0 === "chaleur") {
      ctx.setSurv({ bodyTemp: 39.6, thirst: 12, alerts: ["coup_de_chaleur"] });
      return { ok: true, message: "Coup de chaleur." };
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
      return { ok: true, message: "Rang quitté." };
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
    if (!ctx.foundFirm(type)) return { ok: false, message: "Fonds insuffisants — /cash d'abord." };
    return { ok: true, message: `REQ · ${type}` };
  }
  if (cmd === "hire" || cmd === "embaucher") {
    const ok = ctx.hireStaff();
    return { ok, message: ok ? "Embauche · 80 $." : "Impossible d'embaucher." };
  }
  if (cmd === "mapaq" || cmd === "grant" || cmd === "subvention") {
    if (!arg0 || arg0 === "list") {
      return { ok: true, message: MAPAQ_GRANTS.map((g) => `${g.id} · ${g.short} · ${g.base}\u00a0$`).join("\n") };
    }
    const spec = MAPAQ_GRANTS.find((g) => g.id === arg0 || g.short.toLowerCase() === arg0 || g.id.startsWith(arg0));
    if (!spec) return { ok: false, message: "Usage : /mapaq proximite|pta|padaar|releve|alimentsqc" };
    if (!ctx.applyGrant(spec.id)) return { ok: false, message: "Dossier refusé — permis, CA ou déjà versée." };
    return { ok: true, message: `MAPAQ · ${spec.name}` };
  }
  if (cmd === "semer" || cmd === "seed" || cmd === "graines") {
    if (!arg0) return { ok: true, message: Object.values(CROPS).map((c) => `${c.id} · ${c.label}`).join("\n") };
    return { ok: true, message: ctx.sow(arg0) };
  }
  if (cmd === "pay" || cmd === "paie" || cmd === "payroll") {
    ctx.payroll();
    return { ok: true, message: "Paie versée." };
  }
  if (cmd === "bank" || cmd === "banque") {
    const n = Number(args[0]);
    if (!Number.isFinite(n)) return { ok: false, message: "Usage : /bank 1000" };
    ctx.addBank(n);
    return { ok: true, message: `Banque ${n >= 0 ? "+" : ""}${n}\u00a0$` };
  }

  if (cmd === "outfit" || cmd === "tenue") {
    if (!arg0) return { ok: true, message: OUTFITS.map((o) => o.id).join(", ") };
    if (!OUTFITS.some((o) => o.id === arg0)) return { ok: false, message: `Tenue inconnue : ${arg0}` };
    ctx.setLook({ outfit: arg0 as Appearance["outfit"] });
    return { ok: true, message: `Tenue · ${arg0}` };
  }
  if (cmd === "aura") {
    if (!arg0) return { ok: true, message: AURAS.map((a) => a.id).join(", ") };
    if (!AURAS.some((a) => a.id === arg0)) return { ok: false, message: `Aura inconnue : ${arg0}` };
    ctx.setLook({ aura: arg0 as Appearance["aura"] });
    return { ok: true, message: `Aura · ${arg0}` };
  }
  if (cmd === "model" || cmd === "modele") {
    if (!arg0) return { ok: true, message: MODELS.map((m) => m.id).join(", ") };
    if (!MODELS.some((m) => m.id === arg0)) return { ok: false, message: MODELS.map((m) => m.id).join("|") };
    ctx.setLook({ model: arg0 as Appearance["model"] });
    return { ok: true, message: `Modèle · ${arg0}` };
  }
  if (cmd === "face") {
    const n = Number(args[0]);
    if (!Number.isFinite(n) || n < 0 || n > 7) return { ok: false, message: "Usage : /face 0-7" };
    ctx.setLook({ face: n });
    return { ok: true, message: `Visage · ${n}` };
  }
  if (cmd === "skin") {
    const n = Number(args[0]);
    if (!Number.isFinite(n) || n < 0 || n > 7) return { ok: false, message: "Usage : /skin 0-7" };
    ctx.setLook({ skin: n });
    return { ok: true, message: `Peau · ${n}` };
  }

  if (cmd === "tool" || cmd === "outil" || cmd === "pack" || cmd === "sac") {
    if (!arg0) return { ok: true, message: "Usage : /tool marteau  ·  /pack sac_rando" };
    if (!ctx.equip(arg0)) return { ok: false, message: `Inconnu : ${arg0}` };
    return { ok: true, message: `Équipé · ${arg0}` };
  }
  if (cmd === "kit") {
    ctx.kit();
    return { ok: true, message: "Kit admin chargé." };
  }
  if (cmd === "inv" || cmd === "inventory") {
    return { ok: true, message: ctx.status() };
  }
  if (cmd === "clearinv" || cmd === "empty") {
    ctx.clearInv();
    return { ok: true, message: "Sac vidé." };
  }

  if (cmd === "build" || cmd === "builder" || cmd === "construire") {
    ctx.toggleBuild();
    return { ok: true, message: "Builder." };
  }
  if (cmd === "clearbuild" || cmd === "clearprops") {
    ctx.clearBuild();
    return { ok: true, message: "Objets du builder effacés." };
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
    if (!arg0) return { ok: true, message: "Usage : /select sofa|lpost|piano …" };
    if (!isPropId(arg0)) {
      const hits = searchModels(args.join(" ")).slice(0, 8);
      return { ok: false, message: hits.length ? hits.map((h) => h.id).join(" ") : "Prop inconnu." };
    }
    ctx.selectBuild(arg0);
    return { ok: true, message: `Fantôme · ${arg0} · E pour poser` };
  }
  if (cmd === "rotate" || cmd === "rot" || cmd === "yaw") {
    const deg = args[0] === undefined ? undefined : Number(args[0]);
    if (args[0] !== undefined && !Number.isFinite(deg)) return { ok: false, message: "Usage : /rotate [degrés]" };
    return { ok: true, message: ctx.rotateBuild(deg) };
  }
  if (cmd === "scale" || cmd === "taille" || cmd === "echelle") {
    const n = Number(args[0]);
    if (!Number.isFinite(n)) return { ok: false, message: "Usage : /scale 0.25-6" };
    return { ok: true, message: ctx.scaleBuild(n) };
  }
  if (cmd === "snap" || cmd === "grille") {
    const n = args[0] === undefined ? 1 : Number(args[0]);
    if (!Number.isFinite(n) || n < 0) return { ok: false, message: "Usage : /snap 0|0.5|1|2" };
    return { ok: true, message: ctx.snapBuild(n) };
  }
  if (cmd === "props" || cmd === "placed") {
    return { ok: true, message: ctx.propsInfo() };
  }
  if (cmd === "unlock" || cmd === "ouvrir") {
    ctx.unlockHotel(true);
    return { ok: true, message: "Portes d'hôtel déverrouillées." };
  }
  if (cmd === "lock" || cmd === "verrou") {
    ctx.unlockHotel(false);
    return { ok: true, message: "Portes d'hôtel verrouillées." };
  }
  if (cmd === "tv") {
    const on = ctx.toggleTv();
    return { ok: true, message: on ? "TV allumée" : "TV éteinte" };
  }
  if (cmd === "bell" || cmd === "cloche") {
    ctx.bell();
    return { ok: true, message: "Ding." };
  }
  if (cmd === "lights" || cmd === "lustres") {
    ctx.lights();
    return { ok: true, message: "Lustres basculés." };
  }
  if (cmd === "elev" || cmd === "ascenseur") {
    ctx.elevator();
    return { ok: true, message: "Ascenseur." };
  }
  if (cmd === "camera" || cmd === "cam") {
    if (arg0 !== "chase" && arg0 !== "hood" && arg0 !== "capot") {
      return { ok: false, message: "Usage : /camera chase|hood" };
    }
    ctx.setCamera(arg0 === "capot" ? "hood" : arg0);
    return { ok: true, message: `Caméra · ${arg0}` };
  }

  if (cmd === "floor" || cmd === "etage" || cmd === "interieur") {
    const id = FLOORS[arg0];
    if (!id) return { ok: false, message: "Usage : /floor lobby|chambre|couloir|appart|prison" };
    ctx.floor(id);
    return { ok: true, message: `Étage · ${id}` };
  }
  if (cmd === "lobby") {
    ctx.floor("lobby");
    return { ok: true, message: "Grand Lobby" };
  }
  if (cmd === "car" || cmd === "veh" || cmd === "vehicule") {
    if (!arg0) return { ok: true, message: `Flotte : ${FLEET.map((v) => v.id).join(", ")}` };
    if (!ctx.giveCar(arg0)) return { ok: false, message: `Véhicule inconnu : ${arg0}` };
    return { ok: true, message: `Clés · ${arg0}` };
  }
  if (cmd === "cars" || cmd === "flotte") {
    return { ok: true, message: FLEET.map((v) => `${v.id} · ${v.name}`).join("\n") };
  }
  if (cmd === "item" || cmd === "giveitem" || cmd === "objet") {
    if (!arg0) return { ok: true, message: CATALOG.map((i) => i.id).join(", ") };
    const n = args[1] ? Number(args[1]) : 1;
    if (!Number.isFinite(n) || n <= 0) return { ok: false, message: "Usage : /item pistol 1" };
    if (!ctx.giveItem(arg0, n)) return { ok: false, message: `Objet inconnu : ${arg0}` };
    return { ok: true, message: `+${n} ${arg0}` };
  }
  if (cmd === "items") return { ok: true, message: CATALOG.map((i) => i.id).join(", ") };
  if (cmd === "walk" || cmd === "pied") {
    ctx.walk();
    return { ok: true, message: "À pied." };
  }
  if (cmd === "drive" || cmd === "conduire") {
    ctx.drive();
    return { ok: true, message: "Au volant." };
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
      return { ok: true, message: `Arrivée · ${dest.name}` };
    }
    const x = Number(args[0]);
    const z = Number(args[1]);
    if (Number.isFinite(x) && Number.isFinite(z)) {
      ctx.teleport(x, z);
      return { ok: true, message: `Coordonnées ${x.toFixed(0)}, ${z.toFixed(0)}` };
    }
    return { ok: false, message: `Lieu inconnu : ${args[0]}` };
  }
  if (cmd === "cash" || cmd === "give" || cmd === "argent") {
    const n = Number(args[0]);
    if (!Number.isFinite(n)) return { ok: false, message: "Usage : /cash 500" };
    ctx.addCash(n, `Desjardins · ${n >= 0 ? "+" : ""}${n}\u00a0$`);
    return { ok: true, message: `Compte ajusté de ${n}\u00a0$` };
  }
  if (cmd === "night" || cmd === "nuit" || cmd === "time") {
    ctx.toggleNight();
    return { ok: true, message: "Cycle jour / nuit basculé." };
  }
  if (cmd === "god" || cmd === "godmode") {
    const next = !ctx.god;
    ctx.setGod(next);
    return { ok: true, message: next ? "Godmode activé — plus d'amendes." : "Godmode désactivé." };
  }
  if (cmd === "heal" || cmd === "respawn") {
    ctx.heal();
    return { ok: true, message: "Retour au pick-up, Route 138." };
  }
  if (cmd === "hurt" || cmd === "blesse" || cmd === "injured") {
    if (!arg0 || arg0 === "list") {
      return { ok: true, message: INJURED_CLIPS.join("\n") };
    }
    if (arg0 === "clear" || arg0 === "off") {
      ctx.hurt("clear");
      return { ok: true, message: "Blessure levée." };
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
      return { ok: true, message: "Effets coupés." };
    }
    if (!(id in ADMIN_EFFECTS) && !ADMIN_EFFECT_IDS.includes(id as typeof ADMIN_EFFECT_IDS[number])) {
      return { ok: false, message: "Usage : /fx lightning|meteor|list|clear" };
    }
    if (!ctx.playFx(id)) return { ok: false, message: `Effet inconnu : ${id}` };
    return { ok: true, message: `${ADMIN_EFFECTS[id as keyof typeof ADMIN_EFFECTS].icon} ${ADMIN_EFFECTS[id as keyof typeof ADMIN_EFFECTS].name}` };
  }
  if (cmd === "fly" || cmd === "vol") {
    ctx.toggleFly();
    return { ok: true, message: "Vol basculé · Maj monte · Espace descend" };
  }
  if (cmd === "noclip" || cmd === "clip") {
    ctx.toggleNoclip();
    return { ok: true, message: "Noclip basculé." };
  }
  if (cmd === "weather" || cmd === "meteo" || cmd === "météo") {
    const id = (arg0 || "clear") as WeatherId;
    if (id !== "clear" && id !== "rain" && id !== "snow" && id !== "fog" && id !== "storm") {
      return { ok: false, message: "Usage : /weather clear|rain|snow|fog|storm" };
    }
    ctx.setWeather(id);
    return { ok: true, message: `Météo · ${id}` };
  }
  if (cmd === "hydro" || cmd === "hq") {
    ctx.forceOutage(null);
    return { ok: true, message: "Hydro-Québec · réseau rétabli" };
  }
  if (cmd === "verglas" || cmd === "panne") {
    ctx.forceOutage(cmd === "verglas" ? "verglas" : "panne");
    return { ok: true, message: cmd === "verglas" ? "Verglas · réseau hors service" : "Panne Hydro-Québec" };
  }
  if (cmd === "bois" || cmd === "corde") {
    ctx.giveItem("corde_bois", 3);
    return { ok: true, message: "3 cordes de bois" };
  }
  if (cmd === "say" || cmd === "chat" || cmd === "me") {
    const text = args.join(" ").trim();
    if (!text) return { ok: false, message: "Usage : /say <texte>" };
    ctx.say(cmd === "me" ? `* ${text}` : text);
    return { ok: true, message: text };
  }
  if (cmd === "mat" || cmd === "material" || cmd === "mats") {
    if (!arg0 || arg0 === "list") {
      return { ok: true, message: `${ETHER_MAT_STATS.total} mats · ${ETHER_MAT_STATS.cats.join(" ")}` };
    }
    const hits = searchEtherMats(args.join(" ")).slice(0, 12);
    if (!hits.length) return { ok: false, message: "Aucun matériau." };
    const d = getEtherDef(hits[0].id);
    return { ok: true, message: hits.map((h) => `${h.id} · ${h.name}`).join("\n") + `\n→ ${d.id}` };
  }
  if (cmd === "geo" || cmd === "geom") {
    return { ok: true, message: ctx.geoStats() };
  }
  if (cmd === "gltf" || cmd === "glb" || cmd === "meshopt") {
    if (arg0) {
      const hit = GLTF_LIBRARY.find((a) => a.id === arg0 || a.url.includes(arg0));
      if (!hit) return { ok: false, message: "Assets : " + GLTF_LIBRARY.map((a) => a.id).join(" ") };
      return { ok: true, message: `${hit.id} · ${hit.container} · ${hit.role}\n${hit.url}\n${hit.extensions.join("\n")}` };
    }
    return { ok: true, message: describeGltf() };
  }
  if (cmd === "spawn" || cmd === "prop" || cmd === "place" || cmd === "poser") {
    if (!arg0) return { ok: true, message: `${TOTAL_MODELS} modèles Ether · ${PROP_IDS.length} placeables\n` + PROP_IDS.slice(0, 40).join(" ") + " …" };
    if (arg0 === "list" || arg0 === "search") {
      const q = args.slice(1).join(" ") || "sofa";
      const hits = searchModels(q).slice(0, 12);
      return { ok: true, message: hits.map((h) => `${h.id} · ${h.label}`).join("\n") || "Aucun." };
    }
    if (!isPropId(arg0)) {
      const hits = searchModels(args.join(" ")).slice(0, 8);
      return { ok: false, message: hits.length ? hits.map((h) => h.id).join(" ") : "Prop inconnu." };
    }
    if (!ctx.spawnProp(arg0)) return { ok: false, message: "Spawn refusé." };
    return { ok: true, message: `Prop ${arg0}` };
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
    return { ok: true, message: LICENSES[id].name };
  }
  if (cmd === "wanted" || cmd === "etoiles" || cmd === "stars") {
    const n = args[0] === undefined ? 3 : Number(args[0]);
    if (!Number.isFinite(n) || n < 0 || n > 5) return { ok: false, message: "Usage : /wanted 0-5" };
    ctx.setWanted(n);
    return { ok: true, message: n > 0 ? `Avis de recherche · ${n}★` : "Recherche levée." };
  }
  if (cmd === "clear" || cmd === "code4") {
    ctx.setWanted(0);
    return { ok: true, message: "Code 4 · poursuite terminée." };
  }
  if (cmd === "radio" || cmd === "fm") {
    if (!arg0) {
      ctx.cycleRadio();
      return { ok: true, message: "Station suivante." };
    }
    if (!ctx.setRadio(arg0)) {
      return { ok: false, message: `Stations : ${QUEBEC_FM_STATIONS.map((s) => s.id).join(", ")}` };
    }
    return { ok: true, message: `FM · ${arg0}` };
  }
  if (cmd === "jail") {
    ctx.jail();
    return { ok: true, message: "Poste SQ Portneuf." };
  }
  if (cmd === "prison" || cmd === "penitencier" || cmd === "cellule") {
    ctx.prison();
    return { ok: true, message: "Établissement de Donnacona." };
  }
  if (cmd === "book" || cmd === "ecrouer") {
    return { ok: true, message: ctx.book() };
  }
  if (cmd === "lockdown" || cmd === "confinement") {
    ctx.lockdown();
    return { ok: true, message: "LOCKDOWN." };
  }
  if (cmd === "release" || cmd === "liberer") {
    ctx.release();
    return { ok: true, message: "Libération." };
  }
  if (cmd === "arrest" || cmd === "arrestation") {
    ctx.setWanted(5);
    ctx.prison();
    ctx.book();
    return { ok: true, message: "Avis 5★ · pénitencier Donnacona." };
  }
  return { ok: false, message: `Inconnue : /${cmd}. /help  /help rp  /help look  /help world` };
}
