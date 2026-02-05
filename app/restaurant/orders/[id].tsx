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
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { IconSymbol } from "@/components/ui/icon-symbol";

const ACCENT = "#f59e0b";
const PAD = 20;

export default function RestaurantOrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
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
        <ActivityIndicator size="large" color={ACCENT} />
      </View>
    );
  }

  if (!order) {
    return (
      <View style={[styles.centered, styles.container]}>
        <Text style={styles.emptyText}>Order not found.</Text>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
        >
          <Text style={styles.backBtnText}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const canChangeStatus =
    order.status !== "cancelled" && order.status !== "delivered";
  const showRiderAssign =
    order.status === "preparing" && !order.rider && riders.length > 0;
  const bottomPad = Math.max(insets.bottom, 24);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity
          style={styles.headerBack}
          onPress={() => router.back()}
          hitSlop={12}
        >
          <IconSymbol name="chevron.left" size={24} color="#0f172a" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Order #{order.id}</Text>
          <Text style={styles.headerSubtitle}>
            {formatDate(order.created_at)}
          </Text>
        </View>
        <View style={styles.headerRight} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: bottomPad + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Status & payment row */}
        <View style={styles.section}>
          <View style={styles.statusRow}>
            <View style={styles.statusBlock}>
              <Text style={styles.label}>Status</Text>
              <Text style={styles.value}>
                {ORDER_STATUS_LABELS[order.status] ?? order.status}
              </Text>
            </View>
            <View style={styles.statusDivider} />
            <View style={styles.statusBlock}>
              <Text style={styles.label}>Payment</Text>
              <Text style={styles.value}>
                {PAYMENT_STATUS_LABELS[order.payment_status] ?? order.payment_status}
              </Text>
            </View>
          </View>
        </View>

        {/* Total */}
        <View style={styles.totalCard}>
          <Text style={styles.totalLabel}>Total</Text>
          <View style={styles.totalRow}>
            <Text style={styles.totalAmount}>
              {order.total_amount.toLocaleString("en-KE")}
            </Text>
            <Text style={styles.totalCurrency}>KES</Text>
          </View>
        </View>

        {/* Delivery & notes */}
        {(order.delivery_address || order.notes) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Delivery & notes</Text>
            <View style={styles.infoCard}>
              {order.delivery_address ? (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Delivery: </Text>
                  <Text style={styles.infoText}>{order.delivery_address}</Text>
                </View>
              ) : null}
              {order.notes ? (
                <View style={[styles.infoRow, order.delivery_address && styles.infoRowTop]}>
                  <Text style={styles.infoLabel}>Notes: </Text>
                  <Text style={styles.infoText}>{order.notes}</Text>
                </View>
              ) : null}
            </View>
          </View>
        )}

        {/* Rider */}
        {order.rider && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Rider</Text>
            <View style={styles.infoCard}>
              <Text style={styles.riderName}>{order.rider.name}</Text>
              {order.rider.phone ? (
                <Text style={styles.riderPhone}>{order.rider.phone}</Text>
              ) : null}
            </View>
          </View>
        )}

        {/* Order items */}
        {order.order_items && order.order_items.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Items</Text>
            <View style={styles.itemsCard}>
              {order.order_items.map((oi, index) => (
                <View
                  key={oi.id}
                  style={[
                    styles.itemRow,
                    index < order.order_items!.length - 1 && styles.itemRowBorder,
                  ]}
                >
                  <View style={styles.itemLeft}>
                    <Text style={styles.itemName} numberOfLines={2}>
                      {oi.menu_item?.name ?? `Item #${oi.menu_item_id}`}
                    </Text>
                    <Text style={styles.itemMeta}>
                      {oi.quantity} × {formatKES(oi.unit_price)}
                    </Text>
                  </View>
                  <Text style={styles.itemTotal}>
                    {(oi.unit_price * oi.quantity).toLocaleString("en-KE")}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Assign rider (when preparing, no rider yet) */}
        {showRiderAssign && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Assign rider</Text>
            <View style={styles.riderPickerCard}>
              {riders.map((r) => (
                <TouchableOpacity
                  key={r.id}
                  style={[
                    styles.riderOption,
                    selectedRiderId === String(r.id) && styles.riderOptionSelected,
                  ]}
                  onPress={() => setSelectedRiderId(String(r.id))}
                  activeOpacity={0.8}
                >
                  <Text style={styles.riderOptionName}>{r.name}</Text>
                  {r.phone ? (
                    <Text style={styles.riderOptionPhone}>{r.phone}</Text>
                  ) : null}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
      </ScrollView>

      {/* Actions */}
      {canChangeStatus && (
        <View style={[styles.footer, { paddingBottom: bottomPad + 16 }]}>
          {order.status === "pending" && (
            <TouchableOpacity
              style={[styles.primaryBtn, updating && styles.btnDisabled]}
              onPress={() => handleStatus("preparing")}
              disabled={updating}
              activeOpacity={0.88}
            >
              {updating ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.primaryBtnText}>Mark preparing</Text>
              )}
            </TouchableOpacity>
          )}
          {order.status === "preparing" && !showRiderAssign && (
            <TouchableOpacity
              style={[styles.primaryBtn, updating && styles.btnDisabled]}
              onPress={() => handleStatus("on_the_way")}
              disabled={updating}
              activeOpacity={0.88}
            >
              {updating ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.primaryBtnText}>Dispatch order</Text>
              )}
            </TouchableOpacity>
          )}
          {order.status === "preparing" && showRiderAssign && (
            <TouchableOpacity
              style={[
                styles.primaryBtn,
                (!selectedRiderId || updating) && styles.btnDisabled,
              ]}
              onPress={handleAssignRider}
              disabled={updating || !selectedRiderId}
              activeOpacity={0.88}
            >
              {updating ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.primaryBtnText}>Assign rider</Text>
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
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.primaryBtnText}>Mark delivered</Text>
              )}
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  centered: { justifyContent: "center", alignItems: "center" },
  emptyText: { color: "#64748b", fontSize: 16, marginBottom: 16 },
  backBtn: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: ACCENT,
    borderRadius: 10,
  },
  backBtnText: { color: "#fff", fontSize: 15, fontWeight: "600" },

  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: PAD,
    paddingBottom: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  headerBack: { padding: 4, marginRight: 8 },
  headerCenter: { flex: 1 },
  headerTitle: { fontSize: 20, fontWeight: "700", color: "#0f172a" },
  headerSubtitle: { fontSize: 13, color: "#64748b", marginTop: 2 },
  headerRight: { width: 36 },

  scroll: { flex: 1 },
  content: { padding: PAD, paddingTop: 24 },

  section: { marginBottom: 24 },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#64748b",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  statusRow: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 18,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 2,
  },
  statusBlock: { flex: 1 },
  statusDivider: {
    width: 1,
    backgroundColor: "#e2e8f0",
    marginHorizontal: 12,
  },
  label: { fontSize: 11, fontWeight: "600", color: "#94a3b8", textTransform: "uppercase", letterSpacing: 0.4 },
  value: { fontSize: 15, fontWeight: "600", color: "#0f172a", marginTop: 4 },

  totalCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    marginBottom: 24,
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 2,
  },
  totalLabel: { fontSize: 13, fontWeight: "600", color: "#64748b", textTransform: "uppercase", letterSpacing: 0.4 },
  totalRow: { flexDirection: "row", alignItems: "baseline", gap: 8, marginTop: 6 },
  totalAmount: { fontSize: 28, fontWeight: "800", color: "#0f172a" },
  totalCurrency: { fontSize: 15, fontWeight: "600", color: "#64748b" },

  infoCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  infoRowTop: { marginTop: 12 },
  infoLabel: { fontSize: 13, color: "#64748b" },
  infoText: { flex: 1, fontSize: 14, color: "#334155" },
  riderName: { fontSize: 15, fontWeight: "600", color: "#0f172a" },
  riderPhone: { fontSize: 13, color: "#64748b", marginTop: 4 },

  itemsCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    overflow: "hidden",
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  itemRowBorder: { borderBottomWidth: 1, borderBottomColor: "#f1f5f9" },
  itemLeft: { flex: 1, minWidth: 0, marginRight: 12 },
  itemName: { fontSize: 15, fontWeight: "500", color: "#0f172a" },
  itemMeta: { fontSize: 13, color: "#64748b", marginTop: 2 },
  itemTotal: { fontSize: 15, fontWeight: "600", color: "#0f172a" },

  riderPickerCard: { gap: 8 },
  riderOption: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: "#e2e8f0",
  },
  riderOptionSelected: {
    borderColor: ACCENT,
    backgroundColor: "#fffbeb",
  },
  riderOptionName: { fontSize: 15, fontWeight: "600", color: "#0f172a" },
  riderOptionPhone: { fontSize: 13, color: "#64748b", marginTop: 2 },

  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: PAD,
    paddingTop: 16,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
  },
  primaryBtn: {
    backgroundColor: ACCENT,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 52,
  },
  primaryBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  btnDisabled: { opacity: 0.7 },
});
