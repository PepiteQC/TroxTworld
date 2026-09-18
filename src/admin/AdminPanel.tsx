import React, { useState } from 'react';
import { GameManager } from '../game/GameManager';
import { PlayerState } from '../types';
import { GMOD_CATALOG, addCustomCatalogItem } from '../game/GModBuilder';
import { triggerSaveToast } from './SaveToast';
import { 
  Shield, Sparkles, Coins, Hammer, Key, Sun, Sliders, X, Skull, 
  Flame, Zap, RotateCcw, Compass, CheckCircle, Eye, Settings, 
  Layers, ChevronRight, Activity, Trash2, ShieldCheck, HelpCircle,
  Search, Plus, Wrench, Bot, Sprout, Save, Terminal
} from 'lucide-react';

import { getAllAdminCommands, parseAndExecuteAdminCommand } from '../game/admin/AdminCommandSystem';
import { AdminConsole } from './AdminConsole';

interface AdminPanelProps {
  isOpen: boolean;
  onClose: () => void;
  manager: GameManager | null;
  playerState: PlayerState;
  colyseusRoom?: any;
  onAdminCommand?: (cmd: string, args: string[]) => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({
  isOpen,
  onClose,
  manager,
  playerState,
  onAdminCommand,
}) => {
  const [activeTab, setActiveTab] = useState<'console' | 'items' | 'user' | 'commands'>('console');
  const [cmdInput, setCmdInput] = useState('');

  // Library Browser search & filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [registryFilter, setRegistryFilter] = useState<'all' | 'gmod' | 'houses' | 'doors' | 'characters' | 'packs' | 'weapons' | 'mounts' | 'cannabis' | 'entities'>('all');

  // Custom item state
  const [customName, setCustomName] = useState('');
  const [customCategory, setCustomCategory] = useState<'furniture' | 'decor' | 'appliances' | 'outdoor' | 'houses' | 'doors' | 'characters' | 'packs'>('furniture');
  const [customColor, setCustomColor] = useState('#6366f1');
  const [customPrice, setCustomPrice] = useState('250');
  const [customWidth, setCustomWidth] = useState('1.5');
  const [customHeight, setCustomHeight] = useState('0.8');
  const [customDepth, setCustomDepth] = useState('0.8');

  // Unified console execution helper
  const runCmd = (fullCmd: string) => {
    if (!fullCmd.trim()) return;
    const parts = fullCmd.trim().split(' ');
    let cmd = parts[0];
    if (cmd.startsWith('/') || cmd.startsWith('!')) cmd = cmd.substring(1);
    const args = parts.slice(1);

    if (manager) {
      manager.executeConsoleCommand(fullCmd);
    }
    if (onAdminCommand) {
      onAdminCommand(cmd, args);
    } else if (!manager) {
      parseAndExecuteAdminCommand(fullCmd, {
        executorName: "Admin",
        executorRole: "superadmin"
      });
    }
  };

  if (!isOpen) return null;

  // ─── ACTION HANDLERS ─────────────────────────────────────────────

  // 1. Spawning GMod Catalog Item at player's feet
  const handleSpawnItemAtFeet = (itemId: string) => {
    if (!manager) return;
    const p = manager.playerPos;
    const r = manager.playerGroup.rotation;
    const uuid = 'prop_' + Math.random().toString(36).substr(2, 9);
    
    const propData = {
      uuid,
      itemId,
      position: { x: p.x, y: p.y + 0.05, z: p.z },
      rotation: { x: 0, y: r.y, z: 0 }
    };

    manager.builder.placedProps.push(propData);
    manager.builder.instantiatePropMesh(propData);
    manager.builder.saveToStorage();
    manager.addCombatLog(`🛠️ ADMIN: Objet "${itemId}" généré directement à vos pieds !`);
    manager.onStateUpdatePay();
  };

  // 2. Equip GMod Catalog Item to build cursor
  const handleEquipItem = (itemId: string) => {
    if (!manager) return;
    manager.activeItemId = itemId;
    manager.addCombatLog(`🛠️ ADMIN: Objet "${itemId}" équipé dans l'éditeur de construction.`);
    manager.onStateUpdatePay();
  };

  // 3. Create a totally custom object
  const handleCreateCustomItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customName.trim()) return;

    const id = 'custom_' + Date.now();
    const w = parseFloat(customWidth) || 1.0;
    const h = parseFloat(customHeight) || 1.0;
    const d = parseFloat(customDepth) || 1.0;
    const price = parseInt(customPrice) || 100;

    const newItem = {
      id,
      name: customName,
      category: customCategory,
      size: [w, h, d] as [number, number, number],
      color: customColor,
      description: `Objet personnalisé d'administration : ${customName}`,
      icon: 'Box',
      price
    };

    addCustomCatalogItem(newItem);
    if (manager) {
      manager.addCombatLog(`🎨 ADMIN: Nouvel objet personnalisé "${customName}" enregistré au catalogue !`);
      manager.onStateUpdatePay();
    }
    
