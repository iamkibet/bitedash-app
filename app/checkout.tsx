import { IconSymbol } from "@/components/ui/icon-symbol";
import { getApiErrors, getApiMessage } from "@/lib/api/client";
import { createOrder } from "@/lib/api/orders";
import { initiatePayment } from "@/lib/api/payments";
import { useCartStore } from "@/lib/store/cartStore";
import { useDeliveryLocationStore } from "@/lib/store/deliveryLocationStore";
import { formatKES } from "@/lib/utils/formatters";
import { normalizePhone } from "@/lib/utils/validators";
import type { CartItem } from "@/lib/store/cartStore";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  LayoutAnimation,
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
const SUMMARY_IMAGE_SIZE = 48;

function configureAccordionAnimation() {
  LayoutAnimation.configureNext({
    duration: 220,
    update: { type: LayoutAnimation.Types.easeInEaseOut },
    create: { type: LayoutAnimation.Types.easeInEaseOut, property: LayoutAnimation.Properties.opacity },
    delete: { type: LayoutAnimation.Types.easeInEaseOut, property: LayoutAnimation.Properties.opacity },
  });
}

function DeliveryAddressAccordion({
  expanded,
  onToggle,
  value,
  onChangeText,
  error,
  editable,
}: {
  expanded: boolean;
  onToggle: () => void;
  value: string;
  onChangeText: (t: string) => void;
  error?: string;
  editable: boolean;
}) {
  const handleToggle = () => {
    configureAccordionAnimation();
    onToggle();
  };

  const preview = value.trim()
    ? (value.length > 45 ? `${value.slice(0, 45)}…` : value)
    : "Tap to add delivery address";

  return (
    <View style={styles.accordionCard}>
      <TouchableOpacity
        style={styles.accordionHeader}
        onPress={handleToggle}
        activeOpacity={0.7}
      >
        <View style={styles.accordionHeaderLeft}>
          <View style={styles.accordionIconWrap}>
            <Text style={styles.accordionIcon}>📍</Text>
          </View>
          <View style={styles.accordionHeaderText}>
            <Text style={styles.accordionTitle}>Delivery address</Text>
            <Text
              style={[styles.accordionPreview, !value.trim() && styles.accordionPreviewPlaceholder]}
              numberOfLines={1}
            >
              {preview}
            </Text>
          </View>
        </View>
        <View style={styles.accordionChevronWrap}>
          <IconSymbol
            name={expanded ? "chevron.up" : "chevron.down"}
            size={18}
            color="#9ca3af"
          />
        </View>
      </TouchableOpacity>

      {expanded ? (
        <View style={styles.accordionBody}>
          <Text style={styles.accordionHint}>
            Where should we deliver your order?
          </Text>
          <TextInput
            style={[styles.accordionInput, error && styles.inputError]}
            value={value}
            onChangeText={onChangeText}
            placeholder="Street address, building, or landmark"
            placeholderTextColor="#9ca3af"
            multiline
            numberOfLines={3}
            editable={editable}
          />
          {error ? (
            <Text style={styles.errorText}>{error}</Text>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

function CheckoutHeader({ onBack }: { onBack: () => void }) {
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
      <Text style={styles.headerTitle}>Checkout</Text>
      <View style={styles.backBtn} />
    </View>
  );
}

function SummaryRow({ item }: { item: CartItem }) {
  const { menuItem, quantity } = item;
  const lineTotal = menuItem.price * quantity;

  return (
    <View style={styles.summaryRow}>
      <View style={styles.summaryRowImageWrap}>
        {menuItem.image_url ? (
          <Image
            source={{ uri: menuItem.image_url }}
            style={styles.summaryRowImage}
          />
        ) : (
          <View style={styles.summaryRowPlaceholder}>
            <Text style={styles.summaryRowPlaceholderText}>🍽</Text>
          </View>
        )}
      </View>
      <View style={styles.summaryRowBody}>
        <Text style={styles.summaryRowName} numberOfLines={1}>
          {menuItem.name}
        </Text>
        <Text style={styles.summaryRowMeta}>
          {quantity} × {formatKES(menuItem.price)}
        </Text>
      </View>
      <Text style={styles.summaryRowTotal}>{formatKES(lineTotal)}</Text>
    </View>
  );
}

export default function CheckoutScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { items, restaurantId, getSubtotal, clearCart } = useCartStore();
  const savedLocation = useDeliveryLocationStore((s) => s.location);
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [deliveryAccordionExpanded, setDeliveryAccordionExpanded] = useState(true);
  const [showPhoneStep, setShowPhoneStep] = useState(false);
  const [phone, setPhone] = useState("+254");
  const [orderPlacedId, setOrderPlacedId] = useState<number | null>(null);
  const [orderPlacedTotal, setOrderPlacedTotal] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const didPlaceOrderRef = useRef(false);

  useEffect(() => {
    if (savedLocation?.address && !deliveryAddress) {
      setDeliveryAddress(savedLocation.address);
      setDeliveryAccordionExpanded(false);
    }
  }, [savedLocation?.address]);

  useEffect(() => {
    if (items.length === 0 && !orderPlacedId && !didPlaceOrderRef.current && restaurantId) {
      router.replace("/(tabs)/cart");
    }
  }, [items.length, orderPlacedId, restaurantId]);

  useEffect(() => {
    if (errors.delivery_address) {
      setDeliveryAccordionExpanded(true);
    }
  }, [errors.delivery_address]);

  const handlePlaceOrder = async () => {
    if (!restaurantId) return;
    setErrors({});
    setLoading(true);
    try {
      const order = await createOrder({
        restaurant_id: restaurantId,
        items: items.map((i) => ({
          menu_item_id: i.menuItem.id,
          quantity: i.quantity,
        })),
        delivery_address: deliveryAddress.trim() || undefined,
        notes: notes.trim() || undefined,
      });

      const orderId =
        order?.id ?? (order as { data?: { id: number } })?.data?.id;
      if (orderId == null) {
        Alert.alert("Error", "Invalid order response. Please try again.");
        return;
      }

      const total =
        (order as { total_amount?: number }).total_amount ??
        (order as { total?: number }).total ??
        getSubtotal();
      setOrderPlacedId(orderId);
      setOrderPlacedTotal(total);
      clearCart();
      setShowPhoneStep(true);
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

  const handleConfirmAndPay = async () => {
    if (orderPlacedId == null) return;
    const normalized = normalizePhone(phone);
    if (!/^\+254\d{9}$/.test(normalized)) {
      setErrors({ phone: "Enter a valid Kenyan phone number (+254...)" });
      return;
    }
    setErrors({});
    setLoading(true);
    try {
      await initiatePayment(orderPlacedId, { phone_number: normalized });
      didPlaceOrderRef.current = true;
      Alert.alert(
        "Check your phone",
        "Complete the M-Pesa prompt on your phone to finish payment.",
        [{ text: "OK", onPress: () => router.replace(`/orders/${orderPlacedId}`) }],
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
      setLoading(false);
    }
  };

  const handlePayLater = () => {
    if (orderPlacedId != null) {
      router.replace(`/orders/${orderPlacedId}`);
    }
  };

  if (items.length === 0 && !orderPlacedId && !didPlaceOrderRef.current) return null;
  if (items.length === 0 && didPlaceOrderRef.current) {
    return (
      <View style={styles.container}>
        <View style={styles.centered}>
          <ActivityIndicator size="small" color={ACCENT} />
          <Text style={styles.redirectText}>Opening order...</Text>
        </View>
      </View>
    );
  }

  const subtotal = orderPlacedId != null ? orderPlacedTotal : getSubtotal();
  const footerBottom = Math.max(insets.bottom, 16);
  const orderAlreadyPlaced = orderPlacedId != null;

  return (
    <View style={styles.container}>
      <CheckoutHeader onBack={() => router.back()} />
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {orderAlreadyPlaced ? (
            <View style={styles.placedCard}>
              <Text style={styles.placedCardIcon}>✓</Text>
              <Text style={styles.placedCardTitle}>Order placed</Text>
              <Text style={styles.placedCardMeta}>
                Order #{orderPlacedId} · {formatKES(orderPlacedTotal)}
              </Text>
              <Text style={styles.placedCardHint}>
                Enter your M-Pesa number below to pay now, or pay later from your orders.
              </Text>
            </View>
          ) : (
            <>
              <DeliveryAddressAccordion
                expanded={deliveryAccordionExpanded}
                onToggle={() => setDeliveryAccordionExpanded((e) => !e)}
                value={deliveryAddress}
                onChangeText={setDeliveryAddress}
                error={errors.delivery_address}
                editable={!loading}
              />

              <View style={styles.card}>
                <Text style={styles.cardTitle}>Order summary</Text>
                {items.map((item) => (
                  <SummaryRow key={item.menuItem.id} item={item} />
                ))}
                <View style={styles.subtotalRow}>
                  <Text style={styles.subtotalLabel}>Subtotal</Text>
                  <Text style={styles.subtotalValue}>{formatKES(subtotal)}</Text>
                </View>
              </View>

              <View style={styles.card}>
                <Text style={styles.cardTitle}>Order notes</Text>
                <Text style={styles.cardHint}>Optional instructions for the restaurant</Text>
                <TextInput
                  style={[styles.input, styles.inputSingle, errors.notes && styles.inputError]}
                  value={notes}
                  onChangeText={setNotes}
                  placeholder="e.g. No onions, extra napkins"
                  placeholderTextColor="#9ca3af"
                  editable={!loading}
                />
                {errors.notes ? (
                  <Text style={styles.errorText}>{errors.notes}</Text>
                ) : null}
              </View>
            </>
          )}

          <View style={styles.spacer} />
        </ScrollView>

        <View style={[styles.footer, { paddingBottom: footerBottom }]}>
          <View style={styles.footerRow}>
            <Text style={styles.footerLabel}>Total</Text>
            <Text style={styles.footerTotal}>{formatKES(subtotal)}</Text>
          </View>

          {showPhoneStep ? (
            <>
              <TouchableOpacity
                style={styles.footerBackLink}
                onPress={orderAlreadyPlaced ? handlePayLater : () => setShowPhoneStep(false)}
                hitSlop={8}
              >
                <Text style={styles.footerBackLinkText}>
                  {orderAlreadyPlaced ? "Pay later" : "‹ Change order"}
                </Text>
              </TouchableOpacity>
              <Text style={styles.phoneLabel}>M-Pesa phone number</Text>
              <TextInput
                style={[styles.phoneInput, errors.phone && styles.inputError]}
                value={phone}
                onChangeText={setPhone}
                placeholder="+254712345678"
                placeholderTextColor="#9ca3af"
                keyboardType="phone-pad"
                editable={!loading}
              />
              {errors.phone ? (
                <Text style={styles.errorText}>{errors.phone}</Text>
              ) : null}
              <TouchableOpacity
                style={[
                  styles.placeOrderBtn,
                  styles.placeOrderBtnConfirm,
                  loading && styles.placeOrderBtnDisabled,
                ]}
                onPress={handleConfirmAndPay}
                disabled={loading}
                activeOpacity={0.88}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.placeOrderBtnText}>Confirm & pay</Text>
                )}
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity
              style={[styles.placeOrderBtn, loading && styles.placeOrderBtnDisabled]}
              onPress={handlePlaceOrder}
              disabled={loading}
              activeOpacity={0.88}
            >
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.placeOrderBtnText}>Place order</Text>
              )}
            </TouchableOpacity>
          )}
        </View>
      </KeyboardAvoidingView>
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
  keyboardView: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 20, paddingBottom: 24 },
  placedCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#f0f0f0",
    alignItems: "center",
  },
  placedCardIcon: {
    fontSize: 32,
    color: "#22c55e",
    marginBottom: 12,
  },
  placedCardTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111",
    marginBottom: 4,
  },
  placedCardMeta: {
    fontSize: 14,
    color: "#6b7280",
    marginBottom: 12,
  },
  placedCardHint: {
    fontSize: 13,
    color: "#6b7280",
    textAlign: "center",
    lineHeight: 20,
  },
  accordionCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#f0f0f0",
    overflow: "hidden",
  },
  accordionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  accordionHeaderLeft: { flex: 1, flexDirection: "row", alignItems: "center", minWidth: 0 },
  accordionIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: "#fffbeb",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  accordionIcon: { fontSize: 18 },
  accordionHeaderText: { flex: 1, minWidth: 0 },
  accordionTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111",
  },
  accordionPreview: {
    fontSize: 13,
    color: "#374151",
    marginTop: 2,
  },
  accordionPreviewPlaceholder: {
    color: "#9ca3af",
  },
  accordionChevronWrap: {
    marginLeft: 4,
    width: 24,
    height: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  accordionBody: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingTop: 0,
    borderTopWidth: 1,
    borderTopColor: "#f5f5f5",
  },
  accordionHint: {
    fontSize: 13,
    color: "#6b7280",
    marginBottom: 10,
  },
  accordionInput: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: "#111",
    backgroundColor: "#fafafa",
    minHeight: 88,
    textAlignVertical: "top",
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#f0f0f0",
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111",
    marginBottom: 4,
  },
  cardHint: {
    fontSize: 13,
    color: "#6b7280",
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#f5f5f5",
  },
  summaryRowImageWrap: {
    width: SUMMARY_IMAGE_SIZE,
    height: SUMMARY_IMAGE_SIZE,
    borderRadius: 8,
    overflow: "hidden",
    backgroundColor: "#f0f0f0",
  },
  summaryRowImage: { width: "100%", height: "100%" },
  summaryRowPlaceholder: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  summaryRowPlaceholderText: { fontSize: 20 },
  summaryRowBody: { flex: 1, marginLeft: 12, minWidth: 0 },
  summaryRowName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111",
  },
  summaryRowMeta: {
    fontSize: 12,
    color: "#6b7280",
    marginTop: 2,
  },
  summaryRowTotal: {
    fontSize: 14,
    fontWeight: "600",
    color: ACCENT,
  },
  subtotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
  },
  subtotalLabel: { fontSize: 15, fontWeight: "500", color: "#374151" },
  subtotalValue: { fontSize: 17, fontWeight: "700", color: "#111" },
  input: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: "#111",
    backgroundColor: "#fafafa",
    minHeight: 88,
    textAlignVertical: "top",
  },
  inputSingle: { minHeight: 48 },
  inputError: { borderColor: "#dc2626" },
  errorText: { fontSize: 12, color: "#dc2626", marginTop: 6 },
  spacer: { height: 24 },
  footer: {
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
  },
  footerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  footerLabel: { fontSize: 15, fontWeight: "500", color: "#374151" },
  footerTotal: { fontSize: 20, fontWeight: "700", color: "#111" },
  footerBackLink: { marginBottom: 12 },
  footerBackLinkText: { fontSize: 14, color: "#6b7280" },
  phoneLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: "#374151",
    marginBottom: 8,
  },
  phoneInput: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: "#111",
    backgroundColor: "#fafafa",
    marginBottom: 8,
  },
  placeOrderBtn: {
    backgroundColor: ACCENT,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  placeOrderBtnConfirm: { marginTop: 4 },
  placeOrderBtnDisabled: { opacity: 0.7 },
  placeOrderBtnText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  redirectText: { fontSize: 14, color: "#6b7280" },
});
