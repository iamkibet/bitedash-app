import { getApiMessage } from "@/lib/api/client";
import { cancelOrder, getOrder } from "@/lib/api/orders";
import { ORDER_STATUS_LABELS, PAYMENT_STATUS_LABELS } from "@/lib/constants";
import { formatDate, formatKES } from "@/lib/utils/formatters";
import type { Order } from "@/types/api";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    if (!id) return;
    getOrder(Number(id))
      .then(setOrder)
      .catch(() => setOrder(null))
      .finally(() => setLoading(false));
  }, [id]);

  const handleCancel = async () => {
    if (!order) return;
    Alert.alert("Cancel order", "Are you sure?", [
      { text: "No", style: "cancel" },
      {
        text: "Yes",
        style: "destructive",
        onPress: async () => {
          try {
            setCancelling(true);
            await cancelOrder(order.id);
            setOrder((prev) =>
              prev ? { ...prev, status: "cancelled" } : null,
            );
          } catch (e) {
            Alert.alert("Error", getApiMessage(e));
          } finally {
            setCancelling(false);
          }
        },
      },
    ]);
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

  const canCancel =
    order.status === "pending" && order.payment_status !== "paid";

  return (
    <View style={styles.container}>
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
          <View style={[styles.badge, styles.badgePay]}>
            <Text style={styles.badgeText}>
              {PAYMENT_STATUS_LABELS[order.payment_status]}
            </Text>
          </View>
        </View>
        <Text style={styles.total}>Total: {formatKES(order.total_amount)}</Text>
        <Text style={styles.date}>
          Placed on {formatDate(order.created_at)}
        </Text>
        {order.delivery_address ? (
          <Text style={styles.meta}>Delivery: {order.delivery_address}</Text>
        ) : null}
        {order.notes ? (
          <Text style={styles.meta}>Notes: {order.notes}</Text>
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
        <View style={styles.actions}>
          {order.payment_status !== "paid" && order.status !== "cancelled" && (
            <TouchableOpacity
              style={styles.payBtn}
              onPress={() => router.push(`/orders/${order.id}/pay`)}
            >
              <Text style={styles.payBtnText}>Pay now</Text>
            </TouchableOpacity>
          )}
          {canCancel && (
            <TouchableOpacity
              style={[styles.cancelBtn, cancelling && styles.btnDisabled]}
              onPress={handleCancel}
              disabled={cancelling}
            >
              <Text style={styles.cancelBtnText}>Cancel order</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9fafb", padding: 16 },
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
  },
  badgeActive: { backgroundColor: "#fef3c7" },
  badgeCancelled: { backgroundColor: "#f3f4f6" },
  badgePay: { backgroundColor: "#f3f4f6" },
  badgeText: { fontSize: 12, fontWeight: "500", color: "#374151" },
  total: { fontSize: 18, fontWeight: "600", color: "#111" },
  date: { fontSize: 14, color: "#6b7280", marginTop: 8 },
  meta: { fontSize: 14, color: "#6b7280", marginTop: 4 },
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
  payBtn: {
    backgroundColor: "#ed751a",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  payBtnText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  cancelBtn: {
    borderWidth: 1,
    borderColor: "#dc2626",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  cancelBtnText: { color: "#dc2626", fontSize: 16, fontWeight: "500" },
  btnDisabled: { opacity: 0.6 },
});
