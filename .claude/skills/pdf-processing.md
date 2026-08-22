---
name: PDF Processing
description: Guidelines for manipulating and rasterizing PDFs using pdf-lib and pdfjs-dist.
---

# PDF Processing

## Two Distinct Libraries
You must understand the strict boundary between the two PDF libraries used in this project:

### 1. `pdf-lib` (Manipulation)
- **Use for:** Merging, splitting, rearranging, encrypting, decrypting, watermarking, and signing.
- **Why:** It edits the binary PDF structure without losing text searchability or degrading quality.
- **Rule:** Never use `pdf-lib` to convert a PDF page to an image.

### 2. `pdfjs-dist` (Rasterization & Preview)
- **Version:** `3.11.174`
- **Use for:** Generating image thumbnails of PDF pages so the user can see them in the React UI.
- **Implementation:** See `src/components/tools/PdfThumbnail.ts` for the standard `prerenderAllPages` implementation.
- **Rule:** Always call `URL.revokeObjectURL()` (or the provided `revokeAllThumbnails` utility) when the preview images are unmounted to prevent massive memory leaks.

## Heavy Processing
- If a `pdf-lib` task involves hundreds of pages, it will freeze the React UI. 
- You MUST offload heavy array manipulation to a Web Worker (see Web Workers skill) or handle it incrementally.
