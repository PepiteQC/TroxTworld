/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  ETHERWORLD — server/intellectus/TroxTBridge.ts              ║
 * ║  Pont entre les systèmes existants et les noyaux Intellectus ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * PROBLÈME RÉSOLU
 * ───────────────
 * Le serveur a deux systèmes qui font la même chose sans se connaître :
 *
 *   FluxEngine  ↔  Arcadius    — deux bus de messages
 *   KvStore     ↔  Lotus       — deux stockages clé-valeur
 *
 * Un événement publié sur FluxEngine n'atteint jamais les abonnés
 * d'Arcadius, et inversement. Une valeur écrite dans KvStore reste
 * invisible pour Lotus.
 *
 * SOLUTION — ADAPTATEUR BIDIRECTIONNEL
 * ────────────────────────────────────
 * On ne supprime rien. Les deux systèmes continuent de fonctionner
 * exactement comme avant. Le pont les relie : ce qui entre d'un côté
 * ressort de l'autre, avec une garde anti-boucle pour éviter qu'un
 * message rebondisse indéfiniment entre les deux.
 *
 * Le code existant qui appelle `flux.publish()` ou `kv.set()` n'a pas
 * une ligne à changer.
 */

import type { FluxEngine, FluxMessage } from '../Engine/FluxEngine.js'
import type { KvStore }                 from '../Engine/KvStore.js'
import { arcadius }                     from './Arcadius.js'
import { lotus }                        from './Lotus.js'
import type { IntellectusEvent, EventPriority } from './types.js'

/* ── Configuration du pont ───────────────────────────────────── */

export interface BridgeConfig {
    /** Sujets FluxEngine relayés vers Arcadius. Vide = tous. */
    fluxTopicsToRelay: string[]

    /** Canaux Arcadius relayés vers FluxEngine. Vide = tous. */
    arcadiusChannelsToRelay: string[]

    /** Namespaces Lotus synchronisés avec KvStore. */
    syncedNamespaces: string[]

    /** Journalise chaque relais — utile au débogage, bruyant en production. */
    verbose: boolean
}

const DEFAULT_BRIDGE: BridgeConfig = {
    fluxTopicsToRelay:       [],
    arcadiusChannelsToRelay: [],
    syncedNamespaces:        ['players', 'world', 'economy'],
    verbose:                 false,
}

/* ── Correspondance des sujets ───────────────────────────────── */

/**
 * Un sujet FluxEngine est plat ("player.moved"), un canal Arcadius est
 * hiérarchique (channel + type). Cette table fait la traduction.
 */
const TOPIC_MAP: Record<string, { channel: string; type: string }> = {
    'player.joined':     { channel: 'player',   type: 'joined' },
    'player.left':       { channel: 'player',   type: 'left' },
    'player.moved':      { channel: 'player',   type: 'moved' },
    'player.died':       { channel: 'player',   type: 'died' },
    'economy.paid':      { channel: 'economy',  type: 'transfer' },
    'economy.salary':    { channel: 'economy',  type: 'salary' },
    'chat.message':      { channel: 'chat',     type: 'message' },
    'chat.command':      { channel: 'chat',     type: 'command' },
    'world.weather':     { channel: 'world',    type: 'weather_changed' },
    'world.hour':        { channel: 'world',    type: 'hour_changed' },
    'security.threat':   { channel: 'threat',   type: 'detected' },
    'admin.action':      { channel: 'admin',    type: 'action' },
}

/** Priorité déduite du sujet — les menaces passent devant le chat. */
function priorityForTopic(topic: string): EventPriority {
    if (topic.startsWith('security') || topic.startsWith('threat')) return 'critical'
    if (topic.startsWith('admin'))                                  return 'high'
    if (topic.startsWith('player.died'))                            return 'high'
    if (topic.startsWith('chat'))                                   return 'low'
    return 'normal'
}

/** Traduit un sujet plat en canal + type. */
function splitTopic(topic: string): { channel: string; type: string } {
    const mapped = TOPIC_MAP[topic]
    if (mapped) return mapped

    // Convention par défaut : "canal.type" → { canal, type }
    const dotIndex = topic.indexOf('.')
    if (dotIndex > 0) {
        return {
            channel: topic.slice(0, dotIndex),
            type:    topic.slice(dotIndex + 1),
        }
    }
    return { channel: 'flux', type: topic }
}

/* ── Le pont ─────────────────────────────────────────────────── */

