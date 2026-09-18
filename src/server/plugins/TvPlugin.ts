/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  ETHERWORLD — src/server/plugins/TvPlugin.ts                 ║
 * ║  Plugin de Gestion des Téléviseurs & État Réseau             ║
 * ║  Portneuf, Québec 🍁 · fr-CA · TroxTetherworld v7.0 Enterprise ║
 * ╚══════════════════════════════════════════════════════════════╝
 */

'use strict';

import { BasePlugin } from "../core/BasePlugin";
import type { ServerEvents, TvFixtureState } from "../core/ServerEvents";

/**
 * Interface minimale attendue du TvFixtureManager.
 * Ajuste les noms de méthodes pour matcher l'implémentation exacte.
 */
export interface TvFixtureManagerLike {
  toggle(fixtureId: string): TvFixtureState;
  setChannel(fixtureId: string, channel: number): TvFixtureState;
  setVolume(fixtureId: string, volume: number): TvFixtureState;
  getState(fixtureId: string): TvFixtureState | undefined;
}

/**
 * Plugin qui fait le pont entre les events réseau (tv:toggle_request, etc.,
 * envoyés par le client via WebSocketGateway) et le TvFixtureManager,
 * puis rediffuse l'état mis à jour via tv:state_sync.
 *
 * Le WebSocketGateway écoute "tv:state_sync" pour pousser l'état
 * à tous les clients concernés (broadcast dans la pièce ou l'instance).
 */
export class TvPlugin extends BasePlugin {
  readonly name = "tv";

  constructor(private readonly tvFixtureManager: TvFixtureManagerLike) {
    super();
  }

  protected onTvToggleRequest(
    ...[player, fixtureId]: ServerEvents["tv:toggle_request"]
  ): void {
    const newState = this.tvFixtureManager.toggle(fixtureId);
    console.log(`[TV] ${player.name} a basculé la TV ${fixtureId} -> isOn=${newState.isOn}`);
    this.ctx.eventBus.emit("tv:state_sync", newState);
  }

  protected onTvChannelRequest(
    ...[player, fixtureId, channel]: ServerEvents["tv:channel_request"]
  ): void {
    const newState = this.tvFixtureManager.setChannel(fixtureId, channel);
    console.log(`[TV] ${player.name} change la chaîne de ${fixtureId} -> ${channel}`);
    this.ctx.eventBus.emit("tv:state_sync", newState);
  }

  protected onTvVolumeRequest(
    ...[player, fixtureId, volume]: ServerEvents["tv:volume_request"]
  ): void {
    const newState = this.tvFixtureManager.setVolume(fixtureId, volume);
    console.log(`[TV] ${player.name} règle le volume de ${fixtureId} -> ${volume}`);
    this.ctx.eventBus.emit("tv:state_sync", newState);
  }

  /**
   * Hook utile si un autre système (ex: un joueur qui rejoint une instance
   * housing en cours) a besoin de forcer une resynchronisation de toutes
   * les TVs actives plutôt que d'attendre le prochain toggle/channel change.
   */
  protected onPlayerSpawnCharacter(
    ...[_player]: ServerEvents["player:spawnCharacter"]
  ): void {
    // Réservation pour resynchronisation contextuelle des fixtures proches
  }
}