# ============================================================================
# TROXTWORLD FIX v2 — CORRECTION CHIRURGICALE DES 69 ERREURS
# ============================================================================
$P = "C:\TroxTWorld"
Set-Location $P

function Fix {
    param([string]$File, [string]$Old, [string]$New)
    $fp = Join-Path $P $File
    $c = [System.IO.File]::ReadAllText($fp, [System.Text.Encoding]::UTF8)
    if ($c.Contains($Old)) {
        $c = $c.Replace($Old, $New)
        [System.IO.File]::WriteAllText($fp, $c, [System.Text.Encoding]::UTF8)
        Write-Host "  ✅ $File" -ForegroundColor Green
    } else {
        Write-Host "  ⚠️  Motif non trouvé dans $File" -ForegroundColor Yellow
    }
}

# ══════════════════════════════════════════════════════════════════
# 1. CONSEQUENCES.TS — Supprimer doublons + types étendus
# ══════════════════════════════════════════════════════════════════
Write-Host "`n🔧 consequences.ts" -ForegroundColor Cyan

# Supprimer le header dupliqué (le bloc injecté par v1)
Fix "src\game\consequences.ts" `
    "import { paymentSystem } from ""./payment"";`nimport { getCurrentJob, getPlayerContract } from ""./jobs""; `nimport * as THREE from ""three"";`n`n// --- Fallbacks intégrés pour l'UI & l'Audio (Évite les imports circulaires/inexistants) ---`nexport type NotificationType = ""info"" | ""warning"" | ""success"" | ""error"";`nexport const notifier = {`n  send: (title: string, desc: string, type: NotificationType = ""info"") => {`n    console.log(`[Notification System - `${type.toUpperCase()}] `${title}: `${desc}`);`n  }`n};`nexport type SoundType = ""ui"" | ""ambient"" | ""sfx"";`nexport const audioSystem = {`n  play: (soundName: string, volume: number = 0.5) => {`n    console.log(`[Sound Manager] Playing sound '${soundName}' at volume `${volume}`);`n  }`n};`nimport { paymentSystem } from ""./payment"";" `
    "import { paymentSystem } from ""./payment"";"

# Remplacer le type NotificationType trop restrictif
Fix "src\game\consequences.ts" `
    'export type NotificationType = "info" | "warning" | "success" | "error";' `
    'export type NotificationType = "info" | "warning" | "success" | "error" | "danger" | "legal";'

# Remplacer SoundType trop restrictif
Fix "src\game\consequences.ts" `
    'export type SoundType = "ui" | "ambient" | "sfx";' `
    'export type SoundType = string;'

# Remplacer notifier par version complète avec show()
Fix "src\game\consequences.ts" `
    'export const notifier = {
  send: (title: string, desc: string, type: NotificationType = "info") => {
    console.log(`[Notification System - ${type.toUpperCase()}] ${title}: ${desc}`);
  }
};' `
    'export const notifier = {
  send: (title: string, desc: string, type: NotificationType = "info") => {
    console.log(`[Notification - ${type.toUpperCase()}] ${title}: ${desc}`);
  },
  show: (opts: { title?: string; description?: string; type?: string }) => {
    console.log(`[Notification - ${opts.type ?? "info"}] ${opts.title ?? ""}: ${opts.description ?? ""}`);
  }
};'

# Remplacer audioSystem par version complète avec startLoop/stopLoop
Fix "src\game\consequences.ts" `
    'export const audioSystem = {
  play: (soundName: string, volume: number = 0.5) => {
    console.log(`[Sound Manager] Playing sound ''${soundName}'' at volume ${volume}`);
  }
};' `
    'export const audioSystem = {
  play: (soundName: string, volume: number = 0.5) => {
    console.log(`[Audio] play: ${soundName} vol=${volume}`);
  },
  startLoop: (id: string, soundName: string, volume: number = 0.3) => {
    console.log(`[Audio] loop start: ${id} -> ${soundName}`);
  },
  stopLoop: (id: string) => {
    console.log(`[Audio] loop stop: ${id}`);
  }
};'

# ══════════════════════════════════════════════════════════════════
# 2. PAYMENT.TS — Interfaces complètes
# ══════════════════════════════════════════════════════════════════
Write-Host "`n🔧 payment.ts" -ForegroundColor Cyan

$PaymentTypes = @'
// src/game/payment.ts
import * as THREE from "three";

export type PaymentMethodType = "cash" | "debit" | "credit" | "transfer" | "credit_card" | "debit_card" | "online" | "loyalty_points";

export interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
  category: string;
}

