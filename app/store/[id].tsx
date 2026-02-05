import { MenuItemImage } from "@/components/ui/menu-item-image";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { getApiMessage } from "@/lib/api/client";
import { addFavourite, listFavourites, removeFavourite } from "@/lib/api/favourites";
import { listMenuItemsByStore } from "@/lib/api/menuItems";
import { getStore } from "@/lib/api/stores";
import { STORE_STATUS_LABELS } from "@/lib/constants";
import { useToast } from "@/lib/contexts/ToastContext";
import { useCartStore } from "@/lib/store/cartStore";
import { formatKES } from "@/lib/utils/formatters";
import type { MenuItem, Store } from "@/types/api";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const ACCENT = "#f59e0b";
const PAD = 20;

export default function StoreDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [store, setStore] = useState<Store | null>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [favouriteIds, setFavouriteIds] = useState<Set<number>>(new Set());
  const [togglingFavId, setTogglingFavId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const addItem = useCartStore((s) => s.addItem);
  const { showAddedToCart } = useToast();

  const load = useCallback(
    async (refresh = false) => {
      if (!id) return;
      const numId = Number(id);
      if (refresh) setRefreshing(true);
      else setLoading(true);
      try {
        const [storeData, menuRes, favRes] = await Promise.all([
          getStore(numId),
          listMenuItemsByStore(numId, { page: 1 }),
          listFavourites({ page: 1 }),
        ]);
        setStore(storeData);
        setMenuItems(menuRes.data);
        setFavouriteIds(new Set(favRes.data.map((f) => f.menu_item_id)));
      } catch {
        setStore(null);
        setMenuItems([]);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [id]
  );

  useEffect(() => {
    load();
  }, [load]);

  const toggleFavourite = async (menuItemId: number) => {
    const isFav = favouriteIds.has(menuItemId);
    setTogglingFavId(menuItemId);
    try {
      if (isFav) {
        await removeFavourite(menuItemId);
        setFavouriteIds((prev) => {
          const next = new Set(prev);
          next.delete(menuItemId);
          return next;
        });
      } else {
        await addFavourite(menuItemId);
        setFavouriteIds((prev) => new Set(prev).add(menuItemId));
      }
    } catch (e) {
      const { Alert } = await import("react-native");
      Alert.alert("Error", getApiMessage(e));
    } finally {
      setTogglingFavId(null);
    }
  };

  if (loading && !store) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={ACCENT} />
      </View>
    );
  }

  if (!store) {
    return (
      <View style={[styles.centered, styles.container]}>
        <View style={styles.emptyIconWrap}>
          <IconSymbol name="storefront.fill" size={48} color="#cbd5e1" />
        </View>
        <Text style={styles.emptyText}>Store not found.</Text>
        <TouchableOpacity style={styles.emptyBackBtn} onPress={() => router.back()}>
          <Text style={styles.emptyBackBtnText}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const listPadding = { paddingBottom: Math.max(insets.bottom, 24) + 16 };

  const renderItem = ({ item }: { item: MenuItem }) => {
    const isFav = favouriteIds.has(item.id);
    const isToggling = togglingFavId === item.id;
    return (
      <View style={styles.card}>
        <View style={styles.cardImageWrap}>
          <MenuItemImage
            imageUrl={item.image_url}
            style={styles.cardImage}
            placeholderIconSize={40}
          />
          <View
            style={[
              styles.availPill,
              !item.is_available && styles.availPillOff,
            ]}
          >
            <Text
              style={[
                styles.availPillText,
                !item.is_available && styles.availPillTextOff,
              ]}
            >
              {item.is_available ? "Available" : "Unavailable"}
            </Text>
          </View>
        </View>
        <View style={styles.cardBody}>
          <Text style={styles.cardName} numberOfLines={2}>
            {item.name}
          </Text>
          <Text style={styles.cardPrice}>{formatKES(item.price)}</Text>
          <View style={styles.cardActions}>
            <TouchableOpacity
              style={styles.viewBtn}
              onPress={() => router.push(`/menu/${item.id}`)}
              activeOpacity={0.8}
            >
              <Text style={styles.viewBtnText}>View details</Text>
            </TouchableOpacity>
            {item.is_available && (
              <TouchableOpacity
                style={styles.addBtn}
                onPress={() => {
                  addItem(item);
                  showAddedToCart();
                }}
                activeOpacity={0.88}
              >
                <Text style={styles.addBtnText}>Add to cart</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
        <Pressable
          style={({ pressed }) => [styles.favBtn, pressed && styles.favBtnPressed]}
          onPress={() => toggleFavourite(item.id)}
          disabled={isToggling}
          hitSlop={8}
        >
          {isToggling ? (
            <ActivityIndicator size="small" color="#e11d48" />
          ) : (
            <IconSymbol
              name={isFav ? "heart.fill" : "heart"}
              size={22}
              color={isFav ? "#e11d48" : "#9ca3af"}
            />
          )}
        </Pressable>
      </View>
    );
  };

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
        <Text style={styles.headerTitle} numberOfLines={1}>
          {store.name}
        </Text>
        <View style={styles.headerRight} />
      </View>

      <FlatList
        data={menuItems}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}
        contentContainerStyle={[styles.list, listPadding]}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <>
            {/* Store hero */}
            <View style={styles.hero}>
              <View style={styles.heroImageWrap}>
                <MenuItemImage
                  imageUrl={store.image_url}
                  style={styles.heroImage}
                  placeholderIcon="storefront.fill"
                  placeholderIconSize={48}
                />
                <View
                  style={[
                    styles.storeBadge,
                    store.is_open ? styles.storeBadgeOpen : styles.storeBadgeClosed,
                  ]}
                >
                  <Text style={styles.storeBadgeText}>
                    {store.is_open
                      ? STORE_STATUS_LABELS.open
                      : STORE_STATUS_LABELS.closed}
                  </Text>
                </View>
              </View>
              <View style={styles.heroInfo}>
                <Text style={styles.heroName}>{store.name}</Text>
                {(store.description || store.location) && (
                  <Text style={styles.heroDesc} numberOfLines={2}>
                    {store.description ?? store.location}
                  </Text>
                )}
              </View>
            </View>

            {/* Menu section header */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Menu</Text>
              {menuItems.length > 0 && (
                <Text style={styles.sectionCount}>
                  {menuItems.length} item{menuItems.length === 1 ? "" : "s"}
                </Text>
              )}
            </View>

            {menuItems.length === 0 && (
              <View style={styles.emptyMenuWrap}>
                <View style={styles.emptyMenuIconWrap}>
                  <IconSymbol name="menucard.fill" size={40} color="#cbd5e1" />
                </View>
                <Text style={styles.emptyMenuTitle}>No menu items yet</Text>
                <Text style={styles.emptyMenuSubtext}>
                  This store hasn&apos;t added any dishes. Check back later.
                </Text>
              </View>
            )}
          </>
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => load(true)}
            tintColor={ACCENT}
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },

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
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: "700",
    color: "#0f172a",
  },
  headerRight: { width: 36 },

  emptyIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#f1f5f9",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  emptyText: { fontSize: 16, color: "#64748b", marginBottom: 8 },
  emptyBackBtn: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    marginTop: 8,
  },
  emptyBackBtnText: { fontSize: 15, fontWeight: "600", color: ACCENT },

  hero: {
    backgroundColor: "#fff",
    marginHorizontal: PAD,
    marginTop: 20,
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
  heroImageWrap: {
    position: "relative",
    height: 160,
  },
  heroImage: {
    width: "100%",
    height: "100%",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  storeBadge: {
    position: "absolute",
    top: 12,
    right: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  storeBadgeOpen: { backgroundColor: "rgba(34, 197, 94, 0.95)" },
  storeBadgeClosed: { backgroundColor: "rgba(100, 116, 139, 0.9)" },
  storeBadgeText: { fontSize: 12, fontWeight: "600", color: "#fff" },
  heroInfo: { padding: PAD },
  heroName: { fontSize: 20, fontWeight: "700", color: "#0f172a" },
  heroDesc: {
    fontSize: 14,
    color: "#64748b",
    marginTop: 6,
    lineHeight: 20,
  },

  sectionHeader: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    marginTop: 24,
    marginBottom: 12,
    marginHorizontal: PAD,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0f172a",
  },
  sectionCount: {
    fontSize: 13,
    color: "#64748b",
  },

  emptyMenuWrap: {
    alignItems: "center",
    paddingVertical: 40,
    paddingHorizontal: 32,
  },
  emptyMenuIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#f1f5f9",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  emptyMenuTitle: {
    fontSize: 17,
    fontWeight: "600",
    color: "#334155",
    marginBottom: 6,
  },
  emptyMenuSubtext: {
    fontSize: 14,
    color: "#94a3b8",
    textAlign: "center",
    lineHeight: 20,
  },

  list: { paddingHorizontal: PAD },
  card: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 14,
    overflow: "hidden",
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 2,
  },
  cardImageWrap: {
    position: "relative",
    width: 100,
    height: 100,
  },
  cardImage: {
    width: "100%",
    height: "100%",
    backgroundColor: "#f1f5f9",
  },
  availPill: {
    position: "absolute",
    bottom: 6,
    left: 6,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: "rgba(34, 197, 94, 0.95)",
  },
  availPillOff: { backgroundColor: "rgba(100, 116, 139, 0.9)" },
  availPillText: { fontSize: 10, fontWeight: "600", color: "#fff" },
  availPillTextOff: { color: "#fff" },
  cardBody: {
    flex: 1,
    padding: 14,
    minWidth: 0,
  },
  cardName: { fontSize: 16, fontWeight: "600", color: "#0f172a" },
  cardPrice: { fontSize: 15, fontWeight: "600", color: ACCENT, marginTop: 4 },
  cardActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 10,
  },
  viewBtn: { paddingVertical: 4 },
  viewBtnText: { fontSize: 13, fontWeight: "600", color: ACCENT },
  addBtn: {
    backgroundColor: ACCENT,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  addBtnText: { fontSize: 13, fontWeight: "600", color: "#fff" },
  favBtn: {
    padding: 12,
    justifyContent: "center",
  },
  favBtnPressed: { opacity: 0.7 },
});
