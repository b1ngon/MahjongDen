import React, { useRef, useEffect } from 'react';
import { View, Animated, StyleSheet, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

// Subtle floating ember / dust particles — warm amber, slow drift upward
const EMBERS = Array.from({ length: 22 }, (_, i) => ({
  left:     10 + Math.random() * (width - 20),
  startY:   height * 0.3 + Math.random() * height * 0.6,
  endY:     -20 - Math.random() * 80,
  size:     1.5 + Math.random() * 2.5,
  duration: 7000 + Math.random() * 9000,
  delay:    Math.random() * 10000,
  opacity:  0.06 + Math.random() * 0.16,
  hue:      i % 3 === 0 ? '#FFB040' : i % 3 === 1 ? '#FF8820' : '#FFD080',
}));

// Gold-tinted twinkling particles
const STARS = Array.from({ length: 30 }, () => ({
  top:    Math.random() * height * 0.55,
  left:   Math.random() * width,
  size:   1 + Math.random() * 2,
  delay:  Math.random() * 4000,
  base:   0.08 + Math.random() * 0.22,
}));

export default function AnimatedBackground() {
  const emberAnims = useRef(EMBERS.map(() => new Animated.Value(0))).current;
  const starAnims  = useRef(STARS.map(() => new Animated.Value(0))).current;
  const firePulse  = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Floating embers drifting upward
    const eLoops = emberAnims.map((anim, i) => {
      const e = EMBERS[i];
      const loop = Animated.loop(
        Animated.sequence([
          Animated.delay(e.delay),
          Animated.timing(anim, { toValue: 1, duration: e.duration, useNativeDriver: true }),
          Animated.timing(anim, { toValue: 0, duration: 0, useNativeDriver: true }),
        ]),
      );
      loop.start();
      return loop;
    });

    // Twinkling stars
    const sLoops = starAnims.map((anim, i) => {
      const dur = 1800 + Math.random() * 2500;
      const loop = Animated.loop(
        Animated.sequence([
          Animated.delay(STARS[i].delay),
          Animated.timing(anim, { toValue: 1, duration: dur, useNativeDriver: true }),
          Animated.timing(anim, { toValue: 0, duration: dur, useNativeDriver: true }),
        ]),
      );
      loop.start();
      return loop;
    });

    // Slow fireplace pulse
    const fpLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(firePulse, { toValue: 1, duration: 2200, useNativeDriver: false }),
        Animated.timing(firePulse, { toValue: 0, duration: 2800, useNativeDriver: false }),
      ]),
    );
    fpLoop.start();

    return () => {
      eLoops.forEach(l => l.stop());
      sLoops.forEach(l => l.stop());
      fpLoop.stop();
    };
  }, []);

  return (
    <View style={[StyleSheet.absoluteFill, { pointerEvents: 'none' }] as any}>
      {/* Base warm dark room */}
      <LinearGradient
        colors={['#120A04', '#0E0C05', '#0A0E06'] as [string,string,string]}
        style={StyleSheet.absoluteFill}
      />

      {/* Fireplace glow — lower center warm */}
      <View
        style={{
          position: 'absolute', bottom: '8%', left: 0, right: 0, height: 320,
          backgroundImage: 'radial-gradient(ellipse at 50% 100%, rgba(220,100,20,0.22) 0%, rgba(180,60,10,0.10) 35%, transparent 68%)',
        } as any}
      />

      {/* Left lantern glow */}
      <View
        style={{
          position: 'absolute', top: '12%', left: -60, width: 260, height: 260,
          backgroundImage: 'radial-gradient(circle, rgba(255,160,40,0.16) 0%, rgba(200,100,20,0.06) 50%, transparent 70%)',
        } as any}
      />

      {/* Right lantern glow */}
      <View
        style={{
          position: 'absolute', top: '8%', right: -60, width: 240, height: 240,
          backgroundImage: 'radial-gradient(circle, rgba(255,140,30,0.14) 0%, rgba(200,90,20,0.05) 50%, transparent 70%)',
        } as any}
      />

      {/* Moonlit window — top center cool blue-white */}
      <View
        style={{
          position: 'absolute', top: -50, left: '22%', right: '22%', height: 220,
          backgroundImage: 'radial-gradient(ellipse at center top, rgba(80,120,180,0.14) 0%, rgba(40,70,120,0.05) 50%, transparent 75%)',
        } as any}
      />

      {/* Top-center table-lamp warm fill */}
      <View
        style={{
          position: 'absolute', top: '30%', left: '15%', right: '15%', height: 180,
          backgroundImage: 'radial-gradient(ellipse, rgba(200,140,40,0.06) 0%, transparent 70%)',
        } as any}
      />

      {/* Vignette — bottom fade to black */}
      <View
        style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, height: 280,
          backgroundImage: 'linear-gradient(to top, rgba(4,3,2,0.75) 0%, transparent 100%)',
        } as any}
      />

      {/* Top edge vignette */}
      <View
        style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 150,
          backgroundImage: 'linear-gradient(to bottom, rgba(4,3,2,0.5) 0%, transparent 100%)',
        } as any}
      />

      {/* Twinkling gold stars */}
      {STARS.map((star, i) => {
        const opacity = starAnims[i].interpolate({
          inputRange: [0, 1],
          outputRange: [star.base * 0.2, star.base],
        });
        return (
          <Animated.View
            key={`star-${i}`}
            style={{
              position: 'absolute', top: star.top, left: star.left,
              width: star.size, height: star.size,
              borderRadius: star.size / 2,
              backgroundColor: '#D4A84B',
              opacity,
            }}
          />
        );
      })}

      {/* Drifting ember particles */}
      {EMBERS.map((e, i) => {
        const translateY = emberAnims[i].interpolate({
          inputRange: [0, 1], outputRange: [e.startY, e.endY],
        });
        const opacity = emberAnims[i].interpolate({
          inputRange: [0, 0.1, 0.85, 1], outputRange: [0, e.opacity, e.opacity, 0],
        });
        return (
          <Animated.View
            key={`ember-${i}`}
            style={{
              position: 'absolute', left: e.left,
              width: e.size, height: e.size,
              borderRadius: e.size / 2,
              backgroundColor: e.hue,
              opacity, transform: [{ translateY }],
            }}
          />
        );
      })}
    </View>
  );
}
