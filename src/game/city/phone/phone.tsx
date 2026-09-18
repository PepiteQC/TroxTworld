/**
 * ═══════════════════════════════════════════════════════════════════
 * CELLULAIRE INTELLIGENT DE PORTNEUF — ÉCOSYSTÈME INTERACTIF RP v2.0
 * Ajouts : Forfaits, Pannes réseau, Appels coupés, Messagerie vocale, 
 *          Numéros bloqués, Frais d'abonnement, Boutique d'Apps.
 * ═══════════════════════════════════════════════════════════════════
 */

import React, { useState, useEffect, type ReactNode } from "react";
import {
  Activity, ArrowLeft, Briefcase, Banknote, Car, CloudSun, Contact,
  CreditCard, Landmark, Lock, MapPin, Moon, NotebookPen, Phone, Radio,
  Shield, ShoppingBag, Smartphone, Store, Sun, Truck, User, Users,
  Wallet, X, Zap, BadgeCheck, AlertTriangle, Send, Droplet, ShieldAlert,
  Flame, UserX, Plus, Coins, Settings, ShoppingCart, Voicemail, WifiOff, Play, Pause, ShieldOff
} from "lucide-react";

import { formatCad } from "./commerce";
import { persist, useGameStore } from "./store";
import { QUEBEC_FM_STATIONS, quebecFM } from "./radio";
import { heatById, monthlyBill, outageLabel, waterById } from "./utilities";
import { emptyHouse } from "./house";
import { depHoursLabel, depMapMarks } from "./depanneur";
import { netEmit } from "./net";

// ── CORRECTIONS DES IMPORTS DU PROJET ──
import { getPlayerCaisseRole, getCaissePermissions } from "./caisse";
import { SQ_LEGAL_BAC, payTicket } from "./police";
import { getPlayerAccounts, sendInterac, buyInvestment } from "./banking";
import { fileTalDispute, payHydroBill, ensureHydro, KIND_LABEL, catalog, ownedIds, type QuebecLease } from "./realestate";
import { applyForUnemploymentBenefits, reportWorkplaceInjury } from "./jobs";

type PhoneApp = 
  | "home" | "weather" | "contacts" | "bank" | "notes" | "radio" | "sq" | "identity" 
  | "bag" | "garage" | "jobs" | "firm" | "emploi" | "gangs" | "comte" | "maison" 
  | "hydro" | "depanneur" | "citoyens" | "intel" | "staff" | "interac" 
  | "phone" | "store" | "settings"; // NOUVEAUX APPS

const APPS: { id: PhoneApp; label: string; hint: string; icon: any; colorClass: string }[] = [
  { id: "phone", label: "Téléphone", hint: "Appels & Vocaux", icon: Phone, colorClass: "bg-green-600 text-white" },
  { id: "bank", label: "AccèsD", hint: "Desjardins", icon: Wallet, colorClass: "bg-emerald-600 text-white" },
  { id: "hydro", label: "Hydro-QC", hint: "Compte & Panne", icon: Zap, colorClass: "bg-orange-500 text-white" },
  { id: "sq", label: "SAAQclic", hint: "SQ & Permis", icon: Shield, colorClass: "bg-blue-600 text-white" },
  { id: "maison", label: "Centris", hint: "Baux & TAL", icon: Landmark, colorClass: "bg-cyan-600 text-white" },
  { id: "emploi", label: "CNESST", hint: "Chômage & Paie", icon: Briefcase, colorClass: "bg-amber-600 text-white" },
  { id: "weather", label: "Météo", hint: "Environnement", icon: CloudSun, colorClass: "bg-sky-500 text-white" },
  { id: "comte", label: "Comté", hint: "Territoire", icon: MapPin, colorClass: "bg-slate-600 text-white" },
  { id: "citoyens", label: "Citoyens", hint: "Réseau LTE", icon: Users, colorClass: "bg-indigo-600 text-white" },
  { id: "contacts", label: "Urgence", hint: "911 · 811", icon: Contact, colorClass: "bg-rose-600 text-white" },
  { id: "radio", label: "Radio FM", hint: "Stations QC", icon: Radio, colorClass: "bg-purple-600 text-white" },
  { id: "depanneur", label: "Couche-Tard", hint: "Dépanneur", icon: Store, colorClass: "bg-red-500 text-white" },
  { id: "jobs", label: "Teamsters", hint: "Fret & Haul", icon: Truck, colorClass: "bg-amber-700 text-white" },
  { id: "store", label: "Boutique", hint: "Apps Payantes", icon: ShoppingCart, colorClass: "bg-pink-600 text-white" },
  { id: "settings", label: "Paramètres", hint: "Forfait & Blocage", icon: Settings, colorClass: "bg-gray-600 text-white" },
];

