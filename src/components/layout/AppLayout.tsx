import React, { useState } from 'react';
import { Sidebar } from '../sidebar';
import { isMac } from '@/lib/platform';

interface AppLayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export function AppLayout({ children, activeTab, setActiveTab }: AppLayoutProps) {
  return (
    <div className="flex h-screen w-full overflow-hidden bg-transparent text-[#1d1d1f] dark:text-[#f5f5f7] select-none">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col bg-[#F5F5F5] dark:bg-[#1E1E1E] overflow-hidden border-l border-black/10 dark:border-white/10 relative z-10">
        {/* Titlebar Draggable Area (macOS needs h-10 for hiddenInset titlebar) */}
        {isMac && (
          <div className="h-10 w-full shrink-0 flex items-center justify-end px-4" style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}>
          </div>
        )}
        
        {/* Scrollable Content */}
        <div className="flex-1 overflow-auto" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
          {children}
        </div>
      </main>
    </div>
  );
}
