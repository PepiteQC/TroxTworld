import { parseAdmin } from './admin';
// ═══════════════════════════════════════════════════════════════════════════
//  ETHERWORLD QC — SYSTÈME DE COMMUNICATION & CHAT RP
//  src/game/chat.tsx
//  Interface de chat style FiveM avec colorimétrie RP, Auto-scroll et OOC
// ═══════════════════════════════════════════════════════════════════════════

import React, { useEffect, useRef, useState } from "react";
import { MessageSquare, Users, X, Radio, Mic } from "lucide-react";
import { useP2PRoom } from "@/lib/multiplayer";
import { parseChatInput, rpNet } from "./net";
import { useGameStore } from "./store";

// Structure d'un message de chat
interface ChatMessage {
  id: string;
  sender: string;
  text: string;
  type: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// PONT RÉSEAU : GESTION DE LA CONNEXION P2P
// ─────────────────────────────────────────────────────────────────────────────
export function RpNetBridge() {
  const name = useGameStore((s) => s.appearance.name) || "Citoyen Inconnu";
  const p2p = useP2PRoom({ room: "portneuf", name });
  const greeted = useRef(false);

  useEffect(() => {
    rpNet.bind(p2p.selfId, { broadcast: p2p.broadcast, send: p2p.send, broadcastTo: p2p.broadcastTo });
    const off = p2p.onMessage((from, data, ch) => rpNet.ingest(from, data, ch));
    return () => {
      off();
      rpNet.unbind();
    };
  }, [p2p.selfId, p2p.broadcast, p2p.broadcastTo, p2p.send, p2p.onMessage]);

  useEffect(() => {
    rpNet.onPeers(p2p.peers.map((p) => p.id));
  }, [p2p.peers]);

  useEffect(() => {
    if (!p2p.joined || greeted.current) return;
    greeted.current = true;
    useGameStore.getState().addChat("SYSTÈME", "Fréquence locale établie. Appuyez sur [T] pour parler.", "system");
  }, [p2p.joined]);

  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// RENDERER : COLORIMÉTRIE DES MESSAGES RP
// ─────────────────────────────────────────────────────────────────────────────
function getMessageStyle(type: string, text: string) {
  if (type === "admin") return "text-emerald-400 font-bold";
  if (type === "system") return "text-blue-400/90 font-semibold italic";
  
  const t = text.toLowerCase();
  // Analyse des commandes RP typiques dans le texte
  if (t.startsWith("**") || t.includes("*") || t.includes("/me")) return "text-fuchsia-400 italic"; // Actions RP (/me)
  if (t.startsWith(">") || t.includes("/do")) return "text-amber-400"; // Environnement (/do)
  if (t.startsWith("(( ") || t.startsWith("[ooc]") || t.includes("/b")) return "text-slate-400"; // Hors RP (OOC)
  if (t.startsWith("[crie]")) return "text-red-400 font-bold uppercase"; // Cris
  if (t.startsWith("[chuchote]")) return "text-gray-400 italic text-[11px]"; // Chuchotement
  
  return "text-white"; // Chat In-Character (IC) par défaut
}

// ─────────────────────────────────────────────────────────────────────────────
// INTERFACE UTILISATEUR DU CHAT (HUD)
// ─────────────────────────────────────────────────────────────────────────────
export function ChatOverlay() {
  const chat = useGameStore((s) => s.chat);
  const peers = useGameStore((s) => s.netPeers);
  const [draft, setDraft] = useState("");
  
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Focus automatique sur l'input à l'ouverture
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Auto-scroll vers le bas quand un nouveau message arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chat]);

  const send = () => {
    const store = useGameStore.getState();
    const text = draft.trim();

    if (store.muted) {
      store.addChat("SYSTÈME", "Vous êtes muet. Impossible d'émettre sur la fréquence.", "system");
      setDraft("");
      return;
    }

    if (!text) {
      store.closeChat();
      return;
    }

    // ── GESTION DES COMMANDES ADMIN (/) ──
    if (text.startsWith("/")) {
      setDraft("");
      store.closeChat();

      const engine = (typeof window !== "undefined" ? (window as any).__portneuf : null);
      if (engine && engine.adminCtx) {
        const res = parseAdmin(text, engine.adminCtx);
        store.addChat("👑 ADMIN", res.message, "system");
      } else {
        store.addChat("👑 ADMIN", "Moteur de jeu non connecté pour exécuter la commande.", "system");
      }
      return;
    }

    const parsed = parseChatInput(draft);
    if (!parsed) {
      store.closeChat();
      return;
    }

    let targetId: string | undefined;
    
    // Logique de chuchotement (Whisper)
    if (parsed.kind === "whisper" && parsed.target) {
      const hit = [...rpNet.remotes.values()].find(
        (p) => p.username.toLowerCase() === parsed.target!.toLowerCase(),
      );
      targetId = hit?.id;
      if (!targetId) {
        store.addChat("ERREUR", `Impossible de trouver le citoyen "${parsed.target}" à proximité.`, "system");
        setDraft("");
        return;
      }
    }
    
    rpNet.publishChat(parsed.kind, parsed.text, targetId);
    setDraft("");
    store.closeChat(); // Ferme le chat après l'envoi pour reprendre le gameplay
  };

