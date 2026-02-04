import {
    DarkTheme,
    DefaultTheme,
    ThemeProvider,
} from "@react-navigation/native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import "react-native-reanimated";

import { useColorScheme } from "@/hooks/use-color-scheme";
import { ToastProvider } from "@/lib/contexts/ToastContext";
import { useAuthStore } from "@/lib/store/authStore";
import { useCartStore } from "@/lib/store/cartStore";
import { useDeliveryLocationStore } from "@/lib/store/deliveryLocationStore";

export const unstable_settings = {
  initialRouteName: "index",
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const hydrate = useAuthStore((s) => s.hydrate);
  const loadCart = useCartStore((s) => s.loadCart);
  const loadLocation = useDeliveryLocationStore((s) => s.loadLocation);

  useEffect(() => {
    hydrate();
    loadCart();
    loadLocation();
  }, [hydrate, loadCart, loadLocation]);

  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <ToastProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen
            name="store/[id]"
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="menu/[id]"
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="cart"
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="account"
            options={{ headerShown: true, title: "Account" }}
          />
          <Stack.Screen
            name="checkout"
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="orders/[id]"
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="orders/[id]/pay"
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="restaurant/edit"
            options={{ headerShown: true, title: "Edit Store" }}
          />
          <Stack.Screen
            name="restaurant/menu"
            options={{ headerShown: true, title: "Menu" }}
          />
          <Stack.Screen
            name="restaurant/orders"
            options={{ headerShown: true, title: "Store orders" }}
          />
          <Stack.Screen
            name="restaurant/menu/new"
            options={{ headerShown: true, title: "New Item" }}
          />
          <Stack.Screen
            name="restaurant/menu/[id]/edit"
            options={{ headerShown: true, title: "Edit Item" }}
          />
          <Stack.Screen
            name="restaurant/orders/[id]"
            options={{ headerShown: true, title: "Order" }}
          />
          <Stack.Screen
            name="rider/orders/[id]"
            options={{ headerShown: true, title: "Delivery" }}
          />
          <Stack.Screen
            name="favourites"
            options={{ headerShown: false }}
          />
        </Stack>
      </ToastProvider>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
