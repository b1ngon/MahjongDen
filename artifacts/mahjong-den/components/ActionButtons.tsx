import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Tile } from '../engine/tiles';
import colors from '../constants/colors';
import * as Haptics from 'expo-haptics';

interface ActionButtonsProps {
  phase: string;
  selectedTileId: number | null;
  canRon: boolean;
  canPon: boolean;
  canKan: boolean;
  chiOptions: Tile[][];
  drawnTile: Tile | null;
  hand: Tile[];
  isRiichi: boolean;
  handWithDraw: Tile[];
  onDiscard: (tileId: number) => void;
  onRiichi: (tileId: number) => void;
  onTsumo: () => void;
  onRon: () => void;
  onPon: () => void;
  onKan: () => void;
  onChi: (tileIds: [number, number]) => void;
  onPass: () => void;
  canTsumo: boolean;
  canRiichi: boolean;
}

function ActionButton({
  label,
  sublabel,
  onPress,
  color = colors.surfaceElevated,
  textColor = colors.text,
  disabled = false,
}: {
  label: string;
  sublabel?: string;
  onPress: () => void;
  color?: string;
  textColor?: string;
  disabled?: boolean;
}) {
  return (
    <TouchableOpacity
      style={[styles.btn, { backgroundColor: color }, disabled && styles.btnDisabled]}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
      disabled={disabled}
      activeOpacity={0.7}
    >
      <Text style={[styles.btnLabel, { color: textColor }]}>{label}</Text>
      {sublabel && <Text style={styles.btnSublabel}>{sublabel}</Text>}
    </TouchableOpacity>
  );
}

export default function ActionButtons({
  phase,
  selectedTileId,
  canRon, canPon, canKan, chiOptions,
  drawnTile, hand, isRiichi, handWithDraw,
  onDiscard, onRiichi, onTsumo, onRon, onPon, onKan, onChi, onPass,
  canTsumo, canRiichi,
}: ActionButtonsProps) {

  // ── Call window ──────────────────────────────────────────────────────────
  if (phase === 'call_window') {
    const hasAnyCall = canRon || canPon || canKan || chiOptions.length > 0;
    return (
      <View style={styles.row}>
        {canRon && (
          <ActionButton label="RON" sublabel="Win!" color={colors.red} textColor="#fff" onPress={onRon} />
        )}
        {canPon && (
          <ActionButton label="PON" sublabel="Triplet" color={colors.purple} textColor="#fff" onPress={onPon} />
        )}
        {canKan && (
          <ActionButton label="KAN" sublabel="Quad" color={colors.blue} textColor="#fff" onPress={onKan} />
        )}
        {chiOptions.length > 0 && (
          <ActionButton
            label="CHI"
            sublabel="Sequence"
            color={colors.green}
            textColor="#fff"
            onPress={() => onChi([chiOptions[0][0].id, chiOptions[0][1].id] as [number, number])}
          />
        )}
        <ActionButton label="PASS" color={colors.surface} textColor={colors.textMuted} onPress={onPass} />
      </View>
    );
  }

  // ── Player turn ──────────────────────────────────────────────────────────
  if (phase === 'player_turn') {
    return (
      <View style={styles.row}>
        {canTsumo && (
          <ActionButton label="TSUMO" sublabel="Win!" color={colors.primary} textColor={colors.primaryForeground} onPress={onTsumo} />
        )}
        {canRiichi && selectedTileId !== null && (
          <ActionButton
            label="RIICHI"
            color={colors.primaryDark}
            textColor={colors.winGold}
            onPress={() => onRiichi(selectedTileId)}
          />
        )}
        {selectedTileId !== null && !isRiichi && (
          <ActionButton
            label="DISCARD"
            color={colors.surfaceElevated}
            textColor={colors.text}
            onPress={() => onDiscard(selectedTileId)}
          />
        )}
        {selectedTileId === null && !canTsumo && (
          <View style={styles.hint}>
            <Text style={styles.hintText}>Select a tile to discard</Text>
          </View>
        )}
      </View>
    );
  }

  // ── AI turn ──────────────────────────────────────────────────────────────
  return (
    <View style={styles.row}>
      <View style={styles.hint}>
        <Text style={styles.hintText}>Waiting for opponents…</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  btn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: 'center',
    minWidth: 70,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  btnDisabled: {
    opacity: 0.4,
  },
  btnLabel: {
    fontWeight: '800',
    fontSize: 13,
    letterSpacing: 0.5,
  },
  btnSublabel: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 9,
    marginTop: 2,
  },
  hint: {
    paddingVertical: 12,
  },
  hintText: {
    color: colors.textMuted,
    fontSize: 13,
    fontStyle: 'italic',
  },
});
