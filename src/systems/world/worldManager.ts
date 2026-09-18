import { World, WorldPos } from "./schema/WorldTypes";
import { validateWorld, ValidationReport } from "./validateWorld";
import { defaultQuebecWorld } from "./worldData";
import { findNearestVillage, findPOIsNear, findSpawnPoint } from "./worldQuery";

export class WorldManager {
  private currentWorld: World;
  private lastReport: ValidationReport;

  constructor(initialWorld?: World) {
    this.currentWorld = initialWorld ?? defaultQuebecWorld;
    this.lastReport = validateWorld(this.currentWorld);
  }

  public getWorld(): World {
    return this.currentWorld;
  }

  public setWorld(world: World): ValidationReport {
    this.currentWorld = world;
    this.lastReport = validateWorld(this.currentWorld);
    return this.lastReport;
  }

  public getValidationReport(): ValidationReport {
    return this.lastReport;
  }

  public isValid(): boolean {
    return this.lastReport.ok;
  }

  public getSpawnPosition(): WorldPos {
    return findSpawnPoint(this.currentWorld);
  }

  public getNearestVillage(pos: WorldPos) {
    return findNearestVillage(this.currentWorld, pos);
  }

  public getNearbyPOIs(pos: WorldPos, radius: number = 300) {
    return findPOIsNear(this.currentWorld, pos, radius);
  }
}

export const activeWorldManager = new WorldManager();
