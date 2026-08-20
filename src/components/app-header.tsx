import React from 'react';
import pkg from '../../package.json';

interface AppHeaderProps {
  appName?: string;
}

export function AppHeader({ appName = pkg.displayName || pkg.name }: AppHeaderProps) {
  const version = `v${pkg.version || "1.0.0"}`;

  return (
    <div className="flex flex-col justify-center py-4 w-full" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
      <div className="flex items-center gap-2">
        <h1 className="text-lg font-bold tracking-tight text-black dark:text-white truncate">
          {appName}
        </h1>
        <span className="px-1.5 py-0.5 rounded-md bg-black/5 dark:bg-white/10 text-[10px] font-medium text-black/60 dark:text-white/60 ring-1 ring-black/5 dark:ring-white/10">
          {version}
        </span>
      </div>
    </div>
  );
}
