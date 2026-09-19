import { Hammer, X } from "lucide-react";
import { PROP_CATALOG } from "../builder";
import type { PortneufEngine } from "../engine";
import { persist, useGameStore } from "../store";

export function BuilderOverlay({ engine }: { engine: PortneufEngine | null }) {
  const type = useGameStore((s) => s.buildType);
  const yaw = useGameStore((s) => s.buildYaw);
  const scale = useGameStore((s) => s.buildScale);
  const placed = useGameStore((s) => s.placed);
  const store = useGameStore;

  return (
    <div className="pointer-events-none absolute inset-y-0 left-0 z-30 flex w-72 items-stretch p-3">
      <div className="hud-panel pointer-events-auto flex w-full flex-col rounded-lg">
        <div className="flex items-start justify-between gap-2 border-b border-border px-3 py-2.5">
          <div>
            <p className="flex items-center gap-1.5 text-[10px] tracking-[0.2em] text-subtle uppercase">
              <Hammer className="size-3.5" />
              Builder
            </p>
            <p className="text-[11px] text-muted">{placed.length}/80 · E placer · Q tourner</p>
          </div>
          <button
            type="button"
            className="flex size-9 items-center justify-center rounded-md text-muted"
            onClick={() => store.getState().toggleBuild()}
            aria-label="Fermer le builder"
          >
            <X className="size-4" />
          </button>
        </div>
        <div className="flex flex-wrap gap-1 border-b border-border px-3 py-2">
          <button type="button" className="h-8 rounded-md border border-border bg-surface px-2 text-[10px] text-muted" onClick={() => store.getState().rotateGhost()}>
            Rotation {Math.round((yaw * 180) / Math.PI)}°
          </button>
          <button type="button" className="h-8 rounded-md border border-border bg-surface px-2 text-[10px] text-muted" onClick={() => store.getState().scaleGhost(1)}>
            +
          </button>
          <button type="button" className="h-8 rounded-md border border-border bg-surface px-2 text-[10px] text-muted" onClick={() => store.getState().scaleGhost(-1)}>
            −
          </button>
          <span className="self-center text-[10px] text-subtle">×{scale.toFixed(2)}</span>
          {[0.25, 0.5, 1].map((n) => (
            <button
              key={n}
              type="button"
              className="h-8 rounded-md border border-border bg-surface px-2 text-[10px] text-muted"
              onClick={() => engine?.setBuildSnap(n)}
            >
              {n.toFixed(2)} m
            </button>
          ))}
          <button
            type="button"
            className="h-8 rounded-md border border-border bg-surface px-2 text-[10px] text-danger"
            onClick={() => engine?.removeNearestProp()}
          >
            Suppr.
          </button>
          <button
            type="button"
            className="h-8 rounded-md border border-border bg-surface px-2 text-[10px] text-danger"
            onClick={() => {
              engine?.clearProps();
              persist();
            }}
          >
            Tout
          </button>
        </div>
        <div className="min-h-0 flex-1 space-y-3 overflow-auto px-3 py-2">
          {PROP_CATALOG.map((cat) => (
            <div key={cat.cat}>
              <p className="mb-1 text-[10px] tracking-[0.2em] text-subtle uppercase">{cat.cat}</p>
              <div className="grid grid-cols-2 gap-1">
                {cat.items.map((item) => {
                  const on = type === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => store.getState().selectProp(on ? null : item.id)}
                      className={`rounded-md border px-2 py-1.5 text-left text-[11px] ${
                        on ? "border-border-strong bg-surface-2 text-fg" : "border-border bg-surface text-muted"
                      }`}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
