import React from 'react';
import { useApp } from '@/hooks/useApp';
import { Settings as SettingsIcon, Monitor, Globe } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export function Settings() {
  const { theme, setTheme, language, setLanguage } = useApp();
  const { t } = useTranslation();

  return (
    <div className="p-8 max-w-2xl mx-auto flex flex-col items-center mt-4">
      {/* Settings Header matching macOS System Settings */}
      <div className="flex flex-col items-center text-center mb-8">
        <div className="w-16 h-16 bg-gradient-to-b from-gray-400 to-gray-500 rounded-[14px] flex items-center justify-center text-white shadow-sm ring-1 ring-black/10 dark:ring-white/10 mb-4">
          <SettingsIcon size={32} strokeWidth={1.5} />
        </div>
        <h1 className="text-[22px] font-bold tracking-tight text-black dark:text-white mb-1">
          {t('settings.title')}
        </h1>
        <p className="text-[13px] text-black/50 dark:text-white/50 max-w-sm">
          Manage your overall setup and preferences for PDF Tools.
        </p>
      </div>

      {/* Grouped List Section */}
      <div className="w-full bg-white dark:bg-[#2C2C2E] rounded-xl shadow-sm overflow-hidden">
        
        {/* Theme Row */}
        <div className="flex items-center px-4 py-3 relative">
          <div className="flex items-center gap-3 w-full">
            <div className="flex size-[28px] shrink-0 items-center justify-center rounded-[7px] bg-[#8E8E93] text-white shadow-sm">
              <Monitor size={16} strokeWidth={2} />
            </div>
            
            {/* Inner Content Wrapper to hold border */}
            <div className="flex flex-1 items-center justify-between pb-3 -mb-3 border-b border-black/5 dark:border-white/5">
              <span className="text-[13px] text-black dark:text-white font-medium">
                {t('settings.theme')}
              </span>
              <div className="flex bg-black/5 dark:bg-white/5 p-1 rounded-[8px]">
                {(['system', 'light', 'dark'] as const).map((tOpt) => (
                  <button
                    key={tOpt}
                    onClick={() => setTheme(tOpt as 'light' | 'dark' | 'system')}
                    className={`px-3 py-1 text-[12px] capitalize rounded-[5px] transition-all ${
                      theme === tOpt 
                        ? 'bg-white dark:bg-[#4A4A4B] text-black dark:text-white shadow-sm ring-1 ring-black/5' 
                        : 'text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white'
                    }`}
                  >
                    {t(`settings.${tOpt}`)}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Language Row */}
        <div className="flex items-center px-4 py-3">
          <div className="flex items-center gap-3 w-full">
            <div className="flex size-[28px] shrink-0 items-center justify-center rounded-[7px] bg-[#0A7BFA] text-white shadow-sm">
              <Globe size={16} strokeWidth={2} />
            </div>
            
            <div className="flex flex-1 items-center justify-between">
              <span className="text-[13px] text-black dark:text-white font-medium">
                {t('settings.languageSelect')}
              </span>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="bg-transparent border border-black/10 dark:border-white/10 text-black dark:text-white text-[12px] rounded-md px-3 py-1 outline-none focus:ring-2 focus:ring-[#0A7BFA]"
              >
                <option value="en">English</option>
                <option value="hi">हिंदी (Hindi)</option>
              </select>
            </div>
          </div>
        </div>
        
      </div>
    </div>
  );
}
