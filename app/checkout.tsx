import { getApiErrors, getApiMessage } from "@/lib/api/client";
import { createOrder } from "@/lib/api/orders";
import { useCartStore } from "@/lib/store/cartStore";
import { formatKES } from "@/lib/utils/formatters";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

export default function CheckoutScreen() {
  const router = useRouter();
  const { items, restaurantId, getSubtotal, clearCart } = useCartStore();
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (items.length === 0 || !restaurantId) {
      router.replace("/(tabs)/cart");
    }
  }, [items.length, restaurantId]);

  const handlePlaceOrder = async () => {
    if (!restaurantId) return;
    setErrors({});
    setLoading(true);
    try {
      const order = await createOrder({
        restaurant_id: restaurantId,
        items: items.map((i) => ({
          menu_item_id: i.menuItem.id,
          quantity: i.quantity,
        })),
        delivery_address: deliveryAddress.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      clearCart();
      router.replace(`/orders/${order.id}/pay`);
    } catch (e) {
      const apiErrors = getApiErrors(e);
      if (apiErrors) {
        const next: Record<string, string> = {};
        Object.entries(apiErrors).forEach(([k, v]) => {
          next[k] = Array.isArray(v) ? v[0] : String(v);
        });
        setErrors(next);
      }
      Alert.alert("Error", getApiMessage(e));
    } finally {
      setLoading(false);
    }
  };

  if (items.length === 0) return null;

  const subtotal = getSubtotal();

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Order summary</Text>
          {items.map(({ menuItem, quantity }) => (
            <Text key={menuItem.id} style={styles.summaryRow}>
              {menuItem.name} × {quantity} —{" "}
              {formatKES(menuItem.price * quantity)}
            </Text>
          ))}
          <Text style={styles.subtotal}>Subtotal: {formatKES(subtotal)}</Text>
        </View>
        <View style={styles.section}>
          <Text style={styles.label}>Delivery address (optional)</Text>
          <TextInput
            style={[styles.input, errors.delivery_address && styles.inputError]}
            value={deliveryAddress}
            onChangeText={setDeliveryAddress}
            placeholder="Address"
            multiline
            numberOfLines={3}
            editable={!loading}
          />
          {errors.delivery_address ? (
            <Text style={styles.errorText}>{errors.delivery_address}</Text>
          ) : null}
        </View>
        <View style={styles.section}>
          <Text style={styles.label}>Notes (optional)</Text>
          <TextInput
            style={[styles.input, errors.notes && styles.inputError]}
            value={notes}
            onChangeText={setNotes}
            placeholder="Notes"
            multiline
            editable={!loading}
          />
          {errors.notes ? (
            <Text style={styles.errorText}>{errors.notes}</Text>
          ) : null}
        </View>
        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handlePlaceOrder}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.buttonText}>Place order</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9fafb" },
  scroll: { padding: 16, paddingBottom: 32 },
  section: { marginBottom: 24 },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#111",
    marginBottom: 12,
  },
  summaryRow: { fontSize: 14, color: "#6b7280", marginBottom: 4 },
  subtotal: { fontSize: 16, fontWeight: "600", color: "#111", marginTop: 8 },
  label: { fontSize: 14, fontWeight: "500", color: "#374151", marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: "#fff",
    minHeight: 80,
    textAlignVertical: "top",
  },
  inputError: { borderColor: "#dc2626" },
  errorText: { fontSize: 12, color: "#dc2626", marginTop: 4 },
  button: {
    backgroundColor: "#ed751a",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
});