export interface Invoice {
  id: string;
  customerId: string;
  customerName: string;
  roomId?: string;
  items: InvoiceItem[];
  subtotal: number;
  taxes: number;
  total: number;
  isPaid: boolean;
  status: "unpaid" | "paid" | "partial" | "void";
  paymentMethod?: PaymentMethodType;
  dueDate: number;
  issueDate: number;
  paidAt?: number;
  paymentDate?: number;
}

export interface Transaction {
  id: string;
  invoiceId: string;
  customerId?: string;
  amount: number;
  method: PaymentMethodType;
  currency?: string;
  timestamp: number;
  status: "success" | "failed" | "pending" | "completed";
}

export interface Receipt {
  id: string;
  transactionId: string;
  invoiceId: string;
  customerId?: string;
  currency?: string;
  totalPaid: number;
  timestamp: number;
}

export interface BankAccount {
  id: string;
  ownerId: string;
  ownerName: string;
  balance: number;
  bank: string;
  accountNumber: string;
  isActive: boolean;
}

export interface Card {
  id: string;
  ownerId: string;
  ownerName: string;
  cardNumber: string;
  expiryDate: string;
  cvv: string;
  cardType: "credit" | "debit";
  balance: number;
  creditLimit?: number;
  bank: string;
  isActive: boolean;
  dailyLimit: number;
  dailySpent: number;
}

export interface IRoom {
  id: string;
  number: string;
  type: string;
  pricePerNight: number;
  isOccupied: boolean;
  getState(): any;
  hydrate(state: any): void;
}
'@

# Lire le fichier et remplacer tout le header jusqu'à la classe PaymentSystem
$payPath = Join-Path $P "src\game\payment.ts"
$payContent = [System.IO.File]::ReadAllText($payPath, [System.Text.Encoding]::UTF8)
$classIdx = $payContent.IndexOf("export class PaymentSystem")
if ($classIdx -gt 0) {
    $body = $payContent.Substring($classIdx)
    $newContent = $PaymentTypes + "`n" + $body
    [System.IO.File]::WriteAllText($payPath, $newContent, [System.Text.Encoding]::UTF8)
    Write-Host "  ✅ payment.ts — types réécrits" -ForegroundColor Green
}

# ══════════════════════════════════════════════════════════════════
# 3. DOOR.TS — Supprimer doublons + ajouter open/push à SwingDoor
# ══════════════════════════════════════════════════════════════════
Write-Host "`n🔧 door.ts" -ForegroundColor Cyan

$doorPath = Join-Path $P "src\game\door.ts"
$doorContent = [System.IO.File]::ReadAllText($doorPath, [System.Text.Encoding]::UTF8)

# Supprimer le bloc dupliqué injecté par v1 (entre "// Fonction utilitaire" et la fin du doublon)
$dupMarker = "// Fonction utilitaire pour trouver une porte par ID`n`n`nexport function buildPanelLeaf"
if ($doorContent.Contains($dupMarker)) {
    $dupEnd = $doorContent.IndexOf("// Fonction utilitaire pour trouver une porte par ID", $doorContent.IndexOf($dupMarker) + 10)
    if ($dupEnd -gt 0) {
        $doorContent = $doorContent.Substring(0, $dupEnd) + $doorContent.Substring($dupEnd + "// Fonction utilitaire pour trouver une porte par ID".Length)
    }
}

# Supprimer les doublons buildPanelLeaf, doorLabelMat, buildDoorCasing injectés par v1
# On cherche le deuxième bloc "export function buildPanelLeaf"
$firstBPL = $doorContent.IndexOf("export function buildPanelLeaf")
if ($firstBPL -ge 0) {
    $secondBPL = $doorContent.IndexOf("export function buildPanelLeaf", $firstBPL + 10)
    if ($secondBPL -gt 0) {
        # Trouver la fin du bloc dupliqué (prochain "export function" ou "// Fonction")
        $nextFunc = $doorContent.IndexOf("`n// Fonction", $secondBPL)
        if ($nextFunc -lt 0) { $nextFunc = $doorContent.Length }
        $doorContent = $doorContent.Substring(0, $secondBPL) + $doorContent.Substring($nextFunc)
        Write-Host "  ✅ Doublons supprimés" -ForegroundColor Green
    }
}

# Ajouter getter 'open' et méthode 'push' à BaseDoor (après la ligne "protected vel")
if (-not $doorContent.Contains("get open()")) {
    $doorContent = $doorContent.Replace(
        "public vel: number = 0;",
        "public vel: number = 0;`n`n  /** Getter de compatibilité pour engine.ts */`n  get open(): boolean { return this.state.isOpen; }`n`n  /** Pousse la porte (physique d'impact) */`n  push(dt: number, force: number = 10): void {`n    this.vel += force * dt;`n    this.state.isOpen = true;`n  }"
    )
    Write-Host "  ✅ open/push ajoutés à BaseDoor" -ForegroundColor Green
}

