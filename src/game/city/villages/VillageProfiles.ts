// ═══════════════════════════════════════════════════════════════════════════
//  VILLAGE PROFILES — L'IDENTITÉ RÉELLE DE CHAQUE VILLAGE DE PORTNEUF
//  src/world/VillageProfiles.ts
//  Chaque village du comté a une personnalité distincte, basée sur sa vraie
//  histoire et son économie réelle. Saint-Tite est une ville western avec son
//  festival, Sainte-Anne-de-la-Pérade a ses cabanes à pêche sur la glace,
//  Saint-Marc-des-Carrières vit de ses carrières de calcaire, Donnacona de
//  son usine de papier. Aucun village ne ressemble à un autre.
// ═══════════════════════════════════════════════════════════════════════════

import * as THREE from 'three';
import { matLib, buildBuilding, QC_PALETTE } from '../buildings/architecture/QuebecArchitecture';

// ─────────────────────────────────────────────────────────────────────────
//  TYPES
// ─────────────────────────────────────────────────────────────────────────

export type Industry =
  | 'papeterie'      // usine de papier (Donnacona)
  | 'carriere'       // carrière de calcaire (Saint-Marc)
  | 'foresterie'     // scierie, bois (Saint-Raymond)
  | 'agriculture'    // fermes laitières, grandes cultures
  | 'peche'          // pêche aux petits poissons des chenaux
  | 'tourisme'       // patrimoine, villégiature
  | 'western'        // festival western, rodéo (Saint-Tite)
  | 'acericole'      // érablières, sirop d'érable
  | 'residentiel'    // banlieue-dortoir (Pont-Rouge)
  | 'maritime'       // marina, quai, fleuve
  | 'urbain';        // métropole

export type Landmark =
  | 'moulin_vent'        // Moulin de Grondines
  | 'moulin_eau'         // Moulin de La Chevrotière (Deschambault)
  | 'vieux_presbytere'   // Vieux presbytère de Batiscan
  | 'usine_papier'       // Usine Donnacona
  | 'carriere_calcaire'  // Carrières de Saint-Marc
  | 'village_peche'      // Cabanes à pêche sur glace (Sainte-Anne)
  | 'arene_rodeo'        // Arène du Festival Western (Saint-Tite)
  | 'barrage'            // Barrage sur la Jacques-Cartier (Pont-Rouge)
  | 'scierie'            // Scierie (Saint-Raymond)
  | 'marina'             // Marina (Portneuf)
  | 'rue_patrimoniale'   // Vieux Chemin (Cap-Santé)
  | 'champ_mais'         // Champs de blé d'Inde (Neuville)
  | 'pont_couvert'       // Pont couvert
  | 'quai_fleuve';       // Quai sur le Saint-Laurent

export interface VillageProfile {
  name: string;
  center: [number, number];
  population: number;
  founded: number;
  type: 'metropole' | 'ville' | 'village' | 'hameau';

  // Identité
  industry: Industry;
  secondaryIndustry?: Industry;
  landmarks: Landmark[];
  motto: string;              // devise / slogan réel ou évocateur
  description: string;

  // Caractère visuel — ce qui rend le village unique à l'œil
  wallPalette: number[];      // couleurs de murs dominantes
  roofPalette: number[];      // couleurs de toits dominantes
  churchStyle: 'pierre_grise' | 'pierre_blanche' | 'brique_rouge' | 'bois_blanc' | 'aucune';
  churchScale: number;        // les vieilles paroisses ont de grosses églises

  // Urbanisme
  mainRoadAngle: number;
  density: number;            // 0.3 (dispersé) à 1.5 (dense)
  setbackBase: number;        // recul des maisons par rapport à la route
  gridPattern: boolean;       // vrai damier (villes) vs rang linéaire (villages)

  // Environnement
  terrain: 'plaine_fleuve' | 'vallee' | 'colline' | 'montagne' | 'plateau';
  forestDensity: number;      // 0 à 1
  farmCount: number;
  fieldColors: number[];      // couleurs des champs (varie selon la culture)
  hasRiver: boolean;          // rivière traversant le village
  riverAngle?: number;

  // Services
  hasDepanneur: boolean;
  hasCaisse: boolean;
  hasEcole: boolean;
  hasGarage: boolean;
  sugarShackCount: number;
}

// ─────────────────────────────────────────────────────────────────────────
//  LES 18 VILLAGES — PROFILS AUTHENTIQUES
// ─────────────────────────────────────────────────────────────────────────

