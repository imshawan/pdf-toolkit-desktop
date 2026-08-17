import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger';
}

export function Button({ variant = 'secondary', className = '', children, ...props }: ButtonProps) {
  const baseStyle = "inline-flex items-center justify-center gap-2 px-4 py-1.5 text-[13px] font-medium rounded-full transition-all shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed";
  
  const variants = {
    primary: "bg-[var(--color-mac-blue)] text-white hover:bg-[var(--color-mac-blue-active)] border border-black/10 dark:border-white/10 focus:ring-[var(--color-mac-blue)]",
    secondary: "bg-white dark:bg-[#323232] text-gray-800 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-[#3a3a3a] border border-gray-200 dark:border-gray-600 focus:ring-gray-300 dark:focus:ring-gray-600",
    danger: "bg-[#ff3b30] text-white hover:bg-[#d6342b] border border-black/10 focus:ring-[#ff3b30]"
  };

  return (
    <button 
      className={`${baseStyle} ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
