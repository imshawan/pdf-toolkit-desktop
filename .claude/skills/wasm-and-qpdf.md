---
name: WebAssembly & QPDF Integration
description: Instructions for working with the qpdf WASM module for advanced PDF operations.
---

# WebAssembly & QPDF Integration

## Why QPDF?
While `pdf-lib` is used for most manipulations, this project integrates **QPDF via WebAssembly (WASM)** (`src/lib/qpdf/`) for operations that `pdf-lib` struggles with, specifically heavy decryption, unlocking PDFs with advanced AES-256 R6 encryption, or linearizing PDFs.

## Rules for WASM
1. **Instantiation:** WASM modules must be loaded asynchronously. Ensure the WASM file is copied correctly during the Vite build process (usually configured in `vite.config.ts` or handled via public assets).
2. **Worker Isolation:** If QPDF operations block the main thread, they must be executed inside a Web Worker.

## Interacting with `pdfUtils.ts`
Check `src/lib/pdfUtils.ts` for the wrapper functions around QPDF and native file system dialogs (`selectFolder`, `downloadPdf`) before writing your own logic.
