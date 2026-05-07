import React, { useRef, useEffect } from 'react';
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
import { useShopStore } from '@/store/shopStore';
import AnimatedBackground from '@/components/AnimatedBackground';

const { width } = Dimensions.get('window');
const LUNA_IMAGE = require('../assets/images/char_luna.png');

export default function LobbyScreen() {
  const insets    = useSafeAreaInsets();
  const startGame = useGameStore(s => s.startGame);
  const coins     = useShopStore(s => s.coins);
  const loadShop  = useShopStore(s => s.load);

  const titleAnim = useRef(new Animated.Value(0)).current;
  const charAnim  = useRef(new Animated.Value(0)).current;
  const btnAnim   = useRef(new Animated.Value(0)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadShop();
    Animated.stagger(100, [
      Animated.spring(titleAnim, { toValue: 1, useNativeDriver: true, tension: 55, friction: 8 }),
      Animated.spring(charAnim,  { toValue: 1, useNativeDriver: true, tension: 50, friction: 7 }),
      Animated.spring(btnAnim,   { toValue: 1, useNativeDriver: true, tension: 55, friction: 8 }),
    ]).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, { toValue: 1, duration: 2400, useNativeDriver: true }),
        Animated.timing(floatAnim, { toValue: 0, duration: 2400, useNativeDriver: true }),
      ]),
    ).start();
  }, []);

  const floatY = floatAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -10] });

  function handleQuickMatch() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    startGame();
    router.push('/game');
  }

  const topPad = Platform.OS === 'web' ? 67 : insets.top;
  const botPad = Platform.OS === 'web' ? 34 : insets.bottom;

  return (
    <LinearGradient colors={['#030D04', '#061209', '#030D04']} style={styles.root}>
      <AnimatedBackground />

      {/* Coin display */}
      <Animated.View style={[styles.coinRow, { opacity: btnAnim, paddingTop: topPad + 8 }]}>
        <View style={styles.coinBadge}>
          <Text style={styles.coinIcon}>🪙</Text>
          <Text style={styles.coinAmount}>{coins.toLocaleString()}</Text>
        </View>
      </Animated.View>

      {/* Title */}
      <Animated.View style={[styles.header, {
        opacity: titleAnim,
        transform: [{ scale: titleAnim.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] }) }],
      }]}>
        <Text style={styles.titleJp}>麻雀</Text>
        <View style={styles.titleDivider}>
          <View style={styles.dividerLine} />
          <Text style={styles.titleEn}>MAHJONG DEN</Text>
          <View style={styles.dividerLine} />
        </View>
        <Text style={styles.subtitle}>東風戦 · East Round</Text>
      </Animated.View>

      {/* Character */}
      <Animated.View style={[styles.charContainer, {
        opacity: charAnim,
        transform: [
          { translateY: floatY },
          { scale: charAnim.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] }) },
        ],
      }]}>
        <Image source={LUNA_IMAGE} style={styles.charImage} resizeMode="contain" />
        <View style={styles.charGlow} />
      </Animated.View>

      {/* Speech bubble */}
      <Animated.View style={[styles.bubble, { opacity: btnAnim }]}>
        <Text style={styles.bubbleText}>「Welcome to the Den. Ready to play?」</Text>
      </Animated.View>

      {/* Buttons */}
      <Animated.View style={[styles.btnGroup, {
        opacity: btnAnim,
        transform: [{ translateY: btnAnim.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }) }],
        paddingBottom: Math.max(botPad + 16, 28),
      }]}>
        {/* Quick Match */}
        <TouchableOpacity style={styles.primaryBtn} onPress={handleQuickMatch} activeOpacity={0.85}>
          <LinearGradient
            colors={[colors.primary, '#A07820']}
            style={styles.primaryBtnInner}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
          >
            <Text style={styles.primaryBtnText}>Quick Match</Text>
            <Text style={styles.primaryBtnSub}>1 vs 3 AI · East Round</Text>
          </LinearGradient>
        </TouchableOpacity>

        {/* Play with Friends */}
        <TouchableOpacity
          style={styles.friendsBtn}
          onPress={() => { Haptics.selectionAsync(); router.push('/multiplayer'); }}
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={['#1A3A1E', '#0E2410']}
            style={styles.friendsBtnInner}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
          >
            <Text style={styles.friendsIcon}>👥</Text>
            <View>
              <Text style={styles.friendsBtnText}>Play with Friends</Text>
              <Text style={styles.friendsBtnSub}>Create or join a room</Text>
            </View>
          </LinearGradient>
        </TouchableOpacity>

        {/* Secondary row */}
        <View style={styles.secondaryRow}>
          <TouchableOpacity
            style={styles.secondaryBtn}
            onPress={() => { Haptics.selectionAsync(); router.push('/shop'); }}
            activeOpacity={0.8}
          >
            <Text style={styles.secondaryIcon}>🎴</Text>
            <Text style={styles.secondaryLabel}>Skins</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.secondaryBtn}
            onPress={() => { Haptics.selectionAsync(); router.push('/history'); }}
            activeOpacity={0.8}
          >
            <Text style={styles.secondaryIcon}>📊</Text>
            <Text style={styles.secondaryLabel}>History</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.secondaryBtn}
            onPress={() => { Haptics.selectionAsync(); router.push('/settings'); }}
            activeOpacity={0.8}
          >
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

  coinRow: { flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: 20 },
  coinBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: colors.surfaceElevated, borderRadius: 20,
    paddingHorizontal: 10, paddingVertical: 5,
    borderWidth: 1, borderColor: colors.primary,
  },
  coinIcon: { fontSize: 14 },
  coinAmount: { color: colors.primary, fontWeight: '900', fontSize: 14 },

  header: { alignItems: 'center', paddingTop: 8, paddingBottom: 4 },
  titleJp: {
    color: colors.primary, fontSize: 46, fontWeight: '900',
    textAlign: 'center', letterSpacing: 6,
    textShadowColor: 'rgba(212,168,48,0.5)',
    textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 12,
  },
  titleDivider: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: -4 },
  dividerLine: { flex: 1, height: 1, backgroundColor: colors.primary, maxWidth: 30, opacity: 0.5 },
  titleEn: {
    color: colors.text, fontSize: 18, fontWeight: '800',
    letterSpacing: 5, textAlign: 'center',
  },
  subtitle: {
    color: colors.textMuted, fontSize: 11,
    textAlign: 'center', letterSpacing: 2, marginTop: 4,
  },

  charContainer: { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  charImage: { width: width * 0.72, height: width * 0.92, maxHeight: 360 },
  charGlow: {
    position: 'absolute', bottom: 0,
    width: width * 0.5, height: 60,
    backgroundColor: colors.primary, opacity: 0.1,
    borderRadius: 999,
  },

  bubble: {
    marginHorizontal: 36, marginBottom: 12,
    backgroundColor: colors.surfaceElevated, borderRadius: 12,
    paddingVertical: 10, paddingHorizontal: 16,
    borderWidth: 1, borderColor: colors.border,
    borderLeftWidth: 3, borderLeftColor: colors.primary,
  },
  bubbleText: { color: colors.text, fontSize: 12, textAlign: 'center', fontStyle: 'italic' },

  btnGroup: { paddingHorizontal: 20, gap: 10 },

  primaryBtn: {
    borderRadius: 12, overflow: 'hidden',
    elevation: 6,
    shadowColor: colors.primary, shadowOpacity: 0.4,
    shadowRadius: 8, shadowOffset: { width: 0, height: 2 },
  },
  primaryBtnInner: { paddingVertical: 17, alignItems: 'center' },
  primaryBtnText: { color: colors.primaryForeground, fontSize: 17, fontWeight: '900', letterSpacing: 1 },
  primaryBtnSub: { color: 'rgba(6,18,9,0.6)', fontSize: 11, marginTop: 2 },

  friendsBtn: {
    borderRadius: 12, overflow: 'hidden',
    borderWidth: 1, borderColor: colors.border,
  },
  friendsBtnInner: {
    paddingVertical: 14, paddingHorizontal: 20,
    flexDirection: 'row', alignItems: 'center', gap: 12,
  },
  friendsIcon: { fontSize: 24 },
  friendsBtnText: { color: colors.text, fontSize: 15, fontWeight: '800' },
  friendsBtnSub: { color: colors.textMuted, fontSize: 11 },

  secondaryRow: { flexDirection: 'row', gap: 10 },
  secondaryBtn: {
    flex: 1, backgroundColor: colors.surfaceElevated, borderRadius: 12,
    paddingVertical: 14, alignItems: 'center', gap: 4,
    borderWidth: 1, borderColor: colors.border,
  },
  secondaryIcon: { fontSize: 20 },
  secondaryLabel: { color: colors.textSecondary, fontSize: 11, fontWeight: '700' },

  version: { color: colors.textMuted, fontSize: 10, textAlign: 'center', letterSpacing: 1 },
});
