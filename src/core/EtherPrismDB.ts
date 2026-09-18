// Shim temporaire — EtherPrismDB introuvable dans le repo.
// TODO: reconstruire une vraie couche DB.
export class EtherPrismDB {
  [key: string]: any;

  constructor(..._args: any[]) {}
  static get(): EtherPrismDB { return new EtherPrismDB(); }
  static instance: EtherPrismDB | null = null;

  async connect(): Promise<void> {}
  async disconnect(): Promise<void> {}
  async query(..._args: any[]): Promise<any> { return null; }
  async save(..._args: any[]): Promise<void> {}
  async load(..._args: any[]): Promise<any> { return null; }
  async set(..._args: any[]): Promise<void> {}
  async get(..._args: any[]): Promise<any> { return null; }
  async delete(..._args: any[]): Promise<void> {}
  async update(..._args: any[]): Promise<void> {}
  async insert(..._args: any[]): Promise<any> { return null; }
  async find(..._args: any[]): Promise<any[]> { return []; }
}
export default EtherPrismDB;
