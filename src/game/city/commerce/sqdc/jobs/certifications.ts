/**
 * TROXTWORLD — Formations & certifications SQDC
 */
import { netEmit } from "../../../net";
import { removeCash } from "../../../banking";
import { sendPrivateMessage } from "../../../chat";
import type { SqdcRole } from "./roles";
import { getEmployee, addEmployeeCertification } from "./jobs";

export type Certification =
  | "cannabis_101"
  | "pos_system"
  | "first_aid"
  | "security_guard"
  | "forklift"
  | "delivery_driver"
  | "supervisor_training";

export interface CertificationMeta {
  label: string;
  cost: number;
  duration: number; // heures
  requiredFor: SqdcRole[];
}

export const CERTIFICATION_META: Record<Certification, CertificationMeta> = {
  cannabis_101:        { label: "Cannabis 101",          cost: 200,  duration: 4,  requiredFor: ["conseiller", "caissier"] },
  pos_system:          { label: "Système de caisse",     cost: 150,  duration: 3,  requiredFor: ["caissier"] },
  first_aid:           { label: "Premiers soins",        cost: 300,  duration: 8,  requiredFor: [] },
  security_guard:      { label: "Agent de sécurité",     cost: 800,  duration: 40, requiredFor: ["securite"] },
  forklift:            { label: "Chariot élévateur",     cost: 400,  duration: 6,  requiredFor: ["commis"] },
  delivery_driver:     { label: "Chauffeur livreur",     cost: 250,  duration: 5,  requiredFor: ["livreur"] },
  supervisor_training: { label: "Formation superviseur", cost: 1200, duration: 16, requiredFor: ["superviseur", "gerant"] },
};

export function enrollCertification(
  storeId: string,
  playerId: string,
  cert: Certification,
): { success: boolean; message: string; cost: number } {
  const emp = getEmployee(storeId, playerId);
  if (!emp) return { success: false, message: "Employé introuvable.", cost: 0 };
  if (emp.certifications.has(cert)) {
    return { success: false, message: "Déjà certifié.", cost: 0 };
  }

  const meta = CERTIFICATION_META[cert];
  removeCash(meta.cost, playerId);
  addEmployeeCertification(storeId, playerId, cert);

  netEmit("sqdc:certification_earned", { storeId, playerId, cert });
  sendPrivateMessage(playerId, `🎓 Certification obtenue : ${meta.label} (${meta.cost}$)`);

  return { success: true, message: `Certifié : ${meta.label}.`, cost: meta.cost };
}

export function hasCertification(storeId: string, playerId: string, cert: Certification): boolean {
  const emp = getEmployee(storeId, playerId);
  return emp?.certifications.has(cert) ?? false;
}

export function listRequiredCertifications(role: SqdcRole): Certification[] {
  const list: Certification[] = [];
  (Object.keys(CERTIFICATION_META) as Certification[]).forEach((c) => {
    if (CERTIFICATION_META[c].requiredFor.includes(role)) list.push(c);
  });
  return list;
}

export function listEmployeeCertifications(storeId: string, playerId: string): Certification[] {
  const emp = getEmployee(storeId, playerId);
  return emp ? Array.from(emp.certifications) : [];
}