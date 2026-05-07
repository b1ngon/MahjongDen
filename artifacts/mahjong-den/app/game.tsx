import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Platform,
  Dimensions, Image, Animated, ScrollView, useWindowDimensions,
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
import { useOrientationLayout } from '@/hooks/useOrientationLayout';
import LandscapeWrapper from '@/components/LandscapeWrapper';

import MahjongTile from '@/components/MahjongTile';
import PlayerHand from '@/components/PlayerHand';
import MeldDisplay from '@/components/MeldDisplay';
import AnimatedBackground from '@/components/AnimatedBackground';

const { width: SW } = Dimensions.get('window');
const PANEL_W = Math.min(SW * 0.27, 96);

const CHAR: Record<string, any> = {
  luna:   require('../assets/images/char_luna.png'),
  ryuu:   require('../assets/images/char_ryuu.png'),
  kira:   require('../assets/images/char_kira.png'),
  sensei: require('../assets/images/char_sensei.png'),
};

// ─── Ornate corner portrait panel ─────────────────────────────────────────────
function CornerPanel({
  characterKey, name, score, seatWind, isActive, isRiichi, label,
}: {
  characterKey: string; name: string; score: number;
  seatWind: number; isActive: boolean; isRiichi: boolean; label?: string;
}) {
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isActive) {
      Animated.loop(Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: false }),
        Animated.timing(pulse, { toValue: 0, duration: 700, useNativeDriver: false }),
      ])).start();
    } else {
      pulse.setValue(0);
    }
  }, [isActive]);

  const borderColor = pulse.interpolate({
    inputRange: [0, 1], outputRange: ['#3A5A2A', '#D4A840'],
  });
  const shadowOpacity = pulse.interpolate({
    inputRange: [0, 1], outputRange: [0, 0.8],
  });

  return (
    <Animated.View style={[styles.panel, { borderColor }]}>
      {/* Gold corner ornaments */}
      <View style={[styles.panelCornerOrnament, { top: 0, left: 0 }]} />
      <View style={[styles.panelCornerOrnament, { top: 0, right: 0 }]} />
      <LinearGradient
        colors={['#0C1A0C', '#152415', '#0E1A0E'] as [string,string,string]}
        style={styles.panelInner}
      >
        {/* Wind seat label */}
        <View style={styles.panelWindRow}>
          <Text style={styles.panelWindSeat}>{label ?? WIND_CHARS[seatWind - 1]}</Text>
          {isRiichi && <Text style={styles.panelRiichi}>RIICHI</Text>}
        </View>
        {/* Avatar */}
        <View style={styles.panelAvatarWrap}>
          <Image source={CHAR[characterKey]} style={styles.panelAvatar} resizeMode="cover" />
          {isActive && (
            <Animated.View style={[styles.panelActiveRing, { opacity: shadowOpacity }]} />
          )}
        </View>
        {/* Name & score */}
        <Text style={styles.panelName} numberOfLines={1}>{name}</Text>
        <Text style={styles.panelScore}>{score.toLocaleString()}</Text>
      </LinearGradient>
    </Animated.View>
  );
}

// ─── 3D-style face-down tile wall (horizontal row) ────────────────────────────
function TileWallRow({ count, melds }: { count: number; melds?: any[] }) {
  const n = Math.min(count, 14);
  if (melds && melds.length > 0) {
    return (
      <View style={styles.wallRowWrap}>
        <MeldDisplay melds={melds} />
      </View>
    );
  }
  return (
    <View style={styles.wallRowWrap}>
      {Array.from({ length: n }).map((_, i) => (
        <View key={i} style={styles.wallTileH}>
          <View style={styles.wallTileHTop} />
          <View style={styles.wallTileHRight} />
        </View>
      ))}
    </View>
  );
}

// ─── 3D-style face-down tile wall (vertical column) ──────────────────────────
function TileWallCol({ count, melds }: { count: number; melds?: any[] }) {
  const n = Math.min(count, 10);
  if (melds && melds.length > 0) {
    return (
      <View style={styles.wallColWrap}>
        <MeldDisplay melds={melds} />
      </View>
    );
  }
  return (
    <View style={styles.wallColWrap}>
      {Array.from({ length: n }).map((_, i) => (
        <View key={i} style={styles.wallTileV}>
          <View style={styles.wallTileVTop} />
          <View style={styles.wallTileVRight} />
        </View>
      ))}
    </View>
  );
}

// ─── Discard grid zone ────────────────────────────────────────────────────────
function DiscardZone({ discards, cols, minRows = 2 }: { discards: Tile[]; cols: number; minRows?: number }) {
  const visible = discards.slice(-cols * 4);
  const rows: Tile[][] = [];
  for (let i = 0; i < visible.length; i += cols) rows.push(visible.slice(i, i + cols));
  while (rows.length < minRows) rows.push([]);

  return (
    <View style={styles.discardZone}>
      {rows.map((row, ri) => (
        <View key={ri} style={styles.discardRow}>
          {row.map(t => <MahjongTile key={t.id} tile={t} tiny />)}
          {Array.from({ length: Math.max(0, cols - row.length) }).map((_, gi) => (
            <View key={`g${gi}`} style={styles.discardGhost} />
          ))}
        </View>
      ))}
    </View>
  );
}

// ─── Ornate center medallion ───────────────────────────────────────────────────
function Medallion({ roundWind, dealer, tilesLeft }: { roundWind: number; dealer: number; tilesLeft: number }) {
  const windName = ['EAST','SOUTH','WEST','NORTH'][roundWind - 1] ?? 'EAST';
  return (
    <View style={styles.medallionOuter}>
      <LinearGradient colors={['#1A1200', '#0E0C00'] as [string,string]} style={styles.medallionBody}>
        <Text style={styles.medallionLine1}>{windName} {dealer + 1}</Text>
        <View style={styles.medallionHRule} />
        <Text style={styles.medallionLabel}>ROUND</Text>
        <View style={styles.medallionHRule} />
        <Text style={styles.medallionCount}>{tilesLeft}</Text>
      </LinearGradient>
    </View>
  );
}

