import React, { forwardRef, useImperativeHandle, useState, useEffect, useRef } from 'react';
import { Scissors } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { PDFDocument } from 'pdf-lib';
import { splitPdf, downloadMultiplePdfs, selectFolder, downloadMultiplePdfsExact } from '../../lib/pdfUtils';
import toast from 'react-hot-toast';

export interface SplitPdfToolRef {
  processAndDownload: () => void;
}

interface SplitPdfToolProps {
  files: File[];
  onProcessingChange?: (isProcessing: boolean) => void;
}

function parsePageRangesMulti(input: string, maxPages: number): number[][] {
  if (!input.trim()) return Array.from({ length: maxPages }, (_, i) => [i]);
  const parts = input.split(',');
  const results: number[][] = [];
  
  for (const part of parts) {
    const range = part.trim().split('-');
    const indices: number[] = [];
    if (range.length === 1) {
      const page = parseInt(range[0], 10);
      if (!isNaN(page) && page > 0 && page <= maxPages) {
        indices.push(page - 1);
      }
    } else if (range.length === 2) {
      let start = parseInt(range[0], 10);
      let end = parseInt(range[1], 10);
      if (!isNaN(start) && !isNaN(end)) {
        start = Math.max(1, start);
        end = Math.min(maxPages, end);
        if (start <= end) {
          for (let i = start; i <= end; i++) {
            indices.push(i - 1);
          }
        }
      }
    }
    if (indices.length > 0) results.push(indices);
  }
  
  return results;
}

