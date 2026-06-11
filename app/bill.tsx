import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import Animated, { FadeInDown, ZoomIn } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

export default function BillScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { pendingBill, setPendingBill, addSale, clearCart } = useApp();

  const [selectedPayment, setSelectedPayment] = useState<"cash" | "online" | "credit" | null>(null);
  const [creditModalVisible, setCreditModalVisible] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [paid, setPaid] = useState(false);
  const [paidSaleInfo, setPaidSaleInfo] = useState<{ total: number; method: string; billNo: string } | null>(null);

  const [discountModal, setDiscountModal] = useState(false);
  const [discountInput, setDiscountInput] = useState("");
  const [discount, setDiscount] = useState(0);

  const bill = pendingBill ?? [];
  const subtotal = bill.reduce((sum, item) => sum + item.product.rate * item.quantity, 0);
  const netTotal = Math.max(0, subtotal - discount);

  const now = new Date();
  const billNo = now.getTime().toString().slice(-6);
  const dateStr = now.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  const timeStr = now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });

  const applyDiscount = () => {
    const val = parseFloat(discountInput);
    if (isNaN(val) || val < 0) { Alert.alert("Error", "Enter valid discount amount"); return; }
    if (val >= subtotal) { Alert.alert("Error", `Discount cannot be ₹${subtotal.toFixed(2)} or more`); return; }
    setDiscount(val);
    setDiscountModal(false);
    setDiscountInput("");
  };

  const buildReceiptText = (method: string, customer?: string) => {
    const lines = [
      "━━━━━━━━━━━━━━━━━━━━━━━━",
      "     REHOBOTH KITCHEN",
      "━━━━━━━━━━━━━━━━━━━━━━━━",
      `Bill #${billNo}   ${dateStr}`,
      `Time: ${timeStr}`,
      "─────────────────────────",
      ...bill.map((i) =>
        `${i.product.name.padEnd(18)} x${i.quantity}  ₹${(i.product.rate * i.quantity).toFixed(2)}`
      ),
      "─────────────────────────",
      ...(discount > 0
        ? [`Subtotal:            ₹${subtotal.toFixed(2)}`, `Discount:           -₹${discount.toFixed(2)}`]
        : []),
      `TOTAL:               ₹${netTotal.toFixed(2)}`,
      `Payment: ${method.toUpperCase()}`,
      ...(customer ? [`Customer: ${customer}`] : []),
      "━━━━━━━━━━━━━━━━━━━━━━━━",
      "     Thank you! Visit again",
      "━━━━━━━━━━━━━━━━━━━━━━━━",
    ];
    return lines.join("\n");
  };

  const handleShareReceipt = async () => {
    if (!paidSaleInfo) return;
    const methodLabel = selectedPayment === "cash" ? "Cash" : selectedPayment === "online" ? "Online" : "Credit";
    const text = buildReceiptText(methodLabel, selectedPayment === "credit" ? customerName : undefined);
    try {
      await Share.share({ message: text, title: `Bill #${paidSaleInfo.billNo}` });
    } catch { /* user cancelled */ }
  };

  const handlePay = (method: "cash" | "online" | "credit") => {
    setSelectedPayment(method);
    if (method === "credit") {
      setCreditModalVisible(true);
    } else {
      confirmPayment(method);
    }
  };

  const confirmPayment = (method: "cash" | "online" | "credit", cName?: string) => {
    const label = method === "cash" ? "Cash" : method === "online" ? "Online" : "Credit";
    Alert.alert(
      "Confirm Payment",
      method === "credit"
        ? `Record ₹${netTotal.toFixed(2)} as credit for ${cName}?`
        : `Confirm ${label} payment of ₹${netTotal.toFixed(2)}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Confirm",
          onPress: () => {
            addSale(bill, method, cName, discount);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            clearCart();
            setPendingBill(null);
            setPaidSaleInfo({ total: netTotal, method: label, billNo });
            setCustomerName(cName ?? "");
            setPaid(true);
          },
        },
      ]
    );
  };

  if (paid && paidSaleInfo) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top, paddingBottom: insets.bottom + 24 }]}>
        <Animated.View entering={FadeInDown.springify()} style={styles.successWrap}>
          <Animated.View entering={ZoomIn.delay(100).springify()}>
            <LinearGradient colors={["#1B5E20", "#2E7D32"]} style={styles.successCircle}>
              <Ionicons name="checkmark" size={64} color="#fff" />
            </LinearGradient>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(200).springify()} style={{ alignItems: "center", gap: 6 }}>
            <Text style={[styles.successTitle, { color: colors.foreground }]}>Payment Confirmed!</Text>
            <Text style={[styles.successAmt, { color: colors.primary }]}>₹ {paidSaleInfo.total.toFixed(2)}</Text>
            <View style={[styles.methodBadge, { backgroundColor: colors.secondary }]}>
              <Text style={[styles.methodBadgeText, { color: colors.primary }]}>{paidSaleInfo.method}</Text>
            </View>
            {selectedPayment === "credit" && customerName && (
              <Text style={[styles.successCust, { color: colors.mutedForeground }]}>Customer: {customerName}</Text>
            )}
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(350).springify()} style={styles.successBtns}>
            <Pressable
              onPress={handleShareReceipt}
              style={({ pressed }) => [styles.shareBtn, { borderColor: colors.border, opacity: pressed ? 0.7 : 1 }]}
            >
              <Ionicons name="share-social-outline" size={20} color={colors.primary} />
              <Text style={[styles.shareBtnText, { color: colors.primary }]}>Share Receipt</Text>
            </Pressable>

            <Pressable
              onPress={() => { clearCart(); setPendingBill(null); router.replace("/billing"); }}
              style={({ pressed }) => [styles.newOrderBtn, pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] }]}
            >
              <LinearGradient colors={["#1565C0", "#0D47A1"]} style={styles.newOrderGrad}>
                <Ionicons name="add-circle-outline" size={20} color="#fff" />
                <Text style={styles.newOrderText}>New Order</Text>
              </LinearGradient>
            </Pressable>
          </Animated.View>
        </Animated.View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: "#F0F4FF" }]}>
      <LinearGradient
        colors={["#0D47A1", "#1565C0"]}
        style={[styles.header, { paddingTop: insets.top + (Platform.OS === "web" ? 55 : 12) }]}
      >
        <View style={styles.headerRow}>
          <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={8}>
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </Pressable>
          <Text style={styles.headerTitle}>Bill Preview</Text>
          <Pressable
            onPress={() => setDiscountModal(true)}
            style={[styles.discountBtn, discount > 0 && { backgroundColor: "#FFD740" }]}
            hitSlop={8}
          >
            <Ionicons name="pricetag-outline" size={16} color={discount > 0 ? "#0D47A1" : "#fff"} />
            <Text style={[styles.discountBtnText, discount > 0 && { color: "#0D47A1" }]}>
              {discount > 0 ? `-₹${discount}` : "Discount"}
            </Text>
          </Pressable>
        </View>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 120, paddingTop: Platform.OS === "web" ? 0 : 0 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeInDown.springify()} style={styles.receipt}>
          <LinearGradient colors={["#0D47A1", "#1565C0"]} style={styles.receiptHeader}>
            <Text style={styles.restaurantName}>REHOBOTH KITCHEN</Text>
            <Text style={styles.receiptSub}>Bill Receipt</Text>
          </LinearGradient>

          <View style={styles.receiptBody}>
            <View style={styles.metaRow}>
              <View>
                <Text style={[styles.metaLabel, { color: colors.mutedForeground }]}>Bill No.</Text>
                <Text style={[styles.metaVal, { color: colors.foreground }]}>#{billNo}</Text>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={[styles.metaLabel, { color: colors.mutedForeground }]}>{dateStr}</Text>
                <Text style={[styles.metaVal, { color: colors.foreground }]}>{timeStr}</Text>
              </View>
            </View>

            <View style={[styles.divider, { backgroundColor: colors.border }]} />

            <View style={styles.tableHeader}>
              <Text style={[styles.th, { color: colors.mutedForeground, flex: 3 }]}>ITEM</Text>
              <Text style={[styles.th, { color: colors.mutedForeground, flex: 1, textAlign: "center" }]}>QTY</Text>
              <Text style={[styles.th, { color: colors.mutedForeground, flex: 1, textAlign: "right" }]}>RATE</Text>
              <Text style={[styles.th, { color: colors.mutedForeground, flex: 1.5, textAlign: "right" }]}>AMT</Text>
            </View>

            {bill.map((item) => (
              <View key={item.product.id} style={styles.tableRow}>
                <Text style={[styles.td, { color: colors.foreground, flex: 3 }]} numberOfLines={2}>
                  {item.product.name}
                </Text>
                <Text style={[styles.td, { color: colors.foreground, flex: 1, textAlign: "center" }]}>
                  {item.quantity}
                </Text>
                <Text style={[styles.td, { color: colors.foreground, flex: 1, textAlign: "right" }]}>
                  {item.product.rate}
                </Text>
                <Text style={[styles.tdAmt, { color: colors.foreground, flex: 1.5 }]}>
                  {(item.product.rate * item.quantity).toFixed(2)}
                </Text>
              </View>
            ))}

            <View style={[styles.divider, { backgroundColor: colors.border }]} />

            {discount > 0 && (
              <>
                <View style={styles.subRow}>
                  <Text style={[styles.subLabel, { color: colors.mutedForeground }]}>Subtotal</Text>
                  <Text style={[styles.subVal, { color: colors.foreground }]}>₹ {subtotal.toFixed(2)}</Text>
                </View>
                <View style={styles.subRow}>
                  <View style={styles.discountTag}>
                    <Ionicons name="pricetag" size={12} color="#2E7D32" />
                    <Text style={[styles.subLabel, { color: "#2E7D32" }]}>Discount</Text>
                  </View>
                  <Text style={[styles.subVal, { color: "#2E7D32" }]}>- ₹ {discount.toFixed(2)}</Text>
                </View>
              </>
            )}

            <View style={styles.totalRow}>
              <Text style={[styles.totalLabel, { color: colors.foreground }]}>TOTAL</Text>
              <Text style={[styles.totalAmt, { color: colors.primary }]}>₹ {netTotal.toFixed(2)}</Text>
            </View>
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(150).springify()}>
          <Text style={[styles.payLabel, { color: colors.foreground }]}>Select Payment Method</Text>
          <View style={styles.payRow}>
            {(["cash", "online", "credit"] as const).map((method) => {
              const icons = { cash: "cash-outline", online: "phone-portrait-outline", credit: "people-outline" } as const;
              const labels = { cash: "Cash", online: "Online", credit: "Credit" };
              const bg = { cash: "#2E7D32", online: "#1565C0", credit: "#D32F2F" };
              return (
                <Pressable
                  key={method}
                  onPress={() => handlePay(method)}
                  style={({ pressed }) => [
                    styles.payBtn,
                    { backgroundColor: bg[method], transform: [{ scale: pressed ? 0.96 : 1 }] },
                  ]}
                >
                  <Ionicons name={icons[method]} size={28} color="#fff" />
                  <Text style={styles.payBtnText}>{labels[method]}</Text>
                  <Text style={styles.payBtnAmt}>₹{netTotal.toFixed(0)}</Text>
                </Pressable>
              );
            })}
          </View>
        </Animated.View>
      </ScrollView>

      <View style={[styles.modifyBar, { borderTopColor: colors.border, backgroundColor: colors.background, paddingBottom: insets.bottom + 8 }]}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [styles.modifyBtn, { borderColor: colors.primary, opacity: pressed ? 0.7 : 1 }]}
        >
          <Ionicons name="create-outline" size={18} color={colors.primary} />
          <Text style={[styles.modifyText, { color: colors.primary }]}>Modify Bill</Text>
        </Pressable>
      </View>

      {/* Discount Modal */}
      <Modal visible={discountModal} transparent animationType="slide" onRequestClose={() => setDiscountModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.background }]}>
            <View style={styles.modalHeaderRow}>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>Apply Discount</Text>
              <Pressable onPress={() => setDiscountModal(false)} hitSlop={8}>
                <Ionicons name="close" size={24} color={colors.mutedForeground} />
              </Pressable>
            </View>
            <Text style={[styles.modalSub, { color: colors.mutedForeground }]}>
              Subtotal: ₹ {subtotal.toFixed(2)}
            </Text>
            <TextInput
              style={[styles.modalInput, { borderColor: colors.border, color: colors.foreground, backgroundColor: colors.card }]}
              placeholder="Discount amount (₹)"
              placeholderTextColor={colors.mutedForeground}
              value={discountInput}
              onChangeText={setDiscountInput}
              keyboardType="numeric"
              autoFocus
            />
            <View style={styles.quickDiscRow}>
              {[10, 20, 50].map((amt) => (
                <Pressable key={amt} onPress={() => setDiscountInput(amt.toString())}
                  style={[styles.quickDisc, { backgroundColor: colors.secondary }]}>
                  <Text style={[styles.quickDiscText, { color: colors.primary }]}>₹{amt}</Text>
                </Pressable>
              ))}
              {discount > 0 && (
                <Pressable onPress={() => { setDiscount(0); setDiscountModal(false); }}
                  style={[styles.quickDisc, { backgroundColor: "#FFEBEE" }]}>
                  <Text style={[styles.quickDiscText, { color: "#D32F2F" }]}>Remove</Text>
                </Pressable>
              )}
            </View>
            <Pressable onPress={applyDiscount} style={styles.applyBtn}>
              <LinearGradient colors={["#2E7D32", "#1B5E20"]} style={styles.applyGrad}>
                <Ionicons name="pricetag-outline" size={18} color="#fff" />
                <Text style={styles.applyText}>Apply Discount</Text>
              </LinearGradient>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Credit Modal */}
      <Modal visible={creditModalVisible} transparent animationType="slide" onRequestClose={() => setCreditModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.background }]}>
            <View style={styles.modalHeaderRow}>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>Credit Payment</Text>
              <Pressable onPress={() => { setCreditModalVisible(false); setCustomerName(""); setSelectedPayment(null); }} hitSlop={8}>
                <Ionicons name="close" size={24} color={colors.mutedForeground} />
              </Pressable>
            </View>
            <Text style={[styles.modalSub, { color: colors.mutedForeground }]}>
              ₹ {netTotal.toFixed(2)} will be added to customer credit
            </Text>
            <TextInput
              style={[styles.modalInput, { borderColor: colors.border, color: colors.foreground, backgroundColor: colors.card }]}
              placeholder="Enter customer name"
              placeholderTextColor={colors.mutedForeground}
              value={customerName}
              onChangeText={setCustomerName}
              autoFocus
            />
            <View style={styles.modalBtns}>
              <Pressable onPress={() => { setCreditModalVisible(false); setCustomerName(""); setSelectedPayment(null); }}
                style={[styles.modalBtn, { backgroundColor: colors.secondary }]}>
                <Text style={[styles.modalBtnText, { color: colors.primary }]}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  if (!customerName.trim()) { Alert.alert("Error", "Please enter customer name"); return; }
                  setCreditModalVisible(false);
                  confirmPayment("credit", customerName.trim());
                }}
                style={[styles.modalBtn, { backgroundColor: "#D32F2F" }]}
              >
                <Text style={[styles.modalBtnText, { color: "#fff" }]}>Add Credit</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingBottom: 16 },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16 },
  backBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 18, fontFamily: "Inter_700Bold", color: "#fff" },
  discountBtn: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: "rgba(255,255,255,0.2)", borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 8,
  },
  discountBtnText: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: "#fff" },
  scrollContent: { paddingHorizontal: 16, paddingTop: 20, gap: 20 },
  receipt: {
    borderRadius: 16, overflow: "hidden",
    shadowColor: "#000", shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12, shadowRadius: 16, elevation: 8, backgroundColor: "#fff",
  },
  receiptHeader: { padding: 20, alignItems: "center" },
  restaurantName: { fontSize: 18, fontFamily: "Inter_700Bold", color: "#fff", letterSpacing: 2 },
  receiptSub: { fontSize: 11, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.7)", marginTop: 4, letterSpacing: 1.5, textTransform: "uppercase" },
  receiptBody: { padding: 16 },
  metaRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 12 },
  metaLabel: { fontSize: 11, fontFamily: "Inter_400Regular" },
  metaVal: { fontSize: 14, fontFamily: "Inter_600SemiBold", marginTop: 2 },
  divider: { height: 1, marginVertical: 12 },
  tableHeader: { flexDirection: "row", marginBottom: 8 },
  th: { fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 0.5 },
  tableRow: { flexDirection: "row", alignItems: "center", paddingVertical: 6 },
  td: { fontSize: 14, fontFamily: "Inter_400Regular" },
  tdAmt: { fontSize: 14, fontFamily: "Inter_600SemiBold", textAlign: "right" },
  subRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 6 },
  discountTag: { flexDirection: "row", alignItems: "center", gap: 4 },
  subLabel: { fontSize: 13, fontFamily: "Inter_400Regular" },
  subVal: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  totalRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 10 },
  totalLabel: { fontSize: 16, fontFamily: "Inter_700Bold" },
  totalAmt: { fontSize: 24, fontFamily: "Inter_700Bold" },
  payLabel: { fontSize: 15, fontFamily: "Inter_600SemiBold", textAlign: "center" },
  payRow: { flexDirection: "row", gap: 10, marginTop: 12 },
  payBtn: { flex: 1, alignItems: "center", justifyContent: "center", borderRadius: 16, paddingVertical: 18, gap: 6 },
  payBtnText: { color: "#fff", fontSize: 13, fontFamily: "Inter_700Bold" },
  payBtnAmt: { color: "rgba(255,255,255,0.8)", fontSize: 11, fontFamily: "Inter_400Regular" },
  modifyBar: { position: "absolute", bottom: 0, left: 0, right: 0, paddingTop: 12, paddingHorizontal: 20, borderTopWidth: 1 },
  modifyBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", borderWidth: 1.5, borderRadius: 12, paddingVertical: 12, gap: 8 },
  modifyText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalCard: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 28, gap: 16 },
  modalHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  modalTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  modalSub: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: -8 },
  modalInput: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 15, fontFamily: "Inter_400Regular" },
  quickDiscRow: { flexDirection: "row", gap: 10 },
  quickDisc: { flex: 1, alignItems: "center", paddingVertical: 10, borderRadius: 10 },
  quickDiscText: { fontSize: 14, fontFamily: "Inter_700Bold" },
  applyBtn: { borderRadius: 14, overflow: "hidden" },
  applyGrad: { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 15, gap: 8 },
  applyText: { color: "#fff", fontSize: 15, fontFamily: "Inter_700Bold" },
  modalBtns: { flexDirection: "row", gap: 12 },
  modalBtn: { flex: 1, alignItems: "center", borderRadius: 12, paddingVertical: 14 },
  modalBtnText: { fontSize: 15, fontFamily: "Inter_700Bold" },
  successWrap: { flex: 1, alignItems: "center", justifyContent: "center", gap: 20, paddingHorizontal: 32 },
  successCircle: { width: 120, height: 120, borderRadius: 60, alignItems: "center", justifyContent: "center" },
  successTitle: { fontSize: 26, fontFamily: "Inter_700Bold" },
  successAmt: { fontSize: 36, fontFamily: "Inter_700Bold" },
  methodBadge: { paddingHorizontal: 20, paddingVertical: 6, borderRadius: 20 },
  methodBadgeText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  successCust: { fontSize: 14, fontFamily: "Inter_400Regular" },
  successBtns: { width: "100%", gap: 12 },
  shareBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    borderWidth: 1.5, borderRadius: 14, paddingVertical: 14, gap: 8,
  },
  shareBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  newOrderBtn: { borderRadius: 14, overflow: "hidden" },
  newOrderGrad: { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 15, gap: 8 },
  newOrderText: { color: "#fff", fontSize: 16, fontFamily: "Inter_700Bold" },
});
