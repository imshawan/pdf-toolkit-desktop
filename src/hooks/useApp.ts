import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { useCallback } from 'react';
import { setTheme, setLanguage, setSidebarHidden } from '@/store/slices/appSlice';

export function useApp() {
  const dispatch = useAppDispatch();

  const theme = useAppSelector((state) => state.app.theme);
  const language = useAppSelector((state) => state.app.language);
  const sidebarHidden = useAppSelector((state) => state.app.sidebarHidden);

  return {
    theme,
    language,
    setTheme: useCallback((t: 'light' | 'dark' | 'system') => dispatch(setTheme(t)), [dispatch]),
    setLanguage: useCallback((lang: string) => dispatch(setLanguage(lang)), [dispatch]),
    setSidebarHidden: useCallback((hidden: boolean) => dispatch(setSidebarHidden(hidden)), [dispatch]),
    sidebarHidden,
  };
}
