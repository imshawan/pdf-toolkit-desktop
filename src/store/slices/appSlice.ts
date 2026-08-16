import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface AppState {
  theme: 'light' | 'dark' | 'system';
  language: string;
}

const getInitialTheme = (): AppState['theme'] => {
  const savedTheme = localStorage.getItem('theme') as AppState['theme'];
  return savedTheme || 'system';
};

const getInitialLanguage = (): string => {
  return localStorage.getItem('language') || 'en';
};

const initialState: AppState = {
  theme: getInitialTheme(),
  language: getInitialLanguage(),
};

export const appSlice = createSlice({
  name: 'app',
  initialState,
  reducers: {
    setTheme: (state, action: PayloadAction<AppState['theme']>) => {
      state.theme = action.payload;
      localStorage.setItem('theme', action.payload);
    },
    setLanguage: (state, action: PayloadAction<string>) => {
      state.language = action.payload;
      localStorage.setItem('language', action.payload);
    },
  },
});

export const { setTheme, setLanguage } = appSlice.actions;

export default appSlice.reducer;
