import { useAuthStore } from "@/lib/store/authStore";
import { formatPhone } from "@/lib/utils/formatters";
import { useRouter } from "expo-router";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const ACCENT = "#f59e0b";

function SettingsLinkRow({
  label,
  hint,
  onPress,
  last,
}: {
  label: string;
  hint?: string;
  onPress: () => void;
  last?: boolean;
}) {
  return (
    <TouchableOpacity
      style={[styles.linkRow, last && styles.linkRowLast]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={styles.linkText}>{label}</Text>
      {hint ? <Text style={styles.linkHint}>{hint}</Text> : null}
      <Text style={styles.linkChevron}>›</Text>
    </TouchableOpacity>
  );
}

export default function SettingsScreen() {
  const router = useRouter();
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    Alert.alert("Log out", "Are you sure you want to log out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Log out",
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
          <Text style={styles.title}>Settings</Text>
          <Text style={styles.subtitle}>Sign in to manage your profile</Text>
        </View>
        <View style={styles.centered}>
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => router.replace("/(auth)/login")}
            activeOpacity={0.88}
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
        <Text style={styles.title}>Settings</Text>
        <Text style={styles.subtitle}>Profile and preferences</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardLabel}>Profile</Text>
        <View style={styles.profileRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {user.name.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{user.name}</Text>
            <Text style={styles.profileMeta}>{user.email}</Text>
            <Text style={styles.profileMeta}>{formatPhone(user.phone)}</Text>
            <View style={styles.rolePill}>
              <Text style={styles.rolePillText}>{user.role}</Text>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardLabel}>Quick links</Text>
        {user.role === "customer" && (
          <SettingsLinkRow
            label="Favourites"
            onPress={() => router.push("/favourites")}
            last
          />
        )}
        {user.role === "restaurant" && (
          <>
            <SettingsLinkRow
              label="Edit store"
              onPress={() => router.push("/restaurant/edit")}
            />
            <SettingsLinkRow
              label="Manage menu"
              onPress={() => router.push("/restaurant/menu")}
            />
            <SettingsLinkRow
              label="Store orders"
              onPress={() => router.push("/restaurant/orders")}
              last
            />
          </>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardLabel}>App</Text>
        <SettingsLinkRow
          label="Notifications"
          hint="Order updates, promos"
          onPress={() => {}}
        />
        <SettingsLinkRow label="Help & Support" onPress={() => {}} />
        <SettingsLinkRow label="About BiteDash" onPress={() => {}} />
        <SettingsLinkRow
          label="Privacy & security"
          onPress={() => {}}
          last
        />
      </View>

      <TouchableOpacity
        style={styles.logoutBtn}
        onPress={handleLogout}
        activeOpacity={0.88}
      >
        <Text style={styles.logoutBtnText}>Log out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fafafa" },
  scrollContent: { paddingBottom: 32 },
  header: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 20,
  },
  title: { fontSize: 22, fontWeight: "700", color: "#111" },
  subtitle: { fontSize: 13, color: "#6b7280", marginTop: 2 },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  primaryBtn: {
    backgroundColor: ACCENT,
    paddingVertical: 12,
    paddingHorizontal: 28,
    borderRadius: 12,
  },
  primaryBtnText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  card: {
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: "#f0f0f0",
  },
  cardLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#6b7280",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  profileRow: { flexDirection: "row", alignItems: "center" },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: ACCENT,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: { fontSize: 22, fontWeight: "700", color: "#fff" },
  profileInfo: { marginLeft: 14, flex: 1, minWidth: 0 },
  profileName: { fontSize: 17, fontWeight: "600", color: "#111" },
  profileMeta: { fontSize: 13, color: "#6b7280", marginTop: 2 },
  rolePill: {
    alignSelf: "flex-start",
    backgroundColor: "#f1f5f9",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginTop: 8,
  },
  rolePillText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#475569",
    textTransform: "capitalize",
  },
  linkRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f5f5f5",
  },
  linkRowLast: { borderBottomWidth: 0 },
  linkText: { flex: 1, fontSize: 15, color: "#111", fontWeight: "500" },
  linkHint: { fontSize: 13, color: "#9ca3af", marginRight: 6 },
  linkChevron: { fontSize: 18, color: "#c4c4c4", fontWeight: "500" },
  logoutBtn: {
    marginHorizontal: 16,
    marginTop: 4,
    paddingVertical: 14,
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#fecaca",
    backgroundColor: "#fff",
  },
  logoutBtnText: { color: "#dc2626", fontSize: 15, fontWeight: "600" },
});
