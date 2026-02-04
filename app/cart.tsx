import { IconSymbol } from "@/components/ui/icon-symbol";
import { useCartStore } from "@/lib/store/cartStore";
import { formatKES } from "@/lib/utils/formatters";
import type { CartItem } from "@/lib/store/cartStore";
import { useRouter } from "expo-router";
import {
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const ACCENT = "#f59e0b";
const CART_IMAGE_SIZE = 80;

function CartHeader({ onBack }: { onBack: () => void }) {
  const insets = useSafeAreaInsets();
  const top = insets.top + (Platform.OS === "ios" ? 4 : 8);

  return (
    <View style={[styles.header, { paddingTop: top }]}>
      <Pressable
        onPress={onBack}
        style={styles.backBtn}
        hitSlop={12}
        accessibilityLabel="Go back"
      >
        <IconSymbol name="chevron.left" size={22} color="#374151" />
      </Pressable>
      <Text style={styles.headerTitle}>Cart</Text>
      <View style={styles.backBtn} />
    </View>
  );
}

function CartRow({
  item,
  onUpdateQty,
  onRemove,
}: {
  item: CartItem;
  onUpdateQty: (delta: number) => void;
  onRemove: () => void;
}) {
  const { menuItem, quantity } = item;
  const lineTotal = menuItem.price * quantity;

  return (
    <View style={styles.row}>
      <View style={styles.rowImageWrap}>
        {menuItem.image_url ? (
          <Image
            source={{ uri: menuItem.image_url }}
            style={styles.rowImage}
          />
        ) : (
          <View style={styles.rowImagePlaceholder}>
            <Text style={styles.rowImagePlaceholderText}>🍽</Text>
          </View>
        )}
      </View>
      <View style={styles.rowBody}>
        <Text style={styles.rowName} numberOfLines={2}>
          {menuItem.name}
        </Text>
        <Text style={styles.rowUnitPrice}>
          {formatKES(menuItem.price)} each
        </Text>
        <View style={styles.rowActions}>
          <View style={styles.stepper}>
            <TouchableOpacity
              style={styles.stepperBtn}
              onPress={() => onUpdateQty(-1)}
              disabled={quantity <= 1}
            >
              <Text
                style={[
                  styles.stepperBtnText,
                  quantity <= 1 && styles.stepperBtnTextDisabled,
                ]}
              >
                −
              </Text>
            </TouchableOpacity>
            <Text style={styles.stepperValue}>{quantity}</Text>
            <TouchableOpacity
              style={styles.stepperBtn}
              onPress={() => onUpdateQty(1)}
            >
              <Text style={styles.stepperBtnText}>+</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.rowLineTotal}>{formatKES(lineTotal)}</Text>
        </View>
        <TouchableOpacity
          style={styles.removeWrap}
          onPress={onRemove}
          hitSlop={8}
        >
          <Text style={styles.removeText}>Remove</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function CartScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const {
    items,
    updateQuantity,
    removeItem,
    getSubtotal,
    clearCart,
  } = useCartStore();
  const subtotal = getSubtotal();
  const footerBottom = Math.max(insets.bottom, 16);

  if (items.length === 0) {
    return (
      <View style={styles.container}>
        <CartHeader onBack={() => router.back()} />
        <View style={styles.emptyWrap}>
          <View style={styles.emptyIconWrap}>
            <Text style={styles.emptyIcon}>🛒</Text>
          </View>
          <Text style={styles.emptyTitle}>Your cart is empty</Text>
          <Text style={styles.emptySubtext}>
            Add items from a store to get started
          </Text>
          <TouchableOpacity
            style={styles.emptyBtn}
            onPress={() => router.back()}
            activeOpacity={0.85}
          >
            <Text style={styles.emptyBtnText}>Browse stores</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CartHeader onBack={() => router.back()} />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.sectionLabel}>
          {items.length} {items.length === 1 ? "item" : "items"}
        </Text>
        {items.map((item) => (
          <CartRow
            key={item.menuItem.id}
            item={item}
            onUpdateQty={(delta) =>
              updateQuantity(item.menuItem.id, item.quantity + delta)
            }
            onRemove={() => removeItem(item.menuItem.id)}
          />
        ))}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: footerBottom }]}>
        <View style={styles.footerRow}>
          <Text style={styles.subtotalLabel}>Subtotal</Text>
          <Text style={styles.subtotalValue}>{formatKES(subtotal)}</Text>
        </View>
        <TouchableOpacity
          style={styles.clearWrap}
          onPress={clearCart}
          hitSlop={8}
        >
          <Text style={styles.clearText}>Clear cart</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.checkoutBtn}
          onPress={() => router.push("/checkout")}
          activeOpacity={0.88}
        >
          <Text style={styles.checkoutBtnText}>Proceed to checkout</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fafafa" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 4,
    paddingBottom: 12,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  backBtn: {
    width: 44,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "600",
    color: "#111",
  },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 24 },
  sectionLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#6b7280",
    marginBottom: 12,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  row: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#f0f0f0",
  },
  rowImageWrap: {
    width: CART_IMAGE_SIZE,
    height: CART_IMAGE_SIZE,
    borderRadius: 10,
    overflow: "hidden",
    backgroundColor: "#f0f0f0",
  },
  rowImage: { width: "100%", height: "100%" },
  rowImagePlaceholder: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  rowImagePlaceholderText: { fontSize: 28 },
  rowBody: { flex: 1, marginLeft: 12, minWidth: 0 },
  rowName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111",
  },
  rowUnitPrice: {
    fontSize: 13,
    color: "#6b7280",
    marginTop: 2,
  },
  rowActions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 10,
  },
  stepper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 8,
    overflow: "hidden",
  },
  stepperBtn: {
    width: 36,
    height: 34,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fafafa",
  },
  stepperBtnText: { fontSize: 18, color: "#374151", fontWeight: "500" },
  stepperBtnTextDisabled: { color: "#d1d5db" },
  stepperValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111",
    minWidth: 28,
    textAlign: "center",
  },
  rowLineTotal: {
    fontSize: 15,
    fontWeight: "600",
    color: ACCENT,
  },
  removeWrap: { marginTop: 6 },
  removeText: { fontSize: 13, color: "#dc2626", fontWeight: "500" },
  footer: {
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
  },
  footerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  subtotalLabel: { fontSize: 15, fontWeight: "500", color: "#374151" },
  subtotalValue: { fontSize: 18, fontWeight: "700", color: "#111" },
  clearWrap: { marginBottom: 12 },
  clearText: { fontSize: 14, color: "#6b7280" },
  checkoutBtn: {
    backgroundColor: ACCENT,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  checkoutBtnText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
  emptyWrap: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  emptyIconWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: "#f5f5f5",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  emptyIcon: { fontSize: 40 },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#111",
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: "#6b7280",
    textAlign: "center",
    marginBottom: 24,
  },
  emptyBtn: {
    backgroundColor: ACCENT,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  emptyBtnText: { fontSize: 15, fontWeight: "600", color: "#fff" },
});
