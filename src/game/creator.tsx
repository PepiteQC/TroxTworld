import { User, X } from "lucide-react";
import type { PortneufEngine } from "./engine";
import {
  AURAS,
  HAIR_STYLES,
  HAIR_TONES,
  MODELS,
  OUTFITS,
  SKIN_TONES,
  type Appearance,
} from "./character";
import { FACE_STYLES } from "./hero";
import { persist, useGameStore } from "./store";

function hexCss(n: number) {
  return `#${n.toString(16).padStart(6, "0")}`;
}

export function CreatorOverlay({ engine }: { engine: PortneufEngine | null }) {
  const look = useGameStore((s) => s.appearance);

  const patch = (p: Partial<Appearance>) => {
    useGameStore.getState().setAppearance(p);
    engine?.applyAppearance(useGameStore.getState().appearance);
  };

  return (
    <div className="pointer-events-none absolute inset-0 z-40 flex flex-col items-stretch justify-end sm:flex-row sm:justify-start">
      <div className="pointer-events-auto flex max-h-[62%] w-full flex-col rounded-t-xl border-t border-border bg-bg/90 backdrop-blur-md sm:mt-0 sm:h-full sm:max-h-none sm:max-w-md sm:rounded-none sm:border-t-0 sm:border-r">
        <div className="flex items-start justify-between px-4 pt-4 pb-3">
          <div>
            <p className="text-[10px] tracking-[0.25em] text-subtle uppercase">Identité</p>
            <h2 className="font-display text-3xl italic">Personnage</h2>
          </div>
          <button
            type="button"
            className="flex size-10 items-center justify-center rounded-md text-muted hover:text-fg"
            onClick={() => useGameStore.getState().closeCreator()}
            aria-label="Fermer le créateur"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-4 pb-6">
          <label className="block">
            <span className="text-[10px] tracking-[0.2em] text-subtle uppercase">Nom</span>
            <input
              value={look.name}
              maxLength={24}
              onChange={(e) => patch({ name: e.target.value })}
              className="mt-1.5 h-11 w-full rounded-lg border border-border bg-surface px-3 text-sm text-fg outline-none focus:border-border-strong"
              placeholder="Votre nom"
            />
          </label>

          <div>
            <p className="text-[10px] tracking-[0.2em] text-subtle uppercase">Modèle</p>
            <div className="mt-2 grid grid-cols-2 gap-1.5">
              {MODELS.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => patch({ model: m.id })}
                  className={`flex h-16 flex-col items-start justify-center rounded-lg border px-3 text-left ${
                    look.model === m.id ? "border-border-strong bg-surface-2" : "border-border bg-surface"
                  }`}
                >
                  <span className="text-sm text-fg">{m.label}</span>
                  <span className="text-[10px] text-subtle">{m.hint}</span>
                </button>
              ))}
            </div>
          </div>

          {look.model === "troxt" && (
            <div>
              <p className="text-[10px] tracking-[0.2em] text-subtle uppercase">Visage</p>
              <div className="mt-2 grid grid-cols-2 gap-1.5">
                {FACE_STYLES.map((f) => (
                  <Choice
                    key={f.id}
                    active={look.face === f.id}
                    label={f.label}
                    onClick={() => patch({ face: f.id })}
                  />
                ))}
              </div>
            </div>
          )}

          <SwatchRow
            label="Peau"
            colors={SKIN_TONES}
            selected={look.skin}
            onPick={(i) => patch({ skin: i })}
          />
          <SwatchRow
            label="Cheveux"
            colors={HAIR_TONES}
            selected={look.hair}
            onPick={(i) => patch({ hair: i })}
          />

          <div>
            <p className="text-[10px] tracking-[0.2em] text-subtle uppercase">Coupe</p>
            <div className="mt-2 grid grid-cols-2 gap-1.5">
              {HAIR_STYLES.map((h) => (
                <Choice
                  key={h.id}
                  active={look.hairStyle === h.id}
                  label={h.label}
                  onClick={() => patch({ hairStyle: h.id })}
                />
              ))}
            </div>
          </div>

          <div>
            <p className="text-[10px] tracking-[0.2em] text-subtle uppercase">Tenue</p>
            <div className="mt-2 space-y-1.5">
              {OUTFITS.map((o) => (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => patch({ outfit: o.id })}
                  className={`flex h-12 w-full items-center justify-between rounded-lg border px-3 text-left ${
                    look.outfit === o.id ? "border-border-strong bg-surface-2" : "border-border bg-surface"
                  }`}
                >
                  <span className="text-sm text-fg">{o.label}</span>
                  <span className="text-[11px] text-subtle">{o.hint}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-[10px] tracking-[0.2em] text-subtle uppercase">Halo</p>
            <div className="mt-2 grid grid-cols-2 gap-1.5">
              {AURAS.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => patch({ aura: a.id })}
                  className={`flex h-12 items-center gap-2 rounded-lg border px-3 text-left ${
                    look.aura === a.id ? "border-border-strong bg-surface-2" : "border-border bg-surface"
                  }`}
                >
                  <span
                    className="size-3.5 rounded-full border border-border"
                    style={{ background: a.id === "none" ? "transparent" : hexCss(a.color) }}
                  />
                  <span>
                    <span className="block text-xs text-fg">{a.label}</span>
                    <span className="block text-[10px] text-subtle">{a.hint}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="border-t border-border px-4 py-3">
          <button
            type="button"
            onClick={() => {
              persist();
              useGameStore.getState().closeCreator();
            }}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-fg text-sm font-medium text-accent-fg"
          >
            <User className="size-4" />
            Entrer dans le comté
          </button>
        </div>
      </div>
    </div>
  );
}

function SwatchRow({
  label,
  colors,
  selected,
  onPick,
}: {
  label: string;
  colors: number[];
  selected: number;
  onPick: (i: number) => void;
}) {
  return (
    <div>
      <p className="text-[10px] tracking-[0.2em] text-subtle uppercase">{label}</p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {colors.map((c, i) => (
          <button
            key={c}
            type="button"
            aria-label={`${label} ${i + 1}`}
            onClick={() => onPick(i)}
            className={`size-9 rounded-md border ${selected === i ? "border-fg" : "border-border"}`}
            style={{ background: hexCss(c) }}
          />
        ))}
      </div>
    </div>
  );
}

function Choice({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`h-11 rounded-lg border text-sm ${active ? "border-border-strong bg-surface-2 text-fg" : "border-border bg-surface text-muted"}`}
    >
      {label}
    </button>
  );
}
