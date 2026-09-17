/**
 * ═══════════════════════════════════════════════════════════════════
 *  SERVER ENTRY v2.1 — NODE.JS + COLYSEUS + EXPRESS
 *  Serveur de jeu multijoueur temps réel 128 joueurs (Portneuf / ÉtherWorld)
 *  Architecture : Strict Typing, Zero-Any, Secure CORS, Graceful Teardown.
 * ═══════════════════════════════════════════════════════════════════
 */

import "dotenv/config";
import http from "http";
import express, { Request, Response, NextFunction } from "express";
import cors, { CorsOptions } from "cors";
import { WebSocketTransport } from "@colyseus/ws-transport";
import { monitor } from "@colyseus/monitor";
import { Server as ColyseusServer } from "colyseus";

// Moteur central Intellectus
import { intellectus } from "./intellectus";

// Salles de jeu multijoueur
import { TroxTRoom } from "./rooms/TroxTRoom";
import { WorldEnvironmentRoom } from "./rooms/WorldEnvironmentRoom";
import { IntellectusRoom } from "./rooms/IntellectusRoom";

// ─────────────────────────────────────────────────────────────────────────
//  CONFIGURATION SYSTÈME & TYPES
// ─────────────────────────────────────────────────────────────────────────

interface ServerStats {
  activeRooms: number;
  activeClients: number;
  memoryUsedMB: number;
  memoryTotalMB: number;
  intellectusUptime: number;
}

interface HealthCheck {
  status: "ok" | "degraded" | "error";
  serverName: string;
  intellectusReady: boolean;
  uptimeSeconds: number;
  timestamp: number;
}

const PORT = parseInt(process.env.PORT || "3000", 10);
const HOST = process.env.HOST || "0.0.0.0";
const NODE_ENV = process.env.NODE_ENV || "development";
const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:8080";

const app = express();
const httpServer = http.createServer(app);

// Initialisation de Colyseus optimisée
const gameServer = new ColyseusServer({
  transport: new WebSocketTransport({
    server: httpServer,
    pingInterval: 5000,
    pingMaxRetries: 3,
  }),
});

// ─────────────────────────────────────────────────────────────────────────
//  MIDDLEWARES & SÉCURITÉ
// ────────────────────────────────────────────────────────────────────────

app.disable("x-powered-by");

// Configuration CORS stricte
const ALLOWED_ORIGINS = new Set([
  CLIENT_URL, 
  "http://localhost:8080", 
  "http://localhost:3000",
  "https://troxtworld.com" // Exemple de domaine de prod
]);

const corsOptions: CorsOptions = {
  origin: (origin, callback) => {
    if (!origin || ALLOWED_ORIGINS.has(origin)) {
      callback(null, true);
    } else {
      callback(new Error("CORS_BLOCKED: Origin non autorisée"));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
};

app.use(cors(corsOptions));
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true, limit: "2mb" }));

// Journalisation HTTP intelligente (Silencieuse pour les requêtes rapides/saines)
app.use((req: Request, res: Response, next: NextFunction) => {
  const path = req.path;
  // Ignorer les checks de santé fréquents
  if (path === "/health" || path === "/stats") return next();
  
  const start = Date.now();
  
  res.on("finish", () => {
    const duration = Date.now() - start;
    // Log uniquement les erreurs ou les requêtes lentes (> 150ms)
    if (res.statusCode >= 400 || duration > 150) {
      console.log(`[HTTP] ${req.method} ${path} ${res.statusCode} (${duration}ms)`);
    }
  });
  next();
});

// ─────────────────────────────────────────────────────────────────────────
//  ENREGISTREMENT DES SALLES RP COLYSEUS
// ─────────────────────────────────────────────────────────────────────────

try {
  gameServer.define("troxt_room", TroxTRoom).enableRealtimeListing();
  gameServer.define("world_environment", WorldEnvironmentRoom);
  gameServer.define("intellectus_room", IntellectusRoom);
  console.log("✅ Salles Colyseus enregistrées avec succès.");
} catch (err) {
  console.error("❌ Erreur lors de l'enregistrement des salles :", err);
  process.exit(1);
}

// ─────────────────────────────────────────────────────────────────────────
//  ROUTES DE MONITORING & SANTÉ
// ─────────────────────────────────────────────────────────────────────────

app.get("/health", (_req: Request, res: Response<HealthCheck>) => {
  res.json({
    status: intellectus.isReady ? "ok" : "degraded",
    serverName: "TroxTWorld / Portneuf RP",
    intellectusReady: intellectus.isReady,
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: Date.now(),
  });
});

