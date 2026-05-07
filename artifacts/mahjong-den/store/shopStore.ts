import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SkinDef, SKINS } from '../constants/skins';

const STORAGE_KEY = 'mahjong_den_shop_v2';

interface ShopState {
  coins: number;
  ownedSkinIds: string[];
  activeSkinId: string;
  loaded: boolean;

  load: () => Promise<void>;
  addCoins: (amount: number) => void;
  buySkin: (skinId: string) => boolean;
  setActiveSkin: (skinId: string) => void;
  getActiveSkin: () => SkinDef;
}

async function persist(coins: number, ownedSkinIds: string[], activeSkinId: string) {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ coins, ownedSkinIds, activeSkinId }));
}

export const useShopStore = create<ShopState>()((set, get) => ({
  coins: 1000,
  ownedSkinIds: ['classic'],
  activeSkinId: 'classic',
  loaded: false,

  async load() {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) {
        const data = JSON.parse(raw) as { coins: number; ownedSkinIds: string[]; activeSkinId: string };
        set({ coins: data.coins ?? 1000, ownedSkinIds: data.ownedSkinIds ?? ['classic'], activeSkinId: data.activeSkinId ?? 'classic', loaded: true });
      } else {
        set({ loaded: true });
      }
    } catch {
      set({ loaded: true });
    }
  },

  addCoins(amount: number) {
    set(s => {
      const coins = s.coins + amount;
      persist(coins, s.ownedSkinIds, s.activeSkinId);
      return { coins };
    });
  },

  buySkin(skinId: string) {
    const s = get();
    const skin = SKINS.find(sk => sk.id === skinId);
    if (!skin || s.ownedSkinIds.includes(skinId) || s.coins < skin.price) return false;
    const coins = s.coins - skin.price;
    const ownedSkinIds = [...s.ownedSkinIds, skinId];
    persist(coins, ownedSkinIds, s.activeSkinId);
    set({ coins, ownedSkinIds });
    return true;
  },

  setActiveSkin(skinId: string) {
    const s = get();
    if (!s.ownedSkinIds.includes(skinId)) return;
    persist(s.coins, s.ownedSkinIds, skinId);
    set({ activeSkinId: skinId });
  },

  getActiveSkin() {
    const s = get();
    return SKINS.find(sk => sk.id === s.activeSkinId) ?? SKINS[0];
  },
}));
