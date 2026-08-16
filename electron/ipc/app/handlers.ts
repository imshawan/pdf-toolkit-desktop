import { dialog } from 'electron';
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
