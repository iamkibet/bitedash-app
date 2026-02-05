import { getApiMessage } from "@/lib/api/client";
import { listFavourites } from "@/lib/api/favourites";
import { listMenuItemsByStore } from "@/lib/api/menuItems";
import {
  acceptOrder,
  listAvailableOrders,
  listMyRestaurantOrders,
  listMyRiderOrders,
  listOrders,
  updateOrder,
} from "@/lib/api/orders";
import { getMyStore, listStores, toggleStoreStatus } from "@/lib/api/stores";
import {
  ORDER_STATUS_LABELS,
  STORE_STATUS_LABELS,
} from "@/lib/constants";
import { useAuthStore } from "@/lib/store/authStore";
import { useCartStore } from "@/lib/store/cartStore";
import { useDeliveryLocationStore } from "@/lib/store/deliveryLocationStore";
import { formatKES, formatRelative } from "@/lib/utils/formatters";
import type { Favourite, MenuItem, Order, PaginationMeta, Store } from "@/types/api";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Image,
  Modal,
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

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const HOME_PADDING = 20;
const PRIMARY_YELLOW = "#f59e0b";
const TAB_BAR_PADDING_BOTTOM = 24;

const STORE_CARD_WIDTH = 148;
const STORE_CARD_MARGIN = 12;
const HOME_OPEN_STORES_LIMIT = 6;
const DISH_CARD_WIDTH = 160;
const DISH_CARD_MARGIN = 12;
const HOME_MENU_STORES_LIMIT = 5;
const HOME_DISHES_LIMIT = 20;
const STORE_DASHBOARD_CARD_RADIUS = 14;

type CarouselItem = Store | { id: "view-all" };
type DishWithStore = MenuItem & { storeName?: string };

