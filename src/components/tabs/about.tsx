import React, { useState } from 'react';
import { useTranslation } from "react-i18next";
import logo from "../../../public/pdf-icon.svg";
import { GitBranch, Globe, ExternalLink, ChevronDown, ChevronUp, FileCode2 } from 'lucide-react';
import pkg from '../../../package.json';

const licenses = [
  { name: 'React', license: 'MIT', url: 'https://react.dev/' },
  { name: 'Electron', license: 'MIT', url: 'https://www.electronjs.org/' },
  { name: 'pdf-lib', license: 'MIT', url: 'https://pdf-lib.js.org/' },
  { name: 'PDF.js', license: 'Apache-2.0', url: 'https://mozilla.github.io/pdf.js/' },
  { name: 'QPDF', license: 'Apache-2.0', url: 'https://qpdf.sourceforge.io/' },
  { name: 'Tailwind CSS', license: 'MIT', url: 'https://tailwindcss.com/' },
  { name: 'Lucide', license: 'ISC', url: 'https://lucide.dev/' },
  { name: 'Vite', license: 'MIT', url: 'https://vitejs.dev/' },
  { name: 'ExcelJS', license: 'MIT', url: 'https://github.com/exceljs/exceljs' },
  { name: 'jsPDF', license: 'MIT', url: 'https://github.com/parallax/jsPDF' }
];

export function About() {
  const { t } = useTranslation();
  const [showLicenses, setShowLicenses] = useState(false);

  return (
    <div className="p-8 max-w-3xl mx-auto flex flex-col items-center mt-12 pb-24 select-text">
      {/* App Logo */}
      <div className="w-32 h-32 mb-6 pointer-events-none drop-shadow-xl relative">
        <img src={logo} alt="PDF Toolkit Logo" className="w-full h-full object-contain" />
      </div>
      
      {/* App Title & Version */}
      <h1 className="text-3xl font-bold tracking-tight text-black dark:text-white mb-2">
        {pkg.displayName || pkg.name}
      </h1>
      <p className="text-[13px] font-medium text-black/50 dark:text-white/50 mb-8 bg-black/5 dark:bg-white/10 px-3 py-1 rounded-full select-all">
        {t("about.version", "Version")} {pkg.version} ({t("about.build", "Build")} 2608)
      </p>

      {/* Description */}
      <div className="text-[15px] text-center text-black/70 dark:text-white/70 leading-relaxed max-w-lg mb-10">
        {t("about.desc", "A fast, offline, privacy-first PDF utility suite designed with native macOS aesthetics. Everything runs locally on your machine with zero server uploads.")}
      </div>

      {/* Links / Actions */}
      <div className="flex gap-4 mb-16 select-none">
        <a 
          href="https://github.com/imshawan/pdf-toolkit-desktop" 
          target="_blank" 
          rel="noreferrer"
          className="flex items-center gap-2 px-5 py-2.5 bg-white dark:bg-white/10 border border-black/10 dark:border-white/10 rounded-lg text-sm font-medium hover:bg-black/5 dark:hover:bg-white/20 transition-colors shadow-sm text-black dark:text-white no-underline"
        >
          <GitBranch size={18} />
          {t("about.githubRepo", "GitHub Repository")}
        </a>
        <a 
          href="https://github.com/imshawan" 
          target="_blank" 
          rel="noreferrer"
          className="flex items-center gap-2 px-5 py-2.5 bg-white dark:bg-white/10 border border-black/10 dark:border-white/10 rounded-lg text-sm font-medium hover:bg-black/5 dark:hover:bg-white/20 transition-colors shadow-sm text-black dark:text-white no-underline"
        >
          <Globe size={18} />
          {t("about.authorWebsite", "Author Website")}
        </a>
      </div>

      {/* Open Source Licenses Section */}
      <div className="w-full max-w-2xl bg-white dark:bg-[#2A2A2A] rounded-xl border border-black/10 dark:border-white/10 overflow-hidden shadow-sm select-none">
        <button 
          onClick={() => setShowLicenses(!showLicenses)}
          className="w-full flex items-center justify-between p-4 hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer outline-none"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#147BF8]/10 text-[#147BF8] dark:bg-[#34C4FF]/20 dark:text-[#34C4FF] rounded-lg">
              <FileCode2 size={20} strokeWidth={2} />
            </div>
            <div className="text-left">
              <h2 className="text-[15px] font-semibold text-black dark:text-white">{t("about.openSourceLicenses", "Open Source Licenses")}</h2>
              <p className="text-[12px] text-black/50 dark:text-white/50">{t("about.thirdPartySoft", "Third-party software components & acknowledgements")}</p>
            </div>
          </div>
          <div className="text-black/50 dark:text-white/50">
            {showLicenses ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </div>
        </button>

        {showLicenses && (
          <div className="border-t border-black/10 dark:border-white/10 bg-[#FAFAFA] dark:bg-[#222222]">
            <ul className="divide-y divide-black/5 dark:divide-white/5">
              {licenses.map((lib, idx) => (
                <li key={idx} className="flex items-center justify-between p-4 text-[13px]">
                  <span className="font-medium text-black dark:text-white/90">{lib.name}</span>
                  <div className="flex items-center gap-4">
                    <span className="text-[11px] px-2 py-1 bg-black/5 dark:bg-white/10 rounded-md font-mono text-black/60 dark:text-white/60">
                      {lib.license}
                    </span>
                    <a 
                      href={lib.url} 
                      target="_blank" 
                      rel="noreferrer" 
                      className="text-[#147BF8] hover:text-blue-600 dark:text-[#34C4FF] transition-colors"
                    >
                      <ExternalLink size={15} />
                    </a>
                  </div>
                </li>
              ))}
            </ul>
            <div className="p-4 pt-6 pb-6 text-[11px] text-center text-black/40 dark:text-white/40">
              {t("about.copyright", "Copyright © 2026 Shawan Mandal. All rights reserved.")}
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
