import { getMyStore, listStoreOrders } from "@/lib/api/stores";
import { listMyRiderOrders, listOrders } from "@/lib/api/orders";
import { ORDER_STATUS_LABELS } from "@/lib/constants";
import { useAuthStore } from "@/lib/store/authStore";
import { formatKES, formatRelative } from "@/lib/utils/formatters";
import type { Order } from "@/types/api";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { IconSymbol } from "@/components/ui/icon-symbol";

const ACCENT = "#f59e0b";
const TABLE_PAD = 20;

type Role = "customer" | "restaurant" | "rider";

export default function OrdersScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (refresh = false) => {
    if (!user) return;
    if (refresh) setRefreshing(true);
    else setLoading(true);
    try {
      if (user.role === "restaurant") {
        const store = await getMyStore();
        const res = await listStoreOrders(store.id, { page: 1 });
        setOrders(res.data);
      } else if (user.role === "rider") {
        const res = await listMyRiderOrders({ page: 1 });
        setOrders(res.data);
      } else {
        const res = await listOrders({ page: 1 });
        setOrders(res.data);
      }
    } catch {
      setOrders([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    load();
  }, [user?.id, load]);

  const handleOrderPress = useCallback(
    (item: Order) => {
      if (user?.role === "restaurant")
        router.push(`/restaurant/orders/${item.id}`);
      else if (user?.role === "rider")
        router.push(`/rider/orders/${item.id}`);
      else router.push(`/orders/${item.id}`);
    },
    [user?.role, router],
  );

  if (!user) {
    return (
      <View style={styles.container}>
        <View style={[styles.header, { paddingTop: 12 }]}>
          <Text style={styles.title}>Orders</Text>
          <Text style={styles.subtitle}>Your order history</Text>
        </View>
        <View style={styles.centered}>
          <Text style={styles.emptyText}>Sign in to view orders.</Text>
        </View>
      </View>
    );
  }

  const role: Role = (user.role ?? "customer") as Role;
  const listTitle =
    role === "rider"
      ? "My deliveries"
      : role === "restaurant"
        ? "Store orders"
        : "Orders";
  const listSubtitle =
    role === "rider"
      ? "Orders you're delivering"
      : role === "restaurant"
        ? "Orders for your store"
        : "Your order history";
  const showRestaurantColumn = role === "customer" || role === "rider";
  const bottomPad = Math.max(insets.bottom, 24);

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: 12 + insets.top }]}>
        <Text style={styles.title}>{listTitle}</Text>
        <Text style={styles.subtitle}>
          {orders.length > 0
            ? `${orders.length} order${orders.length === 1 ? "" : "s"}`
            : listSubtitle}
        </Text>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="small" color={ACCENT} />
        </View>
      ) : orders.length === 0 ? (
        <View style={styles.emptyWrap}>
          <View style={styles.emptyIconWrap}>
            <Text style={styles.emptyIcon}>📋</Text>
          </View>
          <Text style={styles.emptyTitle}>No orders yet</Text>
          <Text style={styles.emptySubtext}>
            {role === "customer"
              ? "Orders you place will appear here."
              : role === "rider"
                ? "Accepted deliveries will show here."
                : "Orders for your store will appear here."}
          </Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomPad }]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => load(true)}
              tintColor={ACCENT}
            />
          }
        >
          <View style={styles.tableWrap}>
            {/* Table header */}
            <View style={styles.tableHeader}>
              <View style={[styles.th, styles.thOrder]}>
                <Text style={styles.thText}>Order</Text>
              </View>
              {showRestaurantColumn && (
                <View style={[styles.th, styles.thRestaurant]}>
                  <Text style={styles.thText}>
                    {role === "rider" ? "Store" : "Restaurant"}
                  </Text>
                </View>
              )}
              <View style={[styles.th, styles.thStatus]}>
                <Text style={styles.thText}>Status</Text>
              </View>
              <View style={[styles.th, styles.thTime]}>
                <Text style={styles.thText}>Time</Text>
              </View>
              <View style={[styles.th, styles.thAmount]}>
                <Text style={[styles.thText, styles.thAmountText]}>Amount</Text>
              </View>
              <View style={[styles.th, styles.thAction]}>
                <Text style={styles.thText} />
              </View>
            </View>

            {/* Table rows */}
            {orders.map((order, index) => (
              <TouchableOpacity
                key={order.id}
                style={[
                  styles.tr,
                  index % 2 === 1 && styles.trAlt,
                  index === orders.length - 1 && styles.trLast,
                ]}
                onPress={() => handleOrderPress(order)}
                activeOpacity={0.7}
              >
                <View style={[styles.td, styles.tdOrder]}>
                  <Text style={styles.orderIdText}>#{order.id}</Text>
                </View>
                {showRestaurantColumn && (
                  <View style={[styles.td, styles.tdRestaurant]}>
                    <Text
                      style={styles.restaurantText}
                      numberOfLines={1}
                    >
                      {order.restaurant?.name ?? "—"}
                    </Text>
                  </View>
                )}
                <View style={[styles.td, styles.tdStatus]}>
                  <Text style={styles.statusText}>
                    {ORDER_STATUS_LABELS[order.status] ?? order.status}
                  </Text>
                </View>
                <View style={[styles.td, styles.tdTime]}>
                  <Text style={styles.timeText} numberOfLines={1}>
                    {formatRelative(order.created_at)}
                  </Text>
                </View>
                <View style={[styles.td, styles.tdAmount]}>
                  <Text style={styles.amountText}>
                    {order.total_amount.toLocaleString("en-KE")}
                  </Text>
                </View>
                <View style={[styles.td, styles.tdAction]}>
                  <IconSymbol name="chevron.right" size={18} color="#94a3b8" />
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  header: {
    paddingHorizontal: TABLE_PAD,
    paddingBottom: 20,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  title: { fontSize: 24, fontWeight: "700", color: "#0f172a" },
  subtitle: { fontSize: 14, color: "#64748b", marginTop: 4 },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: TABLE_PAD, paddingTop: 20 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  emptyWrap: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  emptyIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#f1f5f9",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  emptyIcon: { fontSize: 36 },
  emptyTitle: { fontSize: 18, fontWeight: "600", color: "#0f172a", marginBottom: 8 },
  emptySubtext: {
    fontSize: 14,
    color: "#64748b",
    textAlign: "center",
    lineHeight: 22,
  },
  emptyText: { color: "#64748b", fontSize: 14 },

  // Table
  tableWrap: {
    backgroundColor: "#fff",
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  tableHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: "#f8fafc",
    borderBottomWidth: 2,
    borderBottomColor: "#e2e8f0",
  },
  th: {
    paddingRight: 12,
  },
  thText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#64748b",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  thAmountText: { textAlign: "right" },
  thOrder: { flex: 0.9 },
  thRestaurant: { flex: 1.4 },
  thStatus: { flex: 1.1 },
  thTime: { flex: 0.95 },
  thAmount: { flex: 0.85 },
  thAction: { flex: 0.35, paddingRight: 0 },

  tr: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  trAlt: {
    backgroundColor: "#fafbfc",
  },
  trLast: {
    borderBottomWidth: 0,
  },
  td: {
    paddingRight: 12,
  },
  tdOrder: { flex: 0.9 },
  orderIdText: { fontSize: 15, fontWeight: "700", color: "#0f172a" },
  tdRestaurant: { flex: 1.4 },
  restaurantText: { fontSize: 13, color: "#475569" },
  tdStatus: { flex: 1.1 },
  statusText: { fontSize: 13, fontWeight: "500", color: "#475569" },
  tdTime: { flex: 0.95 },
  timeText: { fontSize: 12, color: "#64748b" },
  tdAmount: { flex: 0.85 },
  amountText: {
    fontSize: 14,
    fontWeight: "700",
    color: ACCENT,
    textAlign: "right",
  },
  tdAction: { flex: 0.35, paddingRight: 0, alignItems: "flex-end" },
});
