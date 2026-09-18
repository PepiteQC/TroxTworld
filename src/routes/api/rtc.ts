/**
 * ═════════════════════════════════════════════════════════════════════════════
 * 🎙️ SIGNALISATION WEBRTC & VOIX 3D SPATIALISÉE (/api/rtc)
 * ═════════════════════════════════════════════════════════════════════════════
 * 
 * Passerelle Audio Spatiale & Radios Réalistes (Style PMA-Voice) :
 *  - 🗣️ Voix Proximité 3D (Chuchoter 2.5m, Normal 8m, Crier 25m, Mégaphone 60m)
 *  - 📻 Radios RP Québécoises (SQ 104.2 MHz, Urgences 108.5 MHz, CB Canal 14)
 *  - 🗺️ Filtrage Spatial Automatique (AOI) pour éviter la surcharge réseau
 *  - ⚡ Échange SDP & ICE Candidates optimisé
 * ═════════════════════════════════════════════════════════════════════════════
 */

import { createFileRoute } from "@tanstack/react-router";

export type VoiceMode = "whisper" | "normal" | "shout" | "megaphone";

export interface IceServerDef {
  urls: string | string[];
  username?: string;
  credential?: string;
}

export interface SignalingMessage {
  id: string;
  type:
    | "offer"
    | "answer"
    | "candidate"
    | "voice_state"
    | "radio_transmit"
    | "peer_join"
    | "peer_leave"
    | "ping";
  senderId: string;
  senderName: string;
  targetId?: string;
  payload: any;
  timestamp: number;
}

export interface VoicePeerState {
  peerId: string;
  displayName: string;
  position: { x: number; y: number; z: number };
  yaw: number;
  voiceMode: VoiceMode;
  voiceRangeMeters: number;
  isTalking: boolean;
  isRadioTransmitting: boolean;
  radioFrequencyMhz?: number;
  radioEffectsActive: boolean;
  lastHeartbeat: number;
}

export interface SignalingStats {
  activePeersCount: number;
  activeRadioChannelsCount: number;
  queuedMessagesCount: number;
  totalSignalsRouted: number;
  iceServersCount: number;
  uptimeSeconds: number;
}

// ─── CONFIGURATION & PORTEES VOCALES ─────────────────────────────────────────

const DEFAULT_ICE_SERVERS: IceServerDef[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
  { urls: "stun:stun.cloudflare.com:3478" },
  { urls: "stun:stun.services.mozilla.com" },
];

const VOICE_RANGES: Record<VoiceMode, number> = {
  whisper: 2.5,
  normal: 8.0,
  shout: 25.0,
  megaphone: 60.0,
};

const MAX_HEARING_BUFFER_METERS = 90.0;
const PEER_TIMEOUT_MS = 10000;

// ─── ÉTAT DU ROUTEUR EN MÉMOIRE VIVE ────────────────────────────────────────

const serverBootTime = Date.now();
const peerDirectory = new Map<string, VoicePeerState>();
const peerMessageQueues = new Map<string, SignalingMessage[]>();
let totalRoutedCounter = 0;

const CORS_HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Peer-Id, X-Session-Token",
  "X-Content-Type-Options": "nosniff",
} as const;

// ─── HANDLER SERVEUR ─────────────────────────────────────────────────────────

