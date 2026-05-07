import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Platform,
  Dimensions, Image, Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

import colors from '@/constants/colors';
import { useGameStore } from '@/store/gameStore';
import { useShallow } from 'zustand/react/shallow';
import { useGameEngine } from '@/hooks/useGameEngine';
import { isTenpai, isWinningHand } from '@/engine/mahjongLogic';
import { WIND_CHARS } from '@/engine/tiles';

import MahjongTile from '@/components/MahjongTile';
import PlayerHand from '@/components/PlayerHand';
import DiscardPile from '@/components/DiscardPile';
import OpponentArea from '@/components/OpponentArea';
import ActionButtons from '@/components/ActionButtons';
import GameStatus from '@/components/GameStatus';
import MeldDisplay from '@/components/MeldDisplay';
import AnimatedBackground from '@/components/AnimatedBackground';

const { width } = Dimensions.get('window');
const CHAR_LUNA = require('../assets/images/char_luna.png');

export default function GameScreen() {
  const insets = useSafeAreaInsets();

  // Zustand store selectors
  const phase          = useGameStore(s => s.phase);
  const players        = useGameStore(s => s.players);
  const currentPlayer  = useGameStore(s => s.currentPlayer);
  const pendingDiscard = useGameStore(s => s.pendingDiscard);
  const callOptions    = useGameStore(s => s.callOptions);
  const dora           = useGameStore(s => s.dora);
  const tilesLeft      = useGameStore(s => s.tilesLeft);
  const roundWind      = useGameStore(s => s.roundWind);
  const dealer         = useGameStore(s => s.dealer);
  const gameMode       = useGameStore(s => s.gameMode);

  const {
    humanDiscard, humanRiichi, humanTsumo,
    humanRon, humanPon, humanKan, humanChi, humanPass,
  } = useGameStore(useShallow(s => ({
    humanDiscard: s.humanDiscard,
    humanRiichi:  s.humanRiichi,
    humanTsumo:   s.humanTsumo,
    humanRon:     s.humanRon,
    humanPon:     s.humanPon,
    humanKan:     s.humanKan,
    humanChi:     s.humanChi,
    humanPass:    s.humanPass,
  })));

  // AI engine hook
  useGameEngine();

  const [selectedTileId, setSelectedTileId] = useState<number | null>(null);

  const flashAnim = useRef(new Animated.Value(0)).current;

  const human   = players[0];
  const aiSouth = players[1];
  const aiWest  = players[2];
  const aiNorth = players[3];

  // Navigate to results when game over
  useEffect(() => {
    if (phase === 'game_over') {
      const t = setTimeout(() => router.push('/results'), 600);
      return () => clearTimeout(t);
    }
  }, [phase]);

  // Flash + haptic on call window
  useEffect(() => {
    if (phase === 'call_window') {
      Animated.sequence([
        Animated.timing(flashAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.timing(flashAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start();
      if (callOptions.canRon) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    }
  }, [phase]);

  useEffect(() => {
    if (phase !== 'player_turn') setSelectedTileId(null);
  }, [phase]);

  const fullHand = human.drawnTile ? [...human.hand, human.drawnTile] : human.hand;
  const canTsumo = phase === 'player_turn' && currentPlayer === 0 && isWinningHand(fullHand, human.melds);
  const canRiichi = gameMode === 'riichi' && phase === 'player_turn' && currentPlayer === 0 &&
    !human.isRiichi && human.melds.every(m => m.type === 'ankan') &&
    isTenpai(human.hand, human.melds);

  const isPlayerTurn = phase === 'player_turn' && currentPlayer === 0;
  const isCallWindow = phase === 'call_window';

  const topPad = Platform.OS === 'web' ? 67 : insets.top;
  const botPad = Platform.OS === 'web' ? 34 : insets.bottom;

  function handleSelectTile(tileId: number) {
    if (!isPlayerTurn) return;
    setSelectedTileId(prev => prev === tileId ? null : tileId);
    Haptics.selectionAsync();
  }

  function handleDiscard() {
    if (selectedTileId === null) return;
    humanDiscard(selectedTileId);
    setSelectedTileId(null);
  }

  function handleRiichi() {
    if (selectedTileId === null) return;
    humanRiichi(selectedTileId);
    setSelectedTileId(null);
  }

  return (
    <LinearGradient colors={['#030D04', '#061209', '#030D04']} style={styles.root}>
      <AnimatedBackground />
      {/* Status bar */}
      <View style={{ paddingTop: topPad }}>
        <GameStatus roundWind={roundWind} dealer={dealer} tilesLeft={tilesLeft} dora={dora} />
      </View>

      {/* Back button */}
      <TouchableOpacity style={[styles.backBtn, { top: topPad + 40 }]} onPress={() => router.back()}>
        <Text style={styles.backText}>← Exit</Text>
      </TouchableOpacity>

      {/* ── TOP (North = player 3) ─────────────────────────────────────────── */}
      <View style={styles.topArea}>
        <OpponentArea player={aiNorth} position="top" isCurrentPlayer={currentPlayer === 3} />
      </View>

      {/* ── MIDDLE ROW ────────────────────────────────────────────────────── */}
      <View style={styles.middleRow}>
        <View style={styles.sideArea}>
          <OpponentArea player={aiWest} position="left" isCurrentPlayer={currentPlayer === 2} />
        </View>

        {/* Center table */}
        <View style={styles.centerTable}>
          <View style={styles.tableFelt}>
            <View style={styles.compass}>
              <Text style={styles.compassText}>{WIND_CHARS[roundWind - 1]}</Text>
            </View>
            <Text style={styles.wallCount}>{tilesLeft}</Text>
          </View>
        </View>

        <View style={styles.sideArea}>
          <OpponentArea player={aiSouth} position="right" isCurrentPlayer={currentPlayer === 1} />
        </View>
      </View>

      {/* ── HUMAN DISCARD PILE ─────────────────────────────────────────────── */}
      <View style={styles.humanDiscardArea}>
        <DiscardPile discards={human.discards} />
      </View>

      {/* ── HUMAN MELDS ────────────────────────────────────────────────────── */}
      {human.melds.length > 0 && (
        <View style={styles.humanMelds}>
          <MeldDisplay melds={human.melds} />
        </View>
      )}

      {/* ── HUMAN INFO BAR ─────────────────────────────────────────────────── */}
      <View style={styles.humanInfo}>
        <Image source={CHAR_LUNA} style={styles.humanAvatar} resizeMode="cover" />
        <View style={{ flex: 1 }}>
          <Text style={styles.humanName}>You  {WIND_CHARS[human.seatWind - 1]}</Text>
          <Text style={styles.humanScore}>{human.score.toLocaleString()} pts</Text>
        </View>
        {human.isRiichi && (
          <View style={styles.riichiTag}>
            <Text style={styles.riichiTagText}>RIICHI</Text>
          </View>
        )}
      </View>

      {/* ── CALL WINDOW BANNER ─────────────────────────────────────────────── */}
      {isCallWindow && pendingDiscard && (
        <Animated.View style={[styles.callBanner, { opacity: flashAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 0.5] }) }]}>
          <Text style={styles.callBannerText}>
            {players[pendingDiscard.playerIndex].name} discards:
          </Text>
          <MahjongTile tile={pendingDiscard.tile} />
        </Animated.View>
      )}

      {/* ── ACTION BUTTONS ─────────────────────────────────────────────────── */}
      <View style={styles.actionsArea}>
        <ActionButtons
          phase={isPlayerTurn ? 'player_turn' : isCallWindow ? 'call_window' : 'ai_turn'}
          selectedTileId={selectedTileId}
          canRon={callOptions.canRon}
          canPon={callOptions.canPon}
          canKan={callOptions.canKan}
          chiOptions={callOptions.chiOptions}
          drawnTile={human.drawnTile}
          hand={human.hand}
          isRiichi={human.isRiichi}
          handWithDraw={fullHand}
          onDiscard={handleDiscard}
          onRiichi={handleRiichi}
          onTsumo={humanTsumo}
          onRon={humanRon}
          onPon={humanPon}
          onKan={humanKan}
          onChi={humanChi}
          onPass={humanPass}
          canTsumo={canTsumo}
          canRiichi={canRiichi}
        />
      </View>

      {/* ── HAND ───────────────────────────────────────────────────────────── */}
      <View style={[styles.handArea, { paddingBottom: botPad + 4 }]}>
        <PlayerHand
          hand={human.hand}
          drawnTile={human.drawnTile}
          selectedTileId={selectedTileId}
          onSelectTile={handleSelectTile}
          isRiichi={human.isRiichi}
          disabled={!isPlayerTurn}
        />
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  backBtn: { position: 'absolute', left: 14, zIndex: 10 },
  backText: { color: colors.textMuted, fontSize: 12 },
  topArea: { paddingHorizontal: 12, paddingTop: 6, alignItems: 'center' },
  middleRow: { flex: 1, flexDirection: 'row', alignItems: 'stretch', paddingHorizontal: 6 },
  sideArea: { width: 110, justifyContent: 'center', paddingVertical: 4 },
  centerTable: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  tableFelt: {
    width: 90, height: 90, borderRadius: 12,
    backgroundColor: '#0A2A1A', borderWidth: 2, borderColor: '#1A5A3A',
    alignItems: 'center', justifyContent: 'center',
    boxShadow: '0px 4px 8px rgba(0,0,0,0.6)',
    elevation: 8,
  },
  compass: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#0A3A2A', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: '#2A7A5A',
  },
  compassText: { color: colors.primary, fontSize: 22, fontWeight: '800' },
  wallCount: { color: colors.textMuted, fontSize: 10, marginTop: 4 },
  humanDiscardArea: { paddingHorizontal: 12, paddingBottom: 4, minHeight: 40, alignItems: 'center' },
  humanMelds: { paddingHorizontal: 12, paddingBottom: 4 },
  humanInfo: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 6, gap: 10,
    borderTopWidth: 1, borderTopColor: colors.border,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  humanAvatar: {
    width: 36, height: 36, borderRadius: 18,
    borderWidth: 2, borderColor: colors.primary,
  },
  humanName: { color: colors.text, fontSize: 13, fontWeight: '700' },
  humanScore: { color: colors.textSecondary, fontSize: 11 },
  riichiTag: {
    backgroundColor: colors.primaryDark, borderRadius: 4,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  riichiTagText: { color: colors.winGold, fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  callBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    paddingVertical: 6, backgroundColor: 'rgba(200,168,75,0.15)',
    borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.primary,
  },
  callBannerText: { color: colors.primary, fontSize: 12, fontWeight: '700' },
  actionsArea: { backgroundColor: 'rgba(0,0,0,0.2)' },
  handArea: { backgroundColor: 'rgba(0,0,0,0.4)', borderTopWidth: 1, borderTopColor: colors.border },
});
