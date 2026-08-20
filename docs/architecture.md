# PDF Toolkit Desktop - Architecture & Design

This document details the architectural choices, IPC boundaries, and structural paradigms used within PDF Toolkit Desktop.

## Core Philosophy

The application is structured to decouple the **React UI** (Presentation) from the **Node.js/Electron Backend** (System Integration/Heavy Lifting). We heavily emphasize **Local-First Processing**, meaning all PDF parsing, signing, encryption, and modification happen entirely on the user's machine without any external API calls.

---

## Process Model

We strictly enforce the recommended Electron security model by utilizing **Context Isolation** and **Preload Scripts**.

### 1. Main Process (`electron/main.ts`)
The orchestrator. It manages the application lifecycle, native menus, window creation, and acts as the gatekeeper for system-level APIs.
* **Responsibilities:** File system access (save dialogs), spawning hidden renderer windows for HTML/PDF printing, and handling IPC invocations.

### 2. Preload Script (`electron/preload.ts`)
The bridge. It exposes a strictly typed, limited API to the renderer process via `contextBridge`.
* **API Surface:**
  * `ipcRenderer.invoke('file:select-folder')`
  * `ipcRenderer.invoke('file:save-pdf')`
  * `ipcRenderer.invoke('file:html-to-pdf')`

### 3. Renderer Process (`src/`)
The frontend. A Vite-powered React single-page application.
* **Responsibilities:** Rendering the frosted-glass UI, managing global state (Redux), orchestrating drag-and-drop operations, and rendering PDF canvases (via `pdfjs-dist`).

---

## Directory Structure

```text
pdf-toolkit-desktop/
├── electron/                 # Main Process codebase
│   ├── main.ts               # Electron entry point
│   ├── preload.ts            # Context bridge definitions
│   └── ipc/                  # IPC Handlers (file saving, HTML to PDF)
├── src/                      # Renderer Process codebase
│   ├── components/           # React Components
│   │   ├── layout/           # Sidebars, Navigation, Topbars
│   │   ├── tools/            # The core PDF utilities (Merge, Split, Sign, etc.)
│   │   └── ui/               # Reusable base UI elements (Buttons, DropZones)
│   ├── lib/                  # Utility functions
│   │   ├── pdfUtils.ts       # Wrapper functions for pdf-lib & IPC
│   │   ├── html2canvas.ts    # Custom rasterization logic
│   │   └── workers/          # Web Workers for heavy blocking tasks
│   ├── store/                # Redux store slices
│   ├── locales/              # i18n Translation files
│   └── styles/               # Tailwind global CSS and font-face declarations
├── public/                   # Static assets (fonts, icons, workers)
└── package.json
```

---

## Key Technical Decisions

### 1. Canvas-Based PDF Previews
Instead of relying on native browser `<embed>` or `<iframe src="file.pdf">` (which exposes Chrome's clunky PDF viewer UI), PDF Toolkit uses `pdfjs-dist` to rasterize PDF pages directly into `<canvas>` elements. This guarantees a highly integrated, visually consistent interface that feels native.

### 2. Precise Signature & Watermark Scaling
Aligning DOM-based draggable text over a PDF with absolute `pdf-lib` coordinate systems introduces extreme floating-point discrepancies across OS platforms due to kerning and font-shaping variations. 
**Solution:** We implemented a custom `rasterizeTextToDataURL` engine. When a user creates a text signature, it is rasterized into a transparent, high-res PNG *inside the browser*, and that image is embedded into the PDF. This guarantees 100% 1:1 visual parity between the React preview and the final exported PDF.

### 3. Strict Offline Mode
To bypass potential strict Content Security Policies (CSPs) and ensure the app works fully offline (e.g., in air-gapped corporate environments), all external Google Fonts for cursive signatures were physically downloaded, embedded in `public/fonts/`, and served locally.

### 4. HTML to PDF via Hidden Window
Because `pdf-lib` cannot parse HTML, the application handles HTML/URL conversions by dynamically spawning a hidden `BrowserWindow`, injecting robust CSS `@page` and `body { margin: 0 }` rules to enforce the user's exact UI margin selections, and utilizing Chromium's highly accurate `webContents.printToPDF` engine.
