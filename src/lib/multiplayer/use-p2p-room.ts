/**
<<<<<<< HEAD
 * ═════════════════════════════════════════════════════════════════════════════
 * HOOK REACT MULTIJOUEUR WEBRTC (useP2PRoom) — TROXTWORLD / PORTNEUF RP
 * ═════════════════════════════════════════════════════════════════════════════
 * 
 * Liaison réactive pour P2PRoom :
 *  - Gestion du cycle de vie de la salle réseau et réconciliation d'état.
 *  - Abonnements multi-abonnés sécurisés (isolation des exceptions).
 *  - Statistiques de connexion prêtes pour l'affichage HUD (ping moyen, pairs).
 *  - Hook secondaire useP2PMessage pour écoute déclarative sans boilerplate.
 * ═════════════════════════════════════════════════════════════════════════════
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
=======
 * React binding for P2PRoom. Identity and room id are captured once on mount.
 */
import { useCallback, useEffect, useRef, useState } from "react";
>>>>>>> 40ca88498f1da4389cc3b6d228bfb6917f394158
import { P2PRoom, type PeerInfo } from "./p2p";

export interface UseP2PRoomOptions {
  room?: string;
<<<<<<< HEAD
  selfId?: string;
  name?: string;
  iceServers?: RTCIceServer[];
}

export type MessageListener = (
  from: string,
  data: unknown,
  channel: "state" | "reliable"
) => void;

=======
  name?: string;
}

>>>>>>> 40ca88498f1da4389cc3b6d228bfb6917f394158
export interface P2PRoomHandle {
  selfId: string;
  room: string;
  peers: PeerInfo[];
  joined: boolean;
<<<<<<< HEAD
  connectedCount: number;
  avgPingMs: number | null;
  broadcast: (data: unknown) => void;
  broadcastTo: (ids: Iterable<string>, data: unknown) => void;
  send: (data: unknown, peerId?: string) => void;
  onMessage: (fn: MessageListener) => () => void;
  reconnect: () => Promise<void>;
}

function generateDefaultRoom(): string {
  if (typeof window === "undefined") return "room-ssr";
  const host = window.location.hostname.split(".")[0] || "portneuf";
  return `room-${host}`.slice(0, 64);
}

function generateRandomPeerId(): string {
  return `p-${Math.random().toString(36).slice(2, 10)}`;
}

