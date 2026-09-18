// ============================================
// ETHERWORLD - Access Denied Alert
// ============================================

import { memo } from 'react';

export const AccessDeniedAlert = memo(() => (
  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
                  z-30 pointer-events-none animate-bounce">
    <div className="bg-red-950/90 border border-red-500/70 rounded-lg 
                    px-6 py-4 text-center font-mono shadow-2xl
                    shadow-red-900/50">
      <div className="text-red-400 text-2xl mb-1">🔒</div>
      <div className="text-red-300 text-sm font-bold tracking-widest">
        ACCESS DENIED
      </div>
      <div className="text-red-500/70 text-xs mt-1">
        Insufficient clearance level
      </div>
    </div>
  </div>
));

AccessDeniedAlert.displayName = 'AccessDeniedAlert';