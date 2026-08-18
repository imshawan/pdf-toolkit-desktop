import { PDFDocument, degrees } from 'pdf-lib';
import QPDF from '../lib/qpdf/qpdf.js';
import qpdfWasmUrl from '../lib/qpdf/qpdf.wasm?url';

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
 * Extracts specific pages from a PDF document.
 * @param pdfBytes The original PDF file as a Uint8Array.
 * @param pageIndices Array of 0-based page indices to extract.
 * @returns The extracted PDF file as a Uint8Array.
 */
export async function extractPdfPages(pdfBytes: Uint8Array, pageIndices: number[]): Promise<Uint8Array> {
  const originalPdf = await PDFDocument.load(pdfBytes);
  const newPdf = await PDFDocument.create();

  // Validate indices exist before copying
  const validIndices = pageIndices.filter(i => i >= 0 && i < originalPdf.getPageCount());

  if (validIndices.length > 0) {
    const copiedPages = await newPdf.copyPages(originalPdf, validIndices);
    copiedPages.forEach((page) => newPdf.addPage(page));
  }

  return await newPdf.save();
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
 * Downloads a Uint8Array as a file in the browser or via Electron IPC.
 */
export async function downloadPdf(bytes: Uint8Array, filename: string, originalPath?: string, folderName?: string): Promise<{ success: boolean, filePath?: string, error?: any, canceled?: boolean }> {
  // Use Electron IPC if available for native save dialog
  if (window.ipcRenderer) {
    try {
      const result = await window.ipcRenderer.invoke('file:save-pdf', bytes.buffer, originalPath, filename, folderName);
      if (result.success) {
        return { success: true, filePath: result.filePath };
      } else {
        return { success: false, error: 'User canceled or save failed' };
      }
    } catch (err) {
      console.error('IPC save error:', err);
      return { success: false, error: err };
    }
  }

  // Fallback for web browser
  const blob = new Blob([bytes as any], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  return { success: true };
}

/**
 * Splits a PDF into multiple distinct files based on provided page ranges.
 * @param pdfBytes The original PDF as a Uint8Array.
 * @param ranges An array of index arrays, where each inner array defines one output PDF.
 * @returns Array of Uint8Arrays representing the newly generated PDFs.
 */
export async function splitPdf(pdfBytes: Uint8Array, ranges: number[][]): Promise<Uint8Array[]> {
  const originalDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
  const results: Uint8Array[] = [];

  for (const pageIndices of ranges) {
    const newDoc = await PDFDocument.create();
    const copiedPages = await newDoc.copyPages(originalDoc, pageIndices);
    copiedPages.forEach((page) => newDoc.addPage(page));
    results.push(await newDoc.save());
  }

  return results;
}

/**
 * Downloads multiple PDFs natively via IPC.
 */
export async function downloadMultiplePdfs(files: { bytes: Uint8Array, filename: string }[], originalPath: string, folderName?: string): Promise<{ success: boolean, count?: number, error?: any, canceled?: boolean }> {
  if (window.ipcRenderer) {
    try {
      const payload = files.map(f => ({ buffer: f.bytes.buffer, suggestedName: f.filename }));
      const result = await window.ipcRenderer.invoke('file:save-multiple-pdfs', payload, originalPath, folderName);
      if (result.success) {
        return { success: true, count: files.length };
      } else {
        return { success: false, error: result.error || 'Save failed', canceled: result.canceled };
      }
    } catch (err) {
      console.error('IPC multi-save error:', err);
      return { success: false, error: err };
    }
  }

  // Web fallback (download sequentially - not ideal but works)
  for (const file of files) {
    const blob = new Blob([file.bytes as any], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    await new Promise(r => setTimeout(r, 300)); // small delay between downloads
  }
  return { success: true, count: files.length };
}

export async function selectSaveFile(suggestedName: string): Promise<string | undefined> {
  if (window.ipcRenderer) {
    const { canceled, filePath } = await window.ipcRenderer.invoke('file:select-save-file', suggestedName);
    if (!canceled && filePath) return filePath;
  }
  return undefined;
}

export async function selectFolder(): Promise<string | undefined> {
  if (window.ipcRenderer) {
    const { canceled, folderPath } = await window.ipcRenderer.invoke('file:select-folder');
    if (!canceled && folderPath) return folderPath;
  }
  return undefined;
}

export async function downloadPdfExact(bytes: Uint8Array, exactPath: string): Promise<{ success: boolean, error?: any }> {
  if (window.ipcRenderer) {
    try {
      const result = await window.ipcRenderer.invoke('file:save-pdf-exact', bytes.buffer, exactPath);
      return { success: result.success };
    } catch (err) {
      console.error('IPC exact save error:', err);
      return { success: false, error: err };
    }
  }
  return { success: false, error: 'IPC not available' };
}

export async function downloadMultiplePdfsExact(files: { bytes: Uint8Array, filename: string }[], exactDir: string, folderName?: string): Promise<{ success: boolean, count?: number, error?: any }> {
  if (window.ipcRenderer) {
    try {
      const payload = files.map(f => ({ buffer: f.bytes.buffer, suggestedName: f.filename }));
      const result = await window.ipcRenderer.invoke('file:save-multiple-pdfs-exact', payload, exactDir, folderName);
      if (result.success) {
        return { success: true, count: files.length };
      }
      return { success: false, error: 'Save failed' };
    } catch (err) {
      console.error('IPC exact multi-save error:', err);
      return { success: false, error: err };
    }
  }
  return { success: false, error: 'IPC not available' };
}

/**
 * Protects a PDF document with a user password.
 * @param pdfBytes The original PDF file as a Uint8Array.
 * @param password The user password to protect the PDF.
 * @returns The protected PDF file as a Uint8Array.
 */
export async function protectPdf(pdfBytes: Uint8Array, password: string): Promise<Uint8Array> {
  // We use qpdf-wasm because pdf-lib forks struggle with array length limits
  // on complex/large PDFs when attempting pure-JS encryption.
  const qpdf = await QPDF({
    locateFile: (path: string) => {
      if (path.endsWith('.wasm')) return qpdfWasmUrl;
      return path;
    }
  });

  // Write to virtual filesystem
  qpdf.FS.writeFile('input.pdf', pdfBytes);

  // Run qpdf to encrypt:
  // --encrypt <user-password> <owner-password> <key-length> -- <input> <output>
  // We use 256-bit AES encryption which is the modern standard
  const exitCode = qpdf.callMain(['--encrypt', password, password, '256', '--', 'input.pdf', 'output.pdf']);

  if (exitCode !== 0) {
    throw new Error('Failed to encrypt PDF.');
  }

  // Read the encrypted file back from virtual filesystem
  const protectedPdfBytes = qpdf.FS.readFile('output.pdf');
  return protectedPdfBytes;
}

/**
 * Removes password protection from a PDF document.
 * @param pdfBytes The encrypted PDF file as a Uint8Array.
 * @param password The current password required to open the PDF.
 * @returns The decrypted, unprotected PDF file as a Uint8Array.
 */
export async function unlockPdf(pdfBytes: Uint8Array, password: string): Promise<Uint8Array> {
  const qpdf = await QPDF({
    locateFile: (path: string) => {
      if (path.endsWith('.wasm')) return qpdfWasmUrl;
      return path;
    }
  });

  // Write to virtual filesystem
  qpdf.FS.writeFile('input.pdf', pdfBytes);

  // Run qpdf to decrypt
  const exitCode = qpdf.callMain(['--decrypt', `--password=${password}`, 'input.pdf', 'output.pdf']);

  if (exitCode !== 0) {
    throw new Error('Failed to unlock PDF. The password might be incorrect.');
  }

  // Read the decrypted file back
  return qpdf.FS.readFile('output.pdf');
}

/**
 * Converts a URL or local HTML file to PDF using Electron's native printToPDF.
 * @param source The URL or absolute file path to convert.
 * @param isUrl Whether the source is a URL (true) or a file path (false).
 * @returns The converted PDF as a Uint8Array.
 */
export async function convertHtmlToPdf(source: string, isUrl: boolean): Promise<Uint8Array> {
  if (window.ipcRenderer) {
    const buffer = await window.ipcRenderer.invoke('file:html-to-pdf', source, isUrl);
    return new Uint8Array(buffer);
  }
  throw new Error('HTML to PDF conversion is only supported in the desktop app.');
}
