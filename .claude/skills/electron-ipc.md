---
name: Electron IPC & Architecture
description: Instructions for modifying the Electron backend and Inter-Process Communication (IPC).
---

# Electron IPC & Architecture

## Core Principles
- **Separation of Concerns:** The React frontend and Node.js backend are strictly separated. The frontend cannot access Node.js APIs directly.
- **Context Bridge:** All communication goes through `window.electron` defined in `electron/preload.ts`.

## Adding a New IPC Handler
1. **Main Process (`electron/ipc/app/handlers.ts`):**
   Use `ipcMain.handle("channel-name", async (event, args) => { ... })`.
2. **Preload Script (`electron/preload.ts`):**
   Expose the function: `myFunction: (args) => ipcRenderer.invoke("channel-name", args)`.
3. **Frontend Usage:**
   Call it via `await window.electron.myFunction(args)`.

## Binary Data Handling
- **DO NOT** convert large files to Base64 strings. This crashes V8 memory limits.
- Pass binary data between processes strictly using `Uint8Array` or `ArrayBuffer`.

## Headless Windows (HTML to PDF)
- If you need to render HTML/Excel to PDF in the background, use a hidden `BrowserWindow`.
- **CRITICAL:** To avoid screen flashing on macOS, set `show: false`. If you encounter Chromium blank-page bugs, do NOT set `show: true` off-screen. Instead, use `webContents.executeJavaScript` to poll for `document.images.every(img => img.complete)` before calling `webContents.printToPDF()`.
- Ensure `webSecurity: false` is only used on these temporary, hidden renderers to allow local file fetching, and never on the main user-facing window.
