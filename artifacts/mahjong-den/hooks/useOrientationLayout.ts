import { useWindowDimensions, Platform } from 'react-native';
import { useEffect } from 'react';
import { useSettings } from '@/context/SettingsContext';

export function useOrientationLayout() {
  const { settings } = useSettings();
  const { width, height } = useWindowDimensions();

  const isLandscape = settings.orientationMode === 'landscape';
  const isViewportLandscape = width > height;

  // On native, lock device orientation to match the preference
  useEffect(() => {
    if (Platform.OS === 'web') return;
    (async () => {
      try {
        const SO = await import('expo-screen-orientation');
        if (isLandscape) {
          await SO.lockAsync(SO.OrientationLock.LANDSCAPE);
        } else {
          await SO.lockAsync(SO.OrientationLock.PORTRAIT_UP);
        }
      } catch {
        // expo-screen-orientation not available — ignore
      }
    })();
  }, [isLandscape]);

  return {
    isLandscape,
    isViewportLandscape,
    // Use actual viewport dimensions
    W: width,
    H: height,
    // Effective dimensions for a landscape design
    LW: Math.max(width, height),
    LH: Math.min(width, height),
  };
}
