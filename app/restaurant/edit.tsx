import { getApiErrors, getApiMessage } from "@/lib/api/client";
import { getMyStore, toggleStoreStatus, updateStore } from "@/lib/api/stores";
import type { Store } from "@/types/api";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

export default function RestaurantEditScreen() {
  const router = useRouter();
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
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#ed751a" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <TouchableOpacity
        style={styles.toggleBtn}
        onPress={handleToggle}
        disabled={toggling}
      >
        <Text style={styles.toggleBtnText}>
          {store.is_open ? "Mark as closed" : "Mark as open"}
        </Text>
      </TouchableOpacity>
      <View style={styles.section}>
        <Text style={styles.label}>Name</Text>
        <TextInput
          style={[styles.input, errors.name && styles.inputError]}
          value={name}
          onChangeText={setName}
          placeholder="Store name"
          editable={!saving}
        />
        {errors.name ? (
          <Text style={styles.errorText}>{errors.name}</Text>
        ) : null}
      </View>
      <View style={styles.section}>
        <Text style={styles.label}>Description (optional)</Text>
        <TextInput
          style={[
            styles.input,
            styles.textArea,
            errors.description && styles.inputError,
          ]}
          value={description}
          onChangeText={setDescription}
          placeholder="Description"
          multiline
          numberOfLines={3}
          editable={!saving}
        />
      </View>
      <View style={styles.section}>
        <Text style={styles.label}>Location</Text>
        <TextInput
          style={[styles.input, errors.location && styles.inputError]}
          value={location}
          onChangeText={setLocation}
          placeholder="Location"
          editable={!saving}
        />
        {errors.location ? (
          <Text style={styles.errorText}>{errors.location}</Text>
        ) : null}
      </View>
      <TouchableOpacity
        style={[styles.button, saving && styles.buttonDisabled]}
        onPress={handleSave}
        disabled={saving}
      >
        {saving ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <Text style={styles.buttonText}>Save</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9fafb" },
  content: { padding: 16, paddingBottom: 32 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  toggleBtn: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 24,
  },
  toggleBtnText: { fontSize: 16, color: "#374151", fontWeight: "500" },
  section: { marginBottom: 20 },
  label: { fontSize: 14, fontWeight: "500", color: "#374151", marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: "#fff",
  },
  textArea: { minHeight: 80, textAlignVertical: "top" },
  inputError: { borderColor: "#dc2626" },
  errorText: { fontSize: 12, color: "#dc2626", marginTop: 4 },
  button: {
    backgroundColor: "#ed751a",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
});
