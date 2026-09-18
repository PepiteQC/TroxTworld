// Shim de compatibilite — voir src/intellectus/ pour l'implementation reelle.
// TODO: supprimer ce shim et importer depuis ../intellectus/kernel une fois stable.
export * from "../intellectus/kernel";

export class Intellectus {
  // Index signature — accepte n'importe quelle propriete/methode non declaree.
  // Permet aux sous-systemes (arcadius, lotus, decaprius, thirdEye, ...) de compiler.
  [key: string]: any;

  constructor(..._args: any[]) {}
  static get(): any { return null; }
  static instance: Intellectus | null = null;

  emit(..._args: any[]): void {}
  on(..._args: any[]): void {}
  off(..._args: any[]): void {}
  once(..._args: any[]): void {}
  init(..._args: any[]): void {}
  start(..._args: any[]): void {}
  stop(..._args: any[]): void {}
  update(..._args: any[]): void {}
  register(..._args: any[]): void {}
  unregister(..._args: any[]): void {}
  send(..._args: any[]): void {}
  broadcast(..._args: any[]): void {}
  getPlayer(..._args: any[]): any { return null; }
  getWorld(..._args: any[]): any { return null; }
  getState(..._args: any[]): any { return {}; }
  setState(..._args: any[]): void {}
  persist(..._args: any[]): Promise<void> { return Promise.resolve(); }
  load(..._args: any[]): Promise<any> { return Promise.resolve(null); }
}
export default Intellectus;
