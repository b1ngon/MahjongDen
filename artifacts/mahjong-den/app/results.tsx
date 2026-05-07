import React, { useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Animated, ScrollView, Image, Platform, ImageSourcePropType,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

import colors from '@/constants/colors';
import { useGameStore } from '@/store/gameStore';
import { useHistory } from '@/context/HistoryContext';
import MahjongTile from '@/components/MahjongTile';
import { WIND_CHARS } from '@/engine/tiles';
import AnimatedBackground from '@/components/AnimatedBackground';

const CHAR_IMAGES: Record<string, ImageSourcePropType> = {
  luna:   require('../assets/images/char_luna.png'),
  ryuu:   require('../assets/images/char_ryuu.png'),
  kira:   require('../assets/images/char_kira.png'),
  sensei: require('../assets/images/char_sensei.png'),
};

export default function ResultsScreen() {
  const insets = useSafeAreaInsets();
  const players   = useGameStore(s => s.players);
  const result    = useGameStore(s => s.result);
  const startGame = useGameStore(s => s.startGame);
  const { addMatch } = useHistory();

  const scaleAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim  = useRef(new Animated.Value(0)).current;

  const isExhaustiveDraw = !result;
  const winner   = result ? players[result.winnerIndex] : null;
  const loser    = (result?.loserIndex !== undefined) ? players[result.loserIndex] : null;
  const humanWon = result?.winnerIndex === 0;

  useEffect(() => {
    if (result) {
      addMatch({
        date: new Date().toISOString(),
        result: humanWon ? 'win' : 'loss',
        score: result.score.totalPoints,
        yaku: result.yaku.map(y => y.name),
        opponent: winner?.name,
      });
    } else {
      addMatch({ date: new Date().toISOString(), result: 'draw', score: 0, yaku: [] });
    }

    Haptics.notificationAsync(
      humanWon ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Warning,
    );

    Animated.parallel([
      Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, tension: 50, friction: 7 }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
    ]).start();
  }, []);

  function handlePlayAgain() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    startGame();
    router.replace('/game');
  }

  function handleLobby() {
    Haptics.selectionAsync();
    router.replace('/');
  }

  const topPad = Platform.OS === 'web' ? 67 : insets.top;
  const botPad = Platform.OS === 'web' ? 34 : insets.bottom;

  const bgColors: [string, string] = humanWon
    ? ['rgba(200,168,75,0.25)', 'rgba(8,12,26,0.98)']
    : isExhaustiveDraw
    ? ['rgba(90,110,138,0.25)', 'rgba(8,12,26,0.98)']
    : ['rgba(229,62,62,0.2)',   'rgba(8,12,26,0.98)'];

  return (
    <View style={styles.overlay}>
      <AnimatedBackground />
      <LinearGradient
        colors={bgColors}
        style={[styles.modal, { paddingTop: topPad + 16, paddingBottom: botPad + 16 }]}
      >
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

          {/* Result title */}
          <Animated.View style={{ opacity: fadeAnim, transform: [{ scale: scaleAnim }], alignItems: 'center' }}>
            {isExhaustiveDraw ? (
              <Text style={styles.titleDraw}>DRAW</Text>
            ) : humanWon ? (
              <>
                <Text style={styles.titleWin}>VICTORY!</Text>
                <Text style={styles.titleJp}>和了</Text>
              </>
            ) : (
              <>
                <Text style={styles.titleLoss}>DEFEATED</Text>
                <Text style={styles.titleJp}>振り込み</Text>
              </>
            )}
          </Animated.View>

          {/* Winner card */}
          {result && winner && (
            <Animated.View style={[styles.winnerCard, { opacity: fadeAnim }]}>
              {CHAR_IMAGES[winner.characterKey] && (
                <Image source={CHAR_IMAGES[winner.characterKey]} style={styles.winnerAvatar} resizeMode="cover" />
              )}
              <View style={{ flex: 1 }}>
                <Text style={styles.winnerName}>{winner.name}</Text>
                <Text style={styles.winnerSeat}>
                  {WIND_CHARS[winner.seatWind - 1]} · {result.isTsumo ? 'Tsumo' : `Ron vs ${loser?.name ?? '?'}`}
                </Text>
              </View>
              <View style={styles.scoreBox}>
                <Text style={styles.scoreLabel}>Points</Text>
                <Text style={[styles.scoreValue, humanWon && { color: colors.winGold }]}>
                  +{result.score.totalPoints.toLocaleString()}
                </Text>
                <Text style={styles.scoreLabelText}>{result.score.label}</Text>
              </View>
            </Animated.View>
          )}

          {/* Win tile */}
          {result?.winTile && (
            <Animated.View style={[styles.winTileRow, { opacity: fadeAnim }]}>
              <Text style={styles.winTileLabel}>Winning Tile</Text>
              <MahjongTile tile={result.winTile} highlighted />
            </Animated.View>
          )}

          {/* Yaku list */}
          {result && result.yaku.length > 0 && (
            <Animated.View style={[styles.yakuList, { opacity: fadeAnim }]}>
              <Text style={styles.sectionTitle}>Yaku · {result.score.han} Han {result.score.fu} Fu</Text>
              {result.yaku.map((y, i) => (
                <View key={i} style={styles.yakuRow}>
                  <Text style={styles.yakuName}>{y.name}</Text>
                  <View style={styles.hanPills}>
                    {Array.from({ length: Math.min(y.han, 8) }).map((_, j) => (
                      <View key={j} style={styles.hanPill} />
                    ))}
                  </View>
                  <Text style={styles.yakuHan}>{y.han} han</Text>
                </View>
              ))}
              <View style={styles.divider} />
              <View style={styles.yakuRow}>
                <Text style={[styles.yakuName, { fontWeight: '800', color: colors.primary }]}>
                  Total
                </Text>
                <Text style={[styles.yakuHan, { color: colors.primary, fontWeight: '800' }]}>
                  {result.score.label}
                </Text>
              </View>
            </Animated.View>
          )}

          {/* Scores */}
          <Animated.View style={[styles.scoreTable, { opacity: fadeAnim }]}>
            <Text style={styles.sectionTitle}>Final Scores</Text>
            {players.map(p => (
              <View key={p.index} style={styles.scoreRow}>
                <Text style={styles.scoreRowName}>{p.name}</Text>
                <View style={styles.scoreBadge}>
                  <Text style={styles.scoreBadgeText}>{p.score.toLocaleString()}</Text>
                </View>
              </View>
            ))}
          </Animated.View>

          {/* Buttons */}
          <View style={styles.buttons}>
            <TouchableOpacity style={styles.playAgainBtn} onPress={handlePlayAgain} activeOpacity={0.85}>
              <LinearGradient
                colors={[colors.primary, '#A07820']}
                style={styles.playAgainInner}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Text style={styles.playAgainText}>Play Again</Text>
              </LinearGradient>
            </TouchableOpacity>
            <TouchableOpacity style={styles.lobbyBtn} onPress={handleLobby} activeOpacity={0.8}>
              <Text style={styles.lobbyText}>Return to Lobby</Text>
            </TouchableOpacity>
          </View>

        </ScrollView>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)' },
  modal: { flex: 1 },
  scroll: { paddingHorizontal: 24, gap: 18, paddingBottom: 20 },
  titleWin: {
    color: colors.winGold, fontSize: 42, fontWeight: '900' as const,
    letterSpacing: 4,
  },
  titleLoss: { color: colors.lossCrimson, fontSize: 38, fontWeight: '900' as const, letterSpacing: 3 },
  titleDraw: { color: colors.textSecondary, fontSize: 38, fontWeight: '900' as const, letterSpacing: 3 },
  titleJp: { color: colors.textMuted, fontSize: 16, letterSpacing: 2, marginTop: -4 },
  winnerCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.surfaceElevated, borderRadius: 14,
    padding: 14, borderWidth: 1, borderColor: colors.border, gap: 12,
  },
  winnerAvatar: {
    width: 56, height: 56, borderRadius: 28,
    borderWidth: 2, borderColor: colors.primary,
  },
  winnerName: { color: colors.text, fontSize: 18, fontWeight: '800' },
  winnerSeat: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  scoreBox: { alignItems: 'flex-end' },
  scoreLabel: { color: colors.textMuted, fontSize: 10, textTransform: 'uppercase', letterSpacing: 1 },
  scoreValue: { color: colors.text, fontSize: 22, fontWeight: '900' },
  scoreLabelText: { color: colors.primary, fontSize: 11, fontWeight: '700' },
  winTileRow: { flexDirection: 'row', alignItems: 'center', gap: 12, justifyContent: 'center' },
  winTileLabel: { color: colors.textSecondary, fontSize: 13 },
  yakuList: {
    backgroundColor: colors.surface, borderRadius: 12,
    padding: 14, borderWidth: 1, borderColor: colors.border, gap: 8,
  },
  sectionTitle: {
    color: colors.textMuted, fontSize: 10,
    textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 4,
  },
  yakuRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  yakuName: { flex: 1, color: colors.text, fontSize: 14 },
  hanPills: { flexDirection: 'row', gap: 3 },
  hanPill: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary },
  yakuHan: { color: colors.textSecondary, fontSize: 13, fontWeight: '700', width: 60, textAlign: 'right' },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 2 },
  scoreTable: {
    backgroundColor: colors.surface, borderRadius: 12,
    padding: 14, borderWidth: 1, borderColor: colors.border, gap: 8,
  },
  scoreRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  scoreRowName: { color: colors.text, fontSize: 13, fontWeight: '600' },
  scoreBadge: {
    backgroundColor: colors.surfaceElevated, borderRadius: 6,
    paddingHorizontal: 10, paddingVertical: 3,
  },
  scoreBadgeText: { color: colors.textSecondary, fontSize: 12, fontWeight: '700' },
  buttons: { gap: 10, marginTop: 8 },
  playAgainBtn: { borderRadius: 12, overflow: 'hidden' },
  playAgainInner: { paddingVertical: 16, alignItems: 'center' },
  playAgainText: { color: colors.primaryForeground, fontSize: 16, fontWeight: '900', letterSpacing: 1 },
  lobbyBtn: {
    paddingVertical: 14, alignItems: 'center',
    borderWidth: 1, borderColor: colors.border, borderRadius: 12,
  },
  lobbyText: { color: colors.textSecondary, fontSize: 14, fontWeight: '700' },
});
