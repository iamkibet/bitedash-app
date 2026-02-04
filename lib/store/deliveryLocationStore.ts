import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";

const STORAGE_KEY = "bitedash_delivery_location";

export interface DeliveryLocation {
  address: string;
  latitude?: number;
  longitude?: number;
}

interface DeliveryLocationState {
  location: DeliveryLocation | null;
  setLocation: (loc: DeliveryLocation | null) => void;
  loadLocation: () => Promise<void>;
  persistLocation: () => Promise<void>;
}

export const useDeliveryLocationStore = create<DeliveryLocationState>()(
  (set, get) => ({
    location: null,

    setLocation: (loc) => {
      set({ location: loc });
      get().persistLocation();
    },

    loadLocation: async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as DeliveryLocation;
          set({ location: parsed });
        }
      } catch {
        // ignore
      }
    },

    persistLocation: async () => {
      const { location } = get();
      try {
        if (location) {
          await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(location));
        } else {
          await AsyncStorage.removeItem(STORAGE_KEY);
        }
      } catch {
        // ignore
      }
    },
  })
);
