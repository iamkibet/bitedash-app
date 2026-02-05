import { getApiErrors, getApiMessage } from "@/lib/api/client";
import { getMyStore, toggleStoreStatus, updateStore } from "@/lib/api/stores";
import type { Store } from "@/types/api";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { IconSymbol } from "@/components/ui/icon-symbol";

const ACCENT = "#f59e0b";
const PAD = 20;

export default function RestaurantEditScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [store, setStore] = useState<Store | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    getMyStore()
      .then((s) => {
        setStore(s);
        setName(s.name);
        setDescription(s.description ?? "");
        setLocation(s.location);
      })
      .catch(() => setStore(null))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    if (!store) return;
    setErrors({});
    setSaving(true);
    try {
      await updateStore(store.id, {
        name,
        description: description || undefined,
        location,
      });
      Alert.alert("Success", "Store updated.");
      router.back();
    } catch (e) {
      const apiErrors = getApiErrors(e);
      if (apiErrors) {
        const next: Record<string, string> = {};
        Object.entries(apiErrors).forEach(([k, v]) => {
          next[k] = Array.isArray(v) ? v[0] : String(v);
        });
        setErrors(next);
      }
      Alert.alert("Error", getApiMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async () => {
    if (!store) return;
    try {
      setToggling(true);
      const updated = await toggleStoreStatus(store.id);
      setStore(updated);
    } catch (e) {
      Alert.alert("Error", getApiMessage(e));
    } finally {
      setToggling(false);
    }
  };

  if (loading || !store) {
    return (
      <View style={[styles.centered, styles.container]}>
        <ActivityIndicator size="large" color={ACCENT} />
      </View>
    );
  }

  const bottomPad = Math.max(insets.bottom, 24);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity
          style={styles.headerBack}
          onPress={() => router.back()}
          hitSlop={12}
        >
          <IconSymbol name="chevron.left" size={24} color="#0f172a" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Edit store</Text>
          <Text style={styles.headerSubtitle}>{store.name}</Text>
        </View>
        <View style={styles.headerRight} />
      </View>

      <KeyboardAvoidingView
        style={styles.keyboard}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.content, { paddingBottom: bottomPad + 100 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Status card */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Store status</Text>
            <View style={styles.statusCard}>
              <View style={styles.statusRow}>
                <Text style={styles.statusLabel}>
                  {store.is_open ? "Open for orders" : "Currently closed"}
                </Text>
                <Pressable
                  style={[
                    styles.toggleTrack,
                    store.is_open && styles.toggleTrackOn,
                  ]}
                  onPress={handleToggle}
                  disabled={toggling}
                >
                  {toggling ? (
                    <ActivityIndicator
                      size="small"
                      color={store.is_open ? "#fff" : "#64748b"}
                    />
                  ) : (
                    <View
                      style={[
                        styles.toggleThumb,
                        store.is_open && styles.toggleThumbOn,
                      ]}
                    />
                  )}
                </Pressable>
              </View>
              <Text style={styles.statusHint}>
                {store.is_open
                  ? "Customers can place orders. Tap to close."
                  : "Tap to open and accept orders."}
              </Text>
            </View>
          </View>

          {/* Form card */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Store details</Text>
            <View style={styles.formCard}>
              <View style={styles.field}>
                <Text style={styles.label}>Name</Text>
                <TextInput
                  style={[styles.input, errors.name && styles.inputError]}
                  value={name}
                  onChangeText={setName}
                  placeholder="e.g. Mama Ngina Kitchen"
                  placeholderTextColor="#94a3b8"
                  editable={!saving}
                />
                {errors.name ? (
                  <Text style={styles.errorText}>{errors.name}</Text>
                ) : null}
              </View>
              <View style={styles.field}>
                <Text style={styles.label}>Description (optional)</Text>
                <TextInput
                  style={[
                    styles.input,
                    styles.textArea,
                    errors.description && styles.inputError,
                  ]}
                  value={description}
                  onChangeText={setDescription}
                  placeholder="Short description of your store"
                  placeholderTextColor="#94a3b8"
                  multiline
                  numberOfLines={3}
                  editable={!saving}
                />
              </View>
              <View style={styles.field}>
                <Text style={styles.label}>Location</Text>
                <TextInput
                  style={[styles.input, errors.location && styles.inputError]}
                  value={location}
                  onChangeText={setLocation}
                  placeholder="e.g. Westlands, Nairobi"
                  placeholderTextColor="#94a3b8"
                  editable={!saving}
                />
                {errors.location ? (
                  <Text style={styles.errorText}>{errors.location}</Text>
                ) : null}
              </View>
            </View>
          </View>
        </ScrollView>

        {/* Save button */}
        <View style={[styles.footer, { paddingBottom: bottomPad + 16 }]}>
          <TouchableOpacity
            style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
            onPress={handleSave}
            disabled={saving}
            activeOpacity={0.88}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.saveBtnText}>Save changes</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  centered: { justifyContent: "center", alignItems: "center" },

  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: PAD,
    paddingBottom: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  headerBack: { padding: 4, marginRight: 8 },
  headerCenter: { flex: 1 },
  headerTitle: { fontSize: 20, fontWeight: "700", color: "#0f172a" },
  headerSubtitle: { fontSize: 13, color: "#64748b", marginTop: 2 },
  headerRight: { width: 36 },

  keyboard: { flex: 1 },
  scroll: { flex: 1 },
  content: { padding: PAD, paddingTop: 24 },

  section: { marginBottom: 24 },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#64748b",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  statusCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 18,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 2,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  statusLabel: { fontSize: 15, fontWeight: "600", color: "#0f172a" },
  statusHint: { fontSize: 13, color: "#64748b", marginTop: 8, lineHeight: 18 },
  toggleTrack: {
    width: 50,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#e2e8f0",
    justifyContent: "center",
    paddingHorizontal: 3,
    alignItems: "flex-start",
  },
  toggleTrackOn: { backgroundColor: ACCENT, alignItems: "flex-end" },
  toggleThumb: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#94a3b8",
  },
  toggleThumbOn: { backgroundColor: "#fff" },

  formCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 18,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 2,
  },
  field: { marginBottom: 18 },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: "#334155",
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: "#0f172a",
    backgroundColor: "#fff",
  },
  inputError: { borderColor: "#dc2626", borderWidth: 1.5 },
  textArea: { minHeight: 88, textAlignVertical: "top", paddingTop: 12 },
  errorText: { fontSize: 12, color: "#dc2626", marginTop: 6 },

  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: PAD,
    paddingTop: 16,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
  },
  saveBtn: {
    backgroundColor: ACCENT,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 52,
  },
  saveBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  saveBtnDisabled: { opacity: 0.7 },
});
