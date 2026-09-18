import { spawn } from "child_process";

const isWin = process.platform === "win32";
const npxCmd = isWin ? "npx.cmd" : "npx";

console.log("\x1b[36m%s\x1b[0m", "=====================================================");
console.log("\x1b[36m%s\x1b[0m", " 🚀 TROXTWORLD — DÉMARRAGE SERVEUR + CLIENT EN PARALLÈLE");
console.log("\x1b[36m%s\x1b[0m", "=====================================================");

// 1. Démarrage du Serveur Colyseus + Express + Drizzle
const serverProcess = spawn(npxCmd, ["tsx", "watch", "server/index.ts"], {
  stdio: "inherit",
  shell: true,
  env: { ...process.env, PORT: "3000" }
});

// 2. Démarrage du Client Vite 3D
const clientProcess = spawn("node", ["scripts/with-app-env.mjs", "vite", "dev", "--host", "0.0.0.0", "--port", "8080"], {
  stdio: "inherit",
  shell: true
});

// Gestion de la fermeture propre via Ctrl + C
function killAll() {
  console.log("\n\x1b[33m%s\x1b[0m", "🛑 Arrêt sécurisé de TroxTWorld (Serveur + Client)...");
  try { serverProcess.kill("SIGTERM"); } catch (_) {}
  try { clientProcess.kill("SIGTERM"); } catch (_) {}
  process.exit(0);
}

process.on("SIGINT", killAll);
process.on("SIGTERM", killAll);
serverProcess.on("exit", (code) => { if (code !== 0 && code !== null) console.error(`Serveur fermé avec le code ${code}`); });
clientProcess.on("exit", (code) => { if (code !== 0 && code !== null) console.error(`Client fermé avec le code ${code}`); });
