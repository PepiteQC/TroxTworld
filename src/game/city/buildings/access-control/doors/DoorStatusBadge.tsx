import React, { useEffect, useState } from 'react';
import { hotelRealtimeSecurity } from '../store/hotelRealtimeSecurity';

interface DoorStatusBadgeProps {
  doorId: string;
  className?: string;
}

export const DoorStatusBadge: React.FC<DoorStatusBadgeProps> = ({ doorId, className = '' }) => {
  const [doorState, setDoorState] = useState(() => hotelRealtimeSecurity.getDoorState(doorId));

  useEffect(() => {
    // Set initial state
    setDoorState(hotelRealtimeSecurity.getDoorState(doorId));

    // Subscribe to security store updates
    const unsubscribe = hotelRealtimeSecurity.subscribe(() => {
      setDoorState(hotelRealtimeSecurity.getDoorState(doorId));
    });

    return () => {
      unsubscribe();
    };
  }, [doorId]);

  if (!doorState) return null;

  const { state } = doorState;

  // Pulse animation and colors:
  // - Green for unlocked/open
  // - Amber for lockout
  // - Red for locked (or any other state)
  const pulseClass = (state === 'unlocked' || state === 'open') 
    ? 'animate-pulse-green text-emerald-400 border-emerald-500/40' 
    : state === 'lockout' 
    ? 'animate-pulse-amber text-amber-400 border-amber-500/40' 
    : 'animate-pulse-red text-rose-400 border-rose-500/40';

  const stateLabel = state === 'unlocked' ? '🔓 DÉVERROUILLÉ' :
                     state === 'open' ? '🚪 ATTENTE / OUVERTE' :
                     state === 'lockout' ? '🚨 LOCKOUT EN COURS' :
                     '🔒 SÉCURISÉ';

  return (
    <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded border transition-all duration-300 ${pulseClass} ${className}`}>
      {stateLabel}
    </span>
  );
};
