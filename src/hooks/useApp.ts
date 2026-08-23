import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { useCallback } from 'react';
import { setTheme, setLanguage, setSidebarHidden, setPendingOSFiles, clearPendingOSFiles } from '@/store/slices/appSlice';

export function useApp() {
  const dispatch = useAppDispatch();

  const theme = useAppSelector((state) => state.app.theme);
  const language = useAppSelector((state) => state.app.language);
  const sidebarHidden = useAppSelector((state) => state.app.sidebarHidden);
  const pendingOSFiles = useAppSelector((state) => state.app.pendingOSFiles);

  return {
    theme,
    language,
    setTheme: useCallback((t: 'light' | 'dark' | 'system') => dispatch(setTheme(t)), [dispatch]),
    setLanguage: useCallback((lang: string) => dispatch(setLanguage(lang)), [dispatch]),
    setSidebarHidden: useCallback((hidden: boolean) => dispatch(setSidebarHidden(hidden)), [dispatch]),
    sidebarHidden,
    pendingOSFiles,
    setPendingOSFiles: useCallback((files: string[]) => dispatch(setPendingOSFiles(files)), [dispatch]),
    clearPendingOSFiles: useCallback(() => dispatch(clearPendingOSFiles()), [dispatch]),
  };
}