    // Clear form
    setCustomName('');
  };

  // 4. Player modifications
  const handleToggleGodMode = () => {
    if (!manager) return;
    manager.godMode = !manager.godMode;
    if (manager.godMode) {
      manager.playerHealth = 100;
    }
    manager.addCombatLog(`🛡️ ADMIN: God Mode ${manager.godMode ? 'ACTIVÉ' : 'DÉSACTIVÉ'}`);
    manager.onStateUpdatePay();
  };

  const handleSetHealth = (val: number) => {
    if (!manager) return;
    manager.playerHealth = val;
    manager.addCombatLog(`❤️ ADMIN: Points de vie fixés à ${val}%`);
    manager.onStateUpdatePay();
  };

  const handleGiveCash = (amt: number) => {
    if (!manager) return;
    manager.cash = Math.max(0, manager.cash + amt);
    manager.saveEconomy();
    manager.addCombatLog(`💵 ADMIN: Trésorerie modifiée de $${amt >= 0 ? '+' : ''}${amt}. Solde: $${manager.cash}`);
    manager.onStateUpdatePay();
  };

  const handleGiveSeeds = (amt: number) => {
    if (!manager) return;
    manager.weedSeeds = Math.max(0, manager.weedSeeds + amt);
    manager.saveEconomy();
    manager.addCombatLog(`🌱 ADMIN: Graines de Cannabis modifiées de ${amt >= 0 ? '+' : ''}${amt}.`);
    manager.onStateUpdatePay();
  };

  const handleGiveBuds = (amt: number) => {
    if (!manager) return;
    manager.weedBuds = Math.max(0, manager.weedBuds + amt);
    manager.saveEconomy();
    manager.addCombatLog(`🌿 ADMIN: Récolte de Cannabis modifiée de ${amt >= 0 ? '+' : ''}${amt}.`);
    manager.onStateUpdatePay();
  };

  // 5. Weapon equip
  const handleEquipWeapon = (weapon: 'none' | 'pipe' | 'bat' | 'bottle' | 'hammer') => {
    if (!manager) return;
    manager.adminEquipWeapon(weapon);
  };

  // 6. Mount select
  const handleSelectMount = (mount: 'hoverboard' | 'broom' | null) => {
    if (!manager) return;
    if (mount === null) {
      manager.activeMount = null;
      manager.addCombatLog(`🚶 ADMIN: Descente de monture forcée.`);
    } else {
      manager.activeMount = mount;
      manager.addCombatLog(`🚀 ADMIN: Monture forcée : ${mount.toUpperCase()}`);
    }
    manager.onStateUpdatePay();
  };

  // 7. World control
  const handleSetTimeOfDay = (hour: number) => {
    if (!manager) return;
    // Set direct time value (0 to 1)
    // we change the time of day factor directly
    manager.executeConsoleCommand(`teleport spawn`); // refresh lighting anchor point
    // Set the sky time factor directly to be precise
    const dummyObj: any = manager;
    dummyObj.skyTimeOfDay = hour / 24;
    manager.addCombatLog(`☀️ ADMIN: Heure solaire réglée à ${hour}h00.`);
    manager.onStateUpdatePay();
  };

  const handleSetGravity = (g: number) => {
    if (!manager) return;
    manager.gravity = g;
    manager.addCombatLog(`🌎 ADMIN: Gravité modifiée à ${g} m/s² (Terre: 19.8, Lune: 3.5, Zéro-G: 0).`);
    manager.onStateUpdatePay();
  };

  const handleSetSpeed = (s: number) => {
    if (!manager) return;
    manager.playerSpeed = s;
    manager.addCombatLog(`⚡ ADMIN: Vitesse d'avatar réglée à ${s} m/s.`);
    manager.onStateUpdatePay();
  };

  const handleSetJointStiffness = (stiffness: 'stiff' | 'relaxed' | 'floppy') => {
    if (!manager) return;
    manager.jointStiffness = stiffness;
    manager.addCombatLog(`🥋 ADMIN: Raideur des ragdolls fixée à [${stiffness.toUpperCase()}].`);
    manager.onStateUpdatePay();
  };

  const handleToggleGangBeasts = () => {
    if (!manager) return;
    manager.gangBeastsMode = !manager.gangBeastsMode;
    manager.addCombatLog(`🤪 ADMIN: Mode physique désarticulé ${manager.gangBeastsMode ? 'ACTIVÉ' : 'DÉSACTIVÉ'}.`);
    manager.onStateUpdatePay();
  };

  const handleResetAlarms = () => {
    if (!manager) return;
    // Clear alarms in useSmartHouse if needed, or trigger global reset
    manager.addCombatLog(`🚨 ADMIN: Alarme générale réinitialisée, verrous sécurisés.`);
    // Trigger terminal command
    manager.executeConsoleCommand(`audit`);
    manager.onStateUpdatePay();
  };

  const handleUnlockAllProperties = () => {
    if (!manager) return;
    manager.boughtPropertyIds = ['villa_nova', 'modern_loft', 'suburban_dream'];
    manager.saveEconomy();
    manager.addCombatLog(`🔑 ADMIN: Trousseau immobilier complet octroyé ! Toutes les clés sont débloquées.`);
    manager.onStateUpdatePay();
  };

  const handleClearAllProps = () => {
    if (!manager) return;
    if (confirm("Confirmez-vous le nettoyage complet de tous les objets posés dans l'Etherworld ? (Action irréversible)")) {
      manager.builder.placedProps = [];
      manager.builder.saveToStorage();
      manager.addCombatLog(`🧹 ADMIN: Table de décors nettoyée. Rechargement...`);
      window.location.reload();
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-md z-[100] flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-4xl h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-fade-in text-slate-100">
        
        {/* PANEL HEADER */}
        <div className="bg-slate-950 px-6 py-4 flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Shield className="w-4.5 h-4.5 animate-pulse" />
            </div>
            <div>
              <h2 className="text-sm font-black tracking-wider uppercase font-mono flex items-center gap-1.5">
                PANEL D'ADMINISTRATION <span className="text-[10px] text-emerald-400 font-bold bg-emerald-950/60 px-1.5 py-0.5 rounded font-mono uppercase">Master Console</span>
              </h2>
              <p className="text-[10px] text-slate-400 font-mono font-bold tracking-widest uppercase mt-0.5">
                Accès Super-Utilisateur Étherworld 
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (manager) {
                  (manager as any).saveEconomy();
                  (manager as any).saveWeedPlants();
                  if (manager.builder) manager.builder.saveToStorage();
                }
                triggerSaveToast({
                  title: 'Sauvegarde manuelle',
                  details: 'Partie et données sauvegardées avec succès dans le stockage local !',
                  type: 'manual'
                });
              }}
              className="px-3 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 cursor-pointer transition text-xs font-mono font-bold flex items-center gap-1.5"
              title="Sauvegarder manuellement l'état du jeu"
            >
              <Save className="w-3.5 h-3.5 text-emerald-400" />
              <span>Sauvegarder</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 hover:border-slate-700 cursor-pointer transition flex items-center justify-center"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* TOP LEVEL CONFIG TABS */}
        <div className="bg-slate-900/40 px-6 py-2 flex gap-2 border-b border-slate-800/80 shrink-0 font-mono text-[11px]">
          <button
            onClick={() => setActiveTab('console')}
            className={`px-4 py-2 rounded-xl border font-bold tracking-wider transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'console'
                ? 'bg-cyan-600 border-cyan-500 text-slate-950 font-black'
                : 'bg-slate-950/40 border-slate-800/60 text-cyan-400 hover:text-cyan-300'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" /> Console Admin
          </button>
          <button
            onClick={() => setActiveTab('items')}
            className={`px-4 py-2 rounded-xl border font-bold tracking-wider transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'items'
                ? 'bg-indigo-600 border-indigo-500 text-white font-black'
                : 'bg-slate-950/40 border-slate-800/60 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" /> Items
          </button>
          <button
            onClick={() => setActiveTab('user')}
            className={`px-4 py-2 rounded-xl border font-bold tracking-wider transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'user'
                ? 'bg-indigo-600 border-indigo-500 text-white font-black'
                : 'bg-slate-950/40 border-slate-800/60 text-slate-400 hover:text-slate-200'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" /> User Management
          </button>
          <button
            onClick={() => setActiveTab('commands')}
            className={`px-4 py-2 rounded-xl border font-bold tracking-wider transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'commands'
                ? 'bg-indigo-600 border-indigo-500 text-white font-black'
                : 'bg-slate-950/40 border-slate-800/60 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Terminal className="w-3.5 h-3.5 text-cyan-400" /> Commandes & Roles
          </button>
        </div>

        {/* MAIN BODY SCROLLABLE LAYOUT */}
        <div className="flex-1 overflow-y-auto p-6 scrollbar-thin flex flex-col gap-6 bg-slate-950/20">
          
          {/* TAB CONSOLE: CONSOLE INTERACTIVE AVANCÉE */}
          {activeTab === 'console' && (
            <div className="h-full min-h-[480px]">
              <AdminConsole
                manager={manager}
                onAdminCommand={onAdminCommand}
                executorName="Admin"
                executorRole="superadmin"
              />
            </div>
          )}
          
          {/* TAB 0: COMMANDES ADMINS & ROLES PLATINE */}
          {activeTab === 'commands' && (
            <div className="flex flex-col gap-6 font-mono">
              
              {/* TERMINAL INTERACTIVE COMMAND PROMPT */}
              <div className="bg-slate-950 border border-indigo-500/40 rounded-2xl p-4 shadow-xl">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span>
                    <span className="w-2.5 h-2.5 rounded-full bg-yellow-500"></span>
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                    <span className="text-xs font-bold text-slate-300 ml-2">PLATINUM MASTER COMMAND CONSOLE v3.5 — TroxT Intellectus</span>
                  </div>
                  <span className="text-[10px] text-cyan-400 font-bold bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800">SYSTEM READY</span>
                </div>

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!cmdInput.trim()) return;
                    runCmd(cmdInput.trim());
                    setCmdInput('');
                  }}
                  className="flex gap-2"
                >
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-2.5 text-indigo-400 font-bold text-xs">#</span>
                    <input
                      type="text"
                      value={cmdInput}
                      onChange={(e) => setCmdInput(e.target.value)}
                      placeholder="Tapez une commande (/jail, /tp, /spawnevent, /setrole, /setjob, /heal, /car, /intellectus)..."
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-7 pr-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 transition font-mono"
                    />
                  </div>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl cursor-pointer transition flex items-center gap-1.5"
                  >
                    <span>Exécuter</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </form>
              </div>

              {/* QUICK ACTIONS & MODERATION GRID */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                
                {/* MODERATION & JAIL */}
                <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 flex flex-col gap-3">
                  <h4 className="text-xs font-bold text-rose-300 uppercase flex items-center gap-1.5 border-b border-slate-800 pb-2">
                    <Skull className="w-3.5 h-3.5 text-rose-400" /> Incarcération & Sanctions
                  </h4>
                  <div className="grid grid-cols-2 gap-2 text-[10px]">
                    <button
                      onClick={() => runCmd('/jail local_player 120 Infraction RP')}
                      className="p-2 rounded-xl bg-slate-950 hover:bg-slate-900 border border-slate-800 text-amber-300 font-bold transition text-left cursor-pointer"
                    >
                      ⚖️ Jail 120s
                    </button>
                    <button
                      onClick={() => runCmd('/unjail local_player')}
                      className="p-2 rounded-xl bg-slate-950 hover:bg-slate-900 border border-slate-800 text-emerald-300 font-bold transition text-left cursor-pointer"
                    >
                      🕊️ Unjail Libre
                    </button>
                    <button
                      onClick={() => runCmd('/slap local_player 15')}
                      className="p-2 rounded-xl bg-slate-950 hover:bg-slate-900 border border-slate-800 text-cyan-300 font-bold transition text-left cursor-pointer"
                    >
                      👋 Slap +15m
                    </button>
                    <button
                      onClick={() => runCmd('/smite local_player')}
                      className="p-2 rounded-xl bg-slate-950 hover:bg-slate-900 border border-slate-800 text-purple-300 font-bold transition text-left cursor-pointer"
                    >
                      ⚡ Smite Éclair
                    </button>
                  </div>
                </div>

                {/* TELEPORTATION POIS */}
                <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 flex flex-col gap-3">
                  <h4 className="text-xs font-bold text-cyan-300 uppercase flex items-center gap-1.5 border-b border-slate-800 pb-2">
                    <Compass className="w-3.5 h-3.5 text-cyan-400" /> Téléportation Points d'Intérêt
                  </h4>
                  <div className="grid grid-cols-2 gap-2 text-[10px]">
                    <button
                      onClick={() => runCmd('/tpspawn')}
                      className="p-2 rounded-xl bg-slate-950 hover:bg-slate-900 border border-slate-800 text-slate-200 font-bold transition text-left cursor-pointer"
                    >
                      📍 Central Spawn
                    </button>
                    <button
                      onClick={() => runCmd('/tppolice')}
                      className="p-2 rounded-xl bg-slate-950 hover:bg-slate-900 border border-slate-800 text-blue-300 font-bold transition text-left cursor-pointer"
                    >
                      🚓 Commissariat SPVM
                    </button>
                    <button
                      onClick={() => runCmd('/tpbkf')}
                      className="p-2 rounded-xl bg-slate-950 hover:bg-slate-900 border border-slate-800 text-emerald-300 font-bold transition text-left cursor-pointer"
                    >
                      🏦 Banque Centrale
                    </button>
                    <button
                      onClick={() => runCmd('/tpdojo')}
                      className="p-2 rounded-xl bg-slate-950 hover:bg-slate-900 border border-slate-800 text-amber-300 font-bold transition text-left cursor-pointer"
                    >
                      🥋 Dojo Fight Club
                    </button>
                  </div>
                </div>

                {/* WORLD RP EVENTS */}
                <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 flex flex-col gap-3">
                  <h4 className="text-xs font-bold text-amber-300 uppercase flex items-center gap-1.5 border-b border-slate-800 pb-2">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Événements RP Serveur
                  </h4>
                  <div className="grid grid-cols-2 gap-2 text-[10px]">
                    <button
                      onClick={() => runCmd('/spawnevent ether_storm')}
                      className="p-2 rounded-xl bg-slate-950 hover:bg-slate-900 border border-slate-800 text-purple-300 font-bold transition text-left cursor-pointer"
                    >
                      🌩️ Tempête d'Éther
                    </button>
                    <button
                      onClick={() => runCmd('/spawnevent bank_robbery')}
                      className="p-2 rounded-xl bg-slate-950 hover:bg-slate-900 border border-slate-800 text-rose-300 font-bold transition text-left cursor-pointer"
                    >
                      🏦 Braquage Banque
                    </button>
                    <button
                      onClick={() => runCmd('/spawnevent police_chase')}
                      className="p-2 rounded-xl bg-slate-950 hover:bg-slate-900 border border-slate-800 text-blue-300 font-bold transition text-left cursor-pointer"
                    >
                      🚨 Course Poursuite
                    </button>
                    <button
                      onClick={() => runCmd('/spawnevent airdrop')}
                      className="p-2 rounded-xl bg-slate-950 hover:bg-slate-900 border border-slate-800 text-amber-300 font-bold transition text-left cursor-pointer"
                    >
                      📦 Airdrop Militaire
                    </button>
                  </div>
                </div>

              </div>

              {/* ROLES STAFF PLATINUM & METIERS RP */}
              <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 flex flex-col gap-4">
                <h4 className="text-xs font-bold text-indigo-300 uppercase flex items-center gap-1.5 border-b border-slate-800 pb-2">
                  <Shield className="w-3.5 h-3.5 text-indigo-400" /> Attribution des Rôles Staff & Métiers RP
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Staff Roles */}
                  <div className="flex flex-col gap-2">
                    <span className="text-[11px] text-slate-400 font-bold">RÔLES D'ADMINISTRATION :</span>
                    <div className="flex flex-wrap gap-1.5 text-[10px]">
                      {[
                        { id: 'intellectus_ai', label: '🧠 Intellectus AI' },
                        { id: 'developer', label: '💻 Lead Developer' },
                        { id: 'owner', label: '👑 Fondateur' },
                        { id: 'head_admin', label: '🌹 Head Admin' },
                        { id: 'superadmin', label: '🛡️ SuperAdmin' },
                        { id: 'admin', label: '👮 Admin' },
                        { id: 'mod', label: '🔍 Modérateur' },
                        { id: 'helper', label: '🌱 Helper Staff' },
                      ].map((r) => (
                        <button
                          key={r.id}
                          onClick={() => runCmd(`/setrole local_player ${r.id}`)}
                          className="px-2.5 py-1.5 rounded-lg bg-slate-950 hover:bg-indigo-950 border border-slate-800 hover:border-indigo-500 text-slate-300 hover:text-white transition font-bold cursor-pointer"
                        >
                          {r.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* RP Jobs */}
                  <div className="flex flex-col gap-2">
                    <span className="text-[11px] text-slate-400 font-bold">MÉTIEURS & PROFESSIONS RP :</span>
                    <div className="flex flex-wrap gap-1.5 text-[10px]">
                      {[
                        { id: 'police_chief', label: '👮‍♂️ Chef de Police' },
                        { id: 'fbi_agent', label: '🕶️ Agent FBI' },
                        { id: 'medic_director', label: '🚑 Dir. Urgences' },
                        { id: 'mechanic', label: '🔧 Mécanicien' },
                        { id: 'mafia_boss', label: '👔 Parrain Mafia' },
                        { id: 'mayor', label: '🏛️ Maire' },
                        { id: 'judge', label: '⚖️ Juge Suprême' },
                        { id: 'ether_architect', label: '✨ Architecte Éther' },
                      ].map((j) => (
                        <button
                          key={j.id}
                          onClick={() => runCmd(`/setjob local_player ${j.id}`)}
                          className="px-2.5 py-1.5 rounded-lg bg-slate-950 hover:bg-cyan-950 border border-slate-800 hover:border-cyan-500 text-slate-300 hover:text-white transition font-bold cursor-pointer"
                        >
                          {j.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

              </div>

              {/* DYNAMIC ADVANCED COMMANDS CATALOG GRID */}
              <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 flex flex-col gap-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <h4 className="text-xs font-bold text-cyan-300 uppercase flex items-center gap-1.5">
                    <Terminal className="w-3.5 h-3.5 text-cyan-400" /> Catalogue des Commandes Avancées RP ({getAllAdminCommands().length})
                  </h4>
                  <span className="text-[10px] text-slate-400">Cliquez pour exécuter ou pré-remplir</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
                  {getAllAdminCommands().map((cmd) => (
                    <div
                      key={cmd.id}
                      className="p-2.5 bg-slate-950/80 border border-slate-800/80 hover:border-cyan-500/50 rounded-xl transition flex flex-col justify-between gap-1 group"
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-black font-mono text-cyan-400 group-hover:text-cyan-300">
                            /{cmd.name}
                          </span>
                          <span className="text-[8px] font-bold uppercase px-1.5 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-800">
                            {cmd.category}
                          </span>
                        </div>
                        <p className="text-[9.5px] text-slate-300/90 mt-1 leading-snug line-clamp-2">
                          {cmd.description}
                        </p>
                      </div>

                      <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-slate-900 text-[8.5px]">
                        <span className="text-slate-500 font-mono font-bold truncate max-w-[130px]" title={cmd.usage}>
                          {cmd.usage}
                        </span>
                        <button
                          onClick={() => {
                            setCmdInput(`/${cmd.name} `);
                          }}
                          className="px-2 py-0.5 bg-cyan-950/60 hover:bg-cyan-900 text-cyan-300 font-extrabold rounded border border-cyan-800 transition cursor-pointer"
                        >
                          Tester
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          )}
          
          {/* TAB 1: USER MANAGEMENT & BUDGET CONTROLS */}
          {activeTab === 'user' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* GOD MODE & STATS */}
              <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 flex flex-col gap-4">
                <div className="flex justify-between items-center border-b border-slate-800 pb-2 mb-1">
                  <h3 className="font-bold text-xs font-mono uppercase tracking-wider text-indigo-300 flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5 text-indigo-400" /> Mode Dieu & Vitalité
                  </h3>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-mono font-black text-slate-400">STATUT:</span>
                    <span className={`text-[10px] font-mono font-black px-1.5 rounded uppercase ${playerState.godMode ? 'bg-emerald-950/60 text-emerald-400' : 'bg-red-950/40 text-red-400'}`}>
                      {playerState.godMode ? '🛡️ ACTIF' : 'NORMAL'}
                    </span>
                  </div>
                </div>

                {/* God mode master toggle */}
                <div className="flex items-center justify-between bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/80">
                  <div>
                    <span className="text-xs font-bold block text-white">Togglé le God Mode</span>
                    <span className="text-[10px] text-slate-400 font-medium">Rend invulnérable à toutes les attaques et collisions</span>
                  </div>
                  <button
                    onClick={handleToggleGodMode}
                    className={`px-4 py-2 font-mono text-[10px] font-black rounded-xl border transition cursor-pointer uppercase tracking-wider ${
                      playerState.godMode
                        ? 'bg-emerald-600 hover:bg-emerald-500 border-emerald-400 text-white shadow-lg'
                        : 'bg-slate-900 hover:bg-slate-800 border-slate-800 text-slate-300'
                    }`}
                  >
                    {playerState.godMode ? '🟢 DÉSACTIVER' : '🔴 ACTIVER'}
                  </button>
                </div>

                {/* Direct health adjustment slider */}
                <div className="flex flex-col gap-2 bg-slate-950/40 p-3.5 rounded-xl border border-slate-800/60 font-mono text-xs">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-slate-300">Ajuster la Santé</span>
                    <span className="text-indigo-300 font-extrabold">{playerState.health}% HP</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={playerState.health || 0}
                    onChange={(e) => handleSetHealth(parseInt(e.target.value))}
                    disabled={playerState.godMode}
                    className="w-full accent-indigo-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer disabled:opacity-50"
                  />
                  <div className="grid grid-cols-4 gap-1.5 mt-1 text-[10px]">
                    {[0, 10, 50, 100].map((hpVal) => (
                      <button
                        key={hpVal}
                        onClick={() => handleSetHealth(hpVal)}
                        disabled={playerState.godMode}
                        className="py-1 rounded bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white transition text-center cursor-pointer disabled:opacity-50"
                      >
                        {hpVal === 0 ? '💀 Kill' : `${hpVal}%`}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* BUDGET & INVENTORY GRANTS */}
              <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 flex flex-col gap-4">
                <h3 className="font-bold text-xs font-mono uppercase tracking-wider text-indigo-300 border-b border-slate-800 pb-2 mb-1 flex items-center gap-1.5">
                  <Coins className="w-3.5 h-3.5 text-indigo-400" /> Trésorerie & Cannabis Inventory
                </h3>

                {/* Cash Grants */}
                <div className="flex flex-col gap-1.5 font-mono text-xs">
                  <span className="text-slate-300">Solde Cash Actuel : <span className="text-emerald-400 font-extrabold">${playerState.cash}</span></span>
                  <div className="grid grid-cols-3 gap-1.5 mt-1">
                    {[
                      { label: '+$1,000', amt: 1000 },
                      { label: '+$10,000', amt: 10000 },
                      { label: '-$1,000', amt: -1000 },
                    ].map((btn) => (
                      <button
                        key={btn.label}
                        onClick={() => handleGiveCash(btn.amt)}
                        className="py-2 px-1 rounded-xl bg-slate-950/60 hover:bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white transition font-bold text-center text-[10px] cursor-pointer"
                      >
                        {btn.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Cannabis Seed/Bud inventory adjustments */}
                <div className="grid grid-cols-2 gap-3 mt-1 font-mono text-xs">
                  <div className="flex flex-col gap-1.5">
                    <span className="text-slate-300">Graines : <span className="text-amber-500 font-extrabold">{playerState.weedSeeds}</span></span>
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => handleGiveSeeds(5)}
                        className="flex-1 py-1.5 rounded bg-slate-950/60 hover:bg-slate-900 border border-slate-800 text-slate-400 hover:text-white text-[10px] font-bold transition cursor-pointer"
                      >
                        +5 Seed
                      </button>
                      <button
                        onClick={() => handleGiveSeeds(25)}
                        className="flex-1 py-1.5 rounded bg-slate-950/60 hover:bg-slate-900 border border-slate-800 text-slate-400 hover:text-white text-[10px] font-bold transition cursor-pointer"
                      >
                        +25
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <span className="text-slate-300">Têtes : <span className="text-green-500 font-extrabold">{playerState.weedBuds}</span></span>
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => handleGiveBuds(5)}
                        className="flex-1 py-1.5 rounded bg-slate-950/60 hover:bg-slate-900 border border-slate-800 text-slate-400 hover:text-white text-[10px] font-bold transition cursor-pointer"
                      >
                        +5 Bud
                      </button>
                      <button
                        onClick={() => handleGiveBuds(25)}
                        className="flex-1 py-1.5 rounded bg-slate-950/60 hover:bg-slate-900 border border-slate-800 text-slate-400 hover:text-white text-[10px] font-bold transition cursor-pointer"
                      >
                        +25
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* WEAPONS & COMBAT EQUIPMENT */}
              <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 flex flex-col gap-4">
                <h3 className="font-bold text-xs font-mono uppercase tracking-wider text-indigo-300 border-b border-slate-800 pb-2 mb-1 flex items-center gap-1.5">
                  <Flame className="w-3.5 h-3.5 text-indigo-400" /> Arsenal & Armement Tactique
                </h3>

                <div className="flex flex-col gap-1.5 font-mono text-[11px]">
                  <span className="text-slate-300">Arme Active : <span className="text-indigo-400 font-black uppercase">{playerState.currentWeapon || 'none'}</span></span>
                  <div className="grid grid-cols-2 gap-2 mt-1">
                    {[
                      { id: 'none', label: '👊 Mains nues' },
                      { id: 'pipe', label: '🔧 Tuyau de Plomb' },
                      { id: 'bat', label: '🏏 Batte Cloutée' },
                      { id: 'bottle', label: '🍾 Bouteille' },
                      { id: 'hammer', label: '🔨 Masse Chantier' },
                    ].map((wpn) => (
                      <button
                        key={wpn.id}
                        onClick={() => handleEquipWeapon(wpn.id as any)}
                        className={`py-2 px-3 rounded-xl border text-left transition text-[10px] font-bold cursor-pointer flex items-center justify-between ${
                          (playerState.currentWeapon || 'none') === wpn.id
                            ? 'bg-indigo-600 border-indigo-500 text-white'
                            : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                        }`}
                      >
                        <span>{wpn.label}</span>
                        {(playerState.currentWeapon || 'none') === wpn.id && <span className="text-[9px] text-white">●</span>}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* MOUNTS & VEHICLES */}
              <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 flex flex-col gap-4">
                <h3 className="font-bold text-xs font-mono uppercase tracking-wider text-indigo-300 border-b border-slate-800 pb-2 mb-1 flex items-center gap-1.5">
                  <Compass className="w-3.5 h-3.5 text-indigo-400" /> Montures & Véhicules Véloces
                </h3>

                <div className="flex flex-col gap-1.5 font-mono text-[11px]">
                  <span className="text-slate-300">Monture Active : <span className="text-indigo-400 font-black uppercase">{playerState.activeMount || '🚶 À pied'}</span></span>
                  <div className="grid grid-cols-3 gap-2 mt-1">
                    {[
                      { id: null, label: '🚶 Pied' },
                      { id: 'hoverboard', label: '🛹 Hoverboard' },
                      { id: 'broom', label: '🧹 Balai' },
                    ].map((mnt) => (
                      <button
                        key={mnt.id ?? 'null'}
                        onClick={() => handleSelectMount(mnt.id as any)}
                        className={`py-2 px-2.5 rounded-xl border text-center transition text-[10px] font-bold cursor-pointer ${
                          playerState.activeMount === mnt.id
                            ? 'bg-indigo-600 border-indigo-500 text-white'
                            : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {mnt.label}
                      </button>
                    ))}
                  </div>
                  <p className="text-[10px] text-slate-400 leading-snug mt-2">
                    💡 **Balai** permet de voler en 3D en maintenant **ESPACE** pour s'élever ou **CTRL / C** pour descendre.
                  </p>
                </div>
              </div>

            </div>
          )}

          {/* TAB 2: REGISTRY LIBRARY BROWSER & CUSTOM CREATION */}
          {activeTab === 'items' && (() => {
            // Build dynamic entries for our Registry Library Browser
            const customGmodItems = GMOD_CATALOG.map(item => {
              let registryType: 'gmod' | 'houses' | 'doors' | 'characters' | 'packs' = 'gmod';
              if (item.category === 'houses') registryType = 'houses';
              else if (item.category === 'doors') registryType = 'doors';
              else if (item.category === 'characters') registryType = 'characters';
              else if (item.category === 'packs') registryType = 'packs';

              return {
                id: item.id,
                name: item.name,
                registry: registryType,
                subtext: item.packName ? `[${item.packName}] • ${item.category.toUpperCase()} • ${item.size.join('x')}m` : `Prop GMod • ${item.category.toUpperCase()} • ${item.size.join('x')}m`,
                description: item.description || 'Objet de construction physique.',
                color: item.color,
                price: item.price,
                packName: item.packName,
                isInteractiveDoor: item.isInteractiveDoor,
                actions: [
                  {
                    label: item.isInteractiveDoor ? 'Spawn Door' : item.category === 'houses' ? 'Spawn House' : 'Spawn Item',
                    icon: Hammer,
                    title: 'Générer l\'objet directement à vos pieds',
                    primary: true,
                    handler: () => {
                      if (manager) {
                        handleSpawnItemAtFeet(item.id);
                      } else if (onAdminCommand) {
                        onAdminCommand('spawn', [item.id]);
                      }
                    }
                  }
                ]
              };
            });

            const weaponItems = [
              { id: 'pipe', name: 'Tuyau de Plomb', subtext: 'Arme de corps-à-corps rapide • Dégâts Modérés', description: 'Idéal pour le combat de rue rapproché. Rapide et efficace.', color: '#475569' },
              { id: 'bat', name: 'Batte Cloutée', subtext: 'Arme lourde improvisée • Dégâts Élevés', description: 'Batte de baseball entourée de barbelés métalliques.', color: '#b45309' },
              { id: 'bottle', name: 'Bouteille Cassée', subtext: 'Arme de fortune tranchante • Vitesse Max', description: 'Bouteille en verre brisée, rapide et imprévisible.', color: '#0f766e' },
              { id: 'hammer', name: 'Masse de Chantier', subtext: 'Arme Titan • Étourdissement Critique', description: 'Une masse de démolition extrêmement lourde avec un knockback massif.', color: '#312e81' },
            ].map(wpn => ({
              id: wpn.id,
              name: wpn.name,
              registry: 'weapons' as const,
              subtext: wpn.subtext,
              description: wpn.description,
              color: wpn.color,
              price: 0,
              actions: [
                {
                  label: 'Equip Weapon',
                  icon: Flame,
                  title: 'Équiper l\'arme et fermer le panel',
                  primary: true,
                  handler: () => {
                    handleEquipWeapon(wpn.id as any);
                    onClose();
                  }
                }
              ]
            }));

            const vehicleItems = [
              { id: 'hoverboard', name: 'Hoverboard Éther-Core', subtext: 'Véhicule de glisse urbaine • Vitesse x2', description: 'Glissez sur les routes avec style et fluidité.', color: '#6366f1' },
              { id: 'broom', name: 'Balai Volant Nimbus', subtext: 'Monture 3D • Vol Libre (Espace/Ctrl)', description: 'Évadez-vous dans le ciel de l\'Etherworld en contrôlant l\'altitude.', color: '#854d0e' },
            ].map(veh => ({
              id: veh.id,
              name: veh.name,
              registry: 'mounts' as const,
              subtext: veh.subtext,
              description: veh.description,
              color: veh.color,
              price: 0,
              actions: [
                {
                  label: 'Force Mount',
                  icon: Compass,
                  title: 'Monter à bord immédiatement et fermer le panel',
                  primary: true,
                  handler: () => {
                    handleSelectMount(veh.id as any);
                    onClose();
                  }
                }
              ]
            }));

            const cannabisItems = [
              {
                id: 'seeds_pack',
                name: 'Paquet de 10 Graines',
                registry: 'cannabis' as const,
                subtext: 'Botanique • Intrant de Culture',
                description: 'Graines de cannabis de haute qualité prêtes à être plantées en extérieur.',
                color: '#d97706',
                price: 0,
                actions: [
                  {
                    label: 'Give +10 Seeds',
                    icon: Sprout,
                    title: 'Ajoute 10 graines de cannabis à votre inventaire',
                    primary: true,
                    handler: () => {
                      handleGiveSeeds(10);
                    }
                  }
                ]
              },
              {
                id: 'buds_pack',
                name: 'Sac de 10 Récoltes (Têtes)',
                registry: 'cannabis' as const,
                subtext: 'Botanique • Produit Commercialisable',
                description: 'Têtes séchées prêtes à la revente au Dispensaire de weed pour maximiser votre cash.',
                color: '#15803d',
                price: 0,
                actions: [
                  {
                    label: 'Give +10 Buds',
                    icon: Coins,
                    title: 'Ajoute 10 récoltes de cannabis à votre inventaire',
                    primary: true,
                    handler: () => {
                      handleGiveBuds(10);
                    }
                  }
                ]
              },
              {
                id: 'weed_seedling',
                name: 'Jeune Pousse de Cannabis',
                registry: 'cannabis' as const,
                subtext: 'Culture Vivante • Stade Initial (10% Croissance)',
                description: 'Génère une jeune plante de cannabis fraîchement plantée à vos pieds.',
                color: '#a3e635',
                price: 0,
                actions: [
                  {
                    label: 'Plant Seedling',
                    icon: Plus,
                    title: 'Faire pousser une jeune plante à vos pieds',
                    primary: true,
                    handler: () => {
                      if (manager) {
                        manager.adminSpawnWeedPlantAtFeet('seedling');
                      }
                    }
                  }
                ]
              },
              {
                id: 'weed_medium',
                name: 'Canopée Végétative',
                registry: 'cannabis' as const,
                subtext: 'Culture Vivante • Croissance Avancée (50%)',
                description: 'Génère une plante de cannabis à mi-chemin de sa floraison.',
                color: '#22c55e',
                price: 0,
                actions: [
                  {
                    label: 'Plant Medium',
                    icon: Plus,
                    title: 'Faire pousser une plante en floraison moyenne à vos pieds',
                    primary: true,
                    handler: () => {
                      if (manager) {
                        manager.adminSpawnWeedPlantAtFeet('medium');
                      }
                    }
                  }
                ]
              },
              {
                id: 'weed_mature',
                name: 'Buisson de Cannabis Mature',
                registry: 'cannabis' as const,
                subtext: 'Culture Vivante • Prête à Récolter (100% - Prête)',
                description: 'Génère un grand buisson prêt à la récolte immédiate avec [E].',
                color: '#166534',
                price: 0,
                actions: [
                  {
                    label: 'Plant Mature',
                    icon: Plus,
                    title: 'Faire pousser un buisson mûr prêt à récolter à vos pieds',
                    primary: true,
                    handler: () => {
                      if (manager) {
                        manager.adminSpawnWeedPlantAtFeet('mature');
                      }
                    }
                  }
                ]
              }
            ];

            const entityItems = [
              {
                id: 'dummy_wood',
                name: 'Mannequin d\'Entraînement Bois',
                registry: 'entities' as const,
                subtext: 'Cible d\'Entraînement • Standard (150 PV)',
                description: 'Idéal pour peaufiner vos coups de pied d\'arts martiaux. Pivot rotatif réversible.',
                color: '#b45309',
                price: 0,
                actions: [
                  {
                    label: 'Spawn Dummy',
                    icon: Bot,
                    title: 'Fait apparaître un mannequin de bois à vos pieds',
                    primary: true,
                    handler: () => {
                      if (manager) {
                        manager.adminSpawnDummyAtFeet('wooden');
                      }
                    }
                  }
                ]
              },
              {
                id: 'dummy_iron',
                name: 'Mannequin d\'Acier Blindé',
                registry: 'entities' as const,
                subtext: 'Cible d\'Entraînement • Blindé (500 PV)',
                description: 'Ultra résistant. Encaisse des centaines de coups, idéal pour les armes d\'impact lourdes.',
                color: '#64748b',
                price: 0,
                actions: [
                  {
                    label: 'Spawn Heavy Dummy',
                    icon: Bot,
                    title: 'Fait apparaître un mannequin d\'acier à vos pieds',
                    primary: true,
                    handler: () => {
                      if (manager) {
                        manager.adminSpawnDummyAtFeet('iron');
                      }
                    }
                  }
                ]
              },
              {
                id: 'dummy_punchbag',
                name: 'Sac de Frappe Suspendu',
                registry: 'entities' as const,
                subtext: 'Cible Suspendue • Flexible (150 PV)',
                description: 'Sac de boxe suspendu sur portique en métal, bouge selon la physique des impacts.',
                color: '#ef4444',
                price: 0,
                actions: [
                  {
                    label: 'Spawn Punchbag',
                    icon: Bot,
                    title: 'Fait apparaître un sac de frappe suspendu à vos pieds',
                    primary: true,
                    handler: () => {
                      if (manager) {
                        manager.adminSpawnDummyAtFeet('punchbag');
                      }
                    }
                  }
                ]
              },
              {
                id: 'entity_rival',
                name: 'AI Clone Combat Rival (Fight Club)',
                registry: 'entities' as const,
                subtext: 'Rival Intelligent • Hostile (150 PV)',
                description: 'Clone de combattant de la cage. Engage le combat immédiatement avec des arts martiaux physiques !',
                color: '#7f1d1d',
                price: 0,
                actions: [
                  {
                    label: 'Spawn Hostile Clone',
                    icon: Skull,
                    title: 'Fait apparaître un combattant hostile actif à vos pieds',
                    primary: true,
                    handler: () => {
                      if (manager) {
                        manager.adminSpawnRivalAtFeet();
                      }
                    }
                  }
                ]
              }
            ];

            // Combine lists
            const allRegistryItems = [
              ...customGmodItems,
              ...weaponItems,
              ...vehicleItems,
              ...cannabisItems,
              ...entityItems
            ];

            // Filter items based on query and registry filter type
            const filteredRegistryItems = allRegistryItems.filter(item => {
              const matchesRegistry = registryFilter === 'all' || item.registry === registryFilter;
              const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                                    item.subtext.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                    item.description.toLowerCase().includes(searchQuery.toLowerCase());
              return matchesRegistry && matchesSearch;
            });

            return (
              <div className="flex flex-col gap-6">
                
                {/* MASTER LIBRARY BROWSER GRID & FILTER CONTROLS */}
                <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 flex flex-col gap-4">
                  
                  {/* Search and Registry Categories */}
                  <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between border-b border-slate-800/80 pb-4">
                    <div>
                      <h3 className="font-bold text-xs font-mono uppercase tracking-wider text-indigo-300 flex items-center gap-1.5 mb-1">
                        <Search className="w-3.5 h-3.5 text-indigo-400" /> EXPLORATEUR DE REGISTRE ({filteredRegistryItems.length} Éléments)
                      </h3>
                      <p className="text-[10px] text-slate-400 font-mono">
                        Recherchez, équipez ou générez n'importe quel prop, arme, monture ou entité de combat.
                      </p>
                    </div>

                    {/* Search Bar */}
                    <div className="relative max-w-xs w-full">
                      <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                      <input
                        type="text"
                        placeholder="Filtrer par nom, description..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="bg-slate-950 border border-slate-800/80 text-white rounded-xl pl-9 pr-3 py-2 text-xs w-full focus:outline-none focus:border-indigo-500 transition font-mono"
                      />
                      {searchQuery && (
                        <button 
                          onClick={() => setSearchQuery('')}
                          className="absolute right-3 top-2 text-slate-400 hover:text-white font-mono text-xs"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Subcategory selectors */}
                  <div className="flex flex-wrap gap-1.5 font-mono text-[10px] bg-slate-950/40 p-1.5 rounded-xl border border-slate-800/40">
                    {[
                      { id: 'all', label: '🗂️ TOUT LE REGISTRE' },
                      { id: 'houses', label: '🏠 MAISONS VIDES' },
                      { id: 'doors', label: '🚪 PORTES INTERACTIVES' },
                      { id: 'characters', label: '👤 AVATARS & NPCS' },
                      { id: 'packs', label: '📦 ASSET PACKS' },
                      { id: 'gmod', label: '🪵 GMOD MOBILIER' },
                      { id: 'weapons', label: '⚔️ ARMES' },
                      { id: 'mounts', label: '🚀 MONTURES' },
                      { id: 'cannabis', label: '🌱 BOTANIQUE' },
                      { id: 'entities', label: '🤖 CIBLES DE COMBAT' },
                    ].map((tab) => (
                      <button
                        key={tab.id}
                        onClick={() => setRegistryFilter(tab.id as any)}
                        className={`px-3 py-1.5 rounded-lg border transition cursor-pointer font-bold ${
                          registryFilter === tab.id
                            ? 'bg-indigo-600 border-indigo-500 text-white shadow-md font-black'
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  {/* GRID LISTING OF ASSETS */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[38vh] overflow-y-auto pr-1 scrollbar-thin">
                    {filteredRegistryItems.length === 0 ? (
                      <div className="col-span-1 md:col-span-2 py-10 flex flex-col items-center justify-center text-center bg-slate-950/40 border border-slate-800/60 rounded-xl font-mono">
                        <HelpCircle className="w-8 h-8 text-slate-600 animate-bounce mb-2" />
                        <span className="text-slate-400 text-xs font-bold">AUCUN ÉLÉMENT NE CORRESPOND À VOTRE RECHERCHE</span>
                        <span className="text-slate-600 text-[10px] uppercase mt-1">Vérifiez l'orthographe ou changez de filtre de registre</span>
                      </div>
                    ) : (
                      filteredRegistryItems.map((item) => (
                        <div 
                          key={item.id + '_' + item.registry}
                          className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3 flex flex-col justify-between gap-3 hover:bg-slate-900/60 hover:border-slate-700 transition group"
                        >
                          <div className="flex items-start gap-3">
                            <div 
                              className="w-10 h-10 rounded-lg shrink-0 border border-slate-700/60 shadow-inner flex items-center justify-center font-bold text-white uppercase text-xs"
                              style={{ backgroundColor: item.color }}
                            >
                              {item.registry === 'weapons' ? '⚔️' : item.registry === 'mounts' ? '🚀' : item.registry === 'cannabis' ? '🌱' : item.registry === 'entities' ? '🤖' : '📦'}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex justify-between items-start gap-2">
                                <h4 className="text-white font-extrabold text-xs leading-tight truncate group-hover:text-indigo-300 transition">
                                  {item.name}
                                </h4>
                                {item.price > 0 && (
                                  <span className="text-[10px] font-mono text-emerald-400 font-bold bg-emerald-950/60 px-1.5 py-0.5 rounded">
                                    ${item.price}
                                  </span>
                                )}
                              </div>
                              <span className="text-[9px] font-mono font-bold text-slate-400 tracking-wider block uppercase mt-0.5">
                                {item.subtext}
                              </span>
                              <p className="text-[10px] text-slate-500 font-sans leading-relaxed mt-1 line-clamp-2 font-medium">
                                {item.description}
                              </p>
                            </div>
                          </div>

                          {/* Action buttons list */}
                          <div className="flex flex-wrap gap-1.5 justify-end mt-1 border-t border-slate-900 pt-2 font-mono">
                            {item.actions.map((act, index) => {
                              const IconC = act.icon;
                              return (
                                <button
                                  key={index}
                                  onClick={act.handler}
                                  className={`px-2.5 py-1.5 rounded-lg text-[9px] font-bold cursor-pointer transition flex items-center gap-1.5 uppercase ${
                                    act.primary
                                      ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-md'
                                      : 'bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300'
                                  }`}
                                  title={act.title}
                                >
                                  <IconC className="w-3 h-3" /> {act.label}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* CREATE COMPLETELY CUSTOM ITEM (FORGE) */}
                <form 
                  onSubmit={handleCreateCustomItem}
                  className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 flex flex-col gap-4 font-mono text-xs"
                >
                  <h3 className="font-bold text-xs uppercase tracking-wider text-indigo-300 border-b border-slate-800 pb-2 mb-1 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-400" /> Forger un Objet GMod Personnalisé de toutes pièces
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {/* Name field */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-slate-400 font-bold uppercase text-[10px]">Nom de l'Objet</label>
                      <input
                        type="text"
                        placeholder="Super Trône en Marbre"
                        value={customName}
                        onChange={(e) => setCustomName(e.target.value)}
                        className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white outline-none focus:border-indigo-500 transition"
                      />
                    </div>

                    {/* Category */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-slate-400 font-bold uppercase text-[10px]">Catégorie</label>
                      <select
                        value={customCategory}
                        onChange={(e) => setCustomCategory(e.target.value as any)}
                        className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white outline-none focus:border-indigo-500 transition"
                      >
                        <option value="furniture">🛋️ Salon / Intérieur</option>
                        <option value="decor">🪴 Décoration / Lumière</option>
                        <option value="appliances">📺 Électroménager / Tech</option>
                        <option value="outdoor">🏡 Aménagement Extérieur</option>
                      </select>
                    </div>

                    {/* Hex Color */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-slate-400 font-bold uppercase text-[10px]">Couleur (Hex ou Palette)</label>
                      <div className="flex gap-2">
                        <input
                          type="color"
                          value={customColor}
                          onChange={(e) => setCustomColor(e.target.value)}
                          className="bg-slate-950 border border-slate-800 rounded-xl h-9 w-12 cursor-pointer p-1"
                        />
                        <input
                          type="text"
                          value={customColor}
                          onChange={(e) => setCustomColor(e.target.value)}
                          placeholder="#ffffff"
                          className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white flex-1 outline-none focus:border-indigo-500 transition"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-1">
                    {/* Width */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-slate-400 font-bold uppercase text-[10px]">Largeur (mètres)</label>
                      <input
                        type="number"
                        step="0.1"
                        value={customWidth}
                        onChange={(e) => setCustomWidth(e.target.value)}
                        className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white outline-none focus:border-indigo-500 transition"
                      />
                    </div>

                    {/* Height */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-slate-400 font-bold uppercase text-[10px]">Hauteur (mètres)</label>
                      <input
                        type="number"
                        step="0.1"
                        value={customHeight}
                        onChange={(e) => setCustomHeight(e.target.value)}
                        className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white outline-none focus:border-indigo-500 transition"
                      />
                    </div>

                    {/* Depth */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-slate-400 font-bold uppercase text-[10px]">Profondeur (mètres)</label>
                      <input
                        type="number"
                        step="0.1"
                        value={customDepth}
                        onChange={(e) => setCustomDepth(e.target.value)}
                        className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white outline-none focus:border-indigo-500 transition"
                      />
                    </div>

                    {/* Price */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-slate-400 font-bold uppercase text-[10px]">Prix Sandbox ($)</label>
                      <input
                        type="number"
                        value={customPrice}
                        onChange={(e) => setCustomPrice(e.target.value)}
                        className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white outline-none focus:border-indigo-500 transition"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={!customName.trim()}
                    className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-extrabold py-3.5 rounded-xl transition cursor-pointer flex items-center justify-center gap-2 mt-2 shadow-lg"
                  >
                    <Sparkles className="w-4.5 h-4.5 text-white" />
                    <span>AJOUTER L'OBJET AU CATALOGUE SPONSORISÉ</span>
                  </button>
                </form>

              </div>
            );
          })()}

        </div>

        {/* BOTTOM Master console activity logs */}
        <div className="bg-slate-950 px-6 py-3.5 border-t border-slate-800 flex flex-col sm:flex-row gap-2 items-center justify-between shrink-0 font-mono text-[10px]">
          <div className="flex items-center gap-2 text-slate-400">
            <Activity className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
            <span>ACTIVITÉ DU FLUX :</span>
            <span className="text-slate-300 font-black truncate max-w-sm sm:max-w-md">
              {playerState.activeAgentAction || 'Standby'}
            </span>
          </div>

          <div className="flex items-center gap-3 text-[9px] font-bold text-slate-500 uppercase">
            <span>Score cognitif: <span className="text-indigo-400">{playerState.agentCognitiveScore}%</span></span>
            <span>Risque: <span className={`px-1 rounded ${playerState.riskRating === 'GREEN' ? 'text-emerald-400 bg-emerald-950/60' : 'text-amber-400 bg-amber-950/60'}`}>{playerState.riskRating}</span></span>
          </div>
        </div>

      </div>
    </div>
  );
};
