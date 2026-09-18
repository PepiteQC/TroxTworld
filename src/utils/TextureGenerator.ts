// Shim temporaire — TextureGenerator introuvable.
import * as THREE from "three";
export class TextureGenerator {
  static generateConcreteTexture(_size: number = 256): THREE.Texture {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = _size;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#888";
    ctx.fillRect(0, 0, _size, _size);
    return new THREE.CanvasTexture(canvas);
  }
  static generateBrickTexture(size: number = 256): THREE.Texture { return this.generateConcreteTexture(size); }
  static generateWoodTexture(size: number = 256): THREE.Texture { return this.generateConcreteTexture(size); }
}
