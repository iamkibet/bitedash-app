import { getApiMessage } from "@/lib/api/client";
import { listFavourites, removeFavourite } from "@/lib/api/favourites";
import { formatKES } from "@/lib/utils/formatters";
import type { Favourite } from "@/types/api";
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

export default function FavouritesScreen() {
  const router = useRouter();
  const [favourites, setFavourites] = useState<Favourite[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [removingId, setRemovingId] = useState<number | null>(null);

  const load = async (refresh = false) => {
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
  };

  useEffect(() => {
    load();
  }, []);

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

  const renderItem = ({ item }: { item: Favourite }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push(`/menu/${item.menu_item.id}`)}
      activeOpacity={0.7}
    >
      {item.menu_item.image_url ? (
        <Image
          source={{ uri: item.menu_item.image_url }}
          style={styles.image}
        />
      ) : (
        <View style={styles.imagePlaceholder}>
          <Text style={styles.placeholderText}>No image</Text>
        </View>
      )}
      <View style={styles.content}>
        <Text style={styles.name} numberOfLines={1}>
          {item.menu_item.name}
        </Text>
        <Text style={styles.price}>{formatKES(item.menu_item.price)}</Text>
        <View style={styles.row}>
          <TouchableOpacity
            style={styles.viewBtn}
            onPress={() => router.push(`/menu/${item.menu_item.id}`)}
          >
            <Text style={styles.viewBtnText}>View</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.removeBtn,
              removingId === item.menu_item_id && styles.btnDisabled,
            ]}
            onPress={() => handleRemove(item.menu_item_id)}
            disabled={removingId === item.menu_item_id}
          >
            <Text style={styles.removeBtnText}>Remove</Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Favourites</Text>
      </View>
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#ed751a" />
        </View>
      ) : favourites.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.emptyText}>No favourites yet.</Text>
        </View>
      ) : (
        <FlatList
          data={favourites}
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
  header: { padding: 16, paddingTop: 48 },
  title: { fontSize: 28, fontWeight: "700", color: "#111" },
  list: { padding: 16, paddingBottom: 32 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  emptyText: { color: "#6b7280", fontSize: 16 },
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
  image: { height: 120, width: "100%", backgroundColor: "#e5e7eb" },
  imagePlaceholder: {
    height: 120,
    width: "100%",
    backgroundColor: "#e5e7eb",
    justifyContent: "center",
    alignItems: "center",
  },
  placeholderText: { color: "#9ca3af", fontSize: 14 },
  content: { padding: 12 },
  name: { fontSize: 16, fontWeight: "600", color: "#111" },
  price: { fontSize: 14, color: "#ed751a", fontWeight: "600", marginTop: 4 },
  row: { flexDirection: "row", gap: 12, marginTop: 12 },
  viewBtn: {
    flex: 1,
    backgroundColor: "#ed751a",
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: "center",
  },
  viewBtnText: { color: "#fff", fontSize: 14, fontWeight: "600" },
  removeBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#dc2626",
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: "center",
  },
  removeBtnText: { color: "#dc2626", fontSize: 14, fontWeight: "500" },
  btnDisabled: { opacity: 0.6 },
});