export const VILLAGE_PROFILES: VillageProfile[] = [
  // ═══ PORTNEUF — le chef-lieu, sur le fleuve, marina ═══
  {
    name: 'Portneuf',
    center: [0, 0], population: 5200, founded: 1861, type: 'ville',
    industry: 'maritime', secondaryIndustry: 'agriculture',
    landmarks: ['marina', 'quai_fleuve'],
    motto: 'La porte du fleuve',
    description: "Chef-lieu du comté, Portneuf s'étire le long du Saint-Laurent. Sa marina accueille les plaisanciers et son quai rappelle l'époque des goélettes.",
    wallPalette: [QC_PALETTE.boisBlanc, QC_PALETTE.boisCreme, QC_PALETTE.boisBleu],
    roofPalette: [QC_PALETTE.toleRouge, QC_PALETTE.toleVerte, QC_PALETTE.toleNoire],
    churchStyle: 'pierre_grise', churchScale: 1.15,
    mainRoadAngle: 0, density: 1.1, setbackBase: 16, gridPattern: false,
    terrain: 'plaine_fleuve', forestDensity: 0.25, farmCount: 5,
    fieldColors: [0x7a8a4a, 0x8a9450, 0x6a7a42],
    hasRiver: true, riverAngle: 1.5,
    hasDepanneur: true, hasCaisse: true, hasEcole: true, hasGarage: true,
    sugarShackCount: 1,
  },

  // ═══ DONNACONA — ville industrielle, usine de papier ═══
  {
    name: 'Donnacona',
    center: [600, 0], population: 6300, founded: 1915, type: 'ville',
    industry: 'papeterie', secondaryIndustry: 'residentiel',
    landmarks: ['usine_papier', 'barrage'],
    motto: 'La ville du papier',
    description: "Bâtie autour de sa papetière sur la rivière Jacques-Cartier, Donnacona est la ville ouvrière du comté. Les cheminées de l'usine dominent l'horizon.",
    wallPalette: [QC_PALETTE.brique, QC_PALETTE.boisGris, QC_PALETTE.boisCreme],
    roofPalette: [QC_PALETTE.bardeauGris, QC_PALETTE.toleNoire, QC_PALETTE.toleBleue],
    churchStyle: 'brique_rouge', churchScale: 1.0,
    mainRoadAngle: 0.05, density: 1.35, setbackBase: 12, gridPattern: true,
    terrain: 'plaine_fleuve', forestDensity: 0.15, farmCount: 2,
    fieldColors: [0x7a8a4a, 0x8a9450],
    hasRiver: true, riverAngle: 1.2,
    hasDepanneur: true, hasCaisse: true, hasEcole: true, hasGarage: true,
    sugarShackCount: 0,
  },

  // ═══ CAP-SANTÉ — un des plus beaux villages du Québec, patrimoine ═══
  {
    name: 'Cap-Santé',
    center: [400, 0], population: 2800, founded: 1679, type: 'village',
    industry: 'tourisme', secondaryIndustry: 'agriculture',
    landmarks: ['rue_patrimoniale', 'quai_fleuve'],
    motto: 'Le Vieux Chemin du Roy',
    description: "Classé parmi les plus beaux villages du Québec. Son Vieux Chemin bordé de maisons ancestrales et son église de 1754 en font un joyau du patrimoine.",
    wallPalette: [QC_PALETTE.pierreChamps, QC_PALETTE.boisBlanc, QC_PALETTE.pierreGrise],
    roofPalette: [QC_PALETTE.toleRouge, QC_PALETTE.toleArgent, QC_PALETTE.toleVerte],
    churchStyle: 'pierre_blanche', churchScale: 1.35, // église monumentale de 1754
    mainRoadAngle: -0.03, density: 1.25, setbackBase: 9, gridPattern: false,
    terrain: 'plaine_fleuve', forestDensity: 0.3, farmCount: 6,
    fieldColors: [0x8a9450, 0x7a8a4a, 0x9a9a58],
    hasRiver: false,
    hasDepanneur: true, hasCaisse: false, hasEcole: true, hasGarage: false,
    sugarShackCount: 2,
  },

  // ═══ NEUVILLE — le blé d'Inde, maisons de pierre ═══
  {
    name: 'Neuville',
    center: [900, 0], population: 4600, founded: 1667, type: 'village',
    industry: 'agriculture', secondaryIndustry: 'tourisme',
    landmarks: ['champ_mais', 'rue_patrimoniale'],
    motto: 'Capitale du blé d\'Inde',
    description: "Célèbre dans tout le Québec pour son maïs sucré. Ses maisons de pierre du Régime français bordent la 138 face au fleuve.",
    wallPalette: [QC_PALETTE.pierreChamps, QC_PALETTE.pierreGrise, QC_PALETTE.boisBlanc],
    roofPalette: [QC_PALETTE.toleRouge, QC_PALETTE.toleArgent, QC_PALETTE.bardeauGris],
    churchStyle: 'pierre_grise', churchScale: 1.2,
    mainRoadAngle: 0.04, density: 1.0, setbackBase: 11, gridPattern: false,
    terrain: 'plaine_fleuve', forestDensity: 0.2, farmCount: 9, // beaucoup de fermes
    fieldColors: [0xb8b048, 0xc8b850, 0xa8a040], // jaune du maïs
    hasRiver: false,
    hasDepanneur: true, hasCaisse: true, hasEcole: true, hasGarage: true,
    sugarShackCount: 1,
  },

  // ═══ DESCHAMBAULT — moulin à eau, patrimoine seigneurial ═══
  {
    name: 'Deschambault',
    center: [-300, 0], population: 1900, founded: 1713, type: 'village',
    industry: 'tourisme', secondaryIndustry: 'agriculture',
    landmarks: ['moulin_eau', 'rue_patrimoniale', 'quai_fleuve'],
    motto: 'Le moulin de La Chevrotière',
    description: "Village seigneurial préservé. Son moulin à eau de pierre et son église surplombant le fleuve témoignent de trois siècles d'histoire.",
    wallPalette: [QC_PALETTE.pierreChamps, QC_PALETTE.pierreGrise, QC_PALETTE.boisCreme],
    roofPalette: [QC_PALETTE.toleArgent, QC_PALETTE.toleRouge, QC_PALETTE.toleVerte],
    churchStyle: 'pierre_grise', churchScale: 1.25,
    mainRoadAngle: 0.02, density: 0.9, setbackBase: 12, gridPattern: false,
    terrain: 'plaine_fleuve', forestDensity: 0.35, farmCount: 8,
    fieldColors: [0x7a8a4a, 0x8a9450, 0x6a7a42],
    hasRiver: true, riverAngle: 1.8,
    hasDepanneur: true, hasCaisse: false, hasEcole: true, hasGarage: false,
    sugarShackCount: 3,
  },

  // ═══ GRONDINES — le moulin à vent, tout petit hameau ═══
  {
    name: 'Grondines',
    center: [-500, 0], population: 750, founded: 1680, type: 'hameau',
    industry: 'agriculture', secondaryIndustry: 'tourisme',
    landmarks: ['moulin_vent', 'quai_fleuve'],
    motto: 'Le vieux moulin à vent',
    description: "Minuscule hameau dominé par son moulin à vent de pierre de 1674, l'un des plus anciens du Canada.",
    wallPalette: [QC_PALETTE.pierreChamps, QC_PALETTE.boisBlanc],
    roofPalette: [QC_PALETTE.toleRouge, QC_PALETTE.toleArgent],
    churchStyle: 'pierre_grise', churchScale: 0.85,
    mainRoadAngle: 0, density: 0.55, setbackBase: 14, gridPattern: false,
    terrain: 'plaine_fleuve', forestDensity: 0.4, farmCount: 7,
    fieldColors: [0x7a8a4a, 0x8a9450, 0x9a9058],
    hasRiver: false,
    hasDepanneur: false, hasCaisse: false, hasEcole: false, hasGarage: false,
    sugarShackCount: 2,
  },

  // ═══ PONT-ROUGE — banlieue en croissance, barrage, chutes ═══
  {
    name: 'Pont-Rouge',
    center: [800, -300], population: 9400, founded: 1867, type: 'ville',
    industry: 'residentiel', secondaryIndustry: 'foresterie',
    landmarks: ['barrage', 'pont_couvert'],
    motto: 'Sur la Jacques-Cartier',
    description: "La ville la plus peuplée du comté. Ses quartiers résidentiels modernes s'étendent le long de la rivière Jacques-Cartier et de ses chutes.",
    wallPalette: [QC_PALETTE.boisCreme, QC_PALETTE.boisGris, QC_PALETTE.brique, QC_PALETTE.boisBleu],
    roofPalette: [QC_PALETTE.bardeauGris, QC_PALETTE.toleNoire, QC_PALETTE.toleBleue],
    churchStyle: 'brique_rouge', churchScale: 1.05,
    mainRoadAngle: 1.2, density: 1.4, setbackBase: 14, gridPattern: true,
    terrain: 'vallee', forestDensity: 0.45, farmCount: 3,
    fieldColors: [0x6a7a42, 0x7a8a4a],
    hasRiver: true, riverAngle: 0.4,
    hasDepanneur: true, hasCaisse: true, hasEcole: true, hasGarage: true,
    sugarShackCount: 1,
  },

  // ═══ SAINT-RAYMOND — foresterie, montagne, plein air ═══
  {
    name: 'Saint-Raymond',
    center: [400, -800], population: 3800, founded: 1842, type: 'ville',
    industry: 'foresterie', secondaryIndustry: 'tourisme',
    landmarks: ['scierie', 'pont_couvert'],
    motto: 'Porte des Laurentides',
    description: "Ville forestière au pied des Laurentides. Sa scierie tourne jour et nuit, et la Vallée Bras-du-Nord attire randonneurs et motoneigistes.",
    wallPalette: [QC_PALETTE.boisGris, QC_PALETTE.boisVert, QC_PALETTE.boisCreme],
    roofPalette: [QC_PALETTE.toleVerte, QC_PALETTE.toleNoire, QC_PALETTE.bardeauGris],
    churchStyle: 'pierre_grise', churchScale: 1.1,
    mainRoadAngle: 0.9, density: 1.0, setbackBase: 15, gridPattern: false,
    terrain: 'montagne', forestDensity: 0.9, farmCount: 4,
    fieldColors: [0x5a6a3a, 0x6a7a42],
    hasRiver: true, riverAngle: 0.9,
    hasDepanneur: true, hasCaisse: true, hasEcole: true, hasGarage: true,
    sugarShackCount: 4, // beaucoup d'érablières en montagne
  },

  // ═══ SAINT-MARC-DES-CARRIÈRES — les carrières de calcaire ═══
  {
    name: 'Saint-Marc-des-Carrières',
    center: [-200, -300], population: 3100, founded: 1913, type: 'village',
    industry: 'carriere', secondaryIndustry: 'agriculture',
    landmarks: ['carriere_calcaire'],
    motto: 'La pierre de taille',
    description: "Le village doit son nom à ses carrières de calcaire, exploitées depuis un siècle. La pierre de Saint-Marc a bâti des monuments à travers le Québec.",
    wallPalette: [QC_PALETTE.pierreGrise, QC_PALETTE.pierreChamps, QC_PALETTE.boisGris],
    roofPalette: [QC_PALETTE.toleNoire, QC_PALETTE.bardeauGris, QC_PALETTE.toleRouge],
    churchStyle: 'pierre_blanche', churchScale: 1.1, // église en pierre locale
    mainRoadAngle: 1.4, density: 0.95, setbackBase: 14, gridPattern: false,
    terrain: 'plateau', forestDensity: 0.3, farmCount: 5,
    fieldColors: [0x7a8a4a, 0x8a9450, 0x9a9058],
    hasRiver: false,
    hasDepanneur: true, hasCaisse: true, hasEcole: true, hasGarage: true,
    sugarShackCount: 1,
  },

  // ═══ SAINT-CASIMIR — agriculture, grottes ═══
  {
    name: 'Saint-Casimir',
    center: [-500, -400], population: 1400, founded: 1847, type: 'village',
    industry: 'agriculture', secondaryIndustry: 'acericole',
    landmarks: ['pont_couvert'],
    motto: 'Au creux de la Sainte-Anne',
    description: "Village agricole niché dans la vallée de la rivière Sainte-Anne, réputé pour ses grottes et ses marmites de géants.",
    wallPalette: [QC_PALETTE.boisBlanc, QC_PALETTE.boisCreme, QC_PALETTE.boisVert],
    roofPalette: [QC_PALETTE.toleRouge, QC_PALETTE.toleVerte, QC_PALETTE.toleArgent],
    churchStyle: 'pierre_grise', churchScale: 0.95,
    mainRoadAngle: 0.4, density: 0.7, setbackBase: 16, gridPattern: false,
    terrain: 'vallee', forestDensity: 0.55, farmCount: 8,
    fieldColors: [0x7a8a4a, 0x8a9450, 0x6a7a42, 0xa89a58],
    hasRiver: true, riverAngle: 0.3,
    hasDepanneur: true, hasCaisse: false, hasEcole: true, hasGarage: false,
    sugarShackCount: 4,
  },

  // ═══ SAINT-ALBAN — rural profond ═══
  {
    name: 'Saint-Alban',
    center: [-100, -700], population: 1300, founded: 1856, type: 'village',
    industry: 'agriculture', secondaryIndustry: 'acericole',
    landmarks: [],
    motto: 'Terre et forêt',
    description: "Village de rang typique, entouré de terres agricoles et d'érablières. La vie y suit le rythme des saisons.",
    wallPalette: [QC_PALETTE.boisBlanc, QC_PALETTE.boisCreme, QC_PALETTE.boisRouge],
    roofPalette: [QC_PALETTE.toleRouge, QC_PALETTE.toleVerte, QC_PALETTE.toleNoire],
    churchStyle: 'bois_blanc', churchScale: 0.9,
    mainRoadAngle: 0.8, density: 0.6, setbackBase: 18, gridPattern: false,
    terrain: 'colline', forestDensity: 0.6, farmCount: 7,
    fieldColors: [0x7a8a4a, 0x8a9450, 0x6a7a42],
    hasRiver: true, riverAngle: 1.1,
    hasDepanneur: true, hasCaisse: false, hasEcole: true, hasGarage: false,
    sugarShackCount: 5,
  },

  // ═══ SAINT-UBALDE — agriculture, lacs ═══
  {
    name: 'Saint-Ubalde',
    center: [-700, -800], population: 1300, founded: 1866, type: 'village',
    industry: 'agriculture', secondaryIndustry: 'acericole',
    landmarks: [],
    motto: 'Entre les lacs',
    description: "Village agricole du plateau laurentien, parsemé de lacs où les chalets se multiplient l'été.",
    wallPalette: [QC_PALETTE.boisCreme, QC_PALETTE.boisBlanc, QC_PALETTE.boisBleu],
    roofPalette: [QC_PALETTE.toleVerte, QC_PALETTE.toleRouge, QC_PALETTE.bardeauGris],
    churchStyle: 'pierre_grise', churchScale: 0.9,
    mainRoadAngle: 1.1, density: 0.55, setbackBase: 20, gridPattern: false,
    terrain: 'plateau', forestDensity: 0.7, farmCount: 9,
    fieldColors: [0x7a8a4a, 0x6a7a42, 0x8a9450],
    hasRiver: false,
    hasDepanneur: true, hasCaisse: false, hasEcole: true, hasGarage: true,
    sugarShackCount: 5,
  },

  // ═══ SAINTE-CHRISTINE-D'AUVERGNE — hameau forestier ═══
  {
    name: "Sainte-Christine-d'Auvergne",
    center: [100, -1000], population: 700, founded: 1911, type: 'hameau',
    industry: 'foresterie', secondaryIndustry: 'acericole',
    landmarks: [],
    motto: 'Au bout du rang',
    description: "Le plus petit village du comté, perdu dans la forêt laurentienne. Quelques maisons, une chapelle, et les arbres à perte de vue.",
    wallPalette: [QC_PALETTE.boisGris, QC_PALETTE.boisVert, QC_PALETTE.boisCreme],
    roofPalette: [QC_PALETTE.toleVerte, QC_PALETTE.toleNoire],
    churchStyle: 'bois_blanc', churchScale: 0.7, // simple chapelle
    mainRoadAngle: 0.6, density: 0.4, setbackBase: 22, gridPattern: false,
    terrain: 'montagne', forestDensity: 1.0, farmCount: 3,
    fieldColors: [0x5a6a3a, 0x6a7a42],
    hasRiver: false,
    hasDepanneur: false, hasCaisse: false, hasEcole: false, hasGarage: false,
    sugarShackCount: 4,
  },

  // ═══ SAINTE-ANNE-DE-LA-PÉRADE — LES PETITS POISSONS DES CHENAUX ═══
  {
    name: 'Sainte-Anne-de-la-Pérade',
    center: [-800, 0], population: 2000, founded: 1667, type: 'village',
    industry: 'peche', secondaryIndustry: 'tourisme',
    landmarks: ['village_peche', 'quai_fleuve'],
    motto: 'Les petits poissons des chenaux',
    description: "Chaque hiver, un village de centaines de cabanes colorées surgit sur la rivière gelée pour la pêche au poulamon. Une tradition unique au monde.",
    wallPalette: [QC_PALETTE.boisBlanc, QC_PALETTE.pierreChamps, QC_PALETTE.boisBleu],
    roofPalette: [QC_PALETTE.toleRouge, QC_PALETTE.toleArgent, QC_PALETTE.toleVerte],
    churchStyle: 'pierre_grise', churchScale: 1.3, // grande église historique
    mainRoadAngle: 0.03, density: 0.95, setbackBase: 12, gridPattern: false,
    terrain: 'plaine_fleuve', forestDensity: 0.25, farmCount: 6,
    fieldColors: [0x7a8a4a, 0x8a9450],
    hasRiver: true, riverAngle: 1.4,
    hasDepanneur: true, hasCaisse: true, hasEcole: true, hasGarage: true,
    sugarShackCount: 2,
  },

  // ═══ BATISCAN — vieux presbytère, fleuve ═══
  {
    name: 'Batiscan',
    center: [-1000, 0], population: 950, founded: 1684, type: 'hameau',
    industry: 'tourisme', secondaryIndustry: 'agriculture',
    landmarks: ['vieux_presbytere', 'quai_fleuve'],
    motto: 'Le vieux presbytère',
    description: "Hameau riverain dont le presbytère de 1816, transformé en musée, garde la mémoire du Régime français.",
    wallPalette: [QC_PALETTE.pierreChamps, QC_PALETTE.boisBlanc, QC_PALETTE.pierreGrise],
    roofPalette: [QC_PALETTE.toleRouge, QC_PALETTE.toleArgent],
    churchStyle: 'pierre_grise', churchScale: 0.95,
    mainRoadAngle: 0.02, density: 0.6, setbackBase: 13, gridPattern: false,
    terrain: 'plaine_fleuve', forestDensity: 0.35, farmCount: 6,
    fieldColors: [0x7a8a4a, 0x8a9450, 0x6a7a42],
    hasRiver: true, riverAngle: 1.6,
    hasDepanneur: false, hasCaisse: false, hasEcole: false, hasGarage: false,
    sugarShackCount: 2,
  },

  // ═══ SAINT-TITE — LA VILLE WESTERN, FESTIVAL ET RODÉO ═══
  {
    name: 'Saint-Tite',
    center: [-1200, -900], population: 3800, founded: 1863, type: 'ville',
    industry: 'western', secondaryIndustry: 'foresterie',
    landmarks: ['arene_rodeo'],
    motto: 'Capitale western du Québec',
    description: "Dix jours par année, Saint-Tite devient le Far West. Son arène de rodéo, ses trottoirs de bois et ses commerces de cuir attirent 600 000 visiteurs.",
    wallPalette: [0x8a6a48, 0xa08050, QC_PALETTE.boisRouge, 0x7a5638], // bois brut western
    roofPalette: [QC_PALETTE.toleRouge, 0x6a4a30, QC_PALETTE.toleNoire],
    churchStyle: 'brique_rouge', churchScale: 1.05,
    mainRoadAngle: 0.3, density: 1.15, setbackBase: 8, // façades collées à la rue
    gridPattern: true,
    terrain: 'colline', forestDensity: 0.65, farmCount: 5,
    fieldColors: [0x7a8a4a, 0x8a9450, 0x9a8a50],
    hasRiver: false,
    hasDepanneur: true, hasCaisse: true, hasEcole: true, hasGarage: true,
    sugarShackCount: 3,
  },

  // ═══ QUÉBEC — la métropole à l'est ═══
  {
    name: 'Québec',
    center: [1300, 0], population: 550000, founded: 1608, type: 'metropole',
    industry: 'urbain',
    landmarks: ['quai_fleuve'],
    motto: 'La Vieille Capitale',
    description: "La capitale nationale, visible à l'horizon est. Ses tours et son cap dominent le fleuve.",
    wallPalette: [QC_PALETTE.pierreGrise, QC_PALETTE.brique, 0x8a8a90, 0x6a6a72],
    roofPalette: [QC_PALETTE.toleNoire, QC_PALETTE.bardeauGris, QC_PALETTE.toleVerte],
    churchStyle: 'pierre_grise', churchScale: 1.5,
    mainRoadAngle: 0, density: 1.5, setbackBase: 8, gridPattern: true,
    terrain: 'colline', forestDensity: 0.1, farmCount: 0,
    fieldColors: [],
    hasRiver: false,
    hasDepanneur: true, hasCaisse: true, hasEcole: true, hasGarage: true,
    sugarShackCount: 0,
  },

  // ═══ TROIS-RIVIÈRES — la métropole à l'ouest ═══
  {
    name: 'Trois-Rivières',
    center: [-1300, 0], population: 140000, founded: 1634, type: 'metropole',
    industry: 'urbain', secondaryIndustry: 'papeterie',
    landmarks: ['usine_papier', 'quai_fleuve'],
    motto: 'Capitale du papier',
    description: "Ville industrielle historique à l'embouchure du Saint-Maurice. Ses papetières ont fait sa fortune.",
    wallPalette: [QC_PALETTE.brique, QC_PALETTE.pierreGrise, 0x7a7a80],
    roofPalette: [QC_PALETTE.toleNoire, QC_PALETTE.bardeauGris],
    churchStyle: 'pierre_grise', churchScale: 1.4,
    mainRoadAngle: 0, density: 1.45, setbackBase: 9, gridPattern: true,
    terrain: 'plaine_fleuve', forestDensity: 0.1, farmCount: 0,
    fieldColors: [],
    hasRiver: true, riverAngle: 1.5,
    hasDepanneur: true, hasCaisse: true, hasEcole: true, hasGarage: true,
    sugarShackCount: 0,
  },
];

