/**
 * Session RP — publie / ingère l'état Colyseus-compatible sur le mesh P2P.
 * Intellectus : AOI, poses compactes, hachage spatial, write-behind.
 */
import { jobById, gangById, DEEDS } from "./rp";
import { fleetById } from "./fleet";
import {
  coarseZone,
  decodePose,
  encodePose,
  inAoi,
  INTELLECTUS,
  persistBehind,
  spatial,
  worldFromClock,
} from "./intellectus";
import type { SpatialEntry } from "./spatial";
import { useGameStore } from "./store";
import {
  CHAT_RANGE,
  emptyPlayer,
  isNetPacket,
  riskFromWanted,
  type ChatKind,
  type ChatMessageState,
  type NetPacket,
  type PlayerState,
  type PropertyState,
  type RiskLevel,
  type RPRoomState,
  type VehicleState,
} from "./rpSchema";

export type NetPose = {
  x: number;
  y: number;
  z: number;
  rotation: number;
  animation: string;
  vehicleId: string;
  speed: number;
  headlights: boolean;
};

type Wire = {
  broadcast: (data: unknown) => void;
  send: (data: unknown, peerId?: string) => void;
  broadcastTo?: (ids: Iterable<string>, data: unknown) => void;
};

class RPNet {
  selfId = "";
  live = false;
  remotes = new Map<string, PlayerState>();
  remoteVehicles = new Map<string, VehicleState>();
  properties = new Map<string, PropertyState>();
  knownPeers = new Set<string>();
  timeOfDay = 16;
  weather = "clear";
  riskLevel: RiskLevel = "GREEN";
  private wire: Wire = { broadcast: () => {}, send: () => {} };
  private pose: NetPose = { x: 0, y: 1, z: 10, rotation: 0, animation: "idle", vehicleId: "", speed: 0, headlights: true };
  private lastPositions = new Map<string, { x: number; z: number; t: number }>();
  private queryBuf: SpatialEntry[] = [];
  private lastIdentityAt = 0;
  private lastWorldAt = 0;
  private metrics = {
    ticks: 0,
    aoiSends: 0,
    identitySends: 0,
    rejectedMoves: 0,
    compactIn: 0,
  };

  bind(selfId: string, wire: Wire) {
    this.selfId = selfId;
    this.wire = wire;
    this.live = true;
    spatial.update(selfId, this.pose.x, this.pose.z, "player");
  }

  unbind() {
    persistBehind.flush();
    this.live = false;
    this.wire = { broadcast: () => {}, send: () => {} };
    for (const id of this.remotes.keys()) spatial.remove(id);
    spatial.remove(this.selfId);
    this.remotes.clear();
    this.remoteVehicles.clear();
    this.knownPeers.clear();
    this.lastPositions.clear();
    useGameStore.getState().setHud({ netPeers: 0 });
  }

  setPose(pose: NetPose) {
    this.pose = pose;
    spatial.update(this.selfId, pose.x, pose.z, "player");
    persistBehind.mark();
  }

  isHost() {
    const ids = [this.selfId, ...this.remotes.keys()].filter(Boolean).sort();
    return ids[0] === this.selfId;
  }

  inAoi(id: string): boolean {
    const p = this.remotes.get(id);
    if (!p) return false;
    return inAoi(this.pose.x, this.pose.z, p.x, p.z);
  }

  localPlayer(): PlayerState {
    const s = useGameStore.getState();
    const look = s.appearance;
    return {
      id: this.selfId,
      username: look.name || "Citoyen",
      job: jobById(s.rpJob).name,
      aura: look.aura,
      x: this.pose.x,
      y: this.pose.y,
      z: this.pose.z,
      rotation: this.pose.rotation,
      animation: this.pose.animation,
      health: Math.round(s.surv.bodyTemp > 32 ? 100 : 55),
      armor: 0,
      wanted: s.wantedStars,
      vehicleId: this.pose.vehicleId,
      cash: Math.round(s.cash),
      bank: Math.round(s.bank),
      gang: s.gangId ? gangById(s.gangId)?.name ?? "Aucun" : "Aucun",
      outfit: look.outfit,
      hairStyle: look.hairStyle,
      skin: look.skin,
      hair: look.hair,
      model: look.model,
      zoneX: coarseZone(this.pose.x),
      zoneZ: coarseZone(this.pose.z),
      velocity: this.pose.speed,
    };
  }

