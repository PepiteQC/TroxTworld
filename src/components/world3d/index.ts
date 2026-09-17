/**
 * Barrel world3d — façade TroxTWorld sur le moteur Portneuf (Three.js impératif).
 * Les noms R3F d'origine sont ré-exportés vers les modules live du comté.
 */
export { PortneufWorld as Scene3D } from "../../game/world";
export { buildCity as CityScene, buildCity as CityMap3D, buildCity as BuildingsRenderer } from "../../game/city";
export { fillPlayer as Player3D, fillPlayer as PlayerCharacter } from "../../game/character";
export { attachPhoneProp as PlayerAccessory } from "../../game/gestures";
export { RemoteField as RemotePlayers3D } from "../../game/remotes";
export { Vehicle as Vehicles3D } from "../../game/vehicle";
export { WildlifeSystem as Wildlife3D } from "../../game/wildlife";
export { WorldItemField as WorldItems } from "../../game/worlditems";
export { buildSecurityDoor as SecurityDoor, buildBathroomFixtures as BathroomFixtures, buildWindowWithCurtains as WindowWithCurtains } from "../../game/fixtures";
export { WeatherFx as WeatherParticles, WeatherFx as WeatherSystem } from "../../game/weatherfx";
export { quebecSeasons as EnvironmentController } from "../../game/seasons";
export { Walker as AnimatedCharacterController } from "../../game/walker";
export { CharacterAnimationManager, CharacterAnimationManager as AnimatedCharacterMixer } from "../../game/characterAnim";
export { CreatorOverlay as CharacterViewer, CreatorOverlay as CharacterCreator } from "../../game/creator";
export { PortneufApp as TroxTWorld, PortneufApp as default } from "../../game/Game";
export { BuilderOverlay as TroxTMOD3D } from "../../game/buildui";
export { applyGesture, RP_GESTURES, type RpGesture } from "../../game/gestures";
export { CAMERA_CYCLE, CAMERA_LABEL, type CameraMode } from "../../game/store";
export {
  police,
  CSR_CITATIONS,
  SQ_RANK_LABEL,
  SQ_LEGAL_BAC,
  type SQRank,
  type SQInfractionTicket,
  type SQBreathalyzerTest,
  type SQPatrolUnitState,
} from "../../game/police";
