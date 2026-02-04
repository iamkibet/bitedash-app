import { IconSymbol } from "@/components/ui/icon-symbol";
import { getApiMessage } from "@/lib/api/client";
import { addFavourite, listFavourites, removeFavourite } from "@/lib/api/favourites";
import { getMenuItem } from "@/lib/api/menuItems";
import { useToast } from "@/lib/contexts/ToastContext";
import { useCartStore } from "@/lib/store/cartStore";
import { formatKES } from "@/lib/utils/formatters";
import type { MenuItem } from "@/types/api";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const ACCENT = "#f59e0b";

function MenuItemHeader({
  title,
  onBack,
  rightContent,
}: {
  title: string;
  onBack: () => void;
  rightContent?: React.ReactNode;
}) {
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
        <IconSymbol name="chevron.left" size={22} color="#374151" />
      </Pressable>
      <Text style={styles.headerTitle} numberOfLines={1}>
        {title}
      </Text>
      <View style={styles.backBtn}>{rightContent}</View>
    </View>
  );
}

export default function MenuItemDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [item, setItem] = useState<MenuItem | null>(null);
  const [isFav, setIsFav] = useState(false);
  const [togglingFav, setTogglingFav] = useState(false);
  const [loading, setLoading] = useState(true);
  const addItem = useCartStore((s) => s.addItem);
  const { showAddedToCart } = useToast();

  useEffect(() => {
    if (!id) return;
    const numId = Number(id);
    Promise.all([getMenuItem(numId), listFavourites({ page: 1 })])
      .then(([menuItem, favRes]) => {
        setItem(menuItem);
        setIsFav(favRes.data.some((f) => f.menu_item_id === numId));
      })
      .catch(() => setItem(null))
      .finally(() => setLoading(false));
  }, [id]);

  const toggleFavourite = async () => {
    if (!item) return;
    setTogglingFav(true);
    try {
      if (isFav) {
        await removeFavourite(item.id);
        setIsFav(false);
      } else {
        await addFavourite(item.id);
        setIsFav(true);
      }
    } catch (e) {
      Alert.alert("Error", getApiMessage(e));
    } finally {
      setTogglingFav(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.centered}>
          <ActivityIndicator size="small" color={ACCENT} />
        </View>
      </View>
    );
  }

  if (!item) {
    return (
      <View style={styles.container}>
        <View style={styles.centered}>
          <Text style={styles.emptyText}>Item not found.</Text>
          <TouchableOpacity
            style={styles.backLink}
            onPress={() => router.back()}
          >
            <Text style={styles.backLinkText}>Go back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MenuItemHeader
        title={item.name}
        onBack={() => router.back()}
        rightContent={
          <Pressable
            style={({ pressed }) => [styles.favBtn, pressed && styles.favBtnPressed]}
            onPress={toggleFavourite}
            disabled={togglingFav}
            hitSlop={8}
          >
            {togglingFav ? (
              <ActivityIndicator size="small" color="#e11d48" />
            ) : (
              <IconSymbol
                name={isFav ? "heart.fill" : "heart"}
                size={24}
                color={isFav ? "#e11d48" : "#9ca3af"}
              />
            )}
          </Pressable>
        }
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.imageWrap}>
          {item.image_url ? (
            <Image source={{ uri: item.image_url }} style={styles.image} />
          ) : (
            <View style={styles.imagePlaceholder}>
              <Text style={styles.placeholderIcon}>🍽</Text>
            </View>
          )}
          <View style={styles.priceBadge}>
            <Text style={styles.priceBadgeText}>{formatKES(item.price)}</Text>
          </View>
        </View>

        <View style={styles.body}>
          <View style={styles.metaRow}>
            <View
              style={[
                styles.availPill,
                item.is_available ? styles.availPillOn : styles.availPillOff,
              ]}
            >
              <Text
                style={[
                  styles.availPillText,
                  item.is_available ? styles.availPillTextOn : styles.availPillTextOff,
                ]}
              >
                {item.is_available ? "Available" : "Unavailable"}
              </Text>
            </View>
          </View>

          {item.description ? (
            <Text style={styles.desc}>{item.description}</Text>
          ) : null}

          {item.restaurant ? (
            <TouchableOpacity
              style={styles.storeLink}
              onPress={() => router.push(`/store/${item.restaurant.id}`)}
              activeOpacity={0.8}
            >
              <Text style={styles.storeLinkLabel}>From </Text>
              <Text style={styles.storeLinkName}>{item.restaurant.name}</Text>
              <Text style={styles.storeLinkChevron}> ›</Text>
            </TouchableOpacity>
          ) : null}

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
  favBtn: { padding: 4 },
  favBtnPressed: { opacity: 0.7 },
  headerTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: "600",
    color: "#111",
    textAlign: "center",
  },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 32 },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  emptyText: { fontSize: 14, color: "#6b7280", marginBottom: 12 },
  backLink: { paddingVertical: 8 },
  backLinkText: { fontSize: 15, fontWeight: "600", color: ACCENT },
  imageWrap: {
    width: "100%",
    height: 220,
    backgroundColor: "#f0f0f0",
    position: "relative",
  },
  image: { width: "100%", height: "100%" },
  imagePlaceholder: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  placeholderIcon: { fontSize: 48 },
  priceBadge: {
    position: "absolute",
    bottom: 12,
    right: 12,
    backgroundColor: "rgba(0,0,0,0.75)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  priceBadgeText: { fontSize: 15, fontWeight: "700", color: "#fff" },
  body: { padding: 20 },
  metaRow: { marginBottom: 12 },
  availPill: {
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  availPillOn: { backgroundColor: "#dcfce7" },
  availPillOff: { backgroundColor: "#f1f5f9" },
  availPillText: { fontSize: 12, fontWeight: "600" },
  availPillTextOn: { color: "#166534" },
  availPillTextOff: { color: "#64748b" },
  desc: {
    fontSize: 15,
    color: "#374151",
    lineHeight: 22,
    marginBottom: 16,
  },
  storeLink: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
  },
  storeLinkLabel: { fontSize: 14, color: "#6b7280" },
  storeLinkName: { fontSize: 14, fontWeight: "600", color: ACCENT },
  storeLinkChevron: { fontSize: 14, fontWeight: "600", color: ACCENT },
  addBtn: {
    backgroundColor: ACCENT,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  addBtnText: { fontSize: 16, fontWeight: "600", color: "#fff" },
});