// ─── Glossy premium action button ─────────────────────────────────────────────
function GlossyBtn({
  icon, label, count, onPress, variant = 'default', disabled = false, wide = false,
}: {
  icon: string; label: string; count?: number;
  onPress: () => void; variant?: 'default'|'win'|'pong'|'gong'|'chow'|'riichi';
  disabled?: boolean; wide?: boolean;
}) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  function press() {
    if (disabled) return;
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 0.92, duration: 70, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, tension: 220, friction: 7 }),
    ]).start();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  }

  const gradMap: Record<string, [string,string]> = {
    default: ['#1E3C1E', '#112411'],
    win:     ['#5A0C0C', '#3A0606'],
    pong:    ['#2D0A5C', '#1C0638'],
    gong:    ['#0A2B5C', '#061838'],
    chow:    ['#0A4C1A', '#063010'],
    riichi:  ['#5C3C00', '#3A2600'],
  };

  const borderMap: Record<string, string> = {
    default: '#2E5A2E',
    win:     '#8A1A1A',
    pong:    '#4A1A8A',
    gong:    '#1A3A8A',
    chow:    '#1A6A30',
    riichi:  '#8A5A00',
  };

  return (
    <Animated.View style={[{ transform: [{ scale: scaleAnim }] }, disabled && { opacity: 0.32 }]}>
      <TouchableOpacity onPress={press} disabled={disabled} activeOpacity={1}>
        <LinearGradient
          colors={gradMap[variant]}
          style={[styles.glossyBtn, wide && styles.glossyBtnWide, { borderColor: borderMap[variant] }]}
        >
          {/* Gloss highlight strip */}
          <View style={styles.glossySheen} />
          <Text style={[styles.glossyIcon, variant === 'win' && { color: '#FF7070' }]}>{icon}</Text>
          <Text style={[styles.glossyLabel, variant === 'win' && { color: '#FF8888' }]}>{label}</Text>
          {count !== undefined && (
            <View style={styles.glossyBadge}>
              <Text style={styles.glossyBadgeText}>{count}</Text>
            </View>
          )}
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ─── Main game screen ──────────────────────────────────────────────────────────
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

  useEffect(() => { if (phase === 'not_started') startGame(); }, []);

  const [selectedTileId, setSelectedTileId] = useState<number | null>(null);
  const [chiPicker, setChiPicker] = useState(false);

  // ── Discard popup ──────────────────────────────────────────────────────────
  const [popupData, setPopupData] = useState<{ tile: Tile; name: string } | null>(null);
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
        setPopupData({ tile, name: p.name });
        Animated.sequence([
          Animated.parallel([
            Animated.spring(popupScale,   { toValue: 1.5, useNativeDriver: true, tension: 140, friction: 7 }),
            Animated.timing(popupOpacity, { toValue: 1,   duration: 90,  useNativeDriver: true }),
          ]),
          Animated.delay(680),
          Animated.parallel([
            Animated.timing(popupScale,   { toValue: 0.3, duration: 200, useNativeDriver: true }),
            Animated.timing(popupOpacity, { toValue: 0,   duration: 200, useNativeDriver: true }),
          ]),
        ]).start(() => setPopupData(null));
      }
      prevCounts.current[i] = cnt;
    });
  }, [players]);

  // ── Call window flash ──────────────────────────────────────────────────────
  const flashAnim = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (phase === 'call_window') {
      Animated.loop(Animated.sequence([
        Animated.timing(flashAnim, { toValue: 0.55, duration: 380, useNativeDriver: true }),
        Animated.timing(flashAnim, { toValue: 1,    duration: 380, useNativeDriver: true }),
      ]), { iterations: 4 }).start();
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
  const aiRight = players[1];
  const aiLeft  = players[2];
  const aiTop   = players[3];

  const fullHand  = human.drawnTile ? [...human.hand, human.drawnTile] : human.hand;
  const canTsumo  = phase === 'player_turn' && currentPlayer === 0 && isWinningHand(fullHand, human.melds);
  const canRiichi = gameMode === 'riichi' && phase === 'player_turn' && currentPlayer === 0 &&
    !human.isRiichi && human.melds.every(m => m.type === 'ankan') && isTenpai(human.hand, human.melds);

  const isPlayerTurn = phase === 'player_turn' && currentPlayer === 0;
  const isCallWindow = phase === 'call_window';
  const terms        = MODE_TERMS[gameMode];
  const modeInfo     = GAME_MODE_MAP[gameMode];

  const { isLandscape, isViewportLandscape } = useOrientationLayout();
  const { width: winW, height: winH } = useWindowDimensions();
  const LW = Math.max(winW, winH); // landscape width  (long edge)
  const LH = Math.min(winW, winH); // landscape height (short edge)

  const topPad = Platform.OS === 'web' ? 67 : insets.top;
  const botPad = Platform.OS === 'web' ? 34 : insets.bottom;

  function handleSelectTile(id: number) {
    if (!isPlayerTurn) return;
    setSelectedTileId(p => p === id ? null : id);
    Haptics.selectionAsync();
  }

  const topCount   = aiTop.hand.length   + (aiTop.drawnTile   ? 1 : 0);
  const leftCount  = aiLeft.hand.length  + (aiLeft.drawnTile  ? 1 : 0);
  const rightCount = aiRight.hand.length + (aiRight.drawnTile ? 1 : 0);

  // Wind labels for seat positions
  const windLabel = (wind: number) => ['EAST','SOUTH','WEST','NORTH'][wind-1] ?? '–';

  // ════════════════════════════════════════════════════════════════════════════
  // LANDSCAPE LAYOUT
  // ════════════════════════════════════════════════════════════════════════════
  if (isLandscape) {
    const lsSafe = isViewportLandscape ? insets : { top: 0, bottom: 0, left: 0, right: 0 };
    const PANEL_COL = 88;

    return (
      <LandscapeWrapper>
        <View style={[ls.root, { flex: 1 }]}>
          <AnimatedBackground />

          {/* ── Compact HUD ── */}
          <View style={[ls.hud, { paddingTop: lsSafe.top > 0 ? lsSafe.top : 6 }]}>
            <TouchableOpacity style={styles.hudMenuBtn} onPress={() => router.back()}>
              <Text style={styles.hudMenuText}>☰</Text>
            </TouchableOpacity>
            <LinearGradient colors={['#1E1600','#2A1E00'] as [string,string]} style={styles.hudCoin}>
              <Text style={styles.hudCoinIcon}>🪙</Text>
              <Text style={styles.hudCoinText}>{coins.toLocaleString()}</Text>
            </LinearGradient>
            <View style={ls.hudTitle}>
              <Text style={ls.hudTitleText}>🐉 MAHJONG DEN</Text>
              <Text style={ls.hudTitleSub}>{modeInfo.name}</Text>
            </View>
            <View style={styles.hudGiftBadge}>
              <Text style={styles.hudGiftIcon}>🎁</Text>
              <View style={styles.hudNotifDot}><Text style={styles.hudNotifText}>3</Text></View>
            </View>
            <View style={styles.hudStarBadge}>
              <Text style={styles.hudStarIcon}>★</Text>
              <Text style={styles.hudStarCount}>12</Text>
            </View>
            <TouchableOpacity style={styles.hudGear} onPress={() => router.push('/settings' as any)}>
              <Text style={styles.hudGearText}>⚙</Text>
            </TouchableOpacity>
          </View>

          {/* ── Three-column main area ── */}
          <View style={ls.body}>

            {/* LEFT COL: NORTH (top) + WEST (bottom) */}
            <View style={[ls.panelCol, { width: PANEL_COL }]}>
              <CornerPanel
                characterKey={aiTop.characterKey}
                name={aiTop.name} score={aiTop.score}
                seatWind={aiTop.seatWind} isActive={currentPlayer === 3}
                isRiichi={aiTop.isRiichi} label={windLabel(aiTop.seatWind)}
              />
              <View style={{ flex: 1 }} />
              <CornerPanel
                characterKey={aiLeft.characterKey}
                name={aiLeft.name} score={aiLeft.score}
                seatWind={aiLeft.seatWind} isActive={currentPlayer === 2}
                isRiichi={aiLeft.isRiichi} label={windLabel(aiLeft.seatWind)}
              />
            </View>

            {/* CENTER: The table */}
            <View style={ls.tableWrap}>
              {/* Walnut border */}
              <View style={ls.tableWood}>
                {/* Gold trim */}
                <View style={ls.tableGold}>
                  {/* Inner lip */}
                  <View style={ls.tableInnerLip}>
                    {/* Green felt */}
                    <LinearGradient
                      colors={['#0E3C1E','#0A2E16','#07200F'] as [string,string,string]}
                      style={ls.felt}
                    >
                      <View style={styles.feltGlow} />

                      {/* North tile wall */}
                      <View style={ls.northWall}>
                        <TileWallRow count={topCount} melds={aiTop.melds.length > 0 ? aiTop.melds : undefined} />
                      </View>

                      {/* Middle: West col | discard center | East col */}
                      <View style={ls.tableMiddle}>
                        <View style={ls.sideWall}>
                          <TileWallCol count={leftCount} melds={aiLeft.melds.length > 0 ? aiLeft.melds : undefined} />
                        </View>
                        <View style={ls.centerArea}>
                          <View style={styles.discardTop}>
                            <DiscardZone discards={aiTop.discards} cols={6} minRows={1} />
                          </View>
                          <View style={styles.discardMidRow}>
                            <View style={styles.discardSide}>
                              <DiscardZone discards={aiLeft.discards} cols={3} minRows={2} />
                            </View>
                            <Medallion roundWind={roundWind} dealer={dealer} tilesLeft={tilesLeft} />
                            <View style={styles.discardSide}>
                              <DiscardZone discards={aiRight.discards} cols={3} minRows={2} />
                            </View>
                          </View>
                          <View style={styles.discardBottom}>
                            <DiscardZone discards={human.discards} cols={6} minRows={1} />
                          </View>
                        </View>
                        <View style={ls.sideWall}>
                          <TileWallCol count={rightCount} melds={aiRight.melds.length > 0 ? aiRight.melds : undefined} />
                        </View>
                      </View>

                      {/* Player hand — full width, NO scroll needed in landscape */}
                      <View style={ls.handRow}>
                        <View style={ls.handDivider} />
                        {human.melds.length > 0 && (
                          <View style={styles.handMelds}>
                            <MeldDisplay melds={human.melds} />
                          </View>
                        )}
                        {/* Tiles laid flat, all visible at once */}
                        <View style={ls.handTiles}>
                          <PlayerHand
                            hand={human.hand}
                            drawnTile={human.drawnTile}
                            selectedTileId={selectedTileId}
                            onSelectTile={handleSelectTile}
                            isRiichi={human.isRiichi}
                            disabled={!isPlayerTurn}
                          />
                        </View>
                        {gameMode === 'riichi' && dora.length > 0 && (
                          <View style={styles.doraRow}>
                            <Text style={styles.doraLabel}>Dora</Text>
                            {dora.map((t, i) => <MahjongTile key={i} tile={t} tiny />)}
                          </View>
                        )}
                      </View>

                    </LinearGradient>
                  </View>
                </View>
              </View>
            </View>

            {/* RIGHT COL: EAST (top) + Human panel (bottom) */}
            <View style={[ls.panelCol, { width: PANEL_COL }]}>
              <CornerPanel
                characterKey={aiRight.characterKey}
                name={aiRight.name} score={aiRight.score}
                seatWind={aiRight.seatWind} isActive={currentPlayer === 1}
                isRiichi={aiRight.isRiichi} label={windLabel(aiRight.seatWind)}
              />
              <View style={{ flex: 1 }} />
              {/* Human mini-panel */}
              <Animated.View style={[
                styles.panel,
                { width: PANEL_COL - 4, borderColor: isPlayerTurn ? '#D4A840' : '#2A4A20' },
              ]}>
                <LinearGradient colors={['#0C1A0C','#152415'] as [string,string]} style={[styles.panelInner, { padding: 5 }]}>
                  <View style={styles.panelWindRow}>
                    <Text style={styles.panelWindSeat}>{windLabel(human.seatWind)}</Text>
                    {human.isRiichi && <Text style={styles.panelRiichi}>R</Text>}
                  </View>
                  <Image source={CHAR[human.characterKey]} style={styles.panelAvatar} resizeMode="cover" />
                  {isPlayerTurn && <View style={styles.humanActiveDot} />}
                  <Text style={styles.panelName} numberOfLines={1}>{human.name}</Text>
                  <Text style={styles.panelScore}>{human.score.toLocaleString()}</Text>
                </LinearGradient>
              </Animated.View>
            </View>
          </View>

          {/* ── Call window (landscape) ── */}
          {isCallWindow && pendingDiscard && (
            <Animated.View style={[styles.callBanner, { opacity: flashAnim }]}>
              <LinearGradient colors={['#060E06','#0A160A'] as [string,string]} style={styles.callBannerInner}>
                <View style={styles.callLeft}>
                  <Text style={styles.callFromLabel}>{players[pendingDiscard.playerIndex].name}</Text>
                  <Text style={styles.callFromSub}>discards</Text>
                  <MahjongTile tile={pendingDiscard.tile} highlighted small />
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flex: 1 }}>
                  <View style={styles.callBtns}>
                    {chiPicker ? (
                      callOptions.chiOptions.map((opt, i) => {
                        const nums = opt.map(t => t.number).sort((a,b) => a-b);
                        return (
                          <GlossyBtn key={i} icon="→" label={`${nums[0]}-${nums[1]}`} variant="chow"
                            onPress={() => { setChiPicker(false); humanChi([opt[0].id, opt[1].id]); }} />
                        );
                      })
                    ) : (
                      <>
                        {callOptions.canRon && (
                          <GlossyBtn icon="🀄" label={terms.win} variant="win"
                            onPress={() => { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); humanRon(); }} />
                        )}
                        {callOptions.canPon && <GlossyBtn icon="✦" label={terms.pong} variant="pong" onPress={humanPon} />}
                        {callOptions.canKan && <GlossyBtn icon="⬛" label={terms.gong} variant="gong" onPress={humanKan} />}
                        {callOptions.chiOptions.length > 0 && (
                          <GlossyBtn icon="→" label={terms.chow} variant="chow"
                            onPress={() => callOptions.chiOptions.length === 1
                              ? humanChi([callOptions.chiOptions[0][0].id, callOptions.chiOptions[0][1].id])
                              : setChiPicker(true)
                            } />
                        )}
                        <GlossyBtn icon="✕" label={terms.pass} onPress={() => { setChiPicker(false); humanPass(); }} />
                      </>
                    )}
                  </View>
                </ScrollView>
              </LinearGradient>
            </Animated.View>
          )}

          {/* ── Compact action bar (landscape) ── */}
          {!isCallWindow && (
            <LinearGradient
              colors={['#050A05','#080E06'] as [string,string]}
              style={[ls.actionBar, { paddingBottom: lsSafe.bottom > 0 ? lsSafe.bottom : 4 }]}
            >
              <View style={styles.actionGoldRule} />
              <View style={ls.actionRow}>
                {/* Left: hand info */}
                <LinearGradient colors={['#100C00','#1C1600'] as [string,string]} style={ls.actionSide}>
                  <Text style={styles.actionSidePanelTop}>HAND</Text>
                  <Text style={ls.actionScore}>{human.score.toLocaleString()}</Text>
                </LinearGradient>

                {/* Center: buttons */}
                <View style={styles.actionCenter}>
                  {isPlayerTurn ? (
                    <>
                      {canTsumo && (
                        <GlossyBtn icon="🀄" label={terms.draw} variant="win" wide
                          onPress={() => { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); humanTsumo(); }} />
                      )}
                      {canRiichi && selectedTileId !== null && terms.riichi !== null && (
                        <GlossyBtn icon="⛩" label={terms.riichi} variant="riichi"
                          onPress={() => { humanRiichi(selectedTileId!); setSelectedTileId(null); }} />
                      )}
                      <GlossyBtn
                        icon="↑" label="DISCARD" wide
                        disabled={selectedTileId === null || human.isRiichi || canTsumo}
                        onPress={() => { humanDiscard(selectedTileId!); setSelectedTileId(null); }}
                      />
                      {selectedTileId === null && !canTsumo && (
                        <Text style={styles.hintText}>tap a tile</Text>
                      )}
                    </>
                  ) : (
                    <View style={styles.waitWrap}>
                      <Text style={styles.waitDots}>• • •</Text>
                      <Text style={styles.waitText}>
                        {phase === 'ai_turn' ? `${players[currentPlayer]?.name} thinking` : 'Starting…'}
                      </Text>
                    </View>
                  )}
                </View>

                {/* Right: wall count */}
                <LinearGradient colors={['#100C00','#1C1600'] as [string,string]} style={ls.actionSide}>
                  <Text style={styles.actionSidePanelTop}>WALL</Text>
                  <Text style={styles.actionWallCount}>{tilesLeft}</Text>
                </LinearGradient>
              </View>
            </LinearGradient>
          )}

          {/* ── Discard popup ── */}
          {popupData && (
            <Animated.View pointerEvents="none" style={[styles.popupOverlay, { opacity: popupOpacity }]}>
              <Animated.View style={{ transform: [{ scale: popupScale }] }}>
                <LinearGradient colors={['#0D3A1A','#040E08'] as [string,string]} style={styles.popupCard}>
                  <View style={styles.popupGoldBorder} />
                  <Text style={styles.popupName}>{popupData.name}</Text>
                  <MahjongTile tile={popupData.tile} />
                  <Text style={styles.popupWord}>DISCARDS</Text>
                </LinearGradient>
              </Animated.View>
            </Animated.View>
          )}

        </View>
      </LandscapeWrapper>
    );
  }

  // ════════════════════════════════════════════════════════════════════════════
  // PORTRAIT LAYOUT (original)
  // ════════════════════════════════════════════════════════════════════════════
  return (
    <View style={[styles.root, { paddingTop: topPad }]}>
      <AnimatedBackground />

      {/* ── TOP HUD ─────────────────────────────────────────────────────────── */}
      <View style={styles.hud}>
        <TouchableOpacity style={styles.hudMenuBtn} onPress={() => router.back()}>
          <Text style={styles.hudMenuText}>☰</Text>
        </TouchableOpacity>
        <LinearGradient colors={['#1E1600','#2A1E00'] as [string,string]} style={styles.hudCoin}>
          <Text style={styles.hudCoinIcon}>🪙</Text>
          <Text style={styles.hudCoinText}>{coins.toLocaleString()}</Text>
          <View style={styles.hudCoinPlus}><Text style={styles.hudCoinPlusText}>+</Text></View>
        </LinearGradient>
        <View style={{ flex: 1 }} />
        <View style={styles.hudGiftBadge}>
          <Text style={styles.hudGiftIcon}>🎁</Text>
          <View style={styles.hudNotifDot}><Text style={styles.hudNotifText}>3</Text></View>
        </View>
        <View style={styles.hudStarBadge}>
          <Text style={styles.hudStarIcon}>★</Text>
          <Text style={styles.hudStarCount}>12</Text>
        </View>
        <TouchableOpacity style={styles.hudGear}>
          <Text style={styles.hudGearText}>⚙</Text>
        </TouchableOpacity>
      </View>

      {/* ── PREMIUM TITLE ───────────────────────────────────────────────────── */}
      <View style={styles.titleRow}>
        <View style={styles.titleLine} />
        <View style={styles.titleCenter}>
          <Text style={styles.titleDragon}>🐉</Text>
          <Text style={styles.titleText}>MAHJONG DEN</Text>
          <View style={styles.titleSubLine}>
            <View style={styles.titleDash} />
            <Text style={styles.titleSub}>{modeInfo.name}</Text>
            <View style={styles.titleDash} />
          </View>
        </View>
        <View style={styles.titleLine} />
      </View>

      {/* ── OPPONENT TOP PANELS ──────────────────────────────────────────────── */}
      <View style={styles.topPanelRow}>
        <CornerPanel
          characterKey={aiTop.characterKey}
          name={aiTop.name} score={aiTop.score}
          seatWind={aiTop.seatWind} isActive={currentPlayer === 3}
          isRiichi={aiTop.isRiichi} label={windLabel(aiTop.seatWind)}
        />
        <View style={styles.topPanelSpacer} />
        <CornerPanel
          characterKey={aiRight.characterKey}
          name={aiRight.name} score={aiRight.score}
          seatWind={aiRight.seatWind} isActive={currentPlayer === 1}
          isRiichi={aiRight.isRiichi} label={windLabel(aiRight.seatWind)}
        />
      </View>

      {/* ── TABLE ──────────────────────────────────────────────────────────── */}
      {/* Outer walnut wood border */}
      <View style={styles.tableWood}>
        {/* Gold inlay trim */}
        <View style={styles.tableGoldTrim}>
          {/* Inner darker wood lip */}
          <View style={styles.tableInnerLip}>
            {/* Felt surface */}
            <LinearGradient
              colors={['#0E3C1E','#0A2E16','#07200F'] as [string,string,string]}
              style={styles.tableFelt}
            >
              {/* Felt texture inner glow */}
              <View style={styles.feltGlow} />

              {/* ── NORTH tile wall ─────────────────────────────────────── */}
              <View style={styles.northWall}>
                <TileWallRow count={topCount} melds={aiTop.melds.length > 0 ? aiTop.melds : undefined} />
              </View>

              {/* ── MIDDLE: side walls + center discards ─────────────────── */}
              <View style={styles.tableMiddle}>
                {/* West (left) wall column */}
                <View style={styles.sideWallLeft}>
                  <TileWallCol count={leftCount} melds={aiLeft.melds.length > 0 ? aiLeft.melds : undefined} />
                </View>

                {/* Center discard area */}
                <View style={styles.centerArea}>
                  {/* North discards */}
                  <View style={styles.discardTop}>
                    <DiscardZone discards={aiTop.discards} cols={5} minRows={1} />
                  </View>
                  {/* Mid row: West | Medallion | East */}
                  <View style={styles.discardMidRow}>
                    <View style={styles.discardSide}>
                      <DiscardZone discards={aiLeft.discards} cols={3} minRows={2} />
                    </View>
                    <Medallion roundWind={roundWind} dealer={dealer} tilesLeft={tilesLeft} />
                    <View style={styles.discardSide}>
                      <DiscardZone discards={aiRight.discards} cols={3} minRows={2} />
                    </View>
                  </View>
                  {/* South (human) discards */}
                  <View style={styles.discardBottom}>
                    <DiscardZone discards={human.discards} cols={5} minRows={1} />
                  </View>
                </View>

                {/* East (right) wall column */}
                <View style={styles.sideWallRight}>
                  <TileWallCol count={rightCount} melds={aiRight.melds.length > 0 ? aiRight.melds : undefined} />
                </View>
              </View>

              {/* ── PLAYER HAND on felt ──────────────────────────────────── */}
              <View style={styles.handOnFelt}>
                <View style={styles.handOnFeltDivider} />
                {/* Melds */}
                {human.melds.length > 0 && (
                  <View style={styles.handMelds}>
                    <MeldDisplay melds={human.melds} />
                  </View>
                )}
                {/* Tiles */}
                <PlayerHand
                  hand={human.hand}
                  drawnTile={human.drawnTile}
                  selectedTileId={selectedTileId}
                  onSelectTile={handleSelectTile}
                  isRiichi={human.isRiichi}
                  disabled={!isPlayerTurn}
                />
                {/* Dora indicators (Riichi) */}
                {gameMode === 'riichi' && dora.length > 0 && (
                  <View style={styles.doraRow}>
                    <Text style={styles.doraLabel}>Dora</Text>
                    {dora.map((t, i) => <MahjongTile key={i} tile={t} tiny />)}
                  </View>
                )}
              </View>

            </LinearGradient>
          </View>
        </View>
      </View>

      {/* ── BOTTOM PANELS ────────────────────────────────────────────────────── */}
      <View style={styles.bottomPanelRow}>
        <CornerPanel
          characterKey={aiLeft.characterKey}
          name={aiLeft.name} score={aiLeft.score}
          seatWind={aiLeft.seatWind} isActive={currentPlayer === 2}
          isRiichi={aiLeft.isRiichi} label={windLabel(aiLeft.seatWind)}
        />
        <View style={{ flex: 1 }} />
        {/* Human "You" panel */}
        <Animated.View style={[
          styles.panel, styles.humanPanel,
          { borderColor: isPlayerTurn ? '#D4A840' : '#2A4A20' },
        ]}>
          <LinearGradient colors={['#0C1A0C','#152415'] as [string,string]} style={styles.humanPanelInner}>
            <Image source={CHAR[human.characterKey]} style={styles.panelAvatar} resizeMode="cover" />
            <View style={{ flex: 1 }}>
              <Text style={styles.panelWindSeat}>{windLabel(human.seatWind)}{human.isRiichi ? '  RIICHI' : ''}</Text>
              <Text style={styles.panelName}>{human.name}</Text>
              <Text style={styles.panelScore}>{human.score.toLocaleString()}</Text>
            </View>
            {isPlayerTurn && <View style={styles.humanActiveDot} />}
          </LinearGradient>
        </Animated.View>
      </View>

      {/* ── CALL WINDOW BANNER ──────────────────────────────────────────────── */}
      {isCallWindow && pendingDiscard && (
        <Animated.View style={[styles.callBanner, { opacity: flashAnim }]}>
          <LinearGradient colors={['#060E06','#0A160A'] as [string,string]} style={styles.callBannerInner}>
            <View style={styles.callLeft}>
              <Text style={styles.callFromLabel}>{players[pendingDiscard.playerIndex].name}</Text>
              <Text style={styles.callFromSub}>discards</Text>
              <MahjongTile tile={pendingDiscard.tile} highlighted small />
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flex: 1 }}>
              <View style={styles.callBtns}>
                {chiPicker ? (
                  callOptions.chiOptions.map((opt, i) => {
                    const nums = opt.map(t => t.number).sort((a, b) => a - b);
                    return (
                      <GlossyBtn key={i} icon="→" label={`${nums[0]}-${nums[1]}`} variant="chow"
                        onPress={() => { setChiPicker(false); humanChi([opt[0].id, opt[1].id]); }} />
                    );
                  })
                ) : (
                  <>
                    {callOptions.canRon && (
                      <GlossyBtn icon="🀄" label={terms.win} variant="win"
                        onPress={() => { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); humanRon(); }} />
                    )}
                    {callOptions.canPon && (
                      <GlossyBtn icon="✦" label={terms.pong} variant="pong" onPress={humanPon} />
                    )}
                    {callOptions.canKan && (
                      <GlossyBtn icon="⬛" label={terms.gong} variant="gong" onPress={humanKan} />
                    )}
                    {callOptions.chiOptions.length > 0 && (
                      <GlossyBtn icon="→" label={terms.chow} variant="chow"
                        onPress={() => callOptions.chiOptions.length === 1
                          ? humanChi([callOptions.chiOptions[0][0].id, callOptions.chiOptions[0][1].id])
                          : setChiPicker(true)
                        }
                      />
                    )}
                    <GlossyBtn icon="✕" label={terms.pass}
                      onPress={() => { setChiPicker(false); humanPass(); }} />
                  </>
                )}
              </View>
            </ScrollView>
          </LinearGradient>
        </Animated.View>
      )}

      {/* ── BOTTOM ACTION BAR ─────────────────────────────────────────────────── */}
      {!isCallWindow && (
        <LinearGradient
          colors={['#050A05','#080E06'] as [string,string]}
          style={[styles.actionBar, { paddingBottom: Math.max(botPad, 8) }]}
        >
          {/* Top gold rule */}
          <View style={styles.actionGoldRule} />

          <View style={styles.actionBarRow}>
            {/* Left: Hand / round info */}
            <LinearGradient colors={['#100C00','#1C1600'] as [string,string]} style={styles.actionSidePanel}>
              <Text style={styles.actionSidePanelTop}>YOUR</Text>
              <Text style={styles.actionSidePanelMain}>HAND</Text>
              <View style={styles.actionSideCoin}>
                <Text style={styles.actionSideCoinIcon}>🪙</Text>
                <Text style={styles.actionSideCoinAmt}>{human.score.toLocaleString()}</Text>
              </View>
            </LinearGradient>

            {/* Center action buttons */}
            <View style={styles.actionCenter}>
              {isPlayerTurn ? (
                <>
                  {canTsumo && (
                    <GlossyBtn icon="🀄" label={terms.draw} variant="win" wide
                      onPress={() => { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); humanTsumo(); }} />
                  )}
                  {canRiichi && selectedTileId !== null && terms.riichi !== null && (
                    <GlossyBtn icon="⛩" label={terms.riichi} variant="riichi"
                      onPress={() => { humanRiichi(selectedTileId!); setSelectedTileId(null); }} />
                  )}
                  <GlossyBtn
                    icon="↑" label="DISCARD" wide
                    disabled={selectedTileId === null || human.isRiichi || canTsumo}
                    onPress={() => { humanDiscard(selectedTileId!); setSelectedTileId(null); }}
                  />
                  {selectedTileId === null && !canTsumo && (
                    <Text style={styles.hintText}>tap a tile</Text>
                  )}
                </>
              ) : (
                <View style={styles.waitWrap}>
                  <Text style={styles.waitDots}>• • •</Text>
                  <Text style={styles.waitText}>
                    {phase === 'ai_turn' ? `${players[currentPlayer]?.name} thinking` : 'Starting…'}
                  </Text>
                </View>
              )}
            </View>

            {/* Right: Wall remaining */}
            <LinearGradient colors={['#100C00','#1C1600'] as [string,string]} style={styles.actionSidePanel}>
              <Text style={styles.actionSidePanelTop}>WALL</Text>
              <Text style={styles.actionSidePanelTop}>REMAINING</Text>
              <Text style={styles.actionWallCount}>{tilesLeft}</Text>
              {/* Mini tile stack icon */}
              <View style={styles.miniTileStack}>
                <View style={[styles.miniTile, { bottom: 4, left: 4 }]} />
                <View style={[styles.miniTile, { bottom: 2, left: 2 }]} />
                <View style={styles.miniTile} />
              </View>
            </LinearGradient>
          </View>
        </LinearGradient>
      )}

      {/* ── DISCARD POPUP ───────────────────────────────────────────────────── */}
      {popupData && (
        <Animated.View pointerEvents="none" style={[styles.popupOverlay, { opacity: popupOpacity }]} >
          <Animated.View style={{ transform: [{ scale: popupScale }] }}>
            <LinearGradient colors={['#0D3A1A','#040E08'] as [string,string]} style={styles.popupCard}>
              <View style={styles.popupGoldBorder} />
              <Text style={styles.popupName}>{popupData.name}</Text>
              <MahjongTile tile={popupData.tile} />
              <Text style={styles.popupWord}>DISCARDS</Text>
            </LinearGradient>
          </Animated.View>
        </Animated.View>
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0A0804' },

  // HUD
  hud: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 10, paddingVertical: 6,
    backgroundColor: 'rgba(5,4,2,0.72)',
    borderBottomWidth: 1, borderBottomColor: '#1E3010',
  },
  hudMenuBtn: { padding: 6, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.05)' },
  hudMenuText: { color: '#8A8070', fontSize: 15 },
  hudCoin: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 16, borderWidth: 1, borderColor: '#6A4E10',
  },
  hudCoinIcon: { fontSize: 12 },
  hudCoinText: { color: '#D4A840', fontWeight: '900', fontSize: 13 },
  hudCoinPlus: {
    width: 16, height: 16, borderRadius: 8, backgroundColor: '#2A5A20',
    alignItems: 'center', justifyContent: 'center', marginLeft: 2,
  },
  hudCoinPlusText: { color: '#6ACA50', fontWeight: '900', fontSize: 11, lineHeight: 14 },
  hudGiftBadge: { position: 'relative', padding: 4 },
  hudGiftIcon: { fontSize: 18 },
  hudNotifDot: {
    position: 'absolute', top: 0, right: 0,
    width: 14, height: 14, borderRadius: 7, backgroundColor: '#C0321A',
    alignItems: 'center', justifyContent: 'center',
  },
  hudNotifText: { color: '#fff', fontSize: 8, fontWeight: '900' },
  hudStarBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 2,
    backgroundColor: 'rgba(180,140,20,0.2)', borderRadius: 10,
    paddingHorizontal: 8, paddingVertical: 3,
    borderWidth: 1, borderColor: '#7A5A10',
  },
  hudStarIcon: { color: '#D4A840', fontSize: 13 },
  hudStarCount: { color: '#D4A840', fontSize: 11, fontWeight: '800' },
  hudGear: { padding: 6, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.05)' },
  hudGearText: { color: '#8A8070', fontSize: 15 },

  // Title
  titleRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 4, gap: 8,
  },
  titleLine: { flex: 1, height: 1, backgroundColor: '#3A2A06' },
  titleCenter: { alignItems: 'center', gap: 0 },
  titleDragon: { fontSize: 20 },
  titleText: {
    color: '#D4A840', fontWeight: '900', fontSize: 18, letterSpacing: 3,
    textShadow: '0 0 14px rgba(212,168,64,0.6)',
  } as any,
  titleSubLine: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 1 },
  titleDash: { width: 16, height: 1, backgroundColor: '#7A5A10' },
  titleSub: { color: '#7A6030', fontSize: 9, fontWeight: '700', letterSpacing: 2 },

  // Corner panels
  panel: {
    width: PANEL_W, borderRadius: 10,
    borderWidth: 1.5,
    overflow: 'visible',
  },
  panelCornerOrnament: {
    position: 'absolute', width: 8, height: 8,
    borderColor: '#D4A840', zIndex: 2,
  },
  panelInner: { borderRadius: 8.5, padding: 6, alignItems: 'center', gap: 2 },
  panelWindRow: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    paddingHorizontal: 6, paddingVertical: 2,
    backgroundColor: 'rgba(212,168,64,0.12)',
    borderRadius: 4, borderWidth: 1, borderColor: 'rgba(212,168,64,0.25)',
  },
  panelWindSeat: { color: '#C4A030', fontSize: 8, fontWeight: '900', letterSpacing: 1.5 },
  panelRiichi: { color: '#FF6060', fontSize: 7, fontWeight: '900', letterSpacing: 0.5 },
  panelAvatarWrap: { position: 'relative' },
  panelAvatar: {
    width: 46, height: 46, borderRadius: 23,
    borderWidth: 2, borderColor: 'rgba(212,168,64,0.5)',
    marginVertical: 2,
  },
  panelActiveRing: {
    position: 'absolute', top: -3, left: -3, right: -3, bottom: -3,
    borderRadius: 26, borderWidth: 2, borderColor: '#D4A840',
  },
  panelName: { color: '#E8D8A0', fontSize: 10, fontWeight: '800', letterSpacing: 0.2 },
  panelScore: { color: '#8A7040', fontSize: 9, fontWeight: '600' },

  // Human panel
  humanPanel: { flex: 1, maxWidth: 180 },
  humanPanelInner: {
    borderRadius: 8.5, padding: 8, flexDirection: 'row',
    alignItems: 'center', gap: 8,
  },
  humanActiveDot: {
    width: 8, height: 8, borderRadius: 4, backgroundColor: '#40CA38',
    position: 'absolute', top: 6, right: 6,
  },

  // Panel rows
  topPanelRow: {
    flexDirection: 'row', paddingHorizontal: 4, paddingBottom: 3, gap: 4,
  },
  topPanelSpacer: { flex: 1 },
  bottomPanelRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 4, paddingTop: 3, gap: 4,
  },

  // Table structure
  tableWood: {
    flex: 1, marginHorizontal: 4,
    borderRadius: 18, padding: 8,
    backgroundColor: '#2E1606',
    boxShadow: 'inset 0 4px 8px rgba(0,0,0,0.6), 0 2px 12px rgba(0,0,0,0.8)',
  } as any,
  tableGoldTrim: {
    flex: 1, borderRadius: 12, padding: 2.5,
    backgroundColor: '#C8A028',
  },
  tableInnerLip: {
    flex: 1, borderRadius: 10, padding: 1,
    backgroundColor: '#1A0A02',
  },
  tableFelt: {
    flex: 1, borderRadius: 9, overflow: 'hidden',
    paddingHorizontal: 5, paddingTop: 6, paddingBottom: 4,
    position: 'relative',
  },
  feltGlow: {
    position: 'absolute', top: '20%', left: '15%', right: '15%', height: '40%',
    backgroundImage: 'radial-gradient(ellipse, rgba(30,120,60,0.18) 0%, transparent 70%)',
    pointerEvents: 'none',
  } as any,

  // North wall
  northWall: {
    alignItems: 'center', paddingBottom: 5,
    borderBottomWidth: 1, borderBottomColor: 'rgba(80,180,100,0.12)',
  },
  wallRowWrap: { flexDirection: 'row', gap: 2.5, flexWrap: 'wrap', justifyContent: 'center' },
  wallTileH: {
    width: 16, height: 24, borderRadius: 3,
    backgroundColor: '#4E8058',
    position: 'relative',
    boxShadow: '0 3px 5px rgba(0,0,0,0.55)',
  } as any,
  wallTileHTop: {
    position: 'absolute', top: 0, left: 0, right: 0, height: 5,
    backgroundColor: '#D8EDD0', borderRadius: 3,
    opacity: 0.85,
  },
  wallTileHRight: {
    position: 'absolute', top: 5, right: 0, bottom: 0, width: 3,
    backgroundColor: '#2A4A30', borderRadius: 1,
    opacity: 0.7,
  },

  // Side walls
  tableMiddle: { flex: 1, flexDirection: 'row', paddingVertical: 3 },
  sideWallLeft: {
    width: 32, alignItems: 'flex-start', justifyContent: 'flex-start', paddingTop: 2,
  },
  sideWallRight: {
    width: 32, alignItems: 'flex-end', justifyContent: 'flex-start', paddingTop: 2,
  },
  wallColWrap: { gap: 2.5 },
  wallTileV: {
    width: 24, height: 16, borderRadius: 3,
    backgroundColor: '#4E8058',
    position: 'relative',
    boxShadow: '2px 0 5px rgba(0,0,0,0.5)',
  } as any,
  wallTileVTop: {
    position: 'absolute', top: 0, left: 0, right: 0, height: 5,
    backgroundColor: '#D8EDD0', borderRadius: 3,
    opacity: 0.85,
  },
  wallTileVRight: {
    position: 'absolute', top: 5, right: 0, bottom: 0, width: 3,
    backgroundColor: '#2A4A30', borderRadius: 1,
    opacity: 0.6,
  },

  // Center
  centerArea: { flex: 1, justifyContent: 'space-between', paddingHorizontal: 3 },
  discardTop: { alignItems: 'center' },
  discardMidRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  discardSide: { flex: 1 },
  discardBottom: { alignItems: 'center' },
  discardZone: { gap: 2 },
  discardRow: { flexDirection: 'row', gap: 2 },
  discardGhost: { width: 22, height: 30, opacity: 0 },

  // Medallion
  medallionOuter: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: '#C8A028', padding: 3,
    alignSelf: 'center',
    boxShadow: '0 0 16px rgba(200,160,40,0.45)',
  } as any,
  medallionBody: {
    flex: 1, borderRadius: 37, alignItems: 'center', justifyContent: 'center', gap: 1,
    padding: 6,
  },
  medallionLine1: { color: '#D4A840', fontSize: 10, fontWeight: '900', letterSpacing: 0.5 },
  medallionHRule: { width: 36, height: 1, backgroundColor: 'rgba(200,160,40,0.4)' },
  medallionLabel: { color: '#7A6030', fontSize: 8, letterSpacing: 1.5, fontWeight: '600' },
  medallionCount: { color: '#F0E0A0', fontSize: 19, fontWeight: '900', lineHeight: 22 },

  // Hand on felt
  handOnFelt: { paddingTop: 4 },
  handOnFeltDivider: {
    height: 1, marginBottom: 4,
    backgroundColor: 'rgba(80,180,100,0.18)',
  },
  handMelds: { paddingHorizontal: 8, paddingBottom: 3 },
  doraRow: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 12, paddingTop: 3 },
  doraLabel: { color: '#5A8050', fontSize: 9, fontWeight: '700' },

  // Call banner
  callBanner: { borderTopWidth: 2, borderBottomWidth: 2, borderColor: '#C8A028' },
  callBannerInner: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 10, paddingVertical: 8, gap: 8,
  },
  callLeft: { alignItems: 'center', gap: 2 },
  callFromLabel: { color: '#C8A028', fontSize: 9, fontWeight: '900', letterSpacing: 0.5, textTransform: 'uppercase' } as any,
  callFromSub: { color: '#5A5040', fontSize: 8 },
  callBtns: { flexDirection: 'row', gap: 8, alignItems: 'center' },

  // Action bar
  actionBar: { paddingHorizontal: 6, paddingTop: 0 },
  actionGoldRule: { height: 1.5, backgroundColor: '#3A2A04', marginBottom: 6 },
  actionBarRow: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  actionSidePanel: {
    width: 62, borderRadius: 10, padding: 6,
    alignItems: 'center', gap: 1,
    borderWidth: 1, borderColor: '#3A2A04',
  },
  actionSidePanelTop: { color: '#5A4A18', fontSize: 7, fontWeight: '800', letterSpacing: 1, textAlign: 'center' } as any,
  actionSidePanelMain: { color: '#C8A028', fontSize: 11, fontWeight: '900', letterSpacing: 1 },
  actionSideCoin: { flexDirection: 'row', alignItems: 'center', gap: 2, marginTop: 1 },
  actionSideCoinIcon: { fontSize: 9 },
  actionSideCoinAmt: { color: '#8A7030', fontSize: 8, fontWeight: '700' },
  actionWallCount: { color: '#F0E0A0', fontSize: 20, fontWeight: '900', lineHeight: 22 },
  miniTileStack: { width: 20, height: 18, position: 'relative', marginTop: 2 },
  miniTile: {
    position: 'absolute', width: 14, height: 10, borderRadius: 2,
    backgroundColor: '#4E8058', borderTopWidth: 2, borderTopColor: '#D8EDD0',
    borderWidth: 0.5, borderColor: '#2A4A30',
  },
  actionCenter: {
    flex: 1, flexDirection: 'row', flexWrap: 'wrap',
    alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 2,
  },
  hintText: { color: '#4A6A3A', fontSize: 11, fontStyle: 'italic', textAlign: 'center' },
  waitWrap: { alignItems: 'center', gap: 2 },
  waitDots: { color: '#C8A028', fontSize: 12, letterSpacing: 4 },
  waitText: { color: '#5A6A4A', fontSize: 10, fontStyle: 'italic' },

  // Glossy btn
  glossyBtn: {
    borderRadius: 12, overflow: 'hidden',
    borderWidth: 1, minWidth: 58, position: 'relative',
    paddingVertical: 10, paddingHorizontal: 12, alignItems: 'center', gap: 1,
  },
  glossyBtnWide: { minWidth: 76 },
  glossySheen: {
    position: 'absolute', top: 0, left: 0, right: 0, height: 10,
    backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 12,
  },
  glossyIcon: { color: '#C8A028', fontSize: 16, lineHeight: 19 },
  glossyLabel: { color: '#C8A028', fontWeight: '900', fontSize: 11, letterSpacing: 0.5 },
  glossyBadge: {
    position: 'absolute', top: 3, right: 3,
    width: 15, height: 15, borderRadius: 7.5,
    backgroundColor: '#C8A028', alignItems: 'center', justifyContent: 'center',
  },
  glossyBadgeText: { color: '#070E07', fontSize: 8, fontWeight: '900' },

  // Discard popup
  popupOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    alignItems: 'center', justifyContent: 'center', zIndex: 999,
  } as any,
  popupCard: {
    width: 130, paddingVertical: 22, paddingHorizontal: 18,
    borderRadius: 18, alignItems: 'center', gap: 10,
    borderWidth: 2.5, borderColor: '#C8A028',
    boxShadow: '0 0 30px rgba(200,160,40,0.55)',
  } as any,
  popupGoldBorder: {
    position: 'absolute', top: 6, left: 6, right: 6, bottom: 6,
    borderRadius: 14, borderWidth: 1, borderColor: 'rgba(200,160,40,0.2)',
    pointerEvents: 'none',
  } as any,
  popupName: { color: '#D4A840', fontSize: 13, fontWeight: '900', letterSpacing: 0.5 },
  popupWord: { color: '#5A4A18', fontSize: 9, letterSpacing: 2.5, fontWeight: '700', textTransform: 'uppercase' } as any,
});

