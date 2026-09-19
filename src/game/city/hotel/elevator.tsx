import { Building2, Diamond, DoorOpen, Hotel, X } from "lucide-react";
import { useGameStore } from "../../store";

const FLOORS = [
  { id: "lobby", label: "Grand Lobby", hint: "Réception · cloche · lustres", icon: Hotel },
  { id: "corridor", label: "Couloir", hint: "Chambres 210–216 · 301", icon: Building2 },
  { id: "hotel", label: "Chambre 214", hint: "Best Life · king", icon: DoorOpen },
  { id: "apartment", label: "Penthouse 301", hint: "4½ · vue", icon: Diamond },
] as const;

export function ElevatorOverlay({ onFloor }: { onFloor: (id: "lobby" | "hotel" | "apartment" | "corridor") => void }) {
  const kind = useGameStore((s) => s.interiorKind);
  return (
    <div className="absolute inset-0 z-40 flex items-end justify-center bg-bg/70 px-3 py-4 backdrop-blur-sm sm:items-center">
      <div className="w-full max-w-sm rounded-xl border border-border-strong bg-surface p-4 shadow-hud">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] tracking-[0.2em] text-subtle uppercase">Ascenseur</p>
            <h2 className="font-display text-2xl italic">Hôtel Pont-Rouge</h2>
          </div>
          <button
            type="button"
            className="flex size-10 items-center justify-center rounded-md text-muted hover:text-fg"
            onClick={() => useGameStore.getState().closeElevator()}
            aria-label="Fermer"
          >
            <X className="size-5" />
          </button>
        </div>
        <div className="mt-4 space-y-2">
          {FLOORS.map((f) => {
            const Icon = f.icon;
            const here = kind === f.id;
            return (
              <button
                key={f.id}
                type="button"
                className={`flex w-full items-center justify-between rounded-md border px-3 py-2.5 text-left ${here ? "border-accent bg-accent/10" : "border-border bg-surface-2"}`}
                onClick={() => onFloor(f.id)}
              >
                <span className="flex items-center gap-2">
                  <Icon className="size-4 text-accent" />
                  <span>
                    <span className="block text-sm text-fg">{f.label}</span>
                    <span className="text-[11px] text-subtle">{f.hint}</span>
                  </span>
                </span>
                <span className="text-[10px] tracking-widest text-subtle uppercase">{here ? "Ici" : "→"}</span>
              </button>
            );
          })}
        </div>
        <p className="mt-3 flex items-center gap-1.5 text-[10px] text-subtle">
          <Building2 className="size-3" />
          NIP 1234 à l'entrée
        </p>
      </div>
    </div>
  );
}