import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
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
  /** Z-rotation on the tile face for discard piles (each seat faces the table center). */
  tableRotateDeg?: number;
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

/**
 * MahjongTile
 * ---------------------------------------------------------------------
 * Re-rendered as a tactile, materially layered piece (no logic changes).
 *
 *   ┌──────────────────┐  ← top edge highlight
 *   │  ░░░░ FACE ░░░░  │  ← ivory face w/ subtle vignette
 *   │   labels here    │
 *   ├──────────────────┤  ← thin inner divider
 *   ╲                  ╱  ← felt-green base "thickness" strip
 *    ╲                ╱
 *     ╲______________╱     soft drop shadow under tile
 *
 * For tiny/small/normal sizes we scale the bezel/thickness proportionally.
 * Selection lifts the tile and softens the shadow; highlight gives a warm
 * gold rim instead of the previous flat red border.
 */
export default function MahjongTile({
  tile,
  selected = false,
  highlighted = false,
  faceDown = false,
  small = false,
  tiny = false,
  tableRotateDeg = 0,
  onPress,
  disabled = false,
}: Props) {
  const activeSkinId = useShopStore(s => s.activeSkinId);
  const skin = SKINS.find(s => s.id === activeSkinId) ?? SKINS[0];

  const suitColor = getSuitColor(tile, skin);

  const w        = tiny ? 22 : small ? 30 : 40;
  const h        = tiny ? 30 : small ? 42 : 56;
  const labelSz  = tiny ? 11 : small ? 13 : 18;
  const suitSz   = tiny ? 7  : small ? 9  : 12;
  const radius   = tiny ? 4  : small ? 5  : 7;
  // base = green "thickness" wedge under the face; gives the tile depth.
  const base     = tiny ? 3  : small ? 4  : 6;

  const rot =
    tableRotateDeg !== 0 && tableRotateDeg !== undefined ? `${tableRotateDeg}deg` : null;
  const transform = [
    ...(rot ? [{ rotate: rot }] : []),
    ...(selected ? [{ translateY: -10 }] : []),
  ];
  const hasTransform = transform.length > 0;

  // Material colors — biased to match the cinematic mock (warm ivory + jade base).
  const faceTop    = faceDown ? '#26517E' : '#FBF4DC';
  const faceMid    = faceDown ? '#1B3F66' : '#F2E9C9';
  const faceBottom = faceDown ? '#15314F' : '#E4D9B5';
  const baseTop    = faceDown ? '#0F2540' : '#5C8A48';
  const baseBottom = faceDown ? '#081A2E' : '#2E5028';

  const rimColor  = selected
    ? '#F5D27A'
    : highlighted
      ? '#E8B14A'
      : faceDown
        ? '#3A6493'
        : 'rgba(60,40,18,0.45)';

  const shadow = selected
    ? { shadowColor: '#000', shadowOpacity: 0.55, shadowRadius: 8, shadowOffset: { width: 0, height: 6 }, elevation: 10 }
    : tiny
      ? { shadowColor: '#000', shadowOpacity: 0.32, shadowRadius: 2, shadowOffset: { width: 0, height: 2 }, elevation: 2 }
      : { shadowColor: '#000', shadowOpacity: 0.45, shadowRadius: 4, shadowOffset: { width: 0, height: 3 }, elevation: 4 };

  const containerStyle: any = [
    styles.tile,
    {
      width: w,
      height: h,
      borderRadius: radius,
      borderColor: rimColor,
      borderWidth: selected ? 2 : highlighted ? 1.5 : 1,
      ...shadow,
      ...(hasTransform ? { transform } : {}),
    },
  ];

  // Face-down body: jade-tinted slab with subtle inner highlight.
  const inner = faceDown ? (
    <>
      <LinearGradient
        colors={[faceTop, faceMid, faceBottom] as [string, string, string]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={[StyleSheet.absoluteFill, { borderRadius: radius - 1 }]}
      />
      <View style={[styles.faceTopShine, { borderTopLeftRadius: radius - 1, borderTopRightRadius: radius - 1 }]} />
      <View style={styles.backPattern}>
        <Text style={[styles.backText, tiny && { fontSize: 12 }]}>🀫</Text>
      </View>
    </>
  ) : (
    <>
      {/* Ivory face with vertical gradient → soft material */}
      <LinearGradient
        colors={[faceTop, faceMid, faceBottom] as [string, string, string]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={[StyleSheet.absoluteFill, { borderRadius: radius - 1 }]}
      />
      {/* Top sheen highlight (carved bevel) */}
      <View style={[styles.faceTopShine, { borderTopLeftRadius: radius - 1, borderTopRightRadius: radius - 1 }]} />
      {/* Side micro-shadow on right edge */}
      <View style={[styles.faceRightShade, { borderTopRightRadius: radius - 1, borderBottomRightRadius: radius - 1 }]} />
      {/* Jade "thickness" strip along the bottom of the face → fakes depth */}
      <LinearGradient
        colors={[baseTop, baseBottom] as [string, string]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={[
          styles.tileBase,
          {
            height: base,
            borderBottomLeftRadius: radius - 1,
            borderBottomRightRadius: radius - 1,
          },
        ]}
      />
      {/* Hairline divider between face and base */}
      <View style={[styles.tileBaseEdge, { bottom: base }]} />
      {/* Symbol stack (slightly above the depth wedge) */}
      <View style={[styles.symbolWrap, { paddingBottom: base }]}>
        <Text
          style={[
            styles.label,
            { fontSize: labelSz, color: suitColor },
            tiny && { lineHeight: labelSz + 1 },
          ]}
        >
          {tileLabel(tile)}
        </Text>
        {!isHonor(tile) && (
          <Text style={[styles.suitLabel, { fontSize: suitSz, color: suitColor }]}>
            {tileSuitLabel(tile)}
          </Text>
        )}
      </View>
      {/* Soft warm glow when selected */}
      {selected && <View style={[styles.selectGlow, { borderRadius: radius + 2 }]} />}
    </>
  );

  if (onPress) {
    return (
      <TouchableOpacity
        onPress={onPress}
        disabled={disabled}
        activeOpacity={0.85}
        style={containerStyle}
      >
        {inner}
      </TouchableOpacity>
    );
  }

  return <View style={containerStyle}>{inner}</View>;
}

const styles = StyleSheet.create({
  tile: {
    overflow: 'hidden',
    alignItems: 'stretch',
    justifyContent: 'flex-start',
    backgroundColor: '#F2E9C9',
  },
  faceTopShine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '34%',
    backgroundColor: 'rgba(255,255,255,0.35)',
    opacity: 0.55,
  },
  faceRightShade: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    right: 0,
    width: 1.5,
    backgroundColor: 'rgba(20,12,4,0.18)',
  },
  tileBase: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
  tileBaseEdge: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(0,0,0,0.18)',
  },
  symbolWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectGlow: {
    position: 'absolute',
    top: -3,
    left: -3,
    right: -3,
    bottom: -3,
    borderWidth: 1.5,
    borderColor: 'rgba(245,210,122,0.55)',
    backgroundColor: 'transparent',
  },
  backPattern: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  backText: { fontSize: 18, color: 'rgba(220,235,255,0.55)' },
  label: { fontWeight: '800', textAlign: 'center', letterSpacing: 0.2 },
  suitLabel: { textAlign: 'center', fontWeight: '700', marginTop: -2, opacity: 0.9 },
});
