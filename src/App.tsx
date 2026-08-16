import React, { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Dashboard } from '@/components/tabs/dashboard';
import { Settings } from '@/components/tabs/settings';
import { About } from '@/components/tabs/about';
import { ToolWorkspace } from '@/components/tools/ToolWorkspace';
import { useApp } from '@/hooks/useApp';
import { useTranslation } from 'react-i18next';
import { Toaster } from 'react-hot-toast';

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [activeTool, setActiveTool] = useState<string | null>(null);
  
  const { theme, language } = useApp();
  const { i18n } = useTranslation();

  // Sync Language
  useEffect(() => {
    i18n.changeLanguage(language);
  }, [language, i18n]);

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
      {renderContent()}
    </AppLayout>
  );
}

export default App;
