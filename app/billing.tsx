import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import Animated, { FadeIn, FadeInDown, ZoomIn } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useApp, type Product } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

const ProductCard = React.memo(function ProductCard({
  product,
  quantity,
  onAdd,
  onRemove,
  index,
}: {
  product: Product;
  quantity: number;
  onAdd: () => void;
  onRemove: () => void;
  index: number;
}) {
  const colors = useColors();

  const handleAdd = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onAdd();
  };

  return (
    <Animated.View entering={FadeInDown.delay(index * 30).springify()}>
      <View
        style={[
          styles.card,
          {
            backgroundColor: colors.card,
            borderColor: quantity > 0 ? colors.primary : colors.border,
            borderWidth: quantity > 0 ? 1.5 : 1,
          },
        ]}
      >
        {quantity > 0 && (
          <View style={[styles.activeDot, { backgroundColor: colors.primary }]} />
        )}
        <View style={styles.cardLeft}>
          <Text style={[styles.productName, { color: colors.foreground }]}>
            {product.name}
          </Text>
          <View style={styles.categoryRow}>
            <View style={[styles.categoryPill, { backgroundColor: colors.secondary }]}>
              <Text style={[styles.productCategory, { color: colors.primary }]}>
                {product.category}
              </Text>
            </View>
          </View>
          <Text style={[styles.productRate, { color: colors.primary }]}>
            ₹ {product.rate.toFixed(2)}
          </Text>
        </View>
        <View style={styles.cardRight}>
          {quantity > 0 ? (
            <Animated.View entering={ZoomIn.springify()} style={[styles.qtyCtrl, { backgroundColor: colors.primary }]}>
              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  onRemove();
                }}
                style={styles.qtyBtn}
                hitSlop={8}
              >
                <Ionicons name="remove" size={18} color="#fff" />
              </Pressable>
              <Text style={styles.qtyText}>{quantity}</Text>
              <Pressable onPress={handleAdd} style={styles.qtyBtn} hitSlop={8}>
                <Ionicons name="add" size={18} color="#fff" />
              </Pressable>
            </Animated.View>
          ) : (
            <Pressable
              onPress={handleAdd}
              style={({ pressed }) => [
                styles.addBtn,
                {
                  backgroundColor: colors.primary,
                  transform: [{ scale: pressed ? 0.92 : 1 }],
                },
              ]}
            >
              <Ionicons name="add" size={22} color="#fff" />
            </Pressable>
          )}
        </View>
      </View>
    </Animated.View>
  );
});

