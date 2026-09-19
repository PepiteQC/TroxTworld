import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { spawn } from "node:child_process";
import "dotenv/config";

export const APP_ENV_REL_PATH = ".grok/app-env.json";

export function projectRoot() {
  return resolve(dirname(fileURLToPath(import.meta.url)), "..");
}

export function parseAppEnv(raw) {
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    return Object.fromEntries(
      Object.entries(parsed).filter(([key, value]) => key.startsWith("VITE_") && typeof value === "string"),
    );
  } catch {
    return {};
  }
}

export function readAppEnv(root = projectRoot()) {
  const path = resolve(root, APP_ENV_REL_PATH);
  return existsSync(path) ? parseAppEnv(readFileSync(path, "utf8")) : {};
}

export function mergeAppEnv(fileEnv, processEnv = process.env) {
  return { ...fileEnv, ...processEnv };
}

export function isMainModule(url) {
  return Boolean(process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === url);
}

if (isMainModule(import.meta.url)) {
  if (!process.argv.slice(2).length) {
    console.error("[with-app-env] Aucune commande spécifiée.");
    process.exit(1);
  }

  const [cmd, ...args] = process.argv.slice(2);
  const child = spawn(cmd, args, {
    stdio: "inherit",
    shell: !cmd.includes("\\") && !cmd.includes("/"),
    env: mergeAppEnv(readAppEnv(), process.env),
  });

  child.on("exit", (code) => process.exit(code ?? 0));
  child.on("error", (err) => {
    console.error("[with-app-env] Erreur d'exécution :", err);
    process.exit(1);
  });
}
