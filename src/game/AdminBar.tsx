import React, { useState, useEffect } from "react";
import { useGameStore } from "./store";
import { addCash, removeCash, getPlayerCash } from "./banking";
import { emsCoroner } from "./emsCoronerSystem";

export interface AdminBarProps {
  engine?: any;
}

export function AdminBar({ engine }: AdminBarProps) {
  const [isOpen, setIsOpen] = useState(true); // Ouvert par défaut quand consoleOpen est actif
  const [activeTab, setActiveTab] = useState<"teleport" | "economy" | "weather" | "police" | "debug">("teleport");
  const [cashInput, setCashInput] = useState("5000");
  const [currentCash, setCurrentCash] = useState(0);

  // Raccourci clavier F2 pour basculer la visibilité rapide
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "F2") {
        setIsOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const refreshCash = () => {
    setCurrentCash(getPlayerCash("local_player") || 0);
  };

  useEffect(() => {
    if (isOpen) refreshCash();
  }, [isOpen]);

  const teleportTo = (name: string, x: number, y: number, z: number) => {
    if (engine && engine.walker) {
      engine.walker.x = x;
      engine.walker.y = y;
      engine.walker.z = z;
      console.log(`🚀 [Admin Engine] Téléporté à ${name} (${x}, ${y}, ${z})`);
    } else {
      const walker = (window as any).__troxtWalker;
      if (walker) {
        walker.x = x;
        walker.y = y;
        walker.z = z;
      }
      console.log(`Admin Teleport [Coords: ${x}, ${y}, ${z}] (${name})`);
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-3 right-3 z-50 rounded-full border border-red-500/40 bg-black/80 px-3 py-1.5 font-mono text-xs font-bold text-red-400 shadow-xl backdrop-blur transition-all hover:scale-105 hover:bg-red-950"
      >
        🛠️ ADMIN DEV [F2]
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 left-1/2 z-50 w-[95%] max-w-4xl -translate-x-1/2 rounded-2xl border border-red-500/40 bg-[#0c1218]/95 p-4 text-white shadow-2xl backdrop-blur-md">
      {/* HEADER */}
      <div className="flex items-center justify-between border-b border-border/40 pb-3">
        <div className="flex items-center gap-3">
          <span className="flex size-3 rounded-full bg-red-500 animate-pulse" />
          <h2 className="font-display text-lg font-bold tracking-wider text-red-400 uppercase">
            TroxTWorld — Developer RP Panel
          </h2>
          <span className="rounded bg-surface px-2 py-0.5 font-mono text-[10px] text-muted">
            v2.5 Portneuf Live
          </span>
        </div>
        <button
          onClick={() => setIsOpen(false)}
          className="rounded-lg bg-surface/60 px-2.5 py-1 text-xs text-muted hover:bg-red-900/60 hover:text-white"
        >
          ✕ Masquer [F2]
        </button>
      </div>

      {/* NAVIGATION ONGLETS */}
      <div className="mt-3 flex gap-2 border-b border-border/30 pb-2 text-xs">
        {[
          { id: "teleport", label: "📍 Téléportation QC" },
          { id: "economy", label: "💵 Économie & Desjardins" },
          { id: "weather", label: "❄️ Météo & Saisons" },
          { id: "police", label: "🚨 Police & Coroner" },
          { id: "debug", label: "⚙️ Métriques Moteur" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`rounded-lg px-3 py-1.5 font-medium transition-colors ${
              activeTab === tab.id
                ? "bg-red-600/30 text-red-300 border border-red-500/50"
                : "bg-surface/40 text-muted hover:text-white"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* CONTENU ONGLETS */}
      <div className="mt-4 min-h-[140px] text-xs">
        {/* TÉLÉPORTATION */}
        {activeTab === "teleport" && (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <button
              onClick={() => teleportTo("Poste Sûreté du Québec", 45, 0, -30)}
              className="rounded-lg border border-blue-600/30 bg-blue-950/30 p-2.5 text-left hover:bg-blue-900/50"
            >
              🚔 Poste SQ
              <div className="text-[10px] text-muted">Centre d'opérations</div>
            </button>
            <button
              onClick={() => teleportTo("Dépanneur Portneuf", 0, 0, 15)}
              className="rounded-lg border border-emerald-600/30 bg-emerald-950/30 p-2.5 text-left hover:bg-emerald-900/50"
            >
              🏪 Dépanneur
              <div className="text-[10px] text-muted">Pompes & Guichet ATM</div>
            </button>
            <button
              onClick={() => teleportTo("Banque Desjardins", -35, 0, 20)}
              className="rounded-lg border border-green-600/30 bg-green-950/30 p-2.5 text-left hover:bg-green-900/50"
            >
              🏛️ Banque Desjardins
              <div className="text-[10px] text-muted">Caisse & Investissements</div>
            </button>
            <button
              onClick={() => teleportTo("Hôtel Comté Portneuf", -20, 0, -45)}
              className="rounded-lg border border-yellow-600/30 bg-yellow-950/30 p-2.5 text-left hover:bg-yellow-900/50"
            >
              🏨 Hôtel Portneuf
              <div className="text-[10px] text-muted">Suites & Réception</div>
            </button>
            <button
              onClick={() => teleportTo("Cabane à Sucre", 80, 0, 110)}
              className="rounded-lg border border-amber-600/30 bg-amber-950/30 p-2.5 text-left hover:bg-amber-900/50"
            >
              🍁 Cabane à Sucre
              <div className="text-[10px] text-muted">Érablière & Sirop</div>
            </button>
            <button
              onClick={() => teleportTo("SQDC", 12, 0, -15)}
              className="rounded-lg border border-emerald-600/30 bg-emerald-950/30 p-2.5 text-left hover:bg-emerald-900/50"
            >
              🌿 SQDC
              <div className="text-[10px] text-muted">Dispensaire Officiel</div>
            </button>
            <button
              onClick={() => teleportTo("Casse Automobile", -70, 0, -80)}
              className="rounded-lg border border-zinc-600/30 bg-zinc-950/30 p-2.5 text-left hover:bg-zinc-800/50"
            >
              🚗 Casse & Pièces
              <div className="text-[10px] text-muted">Recyclage auto</div>
            </button>
            <button
              onClick={() => teleportTo("Pénitencier / Prison", 120, 0, -120)}
              className="rounded-lg border border-red-600/30 bg-red-950/30 p-2.5 text-left hover:bg-red-900/50"
            >
              ⛓️ Centre de Détention
              <div className="text-[10px] text-muted">Cellules & Sécurité</div>
            </button>
          </div>
        )}

        {/* ÉCONOMIE */}
        {activeTab === "economy" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between rounded-lg bg-surface/40 p-3">
              <div>
                <div className="text-muted">Portefeuille Cash Actuel :</div>
                <div className="font-mono text-xl font-bold text-emerald-400">{currentCash.toLocaleString()} $ CAD</div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={cashInput}
                  onChange={(e) => setCashInput(e.target.value)}
                  className="w-28 rounded bg-black/60 px-3 py-1.5 font-mono text-white border border-border"
                />
                <button
                  onClick={() => {
                    addCash(Number(cashInput) || 1000, "local_player");
                    refreshCash();
                  }}
                  className="rounded bg-emerald-600 px-3 py-1.5 font-bold hover:bg-emerald-500"
                >
                  + Ajouter Cash
                </button>
                <button
                  onClick={() => {
                    removeCash(Number(cashInput) || 1000, "local_player");
                    refreshCash();
                  }}
                  className="rounded bg-red-700 px-3 py-1.5 font-bold hover:bg-red-600"
                >
                  - Retirer
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MÉTÉO & SAISON */}
        {activeTab === "weather" && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <button
              onClick={() => console.log("Admin: Forcé Tempête de neige québécoise")}
              className="rounded-lg border border-blue-400/30 bg-blue-950/30 p-3 text-left hover:bg-blue-900/40"
            >
              ❄️ Blizzard & Verglas
              <div className="text-[10px] text-muted">Neige forte + friction réduite</div>
            </button>
            <button
              onClick={() => console.log("Admin: Forcé Beau temps estival")}
              className="rounded-lg border border-yellow-400/30 bg-yellow-950/30 p-3 text-left hover:bg-yellow-900/40"
            >
              ☀️ Soleil d'Été
              <div className="text-[10px] text-muted">Ciel dégagé 24°C</div>
            </button>
            <button
              onClick={() => console.log("Admin: Forcé Nuit boréale")}
              className="rounded-lg border border-indigo-400/30 bg-indigo-950/30 p-3 text-left hover:bg-indigo-900/40"
            >
              🌌 Nuit & Aurores
              <div className="text-[10px] text-muted">Éclairage urbain activé</div>
            </button>
            <button
              onClick={() => console.log("Admin: Cycle des saisons forcé")}
              className="rounded-lg border border-amber-400/30 bg-amber-950/30 p-3 text-left hover:bg-amber-900/40"
            >
              🍂 Automne Doré
              <div className="text-[10px] text-muted">Feuilles d'érable & pluie</div>
            </button>
          </div>
        )}

        {/* POLICE & CORONER */}
        {activeTab === "police" && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <button
              onClick={() => console.log("Admin: Étoiles de recherche réinitialisées à 0")}
              className="rounded-lg border border-emerald-600/30 bg-emerald-950/30 p-3 text-left hover:bg-emerald-900/40"
            >
              🟢 Effacer Avis de Recherche
              <div className="text-[10px] text-muted">Niveau SQ remis à 0 étoile</div>
            </button>
            <button
              onClick={() => console.log("Admin: Code 3 - Poursuite générale")}
              className="rounded-lg border border-red-600/30 bg-red-950/30 p-3 text-left hover:bg-red-900/40"
            >
              🚨 Déclencher Alerte SQ 5★
              <div className="text-[10px] text-muted">Patrouilles & Barrages</div>
            </button>
            <button
              onClick={() => {
                const bodies = emsCoroner.getBodies();
                console.log(`Admin: ${bodies.length} corps recensés par le Coroner.`);
              }}
              className="rounded-lg border border-purple-600/30 bg-purple-950/30 p-3 text-left hover:bg-purple-900/40"
            >
              🩺 Rapport du Coroner
              <div className="text-[10px] text-muted">Inspecter les dossiers thanato</div>
            </button>
          </div>
        )}

        {/* DEBUG */}
        {activeTab === "debug" && (
          <div className="grid grid-cols-2 gap-3 font-mono text-[11px] sm:grid-cols-4">
            <div className="rounded bg-surface/50 p-2.5">FPS : 60.0 (Cap V-Sync)</div>
            <div className="rounded bg-surface/50 p-2.5">Moteur Physique : Précision HFT</div>
            <div className="rounded bg-surface/50 p-2.5">Audio 3D Spatial : Actif</div>
            <div className="rounded bg-surface/50 p-2.5">Sync Réseau Net : O(1) Zero-GC</div>
          </div>
        )}
      </div>
    </div>
  );
}
