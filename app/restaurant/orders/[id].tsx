import { getApiMessage } from "@/lib/api/client";
import { getOrder, updateOrder } from "@/lib/api/orders";
import { listRiders } from "@/lib/api/users";
import { ORDER_STATUS_LABELS, PAYMENT_STATUS_LABELS } from "@/lib/constants";
import { formatDate, formatKES } from "@/lib/utils/formatters";
import type { Order, User } from "@/types/api";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

export default function RestaurantOrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [order, setOrder] = useState<Order | null>(null);
  const [riders, setRiders] = useState<User[]>([]);
  const [selectedRiderId, setSelectedRiderId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (!id) return;
    getOrder(Number(id))
      .then(setOrder)
      .catch(() => setOrder(null))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    listRiders()
      .then((res) => setRiders(res.data))
      .catch(() => setRiders([]));
  }, []);

  const handleStatus = async (status: Order["status"]) => {
    if (!order) return;
    try {
      setUpdating(true);
      const updated = await updateOrder(order.id, { status });
      setOrder(updated);
    } catch (e) {
      Alert.alert("Error", getApiMessage(e));
    } finally {
      setUpdating(false);
    }
  };

  const handleAssignRider = async () => {
    const riderId = Number(selectedRiderId);
    if (!order || !riderId) return;
    try {
      setUpdating(true);
      const updated = await updateOrder(order.id, { rider_id: riderId });
      setOrder(updated);
      setSelectedRiderId("");
    } catch (e) {
      Alert.alert("Error", getApiMessage(e));
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#ed751a" />
      </View>
    );
  }

  if (!order) {
    return (
      <View style={styles.centered}>
        <Text style={styles.emptyText}>Order not found.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.card}>
        <View style={styles.badgeRow}>
          <View
            style={[
              styles.badge,
              order.status === "cancelled"
                ? styles.badgeCancelled
                : styles.badgeActive,
            ]}
          >
            <Text style={styles.badgeText}>
              {ORDER_STATUS_LABELS[order.status]}
            </Text>
          </View>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>
              {PAYMENT_STATUS_LABELS[order.payment_status]}
            </Text>
          </View>
        </View>
        <Text style={styles.total}>Total: {formatKES(order.total_amount)}</Text>
        <Text style={styles.meta}>
          Placed on {formatDate(order.created_at)}
        </Text>
        {order.delivery_address ? (
          <Text style={styles.meta}>Delivery: {order.delivery_address}</Text>
        ) : null}
        {order.notes ? (
          <Text style={styles.meta}>Notes: {order.notes}</Text>
        ) : null}
        {order.rider ? (
          <Text style={styles.meta}>Rider: {order.rider.name}</Text>
        ) : null}
        {order.order_items && order.order_items.length > 0 && (
          <View style={styles.items}>
            <Text style={styles.itemsTitle}>Items</Text>
            {order.order_items.map((oi) => (
              <Text key={oi.id} style={styles.itemRow}>
                {oi.menu_item?.name ?? `Item #${oi.menu_item_id}`} ×{" "}
                {oi.quantity} — {formatKES(oi.unit_price * oi.quantity)}
              </Text>
            ))}
          </View>
        )}
        {order.status !== "cancelled" && order.status !== "delivered" && (
          <View style={styles.actions}>
            {order.status === "pending" && (
              <TouchableOpacity
                style={styles.primaryBtn}
                onPress={() => handleStatus("preparing")}
                disabled={updating}
              >
                <Text style={styles.primaryBtnText}>Mark preparing</Text>
              </TouchableOpacity>
            )}
            {order.status === "preparing" &&
              !order.rider &&
              riders.length > 0 && (
                <View style={styles.riderRow}>
                  <TouchableOpacity
                    style={[
                      styles.primaryBtn,
                      !selectedRiderId && styles.btnDisabled,
                    ]}
                    onPress={handleAssignRider}
                    disabled={updating || !selectedRiderId}
                  >
                    <Text style={styles.primaryBtnText}>Assign rider</Text>
                  </TouchableOpacity>
                  <View style={styles.picker}>
                    {riders.map((r) => (
                      <TouchableOpacity
                        key={r.id}
                        style={[
                          styles.pickerOption,
                          selectedRiderId === String(r.id) &&
                            styles.pickerOptionSelected,
                        ]}
                        onPress={() => setSelectedRiderId(String(r.id))}
                      >
                        <Text style={styles.pickerOptionText}>
                          {r.name} ({r.phone})
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9fafb" },
  content: { padding: 16, paddingBottom: 32 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  emptyText: { color: "#6b7280", fontSize: 16 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  badgeRow: { flexDirection: "row", gap: 8, marginBottom: 12 },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: "#f3f4f6",
  },
  badgeActive: { backgroundColor: "#fef3c7" },
  badgeCancelled: { backgroundColor: "#f3f4f6" },
  badgeText: { fontSize: 12, fontWeight: "500", color: "#374151" },
  total: { fontSize: 18, fontWeight: "600", color: "#111" },
  meta: { fontSize: 14, color: "#6b7280", marginTop: 8 },
  items: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
  },
  itemsTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111",
    marginBottom: 8,
  },
  itemRow: { fontSize: 14, color: "#6b7280", marginBottom: 4 },
  actions: { marginTop: 20, gap: 12 },
  primaryBtn: {
    backgroundColor: "#ed751a",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  primaryBtnText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  btnDisabled: { opacity: 0.6 },
  riderRow: { gap: 12 },
  picker: { marginTop: 8 },
  pickerOption: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#d1d5db",
    marginBottom: 8,
  },
  pickerOptionSelected: { borderColor: "#ed751a", backgroundColor: "#fff7ed" },
  pickerOptionText: { fontSize: 14, color: "#374151" },
});
