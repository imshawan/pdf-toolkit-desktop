import React from 'react';
import { User } from 'lucide-react';

interface AppHeaderProps {
  appName: string;
}

export function AppHeader({ appName }: AppHeaderProps) {
  const appVersion = "1.0.0";

  return (
    <div className="flex items-center gap-3 px-3 py-4 mx-3 mb-4 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 transition-colors" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
      <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#8E8E93] to-[#5C5C60] text-white shadow-sm ring-1 ring-black/10 dark:ring-white/10">
        <User size={24} strokeWidth={1.5} />
      </div>
      <div className="flex flex-col overflow-hidden">
        <h1 className="text-[14px] font-bold tracking-tight text-black dark:text-white truncate">
          {appName}
        </h1>
        <p className="text-[11px] text-black/50 dark:text-white/50 truncate">
          Version {appVersion}
        </p>
      </div>
    </div>
  );
}
