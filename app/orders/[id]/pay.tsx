import { getApiErrors, getApiMessage } from "@/lib/api/client";
import { getOrder } from "@/lib/api/orders";
import { initiatePayment, verifyPayment } from "@/lib/api/payments";
import { ORDER_STATUS_LABELS, PAYMENT_STATUS_LABELS } from "@/lib/constants";
import { formatKES } from "@/lib/utils/formatters";
import { normalizePhone } from "@/lib/utils/validators";
import type { Order } from "@/types/api";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

export default function OrderPayScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [phone, setPhone] = useState("");
  const [paying, setPaying] = useState(false);
  const [reference, setReference] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!id) return;
    getOrder(Number(id))
      .then(setOrder)
      .catch(() => setOrder(null))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!reference || !id) return;
    const t = setInterval(async () => {
      try {
        const res = await verifyPayment(reference);
        if (
          res.status === "completed" ||
          res.status === "paid" ||
          (res as { payment_status?: string }).payment_status === "paid"
        ) {
          const updated = await getOrder(Number(id));
          setOrder(updated);
          setReference(null);
        }
      } catch {
        // ignore
      }
    }, 4000);
    return () => clearInterval(t);
  }, [reference, id]);

  const handlePay = async () => {
    if (!order) return;
    const normalized = normalizePhone(phone);
    if (!/^\+254\d{9}$/.test(normalized)) {
      setErrors({ phone: "Valid Kenyan phone (+254...) required" });
      return;
    }
    setErrors({});
    setPaying(true);
    try {
      const res = await initiatePayment(order.id, { phone_number: normalized });
      const ref = (res as { reference?: string }).reference;
      if (ref) setReference(ref);
      Alert.alert(
        "Success",
        res.message ?? "Check your phone to complete payment.",
      );
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
      setPaying(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#ed751a" />
      </View>
    );
  }

  if (!order) {
    return (
      <View style={styles.centered}>
        <Text style={styles.emptyText}>Order not found.</Text>
      </View>
    );
  }

  const isPaid = order.payment_status === "paid";

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.total}>Total: {formatKES(order.total_amount)}</Text>
        <Text style={styles.meta}>
          {ORDER_STATUS_LABELS[order.status]} ·{" "}
          {PAYMENT_STATUS_LABELS[order.payment_status]}
        </Text>
      </View>
      {isPaid ? (
        <View style={styles.section}>
          <Text style={styles.successText}>This order has been paid.</Text>
          <TouchableOpacity style={styles.button} onPress={() => router.back()}>
            <Text style={styles.buttonText}>Back to order</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          {reference && (
            <Text style={styles.waitingText}>
              Check your phone. Verifying payment...
            </Text>
          )}
          <View style={styles.section}>
            <Text style={styles.label}>M-Pesa phone number</Text>
            <TextInput
              style={[styles.input, errors.phone && styles.inputError]}
              value={phone}
              onChangeText={setPhone}
              placeholder="+254712345678"
              keyboardType="phone-pad"
              editable={!paying}
            />
            {errors.phone ? (
              <Text style={styles.errorText}>{errors.phone}</Text>
            ) : null}
          </View>
          <TouchableOpacity
            style={[styles.button, paying && styles.buttonDisabled]}
            onPress={handlePay}
            disabled={paying}
          >
            {paying ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.buttonText}>Pay with M-Pesa</Text>
            )}
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9fafb", padding: 16 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  emptyText: { color: "#6b7280", fontSize: 16 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  total: { fontSize: 20, fontWeight: "600", color: "#111" },
  meta: { fontSize: 14, color: "#6b7280", marginTop: 8 },
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
  inputError: { borderColor: "#dc2626" },
  errorText: { fontSize: 12, color: "#dc2626", marginTop: 4 },
  waitingText: { color: "#b45309", marginBottom: 16, fontSize: 14 },
  successText: { fontSize: 16, color: "#059669", marginBottom: 16 },
  button: {
    backgroundColor: "#ed751a",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
});
