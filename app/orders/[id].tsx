import { IconSymbol } from "@/components/ui/icon-symbol";
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

function OrderDetailHeader({ orderId, onBack }: { orderId: number; onBack: () => void }) {
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
      <Text style={styles.headerTitle}>Order #{orderId}</Text>
      <View style={styles.backBtn} />
    </View>
  );
}

function getStatusStyle(status: Order["status"]) {
  if (status === "cancelled") return { bg: "#f1f5f9", color: "#64748b" };
  if (status === "delivered") return { bg: "#dcfce7", color: "#166534" };
  return { bg: "#fffbeb", color: "#92400e" };
}

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

  const handleCancel = () => {
    if (!order) return;
    Alert.alert("Cancel order", "Are you sure you want to cancel this order?", [
      { text: "No", style: "cancel" },
      {
        text: "Yes, cancel",
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
      <View style={styles.container}>
        <View style={styles.centered}>
          <ActivityIndicator size="small" color={ACCENT} />
        </View>
      </View>
    );
  }

  if (!order) {
    return (
      <View style={styles.container}>
        <View style={styles.centered}>
          <Text style={styles.emptyText}>Order not found.</Text>
          <TouchableOpacity
            style={styles.backToOrdersBtn}
            onPress={() => router.replace("/(tabs)/orders")}
          >
            <Text style={styles.backToOrdersBtnText}>Back to orders</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const statusStyle = getStatusStyle(order.status);
  const canCancel =
    order.status === "pending" && order.payment_status !== "paid";
  const showPayNow =
    order.payment_status !== "paid" && order.status !== "cancelled";

  return (
    <View style={styles.container}>
      <OrderDetailHeader orderId={order.id} onBack={() => router.back()} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Summary</Text>
          <View style={styles.statusRow}>
            <View style={[styles.statusPill, { backgroundColor: statusStyle.bg }]}>
              <Text style={[styles.statusPillText, { color: statusStyle.color }]}>
                {ORDER_STATUS_LABELS[order.status] ?? order.status}
              </Text>
            </View>
            <View
              style={[
                styles.statusPill,
                order.payment_status === "paid"
                  ? styles.statusPillPaid
                  : styles.statusPillUnpaid,
              ]}
            >
              <Text
                style={[
                  styles.statusPillText,
                  order.payment_status === "paid"
                    ? styles.statusPillTextPaid
                    : styles.statusPillTextUnpaid,
                ]}
              >
                {PAYMENT_STATUS_LABELS[order.payment_status]}
              </Text>
            </View>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total</Text>
            <Text style={styles.summaryValue}>
              {formatKES(order.total_amount)}
            </Text>
          </View>
          <Text style={styles.date}>Placed {formatDate(order.created_at)}</Text>
          {order.restaurant?.name ? (
            <Text style={styles.meta}>From {order.restaurant.name}</Text>
          ) : null}
        </View>

        {order.delivery_address ? (
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Delivery address</Text>
            <Text style={styles.deliveryAddress}>{order.delivery_address}</Text>
          </View>
        ) : null}

        {order.notes ? (
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Notes</Text>
            <Text style={styles.notesText}>{order.notes}</Text>
          </View>
        ) : null}

        {order.order_items && order.order_items.length > 0 ? (
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Items</Text>
            {order.order_items.map((oi) => (
              <View key={oi.id} style={styles.itemRow}>
                <Text style={styles.itemName} numberOfLines={1}>
                  {oi.menu_item?.name ?? `Item #${oi.menu_item_id}`}
                </Text>
                <Text style={styles.itemMeta}>
                  {oi.quantity} × {formatKES(oi.unit_price)}
                </Text>
                <Text style={styles.itemTotal}>
                  {formatKES(oi.unit_price * oi.quantity)}
                </Text>
              </View>
            ))}
          </View>
        ) : null}

        <View style={styles.actions}>
          {showPayNow && (
            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={() => router.push(`/orders/${order.id}/pay`)}
              activeOpacity={0.88}
            >
              <Text style={styles.primaryBtnText}>Pay now</Text>
            </TouchableOpacity>
          )}
          {canCancel && (
            <TouchableOpacity
              style={[styles.outlineBtn, cancelling && styles.btnDisabled]}
              onPress={handleCancel}
              disabled={cancelling}
              activeOpacity={0.88}
            >
              <Text style={styles.outlineBtnText}>
                {cancelling ? "Cancelling…" : "Cancel order"}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.spacer} />
      </ScrollView>
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
  scrollContent: { padding: 16, paddingBottom: 32 },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  emptyText: { fontSize: 14, color: "#6b7280", marginBottom: 16 },
  backToOrdersBtn: {
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  backToOrdersBtnText: { fontSize: 15, fontWeight: "600", color: ACCENT },
  card: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#f0f0f0",
  },
  cardLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6b7280",
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  statusRow: {
    flexDirection: "row",
    gap: 6,
    marginBottom: 12,
  },
  statusPill: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
  },
  statusPillText: { fontSize: 11, fontWeight: "600" },
  statusPillPaid: { backgroundColor: "#dcfce7" },
  statusPillUnpaid: { backgroundColor: "#fef3c7" },
  statusPillTextPaid: { color: "#166534" },
  statusPillTextUnpaid: { color: "#92400e" },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  summaryLabel: { fontSize: 15, color: "#374151" },
  summaryValue: { fontSize: 18, fontWeight: "700", color: "#111" },
  date: { fontSize: 13, color: "#6b7280" },
  meta: { fontSize: 13, color: "#6b7280", marginTop: 4 },
  deliveryAddress: { fontSize: 14, color: "#111", lineHeight: 20 },
  notesText: { fontSize: 14, color: "#111", lineHeight: 20 },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#f5f5f5",
  },
  itemName: { flex: 1, fontSize: 14, color: "#111", marginRight: 8 },
  itemMeta: { fontSize: 13, color: "#6b7280", marginRight: 8 },
  itemTotal: { fontSize: 14, fontWeight: "600", color: ACCENT },
  actions: { marginTop: 8, gap: 10 },
  primaryBtn: {
    backgroundColor: ACCENT,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  primaryBtnText: { fontSize: 16, fontWeight: "600", color: "#fff" },
  outlineBtn: {
    borderWidth: 1,
    borderColor: "#dc2626",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  outlineBtnText: { fontSize: 16, fontWeight: "500", color: "#dc2626" },
  btnDisabled: { opacity: 0.6 },
  spacer: { height: 24 },
});
