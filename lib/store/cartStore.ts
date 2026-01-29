import type { MenuItem } from "@/types/api";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";

const CART_KEY = "bitedash_cart";
const MAX_QUANTITY = 50;

export interface CartItem {
  menuItem: MenuItem;
  quantity: number;
}

interface CartState {
  restaurantId: number | null;
  items: CartItem[];
  addItem: (menuItem: MenuItem, quantity?: number) => void;
  removeItem: (menuItemId: number) => void;
  updateQuantity: (menuItemId: number, quantity: number) => void;
  clearCart: () => void;
  getSubtotal: () => number;
  getItemCount: () => number;
  loadCart: () => Promise<void>;
  persistCart: () => Promise<void>;
}

const defaultState = {
  restaurantId: null as number | null,
  items: [] as CartItem[],
};

export const useCartStore = create<CartState>()((set, get) => ({
  ...defaultState,

  addItem: (menuItem, quantity = 1) => {
    const qty = Math.min(Math.max(1, quantity), MAX_QUANTITY);
    set((state) => {
      if (
        state.restaurantId !== null &&
        state.restaurantId !== menuItem.restaurant_id
      ) {
        return {
          restaurantId: menuItem.restaurant_id,
          items: [{ menuItem, quantity: qty }],
        };
      }
      const existing = state.items.find((i) => i.menuItem.id === menuItem.id);
      let next: CartItem[];
      if (existing) {
        next = state.items.map((i) =>
          i.menuItem.id === menuItem.id
            ? { ...i, quantity: Math.min(i.quantity + qty, MAX_QUANTITY) }
            : i,
        );
      } else {
        next = [...state.items, { menuItem, quantity: qty }];
      }
      return {
        restaurantId: state.restaurantId ?? menuItem.restaurant_id,
        items: next,
      };
    });
    get().persistCart();
  },

  removeItem: (menuItemId) => {
    set((state) => {
      const next = state.items.filter((i) => i.menuItem.id !== menuItemId);
      return {
        items: next,
        restaurantId: next.length === 0 ? null : state.restaurantId,
      };
    });
    get().persistCart();
  },

  updateQuantity: (menuItemId, quantity) => {
    const qty = Math.min(Math.max(0, quantity), MAX_QUANTITY);
    if (qty === 0) {
      get().removeItem(menuItemId);
      return;
    }
    set((state) => ({
      items: state.items.map((i) =>
        i.menuItem.id === menuItemId ? { ...i, quantity: qty } : i,
      ),
    }));
    get().persistCart();
  },

  clearCart: () => {
    set(defaultState);
    AsyncStorage.removeItem(CART_KEY);
  },

  getSubtotal: () => {
    return get().items.reduce(
      (sum, i) => sum + i.menuItem.price * i.quantity,
      0,
    );
  },

  getItemCount: () => {
    return get().items.reduce((sum, i) => sum + i.quantity, 0);
  },

  loadCart: async () => {
    try {
      const raw = await AsyncStorage.getItem(CART_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as {
          restaurantId: number | null;
          items: CartItem[];
        };
        set({
          restaurantId: parsed.restaurantId,
          items: parsed.items || [],
        });
      }
    } catch {
      // ignore
    }
  },

  persistCart: async () => {
    const state = get();
    try {
      await AsyncStorage.setItem(
        CART_KEY,
        JSON.stringify({
          restaurantId: state.restaurantId,
          items: state.items,
        }),
      );
    } catch {
      // ignore
    }
  },
}));
