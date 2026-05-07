import React, { useRef, useEffect, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Image,
  Animated, Dimensions, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import colors from '@/constants/colors';
import { useGameStore } from '@/store/gameStore';

const { width, height } = Dimensions.get('window');
const LUNA_IMAGE = require('../assets/images/char_luna.png');

// Pre-compute star positions using pixel values (avoids `as any` string-percentage cast)
const STARS = Array.from({ length: 30 }, () => ({
  top:     Math.random() * height * 0.68,
  left:    Math.random() * width,
  size:    Math.random() * 3 + 1,
  opacity: Math.random() * 0.6 + 0.2,
}));

export default function LobbyScreen() {
  const insets    = useSafeAreaInsets();
  const startGame = useGameStore(s => s.startGame);

  const charAnim  = useRef(new Animated.Value(0)).current;
  const titleAnim = useRef(new Animated.Value(0)).current;
  const btnAnim   = useRef(new Animated.Value(0)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.stagger(120, [
      Animated.spring(titleAnim, { toValue: 1, useNativeDriver: true, tension: 60, friction: 8 }),
      Animated.spring(charAnim,  { toValue: 1, useNativeDriver: true, tension: 50, friction: 7 }),
      Animated.spring(btnAnim,   { toValue: 1, useNativeDriver: true, tension: 60, friction: 8 }),
    ]).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, { toValue: 1, duration: 2200, useNativeDriver: true }),
        Animated.timing(floatAnim, { toValue: 0, duration: 2200, useNativeDriver: true }),
      ]),
    ).start();
  }, []);

  const floatY = floatAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -12] });

  function handleQuickMatch() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    startGame();
    router.push('/game');
  }

  const topPad = Platform.OS === 'web' ? 67 : insets.top;

  return (
    <LinearGradient colors={['#04071A', '#0A1040', '#080C1A']} style={styles.root}>
      {/* Stars — pixel positions, no `as any` */}
      <View style={[StyleSheet.absoluteFill, { pointerEvents: 'none' }]}>
        {STARS.map((star, i) => (
          <View
            key={i}
            style={{
              position: 'absolute',
              top: star.top,
              left: star.left,
              width: star.size,
              height: star.size,
              borderRadius: star.size / 2,
              backgroundColor: '#fff',
              opacity: star.opacity,
            }}
          />
        ))}
      </View>

      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 12 }]}>
        <Animated.View style={{
          opacity: titleAnim,
          transform: [{ scale: titleAnim.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1] }) }],
        }}>
          <Text style={styles.titleJp}>麻雀</Text>
          <Text style={styles.titleEn}>MAHJONG DEN</Text>
          <Text style={styles.subtitle}>東風戦 · East Round</Text>
        </Animated.View>
      </View>

      {/* Character */}
      <Animated.View style={[styles.charContainer, {
        opacity: charAnim,
        transform: [
          { translateY: floatY },
          { scale: charAnim.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1] }) },
        ],
      }]}>
        <Image source={LUNA_IMAGE} style={styles.charImage} resizeMode="contain" />
        <View style={styles.charGlow} />
      </Animated.View>

      {/* Speech bubble */}
      <Animated.View style={[styles.bubble, { opacity: btnAnim }]}>
        <Text style={styles.bubbleText}>Ready to face the table? Let's play!</Text>
      </Animated.View>

      {/* Buttons */}
      <Animated.View style={[styles.btnGroup, {
        opacity: btnAnim,
        transform: [{ translateY: btnAnim.interpolate({ inputRange: [0, 1], outputRange: [30, 0] }) }],
        paddingBottom: Platform.OS === 'web' ? 34 : insets.bottom + 12,
      }]}>
        <TouchableOpacity style={styles.primaryBtn} onPress={handleQuickMatch} activeOpacity={0.85}>
          <LinearGradient
            colors={[colors.primary, '#A07820']}
            style={styles.primaryBtnInner}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Text style={styles.primaryBtnText}>Quick Match</Text>
            <Text style={styles.primaryBtnSub}>1 vs 3 AI · East Round</Text>
          </LinearGradient>
        </TouchableOpacity>

        <View style={styles.secondaryRow}>
          <TouchableOpacity style={styles.secondaryBtn} onPress={() => { Haptics.selectionAsync(); router.push('/history'); }} activeOpacity={0.8}>
            <Text style={styles.secondaryIcon}>📊</Text>
            <Text style={styles.secondaryLabel}>History</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryBtn} onPress={() => { Haptics.selectionAsync(); router.push('/settings'); }} activeOpacity={0.8}>
            <Text style={styles.secondaryIcon}>⚙️</Text>
            <Text style={styles.secondaryLabel}>Settings</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.version}>Riichi Mahjong · East Round Format</Text>
      </Animated.View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { alignItems: 'center', paddingBottom: 8 },
  titleJp: {
    color: colors.primary, fontSize: 42, fontWeight: '900' as const,
    textAlign: 'center', letterSpacing: 4,
  },
  titleEn: {
    color: colors.text, fontSize: 22, fontWeight: '800' as const,
    textAlign: 'center', letterSpacing: 6, marginTop: -4,
  },
  subtitle: { color: colors.textMuted, fontSize: 12, textAlign: 'center', letterSpacing: 2, marginTop: 4 },
  charContainer: { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  charImage: { width: width * 0.7, height: width * 0.9, maxHeight: 380 },
  charGlow: {
    position: 'absolute', bottom: 0,
    width: width * 0.5, height: 80,
    backgroundColor: colors.primary, opacity: 0.12,
    borderRadius: 999,
  },
  bubble: {
    marginHorizontal: 48, marginBottom: 16,
    backgroundColor: colors.surfaceElevated, borderRadius: 14,
    paddingVertical: 10, paddingHorizontal: 16,
    borderWidth: 1, borderColor: colors.border, alignSelf: 'center',
  },
  bubbleText: { color: colors.text, fontSize: 13, textAlign: 'center', fontStyle: 'italic' },
  btnGroup: { paddingHorizontal: 24, gap: 12 },
  primaryBtn: {
    borderRadius: 14, overflow: 'hidden',
    boxShadow: '0px 4px 12px rgba(200,168,75,0.5)', elevation: 8,
  },
  primaryBtnInner: { paddingVertical: 18, alignItems: 'center' },
  primaryBtnText: {
    color: '#0A0E1A', fontSize: 18, fontWeight: '900' as const, letterSpacing: 1,
  },
  primaryBtnSub: { color: 'rgba(10,14,26,0.6)', fontSize: 11, marginTop: 2 },
  secondaryRow: { flexDirection: 'row', gap: 12 },
  secondaryBtn: {
    flex: 1, backgroundColor: colors.surfaceElevated, borderRadius: 12,
    paddingVertical: 16, alignItems: 'center', gap: 4,
    borderWidth: 1, borderColor: colors.border,
  },
  secondaryIcon: { fontSize: 22 },
  secondaryLabel: { color: colors.textSecondary, fontSize: 12, fontWeight: '700' },
  version: { color: colors.textMuted, fontSize: 10, textAlign: 'center', letterSpacing: 1 },
});
