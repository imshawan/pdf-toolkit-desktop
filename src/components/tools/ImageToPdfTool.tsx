import React, { forwardRef, useImperativeHandle, useState, useEffect, useRef } from 'react';
import { Image as ImageIcon, X, Plus, Eye } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { downloadPdf, selectFolder, downloadMultiplePdfsExact } from '../../lib/pdfUtils';
import toast from 'react-hot-toast';
import { Button } from '../ui/Button';

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

export interface ImageToPdfToolRef {
  processAndDownload: () => void;
}

interface ImageToPdfToolProps {
  files: File[];
  setFiles: (files: File[]) => void;
  onProcessingChange?: (isProcessing: boolean) => void;
}

interface ImageItem {
  id: string;
  file: File;
  previewUrl: string;
  width: number;
  height: number;
}

type PageSize = 'a3' | 'a4' | 'a5' | 'letter' | 'legal' | 'tabloid' | 'fit';
type Orientation = 'portrait' | 'landscape' | 'auto';
type ImageFit = 'fit' | 'fill' | 'stretch';

// ── Sortable image card ──
const SortableImageCard = React.memo(function SortableImageCard({
  item,
  index,
  onRemove,
}: {
  item: ImageItem;
  index: number;
  onRemove: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.id });

  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : undefined,
    willChange: 'transform',
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="relative cursor-grab active:cursor-grabbing touch-none group"
    >
      <div className="bg-white dark:bg-[#2C2C2E] rounded-lg border border-black/10 dark:border-white/10 overflow-hidden">
        <img
          src={item.previewUrl}
          alt={item.file.name}
          className="w-full aspect-square object-cover pointer-events-none select-none"
          draggable={false}
          loading="eager"
        />
        <div className="px-2 py-1.5">
          <p className="text-[10px] text-black/70 dark:text-white/70 truncate font-medium">
            {item.file.name}
          </p>
          <p className="text-[9px] text-black/40 dark:text-white/40">
            {item.width}×{item.height}
          </p>
        </div>
      </div>

      {/* Page number */}
      <div className="absolute top-1.5 left-1.5 bg-black/70 text-white text-[10px] font-bold px-1.5 py-0.5 rounded pointer-events-none">
        {index + 1}
      </div>

      {/* Remove button */}
      <button
        onClick={(e) => { e.stopPropagation(); onRemove(item.id); }}
        onPointerDown={(e) => e.stopPropagation()}
        className="absolute top-1.5 right-1.5 bg-black/60 hover:bg-red-500 text-white p-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
      >
        <X size={10} />
      </button>
    </div>
  );
});