  localVehicle(): VehicleState | null {
    if (!this.pose.vehicleId) return null;
    const s = useGameStore.getState();
    return {
      id: `${this.selfId}-car`,
      type: s.vehicleId,
      name: fleetById(s.vehicleId).name,
      x: this.pose.x,
      y: this.pose.y,
      z: this.pose.z,
      rotation: this.pose.rotation,
      speed: this.pose.speed,
      health: 100,
      locked: false,
      driverId: this.selfId,
      siren: s.wantedStars > 0 && s.rpJob === "policier",
      headlights: this.pose.headlights,
    };
  }

  snapshot(): RPRoomState {
    const players: Record<string, PlayerState> = { [this.selfId]: this.localPlayer() };
    for (const [id, p] of this.remotes) players[id] = p;
    const vehicles: Record<string, VehicleState> = {};
    const mine = this.localVehicle();
    if (mine) vehicles[mine.id] = mine;
    for (const [id, v] of this.remoteVehicles) vehicles[id] = v;
    const properties: Record<string, PropertyState> = {};
    for (const [id, p] of this.properties) properties[id] = p;
    const s = useGameStore.getState();
    for (const deed of DEEDS) {
      if (s.ownedProps.includes(deed.id) && !properties[deed.id]) {
        properties[deed.id] = {
          id: deed.id,
          name: deed.name,
          ownerId: this.selfId,
          price: deed.price,
          locked: true,
        };
      }
    }
    const clock = worldFromClock(s.timeHours, s.weather);
    return {
      players,
      vehicles,
      chatMessages: [],
      properties,
      timeOfDay: s.timeHours,
      weather: s.weather,
      riskLevel: this.roomRisk(),
      playerCount: 1 + this.remotes.size,
      hour: clock.hour,
      day: clock.day,
      month: clock.month,
      season: clock.season,
      temperature: clock.temperature,
      windSpeed: clock.windSpeed,
      snowDepth: clock.snowDepth,
    };
  }

  roomRisk(): RiskLevel {
    let stars = useGameStore.getState().wantedStars;
    for (const p of this.remotes.values()) stars = Math.max(stars, p.wanted);
    return riskFromWanted(stars);
  }

  publish() {
    if (!this.live) return;
    this.metrics.ticks++;
    const now = performance.now();
    const compact: NetPacket = {
      k: "m",
      d: encodePose(this.pose.x, this.pose.y, this.pose.z, this.pose.rotation, this.pose.speed, this.pose.animation),
    };
    spatial.query(this.pose.x, this.pose.z, INTELLECTUS.aoiRadius, this.queryBuf);
    const nearby: string[] = [];
    for (const e of this.queryBuf) {
      if (e.kind === "player" && e.id !== this.selfId && this.knownPeers.has(e.id)) nearby.push(e.id);
    }
    if (this.wire.broadcastTo && this.knownPeers.size) {
      if (nearby.length) {
        this.wire.broadcastTo(nearby, compact);
        this.metrics.aoiSends++;
      }
    } else {
      this.wire.broadcast(compact);
      this.metrics.aoiSends++;
    }

    if (now - this.lastIdentityAt > INTELLECTUS.identityIntervalMs) {
      this.lastIdentityAt = now;
      this.metrics.identitySends++;
      this.wire.broadcast({ k: "snap", p: this.localPlayer() } satisfies NetPacket);
      const veh = this.localVehicle();
      if (veh) this.wire.broadcast({ k: "veh", v: veh } satisfies NetPacket);
    }

    if (this.isHost() && now - this.lastWorldAt > 1000) {
      this.lastWorldAt = now;
      const s = useGameStore.getState();
      const clock = worldFromClock(s.timeHours, s.weather);
      this.wire.broadcast({
        k: "world",
        timeOfDay: s.timeHours,
        weather: s.weather,
        riskLevel: this.roomRisk(),
        hour: clock.hour,
        day: clock.day,
        month: clock.month,
        season: clock.season,
        temperature: clock.temperature,
        windSpeed: clock.windSpeed,
        snowDepth: clock.snowDepth,
      } satisfies NetPacket);
    }
  }

