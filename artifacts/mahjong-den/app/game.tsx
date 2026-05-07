import React, { useState, useEffect, useRef, useMemo } from 'react';
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
import AnimatedBackground from '@/components/AnimatedBackground';

const { width: SW } = Dimensions.get('window');

const CHAR: Record<string, any> = {
  luna:   require('../assets/images/char_luna.png'),
  ryuu:   require('../assets/images/char_ryuu.png'),
  kira:   require('../assets/images/char_kira.png'),
  sensei: require('../assets/images/char_sensei.png'),
};

// ─── Premium corner portrait panel ────────────────────────────────────────────
function CornerPanel({
  characterKey, name, score, seatWind, isActive, isRiichi,
}: {
  characterKey: string; name: string; score: number;
  seatWind: number; isActive: boolean; isRiichi: boolean;
}) {
  const glow = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (isActive) {
      Animated.loop(Animated.sequence([
        Animated.timing(glow, { toValue: 1, duration: 600, useNativeDriver: false }),
        Animated.timing(glow, { toValue: 0, duration: 600, useNativeDriver: false }),
      ])).start();
    } else {
      glow.setValue(0);
    }
  }, [isActive]);

  const borderColor = glow.interpolate({ inputRange: [0,1], outputRange: ['#2A5A2A', '#C9A030'] });

  return (
    <Animated.View style={[styles.cornerPanel, { borderColor }]}>
      <LinearGradient colors={['#0F1E0F', '#1A2F1A']} style={styles.cornerPanelInner}>
        <View style={styles.cornerWindBadge}>
          <Text style={styles.cornerWindText}>{WIND_CHARS[seatWind - 1]}</Text>
        </View>
        <Image source={CHAR[characterKey]} style={styles.cornerAvatar} resizeMode="cover" />
        <Text style={styles.cornerName} numberOfLines={1}>{name}</Text>
        <Text style={styles.cornerScore}>{score.toLocaleString()}</Text>
        {isRiichi && <Text style={styles.riichiPip}>RIICHI</Text>}
        {isActive && <View style={styles.cornerActiveDot} />}
      </LinearGradient>
    </Animated.View>
  );
}

// ─── Sage-green face-down tiles row ───────────────────────────────────────────
function TileWallRow({ count, melds }: { count: number; melds?: any[] }) {
  const n = Math.min(count, 14);
  return (
    <View style={styles.wallRow}>
      {Array.from({ length: n }).map((_, i) => (
        <View key={i} style={styles.wallTileH} />
      ))}
      {melds && melds.length > 0 && (
        <View style={{ marginLeft: 4 }}>
          <MeldDisplay melds={melds} />
        </View>
      )}
    </View>
  );
}

// ─── Sage-green face-down tiles column ────────────────────────────────────────
function TileWallCol({ count, melds }: { count: number; melds?: any[] }) {
  const n = Math.min(count, 10);
  return (
    <View style={styles.wallCol}>
      {Array.from({ length: n }).map((_, i) => (
        <View key={i} style={styles.wallTileV} />
      ))}
      {melds && melds.length > 0 && (
        <View style={{ marginTop: 3 }}>
          <MeldDisplay melds={melds} />
        </View>
      )}
    </View>
  );
}

