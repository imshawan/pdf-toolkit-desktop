import { forwardRef, useImperativeHandle, useState, useEffect, useRef } from 'react';
import { Merge, ArrowUp, ArrowDown, X, Loader2, Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { mergePdfs, downloadPdf, selectFolder, downloadMultiplePdfsExact } from '../../lib/pdfUtils';
import toast from 'react-hot-toast';

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
  const [isIframeLoading, setIsIframeLoading] = useState(false);
  const [saveLocation, setSaveLocation] = useState<'original' | 'custom'>('original');
  const [customLocationPath, setCustomLocationPath] = useState<string>('');
  const [outputFilename, setOutputFilename] = useState<string>('merged_document.pdf');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Generate live preview whenever files change
  useEffect(() => {
    let isMounted = true;
    
    const generatePreview = async () => {
      if (files.length === 0) return;
      
      setIsProcessingLocal(true);
      setIsIframeLoading(true);
      onProcessingChange?.(true);
      
      try {
        const merged = await mergePdfs(files);
        
        if (isMounted) {
          setMergedBytes(merged);
          const blob = new Blob([merged as any], { type: 'application/pdf' });
          const url = URL.createObjectURL(blob);
          setPreviewUrl(prev => {
            if (prev) URL.revokeObjectURL(prev);
            return url;
          });
        }
      } catch (err) {
        console.error("Merge preview failed:", err);
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
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [files]);

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
      if (!mergedBytes || files.length === 0) return;
      const originalFile = files[0] as File & { path?: string };
      
      const loadingToast = toast.loading('Saving PDF...');
      
      let finalName = outputFilename.trim();
      if (!finalName.toLowerCase().endsWith('.pdf')) {
        finalName += '.pdf';
      }
      
      let result;
      if (saveLocation === 'custom' && customLocationPath) {
        result = await downloadMultiplePdfsExact([{ bytes: mergedBytes, filename: finalName }], customLocationPath);
      } else {
        result = await downloadPdf(mergedBytes, finalName, originalFile.path || '');
      }
      
      if (result?.success) {
        toast.success('Successfully saved merged PDF!', { id: loadingToast });
      } else if ((result as any)?.canceled) {
        toast.dismiss(loadingToast);
      } else {
        toast.error('Failed to save PDF', { id: loadingToast });
      }
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

  const handleAddFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files).filter(file => file.type === 'application/pdf');
      if (newFiles.length > 0) {
        setFiles([...files, ...newFiles]);
      }
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  if (files.length === 0) return null;

  return (
    <div className="flex flex-row h-full w-full bg-white dark:bg-[#1C1C1E] rounded-2xl border border-black/10 dark:border-white/10 overflow-hidden shadow-sm relative">
      
      {/* Left Pane: Controls */}
      <div className="w-[300px] flex flex-col border-r border-black/5 dark:border-white/5 bg-[#F9F9F9] dark:bg-[#202020] shrink-0">
        <div className="p-4 border-b border-black/5 dark:border-white/5 bg-[#F5F5F7] dark:bg-[#252525]">
          <h2 className="text-[14px] font-semibold text-black dark:text-white flex items-center gap-2">
            <Merge size={16} className="text-blue-500" />
            {t('tools.mergePages', 'Merge PDFs')}
          </h2>
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

        <div className="border-t border-black/5 dark:border-white/5 p-4 shrink-0 bg-[#F5F5F7] dark:bg-[#252525] flex flex-col gap-4">
            <div>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-3 px-4 rounded-xl border border-dashed border-[#0071e3]/30 bg-[#0071e3]/5 hover:bg-[#0071e3]/10 text-[#0071e3] font-medium text-[13px] flex items-center justify-center gap-2 transition-colors"
              >
                <Plus size={16} strokeWidth={2.5} />
                Add more PDFs
              </button>
              <input 
                type="file" 
                multiple 
                accept=".pdf,application/pdf"
                className="hidden" 
                ref={fileInputRef}
                onChange={handleAddFiles}
              />
            </div>
            
            <div>
            <label className="block text-[13px] font-medium text-black/80 dark:text-white/80 mb-2">
              Output Filename
            </label>
            <input
              type="text"
              value={outputFilename}
              onChange={(e) => setOutputFilename(e.target.value)}
              placeholder="merged_document.pdf"
              className="w-full px-3 py-2 bg-white dark:bg-[#1C1C1E] border border-black/10 dark:border-white/10 focus:border-blue-500 focus:ring-blue-500/20 rounded-lg text-[13px] text-black dark:text-white placeholder:text-black/30 dark:placeholder:text-white/30 focus:outline-none focus:ring-4 transition-all"
            />
            </div>

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

      {/* Right Pane: Live Preview */}
      <div className="flex-1 bg-black/5 dark:bg-black/20 p-4 relative">
        {(isProcessingLocal || isIframeLoading) && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/50 dark:bg-black/50 backdrop-blur-sm transition-opacity duration-200">
            <div className="bg-white dark:bg-[#252525] p-5 rounded-2xl shadow-xl flex flex-col items-center gap-3">
              <Loader2 size={28} className="animate-spin text-[#0071e3]" />
              <span className="text-[13px] font-medium text-black/70 dark:text-white/70">Generating preview...</span>
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
            <span className="text-sm text-black/50 dark:text-white/50 animate-pulse">Waiting for files...</span>
          </div>
        )}
      </div>
    </div>
  );
});

MergePdfTool.displayName = 'MergePdfTool';