/** Customer: Hero + open stores carousel + dishes slider + recent orders */
function HomeDashboard() {
  const router = useRouter();
  const deliveryLocation = useDeliveryLocationStore((s) => s.location);
  const addToCart = useCartStore((s) => s.addItem);
  const [stores, setStores] = useState<Store[]>([]);
  const [dishes, setDishes] = useState<DishWithStore[]>([]);
  const [favourites, setFavourites] = useState<Favourite[]>([]);
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    try {
      const [storesRes, ordersRes, favouritesRes] = await Promise.all([
        listStores({ page: 1 }),
        listOrders({ page: 1 }),
        listFavourites({ page: 1 }).catch(() => ({ data: [] as Favourite[] })),
      ]);
      setStores(storesRes.data);
      setRecentOrders(ordersRes.data.slice(0, 5));
      setFavourites(favouritesRes.data);
      const openStoresList = storesRes.data.filter((s) => s.is_open);
      if (openStoresList.length > 0) {
        const menuPromises = openStoresList
          .slice(0, HOME_MENU_STORES_LIMIT)
          .map((s) =>
            listMenuItemsByStore(s.id, { page: 1, is_available: true }).then(
              (r) =>
                r.data.map((item) => ({
                  ...item,
                  storeName: s.name,
                })) as DishWithStore[],
            ),
          );
        const menuArrays = await Promise.all(menuPromises);
        const flat = menuArrays.flat();
        const byId = new Map<number, DishWithStore>();
        for (const d of flat) {
          if (!byId.has(d.id)) byId.set(d.id, d);
        }
        setDishes(Array.from(byId.values()).slice(0, HOME_DISHES_LIMIT));
      } else {
        setDishes([]);
      }
    } catch {
      setStores([]);
      setDishes([]);
      setFavourites([]);
      setRecentOrders([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openStores = stores.filter((s) => s.is_open);
  const carouselData: CarouselItem[] = [
    ...openStores.slice(0, HOME_OPEN_STORES_LIMIT),
    { id: "view-all" },
  ];

  const renderCarouselItem = ({ item }: { item: CarouselItem }) => {
    if (item.id === "view-all") {
      return (
        <TouchableOpacity
          style={styles.showAllStoresCard}
          onPress={() => router.push("/(tabs)/stores")}
          activeOpacity={0.8}
        >
          <Text style={styles.showAllStoresCardText}>Show all stores</Text>
          <Text style={styles.showAllStoresChevron}>›</Text>
        </TouchableOpacity>
      );
    }
    const store = item as Store;
    return (
      <TouchableOpacity
        style={styles.storeCard}
        onPress={() => router.push(`/store/${store.id}`)}
        activeOpacity={0.9}
      >
        <View style={styles.storeCardImageWrap}>
          {store.image_url ? (
            <Image source={{ uri: store.image_url }} style={styles.storeCardImage} />
          ) : (
            <View style={styles.storeCardPlaceholder}>
              <Text style={styles.storeCardPlaceholderIcon}>🏪</Text>
            </View>
          )}
          <View style={[styles.storeCardBadge, styles.storeCardBadgeOpen]}>
            <Text style={styles.storeCardBadgeText}>Open</Text>
          </View>
        </View>
        <Text style={styles.storeCardName} numberOfLines={2}>
          {store.name}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.homeContainer}>
      <ScrollView
        style={styles.homeScroll}
        contentContainerStyle={styles.homeScrollContent}
        showsVerticalScrollIndicator={false}
        bounces={true}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => load(true)}
            tintColor="#fff"
          />
        }
      >
        {/* Hero */}
        <View style={styles.homeHero}>
          <TouchableOpacity
            style={styles.locationPill}
            activeOpacity={0.88}
            onPress={() => router.push("/set-location")}
          >
            <Text style={styles.locationIcon}>📍</Text>
            <Text style={styles.locationText} numberOfLines={1}>
              {deliveryLocation?.address ?? "Set delivery location"}
            </Text>
            <Text style={styles.locationChevron}>›</Text>
          </TouchableOpacity>
          <Text style={styles.heroTitle}>Good food, delivered</Text>
          <Text style={styles.heroSubtitle}>
            Order from top restaurants and get it at your door
          </Text>
        </View>

        {/* Content */}
        <View style={styles.homeContent}>
          <View style={styles.promoBanner}>
            <View style={styles.promoTextWrap}>
              <Text style={styles.promoTitle}>
                Free delivery on your next order
              </Text>
              <Text style={styles.promoSubtitle}>
                Treat yourself — we’ve got you covered
              </Text>
            </View>
            <View style={styles.promoScooterWrap}>
              <Text style={styles.promoScooter}>🛵</Text>
            </View>
          </View>

          <View style={[styles.sectionHeader, styles.sectionHeaderFirst]}>
            <View style={styles.sectionTitleRow}>
              <View style={styles.sectionTitleAccent} />
              <Text style={styles.sectionTitle}>Open stores</Text>
            </View>
          </View>

          {loading ? (
            <View style={styles.carouselSkeleton}>
              <ActivityIndicator size="small" color={PRIMARY_YELLOW} />
            </View>
          ) : openStores.length === 0 ? (
            <View style={styles.homeEmpty}>
              <Text style={styles.homeEmptyIcon}>🍽️</Text>
              <Text style={styles.homeEmptyText}>No open stores right now</Text>
              <Text style={styles.homeEmptySubtext}>
                Check back later or browse all stores
              </Text>
              <TouchableOpacity
                style={styles.recentOrdersEmptyBtn}
                onPress={() => router.push("/(tabs)/stores")}
              >
                <Text style={styles.recentOrdersEmptyBtnText}>Show all stores</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <FlatList
              data={carouselData}
              keyExtractor={(item) => String(item.id)}
              renderItem={renderCarouselItem}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.storeCarouselContent}
              ItemSeparatorComponent={() => <View style={{ width: STORE_CARD_MARGIN }} />}
            />
          )}

          {dishes.length > 0 && (
            <>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionTitleRow}>
                  <View style={styles.sectionTitleAccent} />
                  <Text style={styles.sectionTitle}>Order now</Text>
                </View>
              </View>
              <FlatList
                data={dishes}
                keyExtractor={(item) => String(item.id)}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.dishCarouselContent}
                ItemSeparatorComponent={() => <View style={{ width: DISH_CARD_MARGIN }} />}
                renderItem={({ item }) => (
                  <View style={styles.dishCard}>
                    <TouchableOpacity
                      activeOpacity={0.92}
                      onPress={() => router.push(`/menu/${item.id}`)}
                      style={styles.dishCardImageWrap}
                    >
                      {item.image_url ? (
                        <Image
                          source={{ uri: item.image_url }}
                          style={styles.dishCardImage}
                        />
                      ) : (
                        <View style={styles.dishCardPlaceholder}>
                          <Text style={styles.dishCardPlaceholderIcon}>🍽️</Text>
                        </View>
                      )}
                      <View style={styles.dishCardPriceBadge}>
                        <Text style={styles.dishCardPriceBadgeText}>
                          {formatKES(item.price)}
                        </Text>
                      </View>
                    </TouchableOpacity>
                    <View style={styles.dishCardBody}>
                      <View style={styles.dishCardTextWrap}>
                        <Text style={styles.dishCardName} numberOfLines={2}>
                          {item.name}
                        </Text>
                        {item.storeName ? (
                          <Text style={styles.dishCardStore} numberOfLines={1}>
                            {item.storeName}
                          </Text>
                        ) : null}
                      </View>
                      <Pressable
                        style={({ pressed }) => [
                          styles.dishCardPlusBtn,
                          pressed && styles.dishCardPlusBtnPressed,
                        ]}
                        onPress={() => {
                          addToCart(item);
                          router.push("/cart");
                        }}
                      >
                        <IconSymbol
                          name="plus"
                          size={16}
                          color="#fff"
                        />
                      </Pressable>
                    </View>
                  </View>
                )}
              />
            </>
          )}

          {favourites.length > 0 && (
            <>
              <View style={[styles.sectionHeader, styles.sectionHeaderWithLink]}>
                <View style={styles.sectionTitleRow}>
                  <View style={styles.sectionTitleAccent} />
                  <Text style={styles.sectionTitle}>Your favourites</Text>
                </View>
                <TouchableOpacity
                  onPress={() => router.push("/favourites")}
                  hitSlop={8}
                >
                  <Text style={styles.sectionLink}>See all</Text>
                </TouchableOpacity>
              </View>
              <FlatList
                data={favourites}
                keyExtractor={(item) => String(item.menu_item.id)}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.dishCarouselContent}
                ItemSeparatorComponent={() => <View style={{ width: DISH_CARD_MARGIN }} />}
                renderItem={({ item: fav }) => {
                  const item = fav.menu_item;
                  const storeName = item.restaurant?.name;
                  return (
                    <View style={styles.dishCard}>
                      <TouchableOpacity
                        activeOpacity={0.92}
                        onPress={() => router.push(`/menu/${item.id}`)}
                        style={styles.dishCardImageWrap}
                      >
                        {item.image_url ? (
                          <Image
                            source={{ uri: item.image_url }}
                            style={styles.dishCardImage}
                          />
                        ) : (
                          <View style={styles.dishCardPlaceholder}>
                            <Text style={styles.dishCardPlaceholderIcon}>🍽️</Text>
                          </View>
                        )}
                        <View style={styles.dishCardPriceBadge}>
                          <Text style={styles.dishCardPriceBadgeText}>
                            {formatKES(item.price)}
                          </Text>
                        </View>
                      </TouchableOpacity>
                      <View style={styles.dishCardBody}>
                        <View style={styles.dishCardTextWrap}>
                          <Text style={styles.dishCardName} numberOfLines={2}>
                            {item.name}
                          </Text>
                          {storeName ? (
                            <Text style={styles.dishCardStore} numberOfLines={1}>
                              {storeName}
                            </Text>
                          ) : null}
                        </View>
                        <Pressable
                          style={({ pressed }) => [
                            styles.dishCardPlusBtn,
                            pressed && styles.dishCardPlusBtnPressed,
                          ]}
                          onPress={() => {
                            addToCart(item);
                            router.push("/cart");
                          }}
                        >
                          <IconSymbol
                            name="plus"
                            size={16}
                            color="#fff"
                          />
                        </Pressable>
                      </View>
                    </View>
                  );
                }}
              />
            </>
          )}

          <View style={[styles.sectionHeader, styles.sectionHeaderWithLink]}>
            <View style={styles.sectionTitleRow}>
              <View style={styles.sectionTitleAccent} />
              <Text style={styles.sectionTitle}>Recent orders</Text>
            </View>
            <TouchableOpacity
              onPress={() => router.push("/(tabs)/orders")}
              hitSlop={8}
            >
              <Text style={styles.sectionLink}>View all</Text>
            </TouchableOpacity>
          </View>

          {recentOrders.length === 0 ? (
            <View style={styles.recentOrdersEmpty}>
              <Text style={styles.recentOrdersEmptyText}>No recent orders</Text>
              <TouchableOpacity
                onPress={() => router.push("/(tabs)/stores")}
                style={styles.recentOrdersEmptyBtn}
              >
                <Text style={styles.recentOrdersEmptyBtnText}>Browse stores</Text>
              </TouchableOpacity>
            </View>
          ) : (
            recentOrders.map((order) => (
              <TouchableOpacity
                key={order.id}
                style={styles.recentOrderRow}
                onPress={() => router.push(`/orders/${order.id}`)}
                activeOpacity={0.8}
              >
                <View style={styles.recentOrderLeft}>
                  <Text style={styles.recentOrderId}>Order #{order.id}</Text>
                  <Text style={styles.recentOrderMeta} numberOfLines={1}>
                    {order.restaurant?.name ?? "—"} · {ORDER_STATUS_LABELS[order.status] ?? order.status}
                  </Text>
                </View>
                <View style={styles.recentOrderRight}>
                  <Text style={styles.recentOrderAmount}>
                    {formatKES(order.total_amount)}
                  </Text>
                  <Text style={styles.recentOrderTime}>
                    {formatRelative(order.created_at)}
                  </Text>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

type EarningsPeriod = "all" | "month" | "week";

function getEarningsForPeriod(orders: Order[], period: EarningsPeriod): number {
  if (period === "all") {
    return orders.reduce((sum, o) => sum + (o.payment_status === "paid" ? o.total_amount : 0), 0);
  }
  const now = new Date();
  let start: Date;
  if (period === "month") {
    start = new Date(now.getFullYear(), now.getMonth(), 1);
  } else {
    const day = now.getDay();
    const mondayOffset = day === 0 ? -6 : 1 - day;
    start = new Date(now);
    start.setDate(now.getDate() + mondayOffset);
    start.setHours(0, 0, 0, 0);
  }
  const startMs = start.getTime();
  const endMs = now.getTime();
  return orders.reduce((sum, o) => {
    if (o.payment_status !== "paid") return sum;
    const orderTime = new Date(o.created_at).getTime();
    return orderTime >= startMs && orderTime <= endMs ? sum + o.total_amount : sum;
  }, 0);
}

/** Restaurant: Full store dashboard on Home – power, menu, orders table */
function HomeRestaurant() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [store, setStore] = useState<Store | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersMeta, setOrdersMeta] = useState<PaginationMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [togglingStatus, setTogglingStatus] = useState(false);
  const [updatingOrderId, setUpdatingOrderId] = useState<number | null>(null);
  const [earningsPeriod, setEarningsPeriod] = useState<EarningsPeriod>("all");
  const [earningsFilterOpen, setEarningsFilterOpen] = useState(false);
  const [orderMenuOrderId, setOrderMenuOrderId] = useState<number | null>(null);

  const earningsPeriodLabel =
    earningsPeriod === "all" ? "All time" : earningsPeriod === "week" ? "This week" : "This month";

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
      setOrdersMeta(ordersRes.meta ?? null);
    } catch (e) {
      if ((e as { response?: { status: number } })?.response?.status === 404) {
        setNotFound(true);
        setStore(null);
      } else {
        Alert.alert("Error", getApiMessage(e));
      }
      setOrders([]);
      setOrdersMeta(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (notFound) return;
    load();
  }, [load, notFound]);

  const totalOrders = ordersMeta?.total ?? 0;
  const totalEarnings = getEarningsForPeriod(orders, earningsPeriod);
  const menuOrder = orderMenuOrderId != null ? orders.find((o) => o.id === orderMenuOrderId) : null;

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
        <ActivityIndicator size="small" color={PRIMARY_YELLOW} />
      </View>
    );
  }

  if (notFound || !store) {
    return (
      <View style={styles.container}>
        <View style={[styles.pageHeader, { paddingTop: 24 }]}>
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
      <View style={[styles.pageHeader, { paddingTop: 24 }]}>
        <View style={styles.storePageHeaderRow}>
          <View style={styles.sectionTitleRow}>
            <View style={styles.sectionTitleAccent} />
            <Text style={styles.sectionTitle}>My Store</Text>
          </View>
          <Pressable
            style={({ pressed }) => [
              styles.storeHeaderPowerBtn,
              store.is_open ? styles.storePowerBtnOn : styles.storePowerBtnOff,
              pressed && styles.storePowerBtnPressed,
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
              <Text
                style={[
                  styles.storeHeaderPowerIconText,
                  store.is_open ? styles.storePowerIconOn : styles.storePowerIconOff,
                ]}
              >
                ⏻
              </Text>
            )}
          </Pressable>
        </View>
        <Text style={styles.pageSubtitle} numberOfLines={1}>
          {store.name}
        </Text>
      </View>

      <ScrollView
        style={styles.restaurantScroll}
        contentContainerStyle={[styles.restaurantScrollContent, { paddingBottom: bottomPad }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => load(true)}
            tintColor={PRIMARY_YELLOW}
          />
        }
      >
        <View style={styles.storeStatsRow}>
          <View style={styles.storeStatCard}>
            <Text style={styles.storeStatValue}>{totalOrders}</Text>
            <Text style={styles.storeStatLabel}>Total orders</Text>
          </View>
          <View style={styles.storeStatCard}>
            <View style={styles.storeEarningsHeader}>
              <Text style={styles.storeStatLabel}>Total earnings</Text>
              <TouchableOpacity
                style={styles.storeEarningsFilterBtn}
                onPress={() => setEarningsFilterOpen(true)}
                hitSlop={8}
              >
                <IconSymbol
                  name="line.3.horizontal.decrease.circle"
                  size={20}
                  color={PRIMARY_YELLOW}
                />
              </TouchableOpacity>
            </View>
            <Text style={styles.storeStatValue}>{formatKES(totalEarnings)}</Text>
            <Text style={styles.storeStatPeriodLabel}>{earningsPeriodLabel}</Text>
          </View>
        </View>

        <View style={styles.storeDashboardCard}>
          <View style={styles.storeDashboardTitleWrap}>
            <Text style={styles.storeDashboardName} numberOfLines={1}>
              {store.name}
            </Text>
            <Text style={styles.storeDashboardStatusLabel}>
              {store.is_open ? STORE_STATUS_LABELS.open : STORE_STATUS_LABELS.closed}
            </Text>
          </View>
          {(store.description || store.location) ? (
            <Text style={styles.storeDashboardDesc} numberOfLines={2}>
              {store.description ?? store.location}
            </Text>
          ) : null}
          <TouchableOpacity
            style={styles.storeMenuCta}
            onPress={() => router.push("/restaurant/menu")}
            activeOpacity={0.88}
          >
            <IconSymbol name="menucard.fill" size={22} color="#fff" />
            <Text style={styles.storeMenuCtaText}>Menu</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.storeOrdersSection}>
          <View style={styles.storeOrdersSectionHeader}>
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

          <View style={styles.storeOrdersTable}>
            <View style={styles.storeOrdersTableHeader}>
              <Text style={[styles.storeOrdersTh, styles.storeOrdersThId]}>Order</Text>
              <Text style={[styles.storeOrdersTh, styles.storeOrdersThStatus]}>Status</Text>
              <Text style={[styles.storeOrdersTh, styles.storeOrdersThAmount]}>Amount</Text>
              <Text style={[styles.storeOrdersTh, styles.storeOrdersThAction]}>Action</Text>
            </View>
            {orders.length === 0 ? (
              <View style={styles.storeOrdersEmptyRow}>
                <Text style={styles.storeOrdersEmptyText}>No orders yet</Text>
              </View>
            ) : (
              orders.slice(0, 15).map((order, index) => {
                const isUpdating = updatingOrderId === order.id;
                const isLast = index === Math.min(orders.length, 15) - 1;
                return (
                  <View
                    key={order.id}
                    style={[styles.storeOrdersRow, isLast && styles.storeOrdersRowLast]}
                  >
                    <TouchableOpacity
                      style={styles.storeOrdersCellId}
                      onPress={() => router.push(`/restaurant/orders/${order.id}`)}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.storeOrdersIdText}>#{order.id}</Text>
                      <Text style={styles.storeOrdersTimeText} numberOfLines={1}>
                        {formatRelative(order.created_at)}
                      </Text>
                    </TouchableOpacity>
                    <View style={styles.storeOrdersCellStatus}>
                      <Text style={styles.storeOrderStatusText}>
                        {ORDER_STATUS_LABELS[order.status] ?? order.status}
                      </Text>
                    </View>
                    <View style={styles.storeOrdersCellAmount}>
                      <Text style={styles.storeOrdersAmountText} numberOfLines={1}>
                        {order.total_amount.toLocaleString("en-KE")}
                      </Text>
                    </View>
                    <View style={styles.storeOrdersCellAction}>
                      <TouchableOpacity
                        style={styles.storeOrderMenuTrigger}
                        onPress={() => setOrderMenuOrderId(order.id)}
                        disabled={isUpdating}
                        hitSlop={8}
                        activeOpacity={0.7}
                      >
                        {isUpdating ? (
                          <ActivityIndicator size="small" color="#6b7280" />
                        ) : (
                          <IconSymbol name="ellipsis" size={22} color="#6b7280" />
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })
            )}
          </View>
        </View>
      </ScrollView>

      <Modal
        visible={earningsFilterOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setEarningsFilterOpen(false)}
      >
        <Pressable
          style={styles.orderMenuBackdrop}
          onPress={() => setEarningsFilterOpen(false)}
        >
          <View style={styles.earningsFilterSheet} onStartShouldSetResponder={() => true}>
            <Text style={styles.earningsFilterTitle}>Earnings period</Text>
            {(["all", "week", "month"] as const).map((p) => (
              <TouchableOpacity
                key={p}
                style={styles.earningsFilterItem}
                onPress={() => {
                  setEarningsPeriod(p);
                  setEarningsFilterOpen(false);
                }}
              >
                <Text style={styles.earningsFilterItemText}>
                  {p === "all" ? "All time" : p === "week" ? "This week" : "This month"}
                </Text>
                {earningsPeriod === p && (
                  <IconSymbol name="chevron.right" size={18} color={PRIMARY_YELLOW} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </Pressable>
      </Modal>

      <Modal
        visible={menuOrder != null}
        transparent
        animationType="fade"
        onRequestClose={() => setOrderMenuOrderId(null)}
      >
        <Pressable
          style={styles.orderMenuBackdrop}
          onPress={() => setOrderMenuOrderId(null)}
        >
          <View style={styles.orderMenuSheet} onStartShouldSetResponder={() => true}>
            {menuOrder && (
              <>
                <View style={styles.orderMenuHeader}>
                  <Text style={styles.orderMenuTitle}>Order #{menuOrder.id}</Text>
                  <Text style={styles.orderMenuSubtitle}>
                    {ORDER_STATUS_LABELS[menuOrder.status] ?? menuOrder.status}
                  </Text>
                </View>
                {menuOrder.status === "pending" && (
                  <TouchableOpacity
                    style={styles.orderMenuItem}
                    onPress={() => {
                      setOrderMenuOrderId(null);
                      handleOrderStatus(menuOrder, "preparing");
                    }}
                  >
                    <Text style={styles.orderMenuItemText}>Prepare</Text>
                  </TouchableOpacity>
                )}
                {menuOrder.status === "preparing" && (
                  <TouchableOpacity
                    style={styles.orderMenuItem}
                    onPress={() => {
                      setOrderMenuOrderId(null);
                      handleOrderStatus(menuOrder, "on_the_way");
                    }}
                  >
                    <Text style={styles.orderMenuItemText}>Dispatch</Text>
                  </TouchableOpacity>
                )}
                {menuOrder.status === "on_the_way" && (
                  <TouchableOpacity
                    style={styles.orderMenuItem}
                    onPress={() => {
                      setOrderMenuOrderId(null);
                      handleOrderStatus(menuOrder, "delivered");
                    }}
                  >
                    <Text style={styles.orderMenuItemText}>Mark delivered</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={styles.orderMenuItem}
                  onPress={() => {
                    setOrderMenuOrderId(null);
                    router.push(`/restaurant/orders/${menuOrder.id}`);
                  }}
                >
                  <Text style={styles.orderMenuItemText}>View order</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.orderMenuItem, styles.orderMenuCancel]}
                  onPress={() => setOrderMenuOrderId(null)}
                >
                  <Text style={styles.orderMenuCancelText}>Cancel</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

/** Rider: Available orders + recent deliveries */
function HomeRider() {
  const router = useRouter();
  const [availableOrders, setAvailableOrders] = useState<Order[]>([]);
  const [recentDeliveries, setRecentDeliveries] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [acceptingId, setAcceptingId] = useState<number | null>(null);

  const load = async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    try {
      const [availableRes, myRes] = await Promise.all([
        listAvailableOrders({ page: 1 }),
        listMyRiderOrders({ page: 1 }),
      ]);
      setAvailableOrders(availableRes.data);
      setRecentDeliveries(myRes.data.slice(0, 5));
    } catch {
      setAvailableOrders([]);
      setRecentDeliveries([]);
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
      setAvailableOrders((prev) => prev.filter((o) => o.id !== orderId));
      router.push(`/rider/orders/${orderId}`);
    } catch (e) {
      Alert.alert("Error", getApiMessage(e));
    } finally {
      setAcceptingId(null);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.riderScroll}
        contentContainerStyle={styles.riderScrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => load(true)}
            tintColor="#ed751a"
          />
        }
      >
        <View style={styles.header}>
          <Text style={styles.title}>Available orders</Text>
          <Text style={styles.subtitle}>Accept deliveries and earn</Text>
        </View>
        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="small" color="#ed751a" />
          </View>
        ) : availableOrders.length === 0 ? (
          <View style={styles.riderEmpty}>
            <Text style={styles.emptyText}>No available orders right now.</Text>
          </View>
        ) : (
          availableOrders.map((item) => (
            <View key={item.id} style={styles.orderCard}>
              <View style={styles.orderRow}>
                <Text style={styles.orderId}>Order #{item.id}</Text>
                <Text style={styles.orderTime}>{formatRelative(item.created_at)}</Text>
              </View>
              <Text style={styles.orderAmount}>{formatKES(item.total_amount)}</Text>
              <View style={styles.orderBadge}>
                <Text style={styles.orderBadgeText}>{item.status}</Text>
              </View>
              <View style={styles.orderActions}>
                <TouchableOpacity
                  style={styles.orderOutlineBtn}
                  onPress={() => router.push(`/rider/orders/${item.id}`)}
                >
                  <Text style={styles.orderOutlineBtnText}>View</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.orderPrimaryBtn,
                    acceptingId === item.id && styles.btnDisabled,
                  ]}
                  onPress={() => handleAccept(item.id)}
                  disabled={acceptingId === item.id}
                >
                  {acceptingId === item.id ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.orderPrimaryBtnText}>Accept</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}

        <View style={styles.restaurantSectionHeader}>
          <Text style={styles.sectionTitle}>My recent deliveries</Text>
          <TouchableOpacity
            onPress={() => router.push("/(tabs)/orders")}
            hitSlop={8}
          >
            <Text style={styles.sectionLink}>View all</Text>
          </TouchableOpacity>
        </View>
        {recentDeliveries.length === 0 ? (
          <View style={styles.recentOrdersEmptyRestaurant}>
            <Text style={styles.recentOrdersEmptyText}>No deliveries yet</Text>
          </View>
        ) : (
          recentDeliveries.map((order) => (
            <TouchableOpacity
              key={order.id}
              style={styles.recentOrderRow}
              onPress={() => router.push(`/rider/orders/${order.id}`)}
              activeOpacity={0.8}
            >
              <View style={styles.recentOrderLeft}>
                <Text style={styles.recentOrderId}>Order #{order.id}</Text>
                <Text style={styles.recentOrderMeta}>
                  {ORDER_STATUS_LABELS[order.status] ?? order.status} · {formatRelative(order.created_at)}
                </Text>
              </View>
              <Text style={styles.recentOrderAmount}>
                {formatKES(order.total_amount)}
              </Text>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </View>
  );
}

export default function HomeScreen() {
  const isHydrated = useAuthStore((s) => s.isHydrated);
  const user = useAuthStore((s) => s.user);
  const role = isHydrated ? String(user?.role ?? "customer").toLowerCase() : null;

  if (!isHydrated || role === null) {
    return (
      <View style={styles.homeContainer}>
        <View style={[styles.homeHero, { paddingTop: 48, paddingBottom: 48 }]}>
          <ActivityIndicator size="large" color="#fff" />
          <Text style={[styles.heroTitle, { marginTop: 16, fontSize: 18 }]}>Loading...</Text>
        </View>
      </View>
    );
  }

  if (role === "restaurant") return <HomeRestaurant />;
  if (role === "rider") return <HomeRider />;
  return <HomeDashboard />;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9fafb" },
  header: { padding: 16, paddingTop: 48 },
  title: { fontSize: 28, fontWeight: "700", color: "#111" },
  subtitle: { fontSize: 14, color: "#6b7280", marginTop: 4 },
  list: { padding: 16, paddingBottom: 32 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  emptyText: { color: "#6b7280", fontSize: 16 },
  restaurantScroll: { flex: 1 },
  restaurantScrollContent: { paddingBottom: 32 },
  restaurantSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 24,
    marginBottom: 10,
    paddingHorizontal: 16,
  },
  recentOrdersEmptyRestaurant: {
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  riderScroll: { flex: 1 },
  riderScrollContent: { paddingBottom: 32 },
  riderEmpty: { padding: 16 },
  // Home (customer): yellow layout + store circles + promo
  homeContainer: { flex: 1, backgroundColor: "#fff" },
  homeScroll: { flex: 1 },
  homeScrollContent: {
    paddingBottom: TAB_BAR_PADDING_BOTTOM + 48,
  },
  homeHero: {
    backgroundColor: PRIMARY_YELLOW,
    paddingHorizontal: HOME_PADDING,
    paddingTop: 16,
    paddingBottom: 32,
  },
  locationPill: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "rgba(255,255,255,0.98)",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginBottom: 24,
    gap: 8,
    maxWidth: "100%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  locationIcon: { fontSize: 16 },
  locationText: {
    flex: 1,
    fontSize: 14,
    color: "#374151",
    fontWeight: "600",
  },
  locationChevron: { fontSize: 16, color: "#9ca3af", fontWeight: "600" },
  heroTitle: {
    fontSize: 26,
    fontWeight: "800",
    color: "#fff",
    letterSpacing: -0.5,
  },
  heroSubtitle: {
    fontSize: 15,
    color: "rgba(255,255,255,0.92)",
    marginTop: 6,
    lineHeight: 22,
  },
  homeContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: -20,
    paddingTop: 24,
    paddingHorizontal: HOME_PADDING,
    paddingBottom: 24,
  },
  sectionHeader: {
    marginTop: 28,
    marginBottom: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionHeaderFirst: {
    marginTop: 20,
  },
  sectionHeaderWithLink: {
    marginBottom: 14,
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
    backgroundColor: PRIMARY_YELLOW,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1f2937",
    letterSpacing: 0.2,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: "#6b7280",
    marginTop: 2,
  },
  sectionLink: {
    fontSize: 13,
    fontWeight: "600",
    color: PRIMARY_YELLOW,
  },
  pageHeader: {
    paddingHorizontal: HOME_PADDING,
    paddingTop: 24,
    paddingBottom: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  storePageHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  storeHeaderPowerBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  storeHeaderPowerIconText: { fontSize: 18, fontWeight: "600" },
  pageSubtitle: {
    fontSize: 13,
    color: "#6b7280",
    marginTop: 6,
  },
  manageStoreCta: {
    backgroundColor: PRIMARY_YELLOW,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 16,
  },
  manageStoreCtaText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
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
    backgroundColor: PRIMARY_YELLOW,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  primaryBtnText: { fontSize: 15, fontWeight: "600", color: "#fff" },
  storeStatsRow: {
    flexDirection: "row",
    marginHorizontal: HOME_PADDING,
    marginTop: 16,
    gap: 12,
  },
  storeStatCard: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: STORE_DASHBOARD_CARD_RADIUS,
    padding: 16,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 72,
  },
  storeStatValue: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
  },
  storeStatLabel: {
    fontSize: 12,
    color: "#6b7280",
    marginTop: 4,
  },
  storeEarningsHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    marginBottom: 4,
  },
  storeEarningsFilterBtn: {
    padding: 4,
  },
  storeStatPeriodLabel: {
    fontSize: 11,
    color: "#9ca3af",
    marginTop: 2,
  },
  earningsFilterSheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingTop: 12,
    paddingBottom: 32,
    paddingHorizontal: 20,
  },
  earningsFilterTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6b7280",
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  earningsFilterItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 4,
  },
  earningsFilterItemText: {
    fontSize: 16,
    fontWeight: "500",
    color: "#111",
  },
  orderMenuBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  orderMenuSheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingTop: 8,
    paddingBottom: 32,
    paddingHorizontal: 20,
  },
  orderMenuHeader: {
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
    marginBottom: 8,
  },
  orderMenuTitle: { fontSize: 16, fontWeight: "700", color: "#111" },
  orderMenuSubtitle: { fontSize: 13, color: "#6b7280", marginTop: 2 },
  orderMenuItem: {
    paddingVertical: 14,
    paddingHorizontal: 4,
  },
  orderMenuItemText: { fontSize: 16, fontWeight: "500", color: "#111" },
  orderMenuCancel: { marginTop: 8 },
  orderMenuCancelText: { fontSize: 16, fontWeight: "500", color: "#6b7280" },
  storeDashboardCard: {
    marginHorizontal: HOME_PADDING,
    marginTop: 16,
    backgroundColor: "#fff",
    borderRadius: STORE_DASHBOARD_CARD_RADIUS,
    padding: 20,
    borderWidth: 1,
    borderColor: "#f0f0f0",
  },
  storeDashboardTitleWrap: { minWidth: 0 },
  storeDashboardName: { fontSize: 18, fontWeight: "600", color: "#111" },
  storeDashboardStatusLabel: { fontSize: 12, color: "#6b7280", marginTop: 2 },
  storePowerBtnOn: { backgroundColor: PRIMARY_YELLOW },
  storePowerBtnOff: { backgroundColor: "#f3f4f6" },
  storePowerBtnPressed: { opacity: 0.9 },
  storePowerIconOn: { color: "#fff" },
  storePowerIconOff: { color: "#6b7280" },
  storeDashboardDesc: {
    fontSize: 14,
    color: "#6b7280",
    lineHeight: 20,
    marginTop: 12,
  },
  storeMenuCta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: PRIMARY_YELLOW,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 16,
  },
  storeMenuCtaText: { fontSize: 16, fontWeight: "600", color: "#fff" },
  storeOrdersSection: {
    marginTop: 24,
    paddingHorizontal: HOME_PADDING,
  },
  storeOrdersSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  storeOrdersTable: {
    backgroundColor: "#fff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 2,
  },
  storeOrdersTableHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: "#f8fafc",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  storeOrdersTh: {
    fontSize: 11,
    fontWeight: "700",
    color: "#64748b",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  storeOrdersThId: { flex: 1.15, paddingRight: 10 },
  storeOrdersThStatus: { flex: 1.05, paddingRight: 10 },
  storeOrdersThAmount: { flex: 1, paddingRight: 10 },
  storeOrdersThAction: { flex: 0.85, alignItems: "flex-end" },
  storeOrdersRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  storeOrdersRowLast: {
    borderBottomWidth: 0,
  },
  storeOrdersCellId: { flex: 1.15, paddingRight: 10 },
  storeOrdersIdText: { fontSize: 15, fontWeight: "600", color: "#0f172a" },
  storeOrdersTimeText: { fontSize: 12, color: "#64748b", marginTop: 3 },
  storeOrdersCellStatus: { flex: 1.05, paddingRight: 10 },
  storeOrderStatusText: { fontSize: 13, fontWeight: "500", color: "#374151" },
  storeOrdersCellAmount: { flex: 1, paddingRight: 10 },
  storeOrdersAmountText: { fontSize: 13, fontWeight: "600", color: "#0f172a" },
  storeOrdersCellAction: { flex: 0.85, alignItems: "flex-end" },
  storeOrderMenuTrigger: {
    padding: 2,
    alignSelf: "flex-end",
  },
  storeOrderActionBtn: {
    backgroundColor: PRIMARY_YELLOW,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    alignSelf: "flex-start",
  },
  storeOrderActionBtnText: { fontSize: 12, fontWeight: "600", color: "#fff" },
  storeOrderViewBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    alignSelf: "flex-start",
  },
  storeOrderViewBtnText: { fontSize: 12, fontWeight: "600", color: PRIMARY_YELLOW },
  storeOrdersEmptyRow: {
    paddingVertical: 24,
    paddingHorizontal: 12,
    alignItems: "center",
  },
  storeOrdersEmptyText: { fontSize: 14, color: "#6b7280" },
  storeCarouselContent: {
    paddingLeft: HOME_PADDING,
    paddingRight: HOME_PADDING - STORE_CARD_MARGIN,
    paddingBottom: 8,
  },
  storeCard: {
    width: STORE_CARD_WIDTH,
    backgroundColor: "#fff",
    borderRadius: 14,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#f3f4f6",
  },
  storeCardImageWrap: {
    width: "100%",
    height: 92,
    backgroundColor: "#f3f4f6",
  },
  storeCardImage: { width: "100%", height: "100%" },
  storeCardPlaceholder: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  storeCardPlaceholderIcon: { fontSize: 32 },
  storeCardBadge: {
    position: "absolute",
    top: 6,
    right: 6,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
  },
  storeCardBadgeOpen: { backgroundColor: "rgba(5,150,105,0.95)" },
  storeCardBadgeClosed: { backgroundColor: "rgba(107,114,128,0.9)" },
  storeCardBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#fff",
  },
  storeCardName: {
    fontSize: 13,
    fontWeight: "600",
    color: "#111",
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  showAllStoresCard: {
    width: STORE_CARD_WIDTH,
    backgroundColor: "#fffbeb",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#fef3c7",
    borderStyle: "dashed",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 20,
    paddingHorizontal: 12,
  },
  showAllStoresCardText: {
    fontSize: 14,
    fontWeight: "600",
    color: PRIMARY_YELLOW,
  },
  showAllStoresChevron: {
    fontSize: 18,
    fontWeight: "600",
    color: PRIMARY_YELLOW,
    marginTop: 4,
  },
  dishCarouselContent: {
    paddingHorizontal: HOME_PADDING,
    paddingBottom: 8,
  },
  dishCard: {
    width: DISH_CARD_WIDTH,
    backgroundColor: "#fff",
    borderRadius: 14,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#f3f4f6",
  },
  dishCardImageWrap: {
    width: "100%",
    height: 100,
    backgroundColor: "#f3f4f6",
  },
  dishCardImage: { width: "100%", height: "100%" },
  dishCardPlaceholder: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  dishCardPlaceholderIcon: { fontSize: 32 },
  dishCardPriceBadge: {
    position: "absolute",
    bottom: 6,
    left: 6,
    backgroundColor: "rgba(0,0,0,0.7)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  dishCardPriceBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#fff",
  },
  dishCardBody: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 10,
    gap: 10,
  },
  dishCardTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  dishCardName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111",
  },
  dishCardStore: {
    fontSize: 11,
    color: "#6b7280",
    marginTop: 2,
  },
  dishCardPlusBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: PRIMARY_YELLOW,
    alignItems: "center",
    justifyContent: "center",
  },
  dishCardPlusBtnPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.96 }],
  },
  carouselSkeleton: {
    height: 140,
    justifyContent: "center",
    alignItems: "center",
  },
  recentOrdersHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 20,
  },
  recentOrdersEmpty: {
    paddingVertical: 20,
    alignItems: "center",
  },
  recentOrdersEmptyText: {
    fontSize: 14,
    color: "#6b7280",
    marginBottom: 10,
  },
  recentOrdersEmptyBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  recentOrdersEmptyBtnText: {
    fontSize: 14,
    fontWeight: "600",
    color: PRIMARY_YELLOW,
  },
  recentOrderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#fff",
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: "#f0f0f0",
  },
  recentOrderLeft: { flex: 1, minWidth: 0 },
  recentOrderRight: { alignItems: "flex-end" },
  recentOrderId: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111",
  },
  recentOrderMeta: {
    fontSize: 12,
    color: "#6b7280",
    marginTop: 2,
  },
  recentOrderAmount: {
    fontSize: 14,
    fontWeight: "600",
    color: PRIMARY_YELLOW,
  },
  recentOrderTime: {
    fontSize: 11,
    color: "#9ca3af",
    marginTop: 2,
  },
  homeEmpty: {
    paddingVertical: 48,
    alignItems: "center",
  },
  homeEmptyIcon: { fontSize: 40, marginBottom: 12 },
  homeEmptyText: {
    fontSize: 17,
    fontWeight: "600",
    color: "#374151",
  },
  homeEmptySubtext: {
    fontSize: 14,
    color: "#9ca3af",
    marginTop: 4,
  },
  storeRowCard: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 14,
    overflow: "hidden",
    marginBottom: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#f3f4f6",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  storeRowImageWrap: {
    width: 96,
    height: 96,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#f3f4f6",
  },
  storeRowImage: {
    width: "100%",
    height: "100%",
  },
  storeRowImagePlaceholder: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#e5e7eb",
  },
  storeRowPlaceholderIcon: { fontSize: 28 },
  storeRowBadge: {
    position: "absolute",
    top: 6,
    right: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  storeRowBadgeOpen: { backgroundColor: "rgba(5,150,105,0.95)" },
  storeRowBadgeClosed: { backgroundColor: "rgba(107,114,128,0.9)" },
  storeRowBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#fff",
  },
  storeRowBody: {
    flex: 1,
    marginLeft: 14,
    justifyContent: "space-between",
    minWidth: 0,
  },
  storeRowName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111",
  },
  storeRowMeta: {
    fontSize: 13,
    color: "#6b7280",
    marginTop: 2,
  },
  storeRowAction: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    gap: 4,
  },
  storeRowActionText: {
    fontSize: 14,
    fontWeight: "600",
    color: PRIMARY_YELLOW,
  },
  storeRowActionChevron: {
    fontSize: 16,
    fontWeight: "600",
    color: PRIMARY_YELLOW,
  },
  promoBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#fffbeb",
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: "#fef3c7",
  },
  promoTextWrap: { flex: 1, marginRight: 14 },
  promoTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1f2937",
  },
  promoSubtitle: {
    fontSize: 13,
    color: "#6b7280",
    marginTop: 2,
  },
  promoScooterWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#fde68a",
  },
  promoScooter: { fontSize: 24 },
  // Stores (rider empty, etc.)
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
  // Restaurant dashboard
  dashboardCard: {
    margin: 16,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 3,
  },
  storeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 8,
  },
  storeName: { fontSize: 20, fontWeight: "600", color: "#111" },
  storeDesc: { fontSize: 14, color: "#6b7280", marginTop: 8 },
  actionGrid: { marginTop: 20, gap: 12 },
  actionBtn: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  actionBtnPrimary: { backgroundColor: "#ed751a", borderColor: "#ed751a" },
  actionBtnText: { fontSize: 16, fontWeight: "500", color: "#374151" },
  actionBtnTextPrimary: { fontSize: 16, fontWeight: "600", color: "#fff" },
  primaryButton: {
    backgroundColor: "#ed751a",
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  primaryButtonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  // Rider
  orderCard: {
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
  orderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  orderId: { fontSize: 16, fontWeight: "600", color: "#111" },
  orderTime: { fontSize: 14, color: "#6b7280" },
  orderAmount: {
    fontSize: 18,
    fontWeight: "600",
    color: "#ed751a",
    marginTop: 8,
  },
  orderBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#fef3c7",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginTop: 8,
  },
  orderBadgeText: {
    fontSize: 12,
    fontWeight: "500",
    color: "#92400e",
    textTransform: "capitalize",
  },
  orderActions: { flexDirection: "row", gap: 12, marginTop: 12 },
  orderOutlineBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#d1d5db",
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
  },
  orderOutlineBtnText: { fontSize: 14, color: "#374151", fontWeight: "500" },
  orderPrimaryBtn: {
    flex: 1,
    backgroundColor: "#ed751a",
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
  },
  orderPrimaryBtnText: { color: "#fff", fontSize: 14, fontWeight: "600" },
  btnDisabled: { opacity: 0.7 },
});
