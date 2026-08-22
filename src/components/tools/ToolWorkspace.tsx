import { useState, useRef, useEffect } from 'react';
import { ChevronLeft, Trash2, Settings, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useApp } from '@/hooks/useApp';
import { motion, AnimatePresence } from 'framer-motion';
import { DropZone } from '../ui/DropZone';
import { Button } from '../ui/Button';
import { RotatePdfTool, RotatePdfToolRef } from './RotatePdfTool';
import { MergePdfTool, MergePdfToolRef } from './MergePdfTool';
import { SplitPdfTool, SplitPdfToolRef } from './SplitPdfTool';
import { RearrangePdfTool, RearrangePdfToolRef } from './RearrangePdfTool';
import { ImageToPdfTool, ImageToPdfToolRef } from './ImageToPdfTool';
import { XlsToPdfTool, XlsToPdfToolRef } from './XlsToPdfTool';
import { ProtectPdfTool, ProtectPdfToolRef } from './ProtectPdfTool';
import { UnlockPdfTool, UnlockPdfToolRef } from './UnlockPdfTool';
import { HtmlToPdfTool, HtmlToPdfToolRef } from './HtmlToPdfTool';
import { PdfToImageTool, PdfToImageToolRef } from './PdfToImageTool';

import { SignPdfTool, SignPdfToolRef } from './SignPdfTool';
import { WatermarkPdfTool, WatermarkPdfToolRef } from './WatermarkPdfTool';

interface ToolWorkspaceProps {
  toolId: string;
  onBack: () => void;
}

