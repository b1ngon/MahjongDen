import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Tile, tileLabel, tileSuitLabel, isHonor } from '../engine/tiles';
import colors from '../constants/colors';
import { SKINS, SkinDef } from '../constants/skins';
import { useShopStore } from '../store/shopStore';

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

function getSuitColor(tile: Tile, skin: SkinDef): string {
  if (tile.suit === 'man') return skin.manColor;
  if (tile.suit === 'pin') return skin.pinColor;
  if (tile.suit === 'sou') return skin.souColor;
  if (tile.suit === 'wind') return skin.honorColor;
  if (tile.suit === 'dragon') {
    if (tile.number === 1) return colors.dragonHakuColor;
    if (tile.number === 2) return skin.souColor;
    return skin.manColor;
  }
  return skin.honorColor;
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
  const activeSkinId = useShopStore(s => s.activeSkinId);
  const skin = SKINS.find(s => s.id === activeSkinId) ?? SKINS[0];

  const suitColor = getSuitColor(tile, skin);

  const w       = tiny ? 22 : small ? 30 : 40;
  const h       = tiny ? 30 : small ? 42 : 56;
  const labelSz = tiny ? 11 : small ? 13 : 18;
  const suitSz  = tiny ? 7  : small ? 9  : 12;

  const containerStyle = [
    styles.tile,
    {
      width: w, height: h,
      backgroundColor: faceDown ? skin.tileBackFace : skin.tileBackground,
      borderColor: faceDown ? '#2A5080'
        : selected    ? skin.borderGlow
        : highlighted ? colors.red
        : skin.tileBorder,
      borderWidth: (selected || highlighted) ? 2 : 1,
      elevation: selected ? 6 : 2,
    },
  ];

  const inner = faceDown ? (
    <View style={styles.backPattern}>
      <Text style={styles.backText}>🀫</Text>
    </View>
  ) : (
    <>
      <Text style={[styles.label, { fontSize: labelSz, color: suitColor }]}>
        {tileLabel(tile)}
      </Text>
      {!isHonor(tile) && (
        <Text style={[styles.suitLabel, { fontSize: suitSz, color: suitColor }]}>
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
        style={[containerStyle, selected && styles.selectedLift]}
      >
        {inner}
      </TouchableOpacity>
    );
  }

  return (
    <View style={[containerStyle, selected && styles.selectedLift]}>
      {inner}
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    borderRadius: 5,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0px 2px 3px rgba(0,0,0,0.4)',
  } as any,
  selectedLift: { transform: [{ translateY: -8 }] },
  backPattern: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  backText: { fontSize: 18 },
  label: { fontWeight: '700', textAlign: 'center' },
  suitLabel: { textAlign: 'center', fontWeight: '600', marginTop: -2 },
});
