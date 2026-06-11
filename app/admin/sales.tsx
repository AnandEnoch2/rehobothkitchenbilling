import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  FlatList,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useApp, type Sale, type Expense } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

function SaleCard({ sale }: { sale: Sale }) {
  const colors = useColors();
  const [expanded, setExpanded] = useState(false);
  const payColors: Record<string, string> = { cash: "#2E7D32", online: "#1565C0", credit: "#D32F2F" };
  const payLabels: Record<string, string> = { cash: "Cash", online: "Online", credit: "Credit" };
  const time = new Date(sale.timestamp).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });

  return (
    <Pressable
      onPress={() => setExpanded(!expanded)}
      style={[styles.saleCard, { backgroundColor: colors.background, borderColor: colors.border }]}
    >
      <View style={styles.saleCardTop}>
        <View style={styles.saleLeft}>
          <Text style={[styles.saleId, { color: colors.mutedForeground }]}>#{sale.id.slice(-6)}</Text>
          <Text style={[styles.saleTime, { color: colors.foreground }]}>{time}</Text>
          {sale.customerName && (
            <Text style={[styles.saleCust, { color: colors.mutedForeground }]}>{sale.customerName}</Text>
          )}
        </View>
        <View style={styles.saleRight}>
          <View style={[styles.payBadge, { backgroundColor: payColors[sale.paymentMethod] + "20" }]}>
            <Text style={[styles.payBadgeText, { color: payColors[sale.paymentMethod] }]}>
              {payLabels[sale.paymentMethod]}
            </Text>
          </View>
          <Text style={[styles.saleTotal, { color: colors.foreground }]}>₹ {sale.total.toFixed(2)}</Text>
          <Ionicons name={expanded ? "chevron-up" : "chevron-down"} size={16} color={colors.mutedForeground} />
        </View>
      </View>
      {expanded && (
        <View style={[styles.saleExpanded, { borderTopColor: colors.border }]}>
          {sale.items.map((item) => (
            <View key={item.productId + item.name} style={styles.saleItemRow}>
              <Text style={[styles.saleItemName, { color: colors.foreground }]} numberOfLines={1}>{item.name}</Text>
              <Text style={[styles.saleItemQty, { color: colors.mutedForeground }]}>×{item.quantity}</Text>
              <Text style={[styles.saleItemAmt, { color: colors.foreground }]}>₹{(item.rate * item.quantity).toFixed(2)}</Text>
            </View>
          ))}
        </View>
      )}
    </Pressable>
  );
}