// ── Main tool ──
export const ImageToPdfTool = forwardRef<ImageToPdfToolRef, ImageToPdfToolProps>(
  ({ files, setFiles, onProcessingChange }, ref) => {
    const { t } = useTranslation();

    const [images, setImages] = useState<ImageItem[]>([]);
    const [pageSize, setPageSize] = useState<PageSize>('a4');
    const [orientation, setOrientation] = useState<Orientation>('auto');
    const [imageFit, setImageFit] = useState<ImageFit>('fit');
    const [margin, setMargin] = useState<number>(10);
    const [saveLocation, setSaveLocation] = useState<'original' | 'custom'>('original');
    const [customLocationPath, setCustomLocationPath] = useState('');
    const [outputFilename, setOutputFilename] = useState('images.pdf');
    const [showPreview, setShowPreview] = useState(false);
    const prevFileCountRef = useRef(0);

    const sensors = useSensors(
      useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
    );

    // Load images with dimensions
    useEffect(() => {
      if (files.length === 0) {
        setImages((prev) => {
          prev.forEach(img => URL.revokeObjectURL(img.previewUrl));
          return [];
        });
        return;
      }

      let isMounted = true;

      const loadImages = async () => {
        const items: ImageItem[] = [];

        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          const url = URL.createObjectURL(file);
          const dims = await getImageDimensions(url);
          if (isMounted) {
            items.push({
              id: `img-${i}-${file.name}-${file.size}`,
              file,
              previewUrl: url,
              width: dims.width,
              height: dims.height,
            });
          }
        }

        if (isMounted) {
          setImages(items);
          // Only set filename on first load
          if (prevFileCountRef.current === 0 && files.length > 0) {
            const baseName = files.length === 1
              ? files[0].name.replace(/\.[^/.]+$/, '')
              : 'images';
            setOutputFilename(`${baseName}.pdf`);
          }
          prevFileCountRef.current = files.length;
        }
      };

      loadImages();

      return () => {
        isMounted = false;
      };
    }, [files]);

    // Drag end: reorder images and sync files array
    const handleDragEnd = (event: DragEndEvent) => {
      const { active, over } = event;
      if (over && active.id !== over.id) {
        setImages((prev) => {
          const oldIdx = prev.findIndex((p) => p.id === active.id);
          const newIdx = prev.findIndex((p) => p.id === over.id);
          const newImages = arrayMove(prev, oldIdx, newIdx);
          // Sync parent files array
          setFiles(newImages.map((img) => img.file));
          return newImages;
        });
      }
    };

    const removeImage = (id: string) => {
      setImages((prev) => {
        const idx = prev.findIndex((img) => img.id === id);
        if (idx >= 0) URL.revokeObjectURL(prev[idx].previewUrl);
        const newImages = prev.filter((img) => img.id !== id);
        setFiles(newImages.map((img) => img.file));
        return newImages;
      });
    };

    const handleAddMore = () => {
      document.getElementById('img2pdf-add-more')?.click();
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
        if (images.length === 0) return;

        const loadingToast = toast.loading('Generating PDF...');
        onProcessingChange?.(true);

        try {
          const pdfBytes = await buildPdf(images, pageSize, orientation, imageFit, margin);

          let finalName = outputFilename.trim();
          if (!finalName) finalName = 'images.pdf';
          else if (!finalName.toLowerCase().endsWith('.pdf')) finalName += '.pdf';

          let result;
          if (saveLocation === 'custom' && customLocationPath) {
            result = await downloadMultiplePdfsExact(
              [{ bytes: pdfBytes, filename: finalName }],
              customLocationPath
            );
          } else {
            const firstFile = files[0] as File & { path?: string };
            result = await downloadPdf(pdfBytes, finalName, firstFile?.path || '');
          }

          if (result?.success) {
            toast.success('PDF saved successfully!', { id: loadingToast });
          } else if ((result as any)?.canceled) {
            toast.dismiss(loadingToast);
          } else {
            toast.error('Failed to save PDF', { id: loadingToast });
          }
        } catch (err) {
          console.error('Save error:', err);
          toast.error('Failed to generate PDF', { id: loadingToast });
        } finally {
          onProcessingChange?.(false);
        }
      },
    }));

    if (files.length === 0) return null;

    return (
      <div className="flex flex-row h-full w-full bg-white dark:bg-[#1C1C1E] rounded-2xl border border-black/10 dark:border-white/10 overflow-hidden shadow-sm relative">
        {/* Left Pane: Settings */}
        <div className="w-[280px] flex flex-col border-r border-black/5 dark:border-white/5 bg-[#F9F9F9] dark:bg-[#202020] shrink-0">
          <div className="p-4 border-b border-black/5 dark:border-white/5 bg-[#F5F5F7] dark:bg-[#252525]">
            <h2 className="text-[14px] font-semibold text-black dark:text-white flex items-center gap-2">
              <ImageIcon size={16} className="text-blue-500" />
              {t('tools.img2pdf', 'Image to PDF')}
            </h2>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <p className="text-[12px] text-black/60 dark:text-white/60 leading-relaxed bg-black/5 dark:bg-white/5 p-3 rounded-xl border border-black/5 dark:border-white/5">
              Drag and drop the image thumbnails on the right to reorder them. Each image becomes a page in the output PDF.
            </p>

            {/* Actions */}
            <div className="flex flex-col gap-2">
              <Button
                variant="primary"
                onClick={() => setShowPreview(true)}
                className="w-full py-2.5"
              >
                <Eye size={15} />
                Preview PDF
              </Button>
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
                placeholder="images.pdf"
                className="w-full px-3 py-2 mb-3 bg-white dark:bg-[#1C1C1E] border border-black/10 dark:border-white/10 focus:border-blue-500 focus:ring-blue-500/20 rounded-lg text-[13px] text-black dark:text-white placeholder:text-black/30 dark:placeholder:text-white/30 focus:outline-none focus:ring-4 transition-all"
              />

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
          </div>
        </div>

        {/* Right Pane: Draggable Image Grid */}
        <div className="flex-1 bg-[#F0F0F2] dark:bg-[#1E1E1E] p-6 overflow-y-auto">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={images.map((img) => img.id)} strategy={rectSortingStrategy}>
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 content-start">
                {images.map((img, index) => (
                  <SortableImageCard
                    key={img.id}
                    item={img}
                    index={index}
                    onRemove={removeImage}
                  />
                ))}

                {/* Add more card */}
                <button
                  onClick={handleAddMore}
                  className="flex flex-col items-center justify-center gap-2 w-full h-full rounded-lg border-2 border-dashed border-black/10 dark:border-white/10 hover:border-blue-400 dark:hover:border-blue-400 hover:bg-blue-500/5 transition-colors cursor-pointer"
                >
                  <Plus size={24} className="text-black/30 dark:text-white/30" />
                  <span className="text-[11px] font-medium text-black/40 dark:text-white/40">{t("tools.addImages", "Add Images")}</span>
                </button>
              </div>
            </SortableContext>
          </DndContext>

          <input
            id="img2pdf-add-more"
            type="file"
            className="hidden"
            accept="image/*"
            multiple
            onChange={(e) => {
              if (e.target.files && e.target.files.length > 0) {
                const newFiles = Array.from(e.target.files);
                setFiles([...files, ...newFiles]);
              }
              e.target.value = '';
            }}
          />
        </div>

        {/* ── Preview Overlay ── */}
        {showPreview && (
          <div className="absolute inset-0 z-50 flex bg-white dark:bg-[#1C1C1E] rounded-2xl overflow-hidden">
            {/* Preview Settings Sidebar */}
            <div className="w-[260px] flex flex-col border-r border-black/5 dark:border-white/5 bg-[#F9F9F9] dark:bg-[#202020] shrink-0">
              <div className="p-4 border-b border-black/5 dark:border-white/5 bg-[#F5F5F7] dark:bg-[#252525] flex items-center justify-between">
                <h2 className="text-[14px] font-semibold text-black dark:text-white">{t("tools.pdfSettings", "PDF Settings")}</h2>
                <button
                  onClick={() => setShowPreview(false)}
                  className="flex items-center justify-center w-7 h-7 rounded-full bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
                >
                  <X size={14} className="text-black/60 dark:text-white/60" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {/* Page Size */}
                <div>
                  <label className="block text-[12px] font-medium text-black/70 dark:text-white/70 mb-1.5">
                    Page Size
                  </label>
                  <select
                    value={pageSize}
                    onChange={(e) => setPageSize(e.target.value as PageSize)}
                    className="w-full px-3 py-2 bg-white dark:bg-[#1C1C1E] border border-black/10 dark:border-white/10 rounded-lg text-[13px] text-black dark:text-white focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all"
                  >
                    <option value="a3">A3 (297 × 420 mm)</option>
                    <option value="a4">A4 (210 × 297 mm)</option>
                    <option value="a5">A5 (148 × 210 mm)</option>
                    <option value="letter">Letter (8.5 × 11 in)</option>
                    <option value="legal">Legal (8.5 × 14 in)</option>
                    <option value="tabloid">Tabloid (11 × 17 in)</option>
                    <option value="fit">Fit to Image</option>
                  </select>
                </div>

                {/* Orientation */}
                {pageSize !== 'fit' && (
                  <div>
                    <label className="block text-[12px] font-medium text-black/70 dark:text-white/70 mb-1.5">
                      Orientation
                    </label>
                    <select
                      value={orientation}
                      onChange={(e) => setOrientation(e.target.value as Orientation)}
                      className="w-full px-3 py-2 bg-white dark:bg-[#1C1C1E] border border-black/10 dark:border-white/10 rounded-lg text-[13px] text-black dark:text-white focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all"
                    >
                      <option value="auto">Auto (match image)</option>
                      <option value="portrait">Portrait</option>
                      <option value="landscape">Landscape</option>
                    </select>
                  </div>
                )}

                {/* Image Fit */}
                {pageSize !== 'fit' && (
                  <div>
                    <label className="block text-[12px] font-medium text-black/70 dark:text-white/70 mb-1.5">
                      Image Fit
                    </label>
                    <select
                      value={imageFit}
                      onChange={(e) => setImageFit(e.target.value as ImageFit)}
                      className="w-full px-3 py-2 bg-white dark:bg-[#1C1C1E] border border-black/10 dark:border-white/10 rounded-lg text-[13px] text-black dark:text-white focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all"
                    >
                      <option value="fit">Fit (keep aspect ratio)</option>
                      <option value="fill">Fill (crop to fill)</option>
                      <option value="stretch">Stretch (distort)</option>
                    </select>
                  </div>
                )}

                {/* Margin */}
                {pageSize !== 'fit' && (
                  <div>
                    <label className="block text-[12px] font-medium text-black/70 dark:text-white/70 mb-1.5">
                      Margin: {margin}mm
                    </label>
                    <input
                      type="range"
                      min={0}
                      max={40}
                      step={2}
                      value={margin}
                      onChange={(e) => setMargin(Number(e.target.value))}
                      className="w-full accent-blue-500"
                    />
                  </div>
                )}
              </div>

              <div className="p-4 border-t border-black/5 dark:border-white/5">
                <Button
                  variant="primary"
                  onClick={() => setShowPreview(false)}
                  className="w-full py-2.5"
                >
                  Done
                </Button>
              </div>
            </div>

            {/* CSS-based Instant Preview */}
            <div className="flex-1 bg-black/5 dark:bg-black/20 p-8 overflow-y-auto flex flex-col items-center space-y-8">
              {images.map((img, index) => {
                const isLandscape = orientation === 'landscape' || (orientation === 'auto' && img.width > img.height);
                
                let ratioStr = 'auto';
                let widthMm = 210;
                let heightMm = 297;

                if (pageSize === 'a3') {
                  ratioStr = isLandscape ? '420 / 297' : '297 / 420';
                  widthMm = isLandscape ? 420 : 297;
                  heightMm = isLandscape ? 297 : 420;
                } else if (pageSize === 'a4') {
                  ratioStr = isLandscape ? '297 / 210' : '210 / 297';
                  widthMm = isLandscape ? 297 : 210;
                  heightMm = isLandscape ? 210 : 297;
                } else if (pageSize === 'a5') {
                  ratioStr = isLandscape ? '210 / 148' : '148 / 210';
                  widthMm = isLandscape ? 210 : 148;
                  heightMm = isLandscape ? 148 : 210;
                } else if (pageSize === 'letter') {
                  ratioStr = isLandscape ? '11 / 8.5' : '8.5 / 11';
                  widthMm = isLandscape ? 279.4 : 215.9;
                  heightMm = isLandscape ? 215.9 : 279.4;
                } else if (pageSize === 'legal') {
                  ratioStr = isLandscape ? '14 / 8.5' : '8.5 / 14';
                  widthMm = isLandscape ? 355.6 : 215.9;
                  heightMm = isLandscape ? 215.9 : 355.6;
                } else if (pageSize === 'tabloid') {
                  ratioStr = isLandscape ? '17 / 11' : '11 / 17';
                  widthMm = isLandscape ? 431.8 : 279.4;
                  heightMm = isLandscape ? 279.4 : 431.8;
                } else {
                  ratioStr = `${img.width} / ${img.height}`;
                }

                const marginX = pageSize === 'fit' ? 0 : (margin / widthMm) * 100;
                const marginY = pageSize === 'fit' ? 0 : (margin / heightMm) * 100;
                
                let fitClass = 'object-contain';
                if (pageSize !== 'fit') {
                  if (imageFit === 'fill') fitClass = 'object-cover';
                  else if (imageFit === 'stretch') fitClass = 'object-fill';
                }

                return (
                  <div 
                    key={img.id}
                    className="bg-white shadow-xl flex-shrink-0 relative overflow-hidden ring-1 ring-black/5"
                    style={{ 
                      width: '100%',
                      maxWidth: isLandscape ? '800px' : '500px',
                      aspectRatio: ratioStr
                    }}
                  >
                    <div 
                      className="absolute flex items-center justify-center"
                      style={{
                        top: `${marginY}%`,
                        bottom: `${marginY}%`,
                        left: `${marginX}%`,
                        right: `${marginX}%`
                      }}
                    >
                      <img 
                        src={img.previewUrl} 
                        alt="" 
                        className={`w-full h-full ${fitClass}`}
                        draggable={false}
                      />
                    </div>
                    <div className="absolute top-2 left-2 bg-black/50 text-white text-[10px] font-bold px-1.5 py-0.5 rounded pointer-events-none">
                      {index + 1}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  }
);

ImageToPdfTool.displayName = 'ImageToPdfTool';

// ── Helpers ──

function getImageDimensions(url: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => resolve({ width: 100, height: 100 });
    img.src = url;
  });
}

async function buildPdf(
  images: ImageItem[],
  pageSize: PageSize,
  orientation: Orientation,
  imageFit: ImageFit,
  marginMm: number
): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    try {
      const worker = new Worker(new URL('../../lib/img2pdfWorker.ts', import.meta.url), { type: 'module' });
      
      worker.onmessage = (e) => {
        if (e.data.success) {
          resolve(e.data.pdfBytes);
        } else {
          reject(new Error(e.data.error));
        }
        worker.terminate();
      };

      worker.onerror = (err) => {
        reject(err);
        worker.terminate();
      };

      const payloadImages = images.map(img => ({
        file: img.file,
        width: img.width,
        height: img.height,
      }));

      worker.postMessage({
        images: payloadImages,
        pageSize,
        orientation,
        imageFit,
        marginMm
      });
    } catch (err) {
      reject(err);
    }
  });
}