  // Changement d'icône dynamique selon ce qu'on tape
  const isCommand = draft.startsWith("/");
  const isOOC = draft.startsWith("/b");

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-40 flex justify-start px-6 pb-6 animate-fade-in">
      <div className="pointer-events-auto flex w-full max-w-[32rem] flex-col gap-2 rounded-xl p-4 bg-[#0a0f14]/85 backdrop-blur-md border border-slate-800/60 shadow-2xl drop-shadow-2xl">
        
        {/* EN-TÊTE DU CHAT */}
        <div className="flex items-center justify-between gap-2 border-b border-slate-700/50 pb-2">
          <p className="flex items-center gap-2 text-[11px] tracking-[0.2em] text-slate-400 uppercase font-bold">
            <Radio className="size-3.5 text-emerald-500 animate-pulse" />
            Portneuf RP — Proximité
            <span className="ml-1 inline-flex items-center gap-1.5 rounded-full bg-slate-800/80 px-2 py-0.5 text-emerald-400 shadow-inner">
              <Users className="size-3" />
              {peers + 1}
            </span>
          </p>
          <button
            type="button"
            className="flex size-6 items-center justify-center rounded bg-slate-800/50 text-slate-400 hover:bg-red-500/20 hover:text-red-400 transition-colors"
            onClick={() => useGameStore.getState().closeChat()}
            aria-label="Fermer le chat"
          >
            <X className="size-3.5" />
          </button>
        </div>

        {/* ZONE DES MESSAGES */}
        <div 
          ref={scrollRef}
          className="flex max-h-52 min-h-[6rem] flex-col gap-1.5 overflow-y-auto pr-2 custom-scrollbar"
        >
          {chat.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center opacity-40 py-4 gap-2">
              <Mic className="size-6 text-slate-500" />
              <p className="text-xs text-slate-400 text-center font-mono">
                /me [action] · /do [scène] · /s [crier]<br/>
                /w [nom] [msg] · /b [hors-rp]
              </p>
            </div>
          ) : (
            chat.slice(-25).map((m: ChatMessage) => {
              const msgStyle = getMessageStyle(m.type, m.text);
              const isSystem = m.type === "system" || m.type === "admin";
              
              return (
                <p 
                  key={m.id} 
                  className={`text-[13px] leading-relaxed drop-shadow-md ${msgStyle}`}
                  style={{ textShadow: "1px 1px 2px rgba(0,0,0,0.8)" }} // Ombre forte pour lisibilité in-game
                >
                  <span className={`font-bold mr-1.5 ${isSystem ? 'opacity-100' : 'text-slate-300'}`}>
                    {isSystem ? `[${m.sender}]` : `${m.sender} :`}
                  </span>
                  <span>{m.text}</span>
                </p>
              );
            })
          )}
        </div>

        {/* INPUT DE SAISIE */}
        <form
          className="mt-1 relative"
          onSubmit={(e) => {
            e.preventDefault();
            send();
          }}
        >
          <div className="relative flex items-center">
            <span className={`absolute left-3 size-2 rounded-full ${isOOC ? 'bg-slate-400' : isCommand ? 'bg-fuchsia-500' : 'bg-emerald-500'} shadow-[0_0_8px_currentColor]`} />
            <input
              ref={inputRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  e.preventDefault();
                  useGameStore.getState().closeChat();
                }
              }}
              placeholder={isOOC ? "Message Hors-RP (OOC)..." : isCommand ? "Commande RP..." : "Parler aux citoyens proches..."}
              className="h-10 w-full rounded-lg border border-slate-700/60 bg-[#0d141c] pl-8 pr-3 font-medium text-sm text-white outline-none placeholder:text-slate-500 focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 transition-all"
              maxLength={256}
              autoComplete="off"
              spellCheck="false"
            />
          </div>
        </form>
      </div>

      {/* Styles Scrollbar */}
      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #334155; border-radius: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #475569; }
      `}} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// UTILITAIRES EXPORTÉS (Pour les autres scripts comme survival.ts)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Envoie un message de chat visible à proximité
 */
export function sendChatMessage(text: string, sender: string = "SYSTÈME", type: "system" | "admin" | "default" = "system") {
  // Affiche le message localement dans l'UI du joueur
  useGameStore.getState().addChat(sender, text, type);
  
  // Diffuse le message aux autres joueurs à proximité (cast sécurisé en "any" pour matcher le type ChatKind attendu)
  rpNet.publishChat("say" as any, text);
}

/**
 * Envoie un message privé à un joueur cible
 */
export function sendPrivateMessage(targetPlayer: string, text: string) {
  // Affiche localement pour le joueur émetteur
  useGameStore.getState().addChat("SYSTÈME", `[MP à ${targetPlayer}] : ${text}`, "system");
  
  // Diffuse via le réseau aux autres joueurs
  rpNet.publishChat("whisper" as any, text, targetPlayer);
}