export const SplitPdfTool = forwardRef<SplitPdfToolRef, SplitPdfToolProps>(({ files, onProcessingChange }, ref) => {
  const { t } = useTranslation();
  
  const [originalBytes, setOriginalBytes] = useState<Uint8Array | null>(null);
  const [extractedPdfs, setExtractedPdfs] = useState<Uint8Array[]>([]);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [pageCount, setPageCount] = useState<number>(0);
  const [rangeInput, setRangeInput] = useState<string>('');
  const [isProcessingLocal, setIsProcessingLocal] = useState(false);
  const [saveLocation, setSaveLocation] = useState<'original' | 'custom'>('original');
  const [customLocationPath, setCustomLocationPath] = useState<string>('');
  const [saveInNewFolder, setSaveInNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [outputPrefix, setOutputPrefix] = useState('');

  // Debounce timer for parsing input
  const typingTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize: Read the first file when dropped
  useEffect(() => {
    let isMounted = true;
    
    if (files.length > 0) {
      const file = files[0];
      const reader = new FileReader();
      
      reader.onload = async (e) => {
        if (e.target?.result && isMounted) {
          const bytes = new Uint8Array(e.target.result as ArrayBuffer);
          setOriginalBytes(bytes);
          setExtractedPdfs([bytes]);
          
          try {
            const pdfDoc = await PDFDocument.load(bytes, { ignoreEncryption: true });
            if (isMounted) {
              setPageCount(pdfDoc.getPageCount());
            }
          } catch (err) {
            console.error("Failed to parse PDF for page count:", err);
          }
          
          if (isMounted) {
            const blob = new Blob([bytes as any], { type: 'application/pdf' });
            const url = URL.createObjectURL(blob);
            setPreviewUrl(url);
          }
        }
      };
      reader.readAsArrayBuffer(file);
      
      const baseName = file.name.replace('.pdf', '');
      setNewFolderName(baseName + '_split');
      setOutputPrefix(baseName);
    }
    
    return () => {
      isMounted = false;
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [files]);

  // Handle Input Changes with Debounce
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setRangeInput(val);
    
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    
    typingTimerRef.current = setTimeout(() => {
      generatePreview(val);
    }, 500); // 500ms debounce
  };

  const generatePreview = async (input: string) => {
    if (!originalBytes || pageCount === 0) return;
    
    setIsProcessingLocal(true);
    onProcessingChange?.(true);
    
    try {
      const ranges = parsePageRangesMulti(input, pageCount);
      
      if (ranges.length === 0) {
        // If empty or invalid, show the original
        setExtractedPdfs([originalBytes]);
        const blob = new Blob([originalBytes as any], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        setPreviewUrl(prev => {
          if (prev) URL.revokeObjectURL(prev);
          return url;
        });
      } else {
        const newBytesArr = await splitPdf(originalBytes, ranges);
        setExtractedPdfs(newBytesArr);
        const blob = new Blob([newBytesArr[0] as any], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        setPreviewUrl(prev => {
          if (prev) URL.revokeObjectURL(prev);
          return url;
        });
      }
    } catch (error) {
      console.error("Failed to extract pages:", error);
    } finally {
      setIsProcessingLocal(false);
      onProcessingChange?.(false);
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
      if (!originalBytes || files.length === 0) return;
      const originalFile = files[0] as File & { path?: string };
      
      const loadingToast = toast.loading('Processing & Saving PDFs...');
      
      try {
        const ranges = parsePageRangesMulti(rangeInput, pageCount);
        const pdfsToSave = await splitPdf(originalBytes, ranges);
        
        let prefix = outputPrefix.trim();
        if (!prefix) {
          prefix = originalFile.name.replace('.pdf', '');
        }
        
        const payload = pdfsToSave.map((bytes, idx) => {
          let suggestedName = `${prefix}_part${idx + 1}.pdf`;
          if (pdfsToSave.length === 1) {
            suggestedName = `${prefix}_split.pdf`;
          }
          return { bytes, filename: suggestedName };
        });
        
        const folderNameParam = saveInNewFolder && newFolderName.trim() ? newFolderName.trim() : undefined;
        let result;
        
        if (saveLocation === 'custom' && customLocationPath) {
          result = await downloadMultiplePdfsExact(payload, customLocationPath, folderNameParam);
        } else {
          result = await downloadMultiplePdfs(payload, originalFile.path || '', folderNameParam);
        }
        
        if (result?.success) {
          toast.success(`Successfully saved ${result.count} PDF(s)!`, { id: loadingToast });
        } else if ((result as any)?.canceled) {
          toast.dismiss(loadingToast);
        } else {
          toast.error('Failed to save PDFs', { id: loadingToast });
        }
      } catch (err) {
        console.error("Save error:", err);
        toast.error('Failed to process and save PDFs', { id: loadingToast });
      }
    }
  }));

  if (files.length === 0) return null;

  const validRanges = parsePageRangesMulti(rangeInput, pageCount);
  const isValid = validRanges.length > 0 || rangeInput.trim() === '';

  return (
    <div className="flex flex-row h-full w-full bg-white dark:bg-[#1C1C1E] rounded-2xl border border-black/10 dark:border-white/10 overflow-hidden shadow-sm relative">
      
      {/* Left Pane: Controls */}
      <div className="w-[300px] flex flex-col border-r border-black/5 dark:border-white/5 bg-[#F9F9F9] dark:bg-[#202020] shrink-0">
        <div className="p-4 border-b border-black/5 dark:border-white/5 bg-[#F5F5F7] dark:bg-[#252525]">
          <h2 className="text-[14px] font-semibold text-black dark:text-white flex items-center gap-2">
            <Scissors size={16} className="text-blue-500" />
            {t('tools.splitPdf', 'Split PDF')}
          </h2>
        </div>
        
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          <div>
            <label className="block text-[13px] font-medium text-black/80 dark:text-white/80 mb-2">
              {t('tools.pageRanges', 'Page Ranges')}
            </label>
            <p className="text-[11px] text-black/50 dark:text-white/50 mb-3 leading-relaxed">
              {t('tools.splitHelp', 'Enter pages to split. Comma separated groups will be output as separate PDF files.')} 
              <br/><br/>
              <span className="font-medium">Example:</span> 1-3, 5, 8-10
              <br/>
              <span className="italic">Leave blank to extract all pages individually.</span>
            </p>
            <input
              type="text"
              value={rangeInput}
              onChange={handleInputChange}
              placeholder={`e.g. 1-${Math.min(3, pageCount)}, ${Math.min(5, pageCount)}`}
              className={`w-full px-3 py-2 bg-white dark:bg-[#1C1C1E] border ${!isValid ? 'border-red-500 focus:ring-red-500/20' : 'border-black/10 dark:border-white/10 focus:border-blue-500 focus:ring-blue-500/20'} rounded-lg text-[13px] text-black dark:text-white placeholder:text-black/30 dark:placeholder:text-white/30 focus:outline-none focus:ring-4 transition-all`}
            />
            {!isValid && rangeInput.trim() !== '' && (
              <p className="text-[11px] text-red-500 mt-1">
                {t('tools.invalidRange', 'Invalid page range.')}
              </p>
            )}
          </div>
          
          <div className="border-t border-black/5 dark:border-white/5 pt-4">
            <label className="block text-[13px] font-medium text-black/80 dark:text-white/80 mb-2">
              Output Filename Prefix
            </label>
            <input
              type="text"
              value={outputPrefix}
              onChange={(e) => setOutputPrefix(e.target.value)}
              placeholder="document"
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

              <div className="pt-2 border-t border-black/5 dark:border-white/5 space-y-2">
                <label className="flex items-center gap-3 cursor-pointer group">
                  <input 
                    type="checkbox" 
                    checked={saveInNewFolder} 
                    onChange={(e) => setSaveInNewFolder(e.target.checked)}
                    className="w-4 h-4 text-blue-500 bg-white border-black/20 focus:ring-blue-500/30 rounded rounded-sm"
                  />
                  <span className="text-[13px] text-black/70 dark:text-white/70 group-hover:text-black dark:group-hover:text-white transition-colors">
                    {t('tools.saveInNewFolder', 'Create a new folder for split PDFs')}
                  </span>
                </label>
                
                {saveInNewFolder && (
                  <div className="pl-7 mt-2 transition-all">
                    <input
                      type="text"
                      value={newFolderName}
                      onChange={(e) => setNewFolderName(e.target.value)}
                      placeholder={t('tools.folderNamePlaceholder', 'Folder Name')}
                      className="w-full px-3 py-1.5 bg-white dark:bg-[#1C1C1E] border border-black/10 dark:border-white/10 rounded-lg text-[12px] text-black dark:text-white placeholder:text-black/30 dark:placeholder:text-white/30 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all"
                    />
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
            <span className="text-sm text-black/50 dark:text-white/50 animate-pulse">Waiting for files...</span>
          </div>
        )}
      </div>
    </div>
  );
});

SplitPdfTool.displayName = 'SplitPdfTool';
