import jsPDF from 'jspdf';

// Define the payload structure
export interface BuildPdfPayload {
  images: { file: File; width: number; height: number }[];
  pageSize: 'a3' | 'a4' | 'a5' | 'letter' | 'legal' | 'tabloid' | 'fit';
  orientation: 'portrait' | 'landscape' | 'auto';
  imageFit: 'fit' | 'fill' | 'stretch';
  marginMm: number;
}

// Listen for messages from the main thread
self.onmessage = async (e: MessageEvent<BuildPdfPayload>) => {
  try {
    const { images, pageSize, orientation, imageFit, marginMm } = e.data;
    
    // We build the PDF page-by-page
    let doc: jsPDF | null = null;

    for (let i = 0; i < images.length; i++) {
      const img = images[i];
      const dataUrl = await readFileAsDataUrl(img.file);
      const format = getImageFormat(img.file);
      const imgAspect = img.width / img.height;

      if (pageSize === 'fit') {
        const pxToMm = 25.4 / 96;
        const pageW = img.width * pxToMm;
        const pageH = img.height * pxToMm;

        if (i === 0) {
          doc = new jsPDF({ unit: 'mm', format: [pageW, pageH] });
        } else {
          doc!.addPage([pageW, pageH]);
        }
        doc!.addImage(dataUrl, format, 0, 0, pageW, pageH);
      } else {
        let orient: 'portrait' | 'landscape' = 'portrait';
        if (orientation === 'auto') {
          orient = imgAspect > 1 ? 'landscape' : 'portrait';
        } else {
          orient = orientation as 'portrait' | 'landscape';
        }

        const fmt = pageSize;

        if (i === 0) {
          doc = new jsPDF({ unit: 'mm', format: fmt, orientation: orient });
        } else {
          doc!.addPage(fmt, orient);
        }

        const pageW = doc!.internal.pageSize.getWidth();
        const pageH = doc!.internal.pageSize.getHeight();
        const areaW = pageW - marginMm * 2;
        const areaH = pageH - marginMm * 2;

        let drawX = marginMm;
        let drawY = marginMm;
        let drawW = areaW;
        let drawH = areaH;

        if (imageFit === 'fit') {
          const areaAspect = areaW / areaH;
          if (imgAspect > areaAspect) {
            drawW = areaW;
            drawH = areaW / imgAspect;
            drawY = marginMm + (areaH - drawH) / 2;
          } else {
            drawH = areaH;
            drawW = areaH * imgAspect;
            drawX = marginMm + (areaW - drawW) / 2;
          }
        } else if (imageFit === 'fill') {
          const areaAspect = areaW / areaH;
          if (imgAspect > areaAspect) {
            drawH = areaH;
            drawW = areaH * imgAspect;
            drawX = marginMm + (areaW - drawW) / 2;
          } else {
            drawW = areaW;
            drawH = areaW / imgAspect;
            drawY = marginMm + (areaH - drawH) / 2;
          }
        }

        doc!.addImage(dataUrl, format, drawX, drawY, drawW, drawH);
      }
    }

    if (!doc) {
      doc = new jsPDF();
    }

    const arrayBuffer = doc.output('arraybuffer');
    const bytes = new Uint8Array(arrayBuffer);
    
    // Send back the binary data and transfer the ArrayBuffer to avoid copying
    (self as any).postMessage({ success: true, pdfBytes: bytes }, [bytes.buffer]);
    
  } catch (err: any) {
    (self as any).postMessage({ success: false, error: err.message });
  }
};

// ── Helpers ──

async function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function getImageFormat(file: File): string {
  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  if (ext === 'png') return 'PNG';
  if (ext === 'webp') return 'WEBP';
  return 'JPEG';
}
