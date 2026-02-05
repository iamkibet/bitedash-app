import { getApiMessage } from "@/lib/api/client";
import { listMyRestaurantOrders, updateOrder } from "@/lib/api/orders";
import { getMyStore, listStores, toggleStoreStatus } from "@/lib/api/stores";
import { ORDER_STATUS_LABELS, STORE_STATUS_LABELS } from "@/lib/constants";
import { useAuthStore } from "@/lib/store/authStore";
import { formatKES, formatRelative } from "@/lib/utils/formatters";
import type { Order, Store } from "@/types/api";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Platform,
  Pressable,
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
const ROW_IMAGE_SIZE = 80;
const CARD_RADIUS = 14;
const HORIZONTAL_PADDING = 20;

/** Customer: Browse stores – organised list, open first */
function StoresList() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [stores, setStores] = useState<Store[]>([]);
  const [meta, setMeta] = useState<{
    current_page: number;
    last_page: number;
  } | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (p = 1, isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else if (p === 1) setLoading(true);
    try {
      const res = await listStores({ page: p });
      if (p === 1) setStores(res.data);
      else setStores((prev) => [...prev, ...res.data]);
      setMeta(res.meta);
    } catch {
      if (p === 1) setStores([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load(1);
  }, [load]);

  const sortedStores = [...stores].sort((a, b) => {
    if (a.is_open === b.is_open) return 0;
    return a.is_open ? -1 : 1;
  });
  const openCount = stores.filter((s) => s.is_open).length;
  const listBottom = Math.max(insets.bottom, 24);

  const renderItem = ({ item }: { item: Store }) => (
    <Pressable
      style={({ pressed }) => [styles.storeCard, pressed && styles.storeCardPressed]}
      onPress={() => router.push(`/store/${item.id}`)}
    >
      <View style={styles.storeCardImageWrap}>
        {item.image_url ? (
          <Image source={{ uri: item.image_url }} style={styles.storeCardImage} />
        ) : (
          <View style={styles.storeCardImagePlaceholder}>
            <IconSymbol name="storefront.fill" size={28} color="#9ca3af" />
          </View>
        )}
        <View
          style={[
            styles.storeCardStatusPill,
            item.is_open ? styles.storeCardStatusOpen : styles.storeCardStatusClosed,
          ]}
        >
          <Text style={styles.storeCardStatusText}>
            {item.is_open ? STORE_STATUS_LABELS.open : STORE_STATUS_LABELS.closed}
          </Text>
        </View>
      </View>
      <View style={styles.storeCardBody}>
        <Text style={styles.storeCardName} numberOfLines={1}>
          {item.name}
        </Text>
        <Text style={styles.storeCardMeta} numberOfLines={2}>
          {item.description ?? item.location}
        </Text>
      </View>
      <View style={styles.storeCardChevronWrap}>
        <IconSymbol name="chevron.right" size={20} color="#9ca3af" />
      </View>
    </Pressable>
  );

  return (
    <View style={styles.container}>
      <View style={[styles.pageHeader, { paddingTop: 12 + (Platform.OS === "ios" ? 0 : 8) }]}>
        <View style={styles.sectionTitleRow}>
          <View style={styles.sectionTitleAccent} />
          <Text style={styles.sectionTitle}>Browse stores</Text>
        </View>
        <Text style={styles.pageSubtitle}>
          {stores.length > 0
            ? `${openCount} open · ${stores.length} total`
            : "Find restaurants and order delivery"}
        </Text>
      </View>

      {loading && page === 1 ? (
        <View style={styles.centered}>
          <ActivityIndicator size="small" color={ACCENT} />
        </View>
      ) : stores.length === 0 ? (
        <View style={styles.emptyState}>
          <View style={styles.emptyIconWrap}>
            <IconSymbol name="storefront.fill" size={40} color="#d1d5db" />
          </View>
          <Text style={styles.emptyTitle}>No stores yet</Text>
          <Text style={styles.emptySubtext}>
            Stores will appear here when they’re added. Check back later.
          </Text>
        </View>
      ) : (
        <FlatList
          data={sortedStores}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          contentContainerStyle={[styles.listContent, { paddingBottom: listBottom }]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setPage(1);
                load(1, true);
              }}
              tintColor={ACCENT}
            />
          }
          onEndReached={() => {
            if (meta && page < meta.last_page && !loading) {
              const nextPage = page + 1;
              setPage(nextPage);
              load(nextPage);
            }
          }}
          onEndReachedThreshold={0.3}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

/** Restaurant: My Store – open/close toggle, menu link, orders table */
function StoresRestaurant() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [store, setStore] = useState<Store | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [togglingStatus, setTogglingStatus] = useState(false);
  const [updatingOrderId, setUpdatingOrderId] = useState<number | null>(null);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const [storeRes, ordersRes] = await Promise.all([
        getMyStore(),
        listMyRestaurantOrders({ page: 1 }),
      ]);
      setStore(storeRes);
      setOrders(ordersRes.data);
    } catch (e) {
      if ((e as { response?: { status: number } })?.response?.status === 404) {
        setNotFound(true);
        setStore(null);
      } else {
        Alert.alert("Error", getApiMessage(e));
      }
      setOrders([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (notFound) return;
    load();
  }, [load, notFound]);

  const handleToggleOpen = useCallback(async () => {
    if (!store || togglingStatus) return;
    setTogglingStatus(true);
    try {
      const updated = await toggleStoreStatus(store.id);
      setStore(updated);
    } catch (e) {
      Alert.alert("Error", getApiMessage(e));
    } finally {
      setTogglingStatus(false);
    }
  }, [store, togglingStatus]);

  const handleOrderStatus = useCallback(async (order: Order, newStatus: Order["status"]) => {
    setUpdatingOrderId(order.id);
    try {
      const updated = await updateOrder(order.id, { status: newStatus });
      setOrders((prev) => prev.map((o) => (o.id === order.id ? updated : o)));
    } catch (e) {
      Alert.alert("Error", getApiMessage(e));
    } finally {
      setUpdatingOrderId(null);
    }
  }, []);

  if (loading && !store) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="small" color={ACCENT} />
      </View>
    );
  }

  if (notFound || !store) {
    return (
      <View style={styles.container}>
        <View style={[styles.pageHeader, { paddingTop: 12 }]}>
          <View style={styles.sectionTitleRow}>
            <View style={styles.sectionTitleAccent} />
            <Text style={styles.sectionTitle}>My Store</Text>
          </View>
          <Text style={styles.pageSubtitle}>Set up your restaurant on BiteDash</Text>
        </View>
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>You don’t have a store yet</Text>
          <Text style={styles.emptySubtext}>
            Create your restaurant to add a menu and start receiving orders.
          </Text>
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => router.push("/restaurant/edit")}
            activeOpacity={0.88}
          >
            <Text style={styles.primaryBtnText}>Create restaurant</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const bottomPad = Math.max(insets.bottom, 24);

  return (
    <View style={styles.container}>
      <View style={[styles.pageHeader, { paddingTop: 12 }]}>
        <View style={styles.sectionTitleRow}>
          <View style={styles.sectionTitleAccent} />
          <Text style={styles.sectionTitle}>My Store</Text>
        </View>
        <Text style={styles.pageSubtitle} numberOfLines={1}>
          {store.name}
        </Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingBottom: bottomPad }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => load(true)}
            tintColor={ACCENT}
          />
        }
      >
        {/* Store card: name, power (open/close), menu CTA */}
        <View style={styles.dashboardCard}>
          <View style={styles.dashboardTop}>
            <View style={styles.dashboardTitleWrap}>
              <Text style={styles.dashboardStoreName} numberOfLines={1}>
                {store.name}
              </Text>
              <Text style={styles.dashboardStatusLabel}>
                {store.is_open ? STORE_STATUS_LABELS.open : STORE_STATUS_LABELS.closed}
              </Text>
            </View>
            <Pressable
              style={({ pressed }) => [
                styles.powerBtn,
                store.is_open ? styles.powerBtnOn : styles.powerBtnOff,
                pressed && styles.powerBtnPressed,
              ]}
              onPress={handleToggleOpen}
              disabled={togglingStatus}
            >
              {togglingStatus ? (
                <ActivityIndicator
                  size="small"
                  color={store.is_open ? "#fff" : "#6b7280"}
                />
              ) : (
                <Text style={[
                  styles.powerIconText,
                  store.is_open ? styles.powerIconOn : styles.powerIconOff,
                ]}>
                  ⏻
                </Text>
              )}
            </Pressable>
          </View>
          {(store.description || store.location) ? (
            <Text style={styles.dashboardDesc} numberOfLines={2}>
              {store.description ?? store.location}
            </Text>
          ) : null}
          <TouchableOpacity
            style={styles.menuCta}
            onPress={() => router.push("/restaurant/menu")}
            activeOpacity={0.88}
          >
            <IconSymbol name="menucard.fill" size={22} color="#fff" />
            <Text style={styles.menuCtaText}>Menu</Text>
          </TouchableOpacity>
        </View>

        {/* Orders section */}
        <View style={styles.ordersSection}>
          <View style={styles.ordersSectionHeader}>
            <View style={styles.sectionTitleRow}>
              <View style={styles.sectionTitleAccent} />
              <Text style={styles.sectionTitle}>Orders</Text>
            </View>
            <TouchableOpacity
              onPress={() => router.push("/restaurant/orders")}
              hitSlop={8}
            >
              <Text style={styles.sectionLink}>View all</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.ordersTable}>
            <View style={styles.ordersTableHeader}>
              <Text style={[styles.ordersTh, styles.ordersThId]}>Order</Text>
              <Text style={[styles.ordersTh, styles.ordersThStatus]}>Status</Text>
              <Text style={[styles.ordersTh, styles.ordersThAmount]}>Amount</Text>
              <Text style={[styles.ordersTh, styles.ordersThAction]}>Action</Text>
            </View>
            {orders.length === 0 ? (
              <View style={styles.ordersEmptyRow}>
                <Text style={styles.ordersEmptyText}>No orders yet</Text>
              </View>
            ) : (
              orders.slice(0, 15).map((order) => {
                const isUpdating = updatingOrderId === order.id;
                return (
                  <View key={order.id} style={styles.ordersRow}>
                    <TouchableOpacity
                      style={styles.ordersCellId}
                      onPress={() => router.push(`/restaurant/orders/${order.id}`)}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.ordersIdText}>#{order.id}</Text>
                      <Text style={styles.ordersTimeText} numberOfLines={1}>
                        {formatRelative(order.created_at)}
                      </Text>
                    </TouchableOpacity>
                    <View style={styles.ordersCellStatus}>
                      <View
                        style={[
                          styles.orderStatusBadge,
                          order.status === "cancelled" && styles.orderStatusBadgeCancelled,
                          order.status === "delivered" && styles.orderStatusBadgeDelivered,
                        ]}
                      >
                        <Text style={styles.orderStatusBadgeText}>
                          {ORDER_STATUS_LABELS[order.status] ?? order.status}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.ordersCellAmount}>
                      <Text style={styles.ordersAmountText}>{formatKES(order.total_amount)}</Text>
                    </View>
                    <View style={styles.ordersCellAction}>
                      {order.status === "pending" && (
                        <TouchableOpacity
                          style={styles.orderActionBtn}
                          onPress={() => handleOrderStatus(order, "preparing")}
                          disabled={isUpdating}
                        >
                          {isUpdating ? (
                            <ActivityIndicator size="small" color="#fff" />
                          ) : (
                            <Text style={styles.orderActionBtnText}>Prepare</Text>
                          )}
                        </TouchableOpacity>
                      )}
                      {order.status === "preparing" && (
                        <TouchableOpacity
                          style={styles.orderActionBtn}
                          onPress={() => handleOrderStatus(order, "on_the_way")}
                          disabled={isUpdating}
                        >
                          {isUpdating ? (
                            <ActivityIndicator size="small" color="#fff" />
                          ) : (
                            <Text style={styles.orderActionBtnText}>Dispatch</Text>
                          )}
                        </TouchableOpacity>
                      )}
                      {(order.status === "on_the_way" || order.status === "delivered" || order.status === "cancelled") && (
                        <TouchableOpacity
                          style={styles.orderViewBtn}
                          onPress={() => router.push(`/restaurant/orders/${order.id}`)}
                        >
                          <Text style={styles.orderViewBtnText}>View</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                );
              })
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

/** Rider: informational */
function StoresRider() {
  return (
    <View style={styles.container}>
      <View style={[styles.pageHeader, { paddingTop: 12 }]}>
        <View style={styles.sectionTitleRow}>
          <View style={styles.sectionTitleAccent} />
          <Text style={styles.sectionTitle}>Stores</Text>
        </View>
        <Text style={styles.pageSubtitle}>Browse and place orders as a customer</Text>
      </View>
      <View style={styles.emptyState}>
        <Text style={styles.emptySubtext}>
          As a rider, use the Orders tab for deliveries. Switch to a customer account to browse stores.
        </Text>
      </View>
    </View>
  );
}

export default function StoresScreen() {
  const user = useAuthStore((s) => s.user);
  const role = String(user?.role ?? "customer").toLowerCase();

  if (role === "restaurant") return <StoresRestaurant />;
  if (role === "rider") return <StoresRider />;
  return <StoresList />;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fafafa" },
  pageHeader: {
    paddingHorizontal: HORIZONTAL_PADDING,
    paddingBottom: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  sectionTitleAccent: {
    width: 3,
    height: 18,
    borderRadius: 2,
    backgroundColor: ACCENT,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1f2937",
    letterSpacing: 0.2,
  },
  pageSubtitle: {
    fontSize: 13,
    color: "#6b7280",
    marginTop: 6,
  },
  listContent: {
    paddingHorizontal: HORIZONTAL_PADDING,
    paddingTop: 16,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  emptyIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#f3f4f6",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: "600",
    color: "#111",
    marginBottom: 8,
    textAlign: "center",
  },
  emptySubtext: {
    fontSize: 14,
    color: "#6b7280",
    lineHeight: 20,
    textAlign: "center",
    marginBottom: 20,
  },
  primaryBtn: {
    backgroundColor: ACCENT,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  primaryBtnText: { fontSize: 15, fontWeight: "600", color: "#fff" },
  // Customer: store cards
  storeCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: CARD_RADIUS,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#f0f0f0",
  },
  storeCardPressed: { opacity: 0.96 },
  storeCardImageWrap: {
    width: ROW_IMAGE_SIZE,
    height: ROW_IMAGE_SIZE,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#f3f4f6",
  },
  storeCardImage: { width: "100%", height: "100%" },
  storeCardImagePlaceholder: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  storeCardStatusPill: {
    position: "absolute",
    bottom: 6,
    left: 6,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
  },
  storeCardStatusOpen: { backgroundColor: "rgba(34, 197, 94, 0.95)" },
  storeCardStatusClosed: { backgroundColor: "rgba(100, 116, 139, 0.9)" },
  storeCardStatusText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#fff",
  },
  storeCardBody: {
    flex: 1,
    marginLeft: 14,
    minWidth: 0,
  },
  storeCardName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111",
  },
  storeCardMeta: {
    fontSize: 13,
    color: "#6b7280",
    marginTop: 2,
    lineHeight: 18,
  },
  storeCardChevronWrap: {
    padding: 4,
  },
  // Restaurant dashboard
  scroll: { flex: 1 },
  dashboardCard: {
    marginHorizontal: HORIZONTAL_PADDING,
    marginTop: 16,
    backgroundColor: "#fff",
    borderRadius: CARD_RADIUS,
    padding: 20,
    borderWidth: 1,
    borderColor: "#f0f0f0",
  },
  dashboardTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  dashboardTitleWrap: { flex: 1, minWidth: 0 },
  dashboardStoreName: {
    fontSize: 18,
    fontWeight: "600",
    color: "#111",
  },
  dashboardStatusLabel: {
    fontSize: 12,
    color: "#6b7280",
    marginTop: 2,
  },
  powerBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
  },
  powerBtnOn: {
    backgroundColor: ACCENT,
  },
  powerBtnOff: {
    backgroundColor: "#f3f4f6",
  },
  powerBtnPressed: { opacity: 0.9 },
  powerIconText: { fontSize: 26, fontWeight: "600" },
  powerIconOn: { color: "#fff" },
  powerIconOff: { color: "#6b7280" },
  dashboardDesc: {
    fontSize: 14,
    color: "#6b7280",
    lineHeight: 20,
    marginTop: 12,
  },
  menuCta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: ACCENT,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 16,
  },
  menuCtaText: { fontSize: 16, fontWeight: "600", color: "#fff" },
  // Orders section
  ordersSection: {
    marginTop: 24,
    paddingHorizontal: HORIZONTAL_PADDING,
  },
  ordersSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  sectionLink: {
    fontSize: 13,
    fontWeight: "600",
    color: ACCENT,
  },
  ordersEmptyRow: {
    paddingVertical: 24,
    paddingHorizontal: 12,
    alignItems: "center",
  },
  ordersEmptyText: {
    fontSize: 14,
    color: "#6b7280",
  },
  ordersTable: {
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#f0f0f0",
    overflow: "hidden",
  },
  ordersTableHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: "#f9fafb",
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  ordersTh: {
    fontSize: 11,
    fontWeight: "600",
    color: "#6b7280",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  ordersThId: { flex: 1.2 },
  ordersThStatus: { flex: 1 },
  ordersThAmount: { flex: 0.9 },
  ordersThAction: { flex: 1 },
  ordersRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f5f5f5",
  },
  ordersCellId: { flex: 1.2 },
  ordersIdText: { fontSize: 14, fontWeight: "600", color: "#111" },
  ordersTimeText: { fontSize: 11, color: "#6b7280", marginTop: 2 },
  ordersCellStatus: { flex: 1 },
  orderStatusBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: "#fef3c7",
  },
  orderStatusBadgeCancelled: { backgroundColor: "#fee2e2" },
  orderStatusBadgeDelivered: { backgroundColor: "#dcfce7" },
  orderStatusBadgeText: { fontSize: 11, fontWeight: "600", color: "#374151" },
  ordersCellAmount: { flex: 0.9 },
  ordersAmountText: { fontSize: 13, fontWeight: "600", color: "#111" },
  ordersCellAction: { flex: 1 },
  orderActionBtn: {
    backgroundColor: ACCENT,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    alignSelf: "flex-start",
  },
  orderActionBtnText: { fontSize: 12, fontWeight: "600", color: "#fff" },
  orderViewBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    alignSelf: "flex-start",
  },
  orderViewBtnText: { fontSize: 12, fontWeight: "600", color: ACCENT },
});
