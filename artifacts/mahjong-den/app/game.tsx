import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Platform,
  Dimensions, Image, Animated, ScrollView,
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
import { WIND_CHARS, Tile } from '@/engine/tiles';
import { GAME_MODE_MAP, MODE_TERMS } from '@/constants/gameModes';
import { useShopStore } from '@/store/shopStore';

import MahjongTile from '@/components/MahjongTile';
import PlayerHand from '@/components/PlayerHand';
import MeldDisplay from '@/components/MeldDisplay';
import ActionButtons from '@/components/ActionButtons';
import AnimatedBackground from '@/components/AnimatedBackground';

const { width: SW, height: SH } = Dimensions.get('window');

const CHAR: Record<string, any> = {
  luna:   require('../assets/images/char_luna.png'),
  ryuu:   require('../assets/images/char_ryuu.png'),
  kira:   require('../assets/images/char_kira.png'),
  sensei: require('../assets/images/char_sensei.png'),
};

// ─── Tiny portrait card ───────────────────────────────────────────────────────
function PlayerCard({
  characterKey, name, score, seatWind, isActive, isRiichi, align = 'left',
}: {
  characterKey: string; name: string; score: number;
  seatWind: number; isActive: boolean; isRiichi: boolean; align?: 'left'|'right';
}) {
  const pulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (isActive) {
      Animated.loop(Animated.sequence([
        Animated.timing(pulse, { toValue: 1.08, duration: 500, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1,    duration: 500, useNativeDriver: true }),
      ])).start();
    } else {
      pulse.setValue(1);
    }
  }, [isActive]);
  return (
    <Animated.View style={[styles.playerCard, align === 'right' && styles.playerCardRight, { transform: [{ scale: pulse }] }]}>
      <Image source={CHAR[characterKey]} style={styles.cardAvatar} resizeMode="cover" />
      <View style={styles.cardInfo}>
        <Text style={styles.cardName} numberOfLines={1}>{name}</Text>
        <Text style={styles.cardWind}>{WIND_CHARS[seatWind - 1]}{isRiichi ? ' 🀄' : ''}</Text>
        <Text style={styles.cardScore}>{score.toLocaleString()}</Text>
      </View>
      {isActive && <View style={styles.cardActiveDot} />}
    </Animated.View>
  );
}

// ─── Tiny discard grid ─────────────────────────────────────────────────────────
function DiscardGrid({ discards, cols = 4, label }: { discards: Tile[]; cols?: number; label?: string }) {
  const visible = discards.slice(-cols * 3);
  const rows: Tile[][] = [];
  for (let i = 0; i < visible.length; i += cols) rows.push(visible.slice(i, i + cols));
  return (
    <View style={styles.discardGrid}>
      {label && (
        <Text style={styles.discardZoneLabel}>{label}</Text>
      )}
      {rows.length === 0
        ? <View style={styles.discardEmpty} />
        : rows.map((row, ri) => (
            <View key={ri} style={styles.discardRow}>
              {row.map(t => <MahjongTile key={t.id} tile={t} tiny />)}
            </View>
          ))}
    </View>
  );
}

// ─── Face-down tile row (horizontal) ─────────────────────────────────────────
function FaceDownRow({ count }: { count: number }) {
  const n = Math.min(count, 16);
  return (
    <View style={styles.faceDownRow}>
      {Array.from({ length: n }).map((_, i) => (
        <View key={i} style={styles.fdTile} />
      ))}
    </View>
  );
}

// ─── Face-down tile column (vertical) ────────────────────────────────────────
function FaceDownCol({ count }: { count: number }) {
  const n = Math.min(count, 12);
  return (
    <View style={styles.faceDownCol}>
      {Array.from({ length: n }).map((_, i) => (
        <View key={i} style={styles.fdTileV} />
      ))}
    </View>
  );
}

