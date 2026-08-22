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

const isMac = process.platform === 'darwin';
const isWin = process.platform === 'win32';

let win: BrowserWindow | null

function getWindowBackgroundColor() {
  return nativeTheme.shouldUseDarkColors ? '#1e1e1e' : '#f5f5f7';
}

function setupIpcHandlers() {
  ipcMain.on('set-theme', (_event, theme: 'light' | 'dark' | 'system') => {
    nativeTheme.themeSource = theme;
    if (win && !isMac) {
      win.setBackgroundColor(getWindowBackgroundColor());
    }
  });

  nativeTheme.on('updated', () => {
    if (win && !isMac) {
      win.setBackgroundColor(getWindowBackgroundColor());
    }
  });

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
    ...(isMac ? {
      titleBarStyle: 'hiddenInset',
      vibrancy: 'sidebar',
      visualEffectState: 'active',
      backgroundColor: '#00000000',
      transparent: true,
    } : {
      backgroundColor: getWindowBackgroundColor(),
      ...(isWin ? { backgroundMaterial: 'mica' } : {})
    }),
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


let currentMenuTranslations = {
  file: "File",
  edit: "Edit",
  view: "View",
  window: "Window",
  help: "Help",
  about: "About PDF Toolkit",
  services: "Services",
  hide: "Hide PDF Toolkit",
  hideOthers: "Hide Others",
  unhide: "Show All",
  quit: "Quit PDF Toolkit",
  close: "Close",
  undo: "Undo",
  redo: "Redo",
  cut: "Cut",
  copy: "Copy",
  paste: "Paste",
  pasteAndMatchStyle: "Paste and Match Style",
  delete: "Delete",
  selectAll: "Select All",
  reload: "Reload",
  forceReload: "Force Reload",
  toggleDevTools: "Toggle Developer Tools",
  resetZoom: "Actual Size",
  zoomIn: "Zoom In",
  zoomOut: "Zoom Out",
  togglefullscreen: "Toggle Full Screen",
  minimize: "Minimize",
  zoom: "Zoom",
  front: "Bring All to Front"
};

function setupMenu(translations = currentMenuTranslations) {
  currentMenuTranslations = translations;
  const isMac = process.platform === "darwin";
  const appName = pkg.displayName ?? pkg.name;

  app.setAboutPanelOptions({
    applicationName: appName,
    applicationVersion: pkg.version,
    version: pkg.version,
    copyright: `© ${new Date().getFullYear()} ${pkg.author.name}`,
    authors: [pkg.author.name],
    website: pkg.homepage,
    iconPath: path.join(process.env.VITE_PUBLIC, "pdf-icon.png")
  });

  const template: MenuItemConstructorOptions[] = [
    ...(isMac
      ? [{
          label: appName,
          submenu: [
            { label: translations.about, click: () => app.showAboutPanel() },
            { type: "separator" },
            { role: "services", label: translations.services },
            { type: "separator" },
            { role: "hide", label: translations.hide },
            { role: "hideOthers", label: translations.hideOthers },
            { role: "unhide", label: translations.unhide },
            { type: "separator" },
            { role: "quit", label: translations.quit }
          ]
        }] as MenuItemConstructorOptions[]
      : []),
    {
      label: translations.file,
      submenu: [
        isMac ? { role: "close", label: translations.close } : { role: "quit", label: translations.quit }
      ] as MenuItemConstructorOptions[]
    },
    {
      label: translations.edit,
      submenu: [
        { role: "undo", label: translations.undo },
        { role: "redo", label: translations.redo },
        { type: "separator" },
        { role: "cut", label: translations.cut },
        { role: "copy", label: translations.copy },
        { role: "paste", label: translations.paste },
        ...(isMac
          ? [
              { role: "pasteAndMatchStyle", label: translations.pasteAndMatchStyle },
              { role: "delete", label: translations.delete },
              { role: "selectAll", label: translations.selectAll }
            ]
          : [
              { role: "delete", label: translations.delete },
              { type: "separator" },
              { role: "selectAll", label: translations.selectAll }
            ]) as MenuItemConstructorOptions[]
      ] as MenuItemConstructorOptions[]
    },
    {
      label: translations.view,
      submenu: [
        { role: "reload", label: translations.reload },
        { role: "forceReload", label: translations.forceReload },
        { role: "toggleDevTools", label: translations.toggleDevTools },
        { type: "separator" },
        { role: "resetZoom", label: translations.resetZoom },
        { role: "zoomIn", label: translations.zoomIn },
        { role: "zoomOut", label: translations.zoomOut },
        { type: "separator" },
        { role: "togglefullscreen", label: translations.togglefullscreen }
      ] as MenuItemConstructorOptions[]
    },
    {
      label: translations.window,
      submenu: [
        { role: "minimize", label: translations.minimize },
        { role: "zoom", label: translations.zoom },
        ...(isMac
          ? [
              { type: "separator" },
              { role: "front", label: translations.front }
            ]
          : [
              { role: "close", label: translations.close }
            ]) as MenuItemConstructorOptions[]
      ] as MenuItemConstructorOptions[]
    },
    {
      label: translations.help,
      role: "help",
      submenu: [
        {
          label: translations.about,
          click: () => {
            app.showAboutPanel();
          }
        }
      ] as MenuItemConstructorOptions[]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

ipcMain.on("set-menu-translations", (_event, translations) => {
  setupMenu(translations);
});
app.whenReady().then(() => {
  setupMenu();
  setupIpcHandlers();
  createWindow();
})