export function useP2PRoom(options: UseP2PRoomOptions = {}): P2PRoomHandle {
  // Capture immuable des identifiants au montage
  const [selfId] = useState(() => options.selfId ?? generateRandomPeerId());
  const [room] = useState(() => options.room ?? generateDefaultRoom());
  const [name] = useState(() => options.name ?? selfId);

  const [peers, setPeers] = useState<PeerInfo[]>([]);
  const [joined, setJoined] = useState(false);

  const roomRef = useRef<P2PRoom | null>(null);
  const listenersRef = useRef<Set<MessageListener>>(new Set());

  // Métriques de connexion pour le HUD
  const connectedPeers = useMemo(
    () => peers.filter((p) => p.connectionState === "connected"),
    [peers]
  );

  const avgPingMs = useMemo(() => {
    const validRtts = connectedPeers
      .map((p) => p.rttMs)
      .filter((rtt): rtt is number => typeof rtt === "number");

    if (validRtts.length === 0) return null;
    const sum = validRtts.reduce((acc, v) => acc + v, 0);
    return Math.round(sum / validRtts.length);
  }, [connectedPeers]);

  useEffect(() => {
    let active = true;

=======
  broadcast: (data: unknown) => void;
  broadcastTo: (ids: Iterable<string>, data: unknown) => void;
  send: (data: unknown, peerId?: string) => void;
  onMessage: (
    fn: (from: string, data: unknown, channel: "state" | "reliable") => void,
  ) => () => void;
}

function defaultRoom(): string {
  if (typeof window === "undefined") return "room-ssr";
  return `room-${window.location.hostname.split(".")[0]}`.slice(0, 64);
}

export function useP2PRoom(options: UseP2PRoomOptions = {}): P2PRoomHandle {
  const [selfId] = useState(() => `p-${Math.random().toString(36).slice(2, 10)}`);
  const [room] = useState(() => options.room ?? defaultRoom());
  const [name] = useState(() => options.name ?? selfId);
  const [peers, setPeers] = useState<PeerInfo[]>([]);
  const [joined, setJoined] = useState(false);
  const roomRef = useRef<P2PRoom | null>(null);
  const listeners = useRef(
    new Set<(from: string, data: unknown, channel: "state" | "reliable") => void>(),
  );

  useEffect(() => {
>>>>>>> 40ca88498f1da4389cc3b6d228bfb6917f394158
    const p2p = new P2PRoom({
      room,
      selfId,
      name,
<<<<<<< HEAD
      iceServers: options.iceServers,
      onPeersChanged: (updatedPeers) => {
        if (active) setPeers(updatedPeers);
      },
      onMessage: (from, data, channel) => {
        if (!active) return;
        // Exécution sécurisée pour chaque écouteur
        listenersRef.current.forEach((listener) => {
          try {
            listener(from, data, channel);
          } catch (err) {
            console.error(`[P2P Message Error] Échec de l'écouteur pour le pair ${from}:`, err);
          }
        });
      },
      onConnected: () => {
        if (active) setJoined(true);
      },
    });

    roomRef.current = p2p;
    void p2p.join();

    return () => {
      active = false;
      roomRef.current = null;
      p2p.close();
      setJoined(false);
      setPeers([]);
    };
  }, [room, selfId, name]);

  const broadcast = useCallback((data: unknown) => {
    roomRef.current?.broadcast(data);
  }, []);

  const broadcastTo = useCallback((ids: Iterable<string>, data: unknown) => {
    roomRef.current?.broadcastTo(ids, data);
  }, []);

  const send = useCallback((data: unknown, peerId?: string) => {
    roomRef.current?.send(data, peerId);
  }, []);

  const onMessage = useCallback((fn: MessageListener) => {
    listenersRef.current.add(fn);
    return () => {
      listenersRef.current.delete(fn);
    };
  }, []);

  const reconnect = useCallback(async () => {
    if (roomRef.current) {
      roomRef.current.close();
      setJoined(false);
      await roomRef.current.join();
    }
  }, []);

  return {
    selfId,
    room,
    peers,
    joined,
    connectedCount: connectedPeers.length,
    avgPingMs,
    broadcast,
    broadcastTo,
    send,
    onMessage,
    reconnect,
  };
}

/**
 * Hook utilitaire pour écouter un type de message P2P spécifique dans un composant enfant.
 */
export function useP2PMessage(
  roomHandle: P2PRoomHandle,
  handler: MessageListener
): void {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    return roomHandle.onMessage((from, data, channel) => {
      handlerRef.current(from, data, channel);
    });
  }, [roomHandle]);
}
=======
      onPeersChanged: setPeers,
      onMessage: (from, data, channel) => {
        for (const fn of listeners.current) fn(from, data, channel);
      },
      onConnected: () => setJoined(true),
    });
    roomRef.current = p2p;
    void p2p.join();
    return () => {
      roomRef.current = null;
      p2p.close();
    };
  }, [room, selfId, name]);

  const broadcast = useCallback((data: unknown) => roomRef.current?.broadcast(data), []);
  const broadcastTo = useCallback(
    (ids: Iterable<string>, data: unknown) => roomRef.current?.broadcastTo(ids, data),
    [],
  );
  const send = useCallback(
    (data: unknown, peerId?: string) => roomRef.current?.send(data, peerId),
    [],
  );
  const onMessage = useCallback(
    (fn: (from: string, data: unknown, channel: "state" | "reliable") => void) => {
      listeners.current.add(fn);
      return () => {
        listeners.current.delete(fn);
      };
    },
    [],
  );

  return { selfId, room, peers, joined, broadcast, broadcastTo, send, onMessage };
}
>>>>>>> 40ca88498f1da4389cc3b6d228bfb6917f394158
