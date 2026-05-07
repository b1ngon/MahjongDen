import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface Settings {
  soundEnabled: boolean;
  hapticEnabled: boolean;
  showTileHints: boolean;
  animationSpeed: 'slow' | 'normal' | 'fast';
  orientationMode: 'portrait' | 'landscape';
}

const DEFAULT: Settings = {
  soundEnabled: true,
  hapticEnabled: true,
  showTileHints: true,
  animationSpeed: 'normal',
  orientationMode: 'portrait',
};

interface SettingsContextValue {
  settings: Settings;
  updateSetting: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);
const STORAGE_KEY = 'mahjong_den_settings';

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<Settings>(DEFAULT);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then(raw => {
      if (raw) {
        try { setSettings({ ...DEFAULT, ...JSON.parse(raw) }); } catch {}
      }
    });
  }, []);

  function updateSetting<K extends keyof Settings>(key: K, value: Settings[K]) {
    setSettings(prev => {
      const next = { ...prev, [key]: value };
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }

  return (
    <SettingsContext.Provider value={{ settings, updateSetting }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider');
  return ctx;
}
