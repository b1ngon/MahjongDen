import React, { useRef, useEffect, useMemo } from 'react';
import { View, Animated, StyleSheet, Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');
const STAR_COUNT = 30;

const STARS = Array.from({ length: STAR_COUNT }, () => ({
  top:     Math.random() * height,
  left:    Math.random() * width,
  size:    Math.random() * 2.5 + 0.8,
  delay:   Math.random() * 2000,
  baseOpacity: Math.random() * 0.4 + 0.15,
}));

export default function AnimatedBackground() {
  const anims = useRef(STARS.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    const loops = anims.map((anim, i) => {
      const duration = 1800 + Math.random() * 1600;
      return Animated.loop(
        Animated.sequence([
          Animated.delay(STARS[i].delay),
          Animated.timing(anim, { toValue: 1, duration, useNativeDriver: true }),
          Animated.timing(anim, { toValue: 0, duration, useNativeDriver: true }),
        ]),
      );
    });
    loops.forEach(l => l.start());
    return () => loops.forEach(l => l.stop());
  }, []);

  return (
    <View style={[StyleSheet.absoluteFill, { pointerEvents: 'none' }]}>
      {STARS.map((star, i) => {
        const opacity = anims[i].interpolate({
          inputRange: [0, 1],
          outputRange: [star.baseOpacity * 0.4, star.baseOpacity],
        });
        return (
          <Animated.View
            key={i}
            style={{
              position: 'absolute',
              top:    star.top,
              left:   star.left,
              width:  star.size,
              height: star.size,
              borderRadius: star.size / 2,
              backgroundColor: '#fff',
              opacity,
            }}
          />
        );
      })}
    </View>
  );
}
