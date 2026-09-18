// Phone & Cyber Tablet Applications Type Definitions

export type RingtoneId = "default" | "cyber-bip" | "classique-rp" | "synthwave-pulse" | "quantum-chime";

export interface RingtoneOption {
  id: RingtoneId;
  name: string;
  category: string;
  description: string;
  badge: string;
  badgeColor: string;
}

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
  subGroupName?: string;
}

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

export interface QuickNote {
  id: string;
  text: string;
  date: string;
  completed?: boolean;
  category?: "personal" | "rp_task" | "code" | "crypto";
}

export interface PhoneWallpaper {
  id: string;
  name: string;
  category: string;
  gradient: string;
  textColor: string;
  accentColor: string;
}

export type PhoneActiveApp =
  | "home"
  | "sms"
  | "contacts"
  | "radio"
  | "bank"
  | "settings"
  | "emergency"
  | "gps"
  | "notes"
  | "weather"
  | "camera"
  | "gallery";