  publishChat(kind: ChatKind, text: string, targetId?: string) {
    const p = this.localPlayer();
    const m: ChatMessageState = {
      id: `${this.selfId}-${Date.now().toString(36)}`,
      senderId: this.selfId,
      senderName: p.username,
      messageType: kind,
      text,
      x: p.x,
      y: p.y,
      z: p.z,
      timestamp: Date.now(),
      targetId,
    };
    this.receiveChat(m);
    if (kind === "whisper" && targetId) {
      this.wire.send({ k: "chat", m }, targetId);
      return;
    }
    const range = CHAT_RANGE[kind];
    if (Number.isFinite(range)) {
      spatial.query(p.x, p.z, range, this.queryBuf);
      let sent = 0;
      for (const e of this.queryBuf) {
        if (e.kind !== "player" || e.id === this.selfId) continue;
        this.wire.send({ k: "chat", m }, e.id);
        sent++;
      }
      if (!sent) this.wire.send({ k: "chat", m });
    } else {
      this.wire.send({ k: "chat", m });
    }
  }

  publishProperty(pr: PropertyState) {
    this.properties.set(pr.id, pr);
    this.wire.send({ k: "prop", pr });
  }

  ingest(from: string, data: unknown, _channel: "state" | "reliable") {
    if (!isNetPacket(data) || from === this.selfId) return;
    switch (data.k) {
      case "m": {
        const pose = decodePose(data.d);
        if (!pose) break;
        if (!this.acceptMove(from, pose.x, pose.z)) {
          this.wire.send({ k: "position_rejected", x: this.pose.x, y: this.pose.y, z: this.pose.z }, from);
          break;
        }
        const prev = this.remotes.get(from) ?? emptyPlayer(from);
        const next: PlayerState = {
          ...prev,
          id: from,
          x: pose.x,
          y: pose.y,
          z: pose.z,
          rotation: pose.rotation,
          animation: pose.animation,
          velocity: pose.velocity,
          zoneX: coarseZone(pose.x),
          zoneZ: coarseZone(pose.z),
        };
        this.remotes.set(from, next);
        spatial.update(from, pose.x, pose.z, "player");
        this.metrics.compactIn++;
        break;
      }
      case "snap": {
        const id = data.p.id || from;
        if (!this.acceptMove(id, data.p.x, data.p.z)) break;
        const was = this.remotes.has(id);
        const p = { ...emptyPlayer(from), ...data.p, id, zoneX: coarseZone(data.p.x), zoneZ: coarseZone(data.p.z) };
        this.remotes.set(id, p);
        spatial.update(id, p.x, p.z, "player");
        if (!was) {
          useGameStore.getState().addChat("comté", `${data.p.username || "Citoyen"} arrive sur le rang`, "system");
        }
        break;
      }
      case "veh":
        this.remoteVehicles.set(data.v.id, data.v);
        spatial.update(data.v.id, data.v.x, data.v.z, "entity");
        break;
      case "chat":
        this.receiveChat(data.m);
        break;
      case "prop":
        this.properties.set(data.pr.id, data.pr);
        break;
      case "world":
        if (!this.isHost()) {
          this.timeOfDay = data.timeOfDay;
          this.weather = data.weather;
          this.riskLevel = data.riskLevel;
          useGameStore.getState().setHud({
            timeHours: data.timeOfDay,
            weather: parseWeather(data.weather),
            riskLevel: data.riskLevel,
          });
        }
        break;
      case "hello":
        this.applyHello(data.state);
        break;
      case "bye":
        this.drop(data.id);
        break;
      case "position_rejected":
        break;
      default:
        break;
    }
    useGameStore.getState().setHud({
      netPeers: this.remotes.size,
      riskLevel: this.roomRisk(),
    });
  }

