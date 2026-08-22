import React from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { 
  FileBox, FileBadge, 
  Scissors, 
  RotateCcw, 
  Image as ImageIcon, 
  Table, 
  GripHorizontal,
  Lock,
  Unlock,
  Globe,
  PenTool
} from 'lucide-react';

interface DashboardProps {
  onToolSelect: (toolId: string) => void;
}

export function Dashboard({ onToolSelect }: DashboardProps) {
  const { t } = useTranslation();

  const coreTools = [
    { id: 'merge', icon: FileBox, FileBadge, label: t('tools.merge'), desc: t('tools.mergeDesc'), iconBg: 'bg-blue-500' },
    { id: 'split', icon: Scissors, label: t('tools.split'), desc: t('tools.splitDesc'), iconBg: 'bg-orange-500' },
    { id: 'rotate', icon: RotateCcw, label: t('tools.rotate', 'Rotate'), desc: t('tools.rotateDesc', 'Rotate PDF pages'), iconBg: 'bg-emerald-500' },
    { id: 'rearrange', icon: GripHorizontal, label: t('tools.rearrange', 'Rearrange'), desc: t('tools.rearrangeDesc', 'Reorder pages'), iconBg: 'bg-cyan-500' },
    { id: 'sign', icon: PenTool, label: t('tools.sign', 'Sign'), desc: t('tools.signDesc', 'Add your signature to a PDF'), iconBg: 'bg-purple-500' },
    { id: 'watermark', icon: FileBadge, label: t('tools.watermark', 'Watermark'), desc: t('tools.watermarkDesc', 'Stamp image or text over PDF'), iconBg: 'bg-pink-500' },
    { id: 'protect', icon: Lock, label: t('tools.protect', 'Protect'), desc: t('tools.protectDesc', 'Add a password to protect your PDF'), iconBg: 'bg-indigo-500' },
    { id: 'unlock', icon: Unlock, label: t('tools.unlock', 'Unlock'), desc: t('tools.unlockDesc', 'Remove password from a PDF'), iconBg: 'bg-teal-500' },
  ];

  const convertTools = [
    { id: 'img2pdf', icon: ImageIcon, label: t('tools.img2pdf'), desc: t('tools.img2pdfDesc'), iconBg: 'bg-blue-500' },
    { id: 'pdf2img', icon: ImageIcon, label: t('tools.pdf2img', 'PDF to Image'), desc: t('tools.pdf2imgDesc', 'Extract PDF pages to images'), iconBg: 'bg-indigo-500' },
    { id: 'xls2pdf', icon: Table, label: t('tools.xls2pdf'), desc: t('tools.xls2pdfDesc'), iconBg: 'bg-pink-500' },
    { id: 'html2pdf', icon: Globe, label: t('tools.html2pdf', 'HTML to PDF'), desc: t('tools.html2pdfDesc', 'Convert Webpages to PDF'), iconBg: 'bg-indigo-600' },
  ];

  const renderToolCard = (tool: any) => {
    const Icon = tool.icon;
    
    return (
      <button
        key={tool.id}
        onClick={() => onToolSelect(tool.id)}
        className="group flex flex-col text-left p-5 bg-white/60 dark:bg-[#1E1E1E]/60 backdrop-blur-xl border border-black/[0.04] dark:border-white/[0.04] rounded-[24px] transition-all duration-300 hover:bg-white/90 dark:hover:bg-[#252525]/90 shadow-[0_2px_8px_rgba(0,0,0,0.02)] hover:shadow-[0_12px_32px_rgba(0,0,0,0.06)] hover:-translate-y-0.5 hover:ring-2 hover:ring-[#0071E3] hover:border-transparent focus-visible:ring-2 focus-visible:ring-[#0071E3] focus-visible:border-transparent outline-none h-[160px] w-full"
      >
        <div className={`w-10 h-10 mb-4 rounded-[12px] flex items-center justify-center text-white shadow-sm ${tool.iconBg} transition-transform duration-300 group-hover:scale-105`}>
          <Icon size={20} strokeWidth={2} />
        </div>
        
        <span className="text-[15px] font-semibold text-black/90 dark:text-white/90 tracking-tight mb-1">
          {tool.label}
        </span>
        <span className="text-[13px] text-black/50 dark:text-white/50 leading-relaxed line-clamp-2">
          {tool.desc}
        </span>
      </button>
    );
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.05 }
    }
  };

  const itemVariants: any = {
    hidden: { opacity: 0, y: 10, scale: 0.98 },
    show: { 
      opacity: 1, y: 0, scale: 1,
      transition: { type: "spring", stiffness: 300, damping: 24 }
    }
  };

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="flex flex-col pb-20 p-8 max-w-[1200px] mx-auto gap-12 mt-4"
    >
      <motion.div variants={itemVariants} className="flex flex-col text-left mb-2 px-2">
        <h2 className="text-[34px] font-extrabold tracking-tight text-black dark:text-white leading-tight">
          {t('dashboard.overview')}
        </h2>
        <p className="text-[15px] text-black/50 dark:text-white/50 mt-1 font-medium">
          {t('dashboard.subtitle')}
        </p>
      </motion.div>

      <motion.div variants={itemVariants} className="flex flex-col gap-4">
        <h3 className="text-[15px] font-bold text-black/60 dark:text-white/60 uppercase tracking-wider ml-2">{t('dashboard.coreTools', 'Core Tools')}</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {coreTools.map((tool) => renderToolCard(tool))}
        </div>
      </motion.div>
      
      <motion.div variants={itemVariants} className="flex flex-col gap-4">
        <h3 className="text-[15px] font-bold text-black/60 dark:text-white/60 uppercase tracking-wider ml-2">{t('dashboard.conversion', 'Conversion')}</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {convertTools.map((tool) => renderToolCard(tool))}
        </div>
      </motion.div>
    </motion.div>
  );
}