[System.IO.File]::WriteAllText($doorPath, $doorContent, [System.Text.Encoding]::UTF8)

# ══════════════════════════════════════════════════════════════════
# 4. NET.TS — Transformer netEmit en objet callable avec .on()
# ══════════════════════════════════════════════════════════════════
Write-Host "`n🔧 net.ts" -ForegroundColor Cyan

$netPath = Join-Path $P "src\game\net.ts"
$netContent = [System.IO.File]::ReadAllText($netPath, [System.Text.Encoding]::UTF8)

# Remplacer l'ancien export de netEmit (fonction simple) par un objet callable
$oldNetEmit = "export function netEmit(event: string, data?: any)"
$newNetEmit = @'
const _netHandlers = new Map<string, Set<(data: any) => void>>();

function _netEmitFn(event: string, data?: any) {
  _netHandlers.get(event)?.forEach(cb => {
    try { cb(data); } catch (e) { console.error(`[net] handler error ${event}:`, e); }
  });
}

export const netEmit: {
  (event: string, data?: any): void;
  on: (event: string, cb: (data: any) => void) => void;
  off: (event: string, cb: (data: any) => void) => void;
} = Object.assign(_netEmitFn, {
  on: (event: string, cb: (data: any) => void) => {
    if (!_netHandlers.has(event)) _netHandlers.set(event, new Set());
    _netHandlers.get(event)!.add(cb);
  },
  off: (event: string, cb: (data: any) => void) => {
    _netHandlers.get(event)?.delete(cb);
  }
});

function _legacyNetEmit(event: string, data?: any)'@

if ($netContent.Contains($oldNetEmit)) {
    $netContent = $netContent.Replace($oldNetEmit, $newNetEmit)
    [System.IO.File]::WriteAllText($netPath, $netContent, [System.Text.Encoding]::UTF8)
    Write-Host "  ✅ netEmit transformé en objet avec .on()/.off()" -ForegroundColor Green
}

# ══════════════════════════════════════════════════════════════════
# 5. DEPANNEUR.TS — matLib.get + ShopItem.color
# ══════════════════════════════════════════════════════════════════
Write-Host "`n🔧 depanneur.ts" -ForegroundColor Cyan

# Corriger l'appel matLib.get (le 4ème param est MaterialOptions, pas boolean)
Fix "src\game\depanneur.ts" `
    "const mat = matLib.get(color, rough, metal, emissive !== 0, emissiveIntensity);" `
    "const mat = matLib.get(color, rough, metal);"

# Ajouter color à ShopItem (chercher l'interface exacte)
$depPath = Join-Path $P "src\game\depanneur.ts"
$depContent = [System.IO.File]::ReadAllText($depPath, [System.Text.Encoding]::UTF8)
if ($depContent.Contains("export interface ShopItem {") -and -not $depContent.Contains("export interface ShopItem { color")) {
    $depContent = $depContent.Replace(
        "export interface ShopItem {",
        "export interface ShopItem {`n  color?: number;"
    )
    [System.IO.File]::WriteAllText($depPath, $depContent, [System.Text.Encoding]::UTF8)
    Write-Host "  ✅ ShopItem.color ajouté" -ForegroundColor Green
}

# ══════════════════════════════════════════════════════════════════
# 6. ENGINE.TS — depPrompt callable
# ══════════════════════════════════════════════════════════════════
Write-Host "`n🔧 engine.ts" -ForegroundColor Cyan

