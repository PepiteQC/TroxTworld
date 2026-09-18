/**
 * TROXTWORLD — SQDC Rôles & Hiérarchie
 */
export type SqdcRole =
  | "directeur"
  | "gerant"
  | "superviseur"
  | "caissier"
  | "conseiller"
  | "securite"
  | "commis"
  | "livreur"
  | "stagiaire"
  | "client"
  | "trespasser";

/** Plus le nombre est élevé, plus le rôle est haut placé. */
export const ROLE_RANK: Record<SqdcRole, number> = {
  directeur:   100,
  gerant:       80,
  superviseur:  60,
  caissier:     40,
  conseiller:   40,
  securite:     40,
  commis:       30,
  livreur:      20,
  stagiaire:    10,
  client:        0,
  trespasser:   -1,
};

export interface RoleMeta {
  label: string;
  color: string;
  description: string;
  /** Rôles vers lesquels ce rôle peut promouvoir directement. */
  canPromoteTo: SqdcRole[];
}

export const ROLE_META: Record<SqdcRole, RoleMeta> = {
  directeur: {
    label: "Directeur",
    color: "#C9A24A",
    description: "Dirige la succursale, accès total.",
    canPromoteTo: ["gerant", "superviseur", "caissier", "conseiller", "securite", "commis", "livreur", "stagiaire"],
  },
  gerant: {
    label: "Gérant",
    color: "#1A5632",
    description: "Gère les opérations quotidiennes.",
    canPromoteTo: ["superviseur", "caissier", "conseiller", "securite", "commis", "livreur", "stagiaire"],
  },
  superviseur: {
    label: "Superviseur",
    color: "#2A7A48",
    description: "Supervise les employés et la caisse.",
    canPromoteTo: ["caissier", "conseiller", "commis", "stagiaire"],
  },
  caissier: {
    label: "Caissier",
    color: "#4DA76A",
    description: "Encaissement et service client.",
    canPromoteTo: [],
  },
  conseiller: {
    label: "Conseiller",
    color: "#5E9EFF",
    description: "Conseils produits et posologie.",
    canPromoteTo: [],
  },
  securite: {
    label: "Agent sécurité",
    color: "#D84A3A",
    description: "Contrôle d'accès et incidents.",
    canPromoteTo: [],
  },
  commis: {
    label: "Commis",
    color: "#8A9098",
    description: "Stock et réapprovisionnement.",
    canPromoteTo: [],
  },
  livreur: {
    label: "Livreur",
    color: "#D8A83A",
    description: "Livraisons à domicile.",
    canPromoteTo: [],
  },
  stagiaire: {
    label: "Stagiaire",
    color: "#A87850",
    description: "En formation, sans caisse.",
    canPromoteTo: [],
  },
  client: {
    label: "Client",
    color: "#94A3B8",
    description: "Aucun accès employé.",
    canPromoteTo: [],
  },
  trespasser: {
    label: "Intrus",
    color: "#EF4444",
    description: "Interdit d'accès.",
    canPromoteTo: [],
  },
};

export function roleAtLeast(role: SqdcRole, min: SqdcRole): boolean {
  return ROLE_RANK[role] >= ROLE_RANK[min];
}

export function isEmployeeRole(role: SqdcRole): boolean {
  return role !== "client" && role !== "trespasser";
}