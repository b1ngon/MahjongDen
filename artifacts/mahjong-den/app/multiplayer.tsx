import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  Platform, ActivityIndicator, Share, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

import colors from '@/constants/colors';
import { useMultiplayer } from '@/context/MultiplayerContext';
import { useGameStore } from '@/store/gameStore';
import AnimatedBackground from '@/components/AnimatedBackground';

const SEAT_COLORS = [colors.primary, '#3182CE', '#38A169', '#805AD5'];

export default function MultiplayerScreen() {
  const insets = useSafeAreaInsets();
  const mp = useMultiplayer();
  const startGame = useGameStore(s => s.startGame);

  const [tab, setTab] = useState<'create' | 'join'>('create');
  const [playerName, setPlayerName] = useState('');
  const [roomCode, setRoomCode] = useState('');

  const topPad = Platform.OS === 'web' ? 67 : insets.top;
  const botPad = Platform.OS === 'web' ? 34 : insets.bottom;

  // Navigate to game when playing starts
  useEffect(() => {
    if (mp.phase === 'playing') {
      if (mp.isHost) startGame();
      router.replace('/game');
    }
  }, [mp.phase]);

  function handleCreate() {
    if (!playerName.trim()) { Alert.alert('Enter your name'); return; }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    mp.createRoom(playerName.trim());
  }

  function handleJoin() {
    if (!playerName.trim()) { Alert.alert('Enter your name'); return; }
    if (!roomCode.trim()) { Alert.alert('Enter room code'); return; }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    mp.joinRoom(roomCode.trim(), playerName.trim());
  }

  async function handleCopyCode() {
    if (!mp.roomCode) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await Share.share({ message: `Join my Mahjong Den room! Code: ${mp.roomCode}` }).catch(() => {
      Alert.alert('Room Code', mp.roomCode ?? '', [{ text: 'OK' }]);
    });
  }

  function handleStart() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    mp.startGame();
  }

  function handleLeave() {
    mp.disconnect();
    router.back();
  }

  // ── In lobby waiting room ─────────────────────────────────────────────────
  if (mp.phase === 'lobby') {
    const allReady = mp.players.every(p => p.isReady);
    return (
      <LinearGradient colors={['#030D04', '#061209']} style={styles.root}>
        <AnimatedBackground />
        <View style={[styles.lobbyContainer, { paddingTop: topPad + 16, paddingBottom: botPad + 16 }]}>

          {/* Room code */}
          <Text style={styles.sectionLabel}>ROOM CODE</Text>
          <TouchableOpacity style={styles.codeBox} onPress={handleCopyCode} activeOpacity={0.7}>
            <Text style={styles.codeText}>{mp.roomCode}</Text>
            <Text style={styles.codeCopy}>Tap to copy</Text>
          </TouchableOpacity>
          <Text style={styles.codeHint}>Share this code with friends · up to 4 players</Text>

          {/* Players */}
          <Text style={[styles.sectionLabel, { marginTop: 24 }]}>PLAYERS ({mp.players.length}/4)</Text>
          <View style={styles.playerList}>
            {[0, 1, 2, 3].map(seat => {
              const player = mp.players.find(p => p.seatIndex === seat);
              return (
                <View key={seat} style={[styles.playerRow, player && { borderColor: SEAT_COLORS[seat] }]}>
                  <View style={[styles.seatDot, { backgroundColor: SEAT_COLORS[seat] }]} />
                  {player ? (
                    <>
                      <Text style={styles.playerName}>{player.name}</Text>
                      {player.isHost && <View style={styles.hostBadge}><Text style={styles.hostBadgeText}>HOST</Text></View>}
                      {player.id === mp.playerId && <Text style={styles.youLabel}>(you)</Text>}
                    </>
                  ) : (
                    <Text style={styles.emptySlot}>Waiting…</Text>
                  )}
                </View>
              );
            })}
          </View>

          {/* Actions */}
          <View style={styles.lobbyBtns}>
            {mp.isHost ? (
              <TouchableOpacity
                style={[styles.startBtn, mp.players.length < 2 && styles.startBtnDisabled]}
                onPress={handleStart}
                disabled={mp.players.length < 2}
                activeOpacity={0.85}
              >
                <LinearGradient
                  colors={[colors.primary, colors.primaryDark]}
                  style={styles.startBtnInner}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                >
                  <Text style={styles.startBtnText}>
                    {mp.players.length < 2 ? 'Waiting for players…' : 'Start Game'}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            ) : (
              <View style={styles.waitingBox}>
                <ActivityIndicator color={colors.primary} />
                <Text style={styles.waitingText}>Waiting for host to start…</Text>
              </View>
            )}
            <TouchableOpacity style={styles.leaveBtn} onPress={handleLeave} activeOpacity={0.8}>
              <Text style={styles.leaveBtnText}>Leave Room</Text>
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>
    );
  }

  // ── Connecting spinner ────────────────────────────────────────────────────
  if (mp.phase === 'connecting') {
    return (
      <LinearGradient colors={['#030D04', '#061209']} style={styles.root}>
        <AnimatedBackground />
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.connectingText}>Connecting…</Text>
        </View>
      </LinearGradient>
    );
  }

  // ── Create / Join form ────────────────────────────────────────────────────
  return (
    <LinearGradient colors={['#030D04', '#061209']} style={styles.root}>
      <AnimatedBackground />

      <View style={[styles.container, { paddingTop: topPad + 16, paddingBottom: botPad + 16 }]}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.title}>友達</Text>
            <Text style={styles.titleEn}>PLAY WITH FRIENDS</Text>
          </View>
          <View style={{ width: 60 }} />
        </View>

        {/* Tab selector */}
        <View style={styles.tabs}>
          {(['create', 'join'] as const).map(t => (
            <TouchableOpacity
              key={t}
              style={[styles.tab, tab === t && styles.tabActive]}
              onPress={() => setTab(t)}
            >
              <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
                {t === 'create' ? 'Create Room' : 'Join Room'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Error message */}
        {mp.error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{mp.error}</Text>
          </View>
        )}

        {/* Name input */}
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>YOUR NAME</Text>
          <TextInput
            style={styles.input}
            value={playerName}
            onChangeText={setPlayerName}
            placeholder="Enter your name"
            placeholderTextColor={colors.textMuted}
            maxLength={16}
            autoCorrect={false}
          />
        </View>

        {/* Room code input (join only) */}
        {tab === 'join' && (
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>ROOM CODE</Text>
            <TextInput
              style={[styles.input, styles.codeInput]}
              value={roomCode}
              onChangeText={t => setRoomCode(t.toUpperCase())}
              placeholder="ABC123"
              placeholderTextColor={colors.textMuted}
              maxLength={6}
              autoCapitalize="characters"
              autoCorrect={false}
            />
          </View>
        )}

        {/* Action button */}
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={tab === 'create' ? handleCreate : handleJoin}
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={[colors.primary, colors.primaryDark]}
            style={styles.actionBtnInner}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
          >
            <Text style={styles.actionBtnText}>
              {tab === 'create' ? 'Create Room' : 'Join Room'}
            </Text>
          </LinearGradient>
        </TouchableOpacity>

        <Text style={styles.infoText}>
          Invite up to 3 friends with a room code.{'\n'}Empty seats are filled by AI opponents.
        </Text>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  container: { flex: 1, paddingHorizontal: 24, gap: 16 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  backBtn: { width: 60 },
  backText: { color: colors.textSecondary, fontSize: 14 },
  headerCenter: { flex: 1, alignItems: 'center' },
  title: { color: colors.primary, fontSize: 26, fontWeight: '900', letterSpacing: 3 },
  titleEn: { color: colors.text, fontSize: 11, letterSpacing: 4 },
  tabs: {
    flexDirection: 'row', backgroundColor: colors.surface,
    borderRadius: 10, padding: 4,
    borderWidth: 1, borderColor: colors.border,
  },
  tab: { flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
  tabActive: { backgroundColor: colors.primary },
  tabText: { color: colors.textMuted, fontWeight: '700', fontSize: 13 },
  tabTextActive: { color: colors.primaryForeground },
  errorBox: {
    backgroundColor: 'rgba(197,48,48,0.15)', borderRadius: 8,
    padding: 12, borderWidth: 1, borderColor: colors.red,
  },
  errorText: { color: colors.red, fontSize: 13, textAlign: 'center' },
  field: { gap: 6 },
  fieldLabel: { color: colors.textMuted, fontSize: 10, letterSpacing: 2 },
  input: {
    backgroundColor: colors.surfaceElevated, borderRadius: 10,
    borderWidth: 1, borderColor: colors.border,
    paddingHorizontal: 16, paddingVertical: 14,
    color: colors.text, fontSize: 16,
  },
  codeInput: {
    fontSize: 24, fontWeight: '900', letterSpacing: 6,
    textAlign: 'center', color: colors.primary,
  },
  actionBtn: { borderRadius: 12, overflow: 'hidden' },
  actionBtnInner: { paddingVertical: 18, alignItems: 'center' },
  actionBtnText: { color: colors.primaryForeground, fontSize: 17, fontWeight: '900', letterSpacing: 1 },
  infoText: {
    color: colors.textMuted, fontSize: 12, textAlign: 'center', lineHeight: 18,
  },

  // Lobby
  lobbyContainer: { flex: 1, paddingHorizontal: 24, gap: 8 },
  sectionLabel: { color: colors.textMuted, fontSize: 10, letterSpacing: 2 },
  codeBox: {
    backgroundColor: colors.surfaceElevated, borderRadius: 14,
    borderWidth: 2, borderColor: colors.primary,
    paddingVertical: 20, alignItems: 'center', gap: 4,
  },
  codeText: { color: colors.primary, fontSize: 36, fontWeight: '900', letterSpacing: 10 },
  codeCopy: { color: colors.textMuted, fontSize: 11 },
  codeHint: { color: colors.textMuted, fontSize: 11, textAlign: 'center' },
  playerList: { gap: 8 },
  playerRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: colors.surfaceElevated, borderRadius: 10,
    borderWidth: 1, borderColor: colors.border,
    paddingVertical: 12, paddingHorizontal: 14,
  },
  seatDot: { width: 10, height: 10, borderRadius: 5 },
  playerName: { flex: 1, color: colors.text, fontSize: 15, fontWeight: '700' },
  hostBadge: {
    backgroundColor: colors.primaryDark, borderRadius: 4,
    paddingHorizontal: 6, paddingVertical: 2,
  },
  hostBadgeText: { color: colors.winGold, fontSize: 9, fontWeight: '900' },
  youLabel: { color: colors.textMuted, fontSize: 11 },
  emptySlot: { color: colors.textMuted, fontSize: 13, fontStyle: 'italic' },
  lobbyBtns: { marginTop: 16, gap: 12 },
  startBtn: { borderRadius: 12, overflow: 'hidden' },
  startBtnDisabled: { opacity: 0.5 },
  startBtnInner: { paddingVertical: 18, alignItems: 'center' },
  startBtnText: { color: colors.primaryForeground, fontSize: 17, fontWeight: '900', letterSpacing: 1 },
  waitingBox: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, paddingVertical: 18 },
  waitingText: { color: colors.textSecondary, fontSize: 14 },
  leaveBtn: {
    paddingVertical: 14, borderRadius: 12,
    borderWidth: 1, borderColor: colors.border, alignItems: 'center',
  },
  leaveBtnText: { color: colors.textMuted, fontSize: 14, fontWeight: '700' },

  centerBox: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  connectingText: { color: colors.textSecondary, fontSize: 16 },
});