async function handleServerRequest({ request }: { request: Request }): Promise<Response> {
  const url = new URL(request.url);
  const method = request.method.toUpperCase();

  if (method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  const nowTs = Date.now();

  // Nettoyage périodique des pairs déconnectés
  for (const [id, peer] of peerDirectory.entries()) {
    if (nowTs - peer.lastHeartbeat > PEER_TIMEOUT_MS) {
      peerDirectory.delete(id);
      peerMessageQueues.delete(id);

      const leaveMsg: SignalingMessage = {
        id: `leave_${nowTs}`,
        type: "peer_leave",
        senderId: id,
        senderName: id,
        payload: { peerId: id },
        timestamp: nowTs,
      };

      for (const otherId of peerDirectory.keys()) {
        peerMessageQueues.get(otherId)?.push(leaveMsg);
      }
    }
  }

  try {
    // ── 1. GET : CONFIGURATION, STATS & POLLING DE SIGNAUX ──
    if (method === "GET") {
      const getIce = url.searchParams.get("ice") === "true" || url.searchParams.get("config") === "true";
      const isStats = url.searchParams.get("stats") === "true";
      const pollPeerId = url.searchParams.get("peerId") || request.headers.get("X-Peer-Id");
      const radioFreq = parseFloat(url.searchParams.get("frequency") || "0");

      if (getIce) {
        return new Response(
          JSON.stringify({ ok: true, iceServers: DEFAULT_ICE_SERVERS, voiceRanges: VOICE_RANGES }),
          { status: 200, headers: CORS_HEADERS }
        );
      }

      if (isStats) {
        const radioChannels = new Set(
          Array.from(peerDirectory.values()).map((p) => p.radioFrequencyMhz).filter(Boolean)
        );

        let totalQueued = 0;
        for (const q of peerMessageQueues.values()) totalQueued += q.length;

        const stats: SignalingStats = {
          activePeersCount: peerDirectory.size,
          activeRadioChannelsCount: radioChannels.size,
          queuedMessagesCount: totalQueued,
          totalSignalsRouted: totalRoutedCounter,
          iceServersCount: DEFAULT_ICE_SERVERS.length,
          uptimeSeconds: Math.floor((nowTs - serverBootTime) / 1000),
        };

        return new Response(JSON.stringify({ ok: true, data: stats, timestamp: nowTs }), { status: 200, headers: CORS_HEADERS });
      }

      // Polling des messages du pair connecté
      if (pollPeerId) {
        const peer = peerDirectory.get(pollPeerId);
        if (peer) peer.lastHeartbeat = nowTs;

        const queue = peerMessageQueues.get(pollPeerId);
        if (!queue || queue.length === 0) {
          return new Response(JSON.stringify({ ok: true, messagesCount: 0, messages: [] }), { status: 200, headers: CORS_HEADERS });
        }

        const messages = queue.splice(0, queue.length);
        return new Response(
          JSON.stringify({ ok: true, peerId: pollPeerId, messagesCount: messages.length, messages, timestamp: nowTs }),
          { status: 200, headers: CORS_HEADERS }
        );
      }

      // Auditeurs d'une fréquence radio donnée
      if (radioFreq > 0) {
        const listeners = Array.from(peerDirectory.values())
          .filter((p) => p.radioFrequencyMhz === radioFreq)
          .map((p) => ({ peerId: p.peerId, name: p.displayName, isTransmitting: p.isRadioTransmitting }));

        return new Response(
          JSON.stringify({ ok: true, frequencyMhz: radioFreq, listenersCount: listeners.length, listeners }),
          { status: 200, headers: CORS_HEADERS }
        );
      }

      const allPeers = Array.from(peerDirectory.values()).map((p) => ({
        id: p.peerId,
        name: p.displayName,
        mode: p.voiceMode,
        talking: p.isTalking,
        radio: p.radioFrequencyMhz ? `${p.radioFrequencyMhz} MHz` : "Off",
      }));

      return new Response(JSON.stringify({ ok: true, total: allPeers.length, peers: allPeers }), { status: 200, headers: CORS_HEADERS });
    }

    // ── 2. POST : ENVOI DE SIGNAUX ET ÉTAT VOCAL ──
    if (method === "POST") {
      let body: any = {};
      try {
        body = await request.json();
      } catch {
        return new Response(JSON.stringify({ ok: false, error: "invalid_json" }), { status: 400, headers: CORS_HEADERS });
      }

      const { type, senderId, senderName, targetId, payload } = body;
      if (!type || !senderId) {
        return new Response(JSON.stringify({ ok: false, error: "missing_type_or_sender_id" }), { status: 400, headers: CORS_HEADERS });
      }

      totalRoutedCounter++;

      // Enregistrement de l'état vocal
      if (type === "peer_join" || type === "voice_state") {
        const mode: VoiceMode = payload?.voiceMode || "normal";
        const peerState: VoicePeerState = {
          peerId: senderId,
          displayName: senderName || "Citoyen",
          position: payload?.position || { x: 0, y: 0, z: 0 },
          yaw: payload?.yaw || 0,
          voiceMode: mode,
          voiceRangeMeters: VOICE_RANGES[mode] || 8.0,
          isTalking: Boolean(payload?.isTalking),
          isRadioTransmitting: Boolean(payload?.isRadioTransmitting),
          radioFrequencyMhz: payload?.radioFrequencyMhz,
          radioEffectsActive: payload?.radioEffectsActive !== undefined ? Boolean(payload?.radioEffectsActive) : true,
          lastHeartbeat: nowTs,
        };

        peerDirectory.set(senderId, peerState);
        if (!peerMessageQueues.has(senderId)) {
          peerMessageQueues.set(senderId, []);
        }

        // Transmission radio PTT
        if (peerState.isRadioTransmitting && peerState.radioFrequencyMhz) {
          const radioMsg: SignalingMessage = {
            id: `rad_${nowTs}_${Math.random().toString(36).substring(2, 6)}`,
            type: "radio_transmit",
            senderId,
            senderName: peerState.displayName,
            payload: { frequencyMhz: peerState.radioFrequencyMhz, isTransmitting: true },
            timestamp: nowTs,
          };

          for (const [id, otherPeer] of peerDirectory.entries()) {
            if (id !== senderId && otherPeer.radioFrequencyMhz === peerState.radioFrequencyMhz) {
              peerMessageQueues.get(id)?.push(radioMsg);
            }
          }
        }

        return new Response(JSON.stringify({ ok: true, peer: peerState }), { status: 200, headers: CORS_HEADERS });
      }

      // Routage SDP / ICE
      const message: SignalingMessage = {
        id: `sig_${nowTs}_${Math.random().toString(36).substring(2, 6)}`,
        type,
        senderId,
        senderName: senderName || senderId,
        targetId,
        payload,
        timestamp: nowTs,
      };

      const senderState = peerDirectory.get(senderId);

      if (targetId) {
        peerMessageQueues.get(targetId)?.push(message);
      } else if (senderState) {
        const rangeLimit = senderState.voiceRangeMeters * 1.5;
        const px = senderState.position.x;
        const pz = senderState.position.z;

        for (const [id, otherPeer] of peerDirectory.entries()) {
          if (id === senderId) continue;
          const shareRadio = senderState.radioFrequencyMhz && senderState.radioFrequencyMhz === otherPeer.radioFrequencyMhz;
          const distance = Math.hypot(px - otherPeer.position.x, pz - otherPeer.position.z);

          if (shareRadio || distance <= rangeLimit || distance <= MAX_HEARING_BUFFER_METERS) {
            peerMessageQueues.get(id)?.push(message);
          }
        }
      }

      return new Response(JSON.stringify({ ok: true, messageId: message.id }), { status: 200, headers: CORS_HEADERS });
    }

    // ── 3. DELETE : DÉCONNEXION DE SESSION VOCALE ──
    if (method === "DELETE") {
      const peerId = url.searchParams.get("peerId") || request.headers.get("X-Peer-Id");
      if (!peerId) {
        return new Response(JSON.stringify({ ok: false, error: "missing_peer_id" }), { status: 400, headers: CORS_HEADERS });
      }

      peerDirectory.delete(peerId);
      peerMessageQueues.delete(peerId);

      const leaveMsg: SignalingMessage = {
        id: `leave_${nowTs}`,
        type: "peer_leave",
        senderId: peerId,
        senderName: peerId,
        payload: { peerId },
        timestamp: nowTs,
      };

      for (const id of peerDirectory.keys()) {
        peerMessageQueues.get(id)?.push(leaveMsg);
      }

      return new Response(JSON.stringify({ ok: true, status: "disconnected" }), { status: 200, headers: CORS_HEADERS });
    }

    return new Response(JSON.stringify({ ok: false, error: "method_not_allowed" }), { status: 405, headers: CORS_HEADERS });
  } catch (err) {
    return new Response(
      JSON.stringify({ ok: false, error: "rtc_signaling_error", message: err instanceof Error ? err.message : String(err) }),
      { status: 500, headers: CORS_HEADERS }
    );
  }
}

export const Route = createFileRoute("/api/rtc")({
  server: {
    handlers: {
      GET: handleServerRequest,
      POST: handleServerRequest,
      DELETE: handleServerRequest,
      OPTIONS: handleServerRequest,
    },
  },
});