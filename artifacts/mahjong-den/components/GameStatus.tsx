import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Tile, WIND_CHARS } from '../engine/tiles';
import MahjongTile from './MahjongTile';
import colors from '../constants/colors';
import { useGameStore } from '../store/gameStore';
import { GAME_MODE_MAP } from '../constants/gameModes';

interface Props {
  roundWind: number;
  dealer: number;
  tilesLeft: number;
  dora: Tile[];
}

export default function GameStatus({ roundWind, dealer, tilesLeft, dora }: Props) {
  const gameMode = useGameStore(s => s.gameMode);
  const modeInfo = GAME_MODE_MAP[gameMode];

  return (
    <View style={styles.container}>
      <View style={styles.info}>
        <Text style={styles.label}>Round</Text>
        <Text style={styles.value}>{WIND_CHARS[roundWind - 1]} {dealer + 1}</Text>
      </View>
      <View style={styles.info}>
        <Text style={styles.label}>Wall</Text>
        <Text style={styles.value}>{tilesLeft}</Text>
      </View>
      <View style={styles.info}>
        <Text style={styles.label}>Mode</Text>
        <Text style={styles.modeValue}>{modeInfo.flag} {modeInfo.shortName}</Text>
      </View>
      {gameMode === 'riichi' && (
        <View style={styles.doraRow}>
          <Text style={styles.label}>Dora</Text>
          {dora.map((tile, i) => (
            <MahjongTile key={i} tile={tile} tiny />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 6,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: 12,
  },
  info: { alignItems: 'center' },
  label: {
    color: colors.textMuted,
    fontSize: 9,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  value: { color: colors.primary, fontSize: 14, fontWeight: '800' },
  modeValue: { color: colors.text, fontSize: 12, fontWeight: '700' },
  doraRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
});
