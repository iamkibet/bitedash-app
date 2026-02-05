import { HapticTab } from "@/components/haptic-tab";
import { TopBarRight } from "@/components/top-bar-header";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useAuthStore } from "@/lib/store/authStore";
import { Tabs } from "expo-router";
import React from "react";
import { Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const TAB_BAR_HEIGHT = 56;

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const user = useAuthStore((s) => s.user);
  const role = String(user?.role ?? "customer").toLowerCase();
  const insets = useSafeAreaInsets();
  const isRestaurant = role === "restaurant";
  const isRider = role === "rider";
  const tabBarBottomPadding = insets.bottom > 0 ? insets.bottom : 12;
  const tint = Colors[colorScheme ?? "light"].tint;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: tint,
        headerShown: true,
        headerRight: () => <TopBarRight />,
        headerTitleStyle: { fontSize: 18, fontWeight: "600", color: "#111" },
        headerShadowVisible: false,
        headerStyle: {
          backgroundColor: "#fff",
          borderBottomWidth: 1,
          borderBottomColor: "#e5e7eb",
        },
        tabBarButton: HapticTab,
        tabBarLabelStyle: { fontSize: 11, fontWeight: "500" },
        tabBarInactiveTintColor: "#6b7280",
        tabBarStyle: {
          backgroundColor: "#fff",
          borderTopColor: "#e5e7eb",
          borderTopWidth: 1,
          paddingTop: 8,
          paddingBottom: tabBarBottomPadding,
          height: TAB_BAR_HEIGHT + tabBarBottomPadding,
          ...(Platform.OS === "android" && { elevation: 8 }),
        },
        tabBarItemStyle: {
          paddingBottom: Platform.OS === "ios" ? 0 : 4,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={24} name="house.fill" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="stores"
        options={{
          title: "Stores",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={24} name="storefront.fill" color={color} />
          ),
          href: isRestaurant || isRider ? null : "/(tabs)/stores",
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          title: isRider ? "Deliveries" : "Orders",
          tabBarIcon: ({ color }) => (
            <IconSymbol
              size={24}
              name={isRider ? "shippingbox.fill" : "list.bullet"}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={24} name="gearshape.fill" color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
