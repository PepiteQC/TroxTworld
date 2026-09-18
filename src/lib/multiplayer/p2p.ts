/**
 * ═════════════════════════════════════════════════════════════════════════════
 * SALLE MULTIJOUEUR WEBRTC FULL-MESH — TROXTWORLD / PORTNEUF RP
 * ═════════════════════════════════════════════════════════════════════════════
 * 
 * Topologie Mesh P2P directe navigateur-à-navigateur avec négociation parfaite :
 *  - Canaux de données jumelés : Non fiable/instantané (state) & Fiable/ordonné (reliable).
 *  - Prise en charge des messages JSON et binaires (ArrayBuffer / Uint8Array).
 *  - Protection anti-saturation des tampons réseau (Backpressure Guard).
 *  - Résolution automatique des collisions d'offres (Glare-safe via Lexicographical ID).
 *  - Chien de garde (Watchdog) avec récupération automatique des pairs figés.
 * ═════════════════════════════════════════════════════════════════════════════
 */

export type SignalKind = "offer" | "answer" | "ice";

export interface PeerRow {
  id: string;
  name: string;
}

export interface SignalRow {
  id: number;
  from: string;
  kind: SignalKind;
  payload: unknown;
}

export interface RtcPollResponse {
  peers: PeerRow[];
  signals: SignalRow[];
}

export interface PeerInfo {
  id: string;
  name: string;
  connectionState: RTCPeerConnectionState;
  /** Type de candidat ICE local sélectionné : host | srflx | prflx | relay (TURN) */
  candidateType: string | null;
  /** RTT (ping) aller-retour en millisecondes */
  rttMs: number | null;
  /** Octets en attente dans le tampon d'envoi */
  bufferedAmount?: number;
}

export interface P2PRoomOptions {
  room: string;
  selfId: string;
  name?: string;
  iceServers?: RTCIceServer[];
  onPeersChanged?: (peers: PeerInfo[]) => void;
  onMessage?: (from: string, data: unknown, channel: "state" | "reliable") => void;
  onConnected?: () => void;
}

interface PeerSlot {
  pc: RTCPeerConnection;
  state?: RTCDataChannel;
  reliable?: RTCDataChannel;
  makingOffer: boolean;
  ignoreOffer: boolean;
  pendingCandidates: RTCIceCandidateInit[];
  lastProgressAt: number;
  recoveryAttempts: number;
  terminal?: boolean;
  recreatedForOffer?: boolean;
  info: PeerInfo;
  pingSentAt?: number;
}

const FAST_POLL_MS = 400;
const IDLE_POLL_MS = 2000;
const PING_INTERVAL_MS = 2000;
const STALL_MS = 10_000;
const MAX_RECOVERY_ATTEMPTS = 3;
const MAX_BUFFERED_AMOUNT = 64 * 1024; // 64 Ko de limite de sécurité
const SIGNAL_RETRY_DELAYS_MS = [250, 750, 1500];

/**
 * Configure les serveurs STUN et TURN par défaut.
 */
export function defaultIceServers(): RTCIceServer[] {
  const stunEnv = (import.meta as { env?: Record<string, string> }).env?.VITE_STUN_URLS;
  const turnEnv = (import.meta as { env?: Record<string, string> }).env?.VITE_TURN_URLS;
  const turnUser = (import.meta as { env?: Record<string, string> }).env?.VITE_TURN_USERNAME;
  const turnPass = (import.meta as { env?: Record<string, string> }).env?.VITE_TURN_CREDENTIAL;

  const stunUrls = stunEnv
    ? stunEnv.split(",").map((u) => u.trim()).filter(Boolean)
    : ["stun:stun.l.google.com:19302", "stun:stun.cloudflare.com:3478"];

  const servers: RTCIceServer[] = [{ urls: stunUrls }];

  if (turnEnv) {
    const turnUrls = turnEnv.split(",").map((u) => u.trim()).filter(Boolean);
    servers.push({
      urls: turnUrls,
      username: turnUser,
      credential: turnPass,
    });
  }

  return servers;
}

