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
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const ACCENT = "#f59e0b";

function getStatusStyle(status: Order["status"]) {
  if (status === "cancelled") return { bg: "#f1f5f9", color: "#64748b" };
  if (status === "delivered") return { bg: "#dcfce7", color: "#166534" };
  return { bg: "#fffbeb", color: "#92400e" };
}

function OrderCard({
  order,
  role,
  onPress,
}: {
  order: Order;
  role: "customer" | "restaurant" | "rider";
  onPress: () => void;
}) {
  const statusStyle = getStatusStyle(order.status);
  const restaurantName = order.restaurant?.name;

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.82}
    >
      <View style={styles.cardRow}>
        <View style={styles.cardLeft}>
          <Text style={styles.orderId}>Order #{order.id}</Text>
          {role === "customer" && restaurantName ? (
            <Text style={styles.restaurantName} numberOfLines={1}>
              {restaurantName}
            </Text>
          ) : null}
          <Text style={styles.metaLine}>
            <Text style={[styles.statusDot, { color: statusStyle.color }]}>● </Text>
            {ORDER_STATUS_LABELS[order.status] ?? order.status}
            <Text style={styles.metaSep}> · </Text>
            <Text style={styles.time}>{formatRelative(order.created_at)}</Text>
          </Text>
        </View>
        <Text style={styles.amount}>{formatKES(order.total_amount)}</Text>
      </View>
    </TouchableOpacity>
  );
}

export default function OrdersScreen() {
  const router = useRouter();
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
        <View style={styles.header}>
          <Text style={styles.title}>Orders</Text>
          <Text style={styles.subtitle}>Your order history</Text>
        </View>
        <View style={styles.centered}>
          <Text style={styles.emptyText}>Sign in to view orders.</Text>
        </View>
      </View>
    );
  }

  const listTitle =
    user.role === "rider"
      ? "My deliveries"
      : user.role === "restaurant"
        ? "Store orders"
        : "Orders";
  const listSubtitle =
    user.role === "rider"
      ? "Orders you're delivering"
      : user.role === "restaurant"
        ? "Orders for your store"
        : "Your order history";

  return (
    <View style={styles.container}>
      <View style={styles.header}>
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
            {user.role === "customer"
              ? "Orders you place will appear here."
              : user.role === "rider"
                ? "Accepted deliveries will show here."
                : "Orders for your store will appear here."}
          </Text>
        </View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <OrderCard
              order={item}
              role={user.role ?? "customer"}
              onPress={() => handleOrderPress(item)}
            />
          )}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => load(true)}
              tintColor={ACCENT}
            />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fafafa" },
  header: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
  },
  title: { fontSize: 22, fontWeight: "700", color: "#111" },
  subtitle: { fontSize: 13, color: "#6b7280", marginTop: 2 },
  list: { paddingHorizontal: 16, paddingBottom: 24 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  emptyWrap: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  emptyIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#f0f0f0",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  emptyIcon: { fontSize: 32 },
  emptyTitle: { fontSize: 17, fontWeight: "600", color: "#111", marginBottom: 6 },
  emptySubtext: {
    fontSize: 14,
    color: "#6b7280",
    textAlign: "center",
    lineHeight: 20,
  },
  emptyText: { color: "#6b7280", fontSize: 14 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#f0f0f0",
  },
  cardRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  cardLeft: { flex: 1, minWidth: 0 },
  orderId: { fontSize: 15, fontWeight: "600", color: "#111" },
  restaurantName: {
    fontSize: 13,
    color: "#6b7280",
    marginTop: 2,
  },
  metaLine: {
    fontSize: 12,
    color: "#6b7280",
    marginTop: 6,
  },
  statusDot: { fontSize: 8 },
  metaSep: { color: "#d1d5db" },
  time: { color: "#9ca3af" },
  amount: { fontSize: 16, fontWeight: "700", color: ACCENT },
});
