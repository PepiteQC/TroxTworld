const fs = require('fs');
const path = require('path');

const root = 'C:\\TroxTWorld';
const pkgPath = path.join(root, 'package.json');

console.log("🛠️  Nettoyage et sécurisation de package.json...");

if (fs.existsSync(pkgPath)) {
  let pkgContent = fs.readFileSync(pkgPath, 'utf8');
  // Remplacer les URL git+ssh par https (pour éviter l'erreur EALLOWGIT / SSH)
  pkgContent = pkgContent.replace(/git\+ssh:\/\/git@github\.com\//g, 'https://github.com/');
  pkgContent = pkgContent.replace(/git@github\.com:/g, 'https://github.com/');
  fs.writeFileSync(pkgPath, pkgContent, 'utf8');
  console.log("✅ package.json configuré en HTTPS sans clé SSH requise !");
}