// ─── Landscape-specific styles ─────────────────────────────────────────────────
const ls = StyleSheet.create({
  root: { backgroundColor: '#0A0804', overflow: 'hidden' },

  // Compact HUD
  hud: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 10, paddingBottom: 4,
    backgroundColor: 'rgba(5,4,2,0.82)',
    borderBottomWidth: 1, borderBottomColor: '#1E3010',
  },
  hudTitle: { flex: 1, alignItems: 'center' },
  hudTitleText: { color: '#D4A840', fontSize: 13, fontWeight: '900', letterSpacing: 2 },
  hudTitleSub: { color: '#5A4A18', fontSize: 8, letterSpacing: 1.5 },

  // Three-column body
  body: { flex: 1, flexDirection: 'row', gap: 2, paddingHorizontal: 4, paddingVertical: 4 },

  panelCol: { justifyContent: 'space-between', paddingVertical: 2 },

  // Table
  tableWrap: { flex: 1 },
  tableWood: {
    flex: 1, borderRadius: 14, padding: 6,
    backgroundColor: '#2E1606',
    boxShadow: 'inset 0 3px 6px rgba(0,0,0,0.6)',
  } as any,
  tableGold: { flex: 1, borderRadius: 10, padding: 2, backgroundColor: '#C8A028' },
  tableInnerLip: { flex: 1, borderRadius: 8, padding: 1, backgroundColor: '#1A0A02' },
  felt: { flex: 1, borderRadius: 7, overflow: 'hidden', paddingHorizontal: 4, paddingTop: 4, paddingBottom: 2 },

  // North wall (compact in landscape)
  northWall: {
    alignItems: 'center', paddingBottom: 3,
    borderBottomWidth: 1, borderBottomColor: 'rgba(80,180,100,0.12)',
  },

  // Middle
  tableMiddle: { flex: 1, flexDirection: 'row', paddingVertical: 2 },
  sideWall: { width: 28, justifyContent: 'flex-start', paddingTop: 2 },
  centerArea: { flex: 1, justifyContent: 'space-between', paddingHorizontal: 2 },

  // Player hand at bottom of felt
  handRow: { paddingTop: 3 },
  handDivider: { height: 1, backgroundColor: 'rgba(80,180,100,0.18)', marginBottom: 3 },
  handTiles: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    justifyContent: 'center',
    alignItems: 'flex-end',
  },

  // Compact action bar
  actionBar: { paddingHorizontal: 6, paddingTop: 0 },
  actionRow: { flexDirection: 'row', gap: 6, alignItems: 'center', paddingVertical: 4 },
  actionSide: {
    width: 54, borderRadius: 8, padding: 5,
    alignItems: 'center', gap: 1,
    borderWidth: 1, borderColor: '#3A2A04',
  },
  actionScore: { color: '#8A7030', fontSize: 9, fontWeight: '700' },
});
