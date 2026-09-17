/**
 * ═══════════════════════════════════════════════════════════════════
 * 🎙️ TROXTWORLD / ETHERWORLD — SIGNALISATION WEBRTC & VOIX 3D (/api/rtc)
 * ═══════════════════════════════════════════════════════════════════
 * 
 * Passerelle Audio Spatiale & Radios Réalistes (Style PMA-Voice FiveM) :
 *  - 🗣️ Voix Proximité 3D (Chuchoter 2.5m, Normal 8m, Crier 25m, Mégaphone 60m)
 *  - 📻 Radios RP Québécoises (SQ 104.2 MHz, Urgences 108.5 MHz, CB Canal 14)
 *  - ⚡ Échange SDP Offers/Answers & Trickle ICE Candidates
 *  - 🌐 Fourniture de Serveurs STUN/TURN haute disponibilité
 * ═══════════════════════════════════════════════════════════════════
 */

import { createFileRoute } from "@tanstack/react-router";
import { handleSignaling } from "@/lib/multiplayer/signaling.server";

export type VoiceMode = "whisper" | "normal" | "shout" | "megaphone";

export interface IceServerDef {
  urls: string | string[];
  username?: string;
  credential?: string;
}

export interface SignalingMessage {
  id: string;
  type: "offer" | "answer" | "candidate" | "voice_state" | "radio_transmit" | "peer_join" | "peer_leave" | "ping";
  senderId: string;
  senderName: string;
  targetId?: string; // Si absent, diffusé à la grille spatiale (AOI)
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
  radioEffectsActive: boolean; // Bruits de friture et mic clicks
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

// ═══════════════════════════════════════════════════════════
// SERVEURS STUN / TURN PUBLICS POUR WEBRTC
// ═══════════════════════════════════════════════════════════

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

// ═══════════════════════════════════════════════════════════
// ÉTAT DU ROUTEUR WEBRTC EN MÉMOIRE
// ═══════════════════════════════════════════════════════════

const serverBootTime = Date.now();
const peerDirectory = new Map<string, VoicePeerState>();
const peerMessageQueues = new Map<string, SignalingMessage[]>();
let totalRoutedCounter = 0;

const PEER_TIMEOUT_MS = 15000; // Nettoyage après 15s sans signe de vie

// ═══════════════════════════════════════════════════════════
// HANDLERS SERVEUR
// ═══════════════════════════════════════════════════════════

async function handleServerRequest({ request }: { request: Request }): Promise<Response> {
  const url = new URL(request.url);
  const method = request.method.toUpperCase();

  const headers = {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Peer-Id, X-Session-Token",
  };

  if (method === "OPTIONS") {
    return new Response(null, { status: 204, headers });
  }

  const nowTs = Date.now();

  // Nettoyage automatique des pairs inactifs
  for (const [id, peer] of peerDirectory.entries()) {
    if (nowTs - peer.lastHeartbeat > PEER_TIMEOUT_MS) {
      peerDirectory.delete(id);
      peerMessageQueues.delete(id);
    }
  }

  try {
    // ── 1. GET : CONFIGURATION ICE, LONG-POLLING & STATISTIQUES ──
    if (method === "GET") {
      const getIce = url.searchParams.get("ice") === "true" || url.searchParams.get("config") === "true";
      const isStats = url.searchParams.get("stats") === "true";
      const pollPeerId = url.searchParams.get("peerId") || request.headers.get("X-Peer-Id");
      const radioFreq = parseFloat(url.searchParams.get("frequency") || "0");

      // ── A. Fourniture de la configuration STUN/TURN ICE ──
      if (getIce) {
        return new Response(
          JSON.stringify({
            ok: true,
            iceServers: DEFAULT_ICE_SERVERS,
            voiceRanges: VOICE_RANGES,
            iceTransportPolicy: "all",
            bundlePolicy: "max-bundle",
            rtcpMuxPolicy: "require",
          }),
          { status: 200, headers }
        );
      }

      // ── B. Statistiques WebRTC & Santé Réseau ──
      if (isStats) {
        const radioChannels = new Set(
          Array.from(peerDirectory.values())
            .map((p) => p.radioFrequencyMhz)
            .filter(Boolean)
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

        return new Response(JSON.stringify({ ok: true, data: stats, timestamp: nowTs }), { status: 200, headers });
      }

      // ── C. Polling des messages de signalisation pour un joueur ──
      if (pollPeerId) {
        // Met à jour le heartbeat du joueur
        const peer = peerDirectory.get(pollPeerId);
        if (peer) peer.lastHeartbeat = nowTs;

        const queue = peerMessageQueues.get(pollPeerId) || [];
        const messages = [...queue];
        peerMessageQueues.set(pollPeerId, []); // Vide la file

        return new Response(
          JSON.stringify({
            ok: true,
            peerId: pollPeerId,
            messagesCount: messages.length,
            messages,
            timestamp: nowTs,
          }),
          { status: 200, headers }
        );
      }

      // ── D. Liste des auditeurs sur une fréquence radio ──
      if (radioFreq > 0) {
        const listeners = Array.from(peerDirectory.values())
          .filter((p) => p.radioFrequencyMhz === radioFreq)
          .map((p) => ({
            peerId: p.peerId,
            name: p.displayName,
            isTransmitting: p.isRadioTransmitting,
          }));

        return new Response(
          JSON.stringify({
            ok: true,
            frequencyMhz: radioFreq,
            listenersCount: listeners.length,
            listeners,
          }),
          { status: 200, headers }
        );
      }

      // Liste générale des pairs connectés
      const allPeers = Array.from(peerDirectory.values()).map((p) => ({
        id: p.peerId,
        name: p.displayName,
        mode: p.voiceMode,
        range: p.voiceRangeMeters,
        talking: p.isTalking,
        radio: p.radioFrequencyMhz ? `${p.radioFrequencyMhz} MHz` : "Off",
      }));

      return new Response(JSON.stringify({ ok: true, total: allPeers.length, peers: allPeers }), { status: 200, headers });
    }

    // ── 2. POST : ENVOI DE SIGNAUX (OFFER, ANSWER, CANDIDATE, VOICE STATE) ──
    if (method === "POST") {
      let body: any = {};
      try {
        body = await request.json();
      } catch {
        return new Response(JSON.stringify({ ok: false, error: "invalid_json" }), { status: 400, headers });
      }

      const { type, senderId, senderName, targetId, payload } = body;

      if (!type || !senderId) {
        return new Response(JSON.stringify({ ok: false, error: "missing_type_or_sender_id" }), { status: 400, headers });
      }

      totalRoutedCounter++;

      // ── A. Enregistrement ou mise à jour de présence ──
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

        // Si diffusion radio enclenchée (PTT)
        if (peerState.isRadioTransmitting && peerState.radioFrequencyMhz) {
          const radioMsg: SignalingMessage = {
            id: `rad_${nowTs}_${Math.random().toString(36).substring(2, 6)}`,
            type: "radio_transmit",
            senderId,
            senderName: peerState.displayName,
            payload: {
              frequencyMhz: peerState.radioFrequencyMhz,
              isTransmitting: true,
              soundEffect: "mic_click_on",
            },
            timestamp: nowTs,
          };

          // Transmet à tous les auditeurs sur la même fréquence
          for (const [id, otherPeer] of peerDirectory.entries()) {
            if (id !== senderId && otherPeer.radioFrequencyMhz === peerState.radioFrequencyMhz) {
              const q = peerMessageQueues.get(id) || [];
              q.push(radioMsg);
              peerMessageQueues.set(id, q);
            }
          }
        }

        return new Response(
          JSON.stringify({
            ok: true,
            message: `État vocal de [${peerState.displayName}] synchronisé (${peerState.voiceMode} : ${peerState.voiceRangeMeters}m).`,
            peer: peerState,
          }),
          { status: 200, headers }
        );
      }

      // ── B. Routage SDP Offer / Answer & ICE Candidate vers un pair précis ──
      const message: SignalingMessage = {
        id: `sig_${nowTs}_${Math.random().toString(36).substring(2, 6)}`,
        type,
        senderId,
        senderName: senderName || senderId,
        targetId,
        payload,
        timestamp: nowTs,
      };

      if (targetId) {
        // Envoi ciblé (P2P direct)
        const targetQueue = peerMessageQueues.get(targetId) || [];
        targetQueue.push(message);
        peerMessageQueues.set(targetId, targetQueue);
      } else {
        // Diffusion globale ou spatiale
        for (const [id] of peerDirectory.entries()) {
          if (id !== senderId) {
            const q = peerMessageQueues.get(id) || [];
            q.push(message);
            peerMessageQueues.set(id, q);
          }
        }
      }

      // Relais optionnel vers le handler de signalisation serveur existant
      try {
        await handleSignaling(request);
      } catch {
        // Fallback gracieux
      }

      return new Response(
        JSON.stringify({
          ok: true,
          messageId: message.id,
          delivered: Boolean(targetId),
        }),
        { status: 200, headers }
      );
    }

    // ── 3. DELETE : DÉCONNEXION & FERMETURE DU CANAL VOCAL ──
    if (method === "DELETE") {
      const peerId = url.searchParams.get("peerId") || request.headers.get("X-Peer-Id");
      if (!peerId) {
        return new Response(JSON.stringify({ ok: false, error: "missing_peer_id" }), { status: 400, headers });
      }

      const existed = peerDirectory.delete(peerId);
      peerMessageQueues.delete(peerId);

      // Notifier les autres pairs du départ
      const leaveMsg: SignalingMessage = {
        id: `leave_${nowTs}`,
        type: "peer_leave",
        senderId: peerId,
        senderName: peerId,
        payload: { peerId },
        timestamp: nowTs,
      };

      for (const [id] of peerDirectory.entries()) {
        const q = peerMessageQueues.get(id) || [];
        q.push(leaveMsg);
        peerMessageQueues.set(id, q);
      }

      return new Response(
        JSON.stringify({
          ok: true,
          message: existed ? `Session WebRTC de [${peerId}] terminée.` : "Session introuvable.",
        }),
        { status: 200, headers }
      );
    }

    return new Response(JSON.stringify({ ok: false, error: "method_not_allowed" }), { status: 405, headers });

  } catch (err) {
    return new Response(
      JSON.stringify({
        ok: false,
        error: "rtc_signaling_error",
        message: err instanceof Error ? err.message : String(err),
      }),
      {
        status: 500,
        headers,
      }
    );
  }
}

// ═══════════════════════════════════════════════════════════
// ROUTEUR TANSTACK
// ═══════════════════════════════════════════════════════════

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