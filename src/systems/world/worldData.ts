import { World } from "./schema/WorldTypes";

export const defaultQuebecWorld: World = {
  meta: {
    bounds: {
      minX: -2000,
      maxX: 2000,
      minZ: -2000,
      maxZ: 2000,
    },
  },
  regions: [
    { id: "reg_portneuf", name: "Comté de Portneuf" },
    { id: "reg_st_laurent", name: "Rive du Saint-Laurent" },
    { id: "reg_arriere_pays", name: "Arrière-Pays Laurentien" },
  ],
  villages: [
    {
      id: "vil_portneuf",
      region: "reg_portneuf",
      pos: { x: 0, z: 0 },
      spawn: true,
    },
    {
      id: "vil_donnacona",
      region: "reg_st_laurent",
      pos: { x: 450, z: -320 },
    },
    {
      id: "vil_st_casimir",
      region: "reg_arriere_pays",
      pos: { x: -380, z: 410 },
    },
    {
      id: "vil_cap_sante",
      region: "reg_st_laurent",
      pos: { x: 280, z: 290 },
    },
  ],
  roads: [
    {
      id: "road_route_138",
      path: [
        { x: -500, z: 20 },
        { x: -380, z: 410 },
        { x: 0, z: 0 },
        { x: 280, z: 290 },
        { x: 450, z: -320 },
        { x: 600, z: -400 },
      ],
      speedLimit: 90,
      serves: ["vil_portneuf", "vil_donnacona", "vil_st_casimir", "vil_cap_sante"],
    },
    {
      id: "road_rang_saint_joseph",
      path: [
        { x: 0, z: 0 },
        { x: 100, z: -150 },
        { x: 220, z: -280 },
        { x: 450, z: -320 },
      ],
      speedLimit: 70,
      serves: ["vil_portneuf", "vil_donnacona"],
    },
  ],
  pois: [
    {
      id: "poi_cantine_portneuf",
      region: "reg_portneuf",
      pos: { x: 25, z: -15 },
    },
    {
      id: "poi_boutique_ether",
      region: "reg_portneuf",
      pos: { x: -30, z: 20 },
    },
    {
      id: "poi_marchand_cannabis",
      region: "reg_portneuf",
      pos: { x: 50, z: 40 },
    },
    {
      id: "poi_quay_st_laurent",
      region: "reg_st_laurent",
      pos: { x: 480, z: -350 },
    },
  ],
  activities: [
    {
      id: "act_poutine_challenge",
      region: "reg_portneuf",
      anchor: "poi_cantine_portneuf",
    },
    {
      id: "act_hoverboard_circuit",
      region: "reg_arriere_pays",
      anchor: "vil_st_casimir",
    },
  ],
  biomeZones: [
    { id: "zone_foret_laurentienne", region: "reg_arriere_pays" },
    { id: "zone_fleuve", region: "reg_st_laurent" },
    { id: "zone_agricole_portneuf", region: "reg_portneuf" },
  ],
};

export default defaultQuebecWorld;
