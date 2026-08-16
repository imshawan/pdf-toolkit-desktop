import React, { forwardRef, useImperativeHandle, useState, useEffect } from 'react';
import { GripHorizontal, GripVertical } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import * as pdfjsLib from 'pdfjs-dist';
import { extractPdfPages, downloadPdf, selectFolder, downloadMultiplePdfsExact } from '../../lib/pdfUtils';
import toast from 'react-hot-toast';
import { PdfThumbnail } from './PdfThumbnail';

// dnd-kit imports
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

export interface RearrangePdfToolRef {
  processAndDownload: () => void;
}

interface RearrangePdfToolProps {
  files: File[];
  onProcessingChange?: (isProcessing: boolean) => void;
}

interface PageItem {
  id: string; // unique id for dnd
  originalIndex: number; // 0-based
}

// A wrapper component for the sortable thumbnail
function SortableThumbnail({ item, pdfDoc, pageNumber }: { item: PageItem, pdfDoc: pdfjsLib.PDFDocumentProxy, pageNumber: number }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 1,
    opacity: isDragging ? 0.8 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="relative group touch-none">
      <div 
        {...attributes} 
        {...listeners} 
        className="absolute top-2 left-2 z-20 bg-white dark:bg-black/80 rounded shadow-sm border border-black/10 dark:border-white/10 p-1 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing text-black/70 dark:text-white/70"
      >
        <GripVertical size={14} />
      </div>
      
      <div className="absolute top-2 right-2 z-20 bg-black/60 text-white text-[10px] font-bold px-1.5 py-0.5 rounded backdrop-blur-sm shadow-sm pointer-events-none">
        {pageNumber}
      </div>
      
      <PdfThumbnail 
        pdfDoc={pdfDoc} 
        pageNumber={item.originalIndex + 1} // 1-based for pdfjs
        width={300}
        className={`w-full aspect-[1/1.4] object-contain transition-all ${isDragging ? 'shadow-xl scale-105' : 'shadow-sm'}`} 
      />
    </div>
  );
}

export const RearrangePdfTool = forwardRef<RearrangePdfToolRef, RearrangePdfToolProps>(({ files }, ref) => {
  const { t } = useTranslation();
  
  const [originalBytes, setOriginalBytes] = useState<Uint8Array | null>(null);
  const [pdfDocProxy, setPdfDocProxy] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [pages, setPages] = useState<PageItem[]>([]);
  const [saveLocation, setSaveLocation] = useState<'original' | 'custom'>('original');
  const [customLocationPath, setCustomLocationPath] = useState<string>('');
  const [outputFilename, setOutputFilename] = useState<string>('');

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // Initialize: Read the first file when dropped
  useEffect(() => {
    let isMounted = true;
    let loadingTask: pdfjsLib.PDFDocumentLoadingTask | null = null;
    
    if (files.length > 0) {
      const file = files[0];
      const reader = new FileReader();
      
      reader.onload = async (e) => {
        if (e.target?.result && isMounted) {
          const arrayBuffer = e.target.result as ArrayBuffer;
          const bytes = new Uint8Array(arrayBuffer);
          setOriginalBytes(bytes);
          
          try {
            // Pass a copy so the worker doesn't detach our original ArrayBuffer
            loadingTask = pdfjsLib.getDocument({ data: bytes.slice() });
            const pdfDoc = await loadingTask.promise;
            
            if (isMounted) {
              setPdfDocProxy(pdfDoc);
              const numPages = pdfDoc.numPages;
              // Initialize pages array
              const initialPages = Array.from({ length: numPages }, (_, i) => ({
                id: `page-${i}-${Date.now()}`,
                originalIndex: i
              }));
              setPages(initialPages);
            }
          } catch (err) {
            console.error("Failed to parse PDF with pdfjs-dist:", err);
          }
        }
      };
      reader.readAsArrayBuffer(file);
      
      setOutputFilename(file.name.replace('.pdf', '') + '_rearranged.pdf');
    }
    
    return () => {
      isMounted = false;
      if (loadingTask) {
        loadingTask.destroy();
      }
    };
  }, [files]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      setPages((items) => {
        const oldIndex = items.findIndex(item => item.id === active.id);
        const newIndex = items.findIndex(item => item.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
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
      if (!originalBytes || files.length === 0 || pages.length === 0) return;
      const originalFile = files[0] as File & { path?: string };
      
      const loadingToast = toast.loading('Processing & Saving PDF...');
      
      try {
        const indices = pages.map(p => p.originalIndex);
        const finalBytes = await extractPdfPages(originalBytes, indices);
        
        let finalName = outputFilename.trim();
        if (!finalName) {
          finalName = originalFile.name.replace('.pdf', '') + '_rearranged.pdf';
        } else if (!finalName.toLowerCase().endsWith('.pdf')) {
          finalName += '.pdf';
        }
        
        let result;
        if (saveLocation === 'custom' && customLocationPath) {
          result = await downloadMultiplePdfsExact([{ bytes: finalBytes, filename: finalName }], customLocationPath);
        } else {
          result = await downloadPdf(finalBytes, finalName, originalFile.path || '');
        }
        
        if (result?.success) {
          toast.success('Successfully saved rearranged PDF!', { id: loadingToast });
        } else if ((result as any)?.canceled) {
          toast.dismiss(loadingToast);
        } else {
          toast.error('Failed to save PDF', { id: loadingToast });
        }
      } catch (err) {
        console.error("Save error:", err);
        toast.error('Failed to process and save PDF', { id: loadingToast });
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
            <GripHorizontal size={16} className="text-cyan-500" />
            {t('tools.rearrange', 'Rearrange Pages')}
          </h2>
        </div>
        
        <div className="flex-1 overflow-y-auto p-5 space-y-6 flex flex-col">
          <div className="flex-1">
            <label className="block text-[13px] font-medium text-black/80 dark:text-white/80 mb-2">
              {t('tools.rearrangeInstructions', 'Instructions')}
            </label>
            <p className="text-[12px] text-black/60 dark:text-white/60 leading-relaxed bg-black/5 dark:bg-white/5 p-3 rounded-xl border border-black/5 dark:border-white/5">
              Drag and drop the thumbnails on the right to rearrange the pages in your PDF. 
              <br/><br/>
              When you're happy with the new order, click "Process & Download" to save the modified document.
            </p>
          </div>
          
          <div className="border-t border-black/5 dark:border-white/5 pt-4">
            <label className="block text-[13px] font-medium text-black/80 dark:text-white/80 mb-2">
              Output Filename
            </label>
            <input
              type="text"
              value={outputFilename}
              onChange={(e) => setOutputFilename(e.target.value)}
              placeholder="document_rearranged.pdf"
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

      {/* Right Pane: Draggable Grid */}
      <div className="flex-1 bg-[#F0F0F2] dark:bg-[#1E1E1E] p-6 overflow-y-auto">
        {!pdfDocProxy ? (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-sm text-black/50 dark:text-white/50 animate-pulse">Loading pages...</span>
          </div>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={pages.map(p => p.id)} strategy={rectSortingStrategy}>
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-8 content-start">
                {pages.map((page, index) => (
                  <SortableThumbnail 
                    key={page.id} 
                    item={page} 
                    pdfDoc={pdfDocProxy} 
                    pageNumber={index + 1} 
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>
    </div>
  );
});

RearrangePdfTool.displayName = 'RearrangePdfTool';