// ─── Main game screen ─────────────────────────────────────────────────────────
export default function GameScreen() {
  const insets = useSafeAreaInsets();

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
  const coins          = useShopStore(s => s.coins);

  const {
    humanDiscard, humanRiichi, humanTsumo,
    humanRon, humanPon, humanKan, humanChi, humanPass,
  } = useGameStore(useShallow(s => ({
    humanDiscard: s.humanDiscard, humanRiichi: s.humanRiichi,
    humanTsumo:   s.humanTsumo,  humanRon:    s.humanRon,
    humanPon:     s.humanPon,    humanKan:    s.humanKan,
    humanChi:     s.humanChi,    humanPass:   s.humanPass,
  })));

  const startGame = useGameStore(s => s.startGame);
  useGameEngine();

  // Auto-start if arrived without going through lobby
  useEffect(() => {
    if (phase === 'not_started') startGame();
  }, []);

  const [selectedTileId, setSelectedTileId] = useState<number | null>(null);

  // ── Discard popup ──────────────────────────────────────────────────────────
  const [popupTile, setPopupTile] = useState<{ tile: Tile; name: string } | null>(null);
  const popupScale   = useRef(new Animated.Value(0)).current;
  const popupOpacity = useRef(new Animated.Value(0)).current;
  const prevCounts   = useRef([0, 0, 0, 0]);

  useEffect(() => {
    players.forEach((p, i) => {
      const cnt = p.discards.length;
      if (cnt > prevCounts.current[i] && cnt > 0) {
        const tile = p.discards[cnt - 1];
        popupScale.setValue(0);
        popupOpacity.setValue(0);
        setPopupTile({ tile, name: p.name });
        Animated.sequence([
          Animated.parallel([
            Animated.spring(popupScale,   { toValue: 1.4, useNativeDriver: true, tension: 120, friction: 8 }),
            Animated.timing(popupOpacity, { toValue: 1,   duration: 120, useNativeDriver: true }),
          ]),
          Animated.delay(650),
          Animated.parallel([
            Animated.timing(popupScale,   { toValue: 0.4, duration: 220, useNativeDriver: true }),
            Animated.timing(popupOpacity, { toValue: 0,   duration: 220, useNativeDriver: true }),
          ]),
        ]).start(() => setPopupTile(null));
      }
      prevCounts.current[i] = cnt;
    });
  }, [players]);

  // ── Call-window flash ──────────────────────────────────────────────────────
  const flashAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (phase === 'call_window') {
      Animated.sequence([
        Animated.timing(flashAnim, { toValue: 1, duration: 180, useNativeDriver: true }),
        Animated.timing(flashAnim, { toValue: 0, duration: 180, useNativeDriver: true }),
      ]).start();
      if (callOptions.canRon) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  }, [phase]);

  useEffect(() => { if (phase !== 'player_turn') setSelectedTileId(null); }, [phase]);
  useEffect(() => {
    if (phase === 'game_over') {
      const t = setTimeout(() => router.push('/results'), 700);
      return () => clearTimeout(t);
    }
  }, [phase]);

  const human   = players[0];
  const aiEast  = players[1]; // shown on right
  const aiWest  = players[2]; // shown on left
  const aiNorth = players[3]; // shown on top

  const fullHand  = human.drawnTile ? [...human.hand, human.drawnTile] : human.hand;
  const canTsumo  = phase === 'player_turn' && currentPlayer === 0 && isWinningHand(fullHand, human.melds);
  const canRiichi = gameMode === 'riichi' && phase === 'player_turn' && currentPlayer === 0 &&
    !human.isRiichi && human.melds.every(m => m.type === 'ankan') &&
    isTenpai(human.hand, human.melds);

  const isPlayerTurn = phase === 'player_turn' && currentPlayer === 0;
  const isCallWindow = phase === 'call_window';
  const modeInfo  = GAME_MODE_MAP[gameMode];
  const terms     = MODE_TERMS[gameMode];

  const topPad = Platform.OS === 'web' ? 67 : insets.top;
  const botPad = Platform.OS === 'web' ? 34 : insets.bottom;

  function handleSelectTile(id: number) {
    if (!isPlayerTurn) return;
    setSelectedTileId(p => p === id ? null : id);
    Haptics.selectionAsync();
  }

  // ── Count face-down tiles ──────────────────────────────────────────────────
  const northCount = aiNorth.hand.length + (aiNorth.drawnTile ? 1 : 0);
  const eastCount  = aiEast.hand.length  + (aiEast.drawnTile  ? 1 : 0);
  const westCount  = aiWest.hand.length  + (aiWest.drawnTile  ? 1 : 0);

  return (
    <LinearGradient colors={['#030D04', '#061209', '#030D04']} style={styles.root}>
      <AnimatedBackground />

      {/* ── HEADER ─────────────────────────────────────────────────────────── */}
      <View style={[styles.header, { paddingTop: topPad }]}>
        <TouchableOpacity style={styles.headerBtn} onPress={() => router.back()}>
          <Text style={styles.headerBtnText}>←</Text>
        </TouchableOpacity>
        <View style={styles.coinBadge}>
          <Text style={styles.coinIcon}>🪙</Text>
          <Text style={styles.coinText}>{coins.toLocaleString()}</Text>
        </View>
        <Text style={styles.headerTitle}>🀄 MAHJONG DEN</Text>
        <View style={styles.headerRight}>
          <Text style={styles.modeFlag}>{modeInfo.flag}</Text>
          <View style={styles.wallBadge}>
            <Text style={styles.wallCount}>{tilesLeft}</Text>
            <Text style={styles.wallLabel}>left</Text>
          </View>
        </View>
      </View>

      {/* ── TABLE ──────────────────────────────────────────────────────────── */}
      <LinearGradient
        colors={['#0D3B1F', '#0A2D18', '#072010']}
        style={styles.table}
      >
        {/* Inner border / frame */}
        <View style={styles.tableFrame}>

          {/* ── NORTH player row ─────────────────────────────────────────── */}
          <View style={styles.northRow}>
            <PlayerCard
              characterKey={aiNorth.characterKey}
              name={aiNorth.name}
              score={aiNorth.score}
              seatWind={aiNorth.seatWind}
              isActive={currentPlayer === 3}
              isRiichi={aiNorth.isRiichi}
            />
            <View style={styles.northTilesArea}>
              {aiNorth.melds.length > 0
                ? <MeldDisplay melds={aiNorth.melds} />
                : <FaceDownRow count={northCount} />}
            </View>
          </View>

          {/* ── MIDDLE section ───────────────────────────────────────────── */}
          <View style={styles.midRow}>

            {/* West side */}
            <View style={styles.westCol}>
              <PlayerCard
                characterKey={aiWest.characterKey}
                name={aiWest.name}
                score={aiWest.score}
                seatWind={aiWest.seatWind}
                isActive={currentPlayer === 2}
                isRiichi={aiWest.isRiichi}
              />
              <FaceDownCol count={westCount} />
              {aiWest.melds.length > 0 && <MeldDisplay melds={aiWest.melds} />}
            </View>

            {/* ── CENTER TABLE ───────────────────────────────────────────── */}
            <View style={styles.centerTable}>
              {/* North discards */}
              <View style={styles.discardZoneTop}>
                <DiscardGrid discards={aiNorth.discards} cols={5} label={`${WIND_CHARS[aiNorth.seatWind-1]} ${aiNorth.name}`} />
              </View>

              <View style={styles.centerMidRow}>
                {/* West discards */}
                <View style={styles.discardZoneLeft}>
                  <DiscardGrid discards={aiWest.discards} cols={3} label={WIND_CHARS[aiWest.seatWind-1]} />
                </View>

                {/* Center medallion */}
                <View style={styles.medallionWrap}>
                  {/* Outer ring */}
                  <View style={styles.medallionOuter}>
                    <View style={styles.centerBadge}>
                      <Text style={styles.badgeWind}>{WIND_CHARS[roundWind - 1]}</Text>
                      <Text style={styles.badgeRound}>{dealer + 1}</Text>
                      <View style={styles.badgeDivider} />
                      <Text style={styles.badgeWall}>{tilesLeft}</Text>
                      <Text style={styles.badgeWallLabel}>tiles</Text>
                    </View>
                  </View>
                </View>

                {/* East discards */}
                <View style={styles.discardZoneRight}>
                  <DiscardGrid discards={aiEast.discards} cols={3} label={WIND_CHARS[aiEast.seatWind-1]} />
                </View>
              </View>

              {/* South (human) discards */}
              <View style={styles.discardZoneBottom}>
                <DiscardGrid discards={human.discards} cols={5} label={`${WIND_CHARS[human.seatWind-1]} You`} />
              </View>
            </View>

            {/* East side */}
            <View style={styles.eastCol}>
              <PlayerCard
                characterKey={aiEast.characterKey}
                name={aiEast.name}
                score={aiEast.score}
                seatWind={aiEast.seatWind}
                isActive={currentPlayer === 1}
                isRiichi={aiEast.isRiichi}
                align="right"
              />
              <FaceDownCol count={eastCount} />
              {aiEast.melds.length > 0 && <MeldDisplay melds={aiEast.melds} />}
            </View>
          </View>

        </View>{/* tableFrame */}
      </LinearGradient>

      {/* ── HUMAN info strip ────────────────────────────────────────────────── */}
      <View style={styles.humanStrip}>
        <Image source={CHAR[human.characterKey]} style={styles.humanAvatar} resizeMode="cover" />
        <View style={{ flex: 1 }}>
          <Text style={styles.humanName}>
            {human.name} · {WIND_CHARS[human.seatWind - 1]}
            {human.isRiichi ? '  🀄 RIICHI' : ''}
          </Text>
          <Text style={styles.humanScore}>{human.score.toLocaleString()} pts</Text>
        </View>
        {human.melds.length > 0 && (
          <View style={styles.humanMelds}>
            <MeldDisplay melds={human.melds} />
          </View>
        )}
        {gameMode === 'riichi' && dora.length > 0 && (
          <View style={styles.doraRow}>
            <Text style={styles.doraLabel}>Dora</Text>
            {dora.map((t, i) => <MahjongTile key={i} tile={t} tiny />)}
          </View>
        )}
      </View>

      {/* ── CALL WINDOW overlay ─────────────────────────────────────────────── */}
      {isCallWindow && pendingDiscard && (
        <Animated.View style={[styles.callOverlay, { opacity: flashAnim.interpolate({ inputRange: [0,1], outputRange: [1, 0.6] }) }]}>
          <View style={styles.callLeft}>
            <Text style={styles.callFrom}>{players[pendingDiscard.playerIndex].name} discards:</Text>
            <MahjongTile tile={pendingDiscard.tile} highlighted />
          </View>
          <View style={styles.callButtons}>
            <ActionButtons
              phase="call_window"
              selectedTileId={null}
              canRon={callOptions.canRon}
              canPon={callOptions.canPon}
              canKan={callOptions.canKan}
              chiOptions={callOptions.chiOptions}
              drawnTile={null}
              hand={human.hand}
              isRiichi={human.isRiichi}
              handWithDraw={human.hand}
              onDiscard={() => {}}
              onRiichi={() => {}}
              onTsumo={humanTsumo}
              onRon={humanRon}
              onPon={humanPon}
              onKan={humanKan}
              onChi={humanChi}
              onPass={humanPass}
              canTsumo={false}
              canRiichi={false}
            />
          </View>
        </Animated.View>
      )}

      {/* ── HAND ────────────────────────────────────────────────────────────── */}
      <View style={styles.handArea}>
        <PlayerHand
          hand={human.hand}
          drawnTile={human.drawnTile}
          selectedTileId={selectedTileId}
          onSelectTile={handleSelectTile}
          isRiichi={human.isRiichi}
          disabled={!isPlayerTurn}
        />
      </View>

      {/* ── ACTION BAR ──────────────────────────────────────────────────────── */}
      {!isCallWindow && (
        <View style={[styles.actionBar, { paddingBottom: Math.max(botPad, 8) }]}>
          {isPlayerTurn ? (
            <View style={styles.actionRow}>
              {canTsumo && (
                <TouchableOpacity
                  style={[styles.actionBtn, styles.actionBtnWin]}
                  onPress={() => { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); humanTsumo(); }}
                >
                  <Text style={styles.actionBtnIcon}>🀄</Text>
                  <Text style={styles.actionBtnLabel}>{terms.draw}</Text>
                </TouchableOpacity>
              )}
              {canRiichi && selectedTileId !== null && (
                <TouchableOpacity
                  style={[styles.actionBtn, styles.actionBtnRiichi]}
                  onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy); humanRiichi(selectedTileId); setSelectedTileId(null); }}
                >
                  <Text style={styles.actionBtnIcon}>⛩</Text>
                  <Text style={styles.actionBtnLabel}>{terms.riichi}</Text>
                </TouchableOpacity>
              )}
              {selectedTileId !== null && !human.isRiichi && !canTsumo && (
                <TouchableOpacity
                  style={[styles.actionBtn, styles.actionBtnDiscard]}
                  onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); humanDiscard(selectedTileId); setSelectedTileId(null); }}
                >
                  <Text style={styles.actionBtnIcon}>↗</Text>
                  <Text style={styles.actionBtnLabel}>DISCARD</Text>
                </TouchableOpacity>
              )}
              {selectedTileId === null && !canTsumo && (
                <View style={styles.hintBubble}>
                  <Text style={styles.hintText}>Tap a tile to select, then DISCARD</Text>
                </View>
              )}
            </View>
          ) : (
            <View style={styles.waitRow}>
              <Text style={styles.waitText}>
                {phase === 'ai_turn' ? `${players[currentPlayer]?.name ?? '…'} is thinking…` : 'Your turn coming…'}
              </Text>
            </View>
          )}
        </View>
      )}

      {/* ── DISCARD POPUP ───────────────────────────────────────────────────── */}
      {popupTile && (
        <Animated.View
          pointerEvents="none"
          style={[styles.discardPopupOverlay, { opacity: popupOpacity }]}
        >
          <Animated.View style={{ transform: [{ scale: popupScale }] }}>
            <LinearGradient colors={['rgba(10,50,24,0.97)', 'rgba(4,18,9,0.97)']} style={styles.popupInner}>
              <Text style={styles.popupName}>{popupTile.name}</Text>
              <MahjongTile tile={popupTile.tile} />
              <Text style={styles.popupLabel}>DISCARDS</Text>
            </LinearGradient>
          </Animated.View>
        </Animated.View>
      )}
    </LinearGradient>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1 },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 10, paddingBottom: 6, gap: 8,
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  headerBtn: { padding: 6 },
  headerBtnText: { color: colors.textMuted, fontSize: 16 },
  coinBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: colors.surfaceElevated, borderRadius: 12, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: colors.primary },
  coinIcon: { fontSize: 12 },
  coinText: { color: colors.primary, fontWeight: '800', fontSize: 12 },
  headerTitle: { flex: 1, color: colors.primary, fontWeight: '900', fontSize: 13, textAlign: 'center', letterSpacing: 1 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  modeFlag: { fontSize: 18 },
  wallBadge: { alignItems: 'center', backgroundColor: colors.surfaceElevated, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  wallCount: { color: colors.text, fontWeight: '800', fontSize: 14, lineHeight: 16 },
  wallLabel: { color: colors.textMuted, fontSize: 8, lineHeight: 10 },

  // Table
  table: { flex: 1, padding: 6 },
  tableFrame: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 2, borderColor: '#1A5A30',
    overflow: 'hidden',
    backgroundColor: '#082015',
  },

  // North row
  northRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 6, paddingVertical: 5,
    borderBottomWidth: 1, borderBottomColor: '#1A4A25',
    gap: 4,
  },
  northTilesArea: { flex: 1, alignItems: 'center' },

  // Middle section
  midRow: { flex: 1, flexDirection: 'row' },
  westCol: {
    width: 72, alignItems: 'center', justifyContent: 'flex-start',
    paddingVertical: 6, paddingHorizontal: 4,
    borderRightWidth: 1, borderRightColor: '#1A4A25',
    gap: 6,
  },
  eastCol: {
    width: 72, alignItems: 'center', justifyContent: 'flex-start',
    paddingVertical: 6, paddingHorizontal: 4,
    borderLeftWidth: 1, borderLeftColor: '#1A4A25',
    gap: 6,
  },

  // Center table (discard zones)
  centerTable: {
    flex: 1, padding: 6,
    justifyContent: 'space-between',
  },
  discardZoneTop: {
    alignItems: 'center', paddingBottom: 4,
    borderBottomWidth: 1, borderBottomColor: 'rgba(26,90,40,0.5)',
  },
  centerMidRow: {
    flex: 1, flexDirection: 'row',
    alignItems: 'center', paddingVertical: 4,
  },
  discardZoneLeft: { flex: 1, alignItems: 'flex-end', paddingRight: 6 },
  discardZoneRight: { flex: 1, alignItems: 'flex-start', paddingLeft: 6 },
  discardZoneBottom: {
    alignItems: 'center', paddingTop: 4,
    borderTopWidth: 1, borderTopColor: 'rgba(26,90,40,0.5)',
  },

  // Center medallion
  medallionWrap: { alignItems: 'center', justifyContent: 'center' },
  medallionOuter: {
    width: 86, height: 86, borderRadius: 43,
    borderWidth: 2, borderColor: '#D4A83030',
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#061810',
  },
  centerBadge: {
    width: 72, height: 72,
    borderRadius: 36,
    backgroundColor: '#0A2A18',
    borderWidth: 2, borderColor: '#D4A83070',
    alignItems: 'center', justifyContent: 'center',
    gap: 1,
  },
  badgeWind: { color: colors.primary, fontSize: 22, fontWeight: '900', lineHeight: 24 },
  badgeRound: { color: colors.textSecondary, fontSize: 12, fontWeight: '700', lineHeight: 14 },
  badgeDivider: { width: 28, height: 1, backgroundColor: '#D4A83050', marginVertical: 2 },
  badgeWall: { color: colors.text, fontSize: 14, fontWeight: '800', lineHeight: 16 },
  badgeWallLabel: { color: colors.textMuted, fontSize: 8, lineHeight: 10 },

  // Discard grids
  discardGrid: { gap: 2, alignItems: 'center' },
  discardRow: { flexDirection: 'row', gap: 2 },
  discardZoneLabel: { color: '#4A8A60', fontSize: 7, fontWeight: '700', letterSpacing: 0.5, marginBottom: 2, textTransform: 'uppercase' },
  discardEmpty: { width: 20, height: 28, opacity: 0 },

  // Face-down tiles
  faceDownRow: { flexDirection: 'row', gap: 2, flexWrap: 'wrap', justifyContent: 'center' },
  fdTile: {
    width: 18, height: 25, borderRadius: 3,
    backgroundColor: '#1E5535', borderWidth: 1, borderColor: '#3A8055',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.6, shadowRadius: 2,
  } as any,
  faceDownCol: { gap: 2, alignItems: 'center' },
  fdTileV: {
    width: 25, height: 18, borderRadius: 3,
    backgroundColor: '#1E5535', borderWidth: 1, borderColor: '#3A8055',
  },

  // Player card
  playerCard: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(8,25,12,0.9)',
    borderRadius: 10, paddingHorizontal: 6, paddingVertical: 4,
    borderWidth: 1, borderColor: '#1E5530',
    position: 'relative',
    maxWidth: 80,
  },
  playerCardRight: { flexDirection: 'row-reverse' },
  cardAvatar: { width: 28, height: 28, borderRadius: 14, borderWidth: 1, borderColor: colors.primary },
  cardInfo: { flex: 1 },
  cardName: { color: colors.text, fontSize: 9, fontWeight: '800', lineHeight: 11 },
  cardWind: { color: colors.primary, fontSize: 8, lineHeight: 10 },
  cardScore: { color: colors.textMuted, fontSize: 8, lineHeight: 10 },
  cardActiveDot: {
    position: 'absolute', top: 4, right: 4,
    width: 6, height: 6, borderRadius: 3, backgroundColor: colors.green,
  },

  // Human strip
  humanStrip: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 14, paddingVertical: 6,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderTopWidth: 1, borderTopColor: colors.border,
  },
  humanAvatar: { width: 36, height: 36, borderRadius: 18, borderWidth: 2, borderColor: colors.primary },
  humanName: { color: colors.text, fontSize: 12, fontWeight: '700' },
  humanScore: { color: colors.textSecondary, fontSize: 11 },
  humanMelds: { flex: 1 },
  doraRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  doraLabel: { color: colors.textMuted, fontSize: 9 },

  // Call overlay
  callOverlay: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(6,18,9,0.95)',
    borderTopWidth: 2, borderBottomWidth: 2, borderColor: colors.primary,
    paddingHorizontal: 14, paddingVertical: 8,
    gap: 10,
  },
  callLeft: { alignItems: 'center', gap: 4 },
  callFrom: { color: colors.primary, fontSize: 10, fontWeight: '700' },
  callButtons: { flex: 1 },

  // Hand
  handArea: {
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderTopWidth: 1, borderTopColor: '#1A4A25',
    paddingVertical: 4,
  },

  // Action bar
  actionBar: {
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderTopWidth: 1, borderTopColor: colors.border,
    paddingTop: 8, paddingHorizontal: 12,
  },
  actionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, flexWrap: 'wrap', paddingBottom: 4 },
  actionBtn: {
    paddingVertical: 9, paddingHorizontal: 18,
    borderRadius: 10, alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    minWidth: 80,
  },
  actionBtnWin: { backgroundColor: '#8B2020', borderColor: colors.red },
  actionBtnRiichi: { backgroundColor: colors.primaryDark, borderColor: colors.primary },
  actionBtnDiscard: { backgroundColor: '#1A3A50', borderColor: '#2B6CB0' },
  actionBtnIcon: { fontSize: 16, lineHeight: 20 },
  actionBtnLabel: { color: '#fff', fontWeight: '900', fontSize: 11, letterSpacing: 0.5 },
  hintBubble: { paddingVertical: 10 },
  hintText: { color: colors.textMuted, fontSize: 12, fontStyle: 'italic' },
  waitRow: { alignItems: 'center', paddingVertical: 10 },
  waitText: { color: colors.textMuted, fontSize: 12, fontStyle: 'italic' },

  // Discard popup
  discardPopupOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    alignItems: 'center', justifyContent: 'center',
    zIndex: 999,
    pointerEvents: 'none',
  } as any,
  popupInner: {
    width: 110, paddingVertical: 18, paddingHorizontal: 14,
    borderRadius: 18, alignItems: 'center', gap: 8,
    borderWidth: 2, borderColor: colors.primary,
    shadowColor: colors.primary, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.6, shadowRadius: 16,
  } as any,
  popupName: { color: colors.primary, fontSize: 12, fontWeight: '900', letterSpacing: 0.5 },
  popupLabel: { color: colors.textMuted, fontSize: 9, letterSpacing: 2, textTransform: 'uppercase' } as any,
});
