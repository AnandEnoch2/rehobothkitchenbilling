import { Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";
import { LinearGradient } from "expo-linear-gradient";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

const JSON_MARKER_START = "<!--RK_JSON_START-->";
const JSON_MARKER_END = "<!--RK_JSON_END-->";
const CSV_MARKER_START = "#RK_JSON_DATA_BEGIN";
const CSV_MARKER_END = "#RK_JSON_DATA_END";

function buildCSV(json: string, products: unknown[], sales: unknown[], expenses: unknown[], credits: unknown[]): string {
  const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;

  const lines: string[] = [];
  lines.push(`# Rehoboth Kitchen - Backup CSV`);
  lines.push(`# Exported: ${new Date().toLocaleString("en-IN")}`);
  lines.push("");

  // Embedded JSON for full restore
  lines.push(CSV_MARKER_START);
  lines.push(Buffer.from(json).toString("base64"));
  lines.push(CSV_MARKER_END);
  lines.push("");

  // Products sheet
  lines.push("# === PRODUCTS ===");
  lines.push("ID,Name,Category,Rate");
  (products as { id: string; name: string; category: string; rate: number }[]).forEach((p) => {
    lines.push([esc(p.id), esc(p.name), esc(p.category), esc(p.rate)].join(","));
  });
  lines.push("");

  // Sales sheet
  lines.push("# === SALES ===");
  lines.push("Date,Time,Bill#,Items,Subtotal,Discount,Total,Payment,Customer");
  (sales as { date: string; timestamp: number; id: string; items: { name: string; quantity: number }[]; subtotal?: number; discount?: number; total: number; paymentMethod: string; customerName?: string }[]).forEach((s) => {
    const time = new Date(s.timestamp).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
    const items = s.items.map((i) => `${i.name}x${i.quantity}`).join("; ");
    lines.push([
      esc(s.date), esc(time), esc(s.id.slice(-6)),
      esc(items), esc((s.subtotal ?? s.total).toFixed(2)),
      esc((s.discount ?? 0).toFixed(2)), esc(s.total.toFixed(2)),
      esc(s.paymentMethod), esc(s.customerName ?? ""),
    ].join(","));
  });
  lines.push("");

  // Expenses sheet
  lines.push("# === EXPENSES ===");
  lines.push("Date,Time,Description,Amount");
  (expenses as { date: string; timestamp: number; description: string; amount: number }[]).forEach((e) => {
    const time = new Date(e.timestamp).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
    lines.push([esc(e.date), esc(time), esc(e.description), esc(e.amount.toFixed(2))].join(","));
  });
  lines.push("");

  // Credits sheet
  lines.push("# === CREDITS ===");
  lines.push("Customer,Mobile,Total Credited,Total Paid,Balance");
  (credits as { customerName: string; mobile?: string; transactions: { type: string; amount: number }[] }[]).forEach((c) => {
    const credited = c.transactions.filter((t) => t.type === "credit").reduce((s, t) => s + t.amount, 0);
    const paid = c.transactions.filter((t) => t.type === "payment").reduce((s, t) => s + t.amount, 0);
    lines.push([esc(c.customerName), esc(c.mobile ?? ""), esc(credited.toFixed(2)), esc(paid.toFixed(2)), esc((credited - paid).toFixed(2))].join(","));
  });

  return lines.join("\n");
}

function buildPdfHtml(json: string, products: unknown[], sales: unknown[], expenses: unknown[], credits: unknown[]): string {
  const totalSales = (sales as { total: number }[]).reduce((s, x) => s + x.total, 0);
  const totalExpenses = (expenses as { amount: number }[]).reduce((s, x) => s + x.amount, 0);
  const totalOutstanding = (credits as { transactions: { type: string; amount: number }[] }[]).reduce((sum, c) => {
    const bal = c.transactions.reduce((s, t) => t.type === "credit" ? s + t.amount : s - t.amount, 0);
    return sum + (bal > 0 ? bal : 0);
  }, 0);

  const salesRows = (sales as { date: string; timestamp: number; id: string; items: { name: string; quantity: number }[]; total: number; paymentMethod: string; customerName?: string }[])
    .slice()
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 100)
    .map((s) => {
      const time = new Date(s.timestamp).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
      const items = s.items.map((i) => `${i.name} ×${i.quantity}`).join(", ");
      return `<tr><td>${s.date}</td><td>${time}</td><td>#${s.id.slice(-6)}</td><td>${items}</td><td>₹${s.total.toFixed(2)}</td><td>${s.paymentMethod}</td><td>${s.customerName ?? "-"}</td></tr>`;
    }).join("");

  const expRows = (expenses as { date: string; description: string; amount: number }[])
    .slice().sort((a, b) => b.amount - a.amount)
    .map((e) => `<tr><td>${e.date}</td><td>${e.description}</td><td style="color:#E65100">₹${e.amount.toFixed(2)}</td></tr>`).join("");

  const creditRows = (credits as { customerName: string; mobile?: string; transactions: { type: string; amount: number }[] }[])
    .map((c) => {
      const bal = c.transactions.reduce((s, t) => t.type === "credit" ? s + t.amount : s - t.amount, 0);
      return `<tr><td>${c.customerName}</td><td>${c.mobile ?? "-"}</td><td>₹${bal.toFixed(2)}</td><td style="color:${bal > 0 ? "#D32F2F" : "#2E7D32"}">${bal > 0 ? "Pending" : "Settled"}</td></tr>`;
    }).join("");

  return `<!DOCTYPE html><html><head><meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; margin: 24px; color: #1a1a2e; }
    h1 { color: #0D47A1; text-align: center; font-size: 24px; margin-bottom: 4px; }
    .subtitle { text-align: center; color: #666; font-size: 13px; margin-bottom: 24px; }
    .summary { display: flex; gap: 16px; margin-bottom: 24px; flex-wrap: wrap; }
    .card { flex: 1; min-width: 130px; background: #E3F2FD; border-radius: 10px; padding: 14px; text-align: center; }
    .card-val { font-size: 22px; font-weight: bold; color: #0D47A1; }
    .card-lbl { font-size: 11px; color: #555; margin-top: 4px; }
    h2 { color: #0D47A1; font-size: 16px; border-bottom: 2px solid #E3F2FD; padding-bottom: 6px; margin-top: 28px; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    th { background: #0D47A1; color: white; padding: 8px; text-align: left; }
    td { padding: 7px 8px; border-bottom: 1px solid #eee; }
    tr:nth-child(even) { background: #F5F9FF; }
    .footer { margin-top: 40px; text-align: center; color: #999; font-size: 11px; }
    .hidden { display: none; }
  </style></head><body>
  <h1>REHOBOTH KITCHEN</h1>
  <div class="subtitle">Business Report — Exported ${new Date().toLocaleString("en-IN")}</div>
  <div class="summary">
    <div class="card"><div class="card-val">₹${totalSales.toFixed(0)}</div><div class="card-lbl">Total Revenue</div></div>
    <div class="card"><div class="card-val">₹${totalExpenses.toFixed(0)}</div><div class="card-lbl">Total Expenses</div></div>
    <div class="card"><div class="card-val">₹${(totalSales - totalExpenses).toFixed(0)}</div><div class="card-lbl">Net Profit</div></div>
    <div class="card"><div class="card-val">₹${totalOutstanding.toFixed(0)}</div><div class="card-lbl">Outstanding Credit</div></div>
    <div class="card"><div class="card-val">${(products as unknown[]).length}</div><div class="card-lbl">Products</div></div>
  </div>
  <h2>Recent Sales (last 100)</h2>
  <table><thead><tr><th>Date</th><th>Time</th><th>Bill#</th><th>Items</th><th>Total</th><th>Payment</th><th>Customer</th></tr></thead>
  <tbody>${salesRows || '<tr><td colspan="7" style="text-align:center;color:#999">No sales recorded</td></tr>'}</tbody></table>
  <h2>Expenses</h2>
  <table><thead><tr><th>Date</th><th>Description</th><th>Amount</th></tr></thead>
  <tbody>${expRows || '<tr><td colspan="3" style="text-align:center;color:#999">No expenses recorded</td></tr>'}</tbody></table>
  <h2>Credit Customers</h2>
  <table><thead><tr><th>Customer</th><th>Mobile</th><th>Balance</th><th>Status</th></tr></thead>
  <tbody>${creditRows || '<tr><td colspan="4" style="text-align:center;color:#999">No credit records</td></tr>'}</tbody></table>
  <div class="footer">Generated by Rehoboth Kitchen Billing App</div>
  <div class="hidden">${JSON_MARKER_START}${Buffer.from(json).toString("base64")}${JSON_MARKER_END}</div>
  </body></html>`;
}

