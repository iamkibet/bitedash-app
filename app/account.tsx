import { useAuthStore } from "@/lib/store/authStore";
import { formatPhone } from "@/lib/utils/formatters";
import { useRouter } from "expo-router";
import { useEffect } from "react";
import {
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

export default function AccountScreen() {
  const router = useRouter();
  const { user, logout } = useAuthStore();

  // Deep link: redirect to Settings tab when signed in
  useEffect(() => {
    if (user) {
      router.replace("/(tabs)/settings");
    }
  }, [user, router]);

  const handleLogout = () => {
    Alert.alert("Logout", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: async () => {
          await logout();
          router.replace("/(auth)/login");
        },
      },
    ]);
  };

  if (!user) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Account</Text>
          <Text style={styles.subtitle}>Sign in to access your account</Text>
        </View>
        <View style={styles.centered}>
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => router.replace("/(auth)/login")}
          >
            <Text style={styles.primaryBtnText}>Sign in</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Account</Text>
        <Text style={styles.subtitle}>Manage your profile and settings</Text>
      </View>

      <View style={styles.card}>
        <View style={styles.profileRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {user.name.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.name}>{user.name}</Text>
            <Text style={styles.email}>{user.email}</Text>
            <Text style={styles.phone}>{formatPhone(user.phone)}</Text>
            <View style={styles.roleBadge}>
              <Text style={styles.roleText}>{user.role}</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick links</Text>
          {user.role === "customer" && (
            <TouchableOpacity
              style={styles.linkRow}
              onPress={() => router.push("/favourites")}
              activeOpacity={0.7}
            >
              <Text style={styles.linkIcon}>♥</Text>
              <Text style={styles.linkText}>Favourites</Text>
              <Text style={styles.linkChevron}>›</Text>
            </TouchableOpacity>
          )}
          {user.role === "restaurant" && (
            <>
              <TouchableOpacity
                style={styles.linkRow}
                onPress={() => router.push("/restaurant/edit")}
                activeOpacity={0.7}
              >
                <Text style={styles.linkIcon}>🏪</Text>
                <Text style={styles.linkText}>Edit store</Text>
                <Text style={styles.linkChevron}>›</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.linkRow}
                onPress={() => router.push("/restaurant/menu")}
                activeOpacity={0.7}
              >
                <Text style={styles.linkIcon}>📋</Text>
                <Text style={styles.linkText}>Manage menu</Text>
                <Text style={styles.linkChevron}>›</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.linkRow}
                onPress={() => router.push("/restaurant/orders")}
                activeOpacity={0.7}
              >
                <Text style={styles.linkIcon}>📦</Text>
                <Text style={styles.linkText}>Store orders</Text>
                <Text style={styles.linkChevron}>›</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutBtnText}>Log out</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9fafb" },
  scrollContent: { paddingBottom: 32 },
  header: { padding: 16, paddingTop: 16 },
  title: { fontSize: 28, fontWeight: "700", color: "#111" },
  subtitle: { fontSize: 14, color: "#6b7280", marginTop: 4 },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  card: {
    marginHorizontal: 16,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 3,
  },
  profileRow: { flexDirection: "row", alignItems: "center", marginBottom: 24 },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#ed751a",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: { fontSize: 24, fontWeight: "700", color: "#fff" },
  profileInfo: { marginLeft: 16, flex: 1 },
  name: { fontSize: 20, fontWeight: "600", color: "#111" },
  email: { fontSize: 14, color: "#6b7280", marginTop: 2 },
  phone: { fontSize: 14, color: "#6b7280", marginTop: 2 },
  roleBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#f3f4f6",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginTop: 8,
  },
  roleText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#374151",
    textTransform: "capitalize",
  },
  section: { borderTopWidth: 1, borderTopColor: "#e5e7eb", paddingTop: 20 },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#6b7280",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  linkRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  linkIcon: { fontSize: 20, marginRight: 12 },
  linkText: { flex: 1, fontSize: 16, color: "#111", fontWeight: "500" },
  linkChevron: { fontSize: 20, color: "#9ca3af", fontWeight: "300" },
  logoutBtn: {
    marginTop: 24,
    paddingVertical: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#fecaca",
    borderRadius: 12,
    backgroundColor: "#fef2f2",
  },
  logoutBtnText: { color: "#dc2626", fontSize: 16, fontWeight: "600" },
  primaryBtn: {
    backgroundColor: "#ed751a",
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
  },
  primaryBtnText: { color: "#fff", fontSize: 16, fontWeight: "600" },
});
