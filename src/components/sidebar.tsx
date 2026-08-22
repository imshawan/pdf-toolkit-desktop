import React from 'react';
import { LayoutGrid, Settings, HelpCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { AppHeader } from './app-header';
import { NavButton } from './nav-button';
import { isMac } from '@/lib/platform';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export function Sidebar({ activeTab, setActiveTab }: SidebarProps) {
  const { t } = useTranslation();

  return (
    <aside 
      className={`flex flex-col w-[220px] min-[1000px]:w-[240px] min-[1200px]:w-[260px] min-[1800px]:w-[280px] shrink-0 transition-[width] duration-300 ease-in-out h-full overflow-hidden ${
        isMac 
          ? 'bg-white/50 dark:bg-transparent' 
          : 'bg-[#EDEDED] dark:bg-[#18181b] border-r border-black/10 dark:border-white/10'
      }`} 
      style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
    >

      {/* Header section with App Icon & Title */}
      <div 
        className={`flex items-center gap-3 px-4 pb-0 ${isMac ? 'pt-12' : 'pt-4'}`} 
        style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
      >
        <AppHeader />
      </div>


      {/* Navigation section */}
      <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto mt-3" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
        <NavButton
          icon={LayoutGrid}
          label={t('sidebar.dashboard')}
          isActive={activeTab === 'dashboard'}
          onClick={() => setActiveTab('dashboard')}
          iconBgColor="bg-[#147BF8]" // Blue
        />
        <NavButton
          icon={Settings}
          label={t('sidebar.settings')}
          isActive={activeTab === 'settings'}
          onClick={() => setActiveTab('settings')}
          iconBgColor="bg-[#8E8E93]" // Gray
        />
        <NavButton
          icon={HelpCircle}
          label={t('sidebar.about')}
          isActive={activeTab === 'about'}
          onClick={() => setActiveTab('about')}
          iconBgColor="bg-[#34C759]" // Green
        />
      </nav>
    </aside>
  );
}
