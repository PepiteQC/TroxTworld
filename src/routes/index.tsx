import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type ComponentType } from "react";

export const Route = createFileRoute("/")({
  component: Home,
});

/**
 * First paint must never depend on Three.js / the game graph.
 * A previous SSR of <PortneufApp /> crashed (Hud / worlddata) and left a
 * white error page in the live preview.
 */
function Splash({ message }: { message: string }) {
  return (
    <div
      style={{
        minHeight: "100dvh",
        background: "#0c1210",
        color: "#ece8de",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "32px 24px",
        textAlign: "center",
        fontFamily: "Outfit, Segoe UI, system-ui, sans-serif",
      }}
    >
      <p
        style={{
          letterSpacing: "0.35em",
          fontSize: 11,
          textTransform: "uppercase",
          color: "#7a9aaa",
          margin: 0,
        }}
      >
        Comté de Portneuf
      </p>
      <h1
        style={{
          fontFamily: "Instrument Serif, Times New Roman, serif",
          fontStyle: "italic",
          fontSize: "clamp(48px, 10vw, 80px)",
          fontWeight: 400,
          lineHeight: 1,
          margin: "14px 0 0",
        }}
      >
        Portneuf
      </h1>
      <p style={{ marginTop: 16, maxWidth: 420, color: "#8a9084", fontSize: 15, lineHeight: 1.5 }}>
        {message}
      </p>
    </div>
  );
}

function Home() {
  const [App, setApp] = useState<ComponentType | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void import("@/game/Game")
      .then((mod) => {
        if (!cancelled) setApp(() => mod.PortneufApp);
      })
      .catch((err) => {
        console.error(err);
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Impossible de charger le comté.");
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) return <Splash message={`Erreur : ${error}`} />;
  if (!App) return <Splash message="Chargement du comté…" />;
  return <App />;
}
