import { dialog, BrowserWindow } from 'electron';
import * as fs from 'node:fs';
import * as path from 'node:path';
import type { IpcMainInvokeEvent } from 'electron';

export const selectSaveFile = async (_event: IpcMainInvokeEvent, suggestedName: string) => {
  const { canceled, filePath } = await dialog.showSaveDialog({
    title: 'Save PDF',
    defaultPath: suggestedName,
    filters: [{ name: 'PDF Documents', extensions: ['pdf'] }]
  });
  return { canceled, filePath };
};

export const selectFolder = async (_event: IpcMainInvokeEvent) => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    title: 'Select Folder',
    properties: ['openDirectory', 'createDirectory']
  });
  return { canceled, folderPath: filePaths.length > 0 ? filePaths[0] : undefined };
};

export const savePdfExact = async (_event: IpcMainInvokeEvent, buffer: ArrayBuffer, exactPath: string) => {
  const targetDir = path.dirname(exactPath);
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }
  fs.writeFileSync(exactPath, Buffer.from(buffer));
  return { success: true, filePath: exactPath };
};

export const saveMultiplePdfsExact = async (_event: IpcMainInvokeEvent, files: { buffer: ArrayBuffer, suggestedName: string }[], exactDir: string, folderName?: string) => {
  let targetDir = exactDir;
  if (folderName) {
    targetDir = path.join(targetDir, folderName);
  }
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }
  
  const savedPaths: string[] = [];
  for (const file of files) {
    const targetPath = path.join(targetDir, file.suggestedName);
    fs.writeFileSync(targetPath, Buffer.from(file.buffer));
    savedPaths.push(targetPath);
  }
  return { success: true, savedPaths };
};

export const savePdf = async (_event: IpcMainInvokeEvent, buffer: ArrayBuffer, originalPath: string, suggestedName: string, folderName?: string) => {
  if (originalPath) {
    const dir = path.dirname(originalPath);
    let targetPath = path.join(dir, suggestedName);
    
    if (folderName) {
      targetPath = path.join(dir, folderName, suggestedName);
    }
    
    const targetDir = path.dirname(targetPath);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }
    
    fs.writeFileSync(targetPath, Buffer.from(buffer));
    return { success: true, filePath: targetPath };
  }

  // Fallback if no original path was provided
  const { canceled, filePath } = await dialog.showSaveDialog({
    title: 'Save PDF',
    defaultPath: suggestedName,
    filters: [{ name: 'PDF Documents', extensions: ['pdf'] }]
  });

  if (!canceled && filePath) {
    const targetDir = path.dirname(filePath);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }
    fs.writeFileSync(filePath, Buffer.from(buffer));
    return { success: true, filePath };
  }
  return { success: false, canceled: true };
};

export const saveMultiplePdfs = async (_event: IpcMainInvokeEvent, files: { buffer: ArrayBuffer, suggestedName: string }[], originalPath: string, folderName?: string) => {
  let targetDir = '';

  if (originalPath) {
    targetDir = path.dirname(originalPath);
  } else {
    // Show folder picker dialog
    const { canceled, filePaths } = await dialog.showOpenDialog({
      title: 'Select Folder to Save PDFs',
      properties: ['openDirectory', 'createDirectory']
    });

    if (canceled || filePaths.length === 0) {
      return { success: false, canceled: true };
    }
    targetDir = filePaths[0];
  }
  
  if (folderName) {
    targetDir = path.join(targetDir, folderName);
  }
  
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }
  
  const savedPaths: string[] = [];
  
  for (const file of files) {
    const targetPath = path.join(targetDir, file.suggestedName);
    fs.writeFileSync(targetPath, Buffer.from(file.buffer));
    savedPaths.push(targetPath);
  }
  
  return { success: true, savedPaths };
};

export const htmlToPdf = async (_event: IpcMainInvokeEvent, source: string, isUrl: boolean, options: any = {}) => {
  return new Promise((resolve, reject) => {
    let win = new BrowserWindow({
      show: false,
      width: 1280, // Set a wide desktop viewport
      height: 800,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
      }
    });

    win.webContents.on('did-finish-load', async () => {
      try {
        const marginCss = options.marginMm !== undefined ? `${options.marginMm}mm !important` : 'auto';
        await win.webContents.insertCSS(`
          @media print {
            @page {
              margin: ${marginCss};
            }
            body {
              margin: 0 !important;
              padding: 0 !important;
            }
            body, html, div, table, tbody, thead, tr, td, th, section, main, article {
              overflow: visible !important;
              overflow-x: visible !important;
              overflow-y: visible !important;
            }
          }
        `);

        const pdfBuffer = await win.webContents.printToPDF({
          printBackground: true,
          pageSize: options.pageSize || 'A4',
          landscape: options.landscape || false,
          scale: options.scale || 1.0,
          margins: { marginType: 'default' },
        });
        resolve(pdfBuffer);
      } catch (err) {
        reject(err);
      } finally {
        win.destroy();
      }
    });

    win.webContents.on('did-fail-load', (_e: any, _code: any, desc: string) => {
      reject(new Error(`Failed to load: ${desc}`));
      win.destroy();
    });

    if (isUrl) {
      if (!source.startsWith('http://') && !source.startsWith('https://')) {
        source = 'https://' + source;
      }
      win.loadURL(source).catch(reject);
    } else {
      win.loadFile(source).catch(reject);
    }
  });
};
