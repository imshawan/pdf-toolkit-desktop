import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { setTheme, setLanguage } from '@/store/slices/appSlice';

export function useApp() {
  const dispatch = useAppDispatch();

  const theme = useAppSelector((state) => state.app.theme);
  const language = useAppSelector((state) => state.app.language);

  return {
    theme,
    language,
    setTheme: (t: 'light' | 'dark' | 'system') => dispatch(setTheme(t)),
    setLanguage: (lang: string) => dispatch(setLanguage(lang)),
  };
}
