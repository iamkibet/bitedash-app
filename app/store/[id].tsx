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
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const ACCENT = "#f59e0b";
const ROW_IMAGE_SIZE = 64;
const CARD_RADIUS = 10;

export default function StoreDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [store, setStore] = useState<Store | null>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [favouriteIds, setFavouriteIds] = useState<Set<number>>(new Set());
  const [togglingFavId, setTogglingFavId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const addItem = useCartStore((s) => s.addItem);
  const { showAddedToCart } = useToast();

  useEffect(() => {
    if (!id) return;
    const numId = Number(id);
    getStore(numId)
      .then(setStore)
      .catch(() => setStore(null));
    listMenuItemsByStore(numId, { page: 1 })
      .then((res) => setMenuItems(res.data))
      .catch(() => setMenuItems([]));
    listFavourites({ page: 1 })
      .then((res) =>
        setFavouriteIds(new Set(res.data.map((f) => f.menu_item_id))),
      )
      .catch(() => setFavouriteIds(new Set()))
      .finally(() => setLoading(false));
  }, [id]);

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
        <ActivityIndicator size="small" color={ACCENT} />
      </View>
    );
  }

  if (!store) {
    return (
      <View style={styles.centered}>
        <Text style={styles.emptyText}>Store not found.</Text>
      </View>
    );
  }

  const headerTop = insets.top + (Platform.OS === "ios" ? 4 : 8);

  const renderItem = ({ item }: { item: MenuItem }) => {
    const isFav = favouriteIds.has(item.id);
    const isToggling = togglingFavId === item.id;
    return (
      <View style={styles.menuRow}>
        <View style={styles.menuRowImageWrap}>
          {item.image_url ? (
            <Image source={{ uri: item.image_url }} style={styles.menuRowImage} />
          ) : (
            <View style={styles.menuRowPlaceholder}>
              <Text style={styles.menuRowPlaceholderText}>🍽</Text>
            </View>
          )}
        </View>
        <View style={styles.menuRowBodyWrap}>
          <View style={styles.menuRowBody}>
            <Text style={styles.menuRowName} numberOfLines={1}>
              {item.name}
            </Text>
            <Text style={styles.menuRowPrice}>{formatKES(item.price)}</Text>
            <View style={styles.menuRowBadgeWrap}>
              <View
                style={[
                  styles.badge,
                  item.is_available ? styles.badgeAvail : styles.badgeUnavail,
                ]}
              >
                <Text style={styles.badgeText}>
                  {item.is_available ? "Available" : "Unavailable"}
                </Text>
              </View>
            </View>
            <View style={styles.menuRowActions}>
              <TouchableOpacity
                onPress={() => router.push(`/menu/${item.id}`)}
                hitSlop={8}
              >
                <Text style={styles.viewLink}>View details</Text>
              </TouchableOpacity>
              {item.is_available && (
                <TouchableOpacity
                  style={styles.addBtn}
                  onPress={() => {
                    addItem(item);
                    showAddedToCart();
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={styles.addBtnText}>Add</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
          <Pressable
            style={({ pressed }) => [
              styles.favBtn,
              pressed && styles.favBtnPressed,
            ]}
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
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Custom header: minimal back + title */}
      <View style={[styles.header, { paddingTop: headerTop }]}>
        <Pressable
          onPress={() => router.back()}
          style={styles.backBtn}
          hitSlop={12}
          accessibilityLabel="Go back"
        >
          <IconSymbol name="chevron.left" size={22} color="#374151" />
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {store.name}
        </Text>
        <View style={styles.backBtn} />
      </View>

      {/* Compact store strip (no big hero) */}
      <View style={styles.storeStrip}>
        {store.image_url ? (
          <Image source={{ uri: store.image_url }} style={styles.storeStripImg} />
        ) : (
          <View style={[styles.storeStripImg, styles.storeStripPlaceholder]}>
            <Text style={styles.placeholderText}>Store</Text>
          </View>
        )}
        <View style={styles.storeStripInfo}>
          <Text style={styles.storeStripName} numberOfLines={1}>
            {store.name}
          </Text>
          <Text style={styles.storeStripDesc} numberOfLines={1}>
            {store.description ?? store.location}
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
      </View>

      <Text style={styles.sectionTitle}>Menu</Text>
      {menuItems.length === 0 ? (
        <Text style={styles.emptyMenu}>No menu items yet.</Text>
      ) : (
        <FlatList
          data={menuItems}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fafafa" },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  emptyText: { color: "#6b7280", fontSize: 14 },
  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 4,
    paddingBottom: 10,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  backBtn: {
    width: 44,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: "600",
    color: "#111",
    textAlign: "center",
  },
  // Store strip (compact, not a big hero)
  storeStrip: {
    flexDirection: "row",
    backgroundColor: "#fff",
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  storeStripImg: {
    width: 80,
    height: 80,
    borderRadius: 10,
    backgroundColor: "#f0f0f0",
  },
  storeStripPlaceholder: {
    justifyContent: "center",
    alignItems: "center",
  },
  placeholderText: { color: "#9ca3af", fontSize: 12 },
  storeStripInfo: {
    flex: 1,
    marginLeft: 12,
    justifyContent: "center",
    minWidth: 0,
  },
  storeStripName: { fontSize: 16, fontWeight: "600", color: "#111" },
  storeStripDesc: { fontSize: 12, color: "#6b7280", marginTop: 2 },
  badge: {
    alignSelf: "flex-start",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 6,
  },
  badgeOpen: { backgroundColor: "#dcfce7" },
  badgeClosed: { backgroundColor: "#f1f5f9" },
  badgeAvail: { backgroundColor: "#dcfce7" },
  badgeUnavail: { backgroundColor: "#f1f5f9" },
  badgeText: { fontSize: 11, fontWeight: "500", color: "#374151" },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#6b7280",
    marginTop: 16,
    marginBottom: 8,
    marginHorizontal: 16,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  list: { paddingHorizontal: 16, paddingBottom: 24 },
  emptyMenu: { color: "#6b7280", fontSize: 14, marginHorizontal: 16 },
  // Menu row
  menuRow: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: CARD_RADIUS,
    padding: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#f0f0f0",
  },
  menuRowImageWrap: {
    width: ROW_IMAGE_SIZE,
    height: ROW_IMAGE_SIZE,
    borderRadius: 8,
    overflow: "hidden",
    backgroundColor: "#f0f0f0",
  },
  menuRowImage: { width: "100%", height: "100%" },
  menuRowPlaceholder: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  menuRowPlaceholderText: { fontSize: 24 },
  menuRowBodyWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "flex-start",
    marginLeft: 12,
    minWidth: 0,
  },
  menuRowBody: { flex: 1, minWidth: 0 },
  favBtn: {
    padding: 6,
    marginTop: 2,
  },
  favBtnPressed: { opacity: 0.7 },
  menuRowName: { fontSize: 15, fontWeight: "600", color: "#111" },
  menuRowPrice: { fontSize: 13, color: ACCENT, fontWeight: "600", marginTop: 2 },
  menuRowBadgeWrap: { marginTop: 4 },
  menuRowActions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 8,
    gap: 8,
  },
  viewLink: { fontSize: 13, color: ACCENT, fontWeight: "500" },
  addBtn: {
    backgroundColor: ACCENT,
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 6,
  },
  addBtnText: { fontSize: 13, fontWeight: "600", color: "#fff" },
});