// ─── Discard grid zone ────────────────────────────────────────────────────────
function DiscardZone({ discards, cols = 4, minRows = 2 }: { discards: Tile[]; cols?: number; minRows?: number }) {
  const visible = discards.slice(-cols * (minRows + 1));
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

// ─── Center medallion ─────────────────────────────────────────────────────────
function Medallion({ roundWind, dealer, tilesLeft }: { roundWind: number; dealer: number; tilesLeft: number }) {
  const windName = ['EAST','SOUTH','WEST','NORTH'][roundWind - 1] ?? 'EAST';
  return (
    <View style={styles.medallion}>
      <View style={styles.medallionRing}>
        <LinearGradient colors={['#0A1E0E', '#061408']} style={styles.medallionCore}>
          <Text style={styles.medallionWind}>{windName} {dealer + 1}</Text>
          <View style={styles.medallionDivider} />
          <Text style={styles.medallionRound}>ROUND</Text>
          <View style={styles.medallionDivider} />
          <Text style={styles.medallionCount}>{tilesLeft}</Text>
        </LinearGradient>
      </View>
    </View>
  );
}

// ─── Glossy action button ──────────────────────────────────────────────────────
function GlossyBtn({
  icon, label, count, onPress, variant = 'default', disabled = false, wide = false,
}: {
  icon: string; label: string; count?: number;
  onPress: () => void; variant?: 'default'|'win'|'pong'|'gong'|'chow'|'riichi';
  disabled?: boolean; wide?: boolean;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  function press() {
    Animated.sequence([
      Animated.timing(scale, { toValue: 0.93, duration: 80, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, tension: 200, friction: 8 }),
    ]).start();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  }

  const gradients: Record<string, string[]> = {
    default: ['#1F3D1F', '#122612'],
    win:     ['#5A0A0A', '#3A0606'],
    pong:    ['#2A0A5A', '#18063A'],
    gong:    ['#0A2A5A', '#06183A'],
    chow:    ['#0A4A1A', '#063010'],
    riichi:  ['#5A3A00', '#3A2400'],
  };

  return (
    <Animated.View style={{ transform: [{ scale }], opacity: disabled ? 0.35 : 1 }}>
      <TouchableOpacity onPress={press} disabled={disabled} activeOpacity={1}>
        <LinearGradient colors={gradients[variant] as [string,string]} style={[styles.glossyBtn, wide && styles.glossyBtnWide]}>
          <View style={styles.glossyBtnInner}>
            <Text style={[styles.glossyIcon, variant === 'win' && { color: '#FF6B6B' }]}>{icon}</Text>
            <Text style={[styles.glossyLabel, variant === 'win' && { color: '#FF8888' }]}>{label}</Text>
          </View>
          {count !== undefined && (
            <View style={styles.glossyCount}>
              <Text style={styles.glossyCountText}>{count}</Text>
            </View>
          )}
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
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

  useEffect(() => { if (phase === 'not_started') startGame(); }, []);

  const [selectedTileId, setSelectedTileId] = useState<number | null>(null);
  const [chiPicker, setChiPicker]           = useState(false);

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
            Animated.spring(popupScale,   { toValue: 1.5, useNativeDriver: true, tension: 130, friction: 7 }),
            Animated.timing(popupOpacity, { toValue: 1,   duration: 100, useNativeDriver: true }),
          ]),
          Animated.delay(700),
          Animated.parallel([
            Animated.timing(popupScale,   { toValue: 0.3, duration: 250, useNativeDriver: true }),
            Animated.timing(popupOpacity, { toValue: 0,   duration: 250, useNativeDriver: true }),
          ]),
        ]).start(() => setPopupData(null));
      }
      prevCounts.current[i] = cnt;
    });
  }, [players]);

  // ── Call flash ─────────────────────────────────────────────────────────────
  const flashAnim = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (phase === 'call_window') {
      Animated.loop(Animated.sequence([
        Animated.timing(flashAnim, { toValue: 0.5, duration: 350, useNativeDriver: true }),
        Animated.timing(flashAnim, { toValue: 1,   duration: 350, useNativeDriver: true }),
      ]), { iterations: 3 }).start();
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
  const aiRight = players[1]; // Ryuu, right side
  const aiLeft  = players[2]; // Kira, left side
  const aiTop   = players[3]; // Sensei, top

  const fullHand  = human.drawnTile ? [...human.hand, human.drawnTile] : human.hand;
  const canTsumo  = phase === 'player_turn' && currentPlayer === 0 && isWinningHand(fullHand, human.melds);
  const canRiichi = gameMode === 'riichi' && phase === 'player_turn' && currentPlayer === 0 &&
    !human.isRiichi && human.melds.every(m => m.type === 'ankan') && isTenpai(human.hand, human.melds);
  const isPlayerTurn = phase === 'player_turn' && currentPlayer === 0;
  const isCallWindow = phase === 'call_window';

  const terms    = MODE_TERMS[gameMode];
  const modeInfo = GAME_MODE_MAP[gameMode];

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

  return (
    <View style={[styles.root, { paddingTop: topPad }]}>
      <AnimatedBackground />

      {/* ── TOP HUD ─────────────────────────────────────────────────────────── */}
      <View style={styles.hud}>
        <TouchableOpacity style={styles.hudBtn} onPress={() => router.back()}>
          <Text style={styles.hudBtnText}>☰</Text>
        </TouchableOpacity>
        <LinearGradient colors={['#1A1200', '#2A1E00']} style={styles.coinBadge}>
          <Text style={styles.coinIcon}>🪙</Text>
          <Text style={styles.coinText}>{coins.toLocaleString()}</Text>
        </LinearGradient>
        <View style={{ flex: 1 }} />
        <Text style={styles.hudMode}>{modeInfo.flag}</Text>
        <TouchableOpacity style={styles.hudBtn} onPress={() => router.back()}>
          <Text style={styles.hudBtnText}>⚙</Text>
        </TouchableOpacity>
      </View>

      {/* ── TOP PANEL ROW: [TOP-LEFT opponent] [TITLE] [TOP-RIGHT opponent] ── */}
      <View style={styles.topPanelRow}>
        <CornerPanel
          characterKey={aiTop.characterKey}
          name={aiTop.name}
          score={aiTop.score}
          seatWind={aiTop.seatWind}
          isActive={currentPlayer === 3}
          isRiichi={aiTop.isRiichi}
        />
        <View style={styles.titleArea}>
          <Text style={styles.titleDragon}>🐉</Text>
          <Text style={styles.titleText}>MAHJONG{'\n'}DEN</Text>
        </View>
        <CornerPanel
          characterKey={aiRight.characterKey}
          name={aiRight.name}
          score={aiRight.score}
          seatWind={aiRight.seatWind}
          isActive={currentPlayer === 1}
          isRiichi={aiRight.isRiichi}
        />
      </View>

      {/* ── TABLE ──────────────────────────────────────────────────────────── */}
      {/* Outer wood border */}
      <View style={styles.tableWood}>
        {/* Gold trim */}
        <View style={styles.tableGold}>
          {/* Green felt */}
          <LinearGradient colors={['#0E3A1C', '#0A2D16', '#072211']} style={styles.tableFelt}>

            {/* North tile wall */}
            <View style={styles.northWall}>
              <TileWallRow count={topCount} melds={aiTop.melds.length > 0 ? aiTop.melds : undefined} />
            </View>

            {/* Middle row: left wall | discards | right wall */}
            <View style={styles.tableMiddle}>
              {/* Left (West) column */}
              <View style={styles.sideWall}>
                <TileWallCol count={leftCount} melds={aiLeft.melds.length > 0 ? aiLeft.melds : undefined} />
              </View>

              {/* Center discard area */}
              <View style={styles.centerArea}>
                {/* North discards */}
                <View style={styles.discardTop}>
                  <DiscardZone discards={aiTop.discards} cols={5} minRows={1} />
                </View>
                {/* Middle: West | Medallion | East */}
                <View style={styles.discardMid}>
                  <View style={styles.discardSide}>
                    <DiscardZone discards={aiLeft.discards} cols={3} minRows={2} />
                  </View>
                  <Medallion roundWind={roundWind} dealer={dealer} tilesLeft={tilesLeft} />
                  <View style={styles.discardSide}>
                    <DiscardZone discards={aiRight.discards} cols={3} minRows={2} />
                  </View>
                </View>
                {/* South discards */}
                <View style={styles.discardBottom}>
                  <DiscardZone discards={human.discards} cols={5} minRows={1} />
                </View>
              </View>

              {/* Right (East) column */}
              <View style={styles.sideWall}>
                <TileWallCol count={rightCount} melds={aiRight.melds.length > 0 ? aiRight.melds : undefined} />
              </View>
            </View>

            {/* ── PLAYER HAND on felt ─────────────────────────────────────── */}
            <View style={styles.handOnFelt}>
              {/* Melds row */}
              {human.melds.length > 0 && (
                <View style={styles.meldRow}>
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
              {/* Dora (Riichi only) */}
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

      {/* ── BOTTOM PANEL ROW ────────────────────────────────────────────────── */}
      <View style={styles.bottomPanelRow}>
        <CornerPanel
          characterKey={aiLeft.characterKey}
          name={aiLeft.name}
          score={aiLeft.score}
          seatWind={aiLeft.seatWind}
          isActive={currentPlayer === 2}
          isRiichi={aiLeft.isRiichi}
        />
        <View style={{ flex: 1 }} />
        {/* Human panel */}
        <LinearGradient colors={['#0F1E0F', '#1A2F1A']} style={[styles.cornerPanel, styles.humanPanel, { borderColor: isPlayerTurn ? '#C9A030' : '#2A5A2A' }]}>
          <Image source={CHAR[human.characterKey]} style={styles.cornerAvatar} resizeMode="cover" />
          <View style={styles.humanInfo}>
            <Text style={styles.cornerName}>{human.name}</Text>
            <Text style={styles.cornerWind2}>{WIND_CHARS[human.seatWind-1]}{human.isRiichi ? ' RIICHI' : ''}</Text>
            <Text style={styles.cornerScore}>{human.score.toLocaleString()}</Text>
          </View>
          {isPlayerTurn && <View style={styles.cornerActiveDot} />}
        </LinearGradient>
      </View>

      {/* ── CALL WINDOW ─────────────────────────────────────────────────────── */}
      {isCallWindow && pendingDiscard && (
        <Animated.View style={[styles.callBanner, { opacity: flashAnim }]}>
          <View style={styles.callTileWrap}>
            <Text style={styles.callFrom}>{players[pendingDiscard.playerIndex].name}</Text>
            <MahjongTile tile={pendingDiscard.tile} highlighted />
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flex: 1 }}>
            <View style={styles.callBtns}>
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
              {chiPicker ? (
                callOptions.chiOptions.map((opt, i) => {
                  const nums = opt.map(t => t.number).sort((a, b) => a - b);
                  return (
                    <GlossyBtn key={i} icon="→" label={`${nums[0]}-${nums[1]}`} variant="chow"
                      onPress={() => { setChiPicker(false); humanChi([opt[0].id, opt[1].id]); }} />
                  );
                })
              ) : callOptions.chiOptions.length > 0 && (
                <GlossyBtn icon="→" label={terms.chow} variant="chow"
                  onPress={() => {
                    if (callOptions.chiOptions.length === 1) {
                      humanChi([callOptions.chiOptions[0][0].id, callOptions.chiOptions[0][1].id]);
                    } else {
                      setChiPicker(true);
                    }
                  }} />
              )}
              <GlossyBtn icon="✕" label={terms.pass}
                onPress={() => { setChiPicker(false); humanPass(); }} />
            </View>
          </ScrollView>
        </Animated.View>
      )}

      {/* ── BOTTOM ACTION BAR ───────────────────────────────────────────────── */}
      {!isCallWindow && (
        <View style={[styles.actionBar, { paddingBottom: Math.max(botPad, 8) }]}>
          {/* Left panel: hand info */}
          <LinearGradient colors={['#100800', '#1A1000']} style={styles.actionLeft}>
            <Text style={styles.actionLeftLabel}>HAND</Text>
            <Text style={styles.actionLeftMode}>{modeInfo.flag}</Text>
            <Text style={styles.actionLeftSub}>{WIND_CHARS[human.seatWind-1]}</Text>
          </LinearGradient>

          {/* Center action buttons */}
          <View style={styles.actionCenter}>
            {isPlayerTurn ? (
              <>
                {canTsumo && (
                  <GlossyBtn icon="🀄" label={terms.draw} variant="win"
                    onPress={() => { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); humanTsumo(); }} />
                )}
                {canRiichi && selectedTileId !== null && terms.riichi !== null && (
                  <GlossyBtn icon="⛩" label={terms.riichi} variant="riichi"
                    onPress={() => { humanRiichi(selectedTileId!); setSelectedTileId(null); }} />
                )}
                <GlossyBtn
                  icon="↑" label="DISCARD"
                  disabled={selectedTileId === null || human.isRiichi || canTsumo}
                  wide
                  onPress={() => { humanDiscard(selectedTileId!); setSelectedTileId(null); }}
                />
              </>
            ) : (
              <Text style={styles.waitText}>
                {phase === 'ai_turn'
                  ? `${players[currentPlayer]?.name ?? '…'} is thinking…`
                  : 'Waiting…'}
              </Text>
            )}
          </View>

          {/* Right panel: wall count */}
          <LinearGradient colors={['#100800', '#1A1000']} style={styles.actionRight}>
            <Text style={styles.actionRightLabel}>WALL</Text>
            <Text style={styles.actionRightCount}>{tilesLeft}</Text>
          </LinearGradient>
        </View>
      )}

      {/* ── DISCARD POPUP ───────────────────────────────────────────────────── */}
      {popupData && (
        <Animated.View pointerEvents="none" style={[styles.popupOverlay, { opacity: popupOpacity }]}>
          <Animated.View style={[styles.popupCard, { transform: [{ scale: popupScale }] }]}>
            <LinearGradient colors={['#0D3A1A', '#051208']} style={styles.popupInner}>
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
const PANEL_W = Math.min(SW * 0.28, 100);

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#070E07' },

  // HUD
  hud: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 10, paddingVertical: 5,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderBottomWidth: 1, borderBottomColor: '#1A4020',
  },
  hudBtn: { padding: 6 },
  hudBtnText: { color: '#A09060', fontSize: 16 },
  coinBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 14, borderWidth: 1, borderColor: '#7A5A10',
  },
  coinIcon: { fontSize: 12 },
  coinText: { color: '#C9A030', fontWeight: '900', fontSize: 13 },
  hudMode: { fontSize: 18 },

  // Top panel row
  topPanelRow: {
    flexDirection: 'row', alignItems: 'flex-start',
    paddingHorizontal: 4, paddingVertical: 4, gap: 4,
  },
  titleArea: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 4 },
  titleDragon: { fontSize: 22, lineHeight: 26 },
  titleText: {
    color: '#C9A030', fontWeight: '900', fontSize: 14,
    textAlign: 'center', letterSpacing: 2, lineHeight: 17,
    textShadowColor: 'rgba(200,160,0,0.4)', textShadowRadius: 8,
  } as any,

  // Corner panels
  cornerPanel: {
    width: PANEL_W, borderRadius: 10,
    borderWidth: 1.5, borderColor: '#2A5A2A',
    overflow: 'hidden',
  },
  cornerPanelInner: {
    padding: 6, alignItems: 'center', gap: 3,
    position: 'relative',
  },
  cornerWindBadge: {
    position: 'absolute', top: 4, left: 4,
    backgroundColor: '#C9A03020', borderRadius: 4,
    paddingHorizontal: 4, paddingVertical: 1,
    borderWidth: 1, borderColor: '#C9A03060',
  },
  cornerWindText: { color: '#C9A030', fontSize: 9, fontWeight: '900' },
  cornerAvatar: { width: 44, height: 44, borderRadius: 22, borderWidth: 1.5, borderColor: '#C9A03070', marginTop: 8 },
  cornerName: { color: '#F5E8C0', fontSize: 10, fontWeight: '800', letterSpacing: 0.3 },
  cornerScore: { color: '#9A8040', fontSize: 9, fontWeight: '600' },
  cornerWind2: { color: '#C9A030', fontSize: 8 },
  cornerActiveDot: {
    position: 'absolute', bottom: 4, right: 4,
    width: 7, height: 7, borderRadius: 3.5, backgroundColor: '#38A169',
  },
  riichiPip: { color: '#FF6B6B', fontSize: 7, fontWeight: '800' },

  // Human panel
  humanPanel: {
    width: PANEL_W + 20, flexDirection: 'row', padding: 6, gap: 6,
    alignItems: 'center',
  },
  humanInfo: { flex: 1 },

  // Table
  tableWood: {
    flex: 1, marginHorizontal: 4, marginVertical: 2,
    borderRadius: 16, padding: 7,
    backgroundColor: '#2A1204',
    borderWidth: 1, borderColor: '#4A2208',
  },
  tableGold: {
    flex: 1, borderRadius: 11, padding: 2,
    backgroundColor: '#C9A030',
  },
  tableFelt: {
    flex: 1, borderRadius: 9, overflow: 'hidden',
    padding: 6,
  },

  // North wall
  northWall: {
    paddingHorizontal: 4, paddingBottom: 6,
    borderBottomWidth: 1, borderBottomColor: 'rgba(100,200,120,0.15)',
    alignItems: 'center',
  },
  wallRow: { flexDirection: 'row', gap: 2, flexWrap: 'wrap', justifyContent: 'center' },
  wallTileH: {
    width: 17, height: 24, borderRadius: 3,
    backgroundColor: '#4A7A55', borderWidth: 1, borderColor: '#6A9A75',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.5,
  } as any,

  // Side walls (left/right columns)
  tableMiddle: { flex: 1, flexDirection: 'row' },
  sideWall: {
    width: 34, justifyContent: 'flex-start', alignItems: 'center', paddingTop: 4, paddingHorizontal: 2,
  },
  wallCol: { gap: 2 },
  wallTileV: {
    width: 24, height: 17, borderRadius: 3,
    backgroundColor: '#4A7A55', borderWidth: 1, borderColor: '#6A9A75',
    shadowColor: '#000', shadowOffset: { width: 1, height: 0 }, shadowOpacity: 0.4,
  } as any,

  // Center area
  centerArea: { flex: 1, justifyContent: 'space-between', paddingVertical: 4 },
  discardTop: { alignItems: 'center' },
  discardMid: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 4 },
  discardSide: { flex: 1 },
  discardBottom: { alignItems: 'center' },

  // Discard zones
  discardZone: { gap: 2 },
  discardRow: { flexDirection: 'row', gap: 2 },
  discardGhost: { width: 22, height: 30 },

  // Medallion
  medallion: { alignItems: 'center', justifyContent: 'center' },
  medallionRing: {
    width: 78, height: 78, borderRadius: 39,
    backgroundColor: '#C9A030', padding: 3,
    shadowColor: '#C9A030', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.4, shadowRadius: 8,
  } as any,
  medallionCore: {
    flex: 1, borderRadius: 36, alignItems: 'center', justifyContent: 'center', gap: 1,
  },
  medallionWind: { color: '#C9A030', fontSize: 10, fontWeight: '900', letterSpacing: 0.5 },
  medallionRound: { color: '#8A7040', fontSize: 8, letterSpacing: 1 },
  medallionCount: { color: '#F5E8C0', fontSize: 17, fontWeight: '900', lineHeight: 20 },
  medallionDivider: { width: 30, height: 1, backgroundColor: '#C9A03040' },

  // Hand on felt
  handOnFelt: {
    paddingTop: 6,
    borderTopWidth: 1, borderTopColor: 'rgba(100,200,120,0.2)',
  },
  meldRow: { paddingHorizontal: 8, paddingBottom: 4 },
  doraRow: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 12, paddingBottom: 4 },
  doraLabel: { color: '#7A9060', fontSize: 9 },

  // Bottom panel row
  bottomPanelRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 4, paddingVertical: 4, gap: 4,
  },

  // Call banner
  callBanner: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(4,14,6,0.97)',
    borderTopWidth: 2, borderBottomWidth: 2, borderColor: '#C9A030',
    paddingHorizontal: 12, paddingVertical: 8, gap: 10,
  },
  callTileWrap: { alignItems: 'center', gap: 3 },
  callFrom: { color: '#C9A030', fontSize: 9, fontWeight: '800', textTransform: 'uppercase' },
  callBtns: { flexDirection: 'row', gap: 8, paddingHorizontal: 4, alignItems: 'center' },

  // Action bar
  actionBar: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(4,8,4,0.95)',
    borderTopWidth: 1, borderTopColor: '#2A4A1A',
    paddingHorizontal: 8, paddingTop: 8, gap: 6,
  },
  actionLeft: {
    width: 56, borderRadius: 10, padding: 8,
    alignItems: 'center', gap: 2,
    borderWidth: 1, borderColor: '#3A2A00',
  },
  actionLeftLabel: { color: '#7A6030', fontSize: 7, fontWeight: '800', letterSpacing: 1 },
  actionLeftMode: { fontSize: 14 },
  actionLeftSub: { color: '#C9A030', fontSize: 11, fontWeight: '800' },
  actionCenter: {
    flex: 1, flexDirection: 'row', gap: 6,
    alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap',
  },
  actionRight: {
    width: 56, borderRadius: 10, padding: 8,
    alignItems: 'center', gap: 2,
    borderWidth: 1, borderColor: '#3A2A00',
  },
  actionRightLabel: { color: '#7A6030', fontSize: 7, fontWeight: '800', letterSpacing: 1 },
  actionRightCount: { color: '#F5E8C0', fontSize: 20, fontWeight: '900', lineHeight: 22 },
  waitText: { color: '#6A8A60', fontSize: 12, fontStyle: 'italic' },

  // Glossy button
  glossyBtn: {
    borderRadius: 12, overflow: 'hidden',
    borderWidth: 1, borderColor: '#2A4A2A',
    minWidth: 60,
  },
  glossyBtnWide: { minWidth: 80 },
  glossyBtnInner: { paddingVertical: 9, paddingHorizontal: 12, alignItems: 'center', gap: 2 },
  glossyIcon: { color: '#C9A030', fontSize: 15, lineHeight: 18 },
  glossyLabel: { color: '#C9A030', fontWeight: '900', fontSize: 11, letterSpacing: 0.5 },
  glossyCount: {
    position: 'absolute', top: 4, right: 4,
    width: 16, height: 16, borderRadius: 8,
    backgroundColor: '#C9A030', alignItems: 'center', justifyContent: 'center',
  },
  glossyCountText: { color: '#060F07', fontSize: 9, fontWeight: '900' },

  // Popup
  popupOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    alignItems: 'center', justifyContent: 'center', zIndex: 999,
  } as any,
  popupCard: { shadowColor: '#C9A030', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.8, shadowRadius: 20 } as any,
  popupInner: {
    width: 120, paddingVertical: 20, paddingHorizontal: 16,
    borderRadius: 18, alignItems: 'center', gap: 10,
    borderWidth: 2.5, borderColor: '#C9A030',
  },
  popupName: { color: '#C9A030', fontSize: 13, fontWeight: '900', letterSpacing: 0.5 },
  popupWord: { color: '#7A6030', fontSize: 9, letterSpacing: 2, textTransform: 'uppercase' } as any,
});
