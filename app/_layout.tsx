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
import { useAuthStore } from "@/lib/store/authStore";
import { useCartStore } from "@/lib/store/cartStore";

export const unstable_settings = {
  initialRouteName: "index",
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const hydrate = useAuthStore((s) => s.hydrate);
  const loadCart = useCartStore((s) => s.loadCart);

  useEffect(() => {
    hydrate();
    loadCart();
  }, [hydrate, loadCart]);

  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="store/[id]"
          options={{ headerShown: true, title: "Store" }}
        />
        <Stack.Screen
          name="menu/[id]"
          options={{ headerShown: true, title: "Item" }}
        />
        <Stack.Screen
          name="checkout"
          options={{ headerShown: true, title: "Checkout" }}
        />
        <Stack.Screen
          name="orders/[id]"
          options={{ headerShown: true, title: "Order" }}
        />
        <Stack.Screen
          name="orders/[id]/pay"
          options={{ headerShown: true, title: "Pay" }}
        />
        <Stack.Screen
          name="restaurant/edit"
          options={{ headerShown: true, title: "Edit Store" }}
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
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
