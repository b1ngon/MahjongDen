import React from 'react';
import { View, ScrollView, StyleSheet, Text, Animated } from 'react-native';
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
  tenpaiWaits?: { suit: string; number: number }[];
  disabled?: boolean;
  /** When set, the matching tile is rendered with a pulsing gold ring. */
  hintTileId?: number | null;
  /** When provided, render the hand in this order (tile ids). Tiles in `hand`
   *  that aren't in the order are appended at the end in original order. */
  handOrder?: number[] | null;
}

export default function PlayerHand({
  hand,
  drawnTile,
  selectedTileId,
  onSelectTile,
  isRiichi = false,
  disabled = false,
  hintTileId = null,
  handOrder = null,
}: Props) {
  const orderedHand = React.useMemo(() => {
    if (!handOrder || handOrder.length === 0) return hand;
    const byId = new Map(hand.map(t => [t.id, t]));
    const result: Tile[] = [];
    for (const id of handOrder) {
      const t = byId.get(id);
      if (t) {
        result.push(t);
        byId.delete(id);
      }
    }
    for (const t of byId.values()) result.push(t);
    return result;
  }, [hand, handOrder]);

  const pulse = React.useRef(new Animated.Value(0)).current;
  React.useEffect(() => {
    if (hintTileId == null) {
      pulse.setValue(0);
      return;
    }
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 0, duration: 600, useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [hintTileId]);

  const renderTile = (tile: Tile, isDrawn = false) => {
    const isHint = hintTileId !== null && tile.id === hintTileId;
    const opacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.35, 1] });
    return (
      <View key={tile.id} style={styles.tileWrapper}>
        {isHint && (
          <Animated.View pointerEvents="none" style={[styles.hintRing, { opacity }]} />
        )}
        <MahjongTile
          tile={tile}
          selected={selectedTileId === tile.id}
          highlighted={isDrawn}
          onPress={() => onSelectTile(tile.id)}
          disabled={disabled || isRiichi}
        />
      </View>
    );
  };

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
        {orderedHand.map(t => renderTile(t))}
        {drawnTile && (
          <>
            <View style={styles.separator} />
            {renderTile(drawnTile, true)}
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
    position: 'relative',
  },
  hintRing: {
    position: 'absolute',
    top: -4, left: -4, right: -4, bottom: -4,
    borderRadius: 8,
    borderWidth: 2.5,
    borderColor: '#F4C840',
    zIndex: 5,
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