const CONTACTS = [
  { name: "Urgences Rive-Nord", phone: "911", note: "Police · Ambulances · Incendie", color: "text-red-500" },
  { name: "Sûreté du Québec (SQ)", phone: "310-4141", note: "Poste de Portneuf", color: "text-blue-500" },
  { name: "Hydro-Québec (Pannes)", phone: "1 800 790-2424", note: "Coupures & compte", color: "text-orange-400" },
  { name: "Info-Santé / Social", phone: "811", note: "Infirmière de garde 24/7", color: "text-emerald-500" },
  { name: "Tribunal du Logement (TAL)", phone: "1 800 683-2245", note: "Baux et avis d'éviction", color: "text-cyan-500" },
  { name: "SAAQ (Immatriculation)", phone: "1 800 361-7620", note: "Points d'inaptitude SAAQ", color: "text-blue-400" },
  { name: "Caisse Desjardins", phone: "418-555-0155", note: "Assistance AccèsD", color: "text-emerald-600" },
  { name: "Dépanneur Couche-Tard", phone: "418-268-1188", note: "Bières, loterie et café", color: "text-red-400" },
];

// Données simulées pour les nouvelles fonctionnalités
const PHONE_PLANS = [
  { id: "base", name: "Forfait Découverte", price: 35, data: "2 Go", features: ["Appels illimités QC", "2 Go de données"] },
  { id: "illimite", name: "Forfait Illimité 5G", price: 55, data: "Illimité", features: ["Appels QC/Ontario", "Données illimitées", "Roaming Canada"] },
  { id: "affaires", name: "Forfait Affaires Pro", price: 85, data: "Illimité", features: ["Tout le Canada", "5G Ultra", "Téléphone inclus"] },
];

const PAID_APPS = [
  { id: "gps_pro", name: "GPS Pro Rive-Nord", price: 150, icon: MapPin, desc: "Affiche les routes de rang et les raccourcis." },
  { id: "secure_notes", name: "Notes Cryptées Pro", price: 75, icon: NotebookPen, desc: "Effacement automatique après 3 tentatives." },
  { id: "radio_premium", name: "Radio Sans Pub", price: 200, icon: Radio, desc: "Écoute les stations FM sans interruptions." },
];

function Shell({ children, onClose }: { children: ReactNode; onClose: () => void }) {
  // Simulation de l'état du réseau (Pannes / Zones blanches)
  const [networkStatus, setNetworkStatus] = useState<"5G" | "LTE" | "3G" | "None">("LTE");
  const [battery, setBattery] = useState(85);

  useEffect(() => {
    // Simulation réaliste : perte de réseau aléatoire dans les rangs (5% de chance)
    const interval = setInterval(() => {
      if (Math.random() < 0.05) {
        setNetworkStatus("None");
        setTimeout(() => setNetworkStatus("LTE"), 3000 + Math.random() * 5000); // Panne de 3 à 8 secondes
      } else if (networkStatus === "None") {
        setNetworkStatus("LTE");
      }
    }, 10000);

    // Drain de batterie lent
    const batteryInterval = setInterval(() => {
      setBattery(prev => Math.max(5, prev - 1));
    }, 60000);

    return () => {
      clearInterval(interval);
      clearInterval(batteryInterval);
    };
  }, [networkStatus]);

  return (
    <div className="absolute inset-0 z-40 flex items-end justify-center bg-black/60 px-3 py-4 backdrop-blur-md sm:items-center">
      <div className="relative flex h-[min(680px,90dvh)] w-full max-w-[23rem] flex-col overflow-hidden rounded-[2.5rem] border-4 border-slate-700 bg-slate-950 shadow-2xl">
        {/* Encoche / Dynamic Island */}
        <div className="absolute top-2 left-1/2 z-50 h-6 w-32 -translate-x-1/2 rounded-full bg-black flex items-center justify-center">
          <div className="h-1.5 w-1.5 rounded-full bg-slate-800 ml-auto mr-4" />
        </div>
        
        {/* Barre d'état */}
        <div className="flex items-center justify-between px-6 pt-5 pb-2 text-slate-400 text-[10px] font-medium">
          <span>{new Date().toLocaleTimeString("fr-CA", { hour: '2-digit', minute: '2-digit' })}</span>
          <div className="flex items-center gap-1.5">
            {networkStatus === "None" ? (
              <span className="flex items-center gap-1 text-red-400 animate-pulse"><WifiOff className="size-3" /> Aucune couverture</span>
            ) : (
              <span className="flex items-center gap-1 text-emerald-400"><Activity className="size-3" /> Vidéotron {networkStatus}</span>
            )}
            <span className="ml-2 flex items-center gap-1">{battery}% <Zap className="size-3" /></span>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-4 custom-scrollbar">{children}</div>
        
        {/* Barre d'accueil */}
        <div className="flex justify-center bg-slate-950 py-3">
          <button
            type="button"
            className="h-1.5 w-28 rounded-full bg-white/40 hover:bg-white/80 transition-colors"
            onClick={onClose}
          />
        </div>
      </div>
    </div>
  );
}

