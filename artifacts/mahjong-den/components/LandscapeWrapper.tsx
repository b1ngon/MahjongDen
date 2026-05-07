/**
 * LandscapeWrapper — simple pass-through.
 *
 * On native: expo-screen-orientation (called from useOrientationLayout)
 * locks the device rotation, so the landscape layout fills the screen naturally.
 *
 * On web: the landscape layouts are designed to be adaptive — they render
 * in whatever viewport is available. Rotate your device or widen the browser
 * window to get the full landscape experience.
 */
import React from 'react';

interface Props { children: React.ReactNode }

export default function LandscapeWrapper({ children }: Props) {
  return <>{children}</>;
}
