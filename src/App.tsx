import React, { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Dashboard } from '@/components/tabs/dashboard';
import { Settings } from '@/components/tabs/settings';
import { About } from '@/components/tabs/about';
import { ToolWorkspace } from '@/components/tools/ToolWorkspace';
import { useApp } from '@/hooks/useApp';
import { useTranslation } from 'react-i18next';
import { Toaster } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [activeTool, setActiveTool] = useState<string | null>(null);
  
  const { theme, language, setPendingOSFiles } = useApp();
  const { i18n } = useTranslation();

  
  // Listen for OS File Opens (e.g. Right Click -> Open With)
  useEffect(() => {
    if (window.ipcRenderer) {
      const handleOpenFiles = (_event: any, files: string[]) => {
        setPendingOSFiles(files);
        // Force navigate to dashboard so user can pick a tool for these files
        setActiveTool(null);
        setActiveTab('dashboard');
      };
      
      window.ipcRenderer.on('open-files', handleOpenFiles);
      return () => {
        window.ipcRenderer.off('open-files', handleOpenFiles);
      };
    }
  }, [setPendingOSFiles]);

  // Sync Language
  useEffect(() => {
    i18n.changeLanguage(language);
  }, [language, i18n]);


  // Sync Native OS Menu Bar Language
  useEffect(() => {
    // We send an IPC message to the Main Process to rebuild the top native menu
    if (window.ipcRenderer) {
      window.ipcRenderer.send("set-menu-translations", {
        file: i18n.t("menu.file", "File"),
        edit: i18n.t("menu.edit", "Edit"),
        view: i18n.t("menu.view", "View"),
        window: i18n.t("menu.window", "Window"),
        help: i18n.t("menu.help", "Help"),
        about: i18n.t("menu.about", "About PDF Toolkit"),
        services: i18n.t("menu.services", "Services"),
        hide: i18n.t("menu.hide", "Hide PDF Toolkit"),
        hideOthers: i18n.t("menu.hideOthers", "Hide Others"),
        unhide: i18n.t("menu.unhide", "Show All"),
        quit: i18n.t("menu.quit", "Quit PDF Toolkit"),
        close: i18n.t("menu.close", "Close"),
        undo: i18n.t("menu.undo", "Undo"),
        redo: i18n.t("menu.redo", "Redo"),
        cut: i18n.t("menu.cut", "Cut"),
        copy: i18n.t("menu.copy", "Copy"),
        paste: i18n.t("menu.paste", "Paste"),
        pasteAndMatchStyle: i18n.t("menu.pasteAndMatchStyle", "Paste and Match Style"),
        delete: i18n.t("menu.delete", "Delete"),
        selectAll: i18n.t("menu.selectAll", "Select All"),
        reload: i18n.t("menu.reload", "Reload"),
        forceReload: i18n.t("menu.forceReload", "Force Reload"),
        toggleDevTools: i18n.t("menu.toggleDevTools", "Toggle Developer Tools"),
        resetZoom: i18n.t("menu.resetZoom", "Actual Size"),
        zoomIn: i18n.t("menu.zoomIn", "Zoom In"),
        zoomOut: i18n.t("menu.zoomOut", "Zoom Out"),
        togglefullscreen: i18n.t("menu.togglefullscreen", "Toggle Full Screen"),
        minimize: i18n.t("menu.minimize", "Minimize"),
        zoom: i18n.t("menu.zoom", "Zoom"),
        front: i18n.t("menu.front", "Bring All to Front")
      });
    }
  }, [i18n.language]);

  // Sync Theme
  useEffect(() => {
    const root = window.document.documentElement;
    const isDark = 
      theme === 'dark' || 
      (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    
    if (isDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }

    // Tell Electron to sync native macOS vibrancy to match
    // @ts-ignore
    window.ipcRenderer?.send('set-theme', theme);
    
    // Setup listener for system theme changes if in system mode
    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = (e: MediaQueryListEvent) => {
        if (e.matches) root.classList.add('dark');
        else root.classList.remove('dark');
      };
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, [theme]);

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    setActiveTool(null); // Reset tool when changing tabs
  };

  const renderContent = () => {
    // If a tool is selected, show the tool workspace
    if (activeTool) {
      return (
        <ToolWorkspace 
          toolId={activeTool} 
          onBack={() => setActiveTool(null)} 
        />
      );
    }

    // Otherwise, show the selected tab
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard onToolSelect={setActiveTool} />;
      case 'settings':
        return <Settings />;
      case 'about':
        return <About />;
      default:
        return <Dashboard onToolSelect={setActiveTool} />;
    }
  };

  return (
    <AppLayout activeTab={activeTab} setActiveTab={handleTabChange}>
      <Toaster 
        position="bottom-center"
        toastOptions={{
          className: 'dark:bg-[#2C2C2E] dark:text-white',
          style: {
            borderRadius: '10px',
            background: '#333',
            color: '#fff',
          },
        }} 
      />
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTool ? `tool-${activeTool}` : `tab-${activeTab}`}
          initial={{ opacity: 0, y: 10, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, scale: 0.98 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="h-full w-full"
        >
          {renderContent()}
        </motion.div>
      </AnimatePresence>
    </AppLayout>
  );
}

export default App;
