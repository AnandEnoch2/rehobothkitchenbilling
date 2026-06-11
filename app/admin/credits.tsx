import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  FlatList,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useApp, type CustomerCredit } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

function CreditCard({
  credit, balance, onPay, onView,
}: {
  credit: CustomerCredit; balance: number;
  onPay: () => void; onView: () => void;
}) {
  const colors = useColors();
  return (
    <Pressable
      onPress={onView}
      style={[styles.creditCard, { backgroundColor: colors.background, borderColor: colors.border }]}
    >
      <LinearGradient colors={["#1565C0", "#0D47A1"]} style={styles.creditAvatar}>
        <Text style={styles.creditAvatarText}>{credit.customerName.charAt(0).toUpperCase()}</Text>
      </LinearGradient>
      <View style={styles.creditInfo}>
        <Text style={[styles.creditName, { color: colors.foreground }]}>{credit.customerName}</Text>
        {credit.mobile ? (
          <Text style={[styles.creditMobile, { color: colors.primary }]}>📞 {credit.mobile}</Text>
        ) : (
          <Text style={[styles.creditMobile, { color: colors.mutedForeground }]}>No mobile</Text>
        )}
        <Text style={[styles.creditTxCount, { color: colors.mutedForeground }]}>
          {credit.transactions.length} transaction{credit.transactions.length !== 1 ? "s" : ""}
        </Text>
      </View>
      <View style={styles.creditRight}>
        <Text style={[styles.creditBalance, { color: balance > 0 ? colors.accent : colors.success }]}>
          ₹{Math.abs(balance).toFixed(2)}
        </Text>
        <Text style={[styles.creditBalanceLabel, { color: balance > 0 ? colors.accent : colors.success }]}>
          {balance > 0 ? "Owes" : "Settled"}
        </Text>
        {balance > 0 && (
          <Pressable onPress={onPay} style={[styles.payNowBtn, { backgroundColor: colors.successLight }]} hitSlop={4}>
            <Text style={[styles.payNowText, { color: colors.success }]}>Pay</Text>
          </Pressable>
        )}
      </View>
    </Pressable>
  );
}

