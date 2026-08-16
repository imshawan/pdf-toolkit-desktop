import React, { useState, useRef } from 'react';
import { ChevronLeft, Trash2, Settings, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { DropZone } from '../ui/DropZone';
import { Button } from '../ui/Button';
import { RotatePdfTool, RotatePdfToolRef } from './RotatePdfTool';
import { MergePdfTool, MergePdfToolRef } from './MergePdfTool';
import { SplitPdfTool, SplitPdfToolRef } from './SplitPdfTool';

interface ToolWorkspaceProps {
  toolId: string;
  onBack: () => void;
}

export function ToolWorkspace({ toolId, onBack }: ToolWorkspaceProps) {
  const { t } = useTranslation();
  const [files, setFiles] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const rotateToolRef = useRef<RotatePdfToolRef>(null);
  const mergeToolRef = useRef<MergePdfToolRef>(null);
  const splitToolRef = useRef<SplitPdfToolRef>(null);

  const handleFilesDrop = (droppedFiles: File[]) => {
    // If tool doesn't support multiple files, replace instead of append
    if (toolId !== 'merge' && toolId !== 'img2pdf' && files.length > 0) {
      setFiles([droppedFiles[0]]);
    } else {
      setFiles(prev => [...prev, ...droppedFiles]);
    }
  };

  const handleClear = () => {
    setFiles([]);
  };

  const handleProcess = () => {
    if (toolId === 'rotate' && rotateToolRef.current) {
      rotateToolRef.current.processAndDownload();
    } else if (toolId === 'merge' && mergeToolRef.current) {
      mergeToolRef.current.processAndDownload();
    } else if (toolId === 'split' && splitToolRef.current) {
      splitToolRef.current.processAndDownload();
    }
  };

  const titles: Record<string, string> = {
    merge: t('tools.merge'),
    split: t('tools.split'),
    rotate: t('tools.rotate'),
    img2pdf: t('tools.img2pdf'),
    xls2pdf: t('tools.xls2pdf'),
    rearrange: t('tools.rearrange'),
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header with Back button */}
      <div className="flex items-center justify-between p-6 pb-2">
        <div className="flex items-center gap-4">
          <button 
            onClick={onBack}
            className="flex items-center justify-center w-8 h-8 rounded-full bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 transition-colors focus:outline-none"
          >
            <ChevronLeft size={18} className="text-black/70 dark:text-white/70" />
          </button>
          <div>
            <h1 className="text-[24px] font-bold tracking-tight text-black dark:text-white leading-tight">
              {titles[toolId] || toolId}
            </h1>
            <p className="text-[13px] text-black/50 dark:text-white/50">
              {files.length} file(s) selected
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {files.length > 0 && (
            <>
              <Button variant="secondary" onClick={handleClear} disabled={isProcessing}>
                <Trash2 size={14} />
                {t('common.clearAll')}
              </Button>
              <Button variant="primary" onClick={handleProcess} disabled={isProcessing}>
                {isProcessing ? <Loader2 size={14} className="animate-spin" /> : <Settings size={14} />}
                {t('common.processDownload')}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Main Workspace Area */}
      <div className="flex-1 p-6 overflow-hidden flex flex-col">
        {files.length === 0 ? (
          <div className="flex-1 flex flex-col mt-4 max-w-4xl mx-auto w-full">
            <DropZone 
              onFilesDrop={handleFilesDrop} 
              accept={toolId === 'img2pdf' ? 'image/*' : toolId === 'xls2pdf' ? '.xls,.xlsx' : '.pdf'} 
              multiple={toolId === 'merge' || toolId === 'img2pdf'}
            />
          </div>
        ) : (
          <div className="flex-1 rounded-2xl border border-black/5 dark:border-white/5 p-1 overflow-hidden flex flex-col">
            {toolId === 'rotate' ? (
              <RotatePdfTool 
                ref={rotateToolRef} 
                files={files} 
                onProcessingChange={setIsProcessing} 
              />
            ) : toolId === 'merge' ? (
              <MergePdfTool 
                ref={mergeToolRef} 
                files={files} 
                setFiles={setFiles}
                onProcessingChange={setIsProcessing} 
              />
            ) : toolId === 'split' ? (
              <SplitPdfTool 
                ref={splitToolRef} 
                files={files} 
                onProcessingChange={setIsProcessing} 
              />
            ) : (
              /* Temporary Placeholder for other File Previews */
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-5 bg-black/[0.02] dark:bg-white/[0.02] rounded-xl h-full overflow-auto">
                {files.map((f, i) => (
                  <div key={i} className="bg-white dark:bg-[#252525] p-4 rounded-xl shadow-sm border border-black/5 dark:border-white/5 flex flex-col items-center text-center h-fit">
                    <div className="w-16 h-20 bg-black/5 dark:bg-white/5 rounded-lg mb-3 flex items-center justify-center">
                      <span className="text-[11px] text-black/40 dark:text-white/40">Preview</span>
                    </div>
                    <span className="text-[13px] font-medium truncate w-full" title={f.name}>{f.name}</span>
                    <span className="text-[11px] text-black/50 dark:text-white/50 mt-1">{(f.size / 1024 / 1024).toFixed(2)} MB</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
