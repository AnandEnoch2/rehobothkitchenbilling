import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React from "react";
import {
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

function StatCard({
  label, value, icon, color, sub, delay,
}: {
  label: string; value: string; icon: keyof typeof Ionicons.glyphMap;
  color: string; sub?: string; delay: number;
}) {
  return (
    <Animated.View entering={FadeInDown.delay(delay).springify()} style={styles.statCard}>
      <View style={[styles.statIcon, { backgroundColor: color + "30" }]}>
        <Ionicons name={icon} size={22} color={color} />
      </View>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
      {sub && <Text style={styles.statSub}>{sub}</Text>}
    </Animated.View>
  );
}

function NavButton({
  label, icon, onPress, delay, badge,
}: {
  label: string; icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void; delay: number; badge?: string;
}) {
  const colors = useColors();
  return (
    <Animated.View entering={FadeInDown.delay(delay).springify()}>
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.navBtn,
          { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.85 : 1 },
          pressed && { transform: [{ scale: 0.98 }] },
        ]}
      >
        <View style={[styles.navIcon, { backgroundColor: colors.secondary }]}>
          <Ionicons name={icon} size={22} color={colors.primary} />
        </View>
        <Text style={[styles.navLabel, { color: colors.foreground }]}>{label}</Text>
        {badge && (
          <View style={styles.navBadge}>
            <Text style={styles.navBadgeText}>{badge}</Text>
          </View>
        )}
        <Ionicons name="chevron-forward" size={18} color={colors.mutedForeground} />
      </Pressable>
    </Animated.View>
  );
}

function RevenueChart({ data }: { data: { label: string; gross: number; net: number }[] }) {
  const maxVal = Math.max(...data.map((d) => d.gross), 1);
  const CHART_H = 72;

  return (
    <View style={styles.chartWrap}>
      <Text style={styles.chartTitle}>Last 7 Days Revenue</Text>
      <View style={styles.chartBars}>
        {data.map((day, i) => {
          const grossH = Math.max((day.gross / maxVal) * CHART_H, day.gross > 0 ? 4 : 0);
          const netH = Math.max((day.net / maxVal) * CHART_H, day.net > 0 ? 4 : 0);
          const isToday = i === data.length - 1;
          return (
            <View key={day.label + i} style={styles.barGroup}>
              <View style={[styles.barContainer, { height: CHART_H }]}>
                {/* Gross bar */}
                <View style={[styles.barBg, { height: grossH, backgroundColor: isToday ? "#4FC3F7" : "rgba(79,195,247,0.4)" }]} />
                {/* Net bar */}
                <View style={[styles.barBg, { height: netH, backgroundColor: isToday ? "#B2FF59" : "rgba(178,255,89,0.5)", position: "absolute", bottom: 0 }]} />
              </View>
              <Text style={[styles.barLabel, isToday && { color: "#B2FF59", fontFamily: "Inter_600SemiBold" }]}>
                {day.label}
              </Text>
              {day.gross > 0 && (
                <Text style={styles.barVal}>₹{day.gross >= 1000 ? `${(day.gross / 1000).toFixed(1)}k` : day.gross.toFixed(0)}</Text>
              )}
            </View>
          );
        })}
      </View>
      <View style={styles.chartLegend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: "#4FC3F7" }]} />
          <Text style={styles.legendText}>Gross</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: "#B2FF59" }]} />
          <Text style={styles.legendText}>Net (after expenses)</Text>
        </View>
      </View>
    </View>
  );
}

