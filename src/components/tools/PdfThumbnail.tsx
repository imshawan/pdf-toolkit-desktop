import React, { useEffect, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';

// Note: In Vite, we can usually import the worker URL directly if configured,
// but for standard pdfjs-dist v3, this URL approach works well.
try {
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.js',
    import.meta.url
  ).toString();
} catch (e) {
  console.warn("Could not set worker URL:", e);
}

interface PdfThumbnailProps {
  pdfDoc: pdfjsLib.PDFDocumentProxy;
  pageNumber: number;
  width?: number;
  className?: string;
}

export function PdfThumbnail({ pdfDoc, pageNumber, width = 150, className = '' }: PdfThumbnailProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isRendering, setIsRendering] = useState(true);

  useEffect(() => {
    let renderTask: pdfjsLib.RenderTask | null = null;
    let isMounted = true;

    const renderPage = async () => {
      try {
        setIsRendering(true);
        const page = await pdfDoc.getPage(pageNumber);
        
        if (!isMounted || !canvasRef.current) return;
        
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Calculate scale to match desired width
        const unscaledViewport = page.getViewport({ scale: 1.0 });
        const scale = width / unscaledViewport.width;
        const viewport = page.getViewport({ scale });

        // Handle high DPI displays
        const outputScale = window.devicePixelRatio || 1;
        canvas.width = Math.floor(viewport.width * outputScale);
        canvas.height = Math.floor(viewport.height * outputScale);
        canvas.style.width = Math.floor(viewport.width) + "px";
        canvas.style.height = Math.floor(viewport.height) + "px";

        const transform = outputScale !== 1 
          ? [outputScale, 0, 0, outputScale, 0, 0] 
          : null;

        const renderContext = {
          canvasContext: ctx,
          transform: transform as any,
          viewport: viewport
        };

        renderTask = page.render(renderContext);
        await renderTask.promise;
      } catch (err: any) {
        if (err?.name === 'RenderingCancelledException') {
          // Expected when unmounting
        } else {
          console.error(`Error rendering page ${pageNumber}:`, err);
        }
      } finally {
        if (isMounted) setIsRendering(false);
      }
    };

    renderPage();

    return () => {
      isMounted = false;
      if (renderTask) {
        renderTask.cancel();
      }
    };
  }, [pdfDoc, pageNumber, width]);

  return (
    <div className={`relative flex items-center justify-center bg-white shadow-sm border border-black/10 dark:border-white/10 rounded overflow-hidden ${className}`}>
      <canvas ref={canvasRef} className="max-w-full h-auto" />
      {isRendering && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/5 dark:bg-white/5 animate-pulse">
          <span className="text-[10px] text-black/40 dark:text-white/40">Loading...</span>
        </div>
      )}
    </div>
  );
}
