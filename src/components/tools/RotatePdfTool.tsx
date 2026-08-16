import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { RotateCcw, RotateCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '../ui/Button';
import { rotatePdfGlobal, downloadPdf } from '../../lib/pdfUtils';

export interface RotatePdfToolRef {
  processAndDownload: () => void;
}

interface RotatePdfToolProps {
  files: File[];
  onProcessingChange?: (isProcessing: boolean) => void;
}

export const RotatePdfTool = forwardRef<RotatePdfToolRef, RotatePdfToolProps>(({ files, onProcessingChange }, ref) => {
  const { t } = useTranslation();
  
  // State
  const [currentBytes, setCurrentBytes] = useState<Uint8Array | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isProcessingLocal, setIsProcessingLocal] = useState(false);

  // Initialize: Read the first file when dropped
  useEffect(() => {
    if (files.length > 0) {
      const file = files[0];
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          const bytes = new Uint8Array(e.target.result as ArrayBuffer);
          setCurrentBytes(bytes);
          updatePreview(bytes);
        }
      };
      reader.readAsArrayBuffer(file);
    }
    
    return () => {
      // Cleanup preview URL on unmount
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [files]);

  const updatePreview = (bytes: Uint8Array) => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    const blob = new Blob([bytes as any], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    setPreviewUrl(url);
  };

  const handleRotate = async (degrees: number) => {
    if (!currentBytes) return;
    
    setIsProcessingLocal(true);
    onProcessingChange?.(true);
    
    try {
      // Small timeout to allow UI to update loading state if needed
      await new Promise(r => setTimeout(r, 50));
      const newBytes = await rotatePdfGlobal(currentBytes, degrees);
      setCurrentBytes(newBytes);
      updatePreview(newBytes);
    } catch (error) {
      console.error("Failed to rotate PDF:", error);
    } finally {
      setIsProcessingLocal(false);
      onProcessingChange?.(false);
    }
  };

  useImperativeHandle(ref, () => ({
    processAndDownload: () => {
      if (!currentBytes || files.length === 0) return;
      const originalName = files[0].name;
      const newName = originalName.replace('.pdf', '_rotated.pdf');
      downloadPdf(currentBytes, newName);
    }
  }));

  if (files.length === 0) return null;

  return (
    <div className="flex flex-col h-full w-full bg-white dark:bg-[#1C1C1E] rounded-2xl border border-black/10 dark:border-white/10 overflow-hidden shadow-sm relative">
      
      {/* Toolbar */}
      <div className="flex items-center justify-center gap-4 p-3 border-b border-black/5 dark:border-white/5 bg-[#F5F5F7] dark:bg-[#252525]">
        <Button 
          variant="secondary" 
          onClick={() => handleRotate(-90)} 
          disabled={isProcessingLocal || !currentBytes}
          className="bg-white dark:bg-[#1E1E1E]"
        >
          <RotateCcw size={16} />
          {t('tools.rotateLeft', 'Rotate Left')}
        </Button>
        <Button 
          variant="secondary" 
          onClick={() => handleRotate(90)} 
          disabled={isProcessingLocal || !currentBytes}
          className="bg-white dark:bg-[#1E1E1E]"
        >
          <RotateCw size={16} />
          {t('tools.rotateRight', 'Rotate Right')}
        </Button>
      </div>

      {/* Live Preview Area */}
      <div className="flex-1 bg-black/5 dark:bg-black/20 p-4 relative">
        {isProcessingLocal && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/50 dark:bg-black/50 backdrop-blur-sm">
            <span className="text-sm font-medium animate-pulse">Processing...</span>
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

RotatePdfTool.displayName = 'RotatePdfTool';