export default function CreditsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { credits, addCreditPayment, getCustomerBalance, updateCustomerMobile } = useApp();

  const [search, setSearch] = useState("");
  const [payModalVisible, setPayModalVisible] = useState(false);
  const [selectedCredit, setSelectedCredit] = useState<CustomerCredit | null>(null);
  const [payAmount, setPayAmount] = useState("");
  const [historyCredit, setHistoryCredit] = useState<CustomerCredit | null>(null);
  const [historyVisible, setHistoryVisible] = useState(false);
  const [mobileModal, setMobileModal] = useState(false);
  const [mobileInput, setMobileInput] = useState("");
  const [mobileTarget, setMobileTarget] = useState<CustomerCredit | null>(null);

  const openPay = (credit: CustomerCredit) => {
    setSelectedCredit(credit);
    setPayAmount("");
    setPayModalVisible(true);
  };

  const openHistory = (credit: CustomerCredit) => {
    setHistoryCredit(credit);
    setHistoryVisible(true);
  };

  const openMobileEdit = (credit: CustomerCredit) => {
    setMobileTarget(credit);
    setMobileInput(credit.mobile ?? "");
    setMobileModal(true);
  };

  const handlePayment = () => {
    if (!selectedCredit) return;
    const amount = parseFloat(payAmount);
    if (isNaN(amount) || amount <= 0) { Alert.alert("Error", "Enter a valid amount"); return; }
    const balance = getCustomerBalance(selectedCredit.id);
    if (amount > balance) {
      Alert.alert("Error", `Payment cannot exceed outstanding credit of ₹${balance.toFixed(2)}`);
      return;
    }
    Alert.alert("Confirm Payment", `Record ₹${amount.toFixed(2)} payment from ${selectedCredit.customerName}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Confirm",
        onPress: () => {
          addCreditPayment(selectedCredit.id, amount);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          setPayModalVisible(false);
        },
      },
    ]);
  };

  const handleSaveMobile = () => {
    if (!mobileTarget) return;
    const mobile = mobileInput.trim();
    if (mobile && !/^[0-9+\- ]{7,15}$/.test(mobile)) {
      Alert.alert("Error", "Enter a valid mobile number");
      return;
    }
    updateCustomerMobile(mobileTarget.id, mobile);
    setMobileModal(false);
  };

  const outstanding = credits.filter((c) => getCustomerBalance(c.id) > 0);
  const settled = credits.filter((c) => getCustomerBalance(c.id) <= 0);
  const totalOutstanding = outstanding.reduce((sum, c) => sum + getCustomerBalance(c.id), 0);

  const sortedCredits = [
    ...outstanding.sort((a, b) => getCustomerBalance(b.id) - getCustomerBalance(a.id)),
    ...settled,
  ];

  const filtered = search.trim()
    ? sortedCredits.filter(
        (c) =>
          c.customerName.toLowerCase().includes(search.toLowerCase()) ||
          (c.mobile && c.mobile.includes(search))
      )
    : sortedCredits;

  return (
    <View style={[styles.container, { backgroundColor: "#F0F4FF" }]}>
      <LinearGradient
        colors={["#0D47A1", "#1565C0"]}
        style={[styles.header, { paddingTop: insets.top + (Platform.OS === "web" ? 67 : 12) }]}
      >
        <View style={styles.headerRow}>
          <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={8}>
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </Pressable>
          <Text style={styles.headerTitle}>Credit Management</Text>
          <View style={{ width: 38 }} />
        </View>

        <View style={[styles.searchWrap, { marginHorizontal: 16, marginBottom: 12 }]}>
          <Ionicons name="search" size={18} color="#78909C" style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name or mobile..."
            placeholderTextColor="#90A4AE"
            value={search}
            onChangeText={setSearch}
            autoCorrect={false}
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch("")} hitSlop={8}>
              <Ionicons name="close-circle" size={18} color="#90A4AE" />
            </Pressable>
          )}
        </View>

        <View style={styles.summaryRow}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryValue}>₹{totalOutstanding.toFixed(2)}</Text>
            <Text style={styles.summaryLabel}>Total Outstanding</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryValue}>{outstanding.length}</Text>
            <Text style={styles.summaryLabel}>With Credit</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryValue}>{settled.length}</Text>
            <Text style={styles.summaryLabel}>Settled</Text>
          </View>
        </View>
      </LinearGradient>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <CreditCard
            credit={item}
            balance={getCustomerBalance(item.id)}
            onPay={() => openPay(item)}
            onView={() => openHistory(item)}
          />
        )}
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 24 }]}
        ListHeaderComponent={
          filtered.length > 0 ? (
            <Text style={[styles.listHeader, { color: colors.mutedForeground }]}>
              Tap a customer to view history
            </Text>
          ) : null
        }
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Ionicons name="people-outline" size={48} color={colors.border} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              {search ? "No customers found" : "No credit records yet"}
            </Text>
          </View>
        }
      />

      {/* Pay Modal */}
      <Modal visible={payModalVisible} transparent animationType="slide" onRequestClose={() => setPayModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.background, paddingBottom: insets.bottom + 16 }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>Record Payment</Text>
              <Pressable onPress={() => setPayModalVisible(false)} hitSlop={8}>
                <Ionicons name="close" size={24} color={colors.mutedForeground} />
              </Pressable>
            </View>
            {selectedCredit && (
              <>
                <View style={[styles.customerRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Ionicons name="person-circle-outline" size={32} color={colors.primary} />
                  <View style={styles.customerInfo}>
                    <Text style={[styles.customerName, { color: colors.foreground }]}>{selectedCredit.customerName}</Text>
                    {selectedCredit.mobile && (
                      <Text style={[styles.customerMobile, { color: colors.primary }]}>📞 {selectedCredit.mobile}</Text>
                    )}
                    <Text style={[styles.customerBalance, { color: colors.accent }]}>
                      Outstanding: ₹{getCustomerBalance(selectedCredit.id).toFixed(2)}
                    </Text>
                  </View>
                </View>
                <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Payment Amount (₹)</Text>
                <TextInput
                  style={[styles.input, { borderColor: colors.border, color: colors.foreground, backgroundColor: colors.card }]}
                  placeholder={`Max ₹${getCustomerBalance(selectedCredit.id).toFixed(2)}`}
                  placeholderTextColor={colors.mutedForeground}
                  value={payAmount}
                  onChangeText={setPayAmount}
                  keyboardType="numeric"
                  autoFocus
                />
                <View style={styles.quickAmtRow}>
                  {[100, 200, 500].map((amt) => {
                    const balance = getCustomerBalance(selectedCredit.id);
                    if (amt > balance) return null;
                    return (
                      <Pressable key={amt} onPress={() => setPayAmount(amt.toString())} style={[styles.quickAmt, { backgroundColor: colors.secondary }]}>
                        <Text style={[styles.quickAmtText, { color: colors.primary }]}>₹{amt}</Text>
                      </Pressable>
                    );
                  })}
                  <Pressable
                    onPress={() => setPayAmount(getCustomerBalance(selectedCredit.id).toFixed(2))}
                    style={[styles.quickAmt, { backgroundColor: colors.successLight }]}
                  >
                    <Text style={[styles.quickAmtText, { color: colors.success }]}>Full</Text>
                  </Pressable>
                </View>
                <Pressable onPress={handlePayment} style={({ pressed }) => [styles.saveBtn, pressed && { opacity: 0.85 }]}>
                  <LinearGradient colors={["#2E7D32", "#1B5E20"]} style={styles.saveGrad}>
                    <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
                    <Text style={styles.saveBtnText}>Record Payment</Text>
                  </LinearGradient>
                </Pressable>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* History Modal */}
      <Modal visible={historyVisible} transparent animationType="slide" onRequestClose={() => setHistoryVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.historyCard, { backgroundColor: colors.background, paddingBottom: insets.bottom + 16 }]}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.modalTitle, { color: colors.foreground }]}>{historyCredit?.customerName}</Text>
                {historyCredit?.mobile && (
                  <Text style={[styles.customerMobile, { color: colors.primary }]}>📞 {historyCredit.mobile}</Text>
                )}
              </View>
              <View style={{ flexDirection: "row", gap: 8 }}>
                <Pressable
                  onPress={() => { setHistoryVisible(false); if (historyCredit) openMobileEdit(historyCredit); }}
                  hitSlop={8}
                  style={[styles.editMobileBtn, { backgroundColor: colors.secondary }]}
                >
                  <Ionicons name="call-outline" size={16} color={colors.primary} />
                </Pressable>
                <Pressable onPress={() => setHistoryVisible(false)} hitSlop={8}>
                  <Ionicons name="close" size={24} color={colors.mutedForeground} />
                </Pressable>
              </View>
            </View>

            {historyCredit && (
              <>
                <Text style={[styles.historyBalance, { color: getCustomerBalance(historyCredit.id) > 0 ? colors.accent : colors.success }]}>
                  Balance: ₹{getCustomerBalance(historyCredit.id).toFixed(2)}
                </Text>
                <FlatList
                  data={historyCredit.transactions.slice().sort((a, b) => b.timestamp - a.timestamp)}
                  keyExtractor={(tx) => tx.id}
                  style={styles.txList}
                  renderItem={({ item: tx }) => (
                    <View style={[styles.txRow, { borderBottomColor: colors.border }]}>
                      <View style={[styles.txIcon, { backgroundColor: tx.type === "credit" ? colors.accentLight : colors.successLight }]}>
                        <Ionicons name={tx.type === "credit" ? "arrow-up" : "arrow-down"} size={16} color={tx.type === "credit" ? colors.accent : colors.success} />
                      </View>
                      <View style={styles.txInfo}>
                        <Text style={[styles.txType, { color: colors.foreground }]}>
                          {tx.type === "credit" ? "Credit Added" : "Payment Received"}
                        </Text>
                        <Text style={[styles.txDate, { color: colors.mutedForeground }]}>
                          {new Date(tx.timestamp).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                        </Text>
                      </View>
                      <Text style={[styles.txAmt, { color: tx.type === "credit" ? colors.accent : colors.success }]}>
                        {tx.type === "credit" ? "+" : "-"}₹{tx.amount.toFixed(2)}
                      </Text>
                    </View>
                  )}
                  ListEmptyComponent={<Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No transactions</Text>}
                />
                {getCustomerBalance(historyCredit.id) > 0 && (
                  <Pressable
                    onPress={() => { setHistoryVisible(false); openPay(historyCredit); }}
                    style={({ pressed }) => [styles.saveBtn, { marginTop: 12 }, pressed && { opacity: 0.85 }]}
                  >
                    <LinearGradient colors={["#2E7D32", "#1B5E20"]} style={styles.saveGrad}>
                      <Text style={styles.saveBtnText}>Record Payment</Text>
                    </LinearGradient>
                  </Pressable>
                )}
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Mobile Edit Modal */}
      <Modal visible={mobileModal} transparent animationType="slide" onRequestClose={() => setMobileModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.background, paddingBottom: insets.bottom + 16 }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>Mobile Number</Text>
              <Pressable onPress={() => setMobileModal(false)} hitSlop={8}>
                <Ionicons name="close" size={24} color={colors.mutedForeground} />
              </Pressable>
            </View>
            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>
              Customer: {mobileTarget?.customerName}
            </Text>
            <TextInput
              style={[styles.input, { borderColor: colors.border, color: colors.foreground, backgroundColor: colors.card }]}
              placeholder="Enter mobile number"
              placeholderTextColor={colors.mutedForeground}
              value={mobileInput}
              onChangeText={setMobileInput}
              keyboardType="phone-pad"
              autoFocus
            />
            <Pressable onPress={handleSaveMobile} style={({ pressed }) => [styles.saveBtn, pressed && { opacity: 0.85 }]}>
              <LinearGradient colors={["#1565C0", "#0D47A1"]} style={styles.saveGrad}>
                <Ionicons name="save-outline" size={20} color="#fff" />
                <Text style={styles.saveBtnText}>Save Mobile</Text>
              </LinearGradient>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingBottom: 16 },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, marginBottom: 12 },
  backBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 18, fontFamily: "Inter_700Bold", color: "#fff" },
  searchWrap: {
    flexDirection: "row", alignItems: "center", backgroundColor: "#fff",
    borderRadius: 12, paddingHorizontal: 14, height: 44,
  },
  searchInput: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular", color: "#0D1B2A" },
  summaryRow: { flexDirection: "row", paddingHorizontal: 16, gap: 8 },
  summaryCard: { flex: 1, backgroundColor: "rgba(255,255,255,0.15)", borderRadius: 12, padding: 12, alignItems: "center" },
  summaryValue: { fontSize: 16, fontFamily: "Inter_700Bold", color: "#fff" },
  summaryLabel: { fontSize: 9, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.7)", marginTop: 3, textAlign: "center" },
  list: { paddingHorizontal: 16, paddingTop: 12 },
  listHeader: { fontSize: 12, fontFamily: "Inter_400Regular", marginBottom: 10 },
  creditCard: { flexDirection: "row", alignItems: "center", borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 10, gap: 12 },
  creditAvatar: { width: 46, height: 46, borderRadius: 23, alignItems: "center", justifyContent: "center" },
  creditAvatarText: { color: "#fff", fontSize: 20, fontFamily: "Inter_700Bold" },
  creditInfo: { flex: 1 },
  creditName: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  creditMobile: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  creditTxCount: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2 },
  creditRight: { alignItems: "flex-end", gap: 4 },
  creditBalance: { fontSize: 17, fontFamily: "Inter_700Bold" },
  creditBalanceLabel: { fontSize: 10, fontFamily: "Inter_400Regular" },
  payNowBtn: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20 },
  payNowText: { fontSize: 12, fontFamily: "Inter_700Bold" },
  emptyWrap: { alignItems: "center", paddingTop: 80, gap: 12 },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center" },
  editMobileBtn: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalCard: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, gap: 12, maxHeight: "85%" },
  historyCard: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, gap: 8, maxHeight: "85%" },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  modalTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  historyBalance: { fontSize: 16, fontFamily: "Inter_700Bold" },
  txList: { maxHeight: 300 },
  txRow: { flexDirection: "row", alignItems: "center", paddingVertical: 10, borderBottomWidth: 1, gap: 12 },
  txIcon: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  txInfo: { flex: 1 },
  txType: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  txDate: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2 },
  txAmt: { fontSize: 15, fontFamily: "Inter_700Bold" },
  customerRow: { flexDirection: "row", alignItems: "center", borderRadius: 12, borderWidth: 1, padding: 14, gap: 12 },
  customerInfo: { flex: 1 },
  customerName: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  customerMobile: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 2 },
  customerBalance: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 2 },
  fieldLabel: { fontSize: 12, fontFamily: "Inter_600SemiBold", letterSpacing: 0.5 },
  input: { borderWidth: 1, borderRadius: 12, padding: 14, fontSize: 15, fontFamily: "Inter_400Regular" },
  quickAmtRow: { flexDirection: "row", gap: 8 },
  quickAmt: { flex: 1, alignItems: "center", paddingVertical: 10, borderRadius: 10 },
  quickAmtText: { fontSize: 14, fontFamily: "Inter_700Bold" },
  saveBtn: { borderRadius: 14, overflow: "hidden", marginTop: 4 },
  saveGrad: { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 16, gap: 8 },
  saveBtnText: { color: "#fff", fontSize: 15, fontFamily: "Inter_700Bold" },
});
