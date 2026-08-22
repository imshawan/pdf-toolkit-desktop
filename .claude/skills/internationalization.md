---
name: Internationalization (i18n)
description: How to implement translations across the application.
---

# Internationalization (i18n)

## Implementation
- The app uses `react-i18next`.
- Supported languages: English (`en`) and Hindi (`hi`).
- Translation files are located in `src/localization/`.

## Rules
1. **No Hardcoded Strings:** You must NEVER hardcode English text directly into TSX files.
2. **Hook Usage:** Use the `useTranslation` hook at the top of functional components:
   ```typescript
   import { useTranslation } from "react-i18next";
   // ...
   const { t } = useTranslation();
   ```
3. **Fallback Syntax:** Always provide the English string as a fallback in the `t()` function so developers reading the code know exactly what the string is:
   ```tsx
   <Button>{t("tools.merge.button", "Merge PDFs")}</Button>
   ```
4. **Updating JSON:** If you add a new string, you must add it to BOTH `en.json` and `hi.json`.
