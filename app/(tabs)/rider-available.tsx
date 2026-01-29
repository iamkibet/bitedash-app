import { getApiMessage } from "@/lib/api/client";
import { acceptOrder, listAvailableOrders } from "@/lib/api/orders";
import { ORDER_STATUS_LABELS } from "@/lib/constants";
import { formatKES, formatRelative } from "@/lib/utils/formatters";
import type { Order } from "@/types/api";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    FlatList,
    RefreshControl,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

export default function RiderAvailableScreen() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [acceptingId, setAcceptingId] = useState<number | null>(null);

  const load = async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    try {
      const res = await listAvailableOrders({ page: 1 });
      setOrders(res.data);
    } catch {
      setOrders([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleAccept = async (orderId: number) => {
    try {
      setAcceptingId(orderId);
      await acceptOrder(orderId);
      setOrders((prev) => prev.filter((o) => o.id !== orderId));
      router.push(`/rider/orders/${orderId}`);
    } catch (e) {
      Alert.alert("Error", getApiMessage(e));
    } finally {
      setAcceptingId(null);
    }
  };

  const renderItem = ({ item }: { item: Order }) => (
    <View style={styles.card}>
      <View style={styles.cardRow}>
        <Text style={styles.orderId}>Order #{item.id}</Text>
        <Text style={styles.time}>{formatRelative(item.created_at)}</Text>
      </View>
      <Text style={styles.amount}>{formatKES(item.total_amount)}</Text>
      <View style={styles.badge}>
        <Text style={styles.badgeText}>{ORDER_STATUS_LABELS[item.status]}</Text>
      </View>
      <View style={styles.row}>
        <TouchableOpacity
          style={styles.outlineBtn}
          onPress={() => router.push(`/rider/orders/${item.id}`)}
        >
          <Text style={styles.outlineBtnText}>View</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.primaryBtn,
            acceptingId === item.id && styles.btnDisabled,
          ]}
          onPress={() => handleAccept(item.id)}
          disabled={acceptingId === item.id}
        >
          {acceptingId === item.id ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.primaryBtnText}>Accept</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Available orders</Text>
      </View>
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#ed751a" />
        </View>
      ) : orders.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.emptyText}>No available orders.</Text>
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
    backgroundColor: "#fef3c7",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginTop: 8,
  },
  badgeText: { fontSize: 12, fontWeight: "500", color: "#92400e" },
  row: { flexDirection: "row", gap: 12, marginTop: 12 },
  outlineBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#d1d5db",
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
  },
  outlineBtnText: { fontSize: 14, color: "#374151", fontWeight: "500" },
  primaryBtn: {
    flex: 1,
    backgroundColor: "#ed751a",
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
  },
  primaryBtnText: { color: "#fff", fontSize: 14, fontWeight: "600" },
  btnDisabled: { opacity: 0.7 },
});
