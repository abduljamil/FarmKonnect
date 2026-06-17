import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PALETTES } from '../constants/colors';

// Light/dark theme. Holds the current mode (persisted), exposes the active
// palette, and a toggle. Screens consume colors via useColors() /
// useThemedStyles() so they re-theme live when the mode changes.
const ThemeContext = createContext({
  mode: 'dark',
  colors: PALETTES.dark,
  toggleTheme: () => {},
  setMode: () => {},
});

export const ThemeProvider = ({ children }) => {
  const [mode, setMode] = useState('dark');

  useEffect(() => {
    AsyncStorage.getItem('theme')
      .then((v) => { if (v === 'light' || v === 'dark') setMode(v); })
      .catch(() => {});
  }, []);

  const apply = (m) => {
    setMode(m);
    AsyncStorage.setItem('theme', m).catch(() => {});
  };

  const value = useMemo(
    () => ({
      mode,
      colors: PALETTES[mode] || PALETTES.dark,
      toggleTheme: () => apply(mode === 'dark' ? 'light' : 'dark'),
      setMode: apply,
    }),
    [mode]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => useContext(ThemeContext);
export const useColors = () => useContext(ThemeContext).colors;

// Build a StyleSheet from the active palette; re-memoised on theme change.
// Usage: const makeStyles = (C) => StyleSheet.create({...}); ...
//        const styles = useThemedStyles(makeStyles);
export const useThemedStyles = (factory) => {
  const colors = useColors();
  return useMemo(() => factory(colors), [colors, factory]);
};
