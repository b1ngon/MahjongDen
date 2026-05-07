import React, { useRef, useEffect } from 'react';
import { View, Animated, StyleSheet, Dimensions, Text } from 'react-native';

const { width, height } = Dimensions.get('window');

const PARTICLES = Array.from({ length: 18 }, (_, i) => ({
  left:        Math.random() * width,
  startY:      -30 - Math.random() * height * 0.3,
  endY:        height + 30,
  size:        10 + Math.random() * 10,
  duration:    6000 + Math.random() * 8000,
  delay:       Math.random() * 8000,
  rotation:    Math.random() * 360,
  rotEnd:      Math.random() * 720 - 360,
  opacity:     0.12 + Math.random() * 0.18,
  char:        i % 3 === 0 ? '🍃' : i % 3 === 1 ? '🌿' : '🎋',
}));

const STARS = Array.from({ length: 25 }, () => ({
  top:    Math.random() * height,
  left:   Math.random() * width,
  size:   1 + Math.random() * 2,
  delay:  Math.random() * 3000,
  base:   0.1 + Math.random() * 0.3,
}));

export default function AnimatedBackground() {
  const particleAnims = useRef(PARTICLES.map(() => new Animated.Value(0))).current;
  const starAnims     = useRef(STARS.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    // Falling leaves / bamboo
    const pLoops = particleAnims.map((anim, i) => {
      const p = PARTICLES[i];
      const loop = Animated.loop(
        Animated.sequence([
          Animated.delay(p.delay),
          Animated.timing(anim, {
            toValue: 1, duration: p.duration,
            useNativeDriver: true,
          }),
          Animated.timing(anim, { toValue: 0, duration: 0, useNativeDriver: true }),
        ]),
      );
      loop.start();
      return loop;
    });

    // Twinkling stars
    const sLoops = starAnims.map((anim, i) => {
      const duration = 1500 + Math.random() * 2000;
      const loop = Animated.loop(
        Animated.sequence([
          Animated.delay(STARS[i].delay),
          Animated.timing(anim, { toValue: 1, duration, useNativeDriver: true }),
          Animated.timing(anim, { toValue: 0, duration, useNativeDriver: true }),
        ]),
      );
      loop.start();
      return loop;
    });

    return () => {
      pLoops.forEach(l => l.stop());
      sLoops.forEach(l => l.stop());
    };
  }, []);

  return (
    <View style={[StyleSheet.absoluteFill, { pointerEvents: 'none' }]}>
      {/* Twinkling stars */}
      {STARS.map((star, i) => {
        const opacity = starAnims[i].interpolate({
          inputRange: [0, 1],
          outputRange: [star.base * 0.3, star.base],
        });
        return (
          <Animated.View
            key={`star-${i}`}
            style={{
              position: 'absolute', top: star.top, left: star.left,
              width: star.size, height: star.size,
              borderRadius: star.size / 2,
              backgroundColor: '#C8B87A',
              opacity,
            }}
          />
        );
      })}

      {/* Falling bamboo leaves */}
      {PARTICLES.map((p, i) => {
        const translateY = particleAnims[i].interpolate({
          inputRange: [0, 1],
          outputRange: [p.startY, p.endY],
        });
        const rotate = particleAnims[i].interpolate({
          inputRange: [0, 1],
          outputRange: [`${p.rotation}deg`, `${p.rotation + p.rotEnd}deg`],
        });
        return (
          <Animated.Text
            key={`leaf-${i}`}
            style={{
              position: 'absolute',
              left: p.left,
              fontSize: p.size,
              opacity: p.opacity,
              transform: [{ translateY }, { rotate }],
            }}
          >
            {p.char}
          </Animated.Text>
        );
      })}
    </View>
  );
}
