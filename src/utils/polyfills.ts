// Polyfills globaux du jeu
if (!Array.prototype.random) {
  Array.prototype.random = function <T>(this: T[]): T {
    if (!this || this.length === 0) return undefined as any;
    return this[Math.floor(Math.random() * this.length)];
  };
}

// Nettoyage des avertissements THREE.js inoffensifs dans la console
if (typeof console !== 'undefined') {
  const originalWarn = console.warn;
  console.warn = function (...args) {
    if (typeof args[0] === 'string' && args[0].includes('THREE.Material: parameter')) {
      return; // Ignore les messages "parameter has value of undefined"
    }
    originalWarn.apply(console, args);
  };
}

// Intercepteur global fetch : Bloque les requêtes réseau vides pour éviter les 400
if (typeof window !== 'undefined') {
  const originalFetch = window.fetch;
  window.fetch = async function (input: RequestInfo | URL, init?: RequestInit) {
    const url = typeof input === 'string' ? input : (input instanceof URL ? input.href : (input as any)?.url);
    
    if (url && url.includes('/api/rp/heartbeat')) {
      try {
        const bodyStr = init?.body ? String(init.body) : '';
        // Si la session n'est pas encore initialisée, on simule une réponse 200 sans envoyer de requête échouée
        if (!bodyStr || bodyStr === '{}' || bodyStr.includes('""') || bodyStr.includes('null') || bodyStr.includes('undefined')) {
          return new Response(JSON.stringify({ ok: true, status: 'idle' }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          });
        }
      } catch (_) {}
    }
    return originalFetch.apply(this, arguments as any);
  };
}

// Rapport d'erreur détaillé pour débugger l'Error Boundary
if (typeof window !== 'undefined') {
  window.addEventListener('error', (e) => {
    console.error('💥 [Erreur UI interceptée]:', e.error || e.message);
  });
  window.addEventListener('unhandledrejection', (e) => {
    console.error('💥 [Promesse rejetée]:', e.reason);
  });
}
