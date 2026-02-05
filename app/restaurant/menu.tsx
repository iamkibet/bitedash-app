import { MenuItemImage } from "@/components/ui/menu-item-image";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { getApiMessage } from "@/lib/api/client";
import {
  listMenuItemsByStore,
  toggleMenuItemAvailability,
} from "@/lib/api/menuItems";
import { getMyStore } from "@/lib/api/stores";
import { formatKES } from "@/lib/utils/formatters";
import type { MenuItem } from "@/types/api";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
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
import { useSafeAreaInsets } from "react-native-safe-area-context";

const ACCENT = "#f59e0b";
const PAD = 20;

export default function RestaurantMenuScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [togglingId, setTogglingId] = useState<number | null>(null);

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    try {
      const store = await getMyStore();
      const res = await listMenuItemsByStore(store.id, { page: 1 });
      setItems(res.data);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleToggle = async (id: number) => {
    try {
      setTogglingId(id);
      const updated = await toggleMenuItemAvailability(id);
      setItems((prev) => prev.map((i) => (i.id === id ? updated : i)));
    } catch (e) {
      Alert.alert("Error", getApiMessage(e));
    } finally {
      setTogglingId(null);
    }
  };

  const renderItem = ({ item }: { item: MenuItem }) => {
    const isToggling = togglingId === item.id;
    return (
      <View style={styles.card}>
        {/* Edit + Power icons - top right */}
        <View style={styles.iconRow}>
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => router.push(`/restaurant/menu/${item.id}/edit`)}
            hitSlop={8}
            activeOpacity={0.6}
          >
            <IconSymbol name="pencil" size={14} color="#64748b" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => handleToggle(item.id)}
            disabled={isToggling}
            hitSlop={8}
            activeOpacity={0.6}
          >
            {isToggling ? (
              <ActivityIndicator size="small" color={ACCENT} />
            ) : (
              <IconSymbol
                name="power"
                size={14}
                color={item.is_available ? "#22c55e" : "#94a3b8"}
              />
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.cardImageWrap}>
          <MenuItemImage
            imageUrl={item.image_url}
            style={styles.cardImage}
            placeholderIconSize={40}
          />
          {!item.is_available && (
            <View style={styles.unavailableOverlay}>
              <Text style={styles.unavailableText}>Unavailable</Text>
            </View>
          )}
        </View>
        <View style={styles.cardBody}>
          <Text style={styles.cardName} numberOfLines={2}>
            {item.name}
          </Text>
          <Text style={styles.cardPrice}>{formatKES(item.price)}</Text>
        </View>
      </View>
    );
  };

  const listPadding = { paddingBottom: Math.max(insets.bottom, 24) + 16 };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <View style={styles.headerTop}>
          <TouchableOpacity
            style={styles.headerBack}
            onPress={() => router.back()}
            hitSlop={12}
          >
            <IconSymbol name="chevron.left" size={24} color="#0f172a" />
          </TouchableOpacity>
          <Text style={styles.title}>Menu</Text>
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => router.push("/restaurant/menu/new")}
            activeOpacity={0.85}
          >
            <View style={styles.addBtnIconWrap}>
              <IconSymbol name="plus" size={14} color="#fff" />
            </View>
            <Text style={styles.addBtnText}>Add item</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.subtitle}>
          {items.length === 0
            ? "Add dishes and set prices"
            : `${items.length} item${items.length === 1 ? "" : "s"}`}
        </Text>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={ACCENT} />
        </View>
      ) : items.length === 0 ? (
        <View style={styles.emptyWrap}>
          <View style={styles.emptyIconWrap}>
            <IconSymbol name="menucard.fill" size={48} color="#cbd5e1" />
          </View>
          <Text style={styles.emptyTitle}>No menu items yet</Text>
          <Text style={styles.emptySubtext}>
            Add your first dish to start receiving orders.
          </Text>
          <TouchableOpacity
            style={styles.emptyAddBtn}
            onPress={() => router.push("/restaurant/menu/new")}
            activeOpacity={0.88}
          >
            <IconSymbol name="plus" size={20} color="#fff" />
            <Text style={styles.emptyAddBtnText}>Add item</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          contentContainerStyle={[styles.list, listPadding]}
          showsVerticalScrollIndicator={false}
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
  container: { flex: 1, backgroundColor: "#f8fafc" },
  header: {
    paddingHorizontal: PAD,
    paddingBottom: 20,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  headerTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  headerBack: { padding: 4 },
  title: { flex: 1, fontSize: 20, fontWeight: "700", color: "#0f172a" },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: ACCENT,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  addBtnIconWrap: {
    width: 22,
    height: 22,
    borderRadius: 6,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  addBtnText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  subtitle: { fontSize: 14, color: "#64748b", marginTop: 6 },

  list: { padding: PAD, paddingTop: 20 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },

  emptyWrap: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  emptyIconWrap: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: "#f1f5f9",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#0f172a",
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: "#64748b",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 24,
  },
  emptyAddBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: ACCENT,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  emptyAddBtnText: { color: "#fff", fontSize: 15, fontWeight: "600" },

  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    position: "relative",
  },
  iconRow: {
    position: "absolute",
    top: 10,
    right: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    zIndex: 2,
  },
  iconBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.95)",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 2,
    elevation: 2,
  },
  cardImageWrap: { position: "relative" },
  cardImage: {
    height: 160,
    width: "100%",
  },
  unavailableOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
  },
  unavailableText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#fff",
    letterSpacing: 0.5,
  },
  cardBody: { padding: 18 },
  cardName: { fontSize: 17, fontWeight: "600", color: "#0f172a" },
  cardPrice: {
    fontSize: 16,
    fontWeight: "600",
    color: ACCENT,
    marginTop: 6,
  },
});
