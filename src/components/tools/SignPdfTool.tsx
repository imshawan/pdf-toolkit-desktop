import { useState, useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import { PenTool, Upload, Trash2, ChevronLeft, ChevronRight, Check, ZoomIn, ZoomOut } from 'lucide-react';
import toast from 'react-hot-toast';
import { signPdf, OverlayData, downloadPdf } from '../../lib/pdfUtils';
import * as pdfjsLib from 'pdfjs-dist';
import { Rnd } from 'react-rnd';
import { Button } from '../ui/Button';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { rasterizeTextToDataURL } from '@/lib/imageUtils';

export interface SignPdfToolRef {
  processAndDownload: () => Promise<void>;
  hasValidInput: () => boolean;
}

interface SignPdfToolProps {
  files: File[];
  onProcessingChange?: (isProcessing: boolean) => void;
}

interface SavedSignature {
  id: string;
  type: 'text' | 'image';
  content: string;
  fontFamily?: string;
  color?: string;
}

export const SignPdfTool = forwardRef<SignPdfToolRef, SignPdfToolProps>(({ files, onProcessingChange }, ref) => {
  const { t } = useTranslation();
  
  const [overlays, setOverlays] = useState<OverlayData[]>([]);
  const [savedSignatures, setSavedSignatures] = useState<SavedSignature[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [numPages, setNumPages] = useState(1);
  
  const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const renderTaskRef = useRef<any>(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [resizeTrigger, setResizeTrigger] = useState(0);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('pdf-toolkit-saved-signatures');
      if (saved) {
        setSavedSignatures(JSON.parse(saved));
      }
    } catch (e) {}
  }, []);

  const saveSignatureToStorage = (sig: SavedSignature) => {
    setSavedSignatures(prev => {
      // Avoid exact duplicates
      const filtered = prev.filter(p => p.content !== sig.content);
      const updated = [sig, ...filtered].slice(0, 5); // Keep last 5
      localStorage.setItem('pdf-toolkit-saved-signatures', JSON.stringify(updated));
      return updated;
    });
  };

  const removeSavedSignature = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSavedSignatures(prev => {
      const updated = prev.filter(s => s.id !== id);
      localStorage.setItem('pdf-toolkit-saved-signatures', JSON.stringify(updated));
      return updated;
    });
  };
  
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [signatureMode, setSignatureMode] = useState<'draw' | 'type' | 'upload'>('draw');
  
  // Drawing state
  const sigCanvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  
  // Typing state
  const [typedName, setTypedName] = useState('');
  const [selectedFont, setSelectedFont] = useState('Caveat');
  
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  
  const getCenterViewportPercentages = () => {
    if (!scrollContainerRef.current || !canvasRef.current) return { xPercent: 0.1, yPercent: 0.1 };
    
    const scrollContainer = scrollContainerRef.current;
    const canvas = canvasRef.current;
    
    const scrollRect = scrollContainer.getBoundingClientRect();
    const canvasRect = canvas.getBoundingClientRect();
    
    // Center of the visible scroll area in global coordinates
    const globalCenterX = scrollRect.left + (scrollRect.width / 2);
    const globalCenterY = scrollRect.top + (scrollRect.height / 2);
    
    // Map global center to canvas-relative coordinates
    const canvasX = globalCenterX - canvasRect.left;
    const canvasY = globalCenterY - canvasRect.top;
    
    // Convert to percentages
    let xPercent = canvasX / canvasRect.width;
    let yPercent = canvasY / canvasRect.height;
    
    // Offset by half the default overlay size so the overlay is perfectly centered
    xPercent -= (0.3 / 2); // default width is roughly 0.3 or 0.4
    yPercent -= (0.1 / 2); // default height is roughly 0.1
    
    // Clamp between 0 and 0.8 (so it doesn't fall off the edge)
    xPercent = Math.max(0, Math.min(xPercent, 0.8));
    yPercent = Math.max(0, Math.min(yPercent, 0.8));
    
    return { xPercent, yPercent };
  };
  
  const fonts = [
    { name: 'Caveat', url: '/fonts/Caveat.ttf' },
    { name: 'Dancing Script', url: '/fonts/DancingScript.ttf' },
    { name: 'Pacifico', url: '/fonts/Pacifico.ttf' },
    { name: 'Mr De Haviland', url: '/fonts/MrDeHaviland.ttf' },
    { name: 'Great Vibes', url: '/fonts/GreatVibes.ttf' },
    { name: 'Allura', url: '/fonts/Allura.ttf' },
    { name: 'Alex Brush', url: '/fonts/AlexBrush.ttf' },
    { name: 'Sacramento', url: '/fonts/Sacramento.ttf' }
  ];

  // Load PDF
  useEffect(() => {
    if (files.length > 0) {
      const loadPdf = async () => {
        const arrayBuffer = await files[0].arrayBuffer();
        const doc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        setPdfDoc(doc);
        setNumPages(doc.numPages);
        setCurrentPage(1);
        setZoomLevel(1);
      };
      loadPdf();
    } else {
      setPdfDoc(null);
      setNumPages(1);
      setOverlays([]);
      setZoomLevel(1);
    }
  }, [files]);

  // Render PDF Page
  useEffect(() => {
    if (!pdfDoc || !canvasRef.current || !containerRef.current) return;
    
    let isMounted = true;
    
    const renderPage = async () => {
      const page = await pdfDoc.getPage(currentPage);
      const canvas = canvasRef.current!;
      const ctx = canvas.getContext('2d')!;
      
      // p-8 padding is 32px * 2 = 64px horizontal space taken. We subtract 80px for a safe margin.
      const containerWidth = Math.max(200, containerRef.current!.clientWidth - 80);
      const unscaledViewport = page.getViewport({ scale: 1.0 });
      const baseScale = Math.min(containerWidth / unscaledViewport.width, 1.5);
      const scale = baseScale * zoomLevel;
      
      const viewport = page.getViewport({ scale });
      
      // Update canvas dimensions
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      
      // Render PDF page into canvas context
      const renderContext = {
        canvasContext: ctx,
        viewport: viewport
      };
      
      if (renderTaskRef.current) {
        try {
          renderTaskRef.current.cancel();
        } catch (e) {}
      }

      const renderTask = page.render(renderContext);
      renderTaskRef.current = renderTask;
      
      try {
        await renderTask.promise;
        if (isMounted && canvasRef.current) {
          setDimensions({ 
            width: canvasRef.current.clientWidth, 
            height: canvasRef.current.clientHeight 
          });
        }
      } catch (err: any) {
        if (err.name !== 'RenderingCancelledException' && isMounted) {
          console.error('Error rendering page:', err);
        }
      }
    };
    
    renderPage();
    
    // Handle window resize cleanly
    let resizeTimer: any;
    const handleResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        setResizeTrigger(prev => prev + 1);
      }, 100);
    };
    window.addEventListener('resize', handleResize);
    
    return () => { 
      isMounted = false; 
      clearTimeout(resizeTimer);
      window.removeEventListener('resize', handleResize);
    };
  }, [pdfDoc, currentPage, zoomLevel, resizeTrigger]);

  // Handle pinch-to-zoom / Ctrl+Scroll
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    
    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault(); // Prevent native browser page zoom
        
        // Scale proportionally by deltaY for native trackpad and mouse wheel feel
        const zoomFactor = e.deltaY * -0.005;
        const step = Math.max(-0.15, Math.min(0.15, zoomFactor));
        
        setZoomLevel(z => {
          const newZoom = z + step;
          return Math.max(0.5, Math.min(3.0, newZoom));
        });
      }
    };
    
    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, []);

  const hasValidInput = () => files.length > 0 && overlays.length > 0;

  useImperativeHandle(ref, () => ({
    hasValidInput,
    processAndDownload: async () => {
      if (!hasValidInput()) {
        toast.error('Please add at least one signature or text overlay');
        return;
      }

      try {
        onProcessingChange?.(true);
        toast.loading('Applying signatures...', { id: 'sign' });

        const arrayBuffer = await files[0].arrayBuffer();
        
        // Fetch raw TTF bytes for typed signatures
        const finalOverlays = await Promise.all(overlays.map(async (overlay) => {
          if (overlay.type === 'text') {
            const dataUrl = rasterizeTextToDataURL(overlay.content, overlay.fontFamily || 'Helvetica', overlay.color || '#000000');
            return {
              ...overlay,
              type: 'image' as const,
              content: dataUrl,
              fontBytes: undefined
            };
          }
          return overlay;
        }));

        const signedBytes = await signPdf(arrayBuffer, finalOverlays);
        
        const baseName = files[0].name.replace(/\.[^/.]+$/, '');
        const outName = `${baseName}_signed.pdf`;
        
        const result = await downloadPdf(signedBytes, outName, (files[0] as any).path || '');
        if (result?.success) {
          toast.success(`Saved ${outName}`, { id: 'sign' });
        } else if ((result as any)?.canceled) {
          toast.dismiss('sign');
        } else {
          toast.error('Failed to save file', { id: 'sign' });
        }

      } catch (err: any) {
        console.error('Signing error:', err);
        toast.error(err.message || 'Failed to sign document', { id: 'sign' });
      } finally {
        onProcessingChange?.(false);
      }
    }
  }));

  // Drawing Canvas Handlers
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    const canvas = sigCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    
    ctx.beginPath();
    ctx.moveTo(clientX - rect.left, clientY - rect.top);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = sigCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#000000';
    
    ctx.lineTo(clientX - rect.left, clientY - rect.top);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearSignature = () => {
    const canvas = sigCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx?.clearRect(0, 0, canvas.width, canvas.height);
  };

  // Add Overlays
  const handleAddDrawnSignature = () => {
    const canvas = sigCanvasRef.current;
    if (!canvas) return;
    
    // Check if empty
    const ctx = canvas.getContext('2d');
    const pixelBuffer = new Uint32Array(ctx!.getImageData(0, 0, canvas.width, canvas.height).data.buffer);
    if (!pixelBuffer.some(color => color !== 0)) {
      toast.error('Please draw a signature first');
      return;
    }

    const dataUrl = canvas.toDataURL('image/png');
    const { xPercent, yPercent } = getCenterViewportPercentages();
    
    addOverlay({
      id: Math.random().toString(36).substr(2, 9),
      type: 'image',
      content: dataUrl,
      xPercent,
      yPercent,
      widthPercent: 0.3,
      heightPercent: 0.1,
      pageIndex: currentPage
    });
    saveSignatureToStorage({ id: Math.random().toString(), type: 'image', content: dataUrl });
    setShowSignatureModal(false);
  };

  const handleAddTypedSignature = () => {
    if (!typedName.trim()) {
      toast.error('Please type your signature');
      return;
    }
    
    const { xPercent, yPercent } = getCenterViewportPercentages();
    
    addOverlay({
      id: Math.random().toString(36).substr(2, 9),
      type: 'text',
      content: typedName,
      fontFamily: selectedFont,
      fontSize: 48,
      color: '#000000',
      xPercent,
      yPercent,
      widthPercent: 0.4,
      heightPercent: 0.05,
      pageIndex: currentPage
    });
    saveSignatureToStorage({ id: Math.random().toString(), type: 'text', content: typedName, fontFamily: selectedFont, color: '#000000' });
    setShowSignatureModal(false);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const { xPercent, yPercent } = getCenterViewportPercentages();
      const content = event.target?.result as string;
      addOverlay({
        id: Math.random().toString(36).substr(2, 9),
        type: 'image',
        content,
        xPercent,
        yPercent,
        widthPercent: 0.3,
        heightPercent: 0.1,
        pageIndex: currentPage
      });
      saveSignatureToStorage({ id: Math.random().toString(), type: 'image', content });
      setShowSignatureModal(false);
    };
    reader.readAsDataURL(file);
  };

  const handleAddSavedSignature = (sig: SavedSignature) => {
    const { xPercent, yPercent } = getCenterViewportPercentages();
    addOverlay({
      id: Math.random().toString(36).substr(2, 9),
      type: sig.type,
      content: sig.content,
      fontFamily: sig.fontFamily,
      fontSize: 48,
      color: sig.color || '#000000',
      xPercent,
      yPercent,
      widthPercent: sig.type === 'text' ? 0.4 : 0.3,
      heightPercent: sig.type === 'text' ? 0.05 : 0.1,
      pageIndex: currentPage
    });
  };

  const addOverlay = (overlay: OverlayData) => {
    setOverlays(prev => [...prev, overlay]);
  };

  const removeOverlay = (id: string) => {
    setOverlays(prev => prev.filter(o => o.id !== id));
  };

  // Draggable Logic handled by react-rnd

  return (
    <div className="flex flex-row h-full w-full bg-white dark:bg-[#1C1C1E] rounded-2xl border border-black/10 dark:border-white/10 overflow-hidden shadow-sm relative">
      
      {/* Left Pane: Controls */}
      <div className="w-[300px] flex flex-col border-r border-black/5 dark:border-white/5 bg-[#F9F9F9] dark:bg-[#202020] shrink-0">
        <div className="p-4 border-b border-black/5 dark:border-white/5 bg-[#F5F5F7] dark:bg-[#252525]">
          <h2 className="text-[14px] font-semibold text-black dark:text-white flex items-center gap-2">
            <PenTool size={16} className="text-blue-500" />
            Sign PDF
          </h2>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4">
          <Button
            variant="primary"
            onClick={() => setShowSignatureModal(true)}
            className="w-full py-2.5 mb-6"
          >
            <PenTool size={16} />
            Create Signature
          </Button>

          {savedSignatures.length > 0 && (
            <div className="mb-6">
              <h3 className="text-[11px] font-bold text-black/40 dark:text-white/40 uppercase tracking-wider mb-3">
                Recent Signatures
              </h3>
              <div className="space-y-2">
                <AnimatePresence>
                {savedSignatures.map((sig) => (
                  <motion.div 
                    key={sig.id} 
                    initial={{ opacity: 0, height: 0, scale: 0.9 }}
                    animate={{ opacity: 1, height: 'auto', scale: 1 }}
                    exit={{ opacity: 0, height: 0, scale: 0.9 }}
                    transition={{ duration: 0.2 }}
                    className="relative group mb-2"
                  >
                    <button
                      onClick={() => handleAddSavedSignature(sig)}
                      className="w-full h-16 bg-white dark:bg-[#2C2C2E] border border-black/5 dark:border-white/5 rounded-xl flex items-center justify-center shadow-sm hover:border-blue-500 hover:shadow-md transition-all overflow-hidden p-2 relative"
                    >
                      {sig.type === 'image' ? (
                        <img src={sig.content} className="max-w-full max-h-full object-contain pointer-events-none" alt="Saved Signature" />
                      ) : (
                        <span className="text-xl text-black truncate pointer-events-none" style={{ fontFamily: sig.fontFamily, color: sig.color }}>
                          {sig.content}
                        </span>
                      )}
                      <div className="absolute inset-0 bg-blue-500/0 hover:bg-blue-500/5 transition-colors" />
                    </button>
                    <button 
                      onClick={(e) => removeSavedSignature(sig.id, e)}
                      className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm z-10 hover:bg-red-600 focus:outline-none"
                    >
                      <Trash2 size={12} />
                    </button>
                  </motion.div>
                ))}
                </AnimatePresence>
              </div>
            </div>
          )}

          <h3 className="text-[11px] font-bold text-black/40 dark:text-white/40 uppercase tracking-wider mb-3">
            Active Elements
          </h3>
          
          {overlays.length === 0 ? (
            <div className="p-4 border border-dashed border-black/10 dark:border-white/10 rounded-xl bg-black/[0.02] dark:bg-white/[0.02] text-center">
              <p className="text-[13px] text-black/50 dark:text-white/50">{t("tools.noSignatures", "No signatures added yet.")}</p>
            </div>
          ) : (
            <div className="space-y-2">
              <AnimatePresence>
              {overlays.map((overlay) => (
                <motion.div 
                  key={overlay.id} 
                  initial={{ opacity: 0, height: 0, scale: 0.9 }}
                  animate={{ opacity: 1, height: 'auto', scale: 1 }}
                  exit={{ opacity: 0, height: 0, scale: 0.9 }}
                  transition={{ duration: 0.2 }}
                  className="flex items-center justify-between p-3 bg-white dark:bg-[#2C2C2E] border border-black/5 dark:border-white/5 rounded-xl shadow-sm mb-2"
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div className="w-6 h-6 rounded-md bg-black/5 dark:bg-white/5 flex items-center justify-center shrink-0">
                      <span className="text-[10px] font-bold text-black/50 dark:text-white/50">Pg {overlay.pageIndex}</span>
                    </div>
                    <span className="text-[13px] font-medium text-black/80 dark:text-white/80 truncate">
                      {overlay.type === 'text' ? overlay.content : 'Image Signature'}
                    </span>
                  </div>
                  <button onClick={() => removeOverlay(overlay.id)} className="text-black/40 hover:text-red-500 transition-colors p-1">
                    <Trash2 size={14} />
                  </button>
                </motion.div>
              ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>

      {/* Right Pane: Interactive PDF Canvas */}
      <div className="flex-1 bg-black/5 dark:bg-black/20 relative flex flex-col overflow-hidden" ref={containerRef}>
        
        {/* Toolbar */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-4 bg-white/90 dark:bg-[#252525]/90 backdrop-blur-md px-4 py-2 rounded-full shadow-lg border border-black/10 dark:border-white/10">
          <div className="flex items-center gap-1 border-r border-black/10 dark:border-white/10 pr-4">
            <button 
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1 text-black/60 hover:text-black disabled:opacity-30 dark:text-white/60 dark:hover:text-white transition-colors"
            >
              <ChevronLeft size={20} />
            </button>
            <span className="text-[13px] font-medium text-black/80 dark:text-white/80 min-w-[60px] text-center">
              Pg {currentPage} / {numPages}
            </span>
            <button 
              onClick={() => setCurrentPage(p => Math.min(numPages, p + 1))}
              disabled={currentPage === numPages}
              className="p-1 text-black/60 hover:text-black disabled:opacity-30 dark:text-white/60 dark:hover:text-white transition-colors"
            >
              <ChevronRight size={20} />
            </button>
          </div>
          
          <div className="flex items-center gap-2 pl-2">
            <button 
              onClick={() => setZoomLevel(z => Math.max(0.5, z - 0.25))}
              className="p-1 text-black/60 hover:text-black dark:text-white/60 dark:hover:text-white transition-colors"
            >
              <ZoomOut size={18} />
            </button>
            <span className="text-[12px] font-medium text-black/60 dark:text-white/60 min-w-[40px] text-center">
              {Math.round(zoomLevel * 100)}%
            </span>
            <button 
              onClick={() => setZoomLevel(z => Math.min(3.0, z + 0.25))}
              className="p-1 text-black/60 hover:text-black dark:text-white/60 dark:hover:text-white transition-colors"
            >
              <ZoomIn size={18} />
            </button>
          </div>
        </div>

        <div ref={scrollContainerRef} className="flex-1 overflow-auto p-8 flex justify-center items-start">
          {pdfDoc ? (
            <div className="relative shadow-xl bg-white select-none">
              <canvas ref={canvasRef} className="block" />
              
              {/* Overlays for Current Page */}
              {dimensions.width > 0 && overlays.filter(o => o.pageIndex === currentPage).map(overlay => (
                <Rnd
                  key={overlay.id}
                  bounds="parent"
                  position={{
                    x: overlay.xPercent * dimensions.width,
                    y: overlay.yPercent * dimensions.height
                  }}
                  size={{
                    width: overlay.widthPercent * dimensions.width,
                    height: overlay.heightPercent * dimensions.height
                  }}
                  onDrag={(e, d) => {
                    setOverlays(prev => prev.map(o => o.id === overlay.id ? { ...o, xPercent: d.x / dimensions.width, yPercent: d.y / dimensions.height } : o));
                  }}
                  onDragStop={(e, d) => {
                    setOverlays(prev => prev.map(o => o.id === overlay.id ? { ...o, xPercent: d.x / dimensions.width, yPercent: d.y / dimensions.height } : o));
                  }}
                  onResize={(e, direction, ref, delta, position) => {
                    setOverlays(prev => prev.map(o => o.id === overlay.id ? {
                      ...o,
                      widthPercent: parseFloat(ref.style.width) / dimensions.width,
                      heightPercent: parseFloat(ref.style.height) / dimensions.height,
                      xPercent: position.x / dimensions.width,
                      yPercent: position.y / dimensions.height
                    } : o));
                  }}
                  onResizeStop={(e, direction, ref, delta, position) => {
                    setOverlays(prev => prev.map(o => o.id === overlay.id ? {
                      ...o,
                      widthPercent: parseFloat(ref.style.width) / dimensions.width,
                      heightPercent: parseFloat(ref.style.height) / dimensions.height,
                      xPercent: position.x / dimensions.width,
                      yPercent: position.y / dimensions.height
                    } : o));
                  }}
                  className="group border-2 border-transparent hover:border-blue-500 transition-colors z-30 flex items-center justify-center cursor-move"
                >
                  <div className="w-full h-full relative flex items-center justify-center">
                    {overlay.type === 'image' ? (
                      <img src={overlay.content} className="w-full h-full pointer-events-none drop-shadow-sm object-contain" alt="Signature" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center pointer-events-none drop-shadow-sm overflow-visible">
                        {overlay.content ? (
                           <img 
                             src={rasterizeTextToDataURL(overlay.content, overlay.fontFamily || 'Helvetica', overlay.color || '#000000')} 
                             className="w-full h-full object-contain pointer-events-none drop-shadow-sm" 
                             alt="Text Watermark" 
                           />
                        ) : null}
                      </div>
                    )}
                    <button 
                      onClick={(e) => { e.stopPropagation(); removeOverlay(overlay.id); }}
                      className="absolute -top-3 -right-3 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-md pointer-events-auto"
                      onMouseDown={e => e.stopPropagation()}
                      onTouchStart={e => e.stopPropagation()}
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </Rnd>
              ))}
            </div>
          ) : (
            <div className="m-auto text-sm text-black/50 dark:text-white/50 animate-pulse">{t("tools.loadingDocument", "Loading document...")}</div>
          )}
        </div>
      </div>

      {/* Signature Modal */}
      <AnimatePresence>
        {showSignatureModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="absolute inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 10, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.95, y: 10, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className="bg-white dark:bg-[#252525] w-full max-w-lg h-[500px] rounded-2xl shadow-2xl overflow-hidden border border-black/10 dark:border-white/10 flex flex-col"
            >
              <div className="flex p-2 bg-[#F5F5F7] dark:bg-[#1E1E1E] border-b border-black/5 dark:border-white/5 gap-2 shrink-0">
              <button
                onClick={() => setSignatureMode('draw')}
                className={`flex-1 py-2 text-[13px] font-semibold rounded-lg transition-all ${signatureMode === 'draw' ? 'bg-white dark:bg-[#2C2C2E] shadow-sm text-blue-500' : 'text-black/60 dark:text-white/60 hover:bg-black/5 dark:hover:bg-white/5'}`}
              >
                Draw
              </button>
              <button
                onClick={() => setSignatureMode('type')}
                className={`flex-1 py-2 text-[13px] font-semibold rounded-lg transition-all ${signatureMode === 'type' ? 'bg-white dark:bg-[#2C2C2E] shadow-sm text-blue-500' : 'text-black/60 dark:text-white/60 hover:bg-black/5 dark:hover:bg-white/5'}`}
              >
                Type
              </button>
              <button
                onClick={() => setSignatureMode('upload')}
                className={`flex-1 py-2 text-[13px] font-semibold rounded-lg transition-all ${signatureMode === 'upload' ? 'bg-white dark:bg-[#2C2C2E] shadow-sm text-blue-500' : 'text-black/60 dark:text-white/60 hover:bg-black/5 dark:hover:bg-white/5'}`}
              >
                Upload
              </button>
            </div>
            
            <div className="p-6 flex-1 flex flex-col min-h-0 overflow-hidden">
              {signatureMode === 'draw' && (
                <>
                  <div className="flex-1 bg-[#F9F9F9] dark:bg-[#1E1E1E] rounded-xl border border-black/10 dark:border-white/10 overflow-hidden relative min-h-0">
                    <canvas
                      ref={sigCanvasRef}
                      width={450}
                      height={300}
                      className="w-full h-full cursor-crosshair touch-none"
                      onMouseDown={startDrawing}
                      onMouseMove={draw}
                      onMouseUp={stopDrawing}
                      onMouseOut={stopDrawing}
                      onTouchStart={startDrawing}
                      onTouchMove={draw}
                      onTouchEnd={stopDrawing}
                    />
                    <div className="absolute bottom-4 left-4 right-4 flex justify-between items-center pointer-events-none">
                      <span className="text-[11px] font-medium text-black/30 dark:text-white/30 uppercase tracking-wider">{t("tools.drawHere", "Draw here")}</span>
                      <button onClick={(e) => { e.stopPropagation(); clearSignature(); }} className="text-[11px] font-semibold text-black/50 dark:text-white/50 hover:text-red-500 pointer-events-auto bg-white/80 dark:bg-black/80 px-2 py-1 rounded">{t("tools.clear", "Clear")}</button>
                    </div>
                  </div>
                </>
              )}
              
              {signatureMode === 'type' && (
                <div className="flex-1 flex flex-col min-h-0 space-y-5">
                  <div className="shrink-0">
                    <label className="block text-[12px] font-medium text-black/60 dark:text-white/60 mb-2">{t("tools.yourName", "Your Name")}</label>
                    <input 
                      type="text" 
                      value={typedName}
                      onChange={(e) => setTypedName(e.target.value)}
                      placeholder="Jane Doe"
                      className="w-full px-4 py-3 bg-[#F9F9F9] dark:bg-[#1C1C1E] border border-black/10 dark:border-white/10 rounded-xl text-lg text-black dark:text-white placeholder-black/30 dark:placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                    />
                  </div>
                  <div className="flex-1 flex flex-col min-h-0">
                    <label className="block text-[12px] font-medium text-black/60 dark:text-white/60 mb-2 shrink-0">{t("tools.selectStyle", "Select Style")}</label>
                    <div className="grid grid-cols-1 gap-2 overflow-y-auto flex-1 pr-2 pb-2">
                      {fonts.map(f => (
                        <button
                          key={f.name}
                          onClick={() => setSelectedFont(f.name)}
                          className={`flex items-center justify-between p-4 rounded-xl border transition-all shrink-0 ${selectedFont === f.name ? 'border-blue-500 bg-blue-50 dark:bg-blue-500/10' : 'border-black/10 dark:border-white/10 bg-[#F9F9F9] dark:bg-[#1C1C1E] hover:border-black/20 dark:hover:border-white/20'}`}
                        >
                          <span style={{ fontFamily: f.name }} className="text-2xl text-black dark:text-white truncate">
                            {typedName || 'Signature Preview'}
                          </span>
                          {selectedFont === f.name && <Check size={16} className="text-blue-500 shrink-0" />}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {signatureMode === 'upload' && (
                <div className="flex-1 flex flex-col items-center justify-center min-h-0 border-2 border-dashed border-black/10 dark:border-white/10 rounded-xl bg-[#F9F9F9] dark:bg-[#1E1E1E] hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer" onClick={() => document.getElementById('sig-upload')?.click()}>
                  <Upload size={32} className="text-black/30 dark:text-white/30 mb-3" />
                  <span className="text-[14px] font-medium text-black/70 dark:text-white/70">{t('common.clickToUpload', 'Click to upload image')}</span>
                  <span className="text-[12px] text-black/40 dark:text-white/40 mt-1">{t("tools.pngJpegFormat", "PNG or JPEG format")}</span>
                  <input id="sig-upload" type="file" className="hidden" accept=".png,.jpg,.jpeg" onChange={handleFileUpload} />
                </div>
              )}
            </div>

            <div className="p-4 border-t border-black/5 dark:border-white/5 bg-[#F5F5F7] dark:bg-[#1E1E1E] flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setShowSignatureModal(false)} className="py-2 px-5">
                Cancel
              </Button>
              {signatureMode !== 'upload' && (
                <Button 
                  variant="primary"
                  onClick={signatureMode === 'draw' ? handleAddDrawnSignature : handleAddTypedSignature}
                  className="py-2 px-6"
                >
                  Add Signature
                </Button>
              )}
            </div>
          </motion.div>
        </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
});

SignPdfTool.displayName = 'SignPdfTool';
