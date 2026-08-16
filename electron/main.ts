import { app, BrowserWindow, ipcMain, nativeTheme } from 'electron'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { savePdf, saveMultiplePdfs, selectSaveFile, selectFolder, savePdfExact, saveMultiplePdfsExact } from './ipc/app/handlers'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// The built directory structure
//
// ├─┬─┬ dist
// │ │ └── index.html
// │ │
// │ ├─┬ dist-electron
// │ │ ├── main.js
// │ │ └── preload.mjs
// │
process.env.APP_ROOT = path.join(__dirname, '..')

// 🚧 Use ['ENV_NAME'] avoid vite:define plugin - Vite@2.x
export const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']
export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron')
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, 'public') : RENDERER_DIST

let win: BrowserWindow | null

function setupIpcHandlers() {
  ipcMain.on('set-theme', (_event, theme: 'light' | 'dark' | 'system') => {
    nativeTheme.themeSource = theme;
  })

  ipcMain.handle('file:save-pdf', savePdf);
  ipcMain.handle('file:save-multiple-pdfs', saveMultiplePdfs);
  ipcMain.handle('file:select-save-file', selectSaveFile);
  ipcMain.handle('file:select-folder', selectFolder);
  ipcMain.handle('file:save-pdf-exact', savePdfExact);
  ipcMain.handle('file:save-multiple-pdfs-exact', saveMultiplePdfsExact);
}

function createWindow() {
  win = new BrowserWindow({
    width: 900,
    height: 600,
    minWidth: 800,
    minHeight: 500,
    titleBarStyle: 'hiddenInset',
    vibrancy: 'sidebar',
    visualEffectState: 'active',
    backgroundColor: '#00000000',
    transparent: true,
    icon: path.join(process.env.VITE_PUBLIC, 'electron-vite.svg'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
    },
  })

  // Test active push message to Renderer-process.
  win.webContents.on('did-finish-load', () => {
    win?.webContents.send('main-process-message', (new Date).toLocaleString())
  })

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL)
  } else {
    // win.loadFile('dist/index.html')
    win.loadFile(path.join(RENDERER_DIST, 'index.html'))
  }
}

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
    win = null
  }
})

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

app.whenReady().then(() => {
  setupIpcHandlers();
  createWindow();
})

