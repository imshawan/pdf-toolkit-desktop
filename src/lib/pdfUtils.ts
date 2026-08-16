import { PDFDocument, degrees } from 'pdf-lib';

/**
 * Merges multiple PDF files into a single PDF document.
 * @param files Array of PDF Files to merge.
 * @returns The merged PDF file as a Uint8Array.
 */
export async function mergePdfs(files: File[]): Promise<Uint8Array> {
  const mergedPdf = await PDFDocument.create();
  
  for (const file of files) {
    const arrayBuffer = await file.arrayBuffer();
    const pdfDoc = await PDFDocument.load(arrayBuffer);
    const copiedPages = await mergedPdf.copyPages(pdfDoc, pdfDoc.getPageIndices());
    copiedPages.forEach((page) => mergedPdf.addPage(page));
  }
  
  return await mergedPdf.save();
}

/**
 * Rotates all pages in a PDF document by the specified angle.
 * @param pdfBytes The original PDF file as a Uint8Array.
 * @param angleDegrees The rotation angle in degrees (e.g., 90 for clockwise).
 * @returns The modified PDF file as a Uint8Array.
 */
export async function rotatePdfGlobal(pdfBytes: Uint8Array, angleDegrees: number): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const pages = pdfDoc.getPages();
  
  pages.forEach(page => {
    // getRotation() returns an object with an 'angle' property
    const currentRotation = page.getRotation().angle;
    page.setRotation(degrees(currentRotation + angleDegrees));
  });
  
  return await pdfDoc.save();
}

/**
 * Downloads a Uint8Array as a file in the browser.
 */
export function downloadPdf(bytes: Uint8Array, filename: string) {
  const blob = new Blob([bytes as any], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  
  URL.revokeObjectURL(url);
}
