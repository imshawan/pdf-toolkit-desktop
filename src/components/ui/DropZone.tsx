import React, { useCallback, useState } from 'react';
import { CloudUpload } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface DropZoneProps {
  onFilesDrop: (files: File[]) => void;
  accept?: string;
  multiple?: boolean;
}

export function DropZone({ onFilesDrop, accept = ".pdf", multiple = true }: DropZoneProps) {
  const { t } = useTranslation();
  const [isDragActive, setIsDragActive] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const files = Array.from(e.dataTransfer.files);
      onFilesDrop(files);
    }
  }, [onFilesDrop]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files);
      onFilesDrop(files);
    }
  }, [onFilesDrop]);

  return (
    <div 
      className={`
        w-full h-72 flex flex-col items-center justify-center rounded-[14px]
        transition-all duration-200 ease-in-out cursor-pointer
        ${isDragActive 
          ? 'bg-[var(--color-mac-blue)]/10 border-2 border-[var(--color-mac-blue)] scale-[1.02]' 
          : 'bg-black/[0.03] dark:bg-white/[0.04] border border-black/5 dark:border-white/5 hover:bg-black/[0.05] dark:hover:bg-white/[0.06]'
        }
      `}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => document.getElementById('file-upload')?.click()}
    >
      <div className={`
        p-4 rounded-full mb-4 transition-colors
        ${isDragActive ? 'bg-[var(--color-mac-blue)]/20' : 'bg-white dark:bg-black/20 shadow-sm border border-black/5 dark:border-white/5'}
      `}>
        <CloudUpload size={32} className={isDragActive ? 'text-[var(--color-mac-blue)]' : 'text-gray-500 dark:text-gray-400'} strokeWidth={1.5} />
      </div>
      <p className="text-[14px] font-semibold text-black/80 dark:text-white/80 mb-1">
        {t('common.dragDropFile')}
      </p>
      <p className="text-[12px] text-black/50 dark:text-white/50">
        or click to browse from your computer
      </p>
      <input 
        id="file-upload" 
        type="file" 
        className="hidden" 
        accept={accept}
        multiple={multiple}
        onChange={handleFileInput}
      />
    </div>
  );
}
