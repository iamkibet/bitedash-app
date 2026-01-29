import { HapticTab } from "@/components/haptic-tab";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useAuthStore } from "@/lib/store/authStore";
import { useCartStore } from "@/lib/store/cartStore";
import { Tabs } from "expo-router";
import React from "react";

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const user = useAuthStore((s) => s.user);
  const cartCount = useCartStore((s) => s.getItemCount());
  const role = user?.role ?? "customer";

  const tint = Colors[colorScheme ?? "light"].tint;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: tint,
        headerShown: false,
        tabBarButton: HapticTab,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Stores",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={24} name="storefront.fill" color={color} />
          ),
          href: role === "restaurant" || role === "rider" ? null : undefined,
        }}
      />
      {role === "customer" && (
        <Tabs.Screen
          name="cart"
          options={{
            title: "Cart",
            tabBarBadge: cartCount > 0 ? cartCount : undefined,
            tabBarIcon: ({ color }) => (
              <IconSymbol size={24} name="cart.fill" color={color} />
            ),
          }}
        />
      )}
      <Tabs.Screen
        name="orders"
        options={{
          title: role === "rider" ? "My Deliveries" : "Orders",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={24} name="list.bullet" color={color} />
          ),
        }}
      />
      {role === "customer" && (
        <Tabs.Screen
          name="favourites"
          options={{
            title: "Favourites",
            tabBarIcon: ({ color }) => (
              <IconSymbol size={24} name="heart.fill" color={color} />
            ),
          }}
        />
      )}
      {role === "rider" && (
        <Tabs.Screen
          name="rider-available"
          options={{
            title: "Available",
            tabBarIcon: ({ color }) => (
              <IconSymbol size={24} name="list.bullet" color={color} />
            ),
          }}
        />
      )}
      {role === "restaurant" && (
        <>
          <Tabs.Screen
            name="restaurant"
            options={{
              title: "My Store",
              tabBarIcon: ({ color }) => (
                <IconSymbol size={24} name="storefront.fill" color={color} />
              ),
            }}
          />
          <Tabs.Screen
            name="restaurant-menu"
            options={{
              title: "Menu",
              tabBarIcon: ({ color }) => (
                <IconSymbol size={24} name="menucard.fill" color={color} />
              ),
            }}
          />
          <Tabs.Screen
            name="restaurant-orders"
            options={{
              title: "Orders",
              tabBarIcon: ({ color }) => (
                <IconSymbol size={24} name="list.bullet" color={color} />
              ),
            }}
          />
        </>
      )}
      <Tabs.Screen
        name="account"
        options={{
          title: "Account",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={24} name="person.fill" color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
