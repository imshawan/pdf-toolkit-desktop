import { app, BrowserWindow, ipcMain, nativeTheme, Menu, MenuItemConstructorOptions } from 'electron'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { savePdf, saveMultiplePdfs, selectSaveFile, selectFolder, savePdfExact, saveMultiplePdfsExact, htmlToPdf } from './ipc/app/handlers'
import pkg from '../package.json'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Set the application name early so macOS uses it in the menu bar instead of "Electron"
app.setName(pkg.displayName || pkg.name);

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
  ipcMain.handle('file:html-to-pdf', htmlToPdf);
}

function createWindow() {
  win = new BrowserWindow({
    width: 1000,
    height: 700,
    minWidth: 800,
    minHeight: 500,
    titleBarStyle: 'hiddenInset',
    vibrancy: 'sidebar',
    visualEffectState: 'active',
    backgroundColor: '#00000000',
    transparent: true,
    icon: path.join(process.env.VITE_PUBLIC, 'pdf-icon.png'),
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

function setupMenu() {
  const isMac = process.platform === 'darwin'
  const appName = 'PDF Toolkit'

  // Customize the About panel (works natively on macOS, and via app.showAboutPanel() on Win/Linux)
  app.setAboutPanelOptions({
    applicationName: appName,
    applicationVersion: '1.0.0',
    version: '1.0.0',
    copyright: '© 2026 PDF Toolkit',
    authors: ['Shawan Mandal'],
    website: 'https://github.com/imshawan',
    iconPath: path.join(process.env.VITE_PUBLIC, 'pdf-icon.png') // Linux/Windows fallback icon
  });

  const template: MenuItemConstructorOptions[] = [
    ...(isMac
      ? [{
          label: appName,
          submenu: [
            { role: 'about' },
            { type: 'separator' },
            { role: 'services' },
            { type: 'separator' },
            { role: 'hide' },
            { role: 'hideOthers' },
            { role: 'unhide' },
            { type: 'separator' },
            { role: 'quit' }
          ]
        }] as MenuItemConstructorOptions[]
      : []),
    {
      label: 'File',
      submenu: [
        isMac ? { role: 'close' } : { role: 'quit' }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        ...(isMac
          ? [
              { role: 'pasteAndMatchStyle' },
              { role: 'delete' },
              { role: 'selectAll' }
            ]
          : [
              { role: 'delete' },
              { type: 'separator' },
              { role: 'selectAll' }
            ]) as MenuItemConstructorOptions[]
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'zoom' },
        ...(isMac
          ? [
              { type: 'separator' },
              { role: 'front' }
            ]
          : [
              { role: 'close' }
            ]) as MenuItemConstructorOptions[]
      ]
    },
    {
      label: 'Help',
      role: 'help',
      submenu: [
        {
          label: `About ${appName}`,
          click: () => {
            app.showAboutPanel();
          }
        }
      ]
    }
  ]

  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)
}

app.whenReady().then(() => {
  setupMenu();
  setupIpcHandlers();
  createWindow();
})

