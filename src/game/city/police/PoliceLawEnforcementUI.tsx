import React, { useState, useEffect } from "react";
import {
  ShieldAlert, FileText, Lock, Unlock, DollarSign, Siren, Volume2,
  CheckCircle, X, UserCheck, AlertTriangle, Radio
} from "lucide-react";
import { PoliceSystem, PoliceTicket, JailRecord, PoliceUniform } from "../game/police/PoliceSystem";

interface PoliceLawEnforcementUIProps {
  isOpen: boolean;
  onClose: () => void;
  playerName: string;
  playerRole: string; // e.g. "police", "sq", "civ", "admin"
  playerCash: number;
  playerBank: number;
  onJobChange?: (newJob: string) => void;
  onDeductCash?: (amount: number) => void;
  onTeleportToJail?: () => void;
  onTeleportFromJail?: () => void;
}

export const PoliceLawEnforcementUI: React.FC<PoliceLawEnforcementUIProps> = ({
  isOpen,
  onClose,
  playerName,
  playerRole,
  playerCash,
  playerBank,
  onJobChange,
  onDeductCash,
  onTeleportToJail,
  onTeleportFromJail,
}) => {
  const [activeTab, setActiveTab] = useState<
    "enlist" | "uniforms" | "arrest" | "officer" | "ranks" | "radio" | "csr_fines" | "traffic_stop" | "booking" | "detective" | "patrol_route" | "citizen" | "jail"
  >("enlist");

  // Police Rank & Hierarchy State
  const [currentRankInfo, setCurrentRankInfo] = useState(PoliceSystem.getCurrentRankInfo());
  const [promotionStatus, setPromotionStatus] = useState(PoliceSystem.checkPromotionEligibility());

  // Radio Communication & AI Patrol State
  const [radioChannel, setRadioChannelState] = useState(PoliceSystem.getRadioChannel());
  const [radioMessages, setRadioMessages] = useState(PoliceSystem.getRadioMessages());
  const [customRadioText, setCustomRadioText] = useState("");
  const [aiPatrols, setAiPatrols] = useState(PoliceSystem.getAIPatrolVehicles());

  // CSR Citations State
  const [csrCitations] = useState(PoliceSystem.getCSRCitations());
  const [selectedCSRCode, setSelectedCSRCode] = useState(csrCitations[0]?.code || "CSR-328-1");
  const [csrTargetCitizen, setCsrTargetCitizen] = useState("Sylvain Tremblay");
  const [csrNotes, setCsrNotes] = useState("");

  // Restraint Mini-Game State
  const [restraintState, setRestraintState] = useState(PoliceSystem.getRestraintGame());

  // Patrol Mode State
  const [patrolMode, setPatrolMode] = useState<"code1_routine" | "code2_traffic_stop" | "code3_emergency" | "wildlife_ranger">(PoliceSystem.getPatrolMode());
  const [lightbarPattern, setLightbarPattern] = useState(PoliceSystem.getLightbarPattern());
  const [alleyMode, setAlleyMode] = useState(PoliceSystem.getAlleyLights());
  const [takedownOn, setTakedownOn] = useState(PoliceSystem.getTakedownLights());

  // Traffic Stop State
  const [trafficStop, setTrafficStop] = useState<any | null>(PoliceSystem.getActiveTrafficStop());
  const [isBlowing, setIsBlowing] = useState(false);
  const [breathalyzerData, setBreathalyzerData] = useState<{ bac: number; isOverLimit: boolean; message: string } | null>(null);
  const [trunkSearchData, setTrunkSearchData] = useState<{ itemsFound: string[]; message: string } | null>(null);

  // Booking Center State
  const [bookingSuspectName, setBookingSuspectName] = useState("Sylvain Tremblay");
  const [bookingSelectedCharges, setBookingSelectedCharges] = useState<string[]>([
    "Grand excès de vitesse (+45 km/h)",
    "Conduite avec facultés affaiblies (BAC > 0.08)",
  ]);
  const [fingerprintDone, setFingerprintDone] = useState(false);
  const [isTakingPhoto, setIsTakingPhoto] = useState(false);

  // Detective State
  const [searchRecordQuery, setSearchRecordQuery] = useState("");
  const [plateInput, setPlateInput] = useState("");
  const [scannedPlateResult, setScannedPlateResult] = useState<any | null>(null);

  // Checkpoints State
  const [checkpoints, setCheckpoints] = useState(PoliceSystem.getPatrolCheckpoints());

  // Wanted & Evidence State
  const [wantedSuspects, setWantedSuspects] = useState(PoliceSystem.getWantedSuspects());
  const [crimeEvidences, setCrimeEvidences] = useState(PoliceSystem.getCrimeEvidences());
  const [playerWantedState, setPlayerWantedState] = useState(PoliceSystem.getPlayerWantedState());
  const [newSuspectName, setNewSuspectName] = useState("");
  const [newSuspectReason, setNewSuspectReason] = useState("");
  const [newSuspectBounty, setNewSuspectBounty] = useState(2500);
  const [linkSuspectInput, setLinkSuspectInput] = useState<{ [evId: string]: string }>({});

  // Officer Form state
  const [targetName, setTargetName] = useState("Citoyen_01");
  const [ticketAmount, setTicketAmount] = useState("250");
  const [ticketReason, setTicketReason] = useState("Excès de vitesse (80km/h dans zone de 50km/h)");
  const [department, setDepartment] = useState<"SPVM" | "SQ">("SQ");
  const [jailDuration, setJailDuration] = useState("60");

  // Recruitment & Department State
  const [dutyStatus, setDutyStatus] = useState(PoliceSystem.getDutyStatus());
  const [selectedUniform, setSelectedUniform] = useState<PoliceUniform>(PoliceSystem.getSelectedUniform());
  const availableUniforms = PoliceSystem.getAvailableUniforms();

  // Arrest Flow State
  const [arrestStep, setArrestStep] = useState<"verbal" | "cuff" | "miranda" | "frisk" | "cell">("verbal");
  const [arrestSuspectName, setArrestSuspectName] = useState("Sylvain Tremblay");
  const [verbalCompliance, setVerbalCompliance] = useState(40);
  const [isSuspectCuffed, setIsSuspectCuffed] = useState(false);
  const [mirandaRead, setMirandaRead] = useState(false);
  const [friskResult, setFriskResult] = useState<{
    contrabandFound: string[];
    cashFound: number;
    weaponsFound: string[];
    message: string;
  } | null>(null);
  const [arrestReason, setArrestReason] = useState("Grand excès de vitesse (+50km/h) et refus d'obtempérer");
  const [arrestJailSeconds, setArrestJailSeconds] = useState("90");
  const [arrestBail, setArrestBail] = useState("750");

  // Status feedback
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  // Unpaid tickets & jail state
  const [unpaidTickets, setUnpaidTickets] = useState<PoliceTicket[]>([]);
  const [jailStatus, setJailStatus] = useState<JailRecord | undefined>(undefined);
  const [isCuffed, setIsCuffed] = useState(false);
  const [sirenOn, setSirenOn] = useState(false);

  const isOfficer =
    dutyStatus.isOnDuty ||
    playerRole === "police" ||
    playerRole === "sq" ||
    playerRole === "admin" ||
    playerRole === "mod";

  // Refresh data loop
  useEffect(() => {
    if (!isOpen) return;
    const interval = setInterval(() => {
      setDutyStatus({ ...PoliceSystem.getDutyStatus() });
      setSelectedUniform(PoliceSystem.getSelectedUniform());
      setUnpaidTickets(PoliceSystem.getUnpaidTickets("local_player"));
      const jStatus = PoliceSystem.getJailStatus("local_player");
      setJailStatus(jStatus);
      setIsCuffed(PoliceSystem.isHandcuffed("local_player"));
      setSirenOn(PoliceSystem.getSirenState().active);
      setCheckpoints([...PoliceSystem.getPatrolCheckpoints()]);
      setWantedSuspects([...PoliceSystem.getWantedSuspects()]);
      setCrimeEvidences([...PoliceSystem.getCrimeEvidences()]);
      setPlayerWantedState({ ...PoliceSystem.getPlayerWantedState() });

      // Decrement jail countdown
      if (jStatus && jStatus.timeRemaining > 0) {
        const remaining = PoliceSystem.updateJailTime("local_player", 1);
        if (remaining === 0 && onTeleportFromJail) {
          onTeleportFromJail();
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen, onTeleportFromJail]);

  if (!isOpen) return null;

  // Handlers
  const handleIssueTicket = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseInt(ticketAmount);
    if (!targetName || isNaN(amt) || amt <= 0) return;

    PoliceSystem.issueTicket(
      "local_player", // Default target for local demo testing
      targetName,
      "officer_local",
      `${playerName} (${department})`,
      department,
      amt,
      ticketReason
    );

    setFeedbackMsg(`📋 Contrevenant ${targetName} a reçu une amende de ${amt}$ !`);
    setTimeout(() => setFeedbackMsg(null), 4000);
  };

  const handleArrestPlayer = (e: React.FormEvent) => {
    e.preventDefault();
    const duration = parseInt(jailDuration) || 60;
    PoliceSystem.arrestPlayer(
      "local_player",
      targetName,
      `${playerName} (${department})`,
      duration,
      ticketReason
    );

    if (onTeleportToJail) onTeleportToJail();
    setFeedbackMsg(`🚓 Suspect ${targetName} arrêté et écroué pour ${duration}s !`);
    setTimeout(() => setFeedbackMsg(null), 4000);
  };

  const handlePayFine = (ticketId: string, amount: number) => {
    if (playerCash < amount) {
      alert("⚠️ Fonds insuffisants en liquide !");
      return;
    }

    if (onDeductCash) onDeductCash(amount);
    PoliceSystem.payTicket(ticketId);
    setUnpaidTickets(PoliceSystem.getUnpaidTickets("local_player"));
    setFeedbackMsg(`✅ Amende de ${amount}$ réglée au Ministère de la Justice !`);
    setTimeout(() => setFeedbackMsg(null), 3500);
  };

  const handlePayBail = () => {
    if (!jailStatus) return;
    if (playerCash < jailStatus.bailAmount) {
      alert(`⚠️ Vous n'avez pas les ${jailStatus.bailAmount}$ requis pour la caution !`);
      return;
    }

    if (onDeductCash) onDeductCash(jailStatus.bailAmount);
    PoliceSystem.payBail("local_player");
    if (onTeleportFromJail) onTeleportFromJail();
    setFeedbackMsg("⚖️ Caution payée ! Vous êtes libre de quitter le Poste de Police.");
    setTimeout(() => setFeedbackMsg(null), 3500);
  };

  return (
    <div className="fixed inset-0 z-[130] flex items-center justify-center bg-black/60 backdrop-blur-md animate-fade-in font-mono">
      <div className="relative w-full max-w-2xl bg-[#090e1a] border border-blue-500/40 rounded-3xl shadow-[0_0_60px_rgba(59,130,246,0.3)] overflow-hidden flex flex-col max-h-[85vh]">
        
        {/* Header Bar */}
        <div className="bg-slate-950 px-6 py-4 border-b border-blue-500/30 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-blue-600/20 border border-blue-400/40 text-blue-400">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <div className="text-[10px] tracking-widest text-blue-400 font-bold uppercase">
                Gouvernement du Québec • Sûreté & SPVM
              </div>
              <h2 className="text-lg font-black text-white">
                Système d'Application de la Loi RP
              </h2>
            </div>
          </div>

          <button onClick={onClose} className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Feedback Alert Banner */}
        {feedbackMsg && (
          <div className="bg-emerald-950/90 border-b border-emerald-500/40 px-6 py-2.5 text-xs text-emerald-300 font-bold flex items-center gap-2">
            <CheckCircle className="w-4 h-4 shrink-0" />
            <span>{feedbackMsg}</span>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-800 bg-slate-900/80 px-6 pt-2 shrink-0 gap-2 overflow-x-auto scrollbar-none">
          {/* Universal Recruitment / Status Tab */}
          <button
            onClick={() => setActiveTab("enlist")}
            className={`px-4 py-2.5 rounded-t-xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap ${
              activeTab === "enlist"
                ? "bg-blue-600 text-white shadow-lg"
                : "bg-slate-950 text-slate-400 hover:text-white"
            }`}
          >
            🏛️ Enrôlement Police (SQ / SPVM)
          </button>

          {isOfficer && (
            <>
              <button
                onClick={() => setActiveTab("uniforms")}
                className={`px-4 py-2.5 rounded-t-xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap ${
                  activeTab === "uniforms"
                    ? "bg-emerald-600 text-white shadow-lg"
                    : "bg-slate-950 text-slate-400 hover:text-white"
                }`}
              >
                👔 Uniformes & Vestiaire
              </button>

              <button
                onClick={() => setActiveTab("arrest")}
                className={`px-4 py-2.5 rounded-t-xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap ${
                  activeTab === "arrest"
                    ? "bg-red-600 text-white shadow-lg"
                    : "bg-slate-950 text-slate-400 hover:text-white"
                }`}
              >
                🚨 Arrestation & Menottes
              </button>

              <button
                onClick={() => setActiveTab("officer")}
                className={`px-4 py-2.5 rounded-t-xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap ${
                  activeTab === "officer"
                    ? "bg-blue-600 text-white shadow-lg"
                    : "bg-slate-950 text-slate-400 hover:text-white"
                }`}
              >
                <Siren className="w-4 h-4" /> Agent Patrouille & Gyros
              </button>

              <button
                onClick={() => setActiveTab("ranks")}
                className={`px-4 py-2.5 rounded-t-xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap ${
                  activeTab === "ranks"
                    ? "bg-indigo-600 text-white shadow-lg"
                    : "bg-slate-950 text-slate-400 hover:text-white"
                }`}
              >
                ⚜️ Rangs & Perks SQ
              </button>

              <button
                onClick={() => setActiveTab("radio")}
                className={`px-4 py-2.5 rounded-t-xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap ${
                  activeTab === "radio"
                    ? "bg-cyan-600 text-white shadow-lg"
                    : "bg-slate-950 text-slate-400 hover:text-white"
                }`}
              >
                <Radio className="w-4 h-4" /> Radio & Renforts IA
              </button>

              <button
                onClick={() => setActiveTab("csr_fines")}
                className={`px-4 py-2.5 rounded-t-xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap ${
                  activeTab === "csr_fines"
                    ? "bg-amber-600 text-white shadow-lg"
                    : "bg-slate-950 text-slate-400 hover:text-white"
                }`}
              >
                ⚖️ Infractions CSR ({csrCitations.length})
              </button>

              <button
                onClick={() => {
                  setActiveTab("traffic_stop");
                  setTrafficStop(PoliceSystem.getActiveTrafficStop());
                }}
                className={`px-4 py-2.5 rounded-t-xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap ${
                  activeTab === "traffic_stop"
                    ? "bg-amber-700 text-white shadow-lg"
                    : "bg-slate-950 text-slate-400 hover:text-white"
                }`}
              >
                🛑 Contrôle Routier {PoliceSystem.getActiveTrafficStop() ? "(!)" : ""}
              </button>

              <button
                onClick={() => setActiveTab("booking")}
                className={`px-4 py-2.5 rounded-t-xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap ${
                  activeTab === "booking"
                    ? "bg-red-700 text-white shadow-lg"
                    : "bg-slate-950 text-slate-400 hover:text-white"
                }`}
              >
                🔒 Centre d'Écrou SQ
              </button>

              <button
                onClick={() => setActiveTab("detective")}
                className={`px-4 py-2.5 rounded-t-xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap ${
                  activeTab === "detective"
                    ? "bg-purple-600 text-white shadow-lg"
                    : "bg-slate-950 text-slate-400 hover:text-white"
                }`}
              >
                🔍 Enquêteur & Plaque
              </button>

              <button
                onClick={() => setActiveTab("patrol_route")}
                className={`px-4 py-2.5 rounded-t-xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap ${
                  activeTab === "patrol_route"
                    ? "bg-emerald-600 text-white shadow-lg"
                    : "bg-slate-950 text-slate-400 hover:text-white"
                }`}
              >
                📍 Circuit Portneuf
              </button>
            </>
          )}

          <button
            onClick={() => setActiveTab("citizen")}
            className={`px-4 py-2.5 rounded-t-xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap ${
              activeTab === "citizen"
                ? "bg-blue-600 text-white shadow-lg"
                : "bg-slate-950 text-slate-400 hover:text-white"
            }`}
          >
            <FileText className="w-4 h-4" /> Mes Amendes ({unpaidTickets.length})
          </button>

          <button
            onClick={() => setActiveTab("jail")}
            className={`px-4 py-2.5 rounded-t-xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap ${
              activeTab === "jail"
                ? "bg-red-600 text-white shadow-lg"
                : "bg-slate-950 text-slate-400 hover:text-white"
            }`}
          >
            <Lock className="w-4 h-4" /> Cellule de Garde à Vue
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="p-6 overflow-y-auto flex-1 scrollbar-thin text-slate-200">
          
          {/* TAB: RECRUITMENT & ENLISTMENT */}
          {activeTab === "enlist" && (
            <div className="flex flex-col gap-6 animate-fade-in">
              {/* Status Header */}
              <div className="p-5 rounded-3xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl font-black border ${
                    dutyStatus.isOnDuty
                      ? dutyStatus.department === "SQ"
                        ? "bg-amber-500/20 border-amber-500/50 text-amber-400"
                        : "bg-blue-500/20 border-blue-500/50 text-blue-400"
                      : "bg-slate-800/40 border-slate-700 text-slate-400"
                  }`}>
                    {dutyStatus.isOnDuty ? (dutyStatus.department === "SQ" ? "SQ" : "SPVM") : "CIV"}
                  </div>
                  <div>
                    <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Affiliation & Corps Policier
                    </div>
                    <h3 className="text-base font-black text-white flex items-center gap-2">
                      {dutyStatus.isOnDuty ? (
                        <>
                          <span>{dutyStatus.department === "SQ" ? "Sûreté du Québec" : "Police Municipale"}</span>
                          <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/40">
                            EN SERVICE ACTIF
                          </span>
                        </>
                      ) : (
                        <>
                          <span>Citoyen Civil</span>
                          <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full border border-slate-700">
                            NON ASSERMENTÉ
                          </span>
                        </>
                      )}
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">
                      {dutyStatus.isOnDuty
                        ? `Matricule officiel : ${dutyStatus.badge} • Rang : ${PoliceSystem.getCurrentRankInfo().title}`
                        : "Vous pouvez rejoindre les forces de l'ordre du Québec pour patrouiller, arrêter des suspects et régir la sécurité routière."}
                    </p>
                  </div>
                </div>

                {dutyStatus.isOnDuty && (
                  <button
                    onClick={() => {
                      const res = PoliceSystem.leaveDepartment();
                      onJobChange?.("Architecte & Citoyen");
                      setDutyStatus({ ...PoliceSystem.getDutyStatus() });
                      setFeedbackMsg(res.message);
                    }}
                    className="px-4 py-2.5 rounded-xl bg-red-950/60 hover:bg-red-900 border border-red-500/40 text-red-300 text-xs font-bold transition flex items-center gap-2 cursor-pointer"
                  >
                    <span>🚪 Rendre l'insigne (Quitter)</span>
                  </button>
                )}
              </div>

              {/* Department Choice Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 1. SQ CARD */}
                <div className={`p-6 rounded-3xl border transition flex flex-col justify-between gap-5 ${
                  dutyStatus.isOnDuty && dutyStatus.department === "SQ"
                    ? "bg-gradient-to-br from-[#1a2016] to-[#0d120a] border-amber-500/60 shadow-[0_0_30px_rgba(245,158,11,0.2)]"
                    : "bg-slate-950/80 border-slate-800 hover:border-amber-500/40"
                }`}>
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">⚜️</span>
                        <h4 className="text-sm font-black text-amber-300 uppercase tracking-wider">
                          Sûreté du Québec (SQ)
                        </h4>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40">
                        Force Provinciale
                      </span>
                    </div>

                    <p className="text-xs text-slate-300 leading-relaxed">
                      Corps policier national responsable des autoroutes, des territoires régionaux, de la Route 138 et des réserves fauniques des Laurentides.
                    </p>

                    <div className="space-y-2 text-[11px] text-slate-400 mt-2 bg-black/30 p-3 rounded-2xl border border-white/5">
                      <div className="flex items-center gap-2">
                        <span className="text-amber-400">🚓</span>
                        <span><strong>Flotte :</strong> Charger Hemi, Explorer VUS, F-150 Faune, Fantôme</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-amber-400">👔</span>
                        <span><strong>Uniforme :</strong> Vert olive officiel SQ, galon doré, veste CSR</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-amber-400">🛡️</span>
                        <span><strong>Unités :</strong> Patrouille autoroutière, GTI tactique, Faune</span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      const res = PoliceSystem.joinDepartment("SQ");
                      onJobChange?.("Agent de la Sûreté du Québec (SQ)");
                      setDutyStatus({ ...PoliceSystem.getDutyStatus() });
                      setSelectedUniform(PoliceSystem.getSelectedUniform());
                      setFeedbackMsg(res.message);
                      setActiveTab("uniforms");
                    }}
                    className={`w-full py-3 rounded-2xl text-xs font-black transition flex items-center justify-center gap-2 cursor-pointer ${
                      dutyStatus.isOnDuty && dutyStatus.department === "SQ"
                        ? "bg-amber-500 text-slate-950 hover:bg-amber-400 shadow-lg"
                        : "bg-amber-600/20 hover:bg-amber-500 hover:text-slate-950 text-amber-300 border border-amber-500/40"
                    }`}
                  >
                    {dutyStatus.isOnDuty && dutyStatus.department === "SQ" ? (
                      <>✓ En service dans la SQ (Changer Tenue)</>
                    ) : (
                      <>⚜️ Rejoindre la Sûreté du Québec</>
                    )}
                  </button>
                </div>

                {/* 2. SPVM / POLICE MUNICIPALE CARD */}
                <div className={`p-6 rounded-3xl border transition flex flex-col justify-between gap-5 ${
                  dutyStatus.isOnDuty && dutyStatus.department === "SPVM"
                    ? "bg-gradient-to-br from-[#0e1726] to-[#070b13] border-blue-500/60 shadow-[0_0_30px_rgba(59,130,246,0.2)]"
                    : "bg-slate-950/80 border-slate-800 hover:border-blue-500/40"
                }`}>
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">🏙️</span>
                        <h4 className="text-sm font-black text-blue-300 uppercase tracking-wider">
                          Police Municipale (SPVM)
                        </h4>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 font-bold border border-blue-500/40">
                        Force Municipale
                      </span>
                    </div>

                    <p className="text-xs text-slate-300 leading-relaxed">
                      Service de police municipal dédié à la tranquillité du centre-ville, aux quartiers commerçants, à la circulation locale et aux interventions de proximité.
                    </p>

                    <div className="space-y-2 text-[11px] text-slate-400 mt-2 bg-black/30 p-3 rounded-2xl border border-white/5">
                      <div className="flex items-center gap-2">
                        <span className="text-blue-400">🚔</span>
                        <span><strong>Flotte :</strong> Berline Intercepteur Municipal, Patrouille VTT</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-blue-400">👔</span>
                        <span><strong>Uniforme :</strong> Bleu marine nuit, écusson argenté, polo rapide</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-blue-400">⚡</span>
                        <span><strong>Missions :</strong> Ordre public urbain, radar mobile, tapage nocturne</span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      const res = PoliceSystem.joinDepartment("SPVM");
                      onJobChange?.("Agent de Police Municipale (SPVM)");
                      setDutyStatus({ ...PoliceSystem.getDutyStatus() });
                      setSelectedUniform(PoliceSystem.getSelectedUniform());
                      setFeedbackMsg(res.message);
                      setActiveTab("uniforms");
                    }}
                    className={`w-full py-3 rounded-2xl text-xs font-black transition flex items-center justify-center gap-2 cursor-pointer ${
                      dutyStatus.isOnDuty && dutyStatus.department === "SPVM"
                        ? "bg-blue-500 text-white hover:bg-blue-400 shadow-lg"
                        : "bg-blue-600/20 hover:bg-blue-500 hover:text-white text-blue-300 border border-blue-500/40"
                    }`}
                  >
                    {dutyStatus.isOnDuty && dutyStatus.department === "SPVM" ? (
                      <>✓ En service dans la Police Municipale</>
                    ) : (
                      <>🏙️ Rejoindre la Police Municipale</>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB: SELECTABLE UNIFORMS */}
          {activeTab === "uniforms" && (
            <div className="flex flex-col gap-6 animate-fade-in">
              {/* Equipped Showcase */}
              <div className="p-5 rounded-3xl bg-slate-950 border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div
                    className="w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-bold shadow-lg border border-white/20"
                    style={{ backgroundColor: selectedUniform.colorScheme.primary }}
                  >
                    👮
                  </div>
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                      <span>Tenue Actuellement Équipée</span>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[9px]">ACTIVE</span>
                    </div>
                    <h3 className="text-base font-black text-white">{selectedUniform.name}</h3>
                    <p className="text-xs text-slate-300 mt-0.5">{selectedUniform.description}</p>
                    <div className="text-[11px] text-amber-300 font-bold mt-1.5 flex items-center gap-1.5">
                      <span>⚡ Avantage :</span>
                      <span>{selectedUniform.bonusDescription}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end md:self-center">
                  <div className="flex gap-1.5 p-2 bg-black/40 rounded-xl border border-white/10">
                    <div className="w-5 h-5 rounded-md border border-white/20" style={{ backgroundColor: selectedUniform.colorScheme.primary }} title="Couleur Principale" />
                    <div className="w-5 h-5 rounded-md border border-white/20" style={{ backgroundColor: selectedUniform.colorScheme.secondary }} title="Couleur Secondaire" />
                    {selectedUniform.colorScheme.vest && (
                      <div className="w-5 h-5 rounded-md border border-white/20" style={{ backgroundColor: selectedUniform.colorScheme.vest }} title="Gilet Tactique" />
                    )}
                  </div>
                </div>
              </div>

              {/* Uniforms Catalog Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {availableUniforms.map((uniform) => {
                  const isEquipped = selectedUniform.id === uniform.id;
                  return (
                    <div
                      key={uniform.id}
                      className={`p-5 rounded-3xl border transition flex flex-col justify-between gap-4 ${
                        isEquipped
                          ? "bg-slate-900/90 border-emerald-500/60 shadow-[0_0_30px_rgba(16,185,129,0.15)]"
                          : "bg-slate-950/70 border-slate-800 hover:border-slate-700"
                      }`}
                    >
                      <div className="flex flex-col gap-2.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <div
                              className="w-7 h-7 rounded-xl border border-white/20 shadow-inner flex items-center justify-center text-xs"
                              style={{ backgroundColor: uniform.colorScheme.primary }}
                            >
                              👔
                            </div>
                            <h4 className="text-xs font-black text-white">{uniform.name}</h4>
                          </div>
                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${
                            uniform.department === "SQ"
                              ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                              : "bg-blue-500/20 text-blue-300 border-blue-500/40"
                          }`}>
                            {uniform.badgeLabel}
                          </span>
                        </div>

                        <p className="text-[11px] text-slate-400 leading-relaxed">
                          {uniform.description}
                        </p>

                        <div className="text-[10px] text-emerald-400 bg-emerald-950/40 p-2.5 rounded-xl border border-emerald-500/20">
                          <strong>Bonus :</strong> {uniform.bonusDescription}
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          PoliceSystem.selectUniform(uniform.id);
                          setSelectedUniform(PoliceSystem.getSelectedUniform());
                          setFeedbackMsg(`Uniforme équipé : ${uniform.name} !`);
                        }}
                        className={`w-full py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
                          isEquipped
                            ? "bg-emerald-600 text-white shadow-lg cursor-default"
                            : "bg-slate-800 hover:bg-slate-700 text-white hover:text-emerald-300"
                        }`}
                      >
                        {isEquipped ? "✓ Uniforme Actuellement Porté" : "Équiper cet uniforme"}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB: TACTICAL ARREST SYSTEM */}
          {activeTab === "arrest" && (
            <div className="flex flex-col gap-6 animate-fade-in">
              {/* Target Suspect Selector Header */}
              <div className="p-5 rounded-3xl bg-slate-950 border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-red-600/20 border border-red-500/40 flex items-center justify-center text-red-400 text-xl font-black">
                    🚨
                  </div>
                  <div>
                    <div className="text-[10px] font-bold text-red-400 uppercase tracking-widest">
                      Protocole Légal d'Arrestation
                    </div>
                    <h3 className="text-sm font-black text-white">
                      Maîtrise, Menottage & Détention de Joueur
                    </h3>
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full md:w-auto">
                  <span className="text-[11px] text-slate-400 font-bold whitespace-nowrap">Suspect :</span>
                  <input
                    type="text"
                    value={arrestSuspectName}
                    onChange={(e) => setArrestSuspectName(e.target.value)}
                    placeholder="Nom du joueur / suspect..."
                    className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-red-500 w-full md:w-48"
                  />
                </div>
              </div>

              {/* Arrest Steps Workflow */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                {[
                  { key: "verbal", label: "1. Sommation", icon: "🗣️" },
                  { key: "cuff", label: "2. Menottage", icon: "🔒" },
                  { key: "miranda", label: "3. Droits", icon: "📜" },
                  { key: "frisk", label: "4. Fouille", icon: "🔍" },
                  { key: "cell", label: "5. Cellule", icon: "🏢" },
                ].map((st) => (
                  <button
                    key={st.key}
                    onClick={() => setArrestStep(st.key as any)}
                    className={`p-3 rounded-2xl border text-center transition flex flex-col items-center gap-1 cursor-pointer ${
                      arrestStep === st.key
                        ? "bg-red-600/30 border-red-500 text-white shadow-lg"
                        : "bg-slate-950 border-slate-800 text-slate-400 hover:text-white"
                    }`}
                  >
                    <span className="text-xl">{st.icon}</span>
                    <span className="text-[11px] font-bold">{st.label}</span>
                  </button>
                ))}
              </div>

              {/* Step 1: Verbal Command */}
              {arrestStep === "verbal" && (
                <div className="p-6 rounded-3xl bg-slate-950 border border-slate-800 flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2">
                      <span>🗣️ Étape 1 : Sommation Légale & Ordre de se rendre</span>
                    </h4>
                    <span className="text-xs font-mono font-bold text-amber-400">
                      Conformité : {verbalCompliance}%
                    </span>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed">
                    Ordre officiel : <strong className="text-amber-300">"Sûreté du Québec ! Ne bougez plus, mettez vos mains bien en vue au-dessus de la tête et agenouillez-vous !"</strong>
                  </p>

                  <div className="w-full bg-slate-900 h-3 rounded-full overflow-hidden border border-slate-800">
                    <div
                      className="h-full bg-gradient-to-r from-amber-500 to-emerald-400 transition-all duration-300"
                      style={{ width: `${verbalCompliance}%` }}
                    />
                  </div>

                  <div className="flex flex-wrap gap-3 mt-2">
                    <button
                      onClick={() => {
                        PoliceSystem.triggerAirhorn();
                        setVerbalCompliance((prev) => Math.min(100, prev + 25));
                        setFeedbackMsg(`Sommation au mégaphone lancée à ${arrestSuspectName} !`);
                      }}
                      className="px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-slate-950 font-black text-xs transition cursor-pointer flex items-center gap-2 shadow-md"
                    >
                      <span>📢 Intimer l'ordre au mégaphone (+25%)</span>
                    </button>

                    <button
                      onClick={() => {
                        setArrestStep("cuff");
                      }}
                      className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition cursor-pointer flex items-center gap-2 ml-auto"
                    >
                      <span>Passer au menottage tactique ➔</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Step 2: Handcuffs */}
              {arrestStep === "cuff" && (
                <div className="p-6 rounded-3xl bg-slate-950 border border-slate-800 flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2">
                      <span>🔒 Étape 2 : Menottage Tactique à Deux Poignets</span>
                    </h4>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                      isSuspectCuffed ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40" : "bg-red-500/20 text-red-400 border border-red-500/40"
                    }`}>
                      {isSuspectCuffed ? "MENOTTÉ & SÉCURISÉ" : "NON MENOTTÉ"}
                    </span>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed">
                    Pose réglementaire des menottes à maillons en acier inoxydable dans le dos du suspect. Prévient toute tentative de fuite ou rébellion physique.
                  </p>

                  <div className="flex flex-wrap gap-3 mt-2">
                    <button
                      onClick={() => {
                        PoliceSystem.cuffPlayer(arrestSuspectName);
                        setIsSuspectCuffed(true);
                        PoliceSystem.playDispatchChime();
                        setFeedbackMsg(`*Clic-clac* Menottes passées aux poignets de ${arrestSuspectName} !`);
                      }}
                      className={`px-5 py-3 rounded-2xl text-xs font-black transition cursor-pointer flex items-center gap-2 shadow-lg ${
                        isSuspectCuffed
                          ? "bg-slate-800 text-slate-400 border border-slate-700"
                          : "bg-blue-600 hover:bg-blue-500 text-white"
                      }`}
                    >
                      <span>🔒 {isSuspectCuffed ? "Menottes verrouillées" : "Poser les menottes réglementaires"}</span>
                    </button>

                    <button
                      onClick={() => setArrestStep("miranda")}
                      className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition cursor-pointer flex items-center gap-2 ml-auto"
                    >
                      <span>Énoncer les droits constitutionnels ➔</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Step 3: Miranda / Quebec Charter */}
              {arrestStep === "miranda" && (
                <div className="p-6 rounded-3xl bg-slate-950 border border-slate-800 flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2">
                      <span>📜 Étape 3 : Lecture de la Charte Québécoise des Droits</span>
                    </h4>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                      mirandaRead ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40" : "bg-amber-500/20 text-amber-400 border border-amber-500/40"
                    }`}>
                      {mirandaRead ? "DROITS ÉNONCÉS" : "EN ATTENTE"}
                    </span>
                  </div>

                  <div className="p-4 rounded-2xl bg-black/40 border border-white/10 text-xs text-amber-200 leading-relaxed font-mono">
                    « Vous êtes en état d'arrestation sous l'autorité du Code de procédure pénale du Québec. Vous avez le droit de garder le silence. Tout ce que vous direz pourra être admis en preuve contre vous. Vous avez le droit de recourir sans délai à l'assistance d'un avocat de votre choix ou d'obtenir les conseils gratuits d'un avocat de garde de l'aide juridique. Avez-vous bien compris vos droits ? »
                  </div>

                  <div className="flex flex-wrap gap-3 mt-2">
                    <button
                      onClick={() => {
                        setMirandaRead(true);
                        PoliceSystem.playDispatchChime();
                        setFeedbackMsg(`Mise en garde constitutionnelle lue à ${arrestSuspectName}.`);
                      }}
                      className="px-5 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs transition cursor-pointer flex items-center gap-2 shadow-lg"
                    >
                      <span>✓ Énoncer officiellement la mise en garde au suspect</span>
                    </button>

                    <button
                      onClick={() => setArrestStep("frisk")}
                      className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition cursor-pointer flex items-center gap-2 ml-auto"
                    >
                      <span>Procéder à la fouille corporelle ➔</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Step 4: Frisking / Search */}
              {arrestStep === "frisk" && (
                <div className="p-6 rounded-3xl bg-slate-950 border border-slate-800 flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2">
                      <span>🔍 Étape 4 : Fouille au Corps Immédiate</span>
                    </h4>
                    {friskResult && (
                      <span className="text-xs text-emerald-400 font-bold">FOUILLE EFFECTUÉE</span>
                    )}
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed">
                    Palpation de sécurité et inspection des poches, du sac et de la ceinture pour désarmer le suspect et saisir les pièces à conviction.
                  </p>

                  <button
                    onClick={() => {
                      const res = PoliceSystem.friskSuspect(arrestSuspectName);
                      setFriskResult(res);
                      setFeedbackMsg(res.message);
                    }}
                    className="self-start px-5 py-3 rounded-2xl bg-purple-600 hover:bg-purple-500 text-white font-black text-xs transition cursor-pointer flex items-center gap-2 shadow-lg"
                  >
                    <span>🧤 Effectuer la palpation et fouille au corps</span>
                  </button>

                  {friskResult && (
                    <div className="p-4 rounded-2xl bg-black/40 border border-purple-500/30 text-xs flex flex-col gap-2">
                      <div className="font-bold text-purple-300">Rapport de Saisie :</div>
                      <div>{friskResult.message}</div>
                      {friskResult.weaponsFound.length > 0 && (
                        <div className="text-red-400 font-bold">
                          Armes neutralisées : {friskResult.weaponsFound.join(", ")}
                        </div>
                      )}
                      {friskResult.contrabandFound.length > 0 && (
                        <div className="text-amber-400 font-bold">
                          Objets illégaux confisqués : {friskResult.contrabandFound.join(", ")}
                        </div>
                      )}
                    </div>
                  )}

                  <button
                    onClick={() => setArrestStep("cell")}
                    className="self-end px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition cursor-pointer flex items-center gap-2 mt-2"
                  >
                    <span>Transférer en cellule au poste de police ➔</span>
                  </button>
                </div>
              )}

              {/* Step 5: Transfer to Cell & Booking */}
              {arrestStep === "cell" && (
                <div className="p-6 rounded-3xl bg-slate-950 border border-slate-800 flex flex-col gap-4">
                  <h4 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2">
                    <span>🏢 Étape 5 : Transfert en Cellule & Fiche d'Écrou SQ</span>
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="text-[10px] text-slate-400 font-bold block mb-1">Motif / Chef d'Accusation :</label>
                      <input
                        type="text"
                        value={arrestReason}
                        onChange={(e) => setArrestReason(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 font-bold block mb-1">Durée de Cellule (Sec) :</label>
                      <input
                        type="number"
                        value={arrestJailSeconds}
                        onChange={(e) => setArrestJailSeconds(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 font-bold block mb-1">Caution Légale ($) :</label>
                      <input
                        type="number"
                        value={arrestBail}
                        onChange={(e) => setArrestBail(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                      />
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      const dur = parseInt(arrestJailSeconds) || 60;
                      const bail = parseInt(arrestBail) || 500;
                      PoliceSystem.jailPlayer(
                        arrestSuspectName,
                        arrestSuspectName,
                        arrestReason,
                        playerName,
                        dur,
                        bail
                      );
                      if (arrestSuspectName.toLowerCase().includes("local") || arrestSuspectName === playerName) {
                        onTeleportToJail?.();
                      }
                      PoliceSystem.playDispatchChime();
                      setFeedbackMsg(`Suspect ${arrestSuspectName} écroué en cellule pour ${dur}s (Caution: ${bail}$).`);
                      setActiveTab("booking");
                    }}
                    className="w-full py-3.5 rounded-2xl bg-red-600 hover:bg-red-500 text-white font-black text-xs transition cursor-pointer flex items-center justify-center gap-2 shadow-lg mt-2"
                  >
                    <span>🔒 Écrouer et incarcérer le suspect au poste de police de Portneuf</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB 1: OFFICER CONTROLS */}
          {activeTab === "officer" && (
            <div className="flex flex-col gap-6">
              
              {/* Officer Duty & Radio Bar */}
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-amber-500/10 border border-amber-500/40 flex items-center justify-center text-amber-400 font-bold text-sm">
                    SQ
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white flex items-center gap-2">
                      <span>Agent : {playerName}</span>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[9px]">EN SERVICE</span>
                    </div>
                    <div className="text-[10px] text-slate-400 flex items-center gap-3 mt-0.5">
                      <span>Badge : SQ-8042</span>
                      <span>Points Patrouille : <strong className="text-amber-400">{PoliceSystem.getDutyStatus().points} pts</strong></span>
                      <span>Fréq. Radio : 142.850 MHz</span>
                    </div>
                  </div>
                </div>

                {/* Siren & Radar Quick Controls */}
                <div className="flex flex-wrap gap-2 w-full md:w-auto">
                  <button
                    onClick={() => {
                      const sirenInfo = PoliceSystem.getSirenState();
                      const nextMode = sirenInfo.mode === "wail" ? "yelp" : sirenInfo.mode === "yelp" ? "hyper" : "wail";
                      PoliceSystem.setSirenMode(nextMode);
                      setFeedbackMsg(`🔊 Tonalité Sirène : ${nextMode.toUpperCase()}`);
                    }}
                    className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold flex items-center gap-1.5"
                  >
                    <Volume2 className="w-4 h-4 text-blue-400" /> Tonalité: {PoliceSystem.getSirenState().mode.toUpperCase()}
                  </button>

                  <button
                    onClick={() => PoliceSystem.triggerAirhorn()}
                    className="px-3 py-2 rounded-xl bg-amber-600/20 hover:bg-amber-600/30 border border-amber-500/40 text-amber-300 text-xs font-bold"
                  >
                    🎺 Avertisseur (Airhorn)
                  </button>

                  <button
                    onClick={() => {
                      const newState = PoliceSystem.togglePoliceSiren();
                      setSirenOn(newState);
                    }}
                    className={`px-3 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                      sirenOn
                        ? "bg-red-600 text-white animate-pulse shadow-[0_0_15px_rgba(239,68,68,0.5)]"
                        : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                    }`}
                  >
                    <Siren className="w-4 h-4" /> Gyrophares
                  </button>
                </div>
              </div>

              {/* ─── MODES DE PATROUILLE SQ POLICE ─── */}
              <div className="bg-slate-950 p-4 rounded-2xl border border-blue-500/30 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase text-blue-400 flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4" /> Mode de Patrouille & Protocoles d'Intervention
                  </h3>
                  <span className="text-[10px] text-slate-400">
                    Mode Actif : <strong className="text-amber-300 uppercase">{patrolMode.replace('_', ' ')}</strong>
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button
                    onClick={() => {
                      const res = PoliceSystem.setPatrolMode("code1_routine");
                      setPatrolMode(res.mode);
                      setLightbarPattern("code1_cruise");
                      setSirenOn(false);
                      setFeedbackMsg(res.description);
                    }}
                    className={`p-3 rounded-xl border text-left transition flex flex-col gap-1 ${
                      patrolMode === "code1_routine"
                        ? "bg-blue-950/80 border-blue-500 text-white shadow-lg"
                        : "bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700"
                    }`}
                  >
                    <div className="text-xs font-black text-blue-400">CODE 1</div>
                    <div className="text-[11px] font-bold text-slate-200">Patrouille Routine</div>
                    <div className="text-[9px] text-slate-400">Feux de croisière discrets, surveillance Portneuf</div>
                  </button>

                  <button
                    onClick={() => {
                      const res = PoliceSystem.setPatrolMode("code2_traffic_stop");
                      setPatrolMode(res.mode);
                      setLightbarPattern("code2_wigwag");
                      setSirenOn(false);
                      setFeedbackMsg(res.description);
                    }}
                    className={`p-3 rounded-xl border text-left transition flex flex-col gap-1 ${
                      patrolMode === "code2_traffic_stop"
                        ? "bg-amber-950/80 border-amber-500 text-white shadow-lg"
                        : "bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700"
                    }`}
                  >
                    <div className="text-xs font-black text-amber-400">CODE 2</div>
                    <div className="text-[11px] font-bold text-slate-200">Contrôle Routier</div>
                    <div className="text-[9px] text-slate-400">Wig-wags, radar actif, contrôle sans sirène</div>
                  </button>

                  <button
                    onClick={() => {
                      const res = PoliceSystem.setPatrolMode("code3_emergency");
                      setPatrolMode(res.mode);
                      setLightbarPattern("code3_hyper_strobe");
                      setSirenOn(true);
                      setFeedbackMsg(res.description);
                    }}
                    className={`p-3 rounded-xl border text-left transition flex flex-col gap-1 ${
                      patrolMode === "code3_emergency"
                        ? "bg-red-950/80 border-red-500 text-white shadow-[0_0_15px_rgba(239,68,68,0.3)] animate-pulse"
                        : "bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700"
                    }`}
                  >
                    <div className="text-xs font-black text-red-400">CODE 3</div>
                    <div className="text-[11px] font-bold text-slate-200">Urgence / Poursuite</div>
                    <div className="text-[9px] text-slate-400">Hyper-stroboscopes, sirène Yelp, priorité absolue</div>
                  </button>

                  <button
                    onClick={() => {
                      const res = PoliceSystem.setPatrolMode("wildlife_ranger");
                      setPatrolMode(res.mode);
                      setLightbarPattern("code1_cruise");
                      setFeedbackMsg(res.description);
                    }}
                    className={`p-3 rounded-xl border text-left transition flex flex-col gap-1 ${
                      patrolMode === "wildlife_ranger"
                        ? "bg-emerald-950/80 border-emerald-500 text-white shadow-lg"
                        : "bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700"
                    }`}
                  >
                    <div className="text-xs font-black text-emerald-400">FAUNE / MFFP</div>
                    <div className="text-[11px] font-bold text-slate-200">Ranger Faunique</div>
                    <div className="text-[9px] text-slate-400">Surveillance braconnage, inspection des permis</div>
                  </button>
                </div>
              </div>

              {/* ─── AAAA SYNCHRONIZED LIGHTBAR CONTROLLER ─── */}
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase text-slate-200 flex items-center gap-2">
                    <Siren className="w-4 h-4 text-red-400" /> Rampe Lumineuse AAAA & Éclairage Tactique
                  </h3>
                  <span className="text-[10px] text-slate-400 font-mono">Module : Whelen Liberty II SQ</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Pattern selector */}
                  <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 flex flex-col gap-2">
                    <div className="text-[10px] text-slate-400 font-bold uppercase">Motif Stroboscopique</div>
                    <div className="grid grid-cols-2 gap-1.5 text-xs">
                      {[
                        { id: "code1_cruise", label: "Croisière" },
                        { id: "code2_wigwag", label: "Wig-Wag" },
                        { id: "code3_quad_burst", label: "Quad-Burst" },
                        { id: "code3_hyper_strobe", label: "Hyper-Strobe" },
                      ].map((p) => (
                        <button
                          key={p.id}
                          onClick={() => {
                            PoliceSystem.setLightbarPattern(p.id as any);
                            setLightbarPattern(p.id as any);
                            setFeedbackMsg(`Stroboscopes réglés sur : ${p.label}`);
                          }}
                          className={`py-1.5 px-2 rounded-lg font-bold text-[10px] transition ${
                            lightbarPattern === p.id
                              ? "bg-blue-600 text-white"
                              : "bg-slate-800 text-slate-400 hover:text-white"
                          }`}
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Alley Lights */}
                  <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 flex flex-col gap-2">
                    <div className="text-[10px] text-slate-400 font-bold uppercase">Projecteurs Latéraux (Alley)</div>
                    <div className="grid grid-cols-3 gap-1 text-xs">
                      {["left", "both", "right"].map((side) => (
                        <button
                          key={side}
                          onClick={() => {
                            const newMode = alleyMode === side ? "off" : (side as any);
                            PoliceSystem.toggleAlleyLights(newMode);
                            setAlleyMode(newMode);
                            setFeedbackMsg(`Projecteur latéral : ${newMode.toUpperCase()}`);
                          }}
                          className={`py-1.5 rounded-lg font-bold text-[10px] transition ${
                            alleyMode === side
                              ? "bg-amber-500 text-black font-black"
                              : "bg-slate-800 text-slate-400 hover:text-white"
                          }`}
                        >
                          {side === "left" ? "GAUCHE" : side === "right" ? "DROITE" : "LES 2"}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Takedown Floodlights & Megaphone */}
                  <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 flex flex-col gap-2">
                    <div className="text-[10px] text-slate-400 font-bold uppercase">Éclairage Frontal & Interphone</div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          const state = PoliceSystem.toggleTakedownLights();
                          setTakedownOn(state);
                          setFeedbackMsg(state ? "💡 Takedowns AVANT ACTIVÉS" : "💡 Takedowns ÉTEINTS");
                        }}
                        className={`flex-1 py-1.5 rounded-lg font-bold text-[10px] transition ${
                          takedownOn
                            ? "bg-white text-black font-black shadow-lg"
                            : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                        }`}
                      >
                        {takedownOn ? "TAKEDOWNS ON" : "TAKEDOWNS OFF"}
                      </button>

                      <button
                        onClick={() => {
                          PoliceSystem.playMegaphoneAnnouncement("pull_over");
                          setFeedbackMsg("📢 Interphone SQ : 'Conducteur, rangez-vous immédiatement à droite !'");
                        }}
                        className="flex-1 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-[10px]"
                      >
                        📢 Interphone SQ
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Speed Radar Controller Unit */}
              <div className="bg-slate-950 p-4 rounded-2xl border border-blue-500/30 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase text-blue-400 flex items-center gap-2">
                    <Radio className="w-4 h-4" /> Radar de Vitesse de Patrouille SQ
                  </h3>
                  <button
                    onClick={() => {
                      const rOn = PoliceSystem.toggleRadar();
                      setFeedbackMsg(rOn ? "📡 Radar Laser de Vitesse ACTIF" : "📡 Radar Laser DÉSACTIVÉ");
                    }}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                      PoliceSystem.isRadarOn() ? "bg-emerald-600 text-white" : "bg-slate-800 text-slate-400"
                    }`}
                  >
                    {PoliceSystem.isRadarOn() ? "RADAR EN MARCHE" : "ACTIVER RADAR"}
                  </button>
                </div>

                {PoliceSystem.isRadarOn() ? (
                  <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
                    <div>
                      <div className="text-[10px] text-slate-400">Dernier Véhicule Scanné</div>
                      <div className="text-white font-bold">Police Cruiser #104 (Agent Bouchard)</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">Zone Limitée : 50 km/h</div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-black text-emerald-400 font-mono">42 km/h</div>
                      <span className="text-[9px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold">
                        CONFORME
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="text-[11px] text-slate-500 italic text-center py-2">
                    Appuyez sur "ACTIVER RADAR" ou la commande <code className="text-blue-400">/radar</code> pour scanner la vitesse des véhicules environnants.
                  </div>
                )}
              </div>

              {/* Active Dispatch Callouts Section */}
              <div className="bg-slate-950 p-4 rounded-2xl border border-amber-500/30 flex flex-col gap-3">
                <h3 className="text-xs font-bold uppercase text-amber-400 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" /> Appels de Centrale / Dispatch 911
                </h3>

                <div className="flex flex-col gap-2">
                  {PoliceSystem.getActiveCallouts().map((call) => (
                    <div key={call.id} className="bg-slate-900 p-3 rounded-xl border border-slate-800 flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded bg-red-600/30 text-red-300 font-black text-[10px] border border-red-500/40">
                            {call.code}
                          </span>
                          <span className="text-xs font-bold text-white">{call.title}</span>
                          <span className="text-[10px] text-slate-400">({call.locationName})</span>
                        </div>
                        <div className="text-[10px] text-slate-400 mt-1">{call.description}</div>
                      </div>

                      <button
                        onClick={() => {
                          PoliceSystem.resolveCallout(call.id);
                          setFeedbackMsg(`🚓 En route vers le lieu de l'appel (${call.locationName}) ! Waypoint fixé.`);
                        }}
                        className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shrink-0 transition"
                      >
                        Intervenir
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Forms Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Form A: Ticket Form */}
                <form onSubmit={handleIssueTicket} className="bg-slate-950 p-4 rounded-2xl border border-slate-800 flex flex-col gap-3">
                  <h3 className="text-xs font-bold uppercase text-blue-400 flex items-center gap-2">
                    <FileText className="w-4 h-4" /> Rédiger un Ticket d'Amende
                  </h3>

                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">Corps Policier</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setDepartment("SQ")}
                        className={`py-1.5 rounded-lg text-xs font-bold border transition ${
                          department === "SQ" ? "bg-amber-600/20 border-amber-500 text-amber-300" : "bg-slate-900 border-slate-800 text-slate-400"
                        }`}
                      >
                        ⚜️ SQ (Sûreté)
                      </button>
                      <button
                        type="button"
                        onClick={() => setDepartment("SPVM")}
                        className={`py-1.5 rounded-lg text-xs font-bold border transition ${
                          department === "SPVM" ? "bg-blue-600/20 border-blue-500 text-blue-300" : "bg-slate-900 border-slate-800 text-slate-400"
                        }`}
                      >
                        🚓 SPVM
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">Nom du Contrevenant</label>
                    <input
                      type="text"
                      value={targetName}
                      onChange={(e) => setTargetName(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">Montant de la Contravention ($)</label>
                    <input
                      type="number"
                      value={ticketAmount}
                      onChange={(e) => setTicketAmount(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">Motif / Infraction Code de la Route</label>
                    <textarea
                      value={ticketReason}
                      onChange={(e) => setTicketReason(e.target.value)}
                      rows={2}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 resize-none"
                    />
                  </div>

                  <button type="submit" className="py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition">
                    Émettre le Ticket
                  </button>
                </form>

                {/* Form B: Arrest / Jail Form */}
                <form onSubmit={handleArrestPlayer} className="bg-slate-950 p-4 rounded-2xl border border-slate-800 flex flex-col justify-between gap-3">
                  <div>
                    <h3 className="text-xs font-bold uppercase text-red-400 flex items-center gap-2 mb-3">
                      <Lock className="w-4 h-4" /> Mandat d'Arrêt & Incarcération
                    </h3>

                    <div className="flex flex-col gap-3">
                      <div>
                        <label className="text-[10px] text-slate-400 block mb-1">Nom du Suspect</label>
                        <input
                          type="text"
                          value={targetName}
                          onChange={(e) => setTargetName(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-red-500"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] text-slate-400 block mb-1">Durée de Garde à Vue (Secondes)</label>
                        <input
                          type="number"
                          value={jailDuration}
                          onChange={(e) => setJailDuration(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-red-500"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] text-slate-400 block mb-1">Motif d'Arrestation</label>
                        <input
                          type="text"
                          value={ticketReason}
                          onChange={(e) => setTicketReason(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-red-500"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const miniGame = PoliceSystem.startRestraintMiniGame("local_player", targetName || "Suspect");
                        setRestraintState(miniGame);
                      }}
                      className="flex-1 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs transition flex items-center justify-center gap-1.5"
                    >
                      <span>🔒 Menottage Tactique</span>
                    </button>
                    <button type="submit" className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs transition">
                      Cellule Directe
                    </button>
                  </div>
                </form>

              </div>
            </div>
          )}

          {/* TAB: POLICE RANKS & PERKS HIERARCHY */}
          {activeTab === "ranks" && (
            <div className="flex flex-col gap-6">
              {/* Current Rank Banner */}
              <div className="bg-gradient-to-r from-indigo-950 via-slate-900 to-slate-950 p-5 rounded-2xl border border-indigo-500/40 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-indigo-500/20 border border-indigo-400 flex items-center justify-center text-3xl shadow-[0_0_20px_rgba(99,102,241,0.3)]">
                    ⚜️
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-base font-black text-white">{currentRankInfo.title}</h2>
                      <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/20 border border-indigo-400/40 text-indigo-300 text-[10px] font-bold">
                        {currentRankInfo.badgePrefix}-OFFICIER
                      </span>
                    </div>
                    <div className="text-xs text-slate-300 mt-1">
                      Multiplicateur de solde : <strong className="text-emerald-400">x{currentRankInfo.salaryMultiplier}</strong> • Points accumulés : <strong className="text-amber-400">{PoliceSystem.getDutyStatus().points} XP</strong>
                    </div>
                  </div>
                </div>

                {/* Promotion Action */}
                <div className="flex flex-col items-end gap-2 w-full md:w-auto">
                  {promotionStatus.eligible && promotionStatus.nextRank ? (
                    <button
                      onClick={() => {
                        const res = PoliceSystem.promoteOfficerRank();
                        setFeedbackMsg(res.message);
                        setCurrentRankInfo(PoliceSystem.getCurrentRankInfo());
                        setPromotionStatus(PoliceSystem.checkPromotionEligibility());
                      }}
                      className="w-full md:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-black text-xs shadow-[0_0_25px_rgba(16,185,129,0.4)] transition animate-pulse flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <span>🎖️ Postuler pour promotion ({promotionStatus.nextRank.title})</span>
                    </button>
                  ) : promotionStatus.nextRank ? (
                    <div className="text-right">
                      <div className="text-[11px] text-slate-400">
                        Prochain grade : <strong className="text-indigo-300">{promotionStatus.nextRank.title}</strong>
                      </div>
                      <div className="text-[10px] text-amber-400 font-bold">
                        Encore {promotionStatus.neededPoints} XP requis pour postuler
                      </div>
                    </div>
                  ) : (
                    <span className="px-3 py-1.5 rounded-xl bg-amber-500/20 text-amber-300 text-xs font-bold border border-amber-500/30">
                      🏆 Grade Suprême Atteint (Directeur Général)
                    </span>
                  )}
                </div>
              </div>

              {/* Ranks Progression Hierarchy */}
              <div className="flex flex-col gap-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                  <span>🏛️ Échelons et Avantages de la Sûreté du Québec</span>
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {PoliceSystem.getAllRanks().map((r) => {
                    const isCurrent = r.level === currentRankInfo.level;
                    const isUnlocked = PoliceSystem.getDutyStatus().points >= r.minPoints;

                    return (
                      <div
                        key={r.level}
                        className={`p-4 rounded-2xl border transition relative flex flex-col justify-between gap-3 ${
                          isCurrent
                            ? "bg-indigo-950/60 border-indigo-400 shadow-[0_0_20px_rgba(99,102,241,0.25)]"
                            : isUnlocked
                            ? "bg-slate-900/90 border-slate-700"
                            : "bg-slate-950/60 border-slate-800 opacity-60"
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-bold text-white flex items-center gap-2">
                              <span>{r.title}</span>
                              {isCurrent && (
                                <span className="px-1.5 py-0.5 rounded bg-indigo-500 text-white text-[9px] font-black">
                                  ACTUEL
                                </span>
                              )}
                            </span>
                            <span className="text-[10px] font-mono text-amber-400 font-bold">
                              {r.minPoints} XP
                            </span>
                          </div>

                          <div className="text-[11px] text-slate-400 mb-2">
                            Solde : <strong className="text-emerald-400">+{Math.round((r.salaryMultiplier - 1) * 100)}%</strong> • Véhicules : <span className="text-slate-300 font-mono text-[10px]">{r.unlockedVehicles.join(", ")}</span>
                          </div>

                          <div className="flex flex-col gap-1">
                            {r.perks.map((perk, idx) => (
                              <div key={idx} className="text-[10px] text-slate-300 flex items-start gap-1.5">
                                <span className="text-indigo-400">✓</span>
                                <span>{perk}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {!isCurrent && isUnlocked && (
                          <button
                            onClick={() => {
                              PoliceSystem.setRank(r.level);
                              setCurrentRankInfo(PoliceSystem.getCurrentRankInfo());
                              setFeedbackMsg(`Grade changé manuellement pour : ${r.title}`);
                            }}
                            className="w-full py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] font-bold border border-slate-700 transition"
                          >
                            Sélectionner cet insigne
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB: RADIO COMMUNICATION & AI PATROLS */}
          {activeTab === "radio" && (
            <div className="flex flex-col gap-6">
              {/* Emergency Controls Header */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 10-33 PANIC BUTTON */}
                <button
                  onClick={() => {
                    const res = PoliceSystem.trigger10_33PanicButton([0, 0, 0]);
                    setFeedbackMsg(res.message);
                    setRadioMessages([...PoliceSystem.getRadioMessages()]);
                  }}
                  className="p-5 rounded-2xl bg-gradient-to-r from-red-700 via-rose-600 to-red-700 hover:from-red-600 hover:to-rose-500 text-white font-black text-sm border border-red-400 shadow-[0_0_30px_rgba(239,68,68,0.5)] transition flex items-center justify-between gap-4 cursor-pointer group animate-pulse"
                >
                  <div className="flex items-center gap-3 text-left">
                    <span className="text-3xl">🚨</span>
                    <div>
                      <div className="text-sm font-black tracking-wider uppercase">Bouton Panique 10-33</div>
                      <div className="text-[11px] font-normal text-rose-100">Officier en détresse : convergence immédiate Code 3</div>
                    </div>
                  </div>
                  <span className="bg-black/30 px-3 py-1.5 rounded-xl text-xs font-mono border border-white/20">
                    URGENCE
                  </span>
                </button>

                {/* REQUEST BACKUP */}
                <button
                  onClick={() => {
                    const res = PoliceSystem.requestAIBackup([0, 0, 0]);
                    setFeedbackMsg(res.message);
                    setRadioMessages([...PoliceSystem.getRadioMessages()]);
                  }}
                  className="p-5 rounded-2xl bg-gradient-to-r from-blue-700 to-cyan-700 hover:from-blue-600 hover:to-cyan-600 text-white font-bold text-sm border border-blue-400 shadow-[0_0_25px_rgba(59,130,246,0.4)] transition flex items-center justify-between gap-4 cursor-pointer"
                >
                  <div className="flex items-center gap-3 text-left">
                    <span className="text-3xl">🚓</span>
                    <div>
                      <div className="text-sm font-black tracking-wider uppercase">Demander Renforts IA (10-4)</div>
                      <div className="text-[11px] font-normal text-cyan-100">Dépêcher la patrouille SQ la plus proche</div>
                    </div>
                  </div>
                  <span className="bg-black/30 px-3 py-1.5 rounded-xl text-xs font-mono border border-white/20">
                    APPEL 911
                  </span>
                </button>
              </div>

              {/* Radio Channel Selector */}
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold uppercase text-cyan-400 flex items-center gap-2">
                    <Radio className="w-4 h-4" /> Sélecteur de Fréquence VHF
                  </div>
                  <button
                    onClick={() => PoliceSystem.playRadioSquelch()}
                    className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-[10px] font-mono text-slate-300 border border-slate-700 flex items-center gap-1"
                  >
                    <span>🔊 Test Squelch</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {[
                    { id: "canal_1", name: "Canal 1 : Patrouille Régionale SQ", freq: "142.850 MHz" },
                    { id: "canal_2", name: "Canal 2 : Urgences & Poursuites Code 3", freq: "143.125 MHz" },
                    { id: "canal_3", name: "Canal 3 : Conservation de la Faune", freq: "141.600 MHz" },
                  ].map((ch) => (
                    <button
                      key={ch.id}
                      onClick={() => {
                        PoliceSystem.setRadioChannel(ch.id as any);
                        setRadioChannelState(ch.id as any);
                        setRadioMessages([...PoliceSystem.getRadioMessages()]);
                      }}
                      className={`p-3 rounded-xl border text-left transition ${
                        radioChannel === ch.id
                          ? "bg-cyan-950/60 border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.3)]"
                          : "bg-slate-900 border-slate-800 text-slate-400 hover:text-white"
                      }`}
                    >
                      <div className="text-xs font-bold text-white">{ch.name}</div>
                      <div className="text-[10px] font-mono text-cyan-300">{ch.freq}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Quick 10-Codes Buttons */}
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 flex flex-col gap-3">
                <div className="text-xs font-bold uppercase text-slate-300">
                  Transmissions Rapides (Codes 10 Officiels du Québec)
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
                  {[
                    { code: "10-4", label: "Reçu / Compris" },
                    { code: "10-20", label: "Position" },
                    { code: "10-71", label: "Coups de feu" },
                    { code: "10-80", label: "Poursuite" },
                    { code: "10-97", label: "Arrivé sur lieu" },
                    { code: "10-98", label: "Disponible" },
                  ].map((c) => (
                    <button
                      key={c.code}
                      onClick={() => {
                        PoliceSystem.sendRadioMessage(c.code, `${c.label} - Signalé par Agent ${playerName}`);
                        setRadioMessages([...PoliceSystem.getRadioMessages()]);
                        setFeedbackMsg(`📻 Message radio transmis : ${c.code} (${c.label})`);
                      }}
                      className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-cyan-500/50 text-left transition"
                    >
                      <div className="text-xs font-black text-cyan-400 font-mono">{c.code}</div>
                      <div className="text-[10px] text-slate-300">{c.label}</div>
                    </button>
                  ))}
                </div>

                {/* Custom Radio Text Input */}
                <div className="flex gap-2 mt-2">
                  <input
                    type="text"
                    placeholder="Émettre une transmission radio personnalisée..."
                    value={customRadioText}
                    onChange={(e) => setCustomRadioText(e.target.value)}
                    className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                  />
                  <button
                    onClick={() => {
                      if (!customRadioText.trim()) return;
                      PoliceSystem.sendRadioMessage("10-4", customRadioText.trim());
                      setCustomRadioText("");
                      setRadioMessages([...PoliceSystem.getRadioMessages()]);
                    }}
                    className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs transition"
                  >
                    Transmettre
                  </button>
                </div>
              </div>

              {/* AI Patrol Fleet & Live Radio Log */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* AI Patrol Fleet Cards */}
                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 flex flex-col gap-3">
                  <div className="text-xs font-bold uppercase text-slate-300 flex items-center justify-between">
                    <span>🚓 Flotte de Patrouille IA Active</span>
                    <span className="text-[10px] text-emerald-400 font-mono">{aiPatrols.length} UNITÉS DÉPLOYÉES</span>
                  </div>

                  <div className="flex flex-col gap-2">
                    {aiPatrols.map((car) => (
                      <div key={car.id} className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-3 h-3 rounded-full ${car.status === "responding_code3" ? "bg-red-500 animate-ping" : "bg-emerald-500"}`} />
                          <div>
                            <div className="text-xs font-bold text-white">{car.callsign}</div>
                            <div className="text-[10px] text-slate-400">
                              Modèle : <strong className="text-slate-200">{car.model.toUpperCase()}</strong> • Vitesse : <span className="font-mono text-cyan-300">{(car.speed * 3.6).toFixed(0)} km/h</span>
                            </div>
                          </div>
                        </div>

                        <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold ${
                          car.status === "responding_code3" ? "bg-red-500/20 text-red-300 border border-red-500/40" : "bg-slate-800 text-slate-300"
                        }`}>
                          {car.status === "responding_code3" ? "🚨 CODE 3" : "🛡️ PATROUILLE"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Live Radio Log */}
                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 flex flex-col gap-3">
                  <div className="text-xs font-bold uppercase text-slate-300 flex items-center justify-between">
                    <span>📻 Journal des Transmissions</span>
                    <span className="text-[10px] font-mono text-cyan-400">CANAL ACTIF</span>
                  </div>

                  <div className="flex flex-col gap-2 max-h-64 overflow-y-auto pr-1 scrollbar-thin">
                    {radioMessages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`p-2.5 rounded-xl border text-xs flex flex-col gap-1 ${
                          msg.priority === "urgent_10_33"
                            ? "bg-red-950/60 border-red-500 text-red-100"
                            : msg.priority === "priority"
                            ? "bg-amber-950/40 border-amber-600/40 text-amber-100"
                            : "bg-slate-900 border-slate-800 text-slate-300"
                        }`}
                      >
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="font-mono font-bold text-cyan-300">
                            [{msg.senderBadge}] {msg.senderName}
                          </span>
                          <span className="font-mono text-slate-400">
                            {new Date(msg.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                        <div className="text-xs">
                          <strong className="font-mono text-amber-400 mr-1.5">{msg.tenCode}:</strong>
                          <span>{msg.messageText}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB: QUEBEC HIGHWAY CODE (CSR) CITATIONS */}
          {activeTab === "csr_fines" && (
            <div className="flex flex-col gap-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Form to issue CSR citation */}
                <div className="lg:col-span-2 bg-slate-950 p-5 rounded-2xl border border-slate-800 flex flex-col gap-4">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <h3 className="text-xs font-bold uppercase text-amber-400 flex items-center gap-2">
                      <FileText className="w-4 h-4" /> Rédaction de Constat d'Infraction (CSR Québec)
                    </h3>
                    <span className="text-[10px] text-slate-400 font-mono">LOI SUR LA SÉCURITÉ ROUTIÈRE</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-1">Nom du Conducteur / Contrevenant</label>
                      <input
                        type="text"
                        value={csrTargetCitizen}
                        onChange={(e) => setCsrTargetCitizen(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] text-slate-400 block mb-1">Article du Code CSR Enfreint</label>
                      <select
                        value={selectedCSRCode}
                        onChange={(e) => setSelectedCSRCode(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                      >
                        {csrCitations.map((c) => (
                          <option key={c.code} value={c.code}>
                            {c.article} - {c.description} ({c.fineAmount}$)
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Selected Infraction Detail Card */}
                  {(() => {
                    const cit = csrCitations.find((c) => c.code === selectedCSRCode);
                    if (!cit) return null;
                    return (
                      <div className="p-4 rounded-xl bg-slate-900 border border-amber-500/30 flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-white">{cit.article}</span>
                          <span className="text-xs font-black text-amber-400 font-mono">{cit.fineAmount} $ CAD</span>
                        </div>
                        <p className="text-xs text-slate-300">{cit.description}</p>
                        <div className="flex items-center gap-4 text-[10px] text-slate-400 pt-1 border-t border-slate-800">
                          <span>Points d'inaptitude SAAQ : <strong className="text-red-400">{cit.demeritPoints} pts</strong></span>
                          <span>Catégorie : <strong className="text-cyan-300">{cit.category.toUpperCase()}</strong></span>
                        </div>
                      </div>
                    );
                  })()}

                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">Notes & Circonstances de l'Interception</label>
                    <textarea
                      value={csrNotes}
                      onChange={(e) => setCsrNotes(e.target.value)}
                      placeholder="Ex: Mesuré au cinémomètre radar à 112 km/h dans une zone scolaire de 50 km/h."
                      rows={2}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 resize-none"
                    />
                  </div>

                  <button
                    onClick={() => {
                      if (!csrTargetCitizen.trim()) return;
                      const res = PoliceSystem.issueCSRTicket(selectedCSRCode, csrTargetCitizen.trim(), csrNotes.trim());
                      setFeedbackMsg(res.message);
                      setCsrNotes("");
                      setRadioMessages([...PoliceSystem.getRadioMessages()]);
                    }}
                    className="py-3 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-slate-950 font-black text-xs shadow-lg transition flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>📋 Signifier et Remettre le Constat d'Infraction</span>
                  </button>
                </div>

                {/* CSR Articles Reference Guide */}
                <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 flex flex-col gap-3">
                  <h3 className="text-xs font-bold uppercase text-slate-300">
                    Barème Officiel CSR du Québec
                  </h3>

                  <div className="flex flex-col gap-2 max-h-[380px] overflow-y-auto pr-1 scrollbar-thin">
                    {csrCitations.map((c) => (
                      <div
                        key={c.code}
                        onClick={() => setSelectedCSRCode(c.code)}
                        className={`p-3 rounded-xl border cursor-pointer transition flex flex-col gap-1 ${
                          selectedCSRCode === c.code
                            ? "bg-amber-950/40 border-amber-400"
                            : "bg-slate-900 border-slate-800 hover:border-slate-700"
                        }`}
                      >
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-white">{c.article}</span>
                          <span className="font-mono text-amber-400 font-bold">{c.fineAmount} $</span>
                        </div>
                        <div className="text-[10px] text-slate-400 line-clamp-1">{c.description}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ─── TAB: NPC TRAFFIC STOP (CONTRÔLE ROUTIER) ─── */}
          {activeTab === "traffic_stop" && (
            <div className="flex flex-col gap-6">
              {/* Header */}
              <div className="bg-amber-950/40 p-4 rounded-2xl border border-amber-500/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-xs font-bold uppercase text-amber-300 flex items-center gap-2">
                    🛑 Poste d'Interception et de Contrôle Routier SQ
                  </h3>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Protocole officiel d'interception de véhicule suspect sur la Route 138 ou le réseau villageois de Portneuf.
                  </p>
                </div>

                {!trafficStop ? (
                  <button
                    onClick={() => {
                      const stop = PoliceSystem.startTrafficStop();
                      setTrafficStop(stop);
                      setBreathalyzerData(null);
                      setTrunkSearchData(null);
                      setFeedbackMsg(`🚨 Véhicule intercepté : ${stop.driverName} (${stop.vehicleModel}, Plaque ${stop.plate})`);
                    }}
                    className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-black text-xs transition shadow-lg shrink-0 cursor-pointer"
                  >
                    + Intercepter un Véhicule Suspect
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      PoliceSystem.concludeTrafficStop("warning");
                      setTrafficStop(null);
                      setFeedbackMsg("Interception annulée.");
                    }}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold shrink-0"
                  >
                    Libérer / Annuler Interception
                  </button>
                )}
              </div>

              {trafficStop ? (
                <div className="flex flex-col gap-5">
                  {/* Suspect & Vehicle Banner */}
                  <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-xl">
                        🚘
                      </div>
                      <div>
                        <div className="text-sm font-bold text-white flex items-center gap-2">
                          <span>{trafficStop.driverName}</span>
                          <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 text-[9px] font-mono">
                            {trafficStop.plate}
                          </span>
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                            trafficStop.driverDemeanor === "belligerent"
                              ? "bg-red-500/20 text-red-400"
                              : trafficStop.driverDemeanor === "nervous"
                              ? "bg-amber-500/20 text-amber-400"
                              : "bg-emerald-500/20 text-emerald-400"
                          }`}>
                            Comportement : {trafficStop.driverDemeanor.toUpperCase()}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          Véhicule : <strong className="text-slate-200">{trafficStop.vehicleModel}</strong> • Motif : <strong className="text-red-400">{trafficStop.reason}</strong>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          PoliceSystem.playMegaphoneAnnouncement("step_out");
                          setFeedbackMsg("📢 Interphone : 'Conducteur, coupez le contact et posez vos mains sur le volant !'");
                        }}
                        className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs"
                      >
                        📢 Ordre de Couper Contact
                      </button>
                    </div>
                  </div>

                  {/* Interception Investigation Steps */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    
                    {/* Step 1: SAAQ License Check */}
                    <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 flex flex-col gap-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                          🪪 Permis & Enregistrement SAAQ
                        </span>
                        <span className="text-[9px] text-emerald-400 font-bold">VALIDE</span>
                      </div>

                      <div className="bg-slate-900/90 p-3 rounded-xl border border-slate-800 text-xs flex flex-col gap-1.5 font-mono">
                        <div className="text-[10px] text-slate-400">Société de l'assurance automobile du Québec</div>
                        <div className="text-white font-bold">{trafficStop.driverName}</div>
                        <div className="text-[11px] text-slate-300">No. : {trafficStop.driverLicense.number}</div>
                        <div className="text-[11px] text-slate-300">Classe : 5 (Véhicule de promenade)</div>
                        <div className="text-[11px] text-slate-300">Points d'inaptitude restants : <strong className="text-amber-400">{trafficStop.driverLicense.points} / 15</strong></div>
                        <div className="text-[10px] text-slate-400">Expire le : {trafficStop.driverLicense.expiry}</div>
                      </div>

                      <button
                        onClick={() => {
                          PoliceSystem.advanceTrafficStopStage("documents_checked");
                          setFeedbackMsg("Documents du conducteur inspectés et validés auprès de la SAAQ.");
                        }}
                        className="w-full py-2 rounded-xl bg-blue-600/30 hover:bg-blue-600/50 border border-blue-500/40 text-blue-300 text-xs font-bold"
                      >
                        Valider Documents SAAQ
                      </button>
                    </div>

                    {/* Step 2: Breathalyzer (Alcootest) */}
                    <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 flex flex-col gap-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                          🧪 Test d'Alcootest / Éthylomètre
                        </span>
                        <span className="text-[9px] text-slate-400 font-mono">Limite QC: 0.08 g/L</span>
                      </div>

                      <div className="bg-slate-900/90 p-3 rounded-xl border border-slate-800 flex flex-col items-center justify-center py-4 gap-2">
                        {isBlowing ? (
                          <div className="flex flex-col items-center gap-2">
                            <div className="w-8 h-8 rounded-full border-2 border-amber-400 border-t-transparent animate-spin" />
                            <span className="text-xs font-bold text-amber-300">Souffle en cours dans l'éthylomètre...</span>
                          </div>
                        ) : breathalyzerData ? (
                          <div className="flex flex-col items-center gap-1">
                            <div className={`text-3xl font-black font-mono ${breathalyzerData.isOverLimit ? "text-red-400" : "text-emerald-400"}`}>
                              {breathalyzerData.bac.toFixed(2)} <span className="text-xs">g/L</span>
                            </div>
                            <div className="text-[10px] text-center font-bold text-slate-300">{breathalyzerData.message}</div>
                          </div>
                        ) : (
                          <div className="text-xs text-slate-400 italic text-center">
                            Faire souffler le conducteur dans l'appareil de détection approuvé (ADA).
                          </div>
                        )}
                      </div>

                      <button
                        onClick={() => {
                          setIsBlowing(true);
                          setTimeout(() => {
                            const res = PoliceSystem.conductBreathalyzer();
                            setBreathalyzerData(res);
                            setIsBlowing(false);
                            setFeedbackMsg(res.message);
                          }, 1200);
                        }}
                        className="w-full py-2 rounded-xl bg-amber-600/30 hover:bg-amber-600/50 border border-amber-500/40 text-amber-300 text-xs font-bold"
                      >
                        Soumettre au Test d'Alcootest
                      </button>
                    </div>

                    {/* Step 3: Trunk Search */}
                    <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 flex flex-col gap-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                          🔍 Fouille du Véhicule & Coffre
                        </span>
                        <span className="text-[9px] text-slate-400 font-mono">Art. 31 Loi Police</span>
                      </div>

                      <div className="bg-slate-900/90 p-3 rounded-xl border border-slate-800 flex flex-col gap-1.5 text-xs">
                        {trunkSearchData ? (
                          trunkSearchData.itemsFound.length > 0 ? (
                            <div className="flex flex-col gap-1">
                              <span className="text-[10px] font-bold text-red-400 uppercase">Objets Saisis :</span>
                              {trunkSearchData.itemsFound.map((item, idx) => (
                                <div key={idx} className="bg-red-950/60 border border-red-500/30 rounded px-2 py-1 text-[11px] text-red-200">
                                  ⚠️ {item}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-emerald-400 font-bold text-center py-2">
                              ✅ Aucun objet illicite dans le véhicule.
                            </div>
                          )
                        ) : (
                          <div className="text-slate-400 italic text-center py-4">
                            Fouiller l'habitacle et le coffre pour des stupéfiants, armes ou braconnage.
                          </div>
                        )}
                      </div>

                      <button
                        onClick={() => {
                          const res = PoliceSystem.searchTrafficVehicle();
                          setTrunkSearchData(res);
                          setFeedbackMsg(res.message);
                        }}
                        className="w-full py-2 rounded-xl bg-purple-600/30 hover:bg-purple-600/50 border border-purple-500/40 text-purple-300 text-xs font-bold"
                      >
                        Fouiller Coffre et Habitacle
                      </button>
                    </div>
                  </div>

                  {/* Resolution Actions */}
                  <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 flex flex-col gap-3">
                    <h4 className="text-xs font-bold uppercase text-slate-200">Résolution Légale du Contrôle Routier</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      
                      {/* Warning */}
                      <button
                        onClick={() => {
                          const res = PoliceSystem.concludeTrafficStop("warning");
                          setTrafficStop(null);
                          setFeedbackMsg(res.summary);
                        }}
                        className="p-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-left transition flex flex-col gap-1"
                      >
                        <div className="text-xs font-bold text-slate-200">⚠️ Donner un Avertissement</div>
                        <div className="text-[10px] text-slate-400">Rappel à l'ordre verbal, aucune amende ni point retiré.</div>
                      </button>

                      {/* Ticket */}
                      <button
                        onClick={() => {
                          const amt = breathalyzerData?.isOverLimit ? 650 : 320;
                          const res = PoliceSystem.concludeTrafficStop("ticket", {
                            amount: amt,
                            citation: `${trafficStop.reason} - Conforme au Code de la sécurité routière du Québec`,
                          });
                          setTrafficStop(null);
                          setFeedbackMsg(res.summary);
                        }}
                        className="p-3 rounded-xl bg-amber-950/60 hover:bg-amber-900/60 border border-amber-500/50 text-left transition flex flex-col gap-1"
                      >
                        <div className="text-xs font-bold text-amber-300">📋 Rédiger Constat d'Infraction</div>
                        <div className="text-[10px] text-slate-400">Délivrer une amende officielle de 320$ à 650$ et déduire des points.</div>
                      </button>

                      {/* Arrest */}
                      <button
                        onClick={() => {
                          setBookingSuspectName(trafficStop.driverName);
                          const res = PoliceSystem.concludeTrafficStop("arrest");
                          setTrafficStop(null);
                          setActiveTab("booking");
                          setFeedbackMsg(`${res.summary} - Transfert immédiat vers le Centre d'Écrou SQ.`);
                        }}
                        className="p-3 rounded-xl bg-red-950/80 hover:bg-red-900/80 border border-red-500 text-left transition flex flex-col gap-1 shadow-lg"
                      >
                        <div className="text-xs font-bold text-red-300">🔒 Mettre aux Arrêts (Menottes & Écrou)</div>
                        <div className="text-[10px] text-slate-400">Menotter le suspect, le placer dans le véhicule et procéder à l'écrou.</div>
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-slate-950 p-8 rounded-2xl border border-slate-800 flex flex-col items-center justify-center text-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-3xl">
                    🚔
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">Aucun véhicule intercepté en ce moment</h4>
                    <p className="text-xs text-slate-400 max-w-md mt-1">
                      Activez votre radar de patrouille en circulant sur la Route 138 ou cliquez ci-dessous pour intercepter un véhicule suspect.
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      const stop = PoliceSystem.startTrafficStop();
                      setTrafficStop(stop);
                      setBreathalyzerData(null);
                      setTrunkSearchData(null);
                      setFeedbackMsg(`🚨 Véhicule intercepté : ${stop.driverName} (${stop.vehicleModel}, Plaque ${stop.plate})`);
                    }}
                    className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-black text-xs transition shadow-lg cursor-pointer"
                  >
                    + Déclencher une Interception Routière
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ─── TAB: SQ BOOKING CENTER & ARREST RECORD ─── */}
          {activeTab === "booking" && (
            <div className="flex flex-col gap-6">
              {/* Header */}
              <div className="bg-red-950/40 p-4 rounded-2xl border border-red-500/40 flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold uppercase text-red-300 flex items-center gap-2">
                    🔒 Centre d'Écrou, Fichage Biométrique et Détention SQ
                  </h3>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Poste de la Sûreté du Québec de Portneuf • Enregistrement d'arrestation et fiche judiciaire.
                  </p>
                </div>
                <div className="px-3 py-1 rounded-full bg-red-500/20 text-red-300 border border-red-500/40 text-[10px] font-bold">
                  POSTE SQ : PORTNEUF #42
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                {/* Left Column: Mugshot Photographic Station */}
                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 flex flex-col items-center gap-3">
                  <div className="text-xs font-bold text-slate-200 uppercase text-center">
                    📸 Prise de Photo Judiciaire (Mugshot)
                  </div>

                  {/* Mugshot canvas frame with height markings */}
                  <div className="relative w-full aspect-3/4 max-w-56 bg-slate-900 rounded-xl border border-slate-700 overflow-hidden flex flex-col items-center justify-end p-3 shadow-inner">
                    {/* Height ruler lines */}
                    <div className="absolute inset-0 flex flex-col justify-between py-4 px-2 opacity-20 pointer-events-none">
                      {[190, 185, 180, 175, 170, 165, 160].map((h) => (
                        <div key={h} className="border-b border-white text-[8px] font-mono text-white flex justify-between">
                          <span>{h} cm</span>
                          <span>- - -</span>
                        </div>
                      ))}
                    </div>

                    {/* Suspect silhouette */}
                    <div className="w-28 h-36 bg-slate-800 rounded-t-full border border-slate-600 flex flex-col items-center pt-3 relative z-10">
                      <div className="w-12 h-14 bg-slate-700 rounded-full mb-1" />
                      <div className="w-24 h-16 bg-slate-600 rounded-t-2xl" />
                    </div>

                    {/* Booking Placard Held by Suspect */}
                    <div className="w-full bg-black/90 border border-white/40 p-1.5 rounded text-center z-20 shadow-2xl font-mono">
                      <div className="text-[7px] text-amber-300 font-bold uppercase tracking-widest">SÛRETÉ DU QUÉBEC</div>
                      <div className="text-[10px] text-white font-bold truncate">{bookingSuspectName}</div>
                      <div className="text-[8px] text-slate-400">ID: SQ-{Math.floor(10000 + Math.random() * 90000)} • PORTNEUF</div>
                    </div>
                  </div>

                  <div className="w-full flex gap-2">
                    <button
                      onClick={() => {
                        setIsTakingPhoto(true);
                        setTimeout(() => {
                          setIsTakingPhoto(false);
                          setFeedbackMsg("📸 Cliché anthropométrique enregistré dans le dossier SQ.");
                        }, 500);
                      }}
                      className="flex-1 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition flex items-center justify-center gap-1"
                    >
                      {isTakingPhoto ? "Prise en cours..." : "Prendre la Photo"}
                    </button>
                  </div>
                </div>

                {/* Center Column: Official Quebec Charges & Demerit Points */}
                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 flex flex-col gap-3">
                  <div className="text-xs font-bold text-slate-200 uppercase">
                    ⚖️ Chefs d'Accusation Déposés
                  </div>

                  <div className="flex flex-col gap-2 max-h-72 overflow-y-auto pr-1">
                    {[
                      { id: "vitesse", title: "Grand excès de vitesse (Art. 328 CSR)", fee: 550, points: 6 },
                      { id: "alcool", title: "Conduite avec facultés affaiblies / Alcool (Art. 320.14 C.cr.)", fee: 1000, points: 15 },
                      { id: "braconnage", title: "Braconnage faune / Chasse illégale (Loi faune QC)", fee: 1500, points: 0 },
                      { id: "fuite", title: "Refus d'obtempérer / Délit de fuite (Art. 320.17 C.cr.)", fee: 2000, points: 9 },
                      { id: "recel", title: "Possession d'objets volés (Art. 354 C.cr.)", fee: 800, points: 0 },
                    ].map((charge) => {
                      const isSelected = bookingSelectedCharges.includes(charge.title);
                      return (
                        <div
                          key={charge.id}
                          onClick={() => {
                            if (isSelected) {
                              setBookingSelectedCharges(bookingSelectedCharges.filter((c) => c !== charge.title));
                            } else {
                              setBookingSelectedCharges([...bookingSelectedCharges, charge.title]);
                            }
                          }}
                          className={`p-2.5 rounded-xl border text-xs cursor-pointer transition flex items-start gap-2 ${
                            isSelected
                              ? "bg-red-950/60 border-red-500 text-white"
                              : "bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700"
                          }`}
                        >
                          <input type="checkbox" checked={isSelected} readOnly className="mt-0.5" />
                          <div className="flex-1">
                            <div className="font-bold text-[11px]">{charge.title}</div>
                            <div className="text-[10px] text-slate-400 flex items-center gap-2 mt-0.5">
                              <span>Amende : {charge.fee}$</span>
                              {charge.points > 0 && <span>Points : -{charge.points}</span>}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">Nom du Détenu</label>
                    <input
                      type="text"
                      value={bookingSuspectName}
                      onChange={(e) => setBookingSuspectName(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-red-500"
                    />
                  </div>
                </div>

                {/* Right Column: Biometrics, Belongings, & Cell Placement */}
                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 flex flex-col gap-3">
                  <div className="text-xs font-bold text-slate-200 uppercase">
                    🧬 Empreintes & Effets Confisqués
                  </div>

                  {/* Fingerprint scanner */}
                  <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-white">Scanner Biométrique SQ</div>
                      <div className="text-[10px] text-slate-400">
                        {fingerprintDone ? "Empreintes transmises au serveur SQ" : "En attente de numérisation"}
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setFingerprintDone(true);
                        setFeedbackMsg("🧬 Empreintes digitales relevées et indexées au dossier.");
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                        fingerprintDone ? "bg-emerald-600 text-white" : "bg-blue-600 hover:bg-blue-500 text-white"
                      }`}
                    >
                      {fingerprintDone ? "VALIDÉ" : "Numériser"}
                    </button>
                  </div>

                  {/* Belongings Impound */}
                  <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 flex flex-col gap-1.5 text-[11px]">
                    <div className="text-[10px] font-bold text-slate-400 uppercase">Inventaire des Effets Retirés :</div>
                    <div className="text-slate-300">• Portefeuille et cartes SAAQ</div>
                    <div className="text-slate-300">• Téléphone cellulaire scellé</div>
                    <div className="text-slate-300">• Trousseau de clés de véhicule</div>
                    <div className="text-slate-300">• Ceinture et lacets de chaussures</div>
                  </div>

                  {/* Cell Transfer Button */}
                  <button
                    onClick={() => {
                      PoliceSystem.arrestPlayer(
                        `suspect_${Date.now()}`,
                        bookingSuspectName,
                        playerName,
                        180,
                        bookingSelectedCharges.join(" + ")
                      );
                      setFeedbackMsg(`🔒 ${bookingSuspectName} a été formellement écroué en cellule de détention SQ.`);
                      if (onTeleportToJail) onTeleportToJail();
                    }}
                    className="w-full py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-black text-xs uppercase tracking-wide transition shadow-lg cursor-pointer mt-auto"
                  >
                    🔒 Valider l'Écrou & Placer en Cellule
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: DETECTIVE & LICENSE PLATE LOOKUP */}
          {activeTab === "detective" && (
            <div className="flex flex-col gap-6">
              {/* Header */}
              <div className="bg-purple-950/40 p-4 rounded-2xl border border-purple-500/40 flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold uppercase text-purple-300 flex items-center gap-2">
                    🔍 Bureau des Enquêtes Criminelles & Plaques SQ
                  </h3>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Consultation de la base de données RNC, analyse d'indices de scènes de crime et vérification d'immatriculation.
                  </p>
                </div>
                <div className="px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 border border-purple-400/40 text-[10px] font-bold">
                  RÔLE : ÉNQUÊTEUR ASSIGNÉ
                </div>
              </div>

              {/* Grid 1: Criminal Record Search & License Plate Scanner */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Criminal Record Search */}
                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 flex flex-col gap-3">
                  <h4 className="text-xs font-bold text-slate-200">Recherche de Dossier Criminel (RNC)</h4>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Nom du citoyen ou no. permis..."
                      value={searchRecordQuery}
                      onChange={(e) => setSearchRecordQuery(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                    />
                  </div>

                  <div className="flex flex-col gap-2 max-h-48 overflow-y-auto pr-1">
                    {PoliceSystem.searchCriminalRecords(searchRecordQuery).map((rec) => (
                      <div key={rec.id} className="bg-slate-900 p-3 rounded-xl border border-slate-800 flex flex-col gap-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-white">{rec.citizenName}</span>
                          <span className={`text-[9px] px-2 py-0.5 rounded uppercase font-bold ${
                            rec.status === "wanted" ? "bg-red-500/20 text-red-400 border border-red-500/40" : "bg-emerald-500/20 text-emerald-400"
                          }`}>
                            {rec.status}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400">Permis: {rec.licenseNumber} • Plaque: {rec.vehiclePlate || "N/A"}</div>
                        <div className="text-[10px] text-purple-300 italic">"{rec.notes}"</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* License Plate Scanner */}
                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 flex flex-col gap-3">
                  <h4 className="text-xs font-bold text-slate-200">Scanner de Plaque d'Immatriculation</h4>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Plaque ex: GASTON-1, SQ-EVADE"
                      value={plateInput}
                      onChange={(e) => setPlateInput(e.target.value)}
                      className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500 font-mono uppercase"
                    />
                    <button
                      onClick={() => {
                        const res = PoliceSystem.lookupPlate(plateInput);
                        setScannedPlateResult(res || "NOT_FOUND");
                      }}
                      className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold transition"
                    >
                      Scanner
                    </button>
                  </div>

                  {scannedPlateResult === "NOT_FOUND" && (
                    <div className="bg-slate-900 p-3 rounded-xl text-xs text-slate-400 text-center italic">
                      Plaque introuvable dans le registre national du Québec.
                    </div>
                  )}

                  {scannedPlateResult && scannedPlateResult !== "NOT_FOUND" && (
                    <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 flex flex-col gap-1.5 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-amber-400 text-sm">{scannedPlateResult.plate}</span>
                        {scannedPlateResult.stolen ? (
                          <span className="px-2 py-0.5 rounded bg-red-600/30 border border-red-500 text-red-300 font-bold text-[9px]">
                            ⚠️ VÉHICULE VOLÉ / RECHERCHÉ
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded bg-emerald-600/30 text-emerald-300 font-bold text-[9px]">
                            ✅ REGISTRE EN RÈGLE
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-300">Propriétaire: <strong>{scannedPlateResult.ownerName}</strong></div>
                      <div className="text-[10px] text-slate-400">Modèle: {scannedPlateResult.model}</div>
                      {scannedPlateResult.wantedReason && (
                        <div className="text-[10px] text-red-300 font-bold">Motif: {scannedPlateResult.wantedReason}</div>
                      )}
                    </div>
                  )}
                </div>

              </div>

              {/* Crime Scene Evidence Analyzer & Evidence Collection */}
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold uppercase text-purple-300 flex items-center gap-2">
                      🔬 Indices & Pièces à Conviction (Scènes de Crime)
                    </h4>
                    <p className="text-[10px] text-slate-400">
                      Collectez, analysez au labo et reliez les indices ADN/balistique pour identifier les suspects en cavale.
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      // Collect all uncollected field evidences for testing
                      crimeEvidences.forEach((ev) => {
                        if (!ev.collected) PoliceSystem.collectCrimeEvidence(ev.id);
                      });
                      setCrimeEvidences([...PoliceSystem.getCrimeEvidences()]);
                      setFeedbackMsg("📦 Tous les indices de terrain ont été prélevés et sécurisés sous scellés SQ !");
                      setTimeout(() => setFeedbackMsg(null), 3500);
                    }}
                    className="px-3 py-1.5 bg-purple-900/60 hover:bg-purple-800 border border-purple-500/40 text-purple-200 rounded-xl text-[10px] font-bold transition"
                  >
                    📦 Prélever Tous les Indices de Terrain
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {crimeEvidences.map((ev) => (
                    <div key={ev.id} className="bg-slate-900 p-3.5 rounded-xl border border-slate-800 flex flex-col justify-between gap-3">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-bold text-white flex items-center gap-1.5">
                            <span className="text-sm">
                              {ev.type === "bullet_casing" ? "🔫" : ev.type === "blood_trail" || ev.type === "dna_sample" ? "🩸" : ev.type === "poached_pelt" ? "🦌" : "🪪"}
                            </span>
                            {ev.title}
                          </span>
                          <span className="text-[9px] px-2 py-0.5 rounded bg-slate-800 text-slate-400 font-mono">
                            {ev.caseNumber}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-300 leading-relaxed">{ev.description}</p>
                        
                        <div className="mt-2 flex flex-wrap gap-2 text-[9px]">
                          <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                            📍 {ev.locationName}
                          </span>
                          <span className={`px-2 py-0.5 rounded font-bold ${
                            ev.collected ? "bg-emerald-950/60 text-emerald-300 border border-emerald-500/30" : "bg-amber-950/60 text-amber-300 border border-amber-500/30"
                          }`}>
                            {ev.collected ? "✓ Prélèvement effectif" : "⏳ Sur la scène"}
                          </span>
                        </div>

                        {ev.analyzed && ev.suspectLinked && (
                          <div className="mt-2 p-2 rounded bg-red-950/50 border border-red-500/40 text-[10px] text-red-200 font-bold flex items-center justify-between">
                            <span>🧬 Match ADN/Balistique : {ev.suspectLinked}</span>
                            <span className="text-[9px] bg-red-800/80 px-1.5 py-0.5 rounded text-white">MANDAT ACTIF</span>
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col gap-2">
                        {!ev.collected ? (
                          <button
                            onClick={() => {
                              const res = PoliceSystem.collectCrimeEvidence(ev.id);
                              setCrimeEvidences([...PoliceSystem.getCrimeEvidences()]);
                              setFeedbackMsg(res.message);
                              setTimeout(() => setFeedbackMsg(null), 3500);
                            }}
                            className="w-full py-1.5 rounded-lg text-xs font-bold bg-amber-600 hover:bg-amber-500 text-white transition"
                          >
                            📍 Prélever & Mettre sous Scellé
                          </button>
                        ) : !ev.analyzed ? (
                          <button
                            onClick={() => {
                              const res = PoliceSystem.analyzeCrimeEvidence(ev.id);
                              setCrimeEvidences([...PoliceSystem.getCrimeEvidences()]);
                              setFeedbackMsg(res.message);
                              setTimeout(() => setFeedbackMsg(null), 3500);
                            }}
                            className="w-full py-1.5 rounded-lg text-xs font-bold bg-purple-600 hover:bg-purple-500 text-white transition"
                          >
                            🔬 Analyser au Laboratoire Balistique/ADN (+45 pts)
                          </button>
                        ) : !ev.suspectLinked ? (
                          <div className="flex gap-1.5">
                            <input
                              type="text"
                              placeholder="Nom du suspect à inculper..."
                              value={linkSuspectInput[ev.id] || ""}
                              onChange={(e) => setLinkSuspectInput({ ...linkSuspectInput, [ev.id]: e.target.value })}
                              className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-red-500"
                            />
                            <button
                              onClick={() => {
                                const suspectName = linkSuspectInput[ev.id] || "Sylvain 'Le Loup' Tremblay";
                                const res = PoliceSystem.linkEvidenceSuspect(ev.id, suspectName);
                                setCrimeEvidences([...PoliceSystem.getCrimeEvidences()]);
                                setWantedSuspects([...PoliceSystem.getWantedSuspects()]);
                                setFeedbackMsg(res.message);
                                setTimeout(() => setFeedbackMsg(null), 4000);
                              }}
                              className="px-3 py-1 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-bold transition whitespace-nowrap"
                            >
                              ⚖️ Inculper & Mandat
                            </button>
                          </div>
                        ) : (
                          <div className="text-[10px] text-emerald-400 font-bold text-center py-1 bg-slate-950 rounded-lg border border-slate-800">
                            ✓ Dossier d'accusation transmis au procureur
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Wanted Suspects List & Dispatch (Avis de Recherche SQ) */}
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold uppercase text-red-400 flex items-center gap-2">
                      ⭐ Avis de Recherche SQ & Mandats d'Arrêt Actifs
                    </h4>
                    <p className="text-[10px] text-slate-400">
                      Individus recherchés dans la juridiction de la Sûreté du Québec. Priorisez leur interception.
                    </p>
                  </div>
                  <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-red-500/20 text-red-300 border border-red-500/40">
                    {wantedSuspects.length} SUSPECTS RECHERCHÉS
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {wantedSuspects.map((suspect) => (
                    <div
                      key={suspect.id}
                      className={`p-3.5 rounded-xl border flex flex-col justify-between gap-3 ${
                        suspect.inPursuit
                          ? "bg-red-950/40 border-red-500/60 shadow-[0_0_20px_rgba(239,68,68,0.2)]"
                          : "bg-slate-900 border-slate-800"
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-bold text-white flex items-center gap-2">
                            👤 {suspect.name}
                          </span>
                          <span className="text-amber-400 font-bold text-xs tracking-widest">
                            {"⭐".repeat(suspect.stars)}
                          </span>
                        </div>
                        <p className="text-[10px] text-red-300 font-medium">{suspect.reason}</p>
                        
                        <div className="mt-2 flex flex-wrap items-center justify-between text-[10px]">
                          <span className="text-slate-400">
                            📍 Dernier signalement: <strong className="text-slate-200">{suspect.lastSeenLocation}</strong>
                          </span>
                          <span className="text-emerald-400 font-bold font-mono">
                            Prime: {suspect.bounty}$
                          </span>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            suspect.inPursuit = !suspect.inPursuit;
                            setWantedSuspects([...wantedSuspects]);
                            if (suspect.inPursuit) {
                              setFeedbackMsg(`🚨 Alerte Code-3 : Toutes les patrouilles SQ convergent vers ${suspect.name} !`);
                            } else {
                              setFeedbackMsg(`Patrouille informée : Poursuite levée pour ${suspect.name}.`);
                            }
                            setTimeout(() => setFeedbackMsg(null), 3500);
                          }}
                          className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                            suspect.inPursuit
                              ? "bg-red-600 text-white animate-pulse"
                              : "bg-slate-800 hover:bg-slate-700 text-slate-200"
                          }`}
                        >
                          <Siren className="w-3.5 h-3.5" />
                          {suspect.inPursuit ? "Poursuite en Cours" : "Lancer Poursuite AI"}
                        </button>

                        <button
                          onClick={() => {
                            PoliceSystem.removeWantedSuspect(suspect.id);
                            setWantedSuspects([...PoliceSystem.getWantedSuspects()]);
                            setFeedbackMsg(`✅ Suspect ${suspect.name} appréhendé et écroué ! Mandat clôturé.`);
                            setTimeout(() => setFeedbackMsg(null), 3500);
                          }}
                          className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg text-xs font-bold transition whitespace-nowrap"
                        >
                          Appréhendé
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Form: Issue New Wanted Notice */}
                <div className="mt-2 bg-slate-900/90 p-3.5 rounded-xl border border-slate-800 flex flex-col gap-2.5">
                  <h5 className="text-[11px] font-bold text-slate-300 uppercase">
                    ➕ Émettre un Nouvel Avis de Recherche (Mandat SQ)
                  </h5>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <input
                      type="text"
                      placeholder="Nom du suspect..."
                      value={newSuspectName}
                      onChange={(e) => setNewSuspectName(e.target.value)}
                      className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-red-500"
                    />
                    <input
                      type="text"
                      placeholder="Motif d'accusation..."
                      value={newSuspectReason}
                      onChange={(e) => setNewSuspectReason(e.target.value)}
                      className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-red-500"
                    />
                    <div className="flex gap-2">
                      <input
                        type="number"
                        placeholder="Prime ($)"
                        value={newSuspectBounty}
                        onChange={(e) => setNewSuspectBounty(parseInt(e.target.value) || 0)}
                        className="w-24 bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-red-500"
                      />
                      <button
                        onClick={() => {
                          if (!newSuspectName || !newSuspectReason) return;
                          PoliceSystem.addWantedSuspect({
                            name: newSuspectName,
                            stars: 3,
                            reason: newSuspectReason,
                            bounty: newSuspectBounty,
                            lastSeenLocation: "Centre-Ville Portneuf",
                          });
                          setWantedSuspects([...PoliceSystem.getWantedSuspects()]);
                          setNewSuspectName("");
                          setNewSuspectReason("");
                          setFeedbackMsg(`⭐ Avis de recherche diffusé sur toutes les ondes SQ pour ${newSuspectName} !`);
                          setTimeout(() => setFeedbackMsg(null), 3500);
                        }}
                        className="flex-1 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-bold transition"
                      >
                        Diffuser l'Avis
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Wanted Level Simulation & Testing for Officers */}
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase text-amber-300">
                    ⭐ Niveau d'Avis de Recherche du Joueur (Simulation & Réponse SQ)
                  </h4>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-amber-400">
                      {"⭐".repeat(playerWantedState.stars) || "Aucune Étoile"}
                    </span>
                    {playerWantedState.isWanted && (
                      <span className="text-[9px] px-2 py-0.5 rounded bg-red-600 text-white font-bold animate-pulse">
                        EN CAVALE
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => {
                      PoliceSystem.reportCrime("speeding_excessive", [0, 0, 0]);
                      setPlayerWantedState({ ...PoliceSystem.getPlayerWantedState() });
                      setFeedbackMsg("🚗 Infraction signalée : Grand excès de vitesse (+1 ⭐) !");
                      setTimeout(() => setFeedbackMsg(null), 3000);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-amber-500/50 text-xs text-amber-300 transition"
                  >
                    +1 ⭐ Excès Vitesse
                  </button>
                  <button
                    onClick={() => {
                      PoliceSystem.reportCrime("traffic_evasion", [0, 0, 0]);
                      setPlayerWantedState({ ...PoliceSystem.getPlayerWantedState() });
                      setFeedbackMsg("🚨 Infraction signalée : Refus d'obtempérer aux gyrophares (+2 ⭐) !");
                      setTimeout(() => setFeedbackMsg(null), 3000);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-amber-500/50 text-xs text-amber-300 transition"
                  >
                    +2 ⭐ Refus d'Obtempérer
                  </button>
                  <button
                    onClick={() => {
                      PoliceSystem.reportCrime("grand_theft_auto", [0, 0, 0]);
                      setPlayerWantedState({ ...PoliceSystem.getPlayerWantedState() });
                      setFeedbackMsg("🏪 Crime majeur : Vol qualifié de véhicule (+3 ⭐) !");
                      setTimeout(() => setFeedbackMsg(null), 3000);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-amber-500/50 text-xs text-amber-300 transition"
                  >
                    +3 ⭐ Vol de Véhicule
                  </button>
                  <button
                    onClick={() => {
                      PoliceSystem.reportCrime("officer_assault", [0, 0, 0]);
                      setPlayerWantedState({ ...PoliceSystem.getPlayerWantedState() });
                      setFeedbackMsg("🚨 CODE 10-33 : Voie de fait contre agent de la paix (+4 ⭐) !");
                      setTimeout(() => setFeedbackMsg(null), 3000);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-red-950/60 border border-red-500/40 hover:bg-red-900/60 text-xs text-red-300 font-bold transition"
                  >
                    +4 ⭐ Voie de Fait Agent
                  </button>
                  <button
                    onClick={() => {
                      PoliceSystem.clearWantedLevel();
                      setPlayerWantedState({ ...PoliceSystem.getPlayerWantedState() });
                      setFeedbackMsg("✅ Dossier blanchi : Niveau de recherche réinitialisé.");
                      setTimeout(() => setFeedbackMsg(null), 3000);
                    }}
                    className="ml-auto px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs text-white font-bold transition"
                  >
                    Pardonner / Annuler les Étoiles
                  </button>
                </div>
              </div>

            </div>
          )}

          {/* TAB 3: PATROL ROUTE & CHECKPOINTS */}
          {activeTab === "patrol_route" && (
            <div className="flex flex-col gap-6">
              <div className="bg-amber-950/40 p-4 rounded-2xl border border-amber-500/40 flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold uppercase text-amber-300">
                    📍 Circuit de Patrouille Réglementaire SQ
                  </h3>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Effectuez la tournée des checkpoints de patrouille à travers Portneuf et la forêt des Laurentides pour valider votre ronde.
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-xs text-amber-400 font-bold">Ronde en Cours</div>
                  <div className="text-[10px] text-slate-400">Bonus Tour de Ronde : +100 pts</div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {checkpoints.map((cp, idx) => (
                  <div key={cp.id} className="bg-slate-950 p-4 rounded-2xl border border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold ${
                        cp.visited ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40" : "bg-slate-800 text-slate-400"
                      }`}>
                        {idx + 1}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white">{cp.name}</div>
                        <div className="text-[10px] text-slate-400">Coordonnées GPS: [{cp.position[0]}, {cp.position[2]}]</div>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        const res = PoliceSystem.visitCheckpoint(cp.id);
                        setCheckpoints([...PoliceSystem.getPatrolCheckpoints()]);
                        if (res.completedLap) {
                          setFeedbackMsg(`🏆 RONDE COMPLÈTE ! Vous avez gagné ${res.bonusPoints} points de patrouille et 350$ de prime !`);
                          onDeductCash && onDeductCash(-350); // Give bonus money
                        } else {
                          setFeedbackMsg(`📍 Checkpoint "${cp.name}" validé ! (+30 pts)`);
                        }
                        setTimeout(() => setFeedbackMsg(null), 4000);
                      }}
                      disabled={cp.visited}
                      className={`px-3 py-2 rounded-xl text-xs font-bold transition ${
                        cp.visited ? "bg-emerald-950/60 text-emerald-400 border border-emerald-500/30" : "bg-amber-600 hover:bg-amber-500 text-white"
                      }`}
                    >
                      {cp.visited ? "✓ Visité" : "Valider Passage"}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: UNPAID TICKETS */}
          {activeTab === "citizen" && (
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="text-xs font-bold uppercase text-slate-300">
                  Dossier d'Infractions du Citoyen
                </h3>
                <span className="text-[10px] text-slate-400">
                  Liquide disponible: <strong className="text-emerald-400">${playerCash}</strong>
                </span>
              </div>

              {unpaidTickets.length === 0 ? (
                <div className="bg-slate-950 p-8 rounded-2xl border border-slate-800 text-center">
                  <CheckCircle className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                  <div className="text-xs font-bold text-white">Aucune contravention en souffrance</div>
                  <div className="text-[10px] text-slate-400 mt-1">Vous respectez le Code de la Sécurité Routière du Québec.</div>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {unpaidTickets.map((t) => (
                    <div key={t.id} className="bg-slate-950 p-4 rounded-2xl border border-slate-800 flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                            t.department === "SQ" ? "bg-amber-500/20 text-amber-300 border border-amber-500/40" : "bg-blue-500/20 text-blue-300 border border-blue-500/40"
                          }`}>
                            {t.department}
                          </span>
                          <span className="text-xs font-bold text-white">{t.reason}</span>
                        </div>
                        <div className="text-[10px] text-slate-400">
                          Émis par {t.officerName} • Montant : <strong className="text-red-400">${t.amount}</strong>
                        </div>
                      </div>

                      <button
                        onClick={() => handlePayFine(t.id, t.amount)}
                        className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition flex items-center gap-1.5"
                      >
                        <DollarSign className="w-4 h-4" /> Payer {t.amount}$
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: JAIL / CELL MONITORING */}
          {activeTab === "jail" && (
            <div>
              {jailStatus && jailStatus.timeRemaining > 0 ? (
                <div className="bg-red-950/40 border border-red-500/50 p-6 rounded-2xl flex flex-col items-center text-center">
                  <div className="p-3 rounded-full bg-red-600/20 border border-red-500 text-red-400 mb-3 animate-pulse">
                    <Lock className="w-8 h-8" />
                  </div>
                  <h3 className="text-base font-black text-white uppercase tracking-wider mb-1">
                    Cellule de Dépôt - Sûreté du Québec
                  </h3>
                  <p className="text-xs text-slate-300 max-w-md mb-4">
                    Incarcéré par <strong>{jailStatus.officerName}</strong> pour : <br />
                    <span className="text-red-300 italic">"{jailStatus.reason}"</span>
                  </p>

                  <div className="bg-slate-950 px-6 py-4 rounded-2xl border border-slate-800 mb-6">
                    <div className="text-[10px] text-slate-400 uppercase font-bold tracking-widest mb-1">
                      Temps de Peine Restant
                    </div>
                    <div className="text-3xl font-black text-red-400 font-mono">
                      {jailStatus.timeRemaining}s
                    </div>
                  </div>

                  <button
                    onClick={handlePayBail}
                    className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow-lg flex items-center gap-2"
                  >
                    <DollarSign className="w-4 h-4" /> Payer Caution de Libération ({jailStatus.bailAmount}$)
                  </button>
                </div>
              ) : (
                <div className="bg-slate-950 p-8 rounded-2xl border border-slate-800 text-center">
                  <Unlock className="w-8 h-8 text-blue-400 mx-auto mb-2" />
                  <div className="text-xs font-bold text-white">Vous n'êtes actuellement pas incarcéré</div>
                  <div className="text-[10px] text-slate-400 mt-1">Le casier judiciaire est libre d'écrou actif.</div>
                </div>
              )}
            </div>
          )}

        </div>

        {/* ─── RESTRAINT & ARREST INTERACTIVE MINI-GAME OVERLAY ─── */}
        {restraintState && (
          <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md z-50 flex items-center justify-center p-6 animate-fade-in">
            <div className="bg-slate-900 border border-amber-500/50 rounded-3xl p-6 max-w-lg w-full shadow-[0_0_50px_rgba(245,158,11,0.25)] flex flex-col gap-5">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 text-xl">
                    🔒
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-white uppercase tracking-wider">
                      Protocole d'Arrestation & Maîtrise
                    </h3>
                    <div className="text-[11px] text-slate-400">
                      Suspect sous garde : <strong className="text-amber-300">{restraintState.suspectName}</strong>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => {
                    PoliceSystem.cancelRestraintMiniGame();
                    setRestraintState(null);
                  }}
                  className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center"
                >
                  ✕
                </button>
              </div>

              {/* Compliance Progress Gauge */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400 font-bold uppercase text-[10px]">Niveau de Conformité / Sécurisation</span>
                  <span className="font-mono text-amber-400 font-bold">{restraintState.complianceProgress}%</span>
                </div>
                <div className="w-full bg-slate-950 h-3 rounded-full overflow-hidden border border-slate-800">
                  <div
                    className="h-full bg-gradient-to-r from-amber-500 via-emerald-500 to-cyan-400 transition-all duration-300 rounded-full"
                    style={{ width: `${restraintState.complianceProgress}%` }}
                  />
                </div>
              </div>

              {/* Interactive Stage Actions */}
              <div className="flex flex-col gap-3">
                <div className="text-[11px] font-bold text-slate-300">Actions d'Intervention :</div>

                {/* Stage 1: Verbal Command */}
                <button
                  onClick={() => {
                    const res = PoliceSystem.advanceRestraintMiniGame("verbal_command");
                    setFeedbackMsg(res.message);
                    setRestraintState({ ...PoliceSystem.getRestraintGame()! });
                  }}
                  disabled={restraintState.stage !== "hands_up"}
                  className={`p-3 rounded-2xl border text-left transition flex items-center justify-between gap-3 ${
                    restraintState.stage === "hands_up"
                      ? "bg-amber-600 hover:bg-amber-500 text-slate-950 font-black cursor-pointer shadow-lg animate-pulse"
                      : "bg-slate-950/60 border-slate-800 text-slate-500 opacity-60 cursor-not-allowed"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-lg">🗣️</span>
                    <div>
                      <div className="text-xs">1. Sommation Verbale Immédiate</div>
                      <div className="text-[10px] font-normal opacity-90">"Police ! Mains sur la tête et à genoux !"</div>
                    </div>
                  </div>
                  {restraintState.stage !== "hands_up" && <span className="text-emerald-400 font-bold text-xs">✓ Validé</span>}
                </button>

                {/* Stage 2: Handcuffing or Taser */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    onClick={() => {
                      const res = PoliceSystem.advanceRestraintMiniGame("apply_cuffs");
                      setFeedbackMsg(res.message);
                      setRestraintState({ ...PoliceSystem.getRestraintGame()! });
                    }}
                    disabled={restraintState.stage !== "cuffing"}
                    className={`p-3 rounded-2xl border text-left transition flex items-center justify-between gap-2 ${
                      restraintState.stage === "cuffing"
                        ? "bg-blue-600 hover:bg-blue-500 text-white font-black cursor-pointer shadow-lg animate-pulse"
                        : "bg-slate-950/60 border-slate-800 text-slate-500 opacity-60 cursor-not-allowed"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-lg">🔒</span>
                      <div>
                        <div className="text-xs">2. Pose des Menottes</div>
                        <div className="text-[10px] font-normal opacity-80">*Clic-clac* poignets</div>
                      </div>
                    </div>
                    {restraintState.stage === "miranda" && <span className="text-emerald-400 font-bold text-xs">✓</span>}
                  </button>

                  <button
                    onClick={() => {
                      const res = PoliceSystem.advanceRestraintMiniGame("taser_deploy");
                      setFeedbackMsg(res.message);
                      setRestraintState({ ...PoliceSystem.getRestraintGame()! });
                    }}
                    disabled={restraintState.stage !== "cuffing" && restraintState.stage !== "hands_up"}
                    className="p-3 rounded-2xl border border-amber-500/30 bg-slate-950 hover:bg-amber-950/40 text-amber-300 transition text-left flex items-center gap-2 cursor-pointer"
                  >
                    <span className="text-lg">⚡</span>
                    <div>
                      <div className="text-xs font-bold">Déployer Taser X26</div>
                      <div className="text-[10px] text-slate-400">Neutralisation non létale</div>
                    </div>
                  </button>
                </div>

                {/* Stage 3: Miranda / Charter Rights */}
                <button
                  onClick={() => {
                    const res = PoliceSystem.advanceRestraintMiniGame("read_miranda");
                    setFeedbackMsg(res.message);
                    setRestraintState(null);
                    setRadioMessages([...PoliceSystem.getRadioMessages()]);
                  }}
                  disabled={restraintState.stage !== "miranda"}
                  className={`p-3 rounded-2xl border text-left transition flex items-center justify-between gap-3 ${
                    restraintState.stage === "miranda"
                      ? "bg-emerald-600 hover:bg-emerald-500 text-white font-black cursor-pointer shadow-lg animate-pulse"
                      : "bg-slate-950/60 border-slate-800 text-slate-500 opacity-60 cursor-not-allowed"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-lg">📜</span>
                    <div>
                      <div className="text-xs">3. Énoncer les Droits Constitutionnels</div>
                      <div className="text-[10px] font-normal opacity-90">Charte des droits du Québec & accès sans délai à un avocat</div>
                    </div>
                  </div>
                  <span className="text-[10px] bg-black/20 px-2 py-0.5 rounded font-mono">+75 XP</span>
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
