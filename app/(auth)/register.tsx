import { register as registerApi } from "@/lib/api/auth";
import { getApiErrors, getApiMessage } from "@/lib/api/client";
import { useAuthStore } from "@/lib/store/authStore";
import { normalizePhone } from "@/lib/utils/validators";
import { Link, useRouter } from "expo-router";
import { useState } from "react";
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

const ROLES = ["customer", "restaurant", "rider"] as const;

export default function RegisterScreen() {
  const router = useRouter();
  const setUser = useAuthStore((s) => s.setUser);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [role, setRole] = useState<"customer" | "restaurant" | "rider">(
    "customer",
  );
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleRegister = async () => {
    setErrors({});
    if (!name.trim()) {
      setErrors((e) => ({ ...e, name: "Name is required" }));
      return;
    }
    if (!email.trim()) {
      setErrors((e) => ({ ...e, email: "Email is required" }));
      return;
    }
    const normalizedPhone = normalizePhone(phone);
    if (!/^\+254\d{9}$/.test(normalizedPhone)) {
      setErrors((e) => ({
        ...e,
        phone: "Valid Kenyan phone (+254...) required",
      }));
      return;
    }
    if (password.length < 8) {
      setErrors((e) => ({ ...e, password: "At least 8 characters" }));
      return;
    }
    if (password !== passwordConfirmation) {
      setErrors((e) => ({
        ...e,
        password_confirmation: "Passwords do not match",
      }));
      return;
    }
    setLoading(true);
    try {
      const res = await registerApi({
        name: name.trim(),
        email: email.trim(),
        phone: normalizedPhone,
        password,
        password_confirmation: passwordConfirmation,
        role,
      });
      setUser(res.user);
      router.replace("/(tabs)");
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
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.form}>
          <Text style={styles.title}>Create account</Text>
          <Text style={styles.subtitle}>
            Register as customer, restaurant, or rider.
          </Text>

          <TextInput
            style={[styles.input, errors.name && styles.inputError]}
            placeholder="Name"
            value={name}
            onChangeText={setName}
            editable={!loading}
          />
          {errors.name ? (
            <Text style={styles.errorText}>{errors.name}</Text>
          ) : null}

          <TextInput
            style={[styles.input, errors.email && styles.inputError]}
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            editable={!loading}
          />
          {errors.email ? (
            <Text style={styles.errorText}>{errors.email}</Text>
          ) : null}

          <TextInput
            style={[styles.input, errors.phone && styles.inputError]}
            placeholder="Phone +254..."
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            editable={!loading}
          />
          {errors.phone ? (
            <Text style={styles.errorText}>{errors.phone}</Text>
          ) : null}

          <TextInput
            style={[styles.input, errors.password && styles.inputError]}
            placeholder="Password (min 8, mixed case, numbers, symbols)"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            editable={!loading}
          />
          {errors.password ? (
            <Text style={styles.errorText}>{errors.password}</Text>
          ) : null}

          <TextInput
            style={[
              styles.input,
              errors.password_confirmation && styles.inputError,
            ]}
            placeholder="Confirm password"
            value={passwordConfirmation}
            onChangeText={setPasswordConfirmation}
            secureTextEntry
            editable={!loading}
          />
          {errors.password_confirmation ? (
            <Text style={styles.errorText}>{errors.password_confirmation}</Text>
          ) : null}

          <Text style={styles.label}>Role</Text>
          <View style={styles.roleRow}>
            {ROLES.map((r) => (
              <TouchableOpacity
                key={r}
                style={[styles.roleBtn, role === r && styles.roleBtnActive]}
                onPress={() => setRole(r)}
                disabled={loading}
              >
                <Text
                  style={[
                    styles.roleBtnText,
                    role === r && styles.roleBtnTextActive,
                  ]}
                >
                  {r}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleRegister}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Register</Text>
            )}
          </TouchableOpacity>

          <Link href="/(auth)/login" asChild>
            <TouchableOpacity style={styles.link}>
              <Text style={styles.linkText}>
                Already have an account? Sign in
              </Text>
            </TouchableOpacity>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  scrollContent: { padding: 24, paddingBottom: 48 },
  form: { maxWidth: 400, width: "100%", alignSelf: "center" },
  title: { fontSize: 24, fontWeight: "700", color: "#111", marginBottom: 8 },
  subtitle: { fontSize: 16, color: "#666", marginBottom: 24 },
  input: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 8,
    backgroundColor: "#fff",
  },
  inputError: { borderColor: "#dc2626" },
  errorText: { color: "#dc2626", fontSize: 12, marginBottom: 8 },
  label: { fontSize: 14, fontWeight: "500", color: "#374151", marginBottom: 8 },
  roleRow: { flexDirection: "row", gap: 12, marginBottom: 16 },
  roleBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#d1d5db",
    alignItems: "center",
  },
  roleBtnActive: { backgroundColor: "#ed751a", borderColor: "#ed751a" },
  roleBtnText: { fontSize: 14, color: "#374151" },
  roleBtnTextActive: { color: "#fff", fontWeight: "600" },
  button: {
    backgroundColor: "#ed751a",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  link: { marginTop: 24, alignItems: "center" },
  linkText: { color: "#ed751a", fontSize: 14 },
});