Fix "src\game\depanneur.ts" `
    "export const depPrompt = {`n  show: (message: string) => console.log(`[Dépanneur UI] `${message}`),`n  hide: () => {}`n};" `
    "export function depPrompt(message: string, opts?: any): any {`n  console.log(`[Dépanneur] `${message}`);`n  return null;`n}`n(depPrompt as any).show = (msg: string) => console.log(msg);`n(depPrompt as any).hide = () => {};"

# ══════════════════════════════════════════════════════════════════
# 7. HOTEL.TS — Méthode hydrate() dans Room
# ══════════════════════════════════════════════════════════════════
Write-Host "`n🔧 hotel.ts" -ForegroundColor Cyan

$hotelPath = Join-Path $P "src\game\hotel.ts"
$hotelContent = [System.IO.File]::ReadAllText($hotelPath, [System.Text.Encoding]::UTF8)

if (-not $hotelContent.Contains("hydrate(state: any): void")) {
    # Insérer hydrate juste avant getState dans la classe Room
    $hotelContent = $hotelContent.Replace(
        "  getState(): RoomState {",
        "  hydrate(state: any): void {`n    if (state.isOccupied !== undefined) this.isOccupied = state.isOccupied;`n    if (state.customerId !== undefined) (this as any).customerId = state.customerId;`n    if (state.customerName !== undefined) (this as any).customerName = state.customerName;`n    if (state.nightsRemaining !== undefined) (this as any).nightsRemaining = state.nightsRemaining;`n  }`n`n  getState(): RoomState {"
    )
    [System.IO.File]::WriteAllText($hotelPath, $hotelContent, [System.Text.Encoding]::UTF8)
    Write-Host "  ✅ Room.hydrate() ajouté" -ForegroundColor Green
}

# ══════════════════════════════════════════════════════════════════
# 8. ARCHITECTURE.TS — Ligne 104 (door non déclaré)
# ══════════════════════════════════════════════════════════════════
Write-Host "`n🔧 architecture.ts" -ForegroundColor Cyan

$archPath = Join-Path $P "src\game\architecture.ts"
$archContent = [System.IO.File]::ReadAllText($archPath, [System.Text.Encoding]::UTF8)

# La ligne 104 a probablement "g.add(door);" mais la variable s'appelle "doorMesh" ou autre
# On remplace par un pattern sûr : ajouter le mesh de porte directement
$archLines = $archContent -split "`n"
if ($archLines.Count -gt 103) {
    $line104 = $archLines[103]
    if ($line104.Trim() -eq "g.add(door);") {
        # Chercher la variable de porte la plus proche au-dessus
        for ($i = 102; $i -ge 90; $i--) {
            if ($archLines[$i] -match "const\s+(\w+)\s*=\s*new\s+THREE\.Mesh.*BoxGeometry.*door") {
                $varName = $Matches[1]
                $archLines[103] = $line104.Replace("g.add(door);", "g.add($varName);")
                Write-Host "  ✅ Ligne 104 corrigée : door -> $varName" -ForegroundColor Green
                break
            }
            if ($archLines[$i] -match "const\s+(\w+)\s*=\s*new\s+THREE\.Mesh") {
                $varName = $Matches[1]
                $archLines[103] = $line104.Replace("g.add(door);", "g.add($varName);")
                Write-Host "  ✅ Ligne 104 corrigée : door -> $varName" -ForegroundColor Green
                break
            }
        }
    }
}
$archContent = $archLines -join "`n"
[System.IO.File]::WriteAllText($archPath, $archContent, [System.Text.Encoding]::UTF8)

# ══════════════════════════════════════════════════════════════════
# 9. LUXURY.TS — buildPanelLeaf signature compatible
# ══════════════════════════════════════════════════════════════════
Write-Host "`n🔧 luxury.ts" -ForegroundColor Cyan

# L'appel réel est : buildPanelLeaf(0.86, 2.1, { locked, wood: tex.mat(...) })
# Il faut adapter la fonction dans door.ts pour accepter un objet
$doorPath2 = Join-Path $P "src\game\door.ts"
$doorContent2 = [System.IO.File]::ReadAllText($doorPath2, [System.Text.Encoding]::UTF8)

if ($doorContent2.Contains("export function buildPanelLeaf(width: number, height: number, material: THREE.Material)")) {
    $doorContent2 = $doorContent2.Replace(
        "export function buildPanelLeaf(width: number, height: number, material: THREE.Material): THREE.Group {`n  const g = new THREE.Group();`n  const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, 0.04), material);",
        "export function buildPanelLeaf(width: number, height: number, materialOrOpts: THREE.Material | Record<string, any>): THREE.Group {`n  const g = new THREE.Group();`n  const mat = (materialOrOpts instanceof THREE.Material) ? materialOrOpts : (materialOrOpts.wood ?? new THREE.MeshStandardMaterial());`n  const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, 0.04), mat);"
    )
    [System.IO.File]::WriteAllText($doorPath2, $doorContent2, [System.Text.Encoding]::UTF8)
    Write-Host "  ✅ buildPanelLeaf signature élargie" -ForegroundColor Green
}

# ══════════════════════════════════════════════════════════════════
# FIN
# ══════════════════════════════════════════════════════════════════
Write-Host "`n════════════════════════════════════════════" -ForegroundColor Magenta
Write-Host "  FIX v2 TERMINÉ — Lancez: npx tsc --noEmit" -ForegroundColor Magenta
Write-Host "════════════════════════════════════════════" -ForegroundColor Magenta