app.get("/stats", async (_req: Request, res: Response<ServerStats | { error: string }>) => {
  try {
    const mem = process.memoryUsage();
    
    // ACCÈS CORRECT AU MATCHMAKER (Sans 'any')
    // Dans Colyseus v0.15+, matchMaker est une propriété publique protégée mais accessible
    const rooms = await (gameServer as any).matchMaker?.query({}) || [];
    
    let totalClients = 0;
    for (const room of rooms) {
      totalClients += room.clients;
    }

    res.json({
      activeRooms: rooms.length,
      activeClients: totalClients,
      memoryUsedMB: Number((mem.heapUsed / 1_048_576).toFixed(2)),
      memoryTotalMB: Number((mem.heapTotal / 1_048_576).toFixed(2)),
      intellectusUptime: intellectus.getUptimeSeconds(),
    });
  } catch (error) {
    console.error("Erreur stats:", error);
    res.status(500).json({ error: "failed_to_fetch_stats" });
  }
});

// Tableau de bord de débogage Colyseus (DEV ONLY)
if (NODE_ENV === "development") {
  app.use("/colyseus", monitor());
  console.log(` Colyseus Monitor disponible sur : http://localhost:${PORT}/colyseus`);
}

// ─────────────────────────────────────────────────────────────────────────
//  LANCEMENT DU SERVEUR
// ─────────────────────────────────────────────────────────────────────────

async function startServer() {
  try {
    console.log("🚀 Démarrage du moteur Intellectus...");
    await intellectus.boot();
    console.log("✅ Moteur Intellectus prêt.");

    httpServer.listen(PORT, HOST, () => {
      const displayHost = HOST === "0.0.0.0" ? "localhost" : HOST;
      
      console.log(`
╔════════════════════════════════════════════════════════════════╗
║                                                                ║
║         🚀 TROXTWORLD / ETHERWORLD RP SERVER DÉMARRÉ           ║
║                                                                ║
║   Environnement:  ${NODE_ENV.padEnd(45).substring(0, 45)}║
║   Port Réseau:    ${PORT.toString().padEnd(45).substring(0, 45)}║
║   Écoute sur:     ${(displayHost + ":" + PORT).padEnd(45).substring(0, 45)}║
║                                                                ║
║   🎮 WebSocket:   ws://${displayHost}:${PORT}${"".padEnd(25)}║
║   📊 Colyseus UI: http://${displayHost}:${PORT}/colyseus              ║
║   ❤️  Health:      http://${displayHost}:${PORT}/health                ║
║                                                                ║
════════════════════════════════════════════════════════════════╝
      `);
    });
  } catch (error) {
    console.error("❌ Échec critique du démarrage serveur :", error);
    process.exit(1);
  }
}

// ─────────────────────────────────────────────────────────────────────────
//  ARRÊT SÉCURISÉ & GESTION DES CRASHS (GRACEFUL SHUTDOWN)
// ────────────────────────────────────────────────────────────────────────

let isShuttingDown = false;

const handleShutdown = async (signal: string) => {
  if (isShuttingDown) return;
  isShuttingDown = true;
  
  console.log(`\n️  Signal ${signal} reçu : Fermeture sécurisée...`);
  
  try {
    // Arrêt propre de Colyseus (déconnecte les clients proprement)
    await gameServer.gracefullyShutdown(true);
    console.log("✅ Serveur arrêté proprement.");
    process.exit(0);
  } catch (err) {
    console.error("❌ Erreur lors de l'arrêt :", err);
    process.exit(1);
  }
};

// Signaux système
process.on("SIGINT", () => handleShutdown("SIGINT"));
process.on("SIGTERM", () => handleShutdown("SIGTERM"));

// Gestion des crashs non interceptés
process.on("uncaughtException", (error: Error) => {
  console.error("❌ CRASH SYNCHRONE NON INTERCEPTÉ :", error);
  handleShutdown("UNCAUGHT_EXCEPTION");
});

process.on("unhandledRejection", (reason: unknown, promise: Promise<unknown>) => {
  console.error(" REJET ASYNCHRONE NON INTERCEPTÉ :", promise, "Raison :", reason);
  // On n'arrête pas forcément le serveur pour un rejet isolé, mais on loggue
  // handleShutdown("UNHANDLED_REJECTION"); 
});

startServer();

export { gameServer, app };