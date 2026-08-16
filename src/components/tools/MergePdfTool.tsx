import React, { forwardRef, useImperativeHandle, useState, useEffect } from 'react';
import { ArrowUp, ArrowDown, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { mergePdfs, downloadPdf } from '../../lib/pdfUtils';

export interface MergePdfToolRef {
  processAndDownload: () => void;
}

interface MergePdfToolProps {
  files: File[];
  setFiles: (files: File[]) => void;
  onProcessingChange?: (isProcessing: boolean) => void;
}

export const MergePdfTool = forwardRef<MergePdfToolRef, MergePdfToolProps>(({ files, setFiles, onProcessingChange }, ref) => {
  const { t } = useTranslation();
  const [mergedBytes, setMergedBytes] = useState<Uint8Array | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isProcessingLocal, setIsProcessingLocal] = useState(false);

  // Generate live preview whenever files change
  useEffect(() => {
    let isMounted = true;
    
    const generatePreview = async () => {
      if (files.length === 0) return;
      
      setIsProcessingLocal(true);
      onProcessingChange?.(true);
      
      try {
        const bytes = await mergePdfs(files);
        if (isMounted) {
          setMergedBytes(bytes);
          const blob = new Blob([bytes as any], { type: 'application/pdf' });
          const url = URL.createObjectURL(blob);
          
          setPreviewUrl(prev => {
            if (prev) URL.revokeObjectURL(prev);
            return url;
          });
        }
      } catch (error) {
        console.error("Failed to generate merge preview:", error);
      } finally {
        if (isMounted) {
          setIsProcessingLocal(false);
          onProcessingChange?.(false);
        }
      }
    };

    generatePreview();

    return () => {
      isMounted = false;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [files]);

  // Cleanup preview URL on unmount
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  useImperativeHandle(ref, () => ({
    processAndDownload: () => {
      if (!mergedBytes || files.length === 0) return;
      downloadPdf(mergedBytes, 'merged_document.pdf');
    }
  }));

  const moveFile = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= files.length) return;
    
    const newFiles = [...files];
    const temp = newFiles[index];
    newFiles[index] = newFiles[newIndex];
    newFiles[newIndex] = temp;
    setFiles(newFiles);
  };

  const removeFile = (index: number) => {
    const newFiles = [...files];
    newFiles.splice(index, 1);
    setFiles(newFiles);
  };

  if (files.length === 0) return null;

  return (
    <div className="flex flex-row h-full w-full bg-white dark:bg-[#1C1C1E] rounded-2xl border border-black/10 dark:border-white/10 overflow-hidden shadow-sm relative">
      
      {/* Left Pane: Files List */}
      <div className="w-[300px] flex flex-col border-r border-black/5 dark:border-white/5 bg-[#F9F9F9] dark:bg-[#202020] shrink-0">
        <div className="p-4 border-b border-black/5 dark:border-white/5 bg-[#F5F5F7] dark:bg-[#252525]">
          <p className="text-[13px] text-black/70 dark:text-white/70 font-medium">
            {t('tools.mergeInstruction', 'Arrange files in the desired order.')}
          </p>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {files.map((file, index) => (
            <div key={`${file.name}-${index}`} className="bg-white dark:bg-[#252525] rounded-xl shadow-sm border border-black/10 dark:border-white/10 p-3 flex flex-row items-center gap-3 relative group transition-transform hover:-translate-y-[1px]">
              
              {/* Order Badge */}
              <div className="flex items-center justify-center w-6 h-6 rounded-full bg-black/5 dark:bg-white/10 text-[11px] font-bold text-black/60 dark:text-white/60 shrink-0">
                {index + 1}
              </div>

              {/* File Info */}
              <div className="flex-1 min-w-0 flex flex-col justify-center">
                <p className="text-[13px] font-semibold text-black dark:text-white truncate" title={file.name}>
                  {file.name}
                </p>
                <p className="text-[11px] text-black/50 dark:text-white/50 mt-0.5">
                  {(file.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>

              {/* Controls */}
              <div className="flex flex-col gap-1 shrink-0">
                <button 
                  onClick={() => moveFile(index, 'up')}
                  disabled={index === 0}
                  className="p-1 rounded bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-black/5 dark:disabled:hover:bg-white/5 text-black/70 dark:text-white/70 transition-colors"
                  title={t('common.moveUp', 'Move Up')}
                >
                  <ArrowUp size={14} />
                </button>
                <button 
                  onClick={() => moveFile(index, 'down')}
                  disabled={index === files.length - 1}
                  className="p-1 rounded bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-black/5 dark:disabled:hover:bg-white/5 text-black/70 dark:text-white/70 transition-colors"
                  title={t('common.moveDown', 'Move Down')}
                >
                  <ArrowDown size={14} />
                </button>
              </div>

              {/* Remove Button */}
              <button 
                onClick={() => removeFile(index)}
                className="absolute -top-2 -left-2 bg-red-500 text-white rounded-full p-1 shadow-md opacity-0 group-hover:opacity-100 transition-opacity focus:outline-none"
                title={t('common.remove', 'Remove')}
              >
                <X size={12} strokeWidth={2.5} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Right Pane: Live Preview */}
      <div className="flex-1 bg-black/5 dark:bg-black/20 p-4 relative">
        {isProcessingLocal && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/50 dark:bg-black/50 backdrop-blur-sm">
            <span className="text-sm font-medium animate-pulse">Generating preview...</span>
          </div>
        )}
        
        {previewUrl ? (
          <embed 
            src={`${previewUrl}#toolbar=0&navpanes=0&scrollbar=0`} 
            type="application/pdf" 
            className="w-full h-full rounded-xl shadow-md bg-white border border-black/10 dark:border-white/10" 
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-sm text-black/50 dark:text-white/50 animate-pulse">Loading preview...</span>
          </div>
        )}
      </div>
    </div>
  );
});

MergePdfTool.displayName = 'MergePdfTool';