export default function BillingScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const {
    user, products, cart, addToCart, removeFromCart,
    cartTotal, cartCount, setPendingBill, logout,
  } = useApp();

  const [activeCategory, setActiveCategory] = useState("All");
  const [search, setSearch] = useState("");
  const [showSearch, setShowSearch] = useState(false);

  const categories = useMemo(
    () => ["All", ...Array.from(new Set(products.map((p) => p.category)))],
    [products]
  );

  const filtered = useMemo(() => {
    let list = activeCategory === "All"
      ? products
      : products.filter((p) => p.category === activeCategory);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q)
      );
    }
    return list;
  }, [products, activeCategory, search]);

  const getQty = useCallback(
    (productId: string) =>
      cart.find((c) => c.product.id === productId)?.quantity ?? 0,
    [cart]
  );

  const handleSubmit = useCallback(() => {
    if (cartCount === 0) {
      Alert.alert("Empty Cart", "Please add at least one item.");
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      "Confirm Order",
      `Total: ₹ ${cartTotal.toFixed(2)}\n${cartCount} item${cartCount > 1 ? "s" : ""}\n\nProceed to payment?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Proceed",
          style: "default",
          onPress: () => {
            setPendingBill([...cart]);
            router.push("/bill");
          },
        },
      ]
    );
  }, [cartCount, cartTotal, cart, setPendingBill]);

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

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={["#0D47A1", "#1565C0"]}
        style={[styles.header, { paddingTop: insets.top + (Platform.OS === "web" ? 55 : 12) }]}
      >
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            <Text style={styles.headerTitle}>Rehoboth Kitchen</Text>
            <Text style={styles.headerSub}>New Order</Text>
          </View>
          <View style={styles.headerRight}>
            <Pressable
              onPress={() => { setShowSearch(!showSearch); if (showSearch) setSearch(""); }}
              style={[styles.headerBtn, showSearch && { backgroundColor: "rgba(255,255,255,0.4)" }]}
              hitSlop={8}
            >
              <Ionicons name={showSearch ? "close" : "search"} size={20} color="#fff" />
            </Pressable>
            {user?.role === "admin" && (
              <Pressable
                onPress={() => router.push("/admin")}
                style={styles.headerBtn}
                hitSlop={8}
              >
                <MaterialIcons name="admin-panel-settings" size={22} color="#fff" />
              </Pressable>
            )}
            <Pressable onPress={handleLogout} style={styles.headerBtn} hitSlop={8}>
              <Ionicons name="log-out-outline" size={22} color="#fff" />
            </Pressable>
          </View>
        </View>

        {showSearch && (
          <Animated.View entering={FadeIn.duration(180)} style={styles.searchWrap}>
            <Ionicons name="search" size={16} color="#90A4AE" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search products..."
              placeholderTextColor="#90A4AE"
              value={search}
              onChangeText={setSearch}
              autoFocus
              autoCorrect={false}
            />
            {search.length > 0 && (
              <Pressable onPress={() => setSearch("")} hitSlop={8}>
                <Ionicons name="close-circle" size={16} color="#90A4AE" />
              </Pressable>
            )}
          </Animated.View>
        )}

        {!showSearch && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.catRow}
          >
            {categories.map((cat) => (
              <Pressable
                key={cat}
                onPress={() => setActiveCategory(cat)}
                style={[
                  styles.catChip,
                  activeCategory === cat
                    ? { backgroundColor: "#ffffff" }
                    : { backgroundColor: "rgba(255,255,255,0.2)" },
                ]}
              >
                <Text
                  style={[
                    styles.catText,
                    activeCategory === cat ? { color: "#1565C0" } : { color: "#ffffff" },
                  ]}
                >
                  {cat}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        )}
      </LinearGradient>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => (
          <ProductCard
            product={item}
            quantity={getQty(item.id)}
            onAdd={() => addToCart(item)}
            onRemove={() => removeFromCart(item.id)}
            index={index}
          />
        )}
        contentContainerStyle={[
          styles.list,
          { paddingBottom: cartCount > 0 ? 120 : 32 },
        ]}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Ionicons name="restaurant-outline" size={56} color={colors.border} />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
              {search ? "No products found" : "No products"}
            </Text>
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              {search ? `No results for "${search}"` : "No products in this category"}
            </Text>
          </View>
        }
      />

      {cartCount > 0 && (
        <Animated.View
          entering={FadeInDown.springify()}
          style={[
            styles.bottomBar,
            {
              backgroundColor: colors.background,
              paddingBottom: insets.bottom + 12,
              borderTopColor: colors.border,
            },
          ]}
        >
          <View>
            <Text style={[styles.totalLabel, { color: colors.mutedForeground }]}>
              {cartCount} item{cartCount > 1 ? "s" : ""}
            </Text>
            <Text style={[styles.totalAmount, { color: colors.foreground }]}>
              ₹ {cartTotal.toFixed(2)}
            </Text>
          </View>
          <Pressable
            onPress={handleSubmit}
            style={({ pressed }) => [
              styles.submitBtn,
              pressed && { transform: [{ scale: 0.97 }] },
            ]}
          >
            <LinearGradient colors={["#D32F2F", "#B71C1C"]} style={styles.submitGrad}>
              <Ionicons name="receipt-outline" size={20} color="#fff" />
              <Text style={styles.submitText}>Submit Order</Text>
            </LinearGradient>
          </Pressable>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingBottom: 0 },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  headerLeft: {},
  headerTitle: { fontSize: 20, fontFamily: "Inter_700Bold", color: "#fff" },
  headerSub: { fontSize: 12, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.7)", marginTop: 2 },
  headerRight: { flexDirection: "row", gap: 8 },
  headerBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center", justifyContent: "center",
  },
  searchWrap: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "#fff", borderRadius: 12,
    marginHorizontal: 16, marginBottom: 12,
    paddingHorizontal: 14, height: 44, gap: 8,
  },
  searchInput: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular", color: "#0D1B2A" },
  catRow: { paddingHorizontal: 16, paddingVertical: 12, gap: 8 },
  catChip: { paddingHorizontal: 16, paddingVertical: 7, borderRadius: 20 },
  catText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  list: { paddingHorizontal: 14, paddingTop: 12, gap: 10 },
  card: {
    flexDirection: "row", alignItems: "center",
    borderRadius: 16, padding: 14,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
    position: "relative", overflow: "hidden",
  },
  activeDot: {
    position: "absolute", top: 0, left: 0,
    width: 4, height: "100%", borderTopLeftRadius: 16, borderBottomLeftRadius: 16,
  },
  cardLeft: { flex: 1, paddingLeft: 4 },
  categoryRow: { flexDirection: "row", marginTop: 4 },
  categoryPill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  productName: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  productCategory: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  productRate: { fontSize: 16, fontFamily: "Inter_700Bold", marginTop: 6 },
  cardRight: { alignItems: "center", justifyContent: "center" },
  addBtn: {
    width: 42, height: 42, borderRadius: 21,
    alignItems: "center", justifyContent: "center",
    shadowColor: "#1565C0", shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 6,
  },
  qtyCtrl: {
    flexDirection: "row", alignItems: "center",
    borderRadius: 22, overflow: "hidden", height: 40,
  },
  qtyBtn: { width: 38, height: 40, alignItems: "center", justifyContent: "center" },
  qtyText: { color: "#fff", fontSize: 15, fontFamily: "Inter_700Bold", minWidth: 26, textAlign: "center" },
  emptyWrap: { alignItems: "center", justifyContent: "center", paddingTop: 80, gap: 8 },
  emptyTitle: { fontSize: 17, fontFamily: "Inter_600SemiBold" },
  emptyText: { fontSize: 13, fontFamily: "Inter_400Regular" },
  bottomBar: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 20, paddingTop: 14, borderTopWidth: 1,
    shadowColor: "#000", shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1, shadowRadius: 16, elevation: 16,
  },
  totalLabel: { fontSize: 12, fontFamily: "Inter_400Regular" },
  totalAmount: { fontSize: 22, fontFamily: "Inter_700Bold", marginTop: 2 },
  submitBtn: { borderRadius: 14, overflow: "hidden" },
  submitGrad: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 22, paddingVertical: 14, gap: 8,
  },
  submitText: { color: "#fff", fontSize: 15, fontFamily: "Inter_700Bold" },
});
