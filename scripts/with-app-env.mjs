import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';

const root = process.cwd();
const envPath = path.join(root, '.env');

// Chargement natif du fichier .env sans dépendance externe (Zero-Dependency)
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
      const idx = trimmed.indexOf('=');
      const key = trimmed.slice(0, idx).trim();
      let val = trimmed.slice(idx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (!process.env[key]) {
        process.env[key] = val;
      }
    }
  }
}

// Récupération et exécution de la commande transmise (ex: vite dev --host 0.0.0.0 --port 8080)
const args = process.argv.slice(2);
if (args.length === 0) {
  args.push('npx', 'vite', 'dev', '--host', '0.0.0.0', '--port', '8080');
}

const isWin = process.platform === 'win32';
const cmd = args[0];
const cmdArgs = args.slice(1);

const child = spawn(isWin ? `${cmd}.cmd` : cmd, cmdArgs, {
  stdio: 'inherit',
  shell: true,
  env: process.env
});

child.on('error', () => {
  // Fallback direct npx si la commande locale n'est pas trouvée
  spawn('npx', args, { stdio: 'inherit', shell: true, env: process.env });
});

child.on('exit', (code) => {
  process.exit(code ?? 0);
});