export class P2PRoom {
  private readonly opts: P2PRoomOptions;
  private readonly peers = new Map<string, PeerSlot>();
  private readonly signalQueues = new Map<string, Promise<void>>();
  private cursor = 0;
  private pollTimer: ReturnType<typeof setTimeout> | null = null;
  private pingTimer: ReturnType<typeof setInterval> | null = null;
  private abortController = new AbortController();
  private closed = false;
  private everPolled = false;
  private lastPeersFingerprint = "";

  constructor(opts: P2PRoomOptions) {
    this.opts = opts;
  }

  public async join(): Promise<void> {
    try {
      await this.pollOnce();
    } catch {
      // Le polling réessaiera automatiquement dans la boucle
    }
    if (this.closed) return;

    this.schedulePoll(this.anyPairConnecting() ? FAST_POLL_MS : IDLE_POLL_MS);
    this.pingTimer = setInterval(() => {
      this.pingAll();
      this.watchdog();
    }, PING_INTERVAL_MS);
  }

  public close(): void {
    if (this.closed) return;
    this.closed = true;

    this.abortController.abort();
    if (this.pollTimer) clearTimeout(this.pollTimer);
    if (this.pingTimer) clearInterval(this.pingTimer);

    for (const slot of this.peers.values()) {
      this.teardownSlot(slot);
    }
    this.peers.clear();
    this.signalQueues.clear();

    // Signalement de départ au serveur relais (Beacon / keepalive)
    try {
      void fetch("/api/rtc", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ op: "leave", room: this.opts.room, peer: this.opts.selfId }),
        keepalive: true,
      }).catch(() => {});
    } catch {
      // Ignorer lors de la fermeture de fenêtre
    }
  }

  /**
   * Envoi non fiable haute fréquence (State / Poses) à tous les pairs connectés.
   */
  public broadcast(data: unknown): void {
    if (this.closed || this.peers.size === 0) return;
    const wire = this.encodePayload(data);

    for (const slot of this.peers.values()) {
      const ch = slot.state;
      if (ch && ch.readyState === "open" && ch.bufferedAmount < MAX_BUFFERED_AMOUNT) {
        try {
          ch.send(wire as any);
        } catch {
          // Canal en cours de fermeture
        }
      }
    }
  }

  /**
   * Envoi non fiable ciblé (ex: joueurs dans la zone d'intérêt AOI).
   */
  public broadcastTo(ids: Iterable<string>, data: unknown): void {
    if (this.closed) return;
    const wire = this.encodePayload(data);

    for (const id of ids) {
      const slot = this.peers.get(id);
      const ch = slot?.state;
      if (ch && ch.readyState === "open" && ch.bufferedAmount < MAX_BUFFERED_AMOUNT) {
        try {
          ch.send(wire as any);
        } catch {
          // Canal en cours de fermeture
        }
      }
    }
  }

  /**
   * Envoi fiable et ordonné (événements de jeu, chat, transactions, inventaire).
   */
  public send(data: unknown, peerId?: string): void {
    if (this.closed) return;
    const wire = this.encodePayload(data);

    const targets = peerId ? [this.peers.get(peerId)] : [...this.peers.values()];
    for (const slot of targets) {
      const ch = slot?.reliable;
      if (ch && ch.readyState === "open") {
        try {
          ch.send(wire as any);
        } catch {
          // Canal en cours de fermeture
        }
      }
    }
  }

  public peerList(): PeerInfo[] {
    return [...this.peers.values()].map((s) => ({ ...s.info }));
  }

  // ─── GESTION DES MESSAGES ET FORMATAGE ─────────────────────────────────────

  private encodePayload(data: unknown): string | ArrayBufferView | ArrayBuffer {
    if (data instanceof ArrayBuffer || ArrayBuffer.isView(data)) {
      return data;
    }
    return JSON.stringify({ t: "d", d: data });
  }

  // ─── BOUCLE DE SIGNALEMENT HTTP ───────────────────────────────────────────

  private schedulePoll(delay: number): void {
    if (this.closed) return;
    if (this.pollTimer) clearTimeout(this.pollTimer);
    this.pollTimer = setTimeout(() => void this.poll(), delay);
  }

  private anyPairConnecting(): boolean {
    for (const s of this.peers.values()) {
      if (s.terminal) continue;
      if (s.info.connectionState !== "connected") return true;
    }
    return false;
  }

  private async pollOnce(): Promise<void> {
    const params = new URLSearchParams({
      room: this.opts.room,
      peer: this.opts.selfId,
      name: this.opts.name ?? "",
      since: String(this.cursor),
    });

    const res = await fetch(`/api/rtc?${params}`, {
      signal: this.abortController.signal,
    });

    if (this.closed || !res.ok) return;

    const body = (await res.json()) as RtcPollResponse;
    if (this.closed) return;

    if (!this.everPolled) {
      this.everPolled = true;
      this.opts.onConnected?.();
    }

    this.reconcileRoster(body.peers);
    const roster = new Set(body.peers.map((p) => p.id));

    for (const sig of body.signals) {
      this.cursor = Math.max(this.cursor, sig.id);
      await this.onSignal(sig.from, sig.kind, sig.payload, roster);
      if (this.closed) return;
    }
  }

  private async poll(): Promise<void> {
    if (this.closed) return;
    try {
      await this.pollOnce();
    } catch {
      // Re-tentative automatique
    }
    this.schedulePoll(this.anyPairConnecting() ? FAST_POLL_MS : IDLE_POLL_MS);
  }

  private reconcileRoster(peers: { id: string; name: string }[]): void {
    const alive = new Set(peers.map((p) => p.id));

    for (const p of peers) {
      if (p.id === this.opts.selfId) continue;
      const existing = this.peers.get(p.id);
      if (existing) {
        existing.info.name = p.name;
      } else {
        // Règle d'initiation déterministe pour éviter les doubles offres (Glare)
        this.connectTo(p.id, p.name, this.opts.selfId > p.id);
      }
    }

    for (const [id, slot] of this.peers) {
      if (!alive.has(id)) {
        this.teardownSlot(slot);
        this.peers.delete(id);
      }
    }
    this.emitPeers();
  }

  // ─── GESTION DES CONNEXIONS PEER-TO-PEER ───────────────────────────────────

  private connectTo(peerId: string, name: string, initiator: boolean): PeerSlot | null {
    if (this.closed) return null;

    const pc = new RTCPeerConnection({
      iceServers: this.opts.iceServers ?? defaultIceServers(),
    });

    const slot: PeerSlot = {
      pc,
      makingOffer: false,
      ignoreOffer: false,
      pendingCandidates: [],
      lastProgressAt: Date.now(),
      recoveryAttempts: 0,
      info: {
        id: peerId,
        name,
        connectionState: pc.connectionState,
        candidateType: null,
        rttMs: null,
      },
    };
    this.peers.set(peerId, slot);

    pc.onicecandidate = (e) => {
      if (e.candidate) {
        void this.sendSignal(peerId, "ice", e.candidate.toJSON());
      }
    };

    pc.onconnectionstatechange = () => {
      slot.info.connectionState = pc.connectionState;
      if (pc.connectionState === "connecting" || pc.connectionState === "connected") {
        slot.lastProgressAt = Date.now();
      }
      if (pc.connectionState === "connected") {
        slot.recoveryAttempts = 0;
        slot.terminal = false;
        void this.readCandidateType(slot);
      }
      this.emitPeers();

      if (pc.connectionState === "failed") {
        pc.restartIce();
      }
      if (pc.connectionState === "failed" || pc.connectionState === "disconnected") {
        this.schedulePoll(FAST_POLL_MS);
      }
    };

    pc.onnegotiationneeded = async () => {
      try {
        slot.makingOffer = true;
        await pc.setLocalDescription();
        await this.sendSignal(peerId, "offer", pc.localDescription!.toJSON());
      } catch {
        // Géré sur le cycle suivant
      } finally {
        slot.makingOffer = false;
      }
    };

    pc.ondatachannel = (e) => this.attachChannel(slot, e.channel);

    if (initiator) {
      this.attachChannel(
        slot,
        pc.createDataChannel("state", { ordered: false, maxRetransmits: 0 })
      );
      this.attachChannel(slot, pc.createDataChannel("reliable", { ordered: true }));
    }

    return slot;
  }

  private attachChannel(slot: PeerSlot, channel: RTCDataChannel): void {
    if (channel.label === "state") {
      slot.state = channel;
    } else {
      slot.reliable = channel;
    }

    channel.binaryType = "arraybuffer";

    channel.onopen = () => {
      slot.lastProgressAt = Date.now();
    };

    channel.onmessage = (e) => {
      if (typeof e.data !== "string") {
        // Payload binaire direct
        this.opts.onMessage?.(
          slot.info.id,
          e.data,
          channel.label === "state" ? "state" : "reliable"
        );
        return;
      }

      let msg: { t: string; d?: unknown };
      try {
        msg = JSON.parse(e.data) as { t: string; d?: unknown };
      } catch {
        return;
      }

      if (msg.t === "ping") {
        if (slot.state?.readyState === "open") {
          slot.state.send(JSON.stringify({ t: "pong" }));
        }
      } else if (msg.t === "pong") {
        if (slot.pingSentAt !== undefined) {
          slot.info.rttMs = Math.round(performance.now() - slot.pingSentAt);
          slot.pingSentAt = undefined;
          this.emitPeers();
        }
      } else {
        this.opts.onMessage?.(
          slot.info.id,
          msg.d,
          channel.label === "state" ? "state" : "reliable"
        );
      }
    };
  }

  private async flushPendingCandidates(slot: PeerSlot): Promise<void> {
    while (slot.pendingCandidates.length > 0) {
      const candidate = slot.pendingCandidates.shift()!;
      try {
        await slot.pc.addIceCandidate(candidate);
      } catch (err) {
        if (!slot.ignoreOffer) console.warn("[P2P] Échec addIceCandidate:", err);
      }
      if (this.closed) return;
    }
  }

  private async onSignal(
    from: string,
    kind: SignalKind,
    payload: unknown,
    roster: Set<string>
  ): Promise<void> {
    if (this.closed) return;
    let slot = this.peers.get(from);

    if (!slot) {
      if (!roster.has(from)) return;
      const created = this.connectTo(from, "", false);
      if (!created) return;
      slot = created;
    }

    const polite = this.opts.selfId < from;

    try {
      if (kind === "offer" || kind === "answer") {
        const description = payload as RTCSessionDescriptionInit;
        const collision =
          kind === "offer" && (slot.makingOffer || slot.pc.signalingState !== "stable");

        slot.ignoreOffer = !polite && collision;
        if (slot.ignoreOffer) return;

        try {
          await slot.pc.setRemoteDescription(description);
        } catch (err) {
          if (kind !== "offer" || slot.recreatedForOffer) throw err;
          const attempts = slot.recoveryAttempts;
          const name = slot.info.name;

          this.teardownSlot(slot);
          this.peers.delete(from);

          const fresh = this.connectTo(from, name, false);
          if (!fresh) return;
          fresh.recoveryAttempts = attempts;
          fresh.recreatedForOffer = true;
          slot = fresh;
          await slot.pc.setRemoteDescription(description);
        }

        if (this.closed) return;
        await this.flushPendingCandidates(slot);
        if (this.closed) return;

        if (kind === "offer") {
          await slot.pc.setLocalDescription();
          if (this.closed) return;
          await this.sendSignal(from, "answer", slot.pc.localDescription!.toJSON());
        }
      } else if (kind === "ice") {
        const candidate = payload as RTCIceCandidateInit;
        if (!slot.pc.remoteDescription) {
          slot.pendingCandidates.push(candidate);
          return;
        }
        try {
          await slot.pc.addIceCandidate(candidate);
        } catch (err) {
          if (!slot.ignoreOffer) console.warn("[P2P] addIceCandidate échoué:", err);
        }
      }
    } catch {
      // Les collisions de négociation se résoudront au prochain cycle d'offre
    }
  }

  private sendSignal(to: string, kind: SignalKind, payload: unknown): Promise<void> {
    const prev = this.signalQueues.get(to) ?? Promise.resolve();
    const next = prev.then(() => this.postSignal(to, kind, payload));
    this.signalQueues.set(
      to,
      next.catch(() => {})
    );
    return next;
  }

  private async postSignal(to: string, kind: SignalKind, payload: unknown): Promise<void> {
    for (let attempt = 0; ; attempt++) {
      if (this.closed) return;
      try {
        const res = await fetch("/api/rtc", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            op: "signal",
            room: this.opts.room,
            from: this.opts.selfId,
            to,
            kind,
            payload,
          }),
          signal: this.abortController.signal,
        });
        if (res.ok) return;
        throw new Error(`Signal POST failed: ${res.status}`);
      } catch (err) {
        if (attempt >= SIGNAL_RETRY_DELAYS_MS.length || this.closed) {
          return;
        }
        await new Promise((r) => setTimeout(r, SIGNAL_RETRY_DELAYS_MS[attempt]));
      }
    }
  }

  // ─── DIAGNOSTICS & RÉCUPÉRATION DU CHIEN DE GARDE ─────────────────────────

  private pingAll(): void {
    const wire = JSON.stringify({ t: "ping" });
    for (const slot of this.peers.values()) {
      if (slot.state?.readyState !== "open") continue;

      const stale =
        slot.pingSentAt !== undefined &&
        performance.now() - slot.pingSentAt > 2 * PING_INTERVAL_MS;

      if (slot.pingSentAt === undefined || stale) {
        slot.pingSentAt = performance.now();
        try {
          slot.state.send(wire);
        } catch {
          // Canal en fermeture
        }
      }
    }
  }

  private watchdog(): void {
    if (this.closed) return;
    const now = Date.now();

    for (const [peerId, slot] of this.peers) {
      const live = slot.pc.connectionState;

      if (live !== slot.info.connectionState) {
        slot.info.connectionState = live;
        if (live === "connecting" || live === "connected") {
          slot.lastProgressAt = now;
        }
        this.emitPeers();
      }

      if (slot.terminal || live === "connected") continue;
      if (now - slot.lastProgressAt <= STALL_MS) continue;

      if (slot.recoveryAttempts >= MAX_RECOVERY_ATTEMPTS) {
        slot.terminal = true;
        this.emitPeers();
        continue;
      }

      slot.recoveryAttempts += 1;
      slot.lastProgressAt = now;

      if (this.opts.selfId > peerId) {
        const { name } = slot.info;
        const attempts = slot.recoveryAttempts;

        this.teardownSlot(slot);
        this.peers.delete(peerId);

        const fresh = this.connectTo(peerId, name, true);
        if (fresh) fresh.recoveryAttempts = attempts;
        this.schedulePoll(FAST_POLL_MS);
      }
    }
  }

  private async readCandidateType(slot: PeerSlot): Promise<void> {
    try {
      const stats = await slot.pc.getStats();
      let selected: RTCIceCandidatePairStats | undefined;

      stats.forEach((s) => {
        if (s.type === "candidate-pair" && (s as RTCIceCandidatePairStats).nominated) {
          selected = s as RTCIceCandidatePairStats;
        }
      });

      const localId = selected?.localCandidateId;
      if (localId) {
        const local = stats.get(localId) as { candidateType?: string } | undefined;
        slot.info.candidateType = local?.candidateType ?? null;
        this.emitPeers();
      }
    } catch {
      // Diagnostic optionnel
    }
  }

  private teardownSlot(slot: PeerSlot): void {
    if (slot.state) {
      slot.state.onopen = null;
      slot.state.onmessage = null;
      slot.state.close();
    }
    if (slot.reliable) {
      slot.reliable.onopen = null;
      slot.reliable.onmessage = null;
      slot.reliable.close();
    }
    slot.pc.onicecandidate = null;
    slot.pc.onconnectionstatechange = null;
    slot.pc.onnegotiationneeded = null;
    slot.pc.ondatachannel = null;
    slot.pc.close();
  }

  private emitPeers(): void {
    const list = this.peerList();
    const fingerprint = JSON.stringify(
      list.map((p) => [p.id, p.name, p.connectionState, p.candidateType, p.rttMs])
    );
    if (fingerprint === this.lastPeersFingerprint) return;
    this.lastPeersFingerprint = fingerprint;
    this.opts.onPeersChanged?.(list);
  }
}