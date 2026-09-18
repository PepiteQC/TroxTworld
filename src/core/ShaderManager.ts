// Shim temporaire — ShaderManager introuvable.
export class ShaderManager {
  private static instance: ShaderManager;
  static getInstance(): ShaderManager {
    if (!ShaderManager.instance) ShaderManager.instance = new ShaderManager();
    return ShaderManager.instance;
  }
  createWaterMaterial(): any { return null; }
  createFogMaterial(): any { return null; }
  createShieldMaterial(): any { return null; }
}
