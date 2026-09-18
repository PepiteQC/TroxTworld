import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Smartphone, MessageSquare, Phone, DollarSign, Compass, Skull,
  Settings, X, Send, ShieldAlert, CheckCircle, ChevronRight, User, ArrowLeft,
  Users, UserPlus, Edit2, Trash2, PhoneCall, Plus, Search, BookUser,
  PhoneIncoming, PhoneOff, Mic, MicOff, Volume2, Sparkles, History, ArrowUpRight, ArrowDownLeft,
  TrendingUp, BarChart2, Activity, PhoneMissed, PhoneOutgoing, Clock, Filter, Radio,
  Palette, Check, Sliders, Layers, Fingerprint, Lock, Unlock, ShieldCheck, Key, Cpu,
  Bell, Play, Square, Music, VolumeX, Sun, CloudRain, Snowflake, Wind,
  MoveUp, MoveDown, GripVertical, ToggleLeft, ToggleRight, LayoutGrid,
  ExternalLink, StickyNote, RefreshCw, CheckSquare, Keyboard, Plane, BellOff, Moon,
  Image as ImageIcon, Camera, Eye, ShoppingBag, CreditCard, ArrowUpDown, Tag
} from "lucide-react";
import { QuebecFMRadioUI } from "../../components/QuebecFMRadioUI";
import { PoliceSystem, SpeedRadarAlert } from "../police/PoliceSystem";
import {
  getAllAdminCommands,
  parseAndExecuteAdminCommand,
  subscribeAuditLogs,
  AdminAuditLogEntry,
  AdminCommand
} from "../admin/AdminCommandSystem";
import { Terminal, Shield, CheckCircle2, AlertTriangle, UserX, Ban, Gift, Zap, RotateCcw, SlidersHorizontal, FileText, Share2, Download, Printer, Copy, Siren, Hospital, Stethoscope, Flame, Building2, Landmark, MapPin, Cross, Hammer, Wrench, Briefcase, Car, Truck, Utensils, Heart, Home, Fuel, Star, XCircle, Pin, PinOff, Tags, FolderPlus, Folder } from "lucide-react";

export type PhoneWidgetId = "weather" | "contacts" | "bank" | "notes" | "radio" | "traffic";

export interface GalleryPhoto {
  id: string;
  title: string;
  url: string;
  category: "vehicules" | "nature" | "lieux" | "ia";
  location: string;
  date: string;
  promptUsed?: string;
  likes?: number;
}

export interface PhoneWidgetCatalogItem {
  id: PhoneWidgetId;
  name: string;
  category: "Météo & Infos" | "Communication" | "Finance" | "Productivité" | "Média";
  description: string;
  badge: string;
  badgeColor: string;
}

export const WIDGET_CATALOG: PhoneWidgetCatalogItem[] = [
  {
    id: "weather",
    name: "Météo Québec RP",
    category: "Météo & Infos",
    description: "Conditions climat en direct à Québec/Portneuf, température, vent & prévisions.",
    badge: "Climat Live",
    badgeColor: "bg-amber-950 text-amber-300 border-amber-500/40",
  },
  {
    id: "contacts",
    name: "Raccourcis Contacts Favoris",
    category: "Communication",
    description: "Appel & SMS rapide 1-clic pour vos contacts prioritaires et urgences RP.",
    badge: "1-Clic",
    badgeColor: "bg-blue-950 text-blue-300 border-blue-500/40",
  },
  {
    id: "bank",
    name: "Bilan Financier Desjardins",
    category: "Finance",
    description: "Aperçu Cash vs Banque Desjardins, répartition & virement express.",
    badge: "Desjardins",
    badgeColor: "bg-emerald-950 text-emerald-300 border-emerald-500/40",
  },
  {
    id: "notes",
    name: "Bloc-Notes RP & Tâches",
    category: "Productivité",
    description: "Pense-bête interactif sur l'accueil avec cases à cocher & ajout de note.",
    badge: "Interactif",
    badgeColor: "bg-purple-950 text-purple-300 border-purple-500/40",
  },
  {
    id: "radio",
    name: "Mini Lecteur Radio Québec",
    category: "Média",
    description: "Contrôle rapide Radio Québec-FM (Play/Pause, égaliseur & fréquences).",
    badge: "Audio Live",
    badgeColor: "bg-cyan-950 text-cyan-300 border-cyan-500/40",
  },
  {
    id: "traffic",
    name: "Patrouilles SPVM & Trafic",
    category: "Météo & Infos",
    description: "Patrouilles SPVM en ville, contrôles SQ & radars de vitesse.",
    badge: "Alerte RP",
    badgeColor: "bg-rose-950 text-rose-300 border-rose-500/40",
  },
];

export type RingtoneId = "default" | "cyber-bip" | "classique-rp" | "synthwave-pulse" | "quantum-chime";

export interface RingtoneOption {
  id: RingtoneId;
  name: string;
  category: string;
  description: string;
  badge: string;
  badgeColor: string;
}

export const ringtoneOptions: RingtoneOption[] = [
  {
    id: "default",
    name: "Default (Polyphonique)",
    category: "Moderne",
    description: "Mélodie polyphonique dual-tone équilibrée, élégante et harmonieuse.",
    badge: "Par Défaut",
    badgeColor: "bg-cyan-950 text-cyan-300 border-cyan-500/40",
  },
  {
    id: "cyber-bip",
    name: "Cyber-Bip Néon",
    category: "Futuriste",
    description: "Arpège rapide rétro-futuriste avec impulsions laser et bips modulés.",
    badge: "Cyberpunk",
    badgeColor: "bg-fuchsia-950 text-fuchsia-300 border-fuchsia-500/40",
  },
  {
    id: "classique-rp",
    name: "Classique RP",
    category: "Téléphone Rétro",
    description: "Sonnerie électromécanique vintage à double cloche (440Hz + 480Hz).",
    badge: "Rétro RP",
    badgeColor: "bg-amber-950 text-amber-300 border-amber-500/40",
  },
  {
    id: "synthwave-pulse",
    name: "Synthwave 80s",
    category: "Synthwave",
    description: "Basse analogique rétro pulsée avec nappe de synthétiseur chaleureuse.",
    badge: "80s Vibe",
    badgeColor: "bg-purple-950 text-purple-300 border-purple-500/40",
  },
  {
    id: "quantum-chime",
    name: "Carillon Quantique",
    category: "Cristallin",
    description: "Accord céleste d'ondes sinusoïdales pures avec résonance éthérée.",
    badge: "Éthéré",
    badgeColor: "bg-emerald-950 text-emerald-300 border-emerald-500/40",
  },
];

export interface RPMessage {
  id: string;
  threadId: string;
  sender: string;
  recipient: string;
  text: string;
  time: string;
  isRead?: boolean;
}

export interface DailyExpense {
  dayLabel: string;
  fullDate: string;
  amount: number;
}

export type ContactCategory =
  | "citizen"
  | "services"
  | "emergency"
  | "work"
  | "commercial"
  | "government";

export type ContactIconId =
  | "user"
  | "hammer"
  | "siren"
  | "wrench"
  | "car"
  | "truck"
  | "stethoscope"
  | "shield"
  | "flame"
  | "briefcase"
  | "shopping-bag"
  | "utensils"
  | "landmark"
  | "fuel"
  | "heart"
  | "home";

export interface ContactSubGroup {
  id: string;
  name: string;
  color: string;
  icon?: string;
  description?: string;
}

export interface SubGroupColorMeta {
  id: string;
  label: string;
  hex: string;
  badgeClass: string;
  borderClass: string;
  textClass: string;
  bgClass: string;
  dotClass: string;
  gradientClass: string;
}

export const SUBGROUP_COLORS: SubGroupColorMeta[] = [
  {
    id: "emerald",
    label: "Émeraude",
    hex: "#10b981",
    badgeClass: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
    borderClass: "border-emerald-500/40",
    textClass: "text-emerald-400",
    bgClass: "bg-emerald-500/10",
    dotClass: "bg-emerald-400",
    gradientClass: "from-emerald-950/40 to-slate-900",
  },
  {
    id: "purple",
    label: "Violet",
    hex: "#a855f7",
    badgeClass: "bg-purple-500/20 text-purple-300 border-purple-500/40",
    borderClass: "border-purple-500/40",
    textClass: "text-purple-400",
    bgClass: "bg-purple-500/10",
    dotClass: "bg-purple-400",
    gradientClass: "from-purple-950/40 to-slate-900",
  },
  {
    id: "rose",
    label: "Rose / Magenta",
    hex: "#f43f5e",
    badgeClass: "bg-rose-500/20 text-rose-300 border-rose-500/40",
    borderClass: "border-rose-500/40",
    textClass: "text-rose-400",
    bgClass: "bg-rose-500/10",
    dotClass: "bg-rose-400",
    gradientClass: "from-rose-950/40 to-slate-900",
  },
  {
    id: "cyan",
    label: "Cyan",
    hex: "#06b6d4",
    badgeClass: "bg-cyan-500/20 text-cyan-300 border-cyan-500/40",
    borderClass: "border-cyan-500/40",
    textClass: "text-cyan-400",
    bgClass: "bg-cyan-500/10",
    dotClass: "bg-cyan-400",
    gradientClass: "from-cyan-950/40 to-slate-900",
  },
  {
    id: "amber",
    label: "Ambre / Or",
    hex: "#f59e0b",
    badgeClass: "bg-amber-500/20 text-amber-300 border-amber-500/40",
    borderClass: "border-amber-500/40",
    textClass: "text-amber-400",
    bgClass: "bg-amber-500/10",
    dotClass: "bg-amber-400",
    gradientClass: "from-amber-950/40 to-slate-900",
  },
  {
    id: "blue",
    label: "Bleu Océan",
    hex: "#3b82f6",
    badgeClass: "bg-blue-500/20 text-blue-300 border-blue-500/40",
    borderClass: "border-blue-500/40",
    textClass: "text-blue-400",
    bgClass: "bg-blue-500/10",
    dotClass: "bg-blue-400",
    gradientClass: "from-blue-950/40 to-slate-900",
  },
  {
    id: "indigo",
    label: "Indigo",
    hex: "#6366f1",
    badgeClass: "bg-indigo-500/20 text-indigo-300 border-indigo-500/40",
    borderClass: "border-indigo-500/40",
    textClass: "text-indigo-400",
    bgClass: "bg-indigo-500/10",
    dotClass: "bg-indigo-400",
    gradientClass: "from-indigo-950/40 to-slate-900",
  },
  {
    id: "orange",
    label: "Orange Vif",
    hex: "#f97316",
    badgeClass: "bg-orange-500/20 text-orange-300 border-orange-500/40",
    borderClass: "border-orange-500/40",
    textClass: "text-orange-400",
    bgClass: "bg-orange-500/10",
    dotClass: "bg-orange-400",
    gradientClass: "from-orange-950/40 to-slate-900",
  },
  {
    id: "teal",
    label: "Turquoise",
    hex: "#14b8a6",
    badgeClass: "bg-teal-500/20 text-teal-300 border-teal-500/40",
    borderClass: "border-teal-500/40",
    textClass: "text-teal-400",
    bgClass: "bg-teal-500/10",
    dotClass: "bg-teal-400",
    gradientClass: "from-teal-950/40 to-slate-900",
  },
  {
    id: "fuchsia",
    label: "Fuchsia",
    hex: "#d946ef",
    badgeClass: "bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-500/40",
    borderClass: "border-fuchsia-500/40",
    textClass: "text-fuchsia-400",
    bgClass: "bg-fuchsia-500/10",
    dotClass: "bg-fuchsia-400",
    gradientClass: "from-fuchsia-950/40 to-slate-900",
  },
];

export function getSubGroupColorMeta(colorId?: string): SubGroupColorMeta {
  return (
    SUBGROUP_COLORS.find((c) => c.id === colorId) ||
    SUBGROUP_COLORS[0]
  );
}

export interface Contact {
  id: string;
  name: string;
  phone: string;
  notes?: string;
  category?: ContactCategory | string;
  customIcon?: ContactIconId | string;
  avatarColor?: string;
  isFavorite?: boolean;
  subGroupId?: string;
}

export interface ContactCategoryMeta {
  id: ContactCategory;
  label: string;
  shortLabel: string;
  icon: any;
  defaultIconId: ContactIconId;
  badgeClass: string;
  borderClass: string;
  colorClass: string;
  emoji: string;
}

export const CONTACT_CATEGORIES: ContactCategoryMeta[] = [
  {
    id: "emergency",
    label: "Urgences & Sécurité",
    shortLabel: "Urgences",
    icon: Siren,
    defaultIconId: "siren",
    badgeClass: "bg-red-500/20 text-red-400 border-red-500/40",
    borderClass: "border-red-500/40",
    colorClass: "text-red-400",
    emoji: "🚨",
  },
  {
    id: "services",
    label: "Services & Dépannage",
    shortLabel: "Services",
    icon: Hammer,
    defaultIconId: "hammer",
    badgeClass: "bg-amber-500/20 text-amber-400 border-amber-500/40",
    borderClass: "border-amber-500/40",
    colorClass: "text-amber-400",
    emoji: "🔨",
  },
  {
    id: "citizen",
    label: "Citoyens & Amis",
    shortLabel: "Citoyens",
    icon: User,
    defaultIconId: "user",
    badgeClass: "bg-cyan-500/20 text-cyan-400 border-cyan-500/40",
    borderClass: "border-cyan-500/40",
    colorClass: "text-cyan-400",
    emoji: "👤",
  },
  {
    id: "work",
    label: "Travail & Affaires",
    shortLabel: "Travail",
    icon: Briefcase,
    defaultIconId: "briefcase",
    badgeClass: "bg-blue-500/20 text-blue-400 border-blue-500/40",
    borderClass: "border-blue-500/40",
    colorClass: "text-blue-400",
    emoji: "💼",
  },
  {
    id: "commercial",
    label: "Commerces & Resto",
    shortLabel: "Commerces",
    icon: ShoppingBag,
    defaultIconId: "shopping-bag",
    badgeClass: "bg-purple-500/20 text-purple-400 border-purple-500/40",
    borderClass: "border-purple-500/40",
    colorClass: "text-purple-400",
    emoji: "🛍️",
  },
  {
    id: "government",
    label: "Services Publics & Ville",
    shortLabel: "Public",
    icon: Landmark,
    defaultIconId: "landmark",
    badgeClass: "bg-emerald-500/20 text-emerald-400 border-emerald-500/40",
    borderClass: "border-emerald-500/40",
    colorClass: "text-emerald-400",
    emoji: "🏛️",
  },
];

export interface ContactIconMeta {
  id: ContactIconId;
  label: string;
  icon: any;
  category: ContactCategory;
  colorClass: string;
  emoji: string;
}

export const CONTACT_ICONS_CATALOG: ContactIconMeta[] = [
  { id: "hammer", label: "Marteau (Services)", icon: Hammer, category: "services", colorClass: "text-amber-400", emoji: "🔨" },
  { id: "siren", label: "Gyrophare (Urgences)", icon: Siren, category: "emergency", colorClass: "text-red-400", emoji: "🚨" },
  { id: "wrench", label: "Clé à molette (Mécanique)", icon: Wrench, category: "services", colorClass: "text-orange-400", emoji: "🔧" },
  { id: "car", label: "Véhicule / Taxi", icon: Car, category: "services", colorClass: "text-yellow-400", emoji: "🚗" },
  { id: "truck", label: "Remorquage / Camion", icon: Truck, category: "services", colorClass: "text-amber-300", emoji: "🚚" },
  { id: "stethoscope", label: "Santé / Hôpital", icon: Stethoscope, category: "emergency", colorClass: "text-emerald-400", emoji: "🩺" },
  { id: "shield", label: "Police / Sécurité", icon: Shield, category: "emergency", colorClass: "text-blue-400", emoji: "🛡️" },
  { id: "flame", label: "Pompiers / Incendie", icon: Flame, category: "emergency", colorClass: "text-rose-500", emoji: "🔥" },
  { id: "briefcase", label: "Travail / Affaires", icon: Briefcase, category: "work", colorClass: "text-indigo-400", emoji: "💼" },
  { id: "shopping-bag", label: "Boutique / Magasin", icon: ShoppingBag, category: "commercial", colorClass: "text-pink-400", emoji: "🛍️" },
  { id: "utensils", label: "Restaurant / Nourriture", icon: Utensils, category: "commercial", colorClass: "text-amber-400", emoji: "🍴" },
  { id: "fuel", label: "Station Essence", icon: Fuel, category: "services", colorClass: "text-emerald-300", emoji: "⛽" },
  { id: "landmark", label: "Mairie / Justice", icon: Landmark, category: "government", colorClass: "text-teal-400", emoji: "🏛️" },
  { id: "heart", label: "Coup de Cœur / Proche", icon: Heart, category: "citizen", colorClass: "text-rose-400", emoji: "❤️" },
  { id: "home", label: "Domicile / Logement", icon: Home, category: "citizen", colorClass: "text-blue-300", emoji: "🏠" },
  { id: "user", label: "Citoyen Standard", icon: User, category: "citizen", colorClass: "text-cyan-400", emoji: "👤" },
];

export const getContactIconMeta = (iconId?: string, category?: string): ContactIconMeta => {
  if (iconId) {
    const found = CONTACT_ICONS_CATALOG.find((item) => item.id === iconId);
    if (found) return found;
  }
  if (category) {
    const cat = CONTACT_CATEGORIES.find((c) => c.id === category);
    if (cat) {
      const defaultIcon = CONTACT_ICONS_CATALOG.find((item) => item.id === cat.defaultIconId);
      if (defaultIcon) return defaultIcon;
    }
  }
  return CONTACT_ICONS_CATALOG.find((item) => item.id === "user") || CONTACT_ICONS_CATALOG[0];
};

export interface CallLogItem {
  id: string;
  callerName: string;
  callerNumber: string;
  type: "missed" | "incoming" | "outgoing";
  timestamp: string;
  duration?: string;
  avatarColor?: string;
}

export interface IncomingCall {
  id: string;
  callerName: string;
  callerNumber: string;
  callerTitle?: string;
  avatarColor?: string;
}

export interface ActiveCall {
  callerName: string;
  callerNumber: string;
  avatarColor?: string;
  startTime: number;
}

export interface BankTransaction {
  id: string;
  recipient: string;
  amount: number;
  date: string;
  type: "transfer_out" | "transfer_in" | "salary" | "purchase";
  category?: string;
  note?: string;
}

interface ExpenseChart7DaysProps {
  expenses: DailyExpense[];
  selectedDayIndex: number | null;
  onSelectDay: (idx: number | null) => void;
}

export function ExpenseChart7Days({ expenses, selectedDayIndex, onSelectDay }: ExpenseChart7DaysProps) {
  const width = 280;
  const height = 115;
  const paddingX = 22;
  const paddingTop = 22;
  const paddingBottom = 26;

  const maxAmount = Math.max(...expenses.map((e) => e.amount), 100);
  const minAmount = 0;

  const chartWidth = width - paddingX * 2;
  const chartHeight = height - paddingTop - paddingBottom;

  const points = expenses.map((item, idx) => {
    const x = paddingX + (idx / Math.max(expenses.length - 1, 1)) * chartWidth;
    const y = height - paddingBottom - ((item.amount - minAmount) / (maxAmount - minAmount || 1)) * chartHeight;
    return { x, y, ...item, idx };
  });

  // Calculate smooth cubic bezier path
  let pathD = "";
  if (points.length > 0) {
    pathD = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i === 0 ? i : i - 1];
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = points[i + 2 < points.length ? i + 2 : i + 1];

      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;

      pathD += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
    }
  }

  const areaD = points.length > 0
    ? `${pathD} L ${points[points.length - 1].x} ${height - paddingBottom} L ${points[0].x} ${height - paddingBottom} Z`
    : "";

  const totalExpense = expenses.reduce((acc, curr) => acc + curr.amount, 0);
  const avgExpense = Math.round(totalExpense / (expenses.length || 1));
  const maxDay = expenses.reduce((max, curr) => (curr.amount > max.amount ? curr : max), expenses[0] || { amount: 0, dayLabel: "-" });
  const selectedDay = selectedDayIndex !== null ? points[selectedDayIndex] : null;

  return (
    <div className="bg-slate-950/90 border border-emerald-500/30 rounded-2xl p-3 shadow-[0_0_20px_rgba(16,185,129,0.15)] flex flex-col gap-2 shrink-0">
      {/* Header Stats */}
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[9px] text-slate-400 font-extrabold uppercase tracking-wider flex items-center gap-1">
            <TrendingUp className="w-3 h-3 text-emerald-400" />
            Évolution des Dépenses (7J)
          </div>
          <div className="text-sm font-black text-white font-mono flex items-baseline gap-2">
            <span>${totalExpense.toLocaleString()}</span>
            <span className="text-[9px] text-emerald-400 font-normal">Moy. ${avgExpense}/j</span>
          </div>
        </div>

        {selectedDay ? (
          <div className="text-right bg-emerald-950/90 border border-emerald-500/40 px-2 py-1 rounded-lg animate-fade-in shadow-[0_0_10px_rgba(16,185,129,0.2)]">
            <div className="text-[9px] text-emerald-300 font-bold">{selectedDay.dayLabel} ({selectedDay.fullDate})</div>
            <div className="text-xs font-black text-white font-mono">${selectedDay.amount}</div>
          </div>
        ) : (
          <div className="text-right text-[9px] text-slate-400 font-mono">
            <span>Pic max: </span>
            <span className="text-emerald-400 font-bold">${maxDay?.amount}</span>
          </div>
        )}
      </div>

      {/* SVG Line Chart */}
      <div className="relative w-full overflow-hidden bg-slate-900/70 rounded-xl p-1 border border-slate-800/80">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto overflow-visible">
          <defs>
            <linearGradient id="emeraldGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.45" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
            </linearGradient>
            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="2.5" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Horizontal Grid lines */}
          <line x1={paddingX} y1={paddingTop} x2={width - paddingX} y2={paddingTop} stroke="#334155" strokeDasharray="3 3" strokeOpacity="0.35" />
          <line x1={paddingX} y1={paddingTop + chartHeight / 2} x2={width - paddingX} y2={paddingTop + chartHeight / 2} stroke="#334155" strokeDasharray="3 3" strokeOpacity="0.35" />
          <line x1={paddingX} y1={height - paddingBottom} x2={width - paddingX} y2={height - paddingBottom} stroke="#334155" strokeOpacity="0.6" />

          {/* Gradient Area under path */}
          <path d={areaD} fill="url(#emeraldGradient)" />

          {/* Smooth Line Path */}
          <path
            d={pathD}
            fill="none"
            stroke="#10b981"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            filter="url(#glow)"
          />

          {/* Interactive Data Points */}
          {points.map((pt) => {
            const isSelected = selectedDayIndex === pt.idx;
            return (
              <g key={pt.idx} className="cursor-pointer" onClick={() => onSelectDay(isSelected ? null : pt.idx)}>
                {/* Glow ring if selected */}
                {isSelected && (
                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    r="7"
                    fill="#10b981"
                    fillOpacity="0.35"
                    className="animate-pulse"
                  />
                )}
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r={isSelected ? "5" : "3.5"}
                  fill={isSelected ? "#00ffe7" : "#10b981"}
                  stroke="#0f172a"
                  strokeWidth="1.5"
                  className="transition-all hover:r-5"
                />
                {/* X Axis Labels */}
                <text
                  x={pt.x}
                  y={height - 7}
                  textAnchor="middle"
                  fill={isSelected ? "#34d399" : "#64748b"}
                  fontSize="8"
                  fontWeight={isSelected ? "bold" : "normal"}
                  className="font-mono select-none"
                >
                  {pt.dayLabel}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      <div className="text-[8.5px] text-slate-500 text-center font-mono italic">
        Appuyez sur un jour pour afficher la dépense exacte
      </div>
    </div>
  );
}

export interface PhoneAppProps {
  isOpen: boolean;
  onClose: () => void;
  playerName: string;
  cashAmount: number;
  bankAmount: number;
  onPayCash?: (target: string, amount: number) => void;
  onSetWaypoint?: (x: number, z: number) => void;
  onSendAdminAlert?: (message: string) => void;
  onAdminCommand?: (cmd: string, args: string[]) => void;
}

const phoneScreenVariants = {
  initial: (dir: number) => ({
    x: dir > 0 ? "100%" : "-100%",
    opacity: 0,
    scale: 0.97,
  }),
  animate: {
    x: 0,
    opacity: 1,
    scale: 1,
    transition: {
      type: "spring" as const,
      stiffness: 350,
      damping: 30,
      mass: 0.8,
    },
  },
  exit: (dir: number) => ({
    x: dir > 0 ? "-30%" : "100%",
    opacity: 0,
    scale: 0.97,
    transition: {
      duration: 0.18,
      ease: "easeInOut" as const,
    },
  }),
};

// Staggered fade animation variants for Home Screen app icons
const homeStaggerContainer = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.06,
    },
  },
};

const homeStaggerItem = {
  hidden: { opacity: 0, y: 16, scale: 0.88 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: "spring" as const,
      stiffness: 280,
      damping: 22,
    },
  },
};

// Helper to render dynamic animated wallpaper backgrounds for the Phone
const renderDynamicWallpaper = (style: "neon" | "minimal" | "realistic" | "aurora" | "cyberpunk", customUrl?: string | null) => {
  if (customUrl) {
    return (
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0 bg-slate-950">
        <img
          src={customUrl}
          alt="Fond d'écran Galerie RP"
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover opacity-85"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950/40 via-transparent to-slate-950/80" />
      </div>
    );
  }

  switch (style) {
    case "neon":
      return (
        <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
          {/* Pulsing Neon Gradient Orbs */}
          <motion.div
            animate={{
              scale: [1, 1.3, 1],
              x: [0, 20, -10, 0],
              y: [0, -20, 10, 0],
              opacity: [0.35, 0.6, 0.35],
            }}
            transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
            className="absolute -top-12 -left-12 w-56 h-56 bg-cyan-500/30 rounded-full blur-3xl"
          />
          <motion.div
            animate={{
              scale: [1, 1.4, 1],
              x: [0, -30, 15, 0],
              y: [0, 30, -15, 0],
              opacity: [0.3, 0.55, 0.3],
            }}
            transition={{ duration: 9, repeat: Infinity, ease: "easeInOut", delay: 1 }}
            className="absolute top-1/2 -right-16 w-60 h-60 bg-purple-600/35 rounded-full blur-3xl"
          />
          <motion.div
            animate={{
              scale: [1, 1.25, 1],
              opacity: [0.25, 0.5, 0.25],
            }}
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut", delay: 2 }}
            className="absolute -bottom-16 left-10 w-52 h-52 bg-fuchsia-500/30 rounded-full blur-3xl"
          />

          {/* Cyber Neon Grid overlay */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#00f0ff0d_1px,transparent_1px),linear-gradient(to_bottom,#00f0ff0d_1px,transparent_1px)] bg-[size:24px_24px] opacity-40" />

          {/* Scanning laser line */}
          <motion.div
            animate={{ y: ["0%", "100%", "0%"] }}
            transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
            className="absolute inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent shadow-[0_0_12px_rgba(0,255,231,0.8)] opacity-70"
          />
        </div>
      );

    case "minimal":
      return (
        <div className="absolute inset-0 pointer-events-none overflow-hidden z-0 bg-[#070a12]">
          {/* Fine geometric slate grid */}
          <div className="absolute inset-0 bg-[radial-gradient(#334155_1.5px,transparent_1.5px)] [background-size:18px_18px] opacity-30" />
          
          {/* Soft monochrome ambient backlight */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 bg-slate-400/10 rounded-full blur-2xl" />
          <div className="absolute bottom-10 right-0 w-48 h-48 bg-slate-700/15 rounded-full blur-3xl" />
        </div>
      );

    case "realistic":
      return (
        <div className="absolute inset-0 pointer-events-none overflow-hidden z-0 bg-gradient-to-b from-slate-950 via-[#0b1021] to-slate-950">
          {/* Realistic City Night Bokeh Lights */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-900/25 via-indigo-950/40 to-slate-950" />
          
          {/* Floating Bokeh Light Orbs */}
          {[
            { top: "15%", left: "20%", size: "w-16 h-16", color: "bg-amber-500/25", delay: 0 },
            { top: "35%", left: "70%", size: "w-20 h-20", color: "bg-cyan-500/20", delay: 1.5 },
            { top: "65%", left: "30%", size: "w-24 h-24", color: "bg-indigo-500/20", delay: 3 },
            { top: "80%", left: "80%", size: "w-14 h-14", color: "bg-amber-400/20", delay: 0.8 },
          ].map((b, i) => (
            <motion.div
              key={i}
              animate={{
                y: [0, -15, 0],
                opacity: [0.3, 0.7, 0.3],
                scale: [1, 1.15, 1],
              }}
              transition={{ duration: 6 + i, repeat: Infinity, ease: "easeInOut", delay: b.delay }}
              className={`absolute ${b.top} ${b.left} ${b.size} ${b.color} rounded-full blur-xl`}
            />
          ))}

          {/* Photorealistic glass reflection diagonal sheen */}
          <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/[0.03] to-transparent pointer-events-none" />
        </div>
      );

    case "aurora":
      return (
        <div className="absolute inset-0 pointer-events-none overflow-hidden z-0 bg-[#030712]">
          {/* Aurora Waves */}
          <motion.div
            animate={{
              x: ["-10%", "10%", "-10%"],
              opacity: [0.4, 0.7, 0.4],
              scaleY: [1, 1.2, 1],
            }}
            transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
            className="absolute -top-10 inset-x-0 h-72 bg-gradient-to-b from-emerald-500/30 via-teal-500/20 to-transparent blur-2xl transform -skew-y-12"
          />
          <motion.div
            animate={{
              x: ["10%", "-10%", "10%"],
              opacity: [0.3, 0.6, 0.3],
            }}
            transition={{ duration: 12, repeat: Infinity, ease: "easeInOut", delay: 2 }}
            className="absolute top-20 inset-x-0 h-80 bg-gradient-to-b from-purple-600/25 via-indigo-500/15 to-transparent blur-3xl transform skew-y-6"
          />

          {/* Floating Star Dots */}
          {[12, 35, 68, 82, 45, 90, 25, 75].map((pos, idx) => (
            <motion.div
              key={idx}
              animate={{ opacity: [0.2, 0.9, 0.2], scale: [0.8, 1.4, 0.8] }}
              transition={{ duration: 3 + (idx % 3), repeat: Infinity, delay: idx * 0.4 }}
              className="absolute w-1 h-1 bg-emerald-200 rounded-full shadow-[0_0_6px_rgba(52,211,153,0.8)]"
              style={{ top: `${(idx * 11) % 90}%`, left: `${pos}%` }}
            />
          ))}
        </div>
      );

    case "cyberpunk":
      return (
        <div className="absolute inset-0 pointer-events-none overflow-hidden z-0 bg-[#020b08]">
          {/* Matrix Cyber Green Grid & Glow */}
          <motion.div
            animate={{
              opacity: [0.25, 0.5, 0.25],
            }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            className="absolute inset-0 bg-[linear-gradient(to_right,#00ff660e_1px,transparent_1px),linear-gradient(to_bottom,#00ff660e_1px,transparent_1px)] bg-[size:16px_16px]"
          />
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-64 h-64 bg-emerald-500/20 rounded-full blur-3xl" />

          {/* TroxT Intellectus Neural Nodes */}
          <motion.div
            animate={{
              scale: [0.95, 1.05, 0.95],
              opacity: [0.3, 0.6, 0.3],
            }}
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
            className="absolute bottom-10 left-1/2 -translate-x-1/2 text-center"
          >
            <div className="text-[9px] font-mono font-black text-emerald-400/40 tracking-[0.3em] uppercase">
              TroxT Intellectus Neural Matrix
            </div>
          </motion.div>
        </div>
      );

    default:
      return null;
  }
};

export const PhoneApp: React.FC<PhoneAppProps> = ({
  isOpen,
  onClose,
  playerName,
  cashAmount,
  bankAmount,
  onPayCash,
  onSetWaypoint,
  onSendAdminAlert,
  onAdminCommand,
}) => {
  const [activeApp, setActiveAppState] = useState<"home" | "contacts" | "calls" | "messages" | "bank" | "gps" | "darkweb" | "admin" | "radio" | "settings" | "gallery">("home");
  const [slideDirection, setSlideDirection] = useState<number>(1);

  // Admin App States
  const [adminTab, setAdminTab] = useState<"commands" | "logs" | "support">("commands");
  const [adminSearch, setAdminSearch] = useState<string>("");
  const [adminCategoryFilter, setAdminCategoryFilter] = useState<string>("all");
  const [adminParamInputs, setAdminParamInputs] = useState<Record<string, string>>({});
  const [adminToast, setAdminToast] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [auditLogsState, setAuditLogsState] = useState<AdminAuditLogEntry[]>([]);
  const [logsSearchFilter, setLogsSearchFilter] = useState<string>("");
  const [pendingPhoneConfirmCmd, setPendingPhoneConfirmCmd] = useState<{ cmd: AdminCommand; explicitArgs?: string; fullCmdStr: string } | null>(null);

  // GPS App States
  const [gpsCategoryFilter, setGpsCategoryFilter] = useState<"all" | "urgences" | "commerces" | "rp">("all");
  const [gpsSearchQuery, setGpsSearchQuery] = useState<string>("");
  const [gpsToastMessage, setGpsToastMessage] = useState<string | null>(null);

  // Traffic Radar Widget States
  const [trafficRadarAlerts, setTrafficRadarAlerts] = useState<SpeedRadarAlert[]>(() => PoliceSystem.getRadarAlerts());
  const [trafficRadarToast, setTrafficRadarToast] = useState<string | null>(null);

  // Sync radar alerts periodically when phone is open
  useEffect(() => {
    if (!isOpen) return;
    setTrafficRadarAlerts(PoliceSystem.getRadarAlerts());
    const interval = setInterval(() => {
      setTrafficRadarAlerts(PoliceSystem.getRadarAlerts());
    }, 2000);
    return () => clearInterval(interval);
  }, [isOpen]);

  const handleClearTrafficAlerts = () => {
    PoliceSystem.clearRadarAlerts();
    setTrafficRadarAlerts([]);
    setTrafficRadarToast("Historique des alertes radar effacé.");
    setTimeout(() => setTrafficRadarToast(null), 3000);
  };

  const handleSimulateRadarScan = () => {
    const alert = PoliceSystem.triggerSimulatedRadarScan();
    setTrafficRadarAlerts(PoliceSystem.getRadarAlerts());
    setTrafficRadarToast(`⚡ Nouvel excès : ${alert.vehicleName} (${alert.speedKmH} km/h)`);
    setTimeout(() => setTrafficRadarToast(null), 3500);
  };

  useEffect(() => {
    const unsubscribe = subscribeAuditLogs((logs) => {
      setAuditLogsState(logs);
    });
    return () => unsubscribe();
  }, []);

  const isSensitivePhoneCommand = (cmdName: string): boolean => {
    const clean = cmdName.trim().toLowerCase();
    const SENSITIVE_NAMES = [
      'ban', 'kick', 'clearprops', 'clear', 'wipe', 'reset', 'killall',
      'unban', 'lockout', 'poweroutage', 'mod:ban', 'mod:kick'
    ];
    return SENSITIVE_NAMES.includes(clean);
  };

  const handleExecutePhoneCommandDirectly = (cmd: AdminCommand, explicitArgs?: string) => {
    const rawArgs = explicitArgs !== undefined ? explicitArgs : (adminParamInputs[cmd.id] || "");
    const fullCmdStr = rawArgs.trim() ? `/${cmd.name} ${rawArgs.trim()}` : `/${cmd.name}`;

    let res;
    if (onAdminCommand) {
      const parts = rawArgs.trim() ? rawArgs.trim().split(/\s+/) : [];
      onAdminCommand(cmd.name, parts);
      res = { success: true, message: `Commande /${cmd.name} exécutée.` };
    } else {
      res = parseAndExecuteAdminCommand(fullCmdStr, {
        executorName: playerName || "Admin Phone",
        executorRole: "superadmin",
      });
    }

    setAdminToast({
      type: res.success ? "success" : "error",
      message: res.message || `Commande /${cmd.name} exécutée.`,
    });

    setTimeout(() => {
      setAdminToast(null);
    }, 3500);
  };

  const handleExecutePhoneCommand = (cmd: AdminCommand, explicitArgs?: string) => {
    const rawArgs = explicitArgs !== undefined ? explicitArgs : (adminParamInputs[cmd.id] || "");
    const fullCmdStr = rawArgs.trim() ? `/${cmd.name} ${rawArgs.trim()}` : `/${cmd.name}`;

    if (isSensitivePhoneCommand(cmd.name)) {
      setPendingPhoneConfirmCmd({ cmd, explicitArgs, fullCmdStr });
      return;
    }
    handleExecutePhoneCommandDirectly(cmd, explicitArgs);
  };

  // Biometric Authentication Overlay States
  const [isLocked, setIsLocked] = useState<boolean>(true);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [scanProgress, setScanProgress] = useState<number>(0);
  const [scanPhase, setScanPhase] = useState<"idle" | "scanning" | "success" | "denied">("idle");
  const [authMethod, setAuthMethod] = useState<"fingerprint" | "pin">("fingerprint");
  const [pinCode, setPinCode] = useState<string>("");
  const [isGlitching, setIsGlitching] = useState<boolean>(false);
  const [glitchKey, setGlitchKey] = useState<number>(0);

  // Phone Container Animation Triggers (Subtle error shake & call pulse)
  const [errorShakeKey, setErrorShakeKey] = useState<number>(0);
  const [callPulseKey, setCallPulseKey] = useState<number>(0);

  const triggerPhoneError = () => {
    setErrorShakeKey((prev) => prev + 1);
  };

  const triggerCallPulse = () => {
    setCallPulseKey((prev) => prev + 1);
  };

  // Trigger Lock screen whenever phone opens
  useEffect(() => {
    if (isOpen) {
      setIsLocked(true);
      setIsScanning(false);
      setScanProgress(0);
      setScanPhase("idle");
      setPinCode("");
      setIsGlitching(false);
    }
  }, [isOpen]);

  // Audio feedback synthesizer for biometric scanning & glitch errors
  const playBiometricSound = (type: "scan" | "success" | "fail") => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      if (ctx.state === "suspended") ctx.resume();

      if (type === "scan") {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(350, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(850, ctx.currentTime + 0.12);
        gain.gain.setValueAtTime(0.06, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.13);
      } else if (type === "success") {
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain = ctx.createGain();
        osc1.type = "triangle";
        osc2.type = "sine";
        osc1.frequency.setValueAtTime(523.25, ctx.currentTime);
        osc2.frequency.setValueAtTime(659.25, ctx.currentTime + 0.08);
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(ctx.destination);
        osc1.start();
        osc2.start(ctx.currentTime + 0.08);
        osc1.stop(ctx.currentTime + 0.3);
        osc2.stop(ctx.currentTime + 0.3);
      } else if (type === "fail") {
        // Multi-pitch glitch noise synthesizer
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain = ctx.createGain();
        osc1.type = "sawtooth";
        osc2.type = "square";
        osc1.frequency.setValueAtTime(140, ctx.currentTime);
        osc1.frequency.setValueAtTime(220, ctx.currentTime + 0.08);
        osc1.frequency.setValueAtTime(90, ctx.currentTime + 0.18);
        osc2.frequency.setValueAtTime(450, ctx.currentTime);
        osc2.frequency.setValueAtTime(120, ctx.currentTime + 0.12);
        gain.gain.setValueAtTime(0.12, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(ctx.destination);
        osc1.start();
        osc2.start();
        osc1.stop(ctx.currentTime + 0.36);
        osc2.stop(ctx.currentTime + 0.36);
      }
    } catch (e) {
      // ignore audio context failures
    }
  };

  // Keyboard Typing Sound Effect Synthesizer (Realistic Mechanical Click & Clack)
  const playKeyTypingSound = (keyType: "default" | "space" | "backspace" | "enter" = "default") => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      if (ctx.state === "suspended") ctx.resume();

      const now = ctx.currentTime;
      const gain = ctx.createGain();

      if (keyType === "space" || keyType === "enter") {
        // Space / Enter: Deeper tactile thud
        const osc = ctx.createOscillator();
        osc.type = "sine";
        osc.frequency.setValueAtTime(190 + Math.random() * 30, now);
        osc.frequency.exponentialRampToValueAtTime(65, now + 0.038);

        gain.gain.setValueAtTime(0.07, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.042);
      } else if (keyType === "backspace") {
        // Backspace: Soft spring release click
        const osc = ctx.createOscillator();
        osc.type = "triangle";
        osc.frequency.setValueAtTime(420 + Math.random() * 40, now);
        osc.frequency.exponentialRampToValueAtTime(140, now + 0.03);

        gain.gain.setValueAtTime(0.05, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.032);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.035);
      } else {
        // Character Key: Crisp mechanical key switch sound with pitch jitter
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();

        const baseFreq = 780 + Math.random() * 320;
        osc1.type = "sine";
        osc2.type = "triangle";

        osc1.frequency.setValueAtTime(baseFreq, now);
        osc1.frequency.exponentialRampToValueAtTime(130, now + 0.024);

        osc2.frequency.setValueAtTime(baseFreq * 1.4, now);
        osc2.frequency.exponentialRampToValueAtTime(210, now + 0.018);

        gain.gain.setValueAtTime(0.045, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.026);

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(ctx.destination);

        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + 0.028);
        osc2.stop(now + 0.028);
      }
    } catch (e) {
      // Audio Context fail-safe
    }
  };

  // Keyboard Typing Sound Effect setting state
  const [isTypingSoundEnabled, setIsTypingSoundEnabled] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem("troxt_phone_typing_sound");
      if (saved !== null) return saved === "true";
    } catch (e) {}
    return true;
  });

  const toggleTypingSound = () => {
    const nextVal = !isTypingSoundEnabled;
    setIsTypingSoundEnabled(nextVal);
    try {
      localStorage.setItem("troxt_phone_typing_sound", String(nextVal));
    } catch (e) {}
    if (nextVal) {
      playKeyTypingSound("default");
    } else {
      playBiometricSound("scan");
    }
  };

  const handleInputKeyDown = (e: React.KeyboardEvent) => {
    if (!isTypingSoundEnabled) return;
    if (e.key === "Enter") {
      playKeyTypingSound("enter");
    } else if (e.key === " ") {
      playKeyTypingSound("space");
    } else if (e.key === "Backspace") {
      playKeyTypingSound("backspace");
    } else if (e.key.length === 1) {
      playKeyTypingSound("default");
    }
  };

  // Trigger Chromatic Aberration & Glitch Animation for Incorrect PIN / Biometric Denied
  const triggerGlitch = () => {
    setIsGlitching(true);
    setScanPhase("denied");
    playBiometricSound("fail");
    setGlitchKey((prev) => prev + 1);
    triggerPhoneError(); // Subtle shake animation on error

    setTimeout(() => {
      setIsGlitching(false);
      setPinCode("");
      setScanPhase("idle");
    }, 750);
  };

  // Trigger Fingerprint Scan process
  const handleStartScan = () => {
    if (isScanning || scanPhase === "success" || isGlitching) return;

    setIsScanning(true);
    setScanPhase("scanning");
    setScanProgress(0);
    playBiometricSound("scan");

    let current = 0;
    const interval = setInterval(() => {
      current += Math.floor(Math.random() * 8) + 7;
      if (current >= 100) {
        current = 100;
        setScanProgress(100);
        clearInterval(interval);
        setScanPhase("success");
        setIsScanning(false);
        playBiometricSound("success");

        setTimeout(() => {
          setIsLocked(false);
        }, 500);
      } else {
        setScanProgress(current);
        if (current % 25 === 0) playBiometricSound("scan");
      }
    }, 45);
  };

  // Quick bypass unlock
  const handleBypassUnlock = () => {
    if (isGlitching) return;
    setIsScanning(true);
    setScanPhase("scanning");
    setScanProgress(100);
    playBiometricSound("success");
    setScanPhase("success");
    setIsScanning(false);
    setTimeout(() => {
      setIsLocked(false);
    }, 300);
  };

  // Accepted PINs list
  const VALID_PINS = ["1337", "7777", "0000", "1234"];

  // PIN Keypad handler
  const handleKeyPressPin = (digit: string) => {
    if (pinCode.length >= 4 || isGlitching) return;

    if (digit === "") {
      // Manual submit check
      if (pinCode.length > 0 && !VALID_PINS.includes(pinCode)) {
        triggerGlitch();
      }
      return;
    }

    const newPin = pinCode + digit;
    setPinCode(newPin);
    playBiometricSound("scan");

    if (newPin.length === 4) {
      if (VALID_PINS.includes(newPin)) {
        setScanPhase("success");
        playBiometricSound("success");
        setTimeout(() => {
          setIsLocked(false);
        }, 450);
      } else {
        // INCORRECT PIN: Trigger Glitch Animation & Chromatic Aberration Shift
        triggerGlitch();
      }
    }
  };

  const handleClearPin = () => {
    if (isGlitching) return;
    setPinCode("");
  };

  // Dynamic Wallpaper state with local persistence
  const [wallpaper, setWallpaper] = useState<"neon" | "minimal" | "realistic" | "aurora" | "cyberpunk">(() => {
    try {
      const saved = localStorage.getItem("troxt_phone_wallpaper");
      if (saved && ["neon", "minimal", "realistic", "aurora", "cyberpunk"].includes(saved)) {
        return saved as any;
      }
    } catch (e) {
      // ignore
    }
    return "neon";
  });

  // Settings Sub-Tab State
  const [settingsTab, setSettingsTab] = useState<"widgets" | "wallpapers" | "ringtones" | "security">("widgets");

  // Airplane Mode & Do Not Disturb States with Persistence
  const [isAirplaneMode, setIsAirplaneMode] = useState<boolean>(() => {
    try {
      return localStorage.getItem("troxt_phone_airplane_mode") === "true";
    } catch {
      return false;
    }
  });

  const [isDoNotDisturb, setIsDoNotDisturb] = useState<boolean>(() => {
    try {
      return localStorage.getItem("troxt_phone_dnd") === "true";
    } catch {
      return false;
    }
  });

  const toggleAirplaneMode = () => {
    playBiometricSound("scan");
    setIsAirplaneMode((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("troxt_phone_airplane_mode", String(next));
      } catch {}
      setCallToast(next ? "✈️ Mode Avion Activé — Reseau & Appels Désactivés" : "📡 Mode Avion Désactivé — Réseau Rétabli");
      setTimeout(() => setCallToast(null), 3000);
      return next;
    });
  };

  const toggleDoNotDisturb = () => {
    playBiometricSound("scan");
    setIsDoNotDisturb((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("troxt_phone_dnd", String(next));
      } catch {}
      setCallToast(next ? "🌙 Ne Pas Déranger Activé — Notifications Silencieuses" : "🔔 Ne Pas Déranger Désactivé");
      setTimeout(() => setCallToast(null), 3000);
      return next;
    });
  };

  // Custom Wallpaper State with Persistence
  const [customWallpaperUrl, setCustomWallpaperUrl] = useState<string | null>(() => {
    try {
      return localStorage.getItem("troxt_phone_custom_wallpaper") || null;
    } catch {
      return null;
    }
  });

  const handleSetCustomWallpaper = (url: string | null) => {
    setCustomWallpaperUrl(url);
    try {
      if (url) {
        localStorage.setItem("troxt_phone_custom_wallpaper", url);
      } else {
        localStorage.removeItem("troxt_phone_custom_wallpaper");
      }
    } catch {}
    playBiometricSound("scan");
    setCallToast(url ? "🎨 Fond d'écran de Galerie appliqué !" : "🎨 Fond d'écran réinitialisé");
    setTimeout(() => setCallToast(null), 3000);
  };

  // Gallery App States & Persistence
  const [galleryFilter, setGalleryFilter] = useState<"all" | "vehicules" | "nature" | "lieux" | "ia">("all");
  const [selectedGalleryPhoto, setSelectedGalleryPhoto] = useState<GalleryPhoto | null>(null);
  const [isCapturingIA, setIsCapturingIA] = useState<boolean>(false);
  const [capturePromptInput, setCapturePromptInput] = useState<string>("");
  const [captureCategory, setCaptureCategory] = useState<"vehicules" | "nature" | "lieux" | "ia">("lieux");
  const [captureLocation, setCaptureLocation] = useState<string>("Route 138, Portneuf");
  const [isGeneratingPhoto, setIsGeneratingPhoto] = useState<boolean>(false);

  const [galleryPhotos, setGalleryPhotos] = useState<GalleryPhoto[]>(() => {
    try {
      const saved = localStorage.getItem("troxt_phone_gallery");
      if (saved) return JSON.parse(saved);
    } catch {}
    return [
      {
        id: "photo_1",
        title: "Supercar Québec sur la 138",
        url: "https://images.unsplash.com/photo-1617814076367-b759c7d7e738?auto=format&fit=crop&w=800&q=80",
        category: "vehicules",
        location: "Route 138, Neuville",
        date: "Aujourd'hui, 15:42",
        promptUsed: "Supercar sportive rouge métallisée filant sur la Route 138 au coucher du soleil.",
        likes: 18
      },
      {
        id: "photo_2",
        title: "Roulotte Chez Gaston (Poutine RP)",
        url: "https://images.unsplash.com/photo-1586816001966-79b736744398?auto=format&fit=crop&w=800&q=80",
        category: "lieux",
        location: "Portneuf Centre",
        date: "Aujourd'hui, 12:15",
        promptUsed: "Roulotte à Poutine Chez Gaston sous les éclairages néons du soir.",
        likes: 34
      },
      {
        id: "photo_3",
        title: "Coucher de Soleil sur le Fleuve",
        url: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80",
        category: "nature",
        location: "Fleuve Saint-Laurent",
        date: "Hier, 19:30",
        promptUsed: "Bord du fleuve Saint-Laurent avec reflets dorés et collines de Portneuf.",
        likes: 27
      },
      {
        id: "photo_4",
        title: "Manoir Domaine Céleste",
        url: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80",
        category: "lieux",
        location: "Domaine Portneuf",
        date: "Hier, 10:05",
        promptUsed: "Manoir luxueux contemporain avec grands vitraux et jardin.",
        likes: 42
      },
      {
        id: "photo_5",
        title: "Patrouille Sûreté du Québec (IA)",
        url: "https://images.unsplash.com/photo-1541899481282-d53bffe3c35d?auto=format&fit=crop&w=800&q=80",
        category: "ia",
        location: "Checkpoint SQ",
        date: "Il y a 2 jours",
        promptUsed: "Véhicule de patrouille SQ avec gyrophare sous la pluie.",
        likes: 51
      }
    ];
  });

  const handleSaveGalleryPhotos = (newPhotos: GalleryPhoto[]) => {
    setGalleryPhotos(newPhotos);
    try {
      localStorage.setItem("troxt_phone_gallery", JSON.stringify(newPhotos));
    } catch {}
  };

  const handleDeletePhoto = (photoId: string) => {
    playBiometricSound("scan");
    const updated = galleryPhotos.filter((p) => p.id !== photoId);
    handleSaveGalleryPhotos(updated);
    if (selectedGalleryPhoto?.id === photoId) {
      setSelectedGalleryPhoto(null);
    }
    setCallToast("🗑️ Photo supprimée de la Galerie");
    setTimeout(() => setCallToast(null), 2500);
  };

  const handleSharePhotoToMessages = (photo: GalleryPhoto) => {
    playBiometricSound("scan");
    const timeStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const sharedMsg: RPMessage = {
      id: `msg_share_${Date.now()}`,
      threadId: "514-555-0182",
      sender: "me",
      recipient: "514-555-0182",
      text: `📸 [Galerie RP] Cliché: "${photo.title}" à ${photo.location}`,
      time: timeStr,
      isRead: true,
    };
    setMessages((prev) => [...prev, sharedMsg]);
    setCallToast(`💬 Cliché "${photo.title}" partagé dans CyberChat !`);
    setTimeout(() => setCallToast(null), 3000);
  };

  const handleGenerateIAPhoto = (presetPrompt?: string) => {
    const promptToUse = presetPrompt || capturePromptInput.trim() || "Coucher de soleil spectaculaire sur Portneuf";
    setIsGeneratingPhoto(true);
    playBiometricSound("scan");

    let imageUrl = "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80";
    const lowerP = promptToUse.toLowerCase();

    if (lowerP.includes("supercar") || lowerP.includes("auto") || lowerP.includes("voiture") || lowerP.includes("véhicule") || lowerP.includes("sport")) {
      const carImgs = [
        "https://images.unsplash.com/photo-1617814076367-b759c7d7e738?auto=format&fit=crop&w=800&q=80",
        "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=800&q=80",
        "https://images.unsplash.com/photo-1542282088-72c9c27ed0cd?auto=format&fit=crop&w=800&q=80",
        "https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=800&q=80",
      ];
      imageUrl = carImgs[Math.floor(Math.random() * carImgs.length)];
    } else if (lowerP.includes("poutine") || lowerP.includes("gaston") || lowerP.includes("manger") || lowerP.includes("nourriture") || lowerP.includes("resto")) {
      const foodImgs = [
        "https://images.unsplash.com/photo-1586816001966-79b736744398?auto=format&fit=crop&w=800&q=80",
        "https://images.unsplash.com/photo-1576107232684-1279f3908594?auto=format&fit=crop&w=800&q=80",
      ];
      imageUrl = foodImgs[Math.floor(Math.random() * foodImgs.length)];
    } else if (lowerP.includes("sq") || lowerP.includes("police") || lowerP.includes("patrouille") || lowerP.includes("urgence") || lowerP.includes("armée") || lowerP.includes("bunker") || lowerP.includes("armurier")) {
      const policeImgs = [
        "https://images.unsplash.com/photo-1541899481282-d53bffe3c35d?auto=format&fit=crop&w=800&q=80",
        "https://images.unsplash.com/photo-1508847154043-be5407fcaa5a?auto=format&fit=crop&w=800&q=80",
      ];
      imageUrl = policeImgs[Math.floor(Math.random() * policeImgs.length)];
    } else if (lowerP.includes("maison") || lowerP.includes("villa") || lowerP.includes("manoir") || lowerP.includes("domaine") || lowerP.includes("bâtiment")) {
      const villaImgs = [
        "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80",
        "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=800&q=80",
      ];
      imageUrl = villaImgs[Math.floor(Math.random() * villaImgs.length)];
    } else {
      const natureImgs = [
        "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80",
        "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=800&q=80",
        "https://images.unsplash.com/photo-1511497584788-876761c1298b?auto=format&fit=crop&w=800&q=80",
      ];
      imageUrl = natureImgs[Math.floor(Math.random() * natureImgs.length)];
    }

    setTimeout(() => {
      const newPhoto: GalleryPhoto = {
        id: `photo_ia_${Date.now()}`,
        title: promptToUse.slice(0, 30) + (promptToUse.length > 30 ? "..." : ""),
        url: imageUrl,
        category: captureCategory,
        location: captureLocation,
        date: "À l'instant",
        promptUsed: promptToUse,
        likes: Math.floor(Math.random() * 15) + 1,
      };

      const updated = [newPhoto, ...galleryPhotos];
      handleSaveGalleryPhotos(updated);
      setIsGeneratingPhoto(false);
      setIsCapturingIA(false);
      setCapturePromptInput("");
      setCallToast("📸 Cliché RP généré par l'IA et ajouté à la Galerie !");
      setTimeout(() => setCallToast(null), 3000);
    }, 1100);
  };

  // Customizable Widget System State with Persistence
  const [enabledWidgets, setEnabledWidgets] = useState<PhoneWidgetId[]>(() => {
    try {
      const saved = localStorage.getItem("troxt_phone_widgets");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed as PhoneWidgetId[];
        }
      }
    } catch (e) {
      // ignore
    }
    return ["weather", "contacts", "bank", "notes", "radio"];
  });

  const updateEnabledWidgets = (newWidgets: PhoneWidgetId[]) => {
    setEnabledWidgets(newWidgets);
    try {
      localStorage.setItem("troxt_phone_widgets", JSON.stringify(newWidgets));
    } catch (e) {
      // ignore
    }
  };

  const toggleWidgetEnabled = (widgetId: PhoneWidgetId) => {
    playBiometricSound("scan");
    if (enabledWidgets.includes(widgetId)) {
      updateEnabledWidgets(enabledWidgets.filter((w) => w !== widgetId));
    } else {
      updateEnabledWidgets([...enabledWidgets, widgetId]);
    }
  };

  const moveWidget = (widgetId: PhoneWidgetId, direction: "up" | "down") => {
    playBiometricSound("scan");
    const idx = enabledWidgets.indexOf(widgetId);
    if (idx === -1) return;
    const targetIdx = direction === "up" ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= enabledWidgets.length) return;

    const copy = [...enabledWidgets];
    const [moved] = copy.splice(idx, 1);
    copy.splice(targetIdx, 0, moved);
    updateEnabledWidgets(copy);
  };

  // Quick Notes State
  const [quickNotes, setQuickNotes] = useState<{ id: string; text: string; done: boolean }[]>(() => {
    try {
      const saved = localStorage.getItem("troxt_phone_quick_notes");
      if (saved) return JSON.parse(saved);
    } catch (e) {
      // ignore
    }
    return [
      { id: "1", text: "Acheter poutine chez Gaston 🍟", done: false },
      { id: "2", text: "Rendez-vous Caisse Desjardins 🏦", done: true },
      { id: "3", text: "Appeler le taxi pour Portneuf 🚕", done: false },
    ];
  });

  const [newQuickNoteText, setNewQuickNoteText] = useState("");

  const saveQuickNotes = (notes: { id: string; text: string; done: boolean }[]) => {
    setQuickNotes(notes);
    try {
      localStorage.setItem("troxt_phone_quick_notes", JSON.stringify(notes));
    } catch (e) {}
  };

  const handleAddQuickNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQuickNoteText.trim()) return;
    const newNote = {
      id: `note_${Date.now()}`,
      text: newQuickNoteText.trim(),
      done: false,
    };
    saveQuickNotes([newNote, ...quickNotes]);
    setNewQuickNoteText("");
    playBiometricSound("success");
  };

  const handleToggleQuickNote = (id: string) => {
    const updated = quickNotes.map((n) => (n.id === id ? { ...n, done: !n.done } : n));
    saveQuickNotes(updated);
    playBiometricSound("scan");
  };

  const handleDeleteQuickNote = (id: string) => {
    saveQuickNotes(quickNotes.filter((n) => n.id !== id));
    playBiometricSound("scan");
  };

  // Weather Widget State
  const [weatherCondition, setWeatherCondition] = useState({
    temp: 22,
    city: "Ville de Québec",
    condition: "Ensoleillé ☀️",
    humidity: 42,
    wind: 14,
  });

  const cycleWeatherCondition = () => {
    playBiometricSound("scan");
    const options = [
      { temp: 22, condition: "Ensoleillé ☀️", humidity: 42, wind: 14 },
      { temp: 18, condition: "Partiellement Nuageux ⛅", humidity: 58, wind: 19 },
      { temp: 12, condition: "Averses de Pluie 🌧️", humidity: 88, wind: 24 },
      { temp: -4, condition: "Tempête de Neige ❄️", humidity: 92, wind: 32 },
    ];
    const currentIdx = options.findIndex((o) => o.condition.startsWith(weatherCondition.condition.split(" ")[0]));
    const nextObj = options[(currentIdx + 1) % options.length];
    setWeatherCondition({
      ...weatherCondition,
      temp: nextObj.temp,
      condition: nextObj.condition,
      humidity: nextObj.humidity,
      wind: nextObj.wind,
    });
  };

  // Mini Radio State
  const [isMiniRadioPlaying, setIsMiniRadioPlaying] = useState(false);
  const [currentStationName] = useState("98.5 FM - Hits Québec RP");

  const changeWallpaper = (newWp: "neon" | "minimal" | "realistic" | "aurora" | "cyberpunk") => {
    if (newWp !== wallpaper) {
      playBiometricSound("scan");
      setWallpaper(newWp);
      try {
        localStorage.setItem("troxt_phone_wallpaper", newWp);
      } catch (e) {
        // ignore
      }
    }
  };

  // Ringtone state with local persistence
  const [selectedRingtone, setSelectedRingtone] = useState<RingtoneId>(() => {
    try {
      const saved = localStorage.getItem("troxt_phone_ringtone");
      if (saved && ["default", "cyber-bip", "classique-rp", "synthwave-pulse", "quantum-chime"].includes(saved)) {
        return saved as RingtoneId;
      }
    } catch (e) {
      // ignore
    }
    return "default";
  });

  const [previewingRingtone, setPreviewingRingtone] = useState<RingtoneId | null>(null);
  const activeAudioCtxRef = useRef<AudioContext | null>(null);

  const changeRingtone = (newRt: RingtoneId) => {
    setSelectedRingtone(newRt);
    try {
      localStorage.setItem("troxt_phone_ringtone", newRt);
    } catch (e) {
      // ignore
    }
  };

  const stopRingtonePreview = () => {
    if (activeAudioCtxRef.current) {
      try {
        activeAudioCtxRef.current.close();
      } catch (e) {
        // ignore
      }
      activeAudioCtxRef.current = null;
    }
    setPreviewingRingtone(null);
  };

  const playRingtoneSound = (ringtoneId: RingtoneId) => {
    stopRingtonePreview();

    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      activeAudioCtxRef.current = ctx;
      if (ctx.state === "suspended") ctx.resume();

      setPreviewingRingtone(ringtoneId);
      const now = ctx.currentTime;

      if (ringtoneId === "default") {
        const notes = [659.25, 830.61, 987.77, 1318.51, 659.25, 830.61, 987.77, 1318.51];
        notes.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = "sine";
          osc.frequency.setValueAtTime(freq, now + idx * 0.18);
          gain.gain.setValueAtTime(0, now + idx * 0.18);
          gain.gain.linearRampToValueAtTime(0.12, now + idx * 0.18 + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.18 + 0.16);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + idx * 0.18);
          osc.stop(now + idx * 0.18 + 0.17);
        });
        setTimeout(() => {
          setPreviewingRingtone((curr) => (curr === "default" ? null : curr));
        }, 1600);

      } else if (ringtoneId === "cyber-bip") {
        const freqs = [440, 880, 1320, 1760, 2200, 1760, 1320, 880];
        for (let burst = 0; burst < 2; burst++) {
          const burstOffset = burst * 0.7;
          freqs.forEach((f, idx) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = "square";
            osc.frequency.setValueAtTime(f, now + burstOffset + idx * 0.07);
            osc.frequency.exponentialRampToValueAtTime(f * 1.25, now + burstOffset + idx * 0.07 + 0.05);
            gain.gain.setValueAtTime(0.05, now + burstOffset + idx * 0.07);
            gain.gain.exponentialRampToValueAtTime(0.001, now + burstOffset + idx * 0.07 + 0.06);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now + burstOffset + idx * 0.07);
            osc.stop(now + burstOffset + idx * 0.07 + 0.065);
          });
        }
        setTimeout(() => {
          setPreviewingRingtone((curr) => (curr === "cyber-bip" ? null : curr));
        }, 1500);

      } else if (ringtoneId === "classique-rp") {
        for (let pulse = 0; pulse < 2; pulse++) {
          const pStart = now + pulse * 0.85;
          const osc1 = ctx.createOscillator();
          const osc2 = ctx.createOscillator();
          const gain = ctx.createGain();

          osc1.type = "sine";
          osc2.type = "sine";
          osc1.frequency.setValueAtTime(440, pStart);
          osc2.frequency.setValueAtTime(480, pStart);

          const mod = ctx.createOscillator();
          const modGain = ctx.createGain();
          mod.type = "square";
          mod.frequency.setValueAtTime(22, pStart);
          modGain.gain.setValueAtTime(0.08, pStart);
          mod.connect(modGain.gain);

          gain.gain.setValueAtTime(0.1, pStart);
          gain.gain.linearRampToValueAtTime(0.1, pStart + 0.5);
          gain.gain.exponentialRampToValueAtTime(0.001, pStart + 0.65);

          osc1.connect(gain);
          osc2.connect(gain);
          gain.connect(ctx.destination);

          osc1.start(pStart);
          osc2.start(pStart);
          osc1.stop(pStart + 0.65);
          osc2.stop(pStart + 0.65);
        }
        setTimeout(() => {
          setPreviewingRingtone((curr) => (curr === "classique-rp" ? null : curr));
        }, 1800);

      } else if (ringtoneId === "synthwave-pulse") {
        const chords = [
          [220, 277.18, 329.63],
          [246.94, 293.66, 369.99],
        ];
        chords.forEach((chord, cIdx) => {
          const cStart = now + cIdx * 0.7;
          const filter = ctx.createBiquadFilter();
          filter.type = "lowpass";
          filter.frequency.setValueAtTime(400, cStart);
          filter.frequency.exponentialRampToValueAtTime(2400, cStart + 0.2);
          filter.frequency.exponentialRampToValueAtTime(300, cStart + 0.6);

          const gain = ctx.createGain();
          gain.gain.setValueAtTime(0.01, cStart);
          gain.gain.linearRampToValueAtTime(0.08, cStart + 0.05);
          gain.gain.exponentialRampToValueAtTime(0.001, cStart + 0.65);

          chord.forEach((freq) => {
            const osc = ctx.createOscillator();
            osc.type = "sawtooth";
            osc.frequency.setValueAtTime(freq, cStart);
            osc.connect(filter);
            osc.start(cStart);
            osc.stop(cStart + 0.65);
          });

          filter.connect(gain);
          gain.connect(ctx.destination);
        });
        setTimeout(() => {
          setPreviewingRingtone((curr) => (curr === "synthwave-pulse" ? null : curr));
        }, 1500);

      } else if (ringtoneId === "quantum-chime") {
        const freqs = [523.25, 659.25, 783.99, 1046.50, 1318.51, 1567.98];
        freqs.forEach((f, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = "sine";
          osc.frequency.setValueAtTime(f, now + idx * 0.12);

          gain.gain.setValueAtTime(0, now + idx * 0.12);
          gain.gain.linearRampToValueAtTime(0.09, now + idx * 0.12 + 0.01);
          gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.12 + 0.8);

          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + idx * 0.12);
          osc.stop(now + idx * 0.12 + 0.85);
        });
        setTimeout(() => {
          setPreviewingRingtone((curr) => (curr === "quantum-chime" ? null : curr));
        }, 1700);
      }
    } catch (e) {
      console.warn("Error playing ringtone preview:", e);
      setPreviewingRingtone(null);
    }
  };

  useEffect(() => {
    return () => {
      stopRingtonePreview();
    };
  }, []);

  const setActiveApp = (newApp: "home" | "contacts" | "calls" | "messages" | "bank" | "gps" | "darkweb" | "admin" | "radio" | "settings" | "gallery") => {
    if (newApp === "home") {
      setSlideDirection(-1);
    } else {
      setSlideDirection(1);
    }
    setActiveAppState(newApp);
  };

  // Contacts state
  const [contacts, setContacts] = useState<Contact[]>([
    {
      id: "c_urg_1",
      name: "911 Urgence Sûreté du Québec",
      phone: "911-SQ",
      category: "emergency",
      customIcon: "siren",
      notes: "Poste de commandement & patrouille autoroutière",
      avatarColor: "bg-red-600",
      isFavorite: true,
    },
    {
      id: "c_urg_2",
      name: "Caserne Pompiers #12",
      phone: "911-FEU",
      category: "emergency",
      customIcon: "flame",
      notes: "Secours incendie, désincarcération & sauvetage",
      avatarColor: "bg-rose-600",
      isFavorite: true,
    },
    {
      id: "c_urg_3",
      name: "Hôpital & Ambulances Portneuf",
      phone: "514-555-0911",
      category: "emergency",
      customIcon: "stethoscope",
      notes: "Traumatologie & premiers soins d'urgence",
      avatarColor: "bg-emerald-600",
      isFavorite: true,
    },
    {
      id: "c_serv_1",
      name: "Remorquage & Dépannage 24/7",
      phone: "514-555-8833",
      category: "services",
      customIcon: "hammer",
      notes: "Assistance routière, treuil & dépanneuse lourde",
      avatarColor: "bg-amber-600",
      isFavorite: true,
    },
    {
      id: "c_serv_2",
      name: "Garage Mécanique SAAQ",
      phone: "514-555-4421",
      category: "services",
      customIcon: "wrench",
      notes: "Inspection mécanique certifiée, pièces & pneus",
      avatarColor: "bg-orange-600",
    },
    {
      id: "c_serv_3",
      name: "Taxi Rapide Québec",
      phone: "514-555-8294",
      category: "services",
      customIcon: "car",
      notes: "Chauffeur de taxi privé 24/7 Portneuf",
      avatarColor: "bg-yellow-600",
    },
    {
      id: "c_serv_4",
      name: "Station Pétrole Ultramar 138",
      phone: "514-555-3211",
      category: "services",
      customIcon: "fuel",
      notes: "Carburant, dépanneur & lave-auto",
      avatarColor: "bg-teal-600",
    },
    {
      id: "c_comm_1",
      name: "Gaston Poutine & Casse-Croûte",
      phone: "514-555-0182",
      category: "commercial",
      customIcon: "utensils",
      notes: "Roulotte à Poutine Centre-ville - sauce brune maison",
      avatarColor: "bg-amber-600",
      isFavorite: true,
    },
    {
      id: "c_comm_2",
      name: "Éther Mode Design",
      phone: "514-555-4921",
      category: "commercial",
      customIcon: "shopping-bag",
      notes: "Boutique de vêtements haut de gamme",
      avatarColor: "bg-purple-600",
    },
    {
      id: "c_work_1",
      name: "Me Roy - Avocat Droit & Cautions",
      phone: "514-555-7712",
      category: "work",
      customIcon: "briefcase",
      notes: "Cabinet juridique, défense pénale & libérations",
      avatarColor: "bg-indigo-600",
    },
    {
      id: "c_gov_1",
      name: "Hôtel de Ville & Palais de Justice",
      phone: "514-555-0010",
      category: "government",
      customIcon: "landmark",
      notes: "Services municipaux, permis de bâtir & greffe",
      avatarColor: "bg-emerald-700",
    },
    {
      id: "c_cit_1",
      name: "Sylvain Tremblay",
      phone: "514-555-6677",
      category: "citizen",
      customIcon: "heart",
      notes: "Ami d'enfance et collègue de travail",
      avatarColor: "bg-blue-600",
      subGroupId: "grp_famille",
    },
  ]);

  // Sub-groups state (ex: 'Collègues', 'Famille', 'Patrouille SQ', etc.)
  const [contactSubGroups, setContactSubGroups] = useState<ContactSubGroup[]>([
    {
      id: "grp_collegues",
      name: "Collègues",
      color: "blue",
      description: "Équipe de travail, collègues RP & partenaires d'affaires",
    },
    {
      id: "grp_famille",
      name: "Famille",
      color: "rose",
      description: "Famille proche & contacts d'urgence personnelle",
    },
    {
      id: "grp_sq_patrouille",
      name: "Patrouille SQ",
      color: "cyan",
      description: "Agents de sécurité, patrouille et interventions",
    },
    {
      id: "grp_depannage",
      name: "Dépannage & Garages",
      color: "amber",
      description: "Assistance routière, treuillage et mécaniciens",
    },
  ]);

  const [selectedSubGroupFilter, setSelectedSubGroupFilter] = useState<string>("all");
  const [showSubGroupsModal, setShowSubGroupsModal] = useState<boolean>(false);
  const [editingSubGroup, setEditingSubGroup] = useState<ContactSubGroup | null>(null);
  const [subGroupNameInput, setSubGroupNameInput] = useState<string>("");
  const [subGroupColorInput, setSubGroupColorInput] = useState<string>("emerald");
  const [subGroupDescInput, setSubGroupDescInput] = useState<string>("");

  const [contactSearch, setContactSearch] = useState("");
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>("all");
  const [selectedIconFilter, setSelectedIconFilter] = useState<string>("all");
  const [contactSortBy, setContactSortBy] = useState<"favorites" | "category" | "name-asc" | "name-desc">("favorites");
  const [showAdvancedFilters, setShowAdvancedFilters] = useState<boolean>(false);
  const [onlyFavoritesFilter, setOnlyFavoritesFilter] = useState<boolean>(false);
  const [isFavoritesSectionExpanded, setIsFavoritesSectionExpanded] = useState<boolean>(true);

  const [isEditingContact, setIsEditingContact] = useState<Contact | null>(null);
  const [isAddingContact, setIsAddingContact] = useState(false);
  const [contactFormName, setContactFormName] = useState("");
  const [contactFormPhone, setContactFormPhone] = useState("");
  const [contactFormNotes, setContactFormNotes] = useState("");
  const [contactFormCategory, setContactFormCategory] = useState<string>("citizen");
  const [contactFormCustomIcon, setContactFormCustomIcon] = useState<string>("user");
  const [contactFormAvatarColor, setContactFormAvatarColor] = useState<string>("bg-cyan-600");
  const [contactFormIsFavorite, setContactFormIsFavorite] = useState<boolean>(false);
  const [contactFormSubGroupId, setContactFormSubGroupId] = useState<string>("none");

  // Call state & Journal d'appels
  const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null);

  useEffect(() => {
    if (incomingCall) {
      playRingtoneSound(selectedRingtone);
    } else {
      stopRingtonePreview();
    }
  }, [incomingCall]);
  const [activeCall, setActiveCall] = useState<ActiveCall | null>(null);
  const [callDuration, setCallDuration] = useState<number>(0);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState<boolean>(true);

  // Call Logs (Journal des appels: manqués, entrants, sortants)
  const [callLogs, setCallLogs] = useState<CallLogItem[]>([
    {
      id: "log_1",
      callerName: "Gaston Poutine",
      callerNumber: "514-555-0182",
      type: "missed",
      timestamp: "14:15",
      duration: "Manqué",
      avatarColor: "bg-amber-600",
    },
    {
      id: "log_2",
      callerName: "Agent Bouchard (SQ)",
      callerNumber: "911-SQ",
      type: "outgoing",
      timestamp: "12:40",
      duration: "01:25",
      avatarColor: "bg-blue-600",
    },
    {
      id: "log_3",
      callerName: "Taxi Rapide Québec",
      callerNumber: "514-555-8294",
      type: "incoming",
      timestamp: "10:05",
      duration: "03:12",
      avatarColor: "bg-emerald-600",
    },
    {
      id: "log_4",
      callerName: "SPVM Urgence",
      callerNumber: "911-SPVM",
      type: "outgoing",
      timestamp: "Hier 23:10",
      duration: "00:45",
      avatarColor: "bg-cyan-600",
    },
    {
      id: "log_5",
      callerName: "Éther Mode Design",
      callerNumber: "514-555-4921",
      type: "missed",
      timestamp: "Hier 18:02",
      duration: "Manqué",
      avatarColor: "bg-purple-600",
    },
  ]);
  const [callLogFilter, setCallLogFilter] = useState<"all" | "missed" | "incoming" | "outgoing">("all");
  const [callLogSearch, setCallLogSearch] = useState("");
  const [manualDialNumber, setManualDialNumber] = useState("");

  // Banking state
  const [payTarget, setPayTarget] = useState("");
  const [payAmount, setPayAmount] = useState("500");
  const [paySuccess, setPaySuccess] = useState<string | null>(null);
  const [bankSubTab, setBankSubTab] = useState<"transfer" | "chart" | "history">("transfer");
  const [bankTxFilter, setBankTxFilter] = useState<"all" | "salary" | "transfer" | "purchase">("all");
  const [bankTxSearch, setBankTxSearch] = useState<string>("");
  const [payOperationType, setPayOperationType] = useState<"transfer" | "purchase">("transfer");
  const [selectedExpenseDayIndex, setSelectedExpenseDayIndex] = useState<number | null>(6);
  const [dailyExpenses, setDailyExpenses] = useState<DailyExpense[]>([
    { dayLabel: "J-6", fullDate: "21 Juil.", amount: 120 },
    { dayLabel: "J-5", fullDate: "22 Juil.", amount: 350 },
    { dayLabel: "J-4", fullDate: "23 Juil.", amount: 210 },
    { dayLabel: "J-3", fullDate: "24 Juil.", amount: 680 },
    { dayLabel: "J-2", fullDate: "25 Juil.", amount: 150 },
    { dayLabel: "Hier", fullDate: "26 Juil.", amount: 490 },
    { dayLabel: "Auj.", fullDate: "27 Juil.", amount: 120 },
  ]);
  const [transactions, setTransactions] = useState<BankTransaction[]>([
    { id: "tx_1", recipient: "Dépanneur Beau-Soir (Achat TPV)", amount: 45, date: "15:20", type: "purchase", category: "Alimentation" },
    { id: "tx_2", recipient: "Station Irving Portneuf (Carburant)", amount: 78, date: "14:40", type: "purchase", category: "Essence" },
    { id: "tx_3", recipient: "Gaston Poutine", amount: 120, date: "14:10", type: "transfer_out", category: "Virement Interac" },
    { id: "tx_4", recipient: "Caisse Desjardins (Salaire RP)", amount: 1650, date: "12:00", type: "salary", category: "Emploi & Paie" },
    { id: "tx_5", recipient: "Éther Mode & Prêt-à-porter", amount: 280, date: "Hier 18:30", type: "purchase", category: "Vêtements" },
    { id: "tx_6", recipient: "Alexandre Tremblay", amount: 250, date: "Hier 11:15", type: "transfer_in", category: "Virement Interac" },
    { id: "tx_7", recipient: "Garage Mécanique Portneuf", amount: 320, date: "24 Juil. 16:30", type: "purchase", category: "Entretien Auto" },
    { id: "tx_8", recipient: "Prime de Quart de Nuit SPVM", amount: 450, date: "23 Juil. 06:00", type: "salary", category: "Emploi & Paie" },
    { id: "tx_9", recipient: "Marc-André (Loyer Appartement)", amount: 650, date: "21 Juil. 10:00", type: "transfer_out", category: "Virement Interac" },
    { id: "tx_10", recipient: "Pharmacie Jean Coutu (Soins)", amount: 36, date: "20 Juil. 14:15", type: "purchase", category: "Santé" },
  ]);
  const [selectedReceiptTx, setSelectedReceiptTx] = useState<BankTransaction | null>(null);
  const [receiptCopied, setReceiptCopied] = useState<boolean>(false);
  const [receiptToast, setReceiptToast] = useState<string | null>(null);

  // SMS & Chat Threads State
  const [messages, setMessages] = useState<RPMessage[]>([
    { id: "msg_1", threadId: "514-555-0182", sender: "514-555-0182", recipient: "me", text: "Salut! La roulotte à poutine est ouverte au centre-ville.", time: "14:00", isRead: true },
    { id: "msg_2", threadId: "514-555-0182", sender: "514-555-0182", recipient: "me", text: "La roulotte est ouverte! Viens manger une poutine.", time: "14:05", isRead: true },
    { id: "msg_3", threadId: "911-SPVM", sender: "911-SPVM", recipient: "me", text: "SPVM: Unité patrouille stationnée à Portneuf.", time: "12:15", isRead: true },
    { id: "msg_4", threadId: "911-SPVM", sender: "911-SPVM", recipient: "me", text: "Alerte RP: Patrouille active en centre-ville.", time: "14:20", isRead: false },
    { id: "msg_5", threadId: "514-555-8294", sender: "514-555-8294", recipient: "me", text: "Votre taxi est arrivé devant la Caisse Desjardins.", time: "13:50", isRead: true },
    { id: "msg_6", threadId: "911-SQ", sender: "Agent Bouchard (SQ)", recipient: "me", text: "Poste SQ: Patrouille de contrôle routier en cours.", time: "10:30", isRead: true },
    { id: "msg_7", threadId: "general", sender: "Service RP Québec", recipient: "general", text: "Bienvenue sur le réseau de messagerie RP de Portneuf !", time: "09:00", isRead: true },
  ]);

  const [selectedRecipient, setSelectedRecipient] = useState<string>("");
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [threadSearchQuery, setThreadSearchQuery] = useState<string>("");
  const [threadCategoryFilter, setThreadCategoryFilter] = useState<"all" | "citizen" | "services" | "emergency" | "general">("all");
  const [isNewThreadModalOpen, setIsNewThreadModalOpen] = useState<boolean>(false);
  const [newThreadTarget, setNewThreadTarget] = useState<string>("");
  const [newMsgText, setNewMsgText] = useState("");
  const [callToast, setCallToast] = useState<string | null>(null);

  // Dark Web state
  const [darkWebOrder, setDarkWebOrder] = useState<string | null>(null);

  // Timer for active call duration
  useEffect(() => {
    let timer: any;
    if (activeCall) {
      timer = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    } else {
      setCallDuration(0);
    }
    return () => clearInterval(timer);
  }, [activeCall]);

  if (!isOpen) return null;

  // Call Handlers
  const handleTriggerIncomingCall = (
    callerName = "Gaston Poutine",
    callerNumber = "514-555-0182",
    callerTitle = "Roulotte à Poutine Centre-ville",
    avatarColor = "bg-amber-600"
  ) => {
    // Check Airplane Mode or Do Not Disturb
    if (isAirplaneMode) {
      playBiometricSound("scan");
      const timeStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      const newLog: CallLogItem = {
        id: `log_${Date.now()}`,
        callerName,
        callerNumber,
        type: "missed",
        timestamp: timeStr,
        duration: "Bloqué (Mode Avion)",
        avatarColor,
      };
      setCallLogs((prev) => [newLog, ...prev]);
      setCallToast(`✈️ Appel de ${callerName} rejeté automatiquement (Mode Avion)`);
      setTimeout(() => setCallToast(null), 3500);
      return;
    }

    if (isDoNotDisturb) {
      playBiometricSound("scan");
      const timeStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      const newLog: CallLogItem = {
        id: `log_${Date.now()}`,
        callerName,
        callerNumber,
        type: "missed",
        timestamp: timeStr,
        duration: "Bloqué (Ne pas déranger)",
        avatarColor,
      };
      setCallLogs((prev) => [newLog, ...prev]);
      setCallToast(`🌙 Appel de ${callerName} rejeté en silencieux (Ne pas déranger)`);
      setTimeout(() => setCallToast(null), 3500);
      return;
    }

    setIncomingCall({
      id: `inc_${Date.now()}`,
      callerName,
      callerNumber,
      callerTitle,
      avatarColor,
    });
  };

  const handleAcceptCall = () => {
    if (!incomingCall) return;
    setActiveCall({
      callerName: incomingCall.callerName,
      callerNumber: incomingCall.callerNumber,
      avatarColor: incomingCall.avatarColor,
      startTime: Date.now(),
    });
    setIncomingCall(null);
    triggerCallPulse(); // Trigger light pulse animation on call connected
    playBiometricSound("success");
    setCallToast(`📞 Communication établie avec ${incomingCall.callerName}`);
    setTimeout(() => setCallToast(null), 3000);
  };

  const handleDeclineCall = () => {
    if (incomingCall) {
      const timeStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      const newLog: CallLogItem = {
        id: `log_${Date.now()}`,
        callerName: incomingCall.callerName,
        callerNumber: incomingCall.callerNumber,
        type: "missed",
        timestamp: timeStr,
        duration: "Manqué",
        avatarColor: incomingCall.avatarColor,
      };
      setCallLogs((prev) => [newLog, ...prev]);
      setCallToast(`❌ Appel refusé (${incomingCall.callerName})`);
      setTimeout(() => setCallToast(null), 3000);
    }
    setIncomingCall(null);
  };

  const handleEndCall = () => {
    if (activeCall) {
      const timeStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      const durStr = formatCallDuration(callDuration);
      const newLog: CallLogItem = {
        id: `log_${Date.now()}`,
        callerName: activeCall.callerName,
        callerNumber: activeCall.callerNumber,
        type: "incoming",
        timestamp: timeStr,
        duration: durStr,
        avatarColor: activeCall.avatarColor,
      };
      setCallLogs((prev) => [newLog, ...prev]);
      setCallToast(`📞 Appel terminé avec ${activeCall.callerName}`);
      setTimeout(() => setCallToast(null), 3000);
    }
    setActiveCall(null);
    setCallDuration(0);
  };

  const handleMakeOutgoingCall = (targetName: string, targetNumber: string, avatarColor = "bg-cyan-600") => {
    const timeStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const newLog: CallLogItem = {
      id: `log_${Date.now()}`,
      callerName: targetName,
      callerNumber: targetNumber,
      type: "outgoing",
      timestamp: timeStr,
      duration: "00:42",
      avatarColor: avatarColor,
    };
    setCallLogs((prev) => [newLog, ...prev]);
    setActiveCall({
      callerName: targetName,
      callerNumber: targetNumber,
      avatarColor: avatarColor,
      startTime: Date.now(),
    });
    triggerCallPulse(); // Trigger light pulse animation on call connected
    playBiometricSound("success");
    setCallToast(`📞 Communication établie avec ${targetName} (${targetNumber})`);
    setTimeout(() => setCallToast(null), 3500);
  };

  const handleDeleteCallLog = (id: string) => {
    setCallLogs((prev) => prev.filter((l) => l.id !== id));
  };

  const formatCallDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Helper to look up contact by phone or name or id
  const getContactForSender = (sender: string): Contact | undefined => {
    return contacts.find(
      (c) =>
        c.phone.toLowerCase() === sender.toLowerCase() ||
        c.name.toLowerCase() === sender.toLowerCase() ||
        c.id === sender
    );
  };

  // Sub-groups handlers
  const handleOpenCreateSubGroup = (prefillName = "") => {
    setEditingSubGroup(null);
    setSubGroupNameInput(prefillName);
    setSubGroupColorInput("emerald");
    setSubGroupDescInput("");
    setShowSubGroupsModal(true);
  };

  const handleOpenEditSubGroup = (grp: ContactSubGroup) => {
    setEditingSubGroup(grp);
    setSubGroupNameInput(grp.name);
    setSubGroupColorInput(grp.color);
    setSubGroupDescInput(grp.description || "");
    setShowSubGroupsModal(true);
  };

  const handleSaveSubGroup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subGroupNameInput.trim()) return;

    if (editingSubGroup) {
      setContactSubGroups((prev) =>
        prev.map((g) =>
          g.id === editingSubGroup.id
            ? {
                ...g,
                name: subGroupNameInput.trim(),
                color: subGroupColorInput,
                description: subGroupDescInput.trim(),
              }
            : g
        )
      );
    } else {
      const newGrp: ContactSubGroup = {
        id: `grp_${Date.now()}`,
        name: subGroupNameInput.trim(),
        color: subGroupColorInput,
        description: subGroupDescInput.trim(),
      };
      setContactSubGroups((prev) => [...prev, newGrp]);
      if (isAddingContact || isEditingContact) {
        setContactFormSubGroupId(newGrp.id);
      }
    }

    setEditingSubGroup(null);
    setShowSubGroupsModal(false);
  };

  const handleDeleteSubGroup = (groupId: string) => {
    setContactSubGroups((prev) => prev.filter((g) => g.id !== groupId));
    setContacts((prev) =>
      prev.map((c) => (c.subGroupId === groupId ? { ...c, subGroupId: undefined } : c))
    );
    if (selectedSubGroupFilter === groupId) {
      setSelectedSubGroupFilter("all");
    }
    if (contactFormSubGroupId === groupId) {
      setContactFormSubGroupId("none");
    }
  };

  // Contacts handlers
  const handleStartAddContact = (prefilledPhone = "") => {
    setContactFormName("");
    setContactFormPhone(prefilledPhone);
    setContactFormNotes("");
    setContactFormCategory("citizen");
    setContactFormCustomIcon("user");
    setContactFormAvatarColor("bg-cyan-600");
    setContactFormIsFavorite(false);
    setContactFormSubGroupId("none");
    setIsEditingContact(null);
    setIsAddingContact(true);
    setActiveApp("contacts");
  };

  const handleStartEditContact = (contact: Contact) => {
    setIsEditingContact(contact);
    setContactFormName(contact.name);
    setContactFormPhone(contact.phone);
    setContactFormNotes(contact.notes || "");
    setContactFormCategory(contact.category || "citizen");
    setContactFormCustomIcon(contact.customIcon || (contact.category ? (CONTACT_CATEGORIES.find(c => c.id === contact.category)?.defaultIconId || "user") : "user"));
    setContactFormAvatarColor(contact.avatarColor || "bg-cyan-600");
    setContactFormIsFavorite(!!contact.isFavorite);
    setContactFormSubGroupId(contact.subGroupId || "none");
    setIsAddingContact(false);
  };

  const handleToggleFavoriteContact = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setContacts((prev) =>
      prev.map((c) => (c.id === id ? { ...c, isFavorite: !c.isFavorite } : c))
    );
  };

  const handleCategoryChangeInForm = (newCat: string) => {
    setContactFormCategory(newCat);
    // Suggest appropriate icon if user hasn't explicitly customized or is using default
    const meta = CONTACT_CATEGORIES.find((c) => c.id === newCat);
    if (meta) {
      setContactFormCustomIcon(meta.defaultIconId);
    }
  };

  const handleSaveContact = (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactFormName.trim() || !contactFormPhone.trim()) return;

    const chosenSubGroupId = contactFormSubGroupId === "none" ? undefined : contactFormSubGroupId;

    if (isEditingContact) {
      setContacts((prev) =>
        prev.map((c) =>
          c.id === isEditingContact.id
            ? {
                ...c,
                name: contactFormName.trim(),
                phone: contactFormPhone.trim(),
                notes: contactFormNotes.trim(),
                category: contactFormCategory,
                customIcon: contactFormCustomIcon,
                avatarColor: contactFormAvatarColor,
                isFavorite: contactFormIsFavorite,
                subGroupId: chosenSubGroupId,
              }
            : c
        )
      );
    } else {
      const newContact: Contact = {
        id: `c_${Date.now()}`,
        name: contactFormName.trim(),
        phone: contactFormPhone.trim(),
        notes: contactFormNotes.trim(),
        category: contactFormCategory,
        customIcon: contactFormCustomIcon,
        avatarColor: contactFormAvatarColor,
        isFavorite: contactFormIsFavorite,
        subGroupId: chosenSubGroupId,
      };
      setContacts((prev) => [newContact, ...prev]);
    }

    setIsAddingContact(false);
    setIsEditingContact(null);
  };

  const handleDeleteContact = (id: string) => {
    setContacts((prev) => prev.filter((c) => c.id !== id));
  };

  const handleSelectThread = (threadId: string) => {
    setActiveThreadId(threadId);
    setSelectedRecipient(threadId);
    setMessages((prev) =>
      prev.map((m) => (m.threadId === threadId ? { ...m, isRead: true } : m))
    );
  };

  const handleOpenSMSForContact = (contact: Contact) => {
    setSelectedRecipient(contact.phone);
    handleSelectThread(contact.phone);
    setActiveApp("messages");
  };

  // Derived threads list grouped by threadId
  const threads = React.useMemo(() => {
    const map = new Map<
      string,
      {
        threadId: string;
        title: string;
        subtitle: string;
        contact?: Contact;
        lastMessage: RPMessage;
        unreadCount: number;
        messages: RPMessage[];
        category: ContactCategory | "general" | string;
        avatarColor: string;
      }
    >();

    messages.forEach((msg) => {
      const tid = msg.threadId || msg.sender || "general";
      if (!map.has(tid)) {
        const contact = contacts.find((c) => c.phone === tid || c.name === tid || c.id === tid);

        let title = tid;
        let subtitle = tid;
        let category: ContactCategory | "general" | string = contact?.category || "citizen";
        let avatarColor = contact?.avatarColor || "bg-indigo-600";

        if (tid === "general") {
          title = "📢 Canal Général RP";
          subtitle = "Canal public de la ville";
          category = "general";
          avatarColor = "bg-purple-600";
        } else if (contact) {
          title = contact.name;
          subtitle = contact.phone;
          avatarColor = contact.avatarColor || "bg-indigo-600";
          category = contact.category || "citizen";
        } else if (tid.includes("911") || tid.includes("SPVM") || tid.includes("SQ")) {
          title = tid.includes("SQ") ? "Agent Bouchard (SQ)" : "SPVM Urgence";
          subtitle = tid;
          category = "emergency";
          avatarColor = "bg-blue-600";
        } else if (tid.includes("555-8294") || tid.toLowerCase().includes("taxi")) {
          title = "Taxi Rapide Québec";
          subtitle = tid;
          category = "services";
          avatarColor = "bg-emerald-600";
        }

        map.set(tid, {
          threadId: tid,
          title,
          subtitle,
          contact,
          lastMessage: msg,
          unreadCount: 0,
          messages: [],
          category,
          avatarColor,
        });
      }

      const item = map.get(tid)!;
      item.messages.push(msg);
      item.lastMessage = msg;
      if (!msg.isRead && msg.sender !== playerName && msg.sender !== "me") {
        item.unreadCount += 1;
      }
    });

    return Array.from(map.values());
  }, [messages, contacts, playerName]);

  const filteredThreads = threads.filter((thread) => {
    const matchesFilter =
      threadCategoryFilter === "all" || thread.category === threadCategoryFilter;
    const matchesSearch =
      thread.title.toLowerCase().includes(threadSearchQuery.toLowerCase()) ||
      thread.subtitle.toLowerCase().includes(threadSearchQuery.toLowerCase()) ||
      thread.lastMessage.text.toLowerCase().includes(threadSearchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const handleSimulateCall = (contact: Contact) => {
    handleMakeOutgoingCall(
      contact.name,
      contact.phone,
      contact.avatarColor || "bg-emerald-600"
    );
    handleTriggerIncomingCall(
      contact.name,
      contact.phone,
      contact.notes || "Contact Citoyen FiveM",
      contact.avatarColor || "bg-emerald-600"
    );
  };

  const filteredCallLogs = callLogs.filter((log) => {
    const matchesFilter = callLogFilter === "all" || log.type === callLogFilter;
    const matchesSearch =
      log.callerName.toLowerCase().includes(callLogSearch.toLowerCase()) ||
      log.callerNumber.toLowerCase().includes(callLogSearch.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const missedCount = callLogs.filter((l) => l.type === "missed").length;

  // Bank transactions filtering logic (salary, transfer, purchase)
  const filteredTransactions = transactions.filter((tx) => {
    if (bankTxFilter === "salary" && tx.type !== "salary") return false;
    if (bankTxFilter === "transfer" && tx.type !== "transfer_out" && tx.type !== "transfer_in") return false;
    if (bankTxFilter === "purchase" && tx.type !== "purchase") return false;

    if (bankTxSearch.trim()) {
      const q = bankTxSearch.toLowerCase().trim();
      const matchRecipient = tx.recipient.toLowerCase().includes(q);
      const matchCategory = tx.category ? tx.category.toLowerCase().includes(q) : false;
      const matchAmount = tx.amount.toString().includes(q);
      const matchDate = tx.date.toLowerCase().includes(q);
      return matchRecipient || matchCategory || matchAmount || matchDate;
    }
    return true;
  });

  const salaryTxCount = transactions.filter((t) => t.type === "salary").length;
  const transferTxCount = transactions.filter((t) => t.type === "transfer_out" || t.type === "transfer_in").length;
  const purchaseTxCount = transactions.filter((t) => t.type === "purchase").length;

  // Banking handler
  const handleSendPayment = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseInt(payAmount);
    if (!payTarget || isNaN(amt) || amt <= 0) {
      triggerPhoneError();
      return;
    }
    if (onPayCash) onPayCash(payTarget, amt);

    const isPurchase = payOperationType === "purchase";
    const newTx: BankTransaction = {
      id: `tx_${Date.now()}`,
      recipient: payTarget.trim(),
      amount: amt,
      date: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      type: isPurchase ? "purchase" : "transfer_out",
      category: isPurchase ? "Commerce & Achat" : "Virement Interac",
    };
    setTransactions((prev) => [newTx, ...prev]);

    // Update today's expense in graph
    setDailyExpenses((prev) => {
      const updated = [...prev];
      const lastIdx = updated.length - 1;
      if (lastIdx >= 0) {
        updated[lastIdx] = {
          ...updated[lastIdx],
          amount: updated[lastIdx].amount + amt,
        };
      }
      return updated;
    });

    setPaySuccess(
      isPurchase
        ? `Achat de ${amt}$ réglé par carte à ${payTarget} !`
        : `Virement bancaire de ${amt}$ effectué à ${payTarget} !`
    );
    setTimeout(() => setPaySuccess(null), 3500);
    setPayTarget("");
  };

  // Export individual transaction as official PDF/HTML file
  const handleExportTransactionPDF = (tx: BankTransaction) => {
    try {
      const refNumber = `DSJ-TX-2026-${tx.id.replace("tx_", "")}`;
      const issueDate = new Date().toLocaleDateString("fr-CA", { year: 'numeric', month: 'long', day: 'numeric' });
      const isPurchase = tx.type === "purchase";
      const isSalary = tx.type === "salary";
      const isTransferIn = tx.type === "transfer_in";
      const isNegative = tx.type === "transfer_out" || tx.type === "purchase";
      const txTypeLabel = isSalary
        ? "DÉPÔT SALARIAL / EMPLOI RP"
        : isPurchase
        ? "PAIEMENT CARTE TPV / ACHAT COMMERCE"
        : isTransferIn
        ? "VIREMENT ENTRANT INTERAC"
        : "VIREMENT SORTANT INTERAC";
      const docTitle = isPurchase
        ? "TICKET OFFICIEL DE PAIEMENT COMMERCE"
        : isSalary
        ? "AVIS OFFICIEL DE DÉPÔT SALARIAL"
        : "ATTESTATION OFFICIELLE DE VIREMENT";
      const senderName = isTransferIn || isSalary ? tx.recipient : (playerName || "Citoyen RP");
      const recipientName = isTransferIn || isSalary ? (playerName || "Citoyen RP") : tx.recipient;

      const htmlContent = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>${docTitle.replace(/\s+/g, '_')}_${refNumber}</title>
  <style>
    body { font-family: 'Helvetica Neue', Arial, sans-serif; background: #0f172a; color: #f8fafc; padding: 40px; margin: 0; }
    .card { max-width: 600px; margin: auto; background: #1e293b; border: 2px solid ${isPurchase ? '#f59e0b' : '#10b981'}; border-radius: 16px; padding: 30px; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
    .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #334155; padding-bottom: 20px; margin-bottom: 20px; }
    .brand { color: ${isPurchase ? '#fbbf24' : '#34d399'}; font-size: 22px; font-weight: 900; letter-spacing: 1px; }
    .subbrand { color: #94a3b8; font-size: 11px; text-transform: uppercase; }
    .stamp { border: 2px dashed ${isPurchase ? '#fbbf24' : '#34d399'}; color: ${isPurchase ? '#fbbf24' : '#34d399'}; padding: 6px 12px; border-radius: 8px; font-weight: bold; font-size: 12px; text-align: center; }
    .amount-box { background: ${isNegative ? '#4c0519' : '#064e3b'}; border: 1px solid ${isNegative ? '#f43f5e' : '#059669'}; border-radius: 12px; padding: 20px; text-align: center; margin: 20px 0; }
    .amount-val { font-size: 36px; font-weight: 900; color: ${isNegative ? '#fb7185' : '#34d399'}; }
    .details { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; background: #0f172a; padding: 20px; border-radius: 12px; font-size: 13px; }
    .label { color: #64748b; font-size: 10px; font-weight: bold; text-transform: uppercase; margin-bottom: 4px; }
    .value { font-weight: bold; color: #f1f5f9; }
    .footer { text-align: center; font-size: 10px; color: #64748b; margin-top: 25px; border-top: 1px solid #334155; padding-top: 15px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <div>
        <div class="brand">DESJARDINS</div>
        <div class="subbrand">Caisse Populaire de Portneuf RP</div>
      </div>
      <div class="stamp">OFFICIEL & VALIDÉ<br>SÛRETÉ DU QUÉBEC / SPVM</div>
    </div>

    <div style="text-align:center;">
      <h2 style="margin:0; font-size:18px; color:#f8fafc;">${docTitle}</h2>
      <p style="margin:5px 0 0 0; color:#94a3b8; font-size:12px;">Preuve d'opération bancaire certifiée pour justification RP</p>
    </div>

    <div class="amount-box">
      <div class="label" style="color:#a7f3d0;">Montant de l'opération</div>
      <div class="amount-val">${isNegative ? '-' : '+'}$${tx.amount.toLocaleString()} CAD</div>
      <div style="font-size:11px; color:${isPurchase ? '#fbbf24' : '#34d399'}; margin-top:4px;">Statut : Transaction Confirmée</div>
    </div>

    <div class="details">
      <div>
        <div class="label">Numéro de Référence</div>
        <div class="value">${refNumber}</div>
      </div>
      <div>
        <div class="label">Date & Heure</div>
        <div class="value">${issueDate} • ${tx.date}</div>
      </div>
      <div>
        <div class="label">${isPurchase ? 'Client Porteur' : 'Compte Émetteur'}</div>
        <div class="value">${senderName}</div>
      </div>
      <div>
        <div class="label">${isPurchase ? 'Commerçant / Tiers' : 'Compte Destinataire'}</div>
        <div class="value">${recipientName}</div>
      </div>
      <div>
        <div class="label">Type d'opération</div>
        <div class="value">${txTypeLabel}</div>
      </div>
      <div>
        <div class="label">Sceau d'Authentification</div>
        <div class="value" style="color:#34d399;">ÉTHER-GUARD L5-OK</div>
      </div>
    </div>

    <div class="footer">
      Document officiel généré électroniquement le ${new Date().toLocaleString('fr-CA')} pour le projet RP Portneuf.<br>
      Caisse Populaire Desjardins • Système de vérification des transactions bancaires
    </div>
  </div>
</body>
</html>`;

      const blob = new Blob([htmlContent], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Recu_${isPurchase ? 'Achat' : 'Virement'}_Desjardins_${refNumber}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      playBiometricSound("success");
      setReceiptToast(`📄 Justificatif généré pour ${tx.recipient} ($${tx.amount}) !`);
      setTimeout(() => setReceiptToast(null), 3500);
    } catch (e) {
      console.error("PDF Export error:", e);
      triggerPhoneError();
    }
  };

  // Copy formatted text proof to clipboard for RP chat / justification
  const handleCopyReceiptText = (tx: BankTransaction) => {
    const refNumber = `DSJ-TX-2026-${tx.id.replace("tx_", "")}`;
    const headerTitle = tx.type === "purchase"
      ? "TICKET DE PAIEMENT COMMERCE"
      : tx.type === "salary"
      ? "AVIS DE DÉPÔT SALARIAL"
      : "JUSTIFICATIF DE VIREMENT";
    const formattedText = `🏦 [CAISSE DESJARDINS PORTNEUF - ${headerTitle}]
--------------------------------------------------
📜 Référence RP : ${refNumber}
💵 Montant : ${tx.type === 'transfer_out' || tx.type === 'purchase' ? '-' : '+'}$${tx.amount.toLocaleString()} CAD
👤 Émetteur : ${tx.type === 'transfer_in' || tx.type === 'salary' ? tx.recipient : (playerName || "Citoyen RP")}
🎯 Destinataire : ${tx.type === 'transfer_in' || tx.type === 'salary' ? (playerName || "Citoyen RP") : tx.recipient}
🏷️ Type : ${tx.type === 'salary' ? 'Salaire' : tx.type === 'purchase' ? 'Achat TPV' : 'Virement Interac'}
⏰ Horodatage : ${tx.date}
🛡️ Statut : TRANSACTION CONFIRMÉE & VALIDÉE SPVM/SQ
--------------------------------------------------`;

    if (navigator.clipboard) {
      navigator.clipboard.writeText(formattedText);
    }
    setReceiptCopied(true);
    playBiometricSound("success");
    setReceiptToast("📋 Justificatif RP copié dans le presse-papier !");
    setTimeout(() => {
      setReceiptCopied(false);
      setReceiptToast(null);
    }, 3500);
  };

  // Share receipt directly via RP SMS thread
  const handleShareReceiptViaSMS = (tx: BankTransaction) => {
    const refNumber = `DSJ-TX-2026-${tx.id.replace("tx_", "")}`;
    const smsContent = tx.type === "purchase"
      ? `🛍️ Reçu achat Desjardins (${refNumber}): Achat de $${tx.amount} CAD chez ${tx.recipient} le ${tx.date}. Validé.`
      : tx.type === "salary"
      ? `💼 Dépôt salaire Desjardins (${refNumber}): Virement reçu de $${tx.amount} CAD (${tx.recipient}) le ${tx.date}.`
      : `💸 Preuve de virement Desjardins (${refNumber}): Transféré $${tx.amount} CAD à ${tx.recipient} le ${tx.date}. Certifié officiel.`;

    setActiveApp("messages");
    setNewMsgText(smsContent);
    playBiometricSound("scan");
    setReceiptToast("📲 Virement prêt à être envoyé par SMS RP !");
    setTimeout(() => setReceiptToast(null), 3500);
  };

  // Export entire banking statement (Bilan global PDF)
  const handleExportFullStatementPDF = () => {
    try {
      const issueDate = new Date().toLocaleDateString("fr-CA", { year: 'numeric', month: 'long', day: 'numeric' });
      const totalIn = transactions.filter(t => t.type === 'salary' || t.type === 'transfer_in').reduce((a, b) => a + b.amount, 0);
      const totalOut = transactions.filter(t => t.type === 'transfer_out' || t.type === 'purchase').reduce((a, b) => a + b.amount, 0);

      const rowsHtml = transactions.map(t => {
        const isNegative = t.type === 'transfer_out' || t.type === 'purchase';
        const typeBadge = t.type === 'salary' ? 'SALAIRE' : t.type === 'purchase' ? 'ACHAT' : 'VIREMENT';
        return `
        <tr style="border-bottom: 1px solid #334155;">
          <td style="padding:10px;">DSJ-${t.id}</td>
          <td style="padding:10px;">${t.date}</td>
          <td style="padding:10px;">
            <span style="font-size:9px; padding:2px 6px; border-radius:4px; font-weight:bold; background:${t.type === 'salary' ? '#064e3b' : t.type === 'purchase' ? '#78350f' : '#1e1b4b'}; color:${t.type === 'salary' ? '#34d399' : t.type === 'purchase' ? '#fbbf24' : '#a5b4fc'}; margin-right:6px;">
              ${typeBadge}
            </span>
            <strong>${t.recipient}</strong>
          </td>
          <td style="padding:10px; text-align:right; font-weight:bold; color: ${isNegative ? '#f43f5e' : '#34d399'};">
            ${isNegative ? '-' : '+'}$${t.amount.toLocaleString()} CAD
          </td>
        </tr>
      `}).join("");

      const htmlContent = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Releve_Bancaire_Desjardins_${playerName}</title>
  <style>
    body { font-family: Arial, sans-serif; background: #0f172a; color: #f8fafc; padding: 40px; margin: 0; }
    .card { max-width: 700px; margin: auto; background: #1e293b; border: 2px solid #10b981; border-radius: 16px; padding: 30px; }
    .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #334155; padding-bottom: 20px; }
    .brand { color: #34d399; font-size: 24px; font-weight: bold; }
    .summary { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 15px; margin: 20px 0; background: #0f172a; padding: 15px; border-radius: 12px; }
    .stat-val { font-size: 18px; font-weight: bold; }
    table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 12px; }
    th { background: #0f172a; color: #94a3b8; text-align: left; padding: 10px; text-transform: uppercase; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <div>
        <div class="brand">DESJARDINS</div>
        <div style="color:#94a3b8; font-size:12px;">RELEVÉ DE COMPTE OFFICIEL • PORTNEUF RP</div>
      </div>
      <div style="text-align:right; font-size:12px; color:#a7f3d0;">
        Titulaire : <strong>${playerName}</strong><br>
        Date : ${issueDate}
      </div>
    </div>

    <div class="summary">
      <div>
        <div style="color:#94a3b8; font-size:10px;">SOLDE ACTUEL</div>
        <div class="stat-val" style="color:#34d399;">$${bankAmount.toLocaleString()}</div>
      </div>
      <div>
        <div style="color:#94a3b8; font-size:10px;">TOTAL REÇU</div>
        <div class="stat-val" style="color:#38bdf8;">+$${totalIn.toLocaleString()}</div>
      </div>
      <div>
        <div style="color:#94a3b8; font-size:10px;">TOTAL ENVOYÉ</div>
        <div class="stat-val" style="color:#f43f5e;">-$${totalOut.toLocaleString()}</div>
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th>Réf</th>
          <th>Date</th>
          <th>Tiers / Description</th>
          <th style="text-align:right;">Montant</th>
        </tr>
      </thead>
      <tbody>
        ${rowsHtml}
      </tbody>
    </table>

    <div style="text-align:center; font-size:10px; color:#64748b; margin-top:25px; border-top:1px solid #334155; padding-top:15px;">
      Document certifié conforme par la Caisse Populaire Desjardins de Portneuf.<br>
      Horodatage serveur : ${new Date().toLocaleString('fr-CA')}
    </div>
  </div>
</body>
</html>`;

      const blob = new Blob([htmlContent], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Releve_Bancaire_Desjardins_${playerName.replace(/\s+/g, '_')}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      playBiometricSound("success");
      setReceiptToast(`📄 Relevé de compte complet exporté pour ${playerName} !`);
      setTimeout(() => setReceiptToast(null), 3500);
    } catch (e) {
      console.error("Full Statement Export Error:", e);
      triggerPhoneError();
    }
  };

  // SMS handler
  const handleSendMessage = (e?: React.FormEvent, customText?: string) => {
    if (e) e.preventDefault();
    const textToSend = customText !== undefined ? customText : newMsgText;

    if (!textToSend.trim()) {
      triggerPhoneError();
      return;
    }

    const tid = activeThreadId || selectedRecipient || "general";
    const nowTime = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    const newMsg: RPMessage = {
      id: `msg_${Date.now()}`,
      threadId: tid,
      sender: playerName || "me",
      recipient: tid,
      text: textToSend.trim(),
      time: nowTime,
      isRead: true,
    };

    setMessages((prev) => [...prev, newMsg]);
    playBiometricSound("scan");
    setNewMsgText("");

    // Simulated Auto RP response from NPC contacts
    if (tid !== "general") {
      setTimeout(() => {
        let replyText = "Message bien reçu en RP.";
        const contactMatch = contacts.find((c) => c.phone === tid || c.name === tid);

        if (tid === "514-555-0182" || (contactMatch && contactMatch.name.includes("Gaston"))) {
          replyText = "C'est noté mon ami ! Je te garde une grosse poutine toute chaude 🍟 !";
        } else if (tid === "911-SPVM" || tid === "911-SQ" || (contactMatch && contactMatch.category === "emergency")) {
          replyText = "🚨 Central Urgence: Signalement enregistré. Patrouille notifiée.";
        } else if (tid === "514-555-8294" || (contactMatch && contactMatch.name.includes("Taxi"))) {
          replyText = "🚕 Taxi Rapide: Chauffeur assigné ! Arrivée estimée dans 2 minutes.";
        } else if (contactMatch) {
          replyText = `Reçu de la part de ${contactMatch.name} ! Merci pour ton message.`;
        }

        const replyMsg: RPMessage = {
          id: `msg_reply_${Date.now()}`,
          threadId: tid,
          sender: contactMatch ? contactMatch.name : tid,
          recipient: playerName || "me",
          text: replyText,
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          isRead: false,
        };
        setMessages((prev) => [...prev, replyMsg]);
        playBiometricSound("success");
      }, 1200);
    }
  };

  const filteredContacts = contacts
    .filter((c) => {
      // Category filter
      if (selectedCategoryFilter !== "all" && c.category !== selectedCategoryFilter) {
        return false;
      }
      // Specific icon filter
      if (selectedIconFilter !== "all") {
        const activeIconMeta = getContactIconMeta(c.customIcon, c.category);
        if (activeIconMeta.id !== selectedIconFilter) {
          return false;
        }
      }
      // Sub-group filter
      if (selectedSubGroupFilter !== "all") {
        if (selectedSubGroupFilter === "none") {
          if (c.subGroupId) return false;
        } else if (c.subGroupId !== selectedSubGroupFilter) {
          return false;
        }
      }
      // Favorites only filter
      if (onlyFavoritesFilter && !c.isFavorite) {
        return false;
      }
      // Text search filter (name, phone, notes, category label, icon label, sub-group)
      if (contactSearch.trim()) {
        const q = contactSearch.toLowerCase().trim();
        const catMeta = CONTACT_CATEGORIES.find((cat) => cat.id === c.category);
        const catLabel = (catMeta?.label || "").toLowerCase();
        const iconMeta = getContactIconMeta(c.customIcon, c.category);
        const iconLabel = (iconMeta.label || "").toLowerCase();
        const subGroup = contactSubGroups.find((g) => g.id === c.subGroupId);
        const subGroupName = (subGroup?.name || "").toLowerCase();

        const matchName = c.name.toLowerCase().includes(q);
        const matchPhone = c.phone.toLowerCase().includes(q);
        const matchNotes = c.notes ? c.notes.toLowerCase().includes(q) : false;
        const matchCat = (c.category || "").toLowerCase().includes(q) || catLabel.includes(q);
        const matchIcon = (c.customIcon || "").toLowerCase().includes(q) || iconLabel.includes(q);
        const matchSubGroup = subGroupName.includes(q);

        if (!matchName && !matchPhone && !matchNotes && !matchCat && !matchIcon && !matchSubGroup) {
          return false;
        }
      }
      return true;
    })
    .sort((a, b) => {
      // Priorité absolue aux favoris/épinglés dans le système de tri
      if (a.isFavorite && !b.isFavorite) return -1;
      if (!a.isFavorite && b.isFavorite) return 1;

      // Tri secondaire selon les critères sélectionnés
      if (contactSortBy === "category") {
        const catOrder: Record<string, number> = {
          emergency: 1,
          services: 2,
          work: 3,
          commercial: 4,
          government: 5,
          citizen: 6,
        };
        const orderA = catOrder[a.category || "citizen"] || 99;
        const orderB = catOrder[b.category || "citizen"] || 99;
        if (orderA !== orderB) return orderA - orderB;
        return a.name.localeCompare(b.name, "fr");
      }
      if (contactSortBy === "name-desc") {
        return b.name.localeCompare(a.name, "fr");
      }
      return a.name.localeCompare(b.name, "fr");
    });

  // Pinned / favorite contacts for top quick-access section
  const pinnedFavorites = contacts.filter((c) => c.isFavorite);
  const activePinnedContacts = contactSearch.trim()
    ? pinnedFavorites.filter((c) => {
        const q = contactSearch.toLowerCase().trim();
        return (
          c.name.toLowerCase().includes(q) ||
          c.phone.toLowerCase().includes(q) ||
          (c.notes && c.notes.toLowerCase().includes(q))
        );
      })
    : pinnedFavorites;

  return (
    <motion.div
      key={`phone-wrapper-${errorShakeKey}-${callPulseKey}`}
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{
        opacity: 1,
        scale: 1,
        x: errorShakeKey > 0 ? [0, -12, 12, -9, 9, -5, 5, -2, 0] : 0,
        y: errorShakeKey > 0 ? [0, -3, 3, -2, 2, -1, 1, 0] : 0,
        rotate: errorShakeKey > 0 ? [0, -1.8, 1.8, -1.2, 1.2, -0.6, 0.6, 0] : 0,
      }}
      transition={
        errorShakeKey > 0
          ? { duration: 0.45, ease: "easeInOut" }
          : { duration: 0.3, ease: "easeOut" }
      }
      className="fixed bottom-6 right-6 z-[120] font-mono select-none"
    >
      {/* LIGHT PULSE AURA WHEN CALL CONNECTS */}
      <AnimatePresence>
        {callPulseKey > 0 && (
          <motion.div
            key={`call-pulse-glow-${callPulseKey}`}
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{
              opacity: [0, 1, 0.85, 1, 0],
              scale: [0.96, 1.06, 1.03, 1.07, 1.01],
              boxShadow: [
                "0 0 0px transparent",
                "0 0 90px rgba(16,185,129,0.95), 0 0 130px rgba(6,182,212,0.85), 0 0 50px rgba(245,158,11,0.6)",
                "0 0 60px rgba(16,185,129,0.7), 0 0 90px rgba(6,182,212,0.6)",
                "0 0 100px rgba(16,185,129,0.9), 0 0 140px rgba(6,182,212,0.8)",
                "0 0 0px transparent",
              ],
            }}
            transition={{ duration: 1.5, ease: "easeInOut" }}
            className="absolute -inset-4 rounded-[50px] bg-gradient-to-r from-emerald-500/30 via-cyan-400/40 to-amber-400/30 blur-xl pointer-events-none z-[-1]"
          />
        )}
      </AnimatePresence>

      {/* ERROR RED SHADOW SHAKE OVERLAY */}
      <AnimatePresence>
        {errorShakeKey > 0 && (
          <motion.div
            key={`error-shake-glow-${errorShakeKey}`}
            initial={{ opacity: 0 }}
            animate={{
              opacity: [0, 0.9, 0],
              boxShadow: [
                "0 0 0px transparent",
                "0 0 70px rgba(244,63,94,0.95), 0 0 30px rgba(225,29,72,0.8)",
                "0 0 0px transparent",
              ],
            }}
            transition={{ duration: 0.5, ease: "easeInOut" }}
            className="absolute -inset-2 rounded-[46px] border-2 border-rose-500/80 bg-rose-950/20 pointer-events-none z-[130]"
          />
        )}
      </AnimatePresence>

      {/* Smartphone Hardware Frame with Cyber-Neon Gradient Border */}
      <div className={`p-[3px] bg-gradient-to-b from-cyan-400 via-indigo-500 to-purple-600 rounded-[44px] transition-all duration-300 ${
        callPulseKey > 0
          ? "shadow-[0_0_65px_rgba(16,185,129,0.95),0_0_45px_rgba(0,255,231,0.8)]"
          : errorShakeKey > 0
          ? "shadow-[0_0_65px_rgba(244,63,94,0.95)]"
          : "shadow-[0_0_45px_rgba(0,255,231,0.35),0_0_30px_rgba(168,85,247,0.35)]"
      }`}>
        <div className="w-[340px] h-[640px] bg-slate-950/90 backdrop-blur-2xl rounded-[42px] flex flex-col overflow-hidden relative text-slate-100 border border-cyan-500/30">
          
          {/* ─── BIOMETRIC AUTHENTICATION LOCK OVERLAY ─── */}
          <AnimatePresence>
            {isLocked && (
              <motion.div
                key={isLocked ? `lock-overlay-${glitchKey}` : "lock-overlay"}
                initial={{ opacity: 0, scale: 0.95, y: 0 }}
                animate={
                  isGlitching
                    ? {
                        opacity: [1, 0.9, 1, 0.7, 1],
                        x: [0, -18, 18, -12, 12, -6, 0],
                        y: [0, 8, -10, 6, -4, 0],
                        skewX: [0, -8, 10, -5, 3, 0],
                        scale: [1, 1.03, 0.97, 1.02, 1],
                        filter: [
                          "drop-shadow(0 0 0px rgba(0,0,0,0))",
                          "drop-shadow(-8px 0px 0px rgba(244,63,94,0.9)) drop-shadow(8px 0px 0px rgba(0,255,231,0.9)) saturate(200%)",
                          "drop-shadow(10px -4px 0px rgba(244,63,94,0.95)) drop-shadow(-10px 4px 0px rgba(0,255,231,0.95)) invert(20%)",
                          "drop-shadow(-6px 2px 0px rgba(244,63,94,0.85)) drop-shadow(6px -2px 0px rgba(0,255,231,0.85))",
                          "drop-shadow(0 0 0px rgba(0,0,0,0))",
                        ],
                      }
                    : { opacity: 1, scale: 1, x: 0, y: 0, skewX: 0, filter: "none" }
                }
                transition={
                  isGlitching
                    ? { duration: 0.65, times: [0, 0.2, 0.4, 0.7, 1], ease: "easeInOut" }
                    : { duration: 0.32, ease: "easeOut" }
                }
                exit={{
                  y: "-105%",
                  opacity: [1, 0.95, 0],
                  scale: [1, 0.98, 0.96],
                  filter: "brightness(1.35) drop-shadow(0 30px 40px rgba(0,255,231,0.8))",
                  transition: { duration: 0.38, ease: [0.77, 0, 0.175, 1] },
                }}
                className={`absolute inset-0 z-[60] rounded-[40px] overflow-hidden flex flex-col justify-between p-5 bg-slate-950/98 backdrop-blur-3xl text-white font-mono border-2 transition-colors duration-200 ${
                  isGlitching
                    ? "border-rose-500/90 shadow-[0_0_80px_rgba(244,63,94,0.85)]"
                    : "border-cyan-500/60 shadow-[0_0_60px_rgba(0,255,231,0.5)]"
                } select-none`}
              >
                {/* Mechanical Shutter Edge Highlight Bar at Bottom */}
                <div className="absolute bottom-0 inset-x-0 h-1.5 bg-gradient-to-r from-cyan-400 via-emerald-400 via-indigo-400 to-purple-500 shadow-[0_0_15px_rgba(0,255,231,0.9)] z-50 pointer-events-none" />
                {/* Chromatic Aberration & Glitch Scanline Overlays */}
                {isGlitching && (
                  <div className="absolute inset-0 pointer-events-none z-50 overflow-hidden rounded-[40px]">
                    {/* Red/Cyan Color Dodge Flash */}
                    <motion.div
                      animate={{ opacity: [0, 0.9, 0.2, 1, 0] }}
                      transition={{ duration: 0.65 }}
                      className="absolute inset-0 bg-rose-600/20 mix-blend-color-dodge border-y-4 border-rose-500/80"
                    />
                    {/* Rapid Horizontally Shifting Glitch Scan Bar */}
                    <motion.div
                      animate={{ y: [-50, 320, -20, 200] }}
                      transition={{ duration: 0.65, ease: "linear" }}
                      className="absolute inset-x-0 h-10 bg-gradient-to-r from-cyan-400/60 via-rose-500/90 to-purple-500/60 backdrop-invert-50 shadow-[0_0_20px_rgba(244,63,94,0.9)]"
                    />
                    {/* Matrix Glitch Alert Text Overlay */}
                    <motion.div
                      animate={{ opacity: [0.3, 1, 0.3, 1] }}
                      transition={{ duration: 0.15, repeat: 4 }}
                      className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-rose-300 font-black text-[10px] uppercase tracking-widest bg-slate-950/95 px-3 py-1.5 rounded-lg border-2 border-rose-500 shadow-[0_0_20px_rgba(244,63,94,0.9)] flex items-center gap-1.5"
                    >
                      <ShieldAlert className="w-4 h-4 text-rose-500 animate-bounce" />
                      <span>ERR_PIN_REFUSÉ_0x884F</span>
                    </motion.div>
                  </div>
                )}

                {/* Background Animated Glows & Matrix Grid */}
                <div className={`absolute top-12 left-1/2 -translate-x-1/2 w-64 h-64 rounded-full blur-3xl pointer-events-none transition-colors duration-300 ${
                  isGlitching ? "bg-rose-600/40" : "bg-cyan-500/20"
                }`} />
                <div className="absolute bottom-12 left-1/2 -translate-x-1/2 w-64 h-64 bg-purple-600/20 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#00f0ff08_1px,transparent_1px),linear-gradient(to_bottom,#00f0ff08_1px,transparent_1px)] bg-[size:16px_16px] pointer-events-none" />

                {/* Top Lock Header */}
                <div className="relative z-10 pt-2 flex flex-col items-center gap-1.5">
                  <div className="w-full flex items-center justify-between text-[10px] text-slate-400 font-bold px-1">
                    <span className="text-cyan-400 font-mono tracking-widest">14:20</span>
                    <div className="flex items-center gap-1">
                      <Cpu className="w-3 h-3 text-cyan-400 animate-pulse" />
                      <span className="text-[9px] uppercase tracking-wider text-slate-300">TroxT OS v5.0</span>
                    </div>
                  </div>

                  <div className="w-full mt-1 pt-2 border-t border-cyan-500/30 flex items-center justify-between">
                    <div className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-[9px] font-black uppercase tracking-widest transition-all ${
                      isGlitching
                        ? "bg-rose-950/90 border-rose-500 text-rose-300 shadow-[0_0_15px_rgba(244,63,94,0.7)]"
                        : "bg-cyan-950/80 border-cyan-400/40 text-cyan-300 shadow-[0_0_12px_rgba(0,255,231,0.3)]"
                    }`}>
                      <ShieldCheck className={`w-3.5 h-3.5 ${isGlitching ? "text-rose-400" : "text-cyan-400"}`} />
                      <span>{isGlitching ? "ERREUR AUTHENTIFICATION" : "AUTHENTIFICATION L5"}</span>
                    </div>
                    <span className="text-[9px] font-black text-purple-300 truncate max-w-[120px]">
                      {playerName}
                    </span>
                  </div>
                </div>

                {/* Main Biometric Center Section */}
                <div className="relative z-10 flex flex-col items-center my-auto">
                  {authMethod === "fingerprint" ? (
                    <>
                      {/* Fingerprint Scanning Target Disc */}
                      <div className="relative w-36 h-36 flex items-center justify-center my-2">
                        {/* Spinning Outer Tech Reticle */}
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
                          className="absolute inset-0 rounded-full border-2 border-dashed border-cyan-400/40 pointer-events-none"
                        />

                        {/* Pulsing Aura Ring */}
                        <motion.div
                          animate={{
                            scale: isScanning ? [1, 1.12, 1] : [1, 1.04, 1],
                            opacity: isScanning ? [0.6, 0.9, 0.6] : [0.3, 0.6, 0.3],
                          }}
                          transition={{ duration: isScanning ? 0.6 : 2, repeat: Infinity, ease: "easeInOut" }}
                          className={`absolute inset-2 rounded-full blur-md ${
                            scanPhase === "success"
                              ? "bg-emerald-500/50"
                              : isGlitching
                              ? "bg-rose-500/60"
                              : "bg-cyan-500/40"
                          }`}
                        />

                        {/* Expanding Ripple Circles during Scan */}
                        {isScanning && (
                          <>
                            <motion.div
                              initial={{ scale: 0.8, opacity: 0.9 }}
                              animate={{ scale: 1.4, opacity: 0 }}
                              transition={{ duration: 1.2, repeat: Infinity }}
                              className="absolute inset-0 rounded-full border-2 border-cyan-300/80 pointer-events-none"
                            />
                            <motion.div
                              initial={{ scale: 0.8, opacity: 0.9 }}
                              animate={{ scale: 1.4, opacity: 0 }}
                              transition={{ duration: 1.2, repeat: Infinity, delay: 0.6 }}
                              className="absolute inset-0 rounded-full border-2 border-emerald-400/80 pointer-events-none"
                            />
                          </>
                        )}

                        {/* Fingerprint Sensor Trigger Button */}
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.94 }}
                          onClick={handleStartScan}
                          onMouseDown={handleStartScan}
                          className={`relative z-10 w-28 h-28 rounded-full border-2 transition-all duration-300 flex flex-col items-center justify-center cursor-pointer overflow-hidden ${
                            scanPhase === "success"
                              ? "bg-emerald-950/90 border-emerald-400 text-emerald-300 shadow-[0_0_35px_rgba(52,211,153,0.8)]"
                              : isGlitching
                              ? "bg-rose-950/90 border-rose-500 text-rose-300 shadow-[0_0_35px_rgba(244,63,94,0.8)]"
                              : isScanning
                              ? "bg-cyan-950/90 border-cyan-300 text-cyan-200 shadow-[0_0_35px_rgba(0,255,231,0.8)]"
                              : "bg-slate-900/90 border-cyan-500/60 hover:border-cyan-300 text-cyan-400 shadow-[0_0_20px_rgba(0,255,231,0.3)]"
                          }`}
                        >
                          {/* Laser Scan Beam */}
                          {isScanning && (
                            <motion.div
                              animate={{ y: [-45, 45, -45] }}
                              transition={{ duration: 1.1, repeat: Infinity, ease: "easeInOut" }}
                              className="absolute inset-x-0 h-1.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_15px_rgba(52,211,153,1)] z-20"
                            />
                          )}

                          {scanPhase === "success" ? (
                            <ShieldCheck className="w-12 h-12 text-emerald-400 animate-bounce drop-shadow-[0_0_10px_rgba(52,211,153,1)]" />
                          ) : (
                            <Fingerprint className={`w-12 h-12 transition-all ${isScanning ? "text-cyan-300 animate-pulse scale-110" : "text-cyan-400 drop-shadow-[0_0_8px_rgba(0,255,231,0.6)]"}`} />
                          )}
                        </motion.button>
                      </div>

                      {/* Scan Progress Bar & Percentage */}
                      <div className="w-full max-w-[220px] mt-3 space-y-1.5">
                        <div className="flex justify-between items-center text-[10px] font-black font-mono">
                          <span className="text-slate-400 uppercase tracking-wider">
                            {scanPhase === "scanning"
                              ? "Scanner Empreinte..."
                              : scanPhase === "success"
                              ? "Empreinte Reconnue"
                              : "Empreinte Neurale"}
                          </span>
                          <span className={scanPhase === "success" ? "text-emerald-400 font-extrabold" : "text-cyan-300 font-extrabold"}>
                            {scanProgress}%
                          </span>
                        </div>

                        <div className="w-full h-2 bg-slate-900 rounded-full border border-slate-700/80 overflow-hidden p-0.5">
                          <motion.div
                            className={`h-full rounded-full transition-all duration-100 ${
                              scanPhase === "success"
                                ? "bg-gradient-to-r from-emerald-400 to-green-500 shadow-[0_0_12px_rgba(52,211,153,0.9)]"
                                : "bg-gradient-to-r from-cyan-400 via-indigo-400 to-fuchsia-500 shadow-[0_0_12px_rgba(0,255,231,0.9)]"
                            }`}
                            style={{ width: `${scanProgress}%` }}
                          />
                        </div>
                      </div>

                      {/* Status Message */}
                      <div className="mt-3 text-center">
                        <div className={`text-[10px] font-black uppercase tracking-wider transition-colors ${
                          scanPhase === "success"
                            ? "text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.8)]"
                            : isScanning
                            ? "text-cyan-300 animate-pulse"
                            : "text-slate-300"
                        }`}>
                          {scanPhase === "success"
                            ? "DÉVERROUILLAGE ÉTHERWORLD..."
                            : isScanning
                            ? "ANALYSE MULTI-SPECTRALE EN COURS..."
                            : "TOUCHEZ LE CAPTEUR POUR S'AUTHENTIFIER"}
                        </div>
                        <div className="text-[8.5px] text-slate-500 font-mono mt-0.5">
                          TroxT Intellectus Biometrics System
                        </div>
                      </div>
                    </>
                  ) : (
                    /* Passcode PIN Mode */
                    <div className="flex flex-col items-center w-full px-2">
                      <div className={`text-xs font-black uppercase tracking-widest mb-3 flex items-center gap-1.5 transition-colors ${
                        isGlitching ? "text-rose-400 animate-pulse" : "text-cyan-300"
                      }`}>
                        <Key className={`w-4 h-4 ${isGlitching ? "text-rose-500" : "text-cyan-400"}`} />
                        <span>{isGlitching ? "CODE PIN INCORRECT !" : "Saisir Code PIN RP"}</span>
                      </div>

                      {/* PIN Display Circles with Horizontal Shake on Error */}
                      <motion.div
                        animate={isGlitching ? { x: [-12, 12, -8, 8, -4, 4, 0] } : { x: 0 }}
                        transition={{ duration: 0.5 }}
                        className="flex gap-3 mb-4"
                      >
                        {[0, 1, 2, 3].map((i) => (
                          <div
                            key={i}
                            className={`w-4 h-4 rounded-full border-2 transition-all ${
                              isGlitching
                                ? "border-rose-500 bg-rose-600/90 shadow-[0_0_12px_rgba(244,63,94,0.9)] scale-110"
                                : pinCode.length > i
                                ? "bg-cyan-400 border-cyan-300 shadow-[0_0_10px_rgba(0,255,231,0.8)] scale-110"
                                : "border-slate-700 bg-slate-900"
                            }`}
                          />
                        ))}
                      </motion.div>

                      {/* Keypad Grid */}
                      <div className="grid grid-cols-3 gap-2.5 w-full max-w-[200px]">
                        {["1", "2", "3", "4", "5", "6", "7", "8", "9", "C", "0", "OK"].map((btn) => (
                          <button
                            key={btn}
                            onClick={() => {
                              if (btn === "C") handleClearPin();
                              else if (btn === "OK") {
                                handleKeyPressPin("");
                              } else handleKeyPressPin(btn);
                            }}
                            className={`py-2.5 rounded-xl border font-black text-sm transition active:scale-95 cursor-pointer flex items-center justify-center ${
                              isGlitching
                                ? "bg-rose-950/80 border-rose-500/80 text-rose-300 shadow-[0_0_10px_rgba(244,63,94,0.3)]"
                                : "bg-slate-900/90 border-cyan-500/30 hover:border-cyan-400 hover:bg-cyan-950/50 text-cyan-200 shadow-[0_0_8px_rgba(0,255,231,0.15)]"
                            }`}
                          >
                            {btn}
                          </button>
                        ))}
                      </div>

                      {/* PIN Helper & Glitch Test Button */}
                      <div className="mt-3 flex items-center justify-between w-full max-w-[200px] text-[8.5px]">
                        <span className="text-slate-400">PIN: <strong className="text-cyan-300 font-mono">1337</strong> / <strong className="text-purple-300 font-mono">7777</strong></span>
                        <button
                          onClick={triggerGlitch}
                          className="text-rose-400 hover:text-rose-300 underline font-black cursor-pointer transition"
                        >
                          Tester Glitch
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Bottom Switch & Emergency Bypass Controls */}
                <div className="relative z-10 pt-2 border-t border-slate-800 flex flex-col gap-2">
                  <div className="flex items-center justify-between gap-2">
                    <button
                      onClick={() => setAuthMethod(authMethod === "fingerprint" ? "pin" : "fingerprint")}
                      className="flex-1 py-1.5 rounded-xl bg-slate-900/80 border border-slate-700 hover:border-cyan-400 text-[9px] font-extrabold text-cyan-300 transition flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      {authMethod === "fingerprint" ? (
                        <>
                          <Key className="w-3 h-3 text-cyan-400" />
                          <span>Utiliser Code PIN</span>
                        </>
                      ) : (
                        <>
                          <Fingerprint className="w-3 h-3 text-cyan-400" />
                          <span>Utiliser Empreinte</span>
                        </>
                      )}
                    </button>

                    <button
                      onClick={handleBypassUnlock}
                      className="px-3 py-1.5 rounded-xl bg-emerald-950/80 border border-emerald-500/50 hover:border-emerald-400 text-[9px] font-extrabold text-emerald-300 transition flex items-center justify-center gap-1 cursor-pointer shadow-[0_0_10px_rgba(52,211,153,0.3)]"
                    >
                      <Unlock className="w-3 h-3 text-emerald-400" />
                      <span>Accès Rapide</span>
                    </button>
                  </div>

                  <div className="text-[8px] text-slate-500 text-center tracking-wider">
                    Projet Étherworld • TroxT Intellectus
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ─── INCOMING CALL FULL-SCREEN OVERLAY ─── */}
          <AnimatePresence>
            {incomingCall && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 30 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.8, y: 50 }}
                transition={{ type: "spring", stiffness: 300, damping: 25 }}
                className="absolute inset-0 z-50 rounded-[40px] overflow-hidden flex flex-col justify-between p-6 bg-slate-950/95 backdrop-blur-2xl text-white font-mono border border-cyan-500/50 shadow-[0_0_50px_rgba(0,255,231,0.4)]"
              >
                {/* Dynamic Background Glow Effects */}
                <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-cyan-500/20 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute bottom-1/4 left-1/2 -translate-x-1/2 translate-y-1/2 w-48 h-48 bg-purple-500/20 rounded-full blur-3xl pointer-events-none" />

                {/* Top Header Banner */}
                <div className="relative z-10 text-center pt-4">
                  <motion.div
                    animate={{ opacity: [0.6, 1, 0.6] }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                    className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/80 border border-cyan-400/40 text-[10px] font-black text-cyan-300 uppercase tracking-widest shadow-[0_0_12px_rgba(0,255,231,0.3)]"
                  >
                    <PhoneIncoming className="w-3.5 h-3.5 text-cyan-400 animate-bounce" />
                    <span>Appel Entrant RP</span>
                  </motion.div>
                </div>

                {/* Center Caller Info & Ring Animation */}
                <div className="relative z-10 flex flex-col items-center my-auto">
                  {/* Concentric Pulsing Ring Animations using Framer Motion */}
                  <div className="relative w-28 h-28 flex items-center justify-center mb-6">
                    {[0, 1, 2].map((i) => (
                      <motion.div
                        key={i}
                        className="absolute inset-0 rounded-full border-2 border-cyan-400/50 pointer-events-none"
                        initial={{ scale: 1, opacity: 0.8 }}
                        animate={{ scale: [1, 1.8, 2.5], opacity: [0.8, 0.3, 0] }}
                        transition={{
                          duration: 2.2,
                          repeat: Infinity,
                          delay: i * 0.7,
                          ease: "easeOut",
                        }}
                      />
                    ))}

                    {/* Caller Avatar Disc */}
                    <motion.div
                      animate={{ scale: [1, 1.06, 1] }}
                      transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
                      className={`w-24 h-24 rounded-full ${incomingCall.avatarColor || "bg-gradient-to-br from-cyan-600 to-indigo-600"} flex items-center justify-center text-3xl font-black text-white shadow-[0_0_30px_rgba(0,255,231,0.6)] border-2 border-cyan-300/60 relative z-10`}
                    >
                      {incomingCall.callerName.charAt(0).toUpperCase()}
                    </motion.div>
                  </div>

                  {/* Caller Details */}
                  <h2 className="text-lg font-black text-white text-center tracking-tight drop-shadow-[0_0_10px_rgba(0,255,231,0.6)] mb-1">
                    {incomingCall.callerName}
                  </h2>
                  <div className="text-xs font-extrabold text-cyan-300/90 tracking-wider mb-1">
                    {incomingCall.callerNumber}
                  </div>
                  {incomingCall.callerTitle && (
                    <div className="text-[10px] font-bold text-slate-400 max-w-[200px] text-center truncate">
                      {incomingCall.callerTitle}
                    </div>
                  )}
                </div>

                {/* Bottom Action Buttons: Accept & Decline */}
                <div className="relative z-10 flex items-center justify-around pb-6 px-4">
                  {/* Decline Button (Red) */}
                  <div className="flex flex-col items-center gap-1.5">
                    <motion.button
                      whileHover={{ scale: 1.12 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={handleDeclineCall}
                      className="w-16 h-16 rounded-full bg-gradient-to-br from-rose-500 to-red-700 hover:from-rose-400 hover:to-red-600 border-2 border-red-300/50 flex items-center justify-center text-white shadow-[0_0_25px_rgba(244,63,94,0.7)] cursor-pointer"
                      title="Refuser l'appel"
                    >
                      <PhoneOff className="w-7 h-7 text-white drop-shadow-[0_0_6px_rgba(0,0,0,0.5)]" />
                    </motion.button>
                    <span className="text-[10px] font-black text-rose-400 uppercase tracking-wider">Refuser</span>
                  </div>

                  {/* Accept Button (Green) with Glowing Pulse */}
                  <div className="flex flex-col items-center gap-1.5 relative">
                    <motion.div
                      className="absolute -inset-2 rounded-full border-2 border-emerald-400/60 pointer-events-none"
                      animate={{ scale: [1, 1.25, 1], opacity: [0.8, 0, 0.8] }}
                      transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                    />
                    <motion.button
                      whileHover={{ scale: 1.12 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={handleAcceptCall}
                      className="w-16 h-16 rounded-full bg-gradient-to-br from-emerald-400 to-green-600 hover:from-emerald-300 hover:to-green-500 border-2 border-emerald-200/60 flex items-center justify-center text-white shadow-[0_0_25px_rgba(16,185,129,0.8)] cursor-pointer relative z-10"
                      title="Accepter l'appel"
                    >
                      <Phone className="w-7 h-7 text-white drop-shadow-[0_0_6px_rgba(0,0,0,0.5)]" />
                    </motion.button>
                    <span className="text-[10px] font-black text-emerald-400 uppercase tracking-wider">Accepter</span>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ─── ACTIVE CALL FULL-SCREEN OVERLAY ─── */}
          <AnimatePresence>
            {activeCall && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.25 }}
                className="absolute inset-0 z-50 rounded-[40px] overflow-hidden flex flex-col justify-between p-6 bg-slate-950/95 backdrop-blur-2xl text-white font-mono border border-emerald-500/50 shadow-[0_0_45px_rgba(16,185,129,0.3)]"
              >
                {/* Header Banner */}
                <div className="relative z-10 text-center pt-4">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-950/80 border border-emerald-400/40 text-[10px] font-black text-emerald-300 uppercase tracking-widest shadow-[0_0_12px_rgba(16,185,129,0.3)]">
                    <PhoneCall className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                    <span>En Communication</span>
                  </div>
                </div>

                {/* Caller Info & Duration */}
                <div className="relative z-10 flex flex-col items-center my-auto">
                  <div className={`w-20 h-20 rounded-full ${activeCall.avatarColor || "bg-emerald-600"} flex items-center justify-center text-2xl font-black text-white shadow-[0_0_25px_rgba(16,185,129,0.5)] border-2 border-emerald-300/40 mb-4`}>
                    {activeCall.callerName.charAt(0).toUpperCase()}
                  </div>

                  <h3 className="text-base font-black text-white text-center mb-1 drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]">
                    {activeCall.callerName}
                  </h3>
                  <div className="text-xs font-bold text-slate-400 mb-3">
                    {activeCall.callerNumber}
                  </div>

                  {/* Call Timer Counter */}
                  <div className="text-xl font-black text-emerald-400 tracking-widest drop-shadow-[0_0_10px_rgba(16,185,129,0.8)] mb-4">
                    {formatCallDuration(callDuration)}
                  </div>

                  {/* Animated Audio Equalizer Waveform */}
                  <div className="flex items-center gap-1.5 h-6">
                    {[1, 2, 3, 4, 5, 6].map((bar) => (
                      <motion.div
                        key={bar}
                        className="w-1 bg-emerald-400 rounded-full"
                        animate={{ height: isMuted ? [4, 4, 4] : [4, 18, 6, 22, 10] }}
                        transition={{
                          duration: 0.8,
                          repeat: Infinity,
                          repeatType: "reverse",
                          delay: bar * 0.1,
                        }}
                      />
                    ))}
                  </div>
                </div>

                {/* Call Control Buttons */}
                <div className="relative z-10 flex flex-col gap-4 pb-4">
                  <div className="flex items-center justify-center gap-4">
                    <button
                      onClick={() => setIsMuted(!isMuted)}
                      className={`p-3 rounded-2xl border transition flex items-center gap-1.5 text-xs font-bold cursor-pointer ${
                        isMuted
                          ? "bg-rose-900/60 border-rose-500 text-rose-300"
                          : "bg-slate-900/80 border-slate-700 text-slate-300 hover:border-slate-500"
                      }`}
                    >
                      {isMuted ? <MicOff className="w-4 h-4 text-rose-400" /> : <Mic className="w-4 h-4 text-emerald-400" />}
                      <span>{isMuted ? "Sourdine" : "Micro"}</span>
                    </button>

                    <button
                      onClick={() => setIsSpeakerOn(!isSpeakerOn)}
                      className={`p-3 rounded-2xl border transition flex items-center gap-1.5 text-xs font-bold cursor-pointer ${
                        isSpeakerOn
                          ? "bg-cyan-900/60 border-cyan-500 text-cyan-300"
                          : "bg-slate-900/80 border-slate-700 text-slate-300 hover:border-slate-500"
                      }`}
                    >
                      <Volume2 className={`w-4 h-4 ${isSpeakerOn ? "text-cyan-400" : "text-slate-500"}`} />
                      <span>Haut-parleur</span>
                    </button>
                  </div>

                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleEndCall}
                    className="w-full py-3 rounded-2xl bg-gradient-to-r from-rose-600 to-red-700 hover:from-rose-500 hover:to-red-600 border border-red-400/50 text-white font-black text-xs uppercase tracking-wider shadow-[0_0_20px_rgba(244,63,94,0.5)] flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <PhoneOff className="w-4 h-4" />
                    <span>Raccrocher</span>
                  </motion.button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Notch Header */}
          <div className="bg-slate-950/90 backdrop-blur-md pt-3 pb-2 px-6 flex items-center justify-between border-b border-cyan-500/30 shrink-0">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-extrabold text-cyan-400 tracking-wider drop-shadow-[0_0_6px_rgba(0,255,231,0.6)]">14:20</span>
              {isAirplaneMode && (
                <span className="flex items-center gap-0.5 px-1.5 py-0.2 rounded-full bg-amber-500/20 border border-amber-400/50 text-amber-300 text-[8px] font-extrabold animate-pulse" title="Mode Avion Actif">
                  <Plane className="w-2.5 h-2.5 text-amber-400" /> Avion
                </span>
              )}
              {isDoNotDisturb && (
                <span className="flex items-center gap-0.5 px-1.5 py-0.2 rounded-full bg-purple-500/20 border border-purple-400/50 text-purple-300 text-[8px] font-extrabold animate-pulse" title="Ne Pas Déranger Actif">
                  <BellOff className="w-2.5 h-2.5 text-purple-400" /> DND
                </span>
              )}
            </div>

            <div className="w-16 h-3.5 bg-slate-950 rounded-full border border-purple-500/50 shadow-[0_0_10px_rgba(168,85,247,0.4)]"></div>
            
            <div className="flex items-center gap-1.5">
              <button
                onClick={toggleAirplaneMode}
                className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full border flex items-center gap-1 transition cursor-pointer ${
                  isAirplaneMode
                    ? "text-amber-300 bg-amber-950/90 border-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.5)]"
                    : "text-slate-400 hover:text-white bg-slate-900 border-slate-700"
                }`}
                title={isAirplaneMode ? "Désactiver Mode Avion" : "Activer Mode Avion"}
              >
                <Plane className={`w-3 h-3 ${isAirplaneMode ? "text-amber-400 animate-pulse" : "text-slate-400"}`} />
              </button>

              <button
                onClick={toggleDoNotDisturb}
                className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full border flex items-center gap-1 transition cursor-pointer ${
                  isDoNotDisturb
                    ? "text-purple-300 bg-purple-950/90 border-purple-400 shadow-[0_0_10px_rgba(168,85,247,0.5)]"
                    : "text-slate-400 hover:text-white bg-slate-900 border-slate-700"
                }`}
                title={isDoNotDisturb ? "Désactiver Ne Pas Déranger" : "Activer Ne Pas Déranger"}
              >
                <BellOff className={`w-3 h-3 ${isDoNotDisturb ? "text-purple-400 animate-pulse" : "text-slate-400"}`} />
              </button>

              <button
                onClick={() => {
                  setIsLocked(true);
                  setIsScanning(false);
                  setScanProgress(0);
                  setScanPhase("idle");
                }}
                className="text-[9px] font-extrabold text-purple-300 hover:text-white bg-purple-950/80 px-2 py-0.5 rounded-full border border-purple-500/40 flex items-center gap-1 transition shadow-[0_0_8px_rgba(168,85,247,0.3)] cursor-pointer"
                title="Verrouiller l'appareil (Biométrie)"
              >
                <Lock className="w-3 h-3 text-purple-400" />
              </button>

              <button
                onClick={() => handleTriggerIncomingCall("Gaston Poutine", "514-555-0182", "Roulotte à Poutine Centre-ville", "bg-amber-600")}
                className="text-[9px] font-extrabold text-cyan-300 hover:text-white bg-cyan-950/80 px-2 py-0.5 rounded-full border border-cyan-500/40 flex items-center gap-1 transition shadow-[0_0_8px_rgba(0,255,231,0.3)] cursor-pointer"
                title="Simuler un appel entrant"
              >
                <PhoneIncoming className="w-3 h-3 text-cyan-400 animate-pulse" />
                <span>Test</span>
              </button>

              <button onClick={onClose} className="text-cyan-400 hover:text-white transition drop-shadow-[0_0_6px_rgba(0,255,231,0.5)]">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Call Toast Notification */}
          {callToast && (
            <div className="bg-gradient-to-r from-cyan-600 to-purple-600 text-white text-[10px] font-black px-4 py-2 flex items-center gap-2 border-b border-cyan-300 shadow-[0_0_15px_rgba(0,255,231,0.5)] animate-pulse shrink-0">
              <PhoneCall className="w-3.5 h-3.5 shrink-0 text-cyan-200" />
              <span className="truncate">{callToast}</span>
            </div>
          )}

          {/* Dynamic Screen Content with Smoked Glass Backdrop */}
          <div className="flex-1 overflow-hidden p-4 bg-slate-950/50 backdrop-blur-xl relative z-10">
            {/* Dynamic Background Wallpaper Layer with Smooth Cross-fade Animation */}
            <AnimatePresence initial={false}>
              <motion.div
                key={wallpaper}
                initial={{ opacity: 0, scale: 1.04, filter: "blur(6px)" }}
                animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                exit={{ opacity: 0, scale: 0.96, filter: "blur(6px)" }}
                transition={{ duration: 0.65, ease: [0.4, 0, 0.2, 1] }}
                className="absolute inset-0 pointer-events-none overflow-hidden z-0"
              >
                {renderDynamicWallpaper(wallpaper, customWallpaperUrl)}
              </motion.div>
            </AnimatePresence>

            <AnimatePresence mode="wait" custom={slideDirection}>
              <motion.div
                key={activeApp}
                custom={slideDirection}
                variants={phoneScreenVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                className="h-full w-full overflow-y-auto scrollbar-thin flex flex-col relative z-10"
              >
            
            {/* APP: HOME DASHBOARD */}
            {activeApp === "home" && (
              <motion.div
                variants={homeStaggerContainer}
                initial="hidden"
                animate="show"
                className="flex flex-col h-full justify-between"
              >
                <div>
                  {/* Citizen Wallet Card */}
                  <motion.div
                    variants={homeStaggerItem}
                    className="relative bg-slate-950/80 backdrop-blur-md border border-cyan-500/40 p-4 rounded-2xl mb-6 text-center shadow-[0_0_20px_rgba(0,255,231,0.15)] overflow-hidden"
                  >
                    <div className="absolute -top-10 -right-10 w-24 h-24 bg-purple-500/20 rounded-full blur-xl pointer-events-none" />
                    <div className="text-[10px] font-extrabold text-cyan-400 uppercase tracking-widest mb-1 drop-shadow-[0_0_6px_rgba(0,255,231,0.6)]">
                      Portefeuille Citoyen
                    </div>
                    <div className="text-xl font-black text-emerald-400 drop-shadow-[0_0_10px_rgba(52,211,153,0.5)]">
                      ${cashAmount.toLocaleString()}
                    </div>
                    <div className="text-[10px] text-purple-300 font-bold mt-1 drop-shadow-[0_0_6px_rgba(168,85,247,0.4)]">
                      Banque Desjardins: ${bankAmount.toLocaleString()}
                    </div>
                  </motion.div>

                  {/* CUSTOMIZABLE HOME WIDGETS SECTION */}
                  {enabledWidgets.length > 0 && (
                    <motion.div variants={homeStaggerItem} className="mb-5 space-y-2.5">
                      <div className="flex items-center justify-between px-1">
                        <span className="text-[10px] font-black uppercase text-cyan-400 tracking-wider flex items-center gap-1.5">
                          <LayoutGrid className="w-3.5 h-3.5 text-cyan-400" /> Widgets ({enabledWidgets.length})
                        </span>
                        <button
                          onClick={() => {
                            setSettingsTab("widgets");
                            setActiveApp("settings");
                          }}
                          className="text-[8.5px] font-bold text-slate-300 hover:text-white flex items-center gap-1 bg-cyan-950/80 px-2 py-0.5 rounded-full border border-cyan-500/40 transition cursor-pointer shadow-sm"
                        >
                          <Edit2 className="w-2.5 h-2.5 text-cyan-400" /> Personnaliser
                        </button>
                      </div>

                      <div className="space-y-2.5">
                        {enabledWidgets.map((widgetId) => {
                          // 1. WEATHER WIDGET
                          if (widgetId === "weather") {
                            return (
                              <motion.div
                                key="weather"
                                initial={{ opacity: 0, scale: 0.98 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="p-3 bg-gradient-to-r from-amber-950/50 via-slate-900/90 to-slate-950 border border-amber-500/40 rounded-2xl shadow-lg relative overflow-hidden backdrop-blur-md"
                              >
                                <div className="flex items-center justify-between relative z-10">
                                  <div className="flex items-center gap-2.5">
                                    <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-400/50 flex items-center justify-center shrink-0">
                                      <Sun className="w-5 h-5 text-amber-400 animate-spin-slow" />
                                    </div>
                                    <div>
                                      <div className="flex items-center gap-1.5">
                                        <span className="text-base font-black text-white leading-none">
                                          {weatherCondition.temp > 0 ? `+${weatherCondition.temp}°C` : `${weatherCondition.temp}°C`}
                                        </span>
                                        <span className="text-[8.5px] font-black px-1.5 py-0.2 rounded bg-amber-950/90 text-amber-300 border border-amber-500/40">
                                          {weatherCondition.condition}
                                        </span>
                                      </div>
                                      <div className="text-[8.5px] text-slate-300 font-mono mt-0.5">
                                        📍 {weatherCondition.city} • Vent: {weatherCondition.wind} km/h
                                      </div>
                                    </div>
                                  </div>

                                  <button
                                    onClick={cycleWeatherCondition}
                                    className="p-1.5 bg-amber-950/80 hover:bg-amber-900/90 text-amber-300 border border-amber-500/40 rounded-xl text-[9px] font-bold flex items-center gap-1 cursor-pointer transition shadow-sm"
                                    title="Changer le climat"
                                  >
                                    <RefreshCw className="w-3 h-3 text-amber-400" />
                                  </button>
                                </div>
                              </motion.div>
                            );
                          }

                          // 2. FAVORITE CONTACTS SHORTCUTS WIDGET
                          if (widgetId === "contacts") {
                            const favoriteList = contacts.filter((c) => c.isFavorite);
                            const favoriteContacts = favoriteList.length > 0 ? favoriteList.slice(0, 3) : contacts.slice(0, 3);
                            return (
                              <motion.div
                                key="contacts"
                                initial={{ opacity: 0, scale: 0.98 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="p-3 bg-gradient-to-r from-blue-950/50 via-slate-900/90 to-slate-950 border border-blue-500/40 rounded-2xl shadow-lg backdrop-blur-md"
                              >
                                <div className="flex items-center justify-between mb-2">
                                  <div className="text-[10px] font-black uppercase text-blue-400 flex items-center gap-1.5">
                                    <Users className="w-3.5 h-3.5 text-blue-400" /> Raccourcis Favoris
                                  </div>
                                  <button
                                    onClick={() => setActiveApp("contacts")}
                                    className="text-[8.5px] font-bold text-blue-300 hover:underline flex items-center gap-0.5 cursor-pointer"
                                  >
                                    Répertoire <ChevronRight className="w-2.5 h-2.5" />
                                  </button>
                                </div>

                                <div className="grid grid-cols-3 gap-1.5">
                                  {favoriteContacts.map((c) => {
                                    const iconMeta = getContactIconMeta(c.customIcon, c.category);
                                    const IconComp = iconMeta.icon;
                                    return (
                                      <div
                                        key={c.id}
                                        className="p-2 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col items-center text-center relative group hover:border-cyan-500/40 transition"
                                      >
                                        <div className={`w-7 h-7 rounded-xl ${c.avatarColor || "bg-indigo-600"} flex items-center justify-center text-white text-xs mb-1 shadow-sm relative`}>
                                          <IconComp className="w-3.5 h-3.5 text-white drop-shadow" />
                                          {c.isFavorite && (
                                            <div className="absolute -top-1 -right-1 w-3 h-3 bg-amber-400 text-slate-950 rounded-full flex items-center justify-center shadow">
                                              <Star className="w-2 h-2 fill-slate-950 text-slate-950" />
                                            </div>
                                          )}
                                        </div>
                                        <div className="text-[9px] font-bold text-white truncate w-full">{c.name.split(" ")[0]}</div>
                                        <div className="text-[8px] text-slate-400 font-mono truncate w-full mb-1.5">{c.phone}</div>

                                        <div className="flex items-center gap-1 w-full justify-center">
                                          <button
                                            onClick={() => {
                                              handleMakeOutgoingCall(c.name, c.phone);
                                              handleTriggerIncomingCall(c.name, c.phone, "Appel favori");
                                            }}
                                            className="p-1 rounded-lg bg-emerald-600/30 hover:bg-emerald-600/60 border border-emerald-500/40 text-emerald-300 transition cursor-pointer"
                                            title="Appeler"
                                          >
                                            <Phone className="w-2.5 h-2.5" />
                                          </button>
                                          <button
                                            onClick={() => {
                                              handleOpenSMSForContact(c);
                                              setActiveApp("messages");
                                            }}
                                            className="p-1 rounded-lg bg-indigo-600/30 hover:bg-indigo-600/60 border border-indigo-500/40 text-indigo-300 transition cursor-pointer"
                                            title="SMS"
                                          >
                                            <MessageSquare className="w-2.5 h-2.5" />
                                          </button>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </motion.div>
                            );
                          }

                          // 3. DESJARDINS BANK BALANCE WIDGET
                          if (widgetId === "bank") {
                            return (
                              <motion.div
                                key="bank"
                                initial={{ opacity: 0, scale: 0.98 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="p-3 bg-gradient-to-r from-emerald-950/50 via-slate-900/90 to-slate-950 border border-emerald-500/40 rounded-2xl shadow-lg backdrop-blur-md"
                              >
                                <div className="flex items-center justify-between mb-1.5">
                                  <div className="text-[10px] font-black uppercase text-emerald-400 flex items-center gap-1.5">
                                    <DollarSign className="w-3.5 h-3.5 text-emerald-400" /> Desjardins - Bilan
                                  </div>
                                  <button
                                    onClick={() => setActiveApp("bank")}
                                    className="text-[8.5px] font-bold text-emerald-300 bg-emerald-950/80 px-2 py-0.5 rounded-full border border-emerald-500/40 flex items-center gap-1 hover:bg-emerald-900 transition cursor-pointer"
                                  >
                                    Virement <ArrowUpRight className="w-2.5 h-2.5" />
                                  </button>
                                </div>

                                <div className="grid grid-cols-2 gap-2 text-[10px]">
                                  <div className="p-2 rounded-xl bg-slate-900/80 border border-slate-800">
                                    <span className="text-[8.5px] text-slate-400 block font-bold">Liquidités Cash :</span>
                                    <span className="text-xs font-black text-emerald-400">${cashAmount.toLocaleString()}</span>
                                  </div>
                                  <div className="p-2 rounded-xl bg-slate-900/80 border border-slate-800">
                                    <span className="text-[8.5px] text-slate-400 block font-bold">Banque Desjardins :</span>
                                    <span className="text-xs font-black text-cyan-300">${bankAmount.toLocaleString()}</span>
                                  </div>
                                </div>
                              </motion.div>
                            );
                          }

                          // 4. QUICK RP NOTES WIDGET
                          if (widgetId === "notes") {
                            return (
                              <motion.div
                                key="notes"
                                initial={{ opacity: 0, scale: 0.98 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="p-3 bg-gradient-to-r from-purple-950/50 via-slate-900/90 to-slate-950 border border-purple-500/40 rounded-2xl shadow-lg backdrop-blur-md"
                              >
                                <div className="flex items-center justify-between mb-2">
                                  <div className="text-[10px] font-black uppercase text-purple-300 flex items-center gap-1.5">
                                    <StickyNote className="w-3.5 h-3.5 text-purple-400" /> Bloc-notes RP ({quickNotes.filter(n => !n.done).length})
                                  </div>
                                  <span className="text-[8px] font-extrabold text-purple-300 bg-purple-950/90 px-1.5 py-0.2 rounded border border-purple-500/30">
                                    Pense-bête
                                  </span>
                                </div>

                                <div className="space-y-1 max-h-32 overflow-y-auto pr-1 mb-2 scrollbar-thin">
                                  {quickNotes.map((note) => (
                                    <div
                                      key={note.id}
                                      className={`p-1.5 rounded-xl border flex items-center justify-between text-[10px] transition ${
                                        note.done
                                          ? "bg-slate-950/60 border-slate-800/80 text-slate-500 line-through"
                                          : "bg-slate-900/90 border-purple-500/20 text-slate-200"
                                      }`}
                                    >
                                      <button
                                        onClick={() => handleToggleQuickNote(note.id)}
                                        className="flex items-center gap-2 text-left flex-1 mr-2 cursor-pointer"
                                      >
                                        <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 ${note.done ? "bg-purple-600 border-purple-400 text-white" : "border-slate-600 bg-slate-950"}`}>
                                          {note.done && <Check className="w-2.5 h-2.5" />}
                                        </div>
                                        <span className="truncate">{note.text}</span>
                                      </button>

                                      <button
                                        onClick={() => handleDeleteQuickNote(note.id)}
                                        className="text-slate-500 hover:text-rose-400 p-0.5 cursor-pointer"
                                      >
                                        <Trash2 className="w-3 h-3" />
                                      </button>
                                    </div>
                                  ))}
                                </div>

                                <form onSubmit={handleAddQuickNote} className="flex gap-1">
                                  <div className="relative flex-1 flex items-center">
                                    <input
                                      type="text"
                                      placeholder="Ajouter une note..."
                                      value={newQuickNoteText}
                                      onChange={(e) => setNewQuickNoteText(e.target.value)}
                                      onKeyDown={handleInputKeyDown}
                                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1 text-[10px] text-white focus:outline-none focus:border-purple-500 animate-notes-caret font-medium pr-5"
                                    />
                                    <div className="absolute right-2 flex items-center pointer-events-none select-none">
                                      <span className="w-1 h-2.5 bg-purple-400 rounded-xs animate-cursor-block opacity-80" />
                                    </div>
                                  </div>
                                  <button
                                    type="submit"
                                    className="px-2.5 py-1 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-[10px] font-bold flex items-center gap-0.5 cursor-pointer shrink-0"
                                  >
                                    <Plus className="w-3 h-3" />
                                  </button>
                                </form>
                              </motion.div>
                            );
                          }

                          // 5. MINI RADIO PLAYER WIDGET
                          if (widgetId === "radio") {
                            return (
                              <motion.div
                                key="radio"
                                initial={{ opacity: 0, scale: 0.98 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="p-3 bg-gradient-to-r from-cyan-950/50 via-slate-900/90 to-slate-950 border border-cyan-500/40 rounded-2xl shadow-lg backdrop-blur-md"
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2.5">
                                    <button
                                      onClick={() => setIsMiniRadioPlaying(!isMiniRadioPlaying)}
                                      className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 cursor-pointer transition shadow-md ${
                                        isMiniRadioPlaying
                                          ? "bg-cyan-400 text-slate-950 border-cyan-200 shadow-[0_0_12px_rgba(0,255,231,0.8)]"
                                          : "bg-cyan-950/80 text-cyan-300 border-cyan-500/40 hover:bg-cyan-900"
                                      }`}
                                    >
                                      {isMiniRadioPlaying ? <Square className="w-4 h-4 fill-slate-950" /> : <Play className="w-4 h-4 fill-cyan-300 ml-0.5" />}
                                    </button>

                                    <div>
                                      <div className="text-[10px] font-black text-white flex items-center gap-1.5">
                                        {currentStationName}
                                        {isMiniRadioPlaying && (
                                          <span className="text-[8px] font-bold text-emerald-400 bg-emerald-950 px-1 rounded animate-pulse">
                                            LIVE
                                          </span>
                                        )}
                                      </div>
                                      <div className="text-[9px] text-slate-400 flex items-center gap-1 mt-0.5">
                                        <span>Radio Québec-FM</span>
                                        {isMiniRadioPlaying && (
                                          <div className="flex items-center gap-0.5 h-2.5 ml-1">
                                            {[1, 2, 3, 4].map((b) => (
                                              <motion.div
                                                key={b}
                                                className="w-0.5 bg-cyan-400 rounded-full"
                                                animate={{ height: [2, 10, 4, 8] }}
                                                transition={{ duration: 0.5, repeat: Infinity, repeatType: "reverse", delay: b * 0.1 }}
                                              />
                                            ))}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </div>

                                  <button
                                    onClick={() => setActiveApp("radio")}
                                    className="px-2 py-1 bg-slate-900 border border-slate-800 hover:border-cyan-400 text-cyan-300 text-[9px] font-bold rounded-xl cursor-pointer"
                                  >
                                    Ouvrir
                                  </button>
                                </div>
                              </motion.div>
                            );
                          }

                          // 6. SPVM TRAFFIC WIDGET
                          if (widgetId === "traffic") {
                            const criticalCount = trafficRadarAlerts.filter(a => a.isCritical || a.excessKmH >= 30).length;

                            const formatRelativeTime = (ts: number) => {
                              const diffSec = Math.floor((Date.now() - ts) / 1000);
                              if (diffSec < 15) return "À l'instant";
                              if (diffSec < 60) return `Il y a ${diffSec}s`;
                              const diffMin = Math.floor(diffSec / 60);
                              if (diffMin < 60) return `Il y a ${diffMin}m`;
                              return `Il y a ${Math.floor(diffMin / 60)}h`;
                            };

                            return (
                              <motion.div
                                key="traffic"
                                initial={{ opacity: 0, scale: 0.98 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="p-3 bg-gradient-to-r from-rose-950/60 via-slate-900/95 to-slate-950 border border-rose-500/50 rounded-2xl shadow-xl backdrop-blur-md"
                              >
                                {/* Header Controls */}
                                <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-rose-500/30">
                                  <div className="flex items-center gap-1.5">
                                    <Activity className="w-3.5 h-3.5 text-rose-400 animate-pulse" />
                                    <div>
                                      <div className="text-[10px] font-black uppercase text-rose-300 tracking-wide flex items-center gap-1">
                                        Radar Trafic SPVM/SQ
                                        {criticalCount > 0 && (
                                          <span className="px-1 py-0.2 bg-red-600 text-white text-[7px] font-black rounded-full animate-bounce">
                                            {criticalCount}!
                                          </span>
                                        )}
                                      </div>
                                      <div className="text-[7.5px] text-slate-400 flex items-center gap-1">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping inline-block" />
                                        Réseau de détection laser actif
                                      </div>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-1">
                                    <button
                                      onClick={handleSimulateRadarScan}
                                      title="Lancer un scan radar"
                                      className="px-1.5 py-1 bg-rose-900/80 hover:bg-rose-800 border border-rose-400/60 text-white text-[8px] font-black rounded-lg transition flex items-center gap-1 cursor-pointer shadow-[0_0_8px_rgba(244,63,94,0.4)]"
                                    >
                                      <Zap className="w-2.5 h-2.5 text-rose-300" />
                                      Scan
                                    </button>

                                    <button
                                      onClick={handleClearTrafficAlerts}
                                      title="Effacer l'historique des alertes radar"
                                      className="px-1.5 py-1 bg-slate-900/90 hover:bg-rose-950 border border-rose-500/40 text-rose-300 hover:text-rose-100 text-[8px] font-bold rounded-lg transition flex items-center gap-1 cursor-pointer"
                                    >
                                      <Trash2 className="w-2.5 h-2.5 text-rose-400" />
                                      Vider
                                    </button>
                                  </div>
                                </div>

                                {/* Toast Notification */}
                                {trafficRadarToast && (
                                  <AnimatePresence>
                                    <motion.div
                                      initial={{ opacity: 0, y: -4 }}
                                      animate={{ opacity: 1, y: 0 }}
                                      exit={{ opacity: 0, y: -4 }}
                                      className="mb-2 px-2 py-1 bg-rose-950/90 border border-rose-500/70 text-rose-200 text-[8.5px] font-bold rounded-lg flex items-center justify-between shadow-md"
                                    >
                                      <span>{trafficRadarToast}</span>
                                    </motion.div>
                                  </AnimatePresence>
                                )}

                                {/* Radar Scan Alert Feed */}
                                {trafficRadarAlerts.length === 0 ? (
                                  <div className="py-3 px-2 text-center bg-slate-900/80 border border-slate-800/80 rounded-xl">
                                    <ShieldCheck className="w-5 h-5 mx-auto text-emerald-400 mb-1" />
                                    <div className="text-[10px] font-extrabold text-slate-200">Historique des alertes vide</div>
                                    <div className="text-[8px] text-slate-400">Aucune infraction radar enregistrée.</div>
                                    <button
                                      onClick={handleSimulateRadarScan}
                                      className="mt-2 px-2.5 py-1 bg-rose-950 hover:bg-rose-900 border border-rose-500/50 text-rose-200 text-[8.5px] font-extrabold rounded-lg transition inline-flex items-center gap-1 cursor-pointer"
                                    >
                                      <Zap className="w-3 h-3 text-rose-400" /> Simuler un scan radar
                                    </button>
                                  </div>
                                ) : (
                                  <div className="space-y-1.5 max-h-[180px] overflow-y-auto pr-0.5 custom-scrollbar">
                                    {trafficRadarAlerts.slice(0, 4).map((alert) => {
                                      const isCritical = alert.isCritical || alert.excessKmH >= 30 || alert.speedKmH >= 110;

                                      if (isCritical) {
                                        return (
                                          <div
                                            key={alert.id}
                                            className="p-2 bg-gradient-to-r from-red-950/90 via-rose-950/80 to-slate-950 border-2 border-red-500/90 rounded-xl shadow-[0_0_12px_rgba(239,68,68,0.5)] relative overflow-hidden"
                                          >
                                            <div className="flex items-center justify-between mb-1">
                                              <span className="px-1.5 py-0.5 bg-red-600 text-white text-[7.5px] font-black rounded tracking-wider uppercase flex items-center gap-1 animate-pulse shadow-[0_0_8px_rgba(220,38,38,0.8)]">
                                                <AlertTriangle className="w-2.5 h-2.5" /> CRITIQUE +{alert.excessKmH} KM/H
                                              </span>
                                              <span className="text-[7.5px] font-extrabold text-red-300">
                                                {formatRelativeTime(alert.timestamp)}
                                              </span>
                                            </div>

                                            <div className="flex items-baseline justify-between mb-0.5">
                                              <span className="text-[10px] font-black text-red-100 flex items-center gap-1">
                                                🏎️ {alert.vehicleName}
                                              </span>
                                              <span className="text-[11px] font-black text-red-400 drop-shadow-[0_0_6px_rgba(248,113,113,0.9)]">
                                                {alert.speedKmH} km/h <span className="text-[7.5px] font-semibold text-rose-300/80">(lim. {alert.speedLimitKmH})</span>
                                              </span>
                                            </div>

                                            <div className="flex items-center justify-between text-[8px] text-rose-200/90">
                                              <span>👤 {alert.driverName} <span className="text-rose-400 font-mono font-bold">[{alert.plate}]</span></span>
                                              <span className="text-rose-300 italic font-medium">{alert.location}</span>
                                            </div>
                                          </div>
                                        );
                                      }

                                      return (
                                        <div key={alert.id} className="p-2 bg-slate-900/90 border border-amber-500/30 rounded-xl">
                                          <div className="flex items-center justify-between mb-1">
                                            <span className="px-1.5 py-0.2 bg-amber-950 text-amber-300 border border-amber-500/40 text-[7.5px] font-bold rounded flex items-center gap-1">
                                              <Activity className="w-2 h-2 text-amber-400" /> EXCÈS +{alert.excessKmH} KM/H
                                            </span>
                                            <span className="text-[7.5px] text-slate-400 font-medium">
                                              {formatRelativeTime(alert.timestamp)}
                                            </span>
                                          </div>

                                          <div className="flex items-baseline justify-between mb-0.5">
                                            <span className="text-[9.5px] font-bold text-slate-200">
                                              🚗 {alert.vehicleName}
                                            </span>
                                            <span className="text-[10px] font-extrabold text-amber-300">
                                              {alert.speedKmH} km/h <span className="text-[7.5px] font-normal text-slate-400">(lim. {alert.speedLimitKmH})</span>
                                            </span>
                                          </div>

                                          <div className="flex items-center justify-between text-[8px] text-slate-400">
                                            <span>👤 {alert.driverName} [{alert.plate}]</span>
                                            <span className="text-slate-400 italic">{alert.location}</span>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </motion.div>
                            );
                          }

                          return null;
                        })}
                      </div>
                    </motion.div>
                  )}

                  <div className="grid grid-cols-3 gap-2.5">
                    <motion.button
                      variants={homeStaggerItem}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setActiveApp("calls")}
                      className="relative flex flex-col items-center justify-center p-2.5 rounded-2xl bg-cyan-950/50 border border-cyan-400/50 hover:border-cyan-300 hover:bg-cyan-900/50 transition shadow-[0_0_12px_rgba(0,255,231,0.2)] text-cyan-300 cursor-pointer"
                    >
                      {missedCount > 0 && (
                        <span className="absolute -top-1 -right-1 px-1.5 py-0.2 rounded-full bg-rose-600 text-white text-[8px] font-black animate-pulse border border-rose-300 shadow-[0_0_8px_rgba(244,63,94,0.8)]">
                          {missedCount}
                        </span>
                      )}
                      <PhoneCall className="w-5 h-5 mb-1 text-cyan-400 drop-shadow-[0_0_8px_rgba(0,255,231,0.8)]" />
                      <span className="text-[8.5px] font-black uppercase tracking-wider">Appels</span>
                    </motion.button>

                    <motion.button
                      variants={homeStaggerItem}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setActiveApp("contacts")}
                      className="flex flex-col items-center justify-center p-2.5 rounded-2xl bg-blue-950/40 border border-blue-400/50 hover:border-blue-300 hover:bg-blue-900/50 transition shadow-[0_0_12px_rgba(59,130,246,0.2)] text-blue-300 cursor-pointer"
                    >
                      <BookUser className="w-5 h-5 mb-1 text-blue-400 drop-shadow-[0_0_8px_rgba(59,130,246,0.8)]" />
                      <span className="text-[8.5px] font-black uppercase tracking-wider">Contacts</span>
                    </motion.button>

                    <motion.button
                      variants={homeStaggerItem}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setActiveApp("messages")}
                      className="flex flex-col items-center justify-center p-2.5 rounded-2xl bg-indigo-950/40 border border-indigo-400/50 hover:border-indigo-300 hover:bg-indigo-900/50 transition shadow-[0_0_12px_rgba(99,102,241,0.2)] text-indigo-300 cursor-pointer"
                    >
                      <MessageSquare className="w-5 h-5 mb-1 text-indigo-400 drop-shadow-[0_0_8px_rgba(99,102,241,0.8)]" />
                      <span className="text-[8.5px] font-black uppercase tracking-wider">Messages</span>
                    </motion.button>

                    <motion.button
                      variants={homeStaggerItem}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setActiveApp("bank")}
                      className="flex flex-col items-center justify-center p-2.5 rounded-2xl bg-emerald-950/40 border border-emerald-400/50 hover:border-emerald-300 hover:bg-emerald-900/50 transition shadow-[0_0_12px_rgba(16,185,129,0.2)] text-emerald-300 cursor-pointer"
                    >
                      <DollarSign className="w-5 h-5 mb-1 text-emerald-400 drop-shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                      <span className="text-[8.5px] font-black uppercase tracking-wider">Banque</span>
                    </motion.button>

                    <motion.button
                      variants={homeStaggerItem}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setActiveApp("gps")}
                      className="flex flex-col items-center justify-center p-2.5 rounded-2xl bg-amber-950/40 border border-amber-400/50 hover:border-amber-300 hover:bg-amber-900/50 transition shadow-[0_0_12px_rgba(245,158,11,0.2)] text-amber-300 cursor-pointer"
                    >
                      <Compass className="w-5 h-5 mb-1 text-amber-400 drop-shadow-[0_0_8px_rgba(245,158,11,0.8)]" />
                      <span className="text-[8.5px] font-black uppercase tracking-wider">GPS RP</span>
                    </motion.button>

                    <motion.button
                      variants={homeStaggerItem}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setActiveApp("darkweb")}
                      className="flex flex-col items-center justify-center p-2.5 rounded-2xl bg-rose-950/40 border border-rose-400/50 hover:border-rose-300 hover:bg-rose-900/50 transition shadow-[0_0_12px_rgba(244,63,94,0.2)] text-rose-300 cursor-pointer"
                    >
                      <Skull className="w-5 h-5 mb-1 text-rose-400 drop-shadow-[0_0_8px_rgba(244,63,94,0.8)]" />
                      <span className="text-[8.5px] font-black uppercase tracking-wider">Dark Web</span>
                    </motion.button>

                    <motion.button
                      variants={homeStaggerItem}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setActiveApp("gallery")}
                      className="col-span-3 flex items-center justify-center gap-2 p-2.5 rounded-2xl bg-gradient-to-r from-pink-950/70 to-fuchsia-950/70 border border-pink-400/60 hover:border-pink-300 hover:bg-pink-900/60 transition shadow-[0_0_15px_rgba(236,72,153,0.3)] text-pink-300 cursor-pointer mt-0.5"
                    >
                      <Camera className="w-4 h-4 text-pink-400 animate-pulse drop-shadow-[0_0_8px_rgba(236,72,153,0.8)]" />
                      <span className="text-[9px] font-black uppercase tracking-wider text-white flex items-center gap-1.5">
                        Galerie Photos RP <span className="bg-pink-500/30 text-pink-200 border border-pink-400/40 text-[7.5px] px-1.5 py-0.2 rounded-full">IA & Clichés</span>
                      </span>
                    </motion.button>

                    <motion.button
                      variants={homeStaggerItem}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setActiveApp("radio")}
                      className="col-span-3 flex items-center justify-center gap-2 p-2.5 rounded-2xl bg-cyan-950/60 border border-cyan-400/60 hover:border-cyan-300 hover:bg-cyan-900/60 transition shadow-[0_0_15px_rgba(0,255,231,0.25)] text-cyan-300 cursor-pointer mt-0.5"
                    >
                      <Radio className="w-4 h-4 text-cyan-400 animate-pulse drop-shadow-[0_0_8px_rgba(0,255,231,0.8)]" />
                      <span className="text-[9px] font-black uppercase tracking-wider text-white">Radio Québec-FM</span>
                    </motion.button>

                    <motion.button
                      variants={homeStaggerItem}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setActiveApp("admin")}
                      className="col-span-3 flex items-center justify-center gap-2 p-2 rounded-2xl bg-purple-950/40 border border-purple-400/50 hover:border-purple-300 hover:bg-purple-900/50 transition shadow-[0_0_12px_rgba(168,85,247,0.2)] text-purple-300 cursor-pointer mt-0.5"
                    >
                      <ShieldAlert className="w-4 h-4 text-purple-400 drop-shadow-[0_0_8px_rgba(168,85,247,0.8)]" />
                      <span className="text-[9px] font-black uppercase tracking-wider">Staff & Admin RP</span>
                    </motion.button>

                    <motion.button
                      variants={homeStaggerItem}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setActiveApp("settings")}
                      className="col-span-3 flex items-center justify-center gap-2 p-2 rounded-2xl bg-slate-900/80 border border-slate-700 hover:border-cyan-400 hover:bg-slate-800/80 transition shadow-[0_0_12px_rgba(255,255,255,0.08)] text-slate-200 cursor-pointer mt-0.5"
                    >
                      <Settings className="w-4 h-4 text-cyan-300" />
                      <span className="text-[9px] font-black uppercase tracking-wider">Paramètres & Fonds d'écran</span>
                    </motion.button>
                  </div>
                </div>

                <motion.div
                  variants={homeStaggerItem}
                  className="text-center text-[10px] text-cyan-400/80 font-black tracking-widest uppercase drop-shadow-[0_0_4px_rgba(0,255,231,0.4)]"
                >
                  Etherworld by TroxT intellectus
                </motion.div>
              </motion.div>
            )}

            {/* APP: QUEBEC-FM RADIO */}
            {activeApp === "radio" && (
              <div className="flex flex-col h-full">
                <div className="flex items-center gap-2 mb-2 pb-2 border-b border-slate-800">
                  <button onClick={() => setActiveApp("home")} className="text-slate-400 hover:text-white cursor-pointer">
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                  <span className="text-xs font-black uppercase text-cyan-400 flex items-center gap-1.5">
                    <Radio className="w-4 h-4 text-cyan-400" /> Radio Québec-FM
                  </span>
                </div>
                <div className="flex-1 overflow-y-auto">
                  <QuebecFMRadioUI onClose={() => setActiveApp("home")} />
                </div>
              </div>
            )}

          {/* APP: CALLS & CALL HISTORY (JOURNAL D'APPELS) */}
          {activeApp === "calls" && (
            <div className="flex flex-col h-full overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between mb-2 border-b border-slate-800 pb-2 shrink-0">
                <div className="flex items-center gap-2">
                  <button onClick={() => setActiveApp("home")} className="text-slate-400 hover:text-white cursor-pointer">
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                  <h3 className="text-xs font-bold uppercase text-cyan-400 flex items-center gap-1.5">
                    <PhoneCall className="w-4 h-4 text-cyan-400" /> Appels & Journal
                  </h3>
                </div>

                <button
                  onClick={() => setActiveApp("contacts")}
                  className="text-[9.5px] font-bold text-cyan-300 hover:underline flex items-center gap-1 bg-cyan-950/80 border border-cyan-500/30 px-2 py-0.5 rounded-lg cursor-pointer"
                >
                  <BookUser className="w-3 h-3" /> Contacts
                </button>
              </div>

              {/* Subtabs Filter Bar */}
              <div className="flex items-center gap-1 p-1 bg-slate-900/90 border border-slate-800 rounded-xl mb-2 shrink-0">
                <button
                  onClick={() => setCallLogFilter("all")}
                  className={`flex-1 py-1 text-[8.5px] font-extrabold rounded-lg transition flex items-center justify-center gap-1 cursor-pointer ${
                    callLogFilter === "all"
                      ? "bg-cyan-600 text-white shadow-[0_0_10px_rgba(0,255,231,0.3)]"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  <span>Tous</span>
                  <span className="px-1 py-0.2 rounded-full bg-slate-950 text-[8px] font-mono">
                    {callLogs.length}
                  </span>
                </button>

                <button
                  onClick={() => setCallLogFilter("missed")}
                  className={`flex-1 py-1 text-[8.5px] font-extrabold rounded-lg transition flex items-center justify-center gap-1 cursor-pointer ${
                    callLogFilter === "missed"
                      ? "bg-rose-600 text-white shadow-[0_0_10px_rgba(244,63,94,0.4)]"
                      : "text-rose-400 hover:text-white"
                  }`}
                >
                  <PhoneMissed className="w-3 h-3 text-rose-300" />
                  <span>Manqués</span>
                  {missedCount > 0 && (
                    <span className="px-1 py-0.2 rounded-full bg-rose-950 text-rose-300 border border-rose-500/40 text-[8px] font-mono font-black">
                      {missedCount}
                    </span>
                  )}
                </button>

                <button
                  onClick={() => setCallLogFilter("incoming")}
                  className={`flex-1 py-1 text-[8.5px] font-extrabold rounded-lg transition flex items-center justify-center gap-1 cursor-pointer ${
                    callLogFilter === "incoming"
                      ? "bg-emerald-600 text-white shadow-[0_0_10px_rgba(16,185,129,0.3)]"
                      : "text-emerald-400 hover:text-white"
                  }`}
                >
                  <PhoneIncoming className="w-3 h-3 text-emerald-300" />
                  <span>Entrants</span>
                </button>

                <button
                  onClick={() => setCallLogFilter("outgoing")}
                  className={`flex-1 py-1 text-[8.5px] font-extrabold rounded-lg transition flex items-center justify-center gap-1 cursor-pointer ${
                    callLogFilter === "outgoing"
                      ? "bg-blue-600 text-white shadow-[0_0_10px_rgba(59,130,246,0.3)]"
                      : "text-blue-400 hover:text-white"
                  }`}
                >
                  <PhoneOutgoing className="w-3 h-3 text-blue-300" />
                  <span>Sortants</span>
                </button>
              </div>

              {/* Search Bar */}
              <div className="relative mb-2 shrink-0">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  placeholder="Rechercher nom ou numéro..."
                  value={callLogSearch}
                  onChange={(e) => setCallLogSearch(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-[10px] text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              {/* Call History List */}
              <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 scrollbar-thin min-h-0">
                {filteredCallLogs.length === 0 ? (
                  <div className="text-center py-8 text-[10px] text-slate-500 font-bold italic">
                    Aucun appel enregistré dans cette catégorie
                  </div>
                ) : (
                  filteredCallLogs.map((log) => {
                    const isSavedContact = getContactForSender(log.callerNumber) || getContactForSender(log.callerName);

                    return (
                      <div
                        key={log.id}
                        className={`p-2.5 rounded-xl border transition flex items-center justify-between ${
                          log.type === "missed"
                            ? "bg-rose-950/20 border-rose-500/30 hover:border-rose-500/60"
                            : log.type === "incoming"
                            ? "bg-slate-950/80 border-slate-800 hover:border-emerald-500/40"
                            : "bg-slate-950/80 border-slate-800 hover:border-cyan-500/40"
                        }`}
                      >
                        {/* Left: Distinctive Call Type Icon & Caller Details */}
                        <div className="flex items-center gap-2.5 overflow-hidden">
                          <div
                            className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border shadow-sm ${
                              log.type === "missed"
                                ? "bg-rose-950/90 border-rose-500/50 text-rose-400 shadow-[0_0_10px_rgba(244,63,94,0.3)]"
                                : log.type === "incoming"
                                ? "bg-emerald-950/90 border-emerald-500/50 text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.2)]"
                                : "bg-cyan-950/90 border-cyan-500/50 text-cyan-400 shadow-[0_0_10px_rgba(0,255,231,0.2)]"
                            }`}
                          >
                            {log.type === "missed" ? (
                              <PhoneMissed className="w-4 h-4 text-rose-400 animate-pulse" />
                            ) : log.type === "incoming" ? (
                              <PhoneIncoming className="w-4 h-4 text-emerald-400" />
                            ) : (
                              <PhoneOutgoing className="w-4 h-4 text-cyan-400" />
                            )}
                          </div>

                          <div className="overflow-hidden">
                            <div className="flex items-center gap-1.5">
                              <span
                                className={`text-xs font-extrabold truncate ${
                                  log.type === "missed" ? "text-rose-300" : "text-white"
                                }`}
                              >
                                {log.callerName}
                              </span>
                              {log.type === "missed" && (
                                <span className="text-[7.5px] px-1 py-0.2 rounded bg-rose-950 border border-rose-500/40 text-rose-400 font-mono font-black uppercase">
                                  Manqué
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-2 text-[9px] text-slate-400 font-mono">
                              <span>{log.callerNumber}</span>
                              <span>•</span>
                              <span className="text-slate-500">{log.timestamp}</span>
                              {log.duration && log.type !== "missed" && (
                                <>
                                  <span>•</span>
                                  <span className="text-slate-400 font-bold">{log.duration}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Right: Actions */}
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => handleMakeOutgoingCall(log.callerName, log.callerNumber, log.avatarColor)}
                            className="p-1.5 rounded-lg bg-emerald-600/20 border border-emerald-500/40 text-emerald-400 hover:bg-emerald-600/40 transition cursor-pointer"
                            title={`Rappeler ${log.callerName}`}
                          >
                            <PhoneCall className="w-3.5 h-3.5" />
                          </button>

                          {!isSavedContact && (
                            <button
                              onClick={() => handleStartAddContact(log.callerNumber)}
                              className="p-1.5 rounded-lg bg-cyan-600/20 border border-cyan-500/40 text-cyan-300 hover:bg-cyan-600/40 transition cursor-pointer"
                              title="Ajouter aux contacts"
                            >
                              <UserPlus className="w-3.5 h-3.5" />
                            </button>
                          )}

                          <button
                            onClick={() => handleDeleteCallLog(log.id)}
                            className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-500 hover:text-rose-400 hover:border-rose-500/40 transition cursor-pointer"
                            title="Supprimer de l'historique"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Quick Manual Dialer Footer */}
              <div className="pt-2 border-t border-slate-800 shrink-0 mt-1">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!manualDialNumber.trim()) return;
                    const matched = getContactForSender(manualDialNumber);
                    handleMakeOutgoingCall(
                      matched ? matched.name : `Inconnu (${manualDialNumber})`,
                      manualDialNumber
                    );
                    setManualDialNumber("");
                  }}
                  className="flex gap-1.5"
                >
                  <input
                    type="text"
                    placeholder="Composer un numéro..."
                    value={manualDialNumber}
                    onChange={(e) => setManualDialNumber(e.target.value)}
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
                  />
                  <button
                    type="submit"
                    className="px-3 py-1.5 bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 text-white rounded-xl font-bold text-xs flex items-center gap-1 cursor-pointer shadow-[0_0_10px_rgba(0,255,231,0.3)]"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    <span>Appeler</span>
                  </button>
                </form>

                {callLogs.length > 0 && (
                  <div className="flex justify-between items-center mt-1 px-1">
                    <span className="text-[8px] text-slate-500 font-mono">
                      {callLogs.length} appel(s) enregistré(s)
                    </span>
                    <button
                      onClick={() => setCallLogs([])}
                      className="text-[8px] text-slate-500 hover:text-rose-400 transition underline cursor-pointer"
                    >
                      Effacer tout l'historique
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* APP: CONTACTS */}
          {activeApp === "contacts" && (
            <div className="flex flex-col h-full overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between mb-2.5 border-b border-slate-800 pb-2 shrink-0">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setActiveApp("home");
                      setIsAddingContact(false);
                      setIsEditingContact(null);
                    }}
                    className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
                    title="Retour au menu principal"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                  <div>
                    <h3 className="text-xs font-bold uppercase text-cyan-400 flex items-center gap-1.5">
                      <BookUser className="w-4 h-4 text-cyan-400" /> Répertoire ({filteredContacts.length}/{contacts.length})
                    </h3>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => {
                      setEditingSubGroup(null);
                      setSubGroupNameInput("");
                      setSubGroupColorInput("emerald");
                      setSubGroupDescInput("");
                      setShowSubGroupsModal(true);
                    }}
                    className="px-2 py-1 rounded-lg bg-slate-900 border border-slate-700/80 hover:border-cyan-500/50 text-slate-300 hover:text-white text-[10px] font-bold flex items-center gap-1 transition cursor-pointer"
                    title="Gérer les sous-groupes de contacts (ex: Collègues, Famille...)"
                  >
                    <Tags className="w-3 h-3 text-cyan-400" />
                    <span>Groupes ({contactSubGroups.length})</span>
                  </button>

                  <button
                    onClick={() => setActiveApp("calls")}
                    className="px-2 py-1 rounded-lg bg-cyan-950/80 border border-cyan-500/30 text-cyan-300 hover:bg-cyan-900/50 text-[10px] font-bold flex items-center gap-1 transition cursor-pointer"
                    title="Voir l'historique des appels"
                  >
                    <PhoneCall className="w-3 h-3 text-cyan-400" />
                    <span>Journal ({callLogs.length})</span>
                  </button>

                  {!isAddingContact && !isEditingContact && (
                    <button
                      onClick={() => handleStartAddContact()}
                      className="px-2.5 py-1 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-[10px] font-bold flex items-center gap-1 transition cursor-pointer shadow-sm"
                      title="Créer un nouveau contact"
                    >
                      <UserPlus className="w-3 h-3" />
                      <span>Nouveau</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Add / Edit Form View */}
              {(isAddingContact || isEditingContact) ? (
                <form
                  onSubmit={handleSaveContact}
                  className="flex-1 overflow-y-auto flex flex-col gap-3 bg-slate-950/95 p-3 rounded-2xl border border-slate-800 pr-1.5"
                >
                  <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                    <div className="text-xs font-bold text-white flex items-center gap-2">
                      {isEditingContact ? (
                        <Edit2 className="w-4 h-4 text-amber-400" />
                      ) : (
                        <UserPlus className="w-4 h-4 text-cyan-400" />
                      )}
                      <span>{isEditingContact ? `Modifier "${isEditingContact.name}"` : "Nouveau Contact RP"}</span>
                    </div>

                    {/* Live Preview Avatar */}
                    {(() => {
                      const iconMeta = getContactIconMeta(contactFormCustomIcon, contactFormCategory);
                      const IconComp = iconMeta.icon;
                      return (
                        <div className="flex items-center gap-1.5 bg-slate-900 px-2 py-1 rounded-xl border border-slate-800">
                          <span className="text-[9px] text-slate-400 font-bold uppercase">Aperçu:</span>
                          <div className={`w-6 h-6 rounded-full ${contactFormAvatarColor} flex items-center justify-center text-white shadow-sm`}>
                            <IconComp className="w-3.5 h-3.5" />
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Name input */}
                  <div>
                    <label className="text-[10px] font-bold text-slate-300 block mb-1">
                      Nom / Identité RP *
                    </label>
                    <input
                      type="text"
                      placeholder="ex: Agent Bouchard (SQ), Dépannage 24/7..."
                      value={contactFormName}
                      onChange={(e) => setContactFormName(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 focus:border-cyan-500 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none transition"
                      required
                    />
                  </div>

                  {/* Phone input */}
                  <div>
                    <label className="text-[10px] font-bold text-slate-300 block mb-1">
                      Numéro de Téléphone *
                    </label>
                    <input
                      type="text"
                      placeholder="ex: 514-555-0199 ou 911-SQ"
                      value={contactFormPhone}
                      onChange={(e) => setContactFormPhone(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 focus:border-cyan-500 rounded-xl px-3 py-1.5 text-xs text-cyan-300 font-mono placeholder-slate-500 focus:outline-none transition"
                      required
                    />
                  </div>

                  {/* Category Selection */}
                  <div>
                    <label className="text-[10px] font-bold text-slate-300 block mb-1">
                      Catégorie Principale
                    </label>
                    <div className="grid grid-cols-2 gap-1.5">
                      {CONTACT_CATEGORIES.map((cat) => {
                        const CatIcon = cat.icon;
                        const isSelected = contactFormCategory === cat.id;
                        return (
                          <button
                            key={cat.id}
                            type="button"
                            onClick={() => handleCategoryChangeInForm(cat.id)}
                            className={`p-1.5 rounded-xl border text-left flex items-center gap-1.5 transition cursor-pointer ${
                              isSelected
                                ? `${cat.badgeClass} border-cyan-400/80 shadow-sm font-bold`
                                : "bg-slate-900/90 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700"
                            }`}
                          >
                            <CatIcon className={`w-3.5 h-3.5 shrink-0 ${isSelected ? cat.colorClass : "text-slate-400"}`} />
                            <span className="text-[10.5px] truncate">{cat.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Custom Icon Picker */}
                  <div className="bg-slate-900/70 p-2.5 rounded-xl border border-slate-800">
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-[10px] font-bold text-cyan-300 flex items-center gap-1">
                        <span>Icône Personnalisée</span>
                        <span className="text-[9px] text-slate-400 font-normal">
                          (ex: 🔨 Marteau services, 🚨 Gyrophare urgences)
                        </span>
                      </label>
                      {(() => {
                        const activeMeta = getContactIconMeta(contactFormCustomIcon, contactFormCategory);
                        return (
                          <span className="text-[9px] text-amber-300 font-bold bg-amber-950/60 px-1.5 py-0.5 rounded border border-amber-500/30">
                            {activeMeta.emoji} {activeMeta.label.split(" ")[0]}
                          </span>
                        );
                      })()}
                    </div>

                    <div className="grid grid-cols-4 gap-1.5 max-h-36 overflow-y-auto pr-1">
                      {CONTACT_ICONS_CATALOG.map((iconItem) => {
                        const IconComponent = iconItem.icon;
                        const isChosen = contactFormCustomIcon === iconItem.id;
                        return (
                          <button
                            key={iconItem.id}
                            type="button"
                            onClick={() => setContactFormCustomIcon(iconItem.id)}
                            className={`p-1.5 rounded-lg border flex flex-col items-center justify-center gap-1 transition cursor-pointer ${
                              isChosen
                                ? "bg-cyan-950/90 border-cyan-400 text-cyan-300 shadow-[0_0_8px_rgba(6,182,212,0.4)]"
                                : "bg-slate-900 border-slate-800/80 text-slate-400 hover:text-slate-200 hover:border-slate-700 hover:bg-slate-850"
                            }`}
                            title={iconItem.label}
                          >
                            <IconComponent className={`w-4 h-4 ${isChosen ? iconItem.colorClass : "text-slate-300"}`} />
                            <span className="text-[8px] font-semibold truncate w-full text-center leading-tight">
                              {iconItem.label.split(" ")[0]}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Avatar Background Color Picker */}
                  <div>
                    <label className="text-[10px] font-bold text-slate-300 block mb-1">
                      Couleur d'Avatar
                    </label>
                    <div className="flex items-center gap-2 flex-wrap">
                      {[
                        { color: "bg-red-600", label: "Rouge" },
                        { color: "bg-rose-600", label: "Rose" },
                        { color: "bg-amber-600", label: "Ambre" },
                        { color: "bg-orange-600", label: "Orange" },
                        { color: "bg-yellow-600", label: "Jaune" },
                        { color: "bg-emerald-600", label: "Émeraude" },
                        { color: "bg-cyan-600", label: "Cyan" },
                        { color: "bg-blue-600", label: "Bleu" },
                        { color: "bg-indigo-600", label: "Indigo" },
                        { color: "bg-purple-600", label: "Violet" },
                      ].map((item) => (
                        <button
                          key={item.color}
                          type="button"
                          onClick={() => setContactFormAvatarColor(item.color)}
                          className={`w-6 h-6 rounded-full ${item.color} transition cursor-pointer flex items-center justify-center border-2 ${
                            contactFormAvatarColor === item.color
                              ? "border-white scale-110 shadow-md"
                              : "border-transparent opacity-70 hover:opacity-100"
                          }`}
                          title={item.label}
                        >
                          {contactFormAvatarColor === item.color && (
                            <Check className="w-3 h-3 text-white stroke-[3]" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Contact Sub-Group Selector (ex: Collègues, Famille, etc.) */}
                  <div className="bg-slate-900/90 p-2.5 rounded-xl border border-slate-800">
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-[10px] font-bold text-cyan-300 flex items-center gap-1">
                        <Tags className="w-3 h-3 text-cyan-400" />
                        <span>Sous-Groupe Personnalisé</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => handleOpenCreateSubGroup()}
                        className="text-[9px] px-2 py-0.5 rounded-lg bg-cyan-950/80 border border-cyan-500/40 text-cyan-300 hover:bg-cyan-900/60 font-bold flex items-center gap-1 transition cursor-pointer"
                        title="Créer un nouveau sous-groupe"
                      >
                        <Plus className="w-2.5 h-2.5" />
                        <span>+ Créer un groupe</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-1.5 max-h-36 overflow-y-auto pr-1">
                      {/* Option: Aucun sous-groupe */}
                      <button
                        type="button"
                        onClick={() => setContactFormSubGroupId("none")}
                        className={`p-1.5 rounded-xl border text-left flex items-center gap-1.5 transition cursor-pointer ${
                          contactFormSubGroupId === "none"
                            ? "bg-slate-800 border-cyan-400 text-white font-bold shadow-sm"
                            : "bg-slate-950/80 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700"
                        }`}
                      >
                        <span className="w-2 h-2 rounded-full bg-slate-500" />
                        <span className="text-[10px] truncate">Aucun sous-groupe</span>
                      </button>

                      {/* Configured Sub-Groups */}
                      {contactSubGroups.map((grp) => {
                        const colorMeta = getSubGroupColorMeta(grp.color);
                        const isSelected = contactFormSubGroupId === grp.id;
                        return (
                          <button
                            key={grp.id}
                            type="button"
                            onClick={() => setContactFormSubGroupId(grp.id)}
                            className={`p-1.5 rounded-xl border text-left flex items-center justify-between gap-1 transition cursor-pointer ${
                              isSelected
                                ? `${colorMeta.badgeClass} border-cyan-400 shadow-sm font-bold`
                                : "bg-slate-950/80 border-slate-800 text-slate-300 hover:border-slate-700"
                            }`}
                          >
                            <div className="flex items-center gap-1.5 truncate">
                              <span className={`w-2.5 h-2.5 rounded-full ${colorMeta.dotClass} shrink-0`} />
                              <span className="text-[10px] truncate">{grp.name}</span>
                            </div>
                            {isSelected && <Check className="w-3 h-3 text-cyan-400 shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Favorite toggle */}
                  <label className="flex items-center gap-2 bg-slate-900 p-2 rounded-xl border border-slate-800 cursor-pointer hover:bg-slate-850 transition">
                    <input
                      type="checkbox"
                      checked={contactFormIsFavorite}
                      onChange={(e) => setContactFormIsFavorite(e.target.checked)}
                      className="rounded border-slate-700 text-amber-500 focus:ring-0 w-3.5 h-3.5"
                    />
                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-200">
                      <Star className={`w-3.5 h-3.5 ${contactFormIsFavorite ? "text-amber-400 fill-amber-400" : "text-slate-400"}`} />
                      <span>Ajouter aux contacts Favoris (accès rapide)</span>
                    </div>
                  </label>

                  {/* Notes / Description */}
                  <div>
                    <label className="text-[10px] font-bold text-slate-300 block mb-1">
                      Notes / Description RP (optionnel)
                    </label>
                    <input
                      type="text"
                      placeholder="ex: Mécanique lourde, permanence 24/7, canal radio 9..."
                      value={contactFormNotes}
                      onChange={(e) => setContactFormNotes(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 focus:border-cyan-500 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none transition"
                    />
                  </div>

                  {/* Action buttons */}
                  <div className="flex gap-2 pt-1 pb-1">
                    <button
                      type="button"
                      onClick={() => {
                        setIsAddingContact(false);
                        setIsEditingContact(null);
                      }}
                      className="flex-1 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 text-xs font-bold transition cursor-pointer"
                    >
                      Annuler
                    </button>
                    <button
                      type="submit"
                      className="flex-1 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-bold transition cursor-pointer shadow-md"
                    >
                      {isEditingContact ? "Enregistrer les modifications" : "Créer le Contact"}
                    </button>
                  </div>
                </form>
              ) : (
                /* Contact List View with Advanced Search by Category & Custom Icons */
                <div className="flex flex-col h-full overflow-hidden">
                  {/* Search Bar + Advanced Filter Toggle */}
                  <div className="flex items-center gap-1.5 mb-2 shrink-0">
                    <div className="relative flex-1">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                      <input
                        type="text"
                        placeholder="Rechercher nom, n°, notes, icône..."
                        value={contactSearch}
                        onChange={(e) => setContactSearch(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-7 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition"
                      />
                      {contactSearch && (
                        <button
                          onClick={() => setContactSearch("")}
                          className="absolute right-2 top-2 text-slate-400 hover:text-white"
                          title="Effacer la recherche"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    <button
                      onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                      className={`p-2 rounded-xl border text-xs font-bold flex items-center gap-1 transition cursor-pointer ${
                        showAdvancedFilters || selectedIconFilter !== "all" || onlyFavoritesFilter
                          ? "bg-cyan-950 border-cyan-500 text-cyan-300 shadow-[0_0_8px_rgba(6,182,212,0.3)]"
                          : "bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700"
                      }`}
                      title="Recherche & filtres avancés par catégorie et icône"
                    >
                      <SlidersHorizontal className="w-3.5 h-3.5" />
                      {(selectedIconFilter !== "all" || onlyFavoritesFilter) && (
                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                      )}
                    </button>
                  </div>

                  {/* Category Quick Filter Pills (Urgences, Services, Citoyens, Travail, Commerces, Public) */}
                  <div className="flex items-center gap-1 overflow-x-auto pb-1.5 mb-1.5 shrink-0 no-scrollbar">
                    <button
                      onClick={() => setSelectedCategoryFilter("all")}
                      className={`px-2 py-1 rounded-lg text-[10px] font-bold shrink-0 transition cursor-pointer border ${
                        selectedCategoryFilter === "all"
                          ? "bg-cyan-600 text-white border-cyan-400 shadow-sm"
                          : "bg-slate-900/90 text-slate-400 border-slate-800 hover:text-white hover:border-slate-700"
                      }`}
                    >
                      Tous ({contacts.length})
                    </button>

                    {CONTACT_CATEGORIES.map((cat) => {
                      const CatIcon = cat.icon;
                      const count = contacts.filter((c) => c.category === cat.id).length;
                      const isSelected = selectedCategoryFilter === cat.id;
                      return (
                        <button
                          key={cat.id}
                          onClick={() => setSelectedCategoryFilter(isSelected ? "all" : cat.id)}
                          className={`px-2 py-1 rounded-lg text-[10px] font-bold shrink-0 flex items-center gap-1 transition cursor-pointer border ${
                            isSelected
                              ? `${cat.badgeClass} border-cyan-400 shadow-sm`
                              : "bg-slate-900/90 text-slate-400 border-slate-800 hover:text-slate-200 hover:border-slate-700"
                          }`}
                          title={`Filtrer par catégorie ${cat.label}`}
                        >
                          <CatIcon className={`w-3 h-3 ${isSelected ? cat.colorClass : "text-slate-400"}`} />
                          <span>{cat.shortLabel}</span>
                          <span className="opacity-70 text-[9px]">({count})</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Sub-Group Filter Pills with Color Management */}
                  <div className="flex items-center gap-1 overflow-x-auto pb-1.5 mb-1.5 shrink-0 no-scrollbar">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider pl-0.5 shrink-0 flex items-center gap-1">
                      <Tags className="w-2.5 h-2.5 text-cyan-400" />
                      <span>Groupes:</span>
                    </span>

                    <button
                      onClick={() => setSelectedSubGroupFilter("all")}
                      className={`px-2 py-0.5 rounded-lg text-[9.5px] font-bold shrink-0 transition cursor-pointer border ${
                        selectedSubGroupFilter === "all"
                          ? "bg-slate-700 text-white border-slate-500 shadow-sm"
                          : "bg-slate-900/90 text-slate-400 border-slate-800 hover:text-white hover:border-slate-700"
                      }`}
                    >
                      Tous ({contacts.length})
                    </button>

                    {contactSubGroups.map((grp) => {
                      const colorMeta = getSubGroupColorMeta(grp.color);
                      const count = contacts.filter((c) => c.subGroupId === grp.id).length;
                      const isSelected = selectedSubGroupFilter === grp.id;
                      return (
                        <button
                          key={grp.id}
                          onClick={() => setSelectedSubGroupFilter(isSelected ? "all" : grp.id)}
                          className={`px-2 py-0.5 rounded-lg text-[9.5px] font-bold shrink-0 flex items-center gap-1.5 transition cursor-pointer border ${
                            isSelected
                              ? `${colorMeta.badgeClass} ring-1 ring-white/20 shadow-sm font-black`
                              : "bg-slate-900/90 text-slate-300 border-slate-800 hover:border-slate-700"
                          }`}
                          title={`Filtrer par groupe ${grp.name}`}
                        >
                          <span className={`w-2 h-2 rounded-full ${colorMeta.dotClass}`} />
                          <span>{grp.name}</span>
                          <span className="opacity-70 text-[8.5px]">({count})</span>
                        </button>
                      );
                    })}

                    {/* Quick create sub-group button */}
                    <button
                      onClick={() => handleOpenCreateSubGroup()}
                      className="px-2 py-0.5 rounded-lg text-[9px] font-bold shrink-0 flex items-center gap-1 bg-cyan-950/60 hover:bg-cyan-900/80 border border-dashed border-cyan-500/40 text-cyan-400 transition cursor-pointer"
                      title="Créer un nouveau sous-groupe personnalisé"
                    >
                      <Plus className="w-2.5 h-2.5" />
                      <span>+ Groupe</span>
                    </button>
                  </div>

                  {/* Collapsible Advanced Search Panel */}
                  <AnimatePresence>
                    {showAdvancedFilters && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden mb-2 shrink-0"
                      >
                        <div className="p-2.5 bg-slate-950/95 border border-cyan-500/40 rounded-xl flex flex-col gap-2 shadow-lg backdrop-blur-md">
                          <div className="flex items-center justify-between text-[10.5px] font-bold text-cyan-300 pb-1 border-b border-slate-800">
                            <span className="flex items-center gap-1.5">
                              <Filter className="w-3 h-3 text-cyan-400" />
                              <span>Recherche Avancée par Catégorie & Icône</span>
                            </span>
                            <button
                              onClick={() => {
                                setSelectedCategoryFilter("all");
                                setSelectedIconFilter("all");
                                setOnlyFavoritesFilter(false);
                                setContactSearch("");
                                setContactSortBy("category");
                              }}
                              className="text-[9px] text-amber-400 hover:underline flex items-center gap-0.5 cursor-pointer"
                            >
                              <RotateCcw className="w-2.5 h-2.5" /> Réinitialiser
                            </button>
                          </div>

                          {/* Filter by Specific Custom Icon */}
                          <div>
                            <div className="text-[9.5px] font-bold text-slate-300 mb-1 flex items-center justify-between">
                              <span>Filtrer par Icône Spécifique:</span>
                              {selectedIconFilter !== "all" && (
                                <span className="text-[9px] text-cyan-400 font-bold">
                                  Actif: {CONTACT_ICONS_CATALOG.find((i) => i.id === selectedIconFilter)?.label}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1 overflow-x-auto pb-1 no-scrollbar">
                              <button
                                onClick={() => setSelectedIconFilter("all")}
                                className={`px-2 py-0.5 rounded text-[9px] font-bold shrink-0 border ${
                                  selectedIconFilter === "all"
                                    ? "bg-slate-800 text-white border-cyan-500"
                                    : "bg-slate-900 text-slate-400 border-slate-800"
                                }`}
                              >
                                Toutes
                              </button>
                              {CONTACT_ICONS_CATALOG.map((iconItem) => {
                                const ItemIcon = iconItem.icon;
                                const isIconActive = selectedIconFilter === iconItem.id;
                                const countForIcon = contacts.filter(
                                  (c) => getContactIconMeta(c.customIcon, c.category).id === iconItem.id
                                ).length;
                                return (
                                  <button
                                    key={iconItem.id}
                                    onClick={() => setSelectedIconFilter(isIconActive ? "all" : iconItem.id)}
                                    className={`px-1.5 py-0.5 rounded text-[9px] font-bold shrink-0 flex items-center gap-1 border transition cursor-pointer ${
                                      isIconActive
                                        ? "bg-cyan-950 border-cyan-400 text-cyan-300 shadow-sm"
                                        : "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200"
                                    }`}
                                    title={`${iconItem.label} (${countForIcon} contact(s))`}
                                  >
                                    <ItemIcon className={`w-3 h-3 ${isIconActive ? iconItem.colorClass : "text-slate-400"}`} />
                                    <span>{iconItem.label.split(" ")[0]}</span>
                                    {countForIcon > 0 && (
                                      <span className="text-[8px] opacity-70">({countForIcon})</span>
                                    )}
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          {/* Sorting & Favorites Options */}
                          <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-800/80">
                            {/* Favorites toggle */}
                            <button
                              onClick={() => setOnlyFavoritesFilter(!onlyFavoritesFilter)}
                              className={`px-2 py-1 rounded-lg text-[9.5px] font-bold flex items-center gap-1.5 border transition cursor-pointer ${
                                onlyFavoritesFilter
                                  ? "bg-amber-950/80 border-amber-500 text-amber-300"
                                  : "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200"
                              }`}
                            >
                              <Star className={`w-3 h-3 ${onlyFavoritesFilter ? "text-amber-400 fill-amber-400" : "text-slate-400"}`} />
                              <span>Favoris uniquement</span>
                            </button>

                            {/* Sort select */}
                            <div className="flex items-center gap-1">
                              <span className="text-[9px] text-slate-400">Tri:</span>
                              <select
                                value={contactSortBy}
                                onChange={(e) => setContactSortBy(e.target.value as any)}
                                className="bg-slate-900 border border-slate-800 rounded-lg px-2 py-0.5 text-[9.5px] text-cyan-300 focus:outline-none focus:border-cyan-500"
                              >
                                <option value="favorites">⭐ Favoris prioritaires + Nom A-Z</option>
                                <option value="category">🚨 Favoris prioritaires + Catégorie</option>
                                <option value="name-asc">🔤 Nom A-Z (Favoris en tête)</option>
                                <option value="name-desc">🔤 Nom Z-A (Favoris en tête)</option>
                              </select>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Active Filter Indicators Bar */}
                  {(selectedCategoryFilter !== "all" || selectedIconFilter !== "all" || onlyFavoritesFilter || contactSearch) && (
                    <div className="flex items-center justify-between text-[9px] text-slate-400 bg-slate-900/60 px-2 py-1 rounded-lg border border-slate-800/80 mb-2 shrink-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-cyan-400 font-bold">
                          {filteredContacts.length} résultat{filteredContacts.length > 1 ? "s" : ""}:
                        </span>
                        {selectedCategoryFilter !== "all" && (
                          <span
                            onClick={() => setSelectedCategoryFilter("all")}
                            className="bg-cyan-950/80 border border-cyan-500/40 text-cyan-300 px-1.5 py-0.5 rounded flex items-center gap-1 cursor-pointer hover:bg-red-950/50 hover:border-red-500/40"
                          >
                            Catégorie: {CONTACT_CATEGORIES.find((c) => c.id === selectedCategoryFilter)?.shortLabel} ✕
                          </span>
                        )}
                        {selectedIconFilter !== "all" && (
                          <span
                            onClick={() => setSelectedIconFilter("all")}
                            className="bg-amber-950/80 border border-amber-500/40 text-amber-300 px-1.5 py-0.5 rounded flex items-center gap-1 cursor-pointer hover:bg-red-950/50 hover:border-red-500/40"
                          >
                            Icône: {CONTACT_ICONS_CATALOG.find((i) => i.id === selectedIconFilter)?.label.split(" ")[0]} ✕
                          </span>
                        )}
                        {onlyFavoritesFilter && (
                          <span
                            onClick={() => setOnlyFavoritesFilter(false)}
                            className="bg-amber-950/80 border border-amber-500/40 text-amber-300 px-1.5 py-0.5 rounded flex items-center gap-1 cursor-pointer hover:bg-red-950/50 hover:border-red-500/40"
                          >
                            ⭐ Favoris ✕
                          </span>
                        )}
                        {contactSearch && (
                          <span
                            onClick={() => setContactSearch("")}
                            className="bg-slate-800 border border-slate-700 text-slate-300 px-1.5 py-0.5 rounded flex items-center gap-1 cursor-pointer hover:bg-red-950/50 hover:border-red-500/40"
                          >
                            "{contactSearch}" ✕
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => {
                          setSelectedCategoryFilter("all");
                          setSelectedIconFilter("all");
                          setOnlyFavoritesFilter(false);
                          setContactSearch("");
                        }}
                        className="text-slate-400 hover:text-red-400 ml-1 font-bold"
                      >
                        Effacer tout
                      </button>
                    </div>
                  )}

                  {/* Top Favorites & Pinned Contacts Section */}
                  {(!selectedCategoryFilter || selectedCategoryFilter === "all") && !onlyFavoritesFilter && (
                    <div className="mb-2 shrink-0 bg-gradient-to-b from-amber-950/40 via-slate-950/85 to-slate-950/95 border border-amber-500/40 rounded-2xl p-2.5 shadow-lg backdrop-blur-md">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-1.5 text-amber-400">
                          <Pin className="w-3.5 h-3.5 fill-amber-400/40 text-amber-400 -rotate-45" />
                          <span className="text-[11px] font-black tracking-wide uppercase">
                            Favoris & Épinglés
                          </span>
                          <span className="text-[9px] px-1.5 py-0.2 rounded-full font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                            {activePinnedContacts.length}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <span className="text-[8.5px] text-amber-300/80 font-medium hidden sm:inline">
                            Accès rapide 1-clic
                          </span>
                          <button
                            onClick={() => setIsFavoritesSectionExpanded(!isFavoritesSectionExpanded)}
                            className="text-[9px] px-2 py-0.5 rounded-lg bg-amber-950/60 hover:bg-amber-900/60 border border-amber-500/30 text-amber-300 flex items-center gap-1 transition cursor-pointer"
                            title={isFavoritesSectionExpanded ? "Réduire la section favoris" : "Développer la section favoris"}
                          >
                            <span>{isFavoritesSectionExpanded ? "Masquer" : "Afficher"}</span>
                            <ChevronRight
                              className={`w-3 h-3 transition-transform duration-200 ${
                                isFavoritesSectionExpanded ? "rotate-90" : ""
                              }`}
                            />
                          </button>
                        </div>
                      </div>

                      {/* Content of Pinned Favorites */}
                      <AnimatePresence initial={false}>
                        {isFavoritesSectionExpanded && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            className="overflow-hidden"
                          >
                            {activePinnedContacts.length === 0 ? (
                              <div className="p-2.5 rounded-xl bg-slate-900/60 border border-dashed border-amber-500/30 flex items-center gap-2 text-slate-400">
                                <Star className="w-4 h-4 text-amber-400/80 shrink-0" />
                                <div className="text-[9.5px] leading-tight">
                                  <span className="font-bold text-amber-300/90">Aucun contact épinglé.</span>{" "}
                                  Cliquez sur l'icône <Pin className="w-2.5 h-2.5 inline text-amber-400 -rotate-45" /> ou l'étoile ⭐ sur un contact ci-dessous pour l'épingler ici pour un accès rapide.
                                </div>
                              </div>
                            ) : (
                              <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar pt-0.5">
                                {activePinnedContacts.map((contact) => {
                                  const iconMeta = getContactIconMeta(contact.customIcon, contact.category);
                                  const ContactIconComponent = iconMeta.icon;
                                  const catMeta = CONTACT_CATEGORIES.find((c) => c.id === contact.category);

                                  return (
                                    <div
                                      key={`fav-card-${contact.id}`}
                                      className="min-w-[135px] max-w-[150px] p-2 rounded-xl bg-slate-900/95 border border-amber-500/40 hover:border-amber-400 flex flex-col justify-between shrink-0 shadow-md relative group transition hover:scale-[1.02]"
                                    >
                                      {/* Top Row: Avatar with Icon & Unpin Button */}
                                      <div className="flex items-start justify-between mb-1">
                                        <div
                                          className={`w-8 h-8 rounded-xl ${
                                            contact.avatarColor || "bg-cyan-600"
                                          } flex items-center justify-center text-white shadow-sm border border-white/20 relative`}
                                        >
                                          <ContactIconComponent className="w-3.5 h-3.5 text-white drop-shadow" />
                                          <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-amber-400 text-slate-950 rounded-full flex items-center justify-center shadow">
                                            <Pin className="w-2 h-2 text-slate-950 fill-slate-950 -rotate-45" />
                                          </div>
                                        </div>

                                        {/* Unpin quick button */}
                                        <button
                                          onClick={(e) => handleToggleFavoriteContact(contact.id, e)}
                                          className="p-1 rounded-lg bg-amber-950/40 hover:bg-amber-900/60 border border-amber-500/30 text-amber-400 transition cursor-pointer"
                                          title="Désépingler des favoris"
                                        >
                                          <Pin className="w-3 h-3 fill-amber-400 text-amber-400 -rotate-45" />
                                        </button>
                                      </div>

                                      {/* Middle: Name, Phone & Category */}
                                      <div className="mb-2">
                                        <div className="text-[10.5px] font-bold text-white truncate w-full" title={contact.name}>
                                          {contact.name}
                                        </div>
                                        <div className="text-[9px] font-mono text-cyan-400 font-bold truncate w-full">
                                          {contact.phone}
                                        </div>
                                        {catMeta && (
                                          <div className="mt-0.5">
                                            <span className={`text-[8px] px-1 py-0.2 rounded font-bold border inline-flex items-center gap-0.5 ${catMeta.badgeClass}`}>
                                              <span>{catMeta.emoji}</span>
                                              <span className="truncate max-w-[70px]">{catMeta.shortLabel}</span>
                                            </span>
                                          </div>
                                        )}
                                        {contact.subGroupId && (() => {
                                          const subGroup = contactSubGroups.find((g) => g.id === contact.subGroupId);
                                          if (!subGroup) return null;
                                          const colorMeta = getSubGroupColorMeta(subGroup.color);
                                          return (
                                            <div className="mt-0.5">
                                              <span
                                                className={`text-[7.5px] px-1 py-0.2 rounded font-bold border inline-flex items-center gap-1 ${colorMeta.badgeClass}`}
                                                title={`Sous-groupe: ${subGroup.name}`}
                                              >
                                                <span className={`w-1.5 h-1.5 rounded-full ${colorMeta.dotClass}`} />
                                                <span className="truncate max-w-[75px]">{subGroup.name}</span>
                                              </span>
                                            </div>
                                          );
                                        })()}
                                      </div>

                                      {/* Bottom: Fast 1-Click Action Buttons */}
                                      <div className="grid grid-cols-2 gap-1 pt-1 border-t border-slate-800/80">
                                        <button
                                          onClick={() => handleSimulateCall(contact)}
                                          className="py-1 px-1 rounded-lg bg-emerald-600/30 hover:bg-emerald-600/60 border border-emerald-500/40 text-emerald-300 text-[9px] font-bold flex items-center justify-center gap-1 transition cursor-pointer"
                                          title="Appeler immédiatement"
                                        >
                                          <PhoneCall className="w-2.5 h-2.5" />
                                          <span>Appel</span>
                                        </button>
                                        <button
                                          onClick={() => {
                                            handleOpenSMSForContact(contact);
                                            setActiveApp("messages");
                                          }}
                                          className="py-1 px-1 rounded-lg bg-indigo-600/30 hover:bg-indigo-600/60 border border-indigo-500/40 text-indigo-300 text-[9px] font-bold flex items-center justify-center gap-1 transition cursor-pointer"
                                          title="Envoyer un SMS"
                                        >
                                          <MessageSquare className="w-2.5 h-2.5" />
                                          <span>SMS</span>
                                        </button>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )}

                  {/* Contacts List Header */}
                  <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1 mb-1 shrink-0">
                    <span className="flex items-center gap-1">
                      <BookUser className="w-3 h-3 text-cyan-400" />
                      <span>Répertoire ({filteredContacts.length})</span>
                    </span>
                    <span className="text-amber-400/90 font-bold normal-case flex items-center gap-1 text-[9px]">
                      <Pin className="w-2.5 h-2.5 -rotate-45 fill-amber-400" />
                      Favoris classés en priorité
                    </span>
                  </div>

                  {/* Contacts List */}
                  <div className="flex-1 overflow-y-auto flex flex-col gap-2 pr-1">
                    {filteredContacts.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-12 text-center text-slate-500 text-xs gap-2">
                        <BookUser className="w-8 h-8 text-slate-600 mb-1" />
                        <span className="font-bold text-slate-400">Aucun contact ne correspond aux critères</span>
                        <span className="text-[10px] text-slate-500 max-w-[200px]">
                          Vérifiez vos filtres de recherche ou sélectionnez "Tous".
                        </span>
                        <button
                          onClick={() => {
                            setSelectedCategoryFilter("all");
                            setSelectedIconFilter("all");
                            setOnlyFavoritesFilter(false);
                            setContactSearch("");
                          }}
                          className="mt-2 px-3 py-1 bg-cyan-950 border border-cyan-500/40 text-cyan-300 text-[10px] font-bold rounded-lg hover:bg-cyan-900/50 transition cursor-pointer"
                        >
                          Réinitialiser les filtres
                        </button>
                      </div>
                    ) : (
                      filteredContacts.map((contact) => {
                        const iconMeta = getContactIconMeta(contact.customIcon, contact.category);
                        const ContactIconComponent = iconMeta.icon;
                        const catMeta = CONTACT_CATEGORIES.find((c) => c.id === contact.category);

                        return (
                          <div
                            key={contact.id}
                            className={`p-2.5 rounded-2xl flex flex-col gap-2 transition group shadow-sm ${
                              contact.isFavorite
                                ? "bg-gradient-to-r from-amber-950/20 via-slate-950/90 to-slate-950/90 border border-amber-500/40 hover:border-amber-400"
                                : "bg-slate-950/85 border border-slate-800/90 hover:border-cyan-500/40"
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              {/* Left: Avatar with Custom Icon */}
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div
                                  className={`w-9 h-9 rounded-xl ${
                                    contact.avatarColor || "bg-cyan-600"
                                  } flex items-center justify-center text-white shadow-md border border-white/20 shrink-0 relative`}
                                >
                                  <ContactIconComponent className="w-4 h-4 text-white drop-shadow" />
                                  {contact.isFavorite && (
                                    <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-amber-400 text-slate-950 rounded-full flex items-center justify-center shadow" title="Contact épinglé / favori">
                                      <Pin className="w-2.5 h-2.5 fill-slate-950 text-slate-950 -rotate-45" />
                                    </div>
                                  )}
                                </div>

                                <div className="min-w-0">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="text-xs font-bold text-white truncate max-w-[140px]">
                                      {contact.name}
                                    </span>
                                    {/* Pinned Pill */}
                                    {contact.isFavorite && (
                                      <span className="text-[8px] px-1.5 py-0.2 rounded-md font-black bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-0.5">
                                        <Pin className="w-2 h-2 fill-amber-300 -rotate-45" /> Épinglé
                                      </span>
                                    )}
                                    {/* Category Badge */}
                                    {catMeta && (
                                      <span
                                        className={`text-[8.5px] px-1.5 py-0.2 rounded-md font-bold border flex items-center gap-0.5 ${catMeta.badgeClass}`}
                                      >
                                        <span>{catMeta.emoji}</span>
                                        <span>{catMeta.shortLabel}</span>
                                      </span>
                                    )}
                                    {/* Sub-Group Badge */}
                                    {contact.subGroupId && (() => {
                                      const subGroup = contactSubGroups.find((g) => g.id === contact.subGroupId);
                                      if (!subGroup) return null;
                                      const colorMeta = getSubGroupColorMeta(subGroup.color);
                                      return (
                                        <span
                                          className={`text-[8.5px] px-1.5 py-0.2 rounded-md font-bold border flex items-center gap-1 ${colorMeta.badgeClass}`}
                                          title={`Sous-groupe: ${subGroup.name} ${subGroup.description ? `- ${subGroup.description}` : ""}`}
                                        >
                                          <span className={`w-1.5 h-1.5 rounded-full ${colorMeta.dotClass}`} />
                                          <span className="truncate max-w-[90px]">{subGroup.name}</span>
                                        </span>
                                      );
                                    })()}
                                  </div>

                                  <div className="flex items-center gap-2 mt-0.5">
                                    <span className="text-[10.5px] text-cyan-400 font-mono font-bold tracking-tight">
                                      {contact.phone}
                                    </span>
                                    <span className="text-[8.5px] text-slate-500 flex items-center gap-0.5">
                                      <iconMeta.icon className={`w-2.5 h-2.5 ${iconMeta.colorClass}`} />
                                      <span>{iconMeta.label.split(" ")[0]}</span>
                                    </span>
                                  </div>
                                </div>
                              </div>

                              {/* Action Buttons */}
                              <div className="flex items-center gap-1 shrink-0">
                                {/* Favorite / Pin quick toggle button */}
                                <button
                                  onClick={(e) => handleToggleFavoriteContact(contact.id, e)}
                                  className={`p-1.5 rounded-lg border transition cursor-pointer flex items-center gap-0.5 ${
                                    contact.isFavorite
                                      ? "bg-amber-950/80 border-amber-500/50 text-amber-400 shadow-sm"
                                      : "bg-slate-900 border-slate-800 text-slate-500 hover:text-amber-400 hover:border-amber-500/30"
                                  }`}
                                  title={contact.isFavorite ? "Désépingler / Retirer des favoris" : "Épingler ce contact en favori"}
                                >
                                  <Pin className={`w-3 h-3 ${contact.isFavorite ? "fill-amber-400 text-amber-400 -rotate-45" : "-rotate-45"}`} />
                                </button>

                                {/* SMS button */}
                                <button
                                  onClick={() => handleOpenSMSForContact(contact)}
                                  className="p-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/40 border border-indigo-500/30 text-indigo-300 transition cursor-pointer"
                                  title="Envoyer un message SMS"
                                >
                                  <MessageSquare className="w-3 h-3" />
                                </button>

                                {/* Call button */}
                                <button
                                  onClick={() => handleSimulateCall(contact)}
                                  className="p-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/40 border border-emerald-500/30 text-emerald-300 transition cursor-pointer"
                                  title="Passer un appel RP"
                                >
                                  <PhoneCall className="w-3 h-3" />
                                </button>

                                {/* Edit button */}
                                <button
                                  onClick={() => handleStartEditContact(contact)}
                                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 transition cursor-pointer"
                                  title="Modifier les détails et l'icône"
                                >
                                  <Edit2 className="w-2.5 h-2.5" />
                                </button>

                                {/* Delete button */}
                                <button
                                  onClick={() => handleDeleteContact(contact.id)}
                                  className="p-1.5 rounded-lg bg-red-600/20 hover:bg-red-600/40 border border-red-500/30 text-red-400 transition cursor-pointer"
                                  title="Supprimer ce contact"
                                >
                                  <Trash2 className="w-2.5 h-2.5" />
                                </button>
                              </div>
                            </div>

                            {/* Contact Notes */}
                            {contact.notes && (
                              <div className="text-[9.5px] text-slate-400 bg-slate-900/90 px-2.5 py-1 rounded-xl border border-slate-800/80 flex items-start gap-1 italic">
                                <span className="text-cyan-400 font-bold shrink-0">“</span>
                                <span className="truncate">{contact.notes}</span>
                                <span className="text-cyan-400 font-bold shrink-0">”</span>
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}

              {/* Modal: Gestion des Sous-Groupes Personnalisés */}
              <AnimatePresence>
                {showSubGroupsModal && (
                  <div className="absolute inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex flex-col justify-end p-2 sm:p-3">
                    <motion.div
                      initial={{ y: "100%", opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      exit={{ y: "100%", opacity: 0 }}
                      transition={{ type: "spring", damping: 26, stiffness: 280 }}
                      className="bg-slate-900 border border-cyan-500/40 rounded-3xl p-3.5 shadow-2xl flex flex-col max-h-[92%] overflow-hidden"
                    >
                      {/* Modal Header */}
                      <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-slate-800 shrink-0">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-xl bg-cyan-950 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
                            <Tags className="w-4 h-4" />
                          </div>
                          <div>
                            <h4 className="text-xs font-black text-white flex items-center gap-1.5">
                              <span>Sous-Groupes de Contacts</span>
                              <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-cyan-500/20 text-cyan-300 font-mono font-bold">
                                {contactSubGroups.length}
                              </span>
                            </h4>
                            <p className="text-[9.5px] text-slate-400">
                              Organisez vos contacts par cercles avec couleurs personnalisées.
                            </p>
                          </div>
                        </div>

                        <button
                          onClick={() => {
                            setShowSubGroupsModal(false);
                            setEditingSubGroup(null);
                          }}
                          className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Modal Body: Scrollable */}
                      <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-3">
                        {/* Add / Edit Sub-Group Form */}
                        <form
                          onSubmit={handleSaveSubGroup}
                          className="bg-slate-950/90 p-3 rounded-2xl border border-slate-800 flex flex-col gap-2.5"
                        >
                          <div className="flex items-center justify-between text-[11px] font-bold text-white">
                            <span className="flex items-center gap-1.5 text-cyan-400">
                              {editingSubGroup ? <Edit2 className="w-3.5 h-3.5 text-amber-400" /> : <FolderPlus className="w-3.5 h-3.5" />}
                              <span>{editingSubGroup ? `Modifier "${editingSubGroup.name}"` : "Nouveau Sous-Groupe"}</span>
                            </span>
                            {editingSubGroup && (
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingSubGroup(null);
                                  setSubGroupNameInput("");
                                  setSubGroupColorInput("emerald");
                                  setSubGroupDescInput("");
                                }}
                                className="text-[9px] text-slate-400 hover:text-white underline cursor-pointer"
                              >
                                Annuler modif
                              </button>
                            )}
                          </div>

                          {/* Input Name */}
                          <div>
                            <label className="text-[9.5px] font-bold text-slate-300 block mb-1">
                              Nom du groupe (ex: Collègues, Famille, Patrouille...)
                            </label>
                            <input
                              type="text"
                              required
                              placeholder="ex: Collègues, Famille, Gang, Équipe..."
                              value={subGroupNameInput}
                              onChange={(e) => setSubGroupNameInput(e.target.value)}
                              className="w-full bg-slate-900 border border-slate-700/80 focus:border-cyan-400 rounded-xl px-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none transition"
                            />
                          </div>

                          {/* Color Management Palette */}
                          <div>
                            <div className="flex items-center justify-between text-[9.5px] font-bold text-slate-300 mb-1.5">
                              <span>Palette de Couleur:</span>
                              {/* Live Badge Preview */}
                              <div className="flex items-center gap-1.5">
                                <span className="text-[8.5px] text-slate-400">Aperçu :</span>
                                {(() => {
                                  const colorMeta = getSubGroupColorMeta(subGroupColorInput);
                                  return (
                                    <span className={`text-[9px] px-2 py-0.5 rounded-md font-bold border flex items-center gap-1 ${colorMeta.badgeClass}`}>
                                      <span className={`w-1.5 h-1.5 rounded-full ${colorMeta.dotClass}`} />
                                      <span>{subGroupNameInput.trim() || "Nom du groupe"}</span>
                                    </span>
                                  );
                                })()}
                              </div>
                            </div>

                            <div className="grid grid-cols-5 gap-1.5">
                              {SUBGROUP_COLORS.map((col) => {
                                const isSelected = subGroupColorInput === col.id;
                                return (
                                  <button
                                    key={col.id}
                                    type="button"
                                    onClick={() => setSubGroupColorInput(col.id)}
                                    className={`p-1.5 rounded-xl border flex flex-col items-center justify-center gap-1 transition cursor-pointer ${
                                      isSelected
                                        ? `${col.badgeClass} ring-2 ring-cyan-400 shadow-sm font-black`
                                        : "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700"
                                    }`}
                                  >
                                    <span className={`w-3 h-3 rounded-full ${col.dotClass} shadow`} />
                                    <span className="text-[8px] truncate w-full text-center leading-tight">
                                      {col.label}
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          {/* Optional Description */}
                          <div>
                            <label className="text-[9.5px] font-bold text-slate-300 block mb-1">
                              Description / Rôle (optionnel)
                            </label>
                            <input
                              type="text"
                              placeholder="ex: Collègues de bureau ou équipe de patrouille..."
                              value={subGroupDescInput}
                              onChange={(e) => setSubGroupDescInput(e.target.value)}
                              className="w-full bg-slate-900 border border-slate-700/80 focus:border-cyan-400 rounded-xl px-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none transition"
                            />
                          </div>

                          {/* Submit Button */}
                          <button
                            type="submit"
                            className="w-full py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-md mt-1"
                          >
                            {editingSubGroup ? (
                              <>
                                <Check className="w-3.5 h-3.5" />
                                <span>Enregistrer les modifications</span>
                              </>
                            ) : (
                              <>
                                <Plus className="w-3.5 h-3.5" />
                                <span>Créer le sous-groupe</span>
                              </>
                            )}
                          </button>
                        </form>

                        {/* List of Existing Sub-Groups */}
                        <div>
                          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center justify-between">
                            <span>Groupes Existants ({contactSubGroups.length})</span>
                            <span className="text-[8.5px] text-slate-500 font-normal">
                              Modifiez ou supprimez vos groupes
                            </span>
                          </div>

                          {contactSubGroups.length === 0 ? (
                            <div className="p-3 text-center text-slate-500 text-xs bg-slate-950/60 rounded-xl border border-slate-800">
                              Aucun sous-groupe créé. Créez-en un ci-dessus !
                            </div>
                          ) : (
                            <div className="flex flex-col gap-1.5">
                              {contactSubGroups.map((grp) => {
                                const colorMeta = getSubGroupColorMeta(grp.color);
                                const memberCount = contacts.filter((c) => c.subGroupId === grp.id).length;
                                return (
                                  <div
                                    key={grp.id}
                                    className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between gap-2"
                                  >
                                    <div className="flex items-center gap-2 min-w-0">
                                      <span className={`w-3.5 h-3.5 rounded-full ${colorMeta.dotClass} shrink-0 shadow-sm`} />
                                      <div className="min-w-0">
                                        <div className="flex items-center gap-1.5">
                                          <span className="text-xs font-bold text-white truncate">
                                            {grp.name}
                                          </span>
                                          <span className={`text-[8px] px-1.5 py-0.2 rounded font-bold border ${colorMeta.badgeClass}`}>
                                            {colorMeta.label}
                                          </span>
                                        </div>
                                        {grp.description ? (
                                          <p className="text-[9px] text-slate-400 truncate">{grp.description}</p>
                                        ) : (
                                          <p className="text-[9px] text-slate-500">
                                            {memberCount} contact{memberCount > 1 ? "s" : ""} rattaché{memberCount > 1 ? "s" : ""}
                                          </p>
                                        )}
                                      </div>
                                    </div>

                                    <div className="flex items-center gap-1 shrink-0">
                                      <button
                                        type="button"
                                        onClick={() => handleOpenEditSubGroup(grp)}
                                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
                                        title="Modifier le groupe"
                                      >
                                        <Edit2 className="w-3 h-3" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleDeleteSubGroup(grp.id)}
                                        className="p-1.5 rounded-lg bg-red-950/60 hover:bg-red-900/80 border border-red-500/30 text-red-300 transition cursor-pointer"
                                        title="Supprimer ce groupe"
                                      >
                                        <Trash2 className="w-3 h-3" />
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Modal Footer */}
                      <div className="pt-2.5 mt-2 border-t border-slate-800 shrink-0 flex justify-end">
                        <button
                          type="button"
                          onClick={() => {
                            setShowSubGroupsModal(false);
                            setEditingSubGroup(null);
                          }}
                          className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition cursor-pointer"
                        >
                          Fermer
                        </button>
                      </div>
                    </motion.div>
                  </div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* APP: BANK */}
          {activeApp === "bank" && (
            <div className="flex flex-col h-full overflow-hidden">
              <div className="flex items-center gap-2 mb-2 border-b border-slate-800 pb-2 shrink-0">
                <button onClick={() => setActiveApp("home")} className="text-slate-400 hover:text-white cursor-pointer">
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <h3 className="text-xs font-bold uppercase text-emerald-400">Guichet Mobile Desjardins</h3>
              </div>

              {/* Solde Banques Badge */}
              <div className="bg-emerald-950/40 border border-emerald-500/30 p-2.5 rounded-xl mb-2 flex items-center justify-between shrink-0">
                <div>
                  <div className="text-[9px] text-emerald-400 font-extrabold uppercase tracking-wider">Solde Compte Courant</div>
                  <div className="text-base font-black text-white">${bankAmount.toLocaleString()}</div>
                </div>
                <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400">
                  <DollarSign className="w-4 h-4" />
                </div>
              </div>

              {/* Sub-navigation Tabs */}
              <div className="flex items-center p-1 bg-slate-900/90 border border-slate-800 rounded-xl mb-2.5 shrink-0">
                <button
                  onClick={() => setBankSubTab("transfer")}
                  className={`flex-1 py-1 text-[9px] font-bold rounded-lg transition flex items-center justify-center gap-1 cursor-pointer ${
                    bankSubTab === "transfer"
                      ? "bg-emerald-600 text-white shadow-[0_0_10px_rgba(16,185,129,0.3)]"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  <Send className="w-3 h-3" />
                  <span>Virement</span>
                </button>

                <button
                  onClick={() => setBankSubTab("chart")}
                  className={`flex-1 py-1 text-[9px] font-bold rounded-lg transition flex items-center justify-center gap-1 cursor-pointer ${
                    bankSubTab === "chart"
                      ? "bg-emerald-600 text-white shadow-[0_0_10px_rgba(16,185,129,0.3)]"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  <TrendingUp className="w-3 h-3" />
                  <span>Dépenses 7J</span>
                </button>

                <button
                  onClick={() => setBankSubTab("history")}
                  className={`flex-1 py-1 text-[9px] font-bold rounded-lg transition flex items-center justify-center gap-1 cursor-pointer ${
                    bankSubTab === "history"
                      ? "bg-emerald-600 text-white shadow-[0_0_10px_rgba(16,185,129,0.3)]"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  <History className="w-3 h-3" />
                  <span>Historique</span>
                </button>
              </div>

              {/* SUBTAB 1: TRANSFER (VIREMENT) */}
              {bankSubTab === "transfer" && (
                <div className="flex-1 flex flex-col min-h-0 overflow-y-auto space-y-3 pr-0.5 scrollbar-thin">
                  {paySuccess && (
                    <div className="bg-emerald-950/80 border border-emerald-500/40 p-2 rounded-xl text-[10px] text-emerald-300 flex items-center gap-2 shrink-0 animate-fade-in">
                      <CheckCircle className="w-3.5 h-3.5 shrink-0 text-emerald-400" />
                      <span>{paySuccess}</span>
                    </div>
                  )}

                  {/* Formulaire d'Opération (Virement ou Achat) */}
                  <form onSubmit={handleSendPayment} className="flex flex-col gap-2.5 bg-slate-950/70 p-2.5 rounded-xl border border-slate-800 shrink-0">
                    <div className="grid grid-cols-2 gap-1 p-0.5 bg-slate-900 rounded-lg border border-slate-800">
                      <button
                        type="button"
                        onClick={() => setPayOperationType("transfer")}
                        className={`py-1 text-[9px] font-bold rounded-md transition flex items-center justify-center gap-1 cursor-pointer ${
                          payOperationType === "transfer"
                            ? "bg-emerald-600 text-white shadow-sm"
                            : "text-slate-400 hover:text-white"
                        }`}
                      >
                        <Send className="w-2.5 h-2.5" />
                        <span>Virement Interac</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setPayOperationType("purchase")}
                        className={`py-1 text-[9px] font-bold rounded-md transition flex items-center justify-center gap-1 cursor-pointer ${
                          payOperationType === "purchase"
                            ? "bg-amber-600 text-white shadow-sm"
                            : "text-slate-400 hover:text-white"
                        }`}
                      >
                        <ShoppingBag className="w-2.5 h-2.5" />
                        <span>Achat Commerce</span>
                      </button>
                    </div>

                    <div>
                      <label className="text-[9px] text-slate-400 font-bold block mb-1">
                        {payOperationType === "purchase" ? "Commerce / Enseigne" : "Destinataire (Nom / ID)"}
                      </label>
                      <input
                        type="text"
                        placeholder={payOperationType === "purchase" ? "ex: Dépanneur Beau-Soir, Irving..." : "ex: Jean_Dupont"}
                        value={payTarget}
                        onChange={(e) => setPayTarget(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="text-[9px] text-slate-400 font-bold block mb-1">Montant ($)</label>
                      <input
                        type="number"
                        value={payAmount}
                        onChange={(e) => setPayAmount(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                      />
                    </div>

                    <button
                      type="submit"
                      className={`py-2 rounded-xl text-white text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-md ${
                        payOperationType === "purchase"
                          ? "bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 shadow-[0_0_12px_rgba(245,158,11,0.3)]"
                          : "bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-[0_0_12px_rgba(16,185,129,0.3)]"
                      }`}
                    >
                      {payOperationType === "purchase" ? (
                        <>
                          <CreditCard className="w-3.5 h-3.5" /> Régler l'Achat par Carte
                        </>
                      ) : (
                        <>
                          <Send className="w-3.5 h-3.5" /> Effectuer le Virement
                        </>
                      )}
                    </button>
                  </form>

                  {/* Chart Preview Card */}
                  <ExpenseChart7Days
                    expenses={dailyExpenses}
                    selectedDayIndex={selectedExpenseDayIndex}
                    onSelectDay={setSelectedExpenseDayIndex}
                  />

                  {/* Recent 2 Transactions preview */}
                  <div className="border-t border-slate-800/80 pt-2 shrink-0">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-300">
                        Opérations récentes
                      </span>
                      <button
                        onClick={() => setBankSubTab("history")}
                        className="text-[9px] text-emerald-400 font-bold hover:underline cursor-pointer"
                      >
                        Voir tout →
                      </button>
                    </div>

                    <div className="space-y-1.5">
                      {transactions.slice(0, 2).map((tx) => (
                        <div
                          key={tx.id}
                          className="p-2 bg-slate-950/80 border border-slate-800/80 rounded-xl flex items-center justify-between cursor-pointer hover:border-slate-700 transition"
                          onClick={() => setSelectedReceiptTx(tx)}
                        >
                          <div className="flex items-center gap-2 overflow-hidden">
                            <div
                              className={`w-5 h-5 rounded-lg flex items-center justify-center text-[9px] shrink-0 ${
                                tx.type === "salary"
                                  ? "bg-emerald-950/80 border border-emerald-500/40 text-emerald-400"
                                  : tx.type === "purchase"
                                  ? "bg-amber-950/80 border border-amber-500/40 text-amber-400"
                                  : tx.type === "transfer_in"
                                  ? "bg-cyan-950/80 border border-cyan-500/40 text-cyan-400"
                                  : "bg-purple-950/80 border border-purple-500/40 text-purple-400"
                              }`}
                            >
                              {tx.type === "salary" ? (
                                <DollarSign className="w-3 h-3 text-emerald-400" />
                              ) : tx.type === "purchase" ? (
                                <ShoppingBag className="w-3 h-3 text-amber-400" />
                              ) : tx.type === "transfer_in" ? (
                                <ArrowDownLeft className="w-3 h-3 text-cyan-400" />
                              ) : (
                                <ArrowUpRight className="w-3 h-3 text-purple-400" />
                              )}
                            </div>
                            <div className="overflow-hidden">
                              <div className="text-xs font-bold text-white truncate">{tx.recipient}</div>
                              <div className="text-[8px] text-slate-500 font-mono">{tx.date}</div>
                            </div>
                          </div>

                          <div className={`text-xs font-black font-mono ${
                            tx.type === "salary" || tx.type === "transfer_in" ? "text-emerald-400" : tx.type === "purchase" ? "text-amber-400" : "text-rose-400"
                          }`}>
                            {tx.type === "salary" || tx.type === "transfer_in" ? "+" : "-"}${tx.amount}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* SUBTAB 2: 7-DAY EXPENSE CHART */}
              {bankSubTab === "chart" && (
                <div className="flex-1 flex flex-col min-h-0 overflow-y-auto space-y-3 pr-0.5 scrollbar-thin">
                  <ExpenseChart7Days
                    expenses={dailyExpenses}
                    selectedDayIndex={selectedExpenseDayIndex}
                    onSelectDay={setSelectedExpenseDayIndex}
                  />

                  {/* Breakdown Table for the 7 Days */}
                  <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-2.5">
                    <div className="text-[10px] font-black uppercase text-slate-300 tracking-wider mb-2 flex items-center justify-between">
                      <span>Détail quotidien (7J)</span>
                      <span className="text-[9px] text-slate-500 font-normal">7 derniers jours</span>
                    </div>

                    <div className="space-y-1.5">
                      {dailyExpenses.map((d, idx) => {
                        const isSelected = selectedExpenseDayIndex === idx;
                        const avg = Math.round(dailyExpenses.reduce((a, b) => a + b.amount, 0) / dailyExpenses.length);
                        const isHigher = d.amount > avg;

                        return (
                          <div
                            key={d.dayLabel}
                            onClick={() => setSelectedExpenseDayIndex(isSelected ? null : idx)}
                            className={`p-2 rounded-xl border flex items-center justify-between cursor-pointer transition ${
                              isSelected
                                ? "bg-emerald-950/60 border-emerald-500/50"
                                : "bg-slate-900/60 border-slate-800/80 hover:border-slate-700"
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <div className={`w-2 h-2 rounded-full ${isSelected ? "bg-cyan-400 animate-ping" : isHigher ? "bg-rose-400" : "bg-emerald-400"}`} />
                              <div>
                                <div className="text-xs font-bold text-white">{d.dayLabel} <span className="text-[9px] font-normal text-slate-400">({d.fullDate})</span></div>
                              </div>
                            </div>

                            <div className="text-right">
                              <div className="text-xs font-black font-mono text-emerald-400">${d.amount}</div>
                              <div className="text-[8px] text-slate-500 font-mono">
                                {isHigher ? `+${d.amount - avg}$ /moy` : `-${avg - d.amount}$ /moy`}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* SUBTAB 3: TRANSACTION HISTORY */}
              {bankSubTab === "history" && (
                <div className="flex-1 flex flex-col min-h-0 border-t border-slate-800/80 pt-2">
                  <div className="flex items-center justify-between mb-2 shrink-0 gap-1">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                      <History className="w-3.5 h-3.5 text-emerald-400" />
                      Historique ({filteredTransactions.length}/{transactions.length})
                    </span>

                    <button
                      onClick={handleExportFullStatementPDF}
                      className="px-2 py-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-lg text-[8.5px] font-black uppercase flex items-center gap-1 shadow-sm cursor-pointer transition"
                      title="Exporter le Relevé de Compte complet en PDF"
                    >
                      <Download className="w-3 h-3" />
                      <span>PDF Bilan</span>
                    </button>
                  </div>

                  {/* Toast notification for receipt actions */}
                  {receiptToast && (
                    <div className="bg-emerald-950/90 border border-emerald-500/50 p-2 rounded-xl text-[9.5px] text-emerald-300 flex items-center gap-2 shrink-0 mb-2 shadow-[0_0_12px_rgba(16,185,129,0.3)]">
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span className="font-bold">{receiptToast}</span>
                    </div>
                  )}

                  {/* FILTRES PAR TYPE DE TRANSACTION (Salaire, Virement, Achat) */}
                  <div className="grid grid-cols-4 gap-1 p-1 bg-slate-950/80 rounded-xl border border-slate-800/90 mb-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => setBankTxFilter("all")}
                      className={`py-1 px-1 rounded-lg text-[8.5px] font-black uppercase tracking-wider flex flex-col items-center justify-center gap-0.5 transition cursor-pointer ${
                        bankTxFilter === "all"
                          ? "bg-slate-800 text-white shadow-sm border border-slate-700"
                          : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/50"
                      }`}
                    >
                      <span>Tous</span>
                      <span className="text-[7.5px] font-mono px-1 rounded-full bg-slate-900/80 text-slate-300">
                        {transactions.length}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setBankTxFilter("salary")}
                      className={`py-1 px-1 rounded-lg text-[8.5px] font-black uppercase tracking-wider flex flex-col items-center justify-center gap-0.5 transition cursor-pointer ${
                        bankTxFilter === "salary"
                          ? "bg-emerald-950 text-emerald-300 border border-emerald-500/60 shadow-[0_0_8px_rgba(16,185,129,0.25)]"
                          : "text-slate-400 hover:text-emerald-300 hover:bg-emerald-950/30"
                      }`}
                    >
                      <div className="flex items-center gap-0.5">
                        <DollarSign className="w-2.5 h-2.5 text-emerald-400" />
                        <span>Salaire</span>
                      </div>
                      <span className={`text-[7.5px] font-mono px-1 rounded-full ${
                        bankTxFilter === "salary" ? "bg-emerald-900/80 text-emerald-200" : "bg-slate-900/80 text-slate-400"
                      }`}>
                        {salaryTxCount}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setBankTxFilter("transfer")}
                      className={`py-1 px-1 rounded-lg text-[8.5px] font-black uppercase tracking-wider flex flex-col items-center justify-center gap-0.5 transition cursor-pointer ${
                        bankTxFilter === "transfer"
                          ? "bg-cyan-950 text-cyan-300 border border-cyan-500/60 shadow-[0_0_8px_rgba(6,182,212,0.25)]"
                          : "text-slate-400 hover:text-cyan-300 hover:bg-cyan-950/30"
                      }`}
                    >
                      <div className="flex items-center gap-0.5">
                        <ArrowUpDown className="w-2.5 h-2.5 text-cyan-400" />
                        <span>Virement</span>
                      </div>
                      <span className={`text-[7.5px] font-mono px-1 rounded-full ${
                        bankTxFilter === "transfer" ? "bg-cyan-900/80 text-cyan-200" : "bg-slate-900/80 text-slate-400"
                      }`}>
                        {transferTxCount}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setBankTxFilter("purchase")}
                      className={`py-1 px-1 rounded-lg text-[8.5px] font-black uppercase tracking-wider flex flex-col items-center justify-center gap-0.5 transition cursor-pointer ${
                        bankTxFilter === "purchase"
                          ? "bg-amber-950 text-amber-300 border border-amber-500/60 shadow-[0_0_8px_rgba(245,158,11,0.25)]"
                          : "text-slate-400 hover:text-amber-300 hover:bg-amber-950/30"
                      }`}
                    >
                      <div className="flex items-center gap-0.5">
                        <ShoppingBag className="w-2.5 h-2.5 text-amber-400" />
                        <span>Achat</span>
                      </div>
                      <span className={`text-[7.5px] font-mono px-1 rounded-full ${
                        bankTxFilter === "purchase" ? "bg-amber-900/80 text-amber-200" : "bg-slate-900/80 text-slate-400"
                      }`}>
                        {purchaseTxCount}
                      </span>
                    </button>
                  </div>

                  {/* Recherche rapide & bandeau statistique */}
                  <div className="space-y-1 mb-2 shrink-0">
                    <div className="relative">
                      <Search className="w-3 h-3 text-slate-500 absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="text"
                        placeholder="Recherche par nom, montant, catégorie..."
                        value={bankTxSearch}
                        onChange={(e) => setBankTxSearch(e.target.value)}
                        className="w-full pl-6 pr-6 py-1 bg-slate-900/90 border border-slate-800 rounded-lg text-[9.5px] text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
                      />
                      {bankTxSearch && (
                        <button
                          onClick={() => setBankTxSearch("")}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white cursor-pointer"
                        >
                          <X className="w-2.5 h-2.5" />
                        </button>
                      )}
                    </div>

                    {/* Dynamic Total Ribbon */}
                    <div className="px-2 py-0.5 bg-slate-950/60 border border-slate-800/70 rounded-lg flex items-center justify-between text-[8.5px] text-slate-400 font-mono">
                      <span>
                        {bankTxFilter === "all" && "Total opérations"}
                        {bankTxFilter === "salary" && "Salaires perçus"}
                        {bankTxFilter === "transfer" && "Flux virements"}
                        {bankTxFilter === "purchase" && "Dépenses achats"}
                        {" "}({filteredTransactions.length})
                      </span>
                      <div className="font-bold flex items-center gap-1">
                        {bankTxFilter === "salary" && (
                          <span className="text-emerald-400 font-black">+${filteredTransactions.reduce((acc, t) => acc + t.amount, 0).toLocaleString()} CAD</span>
                        )}
                        {bankTxFilter === "purchase" && (
                          <span className="text-amber-400 font-black">-${filteredTransactions.reduce((acc, t) => acc + t.amount, 0).toLocaleString()} CAD</span>
                        )}
                        {bankTxFilter === "transfer" && (
                          <>
                            <span className="text-cyan-400">+${filteredTransactions.filter(t => t.type === 'transfer_in').reduce((a, b) => a + b.amount, 0).toLocaleString()}</span>
                            <span>/</span>
                            <span className="text-rose-400">-${filteredTransactions.filter(t => t.type === 'transfer_out').reduce((a, b) => a + b.amount, 0).toLocaleString()}</span>
                          </>
                        )}
                        {bankTxFilter === "all" && (
                          <>
                            <span className="text-emerald-400">+${filteredTransactions.filter(t => t.type === 'salary' || t.type === 'transfer_in').reduce((a, b) => a + b.amount, 0).toLocaleString()}</span>
                            <span>/</span>
                            <span className="text-rose-400">-${filteredTransactions.filter(t => t.type === 'transfer_out' || t.type === 'purchase').reduce((a, b) => a + b.amount, 0).toLocaleString()}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Liste défilante des transactions filtrées */}
                  <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 scrollbar-thin">
                    {filteredTransactions.length === 0 ? (
                      <div className="text-center py-6 px-4 bg-slate-950/40 border border-dashed border-slate-800 rounded-xl space-y-1.5">
                        <div className="w-8 h-8 rounded-full bg-slate-900 mx-auto flex items-center justify-center text-slate-500">
                          {bankTxFilter === "salary" ? (
                            <DollarSign className="w-4 h-4 text-emerald-500/60" />
                          ) : bankTxFilter === "purchase" ? (
                            <ShoppingBag className="w-4 h-4 text-amber-500/60" />
                          ) : bankTxFilter === "transfer" ? (
                            <ArrowUpDown className="w-4 h-4 text-cyan-500/60" />
                          ) : (
                            <Filter className="w-4 h-4 text-slate-500" />
                          )}
                        </div>
                        <div className="text-[10px] text-slate-400 font-bold">
                          {bankTxSearch
                            ? "Aucune transaction correspondant à votre recherche"
                            : bankTxFilter === "salary"
                            ? "Aucun salaire dans l'historique"
                            : bankTxFilter === "purchase"
                            ? "Aucun achat enregistré"
                            : bankTxFilter === "transfer"
                            ? "Aucun virement enregistré"
                            : "Aucune transaction disponible"}
                        </div>
                        {(bankTxFilter !== "all" || bankTxSearch) && (
                          <button
                            onClick={() => {
                              setBankTxFilter("all");
                              setBankTxSearch("");
                            }}
                            className="text-[9px] text-emerald-400 hover:underline font-bold mt-1 cursor-pointer inline-block"
                          >
                            Réinitialiser les filtres
                          </button>
                        )}
                      </div>
                    ) : (
                      filteredTransactions.map((tx) => {
                        const isSalary = tx.type === "salary";
                        const isPurchase = tx.type === "purchase";
                        const isTransferIn = tx.type === "transfer_in";
                        const isPositive = isSalary || isTransferIn;

                        return (
                          <div
                            key={tx.id}
                            className={`p-2 bg-slate-950/80 border rounded-xl flex items-center justify-between transition group cursor-pointer ${
                              isSalary
                                ? "border-slate-800/80 hover:border-emerald-500/50"
                                : isPurchase
                                ? "border-slate-800/80 hover:border-amber-500/50"
                                : "border-slate-800/80 hover:border-cyan-500/50"
                            }`}
                            onClick={() => setSelectedReceiptTx(tx)}
                          >
                            <div className="flex items-center gap-2 overflow-hidden flex-1">
                              <div
                                className={`w-6 h-6 rounded-lg flex items-center justify-center text-[10px] shrink-0 ${
                                  isSalary
                                    ? "bg-emerald-950/80 border border-emerald-500/40 text-emerald-400"
                                    : isPurchase
                                    ? "bg-amber-950/80 border border-amber-500/40 text-amber-400"
                                    : isTransferIn
                                    ? "bg-cyan-950/80 border border-cyan-500/40 text-cyan-400"
                                    : "bg-purple-950/80 border border-purple-500/40 text-purple-400"
                                }`}
                              >
                                {isSalary ? (
                                  <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                                ) : isPurchase ? (
                                  <ShoppingBag className="w-3.5 h-3.5 text-amber-400" />
                                ) : isTransferIn ? (
                                  <ArrowDownLeft className="w-3.5 h-3.5 text-cyan-400" />
                                ) : (
                                  <ArrowUpRight className="w-3.5 h-3.5 text-purple-400" />
                                )}
                              </div>
                              <div className="overflow-hidden">
                                <div className="text-xs font-bold text-white truncate">{tx.recipient}</div>
                                <div className="flex items-center gap-1 text-[8px] text-slate-500 font-mono mt-0.5">
                                  <span>{tx.date}</span>
                                  <span>•</span>
                                  <span className={`px-1 rounded text-[7px] font-bold uppercase tracking-wider ${
                                    isSalary
                                      ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                      : isPurchase
                                      ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                                      : "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20"
                                  }`}>
                                    {isSalary ? "Salaire" : isPurchase ? "Achat TPV" : isTransferIn ? "Virement Reçu" : "Virement Émis"}
                                  </span>
                                  {tx.category && (
                                    <span className="text-slate-400 text-[7.5px] truncate hidden sm:inline">
                                      • {tx.category}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0 pl-1">
                              <div className={`text-xs font-black font-mono ${
                                isPositive
                                  ? "text-emerald-400"
                                  : isPurchase
                                  ? "text-amber-400"
                                  : "text-rose-400"
                              }`}>
                                {isPositive ? "+" : "-"}${tx.amount.toLocaleString()}
                              </div>

                              {/* Action Buttons: Exporter PDF / Partager */}
                              <div className="flex items-center gap-1 ml-1">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedReceiptTx(tx);
                                  }}
                                  className="p-1 rounded-md bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-600 hover:text-white transition cursor-pointer"
                                  title="Voir Justificatif / Exporter PDF"
                                >
                                  <FileText className="w-3 h-3" />
                                </button>

                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleShareReceiptViaSMS(tx);
                                  }}
                                  className="p-1 rounded-md bg-indigo-950/80 border border-indigo-500/40 text-indigo-300 hover:bg-indigo-600 hover:text-white transition cursor-pointer"
                                  title="Partager en SMS RP"
                                >
                                  <Share2 className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}

              {/* ─── REÇU BANCAIRE OFFICIEL / JUSTIFICATIF PDF MODAL ─── */}
              <AnimatePresence>
                {selectedReceiptTx && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 20 }}
                    className="absolute inset-0 z-[55] rounded-[32px] overflow-hidden flex flex-col justify-between p-3.5 bg-slate-950/98 backdrop-blur-3xl text-white font-mono border-2 border-emerald-500/70 shadow-[0_0_50px_rgba(16,185,129,0.4)]"
                  >
                    {/* Header Modal Bar */}
                    <div className="flex items-center justify-between pb-2 border-b border-emerald-500/30 shrink-0">
                      <div className="flex items-center gap-1.5 text-emerald-400 font-extrabold text-[10px] uppercase tracking-wider">
                        <FileText className="w-3.5 h-3.5 text-emerald-400" />
                        <span>
                          {selectedReceiptTx.type === "purchase"
                            ? "Ticket de Paiement Achat"
                            : selectedReceiptTx.type === "salary"
                            ? "Avis de Dépôt Salarial"
                            : "Justificatif de Virement"}
                        </span>
                      </div>
                      <button
                        onClick={() => setSelectedReceiptTx(null)}
                        className="p-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Main Official Receipt Card Content */}
                    <div className="flex-1 overflow-y-auto py-2 my-1 space-y-2.5 pr-0.5 scrollbar-thin">
                      {/* Desjardins Official Header Banner */}
                      <div className={`p-2.5 rounded-2xl border text-center relative overflow-hidden shadow-lg ${
                        selectedReceiptTx.type === "purchase"
                          ? "bg-gradient-to-r from-amber-950 via-slate-950 to-slate-950 border-amber-500/40"
                          : "bg-gradient-to-r from-emerald-950 via-teal-950 to-slate-950 border-emerald-500/40"
                      }`}>
                        <div className={`text-[8.5px] font-black uppercase tracking-widest mb-0.5 ${
                          selectedReceiptTx.type === "purchase" ? "text-amber-400" : "text-emerald-400"
                        }`}>
                          CAISSE POPULAIRE DESJARDINS
                        </div>
                        <div className="text-xs font-black text-white tracking-tight">
                          {selectedReceiptTx.type === "purchase"
                            ? "TICKET DE CAISSE COMMERCE"
                            : selectedReceiptTx.type === "salary"
                            ? "AVIS DE PAIE SALARIAL"
                            : "REÇU BANCAIRE RP"}
                        </div>
                        <div className="text-[8px] text-slate-300 font-mono mt-0.5">
                          {selectedReceiptTx.type === "purchase"
                            ? "Portneuf • Paiement Carte Sans Contact"
                            : "Portneuf • Attestation Certifiée"}
                        </div>

                        <div className={`mt-1.5 inline-flex items-center gap-1 border px-2 py-0.5 rounded-full text-[8.5px] font-black ${
                          selectedReceiptTx.type === "purchase"
                            ? "bg-amber-500/20 border-amber-400/50 text-amber-300"
                            : "bg-emerald-500/20 border-emerald-400/50 text-emerald-300"
                        }`}>
                          <CheckCircle className="w-2.5 h-2.5" />
                          <span>{selectedReceiptTx.type === "purchase" ? "VALIDÉ TPV COMMERCE" : "VALIDÉ SQ / SPVM"}</span>
                        </div>
                      </div>

                      {/* Amount Box */}
                      <div className="bg-slate-900/90 border border-slate-800 p-2.5 rounded-2xl text-center">
                        <span className="text-[8.5px] text-slate-400 uppercase font-bold tracking-wider block mb-0.5">
                          Montant de l'opération
                        </span>
                        <div className={`text-xl font-black font-mono ${
                          selectedReceiptTx.type === 'transfer_out' || selectedReceiptTx.type === 'purchase'
                            ? selectedReceiptTx.type === 'purchase' ? 'text-amber-400' : 'text-rose-400'
                            : 'text-emerald-400'
                        }`}>
                          {selectedReceiptTx.type === 'transfer_out' || selectedReceiptTx.type === 'purchase' ? '-' : '+'}${selectedReceiptTx.amount.toLocaleString()} CAD
                        </div>
                        <span className="text-[8px] text-emerald-400 font-bold uppercase mt-0.5 block">
                          ✔ Transaction Confirmée
                        </span>
                      </div>

                      {/* Details List */}
                      <div className="bg-slate-900/80 border border-slate-800/80 p-2.5 rounded-2xl space-y-1.5 text-[9.5px]">
                        <div className="flex justify-between items-center pb-1 border-b border-slate-800/80">
                          <span className="text-slate-400 font-bold uppercase">N° Réf:</span>
                          <span className="text-cyan-300 font-mono font-black">DSJ-TX-{selectedReceiptTx.id.replace("tx_", "")}</span>
                        </div>

                        <div className="flex justify-between items-center pb-1 border-b border-slate-800/80">
                          <span className="text-slate-400 font-bold uppercase">
                            {selectedReceiptTx.type === "purchase" ? "Client Porteur:" : "Émetteur:"}
                          </span>
                          <span className="text-white font-bold truncate max-w-[130px]">
                            {selectedReceiptTx.type === 'transfer_in' || selectedReceiptTx.type === 'salary' ? selectedReceiptTx.recipient : (playerName || "Citoyen RP")}
                          </span>
                        </div>

                        <div className="flex justify-between items-center pb-1 border-b border-slate-800/80">
                          <span className="text-slate-400 font-bold uppercase">
                            {selectedReceiptTx.type === "purchase" ? "Commerçant / Tiers:" : "Bénéficiaire:"}
                          </span>
                          <span className={`${selectedReceiptTx.type === "purchase" ? "text-amber-300" : "text-emerald-300"} font-bold truncate max-w-[130px]`}>
                            {selectedReceiptTx.type === 'transfer_in' || selectedReceiptTx.type === 'salary' ? (playerName || "Citoyen RP") : selectedReceiptTx.recipient}
                          </span>
                        </div>

                        {selectedReceiptTx.category && (
                          <div className="flex justify-between items-center pb-1 border-b border-slate-800/80">
                            <span className="text-slate-400 font-bold uppercase">Catégorie:</span>
                            <span className="text-slate-300 font-mono">{selectedReceiptTx.category}</span>
                          </div>
                        )}

                        <div className="flex justify-between items-center pb-1 border-b border-slate-800/80">
                          <span className="text-slate-400 font-bold uppercase">Horodatage:</span>
                          <span className="text-slate-200 font-mono">{selectedReceiptTx.date}</span>
                        </div>

                        <div className="flex justify-between items-center">
                          <span className="text-slate-400 font-bold uppercase">Sécurité:</span>
                          <span className="text-emerald-400 font-bold flex items-center gap-1">
                            <ShieldCheck className="w-3 h-3 text-emerald-400" /> Éther-Guard L5
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons Footer */}
                    <div className="pt-2 border-t border-slate-800 space-y-1.5 shrink-0">
                      <div className="grid grid-cols-2 gap-1.5">
                        <button
                          onClick={() => handleExportTransactionPDF(selectedReceiptTx)}
                          className="py-2 px-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-[9.5px] uppercase transition flex items-center justify-center gap-1 cursor-pointer shadow-[0_0_12px_rgba(16,185,129,0.3)]"
                        >
                          <Download className="w-3 h-3" />
                          <span>Exporter PDF</span>
                        </button>

                        <button
                          onClick={() => handleCopyReceiptText(selectedReceiptTx)}
                          className="py-2 px-1.5 rounded-xl bg-slate-900 border border-emerald-500/40 hover:border-emerald-400 text-emerald-300 font-black text-[9.5px] uppercase transition flex items-center justify-center gap-1 cursor-pointer"
                        >
                          {receiptCopied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                          <span>{receiptCopied ? "Copié !" : "Copier Texto"}</span>
                        </button>
                      </div>

                      <button
                        onClick={() => handleShareReceiptViaSMS(selectedReceiptTx)}
                        className="w-full py-2 rounded-xl bg-indigo-600/30 border border-indigo-500/50 hover:bg-indigo-600/50 text-indigo-300 font-black text-[9.5px] uppercase transition flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <Share2 className="w-3 h-3 text-indigo-400" />
                        <span>Partager en SMS RP</span>
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* APP: MESSAGES & CHAT THREADS RP */}
          {activeApp === "messages" && (
            <div className="flex flex-col h-full overflow-hidden relative">
              {/* Header Bar */}
              <div className="flex items-center justify-between mb-2 border-b border-slate-800 pb-2 shrink-0">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      if (activeThreadId) {
                        setActiveThreadId(null);
                      } else {
                        setActiveApp("home");
                      }
                    }}
                    className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                  <div>
                    <h3 className="text-xs font-black uppercase text-indigo-400 tracking-wider flex items-center gap-1.5">
                      <MessageSquare className="w-3.5 h-3.5" />
                      {activeThreadId ? "Discussion RP" : "Messagerie & Fils SMS"}
                    </h3>
                  </div>
                </div>

                {!activeThreadId ? (
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setIsNewThreadModalOpen(true)}
                      className="px-2 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-[10px] font-bold flex items-center gap-1 shadow-sm transition"
                    >
                      <Plus className="w-3 h-3" /> Nouveau
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      const activeThread = threads.find((t) => t.threadId === activeThreadId);
                      const phoneToCall = activeThread?.subtitle || activeThreadId;
                      const nameToCall = activeThread?.title || activeThreadId;
                      handleMakeOutgoingCall(nameToCall, phoneToCall);
                      handleTriggerIncomingCall(nameToCall, phoneToCall, "Appel depuis Chat RP");
                    }}
                    className="px-2.5 py-1 bg-emerald-600/30 hover:bg-emerald-600/50 border border-emerald-500/50 text-emerald-300 rounded-lg text-[10px] font-bold flex items-center gap-1 transition"
                  >
                    <Phone className="w-3 h-3 text-emerald-400 animate-pulse" /> Appeler
                  </button>
                )}
              </div>

              {/* VIEW 1: LIST OF CHAT THREADS */}
              {!activeThreadId && (
                <div className="flex-1 flex flex-col min-h-0">
                  {/* Search bar & Category filters */}
                  <div className="space-y-2 mb-2 shrink-0">
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-500" />
                      <input
                        type="text"
                        placeholder="Rechercher une discussion ou un numéro..."
                        value={threadSearchQuery}
                        onChange={(e) => setThreadSearchQuery(e.target.value)}
                        className="w-full pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-[11px] text-white focus:outline-none focus:border-indigo-500 font-medium"
                      />
                    </div>

                    {/* Category Filter Chips */}
                    <div className="flex items-center gap-1 overflow-x-auto pb-1 text-[9px] no-scrollbar">
                      {[
                        { id: "all", label: "Tous" },
                        { id: "citizen", label: "Citoyens" },
                        { id: "services", label: "Services" },
                        { id: "emergency", label: "Urgences 🚨" },
                        { id: "general", label: "Général 📢" },
                      ].map((f) => (
                        <button
                          key={f.id}
                          onClick={() => setThreadCategoryFilter(f.id as any)}
                          className={`px-2 py-0.5 rounded-full font-bold whitespace-nowrap transition border ${
                            threadCategoryFilter === f.id
                              ? "bg-indigo-600 text-white border-indigo-400"
                              : "bg-slate-900/80 text-slate-400 border-slate-800 hover:text-white"
                          }`}
                        >
                          {f.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Threads List */}
                  <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
                    {filteredThreads.length === 0 ? (
                      <div className="text-center py-10 text-[10px] text-slate-500 font-bold italic">
                        Aucun fil de discussion trouvé
                      </div>
                    ) : (
                      filteredThreads.map((thread) => {
                        return (
                          <div
                            key={thread.threadId}
                            onClick={() => handleSelectThread(thread.threadId)}
                            className={`p-2.5 rounded-xl border transition cursor-pointer flex items-center justify-between group ${
                              thread.unreadCount > 0
                                ? "bg-indigo-950/40 border-indigo-500/50 hover:bg-indigo-900/50 shadow-[0_0_12px_rgba(99,102,241,0.15)]"
                                : "bg-slate-950/80 border-slate-800/80 hover:bg-slate-900/90 hover:border-slate-700"
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0 flex-1">
                              {/* Avatar */}
                              <div className={`w-9 h-9 rounded-xl ${thread.avatarColor} flex items-center justify-center text-white font-black text-xs shrink-0 shadow-md`}>
                                {thread.threadId === "general" ? "📢" : thread.title.charAt(0).toUpperCase()}
                              </div>

                              <div className="min-w-0 flex-1">
                                <div className="flex items-center justify-between gap-1">
                                  <span className="text-[11px] font-black text-white truncate group-hover:text-cyan-300 transition">
                                    {thread.title}
                                  </span>
                                  <span className="text-[9px] text-slate-500 font-mono shrink-0">
                                    {thread.lastMessage.time}
                                  </span>
                                </div>

                                <div className="flex items-center justify-between gap-2 mt-0.5">
                                  <p className={`text-[10px] truncate ${thread.unreadCount > 0 ? "text-indigo-200 font-bold" : "text-slate-400"}`}>
                                    {thread.lastMessage.sender === playerName || thread.lastMessage.sender === "me" ? "Vous: " : ""}
                                    {thread.lastMessage.text}
                                  </p>

                                  {thread.unreadCount > 0 && (
                                    <span className="bg-indigo-500 text-white text-[9px] font-black px-1.5 py-0.2 rounded-full shrink-0 shadow-[0_0_8px_rgba(99,102,241,0.8)] animate-pulse">
                                      {thread.unreadCount}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}

              {/* VIEW 2: ACTIVE CHAT THREAD DETAIL */}
              {activeThreadId && (
                <div className="flex-1 flex flex-col min-h-0">
                  {/* Thread Subheader */}
                  {(() => {
                    const activeThread = threads.find((t) => t.threadId === activeThreadId);
                    const title = activeThread?.title || activeThreadId;
                    const subtitle = activeThread?.subtitle || activeThreadId;
                    const avatarColor = activeThread?.avatarColor || "bg-indigo-600";

                    return (
                      <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-2 mb-2 flex items-center justify-between shrink-0">
                        <div className="flex items-center gap-2">
                          <div className={`w-7 h-7 rounded-lg ${avatarColor} flex items-center justify-center text-white font-black text-xs shrink-0`}>
                            {activeThreadId === "general" ? "📢" : title.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="text-[11px] font-black text-white leading-none">{title}</div>
                            <div className="text-[9px] text-slate-400 font-mono mt-0.5">{subtitle}</div>
                          </div>
                        </div>

                        <button
                          onClick={() => setActiveThreadId(null)}
                          className="text-[9px] font-bold text-slate-400 hover:text-white px-2 py-1 rounded bg-slate-900 border border-slate-800"
                        >
                          Fermer
                        </button>
                      </div>
                    );
                  })()}

                  {/* Messages Bubble List */}
                  <div className="flex-1 overflow-y-auto space-y-2 mb-2 pr-1 flex flex-col">
                    {(() => {
                      const activeThread = threads.find((t) => t.threadId === activeThreadId);
                      const activeMsgs = activeThread ? activeThread.messages : messages.filter((m) => m.threadId === activeThreadId);

                      if (activeMsgs.length === 0) {
                        return (
                          <div className="text-center py-10 text-[10px] text-slate-500 italic">
                            Début de la conversation RP avec {activeThreadId}
                          </div>
                        );
                      }

                      return activeMsgs.map((m) => {
                        const isMe = m.sender === playerName || m.sender === "me";
                        const senderContact = contacts.find((c) => c.phone === m.sender || c.name === m.sender);
                        const senderDisplayName = isMe
                          ? "Vous"
                          : senderContact
                          ? senderContact.name
                          : m.sender;

                        return (
                          <div
                            key={m.id}
                            className={`flex flex-col max-w-[85%] ${isMe ? "self-end items-end" : "self-start items-start"}`}
                          >
                            {!isMe && (
                              <span className="text-[8.5px] font-bold text-slate-400 mb-0.5 ml-1">
                                {senderDisplayName}
                              </span>
                            )}

                            <div
                              className={`p-2.5 rounded-2xl text-[11px] leading-relaxed shadow-sm ${
                                isMe
                                  ? "bg-gradient-to-r from-indigo-600 via-indigo-500 to-cyan-600 text-white rounded-tr-xs"
                                  : "bg-slate-900 border border-slate-800 text-slate-100 rounded-tl-xs"
                              }`}
                            >
                              <p>{m.text}</p>
                              <div className={`text-[8px] font-mono mt-1 flex items-center gap-1 justify-end ${isMe ? "text-indigo-200" : "text-slate-500"}`}>
                                <span>{m.time}</span>
                                {isMe && <span>✓✓</span>}
                              </div>
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>

                  {/* Quick RP Response Chips */}
                  <div className="flex items-center gap-1 overflow-x-auto pb-1 text-[9px] shrink-0 no-scrollbar mb-1.5">
                    {[
                      "🍟 Poutine SVP",
                      "📍 En route !",
                      "👍 Compris !",
                      "🚕 Taxi SVP",
                      "🚨 Urgence !",
                    ].map((chip, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleSendMessage(undefined, chip)}
                        className="px-2 py-1 bg-slate-900 border border-slate-800 hover:border-indigo-500/50 hover:bg-indigo-950/40 text-slate-300 hover:text-white rounded-lg whitespace-nowrap transition text-[9px] font-medium"
                      >
                        {chip}
                      </button>
                    ))}
                  </div>

                  {/* Message Input Form */}
                  <form onSubmit={handleSendMessage} className="flex gap-1.5 shrink-0">
                    <div className="relative flex-1 flex items-center">
                      <input
                        type="text"
                        placeholder={`Écrire un SMS à ${activeThreadId}...`}
                        value={newMsgText}
                        onChange={(e) => setNewMsgText(e.target.value)}
                        onKeyDown={handleInputKeyDown}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 animate-realistic-caret font-medium shadow-inner pr-6"
                      />
                      <div className="absolute right-2.5 flex items-center pointer-events-none select-none">
                        <span className="w-1.5 h-3 bg-cyan-400 rounded-xs animate-cursor-block" />
                      </div>
                    </div>
                    <button
                      type="submit"
                      className="px-3 py-2 bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 rounded-xl text-white font-bold text-xs shadow-md transition active:scale-95 cursor-pointer shrink-0"
                    >
                      <Send className="w-3.5 h-3.5" />
                    </button>
                  </form>
                </div>
              )}

              {/* NEW THREAD MODAL */}
              {isNewThreadModalOpen && (
                <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md z-50 p-4 flex flex-col justify-between animate-fade-in">
                  <div>
                    <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-2">
                      <h4 className="text-xs font-black uppercase text-indigo-400">Nouveau Fil de Message</h4>
                      <button
                        onClick={() => setIsNewThreadModalOpen(false)}
                        className="text-slate-400 hover:text-white p-1"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <p className="text-[10px] text-slate-400 mb-3">
                      Sélectionnez un contact du répertoire ou saisissez un numéro :
                    </p>

                    {/* Contacts Picker */}
                    <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
                      {contacts.map((c) => (
                        <button
                          key={c.id}
                          onClick={() => {
                            handleSelectThread(c.phone);
                            setIsNewThreadModalOpen(false);
                          }}
                          className="w-full p-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-indigo-500 text-left flex items-center justify-between text-[10px]"
                        >
                          <div className="flex items-center gap-2">
                            <div className={`w-6 h-6 rounded-lg ${c.avatarColor || "bg-indigo-600"} flex items-center justify-center text-white font-bold text-[10px]`}>
                              {c.name.charAt(0)}
                            </div>
                            <div>
                              <div className="font-bold text-white">{c.name}</div>
                              <div className="text-slate-400 font-mono text-[8px]">{c.phone}</div>
                            </div>
                          </div>
                          <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
                        </button>
                      ))}
                    </div>

                    {/* Manual Number Input */}
                    <div className="mt-3 pt-3 border-t border-slate-800">
                      <label className="text-[9px] text-slate-400 font-bold block mb-1">
                        Saisir un numéro personnalisé :
                      </label>
                      <div className="flex gap-1.5">
                        <input
                          type="text"
                          placeholder="Ex: 514-555-0000"
                          value={newThreadTarget}
                          onChange={(e) => setNewThreadTarget(e.target.value)}
                          onKeyDown={handleInputKeyDown}
                          className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500 animate-realistic-caret font-medium"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (!newThreadTarget.trim()) return;
                            handleSelectThread(newThreadTarget.trim());
                            setNewThreadTarget("");
                            setIsNewThreadModalOpen(false);
                          }}
                          className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold"
                        >
                          Démarrer
                        </button>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => setIsNewThreadModalOpen(false)}
                    className="w-full py-2 bg-slate-900 border border-slate-800 text-slate-400 rounded-xl text-xs font-bold mt-2"
                  >
                    Annuler
                  </button>
                </div>
              )}
            </div>
          )}

          {/* APP: GPS WAYPOINTS & POI */}
          {activeApp === "gps" && (() => {
            const POI_LIST = [
              // URGENCES Category (Hôpitaux, Police & Secours)
              {
                id: "hospital_samu06",
                name: "Hôpital Général SAMU 06",
                category: "urgences" as const,
                typeLabel: "Hôpital & Urgences 24/7",
                x: 25,
                z: 35,
                iconEmoji: "🏥",
                IconComp: Hospital,
                description: "Centre hospitalier universitaire, urgences traumatologiques, soins intensifs & réanimation 24/7.",
                badge: "🚨 URGENCE 24/7",
                badgeClass: "bg-rose-950/90 text-rose-300 border-rose-500/60 shadow-[0_0_12px_rgba(244,63,94,0.35)]",
                cardBorder: "border-rose-500/50 hover:border-rose-400 bg-gradient-to-r from-rose-950/30 to-slate-950/80",
                phone: "911 / (418) 555-0199",
                isEmergency: true
              },
              {
                id: "police_spvm_hq",
                name: "QG SPVM - Police Centrale",
                category: "urgences" as const,
                typeLabel: "Commissariat Principal SPVM",
                x: 35,
                z: -40,
                iconEmoji: "🚓",
                IconComp: Siren,
                description: "Commissariat principal de la Police SPVM. Dépôts de plaintes, détention & patrouilles d'intervention.",
                badge: "🚓 POLICE SPVM 911",
                badgeClass: "bg-blue-950/90 text-blue-300 border-blue-500/60 shadow-[0_0_12px_rgba(59,130,246,0.35)]",
                cardBorder: "border-blue-500/50 hover:border-blue-400 bg-gradient-to-r from-blue-950/30 to-slate-950/80",
                phone: "911 / (418) 555-0112",
                isEmergency: true
              },
              {
                id: "police_sq_nord",
                name: "Poste Sûreté du Québec (SQ)",
                category: "urgences" as const,
                typeLabel: "Poste de Police Autoroutier",
                x: -35,
                z: -60,
                iconEmoji: "👮‍♂️",
                IconComp: ShieldAlert,
                description: "Brigade d'intervention routière, radars autoroutiers & contrôle routier régional Portneuf.",
                badge: "🛡️ SÛRETÉ DU QUÉBEC",
                badgeClass: "bg-cyan-950/90 text-cyan-300 border-cyan-500/60 shadow-[0_0_10px_rgba(6,182,212,0.35)]",
                cardBorder: "border-cyan-500/40 hover:border-cyan-400 bg-gradient-to-r from-cyan-950/30 to-slate-950/80",
                phone: "911 / (418) 555-0110",
                isEmergency: true
              },
              {
                id: "clinique_médicale",
                name: "Clinique Médicale & Garde",
                category: "urgences" as const,
                typeLabel: "Soins Ambulatoires & Pharmacie",
                x: -15,
                z: 25,
                iconEmoji: "🩺",
                IconComp: Stethoscope,
                description: "Consultations médicales d'urgence sans rendez-vous, trousses de soins & défibrillateurs.",
                badge: "💊 GARDE MÉDICALE",
                badgeClass: "bg-emerald-950/90 text-emerald-300 border-emerald-500/50",
                cardBorder: "border-emerald-500/40 hover:border-emerald-400 bg-gradient-to-r from-emerald-950/30 to-slate-950/80",
                phone: "(418) 555-0144",
                isEmergency: true
              },
              {
                id: "caserne_pompiers",
                name: "Caserne de Pompiers #1",
                category: "urgences" as const,
                typeLabel: "Service Incendie & Secours",
                x: 10,
                z: -50,
                iconEmoji: "🚒",
                IconComp: Flame,
                description: "Unité de secours incendie, désincarceration routière et sauvetage d'urgence 911.",
                badge: "🔥 SECOURS INCENDIE",
                badgeClass: "bg-amber-950/90 text-amber-300 border-amber-500/50",
                cardBorder: "border-amber-500/40 hover:border-amber-400 bg-gradient-to-r from-amber-950/30 to-slate-950/80",
                phone: "911 / (418) 555-0119",
                isEmergency: true
              },

              // COMMERCES Category
              {
                id: "chez_gaston",
                name: "Chez Gaston (Cantine)",
                category: "commerces" as const,
                typeLabel: "Cantine Roulotte Poutine",
                x: -10,
                z: -15,
                iconEmoji: "🍟",
                IconComp: Compass,
                description: "Poutines traditionnelles au fromage en grain, hot-dogs vapeur & breuvages rafraîchissants.",
                badge: "🍟 Cantine RP",
                badgeClass: "bg-slate-900 text-amber-300 border-slate-700",
                cardBorder: "border-slate-800 hover:border-amber-500/50 bg-slate-950/80",
                isEmergency: false
              },
              {
                id: "boutique_ether",
                name: "Boutique Éther Mode",
                category: "commerces" as const,
                typeLabel: "Boutique de Vêtements",
                x: -22,
                z: 10,
                iconEmoji: "👕",
                IconComp: Compass,
                description: "Collection de vêtements urbains, accessoires de style & personnalisation d'apparence.",
                badge: "👕 Mode & Style",
                badgeClass: "bg-slate-900 text-purple-300 border-slate-700",
                cardBorder: "border-slate-800 hover:border-purple-500/50 bg-slate-950/80",
                isEmergency: false
              },
              {
                id: "caisse_desjardins",
                name: "Caisse Desjardins",
                category: "commerces" as const,
                typeLabel: "Institution Financière",
                x: 15,
                z: -5,
                iconEmoji: "🏧",
                IconComp: Compass,
                description: "Guichets automatiques, gestion de compte Desjardins, prêts RP & retraits d'argent.",
                badge: "🏧 Banque Desjardins",
                badgeClass: "bg-slate-900 text-emerald-300 border-slate-700",
                cardBorder: "border-slate-800 hover:border-emerald-500/50 bg-slate-950/80",
                isEmergency: false
              },
              {
                id: "supercar_quebec",
                name: "Supercar Québec",
                category: "commerces" as const,
                typeLabel: "Concessionnaire Auto",
                x: 5,
                z: 15,
                iconEmoji: "🚗",
                IconComp: Compass,
                description: "Vente et essais routiers de supercars de luxe, muscle cars & véhicules sportifs.",
                badge: "🏎️ Concessionnaire",
                badgeClass: "bg-slate-900 text-cyan-300 border-slate-700",
                cardBorder: "border-slate-800 hover:border-cyan-500/50 bg-slate-950/80",
                isEmergency: false
              },

              // LIEUX RP Category
              {
                id: "hotel_platinum",
                name: "Hôtel du Lac Platinum",
                category: "rp" as const,
                typeLabel: "Hôtel & Résidence 5★",
                x: 0,
                z: -30,
                iconEmoji: "🏛️",
                IconComp: Building2,
                description: "Complexe hôtelier 5 étoiles avec suites exécutives, ascenseurs et coffres sécurisés.",
                badge: "🏨 Hôtel 5★",
                badgeClass: "bg-slate-900 text-indigo-300 border-slate-700",
                cardBorder: "border-slate-800 hover:border-indigo-500/50 bg-slate-950/80",
                isEmergency: false
              },
              {
                id: "villa_celeste",
                name: "Villa Céleste",
                category: "rp" as const,
                typeLabel: "Domaine de Prestige",
                x: 28,
                z: -8,
                iconEmoji: "⚜️",
                IconComp: Landmark,
                description: "Propriété haut de gamme surplombant le fleuve avec terrasses & héliport.",
                badge: "🏰 Prestige RP",
                badgeClass: "bg-slate-900 text-amber-300 border-slate-700",
                cardBorder: "border-slate-800 hover:border-amber-500/50 bg-slate-950/80",
                isEmergency: false
              },
              {
                id: "tour_radio_fm",
                name: "Tour Radio TroxT FM",
                category: "rp" as const,
                typeLabel: "Station Émettrice Radio",
                x: -45,
                z: 50,
                iconEmoji: "🗼",
                IconComp: Radio,
                description: "Tour d'antennes radio FM émettant les fréquences de Québec et Portneuf.",
                badge: "📻 Radio FM Live",
                badgeClass: "bg-slate-900 text-cyan-300 border-slate-700",
                cardBorder: "border-slate-800 hover:border-cyan-500/50 bg-slate-950/80",
                isEmergency: false
              }
            ];

            const filteredPoiList = POI_LIST.filter((poi) => {
              const matchesCat = gpsCategoryFilter === "all" || poi.category === gpsCategoryFilter;
              const matchesQuery =
                !gpsSearchQuery.trim() ||
                poi.name.toLowerCase().includes(gpsSearchQuery.toLowerCase()) ||
                poi.typeLabel.toLowerCase().includes(gpsSearchQuery.toLowerCase()) ||
                poi.description.toLowerCase().includes(gpsSearchQuery.toLowerCase());
              return matchesCat && matchesQuery;
            });

            const emergencyCount = POI_LIST.filter((p) => p.category === "urgences").length;

            const handleSetPoiWaypoint = (poi: typeof POI_LIST[0]) => {
              if (onSetWaypoint) onSetWaypoint(poi.x, poi.z);
              setGpsToastMessage(`📍 GPS : Waypoint fixé sur ${poi.name} (X:${poi.x}, Z:${poi.z})`);
              setTimeout(() => setGpsToastMessage(null), 3500);
            };

            return (
              <div className="flex flex-col h-full overflow-hidden text-slate-100 font-sans">
                {/* GPS HEADER */}
                <div className="flex items-center justify-between mb-2 border-b border-slate-800 pb-2 shrink-0">
                  <div className="flex items-center gap-2">
                    <button onClick={() => setActiveApp("home")} className="text-slate-400 hover:text-white cursor-pointer">
                      <ArrowLeft className="w-4 h-4" />
                    </button>
                    <h3 className="text-xs font-black uppercase text-amber-400 flex items-center gap-1.5 tracking-wider">
                      <Compass className="w-4 h-4 text-amber-400 animate-spin-slow" /> GPS & Repères RP
                    </h3>
                  </div>
                  <span className="text-[9px] font-bold text-amber-300 bg-amber-950/80 border border-amber-500/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-amber-400" /> {filteredPoiList.length} POI
                  </span>
                </div>

                {/* TOAST NOTIFICATION */}
                <AnimatePresence>
                  {gpsToastMessage && (
                    <motion.div
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      className="mb-2 p-2 rounded-xl bg-emerald-950/90 border border-emerald-500/50 text-[10.5px] font-bold text-emerald-200 flex items-center justify-between shadow-lg"
                    >
                      <span>{gpsToastMessage}</span>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 ml-1.5" />
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* CATEGORY TABS SELECTOR */}
                <div className="grid grid-cols-4 gap-1 mb-2 bg-slate-900/90 p-1 rounded-xl border border-slate-800 text-[9.5px] font-bold shrink-0">
                  <button
                    onClick={() => setGpsCategoryFilter("all")}
                    className={`py-1.5 rounded-lg transition flex items-center justify-center gap-1 cursor-pointer ${
                      gpsCategoryFilter === "all"
                        ? "bg-amber-600 text-slate-950 font-black shadow"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    <span>Tous</span>
                  </button>

                  <button
                    onClick={() => setGpsCategoryFilter("urgences")}
                    className={`py-1.5 rounded-lg transition flex items-center justify-center gap-1 cursor-pointer relative ${
                      gpsCategoryFilter === "urgences"
                        ? "bg-gradient-to-r from-red-600 to-rose-600 text-white font-black shadow-[0_0_10px_rgba(239,68,68,0.5)]"
                        : "text-red-400 hover:text-red-300 bg-red-950/20"
                    }`}
                  >
                    <Siren className="w-3 h-3 text-red-400 animate-pulse" />
                    <span>Urgences</span>
                    <span className="text-[8px] bg-red-900/80 text-red-200 px-1 rounded-full font-mono">{emergencyCount}</span>
                  </button>

                  <button
                    onClick={() => setGpsCategoryFilter("commerces")}
                    className={`py-1.5 rounded-lg transition flex items-center justify-center gap-1 cursor-pointer ${
                      gpsCategoryFilter === "commerces"
                        ? "bg-cyan-600 text-slate-950 font-black shadow"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    <span>Commerces</span>
                  </button>

                  <button
                    onClick={() => setGpsCategoryFilter("rp")}
                    className={`py-1.5 rounded-lg transition flex items-center justify-center gap-1 cursor-pointer ${
                      gpsCategoryFilter === "rp"
                        ? "bg-purple-600 text-white font-black shadow"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    <span>Lieux RP</span>
                  </button>
                </div>

                {/* SEARCH INPUT BAR */}
                <div className="relative mb-2 shrink-0">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                  <input
                    type="text"
                    value={gpsSearchQuery}
                    onChange={(e) => setGpsSearchQuery(e.target.value)}
                    placeholder="Rechercher un lieu, hôpital, police..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-7 py-1.5 text-[11px] text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500/60"
                  />
                  {gpsSearchQuery && (
                    <button
                      onClick={() => setGpsSearchQuery("")}
                      className="absolute right-2.5 top-2.5 text-slate-400 hover:text-white cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* URGENCES BANNER IF URGENCES FILTER OR ACTIVE */}
                {gpsCategoryFilter === "urgences" && (
                  <div className="mb-2 p-2 rounded-xl bg-gradient-to-r from-red-950/80 via-rose-950/80 to-blue-950/80 border border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.2)] flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-red-600/30 border border-red-500/60 rounded-lg text-red-400 animate-pulse">
                        <Siren className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-[10px] font-black uppercase text-red-300 tracking-wide flex items-center gap-1">
                          🚨 Urgences 911 Hôpitaux & Police
                        </div>
                        <div className="text-[9px] text-slate-300">
                          Hôpitaux, secours et postes de police géolocalisés.
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* POI LIST */}
                <div className="flex-1 overflow-y-auto space-y-2 pr-0.5 custom-scrollbar">
                  {filteredPoiList.length === 0 ? (
                    <div className="text-center py-8 text-slate-500 text-xs font-semibold">
                      Aucun point d'intérêt trouvé dans cette catégorie.
                    </div>
                  ) : (
                    filteredPoiList.map((poi) => {
                      const IconComponent = poi.IconComp || Compass;
                      return (
                        <div
                          key={poi.id}
                          className={`p-2.5 rounded-xl border transition flex flex-col gap-1.5 relative overflow-hidden group ${poi.cardBorder}`}
                        >
                          {/* TOP ROW: Icon + Name + Badge */}
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <div
                                className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border relative ${
                                  poi.isEmergency
                                    ? poi.category === "urgences" && poi.id.includes("police")
                                      ? "bg-blue-950/80 border-blue-500/60 text-blue-400 shadow-[0_0_10px_rgba(59,130,246,0.3)]"
                                      : "bg-rose-950/80 border-rose-500/60 text-rose-400 shadow-[0_0_10px_rgba(244,63,94,0.3)]"
                                    : "bg-slate-900 border-slate-800 text-amber-400"
                                }`}
                              >
                                <IconComponent className={`w-4 h-4 ${poi.isEmergency ? "animate-pulse" : ""}`} />
                                <span className="absolute -bottom-1 -right-1 text-[9px] leading-none">{poi.iconEmoji}</span>
                              </div>

                              <div className="min-w-0">
                                <h4 className="text-[11.5px] font-black text-slate-100 truncate flex items-center gap-1">
                                  {poi.name}
                                </h4>
                                <div className="text-[9.5px] text-slate-400 font-semibold">{poi.typeLabel}</div>
                              </div>
                            </div>

                            <span className={`text-[8.5px] font-mono font-black px-2 py-0.5 rounded-full border shrink-0 ${poi.badgeClass}`}>
                              {poi.badge}
                            </span>
                          </div>

                          {/* DESCRIPTION */}
                          <p className="text-[9.5px] text-slate-300/90 leading-tight">
                            {poi.description}
                          </p>

                          {/* BOTTOM ROW: Phone + Coordinates + Action Button */}
                          <div className="flex items-center justify-between border-t border-slate-800/60 pt-1.5 mt-0.5 text-[9.5px]">
                            <div className="flex items-center gap-2 font-mono text-slate-400">
                              <span className="text-amber-400 font-bold">X: {poi.x}</span>
                              <span className="text-amber-400 font-bold">Z: {poi.z}</span>
                              {poi.phone && (
                                <span className="text-slate-400 text-[8.5px] border-l border-slate-800 pl-2">
                                  📞 {poi.phone}
                                </span>
                              )}
                            </div>

                            <button
                              onClick={() => handleSetPoiWaypoint(poi)}
                              className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wide transition flex items-center gap-1 cursor-pointer ${
                                poi.isEmergency
                                  ? "bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white shadow-[0_0_10px_rgba(239,68,68,0.4)]"
                                  : "bg-amber-500 hover:bg-amber-400 text-slate-950"
                              }`}
                            >
                              <MapPin className="w-3 h-3" />
                              <span>Mettre Cap</span>
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })()}

          {/* APP: DARK WEB */}
          {activeApp === "darkweb" && (
            <div className="flex flex-col h-full">
              <div className="flex items-center gap-2 mb-3 border-b border-slate-800 pb-2">
                <button onClick={() => setActiveApp("home")} className="text-slate-400 hover:text-white">
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <h3 className="text-xs font-bold uppercase text-red-500">DarkNet Underground</h3>
              </div>

              {darkWebOrder && (
                <div className="bg-red-950/80 border border-red-500/40 p-2.5 rounded-xl text-[10px] text-red-300 mb-3">
                  ⚠️ Commande clandestine passée : {darkWebOrder}
                </div>
              )}

              <div className="flex flex-col gap-2">
                {[
                  { id: "lockpick", name: "Crochet de serrure", price: 1500 },
                  { id: "weed_seeds", name: "Graines de cannabis x10", price: 800 },
                  { id: "fake_id", name: "Faux papiers d'identité", price: 3000 },
                ].map((item) => (
                  <div key={item.id} className="p-2.5 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-white">{item.name}</div>
                      <div className="text-[10px] text-red-400">${item.price}</div>
                    </div>
                    <button
                      onClick={() => setDarkWebOrder(item.name)}
                      className="px-2.5 py-1 bg-red-600 hover:bg-red-500 rounded-lg text-[10px] font-bold text-white"
                    >
                      Acheter
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* APP: ADMIN / STAFF CONTROL CENTER */}
          {activeApp === "admin" && (
            <div className="flex flex-col h-full overflow-hidden text-slate-100 font-sans">
              {/* HEADER */}
              <div className="flex items-center justify-between mb-2 border-b border-slate-800 pb-2 shrink-0">
                <div className="flex items-center gap-2">
                  <button onClick={() => setActiveApp("home")} className="text-slate-400 hover:text-white cursor-pointer">
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                  <h3 className="text-xs font-black uppercase text-purple-400 flex items-center gap-1.5 tracking-wider">
                    <Shield className="w-4 h-4 text-purple-400" /> Admin & Modération
                  </h3>
                </div>
                <span className="text-[9px] font-bold text-emerald-400 bg-emerald-950/80 border border-emerald-500/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span> Staff Live
                </span>
              </div>

              {/* TABS SELECTOR */}
              <div className="grid grid-cols-3 gap-1 mb-2 bg-slate-900/80 p-1 rounded-xl border border-slate-800 text-[10px] font-bold shrink-0">
                <button
                  onClick={() => setAdminTab("commands")}
                  className={`py-1.5 rounded-lg transition flex items-center justify-center gap-1 cursor-pointer ${
                    adminTab === "commands"
                      ? "bg-purple-600 text-white font-extrabold shadow"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <Terminal className="w-3 h-3" /> Commandes
                </button>

                <button
                  onClick={() => setAdminTab("logs")}
                  className={`py-1.5 rounded-lg transition flex items-center justify-center gap-1 cursor-pointer ${
                    adminTab === "logs"
                      ? "bg-purple-600 text-white font-extrabold shadow"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <Activity className="w-3 h-3 text-cyan-400" /> Logs ({auditLogsState.length})
                </button>

                <button
                  onClick={() => setAdminTab("support")}
                  className={`py-1.5 rounded-lg transition flex items-center justify-center gap-1 cursor-pointer ${
                    adminTab === "support"
                      ? "bg-purple-600 text-white font-extrabold shadow"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <ShieldAlert className="w-3 h-3 text-rose-400" /> Staff Chat
                </button>
              </div>

              {/* TOAST FEEDBACK NOTIFICATION */}
              <AnimatePresence>
                {adminToast && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className={`p-2 rounded-xl text-[10px] font-mono font-bold mb-2 flex items-center gap-2 border shrink-0 ${
                      adminToast.type === "success"
                        ? "bg-emerald-950/90 text-emerald-300 border-emerald-500/50"
                        : "bg-rose-950/90 text-rose-300 border-rose-500/50"
                    }`}
                  >
                    {adminToast.type === "success" ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    ) : (
                      <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                    )}
                    <span className="truncate">{adminToast.message}</span>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* TAB 1: VISUAL COMMANDS CATALOG WITH ONE-CLICK BUTTONS */}
              {adminTab === "commands" && (
                <div className="flex-1 flex flex-col min-h-0 space-y-2">
                  {/* SEARCH & CATEGORY BAR */}
                  <div className="space-y-1.5 shrink-0">
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2" />
                      <input
                        type="text"
                        value={adminSearch}
                        onChange={(e) => setAdminSearch(e.target.value)}
                        placeholder="Rechercher une commande (/kick, /god, /tp)..."
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-[10.5px] text-purple-200 placeholder-slate-500 focus:outline-none focus:border-purple-500 transition font-mono"
                      />
                    </div>

                    {/* Category Filter Pills */}
                    <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none text-[9px] font-bold">
                      {["all", "moderation", "player", "teleport", "gmod", "economy", "world", "system"].map((cat) => (
                        <button
                          key={cat}
                          onClick={() => setAdminCategoryFilter(cat)}
                          className={`px-2 py-0.5 rounded-full capitalize shrink-0 transition cursor-pointer border ${
                            adminCategoryFilter === cat
                              ? "bg-purple-600 text-white border-purple-400 font-black"
                              : "bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200"
                          }`}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* QUICK ACCESS ACTION STRIP */}
                  <div className="bg-slate-900/60 p-2 rounded-xl border border-slate-800 shrink-0">
                    <div className="text-[9px] font-black uppercase text-purple-400 mb-1.5 tracking-wider flex items-center justify-between">
                      <span>⚡ Actions Rapides 1-CLIC</span>
                      <span className="text-slate-500 font-mono text-[8px]">Instant</span>
                    </div>
                    <div className="grid grid-cols-3 gap-1.5 text-[9.5px]">
                      <button
                        onClick={() => {
                          const cmd = getAllAdminCommands().find((c) => c.name === "god");
                          if (cmd) handleExecutePhoneCommand(cmd);
                          else onAdminCommand?.("god", []);
                        }}
                        className="p-1.5 rounded-lg bg-emerald-950/70 hover:bg-emerald-900 border border-emerald-500/40 text-emerald-300 font-bold transition flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <Zap className="w-3 h-3 text-emerald-400" /> Mode Dieu
                      </button>

                      <button
                        onClick={() => {
                          const cmd = getAllAdminCommands().find((c) => c.name === "fly");
                          if (cmd) handleExecutePhoneCommand(cmd);
                          else onAdminCommand?.("fly", []);
                        }}
                        className="p-1.5 rounded-lg bg-cyan-950/70 hover:bg-cyan-900 border border-cyan-500/40 text-cyan-300 font-bold transition flex items-center justify-center gap-1 cursor-pointer"
                      >
                        🚀 Vol / Fly
                      </button>

                      <button
                        onClick={() => {
                          const cmd = getAllAdminCommands().find((c) => c.name === "heal");
                          if (cmd) handleExecutePhoneCommand(cmd);
                          else onAdminCommand?.("heal", []);
                        }}
                        className="p-1.5 rounded-lg bg-rose-950/70 hover:bg-rose-900 border border-rose-500/40 text-rose-300 font-bold transition flex items-center justify-center gap-1 cursor-pointer"
                      >
                        ❤️ Soigner
                      </button>

                      <button
                        onClick={() => {
                          const cmd = getAllAdminCommands().find((c) => c.name === "money");
                          if (cmd) handleExecutePhoneCommand(cmd, "10000");
                          else onAdminCommand?.("money", ["10000"]);
                        }}
                        className="p-1.5 rounded-lg bg-amber-950/70 hover:bg-amber-900 border border-amber-500/40 text-amber-300 font-bold transition flex items-center justify-center gap-1 cursor-pointer"
                      >
                        💵 +$10k
                      </button>

                      <button
                        onClick={() => {
                          const cmd = getAllAdminCommands().find((c) => c.name === "tpspawn");
                          if (cmd) handleExecutePhoneCommand(cmd);
                          else onAdminCommand?.("tpspawn", []);
                        }}
                        className="p-1.5 rounded-lg bg-indigo-950/70 hover:bg-indigo-900 border border-indigo-500/40 text-indigo-300 font-bold transition flex items-center justify-center gap-1 cursor-pointer"
                      >
                        📍 TP Spawn
                      </button>

                      <button
                        onClick={() => {
                          const cmd = getAllAdminCommands().find((c) => c.name === "clear");
                          if (cmd) handleExecutePhoneCommand(cmd);
                          else onAdminCommand?.("clear", []);
                        }}
                        className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 font-bold transition flex items-center justify-center gap-1 cursor-pointer"
                      >
                        🧹 Clear 3D
                      </button>
                    </div>
                  </div>

                  {/* VISUAL COMMANDS SCROLLABLE LIST */}
                  <div className="flex-1 overflow-y-auto pr-1 space-y-2 scrollbar-thin">
                    {getAllAdminCommands()
                      .filter((cmd) => {
                        const matchCat = adminCategoryFilter === "all" || cmd.category === adminCategoryFilter;
                        const matchSearch = !adminSearch.trim() || 
                          cmd.name.toLowerCase().includes(adminSearch.toLowerCase()) ||
                          cmd.description.toLowerCase().includes(adminSearch.toLowerCase()) ||
                          cmd.usage.toLowerCase().includes(adminSearch.toLowerCase());
                        return matchCat && matchSearch;
                      })
                      .map((cmd) => {
                        const paramVal = adminParamInputs[cmd.id] || "";
                        return (
                          <div
                            key={cmd.id}
                            className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-purple-500/50 transition flex flex-col justify-between gap-2 group"
                          >
                            <div>
                              <div className="flex items-center justify-between">
                                <span className="text-[11px] font-black font-mono text-purple-300 flex items-center gap-1">
                                  /{cmd.name}
                                </span>
                                <div className="flex items-center gap-1">
                                  <span className="text-[8px] font-bold uppercase px-1.5 py-0.2 rounded bg-slate-950 text-slate-400 border border-slate-800">
                                    {cmd.category}
                                  </span>
                                  <span className="text-[8px] font-bold uppercase px-1.5 py-0.2 rounded bg-purple-950 text-purple-300 border border-purple-800/60">
                                    {cmd.permission}
                                  </span>
                                </div>
                              </div>

                              <p className="text-[9.5px] text-slate-300 mt-1 leading-snug">
                                {cmd.description}
                              </p>

                              <div className="text-[8.5px] font-mono text-slate-500 mt-1">
                                {cmd.usage}
                              </div>
                            </div>

                            {/* PARAMETER INPUT & QUICK RUN BUTTON */}
                            <div className="flex items-center gap-1.5 pt-1 border-t border-slate-800/80">
                              <input
                                type="text"
                                value={paramVal}
                                onChange={(e) =>
                                  setAdminParamInputs({ ...adminParamInputs, [cmd.id]: e.target.value })
                                }
                                placeholder="Args (ex: local_player AFK)..."
                                className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-[9.5px] text-purple-200 placeholder-slate-600 focus:outline-none focus:border-purple-500 font-mono"
                              />
                              <button
                                onClick={() => handleExecutePhoneCommand(cmd, paramVal)}
                                className="px-2.5 py-1 bg-purple-600 hover:bg-purple-500 text-white font-extrabold text-[9.5px] rounded-lg transition flex items-center gap-1 shrink-0 cursor-pointer shadow-md shadow-purple-950"
                              >
                                <Zap className="w-3 h-3 text-amber-300" /> Exécuter
                              </button>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}

              {/* TAB 2: AUDIT LOGS - LIVE STREAM WINDOW */}
              {adminTab === "logs" && (
                <div className="flex-1 flex flex-col min-h-0 space-y-2">
                  <div className="flex items-center justify-between text-[10px] text-slate-400 shrink-0">
                    <span className="font-bold text-cyan-400 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></span> Traçabilité Admin En Direct
                    </span>
                    <button
                      onClick={() => setAuditLogsState([])}
                      className="text-[9px] text-slate-500 hover:text-slate-300 flex items-center gap-1 cursor-pointer"
                    >
                      <RotateCcw className="w-2.5 h-2.5" /> Effacer vue
                    </button>
                  </div>

                  {/* SEARCH & FILTER BAR FOR LOGS */}
                  <div className="relative shrink-0">
                    <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2" />
                    <input
                      type="text"
                      value={logsSearchFilter}
                      onChange={(e) => setLogsSearchFilter(e.target.value)}
                      placeholder="Filtrer par exécuteur, joueur ou commande..."
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-8 pr-8 py-1.5 text-[10.5px] text-cyan-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition font-mono"
                    />
                    {logsSearchFilter && (
                      <button
                        onClick={() => setLogsSearchFilter("")}
                        className="absolute right-2.5 top-1.5 text-slate-500 hover:text-slate-300 text-xs font-bold"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  <div className="flex-1 overflow-y-auto pr-1 space-y-1.5 font-mono scrollbar-thin">
                    {(() => {
                      const filteredLogs = auditLogsState.filter((log) => {
                        if (!logsSearchFilter.trim()) return true;
                        const query = logsSearchFilter.toLowerCase().trim();
                        return (
                          log.executor.toLowerCase().includes(query) ||
                          log.command.toLowerCase().includes(query) ||
                          log.message.toLowerCase().includes(query) ||
                          (log.category && log.category.toLowerCase().includes(query))
                        );
                      });

                      if (filteredLogs.length === 0) {
                        return (
                          <div className="text-center py-10 text-slate-600 text-[10px] italic">
                            {auditLogsState.length === 0
                              ? "Aucun log d'administration enregistré pour l'instant."
                              : "Aucun log ne correspond à votre recherche."}
                          </div>
                        );
                      }

                      return filteredLogs.map((log) => (
                        <div
                          key={log.id}
                          className="p-2 rounded-xl bg-slate-900/90 border border-slate-800 text-[9.5px] space-y-0.5 hover:border-cyan-500/30 transition"
                        >
                          <div className="flex items-center justify-between text-[8.5px] text-slate-500">
                            <span className="text-purple-400 font-bold flex items-center gap-1">
                              [{log.timestamp}] <span className="text-cyan-300 font-extrabold">{log.executor}</span>
                            </span>
                            <span className="bg-slate-950 px-1 py-0.2 rounded text-cyan-300 border border-slate-800 font-mono">
                              {log.command}
                            </span>
                          </div>
                          <div
                            className={`flex items-start gap-1.5 leading-snug ${
                              log.success ? "text-emerald-300" : "text-rose-400"
                            }`}
                          >
                            {log.success ? (
                              <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0 mt-0.5" />
                            ) : (
                              <AlertTriangle className="w-3 h-3 text-rose-400 shrink-0 mt-0.5" />
                            )}
                            <span className="flex-1 break-words">{log.message}</span>
                          </div>
                        </div>
                      ));
                    })()}
                  </div>
                </div>
              )}

              {/* TAB 3: STAFF CHAT ALERT */}
              {adminTab === "support" && (
                <div className="flex-1 flex flex-col justify-between space-y-3">
                  <div className="p-3 bg-purple-950/40 border border-purple-500/30 rounded-2xl space-y-2">
                    <h4 className="text-xs font-bold text-purple-300 flex items-center gap-2">
                      <ShieldAlert className="w-4 h-4 text-purple-400" /> Support Direct Modération
                    </h4>
                    <p className="text-[10px] text-slate-300 leading-relaxed">
                      Envoyer un signalement ou un appel de détresse prioritaire aux administrateurs connectés.
                    </p>
                  </div>

                  <button
                    onClick={() => {
                      if (onSendAdminAlert) onSendAdminAlert("Demande d'assistance joueur envoyée.");
                      setAdminToast({
                        type: "success",
                        message: "🚨 Signalement transmis au Staff Server !"
                      });
                      setTimeout(() => setAdminToast(null), 3000);
                    }}
                    className="py-3.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-purple-950 cursor-pointer"
                  >
                    <ShieldAlert className="w-4 h-4" /> Transmettre Alerte Modérateur (/staffchat)
                  </button>
                </div>
              )}

              {/* SENSITIVE COMMAND CONFIRMATION MODAL FOR PHONE APP */}
              <AnimatePresence>
                {pendingPhoneConfirmCmd && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="absolute inset-0 bg-slate-950/90 backdrop-blur-md z-50 flex items-center justify-center p-4 font-mono text-left"
                  >
                    <div className="bg-slate-900 border-2 border-rose-500/60 rounded-2xl p-4 w-full shadow-2xl space-y-3">
                      <div className="flex items-center gap-2.5 border-b border-slate-800 pb-2.5">
                        <div className="w-8 h-8 rounded-lg bg-rose-950 border border-rose-500/50 flex items-center justify-center text-rose-400 shrink-0">
                          <AlertTriangle className="w-4 h-4 animate-pulse" />
                        </div>
                        <div>
                          <h3 className="text-xs font-black text-rose-300 uppercase tracking-wider">
                            Êtes-vous sûr ?
                          </h3>
                          <p className="text-[9px] text-slate-400">Action d'administration sensible</p>
                        </div>
                      </div>

                      <div className="space-y-1.5 text-[11px] text-slate-200">
                        <p className="font-sans text-slate-300 leading-snug">
                          Confirmez-vous l'exécution de la commande suivante ?
                        </p>
                        <div className="bg-slate-950 border border-slate-800 rounded-lg p-2 text-cyan-300 font-mono font-bold text-[11px] break-words">
                          {pendingPhoneConfirmCmd.fullCmdStr}
                        </div>
                        <p className="text-[9.5px] text-rose-400/90 italic font-sans leading-tight">
                          ⚠️ Cette action affecte la session du joueur ou le serveur.
                        </p>
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                        <button
                          type="button"
                          onClick={() => setPendingPhoneConfirmCmd(null)}
                          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-[10px] rounded-lg transition cursor-pointer"
                        >
                          Annuler
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const item = pendingPhoneConfirmCmd;
                            setPendingPhoneConfirmCmd(null);
                            handleExecutePhoneCommandDirectly(item.cmd, item.explicitArgs);
                          }}
                          className="px-3 py-1.5 bg-gradient-to-r from-rose-600 to-amber-600 hover:brightness-110 text-white font-black text-[10px] rounded-lg shadow-md transition cursor-pointer flex items-center gap-1"
                        >
                          <ShieldAlert className="w-3 h-3" />
                          <span>Confirmer</span>
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* APP: SETTINGS & DYNAMIC WALLPAPERS */}
          {activeApp === "settings" && (
            <div className="flex flex-col h-full overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between mb-2 border-b border-slate-800 pb-2 shrink-0">
                <div className="flex items-center gap-2">
                  <button onClick={() => setActiveApp("home")} className="text-slate-400 hover:text-white cursor-pointer">
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                  <h3 className="text-xs font-bold uppercase text-cyan-400 flex items-center gap-1.5">
                    <Settings className="w-4 h-4 text-cyan-400" /> Paramètres
                  </h3>
                </div>
                <span className="text-[9px] font-black text-purple-300 bg-purple-950/80 border border-purple-500/30 px-2 py-0.5 rounded-full">
                  v4.2 TroxT
                </span>
              </div>

              {/* Settings Sub-Navigation Tabs */}
              <div className="grid grid-cols-4 gap-1 p-1 mb-3 bg-slate-950/80 border border-slate-800 rounded-xl shrink-0">
                <button
                  onClick={() => setSettingsTab("widgets")}
                  className={`py-1.5 px-1 rounded-lg text-[9px] font-black uppercase transition flex flex-col items-center gap-0.5 cursor-pointer ${
                    settingsTab === "widgets"
                      ? "bg-cyan-500 text-slate-950 shadow-[0_0_10px_rgba(0,255,231,0.5)]"
                      : "text-slate-400 hover:text-white hover:bg-slate-900"
                  }`}
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  <span>Widgets</span>
                </button>

                <button
                  onClick={() => setSettingsTab("wallpapers")}
                  className={`py-1.5 px-1 rounded-lg text-[9px] font-black uppercase transition flex flex-col items-center gap-0.5 cursor-pointer ${
                    settingsTab === "wallpapers"
                      ? "bg-cyan-500 text-slate-950 shadow-[0_0_10px_rgba(0,255,231,0.5)]"
                      : "text-slate-400 hover:text-white hover:bg-slate-900"
                  }`}
                >
                  <Palette className="w-3.5 h-3.5" />
                  <span>Thèmes</span>
                </button>

                <button
                  onClick={() => setSettingsTab("ringtones")}
                  className={`py-1.5 px-1 rounded-lg text-[9px] font-black uppercase transition flex flex-col items-center gap-0.5 cursor-pointer ${
                    settingsTab === "ringtones"
                      ? "bg-cyan-500 text-slate-950 shadow-[0_0_10px_rgba(0,255,231,0.5)]"
                      : "text-slate-400 hover:text-white hover:bg-slate-900"
                  }`}
                >
                  <Bell className="w-3.5 h-3.5" />
                  <span>Sonnerie</span>
                </button>

                <button
                  onClick={() => setSettingsTab("security")}
                  className={`py-1.5 px-1 rounded-lg text-[9px] font-black uppercase transition flex flex-col items-center gap-0.5 cursor-pointer ${
                    settingsTab === "security"
                      ? "bg-cyan-500 text-slate-950 shadow-[0_0_10px_rgba(0,255,231,0.5)]"
                      : "text-slate-400 hover:text-white hover:bg-slate-900"
                  }`}
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>Sécurité</span>
                </button>
              </div>

              <div className="flex-1 overflow-y-auto pr-1 space-y-3.5 scrollbar-thin">
                {/* TAB: CUSTOMIZABLE WIDGETS MANAGER */}
                {settingsTab === "widgets" && (
                  <div className="space-y-3.5">
                    <div className="p-3 bg-gradient-to-r from-cyan-950/80 via-slate-900 to-indigo-950/80 border border-cyan-500/40 rounded-2xl space-y-2 shadow-lg">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <LayoutGrid className="w-4 h-4 text-cyan-400 animate-pulse" />
                          <span className="text-xs font-black text-white uppercase tracking-wider">
                            Gestionnaire de Widgets
                          </span>
                        </div>
                        <button
                          onClick={() => setActiveApp("home")}
                          className="px-2 py-0.5 bg-cyan-500 text-slate-950 hover:bg-cyan-400 font-extrabold text-[9px] rounded-full transition flex items-center gap-1 cursor-pointer shadow-sm"
                        >
                          <ExternalLink className="w-2.5 h-2.5" /> Voir Accueil
                        </button>
                      </div>
                      <p className="text-[9.5px] text-slate-300 leading-snug">
                        Activez, désactivez ou réorganisez l'ordre des widgets affichés directement sur la page d'accueil de votre téléphone RP.
                      </p>
                    </div>

                    {/* Active Widgets Ordering List */}
                    <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-2xl space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase text-cyan-400 tracking-wider flex items-center gap-1.5">
                          <CheckSquare className="w-3.5 h-3.5 text-cyan-400" /> Widgets Actifs ({enabledWidgets.length})
                        </span>
                        {enabledWidgets.length > 0 && (
                          <span className="text-[8px] text-slate-400 font-mono">
                            Ordre d'affichage
                          </span>
                        )}
                      </div>

                      {enabledWidgets.length === 0 ? (
                        <div className="p-4 rounded-xl bg-slate-900/60 border border-dashed border-slate-800 text-center text-slate-500 text-[10px] italic">
                          Aucun widget actif. Activez des widgets dans le catalogue ci-dessous.
                        </div>
                      ) : (
                        <div className="space-y-1.5">
                          {enabledWidgets.map((widgetId, index) => {
                            const item = WIDGET_CATALOG.find((w) => w.id === widgetId);
                            if (!item) return null;

                            return (
                              <motion.div
                                key={widgetId}
                                layout
                                className="p-2.5 rounded-xl bg-slate-900 border border-cyan-500/30 flex items-center justify-between gap-2 shadow-sm"
                              >
                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                  <div className="w-6 h-6 rounded-lg bg-cyan-950/80 border border-cyan-500/40 flex items-center justify-center font-black text-cyan-300 text-[10px] shrink-0">
                                    #{index + 1}
                                  </div>
                                  <div className="min-w-0">
                                    <div className="text-[10.5px] font-bold text-white truncate flex items-center gap-1.5">
                                      {item.name}
                                      <span className={`text-[8px] font-extrabold px-1.5 py-0.2 rounded border ${item.badgeColor}`}>
                                        {item.badge}
                                      </span>
                                    </div>
                                    <div className="text-[8.5px] text-slate-400 truncate">{item.category}</div>
                                  </div>
                                </div>

                                <div className="flex items-center gap-1 shrink-0">
                                  <button
                                    onClick={() => moveWidget(widgetId, "up")}
                                    disabled={index === 0}
                                    className={`p-1 rounded-lg border transition ${
                                      index === 0
                                        ? "opacity-30 border-slate-800 text-slate-600 cursor-not-allowed"
                                        : "bg-slate-800 border-slate-700 hover:border-cyan-400 text-cyan-300 cursor-pointer"
                                    }`}
                                    title="Monter"
                                  >
                                    <MoveUp className="w-3 h-3" />
                                  </button>

                                  <button
                                    onClick={() => moveWidget(widgetId, "down")}
                                    disabled={index === enabledWidgets.length - 1}
                                    className={`p-1 rounded-lg border transition ${
                                      index === enabledWidgets.length - 1
                                        ? "opacity-30 border-slate-800 text-slate-600 cursor-not-allowed"
                                        : "bg-slate-800 border-slate-700 hover:border-cyan-400 text-cyan-300 cursor-pointer"
                                    }`}
                                    title="Descendre"
                                  >
                                    <MoveDown className="w-3 h-3" />
                                  </button>

                                  <button
                                    onClick={() => toggleWidgetEnabled(widgetId)}
                                    className="p-1 rounded-lg bg-rose-950/80 hover:bg-rose-900 border border-rose-500/40 text-rose-300 cursor-pointer transition ml-1"
                                    title="Retirer de l'accueil"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                </div>
                              </motion.div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Catalog of Available Widgets */}
                    <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-2xl space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase text-purple-300 tracking-wider flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-purple-400" /> Catalogue des Widgets RP
                        </span>
                        <button
                          onClick={() => updateEnabledWidgets(["weather", "contacts", "bank", "notes", "radio"])}
                          className="text-[8.5px] font-bold text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer"
                        >
                          <RotateCcw className="w-2.5 h-2.5" /> Réinitialiser
                        </button>
                      </div>

                      <div className="space-y-2">
                        {WIDGET_CATALOG.map((item) => {
                          const isEnabled = enabledWidgets.includes(item.id);

                          return (
                            <div
                              key={item.id}
                              className={`p-2.5 rounded-xl border transition-all ${
                                isEnabled
                                  ? "bg-slate-900/90 border-slate-700"
                                  : "bg-slate-950/60 border-slate-800/80 opacity-70 hover:opacity-100"
                              }`}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="space-y-1">
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-[11px] font-bold text-white">{item.name}</span>
                                    <span className={`text-[8px] font-extrabold px-1.5 py-0.2 rounded border ${item.badgeColor}`}>
                                      {item.badge}
                                    </span>
                                  </div>
                                  <p className="text-[9px] text-slate-400 leading-snug">{item.description}</p>
                                </div>

                                <button
                                  onClick={() => toggleWidgetEnabled(item.id)}
                                  className={`px-2.5 py-1 rounded-xl text-[9px] font-black uppercase tracking-wider flex items-center gap-1 transition cursor-pointer shrink-0 ${
                                    isEnabled
                                      ? "bg-emerald-600 hover:bg-emerald-500 text-white shadow-[0_0_10px_rgba(52,211,153,0.4)]"
                                      : "bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
                                  }`}
                                >
                                  {isEnabled ? (
                                    <>
                                      <Check className="w-3 h-3" /> Actif
                                    </>
                                  ) : (
                                    <>
                                      <Plus className="w-3 h-3" /> Ajouter
                                    </>
                                  )}
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB: WALLPAPERS & THEMES */}
                {settingsTab === "wallpapers" && (
                  <div className="space-y-3.5">
                    {/* Brand Badge */}
                    <div className="p-3 bg-gradient-to-r from-purple-950/70 via-indigo-950/70 to-cyan-950/70 border border-cyan-500/30 rounded-2xl flex items-center justify-between shadow-[0_0_15px_rgba(0,255,231,0.15)]">
                      <div className="flex items-center gap-2.5">
                        <Sparkles className="w-5 h-5 text-cyan-400 animate-pulse shrink-0" />
                        <div>
                          <div className="text-[11px] font-black text-white tracking-wide">
                            Etherworld by TroxT intellectus
                          </div>
                          <div className="text-[9px] text-cyan-300/80 font-mono">
                            Fonds d'écran dynamiques & thèmes
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Wallpaper Section */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase text-cyan-400 tracking-wider flex items-center gap-1.5">
                          <Palette className="w-3.5 h-3.5 text-cyan-400" /> Choisir Fond d'écran
                        </span>
                        <span className="text-[9px] text-slate-400 font-mono flex items-center gap-1">
                          <Sparkles className="w-2.5 h-2.5 text-cyan-400 animate-pulse" />
                          {wallpaper === "neon" ? "Cyber Néon" : wallpaper === "minimal" ? "Minimaliste" : wallpaper === "realistic" ? "Réaliste" : wallpaper === "aurora" ? "Aurore Nordique" : "Cyberpunk"}
                        </span>
                      </div>

                      {/* Live Animated Wallpaper Preview Box */}
                      <div className="relative w-full h-24 rounded-2xl border border-cyan-500/40 overflow-hidden shadow-lg bg-slate-950 shrink-0">
                        <AnimatePresence initial={false}>
                          <motion.div
                            key={wallpaper}
                            initial={{ opacity: 0, scale: 1.05, filter: "blur(6px)" }}
                            animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                            exit={{ opacity: 0, scale: 0.95, filter: "blur(6px)" }}
                            transition={{ duration: 0.65, ease: "easeInOut" }}
                            className="absolute inset-0 pointer-events-none"
                          >
                            {renderDynamicWallpaper(wallpaper, customWallpaperUrl)}
                          </motion.div>
                        </AnimatePresence>

                        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/20 to-transparent flex items-end justify-between p-2.5 z-10 pointer-events-none">
                          <div className="flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
                            <div>
                              <div className="text-[10px] font-black text-white leading-none">Aperçu du Thème</div>
                              <div className="text-[8px] text-slate-300 font-mono mt-0.5">Transition Fondu Enchaîné Actif</div>
                            </div>
                          </div>
                          <span className="text-[8.5px] font-mono font-bold text-cyan-300 bg-cyan-950/90 px-2 py-0.5 rounded-full border border-cyan-500/50 shadow-sm">
                            Fondu 0.65s
                          </span>
                        </div>
                      </div>

                      <div className="space-y-2">
                        {[
                          {
                            id: "neon" as const,
                            name: "Néon Éthéré",
                            tag: "Cyber-Néon",
                            desc: "Lueurs cyan/fuchsia pulsantes, auras lumineuses & laser scanning",
                            bgGradient: "from-cyan-950/80 via-purple-950/80 to-slate-950/90",
                            accentColor: "border-cyan-400 text-cyan-300 shadow-[0_0_12px_rgba(0,255,231,0.3)]",
                          },
                          {
                            id: "minimal" as const,
                            name: "Minimaliste",
                            tag: "Épuré Mat",
                            desc: "Matte sombre haute précision, grille géométrique & teintes chic",
                            bgGradient: "from-slate-950 via-[#0a0f1d] to-slate-900/90",
                            accentColor: "border-slate-400 text-slate-200 shadow-[0_0_12px_rgba(255,255,255,0.1)]",
                          },
                          {
                            id: "realistic" as const,
                            name: "Réaliste",
                            tag: "HD City 4K",
                            desc: "Lumières de ville nocturne, effet verre PBR & bokeh réaliste",
                            bgGradient: "from-amber-950/80 via-slate-950 to-indigo-950/80",
                            accentColor: "border-amber-400 text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.3)]",
                          },
                          {
                            id: "aurora" as const,
                            name: "Aurore Nordique",
                            tag: "Boréale",
                            desc: "Vagues émeraude/violette & étoiles scintillantes du nord",
                            bgGradient: "from-emerald-950/90 via-teal-950/80 to-indigo-950/80",
                            accentColor: "border-emerald-400 text-emerald-300 shadow-[0_0_12px_rgba(52,211,153,0.3)]",
                          },
                          {
                            id: "cyberpunk" as const,
                            name: "Cyberpunk Matrix",
                            tag: "Intellectus",
                            desc: "Réseau neural vert TroxT Intellectus & matrice de données",
                            bgGradient: "from-emerald-950/90 via-[#02130c] to-black",
                            accentColor: "border-emerald-500 text-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.4)]",
                          },
                        ].map((wp) => {
                          const isSelected = wallpaper === wp.id;
                          return (
                            <motion.button
                              key={wp.id}
                              whileHover={{ scale: 1.01 }}
                              whileTap={{ scale: 0.98 }}
                              onClick={() => changeWallpaper(wp.id)}
                              className={`w-full p-2.5 rounded-2xl border transition-all text-left cursor-pointer relative overflow-hidden bg-gradient-to-r ${wp.bgGradient} ${
                                isSelected
                                  ? `${wp.accentColor} border-2 scale-[1.02]`
                                  : "border-slate-800/80 hover:border-slate-600 opacity-80 hover:opacity-100"
                              }`}
                            >
                              <div className="flex items-start justify-between relative z-10">
                                <div className="flex items-center gap-2">
                                  <div className="w-7 h-7 rounded-xl bg-slate-950/80 border border-white/20 flex items-center justify-center shrink-0">
                                    {isSelected ? (
                                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                                    ) : (
                                      <Layers className="w-3.5 h-3.5 text-slate-400" />
                                    )}
                                  </div>
                                  <div>
                                    <div className="text-xs font-black text-white flex items-center gap-1.5">
                                      {wp.name}
                                      <span className="text-[8px] font-extrabold px-1.5 py-0.2 rounded bg-white/10 text-slate-300">
                                        {wp.tag}
                                      </span>
                                    </div>
                                    <div className="text-[9px] text-slate-300/80 mt-0.5 leading-snug">
                                      {wp.desc}
                                    </div>
                                  </div>
                                </div>

                                {isSelected && (
                                  <span className="text-[8px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-500 text-slate-950 shadow-[0_0_8px_rgba(52,211,153,0.8)] shrink-0 flex items-center gap-1">
                                    <Sparkles className="w-2.5 h-2.5" /> Actif
                                  </span>
                                )}
                              </div>
                            </motion.button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB: RINGTONES */}
                {settingsTab === "ringtones" && (
                  <div className="p-3 bg-gradient-to-br from-slate-950 via-cyan-950/20 to-slate-950 border border-cyan-500/30 rounded-2xl space-y-2.5 shadow-[0_0_15px_rgba(0,255,231,0.08)]">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase text-cyan-400 tracking-wider flex items-center gap-1.5">
                        <Bell className="w-3.5 h-3.5 text-cyan-400" /> Sonnerie de Téléphone
                      </span>
                      <span className="text-[8.5px] text-cyan-300 font-mono font-bold bg-cyan-950/80 px-2 py-0.5 rounded-full border border-cyan-500/30 shrink-0">
                        Web Audio API
                      </span>
                    </div>

                    <p className="text-[9px] text-slate-300/90 leading-snug">
                      Choisissez la sonnerie d'appel entrant et prévisualisez la fréquence audio en direct.
                    </p>

                    <div className="space-y-1.5">
                      {ringtoneOptions.map((rt) => {
                        const isSelected = selectedRingtone === rt.id;
                        const isPreviewing = previewingRingtone === rt.id;

                        return (
                          <div
                            key={rt.id}
                            className={`p-2.5 rounded-xl border transition-all ${
                              isSelected
                                ? "bg-cyan-950/40 border-cyan-400/80 shadow-[0_0_10px_rgba(0,255,231,0.15)]"
                                : "bg-slate-900/60 border-slate-800 hover:border-slate-700"
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1">
                                <div className="flex items-center gap-1.5">
                                  <Music className={`w-3.5 h-3.5 ${isSelected ? "text-cyan-400" : "text-slate-400"}`} />
                                  <span className="text-[11px] font-bold text-white">{rt.name}</span>
                                  <span className={`text-[8px] font-extrabold px-1.5 py-0.2 rounded border ${rt.badgeColor}`}>
                                    {rt.badge}
                                  </span>
                                </div>
                                <p className="text-[9px] text-slate-400 mt-0.5 leading-tight">
                                  {rt.description}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-800/80">
                              {/* Select button */}
                              {isSelected ? (
                                <div className="flex items-center gap-1 text-emerald-400 text-[9px] font-black uppercase">
                                  <Check className="w-3 h-3 text-emerald-400" />
                                  <span>Actif</span>
                                </div>
                              ) : (
                                <button
                                  onClick={() => changeRingtone(rt.id)}
                                  className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-[8.5px] font-bold rounded-lg transition border border-slate-700 cursor-pointer"
                                >
                                  Choisir cette sonnerie
                                </button>
                              )}

                              {/* Preview button */}
                              <button
                                onClick={() => {
                                  if (isPreviewing) {
                                    stopRingtonePreview();
                                  } else {
                                    playRingtoneSound(rt.id);
                                  }
                                }}
                                className={`px-2.5 py-1 text-[8.5px] font-black rounded-lg flex items-center gap-1 transition cursor-pointer ${
                                  isPreviewing
                                    ? "bg-cyan-400 text-slate-950 animate-pulse shadow-[0_0_10px_rgba(0,255,231,0.8)]"
                                    : "bg-cyan-950/80 hover:bg-cyan-900/90 text-cyan-300 border border-cyan-500/40"
                                }`}
                              >
                                {isPreviewing ? (
                                  <>
                                    <Square className="w-2.5 h-2.5 fill-slate-950" />
                                    <span>Arrêter</span>
                                  </>
                                ) : (
                                  <>
                                    <Play className="w-2.5 h-2.5 fill-cyan-300" />
                                    <span>Prévisualiser</span>
                                  </>
                                )}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Trigger test call */}
                    <button
                      onClick={() => {
                        handleTriggerIncomingCall("SPVM Urgence", "911-SPVM", "Appel de test RP", "bg-cyan-600");
                        playRingtoneSound(selectedRingtone);
                      }}
                      className="w-full py-2 bg-gradient-to-r from-cyan-600 via-indigo-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500 rounded-xl text-white font-black text-[9px] uppercase tracking-wider shadow-[0_0_12px_rgba(0,255,231,0.25)] flex items-center justify-center gap-1.5 cursor-pointer mt-2"
                    >
                      <PhoneCall className="w-3.5 h-3.5" />
                      <span>Tester un appel entrant avec cette sonnerie</span>
                    </button>

                    {/* Keyboard Typing & Blinking Cursor Settings */}
                    <div className="p-3 bg-slate-900/90 border border-cyan-500/30 rounded-xl space-y-2 mt-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <Keyboard className="w-4 h-4 text-cyan-400 animate-pulse" />
                          <span className="text-[10px] font-black uppercase text-white tracking-wider">
                            Bruitage Clavier & Curseurs RP
                          </span>
                        </div>
                        <button
                          onClick={toggleTypingSound}
                          className={`px-2.5 py-1 rounded-lg text-[8.5px] font-extrabold uppercase transition cursor-pointer flex items-center gap-1 ${
                            isTypingSoundEnabled
                              ? "bg-emerald-600 hover:bg-emerald-500 text-white shadow-[0_0_10px_rgba(52,211,153,0.4)]"
                              : "bg-slate-800 hover:bg-slate-700 text-slate-400 border border-slate-700"
                          }`}
                        >
                          {isTypingSoundEnabled ? "Activé 🔊" : "Muet 🔇"}
                        </button>
                      </div>

                      <p className="text-[9px] text-slate-300/90 leading-snug">
                        Animation de clignotement de curseur réaliste (0.85s) avec bruitage de frappe mécanique Web Audio pour SMS et Bloc-notes.
                      </p>

                      {/* Interactive Live Keyboard & Cursor Tester */}
                      <div className="pt-1.5">
                        <label className="text-[8.5px] font-mono text-cyan-300 font-bold block mb-1">
                          ⚡ Testeur de Frappe Clavier & Curseur Clignotant :
                        </label>
                        <div className="relative flex items-center">
                          <input
                            type="text"
                            placeholder="Saisissez du texte pour tester le son et le curseur..."
                            onKeyDown={handleInputKeyDown}
                            className="w-full bg-slate-950 border border-cyan-500/40 rounded-xl px-2.5 py-1.5 text-[10px] text-white focus:outline-none focus:border-cyan-400 animate-realistic-caret font-mono pr-6 shadow-inner"
                          />
                          <div className="absolute right-2.5 flex items-center pointer-events-none select-none">
                            <span className="w-1.5 h-3 bg-cyan-400 rounded-xs animate-cursor-block" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB: SECURITY */}
                {settingsTab === "security" && (
                  <div className="space-y-3.5">
                    {/* Airplane Mode (Mode Avion) Option */}
                    <div className={`p-3 border rounded-2xl space-y-2 transition-all ${
                      isAirplaneMode
                        ? "bg-amber-950/40 border-amber-500/60 shadow-[0_0_15px_rgba(251,191,36,0.25)]"
                        : "bg-slate-900/80 border-slate-800"
                    }`}>
                      <div className="font-black uppercase flex items-center justify-between text-[10px]">
                        <div className="flex items-center gap-1.5 text-amber-300">
                          <Plane className={`w-4 h-4 ${isAirplaneMode ? "text-amber-400 animate-bounce" : "text-amber-500/70"}`} />
                          <span>Mode Avion (Cyber-Fly)</span>
                        </div>
                        <span className={`text-[8px] font-extrabold px-2 py-0.5 rounded border uppercase ${
                          isAirplaneMode
                            ? "bg-amber-500/30 text-amber-300 border-amber-400/50 shadow-[0_0_8px_rgba(251,191,36,0.4)]"
                            : "bg-slate-800 text-slate-400 border-slate-700"
                        }`}>
                          {isAirplaneMode ? "RÉSEAU OFF" : "INACTIF"}
                        </span>
                      </div>
                      <p className="text-[9px] text-slate-300 leading-snug">
                        Désactive temporairement les connexions réseau RP, filtre les appels entrants et coupe toutes les notifications.
                      </p>
                      <button
                        onClick={toggleAirplaneMode}
                        className={`w-full py-2 rounded-xl text-white font-black text-[9.5px] uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer transition ${
                          isAirplaneMode
                            ? "bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 shadow-[0_0_12px_rgba(251,191,36,0.4)]"
                            : "bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700"
                        }`}
                      >
                        <Plane className="w-3.5 h-3.5" />
                        <span>{isAirplaneMode ? "Désactiver le Mode Avion" : "Activer le Mode Avion"}</span>
                      </button>
                    </div>

                    {/* Do Not Disturb (Ne Pas Déranger) Option */}
                    <div className={`p-3 border rounded-2xl space-y-2 transition-all ${
                      isDoNotDisturb
                        ? "bg-purple-950/40 border-purple-500/60 shadow-[0_0_15px_rgba(168,85,247,0.25)]"
                        : "bg-slate-900/80 border-slate-800"
                    }`}>
                      <div className="font-black uppercase flex items-center justify-between text-[10px]">
                        <div className="flex items-center gap-1.5 text-purple-300">
                          <BellOff className={`w-4 h-4 ${isDoNotDisturb ? "text-purple-400 animate-pulse" : "text-purple-500/70"}`} />
                          <span>Ne Pas Déranger (DND)</span>
                        </div>
                        <span className={`text-[8px] font-extrabold px-2 py-0.5 rounded border uppercase ${
                          isDoNotDisturb
                            ? "bg-purple-500/30 text-purple-300 border-purple-400/50 shadow-[0_0_8px_rgba(168,85,247,0.4)]"
                            : "bg-slate-800 text-slate-400 border-slate-700"
                        }`}>
                          {isDoNotDisturb ? "SILENCIEUX" : "INACTIF"}
                        </span>
                      </div>
                      <p className="text-[9px] text-slate-300 leading-snug">
                        Conserve la connexion réseau mais bloque la sonnerie des appels entrants et masque les toasts de notification.
                      </p>
                      <button
                        onClick={toggleDoNotDisturb}
                        className={`w-full py-2 rounded-xl text-white font-black text-[9.5px] uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer transition ${
                          isDoNotDisturb
                            ? "bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 shadow-[0_0_12px_rgba(168,85,247,0.4)]"
                            : "bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700"
                        }`}
                      >
                        <BellOff className="w-3.5 h-3.5" />
                        <span>{isDoNotDisturb ? "Désactiver Ne Pas Déranger" : "Activer Ne Pas Déranger"}</span>
                      </button>
                    </div>

                    {/* Biometric Security Section */}
                    <div className="p-3 bg-purple-950/20 border border-purple-500/30 rounded-2xl space-y-2">
                      <div className="font-black uppercase text-purple-300 flex items-center justify-between text-[10px]">
                        <div className="flex items-center gap-1.5">
                          <Fingerprint className="w-4 h-4 text-purple-400" />
                          <span>Sécurité Biométrique L5</span>
                        </div>
                        <span className="text-[8px] font-extrabold px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-400/30">
                          Actif
                        </span>
                      </div>
                      <p className="text-[9px] text-slate-300 leading-snug">
                        Verrouillage par empreinte digitale & neurale au démarrage du téléphone RP.
                      </p>
                      <button
                        onClick={() => {
                          setIsLocked(true);
                          setIsScanning(false);
                          setScanProgress(0);
                          setScanPhase("idle");
                        }}
                        className="w-full py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 rounded-xl text-white font-black text-[9.5px] uppercase tracking-wider shadow-[0_0_12px_rgba(168,85,247,0.4)] flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Lock className="w-3.5 h-3.5" />
                        <span>Tester le verrouillage biométrique</span>
                      </button>
                    </div>

                    {/* System Info */}
                    <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-2xl space-y-1.5 text-[9.5px]">
                      <div className="font-black uppercase text-slate-400 flex items-center gap-1.5 text-[10px]">
                        <Sliders className="w-3.5 h-3.5 text-slate-400" /> Spécifications OS
                      </div>
                      <div className="text-slate-300 font-mono flex justify-between">
                        <span className="text-slate-400">Plateforme :</span>
                        <span className="text-cyan-300">Etherworld OS v4.2</span>
                      </div>
                      <div className="text-slate-300 font-mono flex justify-between">
                        <span className="text-slate-400">Core Neural :</span>
                        <span className="text-purple-300">TroxT Intellectus</span>
                      </div>
                      <div className="text-slate-300 font-mono flex justify-between">
                        <span className="text-slate-400">Appareil :</span>
                        <span className="text-emerald-300">Smart Cyber Tablet</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* APP: GALERIE PHOTOS RP (IA & CAPTURE) */}
          {activeApp === "gallery" && (
            <div className="flex flex-col h-full overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between mb-2 border-b border-slate-800 pb-2 shrink-0">
                <div className="flex items-center gap-2">
                  <button onClick={() => setActiveApp("home")} className="text-slate-400 hover:text-white cursor-pointer">
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                  <h3 className="text-xs font-bold uppercase text-pink-400 flex items-center gap-1.5">
                    <Camera className="w-4 h-4 text-pink-400" /> Galerie RP
                  </h3>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[9px] font-black text-pink-300 bg-pink-950/80 border border-pink-500/30 px-2 py-0.5 rounded-full">
                    {galleryPhotos.length} {galleryPhotos.length > 1 ? "Clichés" : "Cliché"}
                  </span>
                  <button
                    onClick={() => setIsCapturingIA(true)}
                    className="px-2 py-0.5 bg-gradient-to-r from-pink-600 to-fuchsia-600 hover:brightness-110 text-white font-black text-[9px] rounded-full shadow-[0_0_10px_rgba(236,72,153,0.4)] transition cursor-pointer flex items-center gap-1"
                  >
                    <Sparkles className="w-3 h-3 text-pink-200" />
                    <span>Cliché IA</span>
                  </button>
                </div>
              </div>

              {/* Sub-Category Filters */}
              <div className="flex gap-1 overflow-x-auto pb-2 mb-1 scrollbar-none shrink-0 text-[9.5px]">
                {[
                  { id: "all", label: "Tout" },
                  { id: "vehicules", label: "🏎️ Véhicules" },
                  { id: "lieux", label: "🏛️ Lieux RP" },
                  { id: "nature", label: "🌲 Nature" },
                  { id: "ia", label: "✨ IA" },
                ].map((f) => (
                  <button
                    key={f.id}
                    onClick={() => {
                      playBiometricSound("scan");
                      setGalleryFilter(f.id as any);
                    }}
                    className={`px-2.5 py-1 rounded-xl font-bold uppercase transition shrink-0 cursor-pointer flex items-center gap-1 border ${
                      galleryFilter === f.id
                        ? "bg-pink-950/90 border-pink-400 text-pink-300 shadow-[0_0_10px_rgba(236,72,153,0.3)]"
                        : "bg-slate-900/80 border-slate-800 text-slate-400 hover:text-white"
                    }`}
                  >
                    <span>{f.label}</span>
                  </button>
                ))}
              </div>

              {/* Photo Grid */}
              <div className="flex-1 overflow-y-auto pr-0.5 scrollbar-thin space-y-2">
                {galleryPhotos.filter((p) => galleryFilter === "all" || p.category === galleryFilter).length === 0 ? (
                  <div className="p-8 text-center text-slate-500 text-xs space-y-2">
                    <ImageIcon className="w-8 h-8 mx-auto text-slate-600 animate-pulse" />
                    <p>Aucune photo dans cette catégorie.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {galleryPhotos
                      .filter((p) => galleryFilter === "all" || p.category === galleryFilter)
                      .map((photo) => (
                        <motion.div
                          key={photo.id}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => {
                            playBiometricSound("scan");
                            setSelectedGalleryPhoto(photo);
                          }}
                          className="relative rounded-2xl overflow-hidden border border-slate-800 hover:border-pink-400/80 bg-slate-950 shadow-md group cursor-pointer aspect-square"
                        >
                          <img
                            src={photo.url}
                            alt={photo.title}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-transparent to-transparent opacity-80 group-hover:opacity-100 transition" />
                          
                          <div className="absolute bottom-1.5 left-2 right-2 space-y-0.5">
                            <span className="text-[7.5px] font-black uppercase tracking-wider text-pink-300 bg-pink-950/80 border border-pink-500/40 px-1.5 py-0.2 rounded inline-block">
                              {photo.location}
                            </span>
                            <div className="text-[9px] font-extrabold text-white truncate drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]">
                              {photo.title}
                            </div>
                          </div>

                          <div className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition">
                            <div className="p-1 rounded-full bg-slate-950/80 text-pink-400 border border-pink-500/30">
                              <Eye className="w-3 h-3" />
                            </div>
                          </div>
                        </motion.div>
                      ))}
                  </div>
                )}
              </div>

              {/* STUDIO CAPTURE IA DRAWER / MODAL */}
              <AnimatePresence>
                {isCapturingIA && (
                  <motion.div
                    initial={{ opacity: 0, y: 50 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 50 }}
                    className="absolute inset-0 z-50 bg-slate-950/98 backdrop-blur-md p-3.5 flex flex-col justify-between overflow-y-auto"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                        <div className="flex items-center gap-1.5 text-pink-400 font-black text-xs uppercase">
                          <Camera className="w-4 h-4 text-pink-400 animate-bounce" />
                          <span>Studio Capture RP (IA)</span>
                        </div>
                        <button
                          onClick={() => setIsCapturingIA(false)}
                          className="text-slate-400 hover:text-white p-1 cursor-pointer"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="space-y-1.5 text-[10px]">
                        <label className="font-extrabold text-slate-300 uppercase block">Presets Clichés RP :</label>
                        <div className="grid grid-cols-1 gap-1.5 max-h-36 overflow-y-auto pr-1 scrollbar-thin">
                          {[
                            { label: "🏎️ Supercar de Luxe sur la 138", category: "vehicules" as const, loc: "Route 138, Neuville" },
                            { label: "🍟 Poutine Fumante chez Gaston", category: "lieux" as const, loc: "Portneuf Centre" },
                            { label: "⚜️ Manoir Villa Céleste au Crépuscule", category: "lieux" as const, loc: "Domaine Portneuf" },
                            { label: "🚓 Patrouille Sûreté du Québec", category: "ia" as const, loc: "Pont de Neuville" },
                            { label: "🌲 Forêt enneigée Vallée de Portneuf", category: "nature" as const, loc: "Saint-Marc-des-Carrières" },
                          ].map((p, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => {
                                setCapturePromptInput(p.label);
                                setCaptureCategory(p.category);
                                setCaptureLocation(p.loc);
                              }}
                              className="p-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-pink-500/60 text-slate-200 text-left font-bold transition cursor-pointer hover:bg-slate-800/80 text-[9.5px]"
                            >
                              {p.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Custom Prompt Input */}
                      <div className="space-y-1 text-[10px]">
                        <label className="font-extrabold text-slate-300 uppercase block">Ou Prompt Personnalisé :</label>
                        <textarea
                          rows={2}
                          value={capturePromptInput}
                          onChange={(e) => setCapturePromptInput(e.target.value)}
                          placeholder="Décrivez votre cliché RP (ex: Coucher de soleil sur le port de Portneuf...)"
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2 text-white placeholder-slate-500 text-[10px] focus:outline-none focus:border-pink-500"
                        />
                      </div>

                      {/* Location & Category Selectors */}
                      <div className="grid grid-cols-2 gap-2 text-[10px]">
                        <div>
                          <label className="font-bold text-slate-400 block mb-0.5">Lieu RP :</label>
                          <select
                            value={captureLocation}
                            onChange={(e) => setCaptureLocation(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-800 rounded-xl p-1.5 text-white text-[9.5px] focus:outline-none"
                          >
                            <option value="Route 138, Neuville">Route 138, Neuville</option>
                            <option value="Portneuf Centre">Portneuf Centre</option>
                            <option value="Domaine Portneuf">Domaine Portneuf</option>
                            <option value="Saint-Marc-des-Carrières">Saint-Marc-des-Carrières</option>
                            <option value="Aéroport Régional">Aéroport Régional</option>
                          </select>
                        </div>
                        <div>
                          <label className="font-bold text-slate-400 block mb-0.5">Catégorie :</label>
                          <select
                            value={captureCategory}
                            onChange={(e) => setCaptureCategory(e.target.value as any)}
                            className="w-full bg-slate-900 border border-slate-800 rounded-xl p-1.5 text-white text-[9.5px] focus:outline-none"
                          >
                            <option value="lieux">🏛️ Lieux RP</option>
                            <option value="vehicules">🏎️ Véhicules</option>
                            <option value="nature">🌲 Nature</option>
                            <option value="ia">✨ Générées IA</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 pt-2 border-t border-slate-800 flex gap-2">
                      <button
                        type="button"
                        onClick={() => setIsCapturingIA(false)}
                        className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-black rounded-xl text-[10px] cursor-pointer uppercase"
                      >
                        Annuler
                      </button>
                      <button
                        type="button"
                        disabled={isGeneratingPhoto}
                        onClick={() => handleGenerateIAPhoto()}
                        className="flex-1 py-2 bg-gradient-to-r from-pink-600 to-fuchsia-600 hover:brightness-110 text-white font-black rounded-xl text-[10px] cursor-pointer uppercase shadow-[0_0_12px_rgba(236,72,153,0.4)] flex items-center justify-center gap-1.5"
                      >
                        {isGeneratingPhoto ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            <span>Capture...</span>
                          </>
                        ) : (
                          <>
                            <Camera className="w-3.5 h-3.5" />
                            <span>Générer Cliché</span>
                          </>
                        )}
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* FULLSCREEN PHOTO VIEWER MODAL */}
              <AnimatePresence>
                {selectedGalleryPhoto && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="absolute inset-0 z-50 bg-slate-950/98 p-3 flex flex-col justify-between overflow-y-auto"
                  >
                    {/* Header */}
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                      <div>
                        <div className="text-[11px] font-black text-white truncate max-w-[200px]">
                          {selectedGalleryPhoto.title}
                        </div>
                        <div className="text-[8.5px] text-pink-300 font-bold flex items-center gap-1">
                          <MapPin className="w-2.5 h-2.5" /> {selectedGalleryPhoto.location} • {selectedGalleryPhoto.date}
                        </div>
                      </div>
                      <button
                        onClick={() => setSelectedGalleryPhoto(null)}
                        className="p-1 text-slate-400 hover:text-white cursor-pointer rounded-full bg-slate-900 border border-slate-800"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Image View */}
                    <div className="my-2 flex-1 relative rounded-2xl overflow-hidden border border-pink-500/30 bg-slate-900 flex items-center justify-center">
                      <img
                        src={selectedGalleryPhoto.url}
                        alt={selectedGalleryPhoto.title}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                    </div>

                    {/* Prompt info if available */}
                    {selectedGalleryPhoto.promptUsed && (
                      <div className="p-2 bg-slate-900/90 border border-slate-800 rounded-xl mb-2 text-[9px] text-slate-300">
                        <span className="font-extrabold text-pink-400 block mb-0.5">Prompt RP :</span>
                        "{selectedGalleryPhoto.promptUsed}"
                      </div>
                    )}

                    {/* Actions */}
                    <div className="grid grid-cols-3 gap-1.5 text-[9px] font-black uppercase">
                      <button
                        onClick={() => handleSetCustomWallpaper(selectedGalleryPhoto.url)}
                        className="py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:brightness-110 text-white rounded-xl flex flex-col items-center justify-center gap-0.5 cursor-pointer shadow-md"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Fond Écran</span>
                      </button>

                      <button
                        onClick={() => handleSharePhotoToMessages(selectedGalleryPhoto)}
                        className="py-2 bg-slate-800 hover:bg-slate-700 text-cyan-300 rounded-xl flex flex-col items-center justify-center gap-0.5 cursor-pointer border border-slate-700"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                        <span>Partager</span>
                      </button>

                      <button
                        onClick={() => handleDeletePhoto(selectedGalleryPhoto.id)}
                        className="py-2 bg-rose-950/80 hover:bg-rose-900 border border-rose-500/40 text-rose-300 rounded-xl flex flex-col items-center justify-center gap-0.5 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Supprimer</span>
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

              </motion.div>
            </AnimatePresence>
          </div>

        {/* Home Bar Indicator with Cyber-Neon Glow */}
        <div className="bg-slate-950/90 border-t border-purple-500/30 py-2.5 flex justify-center shrink-0">
          <button
            onClick={() => setActiveApp("home")}
            className="w-28 h-1.5 bg-gradient-to-r from-cyan-400 via-indigo-400 to-purple-500 rounded-full hover:shadow-[0_0_12px_rgba(0,255,231,0.9)] transition cursor-pointer"
            title="Accueil"
          />
        </div>

      </div>
    </div>
  </motion.div>
);
};

