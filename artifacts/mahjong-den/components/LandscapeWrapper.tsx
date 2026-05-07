/**
 * LandscapeWrapper
 *
 * When landscape mode is selected but the current viewport is portrait
 * (common on web / canvas preview), this rotates the content -90° so it
 * fills the screen sideways — giving a true landscape experience without
 * requiring device rotation on web.
 *
 * On native, expo-screen-orientation locks the device, so the wrapper
 * just passes children through unchanged.
 */
import React from 'react';
import { View, useWindowDimensions, Platform } from 'react-native';
import { useOrientationLayout } from '@/hooks/useOrientationLayout';

interface Props { children: React.ReactNode }

export default function LandscapeWrapper({ children }: Props) {
  const { isLandscape, isViewportLandscape } = useOrientationLayout();
  const { width, height } = useWindowDimensions();

  // No rotation needed: not landscape mode, or device already landscape
  if (!isLandscape || isViewportLandscape) {
    return <>{children}</>;
  }

  // Native handles orientation via ScreenOrientation lock — no transform needed
  if (Platform.OS !== 'web') {
    return <>{children}</>;
  }

  // Web + portrait viewport + landscape mode selected:
  // Rotate content -90deg so it visually fills the screen in landscape.
  // The inner content targets landscape dimensions (height × width).
  const LW = height; // landscape width  = tall dimension
  const LH = width;  // landscape height = short dimension

  // After rotating -90deg, a LW×LH box visually becomes LH×LW.
  // Translate so the rotated box aligns with the top-left of the viewport.
  const tx = (width  - LW) / 2;
  const ty = (height - LH) / 2;

  return (
    <View style={{ width, height, overflow: 'hidden' }}>
      <View
        style={{
          position: 'absolute',
          width: LW,
          height: LH,
          transform: [
            { translateX: tx },
            { translateY: ty },
            { rotate: '-90deg' },
          ],
        }}
      >
        {children}
      </View>
    </View>
  );
}
