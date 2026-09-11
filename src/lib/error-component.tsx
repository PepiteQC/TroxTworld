import type { ErrorComponentProps } from "@tanstack/react-router";
import { TriangleAlert } from "lucide-react";

const FALLBACK_MESSAGE = "Une erreur inattendue s'est produite. Rechargez la page.";

function errorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "string" && error) return error;
  return FALLBACK_MESSAGE;
}

export function AppErrorComponent({ error }: ErrorComponentProps) {
  return (
    <main
      style={{
        minHeight: "100dvh",
        background: "#0c1210",
        color: "#ece8de",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 12,
        padding: 24,
        textAlign: "center",
        fontFamily: "Outfit, Segoe UI, system-ui, sans-serif",
      }}
    >
      <span style={{ color: "#c44a3a" }} aria-hidden="true">
        <TriangleAlert className="size-10" strokeWidth={2} />
      </span>
      <h1 style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>Le comté n'a pas pu s'afficher</h1>
      <p style={{ maxWidth: 420, fontSize: 14, color: "#8a9084", overflowWrap: "anywhere", margin: 0 }}>
        {errorMessage(error)}
      </p>
      <button
        type="button"
        onClick={() => window.location.reload()}
        style={{
          marginTop: 8,
          height: 44,
          padding: "0 20px",
          borderRadius: 8,
          border: 0,
          background: "#ece8de",
          color: "#0c1210",
          fontSize: 14,
          fontWeight: 500,
          cursor: "pointer",
        }}
      >
        Réessayer
      </button>
    </main>
  );
}
