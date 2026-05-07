import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, Text } from 'react-native';
import { Tile } from '../engine/tiles';
import MahjongTile from './MahjongTile';
import colors from '../constants/colors';

interface Props {
  hand: Tile[];
  drawnTile: Tile | null;
  selectedTileId: number | null;
  onSelectTile: (tileId: number) => void;
  isRiichi?: boolean;
  canRiichi?: boolean;
  tenpaiWaits?: {suit: string; number: number}[];
  disabled?: boolean;
}

export default function PlayerHand({
  hand,
  drawnTile,
  selectedTileId,
  onSelectTile,
  isRiichi = false,
  disabled = false,
}: Props) {
  return (
    <View style={styles.container}>
      {isRiichi && (
        <View style={styles.riichiIndicator}>
          <Text style={styles.riichiText}>RIICHI</Text>
        </View>
      )}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {hand.map((tile) => (
          <View key={tile.id} style={styles.tileWrapper}>
            <MahjongTile
              tile={tile}
              selected={selectedTileId === tile.id}
              onPress={() => onSelectTile(tile.id)}
              disabled={disabled || isRiichi}
            />
          </View>
        ))}

        {drawnTile && (
          <>
            <View style={styles.separator} />
            <View style={styles.tileWrapper}>
              <MahjongTile
                tile={drawnTile}
                selected={selectedTileId === drawnTile.id}
                highlighted
                onPress={() => onSelectTile(drawnTile.id)}
                disabled={disabled || isRiichi}
              />
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 8,
  },
  scrollContent: {
    paddingHorizontal: 12,
    alignItems: 'flex-end',
    gap: 4,
  },
  tileWrapper: {
    alignItems: 'center',
  },
  separator: {
    width: 12,
  },
  riichiIndicator: {
    alignSelf: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 3,
    borderRadius: 4,
    marginBottom: 6,
  },
  riichiText: {
    color: colors.primaryForeground,
    fontWeight: '800',
    fontSize: 11,
    letterSpacing: 2,
  },
});
