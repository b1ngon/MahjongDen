import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Tile } from '../engine/tiles';
import MahjongTile from './MahjongTile';
import colors from '../constants/colors';

interface Props {
  discards: Tile[];
  isHorizontal?: boolean;
}

const COLS = 6;

export default function DiscardPile({ discards, isHorizontal = false }: Props) {
  const rows: Tile[][] = [];
  for (let i = 0; i < discards.length; i += COLS) {
    rows.push(discards.slice(i, i + COLS));
  }

  return (
    <View style={styles.container}>
      {rows.map((row, rowIdx) => (
        <View key={rowIdx} style={styles.row}>
          {row.map((tile) => (
            <MahjongTile key={tile.id} tile={tile} small />
          ))}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 2,
  },
  row: {
    flexDirection: 'row',
    gap: 2,
  },
});