  onPeers(ids: string[]) {
    const next = new Set(ids.filter((id) => id !== this.selfId));
    for (const id of this.remotes.keys()) {
      if (!next.has(id)) this.drop(id);
    }
    const already = [this.selfId, ...this.knownPeers].sort();
    const newcomers = [...next].filter((id) => !this.knownPeers.has(id));
    this.knownPeers = next;
    if (newcomers.length && already[0] === this.selfId) {
      const hello: NetPacket = { k: "hello", state: this.snapshot() };
      for (const id of newcomers) this.wire.send(hello, id);
    }
    useGameStore.getState().setHud({
      netPeers: this.remotes.size,
      riskLevel: this.roomRisk(),
    });
  }

  private acceptMove(id: string, x: number, z: number): boolean {
    const last = this.lastPositions.get(id);
    const t = Date.now();
    if (last) {
      const dist = Math.hypot(x - last.x, z - last.z);
      const dt = Math.max(0.05, (t - last.t) / 1000);
      if (dist > INTELLECTUS.maxStepMeters && dist / dt > 90) {
        this.metrics.rejectedMoves++;
        return false;
      }
    }
    this.lastPositions.set(id, { x, z, t });
    return true;
  }

  private applyHello(state: RPRoomState) {
    for (const [id, p] of Object.entries(state.players)) {
      if (id === this.selfId) continue;
      const was = this.remotes.has(id);
      this.remotes.set(id, p);
      spatial.update(id, p.x, p.z, "player");
      this.lastPositions.set(id, { x: p.x, z: p.z, t: Date.now() });
      if (!was) {
        useGameStore.getState().addChat("comté", `${p.username} est déjà sur le rang`, "system");
      }
    }
    for (const [id, v] of Object.entries(state.vehicles)) {
      this.remoteVehicles.set(id, v);
      spatial.update(id, v.x, v.z, "entity");
    }
    for (const [id, pr] of Object.entries(state.properties)) this.properties.set(id, pr);
    if (!this.isHost()) {
      this.timeOfDay = state.timeOfDay;
      this.weather = state.weather;
      this.riskLevel = state.riskLevel;
      useGameStore.getState().setHud({
        timeHours: state.timeOfDay,
        weather: parseWeather(state.weather),
        riskLevel: state.riskLevel,
      });
    }
  }

  drop(id: string) {
    const gone = this.remotes.get(id);
    this.remotes.delete(id);
    spatial.remove(id);
    this.lastPositions.delete(id);
    for (const [vid, v] of this.remoteVehicles) {
      if (v.driverId === id) {
        this.remoteVehicles.delete(vid);
        spatial.remove(vid);
      }
    }
    if (gone) {
      useGameStore.getState().addChat("comté", `${gone.username} quitte le rang`, "system");
    }
    useGameStore.getState().setHud({
      netPeers: this.remotes.size,
      riskLevel: this.roomRisk(),
    });
  }

  citizens(): PlayerState[] {
    const mine = this.selfId ? [this.localPlayer()] : [];
    return [...mine, ...this.remotes.values()];
  }

