// Shim de compatibilité — l'implémentation réelle vit dans src/intellectus/
// TODO: migrer les importateurs vers '../intellectus/kernel' une fois stable.
export * from "../intellectus/kernel";

// Classe minimale pour satisfaire les imports existants.
// ⚠️ À remplacer par la vraie classe Intellectus dès qu'elle est identifiée.
export class Intellectus {
  constructor(..._args: any[]) {}
  static get(): any { return null; }
  emit(..._args: any[]): void {}
  on(..._args: any[]): void {}
  init(): void {}
}
