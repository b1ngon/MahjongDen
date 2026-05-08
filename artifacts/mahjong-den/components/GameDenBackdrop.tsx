import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, useWindowDimensions, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

/**
 * GameDenBackdrop
 * ----------------------------------------------------------------------
 * A layered "Mahjong Den" environment painted entirely with React Native
 * primitives + linear gradients (no external assets, no GL). The goal is
 * a cinematic, atmospheric tea-house scene that lives BEHIND gameplay:
 *
 *   • Deep dark-emerald + walnut color palette
 *   • Back-wall paneling with subtle vertical grain + rim light
 *   • Hanging paper lanterns with warm bloom halos (pulsing softly)
 *   • Moonlit circular window with cool back-light
 *   • Fireplace warmth wash near the floor
 *   • Bamboo silhouette on one side, shelf silhouettes on the other
 *   • Soft global vignette + table-shadow haze near the bottom
 *
 * No game state is touched here — this component is render-only and is
 * absolutely positioned beneath the table/HUD.
 */
export default function GameDenBackdrop() {
  const { width: W, height: H } = useWindowDimensions();

  const fire = useRef(new Animated.Value(0)).current;
  const lantern = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const fireLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(fire, { toValue: 1, duration: 2400, useNativeDriver: false }),
        Animated.timing(fire, { toValue: 0, duration: 3200, useNativeDriver: false }),
      ]),
    );
    const lanternLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(lantern, { toValue: 1, duration: 3600, useNativeDriver: false }),
        Animated.timing(lantern, { toValue: 0, duration: 4200, useNativeDriver: false }),
      ]),
    );
    fireLoop.start();
    lanternLoop.start();
    return () => {
      fireLoop.stop();
      lanternLoop.stop();
    };
  }, [fire, lantern]);

  const fireOpacity = fire.interpolate({ inputRange: [0, 1], outputRange: [0.18, 0.36] });
  const lanternOpacity = lantern.interpolate({ inputRange: [0, 1], outputRange: [0.55, 0.92] });

  // --- Geometry helpers (resolution-relative so it scales on tablet/phone)
  const lanternY = H * 0.06;
  const moonR = Math.min(W, H) * 0.16;

  return (
    <View style={[StyleSheet.absoluteFill, { pointerEvents: 'none' }]} accessibilityElementsHidden>
      {/* ── 1. Deep ambient base ───────────────────────────────────────── */}
      <LinearGradient
        colors={['#06100C', '#0A1812', '#080F0B', '#040806']}
        locations={[0, 0.42, 0.78, 1]}
        style={StyleSheet.absoluteFill}
      />

      {/* ── 2. Back wall: dark emerald → walnut floor transition ───────── */}
      <LinearGradient
        colors={['rgba(8,18,14,0.0)', 'rgba(14,28,22,0.85)', 'rgba(28,16,8,0.92)']}
        locations={[0, 0.55, 1]}
        style={StyleSheet.absoluteFill}
      />

      {/* ── 3. Vertical wall paneling (subtle grain) ───────────────────── */}
      <View style={[styles.panelStrip, { height: H * 0.7 }]}>
        {Array.from({ length: 14 }).map((_, i) => (
          <LinearGradient
            key={i}
            colors={['rgba(255,210,140,0.025)', 'transparent', 'rgba(255,210,140,0.02)']}
            style={{
              width: W / 14 - 0.5,
              height: '100%',
              opacity: 0.6 + (i % 3) * 0.12,
            }}
          />
        ))}
      </View>

      {/* ── 4. Top rim warm wash (lantern light from above) ────────────── */}
      <LinearGradient
        colors={[
          'rgba(220,150,60,0.18)',
          'rgba(180,110,40,0.06)',
          'transparent',
        ]}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: H * 0.28,
        }}
      />

      {/* ── 5. Moonlit circular window (right) ────────────────────────── */}
      <View
        style={{
          position: 'absolute',
          top: H * 0.07,
          right: W * 0.04,
          width: moonR * 2,
          height: moonR * 2,
        }}
      >
        {/* Outer cool bloom */}
        <View
          style={{
            position: 'absolute',
            top: -moonR * 0.4,
            left: -moonR * 0.4,
            right: -moonR * 0.4,
            bottom: -moonR * 0.4,
            borderRadius: 999,
            backgroundColor: 'rgba(180,210,235,0.10)',
          }}
        />
        {/* Carved window frame */}
        <LinearGradient
          colors={['#7A5A28', '#3A2810', '#5C401A'] as [string, string, string]}
          style={{ flex: 1, borderRadius: 999, padding: 4 }}
        >
          <LinearGradient
            colors={['#0E1A26', '#1C2C40', '#0A1320'] as [string, string, string]}
            style={{ flex: 1, borderRadius: 999, overflow: 'hidden' }}
          >
            {/* Soft moon disc */}
            <View
              style={{
                position: 'absolute',
                top: '14%',
                left: '20%',
                width: '52%',
                height: '52%',
                borderRadius: 999,
                backgroundColor: 'rgba(232,236,224,0.78)',
                shadowColor: '#E8ECE0',
                shadowOpacity: 0.7,
                shadowRadius: 20,
                shadowOffset: { width: 0, height: 0 },
              }}
            />
            {/* Bamboo silhouette across window */}
            <View
              style={{
                position: 'absolute',
                left: '8%',
                top: '15%',
                bottom: '5%',
                width: 2.5,
                backgroundColor: 'rgba(0,0,0,0.45)',
              }}
            />
            <View
              style={{
                position: 'absolute',
                left: '22%',
                top: '5%',
                bottom: '10%',
                width: 2,
                backgroundColor: 'rgba(0,0,0,0.35)',
              }}
            />
          </LinearGradient>
        </LinearGradient>
      </View>

      {/* ── 6. Hanging paper lanterns (left + center) ──────────────────── */}
      <Lantern x={W * 0.12} y={lanternY} size={W * 0.075} opacity={lanternOpacity} />
      <Lantern x={W * 0.34} y={lanternY + H * 0.03} size={W * 0.06} opacity={lanternOpacity} />
      <Lantern x={W * 0.62} y={lanternY + H * 0.025} size={W * 0.055} opacity={lanternOpacity} />

      {/* ── 7. Fireplace warmth wash near the floor (left) ─────────────── */}
      <Animated.View
        pointerEvents="none"
        style={{
          position: 'absolute',
          left: -W * 0.1,
          bottom: H * 0.04,
          width: W * 0.55,
          height: H * 0.28,
          borderRadius: 200,
          backgroundColor: '#E06022',
          opacity: Platform.OS === 'web' ? 0.22 : fireOpacity,
        }}
      />
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          left: -W * 0.06,
          bottom: H * 0.02,
          width: W * 0.44,
          height: H * 0.18,
          borderRadius: 200,
          backgroundColor: '#FFB060',
          opacity: 0.06,
        }}
      />

      {/* ── 8. Floor: warm wood with depth fade ───────────────────────── */}
      <LinearGradient
        colors={['transparent', 'rgba(60,30,12,0.55)', 'rgba(14,7,4,0.95)']}
        locations={[0, 0.45, 1]}
        style={[styles.floor, { height: H * 0.42 }]}
      />

      {/* ── 9. Right-side shelf silhouettes (bottles / tea jars) ──────── */}
      <View style={{ position: 'absolute', right: W * 0.03, top: H * 0.32 }}>
        {[0, 1, 2].map(i => (
          <View
            key={i}
            style={{
              width: W * 0.12 + i * 4,
              height: 6,
              marginTop: i === 0 ? 0 : 14,
              borderRadius: 1,
              borderTopWidth: 1,
              borderTopColor: 'rgba(160,110,50,0.35)',
              backgroundColor: 'rgba(20,12,6,0.65)',
            }}
          />
        ))}
        {/* Soft jar silhouettes on top shelf */}
        <View
          style={{
            position: 'absolute',
            top: -10,
            left: 8,
            width: 8,
            height: 12,
            borderRadius: 2,
            backgroundColor: 'rgba(40,20,10,0.85)',
          }}
        />
        <View
          style={{
            position: 'absolute',
            top: -14,
            left: 24,
            width: 10,
            height: 16,
            borderRadius: 2,
            backgroundColor: 'rgba(50,28,14,0.85)',
          }}
        />
      </View>

      {/* ── 10. Center floor pool / ambient table shadow ─────────────── */}
      <View
        style={{
          position: 'absolute',
          alignSelf: 'center',
          bottom: H * 0.01,
          width: W * 0.78,
          height: H * 0.06,
          borderRadius: 200,
          backgroundColor: 'rgba(0,0,0,0.55)',
          opacity: 0.7,
        }}
      />

      {/* ── 11. Global vignette: top + bottom darkening for cinematic frame */}
      <LinearGradient
        colors={['rgba(0,0,0,0.55)', 'transparent', 'transparent', 'rgba(0,0,0,0.7)']}
        locations={[0, 0.18, 0.7, 1]}
        style={StyleSheet.absoluteFill}
      />

      {/* ── 12. Subtle warm fog across mid-screen (depth haze) ───────── */}
      <LinearGradient
        colors={['transparent', 'rgba(120,60,20,0.06)', 'transparent']}
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: H * 0.32,
          height: H * 0.18,
        }}
      />
    </View>
  );
}

