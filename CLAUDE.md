# 🤖 AI Assistant Instructions (CLAUDE.md)

Welcome! You are assisting with the development of **PDF Toolkit Desktop**, an enterprise-grade, offline, cross-platform PDF manipulation suite.

When generating code, analyzing bugs, or suggesting architectures in this repository, you **MUST** adhere to the following rules, philosophies, and technical patterns.

---

## 1. Core Philosophy & Constraints
- **100% Offline & Zero-Trust:** This application guarantees absolute privacy. **NEVER** introduce external network calls, remote telemetry, cloud analytics, or external font/CDN requests. Everything must run entirely on the user's local machine.
- **macOS Native Aesthetics:** The UI must feel completely native to macOS. Use extreme restraint in styling. Rely on frosted glass (`backdrop-blur`), smooth Apple-like animations (`framer-motion`), and Apple Blue (`#0071e3`).
- **No Temporary Files:** Avoid writing sensitive unencrypted payload data to the disk. Perform file manipulations (AES-256 encryption/decryption, signing) entirely in memory using `Uint8Array`.

---

## 2. Technology Stack
- **Framework:** Electron (v30) + React (v18)
- **Build System:** Vite (with `vite-plugin-electron`)
- **Styling:** Tailwind CSS (v4)
- **State Management:** Redux Toolkit (`@reduxjs/toolkit`)
- **Internationalization:** `react-i18next` (English & Hindi currently supported)
- **Icons:** `lucide-react` (Avoid adding other icon libraries)
- **PDF Core:** 
  - `pdf-lib`: Used exclusively for **manipulation** (merging, splitting, encryption, watermarking, signing).
  - `pdfjs-dist` (v3.11.174): Used exclusively for **rasterization and previewing** (converting PDF pages to images). Do not use pdfjs for manipulation.

---

## 3. Architecture & Directory Structure
- `electron/`: Contains the Node.js backend.
  - `main.ts`: Application lifecycle and window management.
  - `preload.ts`: Context bridge exposing `window.electron`.
  - `ipc/app/handlers.ts`: Main process IPC handlers. **NOTE:** For HTML-to-PDF, we use a headless hidden `BrowserWindow`. Ensure `show: false` and `webSecurity: false` are configured carefully to prevent screen flashing.
- `src/components/`: React frontend.
  - `ui/`: Shared atomic components. **Always use `<Button>` (`src/components/ui/Button.tsx`)** instead of writing raw `<button>` elements to maintain standard Apple pill-shaped `rounded-full` styling.
  - `tools/`: The individual PDF utility modules (e.g., `XlsToPdfTool.tsx`).
- `src/lib/`: Shared utilities and Web Workers.
  - Heavy tasks (like Excel parsing via `exceljs` or large PDF merges) should be offloaded to Web Workers (e.g., `xls2pdfWorker.ts`) so the React UI thread does not freeze.

---

## 4. Coding Standards & UI Patterns

### Styling Guidelines
- **Corners:** Use `rounded-2xl` for large cards/modals, and `rounded-full` for buttons.
- **Colors:** Primary brand color is `#0071e3`. Use generic Tailwind colors (`bg-white`, `dark:bg-[#1C1C1E]`, `text-black/50`, `dark:text-white/50`) for layout elements to support seamless Light/Dark mode.
- **Layouts:** Prefer CSS Grid for galleries and Flexbox for toolbars. Ensure `overflow-hidden` is applied correctly so scrollbars don't break rounded corners.

### Component Patterns
- **i18n:** Wrap EVERY user-facing string in the `t()` function. Do not hardcode English strings in the TSX files. Example: `{t("common.preview", "Preview")}`.
- **Imports:** Use absolute alias paths (`@/components/...`) or relative paths depending on proximity. 

### IPC (Inter-Process Communication)
- Pass binary data between the React frontend and the Electron backend using `Uint8Array` rather than Base64 strings. Base64 causes massive memory bloat for large PDFs.

---

## 5. Git & Commits
- Use strict Conventional Commits (e.g., `feat:`, `fix:`, `refactor:`, `docs:`).
- Keep changes highly isolated to the specific tool you are working on.


## 6. Critical Project "Gotchas" (MUST READ)
- **Vite & Web Workers:** When instantiating a Web Worker, you MUST use the Vite URL syntax. Example: `new Worker(new URL("../../lib/worker.ts", import.meta.url), { type: "module" })`.
- **Electron Main Process Reloading:** Changes made to files inside the `electron/` folder (like `handlers.ts` or `main.ts`) DO NOT support Hot Module Replacement (HMR) natively in the same way React does. You must remind the user to completely restart the app (Cmd+Q) if you modify the backend IPC.
- **Redux State Limits:** Never store raw `ArrayBuffer`, `Uint8Array`, or full `File` objects inside Redux. Redux should strictly hold serializable UI state and metadata (file names, paths, page counts, configurations).
- **TypeScript:** Avoid `any` types. Ensure all event payloads and IPC bridge methods are typed.
