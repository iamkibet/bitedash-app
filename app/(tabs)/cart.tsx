import { useCartStore } from "@/lib/store/cartStore";
import { formatKES } from "@/lib/utils/formatters";
import { useRouter } from "expo-router";
import {
    FlatList,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

export default function CartScreen() {
  const router = useRouter();
  const {
    items,
    restaurantId,
    updateQuantity,
    removeItem,
    getSubtotal,
    clearCart,
  } = useCartStore();
  const subtotal = getSubtotal();

  if (items.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Cart</Text>
        </View>
        <View style={styles.centered}>
          <Text style={styles.emptyText}>Your cart is empty.</Text>
          <TouchableOpacity
            style={styles.button}
            onPress={() => router.push("/(tabs)")}
          >
            <Text style={styles.buttonText}>Browse stores</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Cart</Text>
      </View>
      <FlatList
        data={items}
        keyExtractor={(item) => String(item.menuItem.id)}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.itemName}>{item.menuItem.name}</Text>
            <Text style={styles.itemPrice}>
              {formatKES(item.menuItem.price)} each
            </Text>
            <View style={styles.qtyRow}>
              <TouchableOpacity
                style={styles.qtyBtn}
                onPress={() =>
                  updateQuantity(item.menuItem.id, item.quantity - 1)
                }
              >
                <Text style={styles.qtyBtnText}>−</Text>
              </TouchableOpacity>
              <Text style={styles.qtyText}>{item.quantity}</Text>
              <TouchableOpacity
                style={styles.qtyBtn}
                onPress={() =>
                  updateQuantity(item.menuItem.id, item.quantity + 1)
                }
              >
                <Text style={styles.qtyBtnText}>+</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.removeBtn}
                onPress={() => removeItem(item.menuItem.id)}
              >
                <Text style={styles.removeBtnText}>Remove</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      />
      <View style={styles.footer}>
        <Text style={styles.subtotal}>Subtotal: {formatKES(subtotal)}</Text>
        <TouchableOpacity style={styles.clearBtn} onPress={clearCart}>
          <Text style={styles.clearBtnText}>Clear cart</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.checkoutBtn}
          onPress={() => router.push("/checkout")}
        >
          <Text style={styles.checkoutBtnText}>Checkout</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9fafb" },
  header: { padding: 16, paddingTop: 48 },
  title: { fontSize: 28, fontWeight: "700", color: "#111" },
  list: { padding: 16, paddingBottom: 120 },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  emptyText: { fontSize: 16, color: "#6b7280", marginBottom: 16 },
  button: {
    backgroundColor: "#ed751a",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  itemName: { fontSize: 16, fontWeight: "600", color: "#111" },
  itemPrice: { fontSize: 14, color: "#6b7280", marginTop: 4 },
  qtyRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
    gap: 12,
  },
  qtyBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#d1d5db",
    justifyContent: "center",
    alignItems: "center",
  },
  qtyBtnText: { fontSize: 18, color: "#374151", fontWeight: "600" },
  qtyText: {
    fontSize: 16,
    fontWeight: "500",
    minWidth: 24,
    textAlign: "center",
  },
  removeBtn: { marginLeft: "auto" },
  removeBtnText: { fontSize: 14, color: "#dc2626" },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#fff",
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
  },
  subtotal: { fontSize: 18, fontWeight: "600", color: "#111", marginBottom: 8 },
  clearBtn: { marginBottom: 8 },
  clearBtnText: { fontSize: 14, color: "#6b7280" },
  checkoutBtn: {
    backgroundColor: "#ed751a",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  checkoutBtnText: { color: "#fff", fontSize: 16, fontWeight: "600" },
});
