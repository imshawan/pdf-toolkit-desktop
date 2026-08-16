import React from 'react';
import { LayoutGrid, Settings, HelpCircle, User } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { AppHeader } from './app-header';
import { NavButton } from './nav-button';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export function Sidebar({ activeTab, setActiveTab }: SidebarProps) {
  const { t } = useTranslation();

  return (
    <aside className="flex flex-col w-[220px] h-full bg-white/50 dark:bg-transparent overflow-hidden" style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}>

      {/* Header section with App Icon & Title */}
      <div className="flex items-center gap-3 px-4 pt-12 pb-0" style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}>
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
