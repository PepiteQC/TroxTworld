import { useState, type ReactNode } from "react";
import {
  ArrowLeft,
  Briefcase,
  Banknote,
  Car,
  CloudSun,
  Contact,
  CreditCard,
  Landmark,
  Lock,
  MapPin,
  Moon,
  NotebookPen,
  Phone,
  Radio,
  Shield,
  ShoppingBag,
  Smartphone,
  Store,
  Sun,
  Truck,
  User,
  Wallet,
  X,
  Zap,
} from "lucide-react";
import { formatCad } from "./commerce";
import { GANGS, RP_JOBS, jobById, gangById } from "./rp";
import { INDUSTRY_LABEL, LANDMARK_LABEL, VILLAGES, getWorldStats } from "./worlddata";
import { hotelSecurity } from "./hotel";
import { CSR_CITATIONS, police } from "./police";
import { QUEBEC_FM_STATIONS, quebecFM } from "./radio";
import { persist, useGameStore } from "./store";
import { heatById, monthlyBill, outageLabel, waterById } from "./utilities";
import { emptyHouse } from "./house";
import { depHoursLabel, depMapMarks } from "./depanneur";

type PhoneApp = "home" | "weather" | "contacts" | "bank" | "notes" | "radio" | "sq" | "identity" | "bag" | "garage" | "jobs" | "firm" | "emploi" | "gangs" | "comte" | "maison" | "hydro" | "depanneur";

const APPS: { id: PhoneApp; label: string; hint: string; icon: typeof Phone }[] = [
  { id: "weather", label: "Météo", hint: "Portneuf", icon: CloudSun },
  { id: "comte", label: "Comté", hint: "Villages", icon: MapPin },
  { id: "contacts", label: "Contacts", hint: "911 · SQ", icon: Contact },
  { id: "bank", label: "Desjardins", hint: "Compte", icon: Wallet },
  { id: "notes", label: "Notes", hint: "Bloc-notes", icon: NotebookPen },
  { id: "radio", label: "Radio", hint: "Québec-FM", icon: Radio },
  { id: "sq", label: "Sûreté", hint: "Radars", icon: Shield },
  { id: "identity", label: "Identité", hint: "Personnage", icon: User },
  { id: "bag", label: "Sac", hint: "Inventaire", icon: ShoppingBag },
  { id: "garage", label: "Garage", hint: "Gosselin", icon: Car },
  { id: "hydro", label: "Hydro", hint: "Facture", icon: Zap },
  { id: "maison", label: "Maison", hint: "Acte", icon: Landmark },
  { id: "depanneur", label: "Dépanneur", hint: "Comptoir", icon: Store },
  { id: "jobs", label: "Transport", hint: "Contrats", icon: Truck },
  { id: "firm", label: "REQ", hint: "Entreprise", icon: Briefcase },
  { id: "emploi", label: "Emploi", hint: "Métier", icon: Briefcase },
  { id: "gangs", label: "Gangs", hint: "Rangs", icon: Shield },
];

const CONTACTS = [
  { name: "Hydro-Québec", phone: "1 800 790-2424", note: "Info-panne · tarif D" },
  { name: "Ville — aqueduc", phone: "311", note: "Eau, égouts, gel de tuyaux" },
  { name: "Urgences", phone: "911", note: "Police · incendie · ambulance" },
  { name: "Sûreté du Québec", phone: "310-4141", note: "Patrouille Portneuf" },
  { name: "Info-Santé", phone: "811", note: "Infirmière, 24 h" },
  { name: "Mairie de Portneuf", phone: "418-286-3341", note: "Hôtel de ville" },
  { name: "Hôtel Pont-Rouge", phone: "418-873-4400", note: "Réception · NIP 1234" },
  { name: "Dépanneur du village", phone: "418-268-1188", note: "Ouvert tard" },
];

