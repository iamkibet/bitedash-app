import { listMenuItemsByStore } from "@/lib/api/menuItems";
import { getStore } from "@/lib/api/stores";
import { STORE_STATUS_LABELS } from "@/lib/constants";
import { useCartStore } from "@/lib/store/cartStore";
import { formatKES } from "@/lib/utils/formatters";
import type { MenuItem, Store } from "@/types/api";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    Image,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

export default function StoreDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [store, setStore] = useState<Store | null>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const addItem = useCartStore((s) => s.addItem);

  useEffect(() => {
    if (!id) return;
    const numId = Number(id);
    getStore(numId)
      .then(setStore)
      .catch(() => setStore(null));
    listMenuItemsByStore(numId, { page: 1 })
      .then((res) => {
        setMenuItems(res.data);
      })
      .catch(() => setMenuItems([]))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading && !store) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#ed751a" />
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

  const renderItem = ({ item }: { item: MenuItem }) => (
    <View style={styles.card}>
      {item.image_url ? (
        <Image source={{ uri: item.image_url }} style={styles.cardImage} />
      ) : (
        <View style={styles.imagePlaceholder}>
          <Text style={styles.placeholderText}>No image</Text>
        </View>
      )}
      <View style={styles.content}>
        <Text style={styles.name}>{item.name}</Text>
        <Text style={styles.price}>{formatKES(item.price)}</Text>
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
        <TouchableOpacity
          style={styles.viewBtn}
          onPress={() => router.push(`/menu/${item.id}`)}
        >
          <Text style={styles.viewBtnText}>View</Text>
        </TouchableOpacity>
        {item.is_available && (
          <TouchableOpacity style={styles.addBtn} onPress={() => addItem(item)}>
            <Text style={styles.addBtnText}>Add to cart</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {store.image_url ? (
        <Image source={{ uri: store.image_url }} style={styles.heroImage} />
      ) : (
        <View style={[styles.heroImage, styles.heroPlaceholder]}>
          <Text style={styles.placeholderText}>No image</Text>
        </View>
      )}
      <View style={styles.header}>
        <Text style={styles.title}>{store.name}</Text>
        <Text style={styles.desc}>{store.description ?? store.location}</Text>
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
      <Text style={styles.sectionTitle}>Menu</Text>
      {menuItems.length === 0 ? (
        <Text style={styles.emptyText}>No menu items yet.</Text>
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
  container: { flex: 1, backgroundColor: "#f9fafb" },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  heroImage: { width: "100%", height: 180, backgroundColor: "#e5e7eb" },
  heroPlaceholder: { justifyContent: "center", alignItems: "center" },
  placeholderText: { color: "#9ca3af", fontSize: 14 },
  header: { padding: 16 },
  title: { fontSize: 24, fontWeight: "700", color: "#111" },
  desc: { fontSize: 14, color: "#6b7280", marginTop: 4 },
  badge: {
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginTop: 8,
  },
  badgeOpen: { backgroundColor: "#dcfce7" },
  badgeClosed: { backgroundColor: "#f3f4f6" },
  badgeAvail: { backgroundColor: "#dcfce7" },
  badgeUnavail: { backgroundColor: "#f3f4f6" },
  badgeText: { fontSize: 12, fontWeight: "500", color: "#374151" },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#111",
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  list: { padding: 16, paddingBottom: 32 },
  emptyText: { color: "#6b7280", padding: 16 },
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
  cardImage: { height: 120, width: "100%", backgroundColor: "#e5e7eb" },
  imagePlaceholder: {
    height: 120,
    width: "100%",
    backgroundColor: "#e5e7eb",
    justifyContent: "center",
    alignItems: "center",
  },
  content: { padding: 12 },
  name: { fontSize: 16, fontWeight: "600", color: "#111" },
  price: { fontSize: 14, color: "#ed751a", fontWeight: "600", marginTop: 4 },
  viewBtn: { marginTop: 8 },
  viewBtnText: { fontSize: 14, color: "#ed751a", fontWeight: "500" },
  addBtn: {
    marginTop: 8,
    backgroundColor: "#ed751a",
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
  },
  addBtnText: { color: "#fff", fontSize: 14, fontWeight: "600" },
});
