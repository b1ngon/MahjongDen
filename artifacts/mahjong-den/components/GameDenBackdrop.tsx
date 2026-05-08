import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, useWindowDimensions, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

/** Layered “study / den” backdrop to approximate the 3D mockup (no external asset). */
export default function GameDenBackdrop() {
  const { width: W, height: H } = useWindowDimensions();
  const fire = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(fire, { toValue: 1, duration: 2400, useNativeDriver: false }),
        Animated.timing(fire, { toValue: 0, duration: 3200, useNativeDriver: false }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [fire]);

  const fireOpacity = fire.interpolate({ inputRange: [0, 1], outputRange: [0.14, 0.28] });

  return (
    <View style={[StyleSheet.absoluteFill, { pointerEvents: 'none' }]} accessibilityElementsHidden>
      <LinearGradient
        colors={['#0C0704', '#100A06', '#0A0E08', '#080604']}
        locations={[0, 0.35, 0.72, 1]}
        style={StyleSheet.absoluteFill}
      />

      <LinearGradient
        colors={['transparent', 'rgba(35,18,8,0.55)', 'rgba(12,6,3,0.92)']}
        style={[styles.floor, { height: H * 0.42 }]}
      />

      <View style={[styles.wall, { height: H * 0.62 }]}>
        {Array.from({ length: 18 }).map((_, i) => (
          <View
            key={i}
            style={[
              styles.wallSlat,
              {
                width: W / 18 - 0.5,
                opacity: 0.04 + (i % 3) * 0.02,
              },
            ]}
          />
        ))}
      </View>

      <LinearGradient
        colors={['rgba(120,55,12,0.22)', 'transparent']}
        style={{
          position: 'absolute',
          top: H * 0.08,
          left: -20,
          width: W * 0.35,
          height: H * 0.45,
          borderRadius: 120,
        }}
      />

      <View style={{ position: 'absolute', left: W * 0.04, top: H * 0.12 }}>
        {[0, 1, 2].map(i => (
          <View
            key={i}
            style={{
              width: 56 + i * 8,
              marginTop: i === 0 ? 0 : 10,
              height: 8,
              borderRadius: 2,
              overflow: 'hidden',
              borderWidth: 1,
              borderColor: 'rgba(120,80,40,0.5)',
            }}
          >
            <LinearGradient colors={['#2A1810', '#1A0E08']} style={StyleSheet.absoluteFill} />
          </View>
        ))}
      </View>

      <Animated.View
        style={{
          position: 'absolute',
          width: W * 0.85,
          height: H * 0.38,
          bottom: H * 0.02,
          alignSelf: 'center',
          borderRadius: 200,
          backgroundColor: '#E06020',
          opacity: Platform.OS === 'web' ? 0.22 : fireOpacity,
        }}
      />

      <View
        style={{
          position: 'absolute',
          width: W * 0.42,
          bottom: H * 0.06,
          alignSelf: 'center',
          borderRadius: 8,
          overflow: 'hidden',
          borderWidth: 2,
          borderColor: 'rgba(140,100,40,0.6)',
        }}
      >
        <LinearGradient colors={['#3E2210', '#1E0E06', '#2A1408']} style={{ height: 14, width: '100%' }} />
        <View
          style={{
            height: 52,
            marginHorizontal: 10,
            marginBottom: 8,
            borderRadius: 4,
            overflow: 'hidden',
            borderWidth: 1,
            borderColor: 'rgba(0,0,0,0.6)',
          }}
        >
          <LinearGradient colors={['#4A1808', '#1A0604', '#0A0302']} style={StyleSheet.absoluteFill} />
          <LinearGradient
            colors={['rgba(255,120,30,0.45)', 'rgba(180,40,10,0.15)', 'transparent']}
            style={{
              position: 'absolute',
              bottom: 0,
              left: '10%',
              right: '10%',
              height: '75%',
              borderTopLeftRadius: 40,
              borderTopRightRadius: 40,
            }}
          />
        </View>
      </View>

      <View
        style={{
          position: 'absolute',
          width: W * 0.22,
          height: W * 0.22,
          top: H * 0.08,
          right: W * 0.04,
          borderRadius: 999,
          overflow: 'hidden',
        }}
      >
        <LinearGradient colors={['#C9A040', '#8A6A20']} style={{ flex: 1, padding: 3, borderRadius: 999 }}>
          <LinearGradient
            colors={['#0A1520', '#152535', '#0A1018']}
            style={{ flex: 1, borderRadius: 999, overflow: 'hidden', justifyContent: 'flex-end' }}
          >
            <View
              style={{
                alignSelf: 'center',
                width: '38%',
                height: '42%',
                marginBottom: '12%',
                borderRadius: 2,
                backgroundColor: 'rgba(200,180,120,0.12)',
                borderWidth: 1,
                borderColor: 'rgba(200,180,120,0.18)',
              }}
            />
          </LinearGradient>
        </LinearGradient>
      </View>

      <LinearGradient
        colors={['rgba(24,12,8,0.75)', 'rgba(12,8,6,0.35)', 'transparent']}
        style={{
          position: 'absolute',
          width: W * 0.28,
          height: H * 0.12,
          top: H * 0.38,
          right: W * 0.02,
          borderRadius: 10,
        }}
      />

      <LinearGradient
        colors={['rgba(0,0,0,0.55)', 'transparent', 'transparent', 'rgba(0,0,0,0.65)']}
        locations={[0, 0.18, 0.65, 1]}
        style={StyleSheet.absoluteFill}
      />
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
  wall: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  wallSlat: {
    height: '100%',
    backgroundColor: '#F0E0D0',
  },
});
