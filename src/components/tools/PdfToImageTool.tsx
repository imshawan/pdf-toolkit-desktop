import { useState, forwardRef, useImperativeHandle, useMemo } from 'react';
import { Image as ImageIcon, FileImage } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { selectFolder, downloadMultiplePdfsExact, downloadMultiplePdfs } from '../../lib/pdfUtils';
import * as pdfjsLib from 'pdfjs-dist';

export interface PdfToImageToolRef {
  processAndDownload: () => Promise<void>;
  hasValidInput: () => boolean;
}

interface PdfToImageToolProps {
  files: File[];
  setFiles: (files: File[]) => void;
  onProcessingChange?: (isProcessing: boolean) => void;
}

export const PdfToImageTool = forwardRef<PdfToImageToolRef, PdfToImageToolProps>(({ files, setFiles, onProcessingChange }, ref) => {
  const { t } = useTranslation();
  
  const [format, setFormat] = useState<'jpeg' | 'png'>('jpeg');
  const [quality, setQuality] = useState<'low' | 'standard' | 'high' | 'ultra'>('standard');
  
  const [saveLocation, setSaveLocation] = useState<'original' | 'custom'>('original');
  const [customLocationPath, setCustomLocationPath] = useState<string>('');

  const handleCustomLocation = async () => {
    const folder = await selectFolder();
    if (folder) {
      setCustomLocationPath(folder);
      setSaveLocation('custom');
    } else {
      setSaveLocation('original');
    }
  };

  const hasValidInput = () => {
    return files.length > 0;
  };

  useImperativeHandle(ref, () => ({
    hasValidInput,
    processAndDownload: async () => {
      if (!hasValidInput()) {
        toast.error('Please select a PDF file first');
        return;
      }

      try {
        onProcessingChange?.(true);
        toast.loading(`Extracting pages to ${format.toUpperCase()}...`, { id: 'pdf2img' });

        const file = files[0];
        const arrayBuffer = await file.arrayBuffer();
        
        const pdfDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        const numPages = pdfDoc.numPages;
        
        // Base PDF DPI is 72.
        const scaleFactor = 
          quality === 'ultra' ? 8.33 : // 600 DPI
          quality === 'high' ? 4.16 : // 300 DPI
          quality === 'standard' ? 2.08 : // 150 DPI
          1.0; // 72 DPI (low)
        
        const extractedImages: { bytes: Uint8Array; filename: string }[] = [];
        
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d', { alpha: false })!;
        
        const baseFilename = file.name.replace(/\.[^/.]+$/, "");
        const ext = format === 'jpeg' ? 'jpg' : 'png';
        const mimeType = `image/${format}`;
        
        for (let i = 1; i <= numPages; i++) {
          toast.loading(`Extracting page ${i} of ${numPages}...`, { id: 'pdf2img' });
          
          const page = await pdfDoc.getPage(i);
          const viewport = page.getViewport({ scale: scaleFactor });
          
          canvas.width = Math.floor(viewport.width);
          canvas.height = Math.floor(viewport.height);
          
          // Fill white background for JPEG
          if (format === 'jpeg') {
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
          }
          
          const renderTask = page.render({
            canvasContext: ctx,
            viewport,
            background: 'white',
          });
          await renderTask.promise;
          
          const blob: Blob = await new Promise((resolve) => {
            canvas.toBlob((b) => resolve(b!), mimeType, format === 'jpeg' ? 0.9 : undefined);
          });
          
          const imageBuffer = await blob.arrayBuffer();
          const padLength = numPages.toString().length;
          const pageNumStr = i.toString().padStart(Math.max(padLength, 2), '0');
          
          extractedImages.push({
            bytes: new Uint8Array(imageBuffer),
            filename: `${baseFilename}_page_${pageNumStr}.${ext}`
          });
          
          // Yield to UI thread to prevent freezing
          await new Promise(r => setTimeout(r, 0));
        }

        canvas.width = 0;
        canvas.height = 0;

        const subfolderName = `${baseFilename}_images`;

        toast.loading('Saving images...', { id: 'pdf2img' });
        
        let result;
        if (saveLocation === 'custom' && customLocationPath) {
          result = await downloadMultiplePdfsExact(extractedImages, customLocationPath, subfolderName);
        } else {
          result = await downloadMultiplePdfs(extractedImages, (file as any).path || '', subfolderName);
        }

        if (result?.success) {
          toast.success(`Saved ${extractedImages.length} images to ${subfolderName}`, { id: 'pdf2img' });
        } else if ((result as any)?.canceled) {
          toast.dismiss('pdf2img');
        } else {
          toast.error('Failed to save images', { id: 'pdf2img' });
        }

      } catch (err: any) {
        console.error('Error extracting images:', err);
        toast.error(err.message || 'Failed to extract images', { id: 'pdf2img' });
      } finally {
        onProcessingChange?.(false);
      }
    }
  }));

  const previewUrl = useMemo(() => {
    if (files.length > 0) return URL.createObjectURL(files[0]);
    return null;
  }, [files]);

  return (
    <div className="flex flex-row h-full w-full bg-white dark:bg-[#1C1C1E] rounded-2xl border border-black/10 dark:border-white/10 overflow-hidden shadow-sm relative">
      
      {/* Left Pane: Controls */}
      <div className="w-[300px] flex flex-col border-r border-black/5 dark:border-white/5 bg-[#F9F9F9] dark:bg-[#202020] shrink-0">
        <div className="p-4 border-b border-black/5 dark:border-white/5 bg-[#F5F5F7] dark:bg-[#252525]">
          <h2 className="text-[14px] font-semibold text-black dark:text-white flex items-center gap-2">
            <ImageIcon size={16} className="text-[#0071e3]" />
            PDF to Image
          </h2>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          <div className="space-y-4">
            <div>
              <label className="block text-[13px] font-medium text-black/80 dark:text-white/80 mb-2">
                Output Format
              </label>
              <div className="flex p-1 bg-black/[0.04] dark:bg-white/[0.04] rounded-xl border border-black/5 dark:border-white/5 relative">
                <button
                  onClick={() => setFormat('jpeg')}
                  className={`flex-1 py-2 text-[13px] font-semibold rounded-lg transition-all duration-200 z-10 ${
                    format === 'jpeg' 
                      ? 'bg-white dark:bg-[#2C2C2E] text-[#0071e3] dark:text-[#4da1ff] shadow-[0_2px_8px_rgba(0,0,0,0.08)] dark:shadow-[0_2px_8px_rgba(0,0,0,0.2)]' 
                      : 'text-black/50 dark:text-white/50 hover:text-black/80 dark:hover:text-white/80 hover:bg-black/[0.02] dark:hover:bg-white/[0.02]'
                  }`}
                >
                  JPG
                </button>
                <button
                  onClick={() => setFormat('png')}
                  className={`flex-1 py-2 text-[13px] font-semibold rounded-lg transition-all duration-200 z-10 ${
                    format === 'png' 
                      ? 'bg-white dark:bg-[#2C2C2E] text-[#0071e3] dark:text-[#4da1ff] shadow-[0_2px_8px_rgba(0,0,0,0.08)] dark:shadow-[0_2px_8px_rgba(0,0,0,0.2)]' 
                      : 'text-black/50 dark:text-white/50 hover:text-black/80 dark:hover:text-white/80 hover:bg-black/[0.02] dark:hover:bg-white/[0.02]'
                  }`}
                >
                  PNG
                </button>
              </div>
            </div>
            
            <div>
              <label className="block text-[13px] font-medium text-black/80 dark:text-white/80 mb-2">
                Resolution Quality
              </label>
              <div className="flex flex-wrap p-1 bg-black/[0.04] dark:bg-white/[0.04] rounded-xl border border-black/5 dark:border-white/5 relative gap-1">
                <button
                  onClick={() => setQuality('low')}
                  className={`flex-1 py-1.5 text-[12px] font-semibold rounded-lg transition-all duration-200 z-10 ${
                    quality === 'low' 
                      ? 'bg-white dark:bg-[#2C2C2E] text-[#0071e3] dark:text-[#4da1ff] shadow-[0_2px_8px_rgba(0,0,0,0.08)] dark:shadow-[0_2px_8px_rgba(0,0,0,0.2)]' 
                      : 'text-black/50 dark:text-white/50 hover:text-black/80 dark:hover:text-white/80 hover:bg-black/[0.02] dark:hover:bg-white/[0.02]'
                  }`}
                >
                  Low
                </button>
                <button
                  onClick={() => setQuality('standard')}
                  className={`flex-1 py-1.5 text-[12px] font-semibold rounded-lg transition-all duration-200 z-10 ${
                    quality === 'standard' 
                      ? 'bg-white dark:bg-[#2C2C2E] text-[#0071e3] dark:text-[#4da1ff] shadow-[0_2px_8px_rgba(0,0,0,0.08)] dark:shadow-[0_2px_8px_rgba(0,0,0,0.2)]' 
                      : 'text-black/50 dark:text-white/50 hover:text-black/80 dark:hover:text-white/80 hover:bg-black/[0.02] dark:hover:bg-white/[0.02]'
                  }`}
                >
                  Standard
                </button>
                <button
                  onClick={() => setQuality('high')}
                  className={`flex-1 py-1.5 text-[12px] font-semibold rounded-lg transition-all duration-200 z-10 ${
                    quality === 'high' 
                      ? 'bg-white dark:bg-[#2C2C2E] text-[#0071e3] dark:text-[#4da1ff] shadow-[0_2px_8px_rgba(0,0,0,0.08)] dark:shadow-[0_2px_8px_rgba(0,0,0,0.2)]' 
                      : 'text-black/50 dark:text-white/50 hover:text-black/80 dark:hover:text-white/80 hover:bg-black/[0.02] dark:hover:bg-white/[0.02]'
                  }`}
                >
                  High
                </button>
                <button
                  onClick={() => setQuality('ultra')}
                  className={`flex-1 py-1.5 text-[12px] font-semibold rounded-lg transition-all duration-200 z-10 ${
                    quality === 'ultra' 
                      ? 'bg-white dark:bg-[#2C2C2E] text-[#0071e3] dark:text-[#4da1ff] shadow-[0_2px_8px_rgba(0,0,0,0.08)] dark:shadow-[0_2px_8px_rgba(0,0,0,0.2)]' 
                      : 'text-black/50 dark:text-white/50 hover:text-black/80 dark:hover:text-white/80 hover:bg-black/[0.02] dark:hover:bg-white/[0.02]'
                  }`}
                >
                  Ultra
                </button>
              </div>
              <p className="text-[11px] text-black/50 dark:text-white/50 mt-2 text-center">
                {quality === 'low' ? 'Web quality (~72 DPI)' : 
                 quality === 'standard' ? 'Good for documents (~150 DPI)' : 
                 quality === 'high' ? 'Best for printing (~300 DPI)' : 
                 'Massive file size (~600 DPI)'}
              </p>
            </div>
          </div>
        </div>

        <div className="border-t border-black/5 dark:border-white/5 p-4 shrink-0 bg-[#F5F5F7] dark:bg-[#252525]">
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

      {/* Right Pane: Info/Preview */}
      <div className="flex-1 bg-black/5 dark:bg-black/20 p-4 relative flex items-center justify-center">
        {previewUrl ? (
          <iframe 
            src={`${previewUrl}#toolbar=0&navpanes=0`} 
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

PdfToImageTool.displayName = 'PdfToImageTool';