export function getProfile(name: string): VillageProfile | undefined {
  return VILLAGE_PROFILES.find((p) => p.name === name);
}

// ═══════════════════════════════════════════════════════════════════════════
//  CONSTRUCTEURS DE MONUMENTS — ce qui rend chaque village reconnaissable
// ═══════════════════════════════════════════════════════════════════════════

/**
 * MOULIN À VENT DE GRONDINES — tour de pierre conique, 1674.
 */
export function buildMoulinAVent(): THREE.Group {
  const g = new THREE.Group();
  g.name = 'moulin_vent';

  const stoneMat = matLib.get(QC_PALETTE.pierreChamps, 0.98);
  // Tour tronconique
  const tower = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 4.4, 11, 16), stoneMat);
  tower.position.y = 5.5;
  tower.castShadow = true;
  tower.receiveShadow = true;
  g.add(tower);

  // Toit conique en bardeaux
  const cap = new THREE.Mesh(
    new THREE.ConeGeometry(3.8, 3, 16),
    matLib.get(0x5a4a38, 0.9)
  );
  cap.position.y = 12.4;
  cap.castShadow = true;
  g.add(cap);

  // Axe et ailes
  const hubMat = matLib.get(0x4a3828, 0.9);
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 1.2, 8), hubMat);
  hub.rotation.x = Math.PI / 2;
  hub.position.set(0, 11.5, 3.6);
  g.add(hub);

  const sails = new THREE.Group();
  sails.position.set(0, 11.5, 4.2);
  const sailMat = matLib.get(0x6a5540, 0.92);
  const clothMat = matLib.get(0xd8d0c0, 0.95);
  for (let i = 0; i < 4; i++) {
    const arm = new THREE.Group();
    const beam = new THREE.Mesh(new THREE.BoxGeometry(0.22, 7.5, 0.22), sailMat);
    beam.position.y = 3.75;
    arm.add(beam);
    // Toile
    const cloth = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 6.5), clothMat);
    cloth.position.set(0.9, 3.6, 0.05);
    arm.add(cloth);
    arm.rotation.z = (i / 4) * Math.PI * 2;
    sails.add(arm);
  }
  sails.userData.isWindmillSails = true;
  g.add(sails);
  g.userData.sails = sails;

  // Porte
  const door = new THREE.Mesh(
    new THREE.BoxGeometry(1.2, 2.2, 0.2),
    matLib.get(QC_PALETTE.porte, 0.85)
  );
  door.position.set(0, 1.1, 4.2);
  g.add(door);

  g.userData.landmark = 'moulin_vent';
  return g;
}

