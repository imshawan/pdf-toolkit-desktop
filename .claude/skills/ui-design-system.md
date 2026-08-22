---
name: UI & Design System
description: Guidelines for styling, components, and the macOS native aesthetic.
---

# UI & Design System

## Aesthetic Philosophy
- **Native macOS Feel:** The app should look like a built-in Apple application. 
- **Restraint:** Avoid heavy borders, extreme drop shadows, or loud colors.
- **Frosted Glass:** Use `backdrop-blur-md` or `backdrop-blur-sm` with semi-transparent backgrounds (`bg-white/50`, `bg-black/40`) for modals, floating bars, and headers.

## Tailwind Constraints
- **Colors:** 
  - Primary Action: `#0071e3` (Apple Blue). Use it sparingly for primary buttons or active states.
  - Backgrounds: `bg-[#F5F5F7]` (Light mode), `bg-[#1C1C1E]` (Dark mode).
  - Text: `text-black` (Light), `text-white` (Dark), or `text-black/70` for secondary text.
- **Border Radius:** 
  - Panels/Cards/Modals: `rounded-2xl` or `rounded-3xl`.
  - Buttons/Pills: `rounded-full`.

## Atomic Components
- **Buttons:** ALWAYS use the shared `<Button>` component (`src/components/ui/Button.tsx`). Do not write raw `<button>` tags for standard UI actions.
  - Variants: `primary` (blue), `secondary` (white/gray), `danger` (red).
- **Icons:** Use `lucide-react`. Set `size={16}` or `size={20}` for standard icons.

## Animations
- Use `framer-motion` for layout transitions, modal pop-ins, and list reordering. Keep springs subtle and snappy.
