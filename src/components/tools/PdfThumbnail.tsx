import React from 'react';
import * as pdfjsLib from 'pdfjs-dist';

try {
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.js',
    import.meta.url
  ).toString();
} catch (e) {
  console.warn("Could not set worker URL:", e);
}

interface PdfThumbnailProps {
  imgSrc: string;
  pageLabel: number;
}

export const PdfThumbnail = React.memo(function PdfThumbnail({ imgSrc, pageLabel }: PdfThumbnailProps) {
  return (
    <div className="relative bg-white rounded-lg overflow-hidden border border-black/10 dark:border-white/10">
      <img
        src={imgSrc}
        alt={`Page ${pageLabel}`}
        className="w-full h-auto block"
        draggable={false}
        loading="eager"
        decoding="sync"
      />
      <div className="absolute top-1.5 right-1.5 bg-black/70 text-white text-[10px] font-bold px-1.5 py-0.5 rounded pointer-events-none">
        {pageLabel}
      </div>
    </div>
  );
});

/**
 * Pre-renders all pages into Blob URLs sequentially.
 */
export async function prerenderAllPages(
  pdfDoc: pdfjsLib.PDFDocumentProxy,
  width: number = 180,
  onProgress?: (done: number, total: number) => void
): Promise<string[]> {
  const numPages = pdfDoc.numPages;
  const results: string[] = [];
  const dpr = Math.min(window.devicePixelRatio || 1, 1.5);

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d', { alpha: false })!;

  for (let i = 1; i <= numPages; i++) {
    const page = await pdfDoc.getPage(i);
    const unscaledViewport = page.getViewport({ scale: 1.0 });
    const scale = width / unscaledViewport.width;
    const viewport = page.getViewport({ scale });

    canvas.width = Math.floor(viewport.width * dpr);
    canvas.height = Math.floor(viewport.height * dpr);

    const transform = dpr !== 1 ? [dpr, 0, 0, dpr, 0, 0] : null;

    const renderTask = page.render({
      canvasContext: ctx,
      transform: transform as any,
      viewport,
    });
    await renderTask.promise;

    const blob: Blob = await new Promise((resolve) => {
      canvas.toBlob((b) => resolve(b!), 'image/png');
    });
    results.push(URL.createObjectURL(blob));

    onProgress?.(i, numPages);
    await new Promise((r) => setTimeout(r, 0));
  }

  canvas.width = 0;
  canvas.height = 0;

  return results;
}

export function revokeAllThumbnails(urls: string[]) {
  for (const url of urls) {
    URL.revokeObjectURL(url);
  }
}