function parseRestoreData(content: string): string | null {
  // Try JSON format
  const jsonStart = content.indexOf(JSON_MARKER_START);
  const jsonEnd = content.indexOf(JSON_MARKER_END);
  if (jsonStart !== -1 && jsonEnd !== -1) {
    const b64 = content.slice(jsonStart + JSON_MARKER_START.length, jsonEnd).trim();
    try { return Buffer.from(b64, "base64").toString("utf-8"); } catch { /* continue */ }
  }
  // Try CSV format
  const csvStart = content.indexOf(CSV_MARKER_START);
  const csvEnd = content.indexOf(CSV_MARKER_END);
  if (csvStart !== -1 && csvEnd !== -1) {
    const b64 = content.slice(csvStart + CSV_MARKER_START.length, csvEnd).trim();
    try { return Buffer.from(b64, "base64").toString("utf-8"); } catch { /* continue */ }
  }
  // Plain JSON
  try { JSON.parse(content); return content; } catch { /* not plain JSON */ }
  return null;
}

export default function BackupScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { exportBackup, importBackup, products, sales, expenses, credits } = useApp();
  const [loading, setLoading] = useState<string | null>(null);

  const doExportJSON = async () => {
    setLoading("json");
    try {
      const json = exportBackup();
      const date = new Date().toISOString().split("T")[0];
      const uri = FileSystem.documentDirectory + `rk-backup-${date}.json`;
      await FileSystem.writeAsStringAsync(uri, json, { encoding: FileSystem.EncodingType.UTF8 });
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) await Sharing.shareAsync(uri, { mimeType: "application/json", dialogTitle: "Save JSON Backup", UTI: "public.json" });
      else Alert.alert("Saved", `JSON backup saved to:\n${uri}`);
    } catch { Alert.alert("Failed", "Could not export JSON backup. Try again."); }
    finally { setLoading(null); }
  };

  const doExportCSV = async () => {
    setLoading("csv");
    try {
      const json = exportBackup();
      const csv = buildCSV(json, products, sales, expenses, credits);
      const date = new Date().toISOString().split("T")[0];
      const uri = FileSystem.documentDirectory + `rk-backup-${date}.csv`;
      await FileSystem.writeAsStringAsync(uri, csv, { encoding: FileSystem.EncodingType.UTF8 });
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) await Sharing.shareAsync(uri, { mimeType: "text/csv", dialogTitle: "Save CSV/Excel Backup", UTI: "public.comma-separated-values-text" });
      else Alert.alert("Saved", `CSV backup saved to:\n${uri}`);
    } catch { Alert.alert("Failed", "Could not export CSV backup. Try again."); }
    finally { setLoading(null); }
  };

  const doExportPDF = async () => {
    setLoading("pdf");
    try {
      const json = exportBackup();
      const html = buildPdfHtml(json, products, sales, expenses, credits);
      const { uri } = await Print.printToFileAsync({ html, base64: false });
      const date = new Date().toISOString().split("T")[0];
      const dest = FileSystem.documentDirectory + `rk-report-${date}.pdf`;
      await FileSystem.moveAsync({ from: uri, to: dest });
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) await Sharing.shareAsync(dest, { mimeType: "application/pdf", dialogTitle: "Save PDF Report", UTI: "com.adobe.pdf" });
      else Alert.alert("Saved", `PDF saved to:\n${dest}`);
    } catch (e) { Alert.alert("Failed", "Could not generate PDF. Try again."); }
    finally { setLoading(null); }
  };

  const doImport = async () => {
    setLoading("import");
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["application/json", "text/csv", "text/plain", "application/pdf", "*/*"],
        copyToCacheDirectory: true,
      });
      if (result.canceled) { setLoading(null); return; }
      const file = result.assets[0];
      const content = await FileSystem.readAsStringAsync(file.uri, { encoding: FileSystem.EncodingType.UTF8 });
      const json = parseRestoreData(content);
      if (!json) {
        setLoading(null);
        Alert.alert("Cannot Restore", "This file cannot be used for restore.\n\nUse a JSON or CSV file exported from this app.");
        return;
      }
      Alert.alert(
        "Restore Backup",
        "This will replace ALL current data. Are you sure?",
        [
          { text: "Cancel", style: "cancel", onPress: () => setLoading(null) },
          {
            text: "Restore",
            style: "destructive",
            onPress: () => {
              const ok = importBackup(json);
              setLoading(null);
              if (ok) Alert.alert("✅ Restored", "All data has been restored successfully!", [{ text: "OK" }]);
              else Alert.alert("Failed", "Invalid backup data. File may be corrupted.");
            },
          },
        ]
      );
    } catch {
      setLoading(null);
      Alert.alert("Failed", "Could not read the file. Make sure it is a valid backup.");
    }
  };

  const exportCards = [
    {
      key: "json",
      icon: "code-slash-outline" as const,
      title: "JSON Backup",
      desc: "Complete data backup. All products, sales, expenses & credits. Best for full restore.",
      badge: "Full Restore ✓",
      badgeColor: "#E8F5E9",
      badgeText: "#2E7D32",
      gradient: ["#1565C0", "#0D47A1"] as [string, string],
      onPress: doExportJSON,
      ext: ".json",
    },
    {
      key: "csv",
      icon: "grid-outline" as const,
      title: "Excel / CSV",
      desc: "Spreadsheet format. Opens in Excel & Google Sheets. Also supports full restore.",
      badge: "Excel Compatible ✓",
      badgeColor: "#E8F5E9",
      badgeText: "#2E7D32",
      gradient: ["#2E7D32", "#1B5E20"] as [string, string],
      onPress: doExportCSV,
      ext: ".csv",
    },
    {
      key: "pdf",
      icon: "document-text-outline" as const,
      title: "PDF Report",
      desc: "Formatted business report. Sales, expenses & credits summary. Good for printing.",
      badge: "Print / Share",
      badgeColor: "#FFF3E0",
      badgeText: "#E65100",
      gradient: ["#C62828", "#B71C1C"] as [string, string],
      onPress: doExportPDF,
      ext: ".pdf",
    },
  ];

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
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Backup & Restore</Text>
            <Text style={styles.headerSub}>Keep your data safe</Text>
          </View>
        </View>

        <View style={styles.statsBar}>
          {[
            { label: "Products", value: products.length },
            { label: "Sales", value: sales.length },
            { label: "Expenses", value: expenses.length },
            { label: "Customers", value: credits.length },
          ].map((s) => (
            <View key={s.label} style={styles.statItem}>
              <Text style={styles.statItemVal}>{s.value}</Text>
              <Text style={styles.statItemLabel}>{s.label}</Text>
            </View>
          ))}
        </View>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>EXPORT BACKUP</Text>

        {exportCards.map((card, i) => (
          <Animated.View key={card.key} entering={FadeInDown.delay(i * 80).springify()}>
            <View style={[styles.exportCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <View style={styles.exportCardTop}>
                <LinearGradient colors={card.gradient} style={styles.exportCardIcon}>
                  <Ionicons name={card.icon} size={22} color="#fff" />
                </LinearGradient>
                <View style={styles.exportCardInfo}>
                  <View style={styles.exportTitleRow}>
                    <Text style={[styles.exportCardTitle, { color: colors.foreground }]}>{card.title}</Text>
                    <View style={[styles.badge, { backgroundColor: card.badgeColor }]}>
                      <Text style={[styles.badgeText, { color: card.badgeText }]}>{card.badge}</Text>
                    </View>
                  </View>
                  <Text style={[styles.exportCardDesc, { color: colors.mutedForeground }]}>{card.desc}</Text>
                </View>
              </View>
              <Pressable
                onPress={card.onPress}
                disabled={loading !== null}
                style={({ pressed }) => [styles.exportBtn, pressed && { opacity: 0.85 }]}
              >
                <LinearGradient colors={card.gradient} style={styles.exportBtnGrad}>
                  {loading === card.key ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Ionicons name="cloud-upload-outline" size={18} color="#fff" />
                  )}
                  <Text style={styles.exportBtnText}>
                    {loading === card.key ? "Exporting..." : `Export ${card.ext}`}
                  </Text>
                </LinearGradient>
              </Pressable>
            </View>
          </Animated.View>
        ))}

        <Animated.View entering={FadeInDown.delay(320).springify()}>
          <Text style={[styles.sectionTitle, { color: colors.mutedForeground, marginTop: 8 }]}>RESTORE FROM BACKUP</Text>
          <View style={[styles.importCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <View style={styles.importTop}>
              <LinearGradient colors={["#5E35B1", "#4527A0"]} style={styles.importIcon}>
                <Ionicons name="cloud-download-outline" size={24} color="#fff" />
              </LinearGradient>
              <View style={{ flex: 1 }}>
                <Text style={[styles.exportCardTitle, { color: colors.foreground }]}>Restore Data</Text>
                <Text style={[styles.exportCardDesc, { color: colors.mutedForeground }]}>
                  Pick any exported file (.json or .csv) to restore all data.
                </Text>
              </View>
            </View>

            <View style={styles.formatRow}>
              {[".json", ".csv"].map((f) => (
                <View key={f} style={[styles.formatChip, { backgroundColor: "#E8F5E9" }]}>
                  <Ionicons name="checkmark-circle" size={13} color="#2E7D32" />
                  <Text style={[styles.formatChipText, { color: "#2E7D32" }]}>{f} supported</Text>
                </View>
              ))}
              <View style={[styles.formatChip, { backgroundColor: "#FFF3E0" }]}>
                <Ionicons name="information-circle" size={13} color="#E65100" />
                <Text style={[styles.formatChipText, { color: "#E65100" }]}>.pdf view only</Text>
              </View>
            </View>

            <View style={[styles.warnBox, { backgroundColor: "#FFF8E1", borderColor: "#FFE082" }]}>
              <Ionicons name="warning-outline" size={16} color="#F57F17" />
              <Text style={[styles.warnText, { color: "#5D4037" }]}>
                Restoring will overwrite ALL current data permanently.
              </Text>
            </View>

            <Pressable
              onPress={doImport}
              disabled={loading !== null}
              style={({ pressed }) => [styles.importBtn, pressed && { opacity: 0.85 }]}
            >
              <LinearGradient colors={["#5E35B1", "#4527A0"]} style={styles.exportBtnGrad}>
                {loading === "import" ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Ionicons name="folder-open-outline" size={18} color="#fff" />
                )}
                <Text style={styles.exportBtnText}>
                  {loading === "import" ? "Restoring..." : "Pick File & Restore"}
                </Text>
              </LinearGradient>
            </Pressable>
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(400).springify()}>
          <View style={[styles.tipBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Ionicons name="bulb-outline" size={18} color="#F9A825" />
            <Text style={[styles.tipText, { color: colors.mutedForeground }]}>
              <Text style={{ fontFamily: "Inter_600SemiBold" }}>Tip: </Text>
              Export JSON or CSV before uninstalling. After reinstalling, use "Pick File & Restore" to recover all your data instantly.
            </Text>
          </View>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingBottom: 16 },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, marginBottom: 12 },
  backBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 18, fontFamily: "Inter_700Bold", color: "#fff" },
  headerSub: { fontSize: 12, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.7)", marginTop: 2 },
  statsBar: { flexDirection: "row", paddingHorizontal: 16, gap: 8 },
  statItem: { flex: 1, backgroundColor: "rgba(255,255,255,0.15)", borderRadius: 10, padding: 10, alignItems: "center" },
  statItemVal: { fontSize: 18, fontFamily: "Inter_700Bold", color: "#fff" },
  statItemLabel: { fontSize: 10, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.7)", marginTop: 2 },
  content: { padding: 16, gap: 12 },
  sectionTitle: { fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 1.2, marginBottom: 4 },
  exportCard: { borderRadius: 16, borderWidth: 1, padding: 16, gap: 12, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },
  exportCardTop: { flexDirection: "row", gap: 14, alignItems: "flex-start" },
  exportCardIcon: { width: 48, height: 48, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  exportCardInfo: { flex: 1, gap: 6 },
  exportTitleRow: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  exportCardTitle: { fontSize: 15, fontFamily: "Inter_700Bold" },
  exportCardDesc: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 18 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  badgeText: { fontSize: 10, fontFamily: "Inter_600SemiBold" },
  exportBtn: { borderRadius: 12, overflow: "hidden" },
  exportBtnGrad: { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 13, gap: 8 },
  exportBtnText: { color: "#fff", fontSize: 14, fontFamily: "Inter_700Bold" },
  importCard: { borderRadius: 16, borderWidth: 1, padding: 16, gap: 12, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },
  importTop: { flexDirection: "row", gap: 14, alignItems: "flex-start" },
  importIcon: { width: 48, height: 48, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  formatRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  formatChip: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  formatChipText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  warnBox: { flexDirection: "row", alignItems: "flex-start", gap: 8, borderRadius: 10, borderWidth: 1, padding: 10 },
  warnText: { flex: 1, fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 17 },
  importBtn: { borderRadius: 12, overflow: "hidden" },
  tipBox: { flexDirection: "row", alignItems: "flex-start", gap: 10, borderRadius: 12, borderWidth: 1, padding: 14 },
  tipText: { flex: 1, fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 18 },
});
