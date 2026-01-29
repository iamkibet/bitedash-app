import { getApiErrors, getApiMessage } from "@/lib/api/client";
import { createMenuItem } from "@/lib/api/menuItems";
import { getMyStore } from "@/lib/api/stores";
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

export default function NewMenuItemScreen() {
  const router = useRouter();
  const [storeId, setStoreId] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [isAvailable, setIsAvailable] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    getMyStore()
      .then((s) => setStoreId(s.id))
      .catch(() => setStoreId(null))
      .finally(() => setLoading(false));
  }, []);

  const handleCreate = async () => {
    if (!storeId) return;
    const priceNum = parseFloat(price);
    if (isNaN(priceNum) || priceNum < 0) {
      setErrors({ price: "Valid price required" });
      return;
    }
    setErrors({});
    setSaving(true);
    try {
      await createMenuItem({
        name,
        description: description || undefined,
        price: priceNum,
        restaurant_id: storeId,
        is_available: isAvailable,
      });
      Alert.alert("Success", "Menu item created.");
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

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#ed751a" />
      </View>
    );
  }

  if (!storeId) {
    return (
      <View style={styles.centered}>
        <Text style={styles.emptyText}>Store not found.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.section}>
        <Text style={styles.label}>Name</Text>
        <TextInput
          style={[styles.input, errors.name && styles.inputError]}
          value={name}
          onChangeText={setName}
          placeholder="Item name"
          editable={!saving}
        />
        {errors.name ? (
          <Text style={styles.errorText}>{errors.name}</Text>
        ) : null}
      </View>
      <View style={styles.section}>
        <Text style={styles.label}>Description (optional)</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={description}
          onChangeText={setDescription}
          placeholder="Description"
          multiline
          editable={!saving}
        />
      </View>
      <View style={styles.section}>
        <Text style={styles.label}>Price (KES)</Text>
        <TextInput
          style={[styles.input, errors.price && styles.inputError]}
          value={price}
          onChangeText={setPrice}
          placeholder="0"
          keyboardType="decimal-pad"
          editable={!saving}
        />
        {errors.price ? (
          <Text style={styles.errorText}>{errors.price}</Text>
        ) : null}
      </View>
      <TouchableOpacity
        style={styles.checkRow}
        onPress={() => setIsAvailable(!isAvailable)}
        disabled={saving}
      >
        <Text style={styles.checkLabel}>Available</Text>
        <View style={[styles.checkbox, isAvailable && styles.checkboxChecked]}>
          {isAvailable ? <Text style={styles.checkmark}>✓</Text> : null}
        </View>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.button, saving && styles.buttonDisabled]}
        onPress={handleCreate}
        disabled={saving}
      >
        {saving ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <Text style={styles.buttonText}>Create</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9fafb" },
  content: { padding: 16, paddingBottom: 32 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  emptyText: { color: "#6b7280", fontSize: 16 },
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
  checkRow: { flexDirection: "row", alignItems: "center", marginBottom: 24 },
  checkLabel: { fontSize: 16, color: "#374151", marginRight: 12 },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#d1d5db",
    justifyContent: "center",
    alignItems: "center",
  },
  checkboxChecked: { backgroundColor: "#ed751a", borderColor: "#ed751a" },
  checkmark: { color: "#fff", fontWeight: "700", fontSize: 14 },
  button: {
    backgroundColor: "#ed751a",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
});
