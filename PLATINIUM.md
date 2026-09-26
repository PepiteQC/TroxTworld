# TROXT ↔ Platinium PRO QC

> Ce dépôt (`pepiteqc/troxtworld`) fournit le **moteur TROXT 3D** : Three.js,
> Colyseus, Rapier3D. Il fait partie de l'édition ultime finale
> **TROXT + INTELLECTUS RP — Platinium PRO QC**.

## Rôle dans l'édition Platinium

| Dépôt                             | Rôle                                                             |
|-----------------------------------|------------------------------------------------------------------|
| `pepiteqc/beni`                   | 🏛️ **HUB** — contenu QC, HUD, dashboard, routes API, docs        |
| `pepiteqc/troxtworld` **(ici)**   | 🌐 **Moteur TROXT 3D** — multijoueur Colyseus + Three.js         |
| `pepiteqc/kite-glow-yellow-moon`  | 🛠️ **App Builder Workspace** — sandbox Grok Build                |

Tous les trois travaillent sur la branche
`claude/amazing-wozniak-kashhv`.

## Pont d'intégration

Le fichier `src/platinium/PlatiniumBridge.ts` expose la constante
`PLATINIUM_REMOTE`, utilisée pour :

- Afficher la version Platinium dans le HUD serveur (`platiniumBootLine`)
- Négocier une session cross-repo (`platiniumHandshake(sessionId)`)
- Lister les personas de l'Oracle Intellectus disponibles

## Pillars TROXT (dans l'édition Platinium)

- Simulation 3D fidèle du Comté de Portneuf
- 18 municipalités géolocalisées
- Route 138 sur environ 22 km
- Routes des rangs procédurales entre les villages
- Ancrage Google Maps en direct pour le mode "vue satellite"
- Multijoueur Colyseus (rooms `rp_room`, `world`)
- Physique Rapier3D pour véhicules et personnages

## Voir aussi

- **Contenu et documentation complète :** `pepiteqc/beni/PLATINIUM.md`
- **Routes API Platinium :** `pepiteqc/beni/server/platinium/index.ts`
- **HUD + Dashboard :** `pepiteqc/beni/src/platinium/components/`

---

_© 2026 PepiteQC · Édition Platinium PRO QC · Le Québec en 3D, sans compromis._