/**
 * MOULIN À EAU DE LA CHEVROTIÈRE — bâtiment de pierre et roue à aubes.
 */
export function buildMoulinAEau(): THREE.Group {
  const g = new THREE.Group();
  g.name = 'moulin_eau';

  const stoneMat = matLib.get(QC_PALETTE.pierreGrise, 0.97);
  const body = new THREE.Mesh(new THREE.BoxGeometry(11, 8, 9), stoneMat);
  body.position.y = 4;
  body.castShadow = true;
  body.receiveShadow = true;
  g.add(body);

  // Toit à forte pente
  const roofMat = matLib.get(QC_PALETTE.toleArgent, 0.6, 0.4);
  for (const side of [-1, 1]) {
    const panel = new THREE.Mesh(new THREE.BoxGeometry(6.8, 0.16, 9.6), roofMat);
    panel.position.set(side * 2.9, 9.4, 0);
    panel.rotation.z = side * -0.72;
    panel.castShadow = true;
    g.add(panel);
  }

  // Roue à aubes
  const wheel = new THREE.Group();
  const rimMat = matLib.get(0x5a4530, 0.95);
  const ring1 = new THREE.Mesh(new THREE.TorusGeometry(3.2, 0.18, 8, 24), rimMat);
  const ring2 = ring1.clone();
  ring1.position.z = -0.7;
  ring2.position.z = 0.7;
  wheel.add(ring1, ring2);

  // Aubes
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    const paddle = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.1, 1.6), rimMat);
    paddle.position.set(Math.cos(a) * 2.9, Math.sin(a) * 2.9, 0);
    paddle.rotation.z = a;
    wheel.add(paddle);
  }
  wheel.position.set(6.5, 3.2, 0);
  wheel.rotation.y = Math.PI / 2;
  wheel.userData.isWaterWheel = true;
  g.add(wheel);
  g.userData.wheel = wheel;

  // Fenêtres
  for (const y of [2.5, 5.5]) {
    for (const x of [-3, 0, 3]) {
      const win = new THREE.Mesh(
        new THREE.PlaneGeometry(1, 1.3),
        matLib.get(0x2a3440, 0.3, 0.4)
      );
      win.position.set(x, y, 4.55);
      g.add(win);
    }
  }

  g.userData.landmark = 'moulin_eau';
  return g;
}

/**
 * USINE DE PAPIER — Donnacona. Cheminées, entrepôts, fumée.
 */
