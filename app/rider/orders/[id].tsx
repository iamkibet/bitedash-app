import { getApiMessage, isApiError } from "@/lib/api/client";
import { getOrder, updateOrder } from "@/lib/api/orders";
import { ORDER_STATUS_LABELS, PAYMENT_STATUS_LABELS } from "@/lib/constants";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { formatDate, formatKES } from "@/lib/utils/formatters";
import type { Order } from "@/types/api";
import { useLocalSearchParams, useNavigation } from "expo-router";
import { useEffect, useLayoutEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const ACCENT = "#f59e0b";
const PAD = 20;

export default function RiderOrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [order, setOrder] = useState<Order | null>(null);
  const [errorStatus, setErrorStatus] = useState<number | null>(null);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerBackTitleVisible: false,
      headerBackTitle: "",
    });
  }, [navigation]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (!id) return;
    setErrorStatus(null);
    getOrder(Number(id))
      .then((o) => {
        setOrder(o);
        setErrorStatus(null);
      })
      .catch((e) => {
        setOrder(null);
        setErrorStatus(isApiError(e) ? e.response?.status ?? null : null);
      })
      .finally(() => setLoading(false));
  }, [id]);

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

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={ACCENT} />
      </View>
    );
  }

  if (!order) {
    return (
      <View style={styles.centered}>
        <Text style={styles.emptyText}>
          {errorStatus === 403
            ? "Accept this order first to view details."
            : "Order not found."}
        </Text>
      </View>
    );
  }

  const canUpdateStatus =
    order.status !== "cancelled" && order.status !== "delivered";
  const bottomPad = Math.max(insets.bottom, 24) + 24;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingBottom: bottomPad }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <View style={styles.headerTop}>
          <Text style={styles.orderId}>Order #{order.id}</Text>
          <View
            style={[
              styles.statusBadge,
              order.status === "delivered" && styles.statusBadgeDone,
            ]}
          >
            <Text
              style={[
                styles.statusBadgeText,
                order.status === "delivered" && styles.statusBadgeTextDone,
              ]}
            >
              {ORDER_STATUS_LABELS[order.status]}
            </Text>
          </View>
        </View>
        <Text style={styles.total}>{formatKES(order.total_amount)}</Text>
        <View style={styles.paymentBadge}>
          <Text style={styles.paymentBadgeText}>
            {PAYMENT_STATUS_LABELS[order.payment_status]} · {formatDate(order.created_at)}
          </Text>
        </View>
      </View>

      {/* Delivery address */}
      {order.delivery_address && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Deliver to</Text>
          <View style={styles.card}>
            <View style={styles.cardRow}>
              <IconSymbol name="mappin" size={20} color={ACCENT} />
              <Text style={styles.cardText}>{order.delivery_address}</Text>
            </View>
          </View>
        </View>
      )}

      {/* Pickup store */}
      {order.restaurant && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Pickup from</Text>
          <View style={styles.card}>
            <View style={styles.cardRow}>
              <IconSymbol name="storefront.fill" size={20} color={ACCENT} />
              <View style={styles.cardTextBlock}>
                <Text style={styles.cardTitle}>{order.restaurant.name}</Text>
                {order.restaurant.location ? (
                  <Text style={styles.cardSubtext}>{order.restaurant.location}</Text>
                ) : null}
              </View>
            </View>
          </View>
        </View>
      )}

      {/* Notes */}
      {order.notes ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notes</Text>
          <View style={styles.card}>
            <Text style={styles.cardText}>{order.notes}</Text>
          </View>
        </View>
      ) : null}

      {/* Order items */}
      {order.order_items && order.order_items.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Items</Text>
          <View style={styles.card}>
            {order.order_items.map((oi, idx) => (
              <View
                key={oi.id}
                style={[
                  styles.itemRow,
                  idx === order.order_items!.length - 1 && styles.itemRowLast,
                ]}
              >
                <Text style={styles.itemName}>
                  {oi.menu_item?.name ?? `Item #${oi.menu_item_id}`} × {oi.quantity}
                </Text>
                <Text style={styles.itemAmount}>
                  {formatKES(oi.unit_price * oi.quantity)}
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Status actions */}
      {canUpdateStatus && (
        <View style={styles.actions}>
          {order.status === "preparing" && (
            <TouchableOpacity
              style={[styles.primaryBtn, updating && styles.btnDisabled]}
              onPress={() => handleStatus("on_the_way")}
              disabled={updating}
              activeOpacity={0.88}
            >
              {updating ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.primaryBtnText}>Mark on the way</Text>
              )}
            </TouchableOpacity>
          )}
          {order.status === "on_the_way" && (
            <TouchableOpacity
              style={[styles.primaryBtn, updating && styles.btnDisabled]}
              onPress={() => handleStatus("delivered")}
              disabled={updating}
              activeOpacity={0.88}
            >
              {updating ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.primaryBtnText}>Mark delivered</Text>
              )}
            </TouchableOpacity>
          )}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f1f5f9" },
  content: { padding: PAD },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  emptyText: { color: "#64748b", fontSize: 16 },

  header: {
    backgroundColor: "#fff",
    marginHorizontal: -PAD,
    marginTop: -PAD,
    paddingHorizontal: PAD,
    paddingBottom: 20,
    marginBottom: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  headerTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  orderId: {
    fontSize: 22,
    fontWeight: "800",
    color: "#0f172a",
    letterSpacing: -0.5,
  },
  statusBadge: {
    backgroundColor: "#fef3c7",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusBadgeDone: {
    backgroundColor: "#f1f5f9",
  },
  statusBadgeText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#92400e",
  },
  statusBadgeTextDone: {
    color: "#475569",
  },
  total: {
    fontSize: 28,
    fontWeight: "800",
    color: ACCENT,
    letterSpacing: -0.5,
  },
  paymentBadge: {
    marginTop: 8,
  },
  paymentBadgeText: {
    fontSize: 14,
    color: "#64748b",
  },

  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#64748b",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 8,
    marginLeft: 4,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 18,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  cardRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  cardText: {
    flex: 1,
    fontSize: 16,
    color: "#1e293b",
    lineHeight: 22,
  },
  cardTextBlock: { flex: 1 },
  cardTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1e293b",
  },
  cardSubtext: {
    fontSize: 14,
    color: "#64748b",
    marginTop: 2,
  },

  itemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  itemName: {
    fontSize: 15,
    color: "#334155",
    flex: 1,
  },
  itemAmount: {
    fontSize: 15,
    fontWeight: "600",
    color: ACCENT,
  },
  itemRowLast: { borderBottomWidth: 0 },

  actions: {
    marginTop: 8,
  },
  primaryBtn: {
    backgroundColor: ACCENT,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 52,
  },
  btnDisabled: { opacity: 0.7 },
  primaryBtnText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "700",
  },
});