function Shell({
  children,
  onClose,
}: {
  children: ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="absolute inset-0 z-40 flex items-end justify-center bg-bg/70 px-3 py-4 backdrop-blur-sm sm:items-center">
      <div className="relative flex h-[min(640px,88dvh)] w-full max-w-[22rem] flex-col overflow-hidden rounded-xl border border-border-strong bg-surface shadow-hud">
        <div className="flex items-center justify-between px-4 pt-3 pb-2">
          <span className="text-[10px] tracking-[0.2em] text-subtle uppercase">Portneuf</span>
          <button
            type="button"
            className="flex size-10 items-center justify-center rounded-md text-muted hover:text-fg"
            onClick={onClose}
            aria-label="Fermer le téléphone"
          >
            <X className="size-4" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-3">{children}</div>
        <div className="flex justify-center border-t border-border py-3">
          <button
            type="button"
            className="h-1.5 w-24 rounded-full bg-fg/30"
            onClick={onClose}
            aria-label="Accueil"
          />
        </div>
      </div>
    </div>
  );
}

export function PhoneOverlay() {
  const [app, setApp] = useState<PhoneApp>("home");
  const cash = useGameStore((s) => s.cash);
  const fines = useGameStore((s) => s.fines);
  const night = useGameStore((s) => s.night);
  const timeHours = useGameStore((s) => s.timeHours);
  const zone = useGameStore((s) => s.zone);
  const ledger = useGameStore((s) => s.ledger);
  const notes = useGameStore((s) => s.notes);
  const radioId = useGameStore((s) => s.radioId);
  const tickets = useGameStore((s) => s.tickets);
  const radioOn = useGameStore((s) => s.radioOn);
  const wantedStars = useGameStore((s) => s.wantedStars);
  const wantedReason = useGameStore((s) => s.wantedReason);
  const bounty = useGameStore((s) => s.bounty);
  const evading = useGameStore((s) => s.evading);
  const surv = useGameStore((s) => s.surv);
  const bank = useGameStore((s) => s.bank);
  const rpJob = useGameStore((s) => s.rpJob);
  const gangId = useGameStore((s) => s.gangId);
  const houses = useGameStore((s) => s.houses);
  const ownedProps = useGameStore((s) => s.ownedProps);
  const gridOutage = useGameStore((s) => s.gridOutage);
  const close = () => {
    useGameStore.getState().closePhone();
  };

  const hh = Math.floor(timeHours);
  const mm = Math.floor((timeHours % 1) * 60);

  return (
    <Shell onClose={close}>
      {app !== "home" && (
        <button
          type="button"
          className="mb-3 flex items-center gap-1.5 text-xs text-muted"
          onClick={() => setApp("home")}
        >
          <ArrowLeft className="size-3.5" />
          Accueil
        </button>
      )}

      {app === "home" && (
        <>
          <div className="mb-4">
            <p className="font-display text-3xl italic leading-none">
              {String(hh).padStart(2, "0")}:{String(mm).padStart(2, "0")}
            </p>
            <p className="mt-1 flex items-center gap-1.5 text-xs text-muted">
              <MapPin className="size-3" />
              {zone}
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {APPS.map((a) => {
              const Icon = a.icon;
              return (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => {
                    if (a.id === "identity") {
                      useGameStore.getState().openCreator();
                      return;
                    }
                    if (a.id === "bag") {
                      useGameStore.getState().openInventory();
                      return;
                    }
                    if (a.id === "garage") {
                      useGameStore.getState().openGarage();
                      return;
                    }
                    if (a.id === "jobs") {
                      useGameStore.getState().openJobs();
                      return;
                    }
                    if (a.id === "firm") {
                      useGameStore.getState().openFirm();
                      return;
                    }
                    if (a.id === "maison") {
                      const s = useGameStore.getState();
                      s.openDeed(s.ownedProps[0] ?? "H-PNF");
                      return;
                    }
                    setApp(a.id);
                  }}
                  className="flex flex-col items-start gap-2 rounded-lg border border-border bg-surface-2 px-3 py-3 text-left"
                >
                  <Icon className="size-4 text-accent" />
                  <span className="text-xs text-fg">{a.label}</span>
                  <span className="text-[10px] text-subtle">{a.hint}</span>
                </button>
              );
            })}
          </div>
          <p className="mt-4 flex items-center gap-1.5 text-[10px] text-subtle">
            <Smartphone className="size-3" />
            P ou Échap pour ranger
          </p>
        </>
      )}

      {app === "weather" && (
        <div>
          <p className="text-[10px] tracking-[0.2em] text-subtle uppercase">Météo Québec</p>
          <h3 className="font-display text-2xl italic">Portneuf</h3>
          <p className="mt-4 font-display text-5xl italic tabular-nums">{Math.round(surv.felt)}°</p>
          <p className="mt-2 flex items-center gap-2 text-sm text-muted">
            {night ? <Moon className="size-4" /> : <Sun className="size-4" />}
            {night ? "Nuit · ressenti" : "Jour · ressenti"} {Math.round(surv.felt)}° · air {Math.round(surv.ambient)}°
          </p>
          <p className="mt-3 text-xs text-subtle">
            Corps {surv.bodyTemp.toFixed(1)} °C · faim {Math.round(surv.hunger)} · soif {Math.round(surv.thirst)}
          </p>
          {surv.advice ? <p className="mt-2 text-sm text-fg">{surv.advice}</p> : null}
        </div>
      )}

      {app === "hydro" && (
        <div>
          <p className="text-[10px] tracking-[0.2em] text-subtle uppercase">Hydro-Québec</p>
          <h3 className="font-display text-2xl italic">Tarif D</h3>
          {gridOutage ? (
            <p className="mt-3 text-sm text-danger">{outageLabel(gridOutage.kind)}</p>
          ) : (
            <p className="mt-3 text-sm text-ok">Réseau Portneuf · en service</p>
          )}
          {ownedProps.length === 0 ? (
            <p className="mt-4 text-sm text-muted">Aucune maison au compte. Achetez un acte.</p>
          ) : (
            <ul className="mt-4 space-y-2">
              {ownedProps.map((id) => {
                const st = houses[id] ?? emptyHouse(id);
                const bill = monthlyBill(st, 1);
                return (
                  <li key={id} className="rounded-lg border border-border bg-surface-2 px-3 py-2.5">
                    <p className="text-sm text-fg">{heatById(st.heat).label}</p>
                    <p className="text-[11px] text-muted">
                      {Math.round(st.indoorC)} °C · {waterById(st.water).label}
                      {st.heatOn ? "" : " · chauffage coupé"}
                    </p>
                    <p className="hud-num mt-1 text-xs text-fg">
                      {formatCad(bill.hydro)} Hydro · {formatCad(bill.water)} eau
                    </p>
                  </li>
                );
              })}
            </ul>
          )}
          <p className="mt-4 text-[11px] text-subtle">Info-panne 1 800 790-2424 · LogisVert sur thermopompe</p>
        </div>
      )}

      {app === "contacts" && (
        <ul className="space-y-1">
          {CONTACTS.map((c) => (
            <li key={c.phone}>
              <button
                type="button"
                className="flex w-full items-center gap-3 rounded-lg border border-border bg-surface-2 px-3 py-2.5 text-left"
                onClick={() => {
                  useGameStore.getState().setHud({
                    notice:
                      c.phone === "911"
                        ? "Dispatch 911 — patrouille en route"
                        : `Appel · ${c.name}`,
                  });
                }}
              >
                <Phone className="size-4 shrink-0 text-accent" />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm text-fg">{c.name}</span>
                  <span className="block text-[11px] text-muted">
                    {c.phone} · {c.note}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {app === "bank" && (
        <div>
          <p className="text-[10px] tracking-[0.2em] text-subtle uppercase">Caisse Desjardins</p>
          <p className="mt-2 font-display text-4xl italic tabular-nums">{formatCad(bank)}</p>
          <p className="mt-1 text-xs text-muted">Espèces · {formatCad(cash)}</p>
          <p className="mt-1 text-xs text-subtle">Amendes SQ · {formatCad(fines)}</p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {[50, 100, 250].map((n) => (
              <button
                key={`d${n}`}
                type="button"
                className="rounded-md border border-border bg-surface-2 px-2 py-2 text-xs"
                onClick={() => useGameStore.getState().atmOp("deposit", n)}
              >
                Déposer {n}&nbsp;$
              </button>
            ))}
            {[50, 100, 250].map((n) => (
              <button
                key={`w${n}`}
                type="button"
                className="rounded-md border border-border bg-surface-2 px-2 py-2 text-xs"
                onClick={() => useGameStore.getState().atmOp("withdraw", n)}
              >
                Retirer {n}&nbsp;$
              </button>
            ))}
          </div>
          <ul className="mt-4 space-y-1">
            {ledger.length === 0 && <li className="text-xs text-subtle">Aucune transaction</li>}
            {ledger.slice(0, 8).map((e) => (
              <li key={e.id} className="flex items-center justify-between border-b border-border py-2 text-sm">
                <span className="text-fg">{e.label}</span>
                <span className={`hud-num ${e.amount < 0 ? "text-danger" : "text-ok"}`}>
                  {e.amount < 0 ? "" : "+"}
                  {formatCad(e.amount)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {app === "notes" && (
        <div>
          <p className="mb-2 text-[10px] tracking-[0.2em] text-subtle uppercase">Bloc-notes</p>
          <textarea
            value={notes}
            rows={10}
            onChange={(e) => {
              useGameStore.getState().setHud({ notes: e.target.value });
              persist();
            }}
            placeholder="NIP hôtel 1234. Orignaux au nord de l'A-40…"
            className="w-full resize-none rounded-md border border-border bg-bg px-3 py-2 text-sm text-fg outline-none placeholder:text-subtle"
          />
        </div>
      )}

      {app === "radio" && (
        <ul className="space-y-1">
          {QUEBEC_FM_STATIONS.map((s) => {
            const on = radioOn && radioId === s.id;
            return (
              <li key={s.id}>
                <button
                  type="button"
                  className={`flex w-full items-center justify-between rounded-lg border px-3 py-2.5 text-left ${
                    on ? "border-border-strong bg-surface-2" : "border-border bg-surface-2"
                  }`}
                  onClick={() => {
                    if (on) {
                      quebecFM.setOn(false);
                      useGameStore.getState().setHud({ radioOn: false });
                      persist();
                    } else {
                      quebecFM.setStation(s.id);
                      void quebecFM.ensure();
                      const np = quebecFM.nowPlaying();
                      useGameStore.getState().setHud({
                        radioOn: true,
                        radioId: s.id,
                        radioTrack: `${np.track.title} · ${np.track.artist}`,
                      });
                      persist();
                    }
                  }}
                >
                  <span>
                    <span className="block text-sm text-fg">{s.name}</span>
                    <span className="block text-[11px] text-muted">
                      {s.freq} FM · {s.genre}
                    </span>
                  </span>
                  <Radio className={`size-4 ${on ? "text-accent" : "text-subtle"}`} />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {app === "sq" && (
        <div className="space-y-3">
          <p className="text-[10px] tracking-[0.2em] text-subtle uppercase">Sûreté du Québec</p>
          <h3 className="font-display text-2xl italic">Patrouilles 138</h3>
          <p className="text-sm">
            Contraventions : <span className="hud-num">{formatCad(fines)}</span>
          </p>
          {wantedStars > 0 ? (
            <div className="rounded-lg border border-danger bg-danger/10 px-3 py-2">
              <p className="text-sm text-fg">
                {wantedStars}★ · {evading ? "Fuite" : "Poursuite"}
              </p>
              <p className="text-xs text-muted">{wantedReason}</p>
              <p className="text-xs text-subtle">Prime {formatCad(bounty)}</p>
              <button
                type="button"
                className="mt-2 w-full rounded-md border border-danger px-3 py-2 text-xs"
                onClick={() => {
                  const notice = police.arrest();
                  useGameStore.getState().openCitation(notice);
                  window.__portneuf?.teleport?.(-90, -38);
                }}
              >
                Se rendre · poste SQ
              </button>
            </div>
          ) : (
            <p className="text-sm text-muted">Aucun avis de recherche. Radars photo actifs sur la 138.</p>
          )}
          {tickets.length > 0 && (
            <>
              <p className="text-[10px] tracking-[0.16em] text-subtle uppercase">Dossier</p>
              <ul className="space-y-1">
                {tickets.slice(0, 6).map((t, i) => (
                  <li key={`${t.at}-${i}`} className="rounded-md border border-border bg-surface-2 px-3 py-2">
                    <p className="text-xs text-fg">
                      {t.kind === "arrest" ? "Arrestation" : "Constat"} · {t.article}
                    </p>
                    <p className="text-[11px] text-muted">{t.description}</p>
                    <p className="hud-num text-[11px] text-subtle">{formatCad(t.fine)}</p>
                  </li>
                ))}
              </ul>
            </>
          )}
          <p className="text-[10px] tracking-[0.16em] text-subtle uppercase">Code de la sécurité routière</p>
          <ul className="space-y-1">
            {CSR_CITATIONS.map((c) => (
              <li key={c.code} className="rounded-md border border-border bg-surface-2 px-3 py-2">
                <p className="text-xs text-fg">{c.article}</p>
                <p className="text-[11px] text-muted">{c.description}</p>
                <p className="hud-num text-[11px] text-subtle">{formatCad(c.fineAmount)}</p>
              </li>
            ))}
          </ul>
          {police.log.length > 0 && (
            <>
              <p className="text-[10px] tracking-[0.16em] text-subtle uppercase">Radio SQ</p>
              <ul className="space-y-1">
                {police.log.slice(0, 5).map((m) => (
                  <li key={m.id} className="text-[11px] text-muted">
                    <span className="text-accent">{m.code}</span> · {m.text}
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}

      {app === "emploi" && (
        <div className="space-y-2">
          <p className="text-[10px] tracking-[0.2em] text-subtle uppercase">Emploi</p>
          <p className="text-sm text-muted">Actuel · {jobById(rpJob).name}</p>
          {RP_JOBS.map((j) => (
            <button
              key={j.id}
              type="button"
              className={`flex w-full items-center justify-between rounded-md border px-3 py-2 text-left ${rpJob === j.id ? "border-accent bg-accent/10" : "border-border bg-surface-2"}`}
              onClick={() => useGameStore.getState().setRpJob(j.id)}
            >
              <span>
                <span className="block text-sm text-fg">{j.name}</span>
                <span className="text-[11px] text-subtle">{j.hint}</span>
              </span>
              <span className="hud-num text-xs">{j.salary}&nbsp;$/p</span>
            </button>
          ))}
        </div>
      )}

      {app === "gangs" && (
        <div className="space-y-2">
          <p className="text-[10px] tracking-[0.2em] text-subtle uppercase">Gangs</p>
          <p className="text-sm text-muted">{gangById(gangId)?.name ?? "Aucun"}</p>
          {GANGS.map((g) => (
            <button
              key={g.id}
              type="button"
              className="flex w-full items-center justify-between rounded-md border border-border bg-surface-2 px-3 py-2 text-left"
              onClick={() => useGameStore.getState().joinGang(g.id)}
            >
              <span>
                <span className="block text-sm" style={{ color: g.color }}>{g.name}</span>
                <span className="text-[11px] text-subtle">{g.hint}</span>
              </span>
              <span className="text-xs text-muted">{gangId === g.id ? "Membre" : "Rejoindre"}</span>
            </button>
          ))}
          {gangId && (
            <button
              type="button"
              className="w-full rounded-md border border-border px-3 py-2 text-xs"
              onClick={() => useGameStore.getState().leaveGang()}
            >
              Quitter
            </button>
          )}
        </div>
      )}

      {app === "identity" && (
        <div>
          <p className="text-[10px] tracking-[0.2em] text-subtle uppercase">Identité</p>
          <p className="mt-2 font-display text-2xl italic">{useGameStore.getState().appearance.name}</p>
          <p className="mt-2 text-sm text-muted">{jobById(rpJob).name}</p>
          <p className="text-sm text-muted">{gangById(gangId)?.name ?? "Sans gang"}</p>
          <p className="mt-3 text-xs text-subtle">Banque {formatCad(bank)} · espèces {formatCad(cash)}</p>
        </div>
      )}

      {app === "comte" && (
        <div className="space-y-2">
          <p className="text-[10px] tracking-[0.2em] text-subtle uppercase">Comté de Portneuf</p>
          <p className="text-xs text-muted">
            {getWorldStats().villages} villages · {getWorldStats().totalPopulation.toLocaleString("fr-CA")} habitants
          </p>
          {VILLAGES.map((v) => (
            <div key={v.id} className="rounded-md border border-border bg-surface-2 px-3 py-2">
              <p className="text-sm text-fg">{v.name}</p>
              <p className="text-[11px] italic text-subtle">{v.motto}</p>
              <p className="text-[11px] text-muted">
                {v.founded} · {INDUSTRY_LABEL[v.industry]} · {v.population.toLocaleString("fr-CA")} hab.
              </p>
              {v.landmarks.length > 0 && (
                <p className="text-[11px] text-subtle">{v.landmarks.map((l) => LANDMARK_LABEL[l]).join(" · ")}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {app === "depanneur" && (
        <div className="space-y-2">
          <p className="text-[10px] tracking-[0.2em] text-subtle uppercase">Comptoirs du comté</p>
          <p className="text-xs text-muted">Ouvert {depHoursLabel()} · rayons, frigos, loterie, pompe</p>
          {depMapMarks().map((s) => (
            <button
              key={s.id}
              type="button"
              className="w-full rounded-md border border-border bg-surface-2 px-3 py-2 text-left"
              onClick={() => {
                window.__portneuf?.teleport?.(s.x, s.z + 6);
                useGameStore.getState().closePhone();
              }}
            >
              <p className="text-sm text-fg">{s.name}</p>
              <p className="text-[11px] text-subtle">{depHoursLabel()}</p>
            </button>
          ))}
        </div>
      )}
    </Shell>
  );
}

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "C", "0", "OK"];

export function LockOverlay({
  onGranted,
}: {
  onGranted: () => void;
}) {
  const doorId = useGameStore((s) => s.lockDoorId) ?? "hotel";
  const doorName = useGameStore((s) => s.lockDoorName) ?? "Hôtel";
  const [pin, setPin] = useState("");
  const [msg, setMsg] = useState("Carte magnétique ou NIP 1234");
  const [ok, setOk] = useState(false);

  const apply = (res: { granted: boolean; message: string }) => {
    setMsg(res.message);
    if (res.granted) {
      setOk(true);
      persist();
      window.setTimeout(onGranted, 420);
    }
  };

  return (
    <div className="absolute inset-0 z-40 flex items-end justify-center bg-bg/70 px-3 py-4 backdrop-blur-sm sm:items-center">
      <div className="w-full max-w-sm rounded-xl border border-border-strong bg-surface p-5 shadow-hud">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] tracking-[0.2em] text-subtle uppercase">Lecteur de porte</p>
            <h2 className="font-display text-2xl italic">{doorName}</h2>
          </div>
          <button
            type="button"
            className="flex size-10 items-center justify-center rounded-md text-muted"
            onClick={() => useGameStore.getState().closeLock()}
            aria-label="Fermer"
          >
            <X className="size-4" />
          </button>
        </div>
        <div className={`mt-4 flex items-center gap-2 rounded-md border px-3 py-2 text-sm ${ok ? "border-ok text-ok" : "border-border text-muted"}`}>
          <Lock className="size-3.5" />
          <span className="hud-num tracking-[0.4em]">{pin.padEnd(4, "·")}</span>
        </div>
        <p className="mt-2 text-xs text-muted">{msg}</p>
        <div className="mt-4 grid grid-cols-3 gap-2">
          {KEYS.map((k) => (
            <button
              key={k}
              type="button"
              className="flex h-11 items-center justify-center rounded-md border border-border bg-surface-2 text-sm text-fg"
              onClick={() => {
                if (ok) return;
                if (k === "C") {
                  setPin("");
                  return;
                }
                if (k === "OK") {
                  apply(hotelSecurity.tryPin(doorId, pin));
                  return;
                }
                if (pin.length < 4) setPin(pin + k);
              }}
            >
              {k}
            </button>
          ))}
        </div>
        <button
          type="button"
          className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-md bg-fg text-sm text-accent-fg"
          onClick={() => {
            if (ok) return;
            apply(hotelSecurity.tryCard(doorId));
          }}
        >
          <CreditCard className="size-4" />
          Passer la carte
        </button>
        <p className="mt-3 flex items-center gap-1.5 text-[10px] text-subtle">
          <Banknote className="size-3" />
          NIP démonstration · 1234
        </p>
      </div>
    </div>
  );
}
