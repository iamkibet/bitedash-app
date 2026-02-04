import { IconSymbol } from "@/components/ui/icon-symbol";
import { getApiMessage } from "@/lib/api/client";
import { listFavourites, removeFavourite } from "@/lib/api/favourites";
import { useCartStore } from "@/lib/store/cartStore";
import { formatKES } from "@/lib/utils/formatters";
import type { Favourite } from "@/types/api";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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

const ACCENT = "#f59e0b";
const ROW_IMAGE_SIZE = 72;

function FavouritesHeader({ onBack }: { onBack: () => void }) {
  const insets = useSafeAreaInsets();
  const top = insets.top + (Platform.OS === "ios" ? 4 : 8);

  return (
    <View style={[styles.header, { paddingTop: top }]}>
      <Pressable
        onPress={onBack}
        style={styles.backBtn}
        hitSlop={12}
        accessibilityLabel="Go back"
      >
        <IconSymbol name="chevron.left" size={20} color="#374151" />
      </Pressable>
      <Text style={styles.headerTitle}>Favourites</Text>
      <View style={styles.headerSpacer} />
    </View>
  );
}

export default function FavouritesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const addToCart = useCartStore((s) => s.addItem);
  const [favourites, setFavourites] = useState<Favourite[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [removingId, setRemovingId] = useState<number | null>(null);

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    try {
      const res = await listFavourites({ page: 1 });
      setFavourites(res.data);
    } catch {
      setFavourites([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleRemove = async (menuItemId: number) => {
    try {
      setRemovingId(menuItemId);
      await removeFavourite(menuItemId);
      setFavourites((prev) =>
        prev.filter((f) => f.menu_item_id !== menuItemId),
      );
    } catch (e) {
      Alert.alert("Error", getApiMessage(e));
    } finally {
      setRemovingId(null);
    }
  };

  const footerBottom = Math.max(insets.bottom, 20);

  if (loading) {
    return (
      <View style={styles.container}>
        <FavouritesHeader onBack={() => router.back()} />
        <View style={styles.centered}>
          <ActivityIndicator size="small" color={ACCENT} />
        </View>
      </View>
    );
  }

  if (favourites.length === 0) {
    return (
      <View style={styles.container}>
        <FavouritesHeader onBack={() => router.back()} />
        <View style={styles.emptyWrap}>
          <View style={styles.emptyIconWrap}>
            <IconSymbol name="heart" size={40} color="#d1d5db" />
          </View>
          <Text style={styles.emptyTitle}>No favourites yet</Text>
          <Text style={styles.emptySubtext}>
            Save items you love and they’ll show up here for quick reordering.
          </Text>
          <TouchableOpacity
            style={styles.emptyBtn}
            onPress={() => router.push("/(tabs)/stores")}
            activeOpacity={0.88}
          >
            <Text style={styles.emptyBtnText}>Browse stores</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FavouritesHeader onBack={() => router.back()} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: footerBottom }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => load(true)}
            tintColor={ACCENT}
          />
        }
      >
        <Text style={styles.countLabel}>
          {favourites.length} {favourites.length === 1 ? "item" : "items"}
        </Text>

        {favourites.map((fav) => {
          const item = fav.menu_item;
          const storeName = item.restaurant?.name;
          const isRemoving = removingId === fav.menu_item_id;

          return (
            <View key={fav.id} style={styles.card}>
              <View style={styles.cardRow}>
                <TouchableOpacity
                  style={styles.cardTouchable}
                  onPress={() => router.push(`/menu/${item.id}`)}
                  activeOpacity={0.9}
                >
                  <View style={styles.cardImageWrap}>
                    {item.image_url ? (
                      <Image
                        source={{ uri: item.image_url }}
                        style={styles.cardImage}
                      />
                    ) : (
                      <View style={styles.cardImagePlaceholder}>
                        <Text style={styles.cardImagePlaceholderText}>🍽</Text>
                      </View>
                    )}
                  </View>
                  <View style={styles.cardBody}>
                    <Text style={styles.cardName} numberOfLines={2}>
                      {item.name}
                    </Text>
                    {storeName ? (
                      <Text style={styles.cardStore} numberOfLines={1}>
                        {storeName}
                      </Text>
                    ) : null}
                    <Text style={styles.cardPrice}>{formatKES(item.price)}</Text>
                  </View>
                </TouchableOpacity>
              </View>
              <View style={styles.cardActions}>
                <TouchableOpacity
                  style={styles.addToCartBtn}
                  onPress={() => {
                    addToCart(item);
                    router.push("/cart");
                  }}
                  activeOpacity={0.88}
                >
                  <Text style={styles.addToCartBtnText}>Add to cart</Text>
                </TouchableOpacity>
                <Pressable
                  style={({ pressed }) => [
                    styles.removeWrap,
                    pressed && styles.removeWrapPressed,
                  ]}
                  onPress={() => handleRemove(fav.menu_item_id)}
                  disabled={isRemoving}
                >
                  {isRemoving ? (
                    <ActivityIndicator size="small" color="#9ca3af" />
                  ) : (
                    <IconSymbol
                      name="heart.fill"
                      size={18}
                      color="#e11d48"
                    />
                  )}
                </Pressable>
              </View>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fafafa" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 4,
    paddingBottom: 12,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  headerSpacer: {
    width: 40,
    height: 40,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "600",
    color: "#111",
  },
  scroll: { flex: 1 },
  scrollContent: { padding: 16 },
  countLabel: {
    fontSize: 13,
    color: "#6b7280",
    marginBottom: 12,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyWrap: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  emptyIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#f3f4f6",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 18,
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
    marginBottom: 24,
  },
  emptyBtn: {
    backgroundColor: ACCENT,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  emptyBtnText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#fff",
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#f0f0f0",
    overflow: "hidden",
    padding: 12,
  },
  cardRow: { flexDirection: "row" },
  cardTouchable: {
    flex: 1,
    flexDirection: "row",
    minWidth: 0,
  },
  cardImageWrap: {
    width: ROW_IMAGE_SIZE,
    height: ROW_IMAGE_SIZE,
    borderRadius: 10,
    overflow: "hidden",
    backgroundColor: "#f3f4f6",
  },
  cardImage: { width: "100%", height: "100%" },
  cardImagePlaceholder: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  cardImagePlaceholderText: { fontSize: 28 },
  cardBody: {
    flex: 1,
    marginLeft: 12,
    minWidth: 0,
    justifyContent: "center",
  },
  cardName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111",
  },
  cardStore: {
    fontSize: 12,
    color: "#6b7280",
    marginTop: 2,
  },
  cardPrice: {
    fontSize: 14,
    fontWeight: "600",
    color: ACCENT,
    marginTop: 4,
  },
  cardActions: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#f3f4f6",
    gap: 10,
  },
  addToCartBtn: {
    backgroundColor: ACCENT,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  addToCartBtnText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#fff",
  },
  removeWrap: {
    padding: 6,
  },
  removeWrapPressed: { opacity: 0.7 },
});
