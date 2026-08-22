---
name: State Management & Web Workers
description: Rules for using Redux Toolkit and Vite Web Workers safely.
---

# State Management & Web Workers

## Redux Toolkit limits
- **DO NOT STORE BINARY DATA IN REDUX.** 
- Redux is strictly for serializable data: UI state, configuration preferences, file paths, file metadata (name, size, page count).
- Attempting to store `File` objects, `Uint8Array`, or `ArrayBuffer` in Redux will cause performance degradation and serialization errors.

## Web Workers (Vite)
- Background processing (like Excel-to-PDF conversion via `exceljs`) must run in Web Workers so the UI remains 60fps.
- **Instantiation Syntax:** You MUST use the Vite-specific URL syntax to spawn a worker:
  ```typescript
  const worker = new Worker(new URL("../../lib/xls2pdfWorker.ts", import.meta.url), { type: "module" });
  ```
- Always terminate the worker (`worker.terminate()`) in the `onmessage` / `onerror` handlers or in a `useEffect` cleanup to prevent zombie threads.
