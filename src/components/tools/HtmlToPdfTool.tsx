import { useState, forwardRef, useImperativeHandle, useMemo } from 'react';
import { Globe, FileCode } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { convertHtmlToPdf, selectFolder, downloadMultiplePdfsExact, downloadPdf } from '../../lib/pdfUtils';
import { DropZone } from '../ui/DropZone';

export interface HtmlToPdfToolRef {
  processAndDownload: () => Promise<void>;
  hasValidInput: () => boolean;
}

interface HtmlToPdfToolProps {
  files: File[];
  setFiles: (files: File[]) => void;
  onProcessingChange?: (isProcessing: boolean) => void;
}

export const HtmlToPdfTool = forwardRef<HtmlToPdfToolRef, HtmlToPdfToolProps>(({ files, setFiles, onProcessingChange }, ref) => {
  const { t } = useTranslation();
  
  const [mode, setMode] = useState<'url' | 'file'>('url');
  const [url, setUrl] = useState('');
  
  const [saveLocation, setSaveLocation] = useState<'original' | 'custom'>('custom');
  const [customLocationPath, setCustomLocationPath] = useState<string>('');
  const [outputFilename, setOutputFilename] = useState<string>('');

  const handleCustomLocation = async () => {
    const folder = await selectFolder();
    if (folder) {
      setCustomLocationPath(folder);
      setSaveLocation('custom');
    } else {
      setSaveLocation('original');
    }
  };

  const handleFilesDrop = (droppedFiles: File[]) => {
    if (droppedFiles.length > 0) {
      setFiles([droppedFiles[0]]);
      setOutputFilename(droppedFiles[0].name.replace(/\.html?$/i, '') + '.pdf');
    }
  };

  const hasValidInput = () => {
    if (mode === 'url') return url.trim().length > 0;
    return files.length > 0;
  };

  useImperativeHandle(ref, () => ({
    hasValidInput,
    processAndDownload: async () => {
      if (!hasValidInput()) {
        toast.error('Please enter a URL or select an HTML file');
        return;
      }

      try {
        onProcessingChange?.(true);
        
        let source = '';
        let defaultFilename = 'webpage.pdf';
        
        if (mode === 'url') {
          source = url.trim();
          try {
            const parsedUrl = new URL(source.startsWith('http') ? source : `https://${source}`);
            defaultFilename = (parsedUrl.hostname + parsedUrl.pathname).replace(/[^a-z0-9]/gi, '_').replace(/_+/g, '_').replace(/^_|_$/g, '') + '.pdf';
          } catch {
            // fallback
          }
        } else {
          source = files[0].path;
          defaultFilename = files[0].name.replace(/\.html?$/i, '') + '.pdf';
        }

        const finalFilename = outputFilename || defaultFilename;
        
        toast.loading('Converting to PDF...', { id: 'html2pdf' });
        const finalBytes = await convertHtmlToPdf(source, mode === 'url');
        toast.success('Conversion successful!', { id: 'html2pdf' });

        let result;
        if (saveLocation === 'custom' && customLocationPath) {
          result = await downloadMultiplePdfsExact([{ bytes: finalBytes, filename: finalFilename }], customLocationPath);
        } else if (mode === 'file' && saveLocation === 'original') {
          result = await downloadPdf(finalBytes, finalFilename, files[0].path || '');
        } else {
          // If URL and saveLocation is original, we don't have an original path. Fallback to exact if custom, or regular download
          result = await downloadPdf(finalBytes, finalFilename, ''); 
        }

        if (result?.success) {
          toast.success(`Saved PDF to ${saveLocation === 'custom' ? 'custom location' : 'downloads'}`);
        } else if ((result as any)?.canceled) {
          // Do nothing
        } else {
          toast.error('Failed to save file');
        }

      } catch (err: any) {
        console.error('Error during processing:', err);
        toast.error(err.message || 'Failed to process HTML');
        toast.dismiss('html2pdf');
      } finally {
        onProcessingChange?.(false);
      }
    }
  }));

  const filePreviewUrl = useMemo(() => {
    if (files.length > 0 && mode === 'file') return URL.createObjectURL(files[0]);
    return null;
  }, [files, mode]);

  return (
    <div className="flex flex-row h-full w-full bg-white dark:bg-[#1C1C1E] rounded-2xl border border-black/10 dark:border-white/10 overflow-hidden shadow-sm relative">
      
      {/* Left Pane: Controls */}
      <div className="w-[300px] flex flex-col border-r border-black/5 dark:border-white/5 bg-[#F9F9F9] dark:bg-[#202020] shrink-0">
        <div className="p-4 border-b border-black/5 dark:border-white/5 bg-[#F5F5F7] dark:bg-[#252525]">
          <h2 className="text-[14px] font-semibold text-black dark:text-white flex items-center gap-2">
            <Globe size={16} className="text-[#0071e3]" />
            HTML to PDF
          </h2>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          {/* Mode Switcher */}
          <div className="flex p-1 bg-black/[0.04] dark:bg-white/[0.04] rounded-xl border border-black/5 dark:border-white/5 relative">
            <button
              onClick={() => setMode('url')}
              className={`flex-1 py-2 text-[13px] font-semibold rounded-lg transition-all duration-200 z-10 ${
                mode === 'url' 
                  ? 'bg-white dark:bg-[#2C2C2E] text-[#0071e3] dark:text-[#4da1ff] shadow-[0_2px_8px_rgba(0,0,0,0.08)] dark:shadow-[0_2px_8px_rgba(0,0,0,0.2)]' 
                  : 'text-black/50 dark:text-white/50 hover:text-black/80 dark:hover:text-white/80 hover:bg-black/[0.02] dark:hover:bg-white/[0.02]'
              }`}
            >
              Web URL
            </button>
            <button
              onClick={() => setMode('file')}
              className={`flex-1 py-2 text-[13px] font-semibold rounded-lg transition-all duration-200 z-10 ${
                mode === 'file' 
                  ? 'bg-white dark:bg-[#2C2C2E] text-[#0071e3] dark:text-[#4da1ff] shadow-[0_2px_8px_rgba(0,0,0,0.08)] dark:shadow-[0_2px_8px_rgba(0,0,0,0.2)]' 
                  : 'text-black/50 dark:text-white/50 hover:text-black/80 dark:hover:text-white/80 hover:bg-black/[0.02] dark:hover:bg-white/[0.02]'
              }`}
            >
              HTML File
            </button>
          </div>

          {mode === 'url' ? (
            <div>
              <label className="block text-[13px] font-medium text-black/80 dark:text-white/80 mb-2">
                Website URL
              </label>
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com"
                className="w-full px-3 py-2 bg-white dark:bg-[#1C1C1E] border border-black/10 dark:border-white/10 focus:border-[#0071e3] focus:ring-[#0071e3]/20 rounded-lg text-[13px] text-black dark:text-white placeholder:text-black/30 dark:placeholder:text-white/30 focus:outline-none focus:ring-4 transition-all"
              />
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <label className="block text-[13px] font-medium text-black/80 dark:text-white/80">
                HTML File
              </label>
              {files.length > 0 ? (
                <div className="p-3 bg-white dark:bg-[#1C1C1E] border border-black/10 dark:border-white/10 rounded-lg flex items-center justify-between">
                  <div className="flex items-center gap-2 overflow-hidden">
                    <FileCode size={16} className="text-orange-500 shrink-0" />
                    <span className="text-[13px] text-black dark:text-white truncate">{files[0].name}</span>
                  </div>
                  <button onClick={() => setFiles([])} className="text-black/40 hover:text-red-500 ml-2">
                    ×
                  </button>
                </div>
              ) : (
                <div
                  onClick={() => document.getElementById('html-upload')?.click()}
                  className="w-full h-24 flex flex-col items-center justify-center rounded-xl border border-dashed border-black/20 dark:border-white/20 bg-black/[0.02] dark:bg-white/[0.02] hover:bg-black/[0.05] dark:hover:bg-white/[0.05] cursor-pointer transition-colors"
                >
                  <FileCode size={20} className="text-black/40 dark:text-white/40 mb-1.5" />
                  <span className="text-[12px] font-medium text-black/60 dark:text-white/60">Click to upload .html file</span>
                  <input 
                    id="html-upload" 
                    type="file" 
                    className="hidden" 
                    accept=".html,.htm"
                    onChange={(e) => {
                      if (e.target.files && e.target.files.length > 0) {
                        handleFilesDrop(Array.from(e.target.files));
                      }
                    }}
                  />
                </div>
              )}
            </div>
          )}
        </div>

        <div className="border-t border-black/5 dark:border-white/5 p-4 shrink-0 bg-[#F5F5F7] dark:bg-[#252525]">
            <label className="block text-[13px] font-medium text-black/80 dark:text-white/80 mb-2">
              Output Filename
            </label>
            <input
              type="text"
              value={outputFilename}
              onChange={(e) => setOutputFilename(e.target.value)}
              placeholder="document.pdf"
              className="w-full px-3 py-2 mb-4 bg-white dark:bg-[#1C1C1E] border border-black/10 dark:border-white/10 focus:border-[#0071e3] focus:ring-[#0071e3]/20 rounded-lg text-[13px] text-black dark:text-white placeholder:text-black/30 dark:placeholder:text-white/30 focus:outline-none focus:ring-4 transition-all"
            />

            <label className="block text-[13px] font-medium text-black/80 dark:text-white/80 mb-3">
              {t('tools.saveLocation', 'Save Location')}
            </label>
            <div className="space-y-3">
              <label className={`flex items-center gap-3 cursor-pointer group ${mode === 'url' ? 'opacity-50 pointer-events-none' : ''}`}>
                <input 
                  type="radio" 
                  checked={saveLocation === 'original' && mode === 'file'} 
                  onChange={() => setSaveLocation('original')}
                  disabled={mode === 'url'}
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

      {/* Right Pane: Preview */}
      <div className="flex-1 bg-black/5 dark:bg-black/20 p-4 relative flex items-center justify-center">
        {(mode === 'url' && url) ? (
          <iframe 
            src={url.startsWith('http') ? url : `https://${url}`} 
            className="w-full h-full rounded-xl shadow-md bg-white border border-black/10 dark:border-white/10"
            sandbox="allow-same-origin allow-scripts"
          />
        ) : (mode === 'file' && filePreviewUrl) ? (
          <iframe 
            src={filePreviewUrl} 
            className="w-full h-full rounded-xl shadow-md bg-white border border-black/10 dark:border-white/10"
            sandbox="allow-same-origin allow-scripts"
          />
        ) : (
          <div className="bg-white dark:bg-[#252525] p-8 rounded-3xl shadow-sm border border-black/5 dark:border-white/5 flex flex-col items-center gap-4 text-center max-w-sm">
            <div className="w-16 h-16 rounded-full bg-indigo-500/10 flex items-center justify-center">
              <Globe size={28} className="text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-black dark:text-white mb-1">Web to PDF</h3>
              <p className="text-[13px] text-black/60 dark:text-white/60">
                Enter a URL or upload an HTML file on the left to convert it into a high-quality PDF.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
});

HtmlToPdfTool.displayName = 'HtmlToPdfTool';
