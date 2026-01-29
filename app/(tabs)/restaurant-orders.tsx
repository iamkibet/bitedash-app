import { getMyStore, listStoreOrders } from "@/lib/api/stores";
import { ORDER_STATUS_LABELS } from "@/lib/constants";
import { formatKES, formatRelative } from "@/lib/utils/formatters";
import type { Order } from "@/types/api";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    RefreshControl,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

export default function RestaurantOrdersScreen() {
  const router = useRouter();
  const [storeId, setStoreId] = useState<number | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    try {
      const store = await getMyStore();
      setStoreId(store.id);
      const res = await listStoreOrders(store.id, { page: 1 });
      setOrders(res.data);
    } catch {
      setStoreId(null);
      setOrders([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const renderItem = ({ item }: { item: Order }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push(`/restaurant/orders/${item.id}`)}
      activeOpacity={0.7}
    >
      <View style={styles.cardRow}>
        <Text style={styles.orderId}>Order #{item.id}</Text>
        <Text style={styles.time}>{formatRelative(item.created_at)}</Text>
      </View>
      <Text style={styles.amount}>{formatKES(item.total_amount)}</Text>
      <View
        style={[
          styles.badge,
          item.status === "cancelled"
            ? styles.badgeCancelled
            : styles.badgeActive,
        ]}
      >
        <Text style={styles.badgeText}>{ORDER_STATUS_LABELS[item.status]}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Store orders</Text>
      </View>
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#ed751a" />
        </View>
      ) : orders.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.emptyText}>No orders yet.</Text>
        </View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => load(true)}
            />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9fafb" },
  header: { padding: 16, paddingTop: 48 },
  title: { fontSize: 28, fontWeight: "700", color: "#111" },
  list: { padding: 16, paddingBottom: 32 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  emptyText: { color: "#6b7280", fontSize: 16 },
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
  cardRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  orderId: { fontSize: 16, fontWeight: "600", color: "#111" },
  time: { fontSize: 14, color: "#6b7280" },
  amount: { fontSize: 18, fontWeight: "600", color: "#ed751a", marginTop: 8 },
  badge: {
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginTop: 8,
  },
  badgeActive: { backgroundColor: "#fef3c7" },
  badgeCancelled: { backgroundColor: "#f3f4f6" },
  badgeText: { fontSize: 12, fontWeight: "500", color: "#374151" },
});
