import { useDeliveryLocationStore } from "@/lib/store/deliveryLocationStore";
import { forwardGeocode, reverseGeocode } from "@/lib/utils/geocoding";
import { useRouter } from "expo-router";
import * as Location from "expo-location";
import { useCallback, useEffect, useState } from "react";
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
import { IconSymbol } from "@/components/ui/icon-symbol";

const PRIMARY = "#f59e0b";

export default function SetLocationScreen() {
  const router = useRouter();
  const { location, setLocation, loadLocation } = useDeliveryLocationStore();
  const [manualAddress, setManualAddress] = useState("");
  const [loadingCurrent, setLoadingCurrent] = useState(false);
  const [loadingSearch, setLoadingSearch] = useState(false);

  useEffect(() => {
    loadLocation();
  }, [loadLocation]);

  const handleUseCurrentLocation = useCallback(async () => {
    setLoadingCurrent(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Location access",
          "Allow location access so we can set your delivery address."
        );
        return;
      }
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const { latitude, longitude } = pos.coords;
      const address = await reverseGeocode(latitude, longitude);
      setLocation({
        address: address ?? `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`,
        latitude,
        longitude,
      });
      router.back();
    } catch (e) {
      Alert.alert(
        "Error",
        "Could not get your location. Try entering an address instead."
      );
    } finally {
      setLoadingCurrent(false);
    }
  }, [setLocation, router]);

  const handleConfirmAddress = useCallback(async () => {
    const trimmed = manualAddress.trim();
    if (!trimmed) {
      Alert.alert("Enter address", "Type your delivery address above.");
      return;
    }
    setLoadingSearch(true);
    try {
      const result = await forwardGeocode(trimmed);
      if (result) {
        setLocation({
          address: result.display_name,
          latitude: parseFloat(result.lat),
          longitude: parseFloat(result.lon),
        });
        router.back();
      } else {
        setLocation({
          address: trimmed,
        });
        router.back();
      }
    } catch {
      setLocation({ address: trimmed });
      router.back();
    } finally {
      setLoadingSearch(false);
    }
  }, [manualAddress, setLocation, router]);

  const handleClearLocation = useCallback(() => {
    setLocation(null);
    setManualAddress("");
  }, [setLocation]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={styles.backBtn}
          hitSlop={12}
          accessibilityLabel="Go back"
        >
          <IconSymbol name="chevron.left" size={24} color="#111" />
        </Pressable>
        <Text style={styles.headerTitle}>Delivery location</Text>
        <View style={styles.backBtn} />
      </View>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {location?.address ? (
            <View style={styles.currentCard}>
              <Text style={styles.currentLabel}>Current delivery address</Text>
              <Text style={styles.currentAddress} numberOfLines={3}>
                {location.address}
              </Text>
              <TouchableOpacity
                style={styles.clearBtn}
                onPress={handleClearLocation}
              >
                <Text style={styles.clearBtnText}>Clear and choose again</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Use current location</Text>
            <Text style={styles.sectionSubtitle}>
              We’ll use your device’s location to set your delivery address
            </Text>
            <TouchableOpacity
              style={[styles.primaryBtn, loadingCurrent && styles.btnDisabled]}
              onPress={handleUseCurrentLocation}
              disabled={loadingCurrent}
            >
              {loadingCurrent ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.primaryBtnText}>Use my location</Text>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Enter address</Text>
            <Text style={styles.sectionSubtitle}>
              Type your street address or area name
            </Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Westlands, Nairobi"
              placeholderTextColor="#9ca3af"
              value={manualAddress}
              onChangeText={setManualAddress}
              autoCapitalize="words"
              autoCorrect={false}
            />
            <TouchableOpacity
              style={[styles.secondaryBtn, loadingSearch && styles.btnDisabled]}
              onPress={handleConfirmAddress}
              disabled={loadingSearch}
            >
              {loadingSearch ? (
                <ActivityIndicator color={PRIMARY} size="small" />
              ) : (
                <Text style={styles.secondaryBtnText}>Confirm address</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9fafb" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 8,
    paddingTop: Platform.OS === "ios" ? 56 : 16,
    paddingBottom: 12,
    backgroundColor: "#f9fafb",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  backBtn: {
    width: 44,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#111",
  },
  flex: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  currentCard: {
    backgroundColor: "#fffbeb",
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "#fef3c7",
  },
  currentLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#92400e",
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  currentAddress: {
    fontSize: 15,
    color: "#1f2937",
    lineHeight: 22,
  },
  clearBtn: {
    marginTop: 12,
    alignSelf: "flex-start",
  },
  clearBtnText: {
    fontSize: 14,
    fontWeight: "600",
    color: PRIMARY,
  },
  section: { marginBottom: 8 },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111",
  },
  sectionSubtitle: {
    fontSize: 14,
    color: "#6b7280",
    marginTop: 4,
    marginBottom: 14,
  },
  primaryBtn: {
    backgroundColor: PRIMARY,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  primaryBtnText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
  secondaryBtn: {
    borderWidth: 2,
    borderColor: PRIMARY,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  secondaryBtnText: {
    fontSize: 16,
    fontWeight: "600",
    color: PRIMARY,
  },
  btnDisabled: { opacity: 0.7 },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 24,
    gap: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#e5e7eb",
  },
  dividerText: {
    fontSize: 14,
    color: "#9ca3af",
    fontWeight: "500",
  },
  input: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: "#111",
    marginBottom: 14,
  },
});
