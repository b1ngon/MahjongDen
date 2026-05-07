import React from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Alert, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import colors from '@/constants/colors';
import { useHistory, MatchRecord } from '@/context/HistoryContext';
import AnimatedBackground from '@/components/AnimatedBackground';

function MatchRow({ record }: { record: MatchRecord }) {
  const date = new Date(record.date);
  const dateStr = `${date.toLocaleDateString()} ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  const isWin  = record.result === 'win';
  const isDraw = record.result === 'draw';

  return (
    <View style={styles.row}>
      <View style={[styles.resultPip, isWin && styles.pipWin, isDraw && styles.pipDraw, !isWin && !isDraw && styles.pipLoss]} />
      <View style={{ flex: 1 }}>
        <Text style={styles.rowResult}>
          {isWin ? 'Victory' : isDraw ? 'Draw' : 'Defeat'}
          {record.yaku.length > 0 && <Text style={styles.rowYaku}> · {record.yaku.join(', ')}</Text>}
        </Text>
        <Text style={styles.rowDate}>{dateStr}</Text>
      </View>
      {!isDraw && (
        <Text style={[styles.rowPoints, isWin && { color: colors.winGold }]}>
          {isWin ? '+' : '-'}{record.score.toLocaleString()}
        </Text>
      )}
    </View>
  );
}

export default function HistoryScreen() {
  const insets = useSafeAreaInsets();
  const { history, clearHistory } = useHistory();

  const topPad = Platform.OS === 'web' ? 67 : insets.top;
  const botPad = Platform.OS === 'web' ? 34 : insets.bottom;

  const wins   = history.filter(h => h.result === 'win').length;
  const losses = history.filter(h => h.result === 'loss').length;
  const draws  = history.filter(h => h.result === 'draw').length;

  function handleClear() {
    Alert.alert('Clear History', 'This will delete all match records. Continue?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear', style: 'destructive', onPress: clearHistory },
    ]);
  }

  return (
    <LinearGradient colors={['#04071A', '#080C1A']} style={styles.root}>
      <AnimatedBackground />
      <View style={[styles.header, { paddingTop: topPad + 12 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
          <Text style={styles.closeBtnText}>✕</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Match History</Text>
        <TouchableOpacity onPress={handleClear} disabled={history.length === 0}>
          <Text style={[styles.clearBtn, history.length === 0 && { opacity: 0.3 }]}>Clear</Text>
        </TouchableOpacity>
      </View>

      {/* Stats row */}
      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text style={[styles.statNum, { color: colors.winGold }]}>{wins}</Text>
          <Text style={styles.statLabel}>Wins</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={[styles.statNum, { color: colors.lossCrimson }]}>{losses}</Text>
          <Text style={styles.statLabel}>Losses</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={[styles.statNum, { color: colors.textMuted }]}>{draws}</Text>
          <Text style={styles.statLabel}>Draws</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={[styles.statNum, { color: colors.text }]}>
            {history.length > 0 ? Math.round((wins / history.length) * 100) : 0}%
          </Text>
          <Text style={styles.statLabel}>Win Rate</Text>
        </View>
      </View>

      <FlatList
        data={history}
        keyExtractor={item => item.id}
        renderItem={({ item }) => <MatchRow record={item} />}
        contentContainerStyle={[styles.listContent, { paddingBottom: botPad + 16 }]}
        scrollEnabled={!!history.length}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>No matches yet</Text>
            <Text style={styles.emptyText}>Play a game to see your history here.</Text>
          </View>
        }
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
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
  clearBtn: {
    color: colors.lossCrimson,
    fontSize: 13,
    fontWeight: '700',
  },
  statsRow: {
    flexDirection: 'row',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  statBox: { flex: 1, alignItems: 'center' },
  statNum: { fontSize: 22, fontWeight: '900' },
  statLabel: { color: colors.textMuted, fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 2 },
  listContent: { paddingTop: 8 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  resultPip: { width: 10, height: 10, borderRadius: 5 },
  pipWin:   { backgroundColor: colors.winGold },
  pipLoss:  { backgroundColor: colors.lossCrimson },
  pipDraw:  { backgroundColor: colors.textMuted },
  rowResult: { color: colors.text, fontSize: 14, fontWeight: '700' },
  rowYaku:   { color: colors.textMuted, fontWeight: '400', fontSize: 12 },
  rowDate:   { color: colors.textMuted, fontSize: 11, marginTop: 2 },
  rowPoints: { color: colors.textSecondary, fontSize: 14, fontWeight: '700' },
  separator: { height: 1, backgroundColor: colors.border, marginHorizontal: 20 },
  empty: { paddingTop: 60, alignItems: 'center', gap: 8 },
  emptyTitle: { color: colors.text, fontSize: 17, fontWeight: '700' },
  emptyText: { color: colors.textMuted, fontSize: 13 },
});
