import React from 'react';
import { useTranslation } from 'react-i18next';
import { 
  FileBox, 
  Scissors, 
  RotateCcw, 
  Image as ImageIcon, 
  Table, 
  GripHorizontal,
  Lock,
  Unlock
} from 'lucide-react';

interface DashboardProps {
  onToolSelect: (toolId: string) => void;
}

export function Dashboard({ onToolSelect }: DashboardProps) {
  const { t } = useTranslation();

  const coreTools = [
    { id: 'merge', icon: FileBox, label: t('tools.merge'), desc: t('tools.mergeDesc'), iconBg: 'bg-blue-500' },
    { id: 'split', icon: Scissors, label: t('tools.split'), desc: t('tools.splitDesc'), iconBg: 'bg-orange-500' },
    { id: 'rotate', icon: RotateCcw, label: t('tools.rotate', 'Rotate'), desc: t('tools.rotateDesc', 'Rotate PDF pages'), iconBg: 'bg-emerald-500' },
    { id: 'rearrange', icon: GripHorizontal, label: t('tools.rearrange', 'Rearrange'), desc: t('tools.rearrangeDesc', 'Reorder pages'), iconBg: 'bg-cyan-500' },
    { id: 'protect', icon: Lock, label: t('tools.protect', 'Protect'), desc: t('tools.protectDesc', 'Add a password to protect your PDF'), iconBg: 'bg-indigo-500' },
    { id: 'unlock', icon: Unlock, label: t('tools.unlock', 'Unlock'), desc: t('tools.unlockDesc', 'Remove password from a PDF'), iconBg: 'bg-teal-500' },
  ];

  const convertTools = [
    { id: 'img2pdf', icon: ImageIcon, label: t('tools.img2pdf'), desc: t('tools.img2pdfDesc'), iconBg: 'bg-blue-500' },
    { id: 'xls2pdf', icon: Table, label: t('tools.xls2pdf'), desc: t('tools.xls2pdfDesc'), iconBg: 'bg-pink-500' },
  ];

  const renderToolRow = (tool: any, isLast: boolean) => {
    const Icon = tool.icon;
    return (
      <button
        key={tool.id}
        onClick={() => onToolSelect(tool.id)}
        className="w-full flex items-center px-4 py-3 relative group focus:outline-none transition-colors hover:bg-black/5 dark:hover:bg-white/5"
      >
        <div className="flex items-center gap-3 w-full">
          <div className={`flex size-[28px] shrink-0 items-center justify-center rounded-[7px] text-white shadow-sm ${tool.iconBg}`}>
            <Icon size={16} strokeWidth={2} />
          </div>
          
          <div className={`flex flex-1 items-center justify-between pb-3 -mb-3 ${!isLast ? 'border-b border-black/5 dark:border-white/5' : ''}`}>
            <div className="flex flex-col text-left">
              <span className="text-[13px] text-black dark:text-white font-medium">
                {tool.label}
              </span>
              <span className="text-[11px] text-black/50 dark:text-white/50">
                {tool.desc}
              </span>
            </div>
            <div className="text-black/30 dark:text-white/30 group-hover:text-black/50 dark:group-hover:text-white/50 transition-colors">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m9 18 6-6-6-6"/>
              </svg>
            </div>
          </div>
        </div>
      </button>
    );
  };

  return (
    <div className="flex flex-col pb-20 p-8 max-w-2xl mx-auto gap-8 animate-in fade-in duration-500 mt-4">
      <div className="flex flex-col text-left mb-2">
        <h2 className="text-[28px] font-bold tracking-tight text-black dark:text-white leading-tight">
          {t('dashboard.overview')}
        </h2>
        <p className="text-[14px] text-black/50 dark:text-white/50 mt-1">
          {t('dashboard.subtitle')}
        </p>
      </div>

      <div className="space-y-6">
        <section>
          <div className="w-full bg-white dark:bg-[#2C2C2E] rounded-xl shadow-sm border border-black/5 dark:border-white/5 overflow-hidden">
            {coreTools.map((tool, index) => renderToolRow(tool, index === coreTools.length - 1))}
          </div>
        </section>

        <section>
          <div className="w-full bg-white dark:bg-[#2C2C2E] rounded-xl shadow-sm border border-black/5 dark:border-white/5 overflow-hidden">
            {convertTools.map((tool, index) => renderToolRow(tool, index === convertTools.length - 1))}
          </div>
        </section>
      </div>
    </div>
  );
}
