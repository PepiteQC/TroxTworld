import { spawn } from "node:child_process";
import "dotenv/config";

const [cmd, ...args] = process.argv.slice(2);

if (!cmd) {
  console.error("[with-app-env] Aucune commande spécifiée.");
  process.exit(1);
}

// On active shell: true pour que Windows trouve vite.cmd sans erreur ENOENT
const child = spawn(cmd, args, {
  stdio: "inherit",
  shell: true,
  env: { ...process.env },
});

child.on("exit", (code) => {
  process.exit(code ?? 0);
});

child.on("error", (err) => {
  console.error("[with-app-env] Erreur d'exécution :", err);
  process.exit(1);
});