function ExpenseRow({ expense, onDelete }: { expense: Expense; onDelete: () => void }) {
  const colors = useColors();
  return (
    <View style={[styles.expenseRow, { backgroundColor: "#FFF8E1", borderColor: "#FFE082" }]}>
      <View style={styles.expenseIcon}>
        <Ionicons name="arrow-down-circle" size={20} color="#F57F17" />
      </View>
      <View style={styles.expenseInfo}>
        <Text style={[styles.expenseDesc, { color: "#5D4037" }]}>{expense.description}</Text>
        <Text style={[styles.expenseTime, { color: "#8D6E63" }]}>
          {new Date(expense.timestamp).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
        </Text>
      </View>
      <Text style={[styles.expenseAmt, { color: "#E65100" }]}>-₹{expense.amount.toFixed(2)}</Text>
      <Pressable onPress={onDelete} hitSlop={8} style={styles.expenseDelete}>
        <Ionicons name="trash-outline" size={16} color="#D32F2F" />
      </Pressable>
    </View>
  );
}

export default function SalesScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { getSalesForDate, getExpensesForDate, addExpense, removeExpense, getDateStr } = useApp();

  const today = getDateStr();
  const [selectedDate, setSelectedDate] = useState(today);
  const [expenseModal, setExpenseModal] = useState(false);
  const [expDesc, setExpDesc] = useState("");
  const [expAmt, setExpAmt] = useState("");

  const daySales = getSalesForDate(selectedDate);
  const dayExpenses = getExpensesForDate(selectedDate);

  const totalCash = daySales.filter((s) => s.paymentMethod === "cash").reduce((sum, s) => sum + s.total, 0);
  const totalOnline = daySales.filter((s) => s.paymentMethod === "online").reduce((sum, s) => sum + s.total, 0);
  const totalCredit = daySales.filter((s) => s.paymentMethod === "credit").reduce((sum, s) => sum + s.total, 0);
  const grandTotal = daySales.reduce((sum, s) => sum + s.total, 0);
  const totalExpenses = dayExpenses.reduce((sum, e) => sum + e.amount, 0);
  const netTotal = grandTotal - totalExpenses;

  const shiftDate = (days: number) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + days);
    const str = getDateStr(d);
    if (str <= today) setSelectedDate(str);
  };

  const displayDate = new Date(selectedDate + "T00:00:00").toLocaleDateString("en-IN", {
    weekday: "short", day: "2-digit", month: "short", year: "numeric",
  });

  const handleAddExpense = () => {
    const amount = parseFloat(expAmt);
    if (!expDesc.trim()) { Alert.alert("Error", "Enter expense description"); return; }
    if (isNaN(amount) || amount <= 0) { Alert.alert("Error", "Enter valid amount"); return; }
    addExpense(expDesc.trim(), amount);
    setExpDesc("");
    setExpAmt("");
    setExpenseModal(false);
  };

  const handleDeleteExpense = (id: string) => {
    Alert.alert("Delete Expense", "Remove this expense?", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => removeExpense(id) },
    ]);
  };

  const allItems = [
    ...daySales.slice().reverse().map((s) => ({ type: "sale" as const, data: s })),
    ...dayExpenses.slice().reverse().map((e) => ({ type: "expense" as const, data: e })),
  ].sort((a, b) => b.data.timestamp - a.data.timestamp);

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
          <Text style={styles.headerTitle}>Daily Sales Report</Text>
          <Pressable
            onPress={() => setExpenseModal(true)}
            style={styles.addExpBtn}
            hitSlop={8}
          >
            <Ionicons name="remove-circle-outline" size={20} color="#fff" />
            <Text style={styles.addExpBtnText}>Expense</Text>
          </Pressable>
        </View>

        <View style={styles.datePicker}>
          <Pressable onPress={() => shiftDate(-1)} style={styles.dateArrow} hitSlop={8}>
            <Ionicons name="chevron-back" size={20} color="#fff" />
          </Pressable>
          <Text style={styles.dateText}>{displayDate}</Text>
          <Pressable
            onPress={() => shiftDate(1)}
            style={[styles.dateArrow, selectedDate >= today && { opacity: 0.3 }]}
            hitSlop={8}
            disabled={selectedDate >= today}
          >
            <Ionicons name="chevron-forward" size={20} color="#fff" />
          </Pressable>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.summaryRow}>
          {[
            { label: "Cash", value: totalCash, color: "#A5D6A7" },
            { label: "Online", value: totalOnline, color: "#80DEEA" },
            { label: "Credit", value: totalCredit, color: "#EF9A9A" },
            { label: "Gross", value: grandTotal, color: "#FFFFFF" },
            { label: "Expenses", value: -totalExpenses, color: "#FFCC80" },
            { label: "Net", value: netTotal, color: "#B2FF59" },
          ].map(({ label, value, color }) => (
            <View key={label} style={styles.summaryCard}>
              <Text style={[styles.summaryValue, { color }]}>
                {value < 0 ? "-" : ""}₹{Math.abs(value).toFixed(0)}
              </Text>
              <Text style={styles.summaryLabel}>{label}</Text>
            </View>
          ))}
        </ScrollView>
      </LinearGradient>

      <FlatList
        data={allItems}
        keyExtractor={(item) => item.data.id}
        renderItem={({ item }) =>
          item.type === "sale" ? (
            <SaleCard sale={item.data as Sale} />
          ) : (
            <ExpenseRow
              expense={item.data as Expense}
              onDelete={() => handleDeleteExpense(item.data.id)}
            />
          )
        }
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 24 }]}
        ListHeaderComponent={
          allItems.length > 0 ? (
            <Text style={[styles.countText, { color: colors.mutedForeground }]}>
              {daySales.length} sale{daySales.length !== 1 ? "s" : ""}
              {dayExpenses.length > 0 ? ` · ${dayExpenses.length} expense${dayExpenses.length !== 1 ? "s" : ""}` : ""}
            </Text>
          ) : null
        }
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Ionicons name="bar-chart-outline" size={48} color={colors.border} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No records for this date</Text>
          </View>
        }
      />

      <Modal visible={expenseModal} transparent animationType="slide" onRequestClose={() => setExpenseModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.background, paddingBottom: insets.bottom + 16 }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>Add Expense</Text>
              <Pressable onPress={() => setExpenseModal(false)} hitSlop={8}>
                <Ionicons name="close" size={24} color={colors.mutedForeground} />
              </Pressable>
            </View>

            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Description</Text>
            <TextInput
              style={[styles.input, { borderColor: colors.border, color: colors.foreground, backgroundColor: colors.card }]}
              placeholder="e.g. Vegetables, Gas, Electricity..."
              placeholderTextColor={colors.mutedForeground}
              value={expDesc}
              onChangeText={setExpDesc}
              autoFocus
            />

            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Amount (₹)</Text>
            <TextInput
              style={[styles.input, { borderColor: colors.border, color: colors.foreground, backgroundColor: colors.card }]}
              placeholder="0.00"
              placeholderTextColor={colors.mutedForeground}
              value={expAmt}
              onChangeText={setExpAmt}
              keyboardType="numeric"
            />

            <Pressable
              onPress={handleAddExpense}
              style={({ pressed }) => [styles.saveBtn, pressed && { opacity: 0.85 }]}
            >
              <LinearGradient colors={["#E65100", "#BF360C"]} style={styles.saveGrad}>
                <Ionicons name="remove-circle-outline" size={20} color="#fff" />
                <Text style={styles.saveBtnText}>Add Expense</Text>
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
  headerRow: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, marginBottom: 16,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center",
  },
  headerTitle: { fontSize: 17, fontFamily: "Inter_700Bold", color: "#fff" },
  addExpBtn: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: "rgba(255,255,255,0.2)", borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 7,
  },
  addExpBtnText: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: "#fff" },
  datePicker: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 16, marginBottom: 16, paddingHorizontal: 16,
  },
  dateArrow: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center",
  },
  dateText: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: "#fff", flex: 1, textAlign: "center" },
  summaryRow: { paddingHorizontal: 16, gap: 8 },
  summaryCard: {
    backgroundColor: "rgba(255,255,255,0.15)", borderRadius: 12,
    padding: 10, alignItems: "center", minWidth: 72,
  },
  summaryValue: { fontSize: 14, fontFamily: "Inter_700Bold" },
  summaryLabel: { fontSize: 10, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.7)", marginTop: 2 },
  list: { paddingHorizontal: 16, paddingTop: 12, gap: 8 },
  countText: { fontSize: 12, fontFamily: "Inter_400Regular", marginBottom: 4 },
  saleCard: { borderRadius: 12, borderWidth: 1, overflow: "hidden" },
  saleCardTop: { flexDirection: "row", alignItems: "center", padding: 14, justifyContent: "space-between" },
  saleLeft: { gap: 2 },
  saleId: { fontSize: 11, fontFamily: "Inter_400Regular" },
  saleTime: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  saleCust: { fontSize: 12, fontFamily: "Inter_400Regular" },
  saleRight: { alignItems: "flex-end", gap: 4 },
  payBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 },
  payBadgeText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  saleTotal: { fontSize: 18, fontFamily: "Inter_700Bold" },
  saleExpanded: { borderTopWidth: 1, paddingHorizontal: 14, paddingVertical: 10 },
  saleItemRow: { flexDirection: "row", alignItems: "center", paddingVertical: 4 },
  saleItemName: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular" },
  saleItemQty: { fontSize: 13, fontFamily: "Inter_400Regular", marginRight: 12 },
  saleItemAmt: { fontSize: 13, fontFamily: "Inter_600SemiBold", minWidth: 60, textAlign: "right" },
  expenseRow: {
    flexDirection: "row", alignItems: "center", borderRadius: 12,
    borderWidth: 1, padding: 12, gap: 10,
  },
  expenseIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: "#FFF3E0", alignItems: "center", justifyContent: "center" },
  expenseInfo: { flex: 1 },
  expenseDesc: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  expenseTime: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2 },
  expenseAmt: { fontSize: 16, fontFamily: "Inter_700Bold" },
  expenseDelete: { padding: 4 },
  emptyWrap: { alignItems: "center", justifyContent: "center", paddingTop: 80, gap: 12 },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalCard: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, gap: 12 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  modalTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  fieldLabel: { fontSize: 12, fontFamily: "Inter_600SemiBold", letterSpacing: 0.5 },
  input: { borderWidth: 1, borderRadius: 12, padding: 14, fontSize: 15, fontFamily: "Inter_400Regular" },
  saveBtn: { borderRadius: 14, overflow: "hidden", marginTop: 4 },
  saveGrad: { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 16, gap: 8 },
  saveBtnText: { color: "#fff", fontSize: 15, fontFamily: "Inter_700Bold" },
});