export default function AdminDashboard() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, logout, getTodayStats, getTotalOutstandingCredit, credits, getLast7DaysRevenue } = useApp();

  const stats = getTodayStats();
  const outstanding = getTotalOutstandingCredit();
  const chartData = getLast7DaysRevenue();
  const today = new Date().toLocaleDateString("en-IN", {
    weekday: "long", day: "2-digit", month: "long", year: "numeric",
  });

  const handleLogout = () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: async () => {
          await logout();
          router.replace("/");
        },
      },
    ]);
  };

  const outstandingCount = credits.filter((c) => {
    const bal = c.transactions.reduce(
      (s, t) => (t.type === "credit" ? s + t.amount : s - t.amount), 0
    );
    return bal > 0;
  }).length;

  return (
    <View style={[styles.container, { backgroundColor: "#F0F4FF" }]}>
      <LinearGradient
        colors={["#0D47A1", "#1565C0"]}
        style={[styles.header, { paddingTop: insets.top + (Platform.OS === "web" ? 55 : 12) }]}
      >
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.greeting}>Admin Panel</Text>
            <Text style={styles.date}>{today}</Text>
          </View>
          <View style={styles.headerRight}>
            <Pressable onPress={handleLogout} style={styles.headerBtn} hitSlop={8}>
              <Ionicons name="log-out-outline" size={22} color="#fff" />
            </Pressable>
          </View>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.statsRow}>
          <StatCard label="Gross Today" value={`₹${stats.total.toFixed(0)}`} icon="trending-up" color="#FFFFFF" delay={0} />
          <StatCard label="Cash" value={`₹${stats.cash.toFixed(0)}`} icon="cash-outline" color="#81D4FA" delay={50} />
          <StatCard label="Online" value={`₹${stats.online.toFixed(0)}`} icon="phone-portrait-outline" color="#80DEEA" delay={100} />
          <StatCard label="Credit" value={`₹${stats.credit.toFixed(0)}`} icon="people-outline" color="#EF9A9A" delay={150} />
          <StatCard label="Expenses" value={`₹${stats.expenses.toFixed(0)}`} icon="remove-circle-outline" color="#FFCC80" delay={200} />
          <StatCard label="Net Revenue" value={`₹${stats.net.toFixed(0)}`} icon="wallet-outline" color="#B2FF59"
            sub={stats.discount > 0 ? `Disc: ₹${stats.discount.toFixed(0)}` : undefined} delay={250} />
        </ScrollView>

        <RevenueChart data={chartData} />
      </LinearGradient>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        {outstanding > 0 && (
          <Animated.View entering={FadeInDown.delay(100).springify()}
            style={[styles.creditBanner, { backgroundColor: "#FFEBEE" }]}>
            <Ionicons name="alert-circle" size={20} color="#D32F2F" />
            <Text style={styles.creditBannerText}>
              <Text style={{ fontFamily: "Inter_700Bold", color: "#D32F2F" }}>₹{outstanding.toFixed(2)}</Text>
              {" "}outstanding across{" "}
              <Text style={{ fontFamily: "Inter_700Bold", color: "#D32F2F" }}>{outstandingCount}</Text>
              {" "}customer{outstandingCount !== 1 ? "s" : ""}
            </Text>
            <Pressable onPress={() => router.push("/admin/credits")} hitSlop={8}>
              <Text style={{ color: "#D32F2F", fontFamily: "Inter_600SemiBold", fontSize: 12 }}>View →</Text>
            </Pressable>
          </Animated.View>
        )}

        <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>MANAGEMENT</Text>

        <NavButton label="Products" icon="fast-food-outline" onPress={() => router.push("/admin/products")} delay={140} />
        <NavButton label="Daily Sales Report" icon="bar-chart-outline" onPress={() => router.push("/admin/sales")} delay={180} />
        <NavButton
          label="Credit Management" icon="people-outline"
          onPress={() => router.push("/admin/credits")} delay={220}
          badge={outstandingCount > 0 ? `${outstandingCount}` : undefined}
        />
        <NavButton label="Backup & Restore" icon="cloud-upload-outline" onPress={() => router.push("/admin/backup")} delay={260} />

        <Animated.View entering={FadeInDown.delay(300).springify()}>
          <Pressable
            onPress={() => router.push("/billing")}
            style={({ pressed }) => [styles.billingBtn, pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] }]}
          >
            <LinearGradient colors={["#D32F2F", "#B71C1C"]} style={styles.billingGrad}>
              <Ionicons name="receipt-outline" size={20} color="#fff" />
              <Text style={styles.billingBtnText}>Go to Billing</Text>
            </LinearGradient>
          </Pressable>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingBottom: 0 },
  headerRow: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start",
    paddingHorizontal: 20, marginBottom: 16,
  },
  greeting: { fontSize: 22, fontFamily: "Inter_700Bold", color: "#fff" },
  date: { fontSize: 12, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.7)", marginTop: 3 },
  headerRight: { flexDirection: "row", gap: 8, marginTop: 4 },
  headerBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center" },
  statsRow: { paddingHorizontal: 16, gap: 10, paddingBottom: 4 },
  statCard: {
    backgroundColor: "rgba(255,255,255,0.15)", borderRadius: 14,
    padding: 14, gap: 6, minWidth: 110, alignItems: "flex-start",
  },
  statIcon: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  statValue: { fontSize: 18, fontFamily: "Inter_700Bold" },
  statLabel: { fontSize: 10, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.75)" },
  statSub: { fontSize: 10, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.6)" },
  chartWrap: { paddingHorizontal: 16, paddingVertical: 16 },
  chartTitle: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: "rgba(255,255,255,0.7)", marginBottom: 12, letterSpacing: 0.5 },
  chartBars: { flexDirection: "row", alignItems: "flex-end", gap: 6 },
  barGroup: { flex: 1, alignItems: "center", gap: 4 },
  barContainer: { justifyContent: "flex-end", width: "100%" },
  barBg: { width: "100%", borderRadius: 4 },
  barLabel: { fontSize: 10, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.6)" },
  barVal: { fontSize: 8, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.5)" },
  chartLegend: { flexDirection: "row", gap: 16, marginTop: 10 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 10, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.6)" },
  content: { padding: 16, gap: 10 },
  creditBanner: { flexDirection: "row", alignItems: "center", borderRadius: 12, padding: 14, gap: 10 },
  creditBannerText: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular", color: "#B71C1C", lineHeight: 18 },
  sectionTitle: { fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 1.2, marginTop: 6, marginBottom: 2 },
  navBtn: { flexDirection: "row", alignItems: "center", borderRadius: 14, borderWidth: 1, padding: 16, gap: 14 },
  navIcon: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  navLabel: { flex: 1, fontSize: 15, fontFamily: "Inter_600SemiBold" },
  navBadge: { backgroundColor: "#D32F2F", borderRadius: 12, paddingHorizontal: 8, paddingVertical: 2 },
  navBadgeText: { color: "#fff", fontSize: 11, fontFamily: "Inter_700Bold" },
  billingBtn: { marginTop: 6, borderRadius: 14, overflow: "hidden" },
  billingGrad: { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 16, gap: 8 },
  billingBtnText: { color: "#fff", fontSize: 16, fontFamily: "Inter_700Bold" },
});
