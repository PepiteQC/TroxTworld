import { Hammer, X, Info, Star, Heart, Filter, Trash2, History, Eye, EyeOff, DollarSign, TreePine, Mountain, LayoutGrid } from "lucide-react";
import { PROP_CATALOG } from "./builder";
import type { PortneufEngine } from "./engine";
import { persist, useGameStore } from "./store";
import { useState, useMemo } from "react";
import { Tooltip } from "./ui/tooltip"; // À créer ou utiliser une lib existante (ex: radix-ui)

// ======================
// TYPES ET INTERFACES RP
// ======================

/** Type pour les ressources du joueur. */
export interface PlayerResources {
  wood: number;
  stone: number;
  money: number;
  [key: string]: number;
}

/** Type pour les bonus/malus d'un objet. */
export interface PropBonus {
  reputation?: number; // +1 ou -1 étoile
  buildSpeed?: number; // % de réduction du temps de construction
  costReduction?: number; // % de réduction du coût
  resourceMultiplier?: Record<string, number>; // Multiplicateur de ressources (ex: +10% de bois)
}

/** Type pour un objet du catalogue enrichi. */
export interface PropItem {
  id: string;
  label: string;
  cat: string;
  cost: PlayerResources; // Coût en ressources
  bonus?: PropBonus; // Bonus RP
  traits: string[]; // Ex: ["Écologique", "Rapide"]
  description: string; // Description RP
  icon?: React.ReactNode; // Icône personnalisée
  isFavorite?: boolean; // Favoris
  requiredLevel?: number; // Niveau minimum pour débloquer
}

/** Type pour une catégorie du catalogue. */
export interface PropCategory {
  cat: string;
  items: PropItem[];
  icon?: React.ReactNode;
}

// ======================
// DONNÉES STATIQUES (EXEMPLE)
// ======================

// Exemple de catalogue enrichi avec des données RP
export const RP_PROP_CATALOG: PropCategory[] = [
  {
    cat: "Bâtiments",
    icon: <LayoutGrid className="size-4" />,
    items: [
      {
        id: "cafe",
        label: "Café Rustique",
        cat: "Bâtiments",
        cost: { wood: 50, stone: 20, money: 420 },
        bonus: { reputation: 1, resourceMultiplier: { wood: 0.1 } },
        traits: ["Écologique", "Familial"],
        description: "Un café chaleureux avec une ambiance rustique. +1 étoile de réputation. 10% de bois en plus à la récolte.",
        icon: <Hammer className="size-4" />,
      },
      {
        id: "garage",
        label: "Garage Industriel",
        cat: "Bâtiments",
        cost: { wood: 30, stone: 80, money: 980 },
        bonus: { buildSpeed: 0.2 }, // 20% plus rapide à construire
        traits: ["Industriel", "Rapide"],
        description: "Un garage robuste pour réparer tous types de véhicules. Réduction de 20% du temps de construction.",
        icon: <Mountain className="size-4" />,
      },
      {
        id: "restaurant",
        label: "Restaurant Luxueux",
        cat: "Bâtiments",
        cost: { wood: 40, stone: 60, money: 860 },
        bonus: { reputation: 2 },
        traits: ["Luxueux", "Artisanal"],
        description: "Un restaurant haut de gamme. +2 étoiles de réputation.",
        icon: <Star className="size-4" />,
      },
    ],
  },
  {
    cat: "Décorations",
    icon: <TreePine className="size-4" />,
    items: [
      {
        id: "arbre",
        label: "Arbre Ornemental",
        cat: "Décorations",
        cost: { wood: 5, money: 10 },
        bonus: { reputation: 0.5 },
        traits: ["Écologique"],
        description: "Un arbre pour embellir votre environnement. +0.5 étoile de réputation.",
        icon: <TreePine className="size-4" />,
      },
      {
        id: "fontaine",
        label: "Fontaine en Pierre",
        cat: "Décorations",
        cost: { stone: 30, money: 100 },
        bonus: { reputation: 1 },
        traits: ["Luxueux"],
        description: "Une fontaine élégante. +1 étoile de réputation.",
        icon: <DollarSign className="size-4" />,
      },
    ],
  },
];

// ======================
// COMPOSANT PRINCIPAL
// ======================

