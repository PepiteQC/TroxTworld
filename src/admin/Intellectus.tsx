import React, { useState, useEffect, useRef } from "react";
import { RefreshCw, Terminal, Brain, Eye, Users, Cpu, BarChart3, Wifi, WifiOff } from "lucide-react";
// Assure-toi que ton hook useIntellectus est bien dans le bon dossier
import { useIntellectus } from "../../intellectus/useIntellectus"; 

export function Intellectus() {
  const [activeTab, setActiveTab] = useState("overview");
  
  // Simulation de sécurité (fallback si useIntellectus n'est pas encore prêt)
  const { data = { online: false, players: [], properties: [], gangs: [], lastUpdate: new Date() }, loading = false, actions = {} } = useIntellectus?.(5000) || {};
  const isConnected = data.online;

  return (
    <div className="absolute inset-0 z-[9999] flex flex-col bg-[#050810] text-slate-200 overflow-hidden font-mono">
      {/* NAV BAR */}
      <div className="flex items-center gap-4 px-4 py-3 bg-[#050810]/95 border-b border-[#1a1f3d]">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-cyan-400 flex items-center justify-center text-sm shadow-lg shadow-violet-500/30">⚡</div>
          <span className="text-base font-extrabold tracking-wide">Intellectus Admin</span>
          {isConnected ? (
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 flex items-center gap-1">
              <Wifi className="w-2.5 h-2.5" /> LIVE
            </span>
          ) : (
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400 border border-amber-500/25 flex items-center gap-1">
              <WifiOff className="w-2.5 h-2.5" /> OFFLINE
            </span>
          )}
        </div>
        
        <button onClick={() => window.location.reload()} className="ml-auto px-3 py-1.5 rounded-lg border border-red-500/30 bg-red-500/10 text-red-400 text-xs font-semibold hover:bg-red-500/20 transition-all cursor-pointer">
          Fermer Intellectus
        </button>
      </div>

      {/* CONTENT */}
      <div className="flex-1 p-8 flex items-center justify-center">
         <div className="text-center">
            <h2 className="text-3xl text-violet-400 font-black mb-4">Système Intellectus Connecté</h2>
            <p className="text-slate-400">Le tableau de bord est maintenant isolé et prêt à recevoir les données Colyseus.</p>
         </div>
      </div>
    </div>
  );
}