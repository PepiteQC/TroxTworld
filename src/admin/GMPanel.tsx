// ═══════════════════════════════════════════════════════════
//  src/components/admin/GMPanel.tsx
//  Game Master Panel — Admin Console Ultra Premium
// ═══════════════════════════════════════════════════════════

import { useState, useCallback, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useGameState, setGlobal } from '../../store';
import { useGameStore } from '../../store/game-store-unified';
import { AdminEffectsEngine } from '../../systems/AdminEffectsEngine';
import {
  UNIFIED_EFFECTS, UNIFIED_CATEGORY_ORDER, triggerUnifiedEffect,
  type UnifiedEffectEntry,
} from '../../systems/UnifiedAdminEffects';

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  TYPES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

type UserRole = 'owner' | 'admin' | 'user';

interface GMPanelProps {
  currentRole: UserRole;
  scene:       THREE.Scene;
  charGroup:   THREE.Group;
  camera?:     THREE.Camera | null;
  renderer?:   THREE.WebGLRenderer | null;
}

interface GMCommand {
  id:       string;
  label:    string;
  icon:     string;
  color:    string;
  action:   () => void;
  roles:    UserRole[];
}

interface LogEntry {
  id:        number;
  timestamp: string;
  message:   string;
  type:      'info' | 'success' | 'warning' | 'error' | 'cmd';
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  HELPERS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function timestamp(): string {
  return new Date().toLocaleTimeString('fr-CA', { hour12: false });
}

let logIdCounter = 0;

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  COMPONENT
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export function GMPanel({ currentRole, scene, charGroup, camera, renderer }: GMPanelProps) {
  const [isOpen,      setIsOpen]      = useState(false);
  const [activeTab,   setActiveTab]   = useState<'commands' | 'world' | 'logs' | 'player' | 'effects'>('commands');
  const [logs,        setLogs]        = useState<LogEntry[]>([]);
  const [cmdInput,    setCmdInput]    = useState('');
  const [fogDensity,  setFogDensityLocal]  = useState(150);
  const [timeScale,   setTimeScale]   = useState(1);
  const [fxCooldowns, setFxCooldowns] = useState<Record<string, number>>({});
  const [, fxTick]    = useState(0);

  const addAdminEffect = useGameStore(s => s.addAdminEffect);
  const engineRef = useRef<AdminEffectsEngine | null>(null);

  // Construit le moteur une fois scene/camera/renderer disponibles ; le
  // dispose au démontage. Ne recrée pas le moteur si seule la référence
  // scene change de façon insignifiante (React StrictMode double-appel).
  useEffect(() => {
    if (!camera || !renderer) return;
    const engine = new AdminEffectsEngine(scene, camera, renderer, () => charGroup.position.clone());
    engineRef.current = engine;
    return () => { engine.dispose(); engineRef.current = null; };
  }, [scene, camera, renderer, charGroup]);

  // Rafraîchit l'affichage des anneaux de cooldown sans re-render lourd
  useEffect(() => {
    const id = setInterval(() => fxTick(v => v + 1), 200);
    return () => clearInterval(id);
  }, []);

  const buildMode  = useGameState(s => s.buildMode);
  const isGodMode  = useGameState(s => s.isGodMode);
  const flyMode    = useGameState(s => s.flyMode);

  // Accessible seulement aux admins/owners
  if (currentRole === 'user') return null;

  // ── Log helper ──────────────────────────────────────────
  const addLog = useCallback((message: string, type: LogEntry['type'] = 'info') => {
    setLogs(prev => [
      ...prev.slice(-49),
      { id: logIdCounter++, timestamp: timestamp(), message, type },
    ]);
  }, []);

  // ── Téléportation du joueur ──────────────────────────────
  const teleport = useCallback((x: number, y: number, z: number, label: string) => {
    charGroup.position.set(x, y, z);
    addLog(`Téléportation → ${label} (${x}, ${y}, ${z})`, 'success');
  }, [charGroup, addLog]);

  // ── Effets unifiés (18 auras legacy + 20 effets moteur) ──
  const triggerFx = useCallback((entry: UnifiedEffectEntry) => {
    const now = Date.now();
    if ((fxCooldowns[entry.id] ?? 0) > now) return;
    const ok = triggerUnifiedEffect(entry, {
      engine: engineRef.current,
      addAdminEffect,
      getPosition: () => charGroup.position.clone(),
      role: currentRole,
    });
    if (ok) {
      addLog(`Effet déclenché : ${entry.icon} ${entry.name}`, 'cmd');
      setFxCooldowns(prev => ({ ...prev, [entry.id]: now + Math.max(800, entry.durationMs) }));
    } else {
      addLog(`Effet refusé (rôle insuffisant ou moteur indisponible) : ${entry.name}`, 'warning');
    }
  }, [fxCooldowns, addAdminEffect, charGroup, currentRole]);

  // ── Commandes GM ────────────────────────────────────────
  const commands: GMCommand[] = [
    {
      id: 'godmode',
      label: isGodMode ? 'God Mode ON' : 'God Mode OFF',
      icon: '🛡️',
      color: isGodMode ? 'emerald' : 'zinc',
      roles: ['owner', 'admin'],
      action: () => {
        setGlobal({ isGodMode: !isGodMode });
        addLog(`God Mode ${!isGodMode ? 'activé' : 'désactivé'}`, 'cmd');
      },
    },
    {
      id: 'fly',
      label: flyMode ? 'Vol ON' : 'Vol OFF',
      icon: '🦅',
      color: flyMode ? 'cyan' : 'zinc',
      roles: ['owner', 'admin'],
      action: () => {
        setGlobal({ flyMode: !flyMode });
        addLog(`Mode vol ${!flyMode ? 'activé' : 'désactivé'}`, 'cmd');
      },
    },
    {
      id: 'build',
      label: buildMode ? 'Builder ON' : 'Builder OFF',
      icon: '🔨',
      color: buildMode ? 'violet' : 'zinc',
      roles: ['owner', 'admin'],
      action: () => {
        setGlobal({ buildMode: !buildMode });
        addLog(`Builder ${!buildMode ? 'activé' : 'désactivé'}`, 'cmd');
      },
    },
    {
      id: 'spawn_origin',
      label: 'Spawn Origin',
      icon: '📍',
      color: 'amber',
      roles: ['owner', 'admin'],
      action: () => teleport(0, 1, 0, 'Origine'),
    },
    {
      id: 'spawn_road',
      label: 'Route 138',
      icon: '🛣️',
      color: 'amber',
      roles: ['owner', 'admin'],
      action: () => teleport(0, 1, 50, 'Route 138'),
    },
    {
      id: 'clear_scene',
      label: 'Clear Scene',
      icon: '🗑️',
      color: 'red',
      roles: ['owner'],
      action: () => {
        setGlobal({ placedObjects: [] });
        addLog('Scène nettoyée — tous les objets supprimés', 'warning');
      },
    },
    {
      id: 'reset_fog',
      label: 'Reset Fog',
      icon: '🌫️',
      color: 'blue',
      roles: ['owner', 'admin'],
      action: () => {
        setFogDensityLocal(150);
        setGlobal({ fogDensity: 150 });
        addLog('Brouillard réinitialisé (150)', 'info');
      },
    },
    {
      id: 'screenshot',
      label: 'Screenshot',
      icon: '📸',
      color: 'pink',
      roles: ['owner', 'admin'],
      action: () => {
        const canvas = document.querySelector('canvas');
        if (canvas) {
          const link = document.createElement('a');
          link.download = `etherworld-${Date.now()}.png`;
          link.href = canvas.toDataURL('image/png');
          link.click();
          addLog('Screenshot sauvegardé', 'success');
        }
      },
    },
  ];

  // ── Exécuter une commande texte ──────────────────────────
  function executeCommand(raw: string) {
    const parts = raw.trim().split(' ');
    const cmd   = parts[0]?.toLowerCase() ?? '';
    addLog(`> ${raw}`, 'cmd');

    switch (cmd) {
      case '/tp':
      case 'tp': {
        const x = parseFloat(parts[1] ?? '0');
        const y = parseFloat(parts[2] ?? '1');
        const z = parseFloat(parts[3] ?? '0');
        if (!isNaN(x) && !isNaN(y) && !isNaN(z)) {
          teleport(x, y, z, 'Custom');
        } else {
          addLog('Usage: tp <x> <y> <z>', 'error');
        }
        break;
      }
      case '/fog':
      case 'fog': {
        const val = parseFloat(parts[1] ?? '150');
        if (!isNaN(val) && val > 0) {
          setFogDensityLocal(val);
          setGlobal({ fogDensity: val });
          addLog(`Fog density → ${val}`, 'success');
        } else {
          addLog('Usage: fog <density>', 'error');
        }
        break;
      }
      case '/god':
      case 'god':
        setGlobal({ isGodMode: !isGodMode });
        addLog(`God Mode ${!isGodMode ? 'ON' : 'OFF'}`, 'success');
        break;
      case '/fly':
      case 'fly':
        setGlobal({ flyMode: !flyMode });
        addLog(`Fly Mode ${!flyMode ? 'ON' : 'OFF'}`, 'success');
        break;
      case '/clear':
      case 'clear':
        setLogs([]);
        break;
      case '/help':
      case 'help':
        addLog('Commandes: tp x y z | fog <n> | god | fly | clear', 'info');
        break;
      default:
        addLog(`Commande inconnue: "${cmd}" — tapez help`, 'error');
    }

    setCmdInput('');
  }

  // ── Color map ────────────────────────────────────────────
  const colorMap: Record<string, string> = {
    emerald: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20',
    cyan:    'border-cyan-500/40    bg-cyan-500/10    text-cyan-300    hover:bg-cyan-500/20',
    violet:  'border-violet-500/40  bg-violet-500/10  text-violet-300  hover:bg-violet-500/20',
    amber:   'border-amber-500/40   bg-amber-500/10   text-amber-300   hover:bg-amber-500/20',
    red:     'border-red-500/40     bg-red-500/10     text-red-300     hover:bg-red-500/20',
    blue:    'border-blue-500/40    bg-blue-500/10    text-blue-300    hover:bg-blue-500/20',
    pink:    'border-pink-500/40    bg-pink-500/10    text-pink-300    hover:bg-pink-500/20',
    zinc:    'border-zinc-600/40    bg-zinc-700/20    text-zinc-400    hover:bg-zinc-700/40',
  };

  const logTypeColor: Record<string, string> = {
    info:    'text-zinc-400',
    success: 'text-emerald-400',
    warning: 'text-amber-400',
    error:   'text-red-400',
    cmd:     'text-cyan-400',
  };

  // ── Render ───────────────────────────────────────────────
  return (
    <>
      {/* ── Toggle Button ── */}
      <button
        type="button"
        onClick={() => setIsOpen(v => !v)}
        className={`
          absolute top-3 right-4 z-50
          flex items-center gap-2 px-3 py-2 rounded-xl
          border backdrop-blur-xl font-mono text-[10px] font-bold
          transition-all duration-300 cursor-pointer
          ${isOpen
            ? 'border-violet-500/50 bg-violet-500/15 text-violet-200 shadow-[0_0_20px_rgba(124,58,237,0.2)]'
            : 'border-white/10 bg-black/50 text-zinc-400 hover:border-violet-500/30 hover:text-violet-300'}
        `}
        title="Game Master Panel"
      >
        <span className={`transition-transform duration-300 ${isOpen ? 'rotate-90' : ''}`}>⚙️</span>
        <span className="tracking-widest">GM</span>
        {currentRole === 'owner' && (
          <span className="text-amber-400">👑</span>
        )}
      </button>

      {/* ── Panel ── */}
      {isOpen && (
        <div className="
          absolute top-14 right-4 z-50
          w-[380px] max-h-[80vh]
          rounded-2xl border border-violet-500/20
          bg-black/80 backdrop-blur-2xl
          shadow-[0_0_60px_rgba(124,58,237,0.15)]
          flex flex-col overflow-hidden
        ">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
            <div>
              <div className="text-[11px] font-black text-violet-300 tracking-widest uppercase">
                ⚙️ GM Console
              </div>
              <div className="text-[8px] text-zinc-600 font-mono mt-0.5">
                {currentRole.toUpperCase()} · Etherworld v2.0
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse
                               shadow-[0_0_6px_rgba(52,211,153,0.6)]" />
              <span className="text-[8px] font-mono text-emerald-400">LIVE</span>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-white/5">
            {(['commands', 'world', 'player', 'effects', 'logs'] as const).map(tab => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`
                  flex-1 py-2 text-[9px] font-mono font-bold uppercase tracking-wider
                  transition-all duration-200 cursor-pointer
                  ${activeTab === tab
                    ? 'text-violet-300 border-b-2 border-violet-500 bg-violet-500/5'
                    : 'text-zinc-600 hover:text-zinc-400'}
                `}
              >
                {tab === 'commands' && '⚡'}
                {tab === 'world'    && '🌍'}
                {tab === 'player'   && '👤'}
                {tab === 'effects'  && '✨'}
                {tab === 'logs'     && '📋'}
                {' '}{tab}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3">

            {/* ── Commands Tab ── */}
            {activeTab === 'commands' && (
              <div className="grid grid-cols-2 gap-2">
                {commands
                  .filter(c => c.roles.includes(currentRole))
                  .map(cmd => (
                    <button
                      key={cmd.id}
                      type="button"
                      onClick={() => { cmd.action(); addLog(`[CMD] ${cmd.label}`, 'cmd'); }}
                      className={`
                        flex items-center gap-2 px-3 py-2.5 rounded-xl border
                        font-mono text-[10px] font-bold transition-all duration-200
                        cursor-pointer text-left
                        ${colorMap[cmd.color] ?? colorMap['zinc']}
                      `}
                    >
                      <span className="text-base">{cmd.icon}</span>
                      <span className="leading-tight">{cmd.label}</span>
                    </button>
                  ))}
              </div>
            )}

            {/* ── World Tab ── */}
            {activeTab === 'world' && (
              <div className="space-y-4">
                {/* Fog */}
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="text-[9px] text-zinc-400 font-mono font-bold uppercase tracking-wider">
                      🌫️ Brouillard
                    </label>
                    <span className="text-[9px] font-mono text-violet-300">{fogDensity}</span>
                  </div>
                  <input
                    type="range"
                    min={20} max={500} step={5}
                    value={fogDensity}
                    onChange={e => {
                      const v = parseInt(e.target.value);
                      setFogDensityLocal(v);
                      setGlobal({ fogDensity: v });
                    }}
                    className="w-full h-1.5 bg-zinc-800 rounded-full appearance-none cursor-pointer accent-violet-500"
                  />
                </div>

                {/* Time Scale */}
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="text-[9px] text-zinc-400 font-mono font-bold uppercase tracking-wider">
                      ⏱️ Vitesse du temps
                    </label>
                    <span className="text-[9px] font-mono text-cyan-300">{timeScale.toFixed(1)}x</span>
                  </div>
                  <input
                    type="range"
                    min={0.1} max={5} step={0.1}
                    value={timeScale}
                    onChange={e => setTimeScale(parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-zinc-800 rounded-full appearance-none cursor-pointer accent-cyan-500"
                  />
                </div>

                {/* Scene info */}
                <div className="p-3 rounded-xl bg-zinc-900/50 border border-white/5 space-y-1.5">
                  <div className="text-[9px] text-zinc-500 font-mono font-bold uppercase tracking-wider mb-2">
                    📊 Scène
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[9px] text-zinc-500 font-mono">Objets Three.js</span>
                    <span className="text-[9px] text-violet-300 font-mono font-bold">
                      {scene.children.length}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[9px] text-zinc-500 font-mono">Build Mode</span>
                    <span className={`text-[9px] font-mono font-bold ${buildMode ? 'text-emerald-400' : 'text-zinc-600'}`}>
                      {buildMode ? 'ON' : 'OFF'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[9px] text-zinc-500 font-mono">God Mode</span>
                    <span className={`text-[9px] font-mono font-bold ${isGodMode ? 'text-emerald-400' : 'text-zinc-600'}`}>
                      {isGodMode ? 'ON' : 'OFF'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[9px] text-zinc-500 font-mono">Fly Mode</span>
                    <span className={`text-[9px] font-mono font-bold ${flyMode ? 'text-emerald-400' : 'text-zinc-600'}`}>
                      {flyMode ? 'ON' : 'OFF'}
                    </span>
                  </div>
                </div>

                {/* Teleport shortcuts */}
                <div>
                  <div className="text-[9px] text-zinc-500 font-mono font-bold uppercase tracking-wider mb-2">
                    📍 Téléportation rapide
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {[
                      { label: 'Origine',   x: 0,   y: 1, z: 0   },
                      { label: 'Route 138', x: 0,   y: 1, z: 50  },
                      { label: 'Nord',      x: 0,   y: 1, z: -80 },
                      { label: 'Sud',       x: 0,   y: 1, z: 80  },
                    ].map(loc => (
                      <button
                        key={loc.label}
                        type="button"
                        onClick={() => teleport(loc.x, loc.y, loc.z, loc.label)}
                        className="px-3 py-2 rounded-lg border border-amber-500/30 bg-amber-500/10
                                   text-amber-300 text-[9px] font-mono font-bold
                                   hover:bg-amber-500/20 transition-all cursor-pointer"
                      >
                        {loc.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ── Player Tab ── */}
            {activeTab === 'player' && (
              <div className="space-y-3">
                <div className="p-3 rounded-xl bg-zinc-900/50 border border-white/5 space-y-2">
                  <div className="text-[9px] text-zinc-500 font-mono font-bold uppercase tracking-wider mb-2">
                    👤 Joueur
                  </div>
                  {[
                    { label: 'Position X', value: charGroup.position.x.toFixed(2) },
                    { label: 'Position Y', value: charGroup.position.y.toFixed(2) },
                    { label: 'Position Z', value: charGroup.position.z.toFixed(2) },
                    { label: 'Rotation Y', value: `${(charGroup.rotation.y * 180 / Math.PI).toFixed(1)}°` },
                    { label: 'Role',       value: currentRole.toUpperCase() },
                  ].map(row => (
                    <div key={row.label} className="flex justify-between">
                      <span className="text-[9px] text-zinc-500 font-mono">{row.label}</span>
                      <span className="text-[9px] text-cyan-300 font-mono font-bold">{row.value}</span>
                    </div>
                  ))}
                </div>

                {/* Modes rapides */}
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: 'God',   icon: '🛡️', key: 'isGodMode', val: isGodMode  },
                    { label: 'Fly',   icon: '🦅', key: 'flyMode',   val: flyMode    },
                    { label: 'Build', icon: '🔨', key: 'buildMode', val: buildMode  },
                  ].map(m => (
                    <button
                      key={m.key}
                      type="button"
                      onClick={() => {
                        setGlobal({ [m.key]: !m.val } as any);
                        addLog(`${m.label}: ${!m.val ? 'ON' : 'OFF'}`, 'cmd');
                      }}
                      className={`
                        flex flex-col items-center gap-1 py-3 rounded-xl border
                        font-mono text-[9px] font-bold transition-all cursor-pointer
                        ${m.val
                          ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
                          : 'border-zinc-600/30 bg-zinc-800/20 text-zinc-500 hover:border-zinc-500/50'}
                      `}
                    >
                      <span className="text-lg">{m.icon}</span>
                      <span>{m.label}</span>
                      <span className={`text-[7px] ${m.val ? 'text-emerald-400' : 'text-zinc-600'}`}>
                        {m.val ? 'ON' : 'OFF'}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* ── Effects Tab (unifié : 18 auras + 20 effets moteur) ── */}
            {activeTab === 'effects' && (
              <div className="space-y-3">
                {!engineRef.current && (
                  <p className="text-[8px] text-amber-400/80 font-mono">
                    ⏳ Moteur d'effets en initialisation (caméra/renderer)... les auras restent disponibles.
                  </p>
                )}
                {UNIFIED_CATEGORY_ORDER.map(cat => {
                  const items = UNIFIED_EFFECTS.filter(e => e.category === cat);
                  if (items.length === 0) return null;
                  return (
                    <div key={cat}>
                      <div className="text-[8px] font-mono uppercase tracking-widest text-zinc-600 mb-1">{cat}</div>
                      <div className="grid grid-cols-3 gap-1.5">
                        {items.map(entry => {
                          const locked = entry.minRole === 'owner' && currentRole !== 'owner';
                          const onCooldown = (fxCooldowns[entry.id] ?? 0) > Date.now();
                          return (
                            <button
                              key={entry.id}
                              type="button"
                              disabled={locked || onCooldown}
                              onClick={() => triggerFx(entry)}
                              title={entry.name}
                              className={`
                                flex flex-col items-center gap-0.5 py-1.5 rounded-lg border
                                text-[8px] font-mono transition-all cursor-pointer
                                ${locked || onCooldown
                                  ? 'opacity-40 cursor-not-allowed border-white/5 bg-zinc-900/40'
                                  : 'border-white/10 bg-zinc-900/60 hover:border-violet-500/40 hover:bg-violet-500/10'}
                              `}
                              style={{ borderColor: !locked && !onCooldown ? undefined : undefined }}
                            >
                              <span className="text-sm">{entry.icon}{locked ? ' 👑' : ''}</span>
                              <span className="text-zinc-400 truncate w-full text-center">{entry.name}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* ── Logs Tab ── */}
            {activeTab === 'logs' && (
              <div className="space-y-2">
                {/* Terminal */}
                <div className="bg-black/70 rounded-xl border border-white/5 p-2.5 max-h-[300px] overflow-y-auto">
                  <div className="flex items-center gap-1.5 mb-2 pb-1.5 border-b border-white/5">
                    <div className="w-1.5 h-1.5 rounded-full bg-red-500/60"    />
                    <div className="w-1.5 h-1.5 rounded-full bg-yellow-500/60" />
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500/60"  />
                    <span className="text-[8px] text-zinc-600 font-mono ml-1">gm-console</span>
                    <button
                      type="button"
                      onClick={() => setLogs([])}
                      className="ml-auto text-[8px] text-zinc-600 hover:text-red-400 font-mono cursor-pointer"
                    >
                      clear
                    </button>
                  </div>

                  {logs.length === 0 && (
                    <p className="text-[9px] text-zinc-700 font-mono italic">Aucun log...</p>
                  )}
                  {logs.map(log => (
                    <div key={log.id} className="flex gap-2 mb-0.5">
                      <span className="text-[8px] text-zinc-700 font-mono shrink-0">
                        {log.timestamp}
                      </span>
                      <span className={`text-[8px] font-mono ${logTypeColor[log.type]}`}>
                        {log.message}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Command input */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={cmdInput}
                    onChange={e => setCmdInput(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && cmdInput.trim()) {
                        executeCommand(cmdInput);
                      }
                    }}
                    placeholder="tp 0 1 0 | fog 200 | god | fly | help"
                    className="
                      flex-1 px-3 py-2 rounded-xl
                      bg-zinc-900/80 border border-white/10
                      text-[10px] font-mono text-zinc-300
                      placeholder:text-zinc-700
                      focus:outline-none focus:border-violet-500/40
                    "
                  />
                  <button
                    type="button"
                    onClick={() => { if (cmdInput.trim()) executeCommand(cmdInput); }}
                    className="
                      px-3 py-2 rounded-xl
                      bg-violet-500/20 border border-violet-500/30
                      text-violet-300 text-[10px] font-mono font-bold
                      hover:bg-violet-500/30 transition-all cursor-pointer
                    "
                  >
                    ▶
                  </button>
                </div>
                <p className="text-[8px] text-zinc-700 font-mono">
                  Entrée pour exécuter · tape <span className="text-zinc-500">help</span> pour la liste
                </p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-2 border-t border-white/5">
            <p className="text-[8px] font-mono text-zinc-700 text-center tracking-widest">
              ETHERWORLD GM · {currentRole.toUpperCase()} · {new Date().toLocaleDateString('fr-CA')}
            </p>
          </div>
        </div>
      )}
    </>
  );
}