export function BuilderOverlay({ engine }: { engine: PortneufEngine | null }) {
  const type = useGameStore((s) => s.buildType);
  const yaw = useGameStore((s) => s.buildYaw);
  const scale = useGameStore((s) => s.buildScale);
  const placed = useGameStore((s) => s.placed);
  const store = useGameStore;
  const [showDetails, setShowDetails] = useState(false); // Mode "Expert"
  const [filterTraits, setFilterTraits] = useState<string[]>([]); // Filtres de traits
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null); // Catégorie sélectionnée
  const [favorites, setFavorites] = useState<Set<string>>(new Set()); // Favoris
  const [showHistory, setShowHistory] = useState(false); // Afficher l'historique
  const [playerResources, setPlayerResources] = useState<PlayerResources>({
    wood: 1000,
    stone: 500,
    money: 5000,
  }); // Ressources du joueur (à récupérer depuis le store)

  // Filtrer les objets en fonction des traits et des ressources
  const filteredCatalog = useMemo(() => {
    return RP_PROP_CATALOG.map((cat) => ({
      ...cat,
      items: cat.items.filter((item) => {
        // Filtre par traits
        const hasTrait = filterTraits.length === 0 || filterTraits.some((t) => item.traits.includes(t));
        // Filtre par ressources suffisantes
        const hasResources = Object.entries(item.cost).every(
          ([resource, amount]) => (playerResources[resource] ?? 0) >= amount
        );
        // Filtre par catégorie
        const matchesCategory = !selectedCategory || selectedCategory === cat.cat;
        return hasTrait && hasResources && matchesCategory;
      }),
    })).filter((cat) => cat.items.length > 0); // Supprime les catégories vides
  }, [filterTraits, selectedCategory, playerResources]);

  // Toggle favoris pour un objet
  const toggleFavorite = (id: string) => {
    const newFavorites = new Set(favorites);
    if (newFavorites.has(id)) {
      newFavorites.delete(id);
    } else {
      newFavorites.add(id);
    }
    setFavorites(newFavorites);
  };

  // Vérifie si un objet peut être construit (ressources suffisantes)
  const canAfford = (item: PropItem): boolean => {
    return Object.entries(item.cost).every(
      ([resource, amount]) => (playerResources[resource] ?? 0) >= amount
    );
  };

  // Applique le coût d'un objet aux ressources du joueur (simulation)
  const applyCost = (item: PropItem) => {
    const newResources = { ...playerResources };
    for (const [resource, amount] of Object.entries(item.cost)) {
      newResources[resource] = (newResources[resource] ?? 0) - amount;
    }
    setPlayerResources(newResources);
  };

  // Réinitialise les filtres
  const resetFilters = () => {
    setFilterTraits([]);
    setSelectedCategory(null);
  };

  // Récupère les traits uniques pour les filtres
  const allTraits = useMemo(() => {
    const traitsSet = new Set<string>();
    RP_PROP_CATALOG.forEach((cat) =>
      cat.items.forEach((item) => item.traits.forEach((t) => traitsSet.add(t)))
    );
    return Array.from(traitsSet);
  }, []);

  // Récupère les catégories uniques
  const allCategories = useMemo(() => {
    return RP_PROP_CATALOG.map((cat) => cat.cat);
  }, []);

  // ======================
  // RENDU
  // ======================

  return (
    <div className="pointer-events-none absolute inset-y-0 left-0 z-30 flex w-80 items-stretch p-3">
      <div className="hud-panel pointer-events-auto flex w-full flex-col rounded-lg shadow-lg">
        {/* En-tête */}
        <div className="flex items-start justify-between gap-2 border-b border-border px-3 py-2.5">
          <div className="flex items-center gap-2">
            <p className="flex items-center gap-1.5 text-[10px] tracking-[0.2em] text-subtle uppercase">
              <Hammer className="size-3.5" />
              Builder
            </p>
            <Tooltip content="Mode Expert : Affiche les coûts et bonus.">
              <button
                type="button"
                className={`flex size-6 items-center justify-center rounded-md text-[10px] ${
                  showDetails ? "text-fg bg-surface-2" : "text-muted"
                }`}
                onClick={() => setShowDetails(!showDetails)}
                aria-label="Toggle mode expert"
              >
                {showDetails ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
              </button>
            </Tooltip>
          </div>
          <div className="flex items-center gap-2">
            <p className="text-[11px] text-muted">
              {placed.length}/80 · E placer · Q tourner ·{" "}
              {showDetails && (
                <>
                  <span className="text-fg">
                    {playerResources.wood}🪵 {playerResources.stone}🪨 {playerResources.money}💰
                  </span>
                </>
              )}
            </p>
            <button
              type="button"
              className="flex size-9 items-center justify-center rounded-md text-muted hover:bg-surface-2"
              onClick={() => store.getState().toggleBuild()}
              aria-label="Fermer le builder"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>

        {/* Contrôles de rotation et échelle */}
        <div className="flex flex-wrap gap-1 border-b border-border px-3 py-2">
          <Tooltip content="Tourner l'objet (Q/E en jeu)">
            <button
              type="button"
              className="h-8 rounded-md border border-border bg-surface px-2 text-[10px] text-muted hover:bg-surface-2"
              onClick={() => store.getState().rotateGhost()}
            >
              Rotation {Math.round((yaw * 180) / Math.PI)}°
            </button>
          </Tooltip>
          <Tooltip content="Augmenter la taille">
            <button
              type="button"
              className="h-8 rounded-md border border-border bg-surface px-2 text-[10px] text-muted hover:bg-surface-2"
              onClick={() => store.getState().scaleGhost(1)}
            >
              +
            </button>
          </Tooltip>
          <Tooltip content="Diminuer la taille">
            <button
              type="button"
              className="h-8 rounded-md border border-border bg-surface px-2 text-[10px] text-muted hover:bg-surface-2"
              onClick={() => store.getState().scaleGhost(-1)}
            >
              −
            </button>
          </Tooltip>
          <span className="self-center text-[10px] text-subtle">×{scale.toFixed(2)}</span>
          {[0.25, 0.5, 1].map((n) => (
            <Tooltip key={n} content={`Snap à ${n} m`}>
              <button
                type="button"
                className="h-8 rounded-md border border-border bg-surface px-2 text-[10px] text-muted hover:bg-surface-2"
                onClick={() => engine?.setBuildSnap(n)}
              >
                {n.toFixed(2)} m
              </button>
            </Tooltip>
          ))}
          <Tooltip content="Supprimer l'objet le plus proche">
            <button
              type="button"
              className="h-8 rounded-md border border-border bg-surface px-2 text-[10px] text-danger hover:bg-danger/10"
              onClick={() => engine?.removeNearestProp()}
            >
              <Trash2 className="size-3.5" />
            </button>
          </Tooltip>
          <Tooltip content="Tout supprimer">
            <button
              type="button"
              className="h-8 rounded-md border border-border bg-surface px-2 text-[10px] text-danger hover:bg-danger/10"
              onClick={() => {
                engine?.clearProps();
                persist();
              }}
            >
              Tout
            </button>
          </Tooltip>
        </div>

        {/* Filtres */}
        <div className="flex flex-wrap gap-1 border-b border-border px-3 py-2">
          <Tooltip content="Filtrer par traits ou catégories">
            <button
              type="button"
              className="h-8 rounded-md border border-border bg-surface px-2 text-[10px] text-muted hover:bg-surface-2 flex items-center gap-1"
              onClick={() => {
                // Ouvrir un modal de filtres (à implémenter)
                console.log("Ouvrir modal de filtres");
              }}
            >
              <Filter className="size-3.5" />
              Filtres
            </button>
          </Tooltip>
          {filterTraits.length > 0 || selectedCategory ? (
            <button
              type="button"
              className="h-8 rounded-md border border-border bg-surface px-2 text-[10px] text-muted hover:bg-surface-2"
              onClick={resetFilters}
            >
              Réinitialiser
            </button>
          ) : null}
          {showHistory && (
            <Tooltip content="Afficher l'historique des constructions">
              <button
                type="button"
                className={`h-8 rounded-md border border-border px-2 text-[10px] ${
                  showHistory ? "bg-surface-2 text-fg" : "bg-surface text-muted"
                } hover:bg-surface-2`}
                onClick={() => setShowHistory(!showHistory)}
              >
                <History className="size-3.5" />
              </button>
            </Tooltip>
          )}
        </div>

        {/* Filtres rapides (traits) */}
        {showDetails && (
          <div className="flex flex-wrap gap-1 border-b border-border px-3 py-1">
            {allTraits.map((trait) => (
              <button
                key={trait}
                type="button"
                className={`h-6 rounded-md border border-border px-2 text-[10px] ${
                  filterTraits.includes(trait)
                    ? "bg-surface-2 text-fg border-border-strong"
                    : "bg-surface text-muted"
                } hover:bg-surface-2`}
                onClick={() => {
                  setFilterTraits(
                    filterTraits.includes(trait)
                      ? filterTraits.filter((t) => t !== trait)
                      : [...filterTraits, trait]
                  );
                }}
              >
                {trait}
              </button>
            ))}
          </div>
        )}

        {/* Filtres rapides (catégories) */}
        {showDetails && (
          <div className="flex flex-wrap gap-1 border-b border-border px-3 py-1">
            {allCategories.map((cat) => (
              <button
                key={cat}
                type="button"
                className={`h-6 rounded-md border border-border px-2 text-[10px] ${
                  selectedCategory === cat
                    ? "bg-surface-2 text-fg border-border-strong"
                    : "bg-surface text-muted"
                } hover:bg-surface-2`}
                onClick={() => {
                  setSelectedCategory(selectedCategory === cat ? null : cat);
                }}
              >
                {cat}
              </button>
            ))}
          </div>
        )}

        {/* Catalogue des objets */}
        <div className="min-h-0 flex-1 space-y-3 overflow-auto px-3 py-2">
          {filteredCatalog.length > 0 ? (
            filteredCatalog.map((cat) => (
              <div key={cat.cat}>
                <p className="mb-1 text-[10px] tracking-[0.2em] text-subtle uppercase flex items-center gap-1">
                  {cat.icon} {cat.cat}
                </p>
                <div className="grid grid-cols-2 gap-1">
                  {cat.items.map((item) => {
                    const on = type === item.id;
                    const canBuild = canAfford(item);
                    const isFavorite = favorites.has(item.id);

                    return (
                      <Tooltip
                        key={item.id}
                        content={
                          <div className="max-w-xs p-2">
                            <p className="font-bold text-fg">{item.label}</p>
                            <p className="text-sm text-muted">{item.description}</p>
                            {showDetails && (
                              <>
                                <div className="mt-1 border-t border-border pt-1">
                                  <p className="text-xs text-muted">Coût :</p>
                                  <div className="flex gap-2 text-xs">
                                    {Object.entries(item.cost).map(([resource, amount]) => (
                                      <span key={resource} className="text-fg">
                                        {amount} {resource === "wood" ? "🪵" : resource === "stone" ? "🪨" : "💰"}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                                {item.bonus && (
                                  <div className="mt-1 border-t border-border pt-1">
                                    <p className="text-xs text-muted">Bonus :</p>
                                    <div className="flex gap-2 text-xs text-success">
                                      {item.bonus.reputation && (
                                        <span>+{item.bonus.reputation} étoile(s) de réputation</span>
                                      )}
                                      {item.bonus.buildSpeed && (
                                        <span>-{item.bonus.buildSpeed * 100}% temps de construction</span>
                                      )}
                                      {item.bonus.costReduction && (
                                        <span>-{item.bonus.costReduction * 100}% coût</span>
                                      )}
                                    </div>
                                  </div>
                                )}
                                {item.traits.length > 0 && (
                                  <div className="mt-1 border-t border-border pt-1">
                                    <p className="text-xs text-muted">Traits :</p>
                                    <div className="flex flex-wrap gap-1 text-xs">
                                      {item.traits.map((trait) => (
                                        <span key={trait} className="bg-surface-2 px-1 rounded">
                                          {trait}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        }
                      >
                        <button
                          type="button"
                          disabled={!canBuild}
                          onClick={() => {
                            if (canBuild) {
                              store.getState().selectProp(on ? null : item.id);
                              applyCost(item); // Débite les ressources (simulation)
                            }
                          }}
                          className={`rounded-md border px-2 py-1.5 text-left text-[11px] relative ${
                            on
                              ? "border-border-strong bg-surface-2 text-fg"
                              : canBuild
                              ? "border-border bg-surface text-muted hover:bg-surface-2"
                              : "border-border/50 bg-surface/50 text-muted/50 cursor-not-allowed"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="truncate">{item.label}</span>
                            {showDetails && (
                              <div className="flex items-center gap-1">
                                {item.icon}
                                {isFavorite && (
                                  <Heart className="size-3.5 text-danger fill-danger" />
                                )}
                              </div>
                            )}
                          </div>
                          {showDetails && !on && canBuild && (
                            <div className="mt-1 flex gap-1 text-xs">
                              {Object.entries(item.cost).map(([resource, amount]) => (
                                <span key={resource} className="text-muted">
                                  {amount} {resource === "wood" ? "🪵" : resource === "stone" ? "🪨" : "💰"}
                                </span>
                              ))}
                            </div>
                          )}
                          {!canBuild && showDetails && (
                            <div className="absolute inset-0 bg-black/20 rounded-md flex items-center justify-center">
                              <Info className="size-3.5 text-muted" />
                            </div>
                          )}
                        </button>
                      </Tooltip>
                    );
                  })}
                </div>
              </div>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center py-4 text-muted">
              <p className="text-sm">Aucun objet disponible.</p>
              <p className="text-xs">Essayez de modifier vos filtres ou d'acquérir plus de ressources.</p>
            </div>
          )}
        </div>

        {/* Historique des constructions */}
        {showHistory && (
          <div className="border-t border-border px-3 py-2">
            <p className="mb-1 text-[10px] tracking-[0.2em] text-subtle uppercase">Historique</p>
            <div className="max-h-24 overflow-auto space-y-1">
              {placed.slice().reverse().map((prop, index) => (
                <div
                  key={`${prop.id}-${index}`}
                  className="flex items-center justify-between text-[10px] p-1 rounded-md bg-surface hover:bg-surface-2"
                >
                  <span>{PROP_CATALOG.flatMap(cat => cat.items).find(item => item.id === prop.id)?.label || prop.id}</span>
                  <span className="text-muted">
                    {new Date(prop.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}