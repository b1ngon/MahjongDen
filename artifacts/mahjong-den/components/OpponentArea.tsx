import React from 'react';
import { View, Text, StyleSheet, Image, ImageSourcePropType } from 'react-native';
import { PlayerState } from '../context/GameContext';
import MahjongTile from './MahjongTile';
import DiscardPile from './DiscardPile';
import colors from '../constants/colors';
import { WIND_CHARS } from '../engine/tiles';

const CHARACTER_IMAGES: Record<string, ImageSourcePropType> = {
  ryuu:   require('../assets/images/char_ryuu.png'),
  kira:   require('../assets/images/char_kira.png'),
  sensei: require('../assets/images/char_sensei.png'),
};

interface Props {
  player: PlayerState;
  position: 'top' | 'left' | 'right';
  isCurrentPlayer: boolean;
}

export default function OpponentArea({ player, position, isCurrentPlayer }: Props) {
  const isTop   = position === 'top';
  const isLeft  = position === 'left';
  const isRight = position === 'right';

  const charImage = CHARACTER_IMAGES[player.characterKey];

  const handTiles = [...player.hand, ...(player.drawnTile ? [player.drawnTile] : [])];

  return (
    <View style={[styles.container, isTop && styles.top, isLeft && styles.left, isRight && styles.right]}>
      {/* Character avatar */}
      <View style={styles.avatarRow}>
        {charImage && (
          <Image source={charImage} style={styles.avatar} resizeMode="cover" />
        )}
        <View style={styles.nameBox}>
          <Text style={styles.name}>{player.name}</Text>
          <View style={styles.windRow}>
            <Text style={styles.windText}>{WIND_CHARS[player.seatWind - 1]}</Text>
            {player.isRiichi && <Text style={styles.riichiPip}>●</Text>}
            {isCurrentPlayer && <View style={styles.activeDot} />}
          </View>
        </View>
        <Text style={styles.score}>{player.score.toLocaleString()}</Text>
      </View>

      {/* Face-down hand */}
      {isTop && (
        <View style={styles.handRow}>
          {handTiles.slice(0, 14).map((tile, i) => (
            <MahjongTile key={tile.id} tile={tile} faceDown small />
          ))}
        </View>
      )}

      {/* Discards */}
      <View style={styles.discardArea}>
        <DiscardPile discards={player.discards} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 4,
  },
  top: {
    alignItems: 'center',
  },
  left: {
    alignItems: 'flex-end',
  },
  right: {
    alignItems: 'flex-start',
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  nameBox: {
    flex: 1,
  },
  name: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '700',
  },
  windRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  windText: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '700',
  },
  riichiPip: {
    color: colors.red,
    fontSize: 8,
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.green,
  },
  score: {
    color: colors.textSecondary,
    fontSize: 11,
  },
  handRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 2,
    justifyContent: 'center',
  },
  discardArea: {
    marginTop: 4,
  },
});
