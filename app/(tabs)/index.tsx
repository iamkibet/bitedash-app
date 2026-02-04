import { getApiMessage } from "@/lib/api/client";
import { listFavourites } from "@/lib/api/favourites";
import { listMenuItemsByStore } from "@/lib/api/menuItems";
import {
  acceptOrder,
  listAvailableOrders,
  listMyRestaurantOrders,
  listMyRiderOrders,
  listOrders,
} from "@/lib/api/orders";
import { getMyStore, listStores } from "@/lib/api/stores";
import {
  ORDER_STATUS_LABELS,
  STORE_STATUS_LABELS,
} from "@/lib/constants";
import { useAuthStore } from "@/lib/store/authStore";
import { useCartStore } from "@/lib/store/cartStore";
import { useDeliveryLocationStore } from "@/lib/store/deliveryLocationStore";
import { formatKES, formatRelative } from "@/lib/utils/formatters";
import type { Favourite, MenuItem, Order, Store } from "@/types/api";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
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

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Open stores</Text>
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
                <Text style={styles.sectionTitle}>Order now</Text>
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
              <View style={[styles.sectionHeader, styles.recentOrdersHeader]}>
                <Text style={styles.sectionTitle}>Your favourites</Text>
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

          <View style={[styles.sectionHeader, styles.recentOrdersHeader]}>
            <Text style={styles.sectionTitle}>Recent orders</Text>
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

/** Restaurant: My Store dashboard + recent orders */
function HomeRestaurant() {
  const router = useRouter();
  const [store, setStore] = useState<Store | null>(null);
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [notFound, setNotFound] = useState(false);

  const load = (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    else setRefreshing(true);
    getMyStore()
      .then((s) => {
        setStore(s);
        listMyRestaurantOrders({ page: 1 })
          .then((res) => setRecentOrders(res.data.slice(0, 5)))
          .catch(() => {});
      })
      .catch((e) => {
        if (e.response?.status === 404) setNotFound(true);
        else Alert.alert("Error", getApiMessage(e));
      })
      .finally(() => {
        setLoading(false);
        setRefreshing(false);
      });
  };

  useEffect(() => {
    load();
  }, []);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#ed751a" />
      </View>
    );
  }

  if (notFound || !store) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>My Store</Text>
          <Text style={styles.subtitle}>
            Set up your restaurant on BiteDash
          </Text>
        </View>
        <View style={styles.centered}>
          <Text style={styles.emptyText}>You don&apos;t have a store yet.</Text>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => router.push("/restaurant/edit")}
          >
            <Text style={styles.primaryButtonText}>Create restaurant</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.restaurantScroll}
        contentContainerStyle={styles.restaurantScrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => load(true)}
            tintColor={PRIMARY_YELLOW}
          />
        }
      >
        <View style={styles.header}>
          <Text style={styles.title}>My Store</Text>
          <Text style={styles.subtitle}>{store.name}</Text>
        </View>
        <View style={styles.dashboardCard}>
          <View style={styles.storeRow}>
            <Text style={styles.storeName}>{store.name}</Text>
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
          <Text style={styles.storeDesc}>
            {store.description ?? store.location}
          </Text>
          <View style={styles.actionGrid}>
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => router.push("/restaurant/edit")}
            >
              <Text style={styles.actionBtnText}>Edit store</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, styles.actionBtnPrimary]}
              onPress={() => router.push("/restaurant/menu")}
            >
              <Text style={styles.actionBtnTextPrimary}>Manage menu</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => router.push("/restaurant/orders")}
            >
              <Text style={styles.actionBtnText}>View orders</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.restaurantSectionHeader}>
          <Text style={styles.sectionTitle}>Recent orders</Text>
          <TouchableOpacity
            onPress={() => router.push("/restaurant/orders")}
            hitSlop={8}
          >
            <Text style={styles.sectionLink}>View all</Text>
          </TouchableOpacity>
        </View>
        {recentOrders.length === 0 ? (
          <View style={styles.recentOrdersEmptyRestaurant}>
            <Text style={styles.recentOrdersEmptyText}>No orders yet</Text>
          </View>
        ) : (
          recentOrders.map((order) => (
            <TouchableOpacity
              key={order.id}
              style={styles.recentOrderRow}
              onPress={() => router.push(`/restaurant/orders/${order.id}`)}
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
  const user = useAuthStore((s) => s.user);
  const role = user?.role ?? "customer";

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
    marginTop: 24,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111",
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
