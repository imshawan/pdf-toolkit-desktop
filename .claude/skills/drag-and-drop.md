---
name: Drag and Drop (DND)
description: Guidelines for implementing file dropping and UI drag-and-drop features.
---

# Drag and Drop (DND)

## File Uploads
- Always use the shared `src/components/ui/DropZone.tsx` for standard file inputs. It encapsulates the styling, hover states, and standard file type filtering.

## UI Drag and Drop (`@dnd-kit`)
- The app uses `@dnd-kit/core` and `@dnd-kit/sortable` for reordering lists (e.g., rearranging PDF pages in `RearrangePdfTool.tsx`).
- **Do not** introduce `react-beautiful-dnd` or native HTML5 drag-and-drop APIs.
- When implementing a sortable grid, ensure you use the `CSS.Transform.toString(transform)` utility provided by `@dnd-kit/utilities` to guarantee smooth, 60fps hardware-accelerated animations.

## Floating Elements
- For movable UI elements (like dragging a signature onto a PDF in `SignPdfTool.tsx`), the app uses `react-rnd`.
