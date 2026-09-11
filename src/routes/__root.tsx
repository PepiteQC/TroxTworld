import { createRootRoute, HeadContent, Outlet, Scripts } from "@tanstack/react-router";
import { AuthProvider } from "@/lib/auth/provider";
import { PreviewHostBridge } from "@/components/preview-host-bridge";
import appCss from "../styles.css?url";

const APP_NAME = "Portneuf";

// 1. Création d'un composant simple et élégant pour la page 404
const NotFoundComponent = () => (
  <div style={{ padding: "4rem 2rem", textAlign: "center", fontFamily: "Outfit, sans-serif" }}>
    <h1 style={{ fontSize: "2rem", fontWeight: 600, marginBottom: "1rem" }}>404 - Page non trouvée</h1>
    <p style={{ color: "#666", marginBottom: "1.5rem" }}>
      Désolé, la page que vous cherchez n'existe pas ou a été déplacée.
    </p>
    <a 
      href="/" 
      style={{ 
        color: "#3b82f6", 
        textDecoration: "underline", 
        fontWeight: 500 
      }}
    >
      Retour à l'accueil
    </a>
  </div>
);

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { title: APP_NAME },
      {
        name: "description",
        content:
          "Conduisez le comté de Portneuf : Route 138, villages, éboulis de 1894 et lacs des Laurentides.",
      },
      { name: "theme-color", content: "#0c1210" },
    ],
    links: [
      { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/__grok/manifest.webmanifest" },
      { rel: "apple-touch-icon", href: "/__grok/icon-180.png" },
      {
        rel: "preconnect",
        href: "https://fonts.googleapis.com",
      },
      {
        rel: "preconnect",
        href: "https://fonts.gstatic.com",
        crossOrigin: "anonymous",
      },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Outfit:wght@400;500;600;700&display=swap",
      },
    ],
  }),
  component: () => (
    <html lang="fr" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body>
        <PreviewHostBridge />
        <AuthProvider>
          <Outlet />
        </AuthProvider>
        <Scripts />
      </body>
    </html>
  ),
  // 2. Ajout de la propriété notFoundComponent ici
  notFoundComponent: NotFoundComponent,
});