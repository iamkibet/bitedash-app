import * as authApi from "@/lib/api/auth";
import { clearStoredToken, getStoredToken } from "@/lib/api/client";
import type { User } from "@/types/api";
import { create } from "zustand";

interface AuthState {
  user: User | null;
  isHydrated: boolean;
  setUser: (user: User | null) => void;
  hydrate: () => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()((set) => ({
  user: null,
  isHydrated: false,

  setUser: (user) => set({ user }),

  hydrate: async () => {
    const token = await getStoredToken();
    if (!token) {
      set({ user: null, isHydrated: true });
      return;
    }
    try {
      const { user } = await authApi.getMe();
      set({ user, isHydrated: true });
    } catch {
      await clearStoredToken();
      set({ user: null, isHydrated: true });
    }
  },

  logout: async () => {
    try {
      await authApi.logout();
    } finally {
      await clearStoredToken();
      set({ user: null });
    }
  },
}));
