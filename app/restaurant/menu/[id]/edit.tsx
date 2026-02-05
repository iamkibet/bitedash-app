import { getApiErrors, getApiMessage } from "@/lib/api/client";
import { getMenuItem, updateMenuItem } from "@/lib/api/menuItems";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
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

const ACCENT = "#f59e0b";
const PAD = 20;

export default function EditMenuItemScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [isAvailable, setIsAvailable] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showUrlInput, setShowUrlInput] = useState(false);

  useEffect(() => {
    if (!id) return;
    getMenuItem(Number(id))
      .then((item) => {
        setName(item.name);
        setDescription(item.description ?? "");
        setPrice(String(item.price));
        setIsAvailable(item.is_available);
        setImageUrl(item.image_url ?? "");
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission needed",
        "Allow access to your photos to update menu item images."
      );
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });
    if (!result.canceled) {
      setImageUri(result.assets[0].uri);
    }
  };

  const removeImage = () => {
    setImageUri(null);
    setImageUrl("");
  };

  const resolvedImageUrl = imageUri || imageUrl || null;

  const handleSave = async () => {
    if (!id) return;
    if (!name.trim()) {
      setErrors({ name: "Name is required" });
      return;
    }
    const priceNum = parseFloat(price);
    if (isNaN(priceNum) || priceNum < 0) {
      setErrors({ price: "Enter a valid price" });
      return;
    }
    setErrors({});
    setSaving(true);
    try {
      await updateMenuItem(
        Number(id),
        {
          name: name.trim(),
          description: description.trim() || undefined,
          price: priceNum,
          is_available: isAvailable,
          image_url: imageUrl.trim() || undefined,
        },
        imageUri
      );
      Alert.alert("Success", "Menu item updated.");
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
          <Text style={styles.headerTitle}>Edit menu item</Text>
          <Text style={styles.headerSubtitle}>{name || "Update details"}</Text>
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
          contentContainerStyle={[styles.content, { paddingBottom: bottomPad + 120 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Hero image section */}
          <View style={styles.imageSection}>
            <TouchableOpacity
              style={styles.imageCard}
              onPress={pickImage}
              disabled={saving}
              activeOpacity={0.9}
            >
              {resolvedImageUrl ? (
                <View style={styles.imagePreviewWrap}>
                  <Image
                    source={{ uri: resolvedImageUrl }}
                    style={styles.imagePreview}
                    resizeMode="cover"
                  />
                  <TouchableOpacity
                    style={styles.removeImageBtn}
                    onPress={removeImage}
                    hitSlop={8}
                  >
                    <IconSymbol name="xmark" size={18} color="#fff" />
                  </TouchableOpacity>
                  <View style={styles.changePhotoHint}>
                    <Text style={styles.changePhotoHintText}>Tap to change photo</Text>
                  </View>
                </View>
              ) : (
                <View style={styles.imagePlaceholder}>
                  <View style={styles.imagePlaceholderIconWrap}>
                    <IconSymbol name="camera.fill" size={36} color="#94a3b8" />
                  </View>
                  <Text style={styles.imagePlaceholderTitle}>Add photo</Text>
                  <Text style={styles.imagePlaceholderSubtext}>
                    Tap to choose from gallery
                  </Text>
                </View>
              )}
            </TouchableOpacity>
            {showUrlInput ? (
              <View style={styles.urlInputWrap}>
                <TextInput
                  style={styles.urlInput}
                  value={imageUrl}
                  onChangeText={setImageUrl}
                  placeholder="Paste image URL (https://...)"
                  placeholderTextColor="#94a3b8"
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!saving}
                />
                <TouchableOpacity
                  onPress={() => setShowUrlInput(false)}
                  style={styles.urlCloseBtn}
                >
                  <Text style={styles.urlCloseText}>Hide</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                onPress={() => setShowUrlInput(true)}
                style={styles.urlLink}
              >
                <Text style={styles.urlLinkText}>Or paste image URL</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Details section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Details</Text>
            <View style={styles.formCard}>
              <View style={styles.field}>
                <Text style={styles.label}>Name</Text>
                <TextInput
                  style={[styles.input, errors.name && styles.inputError]}
                  value={name}
                  onChangeText={setName}
                  placeholder="e.g. Nyama Choma"
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
                  style={[styles.input, styles.textArea]}
                  value={description}
                  onChangeText={setDescription}
                  placeholder="Tender grilled beef served with ugali and kachumbari"
                  placeholderTextColor="#94a3b8"
                  multiline
                  numberOfLines={3}
                  editable={!saving}
                />
              </View>
            </View>
          </View>

          {/* Pricing section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Pricing</Text>
            <View style={styles.formCard}>
              <View style={styles.field}>
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
            </View>
          </View>

          {/* Availability section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Availability</Text>
            <View style={styles.formCard}>
              <Pressable
                style={styles.availabilityRow}
                onPress={() => !saving && setIsAvailable(!isAvailable)}
              >
                <View style={styles.availabilityLeft}>
                  <Text style={styles.availabilityLabel}>
                    Available for ordering
                  </Text>
                  <Text style={styles.availabilityHint}>
                    {isAvailable
                      ? "Customers can add this item to their cart"
                      : "Item will be hidden from the menu"}
                  </Text>
                </View>
                <View
                  style={[
                    styles.toggleTrack,
                    isAvailable && styles.toggleTrackOn,
                  ]}
                >
                  <View
                    style={[
                      styles.toggleThumb,
                      isAvailable && styles.toggleThumbOn,
                    ]}
                  />
                </View>
              </Pressable>
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

  imageSection: { marginBottom: 28 },
  imageCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  imagePlaceholder: {
    aspectRatio: 16 / 9,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f1f5f9",
    padding: 24,
  },
  imagePlaceholderIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#e2e8f0",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  imagePlaceholderTitle: {
    fontSize: 17,
    fontWeight: "600",
    color: "#334155",
    marginBottom: 4,
  },
  imagePlaceholderSubtext: {
    fontSize: 14,
    color: "#94a3b8",
  },
  imagePreviewWrap: {
    aspectRatio: 16 / 9,
    position: "relative",
  },
  imagePreview: {
    width: "100%",
    height: "100%",
    backgroundColor: "#f1f5f9",
  },
  removeImageBtn: {
    position: "absolute",
    top: 12,
    right: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  changePhotoHint: {
    position: "absolute",
    bottom: 12,
    left: 12,
    right: 12,
    alignItems: "center",
  },
  changePhotoHintText: {
    fontSize: 12,
    color: "rgba(255,255,255,0.9)",
    fontWeight: "500",
  },
  urlLink: { marginTop: 12, alignSelf: "flex-start" },
  urlLinkText: { fontSize: 14, color: ACCENT, fontWeight: "600" },
  urlInputWrap: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  urlInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: "#0f172a",
    backgroundColor: "#fff",
  },
  urlCloseBtn: { padding: 8 },
  urlCloseText: { fontSize: 14, color: "#64748b", fontWeight: "500" },

  section: { marginBottom: 24 },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#64748b",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 10,
  },
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

  availabilityRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  availabilityLeft: { flex: 1, marginRight: 16 },
  availabilityLabel: { fontSize: 15, fontWeight: "600", color: "#0f172a" },
  availabilityHint: {
    fontSize: 13,
    color: "#64748b",
    marginTop: 4,
    lineHeight: 18,
  },
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
