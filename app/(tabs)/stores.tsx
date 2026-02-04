import { getApiMessage } from "@/lib/api/client";
import { getMyStore, listStores } from "@/lib/api/stores";
import { STORE_STATUS_LABELS } from "@/lib/constants";
import { useAuthStore } from "@/lib/store/authStore";
import type { Store } from "@/types/api";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const ROW_IMAGE_SIZE = 72;
const CARD_RADIUS = 12;
const ACCENT = "#f59e0b";

/** Customer: Compact stores list – row layout, no big cards */
function StoresList() {
  const router = useRouter();
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
    load(page);
  }, [page]);

  const renderItem = ({ item }: { item: Store }) => (
    <TouchableOpacity
      style={styles.row}
      onPress={() => router.push(`/store/${item.id}`)}
      activeOpacity={0.82}
    >
      <View style={styles.rowImageWrap}>
        {item.image_url ? (
          <Image source={{ uri: item.image_url }} style={styles.rowImage} />
        ) : (
          <View style={styles.rowImagePlaceholder}>
            <Text style={styles.rowPlaceholderIcon}>🏪</Text>
          </View>
        )}
        <View
          style={[
            styles.statusDot,
            item.is_open ? styles.statusOpen : styles.statusClosed,
          ]}
        />
      </View>
      <View style={styles.rowBody}>
        <Text style={styles.rowTitle} numberOfLines={1}>
          {item.name}
        </Text>
        <Text style={styles.rowMeta} numberOfLines={1}>
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
      <Text style={styles.rowChevron}>›</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Stores</Text>
        <Text style={styles.subtitle}>
          {stores.length > 0
            ? `${stores.length} place${stores.length === 1 ? "" : "s"} to order from`
            : "Browse and order from your favourite stores"}
        </Text>
      </View>
      {loading && page === 1 ? (
        <View style={styles.centered}>
          <ActivityIndicator size="small" color={ACCENT} />
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
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => load(1, true)}
              tintColor={ACCENT}
            />
          }
          onEndReached={() => {
            if (meta && page < meta.last_page && !loading)
              setPage((p) => p + 1);
          }}
          onEndReachedThreshold={0.3}
        />
      )}
    </View>
  );
}

/** Restaurant: My Store – compact card */
function StoresRestaurant() {
  const router = useRouter();
  const [store, setStore] = useState<Store | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    getMyStore()
      .then(setStore)
      .catch((e) => {
        if (e.response?.status === 404) setNotFound(true);
        else Alert.alert("Error", getApiMessage(e));
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="small" color={ACCENT} />
      </View>
    );
  }

  if (notFound || !store) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>My Store</Text>
          <Text style={styles.subtitle}>Set up your restaurant on BiteDash</Text>
        </View>
        <View style={styles.centered}>
          <Text style={styles.emptyText}>You don&apos;t have a store yet.</Text>
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => router.push("/restaurant/edit")}
          >
            <Text style={styles.primaryBtnText}>Create restaurant</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>My Store</Text>
        <Text style={styles.subtitle}>{store.name}</Text>
      </View>
      <View style={styles.dashboardCard}>
        <View style={styles.storeRow}>
          <Text style={styles.storeName} numberOfLines={1}>
            {store.name}
          </Text>
          <View
            style={[
              styles.badge,
              store.is_open ? styles.badgeOpen : styles.badgeClosed,
            ]}
          >
            <Text style={styles.badgeText}>
              {store.is_open
                ? STORE_STATUS_LABELS.open
                : STORE_STATUS_LABELS.closed}
            </Text>
          </View>
        </View>
        <Text style={styles.storeDesc} numberOfLines={2}>
          {store.description ?? store.location}
        </Text>
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => router.push("/restaurant/edit")}
          >
            <Text style={styles.actionBtnText}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, styles.actionBtnPrimary]}
            onPress={() => router.push("/restaurant/menu")}
          >
            <Text style={styles.actionBtnTextPrimary}>Menu</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => router.push("/restaurant/orders")}
          >
            <Text style={styles.actionBtnText}>Orders</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

/** Rider */
function StoresRider() {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Stores</Text>
        <Text style={styles.subtitle}>Browse stores and place orders</Text>
      </View>
      <View style={styles.centered}>
        <Text style={styles.emptyText}>
          Stores are for customers. Use Orders for your deliveries.
        </Text>
      </View>
    </View>
  );
}

export default function StoresScreen() {
  const user = useAuthStore((s) => s.user);
  const role = user?.role ?? "customer";

  if (role === "restaurant") return <StoresRestaurant />;
  if (role === "rider") return <StoresRider />;
  return <StoresList />;
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
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  emptyText: { color: "#6b7280", fontSize: 14, textAlign: "center" },
  // Customer list: compact rows
  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: CARD_RADIUS,
    padding: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#f0f0f0",
  },
  rowImageWrap: {
    width: ROW_IMAGE_SIZE,
    height: ROW_IMAGE_SIZE,
    borderRadius: 10,
    overflow: "hidden",
    backgroundColor: "#f0f0f0",
  },
  rowImage: { width: "100%", height: "100%" },
  rowImagePlaceholder: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  rowPlaceholderIcon: { fontSize: 28 },
  statusDot: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusOpen: { backgroundColor: "#22c55e" },
  statusClosed: { backgroundColor: "#94a3b8" },
  rowBody: { flex: 1, marginLeft: 12, minWidth: 0 },
  rowTitle: { fontSize: 15, fontWeight: "600", color: "#111" },
  rowMeta: { fontSize: 12, color: "#6b7280", marginTop: 2 },
  badge: {
    alignSelf: "flex-start",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 6,
  },
  badgeOpen: { backgroundColor: "#dcfce7" },
  badgeClosed: { backgroundColor: "#f1f5f9" },
  badgeText: { fontSize: 11, fontWeight: "500", color: "#374151" },
  rowChevron: { fontSize: 18, color: "#c4c4c4", fontWeight: "500", marginLeft: 4 },
  // Restaurant dashboard
  dashboardCard: {
    marginHorizontal: 16,
    backgroundColor: "#fff",
    borderRadius: CARD_RADIUS,
    padding: 16,
    borderWidth: 1,
    borderColor: "#f0f0f0",
  },
  storeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  storeName: { fontSize: 17, fontWeight: "600", color: "#111", flex: 1 },
  storeDesc: { fontSize: 13, color: "#6b7280", marginTop: 6 },
  actionRow: { flexDirection: "row", gap: 8, marginTop: 14 },
  actionBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
  },
  actionBtnPrimary: { backgroundColor: ACCENT, borderColor: ACCENT },
  actionBtnText: { fontSize: 13, fontWeight: "500", color: "#374151" },
  actionBtnTextPrimary: { fontSize: 13, fontWeight: "600", color: "#fff" },
  primaryBtn: {
    backgroundColor: ACCENT,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginTop: 12,
  },
  primaryBtnText: { fontSize: 14, fontWeight: "600", color: "#fff" },
});
