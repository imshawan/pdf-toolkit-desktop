import { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { Lock, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { protectPdf, selectFolder, downloadMultiplePdfsExact, downloadPdf } from '../../lib/pdfUtils';

export interface ProtectPdfToolRef {
  processAndDownload: () => Promise<void>;
}

interface ProtectPdfToolProps {
  files: File[];
  onProcessingChange?: (isProcessing: boolean) => void;
}

export const ProtectPdfTool = forwardRef<ProtectPdfToolRef, ProtectPdfToolProps>(({ files, onProcessingChange }, ref) => {
  const { t } = useTranslation();
  
  const [currentBytes, setCurrentBytes] = useState<Uint8Array | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [password, setPassword] = useState<string>('');
  const [isProcessingLocal, setIsProcessingLocal] = useState(false);
  const [isIframeLoading, setIsIframeLoading] = useState(false);
  const [saveLocation, setSaveLocation] = useState<'original' | 'custom'>('original');
  const [customLocationPath, setCustomLocationPath] = useState<string>('');
  const [outputFilename, setOutputFilename] = useState<string>('');

  // Handle first load
  useEffect(() => {
    let isMounted = true;
    
    if (files.length > 0) {
      const file = files[0];
      const reader = new FileReader();
      
      reader.onload = async (e) => {
        if (e.target?.result && isMounted) {
          const bytes = new Uint8Array(e.target.result as ArrayBuffer);
          setCurrentBytes(bytes);
          setOutputFilename(file.name.replace('.pdf', '') + '_protected.pdf');
        }
      };
      reader.readAsArrayBuffer(file);
    }
    
    return () => {
      isMounted = false;
    };
  }, [files]);

  // Generate live preview (Original PDF)
  useEffect(() => {
    if (!currentBytes) return;
    let isMounted = true;
    
    const generatePreview = async () => {
      setIsProcessingLocal(true);
      setIsIframeLoading(true);
      onProcessingChange?.(true);
      
      try {
        if (isMounted) {
          const blob = new Blob([currentBytes as any], { type: 'application/pdf' });
          const url = URL.createObjectURL(blob);
          setPreviewUrl(prev => {
            if (prev) URL.revokeObjectURL(prev);
            return url;
          });
        }
      } catch (err) {
        console.error("Preview generation failed:", err);
      } finally {
        if (isMounted) {
          setIsProcessingLocal(false);
          onProcessingChange?.(false);
        }
      }
    };
    
    generatePreview();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentBytes]);

  const handleCustomLocation = async () => {
    const folder = await selectFolder();
    if (folder) {
      setCustomLocationPath(folder);
      setSaveLocation('custom');
    } else {
      setSaveLocation('original');
    }
  };

  useImperativeHandle(ref, () => ({
    processAndDownload: async () => {
      if (!currentBytes || files.length === 0) {
        toast.error('No PDF loaded');
        return;
      }
      
      if (!password) {
        toast.error('Please enter a password');
        return;
      }

      try {
        onProcessingChange?.(true);
        const originalFile = files[0];
        
        const finalFilename = outputFilename || originalFile.name.replace('.pdf', '_protected.pdf');
        const finalBytes = await protectPdf(currentBytes, password);

        let result;
        if (saveLocation === 'custom' && customLocationPath) {
          result = await downloadMultiplePdfsExact([{ bytes: finalBytes, filename: finalFilename }], customLocationPath);
        } else {
          result = await downloadPdf(finalBytes, finalFilename, originalFile.path || '');
        }

        if (result?.success) {
          toast.success(`Saved protected PDF to ${saveLocation === 'custom' ? 'custom location' : 'original folder'}`);
        } else if ((result as any)?.canceled) {
          // Do nothing
        } else {
          toast.error('Failed to save file');
        }

      } catch (err: any) {
        console.error('Error during processing:', err);
        toast.error(err.message || 'Failed to process PDF');
      } finally {
        onProcessingChange?.(false);
      }
    }
  }));

  if (!currentBytes) return null;

  return (
    <div className="flex flex-row h-full w-full bg-white dark:bg-[#1C1C1E] rounded-2xl border border-black/10 dark:border-white/10 overflow-hidden shadow-sm relative">
      
      {/* Left Pane: Controls */}
      <div className="w-[300px] flex flex-col border-r border-black/5 dark:border-white/5 bg-[#F9F9F9] dark:bg-[#202020] shrink-0">
        <div className="p-4 border-b border-black/5 dark:border-white/5 bg-[#F5F5F7] dark:bg-[#252525]">
          <h2 className="text-[14px] font-semibold text-black dark:text-white flex items-center gap-2">
            <Lock size={16} className="text-[#0071e3]" />
            Protect PDF
          </h2>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div>
            <label className="block text-[13px] font-medium text-black/80 dark:text-white/80 mb-2">
              {t('common.password', 'Password')}
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password..."
              className="w-full px-3 py-2 bg-white dark:bg-[#1C1C1E] border border-black/10 dark:border-white/10 focus:border-[#0071e3] focus:ring-[#0071e3]/20 rounded-lg text-[13px] text-black dark:text-white placeholder:text-black/30 dark:placeholder:text-white/30 focus:outline-none focus:ring-4 transition-all"
            />
            <p className="text-[11px] text-black/50 dark:text-white/50 mt-2">
              This password will be required to open the document.
            </p>
          </div>
        </div>

        <div className="border-t border-black/5 dark:border-white/5 p-4 shrink-0 bg-[#F5F5F7] dark:bg-[#252525]">
            <label className="block text-[13px] font-medium text-black/80 dark:text-white/80 mb-2">
              Output Filename
            </label>
            <input
              type="text"
              value={outputFilename}
              onChange={(e) => setOutputFilename(e.target.value)}
              placeholder="protected_document.pdf"
              className="w-full px-3 py-2 mb-4 bg-white dark:bg-[#1C1C1E] border border-black/10 dark:border-white/10 focus:border-[#0071e3] focus:ring-[#0071e3]/20 rounded-lg text-[13px] text-black dark:text-white placeholder:text-black/30 dark:placeholder:text-white/30 focus:outline-none focus:ring-4 transition-all"
            />

            <label className="block text-[13px] font-medium text-black/80 dark:text-white/80 mb-3">
              {t('tools.saveLocation', 'Save Location')}
            </label>
            <div className="space-y-3">
              <label className="flex items-center gap-3 cursor-pointer group">
                <input 
                  type="radio" 
                  checked={saveLocation === 'original'} 
                  onChange={() => setSaveLocation('original')}
                  className="w-4 h-4 text-[#0071e3] bg-white border-black/20 focus:ring-[#0071e3]/30"
                />
                <span className="text-[13px] text-black/70 dark:text-white/70 group-hover:text-black dark:group-hover:text-white transition-colors">
                  Save in original directory
                </span>
              </label>
              
              <div>
                <label className="flex items-center gap-3 cursor-pointer group">
                  <input 
                    type="radio" 
                    checked={saveLocation === 'custom'} 
                    onChange={handleCustomLocation}
                    className="w-4 h-4 text-[#0071e3] bg-white border-black/20 focus:ring-[#0071e3]/30"
                  />
                  <span className="text-[13px] text-black/70 dark:text-white/70 group-hover:text-black dark:group-hover:text-white transition-colors">
                    Choose custom location...
                  </span>
                </label>
                {saveLocation === 'custom' && customLocationPath && (
                  <div className="ml-7 mt-1.5 pl-2 border-l-2 border-[#0071e3]/30">
                    <p className="text-[11px] text-black/50 dark:text-white/50 truncate pr-4" title={customLocationPath}>
                      {customLocationPath}
                    </p>
                  </div>
                )}
              </div>
            </div>
        </div>
      </div>

      {/* Right Pane: Live Preview */}
      <div className="flex-1 bg-black/5 dark:bg-black/20 p-4 relative">
        {(isProcessingLocal || isIframeLoading) && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/50 dark:bg-black/50 backdrop-blur-sm transition-opacity duration-200">
            <div className="bg-white dark:bg-[#252525] p-5 rounded-2xl shadow-xl flex flex-col items-center gap-3">
              <Loader2 size={28} className="animate-spin text-[#0071e3]" />
              <span className="text-[13px] font-medium text-black/70 dark:text-white/70">{t("tools.loadingPreview", "Loading preview...")}</span>
            </div>
          </div>
        )}
        
        {previewUrl ? (
          <iframe 
            src={`${previewUrl}#toolbar=0&navpanes=0&scrollbar=0`} 
            className={`w-full h-full rounded-xl shadow-md bg-white border border-black/10 dark:border-white/10 transition-opacity duration-300 ${isIframeLoading ? 'opacity-0' : 'opacity-100'}`} 
            onLoad={() => setTimeout(() => setIsIframeLoading(false), 1500)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-sm text-black/50 dark:text-white/50 animate-pulse">{t("tools.loadingPreview", "Loading preview...")}</span>
          </div>
        )}
      </div>
    </div>
  );
});

ProtectPdfTool.displayName = 'ProtectPdfTool';