/** Single hanging paper lantern with a warm halo bloom. */
function Lantern({
  x,
  y,
  size,
  opacity,
}: {
  x: number;
  y: number;
  size: number;
  opacity: Animated.AnimatedInterpolation<number>;
}) {
  return (
    <View style={{ position: 'absolute', left: x - size / 2, top: y, width: size, alignItems: 'center' }}>
      {/* String to ceiling */}
      <View style={{ width: 1, height: size * 0.8, backgroundColor: 'rgba(60,40,20,0.5)' }} />
      {/* Cap */}
      <View
        style={{
          width: size * 0.45,
          height: size * 0.12,
          borderRadius: 1,
          backgroundColor: '#1A0E08',
          marginTop: -1,
        }}
      />
      {/* Halo bloom (behind the body) */}
      <Animated.View
        style={{
          position: 'absolute',
          top: size * 0.3,
          width: size * 2.6,
          height: size * 2.6,
          borderRadius: 999,
          backgroundColor: '#FFB060',
          opacity,
        }}
      />
      {/* Body */}
      <View
        style={{
          width: size,
          height: size * 1.05,
          borderRadius: size * 0.45,
          overflow: 'hidden',
          borderWidth: 1,
          borderColor: 'rgba(180,80,30,0.6)',
        }}
      >
        <LinearGradient
          colors={['#FFC880', '#E07028', '#A03E10'] as [string, string, string]}
          style={StyleSheet.absoluteFill}
        />
        {/* Vertical paper ribs */}
        <View style={{ flex: 1, flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 2 }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <View key={i} style={{ width: 0.5, height: '100%', backgroundColor: 'rgba(80,30,8,0.5)' }} />
          ))}
        </View>
        {/* Top + bottom bands */}
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, backgroundColor: '#3A1808' }} />
        <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 2, backgroundColor: '#3A1808' }} />
      </View>
      {/* Tassel */}
      <View style={{ width: 1, height: size * 0.18, backgroundColor: '#3A1808' }} />
    </View>
  );
}

const styles = StyleSheet.create({
  floor: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  panelStrip: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
});