export function buildUsinePapier(): THREE.Group {
  const g = new THREE.Group();
  g.name = 'usine_papier';

  const wallMat = matLib.get(0x8a8880, 0.95);
  const metalMat = matLib.get(0x6a6a70, 0.6, 0.55);

  // Corps principal (grande halle)
  const main = new THREE.Mesh(new THREE.BoxGeometry(48, 16, 26), wallMat);
  main.position.y = 8;
  main.castShadow = true;
  main.receiveShadow = true;
  g.add(main);

  // Toit en dents de scie (sheds industriels)
  for (let i = 0; i < 6; i++) {
    const shedX = -20 + i * 8;
    const slope = new THREE.Mesh(new THREE.BoxGeometry(8, 0.3, 26), metalMat);
    slope.position.set(shedX, 17.5, 0);
    slope.rotation.z = -0.35;
    g.add(slope);
    // Verrière
    const glass = new THREE.Mesh(
      new THREE.PlaneGeometry(3, 26),
      matLib.get(0x506878, 0.2, 0.6)
    );
    glass.position.set(shedX + 2.6, 18.4, 0);
    glass.rotation.set(-Math.PI / 2, 0, 0);
    glass.rotation.z = 1.2;
    g.add(glass);
  }

  // Grandes cheminées (la signature de Donnacona)
  for (const [cx, h, r] of [[-16, 34, 2.2], [-8, 28, 1.8]] as Array<[number, number, number]>) {
    const stack = new THREE.Mesh(
      new THREE.CylinderGeometry(r * 0.8, r, h, 14),
      matLib.get(0xb0a89a, 0.9)
    );
    stack.position.set(cx, h / 2, -8);
    stack.castShadow = true;
    g.add(stack);

    // Bandes rouges au sommet
    const band = new THREE.Mesh(
      new THREE.CylinderGeometry(r * 0.84, r * 0.84, 2.5, 14),
      matLib.get(0xa03828, 0.9)
    );
    band.position.set(cx, h - 3, -8);
    g.add(band);

    g.userData[`smokeAnchor_${cx}`] = new THREE.Vector3(cx, h + 1, -8);
  }

  // Silos à copeaux
  for (const sx of [22, 28]) {
    const silo = new THREE.Mesh(
      new THREE.CylinderGeometry(3.5, 3.5, 20, 16),
      matLib.get(0xa8a49c, 0.85, 0.2)
    );
    silo.position.set(sx, 10, 6);
    silo.castShadow = true;
    g.add(silo);
    const domeTop = new THREE.Mesh(
      new THREE.SphereGeometry(3.5, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2),
      metalMat
    );
    domeTop.position.set(sx, 20, 6);
    g.add(domeTop);
  }

  // Convoyeur incliné
  const conveyor = new THREE.Mesh(new THREE.BoxGeometry(18, 1.4, 2.4), metalMat);
  conveyor.position.set(12, 13, 6);
  conveyor.rotation.z = 0.35;
  conveyor.castShadow = true;
  g.add(conveyor);

  // Piles de billots de bois
  const logMat = matLib.get(0x7a5a3a, 0.98);
  const logGeo = new THREE.CylinderGeometry(0.45, 0.45, 6, 8);
  logGeo.rotateZ(Math.PI / 2);
  const logInst = new THREE.InstancedMesh(logGeo, logMat, 120);
  const dummy = new THREE.Object3D();
  let li = 0;
  for (let stack = 0; stack < 3 && li < 120; stack++) {
    for (let row = 0; row < 6 && li < 120; row++) {
      for (let col = 0; col < 7 && li < 120; col++) {
        dummy.position.set(
          -34 + stack * 9,
          0.5 + row * 0.85,
          14 + col * 0.95 + (row % 2) * 0.45
        );
        dummy.updateMatrix();
        logInst.setMatrixAt(li++, dummy.matrix);
      }
    }
  }
  logInst.count = li;
  logInst.instanceMatrix.needsUpdate = true;
  logInst.castShadow = true;
  g.add(logInst);

  g.userData.landmark = 'usine_papier';
  return g;
}

/**
 * CARRIÈRE DE CALCAIRE — Saint-Marc. Gradins creusés, machinerie.
 */
export function buildCarriereCalcaire(): THREE.Group {
  const g = new THREE.Group();
  g.name = 'carriere_calcaire';

  const stoneMat = matLib.get(0xc8c4b8, 0.99);
  const stoneDark = matLib.get(0xa8a498, 0.99);

  // Gradins successifs (excavation en terrasses)
  for (let level = 0; level < 5; level++) {
    const r = 46 - level * 8;
    const depth = -level * 4.5;
    const ring = new THREE.Mesh(
      new THREE.CylinderGeometry(r, r - 7, 4.5, 20, 1, true),
      level % 2 === 0 ? stoneMat : stoneDark
    );
    ring.position.y = depth - 2.2;
    ring.receiveShadow = true;
    g.add(ring);

    // Plateforme du gradin
    const platform = new THREE.Mesh(
      new THREE.RingGeometry(r - 7, r, 20),
      stoneMat
    );
    platform.rotation.x = -Math.PI / 2;
    platform.position.y = depth;
    platform.receiveShadow = true;
    g.add(platform);
  }

  // Fond de la carrière (eau turquoise typique)
  const water = new THREE.Mesh(
    new THREE.CircleGeometry(12, 20),
    matLib.get(0x3a8a90, 0.15, 0.6)
  );
  water.rotation.x = -Math.PI / 2;
  water.position.y = -21;
  g.add(water);

  // Concasseur / installation de traitement
  const plantMat = matLib.get(0x8a7a60, 0.85, 0.3);
  const plant = new THREE.Mesh(new THREE.BoxGeometry(12, 14, 8), plantMat);
  plant.position.set(56, 7, 0);
  plant.castShadow = true;
  g.add(plant);

  const chute = new THREE.Mesh(new THREE.BoxGeometry(16, 1.2, 2), plantMat);
  chute.position.set(46, 10, 0);
  chute.rotation.z = 0.3;
  g.add(chute);

  // Tas de pierre concassée
  for (const [px, pz, s] of [[62, 12, 1], [62, -12, 0.8], [70, 0, 1.2]] as Array<[number, number, number]>) {
    const pile = new THREE.Mesh(
      new THREE.ConeGeometry(7 * s, 6 * s, 12),
      matLib.get(0xb8b4a8, 1)
    );
    pile.position.set(px, 3 * s, pz);
    pile.castShadow = true;
    g.add(pile);
  }

  // Blocs de pierre de taille (produit fini de Saint-Marc)
  const blockMat = matLib.get(0xd0ccc0, 0.95);
  const blockGeo = new THREE.BoxGeometry(2.4, 1.6, 1.6);
  const blockInst = new THREE.InstancedMesh(blockGeo, blockMat, 24);
  const dummy = new THREE.Object3D();
  for (let i = 0; i < 24; i++) {
    dummy.position.set(
      50 + (i % 4) * 2.8,
      0.8 + Math.floor(i / 12) * 1.7,
      20 + Math.floor((i % 12) / 4) * 2
    );
    dummy.updateMatrix();
    blockInst.setMatrixAt(i, dummy.matrix);
  }
  blockInst.instanceMatrix.needsUpdate = true;
  blockInst.castShadow = true;
  g.add(blockInst);

  g.userData.landmark = 'carriere_calcaire';
  return g;
}

/**
 * VILLAGE DE PÊCHE SUR GLACE — Sainte-Anne-de-la-Pérade.
 * Des centaines de cabanes colorées alignées sur la rivière gelée.
 */
export function buildVillagePeche(count = 90): THREE.Group {
  const g = new THREE.Group();
  g.name = 'village_peche';

  // Surface glacée
  const ice = new THREE.Mesh(
    new THREE.PlaneGeometry(220, 90),
    matLib.get(0xd8e8f0, 0.25, 0.35)
  );
  ice.rotation.x = -Math.PI / 2;
  ice.position.y = 0.05;
  ice.receiveShadow = true;
  g.add(ice);

  // Cabanes colorées — chacune sa couleur, comme dans la réalité
  const cabinColors = [
    0xd84040, 0x4080d0, 0x40b060, 0xe0b040, 0xd06090,
    0x8050c0, 0xe08040, 0x40b0b0, 0xf0f0e0, 0x606870,
  ];

  const bodyGeo = new THREE.BoxGeometry(2.6, 2.2, 3.4);
  const roofGeo = new THREE.BoxGeometry(3.0, 0.16, 3.8);

  // Une InstancedMesh par couleur pour garder la variété
  const perColor = Math.ceil(count / cabinColors.length);
  const dummy = new THREE.Object3D();

  cabinColors.forEach((color, ci) => {
    const mat = matLib.get(color, 0.9);
    const bodyInst = new THREE.InstancedMesh(bodyGeo, mat, perColor);
    const roofInst = new THREE.InstancedMesh(roofGeo, matLib.get(0x3a3a40, 0.9), perColor);
    let placed = 0;

    for (let i = 0; i < perColor; i++) {
      const globalIdx = ci * perColor + i;
      if (globalIdx >= count) break;
      // Alignement en rues, comme le vrai village
      const row = Math.floor(globalIdx / 15);
      const col = globalIdx % 15;
      const x = -95 + col * 13 + (Math.random() - 0.5) * 2.5;
      const z = -32 + row * 11 + (Math.random() - 0.5) * 2;
      const rotY = (Math.random() - 0.5) * 0.3;

      dummy.position.set(x, 1.2, z);
      dummy.rotation.set(0, rotY, 0);
      dummy.updateMatrix();
      bodyInst.setMatrixAt(placed, dummy.matrix);

      dummy.position.set(x, 2.35, z);
      dummy.updateMatrix();
      roofInst.setMatrixAt(placed, dummy.matrix);
      placed++;
    }

    if (placed > 0) {
      bodyInst.count = placed;
      roofInst.count = placed;
      bodyInst.instanceMatrix.needsUpdate = true;
      roofInst.instanceMatrix.needsUpdate = true;
      bodyInst.castShadow = true;
      g.add(bodyInst, roofInst);
    }
  });

  // Petites cheminées fumantes
  const chimGeo = new THREE.CylinderGeometry(0.09, 0.09, 0.8, 6);
  const chimInst = new THREE.InstancedMesh(chimGeo, matLib.get(0x404048, 0.8, 0.4), count);
  for (let i = 0; i < count; i++) {
    const row = Math.floor(i / 15);
    const col = i % 15;
    dummy.position.set(-95 + col * 13 + 0.8, 2.9, -32 + row * 11);
    dummy.updateMatrix();
    chimInst.setMatrixAt(i, dummy.matrix);
  }
  chimInst.instanceMatrix.needsUpdate = true;
  g.add(chimInst);

  g.userData.landmark = 'village_peche';
  g.userData.seasonal = 'hiver'; // visible seulement en hiver
  return g;
}

