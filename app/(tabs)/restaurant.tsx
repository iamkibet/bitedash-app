import { getApiMessage } from "@/lib/api/client";
import { getMyStore } from "@/lib/api/stores";
import { STORE_STATUS_LABELS } from "@/lib/constants";
import type { Store } from "@/types/api";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

export default function RestaurantScreen() {
  const router = useRouter();
  const [store, setStore] = useState<Store | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const load = () => {
    setLoading(true);
    getMyStore()
      .then(setStore)
      .catch((e) => {
        if (e.response?.status === 404) setNotFound(true);
        else Alert.alert("Error", getApiMessage(e));
      })
      .finally(() => setLoading(false));
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
        </View>
        <View style={styles.centered}>
          <Text style={styles.emptyText}>You don't have a store yet.</Text>
          <TouchableOpacity
            style={styles.button}
            onPress={() => router.push("/restaurant/edit")}
          >
            <Text style={styles.buttonText}>Create restaurant</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>My Store</Text>
      </View>
      <View style={styles.card}>
        <Text style={styles.storeName}>{store.name}</Text>
        <Text style={styles.storeDesc}>
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
        <View style={styles.row}>
          <TouchableOpacity
            style={styles.outlineButton}
            onPress={() => router.push("/restaurant/edit")}
          >
            <Text style={styles.outlineButtonText}>Edit store</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => router.push("/(tabs)/restaurant-menu")}
          >
            <Text style={styles.primaryButtonText}>Manage menu</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity
          style={styles.outlineButton}
          onPress={() => router.push("/(tabs)/restaurant-orders")}
        >
          <Text style={styles.outlineButtonText}>View orders</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9fafb" },
  header: { padding: 16, paddingTop: 48 },
  title: { fontSize: 28, fontWeight: "700", color: "#111" },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  emptyText: { fontSize: 16, color: "#6b7280", marginBottom: 16 },
  card: {
    margin: 16,
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  storeName: { fontSize: 20, fontWeight: "600", color: "#111" },
  storeDesc: { fontSize: 14, color: "#6b7280", marginTop: 8 },
  badge: {
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginTop: 12,
  },
  badgeOpen: { backgroundColor: "#dcfce7" },
  badgeClosed: { backgroundColor: "#f3f4f6" },
  badgeText: { fontSize: 12, fontWeight: "500", color: "#374151" },
  row: { flexDirection: "row", gap: 12, marginTop: 16 },
  button: {
    backgroundColor: "#ed751a",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  primaryButton: {
    flex: 1,
    backgroundColor: "#ed751a",
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  primaryButtonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  outlineButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#d1d5db",
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  outlineButtonText: { fontSize: 16, color: "#374151", fontWeight: "500" },
});
