import { useWindowDimensions } from 'react-native';
import { useSettings } from '@/context/SettingsContext';

/**
 * Returns the current orientation preference and viewport dimensions.
 * Layout switching is purely visual — no device rotation locking.
 * On a real device, the user rotates their phone to match the selected mode.
 */
export function useOrientationLayout() {
  const { settings } = useSettings();
  const { width, height } = useWindowDimensions();

  const isLandscape = settings.orientationMode === 'landscape';
  const isViewportLandscape = width > height;

  return {
    isLandscape,
    isViewportLandscape,
    W: width,
    H: height,
    LW: Math.max(width, height),
    LH: Math.min(width, height),
  };
}
