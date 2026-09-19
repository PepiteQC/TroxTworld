import React, { useState, useRef, useEffect } from 'react';
import { Terminal, Send, Trash2, HelpCircle, CheckCircle2, AlertTriangle, ShieldAlert, Sparkles, UserX, Ban, Gift, Zap, CornerDownLeft, Search } from 'lucide-react';
import { getAllAdminCommands, parseAndExecuteAdminCommand, subscribeAuditLogs, AdminCommandResult } from './AdminCommandSystem';

interface ConsoleLogEntry {
  id: string;
  timestamp: string;
  command: string;
  result: AdminCommandResult;
  executor: string;
}

interface AdminConsoleProps {
  manager?: any;
  onAdminCommand?: (cmd: string, args: string[]) => void;
  executorName?: string;
  executorRole?: "moderator" | "admin" | "superadmin";
}

export const AdminConsole: React.FC<AdminConsoleProps> = ({
  manager,
  onAdminCommand,
  executorName = "Admin",
  executorRole = "superadmin",
}) => {
  const [input, setInput] = useState('');
  const [logs, setLogs] = useState<ConsoleLogEntry[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [logSearchQuery, setLogSearchQuery] = useState('');

  const logEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsubscribe = subscribeAuditLogs((auditLogs) => {
      const consoleLogs: ConsoleLogEntry[] = auditLogs.map((a) => ({
        id: a.id,
        timestamp: a.timestamp,
        command: a.command,
        result: {
          success: a.success,
          message: a.message,
        },
        executor: a.executor,
      }));
      setLogs(consoleLogs.reverse());
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const [pendingConfirmationCmd, setPendingConfirmationCmd] = useState<string | null>(null);

  const isSensitiveCommand = (cmdText: string): boolean => {
    const trimmed = cmdText.trim().toLowerCase();
    const clean = trimmed.startsWith('/') || trimmed.startsWith('!') ? trimmed.substring(1) : trimmed;
    const parts = clean.split(/\s+/);
    const name = parts[0];

    const SENSITIVE_NAMES = [
      'ban', 'kick', 'clearprops', 'clear', 'wipe', 'reset', 'killall',
      'unban', 'lockout', 'poweroutage', 'mod:ban', 'mod:kick'
    ];

    return SENSITIVE_NAMES.includes(name);
  };

  const executeCommandDirectly = (cmdText: string) => {
    const trimmed = cmdText.trim();
    if (!trimmed) return;

    let fullCmd = trimmed;
    if (!fullCmd.startsWith('/') && !fullCmd.startsWith('!')) {
      fullCmd = '/' + fullCmd;
    }

    const parts = fullCmd.substring(1).trim().split(/\s+/);
    const cmdName = parts[0];
    const args = parts.slice(1);

    // Run via GameManager or AdminCommandSystem
    let result: AdminCommandResult;

    if (manager) {
      result = manager.executeConsoleCommand(fullCmd);
    } else {
      result = parseAndExecuteAdminCommand(fullCmd, {
        executorName,
        executorRole,
        addLog: (msg) => {
          console.log('[AdminLog]', msg);
        },
      });
    }

    // Call external handler if supplied
    if (onAdminCommand) {
      onAdminCommand(cmdName, args);
    }

    const newLog: ConsoleLogEntry = {
      id: `log-${Date.now()}-${Math.random()}`,
      timestamp: new Date().toLocaleTimeString(),
      command: fullCmd,
      result,
      executor: executorName,
    };

    setLogs((prev) => [...prev, newLog]);
  };

  const executeCommand = (cmdText: string) => {
    if (isSensitiveCommand(cmdText)) {
      setPendingConfirmationCmd(cmdText);
      return;
    }
    executeCommandDirectly(cmdText);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    executeCommand(input);
    setInput('');
  };

  const clearLogs = () => {
    setLogs([]);
  };

  const allCmds = getAllAdminCommands();
  const categories = ['all', 'moderation', 'player', 'gmod', 'teleport', 'economy', 'world', 'system'];

  const filteredCmds = selectedCategory === 'all'
    ? allCmds
    : allCmds.filter((c) => c.category === selectedCategory);

  return (
    <div className="flex flex-col h-full bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden font-mono shadow-2xl">
      
      {/* CONSOLE HEADER BAR */}
      <div className="bg-slate-900/90 px-4 py-3 border-b border-slate-800 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-cyan-950/80 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
            <Terminal className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-black text-cyan-300 uppercase tracking-wider flex items-center gap-2">
              Console d'Administration In-Game
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
            </h3>
            <p className="text-[10px] text-slate-400">Exécuteur: {executorName} ({executorRole})</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => executeCommand('/help')}
            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-bold border border-slate-700 transition flex items-center gap-1 cursor-pointer"
          >
            <HelpCircle className="w-3 h-3 text-cyan-400" /> Aide
          </button>
          <button
            onClick={clearLogs}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-950/80 text-slate-400 hover:text-rose-300 border border-slate-700 hover:border-rose-800 transition cursor-pointer"
            title="Effacer le journal de la console"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* QUICK PRESET TOOLBAR */}
      <div className="bg-slate-900/40 px-3 py-2 border-b border-slate-800/80 flex flex-wrap items-center gap-2 text-[10px]">
        <span className="text-slate-500 font-bold uppercase text-[9px]">Raccourcis Rapides :</span>
        
        <button
          onClick={() => setInput('/kick ')}
          className="px-2 py-1 bg-amber-950/60 hover:bg-amber-900 text-amber-300 border border-amber-800/60 rounded-lg font-bold transition flex items-center gap-1 cursor-pointer"
        >
          <UserX className="w-3 h-3 text-amber-400" /> /kick [id]
        </button>

        <button
          onClick={() => setInput('/ban ')}
          className="px-2 py-1 bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-800/60 rounded-lg font-bold transition flex items-center gap-1 cursor-pointer"
        >
          <Ban className="w-3 h-3 text-rose-400" /> /ban [id]
        </button>

        <button
          onClick={() => setInput('/giveitem ')}
          className="px-2 py-1 bg-purple-950/60 hover:bg-purple-900 text-purple-300 border border-purple-800/60 rounded-lg font-bold transition flex items-center gap-1 cursor-pointer"
        >
          <Gift className="w-3 h-3 text-purple-400" /> /giveitem [item]
        </button>

        <button
          onClick={() => executeCommand('/god')}
          className="px-2 py-1 bg-emerald-950/60 hover:bg-emerald-900 text-emerald-300 border border-emerald-800/60 rounded-lg font-bold transition flex items-center gap-1 cursor-pointer"
        >
          <Zap className="w-3 h-3 text-emerald-400" /> /god (Toggle)
        </button>

        <button
          onClick={() => executeCommand('/heal')}
          className="px-2 py-1 bg-blue-950/60 hover:bg-blue-900 text-blue-300 border border-blue-800/60 rounded-lg font-bold transition flex items-center gap-1 cursor-pointer"
        >
          ❤️ /heal
        </button>

        <button
          onClick={() => executeCommand('/clearprops')}
          className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-lg font-bold transition flex items-center gap-1 cursor-pointer"
        >
          🧹 /clearprops
        </button>
      </div>

      {/* LOG FILTER SEARCH BAR */}
      <div className="bg-slate-900/60 px-3 py-1.5 border-b border-slate-800/80 flex items-center gap-2">
        <Search className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
        <input
          type="text"
          value={logSearchQuery}
          onChange={(e) => setLogSearchQuery(e.target.value)}
          placeholder="Filtrer les logs par exécuteur, nom admin, identifiant ou commande..."
          className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-[11px] text-cyan-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500 font-mono"
        />
        {logSearchQuery && (
          <button
            onClick={() => setLogSearchQuery('')}
            className="text-xs font-bold text-slate-500 hover:text-slate-300 px-1 cursor-pointer"
          >
            ✕
          </button>
        )}
      </div>

      {/* TERMINAL LOG OUTPUT AREA */}
      <div className="flex-1 p-4 overflow-y-auto space-y-3 font-mono text-xs text-slate-200 select-text">
        {(() => {
          const filteredLogs = logs.filter((log) => {
            if (!logSearchQuery.trim()) return true;
            const q = logSearchQuery.toLowerCase().trim();
            return (
              log.executor.toLowerCase().includes(q) ||
              log.command.toLowerCase().includes(q) ||
              log.result.message.toLowerCase().includes(q)
            );
          });

          if (filteredLogs.length === 0) {
            return (
              <div className="text-center py-12 text-slate-600 italic text-xs">
                {logs.length === 0
                  ? "Le journal de la console est vide. Entrez une commande ci-dessous."
                  : "Aucune entrée de journal ne correspond à votre filtre de recherche."}
              </div>
            );
          }

          return filteredLogs.map((log) => (
            <div key={log.id} className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/80 space-y-1">
              <div className="flex items-center justify-between text-[10px] text-slate-500">
                <span className="text-cyan-400 font-bold">[{log.timestamp}] {log.executor}:</span>
                <span className="font-mono bg-slate-950 px-1.5 py-0.5 rounded text-slate-300 border border-slate-800">
                  {log.command}
                </span>
              </div>
              <div className={`text-xs whitespace-pre-wrap leading-relaxed flex items-start gap-2 ${
                log.result.success ? 'text-emerald-300' : 'text-rose-400'
              }`}>
                {log.result.success ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
                )}
                <div className="flex-1">{log.result.message}</div>
              </div>
            </div>
          ));
        })()}
        <div ref={logEndRef} />
      </div>

      {/* COMMAND SUGGESTION CATEGORY SELECTOR */}
      <div className="bg-slate-900/80 px-3 py-1.5 border-t border-slate-800 flex items-center gap-1.5 overflow-x-auto text-[9.5px]">
        <span className="text-slate-500 uppercase font-bold shrink-0">Catégories:</span>
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-2 py-0.5 rounded-md font-bold uppercase transition shrink-0 cursor-pointer ${
              selectedCategory === cat
                ? 'bg-cyan-600 text-white'
                : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* COMMAND QUICK SUGGESTION CHIPS */}
      <div className="bg-slate-950 px-3 py-2 border-t border-slate-900 flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
        {filteredCmds.slice(0, 15).map((cmd) => (
          <button
            key={cmd.id}
            onClick={() => setInput(`/${cmd.name} `)}
            className="px-2 py-0.5 rounded bg-slate-900 hover:bg-slate-800 border border-slate-800 text-cyan-300 hover:text-cyan-200 text-[10px] font-mono transition flex items-center gap-1 cursor-pointer"
            title={`${cmd.description} (${cmd.usage})`}
          >
            <span>/{cmd.name}</span>
          </button>
        ))}
      </div>

      {/* INPUT INTERACTIVE FORM */}
      <form onSubmit={handleFormSubmit} className="bg-slate-900 p-3 border-t border-slate-800 flex gap-2">
        <div className="relative flex-1">
          <span className="absolute left-3 top-2.5 text-cyan-400 font-black text-xs">&gt;</span>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Entrez une commande (ex: /kick player1, /ban player2 7d, /giveitem house_modern_empty)..."
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-7 pr-3 py-2 text-xs text-cyan-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500 transition font-mono"
            autoFocus
          />
        </div>
        <button
          type="submit"
          className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-black text-xs rounded-xl cursor-pointer transition flex items-center gap-1.5 shadow-lg shadow-cyan-950"
        >
          <span>Lancer</span>
          <CornerDownLeft className="w-3.5 h-3.5" />
        </button>
      </form>

      {/* SENSITIVE COMMAND CONFIRMATION MODAL */}
      {pendingConfirmationCmd && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border-2 border-rose-500/60 rounded-2xl p-5 max-w-md w-full shadow-2xl space-y-4 text-left font-mono">
            <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
              <div className="w-9 h-9 rounded-xl bg-rose-950 border border-rose-500/50 flex items-center justify-center text-rose-400 shrink-0">
                <AlertTriangle className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <h3 className="text-sm font-black text-rose-300 uppercase tracking-wide">
                  Êtes-vous sûr ?
                </h3>
                <p className="text-[10px] text-slate-400">Confirmation d'action d'administration sensible</p>
              </div>
            </div>

            <div className="space-y-2 text-xs text-slate-200">
              <p className="font-sans font-medium text-slate-300">
                Voulez-vous vraiment exécuter la commande suivante ?
              </p>
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 text-cyan-300 font-mono font-bold break-words">
                {pendingConfirmationCmd}
              </div>
              <p className="text-[10.5px] text-rose-400/90 italic font-sans">
                ⚠️ Cette action aura un impact direct sur le joueur ou l'état du serveur.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setPendingConfirmationCmd(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl transition cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={() => {
                  const cmdToRun = pendingConfirmationCmd;
                  setPendingConfirmationCmd(null);
                  executeCommandDirectly(cmdToRun);
                }}
                className="px-4 py-2 bg-gradient-to-r from-rose-600 to-amber-600 hover:brightness-110 text-white font-black text-xs rounded-xl shadow-lg shadow-rose-950/50 transition cursor-pointer flex items-center gap-1.5"
              >
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>Confirmer et exécuter</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
