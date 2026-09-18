/**
 * ═══════════════════════════════════════════════════════════════════
 * 🔑 CRYPTOGRAPHY & SECURITY UTILITIES — TOKEN & PASSWORD HASHING
 * ═══════════════════════════════════════════════════════════════════
 */

import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "troxt-dev-super-secret-key-change-me-in-prod";
const SALT_ROUNDS = 10;

export interface TokenPayload {
  userId: string;
  username: string;
  role?: string;
}

/**
 * Hache de manière asynchrone et sécurisée un mot de passe utilisateur.
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Compare un mot de passe en clair avec son hash bcrypt.
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Génère un jeton JWT valide pour l'authentification de session.
 */
export function generateToken(payload: TokenPayload, expiresIn = "7d"): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn });
}

/**
 * Décode et valide de manière rigoureuse un jeton JWT.
 * Retourne le payload décodé ou null si le token est invalide/expiré.
 */
export function verifyToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as TokenPayload;
  } catch {
    return null;
  }
}
