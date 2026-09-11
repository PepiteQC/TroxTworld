import { Truck, X } from "lucide-react";
import { formatCad } from "./commerce";
import type { HaulJob } from "./jobs";
import { persist, useGameStore } from "./store";

export function JobsOverlay() {
  const board = useGameStore((s) => s.jobBoard);
  const job = useGameStore((s) => s.job);
  const notice = useGameStore((s) => s.notice);

  return (
    <div className="absolute inset-0 z-40 flex items-end justify-center bg-bg/70 px-3 py-4 backdrop-blur-sm sm:items-center">
      <div className="hud-panel w-full max-w-lg rounded-xl p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] tracking-[0.25em] text-subtle uppercase">Emplois</p>
            <h2 className="font-display text-3xl italic">Transport</h2>
            <p className="mt-1 text-sm text-muted">Livreur, laitier, siropier, A-40, taxi du comté.</p>
          </div>
          <button
            type="button"
            className="flex size-11 items-center justify-center rounded-md text-muted hover:text-fg"
            onClick={() => useGameStore.getState().closeJobs()}
            aria-label="Fermer les emplois"
          >
            <X className="size-5" />
          </button>
        </div>
        {notice && <p className="mt-3 text-sm text-accent">{notice}</p>}
        {job && (
          <div className="mt-4 rounded-lg border border-border-strong bg-surface-2 px-3 py-3">
            <p className="text-[10px] tracking-[0.2em] text-subtle uppercase">Contrat actif</p>
            <p className="font-display text-xl italic">{job.title}</p>
            <p className="mt-1 text-sm text-muted">
              {job.loaded ? "Livrer" : "Charger"} · {job.loaded ? job.to.name : job.from.name}
            </p>
            <p className="hud-num mt-1 text-sm text-fg">{formatCad(job.pay)}</p>
            <button
              type="button"
              className="mt-3 h-10 w-full rounded-md border border-border bg-surface text-xs text-muted"
              onClick={() => useGameStore.getState().abandonJob()}
            >
              Abandonner
            </button>
          </div>
        )}
        <ul className="mt-4 space-y-1">
          {board.map((offer) => (
            <JobRow key={offer.id} offer={offer} busy={Boolean(job)} />
          ))}
        </ul>
      </div>
    </div>
  );
}

function JobRow({ offer, busy }: { offer: HaulJob; busy: boolean }) {
  return (
    <li>
      <button
        type="button"
        disabled={busy}
        onClick={() => {
          useGameStore.getState().acceptJob(offer.id);
          persist();
        }}
        className="flex w-full items-center gap-3 rounded-lg border border-border bg-surface px-3 py-2.5 text-left disabled:opacity-40"
      >
        <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-surface-2">
          <Truck className="size-4 text-accent" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm text-fg">{offer.title}</span>
          <span className="block text-xs text-muted">
            {offer.from.name} → {offer.to.name}
          </span>
        </span>
        <span className="hud-num shrink-0 text-sm text-fg">{formatCad(offer.pay)}</span>
      </button>
    </li>
  );
}