export class TroxTBridge {
    private _config:      BridgeConfig
    private _flux:        FluxEngine | null = null
    private _kv:          KvStore    | null = null

    /** Désabonnements à appeler au dispose. */
    private _unsubscribers: Array<() => void> = []
    private _arcadiusSubIds: string[]         = []

    /**
     * Garde anti-boucle. Un message relayé de Flux vers Arcadius ne doit
     * pas revenir vers Flux. On mémorise brièvement les identifiants déjà
     * traités : sans ça, deux bus reliés se renvoient le même message à
     * l'infini et saturent le processus en quelques millisecondes.
     */
    private _inFlight = new Set<string>()
    private _inFlightTimer?: NodeJS.Timeout

    private _stats = {
        fluxToArcadius: 0,
        arcadiusToFlux: 0,
        kvToLotus:      0,
        lotusToKv:      0,
        loopsPrevented: 0,
    }

    constructor(config: Partial<BridgeConfig> = {}) {
        this._config = { ...DEFAULT_BRIDGE, ...config }

        // Purge périodique de la garde — les identifiants ne servent
        // que le temps d'un aller-retour
        this._inFlightTimer = setInterval(() => this._inFlight.clear(), 5_000)
        this._inFlightTimer.unref?.()
    }

    /* ── Connexion du bus de messages ────────────────────────── */

    /**
     * Relie FluxEngine et Arcadius dans les deux sens.
     */
    connectFlux(flux: FluxEngine): this {
        this._flux = flux

        /* ── Flux → Arcadius ─────────────────────────────────── */
        const topics = this._config.fluxTopicsToRelay.length > 0
            ? this._config.fluxTopicsToRelay
            : Object.keys(TOPIC_MAP)

        for (const topic of topics) {
            const unsub = flux.subscribe(topic, async (msg: FluxMessage) => {
                if (this._inFlight.has(msg.id)) {
                    this._stats.loopsPrevented++
                    return
                }
                this._inFlight.add(msg.id)

                const { channel, type } = splitTopic(msg.topic)

                await arcadius.publish(channel, type, msg.payload, {
                    priority:      priorityForTopic(msg.topic),
                    sourceAgent:   'flux-bridge',
                    correlationId: msg.id,
                })

                this._stats.fluxToArcadius++
                if (this._config.verbose) {
                    console.log(`🔀 [Bridge] Flux → Arcadius : ${msg.topic}`)
                }
            })
            this._unsubscribers.push(unsub)
        }

        /* ── Arcadius → Flux ─────────────────────────────────── */
        const channels = this._config.arcadiusChannelsToRelay.length > 0
            ? this._config.arcadiusChannelsToRelay
            : ['player', 'economy', 'chat', 'world', 'threat', 'admin']

        for (const channel of channels) {
            const subId = arcadius.subscribe(
                channel,
                async (event: IntellectusEvent) => {
                    // Ne pas renvoyer ce qui vient déjà du pont
                    if (event.sourceAgent === 'flux-bridge') return

                    const correlationId = event.correlationId ?? event.eventId
                    if (this._inFlight.has(correlationId)) {
                        this._stats.loopsPrevented++
                        return
                    }
                    this._inFlight.add(correlationId)

                    await flux.publish(`${event.channel}.${event.type}`, event.payload)

                    this._stats.arcadiusToFlux++
                    if (this._config.verbose) {
                        console.log(`🔀 [Bridge] Arcadius → Flux : ${channel}/${event.type}`)
                    }
                },
                { agentName: 'flux-bridge', priority: 'low' },
            )
            this._arcadiusSubIds.push(subId)
        }

        console.log(
            `🔗 [Bridge] FluxEngine ↔ Arcadius relié — ` +
            `${topics.length} sujets, ${channels.length} canaux`
        )
        return this
    }

    /* ── Connexion du stockage ───────────────────────────────── */

    /**
     * Synchronise KvStore et Lotus.
     *
     * KvStore persiste sur disque en JSON, Lotus vit en mémoire avec TTL
     * et snapshots. Les deux gardent leur rôle : KvStore devient la couche
     * de durabilité de Lotus, Lotus devient l'index rapide de KvStore.
     */
    connectStorage(kv: KvStore): this {
        this._kv = kv

        // ── Hydratation initiale : KvStore → Lotus ──
        // Au démarrage, tout ce qui est sur disque remonte en mémoire.
        let hydrated = 0
        for (const key of kv.keys()) {
            const { namespace, id } = this._splitKvKey(key)
            if (!this._config.syncedNamespaces.includes(namespace)) continue

            const value = kv.get(key)
            if (value !== undefined) {
                lotus.set(namespace, id, value)
                hydrated++
            }
        }

        this._stats.kvToLotus += hydrated
        console.log(
            `🔗 [Bridge] KvStore ↔ Lotus relié — ${hydrated} entrées hydratées`
        )
        return this
    }

