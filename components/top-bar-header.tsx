import { IconSymbol } from "@/components/ui/icon-symbol";
import { useAuthStore } from "@/lib/store/authStore";
import { useCartStore } from "@/lib/store/cartStore";
import { useRouter } from "expo-router";
import { useCallback } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";

const TINT = "#111";

export function TopBarRight() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const cartCount = useCartStore((s) => s.getItemCount());
  const isCustomer = user?.role === "customer";

  const onNotifications = useCallback(() => {
    // Placeholder: could open notifications screen later
  }, []);

  const onCart = useCallback(() => {
    router.push("/cart");
  }, [router]);

  return (
    <View style={styles.container}>
      <Pressable
        style={styles.iconBtn}
        onPress={onNotifications}
        hitSlop={12}
        accessibilityLabel="Notifications"
      >
        <IconSymbol name="bell.fill" size={24} color={TINT} />
      </Pressable>
      {isCustomer && (
        <Pressable
          style={styles.iconBtn}
          onPress={onCart}
          hitSlop={12}
          accessibilityLabel="Cart"
        >
          <IconSymbol name="cart.fill" size={24} color={TINT} />
          {cartCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                {cartCount > 99 ? "99+" : cartCount}
              </Text>
            </View>
          )}
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    paddingLeft: 8,
    paddingRight: 4,
    gap: 4,
  },
  iconBtn: {
    width: 44,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
    ...(Platform.OS === "android" && { padding: 4 }),
  },
  badge: {
    position: "absolute",
    top: 4,
    right: 4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#ed751a",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 4,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#fff",
  },
});
