import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { Tile, tileLabel, tileSuitLabel, isHonor } from '../engine/tiles';
import colors from '../constants/colors';

interface Props {
  tile: Tile;
  selected?: boolean;
  highlighted?: boolean;
  faceDown?: boolean;
  small?: boolean;
  tiny?: boolean;
  onPress?: () => void;
  disabled?: boolean;
}

function getSuitColor(tile: Tile): string {
  if (tile.suit === 'man') return colors.manColor;
  if (tile.suit === 'pin') return colors.pinColor;
  if (tile.suit === 'sou') return colors.souColor;
  if (tile.suit === 'wind') return colors.honorColor;
  if (tile.suit === 'dragon') {
    if (tile.number === 1) return colors.dragonHakuColor;
    if (tile.number === 2) return colors.dragonHatsuColor;
    return colors.dragonChunColor;
  }
  return colors.honorColor;
}

export default function MahjongTile({
  tile,
  selected = false,
  highlighted = false,
  faceDown = false,
  small = false,
  tiny = false,
  onPress,
  disabled = false,
}: Props) {
  const suitColor = getSuitColor(tile);

  const width  = tiny ? 22 : small ? 30 : 40;
  const height = tiny ? 30 : small ? 42 : 56;
  const labelSize = tiny ? 11 : small ? 13 : 18;
  const suitSize  = tiny ? 7  : small ? 9  : 12;
  const elevation = selected ? 6 : 2;

  const containerStyle = [
    styles.tile,
    { width, height, elevation },
    faceDown && styles.faceDown,
    selected && styles.selected,
    highlighted && styles.highlighted,
  ];

  const inner = faceDown ? (
    <View style={[styles.backPattern, { borderRadius: 4 }]}>
      <Text style={styles.backText}>🀫</Text>
    </View>
  ) : (
    <>
      <Text style={[styles.label, { fontSize: labelSize, color: suitColor }]}>
        {tileLabel(tile)}
      </Text>
      {!isHonor(tile) && (
        <Text style={[styles.suitLabel, { fontSize: suitSize, color: suitColor }]}>
          {tileSuitLabel(tile)}
        </Text>
      )}
    </>
  );

  if (onPress) {
    return (
      <TouchableOpacity
        onPress={onPress}
        disabled={disabled}
        activeOpacity={0.75}
        style={[containerStyle, selected && { transform: [{ translateY: -8 }] }]}
      >
        {inner}
      </TouchableOpacity>
    );
  }

  return (
    <View style={[containerStyle, selected && { transform: [{ translateY: -8 }] }]}>
      {inner}
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    backgroundColor: colors.tileBackground,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: colors.tileBorder,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0px 2px 3px rgba(0,0,0,0.4)',
  },
  faceDown: {
    backgroundColor: colors.tileBackFace,
    borderColor: '#2A5080',
  },
  selected: {
    borderColor: colors.primary,
    borderWidth: 2,
    boxShadow: '0px 0px 6px rgba(200,168,75,0.8)',
  },
  highlighted: {
    borderColor: '#E53E3E',
    borderWidth: 2,
  },
  label: {
    fontWeight: '700',
    textAlign: 'center',
  },
  suitLabel: {
    textAlign: 'center',
    fontWeight: '600',
    marginTop: -2,
  },
  backPattern: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backText: {
    fontSize: 18,
  },
});
