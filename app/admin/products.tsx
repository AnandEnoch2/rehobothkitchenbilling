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
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useApp, type Product } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

const CATEGORIES = [
  "Rice Items",
  "Non-Veg",
  "Veg",
  "Breads",
  "Beverages",
  "Snacks",
  "Sweets",
  "Other",
];

interface FormState {
  name: string;
  rate: string;
  category: string;
}

export default function ProductsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { products, addProduct, updateProduct, removeProduct } = useApp();
  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>({ name: "", rate: "", category: CATEGORIES[0] });
  const [catModalVisible, setCatModalVisible] = useState(false);

  const openAdd = () => {
    setEditingId(null);
    setForm({ name: "", rate: "", category: CATEGORIES[0] });
    setModalVisible(true);
  };

  const openEdit = (product: Product) => {
    setEditingId(product.id);
    setForm({ name: product.name, rate: product.rate.toString(), category: product.category });
    setModalVisible(true);
  };

  const handleSave = () => {
    if (!form.name.trim()) {
      Alert.alert("Error", "Product name is required");
      return;
    }
    const rate = parseFloat(form.rate);
    if (isNaN(rate) || rate <= 0) {
      Alert.alert("Error", "Enter a valid rate");
      return;
    }
    if (editingId) {
      updateProduct(editingId, { name: form.name.trim(), rate, category: form.category });
    } else {
      addProduct({ name: form.name.trim(), rate, category: form.category });
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setModalVisible(false);
  };

  const handleDelete = (product: Product) => {
    Alert.alert(
      "Delete Product",
      `Are you sure you want to delete "${product.name}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            removeProduct(product.id);
          },
        },
      ]
    );
  };

  const grouped = CATEGORIES.reduce<Record<string, Product[]>>((acc, cat) => {
    const items = products.filter((p) => p.category === cat);
    if (items.length > 0) acc[cat] = items;
    return acc;
  }, {});

  const otherItems = products.filter((p) => !CATEGORIES.includes(p.category));
  if (otherItems.length > 0) grouped["Other"] = otherItems;

  const flatData: Array<{ type: "header"; cat: string } | { type: "item"; product: Product; index: number }> = [];
  Object.entries(grouped).forEach(([cat, items]) => {
    flatData.push({ type: "header", cat });
    items.forEach((product, i) => flatData.push({ type: "item", product, index: i }));
  });

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
          <Text style={styles.headerTitle}>Products</Text>
          <Pressable onPress={openAdd} style={styles.addBtn} hitSlop={8}>
            <Ionicons name="add" size={24} color="#fff" />
          </Pressable>
        </View>
      </LinearGradient>

      <FlatList
        data={flatData}
        keyExtractor={(item, i) =>
          item.type === "header" ? `h-${item.cat}` : `p-${item.product.id}`
        }
        renderItem={({ item, index: fi }) => {
          if (item.type === "header") {
            return (
              <Text
                style={[
                  styles.catHeader,
                  { color: colors.mutedForeground },
                ]}
              >
                {item.cat}
              </Text>
            );
          }
          return (
            <Animated.View entering={FadeInDown.delay(item.index * 30).springify()}>
              <View
                style={[
                  styles.productCard,
                  { backgroundColor: colors.background, borderColor: colors.border },
                ]}
              >
                <View style={styles.productInfo}>
                  <Text
                    style={[styles.productName, { color: colors.foreground }]}
                  >
                    {item.product.name}
                  </Text>
                  <Text
                    style={[
                      styles.productRate,
                      { color: colors.primary },
                    ]}
                  >
                    ₹ {item.product.rate.toFixed(2)}
                  </Text>
                </View>
                <View style={styles.productActions}>
                  <Pressable
                    onPress={() => openEdit(item.product)}
                    style={[styles.actionBtn, { backgroundColor: colors.secondary }]}
                    hitSlop={4}
                  >
                    <Ionicons name="create-outline" size={18} color={colors.primary} />
                  </Pressable>
                  <Pressable
                    onPress={() => handleDelete(item.product)}
                    style={[styles.actionBtn, { backgroundColor: colors.accentLight }]}
                    hitSlop={4}
                  >
                    <Ionicons name="trash-outline" size={18} color={colors.accent} />
                  </Pressable>
                </View>
              </View>
            </Animated.View>
          );
        }}
        contentContainerStyle={[
          styles.list,
          {
            paddingBottom:
              insets.bottom + (Platform.OS === "web" ? 34 : 24),
          },
        ]}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Ionicons name="fast-food-outline" size={48} color={colors.border} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              No products yet. Tap + to add.
            </Text>
          </View>
        }
      />

      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalCard,
              {
                backgroundColor: colors.background,
                paddingBottom:
                  insets.bottom + (Platform.OS === "web" ? 34 : 16),
              },
            ]}
          >
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>
                {editingId ? "Edit Product" : "Add Product"}
              </Text>
              <Pressable
                onPress={() => setModalVisible(false)}
                hitSlop={8}
              >
                <Ionicons name="close" size={24} color={colors.mutedForeground} />
              </Pressable>
            </View>

            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>
              Product Name
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  borderColor: colors.border,
                  color: colors.foreground,
                  backgroundColor: colors.card,
                },
              ]}
              placeholder="e.g. Chicken Biryani"
              placeholderTextColor={colors.mutedForeground}
              value={form.name}
              onChangeText={(v) => setForm((f) => ({ ...f, name: v }))}
            />

            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>
              Rate (₹)
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  borderColor: colors.border,
                  color: colors.foreground,
                  backgroundColor: colors.card,
                },
              ]}
              placeholder="e.g. 150"
              placeholderTextColor={colors.mutedForeground}
              value={form.rate}
              onChangeText={(v) => setForm((f) => ({ ...f, rate: v }))}
              keyboardType="numeric"
            />

            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>
              Category
            </Text>
            <Pressable
              onPress={() => setCatModalVisible(true)}
              style={[
                styles.catSelector,
                {
                  borderColor: colors.border,
                  backgroundColor: colors.card,
                },
              ]}
            >
              <Text style={[styles.catSelectorText, { color: colors.foreground }]}>
                {form.category}
              </Text>
              <Ionicons
                name="chevron-down"
                size={18}
                color={colors.mutedForeground}
              />
            </Pressable>

            <Pressable
              onPress={handleSave}
              style={({ pressed }) => [
                styles.saveBtn,
                pressed && { opacity: 0.85 },
              ]}
            >
              <LinearGradient
                colors={["#1565C0", "#0D47A1"]}
                style={styles.saveGrad}
              >
                <Text style={styles.saveBtnText}>
                  {editingId ? "Save Changes" : "Add Product"}
                </Text>
              </LinearGradient>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal
        visible={catModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setCatModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.catPickerCard,
              {
                backgroundColor: colors.background,
                paddingBottom:
                  insets.bottom + (Platform.OS === "web" ? 34 : 16),
              },
            ]}
          >
            <Text style={[styles.modalTitle, { color: colors.foreground, marginBottom: 12 }]}>
              Select Category
            </Text>
            {CATEGORIES.map((cat) => (
              <Pressable
                key={cat}
                onPress={() => {
                  setForm((f) => ({ ...f, category: cat }));
                  setCatModalVisible(false);
                }}
                style={[
                  styles.catOption,
                  {
                    backgroundColor:
                      form.category === cat ? colors.secondary : "transparent",
                  },
                ]}
              >
                <Text
                  style={[
                    styles.catOptionText,
                    {
                      color:
                        form.category === cat
                          ? colors.primary
                          : colors.foreground,
                      fontFamily:
                        form.category === cat
                          ? "Inter_600SemiBold"
                          : "Inter_400Regular",
                    },
                  ]}
                >
                  {cat}
                </Text>
                {form.category === cat && (
                  <Ionicons name="checkmark" size={18} color={colors.primary} />
                )}
              </Pressable>
            ))}
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
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  addBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    color: "#fff",
  },
  list: { paddingHorizontal: 16, paddingTop: 8 },
  catHeader: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 1.2,
    marginTop: 16,
    marginBottom: 8,
  },
  productCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    marginBottom: 8,
  },
  productInfo: { flex: 1 },
  productName: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  productRate: { fontSize: 14, fontFamily: "Inter_700Bold", marginTop: 3 },
  productActions: { flexDirection: "row", gap: 8 },
  actionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyWrap: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 80,
    gap: 12,
  },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center" },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalCard: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    gap: 8,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  modalTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  fieldLabel: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.5,
    marginTop: 4,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
  },
  catSelector: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  catSelectorText: { fontSize: 15, fontFamily: "Inter_400Regular" },
  saveBtn: { marginTop: 8, borderRadius: 12, overflow: "hidden" },
  saveGrad: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
  },
  saveBtnText: { color: "#fff", fontSize: 16, fontFamily: "Inter_700Bold" },
  catPickerCard: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
  },
  catOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 2,
  },
  catOptionText: { fontSize: 15 },
});
