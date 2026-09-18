/**
 * ═══════════════════════════════════════════════════════════════════
 *  SERVER ENTRY v2.2 — NODE.JS + COLYSEUS + EXPRESS + DRIZZLE
 *  Serveur de jeu de Portneuf / ÉtherWorld (128 joueurs simultanés)
 *  Optimisation : Zero-Any Matchmaker, Clean Middleware Stack, Strict CORS,
 *                 Double-Barrier Graceful Teardown.
 * ═══════════════════════════════════════════════════════════════════
 */

import "dotenv/config";
import http from "http";
import express, { Request, Response, NextFunction } from "express";
import cors, { CorsOptions } from "cors";
import { WebSocketTransport } from "@colyseus/ws-transport";
import { monitor } from "@colyseus/monitor";
import { Server as ColyseusServer, matchMaker } from "colyseus";

// Moteur central Intellectus & Routes API
import { intellectus } from "./intellectus";
import apiRoutes from "./routes/api";

// Salles de jeu multijoueur
import { TroxTRoom } from "./rooms/TroxTRoom";
import { WorldEnvironmentRoom } from "./rooms/WorldEnvironmentRoom";
import { IntellectusRoom } from "./rooms/IntellectusRoom";

// ─────────────────────────────────────────────────────────────────────────
//  CONFIGURATION SYSTÈME & INTERFACES
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

// ─────────────────────────────────────────────────────────────────────────
//  MIDDLEWARES DE SÉCURITÉ & ANALYSE DE REQUÊTES
// ─────────────────────────────────────────────────────────────────────────

app.disable("x-powered-by");

// Sécurité en-têtes minimale et performante
app.use((_req: Request, res: Response, next: NextFunction) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  next();
});

// Configuration dynamique et stricte du CORS
const ALLOWED_ORIGINS = new Set([
  CLIENT_URL,
  "http://localhost:8080",
  "http://localhost:3000",
  "http://127.0.0.1:8080",
  "http://127.0.0.1:3000",
  "https://troxtworld.com"
]);

const corsOptions: CorsOptions = {
  origin: (origin, callback) => {
    if (!origin || ALLOWED_ORIGINS.has(origin)) {
      callback(null, true);
    } else {
      callback(new Error("CORS_BLOCKED: Origin non autorisée par Portneuf Firewall"));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
};

// Application des filtres CORS et parseurs en amont de l'API
app.use(cors(corsOptions));
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true, limit: "2mb" }));

// Montage du routeur de l'API RP
app.use("/api", apiRoutes);

// Journalisation HTTP asynchrone (Silencieuse pour les requêtes rapides et saines)
app.use((req: Request, res: Response, next: NextFunction) => {
  const path = req.path;
  if (path === "/health" || path === "/stats") return next();

  const start = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - start;
    // Log uniquement les requêtes lentes (> 150ms) ou les codes d'erreur (>= 400)
    if (res.statusCode >= 400 || duration > 150) {
      console.log(`[HTTP] ${req.method} ${path} ${res.statusCode} (${duration}ms)`);
    }
  });
  next();
});

// ─────────────────────────────────────────────────────────────────────────
//  INITIALISATION ET CONFIGURATION COLYSEUS
// ─────────────────────────────────────────────────────────────────────────

const gameServer = new ColyseusServer({
  transport: new WebSocketTransport({
    server: httpServer,
    pingInterval: 4000, // Réduit légèrement pour libérer plus vite les sockets inactifs
    pingMaxRetries: 3,
  }),
});

// Enregistrement des salles RP du Comté de Portneuf
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
//  ROUTES REST DE MONITORING (HEALTH & STATS)
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
    
    // Requête typée sans typage "as any" sur gameServer
    const rooms = await matchMaker.query({}) || [];
    
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
    console.error("❌ Impossible de lire les statistiques système :", error);
    res.status(500).json({ error: "failed_to_fetch_stats" });
  }
});

// Monitor d'administration web en développement
if (NODE_ENV === "development") {
  app.use("/colyseus", monitor());
  console.log(` Colyseus Monitor disponible sur : http://localhost:${PORT}/colyseus`);
}

// ─────────────────────────────────────────────────────────────────────────
//  FONCTION DE BOOTSTRAP DU SERVEUR
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
//  ARRÊT SÉCURISÉ MULTI-BARRIÈRE (GRACEFUL SHUTDOWN)
// ─────────────────────────────────────────────────────────────────────────

let isShuttingDown = false;

const handleShutdown = async (signal: string) => {
  if (isShuttingDown) return;
  isShuttingDown = true;
  
  console.log(`\n⚠️  Signal ${signal} reçu : Début de la procédure d'arrêt sécurisé...`);
  
  // Barrière 1 : Arrêter d'accepter de nouvelles requêtes HTTP et connexions WebSocket
  httpServer.close(() => {
    console.log("✔ [Express] Serveur HTTP fermé (plus de nouvelles connexions acceptées).");
  });

  // Barrière 2 : Déconnecter proprement les sessions actives de Colyseus
  try {
    await gameServer.gracefullyShutdown(true);
    console.log("✔ [Colyseus] Salles de jeu et clients fermés avec succès.");
    process.exit(0);
  } catch (err) {
    console.error("❌ Erreur pendant la fermeture forcée :", err);
    process.exit(1);
  }
};

// Intercepteurs de signaux système
process.on("SIGINT", () => handleShutdown("SIGINT"));
process.on("SIGTERM", () => handleShutdown("SIGTERM"));

// Gestionnaires de secours pour éviter les fuites de threads
process.on("uncaughtException", (error: Error) => {
  console.error("❌ CRASH SYNCHRONE DÉTECTÉ :", error);
  handleShutdown("UNCAUGHT_EXCEPTION");
});

process.on("unhandledRejection", (reason: unknown, promise: Promise<unknown>) => {
  console.error("⚠️ PROMESSE REJETÉE ET NON REÇUE :", promise, "Raison :", reason);
});

startServer();

export { gameServer, app };