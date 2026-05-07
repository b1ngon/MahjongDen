import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Meld } from '../engine/tiles';
import MahjongTile from './MahjongTile';

interface Props {
  melds: Meld[];
}

export default function MeldDisplay({ melds }: Props) {
  if (melds.length === 0) return null;

  return (
    <View style={styles.container}>
      {melds.map((meld, i) => (
        <View key={i} style={styles.meld}>
          {meld.tiles.map((tile, j) => (
            <MahjongTile key={j} tile={tile} small />
          ))}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
  },
  meld: {
    flexDirection: 'row',
    gap: 2,
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 4,
    padding: 2,
  },
});
