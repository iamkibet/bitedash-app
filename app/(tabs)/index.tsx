import { listStores } from "@/lib/api/stores";
import { STORE_STATUS_LABELS } from "@/lib/constants";
import { useAuthStore } from "@/lib/store/authStore";
import type { Store } from "@/types/api";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    Image,
    RefreshControl,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

export default function StoresScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [stores, setStores] = useState<Store[]>([]);
  const [meta, setMeta] = useState<{
    current_page: number;
    last_page: number;
  } | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async (p = 1, refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    try {
      const res = await listStores({ page: p });
      if (p === 1) setStores(res.data);
      else setStores((prev) => [...prev, ...res.data]);
      setMeta(res.meta);
    } catch {
      setStores([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (user?.role === "restaurant") {
      router.replace("/(tabs)/restaurant");
      return;
    }
    if (user?.role === "rider") {
      router.replace("/(tabs)/rider-available");
      return;
    }
    load(page);
  }, [user?.role]);

  useEffect(() => {
    if (user?.role !== "customer" && user?.role !== undefined) return;
    load(page);
  }, [page]);

  const onRefresh = () => load(1, true);

  if (user?.role === "restaurant" || user?.role === "rider") {
    return null;
  }

  const renderItem = ({ item }: { item: Store }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push(`/store/${item.id}`)}
      activeOpacity={0.7}
    >
      {item.image_url ? (
        <Image source={{ uri: item.image_url }} style={styles.cardImage} />
      ) : (
        <View style={styles.cardImagePlaceholder}>
          <Text style={styles.placeholderText}>No image</Text>
        </View>
      )}
      <View style={styles.cardContent}>
        <Text style={styles.cardTitle} numberOfLines={1}>
          {item.name}
        </Text>
        <Text style={styles.cardDesc} numberOfLines={2}>
          {item.description ?? item.location}
        </Text>
        <View
          style={[
            styles.badge,
            item.is_open ? styles.badgeOpen : styles.badgeClosed,
          ]}
        >
          <Text style={styles.badgeText}>
            {item.is_open
              ? STORE_STATUS_LABELS.open
              : STORE_STATUS_LABELS.closed}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Stores</Text>
      </View>
      {loading && page === 1 ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#ed751a" />
        </View>
      ) : stores.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.emptyText}>No stores found.</Text>
        </View>
      ) : (
        <FlatList
          data={stores}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          onEndReached={() => {
            if (meta && page < meta.last_page && !loading) {
              setPage((p) => p + 1);
            }
          }}
          onEndReachedThreshold={0.3}
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
    overflow: "hidden",
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  cardImage: { height: 140, width: "100%", backgroundColor: "#e5e7eb" },
  cardImagePlaceholder: {
    height: 140,
    width: "100%",
    backgroundColor: "#e5e7eb",
    justifyContent: "center",
    alignItems: "center",
  },
  placeholderText: { color: "#9ca3af", fontSize: 14 },
  cardContent: { padding: 12 },
  cardTitle: { fontSize: 18, fontWeight: "600", color: "#111" },
  cardDesc: { fontSize: 14, color: "#6b7280", marginTop: 4 },
  badge: {
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginTop: 8,
  },
  badgeOpen: { backgroundColor: "#dcfce7" },
  badgeClosed: { backgroundColor: "#f3f4f6" },
  badgeText: { fontSize: 12, fontWeight: "500", color: "#374151" },
});