/**
 * ARÈNE DE RODÉO — Saint-Tite. Gradins, corral, panneau western.
 */
export function buildAreneRodeo(): THREE.Group {
  const g = new THREE.Group();
  g.name = 'arene_rodeo';

  const woodMat = matLib.get(0x8a6a48, 0.95);
  const woodDark = matLib.get(0x6a4a30, 0.95);
  const dirtMat = matLib.get(0xa08858, 1);

  // Piste de terre battue (ovale)
  const arena = new THREE.Mesh(new THREE.CircleGeometry(30, 32), dirtMat);
  arena.rotation.x = -Math.PI / 2;
  arena.scale.set(1, 0.72, 1);
  arena.position.y = 0.03;
  arena.receiveShadow = true;
  g.add(arena);

  // Clôture de l'arène (poteaux + lisses)
  const postGeo = new THREE.BoxGeometry(0.28, 2.2, 0.28);
  const postInst = new THREE.InstancedMesh(postGeo, woodDark, 48);
  const railGeo = new THREE.BoxGeometry(4.2, 0.18, 0.14);
  const railInst = new THREE.InstancedMesh(railGeo, woodMat, 96);
  const dummy = new THREE.Object3D();

  for (let i = 0; i < 48; i++) {
    const a = (i / 48) * Math.PI * 2;
    const x = Math.cos(a) * 30;
    const z = Math.sin(a) * 21.6;
    dummy.position.set(x, 1.1, z);
    dummy.rotation.set(0, -a, 0);
    dummy.updateMatrix();
    postInst.setMatrixAt(i, dummy.matrix);

    // Deux lisses par intervalle
    for (let r = 0; r < 2; r++) {
      const na = ((i + 0.5) / 48) * Math.PI * 2;
      dummy.position.set(Math.cos(na) * 30, 0.7 + r * 0.8, Math.sin(na) * 21.6);
      dummy.rotation.set(0, -na + Math.PI / 2, 0);
      dummy.updateMatrix();
      railInst.setMatrixAt(i * 2 + r, dummy.matrix);
    }
  }
  postInst.instanceMatrix.needsUpdate = true;
  railInst.instanceMatrix.needsUpdate = true;
  postInst.castShadow = true;
  g.add(postInst, railInst);

  // Gradins (deux sections)
  for (const side of [-1, 1]) {
    const stand = new THREE.Group();
    for (let row = 0; row < 8; row++) {
      const bench = new THREE.Mesh(
        new THREE.BoxGeometry(34, 0.5, 1.3),
        woodMat
      );
      bench.position.set(0, 0.9 + row * 0.62, row * 1.35);
      bench.castShadow = true;
      bench.receiveShadow = true;
      stand.add(bench);
    }
    // Structure porteuse
    const frame = new THREE.Mesh(new THREE.BoxGeometry(34, 0.6, 12), woodDark);
    frame.position.set(0, 0.3, 5.5);
    stand.add(frame);

    stand.position.set(0, 0, side * 28);
    stand.rotation.y = side > 0 ? 0 : Math.PI;
    g.add(stand);
  }

  // Portail western avec enseigne
  const gateGroup = new THREE.Group();
  for (const px of [-7, 7]) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.8, 8, 0.8), woodDark);
    post.position.set(px, 4, 0);
    post.castShadow = true;
    gateGroup.add(post);
  }
  const banner = new THREE.Mesh(new THREE.BoxGeometry(15, 2.6, 0.35), woodMat);
  banner.position.y = 7.2;
  banner.castShadow = true;
  gateGroup.add(banner);

  // Lettrage lumineux
  const signMat = matLib.getEmissive(0xf0c040, 0xffb020, 1.1);
  const letters = new THREE.Mesh(new THREE.BoxGeometry(12.5, 1.4, 0.2), signMat);
  letters.position.set(0, 7.2, 0.28);
  gateGroup.add(letters);

  gateGroup.position.set(0, 0, -34);
  g.add(gateGroup);

  // Boxes de départ (chutes) pour les taureaux
  for (let i = 0; i < 4; i++) {
    const chute = new THREE.Mesh(new THREE.BoxGeometry(2.4, 2.4, 3.4), woodDark);
    chute.position.set(-9 + i * 6, 1.2, 24);
    chute.castShadow = true;
    g.add(chute);
  }

  g.userData.landmark = 'arene_rodeo';
  return g;
}

/**
 * SCIERIE — Saint-Raymond. Hangar, piles de bois, convoyeur.
 */
export function buildScierie(): THREE.Group {
  const g = new THREE.Group();
  g.name = 'scierie';

  const metalMat = matLib.get(0x7a7a80, 0.7, 0.5);
  const woodMat = matLib.get(0xc0a878, 0.97);

  // Hangar principal
  const hangar = new THREE.Mesh(new THREE.BoxGeometry(30, 11, 18), metalMat);
  hangar.position.y = 5.5;
  hangar.castShadow = true;
  hangar.receiveShadow = true;
  g.add(hangar);

  // Toit à deux versants
  for (const side of [-1, 1]) {
    const panel = new THREE.Mesh(new THREE.BoxGeometry(17, 0.2, 18.6), metalMat);
    panel.position.set(side * 7.5, 12.4, 0);
    panel.rotation.z = side * -0.42;
    panel.castShadow = true;
    g.add(panel);
  }

  // Ouverture (pas de mur avant)
  const opening = new THREE.Mesh(
    new THREE.BoxGeometry(14, 8, 0.3),
    matLib.get(0x1a1a1e, 0.95)
  );
  opening.position.set(0, 4, 9.1);
  g.add(opening);

  // Piles de planches sciées
  const plankGeo = new THREE.BoxGeometry(8, 0.18, 3.2);
  const plankInst = new THREE.InstancedMesh(plankGeo, woodMat, 140);
  const dummy = new THREE.Object3D();
  let pi = 0;
  for (let stack = 0; stack < 4 && pi < 140; stack++) {
    for (let layer = 0; layer < 12 && pi < 140; layer++) {
      for (let n = 0; n < 3 && pi < 140; n++) {
        dummy.position.set(
          -22 + stack * 11,
          0.3 + layer * 0.24,
          -14 + n * 3.5
        );
        dummy.updateMatrix();
        plankInst.setMatrixAt(pi++, dummy.matrix);
      }
    }
  }
  plankInst.count = pi;
  plankInst.instanceMatrix.needsUpdate = true;
  plankInst.castShadow = true;
  g.add(plankInst);

  // Billots bruts en attente
  const logMat = matLib.get(0x6a5038, 0.98);
  const logGeo = new THREE.CylinderGeometry(0.5, 0.5, 7, 8);
  logGeo.rotateZ(Math.PI / 2);
  const logInst = new THREE.InstancedMesh(logGeo, logMat, 70);
  let li = 0;
  for (let row = 0; row < 7 && li < 70; row++) {
    for (let col = 0; col < 10 && li < 70; col++) {
      dummy.position.set(
        20 + (row % 2) * 0.5,
        0.6 + row * 0.92,
        -12 + col * 1.05
      );
      dummy.updateMatrix();
      logInst.setMatrixAt(li++, dummy.matrix);
    }
  }
  logInst.count = li;
  logInst.instanceMatrix.needsUpdate = true;
  logInst.castShadow = true;
  g.add(logInst);

  // Silo à bran de scie
  const silo = new THREE.Mesh(
    new THREE.CylinderGeometry(2.6, 2.6, 13, 14),
    matLib.get(0x9a9690, 0.85, 0.2)
  );
  silo.position.set(18, 6.5, 8);
  silo.castShadow = true;
  g.add(silo);

  g.userData.landmark = 'scierie';
  return g;
}