export function ToolWorkspace({ toolId, onBack }: ToolWorkspaceProps) {
  const { t } = useTranslation();
  const { setSidebarHidden } = useApp();
  const [files, setFiles] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  // Sync sidebar visibility with file selection
  useEffect(() => {
    // html2pdf can operate without files directly via URL mode, so we might want fullscreen for it instantly.
    // However, hiding sidebar immediately on tool click might be jarring. We'll only hide if files are uploaded.
    if (files.length > 0) {
      setSidebarHidden(true);
    } else {
      setSidebarHidden(false);
    }
    
    // Cleanup on unmount (e.g. going back to Dashboard)
    return () => {
      setSidebarHidden(false);
    };
  }, [files.length, toolId, setSidebarHidden]);

  
  const rotateToolRef = useRef<RotatePdfToolRef>(null);
  const mergeToolRef = useRef<MergePdfToolRef>(null);
  const splitToolRef = useRef<SplitPdfToolRef>(null);
  const rearrangeToolRef = useRef<RearrangePdfToolRef>(null);
  const img2pdfToolRef = useRef<ImageToPdfToolRef>(null);
  const xls2pdfToolRef = useRef<XlsToPdfToolRef>(null);
  const protectToolRef = useRef<ProtectPdfToolRef>(null);
  const unlockToolRef = useRef<UnlockPdfToolRef>(null);
  const html2pdfToolRef = useRef<HtmlToPdfToolRef>(null);
  const pdf2imgToolRef = useRef<PdfToImageToolRef>(null);
  const signToolRef = useRef<SignPdfToolRef>(null);
  const watermarkToolRef = useRef<WatermarkPdfToolRef>(null);

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
    } else if (toolId === 'rearrange' && rearrangeToolRef.current) {
      rearrangeToolRef.current.processAndDownload();
    } else if (toolId === 'img2pdf' && img2pdfToolRef.current) {
      img2pdfToolRef.current.processAndDownload();
    } else if (toolId === 'xls2pdf' && xls2pdfToolRef.current) {
      xls2pdfToolRef.current.processAndDownload();
    } else if (toolId === 'protect' && protectToolRef.current) {
      protectToolRef.current.processAndDownload();
    } else if (toolId === 'unlock' && unlockToolRef.current) {
      unlockToolRef.current.processAndDownload();
    } else if (toolId === 'html2pdf' && html2pdfToolRef.current) {
      html2pdfToolRef.current.processAndDownload();
    } else if (toolId === 'pdf2img' && pdf2imgToolRef.current) {
      pdf2imgToolRef.current.processAndDownload();
    } else if (toolId === 'sign' && signToolRef.current) {
      signToolRef.current.processAndDownload();
    } else if (toolId === 'watermark' && watermarkToolRef.current) {
      watermarkToolRef.current.processAndDownload();
    }
  };

  const titles: Record<string, string> = {
    merge: t('tools.merge', 'Merge PDF'),
    split: t('tools.split', 'Split PDF'),
    rotate: t('tools.rotate', 'Rotate PDF'),
    img2pdf: t('tools.img2pdf', 'Image to PDF'),
    xls2pdf: t('tools.xls2pdf', 'Excel to PDF'),
    rearrange: t('tools.rearrange', 'Rearrange Pages'),
    protect: t('tools.protect', 'Protect PDF'),
    unlock: t('tools.unlock', 'Unlock PDF'),
    html2pdf: t('tools.html2pdf', 'HTML to PDF'),
    pdf2img: t('tools.pdf2img', 'PDF to Image'),
    sign: t('tools.sign', 'Sign PDF'),
    watermark: t('tools.watermark', 'Watermark PDF'),
  };

  // Determine if the action buttons should be visible
  // For html2pdf, it can be valid without files (URL mode)
  const showActionButtons = files.length > 0 || toolId === 'html2pdf';

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
          {showActionButtons && (
            <>
              {files.length > 0 && (
                <Button variant="secondary" onClick={handleClear} disabled={isProcessing}
                  className="w-48 py-2 !bg-black/5 dark:!bg-white/5 hover:!bg-red-500/10 hover:!text-red-500 !border-transparent text-black/60 dark:text-white/60"
                >
                  <Trash2 size={14} />
                  {t('common.clearAll', 'Clear All')}
                </Button>
              )}
              <Button variant="primary" onClick={handleProcess} disabled={isProcessing}
                className="w-48 py-2"
              >
                {isProcessing ? <Loader2 size={14} className="animate-spin" /> : <Settings size={14} />}
                {t('common.processDownload', 'Process & Download')}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Main Workspace Area */}
      <div className="flex-1 p-6 overflow-hidden flex flex-col">
        <AnimatePresence mode="wait">
          {files.length === 0 && toolId !== 'html2pdf' ? (
            <motion.div 
              key="dropzone"
              initial={{ opacity: 0, scale: 0.98, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: -10 }}
              transition={{ duration: 0.2 }}
              className="flex-1 flex flex-col mt-4 max-w-4xl mx-auto w-full"
            >
            <DropZone 
              onFilesDrop={handleFilesDrop} 
              accept={toolId === 'img2pdf' ? 'image/*' : toolId === 'xls2pdf' ? '.xls,.xlsx' : '.pdf'} 
              multiple={toolId === 'merge' || toolId === 'img2pdf'}
            />
            </motion.div>
          ) : (
            <motion.div 
              key="toolcontent"
              initial={{ opacity: 0, scale: 0.98, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: -10 }}
              transition={{ duration: 0.2 }}
              className="flex-1 rounded-2xl border border-black/5 dark:border-white/5 p-1 overflow-hidden flex flex-col"
            >
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
            ) : toolId === 'rearrange' ? (
              <RearrangePdfTool 
                ref={rearrangeToolRef} 
                files={files} 
                onProcessingChange={setIsProcessing} 
              />
            ) : toolId === 'img2pdf' ? (
              <ImageToPdfTool 
                ref={img2pdfToolRef} 
                files={files} 
                setFiles={setFiles}
                onProcessingChange={setIsProcessing} 
              />
            ) : toolId === 'xls2pdf' ? (
              <XlsToPdfTool
                ref={xls2pdfToolRef}
                files={files}
                setFiles={setFiles}
                onProcessingChange={setIsProcessing}
              />
            ) : toolId === 'protect' ? (
              <ProtectPdfTool
                ref={protectToolRef}
                files={files}
                onProcessingChange={setIsProcessing}
              />
            ) : toolId === 'unlock' ? (
              <UnlockPdfTool
                ref={unlockToolRef}
                files={files}
                onProcessingChange={setIsProcessing}
              />
            ) : toolId === 'html2pdf' ? (
              <HtmlToPdfTool
                ref={html2pdfToolRef}
                files={files}
                setFiles={setFiles}
                onProcessingChange={setIsProcessing}
              />
            ) : toolId === 'pdf2img' ? (
              <PdfToImageTool
                ref={pdf2imgToolRef}
                files={files}
                setFiles={setFiles}
                onProcessingChange={setIsProcessing}
              />
            ) : toolId === 'sign' ? (
              <SignPdfTool
                ref={signToolRef}
                files={files}
                onProcessingChange={setIsProcessing}
              />
            ) : toolId === 'watermark' ? (
              <WatermarkPdfTool
                ref={watermarkToolRef}
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
          </motion.div>
        )}
        </AnimatePresence>
      </div>
    </div>
  );
}
