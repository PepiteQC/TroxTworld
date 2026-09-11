import { useEffect, useRef, useState } from "react";
import { Terminal, X } from "lucide-react";
import { ADMIN_CHIPS } from "./admin";
import type { PortneufEngine } from "./engine";
import { persist, useGameStore } from "./store";

export function AdminBar({ engine }: { engine: PortneufEngine | null }) {
  const [line, setLine] = useState("");
  const [log, setLog] = useState<string[]>(["F1 ou ` · /help"]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const run = (raw = line.trim()) => {
    if (!engine || !raw) return;
    const res = engine.runAdmin(raw);
    setLog((prev) => [`${res.ok ? "ok" : "err"}  ${res.message}`, ...prev].slice(0, 10));
    setLine("");
    persist();
  };

  return (
    <div className="absolute inset-x-0 bottom-0 z-40 flex justify-center p-3">
      <div className="hud-panel w-full max-w-lg rounded-lg p-3">
        <div className="mb-2 flex items-center justify-between">
          <p className="flex items-center gap-1.5 text-[10px] tracking-[0.2em] text-subtle uppercase">
            <Terminal className="size-3.5" />
            Commandes
          </p>
          <button
            type="button"
            className="flex size-9 items-center justify-center rounded-md text-muted"
            onClick={() => useGameStore.getState().closeConsole()}
            aria-label="Fermer la console"
          >
            <X className="size-4" />
          </button>
        </div>
        <div className="mb-2 flex flex-wrap gap-1">
          {ADMIN_CHIPS.map((c) => (
            <button
              key={c}
              type="button"
              className="rounded-md border border-border bg-surface-2 px-2 py-1 font-mono text-[10px] text-muted hover:text-fg"
              onClick={() => run(c)}
            >
              {c}
            </button>
          ))}
        </div>
        <div className="mb-2 max-h-28 overflow-auto font-mono text-[11px] leading-relaxed text-muted">
          {log.map((l, i) => (
            <p key={`${l}-${i}`} className="whitespace-pre-wrap">
              {l}
            </p>
          ))}
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            run();
          }}
        >
          <input
            ref={inputRef}
            value={line}
            onChange={(e) => setLine(e.target.value)}
            placeholder="/tp hotel  ·  /floor chambre  ·  /car sq"
            className="h-11 w-full rounded-md border border-border bg-bg px-3 font-mono text-sm text-fg outline-none placeholder:text-subtle"
          />
        </form>
      </div>
    </div>
  );
}
