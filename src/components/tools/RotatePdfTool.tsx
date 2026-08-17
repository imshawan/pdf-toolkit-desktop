import { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { RotateCcw, RotateCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { Button } from '../ui/Button';
import { rotatePdfGlobal, downloadPdf, selectFolder, downloadMultiplePdfsExact } from '../../lib/pdfUtils';

export interface RotatePdfToolRef {
  processAndDownload: () => Promise<void>;
}

interface RotatePdfToolProps {
  files: File[];
  onProcessingChange?: (isProcessing: boolean) => void;
}

export const RotatePdfTool = forwardRef<RotatePdfToolRef, RotatePdfToolProps>(({ files, onProcessingChange }, ref) => {
  const { t } = useTranslation();
  
  const [currentBytes, setCurrentBytes] = useState<Uint8Array | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [rotationDegrees, setRotationDegrees] = useState<number>(0);
  const [isProcessingLocal, setIsProcessingLocal] = useState(false);
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
          setOutputFilename(file.name.replace('.pdf', '') + '_rotated.pdf');
        }
      };
      reader.readAsArrayBuffer(file);
    }
    
    return () => {
      isMounted = false;
    };
  }, [files]);

  // Generate live preview when files or rotation changes
  useEffect(() => {
    if (!currentBytes) return;
    let isMounted = true;
    
    const generatePreview = async () => {
      setIsProcessingLocal(true);
      onProcessingChange?.(true);
      
      try {
        let displayBytes = currentBytes;
        
        if (rotationDegrees !== 0) {
          displayBytes = await rotatePdfGlobal(currentBytes, rotationDegrees);
        }
        
        if (isMounted) {
          const blob = new Blob([displayBytes as any], { type: 'application/pdf' });
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
  }, [currentBytes, rotationDegrees]);

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
      if (!currentBytes || files.length === 0) return;
      const originalFile = files[0] as File & { path?: string };
      
      let finalName = outputFilename.trim();
      if (!finalName) {
        finalName = originalFile.name.replace('.pdf', '') + '_rotated.pdf';
      } else if (!finalName.toLowerCase().endsWith('.pdf')) {
        finalName += '.pdf';
      }
      
      const loadingToast = toast.loading(t('tools.saving', 'Saving...'));
      try {
        let finalBytes = currentBytes;
        if (rotationDegrees !== 0) {
          finalBytes = await rotatePdfGlobal(currentBytes, rotationDegrees);
        }
        
        let result;
        if (saveLocation === 'custom' && customLocationPath) {
          result = await downloadMultiplePdfsExact([{ bytes: finalBytes, filename: finalName }], customLocationPath);
        } else {
          result = await downloadPdf(finalBytes, finalName, originalFile.path || '');
        }
        
        if (result?.success) {
          toast.success(t('tools.savedSuccessfully', 'Saved successfully!'), { id: loadingToast });
        } else if ((result as any)?.canceled) {
          toast.dismiss(loadingToast);
        } else {
          toast.error(t('tools.saveFailed', 'Failed to save'), { id: loadingToast });
        }
      } catch (error) {
        toast.error(t('tools.saveFailed', 'Failed to save'), { id: loadingToast });
      }
    }
  }));

  if (files.length === 0) return null;

  return (
    <div className="flex flex-row h-full w-full bg-white dark:bg-[#1C1C1E] rounded-2xl border border-black/10 dark:border-white/10 overflow-hidden shadow-sm relative">
      
      {/* Left Pane: Controls */}
      <div className="w-[300px] flex flex-col border-r border-black/5 dark:border-white/5 bg-[#F9F9F9] dark:bg-[#202020] shrink-0">
        <div className="p-4 border-b border-black/5 dark:border-white/5 bg-[#F5F5F7] dark:bg-[#252525]">
          <h2 className="text-[14px] font-semibold text-black dark:text-white flex items-center gap-2">
            <RotateCw size={16} className="text-blue-500" />
            {t('tools.rotatePages', 'Rotate Pages')}
          </h2>
        </div>
        
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          <div>
            <label className="block text-[13px] font-medium text-black/80 dark:text-white/80 mb-3">
              {t('tools.rotationDirection', 'Rotation Direction')}
            </label>
            <div className="flex gap-3">
              <Button 
                variant="secondary" 
                className="flex-1 py-4 flex flex-col gap-2 items-center justify-center bg-white dark:bg-[#2C2C2E] border-black/10 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200"
                onClick={() => setRotationDegrees(prev => (prev - 90) % 360)}
              >
                <RotateCcw size={20} />
                <span className="text-[12px]">{t('tools.left', 'Left')}</span>
              </Button>
              <Button 
                variant="secondary" 
                className="flex-1 py-4 flex flex-col gap-2 items-center justify-center bg-white dark:bg-[#2C2C2E] border-black/10 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200"
                onClick={() => setRotationDegrees(prev => (prev + 90) % 360)}
              >
                <RotateCw size={20} />
                <span className="text-[12px]">{t('tools.right', 'Right')}</span>
              </Button>
            </div>
            {rotationDegrees !== 0 && (
              <p className="text-[12px] text-blue-600 dark:text-blue-400 mt-3 text-center font-medium">
                Total Rotation: {((rotationDegrees % 360) + 360) % 360}&deg;
              </p>
            )}
          </div>
          
          <div className="border-t border-black/5 dark:border-white/5 pt-4">
            <label className="block text-[13px] font-medium text-black/80 dark:text-white/80 mb-2">
              Output Filename
            </label>
            <input
              type="text"
              value={outputFilename}
              onChange={(e) => setOutputFilename(e.target.value)}
              placeholder="document_rotated.pdf"
              className="w-full px-3 py-2 mb-4 bg-white dark:bg-[#1C1C1E] border border-black/10 dark:border-white/10 focus:border-blue-500 focus:ring-blue-500/20 rounded-lg text-[13px] text-black dark:text-white placeholder:text-black/30 dark:placeholder:text-white/30 focus:outline-none focus:ring-4 transition-all"
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
                  className="w-4 h-4 text-blue-500 bg-white border-black/20 focus:ring-blue-500/30"
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
                    className="w-4 h-4 text-blue-500 bg-white border-black/20 focus:ring-blue-500/30"
                  />
                  <span className="text-[13px] text-black/70 dark:text-white/70 group-hover:text-black dark:group-hover:text-white transition-colors">
                    Choose custom location...
                  </span>
                </label>
                {saveLocation === 'custom' && customLocationPath && (
                  <div className="ml-7 mt-1.5 pl-2 border-l-2 border-blue-500/30">
                    <p className="text-[11px] text-black/50 dark:text-white/50 truncate pr-4" title={customLocationPath}>
                      {customLocationPath}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
          
        </div>
      </div>

      {/* Right Pane: Live Preview */}
      <div className="flex-1 bg-black/5 dark:bg-black/20 p-4 relative">
        {isProcessingLocal && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/50 dark:bg-black/50 backdrop-blur-sm">
            <span className="text-sm font-medium animate-pulse">Rotating preview...</span>
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
            <span className="text-sm text-black/50 dark:text-white/50 animate-pulse">Loading document...</span>
          </div>
        )}
      </div>
    </div>
  );
});

RotatePdfTool.displayName = 'RotatePdfTool';
