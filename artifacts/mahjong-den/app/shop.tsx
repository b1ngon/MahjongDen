import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Platform, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

import colors from '@/constants/colors';
import { SKINS, SkinDef } from '@/constants/skins';
import { useShopStore } from '@/store/shopStore';
import AnimatedBackground from '@/components/AnimatedBackground';

function SkinCard({ skin, owned, active, onBuy, onEquip }: {
  skin: SkinDef;
  owned: boolean;
  active: boolean;
  onBuy: () => void;
  onEquip: () => void;
}) {
  return (
    <View style={[styles.card, active && styles.cardActive]}>
      {/* Tile preview */}
      <View style={[styles.tilePreview, {
        backgroundColor: skin.tileBackground,
        borderColor: skin.tileBorder,
      }]}>
        <Text style={[styles.tileChar, { color: skin.manColor }]}>中</Text>
      </View>

      <View style={styles.cardBody}>
        <View style={styles.cardHeader}>
          <Text style={styles.skinEmoji}>{skin.emoji}</Text>
          <View>
            <Text style={styles.skinName}>{skin.name}</Text>
            <Text style={styles.skinNameJp}>{skin.nameJp}</Text>
          </View>
          {active && (
            <View style={styles.activeBadge}>
              <Text style={styles.activeBadgeText}>ON</Text>
            </View>
          )}
        </View>

        <Text style={styles.skinDesc}>{skin.description}</Text>

        {/* Colour swatches */}
        <View style={styles.swatches}>
          {[skin.manColor, skin.pinColor, skin.souColor, skin.honorColor].map((c, i) => (
            <View key={i} style={[styles.swatch, { backgroundColor: c }]} />
          ))}
        </View>
      </View>

      <View style={styles.cardAction}>
        {owned ? (
          <TouchableOpacity
            style={[styles.actionBtn, active && styles.actionBtnActive]}
            onPress={active ? undefined : onEquip}
            activeOpacity={active ? 1 : 0.8}
          >
            <Text style={[styles.actionBtnText, active && { color: colors.primaryForeground }]}>
              {active ? 'Equipped' : 'Equip'}
            </Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.buyBtn} onPress={onBuy} activeOpacity={0.8}>
            <Text style={styles.buyBtnCoin}>🪙</Text>
            <Text style={styles.buyBtnText}>{skin.price.toLocaleString()}</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

export default function ShopScreen() {
  const insets = useSafeAreaInsets();
  const coins        = useShopStore(s => s.coins);
  const ownedSkinIds = useShopStore(s => s.ownedSkinIds);
  const activeSkinId = useShopStore(s => s.activeSkinId);
  const buySkin      = useShopStore(s => s.buySkin);
  const setActiveSkin = useShopStore(s => s.setActiveSkin);

  const topPad = Platform.OS === 'web' ? 67 : insets.top;
  const botPad = Platform.OS === 'web' ? 34 : insets.bottom;

  function handleBuy(skin: SkinDef) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (coins < skin.price) {
      Alert.alert('Not enough coins', `You need ${skin.price - coins} more coins. Win games to earn coins!`);
      return;
    }
    Alert.alert(
      `Buy ${skin.name}?`,
      `This costs ${skin.price} coins. You have ${coins} coins.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Buy',
          onPress: () => {
            const ok = buySkin(skin.id);
            if (ok) {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              setActiveSkin(skin.id);
            }
          },
        },
      ],
    );
  }

  function handleEquip(skinId: string) {
    Haptics.selectionAsync();
    setActiveSkin(skinId);
  }

  return (
    <LinearGradient colors={['#030D04', '#061209', '#030D04']} style={styles.root}>
      <AnimatedBackground />

      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 12 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.title}>皮膚</Text>
          <Text style={styles.titleEn}>TILE SKINS</Text>
        </View>
        <View style={styles.coinBadge}>
          <Text style={styles.coinIcon}>🪙</Text>
          <Text style={styles.coinText}>{coins.toLocaleString()}</Text>
        </View>
      </View>

      <Text style={styles.hint}>Win matches to earn coins. Buy new tile skins to customise your table.</Text>

      <ScrollView
        contentContainerStyle={[styles.list, { paddingBottom: botPad + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        {SKINS.map(skin => (
          <SkinCard
            key={skin.id}
            skin={skin}
            owned={ownedSkinIds.includes(skin.id)}
            active={activeSkinId === skin.id}
            onBuy={() => handleBuy(skin)}
            onEquip={() => handleEquip(skin.id)}
          />
        ))}
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingBottom: 8, gap: 8,
  },
  backBtn: { width: 60 },
  backText: { color: colors.textSecondary, fontSize: 14 },
  headerCenter: { flex: 1, alignItems: 'center' },
  title: { color: colors.primary, fontSize: 26, fontWeight: '900', letterSpacing: 3 },
  titleEn: { color: colors.text, fontSize: 12, letterSpacing: 4, marginTop: -4 },
  coinBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: colors.surfaceElevated, borderRadius: 20,
    paddingHorizontal: 10, paddingVertical: 5,
    borderWidth: 1, borderColor: colors.primary,
  },
  coinIcon: { fontSize: 14 },
  coinText: { color: colors.primary, fontWeight: '800', fontSize: 14 },
  hint: {
    color: colors.textMuted, fontSize: 11, textAlign: 'center',
    paddingHorizontal: 32, marginBottom: 12,
  },
  list: { paddingHorizontal: 16, gap: 14 },

  card: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: 14, borderWidth: 1, borderColor: colors.border,
    flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12,
  },
  cardActive: {
    borderColor: colors.primary,
    shadowColor: colors.primary, shadowOpacity: 0.4,
    shadowRadius: 8, shadowOffset: { width: 0, height: 0 }, elevation: 8,
  },
  tilePreview: {
    width: 52, height: 72, borderRadius: 7,
    borderWidth: 2, alignItems: 'center', justifyContent: 'center',
  },
  tileChar: { fontSize: 28, fontWeight: '900' },
  cardBody: { flex: 1, gap: 4 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  skinEmoji: { fontSize: 18 },
  skinName: { color: colors.text, fontSize: 15, fontWeight: '800' },
  skinNameJp: { color: colors.textMuted, fontSize: 10, letterSpacing: 2 },
  activeBadge: {
    backgroundColor: colors.primary, borderRadius: 4,
    paddingHorizontal: 6, paddingVertical: 1, marginLeft: 'auto',
  },
  activeBadgeText: { color: colors.primaryForeground, fontSize: 10, fontWeight: '900' },
  skinDesc: { color: colors.textSecondary, fontSize: 12 },
  swatches: { flexDirection: 'row', gap: 5, marginTop: 2 },
  swatch: { width: 14, height: 14, borderRadius: 7 },

  cardAction: { alignItems: 'center' },
  actionBtn: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
  },
  actionBtnActive: {
    backgroundColor: colors.primary,
  },
  actionBtnText: { color: colors.text, fontWeight: '700', fontSize: 13 },
  buyBtn: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8,
    backgroundColor: colors.primaryDark, borderWidth: 1, borderColor: colors.primary,
    alignItems: 'center',
  },
  buyBtnCoin: { fontSize: 16 },
  buyBtnText: { color: colors.winGold, fontWeight: '900', fontSize: 12 },
});
