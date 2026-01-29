import { getMenuItem } from "@/lib/api/menuItems";
import { useCartStore } from "@/lib/store/cartStore";
import { formatKES } from "@/lib/utils/formatters";
import type { MenuItem } from "@/types/api";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Image,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

export default function MenuItemDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [item, setItem] = useState<MenuItem | null>(null);
  const [loading, setLoading] = useState(true);
  const addItem = useCartStore((s) => s.addItem);

  useEffect(() => {
    if (!id) return;
    getMenuItem(Number(id))
      .then(setItem)
      .catch(() => setItem(null))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading || !item) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#ed751a" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {item.image_url ? (
        <Image source={{ uri: item.image_url }} style={styles.image} />
      ) : (
        <View style={styles.imagePlaceholder}>
          <Text style={styles.placeholderText}>No image</Text>
        </View>
      )}
      <View style={styles.body}>
        <Text style={styles.name}>{item.name}</Text>
        <Text style={styles.desc}>{item.description ?? "No description."}</Text>
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
        {item.restaurant && (
          <TouchableOpacity
            onPress={() => router.push(`/store/${item.restaurant!.id}`)}
          >
            <Text style={styles.link}>Store: {item.restaurant.name}</Text>
          </TouchableOpacity>
        )}
        {item.is_available && (
          <TouchableOpacity style={styles.addBtn} onPress={() => addItem(item)}>
            <Text style={styles.addBtnText}>Add to cart</Text>
          </TouchableOpacity>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9fafb" },
  content: { paddingBottom: 32 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  image: { width: "100%", height: 220, backgroundColor: "#e5e7eb" },
  imagePlaceholder: {
    width: "100%",
    height: 220,
    backgroundColor: "#e5e7eb",
    justifyContent: "center",
    alignItems: "center",
  },
  placeholderText: { color: "#9ca3af", fontSize: 14 },
  body: { padding: 16 },
  name: { fontSize: 24, fontWeight: "700", color: "#111" },
  desc: { fontSize: 16, color: "#6b7280", marginTop: 8 },
  price: { fontSize: 20, fontWeight: "600", color: "#ed751a", marginTop: 12 },
  badge: {
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginTop: 12,
  },
  badgeAvail: { backgroundColor: "#dcfce7" },
  badgeUnavail: { backgroundColor: "#f3f4f6" },
  badgeText: { fontSize: 12, fontWeight: "500", color: "#374151" },
  link: { fontSize: 14, color: "#ed751a", marginTop: 12 },
  addBtn: {
    marginTop: 24,
    backgroundColor: "#ed751a",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  addBtnText: { color: "#fff", fontSize: 16, fontWeight: "600" },
});
