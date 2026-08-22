import * as pdfjsLib from "pdfjs-dist";
import { prerenderAllPages, revokeAllThumbnails } from "./PdfThumbnail";
import React, { forwardRef, useImperativeHandle, useState, useEffect } from 'react';
import { Table, FileSpreadsheet, X, ChevronDown, ChevronRight, Check, Eye, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { downloadPdf, downloadMultiplePdfs, selectFolder } from '../../lib/pdfUtils';
import toast from 'react-hot-toast';
import { Button } from '../ui/Button';

export interface XlsToPdfToolRef {
  processAndDownload: () => void;
}

interface XlsToPdfToolProps {
  files: File[];
  setFiles: (files: File[]) => void;
  onProcessingChange?: (isProcessing: boolean) => void;
}

type PageSize = 'a3' | 'a4' | 'a5' | 'letter' | 'legal' | 'tabloid';
type Orientation = 'portrait' | 'landscape';
type ExportMode = 'combined' | 'split';

export const XlsToPdfTool = forwardRef<XlsToPdfToolRef, XlsToPdfToolProps>(
  ({ files, setFiles, onProcessingChange }, ref) => {
    const { t } = useTranslation();
    const [pageSize, setPageSize] = useState<PageSize>('a4');
    const [orientation, setOrientation] = useState<Orientation>('landscape');
    const [margin, setMargin] = useState<number>(10);
    const [saveLocation, setSaveLocation] = useState<'original' | 'custom'>('original');
    const [customLocationPath, setCustomLocationPath] = useState('');
    const [outputFilename, setOutputFilename] = useState('spreadsheets.pdf');
    
    const [previewImages, setPreviewImages] = useState<string[]>([]);
    const [showPreviewModal, setShowPreviewModal] = useState<boolean>(false);
    const [isPreviewing, setIsPreviewing] = useState<boolean>(false);
    const [previewingIndex, setPreviewingIndex] = useState<number | null>(null);
    
    useEffect(() => {
      return () => {
        revokeAllThumbnails(previewImages);
      };
    }, [previewImages]);

    const handlePreview = async (index: number) => {
      if (files.length === 0 || index < 0 || index >= files.length) return;
      setIsPreviewing(true);
      setPreviewingIndex(index);
      const loadingToast = toast.loading("Generating preview...");
      try {
        const file = files[index];
        const fileId = (file as any).path || file.name;
        const sheetsSet = selectedSheets[fileId];
        const sheetNames = sheetsSet ? Array.from(sheetsSet) : undefined;
        
        const pdfFiles = await new Promise<{filename: string, pdfData: Uint8Array}[]>((resolve, reject) => {
          const worker = new Worker(new URL("../../lib/xls2pdfWorker.ts", import.meta.url), { type: "module" });
          worker.onmessage = (e) => {
            const { success, pdfFiles, error } = e.data;
            worker.terminate();
            if (success) resolve(pdfFiles);
            else reject(new Error(error));
          };
          worker.onerror = (err) => { worker.terminate(); reject(err); };
          worker.postMessage({
            file,
            pageSize,
            orientation,
            marginMm: margin,
            sheetNames
          });
        });
        
        if (pdfFiles.length > 0) {
          const loadingTask = pdfjsLib.getDocument({ data: pdfFiles[0].pdfData.slice() });
          const pdfDoc = await loadingTask.promise;
          const images = await prerenderAllPages(pdfDoc, 600);
          setPreviewImages(images);
          setShowPreviewModal(true);
        }
      } catch (err: any) {
        toast.error("Preview failed: " + (err.message || err));
      } finally {
        toast.dismiss(loadingToast);
        setIsPreviewing(false);
        setPreviewingIndex(null);
      }
    };

    // New Feature States
    const [exportMode, setExportMode] = useState<ExportMode>('combined');
    const [scaleToFit, setScaleToFit] = useState(true);
    
    // Sheets parsing state
    const [parsedSheets, setParsedSheets] = useState<Record<string, { id: number, name: string }[]>>({});
    const [selectedSheets, setSelectedSheets] = useState<Record<string, Set<string>>>({});
    const [parsingFiles, setParsingFiles] = useState<Set<string>>(new Set());
    const [expandedFiles, setExpandedFiles] = useState<Set<string>>(new Set());

    // Effect: Parse sheets when new files are added
    useEffect(() => {
      files.forEach(file => {
        const fileId = (file as any).path || file.name;
        
        // Skip if already parsed or currently parsing
        if (parsedSheets[fileId] || parsingFiles.has(fileId)) return;
        
        setParsingFiles(prev => new Set(prev).add(fileId));
        
        file.arrayBuffer().then(buffer => {
          const worker = new Worker(new URL('../../lib/xlsParserWorker.ts', import.meta.url), { type: 'module' });
          worker.onmessage = (e) => {
            if (e.data.success && e.data.fileId === fileId) {
              setParsedSheets(prev => ({ ...prev, [fileId]: e.data.sheets }));
              
              // Select all by default
              const sheetNames = e.data.sheets.map((s: any) => s.name);
              setSelectedSheets(prev => ({ ...prev, [fileId]: new Set(sheetNames) }));
            }
            setParsingFiles(prev => {
              const next = new Set(prev);
              next.delete(fileId);
              return next;
            });
            worker.terminate();
          };
          worker.postMessage({ fileId, fileBuffer: buffer });
        });
      });
    }, [files]);

    const removeFile = (index: number) => {
      const file = files[index];
      const fileId = (file as any).path || file.name;
      
      setFiles(files.filter((_, i) => i !== index));
      
      setParsedSheets(prev => {
        const next = { ...prev };
        delete next[fileId];
        return next;
      });
      setSelectedSheets(prev => {
        const next = { ...prev };
        delete next[fileId];
        return next;
      });
    };

    const toggleSheet = (fileId: string, sheetName: string) => {
      setSelectedSheets(prev => {
        const currentSet = prev[fileId] ? new Set(prev[fileId]) : new Set<string>();
        if (currentSet.has(sheetName)) {
          currentSet.delete(sheetName);
        } else {
          currentSet.add(sheetName);
        }
        return { ...prev, [fileId]: currentSet };
      });
    };

    const toggleFileExpand = (fileId: string) => {
      setExpandedFiles(prev => {
        const next = new Set(prev);
        if (next.has(fileId)) next.delete(fileId);
        else next.add(fileId);
        return next;
      });
    };

    const handleCustomLocation = async () => {
      const path = await selectFolder();
      if (path) {
        setSaveLocation('custom');
        setCustomLocationPath(path);
      } else {
        setSaveLocation('original');
      }
    };

    useImperativeHandle(ref, () => ({
      processAndDownload: async () => {
        if (files.length === 0) return;

        onProcessingChange?.(true);
        const loadingToast = toast.loading('Converting Excel to PDF...');

        try {
          for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const fileId = (file as any).path || file.name;
            const sheetsSet = selectedSheets[fileId];
            const sheetNames = sheetsSet ? Array.from(sheetsSet) : undefined;

            if (sheetNames && sheetNames.length === 0) {
              toast.error(`No sheets selected for ${file.name}`);
              continue;
            }

            const pdfFiles = await new Promise<{ filename: string, pdfData: Uint8Array }[]>((resolve, reject) => {
              const worker = new Worker(new URL('../../lib/xls2pdfWorker.ts', import.meta.url), { type: 'module' });
              
              worker.onmessage = (e) => {
                const { success, pdfFiles, error } = e.data;
                worker.terminate();
                if (success) {
                  resolve(pdfFiles);
                } else {
                  reject(new Error(error));
                }
              };

              worker.onerror = (err) => {
                worker.terminate();
                reject(err);
              };

              worker.postMessage({
                file,
                pageSize,
                orientation,
                marginMm: margin,
                selectedSheets: sheetNames,
                exportMode,
                scaleToFit,
              });
            });

            const folderName = saveLocation === 'custom' ? customLocationPath : undefined;
            
            if (exportMode === 'combined') {
              const baseName = file.name.replace(/\.[^/.]+$/, '');
              const finalFileName = files.length === 1 ? (outputFilename || `${baseName}.pdf`) : `${baseName}.pdf`;
              
              const result = await downloadPdf(pdfFiles[0].pdfData, finalFileName, (file as any).path, folderName);
              if (result.success) {
                toast.success(`Saved ${finalFileName}`, { id: files.length === 1 ? loadingToast : undefined });
              } else if ((result as any).canceled) {
                if (files.length === 1) toast.dismiss(loadingToast);
              } else {
                throw new Error('Failed to save file');
              }
            } else {
              // Split mode
              const result = await downloadMultiplePdfs(
                pdfFiles.map(pf => ({ bytes: pf.pdfData, filename: pf.filename })),
                (file as any).path,
                folderName
              );
              if (result.success) {
                toast.success(`Saved ${result.count} sheets`, { id: files.length === 1 ? loadingToast : undefined });
              } else if (result.canceled) {
                if (files.length === 1) toast.dismiss(loadingToast);
              } else {
                throw new Error('Failed to save multiple files');
              }
            }
          }
        } catch (err) {
          console.error('Save error:', err);
          toast.error('Failed to convert Excel to PDF', { id: loadingToast });
        } finally {
          onProcessingChange?.(false);
        }
      },
    }));

    if (files.length === 0) return null;

    return ( <>
      <div className="flex flex-row h-full w-full bg-white dark:bg-[#1C1C1E] rounded-2xl border border-black/10 dark:border-white/10 overflow-hidden shadow-sm relative">
        {/* Left Pane: Settings */}
        <div className="w-[280px] flex flex-col border-r border-black/5 dark:border-white/5 bg-[#F9F9F9] dark:bg-[#202020] shrink-0">
          <div className="p-4 border-b border-black/5 dark:border-white/5 bg-[#F5F5F7] dark:bg-[#252525]">
            <h2 className="text-[14px] font-semibold text-black dark:text-white flex items-center gap-2">
              <Table size={16} className="text-pink-500" />
              {t('tools.xls2pdf', 'Excel to PDF')}
            </h2>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <p className="text-[12px] text-black/60 dark:text-white/60 leading-relaxed bg-black/5 dark:bg-white/5 p-3 rounded-xl border border-black/5 dark:border-white/5">
              Convert your spreadsheets into perfectly formatted PDFs while preserving native cell colors and font styles.
            </p>

            {/* Export Mode */}
            <div className="border-t border-black/5 dark:border-white/5 pt-4">
              <label className="block text-[13px] font-medium text-black/80 dark:text-white/80 mb-2">
                Export Mode
              </label>
              <div className="flex p-1 bg-black/[0.04] dark:bg-white/[0.04] rounded-xl border border-black/5 dark:border-white/5 relative">
                <button
                  onClick={() => setExportMode('combined')}
                  className={`flex-1 py-2 text-[13px] font-semibold rounded-lg transition-all duration-200 z-10 ${
                    exportMode === 'combined' 
                      ? 'bg-white dark:bg-[#2C2C2E] text-[#0071e3] dark:text-[#4da1ff] shadow-[0_2px_8px_rgba(0,0,0,0.08)] dark:shadow-[0_2px_8px_rgba(0,0,0,0.2)]' 
                      : 'text-black/50 dark:text-white/50 hover:text-black/80 dark:hover:text-white/80 hover:bg-black/[0.02] dark:hover:bg-white/[0.02]'
                  }`}
                >
                  Single PDF
                </button>
                <button
                  onClick={() => setExportMode('split')}
                  className={`flex-1 py-2 text-[13px] font-semibold rounded-lg transition-all duration-200 z-10 ${
                    exportMode === 'split' 
                      ? 'bg-white dark:bg-[#2C2C2E] text-[#0071e3] dark:text-[#4da1ff] shadow-[0_2px_8px_rgba(0,0,0,0.08)] dark:shadow-[0_2px_8px_rgba(0,0,0,0.2)]' 
                      : 'text-black/50 dark:text-white/50 hover:text-black/80 dark:hover:text-white/80 hover:bg-black/[0.02] dark:hover:bg-white/[0.02]'
                  }`}
                >
                  Split Sheets
                </button>
              </div>
            </div>

            <div className="border-t border-black/5 dark:border-white/5 pt-4">
              <label className="flex items-center gap-2.5 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={scaleToFit}
                  onChange={(e) => setScaleToFit(e.target.checked)}
                  className="w-3.5 h-3.5 text-blue-500 bg-white border-black/20 rounded focus:ring-blue-500/30"
                />
                <span className="text-[12px] font-medium text-black/70 dark:text-white/70 group-hover:text-black dark:group-hover:text-white transition-colors">
                  Scale to Fit Page Width
                </span>
              </label>
              <p className="text-[10px] text-black/50 dark:text-white/50 mt-1 pl-6 leading-tight">
                Disables horizontal pagination. Squeezes wide tables onto one page (may result in tiny text).
              </p>
            </div>

            {/* Output Filename + Save Location */}
            <div className="border-t border-black/5 dark:border-white/5 pt-4">
              <label className="block text-[12px] font-medium text-black/70 dark:text-white/70 mb-1.5">
                Output Filename
              </label>
              <input
                type="text"
                value={outputFilename}
                onChange={(e) => setOutputFilename(e.target.value)}
                placeholder="spreadsheet.pdf"
                className="w-full px-3 py-2 mb-3 bg-white dark:bg-[#1C1C1E] border border-black/10 dark:border-white/10 focus:border-blue-500 focus:ring-blue-500/20 rounded-lg text-[13px] text-black dark:text-white placeholder:text-black/30 dark:placeholder:text-white/30 focus:outline-none focus:ring-4 transition-all"
                disabled={files.length > 1 || exportMode === 'split'}
              />
              {(files.length > 1 || exportMode === 'split') && (
                <p className="text-[10px] text-black/50 dark:text-white/50 mb-3 -mt-2 leading-tight">
                  Auto-named based on source files/sheets.
                </p>
              )}

              <label className="block text-[12px] font-medium text-black/70 dark:text-white/70 mb-2">
                Save Location
              </label>
              <div className="space-y-2">
                <label className="flex items-center gap-2.5 cursor-pointer group">
                  <input
                    type="radio"
                    checked={saveLocation === 'original'}
                    onChange={() => setSaveLocation('original')}
                    className="w-3.5 h-3.5 text-blue-500 bg-white border-black/20 focus:ring-blue-500/30"
                  />
                  <span className="text-[12px] text-black/70 dark:text-white/70 group-hover:text-black dark:group-hover:text-white transition-colors">
                    Save in original directory
                  </span>
                </label>
                <div>
                  <label className="flex items-center gap-2.5 cursor-pointer group">
                    <input
                      type="radio"
                      checked={saveLocation === 'custom'}
                      onChange={handleCustomLocation}
                      className="w-3.5 h-3.5 text-blue-500 bg-white border-black/20 focus:ring-blue-500/30"
                    />
                    <span className="text-[12px] text-black/70 dark:text-white/70 group-hover:text-black dark:group-hover:text-white transition-colors">
                      Choose custom location...
                    </span>
                  </label>
                  {saveLocation === 'custom' && customLocationPath && (
                    <div className="ml-6 mt-1 pl-2 border-l-2 border-blue-500/30">
                      <p className="text-[10px] text-black/50 dark:text-white/50 truncate" title={customLocationPath}>
                        {customLocationPath}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="border-t border-black/5 dark:border-white/5 pt-4">
              <label className="block text-[12px] font-medium text-black/70 dark:text-white/70 mb-2">
                Page Size
              </label>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(e.target.value as PageSize)}
                className="w-full px-3 py-2 bg-white dark:bg-[#1C1C1E] border border-black/10 dark:border-white/10 rounded-lg text-[13px] text-black dark:text-white focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all"
              >
                <option value="a4">A4 (210 x 297 mm)</option>
                <option value="letter">Letter (8.5 x 11 in)</option>
                <option value="legal">Legal (8.5 x 14 in)</option>
                <option value="a3">A3 (297 x 420 mm)</option>
                <option value="a5">A5 (148 x 210 mm)</option>
                <option value="tabloid">Tabloid (11 x 17 in)</option>
              </select>
            </div>

            <div className="border-t border-black/5 dark:border-white/5 pt-4">
              <label className="block text-[12px] font-medium text-black/70 dark:text-white/70 mb-2">
                Orientation
              </label>
              <select
                value={orientation}
                onChange={(e) => setOrientation(e.target.value as Orientation)}
                className="w-full px-3 py-2 bg-white dark:bg-[#1C1C1E] border border-black/10 dark:border-white/10 rounded-lg text-[13px] text-black dark:text-white focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all"
              >
                <option value="landscape">Landscape (Recommended)</option>
                <option value="portrait">Portrait</option>
              </select>
            </div>

            <div className="border-t border-black/5 dark:border-white/5 pt-4 pb-2">
              <label className="flex items-center justify-between text-[12px] font-medium text-black/70 dark:text-white/70 mb-2">
                Margin (mm)
                <span className="text-black dark:text-white">{margin}mm</span>
              </label>
              <input
                type="range"
                min="0"
                max="50"
                step="1"
                value={margin}
                onChange={(e) => setMargin(Number(e.target.value))}
                className="w-full accent-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Right Pane: Selected Files & Sheets List */}
        <div className="flex-1 bg-[#F0F0F2] dark:bg-[#1E1E1E] p-6 overflow-y-auto">
          <div className="max-w-6xl mx-auto space-y-6">
            {files.map((file, index) => {
              const fileId = (file as any).path || file.name;
              const isParsing = parsingFiles.has(fileId);
              const sheets = parsedSheets[fileId] || [];
              const selectedSet = selectedSheets[fileId] || new Set();

              return (
                <div key={fileId} className="bg-white dark:bg-[#2C2C2E] rounded-2xl border border-black/5 dark:border-white/5 overflow-hidden shadow-sm flex flex-col">
                  {/* File Header Banner */}
                  <div className="p-5 border-b border-black/5 dark:border-white/5 bg-gradient-to-r from-[#F9F9F9] to-white dark:from-[#252525] dark:to-[#2C2C2E] flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center text-blue-500 shadow-inner">
                        <FileSpreadsheet size={24} />
                      </div>
                      <div>
                         <h3 className="text-[15px] font-semibold text-black dark:text-white">{file.name}</h3>
                         <p className="text-[13px] text-black/50 dark:text-white/50 mt-0.5">
                           {isParsing ? 'Inspecting workbook...' : `${selectedSet.size} of ${sheets.length} sheets selected`}
                         </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      {!isParsing && (
                        <Button
                          variant="secondary"
                          onClick={() => handlePreview(index)}
                          disabled={isPreviewing}
                        >
                          {isPreviewing && previewingIndex === index ? <Loader2 size={14} className="animate-spin" /> : <Eye size={14} />}
                          {t("common.preview", "Preview")}
                        </Button>
                      )}
                      <button
                        onClick={() => removeFile(index)}
                        className="p-2 text-black/40 dark:text-white/40 hover:text-red-500 hover:bg-red-500/10 rounded-full transition-colors"
                        title="Remove file"
                      >
                        <X size={20} />
                      </button>
                    </div>
                  </div>

                  {/* Sheet Gallery Grid Container */}
                  {!isParsing && sheets.length > 0 && (
                    <div className="p-6 bg-white dark:bg-[#2C2C2E]">
                      <div 
                        className="grid gap-4"
                        style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))' }}
                      >
                        {sheets.map((sheet, idx) => {
                          const isSelected = selectedSet.has(sheet.name);
                          return (
                            <div
                              key={sheet.id}
                              onClick={() => toggleSheet(fileId, sheet.name)}
                              className={`
                                relative flex items-center gap-4 p-[14px] rounded-[14px] cursor-pointer transition-all duration-200 h-[84px]
                                ${isSelected 
                                  ? 'bg-[#0071e3]/5 dark:bg-[#0071e3]/10 border-2 border-[#0071e3]' 
                                  : 'bg-[#F9F9F9] dark:bg-[#333333] border-2 border-black/5 dark:border-white/5 hover:border-black/15 dark:hover:border-white/15'
                                }
                              `}
                            >
                              {/* Icon */}
                              <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                                isSelected ? 'bg-[#0071e3]/10 text-[#0071e3]' : 'bg-black/5 dark:bg-white/5 text-black/50 dark:text-white/50'
                              }`}>
                                <Table size={20} strokeWidth={2} />
                              </div>
                  
                              {/* Sheet Info */}
                              <div className="flex-1 min-w-0 flex flex-col justify-center">
                                <span className="text-[14px] leading-snug font-semibold text-black dark:text-white line-clamp-2" title={sheet.name}>
                                  {sheet.name}
                                </span>
                                <span className={`text-[12px] font-medium mt-0.5 ${
                                  isSelected ? 'text-[#0071e3]/80' : 'text-black/40 dark:text-white/40'
                                }`}>
                                  Sheet {idx + 1}
                                </span>
                              </div>

                              {/* Checkbox */}
                              <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                                isSelected ? 'bg-[#0071e3] text-white' : 'border-2 border-black/10 dark:border-white/10'
                              }`}>
                                {isSelected && <Check size={14} strokeWidth={3} />}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Preview Modal */}
      {showPreviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 dark:bg-black/60 backdrop-blur-sm p-8" onClick={() => setShowPreviewModal(false)}>
          <div className="bg-[#F5F5F7] dark:bg-[#1C1C1E] w-full max-w-5xl h-[85vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-black/10 dark:border-white/10" onClick={e => e.stopPropagation()}>
            <div className="h-14 bg-white/50 dark:bg-[#2C2C2E]/50 border-b border-black/10 dark:border-white/10 flex items-center justify-between px-6 shrink-0 backdrop-blur-md">
              <h3 className="font-semibold text-[14px] text-black dark:text-white flex items-center gap-2">
                <Eye size={16} className="text-[#0071e3]" />
                {t("common.preview", "Preview")} PDF
              </h3>
              <button 
                onClick={() => setShowPreviewModal(false)} 
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors text-black/50 dark:text-white/50"
              >
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 bg-black/5 dark:bg-black/20 p-6 relative overflow-y-auto flex flex-col items-center gap-6">
               {previewImages.length > 0 ? (
                 previewImages.map((src, i) => (
                   <img 
                     key={i} 
                     src={src} 
                     alt={"Page " + (i+1)} 
                     className="max-w-full h-auto bg-white shadow-[0_4px_12px_rgba(0,0,0,0.1)] border border-black/5 rounded-sm" 
                     style={{ width: "600px" }}
                   />
                 ))
               ) : (
                 <div className="m-auto flex flex-col items-center justify-center text-black/50 dark:text-white/50 gap-3">
                   <Loader2 size={24} className="animate-spin text-[#0071e3]" />
                   <span className="text-[13px] font-medium">Rendering pages...</span>
                 </div>
               )}
            </div>
          </div>
        </div>
      )}
      </>
    );
  }
);