    /**
     * Écrit dans les deux systèmes à la fois.
     *
     * C'est la méthode à utiliser pour toute donnée qui doit à la fois
     * être rapide en lecture (Lotus) et survivre à un redémarrage (KvStore).
     */
    set<T>(namespace: string, id: string, value: T, ttlMs?: number): void {
        lotus.set(namespace, id, value, ttlMs)

        if (this._kv && this._config.syncedNamespaces.includes(namespace)) {
            this._kv.set(`${namespace}:${id}`, value)
            this._stats.lotusToKv++
        }
    }

    /**
     * Lit depuis Lotus, retombe sur KvStore si absent.
     *
     * Le cas typique : une valeur expirée du cache mémoire mais toujours
     * sur disque. On la remonte au passage.
     */
    get<T>(namespace: string, id: string): T | undefined {
        const cached = lotus.get<T>(namespace, id)
        if (cached !== undefined) return cached

        if (!this._kv) return undefined

        const persisted = this._kv.get<T>(`${namespace}:${id}`)
        if (persisted !== undefined) {
            // Remontée en cache pour les prochaines lectures
            lotus.set(namespace, id, persisted)
            this._stats.kvToLotus++
        }
        return persisted
    }

    /** Supprime des deux côtés. */
    delete(namespace: string, id: string): boolean {
        const removed = lotus.delete(namespace, id)
        this._kv?.delete(`${namespace}:${id}`)
        return removed
    }

    /**
     * Force la synchronisation de Lotus vers KvStore.
     * À appeler avant un arrêt de serveur.
     */
    flushToDisk(): number {
        if (!this._kv) return 0

        let count = 0
        for (const namespace of this._config.syncedNamespaces) {
            for (const key of lotus.keys(namespace)) {
                const value = lotus.get(namespace, key)
                if (value !== undefined) {
                    this._kv.set(`${namespace}:${key}`, value)
                    count++
                }
            }
        }

        this._stats.lotusToKv += count
        console.log(`💾 [Bridge] ${count} entrées écrites sur disque`)
        return count
    }

    /* ── Interne ─────────────────────────────────────────────── */

    private _splitKvKey(key: string): { namespace: string; id: string } {
        const i = key.indexOf(':')
        if (i === -1) return { namespace: 'default', id: key }
        return { namespace: key.slice(0, i), id: key.slice(i + 1) }
    }

    /* ── Diagnostic ──────────────────────────────────────────── */

    getStats() {
        return {
            ...this._stats,
            connected: {
                flux:    this._flux !== null,
                storage: this._kv   !== null,
            },
            inFlight:         this._inFlight.size,
            syncedNamespaces: [...this._config.syncedNamespaces],
            fluxTopics:       this._flux?.getTopics() ?? [],
            arcadius:         arcadius.getStats(),
            lotus:            lotus.getStats(),
        }
    }

    dispose(): void {
        this.flushToDisk()

        this._unsubscribers.forEach(unsub => unsub())
        this._unsubscribers = []

        this._arcadiusSubIds.forEach(id => arcadius.unsubscribe(id))
        this._arcadiusSubIds = []

        if (this._inFlightTimer) clearInterval(this._inFlightTimer)
        this._inFlight.clear()

        console.log('🔗 [Bridge] Déconnecté')
    }
}

/* ── Singleton ───────────────────────────────────────────────── */

let bridgeInstance: TroxTBridge | null = null

export function getBridge(config?: Partial<BridgeConfig>): TroxTBridge {
    if (!bridgeInstance) {
        bridgeInstance = new TroxTBridge(config)
    }
    return bridgeInstance
}

/**
 * Branchement en une ligne au démarrage du serveur.
 *
 *   import { wireIntellectus } from './intellectus/TroxTBridge.js'
 *   wireIntellectus(fluxEngine, kvStore)
 */
export function wireIntellectus(
    flux: FluxEngine,
    kv?: KvStore,
    config?: Partial<BridgeConfig>,
): TroxTBridge {
    const bridge = getBridge(config)
    bridge.connectFlux(flux)
    if (kv) bridge.connectStorage(kv)
    return bridge
}