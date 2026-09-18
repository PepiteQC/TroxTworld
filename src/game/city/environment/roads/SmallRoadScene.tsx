import { PlayerCharacter } from './PlayerCharacter';
import { WeatherParticles, SceneFog } from './WeatherSystem';
import { HydroQuebecSystem } from './HydroQuebecSystem';
import { TreeField } from './LODSystem';
import { SmallRoadMarkings } from '../roads/shared/RoadMarkings';
import { DitchSystem } from '../roads/shared/DitchSystem';
import { VillageLamps } from '../roads/shared/HighwayLamps';
import { Depanneur, RoadSign, VillageBuildings } from './world/Village';
import { DynamicSky, Road, SceneLighting, Terrain } from './world/SceneEnvironment';

// ══ MAIN SCENE ════════════════════════════════════════════════
export function SmallRoadScene() {
  return (
    <>
      <SceneFog />
      <SceneLighting />
      <DynamicSky />
      <WeatherParticles />

      {/* Road surface */}
      <Road />

      {/* Terrain */}
      <Terrain />

      {/* Road markings */}
      <SmallRoadMarkings />

      {/* Ditches */}
      <DitchSystem length={200} roadWidth={13} side="both" />

      {/* Village lamps */}
      <VillageLamps length={200} spacing={20} zOffset={5.5} />

      {/* HydroQuébec poles (south side) */}
      <HydroQuebecSystem startX={-90} length={200} spacing={50} zOffset={-14} />

      {/* Tree lines */}
      <TreeField count={60} seed={11} area={[-100, -14, 100, -35]} />
      <TreeField count={60} seed={22} area={[-100, 20, 100, 40]} />
      <TreeField count={40} seed={33} area={[-100, -35, 100, -60]} />
      <TreeField count={40} seed={44} area={[-100, 40, 100, 65]} />

      {/* Village buildings */}
      <VillageBuildings />

      {/* Dépanneur */}
      <Depanneur position={[-20, 0, -26]} />

      {/* Road signs */}
      <RoadSign position={[-80, 0, -5]} text="Saint-Casimir" />
      <RoadSign position={[75, 0, -5]} text="Saint-Marc-des-Carrières 28 km" />
      <RoadSign position={[0, 0, 8]} text="Québec 82 km" />

      {/* Player character */}
      <PlayerCharacter />
    </>
  );
}
