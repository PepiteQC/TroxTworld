import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Flame,
  Trees,
  Droplets,
  Wrench,
  Navigation,
  Scale,
  Shield,
  ShoppingBag,
  Ticket,
  DollarSign,
  AlertOctagon,
  Anchor,
  Pickaxe,
  Zap,
  Hammer,
  Users,
  Compass,
  FileText,
  Clock,
  Coins,
  Plus,
  Trash2,
  Play,
  RotateCcw,
  CheckCircle,
  HelpCircle,
  ArrowRight,
  Lock,
  Unlock,
  Thermometer,
  Radio,
  Timer,
  VolumeX,
  ShieldAlert
} from "lucide-react";
import { ContextualAudioManager } from "../utils/ContextualAudioManager";

interface PortneufRPSystemProps {
  onAddServerLog: (msg: string) => void;
  activeWeather: string;
  activeTimePhase: string;
}

type JobType = "Citoyen" | "Pompier" | "Bûcheron" | "Acériculteur" | "Mécanicien" | "Chauffeur taxi" | "Avocat";

interface ReplayAction {
  id: string;
  time: string;
  action: string;
  hash: string;
}

interface VillageData {
  name: string;
  mayor: string;
  budget: number;
  taxRate: number;
  reputation: number;
}

export default function PortneufRPSystem({ onAddServerLog, activeWeather, activeTimePhase }: PortneufRPSystemProps) {
  // --- SUB-TABS ---
  const [subTab, setSubTab] = useState<"jobs" | "crime" | "social" | "tech">("jobs");

  // --- ECONOMY ---
  const [cash, setCash] = useState<number>(340);
  const [bank, setBank] = useState<number>(2150);
  const [activeJob, setActiveJob] = useState<JobType>("Citoyen");

  // --- INVENTORY / CRAFT ---
  const [inventory, setInventory] = useState<Record<string, number>>({
    wood_lumber: 2,
    maple_sap: 4,
    maple_syrup: 0,
    limestone: 1,
    smuggled_ether: 0,
    ether_fuel: 0,
    extinguisher_upgrade: 0,
    lotto_ticket: 0,
    axe_upgrade: 0,
    spigot_upgrade: 0,
    brake_upgrade: 0,
    alambic_upgrade: 0
  });

  // --- JOB STATE - BÛCHERON ---
  const [chopProgress, setChopProgress] = useState(0);
  const [isChopping, setIsChopping] = useState(false);
  const [quarryProgress, setQuarryProgress] = useState(0);
  const [isQuarrying, setIsQuarrying] = useState(false);

  // --- JOB STATE - ACÉRICULTEUR ---
  const [sugarHeat, setSugarHeat] = useState(60); // sweet spot 90-110C
  const [sapReservoir, setSapReservoir] = useState(12); // liters
  const [syrupProduced, setSyrupProduced] = useState(0);
  const [isBoiling, setIsBoiling] = useState(false);

  // --- JOB STATE - POMPIER ---
  const [activeFire, setActiveFire] = useState<{
    location: string;
    intensity: number;
    gps: string;
  } | null>({
    location: "Forêt de Saint-Raymond",
    intensity: 75,
    gps: "46.8856° N, 71.8339° W"
  });

  // --- JOB STATE - MÉCANICIEN ---
  const [vehicleUnderRepair, setVehicleUnderRepair] = useState<{
    model: string;
    owner: string;
    damage: number;
    tasks: string[];
    currentTaskIdx: number;
  } | null>({
    model: "Skidoo Ski-Doo 850 E-TEC",
    owner: "Gilles Tremblay",
    damage: 60,
    tasks: ["Changer bougies", "Ajuster chenille", "Purger carburateur"],
    currentTaskIdx: 0
  });

  // --- JOB STATE - TAXI ---
  const [taxiFare, setTaxiFare] = useState<{
    passenger: string;
    from: string;
    to: string;
    distanceKm: number;
    progress: number;
    farePrice: number;
  } | null>(null);

  // --- JOB STATE - AVOCAT ---
  const [activeClient, setActiveClient] = useState<{
    name: string;
    crime: string;
    jailSentence: number;
    bailCost: number;
  } | null>({
    name: "Ti-Clins Laliberté",
    crime: "Contrebande Route 138",
    jailSentence: 45,
    bailCost: 1200
  });

  // --- SUBTERRANEAN ECONOMY (CRIME) ---
  const [suspicionLevel, setSuspicionLevel] = useState(10); // % suspicion
  const [smuggleCargo, setSmuggleCargo] = useState<number>(0); // items
  const [isSmuggling, setIsSmuggling] = useState(false);
  const [smuggleProgress, setSmuggleProgress] = useState(0);

  // --- DESJARDINS ROBBERY ADVANCED STATES ---
  const [heistStep, setHeistStep] = useState<"none" | "bypass" | "drill" | "combination" | "pillage" | "escape" | "complete">("none");
  const [heistProgress, setHeistProgress] = useState(0);
  const [heistActionActive, setHeistActionActive] = useState(false);

  // Alarm & Police Star Escalation States
  const [alarm311_4141Triggered, setAlarm311_4141Triggered] = useState(false);
  const [policeStars, setPoliceStars] = useState(1); // 1-5 Stars
  const [policeChaseDistance, setPoliceChaseDistance] = useState(0); // 0-100% how close they are

  // Bypass step states
  const [bypassTargetFreq, setBypassTargetFreq] = useState(41.4);
  const [bypassCurrentFreq, setBypassCurrentFreq] = useState(30.0);
  const [bypassStableSeconds, setBypassStableSeconds] = useState(0);

  // Drill step states
  const [drillTemp, setDrillTemp] = useState(40);
  const [drillSpeedBoost, setDrillSpeedBoost] = useState(50); // pressure %
  const [drillWaterRefills, setDrillWaterRefills] = useState(3);

  // Combination step states
  const [combinationTarget, setCombinationTarget] = useState<[number, number, number]>([28, 64, 41]);
  const [combinationDial, setCombinationDial] = useState(0);
  const [combinationStep, setCombinationStep] = useState(0); // 0, 1, 2 solved

  // Pillage step states
  const [pillageSecLeft, setPillageSecLeft] = useState(30);
  const [lootBagValue, setLootBagValue] = useState(0);
  const [lootWeight, setLootWeight] = useState(0); // kg
  const [stolenPrisms, setStolenPrisms] = useState(0);

  // Escape strategy selection
  const [escapeRoute, setEscapeRoute] = useState<"cheminduroy" | "route138" | "casserole" | "ferry">("cheminduroy");

  // --- LOTO QUÉBEC ---
  const [lottoWinnerAnnounced, setLottoWinnerAnnounced] = useState<string | null>(null);

  // --- SOCIAL / POLITICS ---
  const [prisonState, setPrisonState] = useState<{
    status: "Libéré" | "Incarcéré" | "Évadé";
    sentenceSeconds: number;
    crime: string;
  }>({
    status: "Libéré",
    sentenceSeconds: 0,
    crime: ""
  });

  // --- EXTENDED PRISON & POLICE MECHANICS ---
  const [originalSentence, setOriginalSentence] = useState(0);
  const [prisonCellId, setPrisonCellId] = useState("Cellule A-01");
  const [rehabilitationPoints, setRehabilitationPoints] = useState(0);
  const [paroleAttempts, setParoleAttempts] = useState(0);
  const [paroleStatus, setParoleStatus] = useState<"none" | "pending" | "approved" | "rejected">("none");
  const [probationSeconds, setProbationSeconds] = useState(0);
  const [prisonWorkActive, setPrisonWorkActive] = useState(false);
  const [prisonWorkType, setPrisonWorkType] = useState<"wash" | "rocks" | "iso">("rocks");
  const [prisonWorkProgress, setPrisonWorkProgress] = useState(0);
  const [prisonTension, setPrisonTension] = useState(20); // 0 to 100
  const [policeOfficerDuty, setPoliceOfficerDuty] = useState(false);
  const [policeDispatchMode, setPoliceDispatchMode] = useState<"idle" | "patrol_138" | "patrol_roy" | "picket_line">("idle");
  const [policeDispatchTime, setPoliceDispatchTime] = useState(0);
  
  const [simulatedInmates, setSimulatedInmates] = useState<Array<{
    id: string;
    name: string;
    crime: string;
    sentenceLeft: number;
    cellId: string;
    paroleStatus: "none" | "pending" | "approved" | "rejected";
    behavior: "Bon" | "Moyen" | "Dangereux";
  }>>([
    { id: "INM-412", name: "Stéphane 'La Hache' Pelletier", crime: "Braconnage d'orignaux à St-Raymond", sentenceLeft: 45, cellId: "Cellule A-01", paroleStatus: "none", behavior: "Moyen" },
    { id: "INM-883", name: "Gaston Tremblay", crime: "Fraude fiscale Desjardins", sentenceLeft: 30, cellId: "Cellule A-02", paroleStatus: "pending", behavior: "Bon" },
    { id: "INM-902", name: "Guillaume 'Le Kid' Roy", crime: "Voleur de Ski-Doo récidiviste", sentenceLeft: 60, cellId: "Cellule B-04", paroleStatus: "none", behavior: "Dangereux" }
  ]);

  const [socialSubTab, setSocialSubTab] = useState<"prison" | "police">("prison");
  const [tunnelProgress, setTunnelProgress] = useState(0);
  const [serverEscapeLogs, setServerEscapeLogs] = useState<Array<{
    id: string;
    timestamp: string;
    inmateName: string;
    method: string;
    status: "Réussite" | "Échec";
    detail: string;
  }>>([]);

  // Helper to incarcerate player cleanly
  const incarceratePlayer = async (duration: number, crimeName: string) => {
    try {
      const res = await fetch("/api/prison/incarcerate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ duration, crime: crimeName })
      });
      if (res.ok) {
        const data = await res.json();
        setPrisonState({
          status: data.playerPrisonState.status,
          sentenceSeconds: data.playerPrisonState.sentenceSeconds,
          crime: data.playerPrisonState.crime
        });
        setOriginalSentence(data.playerPrisonState.originalSentence);
        setPrisonCellId("Bloc-C " + data.playerPrisonState.cellId);
        setRehabilitationPoints(data.playerPrisonState.rehabilitationPoints);
        setParoleAttempts(0);
        setParoleStatus("none");
        setProbationSeconds(0);
        setPrisonWorkActive(false);
        setPrisonWorkProgress(0);
        setTunnelProgress(0);
        setPrisonTension(data.playerPrisonState.prisonTension);
      }
    } catch (e) {
      console.error("Failed to incarcerate player on server", e);
    }
  };

  // Helper to check and react to parole violations
  const checkParoleViolation = () => {
    if (probationSeconds > 0) {
      const penalty = probationSeconds + 30;
      setProbationSeconds(0);
      setParoleStatus("none");
      setPrisonState({
        status: "Incarcéré",
        sentenceSeconds: penalty,
        crime: "Récidive sous liberté conditionnelle (Infraction détectée)"
      });
      setOriginalSentence(penalty);
      setPrisonCellId("Bloc Haute Sécurité S-1");
      setSuspicionLevel(95);
      setTunnelProgress(0);
      setPrisonTension((prev) => Math.min(100, prev + 25));
      ContextualAudioManager.getInstance().playPoliceSiren();
      onAddServerLog("[Sûreté du Québec] !!! MANDAT D'AMENÉE !!! Probation violée. Ré-incarcération forcée.");
      recordActionForReplay("Violation de liberté conditionnelle");
      return true;
    }
    return false;
  };

  const [villages, setVillages] = useState<VillageData[]>([
    { name: "Deschambault", mayor: "Maire officiel", budget: 45000, taxRate: 15, reputation: 25 },
    { name: "Saint-Raymond", mayor: "Vacant", budget: 32000, taxRate: 12, reputation: 10 },
    { name: "Cap-Santé", mayor: "Raymond Caron", budget: 28000, taxRate: 10, reputation: -5 }
  ]);

  const [unionStrike, setUnionStrike] = useState<{
    isStriking: boolean;
    demandedWage: number;
    currentWage: number;
  }>({
    isStriking: false,
    demandedWage: 28,
    currentWage: 18
  });

  // --- GEOGRAPHY CONTROLLER ---
  const [ferrySchedule, setFerrySchedule] = useState<{
    status: "À Cap-Santé" | "En mer" | "À Saint-Nicolas (Rive Sud)";
    timeLeft: number; // seconds
  }>({
    status: "À Cap-Santé",
    timeLeft: 30
  });

  // --- REPLAY BUFFER ---
  const [replayBuffer, setReplayBuffer] = useState<ReplayAction[]>([]);
  const [isReplaying, setIsReplaying] = useState(false);
  const [replayProgress, setReplayProgress] = useState(0);

  // --- DAILY JOURNAL PUSH FEED ---
  const [journalTicker, setJournalTicker] = useState<string>(
    "🍁 JOURNAL DE PORTNEUF : Fermeture partielle temporaire du Chemin du Roy pour courses illégales signalées."
  );

  // Helper to append a local replay action with simulated SHA-256 hash
  const recordActionForReplay = (act: string) => {
    const time = new Date().toLocaleTimeString("fr-CA");
    const id = Math.random().toString(36).substring(4, 9);
    // Simulated SHA-256 signature hash
    const hash = Array.from({ length: 16 }, () =>
      Math.floor(Math.random() * 16).toString(16)
    ).join("") + "...(SHA-256 Audit Trail)";

    setReplayBuffer((prev) => {
      const updated = [{ id, time, action: act, hash }, ...prev];
      if (updated.length > 8) updated.pop();
      return updated;
    });
  };

  // UI Audios helper
  const playClick = () => {
    ContextualAudioManager.getInstance().init();
    ContextualAudioManager.getInstance().playUiClick();
  };

  // --- CLOCK TICKER EFFECTS ---
  useEffect(() => {
    const timer = setInterval(() => {
      // 1. Ferry schedule ticker
      setFerrySchedule((prev) => {
        if (prev.timeLeft <= 1) {
          let nextStatus: typeof prev.status = "À Cap-Santé";
          if (prev.status === "À Cap-Santé") nextStatus = "En mer";
          else if (prev.status === "En mer") nextStatus = "À Saint-Nicolas (Rive Sud)";
          else nextStatus = "À Cap-Santé";
          return { status: nextStatus, timeLeft: 45 };
        }
        return { ...prev, timeLeft: prev.timeLeft - 1 };
      });

      // 2. Prison sentence & probation ticker (local visual countdown predictor)
      setPrisonState((prev) => {
        if (prev.status === "Incarcéré" && prev.sentenceSeconds > 0) {
          if (prisonWorkActive) {
            setPrisonWorkProgress((prog) => {
              const speed = prisonWorkType === "wash" ? 15 : prisonWorkType === "rocks" ? 25 : 8;
              const nextProg = prog + speed;
              if (nextProg >= 100) {
                fetch("/api/prison/work", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ workType: prisonWorkType })
                })
                  .then((res) => res.json())
                  .then((data) => {
                    if (data.success) {
                      setRehabilitationPoints(data.playerPrisonState.rehabilitationPoints);
                      setPrisonState({
                        status: data.playerPrisonState.status,
                        sentenceSeconds: data.playerPrisonState.sentenceSeconds,
                        crime: data.playerPrisonState.crime
                      });
                      onAddServerLog(`[Donnacona] Travaux d'intérêt général complétés (+3 Points Réhabilitation, -3s de peine).`);
                    }
                  })
                  .catch((err) => console.error(err));
                return 0;
              }
              return nextProg;
            });
          }
          return { ...prev, sentenceSeconds: Math.max(0, prev.sentenceSeconds - 1) };
        }
        return prev;
      });

      // 2b. Probation / Parole countdown ticker
      setProbationSeconds((prev) => (prev > 0 ? prev - 1 : 0));

      // 2c. Simulated Inmates countdown
      setSimulatedInmates((prev) => {
        return prev.map((inmate) => {
          if (inmate.sentenceLeft > 0) {
            return { ...inmate, sentenceLeft: inmate.sentenceLeft - 1 };
          }
          return inmate;
        });
      });

      // 2d. Police dispatch / Patrol countdown ticker
      setPoliceDispatchTime((prev) => {
        if (prev > 0) {
          if (prev === 1) {
            let rewardMsg = "";
            let rev = 200;
            let rep = 15;
            if (policeDispatchMode === "patrol_138") {
              rewardMsg = "Patrouille Route 138 terminée. Excès de vitesse saisis. Trésor municipal: +350$, Réputation SQ +15.";
              rev = 350;
              rep = 15;
            } else if (policeDispatchMode === "patrol_roy") {
              rewardMsg = "Patrouille Chemin du Roy terminée. Délinquance locale prévenue. Trésor municipal: +200$, Réputation SQ +25.";
              rev = 200;
              rep = 25;
            } else if (policeDispatchMode === "picket_line") {
              rewardMsg = "Négociation de grève complétée. Le calme revient. Réputation syndicale +30.";
              rev = 0;
              rep = 30;
              setUnionStrike((strike) => ({ ...strike, isStriking: false }));
            }
            onAddServerLog(`[Sûreté du Québec] ${rewardMsg}`);
            recordActionForReplay(`Patrouille SQ complétée: ${policeDispatchMode}`);
            setVillages((vils) => {
              return vils.map((v, idx) => {
                if (idx === 0) { // Main town Deschambault
                  return { ...v, budget: v.budget + rev, reputation: v.reputation + rep };
                }
                return v;
              });
            });
            setPoliceDispatchMode("idle");
            return 0;
          }
          return prev - 1;
        }
        return 0;
      });

      // 3. Simulated random fire outbreak if none active
      if (Math.random() < 0.05 && !activeFire) {
        const spots = ["Cabane à sucre de Neuville", "Atelier Mécanique Cap-Santé", "Carrières St-Marc"];
        const randSpot = spots[Math.floor(Math.random() * spots.length)];
        setActiveFire({
          location: randSpot,
          intensity: 60 + Math.floor(Math.random() * 40),
          gps: `46.${Math.floor(Math.random() * 9000)}° N, 71.${Math.floor(Math.random() * 9000)}° W`
        });
        onAddServerLog(`[Centrale 911] ALERTE INCENDIE : Feu détecté à ${randSpot}.`);
      }

      // 4. Sugar Shack heat dissipation
      if (isBoiling) {
        setSugarHeat((prev) => {
          const shift = Math.random() * 8 - 4;
          const target = prev + shift - 1; // gradual decline if not stoked
          return Math.max(20, Math.min(150, Math.round(target)));
        });

        // boiling process usage of sap
        setSapReservoir((prev) => {
          if (prev <= 0) {
            setIsBoiling(false);
            return 0;
          }
          setSyrupProduced((s) => s + 0.1);
          return Math.max(0, +(prev - 0.5).toFixed(1));
        });
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [isBoiling, activeFire, onAddServerLog]);

  // Poll prison state from server to maintain real-time sync with backend calculations
  useEffect(() => {
    let active = true;
    const fetchPrisonState = async () => {
      try {
        const res = await fetch("/api/prison/state");
        if (res.ok && active) {
          const data = await res.json();
          if (data.playerPrisonState) {
            setPrisonState({
              status: data.playerPrisonState.status,
              sentenceSeconds: data.playerPrisonState.sentenceSeconds,
              crime: data.playerPrisonState.crime
            });
            setOriginalSentence(data.playerPrisonState.originalSentence);
            setRehabilitationPoints(data.playerPrisonState.rehabilitationPoints);
            setParoleStatus(data.playerPrisonState.paroleStatus);
            setProbationSeconds(data.playerPrisonState.probationSeconds);
            setTunnelProgress(data.playerPrisonState.tunnelProgress);
            setPrisonTension(data.playerPrisonState.prisonTension);
            if (data.playerPrisonState.cellId) {
              setPrisonCellId(data.playerPrisonState.cellId);
            }
          }
          if (data.simulatedInmates) {
            setSimulatedInmates(data.simulatedInmates);
          }
          if (data.escapeAuditLogs) {
            setServerEscapeLogs(data.escapeAuditLogs);
          }
        }
      } catch (err) {
        console.error("Failed to fetch prison state from server:", err);
      }
    };

    fetchPrisonState();
    const pollInterval = setInterval(fetchPrisonState, 2000);
    return () => {
      active = false;
      clearInterval(pollInterval);
    };
  }, []);

  // Handle active job actions progress timers
  useEffect(() => {
    if (isChopping) {
      const interval = setInterval(() => {
        setChopProgress((p) => {
          if (p >= 100) {
            setIsChopping(false);
            const hasAxe = inventory.axe_upgrade > 0;
            const lumberGain = hasAxe ? 2 : 1;
            const cashGain = hasAxe ? 90 : 45;
            setInventory((inv) => ({ ...inv, wood_lumber: (inv.wood_lumber || 0) + lumberGain }));
            setCash((c) => c + cashGain);
            ContextualAudioManager.getInstance().playCashRegister();
            onAddServerLog(`[Économie Lumberjack] Bûchage terminé. Bois récolté (${hasAxe ? "Hache d'acier" : "Hache standard"}). Gain: +${cashGain}$ CAD.`);
            recordActionForReplay(`Abattage d'arbre dans le bois de St-Raymond (+${cashGain}$)`);
            return 0;
          }
          ContextualAudioManager.getInstance().playWoodChop();
          return p + 20;
        });
      }, 150);
      return () => clearInterval(interval);
    }
  }, [isChopping, inventory.axe_upgrade]);

  // Handle Limestone Quarrying
  useEffect(() => {
    if (isQuarrying) {
      const interval = setInterval(() => {
        setQuarryProgress((p) => {
          if (p >= 100) {
            setIsQuarrying(false);
            setInventory((inv) => ({ ...inv, limestone: (inv.limestone || 0) + 1 }));
            onAddServerLog("[Carrière St-Marc] Extraction réussie. +1 Calcaire ajouté à l'inventaire.");
            recordActionForReplay("Extraction de calcaire à St-Marc");
            return 0;
          }
          ContextualAudioManager.getInstance().playHammerStrike();
          return p + 25;
        });
      }, 250);
      return () => clearInterval(interval);
    }
  }, [isQuarrying]);

  // Handle Smuggling runs
  useEffect(() => {
    if (isSmuggling) {
      const interval = setInterval(() => {
        setSmuggleProgress((p) => {
          if (p >= 100) {
            setIsSmuggling(false);
            const hasAlambic = inventory.alambic_upgrade > 0;
            const factor = hasAlambic ? 300 : 180;
            const totalEarnings = smuggleCargo * factor;
            setCash((c) => c + totalEarnings);
            setInventory((inv) => ({ ...inv, smuggled_ether: 0 }));
            ContextualAudioManager.getInstance().playCashRegister();
            onAddServerLog(`[Marché Noir] Livraison réussie à Deschambault! Gain: +${totalEarnings}$ CAD (${hasAlambic ? "Alambic raffiné" : "Éther brut"}).`);
            recordActionForReplay(`Livraison contrebande réussie (+${totalEarnings}$)`);
            setSmuggleCargo(0);
            return 0;
          }
          // Random police checkpoint check during transport
          if (p === 40 || p === 80) {
            const caught = Math.random() * 100 < suspicionLevel;
            if (caught) {
              setIsSmuggling(false);
              setSmuggleCargo(0);
              incarceratePlayer(30, "Contrebande de matières illégales d'EtherPrism");
              setSuspicionLevel((s) => Math.max(10, s - 30));
              ContextualAudioManager.getInstance().playPoliceSiren();
              onAddServerLog("[Centrale 911] ARRESTATION : Contrebandier appréhendé sur le Chemin du Roy.");
              recordActionForReplay("Arrestation par la Sûreté du Québec");
              return 0;
            } else {
              onAddServerLog("[ThirdEye Sensors] Checkpoint franchi avec succès sans détection.");
            }
          }
          ContextualAudioManager.getInstance().playCarSkid();
          return p + 10;
        });
      }, 500);
      return () => clearInterval(interval);
    }
  }, [isSmuggling, smuggleCargo, suspicionLevel]);

  // --- DESJARDINS ADVANCED HEIST TICKER ---
  useEffect(() => {
    if (heistStep === "none" || heistStep === "complete") return;

    const interval = setInterval(() => {
      // 1. Bypass State Tick
      if (heistStep === "bypass" && heistActionActive) {
        setHeistProgress((p) => {
          const diff = Math.abs(bypassCurrentFreq - bypassTargetFreq);
          if (diff <= 1.0) {
            // Signal matches perfectly!
            if (p >= 100) {
              clearInterval(interval);
              setHeistStep("drill");
              setHeistProgress(0);
              setHeistActionActive(false);
              onAddServerLog("[Braquage Desjardins] SUCCÈS BYPASS 311-4141 : Les capteurs thermiques et d'alarme de la Caisse sont aveuglés!");
              recordActionForReplay("Bypass alarme 311-4141");
              return 0;
            }
            // Increment progress
            return p + 10;
          } else {
            // Poor frequency alignment - can cause random suspicion
            if (Math.random() < 0.25) {
              setSuspicionLevel((s) => Math.min(100, s + 5));
              onAddServerLog("[Centrale 311-4141] AVERTISSEMENT : Activité réseau inhabituelle détectée sur la ligne d'alarme.");
            }
            return p;
          }
        });
      }

      // 2. Drill State Tick
      if (heistStep === "drill" && heistActionActive) {
        // Temperature rises based on pressure (Oxygen Feed)
        setDrillTemp((prev) => {
          const heating = drillSpeedBoost * 0.25;
          const cooling = 4.5; // continuous ambient cooling
          const nextTemp = Math.round(prev + heating - cooling);
          const finalTemp = Math.max(35, Math.min(200, nextTemp));

          if (finalTemp >= 135) {
            // EXPLOSION / OVERHEAT
            setAlarm311_4141Triggered(true);
            setPoliceStars((s) => Math.min(5, s + 1));
            ContextualAudioManager.getInstance().playAlarmBell();
            onAddServerLog("[Braquage Desjardins] !!! ALERTE SURCHAUFFE !!! La perceuse thermique a fondu! Alarme 311-4141 déclenchée.");
            recordActionForReplay("Surchauffe perceuse Desjardins");
            return 70; // reset temp to stable hot
          }
          return finalTemp;
        });

        // Progress based on temperature
        setHeistProgress((p) => {
          let gain = 0;
          if (drillTemp >= 80 && drillTemp <= 115) {
            gain = 8; // Optimal zone!
          } else if (drillTemp > 115) {
            gain = 12; // Extremely fast but heating is dangerous
          } else {
            gain = 2; // Too cold
          }

          if (p + gain >= 100) {
            clearInterval(interval);
            setHeistStep("combination");
            setHeistProgress(0);
            setHeistActionActive(false);
            // Random combination values
            const val1 = 10 + Math.floor(Math.random() * 80);
            const val2 = 10 + Math.floor(Math.random() * 80);
            const val3 = 10 + Math.floor(Math.random() * 80);
            setCombinationTarget([val1, val2, val3]);
            onAddServerLog("[Braquage Desjardins] Étape 2 terminée : Porte en acier transpercée! Accès au cadran mécanique de haute sécurité.");
            recordActionForReplay("Perçage de porte réussi");
            return 0;
          }
          return p + gain;
        });
      }

      // 3. Pillage Timer Tick
      if (heistStep === "pillage" && heistActionActive) {
        setPillageSecLeft((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            setHeistStep("escape");
            setHeistProgress(0);
            setHeistActionActive(true); // Auto-trigger escape chase
            setAlarm311_4141Triggered(true);
            setPoliceStars(5); // Maximum alarm!
            setPoliceChaseDistance(45); // Police right behind
            onAddServerLog("[Sûreté du Québec] !!! ALERTE INTRUSION !!! Unités tactiques en intervention immédiate sur place!");
            recordActionForReplay("Pris en flagrant délit Caisse Desjardins");
            return 0;
          }
          return prev - 1;
        });
      }

      // 4. Escape Chase Tick
      if (heistStep === "escape" && heistActionActive) {
        // Player speed based on route
        let speed = 6;
        if (escapeRoute === "route138") speed = 14;
        else if (escapeRoute === "cheminduroy") speed = 9;
        else if (escapeRoute === "casserole") {
          speed = 6;
          // Random break check
          if (Math.random() < 0.15) {
            speed = 0;
            onAddServerLog("[Poursuite SQ] Enlisement temporaire dans le Rang de la Casserole!");
          }
        } else if (escapeRoute === "ferry") {
          if (ferrySchedule.status === "À Cap-Santé") {
            // Escape instantly!
            setCash((c) => c + lootBagValue);
            if (stolenPrisms > 0) {
              setInventory((inv) => ({ ...inv, smuggled_ether: inv.smuggled_ether + stolenPrisms }));
            }
            setHeistStep("complete");
            setHeistProgress(100);
            setHeistActionActive(false);
            setPoliceStars(1);
            onAddServerLog(`[Braquage] ESCAPE REUSSIE! Le traversier a largué les amarres vers la rive sud! Gain: +${lootBagValue}$ CAD.`);
            recordActionForReplay(`Fuite parfaite par traversier (+${lootBagValue}$)`);
            clearInterval(interval);
            return;
          } else {
            speed = 2; // waiting
            onAddServerLog("[Poursuite SQ] En attente du traversier de Cap-Santé sous le feu des policiers!");
          }
        }

        // Increase escape progress
        setHeistProgress((p) => {
          if (p + speed >= 100) {
            clearInterval(interval);
            // Cash added!
            setCash((c) => c + lootBagValue);
            if (stolenPrisms > 0) {
              setInventory((inv) => ({ ...inv, smuggled_ether: inv.smuggled_ether + stolenPrisms }));
            }
            setHeistStep("complete");
            setHeistProgress(100);
            setHeistActionActive(false);
            setPoliceStars(1);
            onAddServerLog(`[Braquage] ESCAPE REUSSIE! Vous avez semé les patrouilles sur le territoire de Portneuf. Gain: +${lootBagValue}$ CAD.`);
            recordActionForReplay(`Braquage complété (+${lootBagValue}$)`);
            return 100;
          }
          return p + speed;
        });

        // Police chase increases
        setPoliceChaseDistance((chase) => {
          // Police speed increases with stars and loot weight
          const basePoliceSpeed = alarm311_4141Triggered ? 7 : 4;
          const policeSpeed = basePoliceSpeed + (policeStars * 1.5) + (lootWeight * 0.4);
          const nextChase = chase + policeSpeed;

          if (nextChase >= 100) {
            clearInterval(interval);
            // BUSTED!
            setHeistStep("none");
            setHeistProgress(0);
            setHeistActionActive(false);
            setLootBagValue(0);
            setStolenPrisms(0);
            setLootWeight(0);
            incarceratePlayer(45 + (policeStars * 15), "Braquage de la Caisse Desjardins et délit de fuite Route 138");
            setPoliceStars(1);
            ContextualAudioManager.getInstance().playPoliceSiren();
            onAddServerLog("[Sûreté du Québec] MENOTTES : Pincé en flagrant délit de fuite! Tout le butin est confisqué.");
            recordActionForReplay("Arrestation fin de course Desjardins");
            return 0;
          }
          return nextChase;
        });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [
    heistStep,
    heistActionActive,
    bypassCurrentFreq,
    bypassTargetFreq,
    drillTemp,
    drillSpeedBoost,
    escapeRoute,
    policeStars,
    lootWeight,
    lootBagValue,
    stolenPrisms,
    ferrySchedule,
    alarm311_4141Triggered
  ]);

  // --- JOB HANDLERS ---
  const handleChopTree = () => {
    if (activeJob !== "Bûcheron") {
      onAddServerLog("[Erreur Métier] Vous devez porter l'archétype Bûcheron pour couper du bois.");
      return;
    }
    if (prisonState.status === "Incarcéré") return;
    playClick();
    setIsChopping(true);
    setChopProgress(0);
  };

  const handleSellWood = () => {
    if (inventory.wood_lumber <= 0) return;
    playClick();
    const count = inventory.wood_lumber;
    const gain = count * 35;
    setCash((c) => c + gain);
    setInventory((inv) => ({ ...inv, wood_lumber: 0 }));
    ContextualAudioManager.getInstance().playCashRegister();
    onAddServerLog(`[Marché] Vente de ${count} bûche(s) de bois d'œuvre au moulin de St-Raymond. Gain: +${gain}$ CAD.`);
    recordActionForReplay(`Vente de bois au moulin de St-Raymond (+${gain}$)`);
  };

  const handleDonateWoodToSugarShack = () => {
    if (inventory.wood_lumber <= 0) return;
    playClick();
    const count = inventory.wood_lumber;
    setSapReservoir((prev) => prev + count * 15);
    setInventory((inv) => ({ ...inv, wood_lumber: 0 }));
    onAddServerLog(`[Cabane à sucre] ${count} bûche(s) livrée(s) à Neuville. Réservoir augmenté de +${count * 15} Litres d'eau d'érable.`);
    recordActionForReplay(`Don de bois à la Cabane à Sucre`);
  };

  const handleQuarryLimestone = () => {
    if (prisonState.status === "Incarcéré") return;
    playClick();
    setIsQuarrying(true);
    setQuarryProgress(0);
  };

  const handleAcériculteurStoke = () => {
    if (activeJob !== "Acériculteur") return;
    playClick();
    setSugarHeat((h) => Math.min(150, h + 20));
    onAddServerLog("[Cabane à sucre] Vous avez alimenté le poêle à bois. La température monte.");
    recordActionForReplay("Alimentation poêle cabane à sucre");
  };

  const handleAcériculteurBoil = () => {
    if (activeJob !== "Acériculteur") return;
    if (sapReservoir <= 0) {
      onAddServerLog("[Cabane à sucre] Réservoir d'eau d'érable vide.");
      return;
    }
    playClick();
    setIsBoiling(!isBoiling);
  };

  const handleSellMapleSyrup = () => {
    if (activeJob !== "Acériculteur") return;
    if (syrupProduced < 1) {
      onAddServerLog("[Marché Deschambault] Pas assez de sirop d'érable prêt.");
      return;
    }
    playClick();
    const cashYield = Math.floor(syrupProduced) * 85;
    setCash((c) => c + cashYield);
    setSyrupProduced((s) => s - Math.floor(s));
    ContextualAudioManager.getInstance().playCashRegister();
    onAddServerLog(`[Marché] Vente de sirop d'érable réussie au marché de Deschambault. Gain: +${cashYield}$ CAD.`);
    recordActionForReplay(`Vente de sirop d'érable (+${cashYield}$)`);
  };

  const handleExtinguishFire = () => {
    if (activeJob !== "Pompier" || !activeFire) return;
    playClick();
    const factor = inventory.extinguisher_upgrade > 0 ? 35 : 20;
    setActiveFire((prev) => {
      if (!prev) return null;
      const nextIntensity = prev.intensity - factor;
      if (nextIntensity <= 0) {
        setCash((c) => c + 150);
        ContextualAudioManager.getInstance().playCashRegister();
        onAddServerLog(`[Service des Incendies] Feu éteint avec succès à ${prev.location}. Prime d'intervention: +150$ CAD.`);
        recordActionForReplay(`Extinction incendie à ${prev.location} (+150$)`);
        return null;
      }
      return { ...prev, intensity: nextIntensity };
    });
    ContextualAudioManager.getInstance().playMapleBoil(); // sounds like water hiss
  };

  const handleRepairVehicleStep = () => {
    if (activeJob !== "Mécanicien" || !vehicleUnderRepair) return;
    playClick();
    ContextualAudioManager.getInstance().playHammerStrike();
    const nextIdx = vehicleUnderRepair.currentTaskIdx + 1;
    if (nextIdx >= vehicleUnderRepair.tasks.length) {
      const hasBrakeUpgrade = inventory.brake_upgrade > 0;
      const payment = hasBrakeUpgrade ? 260 : 180;
      setCash((c) => c + payment);
      ContextualAudioManager.getInstance().playCashRegister();
      onAddServerLog(`[Garage Mécanique] Réparation terminée pour le véhicule de ${vehicleUnderRepair.owner}. Gain: +${payment}$ CAD (${hasBrakeUpgrade ? "Plaquettes Céramique" : "Plaquettes standard"}).`);
      recordActionForReplay(`Réparation motoneige complétée (+${payment}$)`);
      setVehicleUnderRepair(null);
    } else {
      setVehicleUnderRepair({
        ...vehicleUnderRepair,
        damage: Math.max(0, vehicleUnderRepair.damage - 20),
        currentTaskIdx: nextIdx
      });
      onAddServerLog(`[Garage] Tâche complétée : ${vehicleUnderRepair.tasks[vehicleUnderRepair.currentTaskIdx]}.`);
    }
  };

  const handleSpawnNewRepairJob = () => {
    playClick();
    const clients = [
      { owner: "Sylvie Dion", model: "Chevrolet Silverado V8 Heavy Duty", tasks: ["Changer freins", "Remplacer alternateur", "Vérification suspension"] },
      { owner: "Major Lévesque", model: "Cruiser Sûreté du Québec Patrol", tasks: ["Installer sirène", "Calibrer GPS", "Réalignement pare-chocs"] }
    ];
    const pick = clients[Math.floor(Math.random() * clients.length)];
    setVehicleUnderRepair({
      model: pick.model,
      owner: pick.owner,
      damage: 70,
      tasks: pick.tasks,
      currentTaskIdx: 0
    });
    onAddServerLog(`[Garage Mécanique] Nouveau bon de travail assigné : ${pick.model} de ${pick.owner}.`);
  };

  const handleStartTaxiFare = () => {
    if (activeJob !== "Chauffeur taxi") return;
    playClick();
    const destinations = ["Saint-Raymond", "Neuville", "Cap-Santé", "Deschambault"];
    const from = destinations[Math.floor(Math.random() * destinations.length)];
    let to = destinations[Math.floor(Math.random() * destinations.length)];
    while (to === from) {
      to = destinations[Math.floor(Math.random() * destinations.length)];
    }
    const dist = +(2 + Math.random() * 8).toFixed(1);
    const price = Math.round(dist * 18 + 15);
    setTaxiFare({
      passenger: ["Jean-Pierre", "Manon", "Gervais", "Chantal"][Math.floor(Math.random() * 4)],
      from,
      to,
      distanceKm: dist,
      progress: 0,
      farePrice: price
    });
    onAddServerLog(`[GPS Taxi] Course acceptée : Conduire ${passengerName(0)} de ${from} vers ${to}.`);
  };

  const handleProgressTaxi = () => {
    if (!taxiFare) return;
    playClick();
    ContextualAudioManager.getInstance().playCarSkid();
    setTaxiFare((prev) => {
      if (!prev) return null;
      const nextP = prev.progress + 25;
      if (nextP >= 100) {
        setCash((c) => c + prev.farePrice);
        ContextualAudioManager.getInstance().playCashRegister();
        onAddServerLog(`[Taxi] Client déposé à ${prev.to}. Reçu: +${prev.farePrice}$ CAD.`);
        recordActionForReplay(`Course taxi complétée vers ${prev.to} (+${prev.farePrice}$)`);
        return null;
      }
      return { ...prev, progress: nextP };
    });
  };

  const passengerName = (x: number) => ["Jean-Pierre", "Manon", "Gervais", "Chantal"][x];

  const handleDefendClientLegal = () => {
    if (activeJob !== "Avocat" || !activeClient) return;
    playClick();
    const success = Math.random() > 0.45;
    if (success) {
      setCash((c) => c + 400);
      ContextualAudioManager.getInstance().playCashRegister();
      onAddServerLog(`[Palais de Justice Donnacona] Acquittement prononcé pour ${activeClient.name}! Honoraires reçus: +400$ CAD.`);
      recordActionForReplay(`Acquittement légal réussi pour ${activeClient.name} (+400$)`);
      setActiveClient(null);
    } else {
      onAddServerLog(`[Procès] Demande rejetée par le procureur de la Cour municipale de Portneuf.`);
    }
  };

  // --- CRIME HANDLERS ---
  const handleBuyBlackMarketItem = (itemKey: string, cost: number) => {
    if (checkParoleViolation()) return;
    if (cash < cost) {
      onAddServerLog("[Marché Noir] Fonds insuffisants (cash requis pour transactions anonymes).");
      return;
    }
    playClick();
    setCash((c) => c - cost);
    setInventory((inv) => ({ ...inv, [itemKey]: inv[itemKey] + 1 }));
    setSuspicionLevel((s) => Math.min(100, s + 15));
    onAddServerLog(`[Marché Noir] Achat discret effectué. Suspicion accrue.`);
    recordActionForReplay(`Achat marché noir: ${itemKey}`);
  };

  const handleStartSmugglingRun = () => {
    if (checkParoleViolation()) return;
    if (inventory.smuggled_ether <= 0) {
      onAddServerLog("[Contrebande] Vous n'avez pas de Prisme d'éther de contrebande dans votre inventaire.");
      return;
    }
    playClick();
    setSmuggleCargo(inventory.smuggled_ether);
    setIsSmuggling(true);
    setSmuggleProgress(0);
    onAddServerLog("[Contrebande] Camion chargé. Lancement de la route vers Deschambault via la Route 138.");
    recordActionForReplay("Départ transport de contrebande");
  };

  // --- ADVANCED HEIST PIPELINE ACTIONS ---
  const handleStartHeist = () => {
    if (checkParoleViolation()) return;
    if (prisonState.status === "Incarcéré") return;
    playClick();
    setHeistStep("bypass");
    setHeistProgress(0);
    setHeistActionActive(true);
    setAlarm311_4141Triggered(false);
    setPoliceStars(1);
    setPoliceChaseDistance(0);
    setBypassTargetFreq(+(35 + Math.random() * 10).toFixed(1));
    setBypassCurrentFreq(30.0);
    setBypassStableSeconds(0);
    setDrillTemp(40);
    setDrillSpeedBoost(50);
    setDrillWaterRefills(3);
    setCombinationStep(0);
    setCombinationDial(0);
    setLootBagValue(0);
    setLootWeight(0);
    setStolenPrisms(0);
    setPillageSecLeft(35);
    onAddServerLog("[Braquage Desjardins] Opération initialisée. Étape 1 : Bypass de la ligne d'alarme 311-4141 de la SQ.");
    recordActionForReplay("Initialisation du Braquage Desjardins");
  };

  const handleTuneBypassFreq = (val: number) => {
    setBypassCurrentFreq(val);
  };

  const handleForceBypass = () => {
    playClick();
    const success = Math.random() < 0.35;
    if (success) {
      setHeistStep("drill");
      setHeistProgress(0);
      setHeistActionActive(false);
      onAddServerLog("[Braquage Desjardins] Bypass CHANCEUX! La ligne 311-4141 a été coupée sans retour d'onde.");
      recordActionForReplay("Bypass chanceux alarme 311-4141");
    } else {
      setAlarm311_4141Triggered(true);
      setPoliceStars(3);
      setHeistStep("drill");
      setHeistProgress(0);
      setHeistActionActive(false);
      ContextualAudioManager.getInstance().playAlarmBell();
      onAddServerLog("[Centrale 311-4141] !!! ALARME DÉCLENCHÉE !!! Échec du bypass de sécurité. SQ en route.");
      recordActionForReplay("Échec bypass alarme Desjardins");
    }
  };

  const handleSetDrillPressure = (val: number) => {
    setDrillSpeedBoost(val);
  };

  const handleCoolDrill = () => {
    if (drillWaterRefills <= 0) {
      onAddServerLog("[Perceuse] Plus d'eau de refroidissement disponible!");
      return;
    }
    playClick();
    setDrillWaterRefills((r) => r - 1);
    setDrillTemp((t) => Math.max(35, t - 45));
    onAddServerLog("[Perceuse] Eau aspergée sur le foret de la perceuse thermique (-45°C).");
  };

  const handleRotateCombinationDial = (val: number) => {
    setCombinationDial(val);
  };

  const handleValidateCombinationNumber = () => {
    playClick();
    const target = combinationTarget[combinationStep];
    const diff = Math.abs(combinationDial - target);

    if (diff <= 1.5) {
      // Correct!
      const nextStep = combinationStep + 1;
      if (nextStep >= 3) {
        setHeistStep("pillage");
        setHeistProgress(0);
        setHeistActionActive(true); // Start countdown
        setPillageSecLeft(35);
        onAddServerLog("[Braquage Desjardins] CLIC FINAL! Le mécanisme à disques s'ouvre. Accès aux dépôts sacrés!");
        recordActionForReplay("Ouverture coffre Desjardins");
      } else {
        setCombinationStep(nextStep);
        onAddServerLog(`[Braquage Desjardins] Déclic mécanique audible. Chiffre ${combinationStep + 1} validé!`);
        recordActionForReplay(`Combinaison étape ${combinationStep + 1} trouvée`);
      }
    } else {
      // Wrong number
      onAddServerLog("[Braquage Desjardins] Le cadran tourne dans le vide... Mauvais chiffre de combinaison.");
      // Increases alert level if alarm is already triggered
      if (alarm311_4141Triggered) {
        setPoliceChaseDistance((d) => Math.min(100, d + 8));
      }
    }
  };

  const handlePillageItem = (itemKey: "cash" | "gold" | "ether") => {
    playClick();
    if (itemKey === "cash") {
      setLootBagValue((v) => v + 550);
      setLootWeight((w) => w + 1.2);
      onAddServerLog("[Coffre] Fiasque de billets Desjardins glissée dans le sac (+550$, +1.2kg).");
    } else if (itemKey === "gold") {
      setLootBagValue((v) => v + 1200);
      setLootWeight((w) => w + 4.8);
      setPoliceStars((s) => Math.min(5, s + 1));
      onAddServerLog("[Coffre] Lingot d'or massif de Cap-Santé empoché (+1200$, +4.8kg, +1 Étoile SQ).");
    } else if (itemKey === "ether") {
      setLootBagValue((v) => v + 1800);
      setLootWeight((w) => w + 2.5);
      setStolenPrisms((p) => p + 1);
      onAddServerLog("[Coffre] Prisme d'Éther Brut scellé arraché du piédestal (+1800$, +2.5kg d'éther récolté).");
    }
  };

  const handleStartEscape = () => {
    playClick();
    setHeistStep("escape");
    setHeistProgress(0);
    setHeistActionActive(true);
    // If alarm wasn't triggered yet, it triggers now as we leave the bank!
    if (!alarm311_4141Triggered) {
      setAlarm311_4141Triggered(true);
      setPoliceStars((s) => Math.max(3, s));
      setPoliceChaseDistance(15);
      onAddServerLog("[Centrale 311-4141] ALARME EN COURS : Fuite du suspect détectée par détecteurs volumétriques.");
    } else {
      // Already triggered, police is closer!
      setPoliceChaseDistance(35);
    }
    onAddServerLog(`[Braquage Desjardins] Fuite entamée par la route : ${escapeRoute === "route138" ? "Route Nationale 138" : escapeRoute === "cheminduroy" ? "Chemin du Roy historique" : escapeRoute === "casserole" ? "Rang de la Casserole" : "Traversier du fleuve"}.`);
    recordActionForReplay("Lancement de la course poursuite");
  };

  const handleJettisonLoot = () => {
    if (lootBagValue <= 400) {
      onAddServerLog("[Poursuite SQ] Rien à jeter d'autre, le sac est vide!");
      return;
    }
    playClick();
    setLootBagValue((v) => Math.max(0, Math.round(v * 0.7)));
    setLootWeight((w) => Math.max(0, +(w * 0.6).toFixed(1)));
    setPoliceChaseDistance((d) => Math.max(5, d - 18));
    onAddServerLog("[Poursuite SQ] Vous jetez une partie du butin par la fenêtre pour semer la patrouille (-30% valeur, -40% poids).");
  };

  const handleJamRadio = () => {
    if (suspicionLevel < 25) {
      onAddServerLog("[Poursuite SQ] Suspicion trop basse pour simuler un faux appel de brouillage.");
      return;
    }
    playClick();
    setSuspicionLevel((s) => Math.max(0, s - 25));
    setPoliceChaseDistance((d) => Math.max(5, d - 22));
    onAddServerLog("[Poursuite SQ] Faux rapport anonyme loggé au 311-4141. Les patrouilles de la SQ bifurquent temporairement vers Saint-Raymond.");
  };

  const handleInjectEtherFuel = () => {
    if (inventory.ether_fuel <= 0) {
      onAddServerLog("[Poursuite SQ] Pas d'éther-fuel disponible dans votre inventaire. Fabriquez-en!");
      return;
    }
    playClick();
    setInventory((inv) => ({ ...inv, ether_fuel: inv.ether_fuel - 1 }));
    setHeistProgress((p) => Math.min(100, p + 25));
    onAddServerLog("[Poursuite SQ] Super-Carburant d'Éther injecté dans le bloc moteur! Accélération de +25% de fuite.");
  };

  const handleResetHeist = () => {
    playClick();
    setHeistStep("none");
    setHeistProgress(0);
    setHeistActionActive(false);
    setAlarm311_4141Triggered(false);
    setPoliceStars(1);
    setPoliceChaseDistance(0);
    setLootBagValue(0);
    setLootWeight(0);
    setStolenPrisms(0);
  };

  // --- LOTO QUÉBEC DRAW ---
  const handleBuyLotoTicket = () => {
    if (cash < 10) {
      onAddServerLog("[Loto-Québec] Pas assez de cash pour acheter un billet.");
      return;
    }
    playClick();
    setCash((c) => c - 10);
    setInventory((inv) => ({ ...inv, lotto_ticket: inv.lotto_ticket + 1 }));
    onAddServerLog("[Loto-Québec] Billet de tirage acheté au Dépanneur / SAQ. Tirage imminent!");
  };

  const handleSimulateLotoDraw = () => {
    if (inventory.lotto_ticket <= 0) {
      onAddServerLog("[Loto-Québec] Vous n'avez pas de billet pour ce tirage.");
      return;
    }
    playClick();
    const winChance = Math.random() < 0.25; // 25% chance of winning jackpot
    setInventory((inv) => ({ ...inv, lotto_ticket: inv.lotto_ticket - 1 }));

    if (winChance) {
      const jackpot = 1500;
      setCash((c) => c + jackpot);
      setLottoWinnerAnnounced("GAGNANT");
      ContextualAudioManager.getInstance().playCashRegister();
      onAddServerLog(`[Loto-Québec] FÉLICITATIONS! Vous avez remporté le gros lot hebdomadaire de +1500$ CAD!`);
      recordActionForReplay("Gros lot Loto-Québec remporté (+1500$)");
    } else {
      setLottoWinnerAnnounced("PERDANT");
      onAddServerLog("[Loto-Québec] Désolé, votre billet n'est pas gagnant pour ce tirage. Retentez votre chance!");
    }
    setTimeout(() => setLottoWinnerAnnounced(null), 3000);
  };

  // --- CRAFTING PIPELINE ---
  const handleCraftItem = (recipe: {
    name: string;
    inputs: Record<string, number>;
    output: Record<string, number>;
  }) => {
    // Check ingredients
    const canCraft = Object.entries(recipe.inputs).every(
      ([item, qty]) => inventory[item] >= qty
    );

    if (!canCraft) {
      onAddServerLog("[Système d'artisanat] Matériaux insuffisants pour assembler cette recette.");
      return;
    }

    playClick();
    ContextualAudioManager.getInstance().playHammerStrike();

    // Consume & Add
    setInventory((inv) => {
      const nextInv = { ...inv };
      Object.entries(recipe.inputs).forEach(([item, qty]) => {
        nextInv[item] -= qty;
      });
      Object.entries(recipe.output).forEach(([item, qty]) => {
        nextInv[item] = (nextInv[item] || 0) + qty;
      });
      return nextInv;
    });

    onAddServerLog(`[Craft System] Fabrication réussie : ${recipe.name}.`);
    recordActionForReplay(`Fabrication d'item: ${recipe.name}`);
  };

  const CRAFT_RECIPES = [
    {
      name: "Sirop d'Érable Artisanal",
      inputs: { maple_sap: 3 },
      output: { maple_syrup: 1 }
    },
    {
      name: "Lance d'Incendie Renforcée",
      inputs: { wood_lumber: 2, limestone: 1 },
      output: { extinguisher_upgrade: 1 }
    },
    {
      name: "Super-Carburant d'Éther",
      inputs: { wood_lumber: 1, smuggled_ether: 1 },
      output: { ether_fuel: 1 }
    }
  ];

  // --- MAYOR & ELECTIONS ---
  const handleCampaignForMayor = (villageIdx: number) => {
    const cost = 800;
    const village = villages[villageIdx];
    if (cash < cost) {
      onAddServerLog("[Mairie] Fonds de campagne électorale insuffisants (800$ requis).");
      return;
    }
    if (village.reputation < 30) {
      onAddServerLog(`[Mairie] Réputation locale insuffisante à ${village.name}. Gagnez la confiance du village d'abord.`);
      return;
    }
    playClick();
    setCash((c) => c - cost);
    setVillages((prev) => {
      const copy = [...prev];
      copy[villageIdx] = {
        ...copy[villageIdx],
        mayor: "Moi-Même 👑",
        budget: copy[villageIdx].budget + 1500
      };
      return copy;
    });
    onAddServerLog(`[Élections Portneuf] ÉLU! Vous êtes désigné Maire officiel de ${village.name}.`);
    recordActionForReplay(`Élu Maire de ${village.name}`);
  };

  const handleAdjustTaxes = (villageIdx: number, step: number) => {
    playClick();
    setVillages((prev) => {
      const copy = [...prev];
      const nextRate = Math.max(5, Math.min(25, copy[villageIdx].taxRate + step));
      return copy.map((v, idx) =>
        idx === villageIdx ? { ...v, taxRate: nextRate } : v
      );
    });
  };

  // --- REPLAY PLAYBACK ---
  const handleTriggerReplay = () => {
    if (replayBuffer.length === 0) return;
    playClick();
    setIsReplaying(true);
    setReplayProgress(0);
    ContextualAudioManager.getInstance().playRadioClick(true);

    const interval = setInterval(() => {
      setReplayProgress((p) => {
        if (p >= 100) {
          clearInterval(interval);
          setIsReplaying(false);
          ContextualAudioManager.getInstance().playRadioClick(false);
          return 0;
        }
        return p + 10;
      });
    }, 150);
  };

  return (
    <div id="portneuf-rp-system" className="space-y-4">
      {/* Daily Newspaper Push Banner */}
      <div className="rounded border border-amber-500/25 bg-amber-500/5 p-2 flex items-center gap-2 overflow-hidden select-none">
        <Compass size={14} className="text-amber-500 animate-spin-slow shrink-0" />
        <div className="text-[10px] font-bold text-amber-400 font-mono tracking-wide uppercase truncate w-full">
          <span className="inline-block animate-pulse mr-2">● EN DIRECT :</span>
          {journalTicker}
        </div>
      </div>

      {/* RP HUD / Wallet Section */}
      <div className="grid grid-cols-3 gap-2.5 bg-black/40 border border-white/10 rounded-lg p-3 select-none">
        <div className="flex flex-col">
          <span className="text-[8px] text-white/30 uppercase font-mono tracking-wider">Porte-monnaie (Cash)</span>
          <span className="text-[13px] font-bold text-emerald-400 font-mono mt-0.5 flex items-center">
            <DollarSign size={11} className="text-emerald-500 mr-0.5" />
            {cash} CAD
          </span>
        </div>
        <div className="flex flex-col border-l border-white/5 pl-2.5">
          <span className="text-[8px] text-white/30 uppercase font-mono tracking-wider">Caisse Desjardins</span>
          <span className="text-[13px] font-bold text-blue-400 font-mono mt-0.5 flex items-center">
            <Coins size={11} className="text-blue-500 mr-0.5" />
            {bank} CAD
          </span>
        </div>
        <div className="flex flex-col border-l border-white/5 pl-2.5">
          <span className="text-[8px] text-white/30 uppercase font-mono tracking-wider">Rôle Actuel</span>
          <span className="text-[11px] font-bold text-purple-400 font-mono mt-0.5 truncate">
            {activeJob}
          </span>
        </div>
      </div>

      {/* RP Tabs Selector */}
      <div className="flex border-b border-white/10 gap-1 pb-1">
        {[
          { id: "jobs", label: "Métiers 🍁", icon: Hammer },
          { id: "crime", label: "Contrebande & Heists", icon: Shield },
          { id: "social", label: "Social & Donnacona", icon: Users },
          { id: "tech", label: "Craft & Replay", icon: Zap }
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              id={`rp-subtab-btn-${tab.id}`}
              key={tab.id}
              onClick={() => {
                playClick();
                setSubTab(tab.id as any);
              }}
              className={`flex-1 flex flex-col items-center justify-center py-1.5 rounded text-[8px] uppercase tracking-wider font-bold transition-all border ${
                subTab === tab.id
                  ? "bg-blue-600/20 text-blue-400 border-blue-500/30 shadow-[0_0_8px_rgba(59,130,246,0.1)]"
                  : "bg-black/40 border-transparent text-white/40 hover:text-white"
              }`}
            >
              <Icon size={11} className="mb-0.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Sub-tab Content Render */}
      <div className="min-h-[220px] bg-black/20 rounded-lg p-1.5 space-y-3.5">
        <AnimatePresence mode="wait">
          {/* --- METIERS (JOBS) --- */}
          {subTab === "jobs" && (
            <motion.div
              key="jobs"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="space-y-3"
            >
            {/* Job Selection Grid */}
            <div>
              <span className="text-[8px] uppercase tracking-wider text-white/40 font-mono font-bold block mb-1.5">
                BUREAU DES MÉTIERS DE PORTNEUF
              </span>
              <div className="flex flex-wrap gap-1">
                {(["Citoyen", "Bûcheron", "Acériculteur", "Pompier", "Mécanicien", "Chauffeur taxi", "Avocat"] as JobType[]).map((job) => (
                  <button
                    id={`job-select-btn-${job}`}
                    key={job}
                    onClick={() => {
                      playClick();
                      setActiveJob(job);
                      onAddServerLog(`[Bureau Métiers] Transition de rôle réussie : ${job}.`);
                      recordActionForReplay(`Changement de métier: ${job}`);
                    }}
                    className={`px-2 py-1 rounded text-[9px] font-semibold border transition-all cursor-pointer ${
                      activeJob === job
                        ? "bg-purple-600/20 text-purple-400 border-purple-500/30"
                        : "bg-black/60 border-white/5 text-white/50 hover:text-white"
                    }`}
                  >
                    {job}
                  </button>
                ))}
              </div>
            </div>

            {/* Citoyen default layout */}
            {activeJob === "Citoyen" && (
              <div className="rounded border border-white/10 bg-black/40 p-3 text-xs text-white/60 leading-relaxed text-center space-y-1">
                <p className="font-bold text-white uppercase text-[10px] tracking-wider mb-1">Rôle : Citoyen Régulier</p>
                <p>En tant que simple citoyen de Deschambault, vous pouvez explorer le village historique ou naviguer entre les onglets pour postuler à un emploi spécialisé.</p>
              </div>
            )}

            {/* Bûcheron simulation */}
            {activeJob === "Bûcheron" && (
              <div className="rounded border border-white/10 bg-black/40 p-3 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-mono font-bold text-white flex items-center gap-1.5">
                    <Trees size={12} className="text-emerald-400 animate-pulse" />
                    Bûcheron : Saint-Raymond forestier
                  </span>
                  <span className="text-[9px] font-mono text-white/40">Bois : {inventory.wood_lumber} bûches</span>
                </div>

                <div className="space-y-1.5">
                  <button
                    id="btn-chop-wood-trigger"
                    onClick={handleChopTree}
                    disabled={isChopping}
                    className="w-full py-2 bg-emerald-600/20 hover:bg-emerald-600/35 border border-emerald-500/30 rounded text-[9px] font-bold uppercase tracking-widest text-emerald-400 cursor-pointer transition-all disabled:opacity-50"
                  >
                    {isChopping ? `ABATTAGE EN COURS... ${chopProgress}%` : "ABATTRE UN SAPIN ROUGE"}
                  </button>
                  {isChopping && (
                    <div className="w-full h-1 bg-black/60 rounded overflow-hidden">
                      <div className="h-full bg-emerald-500 transition-all duration-150" style={{ width: `${chopProgress}%` }} />
                    </div>
                  )}

                  {inventory.wood_lumber > 0 && (
                    <div className="grid grid-cols-2 gap-1.5 pt-1">
                      <button
                        id="btn-sell-wood"
                        onClick={handleSellWood}
                        className="py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 rounded text-[8px] uppercase tracking-wider font-bold transition-all cursor-pointer"
                      >
                        Vendre Bois (+35$/b)
                      </button>
                      <button
                        id="btn-donate-wood-sugarshack"
                        onClick={handleDonateWoodToSugarShack}
                        className="py-1.5 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-400 rounded text-[8px] uppercase tracking-wider font-bold transition-all cursor-pointer"
                      >
                        Alimenter Neuville
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Acériculteur sugar shack */}
            {activeJob === "Acériculteur" && (
              <div className="rounded border border-white/10 bg-black/40 p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-mono font-bold text-white flex items-center gap-1.5">
                    <Droplets size={12} className="text-amber-400" />
                    Cabane à Sucre : Neuville
                  </span>
                  <span className="text-[9px] font-mono text-white/40">Sirop : {syrupProduced.toFixed(1)} L</span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[9px]">
                  <div className="bg-black/60 rounded p-1.5 border border-white/5 flex flex-col justify-between">
                    <span className="text-white/40">Réservoir d'eau</span>
                    <span className="font-bold text-amber-400 font-mono mt-1">{sapReservoir} Litres</span>
                  </div>
                  <div className="bg-black/60 rounded p-1.5 border border-white/5 flex flex-col justify-between">
                    <span className="text-white/40">Température de chauffe</span>
                    <span className={`font-bold font-mono mt-1 ${sugarHeat >= 90 && sugarHeat <= 110 ? "text-emerald-400 animate-pulse" : "text-amber-500"}`}>
                      {sugarHeat}°C {sugarHeat >= 90 && sugarHeat <= 110 ? "(Idéal)" : ""}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    id="btn-sugar-sap-harvest"
                    onClick={() => {
                      playClick();
                      setSapReservoir((prev) => prev + 5);
                      onAddServerLog("[Cabane] Eau d'érable récoltée des chalumeaux.");
                    }}
                    className="py-1.5 bg-black/60 border border-white/10 rounded font-bold text-[8px] uppercase tracking-wider text-white hover:bg-white/5 cursor-pointer"
                  >
                    Récolter Eau
                  </button>
                  <button
                    id="btn-sugar-sap-stoke"
                    onClick={handleAcériculteurStoke}
                    className="py-1.5 bg-black/60 border border-white/10 rounded font-bold text-[8px] uppercase tracking-wider text-white hover:bg-white/5 cursor-pointer"
                  >
                    Stoker Bois
                  </button>
                  <button
                    id="btn-sugar-sap-boil"
                    onClick={handleAcériculteurBoil}
                    className={`py-1.5 border rounded font-bold text-[8px] uppercase tracking-wider cursor-pointer ${
                      isBoiling
                        ? "bg-amber-600/30 text-amber-400 border-amber-500/40"
                        : "bg-black/60 border-white/10 text-white hover:bg-white/5"
                    }`}
                  >
                    {isBoiling ? "Arrêter Bouille" : "Bouillir Eau"}
                  </button>
                </div>

                {syrupProduced >= 1 && (
                  <button
                    id="btn-sugar-syrup-sell"
                    onClick={handleSellMapleSyrup}
                    className="w-full py-1.5 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-400 rounded font-bold text-[9px] uppercase tracking-widest transition-all cursor-pointer"
                  >
                    Vendre Sirop au Marché (+{Math.floor(syrupProduced) * 85}$)
                  </button>
                )}
              </div>
            )}

            {/* Pompier simulation */}
            {activeJob === "Pompier" && (
              <div className="rounded border border-white/10 bg-black/40 p-3 space-y-2.5">
                <span className="text-[10px] uppercase font-mono font-bold text-white flex items-center gap-1.5">
                  <Flame size={12} className="text-red-400 animate-bounce" />
                  Pompier : Caserne Portneuf
                </span>

                {activeFire ? (
                  <div className="space-y-2">
                    <div className="bg-black/60 rounded p-2 border border-red-500/20 text-[10px] space-y-1">
                      <div className="flex justify-between font-bold">
                        <span className="text-red-400">🔥 FEU DÉCLENCHÉ</span>
                        <span className="text-white/60 font-mono font-normal">{activeFire.gps}</span>
                      </div>
                      <p className="text-white/80">{activeFire.location}</p>
                      <div className="flex justify-between text-[9px] text-white/50 pt-1">
                        <span>Intensité : {activeFire.intensity}%</span>
                        {inventory.extinguisher_upgrade > 0 && <span className="text-blue-400 font-bold font-mono">Upgrade Lance actif</span>}
                      </div>
                    </div>
                    <button
                      id="btn-extinguish-fire-action"
                      onClick={handleExtinguishFire}
                      className="w-full py-2 bg-red-600/20 hover:bg-red-600/35 border border-red-500/30 text-red-400 rounded text-[9px] font-bold uppercase tracking-widest transition-all cursor-pointer"
                    >
                      Déployer Lance d'incendie
                    </button>
                  </div>
                ) : (
                  <div className="rounded border border-dashed border-white/10 bg-black/10 p-4 text-center text-[10px] text-white/40">
                    Aucun incendie actif dans le comté pour le moment. Vigilance active sur la centrale 911...
                  </div>
                )}
              </div>
            )}

            {/* Mécanicien simulation */}
            {activeJob === "Mécanicien" && (
              <div className="rounded border border-white/10 bg-black/40 p-3 space-y-2.5">
                <span className="text-[10px] uppercase font-mono font-bold text-white flex items-center gap-1.5">
                  <Wrench size={12} className="text-blue-400 animate-pulse" />
                  Manoir Mécanique : Cap-Santé
                </span>

                {vehicleUnderRepair ? (
                  <div className="space-y-2">
                    <div className="bg-black/60 rounded p-2.5 border border-blue-500/20 text-[10px] space-y-1">
                      <div className="flex justify-between font-bold text-blue-400">
                        <span>🔧 CONTRAT REQUIS</span>
                        <span>Dégât : {vehicleUnderRepair.damage}%</span>
                      </div>
                      <p className="text-white font-bold">{vehicleUnderRepair.model}</p>
                      <p className="text-[9px] text-white/40">Propriétaire : {vehicleUnderRepair.owner}</p>
                      <div className="border-t border-white/5 pt-1.5 mt-1.5 space-y-1">
                        <span className="text-[9px] uppercase tracking-wider text-white/50 block font-bold">Liste des Tâches :</span>
                        {vehicleUnderRepair.tasks.map((t, idx) => (
                          <div key={idx} className="flex items-center gap-1.5 text-[9px]">
                            <div className={`w-2 h-2 rounded-full ${idx < vehicleUnderRepair.currentTaskIdx ? "bg-emerald-500" : idx === vehicleUnderRepair.currentTaskIdx ? "bg-blue-500 animate-pulse" : "bg-white/10"}`} />
                            <span className={idx === vehicleUnderRepair.currentTaskIdx ? "text-white font-bold" : idx < vehicleUnderRepair.currentTaskIdx ? "text-white/40 line-through" : "text-white/50"}>{t}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <button
                      id="btn-mechanic-repair-step"
                      onClick={handleRepairVehicleStep}
                      className="w-full py-1.5 bg-blue-600/20 hover:bg-blue-600/35 border border-blue-500/30 text-blue-400 rounded text-[9px] font-bold uppercase tracking-widest transition-all cursor-pointer"
                    >
                      Exécuter tâche d'outillage
                    </button>
                  </div>
                ) : (
                  <button
                    id="btn-mechanic-spawn-job"
                    onClick={handleSpawnNewRepairJob}
                    className="w-full py-2.5 bg-black/60 border border-white/10 rounded text-white text-[9px] uppercase tracking-widest font-bold hover:bg-white/5 cursor-pointer"
                  >
                    Accepter Bon de Travail Mécanique
                  </button>
                )}
              </div>
            )}

            {/* Taxi Driver simulation */}
            {activeJob === "Chauffeur taxi" && (
              <div className="rounded border border-white/10 bg-black/40 p-3 space-y-2.5">
                <span className="text-[10px] uppercase font-mono font-bold text-white flex items-center gap-1.5">
                  <Navigation size={12} className="text-amber-400 animate-pulse" />
                  Portneuf Taxi : GPS Dispatch
                </span>

                {taxiFare ? (
                  <div className="space-y-2.5">
                    <div className="bg-black/60 rounded p-2 border border-white/5 text-[10px] space-y-1">
                      <div className="flex justify-between font-bold text-amber-400">
                        <span>🚖 COURSE EN COURS</span>
                        <span>Tarif : {taxiFare.farePrice}$ CAD</span>
                      </div>
                      <p className="text-white/80">Passager : {taxiFare.passenger}</p>
                      <p className="text-[9px] text-white/50">Itinéraire : {taxiFare.from} ➔ {taxiFare.to} ({taxiFare.distanceKm} km)</p>
                      <div className="w-full h-1 bg-black/60 rounded overflow-hidden mt-2">
                        <div className="h-full bg-amber-500 transition-all duration-300" style={{ width: `${taxiFare.progress}%` }} />
                      </div>
                    </div>
                    <button
                      id="btn-taxi-progress-ride"
                      onClick={handleProgressTaxi}
                      className="w-full py-1.5 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-400 rounded text-[9px] font-bold uppercase tracking-widest cursor-pointer"
                    >
                      {taxiFare.progress >= 75 ? "Déposer le passager" : "Avancer sur la route GPS"}
                    </button>
                  </div>
                ) : (
                  <button
                    id="btn-taxi-start-fare"
                    onClick={handleStartTaxiFare}
                    className="w-full py-2.5 bg-black/60 border border-white/10 rounded text-white text-[9px] uppercase tracking-widest font-bold hover:bg-white/5 cursor-pointer"
                  >
                    Rechercher Passager GPS
                  </button>
                )}
              </div>
            )}

            {/* Avocat defense court */}
            {activeJob === "Avocat" && (
              <div className="rounded border border-white/10 bg-black/40 p-3 space-y-2.5">
                <span className="text-[10px] uppercase font-mono font-bold text-white flex items-center gap-1.5">
                  <Scale size={12} className="text-indigo-400 animate-pulse" />
                  Cabinet Juridique de Donnacona
                </span>

                {activeClient ? (
                  <div className="space-y-2.5">
                    <div className="bg-black/60 rounded p-2.5 border border-indigo-500/20 text-[10px] space-y-1">
                      <div className="flex justify-between font-bold text-indigo-400">
                        <span>⚖️ CLIENT INCARCÉRÉ</span>
                        <span>Caution : {activeClient.bailCost}$</span>
                      </div>
                      <p className="text-white font-bold">{activeClient.name}</p>
                      <p className="text-[9px] text-white/40">Inculpation : {activeClient.crime}</p>
                      <p className="text-[9px] text-white/40">Temps restant : {activeClient.jailSentence}s</p>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        id="btn-avocat-plead-case"
                        onClick={handleDefendClientLegal}
                        className="py-1.5 bg-indigo-600/20 hover:bg-indigo-600/35 border border-indigo-500/30 text-indigo-400 rounded text-[8px] font-bold uppercase tracking-wider cursor-pointer"
                      >
                        Plaider Acquittement
                      </button>
                      <button
                        id="btn-avocat-pay-bail"
                        onClick={() => {
                          if (bank < activeClient.bailCost) {
                            onAddServerLog("[Avocat] Compte Desjardins insuffisant pour payer la caution.");
                            return;
                          }
                          playClick();
                          setBank((b) => b - activeClient.bailCost);
                          setCash((c) => c + 600); // flat reward payout
                          ContextualAudioManager.getInstance().playCashRegister();
                          onAddServerLog(`[Justice] Caution payée pour ${activeClient.name}. Libération validée.`);
                          recordActionForReplay(`Caution payée pour client ${activeClient.name}`);
                          setActiveClient(null);
                        }}
                        className="py-1.5 bg-black/60 border border-white/10 rounded text-white text-[8px] uppercase tracking-wider hover:bg-white/5 cursor-pointer"
                      >
                        Payer Caution ({activeClient.bailCost}$)
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    id="btn-avocat-spawn-client"
                    onClick={() => {
                      playClick();
                      setActiveClient({
                        name: ["Bob Tremblay", "Gaston Roy", "Sylvain Gignac"][Math.floor(Math.random() * 3)],
                        crime: "Courses illégales nocturnes sur la Route 138",
                        jailSentence: 30 + Math.floor(Math.random() * 30),
                        bailCost: 800 + Math.floor(Math.random() * 400)
                      });
                      onAddServerLog("[Justice] Nouveau client en détention provisoire.");
                    }}
                    className="w-full py-2.5 bg-black/60 border border-white/10 rounded text-white text-[9px] uppercase tracking-widest font-bold hover:bg-white/5 cursor-pointer"
                  >
                    Accepter Mandat de Défense
                  </button>
                )}
              </div>
            )}

            {/* Carrières St-Marc */}
            <div className="rounded border border-white/10 bg-black/40 p-3 space-y-2">
              <span className="text-[10px] uppercase font-mono font-bold text-white flex items-center gap-1.5">
                <Pickaxe size={12} className="text-blue-400" />
                Carrières St-Marc : Extraction de Calcaire
              </span>
              <p className="text-[9px] text-white/50 leading-relaxed">
                Le calcaire de Saint-Marc-des-Carrières est une ressource essentielle pour l'artisanat industriel de Portneuf.
              </p>
              <button
                id="btn-quarry-limestone"
                disabled={isQuarrying}
                onClick={handleQuarryLimestone}
                className="w-full py-2 bg-blue-600/10 hover:bg-blue-600/25 border border-blue-500/30 rounded text-[9px] font-bold uppercase tracking-widest text-blue-400 cursor-pointer transition-all disabled:opacity-50"
              >
                {isQuarrying ? `PIOCHAGE EN COURS... ${quarryProgress}%` : "EXTRAIRE DU CALCAIRE BRUT"}
              </button>
              {isQuarrying && (
                <div className="w-full h-1 bg-black/60 rounded overflow-hidden">
                  <div className="h-full bg-blue-500 transition-all duration-150" style={{ width: `${quarryProgress}%` }} />
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* --- CRIME & HEIST --- */}
        {subTab === "crime" && (
          <motion.div
            key="crime"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="space-y-3.5"
          >
            {/* Marché Noir Section */}
            <div className="rounded border border-white/10 bg-black/40 p-3 space-y-2">
              <span className="text-[10px] uppercase font-mono font-bold text-white flex items-center gap-1.5">
                <ShoppingBag size={12} className="text-purple-400" />
                Marché Noir : Biens prohibés
              </span>
              <p className="text-[9px] text-white/50">Acheter des ressources sans passer par la Caisse Desjardins (fonds cash uniquement).</p>
              
              <div className="grid grid-cols-2 gap-1.5 pt-1.5">
                <button
                  id="btn-blackmarket-buy-sap"
                  onClick={() => handleBuyBlackMarketItem("maple_sap", 40)}
                  className="p-2 bg-black/60 border border-white/5 hover:border-purple-500/30 text-left rounded cursor-pointer group transition-all"
                >
                  <span className="block text-[9px] text-white font-bold group-hover:text-purple-400">Eau d'érable d'import</span>
                  <span className="text-[8px] text-purple-400/80 font-mono">Cost: 40$ CAD (Cash)</span>
                </button>
                <button
                  id="btn-blackmarket-buy-ether"
                  onClick={() => handleBuyBlackMarketItem("smuggled_ether", 180)}
                  className="p-2 bg-black/60 border border-white/5 hover:border-purple-500/30 text-left rounded cursor-pointer group transition-all"
                >
                  <span className="block text-[9px] text-white font-bold group-hover:text-purple-400">Prisme d'éther brut</span>
                  <span className="text-[8px] text-purple-400/80 font-mono">Cost: 180$ CAD (Cash)</span>
                </button>
              </div>

              <div className="bg-black/60 border border-white/5 rounded p-2 text-[9px] flex items-center justify-between mt-1">
                <span className="text-white/40">Surveillance policière (Suspicion)</span>
                <span className={`font-mono font-bold ${suspicionLevel > 50 ? "text-red-400 animate-pulse" : "text-amber-500"}`}>{suspicionLevel}%</span>
              </div>
            </div>

            {/* Smuggling Route 138 Section */}
            {inventory.smuggled_ether > 0 && (
              <div className="rounded border border-white/10 bg-black/40 p-3 space-y-2">
                <div className="flex justify-between items-center text-[10px]">
                  <span className="uppercase font-mono font-bold text-white">Route de contrebande 138</span>
                  <span className="font-mono text-purple-400">{inventory.smuggled_ether} prisme(s) d'éther prêts</span>
                </div>
                <button
                  id="btn-trigger-smuggling-route"
                  onClick={handleStartSmugglingRun}
                  disabled={isSmuggling}
                  className="w-full py-1.5 bg-purple-600/20 hover:bg-purple-600/35 border border-purple-500/30 text-purple-400 rounded text-[9px] uppercase tracking-wider font-bold cursor-pointer transition-all disabled:opacity-50"
                >
                  {isSmuggling ? `Camion sur le Chemin du Roy (${smuggleProgress}%)` : "Lancer expédition de contrebande"}
                </button>
                {isSmuggling && (
                  <div className="w-full h-1 bg-black/60 rounded overflow-hidden">
                    <div className="h-full bg-purple-500 transition-all duration-300" style={{ width: `${smuggleProgress}%` }} />
                  </div>
                )}
              </div>
            )}

            {/* Braquage Desjardins pipeline */}
            <div className="rounded border border-red-500/20 bg-black/60 p-4 space-y-3 shadow-[0_0_15px_rgba(239,68,68,0.05)]">
              <div className="flex justify-between items-center border-b border-white/5 pb-2">
                <span className="text-[11px] uppercase font-mono font-bold text-red-400 flex items-center gap-1.5">
                  <AlertOctagon size={13} className="text-red-500 animate-pulse" />
                  Caisse Desjardins Heist 🍁
                </span>
                {heistStep !== "none" && (
                  <button
                    id="btn-reset-heist-panel"
                    onClick={handleResetHeist}
                    className="text-[8px] font-mono uppercase bg-red-950/40 text-red-400 border border-red-500/20 px-1.5 py-0.5 rounded hover:bg-red-950/60 transition-all"
                  >
                    Réinitialiser
                  </button>
                )}
              </div>

              {/* STEP 0: NONE (START) */}
              {heistStep === "none" && (
                <div className="space-y-3">
                  <p className="text-[9.5px] text-white/60 leading-relaxed font-mono">
                    Planifiez l'opération sur la Caisse de Portneuf. Évitez les capteurs d'alarme 311-4141, dépercez les coffres et fuyez par le réseau routier régional.
                  </p>
                  <button
                    id="btn-initialize-heist"
                    onClick={handleStartHeist}
                    className="w-full py-2 bg-red-600/20 hover:bg-red-600/35 border border-red-500/40 text-red-400 rounded text-[9.5px] uppercase tracking-widest font-mono font-bold transition-all shadow-[0_0_10px_rgba(239,68,68,0.1)] cursor-pointer"
                  >
                    Initialiser le Casse
                  </button>
                </div>
              )}

              {/* STEP 1: BYPASS FREQUENCY */}
              {heistStep === "bypass" && (
                <div className="space-y-3 font-mono">
                  <div className="flex justify-between text-[9px] text-white/50 border-b border-white/5 pb-1">
                    <span>Étape 1 : Bypass Alarme 311-4141</span>
                    <span className="text-cyan-400">RÉSEAU SQ</span>
                  </div>
                  
                  <div className="bg-black/80 rounded p-2 border border-cyan-500/20 space-y-2">
                    <div className="flex justify-between items-center text-[9px]">
                      <span className="text-cyan-400 flex items-center gap-1"><Radio size={10} /> Fréquence cible :</span>
                      <span className="font-bold text-white text-[10px]">{bypassTargetFreq} MHz</span>
                    </div>
                    <div className="flex justify-between items-center text-[9px]">
                      <span className="text-white/60">Fréquence actuelle :</span>
                      <span className={`font-bold text-[10px] ${Math.abs(bypassCurrentFreq - bypassTargetFreq) <= 1.0 ? "text-emerald-400 animate-pulse" : "text-amber-500"}`}>
                        {bypassCurrentFreq.toFixed(1)} MHz
                      </span>
                    </div>

                    <input
                      id="bypass-freq-slider"
                      type="range"
                      min="30.0"
                      max="50.0"
                      step="0.1"
                      value={bypassCurrentFreq}
                      onChange={(e) => handleTuneBypassFreq(parseFloat(e.target.value))}
                      className="w-full h-1 bg-black rounded appearance-none accent-cyan-500 cursor-pointer"
                    />

                    {Math.abs(bypassCurrentFreq - bypassTargetFreq) <= 1.0 ? (
                      <div className="text-[8.5px] text-emerald-400 text-center bg-emerald-950/30 border border-emerald-500/20 py-0.5 rounded animate-pulse">
                        ● SIGNAL SYNCHRONISÉ — TRANSMISSION DU BYPASS ACTIVE... ({heistProgress}%)
                      </div>
                    ) : (
                      <div className="text-[8px] text-white/40 text-center italic py-0.5">
                        Ajustez le cadran de fréquence pour aveugler l'alarme
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button
                      id="btn-force-bypass-gate"
                      onClick={handleForceBypass}
                      className="py-1.5 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-400 rounded text-[8.5px] uppercase font-bold"
                    >
                      Forcer Bypass (35%)
                    </button>
                    <div className="text-[8px] text-white/40 leading-tight flex items-center">
                      Le forcage a 65% de chance de déclencher immédiatement la SQ.
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 2: DRILL THERMIQUE */}
              {heistStep === "drill" && (
                <div className="space-y-3 font-mono">
                  <div className="flex justify-between text-[9px] text-white/50 border-b border-white/5 pb-1">
                    <span>Étape 2 : Forçage Porte Blindée</span>
                    <span className="text-red-400 flex items-center gap-0.5"><Thermometer size={10} /> {drillTemp}°C</span>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-[9px]">
                      <span className="text-white/60">Progression forage :</span>
                      <span className="text-red-400 font-bold">{heistProgress}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-black rounded overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-red-600 to-amber-500 transition-all duration-300" style={{ width: `${heistProgress}%` }} />
                    </div>

                    <div className="bg-black/60 rounded p-2 border border-white/5 space-y-2">
                      <div className="flex justify-between items-center text-[9px]">
                        <span className="text-white/40">Pression Feed Oxygène :</span>
                        <span className="text-amber-400 font-bold">{drillSpeedBoost}%</span>
                      </div>
                      <input
                        id="drill-boost-slider"
                        type="range"
                        min="20"
                        max="100"
                        value={drillSpeedBoost}
                        onChange={(e) => handleSetDrillPressure(parseInt(e.target.value))}
                        className="w-full h-1 bg-black rounded appearance-none accent-red-500"
                      />
                      <div className="text-[7.5px] text-white/40">
                        Plus la pression est haute, plus la foreuse perce vite, mais la température augmente rapidement vers la fonte critique (135°C)!
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-1">
                      <button
                        id="btn-cool-drill-water"
                        onClick={handleCoolDrill}
                        disabled={drillWaterRefills <= 0}
                        className="flex-1 py-1.5 bg-cyan-600/20 hover:bg-cyan-600/35 border border-cyan-500/30 text-cyan-400 rounded text-[8.5px] uppercase font-bold disabled:opacity-30"
                      >
                        Asperger d'Eau ({drillWaterRefills} restants)
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 3: COMBINATION LOCK */}
              {heistStep === "combination" && (
                <div className="space-y-3 font-mono">
                  <div className="flex justify-between text-[9px] text-white/50 border-b border-white/5 pb-1">
                    <span>Étape 3 : Déchiffrer la Combinaison</span>
                    <span className="text-amber-400 flex items-center gap-1">
                      {combinationStep === 0 ? "○ ○ ○" : combinationStep === 1 ? "● ○ ○" : "● ● ○"}
                    </span>
                  </div>

                  <div className="bg-black/60 rounded p-3 border border-white/5 space-y-3 text-center">
                    <div className="text-[10px] text-white/50">
                      Faites tourner le cadran mécanique. Écoutez le dé-clic mécanique de l'engrenage de sûreté.
                    </div>
                    
                    <div className="text-3xl font-bold font-mono tracking-wider text-amber-500">
                      {combinationDial}
                    </div>

                    <input
                      id="combination-dial-slider"
                      type="range"
                      min="0"
                      max="99"
                      value={combinationDial}
                      onChange={(e) => handleRotateCombinationDial(parseInt(e.target.value))}
                      className="w-full h-1 bg-black rounded appearance-none accent-amber-500 cursor-pointer"
                    />

                    <button
                      id="btn-validate-combination"
                      onClick={handleValidateCombinationNumber}
                      className="w-full py-1.5 bg-amber-500/20 hover:bg-amber-500/35 border border-amber-500/35 text-amber-400 rounded text-[9px] uppercase font-bold"
                    >
                      Valider le chiffre actuel
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 4: PILLAGE COFFRES-FORTS */}
              {heistStep === "pillage" && (
                <div className="space-y-3 font-mono">
                  <div className="flex justify-between text-[9px] text-white/50 border-b border-white/5 pb-1">
                    <span>Étape 4 : Pillage des Dépôts de Sûreté</span>
                    <span className="text-red-400 animate-pulse flex items-center gap-1">
                      <Timer size={10} /> {pillageSecLeft}s RESTANTES
                    </span>
                  </div>

                  <div className="bg-black/60 rounded p-2 border border-white/5 space-y-1 text-[9px]">
                    <div className="flex justify-between text-white/60">
                      <span>Valeur du sac :</span>
                      <span className="text-emerald-400 font-bold">{lootBagValue}$ CAD</span>
                    </div>
                    <div className="flex justify-between text-white/60">
                      <span>Poids du sac :</span>
                      <span className="text-amber-500 font-bold">{lootWeight} kg</span>
                    </div>
                    <div className="flex justify-between text-white/60">
                      <span>Prismes d'Éther :</span>
                      <span className="text-purple-400 font-bold">{stolenPrisms} prisme(s)</span>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <button
                      id="btn-pillage-cash"
                      onClick={() => handlePillageItem("cash")}
                      className="w-full py-1.5 bg-emerald-500/10 hover:bg-emerald-500/15 border border-emerald-500/25 text-emerald-400 rounded text-[8px] uppercase font-bold text-left px-2 flex justify-between"
                    >
                      <span>💵 Sac d'Argent Liquide</span>
                      <span>+550$ · +1.2kg</span>
                    </button>
                    <button
                      id="btn-pillage-gold"
                      onClick={() => handlePillageItem("gold")}
                      className="w-full py-1.5 bg-amber-500/10 hover:bg-amber-500/15 border border-amber-500/25 text-amber-400 rounded text-[8px] uppercase font-bold text-left px-2 flex justify-between"
                    >
                      <span>🏆 Lingot d'Or de Cap-Santé</span>
                      <span>+1200$ · +4.8kg · +1 Étoile</span>
                    </button>
                    <button
                      id="btn-pillage-ether"
                      onClick={() => handlePillageItem("ether")}
                      className="w-full py-1.5 bg-purple-500/10 hover:bg-purple-500/15 border border-purple-500/25 text-purple-400 rounded text-[8px] uppercase font-bold text-left px-2 flex justify-between"
                    >
                      <span>⬡ Prisme d'Éther Brut</span>
                      <span>+1800$ · +2.5kg · +1 Prisme</span>
                    </button>
                  </div>

                  <button
                    id="btn-trigger-escape"
                    onClick={handleStartEscape}
                    className="w-full py-2 bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white rounded text-[9.5px] uppercase font-bold tracking-wider cursor-pointer shadow-[0_0_12px_rgba(239,68,68,0.2)]"
                  >
                    🚀 S'enfuir avec le butin !
                  </button>
                </div>
              )}

              {/* STEP 5: ESCAPE PURSUITE */}
              {heistStep === "escape" && (
                <div className="space-y-3 font-mono">
                  <div className="flex justify-between text-[9px] text-white/50 border-b border-white/5 pb-1">
                    <span>Étape 5 : Course Poursuite de la SQ</span>
                    <span className="text-red-400 font-bold flex items-center gap-0.5">
                      {"★".repeat(policeStars)}{"☆".repeat(5 - policeStars)}
                    </span>
                  </div>

                  <div className="space-y-2">
                    {/* Escape Track */}
                    <div className="bg-black/60 rounded p-2.5 border border-white/5 space-y-1.5 text-[9px]">
                      <div className="flex justify-between">
                        <span className="text-emerald-400">Progression Fuite :</span>
                        <span className="font-bold text-emerald-400">{heistProgress}%</span>
                      </div>
                      <div className="w-full h-1 bg-black rounded overflow-hidden">
                        <div className="h-full bg-emerald-500" style={{ width: `${heistProgress}%` }} />
                      </div>

                      <div className="flex justify-between">
                        <span className="text-red-400">Proximité Police (SQ) :</span>
                        <span className={`font-bold ${policeChaseDistance >= 75 ? "text-red-500 animate-pulse" : "text-amber-500"}`}>
                          {policeChaseDistance}% {policeChaseDistance >= 80 ? "SOUFFLE AU COU" : ""}
                        </span>
                      </div>
                      <div className="w-full h-1 bg-black rounded overflow-hidden">
                        <div className="h-full bg-red-600" style={{ width: `${policeChaseDistance}%` }} />
                      </div>
                    </div>

                    {/* Escape route selection */}
                    <div className="space-y-1">
                      <label className="text-[8.5px] text-white/40 uppercase">Axe de fuite routier :</label>
                      <select
                        id="escape-route-selector"
                        className="w-full py-1 bg-black border border-white/10 rounded text-[9.5px] text-white font-mono"
                        value={escapeRoute}
                        onChange={(e) => setEscapeRoute(e.target.value as any)}
                      >
                        <option value="cheminduroy">🛣️ Chemin du Roy (Normal)</option>
                        <option value="route138">⚡ Route 138 (Rapide, Fortes patrouilles)</option>
                        <option value="casserole">🚜 Rang de la Casserole (Sinueux, Risque enlisement)</option>
                        <option value="ferry">🚢 Traversier de Cap-Santé (Instantané si amarré)</option>
                      </select>
                    </div>

                    {/* Evading actions */}
                    <div className="grid grid-cols-3 gap-1 pt-1">
                      <button
                        id="btn-evade-drop"
                        onClick={handleJettisonLoot}
                        className="py-1 bg-slate-900 border border-slate-800 text-slate-300 hover:text-white rounded text-[7.5px] uppercase font-bold"
                      >
                        Jeter Butin
                      </button>
                      <button
                        id="btn-evade-jam"
                        onClick={handleJamRadio}
                        disabled={suspicionLevel < 25}
                        className="py-1 bg-slate-900 border border-slate-800 text-slate-300 hover:text-white rounded text-[7.5px] uppercase font-bold disabled:opacity-30"
                      >
                        Faux 311
                      </button>
                      <button
                        id="btn-evade-fuel"
                        onClick={handleInjectEtherFuel}
                        disabled={inventory.ether_fuel <= 0}
                        className="py-1 bg-slate-900 border border-slate-800 text-slate-300 hover:text-white rounded text-[7.5px] uppercase font-bold disabled:opacity-30"
                      >
                        Éther-Fuel ({inventory.ether_fuel})
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 6: COMPLETE SUCCESS */}
              {heistStep === "complete" && (
                <div className="space-y-3 font-mono text-center">
                  <div className="text-emerald-400 text-3xl animate-bounce">🎉</div>
                  <h4 className="text-[11px] font-bold text-emerald-400 uppercase tracking-widest">
                    Braquage Réussi !
                  </h4>
                  <p className="text-[9px] text-white/60 leading-relaxed">
                    Vous avez semé les patrouilles territoriales de Portneuf et blanchi l'ensemble du butin sur la Rive Sud du fleuve Saint-Laurent.
                  </p>
                  <div className="bg-emerald-950/20 border border-emerald-500/20 rounded p-2 text-left text-[9px] text-emerald-400 space-y-0.5">
                    <div>✓ Gain Blanchi : +{lootBagValue}$ CAD</div>
                    {stolenPrisms > 0 && <div>✓ Prisme(s) sécurisé(s) : +{stolenPrisms} Éther</div>}
                  </div>
                  <button
                    id="btn-reset-heist"
                    onClick={handleResetHeist}
                    className="w-full py-1.5 bg-black/60 border border-white/10 text-white/50 rounded text-[9px] uppercase tracking-wider hover:text-white cursor-pointer"
                  >
                    Retour au Sandbox
                  </button>
                </div>
              )}
            </div>

            {/* Loto Québec ticket section */}
            <div className="rounded border border-white/10 bg-black/40 p-3 space-y-2.5">
              <span className="text-[10px] uppercase font-mono font-bold text-white flex items-center gap-1.5">
                <Ticket size={12} className="text-amber-400" />
                Loto-Québec
              </span>
              <div className="flex items-center justify-between text-[9px]">
                <span className="text-white/40">Billets possédés : {inventory.lotto_ticket}</span>
                <span className="text-amber-400 font-bold font-mono">Jackpot : 1500$ CAD</span>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  id="btn-buy-lotto-ticket"
                  onClick={handleBuyLotoTicket}
                  className="py-1.5 bg-black/60 border border-white/10 rounded text-white text-[8px] uppercase tracking-wider hover:bg-white/5 cursor-pointer"
                >
                  Acheter Billet (10$)
                </button>
                <button
                  id="btn-simulate-lotto-draw"
                  onClick={handleSimulateLotoDraw}
                  disabled={inventory.lotto_ticket <= 0}
                  className="py-1.5 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-400 rounded text-[8px] uppercase tracking-wider font-bold cursor-pointer disabled:opacity-50"
                >
                  Tirer Billet
                </button>
              </div>

              {lottoWinnerAnnounced && (
                <div className={`text-center py-1 rounded text-[9px] font-bold ${lottoWinnerAnnounced === "GAGNANT" ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-400" : "bg-red-500/10 border border-red-500/30 text-red-400 animate-pulse"}`}>
                  {lottoWinnerAnnounced === "GAGNANT" ? "🎉 JACKPOT REMPORTÉ : +1500$ !" : "❌ BILLET PERDANT"}
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* --- SOCIAL & DONNACONA PRISON --- */}
        {subTab === "social" && (
          <motion.div
            key="social"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="space-y-3.5"
          >
            {/* Social Tab Sub-navigation */}
            <div className="grid grid-cols-2 gap-1.5 p-1 rounded bg-[#16161a]/60 border border-white/5">
              <button
                id="tab-social-prison"
                onClick={() => { playClick(); setSocialSubTab("prison"); }}
                className={`py-1 rounded text-[9px] font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5 ${socialSubTab === "prison" ? "bg-red-500/10 border border-red-500/40 text-red-400 font-extrabold" : "text-white/40 hover:text-white"}`}
              >
                <Lock size={10} className={socialSubTab === "prison" ? "text-red-400" : "text-white/40"} />
                Pénitencier Donnacona
              </button>
              <button
                id="tab-social-police"
                onClick={() => { playClick(); setSocialSubTab("police"); }}
                className={`py-1 rounded text-[9px] font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5 ${socialSubTab === "police" ? "bg-blue-500/10 border border-blue-500/40 text-blue-400 font-extrabold" : "text-white/40 hover:text-white"}`}
              >
                <Shield size={10} className={socialSubTab === "police" ? "text-blue-400" : "text-white/40"} />
                Sûreté du Québec (SQ)
              </button>
            </div>

            {/* SubTab 1: Donnacona Prison */}
            {socialSubTab === "prison" && (
              <div className="space-y-3">
                {prisonState.status === "Incarcéré" ? (
                  <div className="space-y-3">
                    {/* Main Sentence Status */}
                    <div className="rounded border border-red-500/30 bg-red-950/20 p-3 space-y-2">
                      <div className="flex justify-between items-center text-[10px]">
                        <span className="font-mono font-bold text-red-400 flex items-center gap-1.5">
                          <ShieldAlert size={12} className="text-red-500 animate-pulse" />
                          INCARCÉRATION ACTIVE • {prisonCellId}
                        </span>
                        <span className="font-mono bg-red-500/15 text-red-400 px-1.5 py-0.5 rounded text-[8px] font-semibold animate-pulse">
                          PEINE RESTANTE : {prisonState.sentenceSeconds}s
                        </span>
                      </div>
                      
                      <div className="bg-black/60 border border-white/5 rounded p-2.5 text-[9px] space-y-1.5">
                        <div className="flex justify-between text-white/70">
                          <span>Délit commis :</span>
                          <span className="font-bold text-red-400">{prisonState.crime}</span>
                        </div>
                        <div className="flex justify-between text-white/50">
                          <span>Points Réhabilitation :</span>
                          <span className="font-mono text-emerald-400 font-bold">{rehabilitationPoints} pts</span>
                        </div>
                        
                        {/* Sentence progress bar */}
                        <div className="space-y-1 pt-1">
                          <div className="flex justify-between text-[8px] text-white/40">
                            <span>Progression de la peine</span>
                            <span>{Math.round(Math.max(0, Math.min(100, 100 - (prisonState.sentenceSeconds / (originalSentence || 30) * 100))))}%</span>
                          </div>
                          <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden">
                            <div 
                              className="bg-emerald-500 h-full transition-all duration-1000"
                              style={{ width: `${Math.max(0, Math.min(100, 100 - (prisonState.sentenceSeconds / (originalSentence || 30) * 100)))}%` }}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Global Caution bail button */}
                      <button
                        id="btn-prison-bail-esc"
                        onClick={async () => {
                          if (bank < 1000) {
                            onAddServerLog("[Prison] Caution de libération trop élevée ($1000 requis en banque).");
                            return;
                          }
                          playClick();
                          setBank((b) => b - 1000);
                          try {
                            const res = await fetch("/api/prison/bail-out", { method: "POST" });
                            if (res.ok) {
                              const data = await res.json();
                              setPrisonState({
                                status: data.playerPrisonState.status,
                                sentenceSeconds: data.playerPrisonState.sentenceSeconds,
                                crime: data.playerPrisonState.crime
                              });
                              onAddServerLog("[Caisse] Caution payée ($1000 CAD). Libération immédiate de Donnacona.");
                              recordActionForReplay("Caution payée pour sortie");
                            }
                          } catch (e) {
                            console.error(e);
                          }
                        }}
                        className="w-full py-1.5 bg-[#16161a] hover:bg-white/5 border border-white/10 rounded text-white text-[9px] font-bold uppercase tracking-wider cursor-pointer"
                      >
                        Payer Caution de sortie (1000$ CAD)
                      </button>
                    </div>

                    {/* Section: Rehabilitation Labor */}
                    <div className="rounded border border-white/10 bg-black/40 p-3 space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-[9px] font-mono font-bold text-white uppercase flex items-center gap-1">
                          <Hammer size={11} className="text-emerald-400" /> Travaux de Réhabilitation
                        </span>
                        {prisonWorkActive && (
                          <span className="text-[8px] bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-1 rounded font-bold animate-pulse">En cours</span>
                        )}
                      </div>

                      <div className="grid grid-cols-3 gap-1">
                        <button
                          id="btn-work-wash"
                          onClick={() => { playClick(); setPrisonWorkType("wash"); }}
                          className={`py-1 rounded text-[8px] font-bold border transition-all ${prisonWorkType === "wash" ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-400" : "bg-black/40 border-white/5 text-white/60 hover:text-white"}`}
                        >
                          🧼 Laver Sols
                        </button>
                        <button
                          id="btn-work-rocks"
                          onClick={() => { playClick(); setPrisonWorkType("rocks"); }}
                          className={`py-1 rounded text-[8px] font-bold border transition-all ${prisonWorkType === "rocks" ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-400" : "bg-black/40 border-white/5 text-white/60 hover:text-white"}`}
                        >
                          ⛏️ Cailloux
                        </button>
                        <button
                          id="btn-work-iso"
                          onClick={() => { playClick(); setPrisonWorkType("iso"); }}
                          className={`py-1 rounded text-[8px] font-bold border transition-all ${prisonWorkType === "iso" ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-400" : "bg-black/40 border-white/5 text-white/60 hover:text-white"}`}
                        >
                          🚪 Fouille Isolement
                        </button>
                      </div>

                      <div className="bg-black/60 rounded p-2 border border-white/5 text-[8px] text-white/50 space-y-1">
                        <p>{prisonWorkType === "wash" ? "Tâche modérée : Vitesse moyenne, faible fatigue, idéal pour débuter." : prisonWorkType === "rocks" ? "Travaux forcés pénibles : Réduction de peine maximale mais augmente la fatigue." : "Fouille de cellules fermées : Risqué, vitesse lente mais possibilité de trouver du prisme d'éther de contrebande."}</p>
                        
                        {prisonWorkActive && (
                          <div className="space-y-1 pt-1.5 border-t border-white/5">
                            <div className="flex justify-between text-[7px] text-white/40">
                              <span>Progression du cycle de travail</span>
                              <span>{prisonWorkProgress}%</span>
                            </div>
                            <div className="w-full bg-white/5 h-1 rounded overflow-hidden">
                              <div 
                                className="bg-emerald-400 h-full transition-all duration-1000"
                                style={{ width: `${prisonWorkProgress}%` }}
                              />
                            </div>
                          </div>
                        )}
                      </div>

                      <button
                        id="btn-toggle-work"
                        onClick={() => {
                          playClick();
                          setPrisonWorkActive(!prisonWorkActive);
                          onAddServerLog(prisonWorkActive ? "[Donnacona] Travaux de réhabilitation suspendus par le détenu." : "[Donnacona] Début des travaux forcés d'intérêt général.");
                        }}
                        className={`w-full py-1 rounded text-[9px] font-bold uppercase tracking-wider transition-all cursor-pointer border ${prisonWorkActive ? "bg-amber-600/15 hover:bg-amber-600/25 border-amber-500/30 text-amber-400" : "bg-emerald-600/15 hover:bg-emerald-600/25 border-emerald-500/30 text-emerald-400"}`}
                      >
                        {prisonWorkActive ? "⚠️ Arrêter le Travail" : "✔️ Commencer le Travail d'Intérêt Général"}
                      </button>
                    </div>

                    {/* Section: Escape Mini-Games & Plans */}
                    <div className="rounded border border-white/10 bg-black/40 p-3 space-y-2.5">
                      <span className="text-[9px] font-mono font-bold text-white uppercase flex items-center gap-1.5">
                        <RotateCcw size={11} className="text-red-400" /> Plans d'Évasion Clandestins
                      </span>

                      <div className="grid grid-cols-1 gap-2">
                        {/* 1. Tunnel Escape */}
                        <div className="bg-black/60 rounded p-2 border border-white/5 text-[8.5px] space-y-1.5">
                          <div className="flex justify-between items-center">
                            <span className="font-bold text-white flex items-center gap-1">🕳️ Projet de Tunnel</span>
                            <span className="font-mono text-red-400">{tunnelProgress}% creusé</span>
                          </div>
                          <div className="w-full bg-white/5 h-1 rounded overflow-hidden">
                            <div className="bg-red-500 h-full transition-all duration-300" style={{ width: `${tunnelProgress}%` }} />
                          </div>
                          <div className="flex gap-1.5">
                            <button
                              id="btn-dig-tunnel"
                              onClick={async () => {
                                playClick();
                                try {
                                  const res = await fetch("/api/prison/tunnel-dig", { method: "POST" });
                                  if (res.ok) {
                                    const data = await res.json();
                                    if (data.caught) {
                                      setTunnelProgress(0);
                                      onAddServerLog("[Donnacona] !!! TUNNEL DÉCOUVERT !!! Un garde a surpris vos fouilles. Peine de prison prolongée de 15s.");
                                      recordActionForReplay("Fouille tunnel échec");
                                    } else if (data.playerPrisonState.status === "Évadé") {
                                      setTunnelProgress(0);
                                      setSuspicionLevel(85);
                                      ContextualAudioManager.getInstance().playPoliceSiren();
                                      onAddServerLog("[Sûreté du Québec] !!! ÉVASION !!! Le suspect s'est évadé par un tunnel souterrain vers Cap-Santé !");
                                      recordActionForReplay("Évasion réussie par tunnel");
                                    } else {
                                      setTunnelProgress(data.playerPrisonState.tunnelProgress);
                                      onAddServerLog("[Donnacona] Vous creusez furtivement le sol de votre cellule...");
                                    }
                                  }
                                } catch (e) {
                                  console.error(e);
                                }
                              }}
                              className="flex-1 py-1 bg-red-600/10 hover:bg-red-600/20 border border-red-500/20 rounded text-[8px] font-bold text-red-400 uppercase tracking-wide cursor-pointer"
                            >
                              Creuser discrètement (+15% progress)
                            </button>
                          </div>
                        </div>

                        {/* 2. Corruption & Riot */}
                        <div className="grid grid-cols-2 gap-1.5">
                          <button
                            id="btn-bribe-guard"
                            onClick={async () => {
                              if (cash < 400) {
                                onAddServerLog("[Donnacona] Corruption échouée: Il vous faut 400$ d'argent liquide sur vous pour corrompre le gardien.");
                                return;
                              }
                              playClick();
                              setCash((c) => c - 400);
                              try {
                                const res = await fetch("/api/prison/bribe", { method: "POST" });
                                if (res.ok) {
                                  const data = await res.json();
                                  if (data.playerPrisonState.status === "Évadé") {
                                    setSuspicionLevel(75);
                                    onAddServerLog("[Donnacona] CORRUPTION : Le gardien a empoché les 400$ et déverrouillé la porte de service arrière !");
                                    recordActionForReplay("Évasion corruption réussie");
                                  } else {
                                    onAddServerLog("[Donnacona] TRAHISON : Le gardien a empoché l'argent mais a alerté le poste central ! Peine rallongée de 20s.");
                                    recordActionForReplay("Corruption dénoncée");
                                  }
                                }
                              } catch (e) {
                                console.error(e);
                              }
                            }}
                            className="py-1.5 bg-yellow-600/10 hover:bg-yellow-600/20 border border-yellow-500/20 text-yellow-400 rounded text-[8px] font-bold uppercase tracking-wider cursor-pointer"
                          >
                            🤝 Corrompre Garde (400$)
                          </button>

                          <button
                            id="btn-riot-prison"
                            onClick={async () => {
                              if (prisonTension < 80) {
                                onAddServerLog(`[Donnacona] Tension trop basse (${prisonTension}%). Émeute impossible. Provoquez les gardes ou sabotez d'abord.`);
                                return;
                              }
                              playClick();
                              try {
                                const res = await fetch("/api/prison/riot", { method: "POST" });
                                if (res.ok) {
                                  const data = await res.json();
                                  if (data.playerPrisonState.status === "Évadé") {
                                    setSuspicionLevel(90);
                                    ContextualAudioManager.getInstance().playPoliceSiren();
                                    onAddServerLog("[Sûreté SQ] ÉMEUTE MAJEURE À DONNACONA ! Le suspect a profité du chaos général pour s'enfuir !");
                                    recordActionForReplay("Évasion par mutinerie");
                                  } else {
                                    onAddServerLog("[Sûreté SQ] Émeute réprimée par le groupe d'intervention tactique. Confinement en cellule d'isolement active (+30s).");
                                    recordActionForReplay("Émeute réprimée");
                                  }
                                }
                              } catch (e) {
                                console.error(e);
                              }
                            }}
                            className={`py-1.5 rounded text-[8px] font-bold uppercase tracking-wider transition-all border cursor-pointer ${prisonTension >= 80 ? "bg-red-600/30 hover:bg-red-600/45 border-red-500 text-white animate-bounce" : "bg-black/60 border-white/5 text-white/30"}`}
                          >
                            🔥 Lancer Mutinerie ({prisonTension}%)
                          </button>
                        </div>

                        {/* Actions to increase tension */}
                        <div className="flex gap-1">
                          <button
                            id="btn-incite-riot"
                            onClick={async () => {
                              playClick();
                              try {
                                const res = await fetch("/api/prison/incite-riot", {
                                  method: "POST",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({ type: "incite" })
                                });
                                if (res.ok) {
                                  const data = await res.json();
                                  setPrisonTension(data.playerPrisonState.prisonTension);
                                  onAddServerLog("[Donnacona] Vous incitez vos codétenus à la révolte ! La tension monte.");
                                }
                              } catch (e) {
                                console.error(e);
                              }
                            }}
                            className="flex-1 py-1 bg-black/60 border border-white/10 rounded text-white/60 hover:text-white text-[7.5px] font-bold uppercase tracking-wide cursor-pointer"
                          >
                            📢 Provoquer Grève (+15% Tension)
                          </button>
                          <button
                            id="btn-sabotage-power"
                            onClick={async () => {
                              playClick();
                              try {
                                const res = await fetch("/api/prison/incite-riot", {
                                  method: "POST",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({ type: "sabotage" })
                                });
                                if (res.ok) {
                                  const data = await res.json();
                                  setPrisonTension(data.playerPrisonState.prisonTension);
                                  setSuspicionLevel((s) => Math.min(100, s + 10));
                                  onAddServerLog("[Donnacona] Court-circuit dans la buanderie ! Générateurs coupés temporairement.");
                                }
                              } catch (e) {
                                console.error(e);
                              }
                            }}
                            className="flex-1 py-1 bg-black/60 border border-white/10 rounded text-white/60 hover:text-white text-[7.5px] font-bold uppercase tracking-wide cursor-pointer"
                          >
                            ⚡ Saboter électricité (+20%)
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Section: Parole Application */}
                    <div className="rounded border border-white/10 bg-black/40 p-3 space-y-2">
                      <span className="text-[9px] font-mono font-bold text-white uppercase flex items-center gap-1.5">
                        <FileText size={11} className="text-emerald-400" /> Demande de Liberté Conditionnelle (Parole)
                      </span>

                      <div className="bg-black/60 rounded p-2.5 border border-white/5 text-[8.5px] space-y-1.5">
                        <div className="flex justify-between">
                          <span>Minimum de peine purgé (50%+) :</span>
                          <span className={prisonState.sentenceSeconds <= (originalSentence / 2) ? "text-emerald-400 font-bold" : "text-red-400"}>
                            {prisonState.sentenceSeconds <= (originalSentence / 2) ? "✔️ Éligible" : "❌ Requis : Moins de " + Math.round(originalSentence / 2) + "s de peine"}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Travail accompli (15+ Points) :</span>
                          <span className={rehabilitationPoints >= 15 ? "text-emerald-400 font-bold" : "text-amber-400"}>
                            {rehabilitationPoints >= 15 ? `✔️ ${rehabilitationPoints} / 15` : `❌ Requis : ${rehabilitationPoints} / 15 pts`}
                          </span>
                        </div>

                        {paroleStatus !== "none" && (
                          <div className={`mt-2 p-1.5 rounded text-center font-bold ${paroleStatus === "pending" ? "bg-amber-500/10 border border-amber-500/20 text-amber-400 animate-pulse" : "bg-red-500/10 border border-red-500/20 text-red-400"}`}>
                            {paroleStatus === "pending" ? "⏳ DEMANDE PENDANTE : En attente d'approbation au poste de Sûreté." : "❌ DEMANDE REJETÉE : Le Comité a refusé votre remise en liberté."}
                          </div>
                        )}
                      </div>

                      <button
                        id="btn-apply-parole"
                        disabled={prisonState.sentenceSeconds > (originalSentence / 2) || rehabilitationPoints < 15 || paroleStatus === "pending"}
                        onClick={async () => {
                          playClick();
                          try {
                            const res = await fetch("/api/prison/parole-apply", { method: "POST" });
                            if (res.ok) {
                              setParoleStatus("pending");
                              setParoleAttempts((a) => a + 1);
                              onAddServerLog("[Donnacona] Demande officielle de liberté conditionnelle déposée pour évaluation légale.");
                              recordActionForReplay("Dépôt dossier de conditionnelle");
                            }
                          } catch (e) {
                            console.error(e);
                          }
                        }}
                        className={`w-full py-1.5 rounded text-[8.5px] font-bold uppercase tracking-wider transition-all cursor-pointer border ${prisonState.sentenceSeconds <= (originalSentence / 2) && rehabilitationPoints >= 15 && paroleStatus !== "pending" ? "bg-emerald-600/20 hover:bg-emerald-600/35 border-emerald-500/30 text-emerald-400" : "bg-black/40 border-white/5 text-white/30 cursor-not-allowed"}`}
                      >
                        Soumettre Dossier Légal (Tentative #{paroleAttempts + 1})
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {/* Status if free but under parole */}
                    {probationSeconds > 0 && (
                      <div className="rounded border border-amber-500/30 bg-amber-950/25 p-3 space-y-1.5 animate-pulse">
                        <span className="text-[10px] uppercase font-mono font-extrabold text-amber-400 flex items-center gap-1.5">
                          <Timer size={12} className="text-amber-400 animate-spin" />
                          LIBERTÉ CONDITIONNELLE ACTIVE (PROBATION)
                        </span>
                        <p className="text-[8.5px] text-white/70">
                          Vous êtes actuellement surveillé par la Sûreté du Québec. Ne commettez aucun délit (Marché noir, Contrebande, Braquage) ou vous serez ré-incarcéré de force !
                        </p>
                        <div className="flex justify-between font-mono text-[9px] text-amber-300 font-bold bg-black/40 p-1.5 rounded border border-amber-500/20">
                          <span>Temps de probation restant :</span>
                          <span>{probationSeconds} secondes</span>
                        </div>
                      </div>
                    )}

                    {/* Standard free registry view */}
                    <div className="rounded border border-white/10 bg-[#16161a]/40 p-3 space-y-2.5">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-mono font-bold text-white uppercase flex items-center gap-1.5">
                          <Users size={12} className="text-red-500" /> Incarcérés Actuels (Membres & Agents)
                        </span>
                        <span className="text-[8px] bg-red-500/10 text-red-400 px-1 rounded border border-red-500/30 font-bold animate-pulse">ALERTE VIGILANCE</span>
                      </div>

                      <div className="space-y-1.5 max-h-48 overflow-y-auto">
                        {simulatedInmates.length > 0 ? (
                          simulatedInmates.map((inmate, idx) => (
                            <div key={idx} className="bg-black/60 rounded p-2 border border-white/5 text-[8.5px] space-y-1">
                              <div className="flex justify-between font-bold">
                                <span className="text-red-400">{inmate.name}</span>
                                <span className="text-white/40 font-mono">Cellule: {inmate.cellId}</span>
                              </div>
                              <p className="text-white/70">Motif: {inmate.crime}</p>
                              <div className="flex justify-between text-[7.5px] pt-1 border-t border-white/5 text-white/50">
                                <span>Peine restante: <strong className="text-white font-mono">{inmate.sentenceLeft}s</strong></span>
                                <span className={`px-1 rounded ${inmate.behavior === "Bon" ? "bg-emerald-500/10 text-emerald-400" : inmate.behavior === "Moyen" ? "bg-amber-500/10 text-amber-400" : "bg-red-500/10 text-red-400"}`}>
                                  Comportement: {inmate.behavior}
                                </span>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="text-center py-4 text-white/30 text-[9px] border border-dashed border-white/10 rounded">
                            Aucun détenu enregistré à Donnacona.
                          </div>
                        )}
                      </div>

                      {/* Interactive Parloir controls */}
                      <div className="grid grid-cols-2 gap-1.5 pt-1">
                        <button
                          id="btn-finance-prison"
                          onClick={() => {
                            if (cash < 150) {
                              onAddServerLog("[Prison] Fonds insuffisants pour parrainer le programme.");
                              return;
                            }
                            playClick();
                            setCash((c) => c - 150);
                            setVillages((vils) => {
                              return vils.map((v, i) => i === 0 ? { ...v, reputation: v.reputation + 15 } : v);
                            });
                            onAddServerLog("[Parloir] Don de 150$ versé pour réinsérer les détenus. Réputation régionale +15.");
                            recordActionForReplay("Don réinsertion");
                          }}
                          className="py-1.5 bg-black/60 border border-white/10 hover:bg-white/5 text-white rounded text-[8px] font-bold uppercase tracking-wider cursor-pointer"
                        >
                          📖 Financer Réinsertion (150$)
                        </button>

                        <button
                          id="btn-bail-gaston"
                          onClick={() => {
                            const gastonIdx = simulatedInmates.findIndex(i => i.name === "Gaston Tremblay");
                            if (gastonIdx === -1) {
                              onAddServerLog("[Prison] Gaston Tremblay n'est pas incarcéré.");
                              return;
                            }
                            if (bank < 300) {
                              onAddServerLog("[Caisse] Solde de banque insuffisant pour libérer Gaston Tremblay ($300).");
                              return;
                            }
                            playClick();
                            setBank((b) => b - 300);
                            setSimulatedInmates((prev) => prev.filter(i => i.name !== "Gaston Tremblay"));
                            setVillages((vils) => {
                              return vils.map((v, i) => i === 0 ? { ...v, reputation: v.reputation + 30 } : v);
                            });
                            onAddServerLog("[Caisse Desjardins] Caution réglée pour Gaston Tremblay ($300 CAD). Gaston est libéré ! Réputation +30.");
                            recordActionForReplay("Libération par caution de tiers");
                          }}
                          className="py-1.5 bg-emerald-600/10 hover:bg-emerald-600/20 border border-emerald-500/20 text-emerald-400 rounded text-[8px] font-bold uppercase tracking-wider cursor-pointer animate-pulse"
                        >
                          💸 Payer Caution Gaston (300$)
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* SubTab 2: Sûreté du Québec Police Module */}
            {socialSubTab === "police" && (
              <div className="space-y-3">
                {/* SQ Command Faction Switch */}
                <div className="rounded border border-blue-500/30 bg-blue-950/20 p-3 space-y-2.5">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-mono font-extrabold text-blue-400 uppercase flex items-center gap-1.5">
                      <Shield size={12} className="text-blue-500 animate-pulse" />
                      QUARTIER GÉNÉRAL DE LA SÛRETÉ DU QUÉBEC
                    </span>
                    <span className={`px-1 py-0.5 rounded text-[8px] font-bold ${policeOfficerDuty ? "bg-emerald-500/15 text-emerald-400 animate-pulse" : "bg-white/5 text-white/40"}`}>
                      {policeOfficerDuty ? "MATRICULE ACTIF" : "OFF-DUTY"}
                    </span>
                  </div>

                  <p className="text-[8.5px] text-white/60">
                    Prenez votre service pour administrer les dossiers d'écrou de Donnacona, libérer les détenus admissibles sur probation, et déployer des autopatrouilles de prévention.
                  </p>

                  <button
                    id="btn-toggle-sq-duty"
                    onClick={() => {
                      playClick();
                      const nextDuty = !policeOfficerDuty;
                      setPoliceOfficerDuty(nextDuty);
                      if (nextDuty) {
                        setActiveJob("Citoyen"); // police is supervisor, not resource job
                        onAddServerLog("[Sûreté SQ] Officier de garde assermenté. Terminal tactique déverrouillé.");
                        recordActionForReplay("Prise de service SQ");
                      } else {
                        onAddServerLog("[Sûreté SQ] Fin de service de l'officier de garde. Mode veille.");
                      }
                    }}
                    className={`w-full py-1.5 rounded text-[9px] font-bold uppercase tracking-wider transition-all cursor-pointer border ${policeOfficerDuty ? "bg-red-600/15 hover:bg-red-600/30 border-red-500/30 text-red-400" : "bg-blue-600/15 hover:bg-blue-600/30 border-blue-500/30 text-blue-400"}`}
                  >
                    {policeOfficerDuty ? "❌ Quitter Service de Garde (SQ)" : "👨‍✈️ Prendre Service Officier Sûreté (SQ)"}
                  </button>
                </div>

                {policeOfficerDuty ? (
                  <div className="space-y-3">
                    {/* Section: Parole Board / Comité de conditionnelle */}
                    <div className="rounded border border-white/10 bg-black/40 p-3 space-y-2">
                      <span className="text-[9px] font-mono font-bold text-white uppercase flex items-center gap-1.5">
                        <FileText size={11} className="text-blue-400" /> Tribunal de Liberté Conditionnelle (SQ)
                      </span>

                      <div className="space-y-1.5">
                        {/* Player request if pending */}
                        {prisonState.status === "Incarcéré" && paroleStatus === "pending" && (
                          <div className="bg-[#1c2438]/60 border border-amber-500/30 rounded p-2 text-[8.5px] space-y-1.5">
                            <div className="flex justify-between font-bold text-amber-400">
                              <span>Matricule Détenu: Joueur Actuel</span>
                              <span>Taux Réhabilitation: {rehabilitationPoints}pts</span>
                            </div>
                            <p className="text-white/70">Motif d'Écrou: {prisonState.crime}</p>
                            <div className="flex gap-1.5 pt-1">
                              <button
                                id="btn-police-approve-player"
                                onClick={async () => {
                                  playClick();
                                  try {
                                    const res = await fetch("/api/prison/parole-vote", {
                                      method: "POST",
                                      headers: { "Content-Type": "application/json" },
                                      body: JSON.stringify({ name: "player", vote: "approved" })
                                    });
                                    if (res.ok) {
                                      const data = await res.json();
                                      setPrisonState({
                                        status: data.playerPrisonState.status,
                                        sentenceSeconds: data.playerPrisonState.sentenceSeconds,
                                        crime: data.playerPrisonState.crime
                                      });
                                      setParoleStatus("approved");
                                      setProbationSeconds(data.playerPrisonState.probationSeconds);
                                      onAddServerLog("[Comité Parole] ACCORDÉ : Liberté conditionnelle approuvée pour le joueur. Probation de 40s initiée.");
                                      recordActionForReplay("Approbation parole joueur");
                                    }
                                  } catch (e) {
                                    console.error(e);
                                  }
                                }}
                                className="flex-1 py-1 bg-emerald-600/15 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-400 rounded text-[8px] font-extrabold uppercase tracking-wider cursor-pointer"
                              >
                                ✔️ Libérer (Probation 40s)
                              </button>
                              <button
                                id="btn-police-reject-player"
                                onClick={async () => {
                                  playClick();
                                  try {
                                    const res = await fetch("/api/prison/parole-vote", {
                                      method: "POST",
                                      headers: { "Content-Type": "application/json" },
                                      body: JSON.stringify({ name: "player", vote: "rejected" })
                                    });
                                    if (res.ok) {
                                      setParoleStatus("rejected");
                                      onAddServerLog("[Comité Parole] REJETÉ : Libération conditionnelle refusée pour indiscipline. Peine +10s.");
                                      recordActionForReplay("Refus parole joueur");
                                    }
                                  } catch (e) {
                                    console.error(e);
                                  }
                                }}
                                className="flex-1 py-1 bg-red-600/15 hover:bg-red-600/30 border border-red-500/30 text-red-400 rounded text-[8px] font-extrabold uppercase tracking-wider cursor-pointer"
                              >
                                ❌ Rejeter & Confinement
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Gaston Tremblay request if pending */}
                        {simulatedInmates.some(i => i.paroleStatus === "pending") ? (
                          simulatedInmates.filter(i => i.paroleStatus === "pending").map((inmate, idx) => (
                            <div key={idx} className="bg-[#1c2438]/60 border border-blue-500/30 rounded p-2 text-[8.5px] space-y-1.5">
                              <div className="flex justify-between font-bold text-blue-400">
                                <span>Matricule: {inmate.id} • {inmate.name}</span>
                                <span className="bg-emerald-500/10 text-emerald-400 px-1 rounded text-[7.5px]">Comportement: {inmate.behavior}</span>
                              </div>
                              <p className="text-white/70">Motif: {inmate.crime}</p>
                              <div className="flex gap-1.5 pt-1">
                                <button
                                  id="btn-police-approve-inmate"
                                  onClick={async () => {
                                    playClick();
                                    try {
                                      const res = await fetch("/api/prison/parole-vote", {
                                        method: "POST",
                                        headers: { "Content-Type": "application/json" },
                                        body: JSON.stringify({ name: inmate.name, vote: "approved" })
                                      });
                                      if (res.ok) {
                                        setSimulatedInmates((prev) => prev.filter(i => i.id !== inmate.id));
                                        setVillages((vils) => {
                                          return vils.map((v, i) => i === 0 ? { ...v, budget: v.budget + 200, reputation: v.reputation + 20 } : v);
                                        });
                                        onAddServerLog(`[Comité Parole] ACCORDÉ : ${inmate.name} est libéré d'écrou sous surveillance de probation. Trésor +200$, Rép +20.`);
                                        recordActionForReplay(`Approbation parole ${inmate.id}`);
                                      }
                                    } catch (e) {
                                      console.error(e);
                                    }
                                  }}
                                  className="flex-1 py-1 bg-emerald-600/15 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-400 rounded text-[8px] font-extrabold uppercase tracking-wider cursor-pointer"
                                >
                                  ✔️ Libérer l'Agent (Sûr)
                                </button>
                                <button
                                  id="btn-police-reject-inmate"
                                  onClick={async () => {
                                    playClick();
                                    try {
                                      const res = await fetch("/api/prison/parole-vote", {
                                        method: "POST",
                                        headers: { "Content-Type": "application/json" },
                                        body: JSON.stringify({ name: inmate.name, vote: "rejected" })
                                      });
                                      if (res.ok) {
                                        setSimulatedInmates((prev) => {
                                          return prev.map(i => i.id === inmate.id ? { ...i, paroleStatus: "rejected", sentenceLeft: i.sentenceLeft + 15 } : i);
                                        });
                                        onAddServerLog(`[Comité Parole] REJETÉ : Libération refusée pour ${inmate.name}. Peine prolongée.`);
                                        recordActionForReplay(`Rejet parole ${inmate.id}`);
                                      }
                                    } catch (e) {
                                      console.error(e);
                                    }
                                  }}
                                  className="flex-1 py-1 bg-red-600/15 hover:bg-red-600/30 border border-red-500/30 text-red-400 rounded text-[8px] font-extrabold uppercase tracking-wider cursor-pointer"
                                >
                                  ❌ Rejeter & Garder
                                </button>
                              </div>
                            </div>
                          ))
                        ) : null}

                        {!(prisonState.status === "Incarcéré" && paroleStatus === "pending") && !simulatedInmates.some(i => i.paroleStatus === "pending") && (
                          <div className="text-center py-3 text-white/30 text-[8.5px] border border-dashed border-white/5 rounded">
                            Aucun dossier de liberté conditionnelle en attente de signature.
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Section: Wanted Fugitives / Mandats d'Arrêt */}
                    <div className="rounded border border-white/10 bg-black/40 p-3 space-y-2">
                      <span className="text-[9px] font-mono font-bold text-white uppercase flex items-center gap-1.5">
                        <AlertOctagon size={11} className="text-red-400 animate-pulse" /> Mandats d'Arrêt & Fugitifs de Portneuf
                      </span>

                      {prisonState.status === "Évadé" ? (
                        <div className="bg-red-950/30 border border-red-500/30 rounded p-2.5 text-[8.5px] space-y-2">
                          <div className="flex justify-between font-bold text-red-400">
                            <span>🚨 FUYARD SIGNALÉ : Joueur Actuel</span>
                            <span>Avis: Urgent</span>
                          </div>
                          <p className="text-white/80">Le suspect s'est évadé du pénitencier et circule armé d'EtherPrism sur les axes routiers.</p>
                          <div className="grid grid-cols-2 gap-1.5">
                            <button
                              id="btn-police-launch-raid"
                              onClick={async () => {
                                playClick();
                                try {
                                  const res = await fetch("/api/prison/raid", { method: "POST" });
                                  if (res.ok) {
                                    const data = await res.json();
                                    if (data.capture) {
                                      setPrisonState({
                                        status: data.playerPrisonState.status,
                                        sentenceSeconds: data.playerPrisonState.sentenceSeconds,
                                        crime: data.playerPrisonState.crime
                                      });
                                      onAddServerLog("[Garde Tactique SQ] RAID TACTIQUE RÉUSSI : Fugitif appréhendé et ramené en cellule haute sécurité !");
                                      recordActionForReplay("Raid capture fuyard réussi");
                                    } else {
                                      setSuspicionLevel((s) => Math.min(100, s + 10));
                                      onAddServerLog("[Garde Tactique SQ] RAID ÉCHOUÉ : Le fuyard a déjoué le cordon de patrouille tactique ! Tension accrue.");
                                      recordActionForReplay("Raid capture fuyard échec");
                                    }
                                  }
                                } catch (e) {
                                  console.error(e);
                                }
                              }}
                              className="py-1 bg-red-600 hover:bg-red-700 text-white font-extrabold rounded text-[8px] uppercase tracking-wider cursor-pointer"
                            >
                              🚀 Lancer Raid SQ (50% Chance)
                            </button>
                            <button
                              id="btn-police-pardon"
                              onClick={async () => {
                                playClick();
                                try {
                                  const res = await fetch("/api/prison/amnesty", { method: "POST" });
                                  if (res.ok) {
                                    const data = await res.json();
                                    setPrisonState({
                                      status: data.playerPrisonState.status,
                                      sentenceSeconds: data.playerPrisonState.sentenceSeconds,
                                      crime: data.playerPrisonState.crime
                                    });
                                    onAddServerLog("[Sûreté SQ] AMNISTIE SIGNÉE : Pardon officiel accordé. Tous les mandats d'arrêt sont révoqués.");
                                    recordActionForReplay("Amnistie signée par SQ");
                                  }
                                } catch (e) {
                                  console.error(e);
                                }
                              }}
                              className="py-1 bg-black/60 border border-white/10 hover:bg-white/5 text-white rounded text-[8px] font-extrabold uppercase tracking-wider cursor-pointer"
                            >
                              📜 Signer Amnesty Légal
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-black/60 rounded p-2.5 text-center text-emerald-400 text-[8.5px] font-bold border border-emerald-500/20">
                          🟢 ORDRE PUBLIC MAINTENU : Aucun fuyard en liberté à Portneuf.
                        </div>
                      )}
                    </div>

                    {/* Section: Tactical Patrol Dispatch */}
                    <div className="rounded border border-white/10 bg-black/40 p-3 space-y-2">
                      <div className="flex justify-between items-center text-[9px]">
                        <span className="font-mono font-bold text-white uppercase flex items-center gap-1.5">
                          <Compass size={11} className="text-blue-400 animate-spin" />
                          Centre de Répartition des Autopatrouilles
                        </span>
                        {policeDispatchMode !== "idle" && (
                          <span className="font-mono text-amber-400 text-[8px] font-bold animate-pulse">Déployé ({policeDispatchTime}s)</span>
                        )}
                      </div>

                      {policeDispatchMode !== "idle" ? (
                        <div className="bg-black/60 border border-white/5 rounded p-2 text-[8.5px] space-y-1">
                          <p className="text-white/40">Mission en cours :</p>
                          <p className="text-white font-bold uppercase tracking-wider text-[9px] text-blue-400">
                            {policeDispatchMode === "patrol_138" ? "🚓 Patrouille active sur la Route 138" : policeDispatchMode === "patrol_roy" ? "🚓 Surveillance routière Chemin du Roy" : "🛡️ Sécurisation de la ligne de grève (Deschambault)"}
                          </p>
                          <div className="w-full bg-white/5 h-1 rounded overflow-hidden mt-1">
                            <div className="bg-blue-400 h-full transition-all duration-1000 animate-pulse" style={{ width: `${(policeDispatchTime / 20) * 100}%` }} />
                          </div>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 gap-1.5">
                          <button
                            id="btn-dispatch-138"
                            onClick={() => {
                              playClick();
                              setPoliceDispatchMode("patrol_138");
                              setPoliceDispatchTime(15);
                              onAddServerLog("[Poste SQ] Patrouille anti-vitesse déployée sur l'axe Route 138.");
                            }}
                            className="w-full py-1.5 bg-black/60 border border-white/10 rounded text-white text-[8px] font-bold uppercase tracking-wide hover:bg-blue-600/10 hover:border-blue-500/30 transition-all cursor-pointer text-left px-2.5 flex justify-between"
                          >
                            <span>🚗 Route 138 (15s)</span>
                            <span className="text-blue-400 font-mono">Gain: +350$ Trésor / +15 Rép SQ</span>
                          </button>

                          <button
                            id="btn-dispatch-roy"
                            onClick={() => {
                              playClick();
                              setPoliceDispatchMode("patrol_roy");
                              setPoliceDispatchTime(20);
                              onAddServerLog("[Poste SQ] Autopatrouille de proximité en route vers le Chemin du Roy.");
                            }}
                            className="w-full py-1.5 bg-black/60 border border-white/10 rounded text-white text-[8px] font-bold uppercase tracking-wide hover:bg-blue-600/10 hover:border-blue-500/30 transition-all cursor-pointer text-left px-2.5 flex justify-between"
                          >
                            <span>🚗 Chemin du Roy (20s)</span>
                            <span className="text-blue-400 font-mono">Gain: +200$ Trésor / +25 Rép SQ</span>
                          </button>

                          {unionStrike.isStriking && (
                            <button
                              id="btn-dispatch-grève"
                              onClick={() => {
                                playClick();
                                setPoliceDispatchMode("picket_line");
                                setPoliceDispatchTime(25);
                                onAddServerLog("[Poste SQ] Escouade anti-émeute déployée pour calmer la grève syndicale.");
                              }}
                              className="w-full py-1.5 bg-amber-600/10 border border-amber-500/30 rounded text-amber-400 text-[8px] font-bold uppercase tracking-wide hover:bg-amber-600/20 transition-all cursor-pointer text-left px-2.5 flex justify-between animate-bounce"
                            >
                              <span>🛡️ Ligne de Grève (25s)</span>
                              <span className="text-amber-400 font-mono">Présout Grève / +30 Rép Syndicat</span>
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Section: Prison & Escape Audit Logs (Registre d'Écrou & Évasions) */}
                    <div className="rounded border border-white/10 bg-black/40 p-3 space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-[9px] font-mono font-bold text-white uppercase flex items-center gap-1.5">
                          <FileText size={11} className="text-red-400" /> Registre d'Écrou & Logs d'Évasion (Audit)
                        </span>
                        <span className="text-[8px] bg-red-500/10 text-red-400 px-1.5 py-0.5 rounded border border-red-500/30 font-bold">
                          {serverEscapeLogs.length} Entrées
                        </span>
                      </div>

                      <div className="space-y-1.5 max-h-40 overflow-y-auto font-mono text-[8px]">
                        {serverEscapeLogs.length > 0 ? (
                          [...serverEscapeLogs].reverse().map((log) => (
                            <div key={log.id} className="bg-black/40 border border-white/5 rounded p-2 text-left space-y-1">
                              <div className="flex justify-between text-[7px] text-white/40">
                                <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
                                <span className={`px-1 rounded font-bold ${log.status === "Réussite" ? "bg-red-500/15 text-red-400" : "bg-emerald-500/15 text-emerald-400"}`}>
                                  {log.status === "Réussite" ? "⚠️ ÉVASION" : "✔️ ÉCHEC ÉVASION"}
                                </span>
                              </div>
                              <div className="text-white/90">
                                <strong className="text-blue-400">{log.inmateName}</strong>: {log.detail}
                              </div>
                              <div className="text-[7.5px] text-white/50 italic">
                                Méthode: {log.method}
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="text-center py-4 text-white/30 text-[8px] border border-dashed border-white/10 rounded">
                            Aucun mouvement ou incident récent au registre.
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="rounded border border-dashed border-white/10 bg-black/10 p-3 text-center text-[10px] text-white/40">
                    Sûreté du Québec en veille. Prenez votre service pour accéder au poste de répartition tactique et au Comité de conditionnelle.
                  </div>
                )}
              </div>
            )}

            {/* Traversier Saint-Laurent */}
            <div className="rounded border border-white/10 bg-[#16161a]/30 p-3 space-y-2">
              <div className="flex justify-between items-center text-[10px]">
                <span className="font-mono font-bold text-white uppercase flex items-center gap-1">
                  <Anchor size={11} className="text-blue-400" /> Traversier St-Laurent
                </span>
                <span className="font-mono text-emerald-400 text-[9px] animate-pulse">Horaire Actif</span>
              </div>
              <div className="bg-black/60 border border-white/5 rounded p-2 text-[10px] space-y-1">
                <div className="flex justify-between">
                  <span className="text-white/40">Position bateau :</span>
                  <span className="font-bold text-white">{ferrySchedule.status}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/40">Départ dans :</span>
                  <span className="font-mono text-amber-400 font-bold">{ferrySchedule.timeLeft} secondes</span>
                </div>
              </div>
              <button
                id="btn-board-ferry"
                onClick={() => {
                  playClick();
                  ContextualAudioManager.getInstance().playFerryHorn();
                  onAddServerLog("[Traversier] Billet composté. Voyage sécurisé vers la Rive Sud en cours...");
                  recordActionForReplay("Embarquement Traversier Cap-Santé");
                }}
                className="w-full py-1.5 bg-blue-600/15 hover:bg-blue-600/30 border border-blue-500/30 text-blue-400 rounded text-[9px] font-bold uppercase tracking-wider transition-all cursor-pointer"
              >
                Prendre le traversier (25$)
              </button>
            </div>

            {/* Elections & Villages Budget Controls */}
            <div className="rounded border border-white/10 bg-black/40 p-3 space-y-2.5">
              <span className="text-[10px] uppercase font-mono font-bold text-white flex items-center gap-1.5">
                <Compass size={12} className="text-blue-400" />
                Mairies & Taxes Municipales
              </span>

              <div className="space-y-2 pt-1">
                {villages.map((v, idx) => (
                  <div key={idx} className="bg-black/60 rounded p-2 border border-white/5 text-[9px] space-y-1.5">
                    <div className="flex justify-between font-bold">
                      <span className="text-white">{v.name}</span>
                      <span className="text-blue-400 font-mono">Taxes: {v.taxRate}%</span>
                    </div>
                    <div className="flex justify-between text-white/50 text-[8px]">
                      <span>Maire: {v.mayor}</span>
                      <span>Budget: {v.budget}$ CAD</span>
                    </div>

                    {v.mayor === "Moi-Même 👑" ? (
                      <div className="flex gap-1 items-center pt-1.5 border-t border-white/5">
                        <span className="text-[8px] text-white/40">Ajuster Taxes :</span>
                        <button
                          id={`btn-tax-down-${idx}`}
                          onClick={() => handleAdjustTaxes(idx, -2)}
                          className="px-1 bg-black/60 rounded text-red-400 border border-white/10 font-bold hover:bg-white/5"
                        >
                          -2%
                        </button>
                        <button
                          id={`btn-tax-up-${idx}`}
                          onClick={() => handleAdjustTaxes(idx, 2)}
                          className="px-1 bg-black/60 rounded text-emerald-400 border border-white/10 font-bold hover:bg-white/5"
                        >
                          +2%
                        </button>
                      </div>
                    ) : (
                      <button
                        id={`btn-campaign-mayor-${idx}`}
                        onClick={() => handleCampaignForMayor(idx)}
                        className="w-full py-1 bg-black/60 border border-white/10 rounded text-white hover:text-blue-400 hover:border-blue-500/30 text-[8px] uppercase tracking-wider font-bold transition-all cursor-pointer"
                      >
                        Financer Campagne (800$ + Réputation +30)
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* --- TECH (CRAFT & REPLAY) --- */}
        {subTab === "tech" && (
          <motion.div
            key="tech"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="space-y-3.5"
          >
            {/* Crafting System Grid */}
            <div className="rounded border border-white/10 bg-black/40 p-3 space-y-2.5">
              <span className="text-[10px] uppercase font-mono font-bold text-white flex items-center gap-1.5">
                <Pickaxe size={12} className="text-emerald-400" />
                Artisanat de Portneuf
              </span>

              <div className="grid grid-cols-1 gap-2">
                {CRAFT_RECIPES.map((recipe, idx) => {
                  const inputLabels = Object.entries(recipe.inputs)
                    .map(([item, qty]) => `${qty}x ${item.replace("_", " ")}`)
                    .join(", ");
                  return (
                    <div key={idx} className="bg-black/60 rounded p-2 border border-white/5 flex flex-col justify-between text-[9px] gap-1.5">
                      <div>
                        <span className="font-bold text-white uppercase block">{recipe.name}</span>
                        <span className="text-white/40 block">Inclus : {inputLabels}</span>
                      </div>
                      <button
                        id={`btn-craft-item-${idx}`}
                        onClick={() => handleCraftItem(recipe)}
                        className="py-1 bg-emerald-600/10 hover:bg-emerald-600/25 border border-emerald-500/30 text-emerald-400 rounded text-[8px] font-bold uppercase tracking-wider cursor-pointer transition-all"
                      >
                        Assembler l'item
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Cryptographic Replay System */}
            <div className="rounded border border-white/10 bg-black/40 p-3 space-y-2.5">
              <div className="flex items-center justify-between text-[10px]">
                <span className="uppercase font-mono font-bold text-white flex items-center gap-1.5">
                  <Clock size={12} className="text-blue-400" />
                  SHA-256 Audit Replay (30s)
                </span>
                <span className="font-mono text-[8px] text-white/30">Buffer: {replayBuffer.length}/8 actions</span>
              </div>

              <div className="bg-black/60 rounded p-2 border border-white/5 max-h-[140px] overflow-y-auto space-y-1.5 scrollbar-thin">
                {replayBuffer.length > 0 ? (
                  replayBuffer.map((rep) => (
                    <div key={rep.id} className="text-[9px] font-mono hover:bg-white/5 p-1 rounded leading-relaxed">
                      <div className="flex justify-between">
                        <span className="text-blue-400 font-bold">[{rep.time}]</span>
                        <span className="text-white/30 truncate max-w-[120px]">{rep.hash}</span>
                      </div>
                      <p className="text-white/70 mt-0.5">{rep.action}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-center py-4 text-white/30 text-[9px]">Aucune action enregistrée dans la chronologie de sécurité.</p>
                )}
              </div>

              {replayBuffer.length > 0 && (
                <div className="space-y-1.5">
                  <button
                    id="btn-execute-replay-audits"
                    onClick={handleTriggerReplay}
                    disabled={isReplaying}
                    className="w-full py-1.5 bg-blue-600/20 hover:bg-blue-600/35 border border-blue-500/30 text-blue-400 rounded text-[9px] uppercase tracking-widest font-bold transition-all cursor-pointer"
                  >
                    {isReplaying ? `REPLAY EN COURS... ${replayProgress}%` : "REJOUER LES 30 DERNIÈRES SECONDES"}
                  </button>
                  {isReplaying && (
                    <div className="w-full h-1 bg-black/60 rounded overflow-hidden">
                      <div className="h-full bg-blue-500 transition-all duration-150" style={{ width: `${replayProgress}%` }} />
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
        </AnimatePresence>
      </div>
    </div>
  );
}
