import { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { Unlock, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { unlockPdf, selectFolder, downloadMultiplePdfsExact, downloadPdf } from '../../lib/pdfUtils';
import { Button } from '../ui/Button';

export interface UnlockPdfToolRef {
  processAndDownload: () => Promise<void>;
}

interface UnlockPdfToolProps {
  files: File[];
  onProcessingChange?: (isProcessing: boolean) => void;
}

export const UnlockPdfTool = forwardRef<UnlockPdfToolRef, UnlockPdfToolProps>(({ files, onProcessingChange }, ref) => {
  const { t } = useTranslation();
  
  const [currentBytes, setCurrentBytes] = useState<Uint8Array | null>(null);
  const [unlockedBytes, setUnlockedBytes] = useState<Uint8Array | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isPreviewing, setIsPreviewing] = useState(false);

  const [password, setPassword] = useState<string>('');
  const [saveLocation, setSaveLocation] = useState<'original' | 'custom'>('original');
  const [customLocationPath, setCustomLocationPath] = useState<string>('');
  const [outputFilename, setOutputFilename] = useState<string>('');

  // Handle first load
  useEffect(() => {
    let isMounted = true;
    
    const loadFile = async () => {
      try {
        if (files.length > 0) {
          const file = files[0];
          const arrayBuffer = await file.arrayBuffer();
          if (isMounted) {
            setCurrentBytes(new Uint8Array(arrayBuffer));
            setOutputFilename(file.name.replace('.pdf', '') + '_unlocked.pdf');
          }
        }
      } catch (err) {
        console.error("Failed to load PDF:", err);
      }
    };

    loadFile();

    return () => {
      isMounted = false;
    };
  }, [files]);

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value);
    if (unlockedBytes) {
      setUnlockedBytes(null);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
  };

  const handlePreview = async () => {
    if (!currentBytes) return;
    if (!password) {
      toast.error('Please enter a password');
      return;
    }

    setIsPreviewing(true);
    try {
      const finalBytes = await unlockPdf(currentBytes, password);
      setUnlockedBytes(finalBytes);
      const blob = new Blob([finalBytes as any], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(url);
    } catch (err: any) {
      toast.error(err.message || 'Incorrect password or failed to unlock');
      setUnlockedBytes(null);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    } finally {
      setIsPreviewing(false);
    }
  };

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
        
        const finalFilename = outputFilename || originalFile.name.replace('.pdf', '_unlocked.pdf');
        
        // Use cached unlocked bytes if preview was successful, otherwise decrypt now
        const finalBytes = unlockedBytes || await unlockPdf(currentBytes, password);

        let result;
        if (saveLocation === 'custom' && customLocationPath) {
          result = await downloadMultiplePdfsExact([{ bytes: finalBytes, filename: finalFilename }], customLocationPath);
        } else {
          result = await downloadPdf(finalBytes, finalFilename, originalFile.path || '');
        }

        if (result?.success) {
          toast.success(`Saved unlocked PDF to ${saveLocation === 'custom' ? 'custom location' : 'original folder'}`);
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
            <Unlock size={16} className="text-[#0071e3]" />
            Unlock PDF
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
              onChange={handlePasswordChange}
              placeholder="Enter password..."
              className="w-full px-3 py-2 bg-white dark:bg-[#1C1C1E] border border-black/10 dark:border-white/10 focus:border-[#0071e3] focus:ring-[#0071e3]/20 rounded-lg text-[13px] text-black dark:text-white placeholder:text-black/30 dark:placeholder:text-white/30 focus:outline-none focus:ring-4 transition-all"
            />
            <p className="text-[11px] text-black/50 dark:text-white/50 mt-2">
              Enter the current password to unlock the document.
            </p>

            <Button
              variant="secondary"
              onClick={handlePreview}
              disabled={!password || isPreviewing || !!unlockedBytes}
              className="w-full py-2 mt-4 flex items-center justify-center gap-2 border border-black/10 dark:border-white/10 bg-white dark:bg-[#2C2C2E] hover:bg-black/5 dark:hover:bg-white/5 text-black/80 dark:text-white/80 text-[13px] rounded-lg transition-colors"
            >
              {isPreviewing ? <Loader2 size={14} className="animate-spin" /> : <Unlock size={14} />}
              {unlockedBytes ? 'Unlocked' : 'Unlock'}
            </Button>
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
              placeholder="unlocked_document.pdf"
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

      {/* Right Pane: Status */}
      <div className="flex-1 bg-black/5 dark:bg-black/20 p-4 relative flex items-center justify-center">
        {isPreviewing && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/50 dark:bg-black/50 backdrop-blur-sm transition-opacity duration-200">
            <div className="bg-white dark:bg-[#252525] p-5 rounded-2xl shadow-xl flex flex-col items-center gap-3">
              <Loader2 size={28} className="animate-spin text-teal-500" />
              <span className="text-[13px] font-medium text-black/70 dark:text-white/70">{t("tools.unlockingPreview", "Unlocking preview...")}</span>
            </div>
          </div>
        )}

        {previewUrl ? (
          <iframe 
            src={`${previewUrl}#toolbar=0&navpanes=0&scrollbar=0`} 
            className="w-full h-full rounded-xl shadow-md bg-white border border-black/10 dark:border-white/10 transition-opacity duration-300"
          />
        ) : (
          <div className="bg-white dark:bg-[#252525] p-8 rounded-3xl shadow-sm border border-black/5 dark:border-white/5 flex flex-col items-center gap-4 text-center max-w-sm">
            <div className="w-16 h-16 rounded-full bg-teal-500/10 flex items-center justify-center">
              <Unlock size={28} className="text-teal-600 dark:text-teal-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-black dark:text-white mb-1">{t("tools.encryptedPdf", "Encrypted PDF")}</h3>
              <p className="text-[13px] text-black/60 dark:text-white/60">
                This document is protected with a password. Enter the correct password in the left pane to remove the encryption and save an unlocked copy.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
});

UnlockPdfTool.displayName = 'UnlockPdfTool';
