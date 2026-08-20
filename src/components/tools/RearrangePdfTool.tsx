import React, { forwardRef, useImperativeHandle, useState, useEffect, useRef } from 'react';
import { GripHorizontal, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import * as pdfjsLib from 'pdfjs-dist';
import { extractPdfPages, downloadPdf, selectFolder, downloadMultiplePdfsExact } from '../../lib/pdfUtils';
import toast from 'react-hot-toast';
import { PdfThumbnail, prerenderAllPages, revokeAllThumbnails } from './PdfThumbnail';

import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  rectSortingStrategy,
  useSortable,
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
  id: string;
  originalIndex: number; // 0-based
}

// ── Sortable card (memoized — only re-renders when its own props change) ──
const SortableCard = React.memo(function SortableCard({
  item,
  imgSrc,
  displayNumber,
  onRemove,
}: {
  item: PageItem;
  imgSrc: string;
  displayNumber: number;
  onRemove: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.id });

  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform), // translate only, no scale
    transition,
    opacity: isDragging ? 0.4 : undefined,
    willChange: 'transform',
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="relative group touch-none"
    >
      <div 
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing h-full"
      >
        <PdfThumbnail imgSrc={imgSrc} pageLabel={displayNumber} />
      </div>
      <button 
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => { e.preventDefault(); onRemove(item.id); }}
        className="absolute -top-3 -right-3 w-7 h-7 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-md hover:bg-red-600 z-10"
        title="Remove page"
      >
        <X size={14} strokeWidth={2.5} />
      </button>
    </div>
  );
});

// ── Main tool ──
export const RearrangePdfTool = forwardRef<RearrangePdfToolRef, RearrangePdfToolProps>(
  ({ files }, ref) => {
    const { t } = useTranslation();

    const [originalBytes, setOriginalBytes] = useState<Uint8Array | null>(null);
    const [pages, setPages] = useState<PageItem[]>([]);
    const [thumbnails, setThumbnails] = useState<string[]>([]); // blob URLs indexed by originalIndex
    const [renderProgress, setRenderProgress] = useState<{ done: number; total: number } | null>(null);
    const [saveLocation, setSaveLocation] = useState<'original' | 'custom'>('original');
    const [customLocationPath, setCustomLocationPath] = useState('');
    const [outputFilename, setOutputFilename] = useState('');
    const initRef = useRef(false);

    const sensors = useSensors(
      useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
    );

    // ── Load PDF & pre-render all thumbnails once ──
    useEffect(() => {
      if (files.length === 0 || initRef.current) return;
      initRef.current = true;

      const file = files[0];
      setOutputFilename(file.name.replace('.pdf', '') + '_rearranged.pdf');

      let blobUrls: string[] = [];

      const reader = new FileReader();
      reader.onload = async (e) => {
        if (!e.target?.result) return;

        const arrayBuffer = e.target.result as ArrayBuffer;
        const bytes = new Uint8Array(arrayBuffer);
        setOriginalBytes(bytes);

        try {
          const loadingTask = pdfjsLib.getDocument({ data: bytes.slice() });
          const pdfDoc = await loadingTask.promise;

          const numPages = pdfDoc.numPages;
          setPages(
            Array.from({ length: numPages }, (_, i) => ({
              id: `page-${i}`,
              originalIndex: i,
            }))
          );

          // Pre-render every page into a Blob URL
          const imgs = await prerenderAllPages(pdfDoc, 200, (done, total) => {
            setRenderProgress({ done, total });
          });
          blobUrls = imgs;
          setThumbnails(imgs);
          setRenderProgress(null);

          pdfDoc.destroy();
        } catch (err) {
          console.error('Failed to load PDF:', err);
        }
      };
      reader.readAsArrayBuffer(file);

      return () => {
        // Revoke blob URLs on unmount to free memory
        revokeAllThumbnails(blobUrls);
      };
    }, [files]);

    const handleDragEnd = (event: DragEndEvent) => {
      const { active, over } = event;
      if (over && active.id !== over.id) {
        setPages((prev) => {
          const oldIdx = prev.findIndex((p) => p.id === active.id);
          const newIdx = prev.findIndex((p) => p.id === over.id);
          return arrayMove(prev, oldIdx, newIdx);
        });
      }
    };

    const handleRemovePage = (id: string) => {
      setPages(prev => prev.filter(p => p.id !== id));
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

    // ── Process & Download ──
    useImperativeHandle(ref, () => ({
      processAndDownload: async () => {
        if (!originalBytes || pages.length === 0) return;
        const originalFile = files[0] as File & { path?: string };
        const loadingToast = toast.loading('Processing & Saving PDF...');

        try {
          const indices = pages.map((p) => p.originalIndex);
          const finalBytes = await extractPdfPages(originalBytes, indices);

          let finalName = outputFilename.trim();
          if (!finalName) finalName = originalFile.name.replace('.pdf', '') + '_rearranged.pdf';
          else if (!finalName.toLowerCase().endsWith('.pdf')) finalName += '.pdf';

          let result;
          if (saveLocation === 'custom' && customLocationPath) {
            result = await downloadMultiplePdfsExact(
              [{ bytes: finalBytes, filename: finalName }],
              customLocationPath
            );
          } else {
            result = await downloadPdf(finalBytes, finalName, originalFile.path || '');
          }

          if (result?.success) toast.success('Successfully saved rearranged PDF!', { id: loadingToast });
          else if ((result as any)?.canceled) toast.dismiss(loadingToast);
          else toast.error('Failed to save PDF', { id: loadingToast });
        } catch (err) {
          console.error('Save error:', err);
          toast.error('Failed to process and save PDF', { id: loadingToast });
        }
      },
    }));

    if (files.length === 0) return null;

    return (
      <div className="flex flex-row h-full w-full bg-white dark:bg-[#1C1C1E] rounded-2xl border border-black/10 dark:border-white/10 overflow-hidden shadow-sm relative">
        {/* ── Left Pane: Controls ── */}
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
                Drag and drop the page thumbnails to rearrange them.
                <br /><br />
                When you're happy with the new order, click "Process & Download" to save.
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
                      <p
                        className="text-[11px] text-black/50 dark:text-white/50 truncate pr-4"
                        title={customLocationPath}
                      >
                        {customLocationPath}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Right Pane: Draggable Grid ── */}
        <div className="flex-1 bg-[#F0F0F2] dark:bg-[#1E1E1E] p-6 overflow-y-auto">
          {thumbnails.length === 0 ? (
            <div className="w-full h-full flex flex-col items-center justify-center gap-3">
              <span className="text-sm text-black/50 dark:text-white/50 animate-pulse">
                {renderProgress
                  ? `Rendering page ${renderProgress.done} of ${renderProgress.total}...`
                  : 'Loading PDF...'}
              </span>
              {renderProgress && (
                <div className="w-48 h-1.5 bg-black/10 dark:bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-cyan-500 rounded-full transition-all duration-200"
                    style={{ width: `${(renderProgress.done / renderProgress.total) * 100}%` }}
                  />
                </div>
              )}
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext items={pages.map((p) => p.id)} strategy={rectSortingStrategy}>
                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6 content-start">
                  {pages.map((page, index) => (
                    <SortableCard
                      key={page.id}
                      item={page}
                      imgSrc={thumbnails[page.originalIndex]}
                      displayNumber={index + 1}
                      onRemove={handleRemovePage}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </div>
      </div>
    );
  }
);

RearrangePdfTool.displayName = 'RearrangePdfTool';