/**
 * MARINA — Portneuf. Quais flottants, bateaux, capitainerie.
 */
export function buildMarina(): THREE.Group {
  const g = new THREE.Group();
  g.name = 'marina';

  const dockMat = matLib.get(0x8a7a62, 0.95);

  // Quai principal
  const mainDock = new THREE.Mesh(new THREE.BoxGeometry(50, 0.5, 4), dockMat);
  mainDock.position.set(0, 0.3, 0);
  mainDock.receiveShadow = true;
  g.add(mainDock);

  // Pontons perpendiculaires
  for (let i = 0; i < 5; i++) {
    const finger = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.4, 20), dockMat);
    finger.position.set(-20 + i * 10, 0.3, 12);
    finger.receiveShadow = true;
    g.add(finger);
  }

  // Bateaux amarrés (coques simplifiées)
  const hullColors = [0xf0f0e8, 0xd8d8d0, 0x3a5a80, 0xc04040, 0xe8e8e0];
  for (let i = 0; i < 14; i++) {
    const boat = new THREE.Group();
    const color = hullColors[i % hullColors.length];
    const hull = new THREE.Mesh(
      new THREE.BoxGeometry(2.2, 1.2, 6.5),
      matLib.get(color, 0.4, 0.25)
    );
    hull.position.y = 0.2;
    boat.add(hull);
    // Proue effilée
    const bow = new THREE.Mesh(
      new THREE.ConeGeometry(1.1, 2.2, 4),
      matLib.get(color, 0.4, 0.25)
    );
    bow.rotation.x = -Math.PI / 2;
    bow.rotation.y = Math.PI / 4;
    bow.position.set(0, 0.2, 4.2);
    boat.add(bow);
    // Cabine
    const cabin = new THREE.Mesh(
      new THREE.BoxGeometry(1.7, 1.1, 2.4),
      matLib.get(0xe8e8e0, 0.5, 0.1)
    );
    cabin.position.set(0, 1.2, -0.5);
    boat.add(cabin);
    // Mât (pour les voiliers)
    if (i % 3 === 0) {
      const mast = new THREE.Mesh(
        new THREE.CylinderGeometry(0.08, 0.1, 9, 6),
        matLib.get(0xd0d0c8, 0.4, 0.6)
      );
      mast.position.set(0, 5.5, 0);
      boat.add(mast);
    }

    const side = i % 2 === 0 ? 1 : -1;
    const slot = Math.floor(i / 2);
    boat.position.set(-19 + slot * 10 + side * 2.6, 0, 8 + (i % 4) * 3.5);
    boat.rotation.y = (Math.random() - 0.5) * 0.12;
    boat.userData.isBoat = true;
    g.add(boat);
  }

  // Capitainerie
  const office = new THREE.Mesh(
    new THREE.BoxGeometry(7, 4, 6),
    matLib.get(QC_PALETTE.boisBlanc, 0.9)
  );
  office.position.set(-26, 2, -6);
  office.castShadow = true;
  g.add(office);

  const officeRoof = new THREE.Mesh(
    new THREE.BoxGeometry(8, 0.3, 7),
    matLib.get(QC_PALETTE.toleRouge, 0.8)
  );
  officeRoof.position.set(-26, 4.2, -6);
  g.add(officeRoof);

  // Mât de pavillon
  const flagPole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.08, 0.1, 10, 6),
    matLib.get(0xd0d0c8, 0.4, 0.5)
  );
  flagPole.position.set(-20, 5, -6);
  g.add(flagPole);

  const flag = new THREE.Mesh(
    new THREE.PlaneGeometry(2.4, 1.5),
    matLib.get(0x2050a0, 0.85)
  );
  flag.position.set(-18.8, 9, -6);
  flag.userData.isFlag = true;
  g.add(flag);

  g.userData.landmark = 'marina';
  return g;
}

/**
 * VIEUX PRESBYTÈRE — Batiscan. Maison de pierre du Régime français.
 */
export function buildVieuxPresbytere(): THREE.Group {
  const g = new THREE.Group();
  g.name = 'vieux_presbytere';

  const stoneMat = matLib.get(QC_PALETTE.pierreChamps, 0.98);
  const body = new THREE.Mesh(new THREE.BoxGeometry(16, 6, 10), stoneMat);
  body.position.y = 3;
  body.castShadow = true;
  body.receiveShadow = true;
  g.add(body);

  // Toit très pentu à la française
  const roofMat = matLib.get(QC_PALETTE.toleRouge, 0.75, 0.2);
  for (const side of [-1, 1]) {
    const panel = new THREE.Mesh(new THREE.BoxGeometry(9.5, 0.18, 11), roofMat);
    panel.position.set(side * 4.2, 8.2, 0);
    panel.rotation.z = side * -0.62;
    panel.castShadow = true;
    g.add(panel);
  }

  // Pignons
  const gableShape = new THREE.Shape();
  gableShape.moveTo(-8, 0); gableShape.lineTo(8, 0);
  gableShape.lineTo(0, 4.6); gableShape.closePath();
  const gableGeo = new THREE.ExtrudeGeometry(gableShape, { depth: 0.2, bevelEnabled: false });
  for (const z of [5, -5.2]) {
    const gable = new THREE.Mesh(gableGeo, stoneMat);
    gable.position.set(0, 6, z);
    g.add(gable);
  }

  // Deux cheminées massives (typique)
  for (const cx of [-6, 6]) {
    const chim = new THREE.Mesh(new THREE.BoxGeometry(1.4, 4, 1.2), stoneMat);
    chim.position.set(cx, 9, 0);
    chim.castShadow = true;
    g.add(chim);
  }

  // Fenêtres à petits carreaux
  for (const x of [-5.5, -1.8, 1.8, 5.5]) {
    const win = new THREE.Mesh(
      new THREE.PlaneGeometry(1.1, 1.5),
      matLib.get(0x2a3440, 0.25, 0.4)
    );
    win.position.set(x, 3.4, 5.05);
    g.add(win);
    // Contrevents
    for (const off of [-0.75, 0.75]) {
      const shutter = new THREE.Mesh(
        new THREE.BoxGeometry(0.55, 1.6, 0.08),
        matLib.get(QC_PALETTE.boiserieVerte, 0.85)
      );
      shutter.position.set(x + off, 3.4, 5.08);
      g.add(shutter);
    }
  }

  // Porte centrale
  const door = new THREE.Mesh(
    new THREE.BoxGeometry(1.3, 2.3, 0.15),
    matLib.get(QC_PALETTE.porte, 0.8)
  );
  door.position.set(0, 1.15, 5.05);
  g.add(door);

  g.userData.landmark = 'vieux_presbytere';
  return g;
}

/**
 * BARRAGE — Pont-Rouge / Donnacona. Ouvrage de béton et chute d'eau.
 */
