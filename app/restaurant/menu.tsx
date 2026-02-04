import { getApiMessage } from "@/lib/api/client";
import {
    listMyRestaurantMenuItems,
    toggleMenuItemAvailability,
} from "@/lib/api/menuItems";
import { formatKES } from "@/lib/utils/formatters";
import type { MenuItem } from "@/types/api";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Image,
    RefreshControl,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

export default function RestaurantMenuScreen() {
  const router = useRouter();
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [togglingId, setTogglingId] = useState<number | null>(null);

  const load = async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    try {
      const res = await listMyRestaurantMenuItems({ page: 1 });
      setItems(res.data);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

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

  const renderItem = ({ item }: { item: MenuItem }) => (
    <View style={styles.card}>
      {item.image_url ? (
        <Image source={{ uri: item.image_url }} style={styles.image} />
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
        <View style={styles.row}>
          <TouchableOpacity
            style={styles.outlineBtn}
            onPress={() => router.push(`/restaurant/menu/${item.id}/edit`)}
          >
            <Text style={styles.outlineBtnText}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.toggleBtn,
              togglingId === item.id && styles.btnDisabled,
            ]}
            onPress={() => handleToggle(item.id)}
            disabled={togglingId === item.id}
          >
            {togglingId === item.id ? (
              <ActivityIndicator size="small" color="#ed751a" />
            ) : (
              <Text style={styles.toggleBtnText}>
                {item.is_available ? "Set unavailable" : "Set available"}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Menu</Text>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => router.push("/restaurant/menu/new")}
        >
          <Text style={styles.addBtnText}>Add item</Text>
        </TouchableOpacity>
      </View>
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#ed751a" />
        </View>
      ) : items.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.emptyText}>No menu items yet.</Text>
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => router.push("/restaurant/menu/new")}
          >
            <Text style={styles.addBtnText}>Add item</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => load(true)}
            />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9fafb" },
  header: {
    padding: 16,
    paddingTop: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: { fontSize: 22, fontWeight: "700", color: "#111" },
  addBtn: {
    backgroundColor: "#ed751a",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  addBtnText: { color: "#fff", fontSize: 14, fontWeight: "600" },
  list: { padding: 16, paddingBottom: 32 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  emptyText: { color: "#6b7280", fontSize: 16, marginBottom: 16 },
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
  image: { height: 100, width: "100%", backgroundColor: "#e5e7eb" },
  imagePlaceholder: {
    height: 100,
    width: "100%",
    backgroundColor: "#e5e7eb",
    justifyContent: "center",
    alignItems: "center",
  },
  placeholderText: { color: "#9ca3af", fontSize: 14 },
  content: { padding: 12 },
  name: { fontSize: 16, fontWeight: "600", color: "#111" },
  price: { fontSize: 14, color: "#ed751a", fontWeight: "600", marginTop: 4 },
  badge: {
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginTop: 8,
  },
  badgeAvail: { backgroundColor: "#dcfce7" },
  badgeUnavail: { backgroundColor: "#f3f4f6" },
  badgeText: { fontSize: 12, fontWeight: "500", color: "#374151" },
  row: { flexDirection: "row", gap: 12, marginTop: 12 },
  outlineBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#d1d5db",
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: "center",
  },
  outlineBtnText: { fontSize: 14, color: "#374151", fontWeight: "500" },
  toggleBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#ed751a",
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: "center",
  },
  toggleBtnText: { fontSize: 14, color: "#ed751a", fontWeight: "500" },
  btnDisabled: { opacity: 0.6 },
});
