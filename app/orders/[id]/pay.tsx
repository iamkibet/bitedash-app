import { IconSymbol } from "@/components/ui/icon-symbol";
import { getApiErrors, getApiMessage, isApiError } from "@/lib/api/client";
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

function PayScreenHeader({ onBack }: { onBack: () => void }) {
  const insets = useSafeAreaInsets();
  const top = insets.top + (Platform.OS === "ios" ? 4 : 8);

  return (
    <View style={[styles.header, { paddingTop: top }]}>
      <Pressable
        onPress={onBack}
        style={styles.backBtn}
        hitSlop={12}
        accessibilityLabel="Go back"
      >
        <IconSymbol name="chevron.left" size={22} color="#374151" />
      </Pressable>
      <Text style={styles.headerTitle}>Pay for order</Text>
      <View style={styles.backBtn} />
    </View>
  );
}

export default function OrderPayScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [phone, setPhone] = useState("+254");
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
          clearInterval(t);
          router.replace(`/orders/${id}`);
        }
      } catch {
        // ignore
      }
    }, 4000);
    return () => clearInterval(t);
  }, [reference, id, router]);

  const handlePay = async () => {
    if (!order) return;
    if (order.payment_status === "paid") {
      router.replace(`/orders/${id}`);
      return;
    }
    const normalized = normalizePhone(phone);
    if (!/^\+254\d{9}$/.test(normalized)) {
      setErrors({ phone: "Enter a valid Kenyan number (+254...)" });
      return;
    }
    setErrors({});
    setPaying(true);
    try {
      const res = await initiatePayment(order.id, { phone_number: normalized });
      const ref = (res as { reference?: string }).reference;
      if (ref) setReference(ref);
      Alert.alert(
        "Check your phone",
        res.message ?? "Complete the M-Pesa prompt on your phone.",
      );
    } catch (e) {
      if (isApiError(e) && e.response?.status === 422) {
        const msg = getApiMessage(e).toLowerCase();
        if (msg.includes("already paid")) {
          const updated = await getOrder(Number(id)).catch(() => order);
          setOrder(updated);
          Alert.alert(
            "Already paid",
            "This order has already been paid.",
            [{ text: "OK", onPress: () => router.replace(`/orders/${id}`) }],
          );
          setPaying(false);
          return;
        }
      }
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
      <View style={styles.container}>
        <View style={styles.centered}>
          <ActivityIndicator size="small" color={ACCENT} />
        </View>
      </View>
    );
  }

  if (!order) {
    return (
      <View style={styles.container}>
        <PayScreenHeader onBack={() => router.back()} />
        <View style={styles.centered}>
          <Text style={styles.emptyText}>Order not found.</Text>
          <TouchableOpacity
            style={styles.backLink}
            onPress={() => router.back()}
          >
            <Text style={styles.backLinkText}>Back to orders</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const isPaid = order.payment_status === "paid";
  const footerBottom = Math.max(insets.bottom, 16);

  return (
    <View style={styles.container}>
      <PayScreenHeader onBack={() => router.back()} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Order summary</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Order #{order.id}</Text>
            <Text style={styles.summaryTotal}>
              {formatKES(order.total_amount)}
            </Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.metaText}>
              {ORDER_STATUS_LABELS[order.status]} ·{" "}
              {PAYMENT_STATUS_LABELS[order.payment_status]}
            </Text>
          </View>
        </View>

        {isPaid ? (
          <View style={styles.card}>
            <View style={styles.successWrap}>
              <Text style={styles.successIcon}>✓</Text>
              <Text style={styles.successTitle}>Already paid</Text>
              <Text style={styles.successSubtext}>
                This order has been paid. You're all set.
              </Text>
              <TouchableOpacity
                style={styles.backToOrderBtn}
                onPress={() => router.back()}
                activeOpacity={0.88}
              >
                <Text style={styles.backToOrderBtnText}>Back to order</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.unpaidBlock}>
            {reference ? (
              <View style={styles.card}>
                <View style={styles.waitingWrap}>
                  <ActivityIndicator size="small" color={ACCENT} />
                  <Text style={styles.waitingText}>
                    Check your phone. Verifying payment...
                  </Text>
                </View>
              </View>
            ) : null}

            <View style={styles.card}>
              <Text style={styles.cardLabel}>M-Pesa</Text>
              <Text style={styles.cardHint}>
                Enter the phone number that will receive the M-Pesa prompt
              </Text>
              <TextInput
                style={[styles.input, errors.phone && styles.inputError]}
                value={phone}
                onChangeText={setPhone}
                placeholder="+254 712 345 678"
                placeholderTextColor="#9ca3af"
                keyboardType="phone-pad"
                editable={!paying}
              />
              {errors.phone ? (
                <Text style={styles.errorText}>{errors.phone}</Text>
              ) : null}
            </View>

            <TouchableOpacity
              style={[styles.payBtn, paying && styles.payBtnDisabled]}
              onPress={handlePay}
              disabled={paying}
              activeOpacity={0.88}
            >
              {paying ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.payBtnText}>Pay with M-Pesa</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        <View style={{ height: footerBottom + 24 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fafafa" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 4,
    paddingBottom: 12,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  backBtn: {
    width: 44,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "600",
    color: "#111",
  },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 24 },
  unpaidBlock: {},
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  emptyText: { fontSize: 14, color: "#6b7280", marginBottom: 12 },
  backLink: { paddingVertical: 8 },
  backLinkText: { fontSize: 15, fontWeight: "600", color: ACCENT },
  card: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#f0f0f0",
  },
  cardLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#6b7280",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  cardHint: {
    fontSize: 13,
    color: "#6b7280",
    marginBottom: 12,
    lineHeight: 18,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  summaryLabel: { fontSize: 15, color: "#374151" },
  summaryTotal: { fontSize: 20, fontWeight: "700", color: "#111" },
  metaRow: { marginTop: 8 },
  metaText: { fontSize: 13, color: "#6b7280" },
  successWrap: {
    alignItems: "center",
    paddingVertical: 8,
  },
  successIcon: {
    fontSize: 40,
    color: "#22c55e",
    marginBottom: 12,
  },
  successTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111",
    marginBottom: 6,
  },
  successSubtext: {
    fontSize: 14,
    color: "#6b7280",
    textAlign: "center",
    marginBottom: 20,
  },
  backToOrderBtn: {
    backgroundColor: ACCENT,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  backToOrderBtnText: { fontSize: 15, fontWeight: "600", color: "#fff" },
  waitingWrap: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 8,
  },
  waitingText: {
    fontSize: 14,
    color: "#92400e",
    fontWeight: "500",
  },
  input: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 16,
    color: "#111",
    backgroundColor: "#fafafa",
  },
  inputError: { borderColor: "#dc2626" },
  errorText: { fontSize: 12, color: "#dc2626", marginTop: 8 },
  payBtn: {
    backgroundColor: ACCENT,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  payBtnDisabled: { opacity: 0.7 },
  payBtnText: { fontSize: 16, fontWeight: "600", color: "#fff" },
});
