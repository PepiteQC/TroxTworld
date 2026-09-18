import React from "react";

export function Tooltip({ 
  children, 
  content 
}: { 
  children: React.ReactNode; 
  content: React.ReactNode;
}) {
  return (
    <div className="group relative inline-flex">
      {children}
      {/* La bulle d'info qui apparaît au survol */}
      <div className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 -translate-x-1/2 whitespace-nowrap rounded-md bg-zinc-900 px-2 py-1.5 text-xs text-zinc-100 opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
        {content}
      </div>
    </div>
  );
}