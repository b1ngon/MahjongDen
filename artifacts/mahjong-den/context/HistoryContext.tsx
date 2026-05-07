import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface MatchRecord {
  id: string;
  date: string;
  result: 'win' | 'loss' | 'draw';
  score: number;
  yaku: string[];
  opponent?: string;
}

interface HistoryContextValue {
  history: MatchRecord[];
  addMatch: (match: Omit<MatchRecord, 'id'>) => Promise<void>;
  clearHistory: () => Promise<void>;
}

const HistoryContext = createContext<HistoryContextValue | null>(null);
const STORAGE_KEY = 'mahjong_den_history';

export function HistoryProvider({ children }: { children: React.ReactNode }) {
  const [history, setHistory] = useState<MatchRecord[]>([]);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then(raw => {
      if (raw) {
        try { setHistory(JSON.parse(raw)); } catch {}
      }
    });
  }, []);

  const addMatch = useCallback(async (match: Omit<MatchRecord, 'id'>) => {
    const record: MatchRecord = {
      ...match,
      id: Date.now().toString() + Math.random().toString(36).slice(2, 7),
    };
    setHistory(prev => {
      const next = [record, ...prev].slice(0, 50);
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const clearHistory = useCallback(async () => {
    await AsyncStorage.removeItem(STORAGE_KEY);
    setHistory([]);
  }, []);

  return (
    <HistoryContext.Provider value={{ history, addMatch, clearHistory }}>
      {children}
    </HistoryContext.Provider>
  );
}

export function useHistory() {
  const ctx = useContext(HistoryContext);
  if (!ctx) throw new Error('useHistory must be used within HistoryProvider');
  return ctx;
}
