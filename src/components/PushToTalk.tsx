import React, { useState, useEffect, useRef } from "react";
import { Mic, MicOff, MessageSquare, Volume2, User, Sparkles, Send } from "lucide-react";
import { WeatherType, TimePhase } from "../types";
import { ContextualAudioManager } from "../utils/ContextualAudioManager";

interface PushToTalkProps {
  selectedNPC: string;
  weather: WeatherType;
  timePhase: TimePhase;
  playerContext: any;
  onNpcResponse: (responseMsg: string) => void;
  onTriggerPhysgun: (active: boolean) => void;
}

export default function PushToTalk({
  selectedNPC,
  weather,
  timePhase,
  playerContext,
  onNpcResponse,
  onTriggerPhysgun
}: PushToTalkProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [speechText, setSpeechText] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [dialogHistory, setDialogHistory] = useState<Array<{ sender: string; text: string; time: string }>>([]);
  const [errorMsg, setErrorMsg] = useState("");

  const recognitionRef = useRef<any>(null);

  // Initialize Speech Recognition
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = "fr-CA"; // Québec Accent ready!

      rec.onstart = () => {
        setIsRecording(true);
        setErrorMsg("");
        onTriggerPhysgun(true); // Pull objects towards character center using gravity-attractor when speaking
        ContextualAudioManager.getInstance().playRadioClick(true);
      };

      rec.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setSpeechText(transcript);
        handleSendToNPC(transcript);
      };

      rec.onerror = (e: any) => {
        console.error("Speech Recognition error:", e);
        if (e.error === "not-allowed") {
          setErrorMsg("Permission d'accès au micro refusée.");
        } else {
          setErrorMsg("Erreur d'écoute : " + e.error);
        }
        setIsRecording(false);
        onTriggerPhysgun(false);
        ContextualAudioManager.getInstance().playRadioClick(false);
      };

      rec.onend = () => {
        setIsRecording(false);
        onTriggerPhysgun(false);
        ContextualAudioManager.getInstance().playRadioClick(false);
      };

      recognitionRef.current = rec;
    }

    // Populate initial dialog
    const initHistory = [
      {
        sender: selectedNPC,
        text: `Salut ${playerContext?.name || "Citoyen"}! On jase-tu? Clique sur le micro pour me parler de vive voix, ou tape ton texte.`,
        time: "Maintenant"
      }
    ];
    setDialogHistory(initHistory);
  }, [selectedNPC]);

  // Handle Recording Toggle
  const handleToggleRecord = () => {
    if (isRecording) {
      recognitionRef.current?.stop();
    } else {
      if (!recognitionRef.current) {
        // Fallback if browser doesn't support speech recognition (or if we are in an iframe restricting permissions)
        simulateSpeechRecording();
        return;
      }
      try {
        recognitionRef.current.start();
      } catch (e) {
        recognitionRef.current?.stop();
      }
    }
  };

  // Simulate speech recording if speech api isn't supported / allowed
  const simulateSpeechRecording = () => {
    setIsRecording(true);
    onTriggerPhysgun(true);
    setErrorMsg("API de reconnaissance vocale indisponible. Simulation en cours...");
    ContextualAudioManager.getInstance().playRadioClick(true);
    
    const fallbackPrompts = [
      "Bonjour Sheriff, quel est le taux de criminalité aujourd'hui ?",
      "Salut Monsieur le Maire, les prix de l'immobilier à Deschambault grimpent-ils ?",
      "Heille l'ami, vends-tu de la contrebande d'EtherPrism ?",
      "Est-ce que je peux avoir un prêt hypothécaire s'il vous plaît ?"
    ];
    
    const randomPrompt = fallbackPrompts[Math.floor(Math.random() * fallbackPrompts.length)];

    setTimeout(() => {
      setSpeechText(randomPrompt);
      setIsRecording(false);
      onTriggerPhysgun(false);
      ContextualAudioManager.getInstance().playRadioClick(false);
      handleSendToNPC(randomPrompt);
    }, 2800);
  };

  // Send transcription / message to Express Gemini Proxy
  const handleSendToNPC = async (textToSend: string) => {
    if (!textToSend.trim()) return;

    setIsProcessing(true);
    setErrorMsg("");

    // Add user message to local log
    const userMsg = { sender: "Moi", text: textToSend, time: new Date().toLocaleTimeString("fr-CA") };
    setDialogHistory((prev) => [...prev, userMsg]);

    try {
      const response = await fetch("/api/npc-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: textToSend,
          npc: selectedNPC,
          weather,
          time: timePhase,
          playerContext
        })
      });

      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        const data = await response.json();
        if (response.ok && data.text) {
          const npcMsg = {
            sender: selectedNPC,
            text: data.text,
            time: new Date().toLocaleTimeString("fr-CA")
          };
          setDialogHistory((prev) => [...prev, npcMsg]);
          onNpcResponse(data.text);
          ContextualAudioManager.getInstance().playLoreSparkle();

          // Synthesize spoken audio fallback if SpeechSynthesis is available in browser
          if (window.speechSynthesis) {
            const utterance = new SpeechSynthesisUtterance(data.text);
            utterance.lang = "fr-CA";
            utterance.pitch = selectedNPC === "Sheriff" ? 0.8 : selectedNPC === "Outlaw" ? 0.75 : 1.0;
            window.speechSynthesis.speak(utterance);
          }
        } else {
          throw new Error(data.error || "Une erreur est survenue.");
        }
      } else {
        throw new Error("La réponse du serveur n'est pas au format JSON attendu.");
      }
    } catch (e: any) {
      console.error(e);
      setErrorMsg("Erreur d'échange avec le NPC: " + e.message);
    } finally {
      setIsProcessing(false);
      setSpeechText("");
    }
  };

  return (
    <div className="rounded-xl border border-white/10 bg-[#0c0c0e] p-5 text-[#e0e0e0] shadow-xl flex flex-col h-full max-h-[500px]">
      <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-4">
        <div>
          <h3 className="font-sans text-[10px] font-bold uppercase tracking-[0.2em] text-white/40 flex items-center gap-2">
            <MessageSquare size={14} className="text-blue-500" />
            Neural Voice Chat (PTT)
          </h3>
          <p className="text-[11px] text-white/60 mt-0.5">
            Échange direct avec <b className="text-white font-semibold">{selectedNPC}</b>.
          </p>
        </div>
        <div className="rounded bg-black/40 px-2 py-0.5 text-[9px] text-blue-400 border border-white/5 font-mono">
          CAN-EAST-PTT 🍁
        </div>
      </div>

      {/* Dialog History Box */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-2 mb-4 scrollbar-thin h-[220px]">
        {dialogHistory.map((msg, idx) => (
          <div
            key={idx}
            className={`flex flex-col max-w-[85%] rounded p-3 text-[11px] leading-relaxed ${
              msg.sender === "Moi"
                ? "bg-blue-500/10 border border-blue-500/20 text-[#e0e0e0] self-end ml-auto"
                : "bg-white/5 border border-white/5 text-white/70 self-start mr-auto italic"
            }`}
          >
            <div className="flex items-center gap-1.5 font-bold mb-1 text-[9px] text-blue-400 font-mono uppercase tracking-wider">
              <User size={9} />
              <span>{msg.sender}</span>
              <span className="text-white/30 font-normal ml-auto text-[8px]">{msg.time}</span>
            </div>
            <p>{msg.text}</p>
          </div>
        ))}
        {isProcessing && (
          <div className="flex items-center gap-2 text-[10px] text-white/40 bg-black/40 border border-white/5 p-3 rounded max-w-[70%] mr-auto animate-pulse">
            <Sparkles size={11} className="text-blue-400 animate-spin" />
            <span>Synthèse neuronale de la réponse...</span>
          </div>
        )}
      </div>

      {/* Audio Capture Push-to-Talk HUD bar */}
      <div className="border-t border-white/10 pt-3">
        {errorMsg && (
          <div className="text-[9px] text-yellow-400 bg-yellow-500/5 border border-yellow-500/20 px-3 py-1.5 rounded mb-3 font-mono">
            {errorMsg}
          </div>
        )}

        <div className="flex items-center gap-3">
          {/* Recording Circle with pulsating waveforms */}
          <div className="relative flex items-center justify-center">
            {isRecording && (
              <>
                <span className="absolute inline-flex h-12 w-12 rounded-full bg-red-500/20 animate-ping" />
                <span className="absolute inline-flex h-10 w-10 rounded-full bg-red-500/20 animate-pulse" />
              </>
            )}
            <button
              id="ptt-mic-btn"
              onClick={handleToggleRecord}
              disabled={isProcessing}
              className={`relative z-10 h-9 w-9 rounded-full flex items-center justify-center transition-all ${
                isRecording
                  ? "bg-red-600/30 hover:bg-red-600/50 text-red-400 border border-red-500/40 shadow-[0_0_15px_rgba(239,68,68,0.4)]"
                  : "bg-blue-600/20 hover:bg-blue-500/40 text-blue-400 border border-blue-500/30 shadow-[0_0_15px_rgba(59,130,246,0.2)] disabled:opacity-50"
              }`}
            >
              {isRecording ? <MicOff size={16} /> : <Mic size={16} />}
            </button>
          </div>

          {/* Quick manual typing field */}
          <div className="flex-1 relative flex items-center bg-black/60 rounded border border-white/10 focus-within:border-blue-500/40 transition-colors">
            <input
              id="ptt-manual-input"
              type="text"
              placeholder={isRecording ? "Parlez maintenant..." : "Écrire un message..."}
              disabled={isRecording || isProcessing}
              value={speechText}
              onChange={(e) => setSpeechText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleSendToNPC(speechText);
                }
              }}
              className="w-full bg-transparent border-none py-1.5 px-3 text-[11px] text-white focus:outline-none placeholder-white/30"
            />
            {!isRecording && speechText && (
              <button
                id="ptt-send-btn"
                onClick={() => handleSendToNPC(speechText)}
                className="absolute right-2 text-blue-400 hover:text-blue-300 p-1"
              >
                <Send size={12} />
              </button>
            )}
          </div>
        </div>

        {/* Waves Animation */}
        {isRecording && (
          <div className="flex justify-center items-center gap-1 h-5 mt-3">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((bar) => {
              const randHeight = Math.floor(Math.random() * 15 + 4);
              return (
                <div
                  key={bar}
                  style={{ height: `${randHeight}px` }}
                  className="w-0.5 rounded bg-red-500 animate-pulse transition-all duration-150"
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
