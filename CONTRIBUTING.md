# Contributing to PDF Toolkit Desktop

Thank you for your interest in contributing to PDF Toolkit! This document provides guidelines and workflows for contributing to the project.

## Development Setup

1. **Fork & Clone** the repository.
2. Ensure you are running **Node.js v20+**.
3. Install dependencies:
   ```bash
   npm install
   ```
4. Start the development server:
   ```bash
   npm run dev
   ```

## Adding a New Tool

PDF Toolkit is designed to be highly modular. If you want to add a new PDF operation (e.g., "Extract Text from PDF"), follow these steps:

1. **Create the Tool Component**
   Create a new file in `src/components/tools/ExtractTextTool.tsx`. Ensure it follows the layout paradigm of existing tools (a left control pane and a right preview/action pane).

2. **Add Core Logic**
   If the tool requires heavy processing or external libraries, place the utility functions in `src/lib/pdfUtils.ts`. Avoid putting complex data manipulation logic directly inside the React component.

3. **Register the Tool**
   Add your new tool to the routing system and sidebar navigation inside `src/components/layout/Sidebar.tsx` and the main `App.tsx` router setup.

4. **Add Icons & Translations**
   Use `lucide-react` for any necessary UI icons. Update the translation files in `src/locales/` if your tool adds new text strings.

## Coding Standards

- **TypeScript:** We strictly enforce TypeScript. Avoid using `any` wherever possible. Define proper interfaces for all component props and state structures.
- **Tailwind CSS:** Use Tailwind utility classes for all styling. Avoid custom CSS files unless absolutely necessary (e.g., defining `@font-face`).
- **UI Consistency:** Rely on the `bg-white/50`, `backdrop-blur-sm`, and macOS-style shadows/borders to maintain the frosted glass aesthetic.

## Submitting a Pull Request

1. Create a descriptive branch name (`feature/extract-text`, `fix/margin-bug`).
2. Commit your changes with clear, concise commit messages.
3. Verify your code builds successfully for production:
   ```bash
   npm run build
   ```
4. Push your branch and open a Pull Request against the `main` branch. Provide a brief summary of what your PR accomplishes and include screenshots if you are making UI changes.

Thank you for helping make PDF Toolkit the best local PDF client available!
