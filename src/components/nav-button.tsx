import React from 'react';
import { LucideIcon } from 'lucide-react';

interface NavButtonProps {
  icon: LucideIcon;
  label: string;
  isActive: boolean;
  onClick: () => void;
  iconBgColor?: string;
}

export function NavButton({ icon: Icon, label, isActive, onClick, iconBgColor = 'bg-[var(--color-mac-blue)]' }: NavButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-2 py-1 rounded-xl transition-colors focus:outline-none ${
        isActive 
          ? 'bg-[#0060DF] text-white font-medium shadow-sm' 
          : 'text-black dark:text-white hover:bg-black/5 dark:hover:bg-white/10'
      }`}
    >
      <div className={`flex size-[28px] shrink-0 items-center justify-center rounded-[7px] text-white shadow-sm ring-1 ring-black/10 dark:ring-white/10 ${iconBgColor}`}>
        <Icon size={16} strokeWidth={2} />
      </div>
      <span className="text-[13px] tracking-wide truncate">
        {label}
      </span>
    </button>
  );
}