export function buildBarrage(): THREE.Group {
  const g = new THREE.Group();
  g.name = 'barrage';

  const concreteMat = matLib.get(0x9a9a94, 0.95);

  // Mur du barrage
  const wall = new THREE.Mesh(new THREE.BoxGeometry(44, 12, 5), concreteMat);
  wall.position.y = 6;
  wall.castShadow = true;
  wall.receiveShadow = true;
  g.add(wall);

  // Vannes
  for (let i = 0; i < 4; i++) {
    const gate = new THREE.Mesh(
      new THREE.BoxGeometry(7, 8, 0.6),
      matLib.get(0x5a6068, 0.6, 0.65)
    );
    gate.position.set(-16.5 + i * 11, 5, 2.6);
    g.add(gate);

    // Chute d'eau sous chaque vanne
    const fall = new THREE.Mesh(
      new THREE.PlaneGeometry(6.5, 11),
      matLib.get(0xd8e8f0, 0.1, 0.3)
    );
    fall.position.set(-16.5 + i * 11, 4, 3.2);
    fall.userData.isWaterfall = true;
    g.add(fall);
  }

  // Passerelle
  const walkway = new THREE.Mesh(new THREE.BoxGeometry(46, 0.4, 2.5), concreteMat);
  walkway.position.set(0, 12.2, 0);
  g.add(walkway);

  // Garde-corps
  const railMat = matLib.get(0x8a8a90, 0.5, 0.7);
  for (const z of [-1.1, 1.1]) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(46, 0.1, 0.1), railMat);
    rail.position.set(0, 13.4, z);
    g.add(rail);
  }

  // Bassin de dissipation (écume)
  const foam = new THREE.Mesh(
    new THREE.PlaneGeometry(44, 14),
    matLib.get(0xe8f0f4, 0.3, 0.2)
  );
  foam.rotation.x = -Math.PI / 2;
  foam.position.set(0, 0.15, 10);
  g.add(foam);

  // Centrale électrique attenante
  const powerhouse = new THREE.Mesh(
    new THREE.BoxGeometry(12, 9, 10),
    matLib.get(0xa8a49c, 0.9)
  );
  powerhouse.position.set(28, 4.5, 4);
  powerhouse.castShadow = true;
  g.add(powerhouse);

  g.userData.landmark = 'barrage';
  return g;
}

/**
 * PONT COUVERT — rouge, emblématique des campagnes québécoises.
 */
export function buildPontCouvert(): THREE.Group {
  const g = new THREE.Group();
  g.name = 'pont_couvert';

  const woodMat = matLib.get(QC_PALETTE.boisRouge, 0.95);
  const roofMat = matLib.get(QC_PALETTE.toleArgent, 0.6, 0.4);

  const len = 26, w = 5.5, h = 4.5;

  // Tablier
  const deck = new THREE.Mesh(
    new THREE.BoxGeometry(w, 0.5, len),
    matLib.get(0x7a5a3a, 0.98)
  );
  deck.position.y = 2;
  deck.receiveShadow = true;
  g.add(deck);

  // Parois latérales
  for (const side of [-1, 1]) {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(0.25, h, len), woodMat);
    wall.position.set(side * w / 2, 2.25 + h / 2, 0);
    wall.castShadow = true;
    g.add(wall);
  }

  // Toit
  for (const side of [-1, 1]) {
    const panel = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.15, len + 1), roofMat);
    panel.position.set(side * 1.6, h + 3.1, 0);
    panel.rotation.z = side * -0.42;
    panel.castShadow = true;
    g.add(panel);
  }

  // Portails d'entrée (pignons rouges)
  const portalShape = new THREE.Shape();
  portalShape.moveTo(-w / 2 - 0.3, 0);
  portalShape.lineTo(w / 2 + 0.3, 0);
  portalShape.lineTo(w / 2 + 0.3, h);
  portalShape.lineTo(0, h + 1.4);
  portalShape.lineTo(-w / 2 - 0.3, h);
  portalShape.closePath();
  const portalGeo = new THREE.ExtrudeGeometry(portalShape, { depth: 0.3, bevelEnabled: false });
  for (const z of [len / 2, -len / 2 - 0.3]) {
    const portal = new THREE.Mesh(portalGeo, woodMat);
    portal.position.set(0, 2.25, z);
    g.add(portal);
  }

  // Piles de pierre
  for (const z of [len / 2 - 1, -len / 2 + 1]) {
    const pier = new THREE.Mesh(
      new THREE.BoxGeometry(w + 1.5, 4, 3),
      matLib.get(QC_PALETTE.pierreGrise, 0.98)
    );
    pier.position.set(0, 0, z);
    pier.receiveShadow = true;
    g.add(pier);
  }

  g.userData.landmark = 'pont_couvert';
  return g;
}

/**
 * QUAI SUR LE FLEUVE — structure de bois avec bollards.
 */
export function buildQuaiFleuve(): THREE.Group {
  const g = new THREE.Group();
  g.name = 'quai_fleuve';

  const deckMat = matLib.get(0x8a7a62, 0.96);
  const deck = new THREE.Mesh(new THREE.BoxGeometry(8, 0.6, 34), deckMat);
  deck.position.y = 1.5;
  deck.receiveShadow = true;
  deck.castShadow = true;
  g.add(deck);

  // Pilotis
  const pileGeo = new THREE.CylinderGeometry(0.28, 0.3, 4, 8);
  const pileMat = matLib.get(0x4a3a2a, 0.98);
  const pileInst = new THREE.InstancedMesh(pileGeo, pileMat, 24);
  const dummy = new THREE.Object3D();
  let i = 0;
  for (let row = 0; row < 12; row++) {
    for (const side of [-1, 1]) {
      dummy.position.set(side * 3.2, -0.5, -16 + row * 3);
      dummy.updateMatrix();
      pileInst.setMatrixAt(i++, dummy.matrix);
    }
  }
  pileInst.instanceMatrix.needsUpdate = true;
  g.add(pileInst);

  // Bollards d'amarrage
  const bollardMat = matLib.get(0x3a3a40, 0.7, 0.5);
  for (const z of [-12, -4, 4, 12]) {
    for (const side of [-1, 1]) {
      const bollard = new THREE.Mesh(
        new THREE.CylinderGeometry(0.22, 0.28, 0.9, 8),
        bollardMat
      );
      bollard.position.set(side * 3.4, 2.25, z);
      g.add(bollard);
    }
  }

  // Cabanon de pêcheur au bout
  const shed = new THREE.Mesh(
    new THREE.BoxGeometry(3.5, 2.6, 3),
    matLib.get(QC_PALETTE.boisGris, 0.95)
  );
  shed.position.set(0, 3.1, -14);
  shed.castShadow = true;
  g.add(shed);

  const shedRoof = new THREE.Mesh(
    new THREE.BoxGeometry(4, 0.2, 3.5),
    matLib.get(QC_PALETTE.toleRouge, 0.8)
  );
  shedRoof.position.set(0, 4.5, -14);
  g.add(shedRoof);

  g.userData.landmark = 'quai_fleuve';
  return g;
}

// ─────────────────────────────────────────────────────────────────────────
//  FABRIQUE DE MONUMENTS
// ─────────────────────────────────────────────────────────────────────────

const LANDMARK_BUILDERS: Record<Landmark, () => THREE.Group> = {
  moulin_vent: buildMoulinAVent,
  moulin_eau: buildMoulinAEau,
  vieux_presbytere: buildVieuxPresbytere,
  usine_papier: buildUsinePapier,
  carriere_calcaire: buildCarriereCalcaire,
  village_peche: () => buildVillagePeche(90),
  arene_rodeo: buildAreneRodeo,
  barrage: buildBarrage,
  scierie: buildScierie,
  marina: buildMarina,
  rue_patrimoniale: () => new THREE.Group(), // géré par le VillageBuilder
  champ_mais: () => new THREE.Group(),       // géré par le VillageBuilder
  pont_couvert: buildPontCouvert,
  quai_fleuve: buildQuaiFleuve,
};

export function buildLandmark(type: Landmark): THREE.Group {
  const builder = LANDMARK_BUILDERS[type];
  return builder ? builder() : new THREE.Group();
}

/**
 * Anime les monuments qui bougent (moulins, roues à eau, drapeaux).
 * À appeler dans la boucle de rendu.
 */
export function animateLandmarks(root: THREE.Object3D, elapsed: number, delta: number): void {
  root.traverse((obj) => {
    if (obj.userData.isWindmillSails) {
      obj.rotation.z += delta * 0.35;
    }
    if (obj.userData.isWaterWheel) {
      obj.rotation.x += delta * 0.5;
    }
    if (obj.userData.isFlag) {
      obj.rotation.y = Math.sin(elapsed * 1.8) * 0.22;
    }
    if (obj.userData.isBoat) {
      obj.rotation.z = Math.sin(elapsed * 1.1 + obj.position.x) * 0.028;
      obj.position.y = Math.sin(elapsed * 0.9 + obj.position.z) * 0.09;
    }
    if (obj.userData.isWaterfall) {
      const mat = (obj as THREE.Mesh).material as THREE.MeshStandardMaterial;
      if (mat) mat.opacity = 0.65 + Math.sin(elapsed * 6) * 0.12;
    }
  });
}