import { useEffect } from 'react';
import { Platform, useWindowDimensions } from 'react-native';
import * as ScreenOrientation from 'expo-screen-orientation';
import { useSettings } from '@/context/SettingsContext';

export function useOrientationLayout() {
  const { settings } = useSettings();
  const { width, height } = useWindowDimensions();

  const isLandscape = settings.orientationMode === 'landscape';
  const isViewportLandscape = width > height;

  useEffect(() => {
    if (Platform.OS === 'web') return;
    const lock = isLandscape
      ? ScreenOrientation.OrientationLock.LANDSCAPE
      : ScreenOrientation.OrientationLock.PORTRAIT_UP;
    ScreenOrientation.lockAsync(lock).catch(() => {});
  }, [isLandscape]);

  return {
    isLandscape,
    isViewportLandscape,
    W: width,
    H: height,
    LW: Math.max(width, height),
    LH: Math.min(width, height),
  };
}
