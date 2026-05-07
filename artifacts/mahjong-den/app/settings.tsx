import React from 'react';
import {
  View, Text, StyleSheet, Switch, TouchableOpacity, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import colors from '@/constants/colors';
import { useSettings } from '@/context/SettingsContext';

function Row({ label, sub, right }: { label: string; sub?: string; right: React.ReactNode }) {
  return (
    <View style={styles.settingRow}>
      <View style={{ flex: 1 }}>
        <Text style={styles.settingLabel}>{label}</Text>
        {sub && <Text style={styles.settingSub}>{sub}</Text>}
      </View>
      {right}
    </View>
  );
}

function SectionTitle({ title }: { title: string }) {
  return <Text style={styles.sectionTitle}>{title}</Text>;
}

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { settings, updateSetting } = useSettings();

  const topPad = Platform.OS === 'web' ? 67 : insets.top;
  const botPad = Platform.OS === 'web' ? 34 : insets.bottom;

  return (
    <LinearGradient colors={['#04071A', '#080C1A']} style={styles.root}>
      <View style={[styles.header, { paddingTop: topPad + 12 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
          <Text style={styles.closeBtnText}>✕</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Settings</Text>
        <View style={{ width: 36 }} />
      </View>

      <View style={[styles.content, { paddingBottom: botPad + 24 }]}>
        <SectionTitle title="GAMEPLAY" />
        <View style={styles.card}>
          <Row
            label="Tile Hints"
            sub="Show tenpai waits when in riichi"
            right={
              <Switch
                value={settings.showTileHints}
                onValueChange={v => updateSetting('showTileHints', v)}
                trackColor={{ false: colors.surface, true: colors.primaryDark }}
                thumbColor={settings.showTileHints ? colors.primary : colors.textMuted}
              />
            }
          />
          <View style={styles.divider} />
          <Row
            label="Animation Speed"
            sub={settings.animationSpeed}
            right={
              <View style={styles.segmentControl}>
                {(['slow', 'normal', 'fast'] as const).map(speed => (
                  <TouchableOpacity
                    key={speed}
                    style={[styles.segment, settings.animationSpeed === speed && styles.segmentActive]}
                    onPress={() => updateSetting('animationSpeed', speed)}
                  >
                    <Text style={[styles.segmentText, settings.animationSpeed === speed && styles.segmentTextActive]}>
                      {speed[0].toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            }
          />
        </View>

        <SectionTitle title="AUDIO & HAPTICS" />
        <View style={styles.card}>
          <Row
            label="Sound"
            sub="Sound effects (coming soon)"
            right={
              <Switch
                value={settings.soundEnabled}
                onValueChange={v => updateSetting('soundEnabled', v)}
                trackColor={{ false: colors.surface, true: colors.primaryDark }}
                thumbColor={settings.soundEnabled ? colors.primary : colors.textMuted}
              />
            }
          />
          <View style={styles.divider} />
          <Row
            label="Haptics"
            sub="Vibration feedback on actions"
            right={
              <Switch
                value={settings.hapticEnabled}
                onValueChange={v => updateSetting('hapticEnabled', v)}
                trackColor={{ false: colors.surface, true: colors.primaryDark }}
                thumbColor={settings.hapticEnabled ? colors.primary : colors.textMuted}
              />
            }
          />
        </View>

        <SectionTitle title="ABOUT" />
        <View style={styles.card}>
          <Row label="Version" right={<Text style={styles.metaText}>1.0.0</Text>} />
          <View style={styles.divider} />
          <Row label="Rules" sub="Riichi Mahjong · East Round" right={<Text style={styles.metaText}>東風戦</Text>} />
          <View style={styles.divider} />
          <Row label="Opponents" sub="AI-powered, rule-based" right={<Text style={styles.metaText}>×3</Text>} />
        </View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  closeBtn: { width: 36 },
  closeBtnText: { color: colors.textMuted, fontSize: 18 },
  title: {
    flex: 1,
    textAlign: 'center',
    color: colors.text,
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  content: {
    padding: 20,
    gap: 8,
  },
  sectionTitle: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    paddingLeft: 4,
    marginTop: 12,
    marginBottom: 4,
  },
  card: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  settingLabel: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '600',
  },
  settingSub: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginHorizontal: 16,
  },
  segmentControl: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  segment: {
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  segmentActive: {
    backgroundColor: colors.primary,
  },
  segmentText: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
  },
  segmentTextActive: {
    color: colors.primaryForeground,
  },
  metaText: {
    color: colors.textMuted,
    fontSize: 13,
  },
});