  getMetrics() {
    const nearby = nearbyCount(this.pose.x, this.pose.z, this.queryBuf);
    const withoutAoi = Math.max(1, this.remotes.size) * Math.max(1, this.remotes.size);
    const saved = withoutAoi > 0 ? Math.round((1 - nearby / Math.max(1, this.remotes.size + 1)) * 100) : 0;
    return {
      clients: 1 + this.remotes.size,
      players: 1 + this.remotes.size,
      entities: this.remoteVehicles.size,
      spatial: { indexed: spatial.size, cells: spatial.cellCount },
      aoi: {
        radius: INTELLECTUS.aoiRadius,
        visible: nearby,
        sends: this.metrics.aoiSends,
        compactIn: this.metrics.compactIn,
        bandwidthSavedPercent: Math.max(0, saved),
      },
      simulation: {
        ticks: this.metrics.ticks,
        patchRate: INTELLECTUS.patchRate,
        identitySends: this.metrics.identitySends,
      },
      persistence: persistBehind.getStats(),
      security: {
        rejectedMoves: this.metrics.rejectedMoves,
        maxStepMeters: INTELLECTUS.maxStepMeters,
      },
    };
  }

  private receiveChat(m: ChatMessageState) {
    const me = this.localPlayer();
    if (m.messageType === "whisper") {
      if (m.senderId !== this.selfId && m.targetId !== this.selfId) return;
    } else {
      const range = CHAT_RANGE[m.messageType];
      if (Number.isFinite(range)) {
        const d = Math.hypot(me.x - m.x, me.z - m.z);
        if (d > range) return;
      }
    }
    const type = m.messageType === "system" ? "system" : m.messageType === "ooc" || m.messageType === "ad" ? "admin" : "chat";
    const label = formatChat(m);
    useGameStore.getState().addChat(label.sender, label.text, type, m);
  }
}

function nearbyCount(x: number, z: number, buf: SpatialEntry[]): number {
  spatial.query(x, z, INTELLECTUS.aoiRadius, buf);
  let n = 0;
  for (const e of buf) if (e.kind === "player") n++;
  return n;
}

function formatChat(m: ChatMessageState) {
  switch (m.messageType) {
    case "me":
      return { sender: m.senderName, text: `* ${m.text}` };
    case "do":
      return { sender: "scène", text: `${m.text} (( ${m.senderName} ))` };
    case "shout":
      return { sender: m.senderName, text: `(hurle) ${m.text}` };
    case "whisper":
      return { sender: m.senderName, text: `(chuchote) ${m.text}` };
    case "ooc":
      return { sender: m.senderName, text: `(( ${m.text} ))` };
    case "ad":
      return { sender: "annonce", text: m.text };
    case "system":
      return { sender: "comté", text: m.text };
    default:
      return { sender: m.senderName, text: m.text };
  }
}

function parseWeather(id: string): "clear" | "rain" | "snow" | "fog" | "storm" {
  if (id === "rain" || id === "snow" || id === "fog" || id === "storm") return id;
  return "clear";
}

export const rpNet = new RPNet();

export function parseChatInput(raw: string): { kind: ChatKind; text: string; target?: string } | null {
  const text = raw.trim();
  if (!text) return null;
  if (text.startsWith("/w ") || text.startsWith("/mp ")) {
    const rest = text.slice(text.indexOf(" ") + 1).trim();
    const sp = rest.indexOf(" ");
    if (sp < 1) return { kind: "whisper", text: rest };
    return { kind: "whisper", text: rest.slice(sp + 1), target: rest.slice(0, sp) };
  }
  if (text.startsWith("/s ")) return { kind: "shout", text: text.slice(3).trim() };
  if (text.startsWith("/me ")) return { kind: "me", text: text.slice(4).trim() };
  if (text.startsWith("/do ")) return { kind: "do", text: text.slice(4).trim() };
  if (text.startsWith("/b ") || text.startsWith("/ooc ")) {
    const body = text.startsWith("/ooc ") ? text.slice(5) : text.slice(3);
    return { kind: "ooc", text: body.trim() };
  }
  if (text.startsWith("/ad ")) return { kind: "ad", text: text.slice(4).trim() };
  if (text.startsWith("/")) return null;
  return { kind: "local", text };
}