export function PhoneOverlay() {
  const [app, setApp] = useState<PhoneApp>("home");
  const close = () => useGameStore.getState().closePhone();

  // États pour les nouvelles fonctionnalités
  const [networkStatus, setNetworkStatus] = useState<"5G" | "LTE" | "3G" | "None">("LTE");
  const [currentPlan, setCurrentPlan] = useState(PHONE_PLANS[1]); // Forfait Illimité par défaut
  const [blockedNumbers, setBlockedNumbers] = useState<string[]>([]);
  const [purchasedApps, setPurchasedApps] = useState<string[]>(["secure_notes"]); // Apps déjà achetées
  const [voicemails, setVoicemails] = useState([
    { id: 1, from: "418-555-0199", name: "Garage Portneuf", msg: "Votre véhicule est prêt. Montant: 245$. Appelez-nous.", date: "Hier, 14:30", played: false },
    { id: 2, from: "1-800-555-0122", name: "Hydro-Québec", msg: "Ceci est un rappel automatisé. Votre facture de 112$ est en retard.", date: "Il y a 2 jours", played: true }
  ]);
  const [playingVm, setPlayingVm] = useState<number | null>(null);

  const [interacTarget, setInteracTarget] = useState("");
  const [interacAmount, setInteracAmount] = useState(0);
  const [interacQ, setInteracQ] = useState("");
  const [interacA, setInteracA] = useState("");

  const localPlayerId = "local_player";
  const accounts = getPlayerAccounts(localPlayerId);
  const cash = useGameStore((s) => s.cash);
  const demeritPoints = useGameStore((s) => s.demeritPoints) ?? 0;
  const licenseSuspendedUntil = useGameStore((s) => s.licenseSuspendedUntil) ?? 0;
  const bloodAlcohol = useGameStore((s) => s.bloodAlcohol) ?? 0;
  const timeHours = useGameStore((s) => s.timeHours);
  const zone = useGameStore((s) => s.zone);
  const realty = useGameStore((s) => s.realty);
  const ownedProps = useGameStore((s) => s.ownedProps);
  const radioId = useGameStore((s) => s.radioId);
  const radioOn = useGameStore((s) => s.radioOn);
  const tickets = useGameStore((s) => s.tickets) ?? [];
  const notes = useGameStore((s) => s.notes) ?? "";

  const hh = Math.floor(timeHours);
  const mm = Math.floor((timeHours % 1) * 60);

  // Simulation de l'état du réseau (synchronisé avec le Shell)
  useEffect(() => {
    const interval = setInterval(() => {
      if (Math.random() < 0.05) {
        setNetworkStatus("None");
        setTimeout(() => setNetworkStatus("LTE"), 4000);
      } else {
        setNetworkStatus("LTE");
      }
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  // Fonction pour bloquer un numéro
  const toggleBlockNumber = (phone: string) => {
    if (blockedNumbers.includes(phone)) {
      setBlockedNumbers(blockedNumbers.filter(n => n !== phone));
    } else {
      setBlockedNumbers([...blockedNumbers, phone]);
    }
  };

  // Fonction pour acheter une app
  const buyApp = (appId: string, price: number) => {
    if (purchasedApps.includes(appId)) return;
    if (cash >= price) {
      // Ici, tu devrais appeler netEmit ou une fonction de banking pour déduire l'argent
      // removeCash(price, localPlayerId); 
      setPurchasedApps([...purchasedApps, appId]);
      useGameStore.getState().setHud({ notice: `✅ Application achetée avec succès!` });
    } else {
      useGameStore.getState().setHud({ notice: `❌ Fonds insuffisants pour acheter cette application.` });
    }
  };

  return (
    <Shell onClose={close}>
      {app !== "home" && (
        <button
          type="button"
          className="mb-4 flex items-center gap-1.5 text-sm font-medium text-slate-400 hover:text-white"
          onClick={() => setApp("home")}
        >
          <ArrowLeft className="size-4" />
          Retour à l'écran
        </button>
      )}

      {app === "home" && (
        <div className="animate-fade-in">
          <div className="mb-6 mt-2 text-center">
            <p className="font-display text-5xl font-extralight text-white leading-none tracking-tight">
              {String(hh).padStart(2, "0")}:{String(mm).padStart(2, "0")}
            </p>
            <p className="mt-2 text-xs text-slate-400 font-medium tracking-wide capitalize">
              {new Date().toLocaleDateString("fr-CA", { weekday: 'long', month: 'long', day: 'numeric' })}
            </p>
            <p className="mt-1 flex items-center justify-center gap-1 text-[11px] text-emerald-400 font-semibold bg-emerald-500/10 py-1 px-3 rounded-full w-max mx-auto border border-emerald-500/20">
              <MapPin className="size-3" />
              {zone}
            </p>
          </div>

          <div className="grid grid-cols-4 gap-x-2 gap-y-4 pt-4">
            {APPS.map((a) => {
              const Icon = a.icon;
              return (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => {
                    if (networkStatus === "None" && a.id !== "settings" && a.id !== "notes") {
                       useGameStore.getState().setHud({ notice: "⚠️ Aucun service réseau. Impossible d'ouvrir cette app." });
                       return;
                    }
                    if (a.id === "identity") { useGameStore.getState().openCreator(); return; }
                    if (a.id === "bag") { useGameStore.getState().openInventory(); return; }
                    if (a.id === "jobs") { useGameStore.getState().openJobs(); return; }
                    setApp(a.id);
                  }}
                  className="flex flex-col items-center gap-1 text-center group"
                >
                  <div className={`flex size-14 items-center justify-center rounded-2xl shadow-md transition-all active:scale-95 group-hover:brightness-110 ${a.colorClass}`}>
                    <Icon className="size-6" />
                  </div>
                  <span className="text-[11px] font-medium text-slate-200 mt-1 max-w-[70px] truncate leading-none">
                    {a.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* NOUVEAU : APPLICATION TÉLÉPHONE & MESSAGERIE VOCALE */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {app === "phone" && (
        <div className="space-y-4 animate-fade-in text-white">
          <div className="flex items-center gap-2 border-b border-green-600/30 pb-3">
            <div className="size-9 rounded-lg bg-green-600 flex items-center justify-center">
              <Phone className="size-5 text-white" />
            </div>
            <div>
              <h3 className="font-display text-xl font-bold text-green-400">Téléphone</h3>
              <p className="text-[10px] text-slate-400 tracking-wider">APPELS & MESSAGERIE</p>
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
              <Voicemail className="size-4" /> Messagerie vocale ({voicemails.filter(v => !v.played).length} nouveaux)
            </p>
            {voicemails.length === 0 ? (
              <p className="text-xs text-slate-500 italic">Aucun message vocal.</p>
            ) : (
              voicemails.map(vm => (
                <div key={vm.id} className={`rounded-xl border p-3 space-y-2 transition-colors ${vm.played ? "bg-slate-900/20 border-slate-800" : "bg-green-950/10 border-green-500/20"}`}>
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-bold text-slate-200">{vm.name}</p>
                      <p className="text-[10px] text-slate-400">{vm.from} · {vm.date}</p>
                    </div>
                    <button 
                      onClick={() => setPlayingVm(playingVm === vm.id ? null : vm.id)}
                      className="size-8 rounded-full bg-green-600 flex items-center justify-center hover:bg-green-500 transition-colors"
                    >
                      {playingVm === vm.id ? <Pause className="size-4 text-white" /> : <Play className="size-4 text-white" />}
                    </button>
                  </div>
                  {playingVm === vm.id && (
                    <div className="text-xs text-green-300 bg-green-900/20 p-2 rounded border border-green-500/20 animate-pulse">
                      🔊 Lecture en cours : "{vm.msg}"
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* NOUVEAU : BOUTIQUE D'APPLICATIONS PAYANTES */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {app === "store" && (
        <div className="space-y-4 animate-fade-in text-white">
          <div className="flex items-center gap-2 border-b border-pink-600/30 pb-3">
            <div className="size-9 rounded-lg bg-pink-600 flex items-center justify-center">
              <ShoppingCart className="size-5 text-white" />
            </div>
            <div>
              <h3 className="font-display text-xl font-bold text-pink-400">Boutique d'Apps</h3>
              <p className="text-[10px] text-slate-400 tracking-wider">QC APP STORE</p>
            </div>
          </div>

          <div className="space-y-3">
            {PAID_APPS.map(appItem => {
              const isOwned = purchasedApps.includes(appItem.id);
              const Icon = appItem.icon;
              return (
                <div key={appItem.id} className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 flex items-start gap-3">
                  <div className="size-10 rounded-lg bg-slate-800 flex items-center justify-center shrink-0">
                    <Icon className="size-5 text-pink-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="font-bold text-slate-200 text-sm">{appItem.name}</p>
                      <span className="font-mono text-xs font-bold text-emerald-400">{formatCad(appItem.price)}</span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">{appItem.desc}</p>
                    <button
                      disabled={isOwned}
                      onClick={() => buyApp(appItem.id, appItem.price)}
                      className={`mt-2 w-full h-8 rounded-lg text-xs font-bold transition-colors ${
                        isOwned 
                          ? "bg-slate-800 text-slate-500 cursor-not-allowed" 
                          : "bg-pink-600 text-white hover:bg-pink-500"
                      }`}
                    >
                      {isOwned ? "✅ Installé" : "🛒 Acheter"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* NOUVEAU : PARAMÈTRES (FORFAITS & NUMÉROS BLOQUÉS) */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {app === "settings" && (
        <div className="space-y-4 animate-fade-in text-white">
          <div className="flex items-center gap-2 border-b border-gray-600/30 pb-3">
            <div className="size-9 rounded-lg bg-gray-600 flex items-center justify-center">
              <Settings className="size-5 text-white" />
            </div>
            <div>
              <h3 className="font-display text-xl font-bold text-gray-300">Paramètres</h3>
              <p className="text-[10px] text-slate-400 tracking-wider">VIDÉOTRON MOBILE</p>
            </div>
          </div>

          {/* Gestion du forfait */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 space-y-3">
            <p className="text-xs font-bold text-slate-200 flex items-center gap-2">
              <Smartphone className="size-4" /> Mon Forfait Actuel
            </p>
            <div className="flex items-center justify-between bg-slate-950 p-3 rounded-lg border border-slate-800">
              <div>
                <p className="font-bold text-emerald-400">{currentPlan.name}</p>
                <p className="text-[10px] text-slate-400">{currentPlan.data} · {currentPlan.price}$/mois</p>
              </div>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-1 rounded">ACTIF</span>
            </div>
            <div className="space-y-2">
              <p className="text-[10px] text-slate-500 uppercase">Changer de forfait (facturé le 1er du mois)</p>
              <div className="grid grid-cols-1 gap-2">
                {PHONE_PLANS.map(plan => (
                  <button
                    key={plan.id}
                    disabled={currentPlan.id === plan.id}
                    onClick={() => {
                      setCurrentPlan(plan);
                      useGameStore.getState().setHud({ notice: `✅ Forfait changé pour : ${plan.name}. Frais de ${plan.name} appliqués.` });
                      // netEmit("phone:change_plan", { planId: plan.id });
                    }}
                    className={`flex items-center justify-between p-2 rounded-lg border text-xs transition-colors ${
                      currentPlan.id === plan.id 
                        ? "bg-emerald-900/20 border-emerald-500/50 text-emerald-300" 
                        : "bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-900"
                    }`}
                  >
                    <span>{plan.name} ({formatCad(plan.price)}/mois)</span>
                    {currentPlan.id === plan.id && <BadgeCheck className="size-4" />}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Gestion des numéros bloqués */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 space-y-3">
            <p className="text-xs font-bold text-slate-200 flex items-center gap-2">
              <ShieldOff className="size-4" /> Numéros Bloqués ({blockedNumbers.length})
            </p>
            {blockedNumbers.length === 0 ? (
              <p className="text-xs text-slate-500 italic">Aucun numéro bloqué.</p>
            ) : (
              <ul className="space-y-2">
                {blockedNumbers.map(num => (
                  <li key={num} className="flex items-center justify-between bg-slate-950 p-2 rounded-lg border border-slate-800">
                    <span className="text-sm text-red-400 font-mono">{num}</span>
                    <button 
                      onClick={() => toggleBlockNumber(num)}
                      className="text-[10px] text-slate-400 hover:text-white underline"
                    >
                      Débloquer
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {app === "bank" && (
        <div className="space-y-4 animate-fade-in text-white">
          <div className="flex items-center gap-2 border-b border-emerald-600/30 pb-3">
            <div className="size-9 rounded-lg bg-emerald-600 flex items-center justify-center">
              <Wallet className="size-5 text-white" />
            </div>
            <div>
              <h3 className="font-display text-xl font-bold text-emerald-400">Desjardins</h3>
              <p className="text-[10px] text-slate-400 tracking-wider">MOUVEMENT COOPÉRATIF</p>
            </div>
          </div>

          <div className="space-y-2.5">
            {accounts && accounts.length > 0 ? (
              accounts.map((acc: any) => (
                <div key={acc.accountId} className="rounded-xl bg-gradient-to-br from-emerald-950/40 to-slate-900 border border-emerald-500/20 p-4 shadow-sm">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-400/80">{acc.accountType === "cheque" ? "Compte Chèque" : "Épargne Stable"}</span>
                  <p className="font-mono text-xs text-slate-400 mt-0.5">{acc.accountNumber}</p>
                  <p className="font-display text-2xl font-bold mt-1 text-white">{formatCad(acc.balance)}</p>
                </div>
              ))
            ) : (
              <div className="rounded-xl bg-gradient-to-br from-emerald-950/40 to-slate-900 border border-emerald-500/20 p-4 shadow-sm">
                <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-400/80">Solde Courant</span>
                <p className="font-display text-2xl font-bold mt-1 text-white">{formatCad(cash)}</p>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              className="flex items-center justify-center gap-2 h-11 rounded-xl bg-emerald-700 text-sm font-semibold hover:bg-emerald-600 transition-colors"
              onClick={() => setApp("interac")}
            >
              <Send className="size-4" />
              Virement Interac
            </button>
            <button
              type="button"
              className="flex items-center justify-center gap-2 h-11 rounded-xl bg-slate-800 text-sm font-semibold hover:bg-slate-700 transition-colors"
              onClick={() => {
                if (accounts && accounts[0]) {
                  buyInvestment(localPlayerId, accounts[0].accountId, "stock", "ATD", 1000);
                }
              }}
            >
              <Landmark className="size-4" />
              Cotiser REER
            </button>
          </div>
        </div>
      )}

      {app === "interac" && (
        <div className="space-y-4 text-white">
          <h3 className="font-display text-xl font-bold text-emerald-400">Nouveau virement</h3>
          <div className="space-y-3 rounded-xl border border-slate-800 bg-slate-900/50 p-4">
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Destinataire (ID Joueur)</label>
              <input
                type="text"
                placeholder="Ex: player_815"
                value={interacTarget}
                onChange={(e: any) => setInteracTarget(e.target.value)}
                className="h-10 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 text-sm focus:border-emerald-500 focus:outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Montant (CAD)</label>
              <input
                type="number"
                placeholder="250$"
                value={interacAmount || ""}
                onChange={(e: any) => setInteracAmount(Number(e.target.value))}
                className="h-10 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 text-sm focus:border-emerald-500 focus:outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Question de sécurité</label>
              <input
                type="text"
                placeholder="Votre province ?"
                value={interacQ}
                onChange={(e: any) => setInteracQ(e.target.value)}
                className="h-10 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 text-sm focus:border-emerald-500 focus:outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Réponse attendue</label>
              <input
                type="text"
                placeholder="quebec"
                value={interacA}
                onChange={(e: any) => setInteracA(e.target.value)}
                className="h-10 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 text-sm focus:border-emerald-500 focus:outline-none"
              />
            </div>
          </div>
          <button
            type="button"
            className="w-full h-11 rounded-xl bg-emerald-600 font-bold hover:bg-emerald-500 transition-colors"
            onClick={() => {
              if (accounts && accounts[0]) {
                sendInterac(accounts[0].accountId, interacTarget, interacAmount, interacQ, interacA);
                setApp("bank");
              }
            }}
          >
            🚀 Envoyer par courriel/SMS
          </button>
        </div>
      )}

      {app === "hydro" && (
        <div className="space-y-4 animate-fade-in text-white">
          <div className="flex items-center gap-2 border-b border-orange-500/30 pb-3">
            <div className="size-9 rounded-lg bg-orange-500 flex items-center justify-center">
              <Zap className="size-5 text-white" />
            </div>
            <div>
              <h3 className="font-display text-xl font-bold text-orange-400">Hydro-Québec</h3>
              <p className="text-[10px] text-slate-400 tracking-wider">COMPTE CLIENT</p>
            </div>
          </div>

          {ownedProps.length === 0 ? (
            <p className="text-sm text-slate-400 italic">Aucune adresse enregistrée sous votre nom d'abonné.</p>
          ) : (
            <div className="space-y-3">
              {ownedProps.map((id: string) => {
                const hState = ensureHydro(realty, id, localPlayerId);
                return (
                  <div key={id} className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-xs font-bold text-slate-200">Facture Résidentielle Tarif D</p>
                        <p className="font-mono text-[10px] text-slate-400">Compteur {hState.accountNumber}</p>
                      </div>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${hState.isPowerCut ? "bg-red-500/20 text-red-300" : "bg-emerald-500/20 text-emerald-300"}`}>
                        {hState.isPowerCut ? "COUPÉ" : "ACTIF"}
                      </span>
                    </div>

                    <div className="flex items-baseline justify-between border-t border-slate-800/60 pt-2.5">
                      <span className="text-xs text-slate-400">Solde dû :</span>
                      <span className="font-mono text-xl font-bold text-orange-400">{formatCad(hState.balanceDue)}</span>
                    </div>

                    {hState.balanceDue > 0 && (
                      <button
                        type="button"
                        className="w-full h-10 rounded-lg bg-orange-500 font-bold hover:bg-orange-400 transition-colors text-xs text-black"
                        onClick={() => {
                          payHydroBill(realty, id, localPlayerId);
                          setApp("home");
                        }}
                      >
                        ⚡ Payer par prélèvement
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {app === "sq" && (
        <div className="space-y-4 animate-fade-in text-white">
          <div className="flex items-center gap-2 border-b border-blue-500/30 pb-3">
            <div className="size-9 rounded-lg bg-blue-600 flex items-center justify-center">
              <Shield className="size-5 text-white" />
            </div>
            <div>
              <h3 className="font-display text-xl font-bold text-blue-400">SAAQclic</h3>
              <p className="text-[10px] text-slate-400 tracking-wider">SÛRETÉ & DOSSIER CONDUCTEUR</p>
            </div>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 space-y-3">
            <p className="text-xs font-bold text-slate-200">Statut du Permis de Conduire</p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-lg bg-slate-950 p-2 border border-slate-800">
                <span className="block text-[10px] text-slate-400">Points SAAQ :</span>
                <span className="font-mono text-base font-bold text-orange-400">{demeritPoints} / 15</span>
              </div>
              <div className="rounded-lg bg-slate-950 p-2 border border-slate-800">
                <span className="block text-[10px] text-slate-400">Alcoolémie :</span>
                <span className={`font-mono text-base font-bold ${bloodAlcohol >= SQ_LEGAL_BAC ? "text-red-400" : "text-emerald-400"}`}>{Math.round(bloodAlcohol)} mg</span>
              </div>
            </div>

            {licenseSuspendedUntil > Date.now() ? (
              <div className="flex items-center gap-2 rounded-lg bg-red-500/10 border border-red-500/20 p-2 text-red-300 text-xs">
                <AlertTriangle className="size-4 shrink-0 text-red-400" />
                <span>Suspension SAAQ active : {Math.max(1, Math.ceil((licenseSuspendedUntil - Date.now()) / 86400000))} jours restants.</span>
              </div>
            ) : (
              <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-semibold text-emerald-300 block w-max">PERMIS VALIDE</span>
            )}
          </div>

          <div className="space-y-2">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Avis d'infraction actifs</p>
            {tickets.length === 0 ? (
              <p className="text-xs text-slate-400 italic">Aucun constat d'infraction non payé enregistré.</p>
            ) : (
              <div className="space-y-2">
                {tickets.map((t: any) => (
                  <div key={t.ticketNumber} className="rounded-xl border border-slate-800 bg-slate-900/40 p-3 space-y-2 text-xs">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-bold text-slate-200">{t.csrArticle}</p>
                        <p className="text-slate-400 text-[10px]">{t.description}</p>
                      </div>
                      <span className="font-mono font-bold text-orange-400">{formatCad(t.fine)}</span>
                    </div>
                    {!t.paid && (
                      <button
                        type="button"
                        className="w-full h-8 rounded-lg bg-blue-600 font-bold hover:bg-blue-500 transition-colors text-[11px]"
                        onClick={() => {
                          payTicket(t.ticketNumber, localPlayerId);
                          setApp("home");
                        }}
                      >
                        💳 Payer l'amende
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {app === "maison" && (
        <div className="space-y-4 animate-fade-in text-white">
          <div className="flex items-center gap-2 border-b border-cyan-500/30 pb-3">
            <div className="size-9 rounded-lg bg-cyan-600 flex items-center justify-center">
              <Landmark className="size-5 text-white" />
            </div>
            <div>
              <h3 className="font-display text-xl font-bold text-cyan-400">Centris</h3>
              <p className="text-[10px] text-slate-400 tracking-wider">RECHERCHE & T.A.L. BAILS</p>
            </div>
          </div>

          <div className="space-y-2.5">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Mes baux actifs (TAL)</p>
            {Object.keys(realty.rentals || {}).length === 0 ? (
              <p className="text-xs text-slate-400 italic">Aucun bail enregistré au Tribunal administratif du logement.</p>
            ) : (
              <div className="space-y-2">
                {Object.entries(realty.rentals).map(([propId, lease]: [string, any]) => (
                  <div key={lease.leaseId} className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 space-y-2 text-xs">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-bold text-slate-200">Logement {propId}</p>
                        <p className="text-slate-400 text-[10px]">Locataire: {lease.tenantName}</p>
                      </div>
                      <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${lease.status === "dispute" ? "bg-red-500/20 text-red-300" : "bg-emerald-500/20 text-emerald-300"}`}>
                        {lease.status.toUpperCase()}
                      </span>
                    </div>

                    <div className="flex items-baseline justify-between border-t border-slate-800/60 pt-2">
                      <span className="text-[10px] text-slate-400">Loyer mensuel :</span>
                      <span className="font-mono font-bold text-cyan-400">{formatCad(lease.rentAmount)}</span>
                    </div>

                    {lease.status !== "dispute" && (
                      <button
                        type="button"
                        className="w-full h-8 rounded-lg bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 text-red-300 font-bold transition-colors text-[11px] mt-1"
                        onClick={() => {
                          fileTalDispute(realty, propId, lease.landlordId, "non_payment");
                          setApp("home");
                        }}
                      >
                        ⚖️ Ouvrir un dossier d'éviction au TAL
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {app === "emploi" && (
        <div className="space-y-4 animate-fade-in text-white">
          <div className="flex items-center gap-2 border-b border-amber-500/30 pb-3">
            <div className="size-9 rounded-lg bg-amber-600 flex items-center justify-center">
              <Briefcase className="size-5 text-white" />
            </div>
            <div>
              <h3 className="font-display text-xl font-bold text-amber-400">CNESST</h3>
              <p className="text-[10px] text-slate-400 tracking-wider">PAIE & ASSURANCE CHÔMAGE</p>
            </div>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 space-y-3 text-xs">
            <p className="font-bold text-slate-200">Assurance-Emploi (AE)</p>
            <p className="text-slate-400 text-[11px]">En cas de perte d'emploi ou hors saison, réclamez vos prestations fédérales de 55% du salaire.</p>
            <button
              type="button"
              className="w-full h-10 rounded-lg bg-amber-600 font-bold hover:bg-amber-500 transition-colors"
              onClick={() => {
                applyForUnemploymentBenefits(localPlayerId);
                setApp("home");
              }}
            >
              🍁 Déposer une demande de prestations
            </button>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 space-y-3 text-xs">
            <p className="font-bold text-slate-200">Accident de travail (CNESST)</p>
            <p className="text-slate-400 text-[11px]">Déclarez un accident ou blessure survenue durant vos heures de service pour obtenir compensation.</p>
            <button
              type="button"
              className="w-full h-10 rounded-lg bg-slate-800 border border-slate-700 font-bold hover:bg-slate-750 transition-colors"
              onClick={() => {
                reportWorkplaceInjury(localPlayerId, "Chute d'un pylône", 35);
                setApp("home");
              }}
            >
              🩹 Déclarer un accident de travail
            </button>
          </div>
        </div>
      )}

      {app === "contacts" && (
        <div className="space-y-3 animate-fade-in">
          <p className="text-[10px] tracking-[0.2em] text-slate-400 uppercase font-bold">Réseau d'urgence Rive-Nord</p>
          <ul className="space-y-2">
            {CONTACTS.map((c) => {
              const isBlocked = blockedNumbers.includes(c.phone);
              return (
                <li key={c.phone}>
                  <div className="flex w-full items-center gap-3.5 rounded-xl border border-slate-800 bg-slate-900/30 p-3.5 text-left transition-all hover:bg-slate-900/50">
                    <div className="flex size-10 items-center justify-center rounded-xl bg-slate-950">
                      <Phone className={`size-5 ${c.color}`} />
                    </div>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold text-white">{c.name}</span>
                      <span className="block text-[11px] text-slate-400 font-medium">
                        {c.phone} · {c.note}
                      </span>
                    </span>
                    <button
                      type="button"
                      onClick={() => toggleBlockNumber(c.phone)}
                      className={`p-2 rounded-lg transition-colors ${isBlocked ? "bg-red-500/20 text-red-400" : "bg-slate-800 text-slate-400 hover:text-white"}`}
                      title={isBlocked ? "Débloquer" : "Bloquer ce numéro"}
                    >
                      <ShieldOff className="size-4" />
                    </button>
                    <button
                      type="button"
                      disabled={isBlocked}
                      className="p-2 rounded-lg bg-green-600 text-white hover:bg-green-500 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                      onClick={() => {
                        if (isBlocked) return;
                        useGameStore.getState().setHud({
                          notice: c.phone === "911"
                            ? "🚨 Appel d'urgence 911 logué — autopatrouille de la SQ dépêchée !"
                            : `📱 Composition du numéro : ${c.phone}`,
                        });
                      }}
                    >
                      <Phone className="size-4" />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {app === "notes" && (
        <div className="space-y-3 animate-fade-in text-white">
          <p className="text-[10px] tracking-[0.2em] text-slate-400 uppercase font-bold">Bloc-notes Crypté</p>
          <textarea
            value={notes}
            rows={12}
            onChange={(e: any) => {
              useGameStore.getState().setHud({ notes: e.target.value });
              persist();
            }}
            placeholder="Ex: NIP de la voûte Desjardins: 859422..."
            className="w-full resize-none rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-slate-200 outline-none focus:border-slate-700 placeholder:text-slate-600 font-mono"
          />
        </div>
      )}

      {app === "radio" && (
        <div className="space-y-3 animate-fade-in">
          <p className="text-[10px] tracking-[0.2em] text-slate-400 uppercase font-bold">Radio Trans-Québec</p>
          <ul className="space-y-2">
            {QUEBEC_FM_STATIONS.map((s) => {
              const on = radioOn && radioId === s.id;
              return (
                <li key={s.id}>
                  <button
                    type="button"
                    className={`flex w-full items-center justify-between rounded-xl border p-3.5 text-left transition-all ${
                      on ? "border-purple-500/40 bg-purple-950/20" : "border-slate-800 bg-slate-900/20"
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
                      <span className="block text-sm font-semibold text-white">{s.name}</span>
                      <span className="block text-[11px] text-slate-400 font-medium">
                        {s.freq} FM · {s.genre}
                      </span>
                    </span>
                    <Radio className={`size-5 ${on ? "text-purple-400 animate-pulse" : "text-slate-600"}`} />
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </Shell>
  );
}

export function LockOverlay({ onGranted }: { onGranted: () => void }) {
  const doorName = useGameStore((s) => s.lockDoorName) ?? "Hôtel";
  const [pin, setPin] = useState("");
  const [msg, setMsg] = useState("Veuillez saisir votre NIP de sécurité");
  const [ok, setOk] = useState(false);
  const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "C", "0", "OK"];

  const apply = (res: { granted: boolean; message: string }) => {
    setMsg(res.message);
    if (res.granted) {
      setOk(true);
      persist();
      window.setTimeout(onGranted, 450);
    }
  };

  return (
    <div className="absolute inset-0 z-40 flex items-end justify-center bg-black/70 px-3 py-4 backdrop-blur-sm sm:items-center">
      <div className="w-full max-w-sm rounded-2xl border border-slate-800 bg-slate-950 p-6 shadow-2xl text-white">
        <div className="flex items-start justify-between gap-3 border-b border-slate-800 pb-3">
          <div>
            <p className="text-[10px] tracking-[0.2em] text-slate-400 uppercase font-bold">Serrure Électronique</p>
            <h2 className="font-display text-2xl italic font-bold">{doorName}</h2>
          </div>
          <button
            type="button"
            className="flex size-10 items-center justify-center rounded-full bg-slate-900 text-slate-400 hover:text-white"
            onClick={() => useGameStore.getState().closeLock()}
          >
            <X className="size-4" />
          </button>
        </div>

        <div className={`mt-4 flex items-center justify-center gap-2 rounded-xl border py-3 text-lg font-mono tracking-[0.6em] ${
          ok ? "border-emerald-500/40 bg-emerald-950/20 text-emerald-400" : "border-slate-800 bg-slate-900/30 text-slate-400"
        }`}>
          <Lock className="size-4 mr-2" />
          <span>{pin.padEnd(4, "·")}</span>
        </div>

        <p className="mt-2 text-center text-xs font-semibold text-slate-400">{msg}</p>

        <div className="mt-4 grid grid-cols-3 gap-2">
          {KEYS.map((k) => (
            <button
              key={k}
              type="button"
              className="flex h-12 items-center justify-center rounded-xl border border-slate-800 bg-slate-900/50 text-sm font-bold text-slate-200 transition-all active:scale-95 active:bg-slate-800"
              onClick={() => {
                if (ok) return;
                if (k === "C") {
                  setPin("");
                  return;
                }
                if (k === "OK") {
                  if (pin === "1234") {
                    apply({ granted: true, message: "🟢 Accès autorisé !" });
                  } else {
                    apply({ granted: false, message: "❌ NIP invalide !" });
                  }
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
          className="mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 font-bold hover:bg-blue-500 transition-all active:scale-95"
          onClick={() => {
            if (ok) return;
            apply({ granted: true, message: "🟢 Carte magnétique acceptée !" });
          }}
        >
          <CreditCard className="size-4" />
          Scanner Carte d'accès
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// EXPORTS UTILITAIRES (Bouchons de sécurité pour les autres fichiers)
// ─────────────────────────────────────────────────────────────────────────────
export function triggerNotification(targetPlayerId: string, data: any) {
  console.log(`[CELLULAIRE] ${data.title} : ${data.body}`);
}