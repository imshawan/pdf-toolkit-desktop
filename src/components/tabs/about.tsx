import React from 'react';
import { useTranslation } from 'react-i18next';
import { Info } from 'lucide-react';

export function About() {
  const { t } = useTranslation();

  return (
    <div className="p-8 max-w-2xl mx-auto flex flex-col items-center text-center mt-12">
      <div className="w-24 h-24 bg-gradient-to-br from-[var(--color-mac-blue)] to-indigo-500 rounded-2xl flex items-center justify-center shadow-lg mb-6 text-white">
        <Info size={48} strokeWidth={1.5} />
      </div>
      
      <h1 className="text-3xl font-bold tracking-tight text-black dark:text-white mb-8">
        {t('about.title')}
      </h1>

      <div className="text-[15px] text-black/70 dark:text-white/70 leading-relaxed max-w-md">
        {t('about.desc')}
      </div>
    </div>
  );
}
