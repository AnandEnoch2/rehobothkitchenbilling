import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useApp } from "@/context/AppContext";

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const { login, user } = useApp();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  // Auto-redirect if already logged in (persisted session)
  useEffect(() => {
    if (user) {
      if (user.role === "admin") {
        router.replace("/admin");
      } else {
        router.replace("/billing");
      }
    }
  }, [user]);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleLogin = () => {
    if (!username.trim() || !password.trim()) {
      Alert.alert("Error", "Please enter username and password");
      return;
    }
    setLoading(true);
    setTimeout(() => {
      const success = login(username.trim(), password.trim());
      setLoading(false);
      if (success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        const role = username.trim() === "admin" ? "admin" : "staff";
        if (role === "admin") {
          router.replace("/admin");
        } else {
          router.replace("/billing");
        }
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert("Login Failed", "Invalid username or password");
      }
    }, 300);
  };

  return (
    <LinearGradient
      colors={["#0D47A1", "#1565C0", "#1976D2"]}
      style={[styles.gradient, { paddingTop: insets.top, paddingBottom: insets.bottom }]}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.flex}
      >
        <Animated.View
          style={[
            styles.inner,
            { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
          ]}
        >
          <View style={styles.logoWrap}>
            <View style={styles.logoCircle}>
              <Ionicons name="restaurant" size={48} color="#1565C0" />
            </View>
            <Text style={styles.appName}>Rehoboth Kitchen</Text>
            <Text style={styles.tagline}>Billing System</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Sign In</Text>

            <View style={styles.inputWrap}>
              <Ionicons name="person-outline" size={20} color="#78909C" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Username"
                placeholderTextColor="#90A4AE"
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <View style={styles.inputWrap}>
              <Ionicons name="lock-closed-outline" size={20} color="#78909C" style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder="Password"
                placeholderTextColor="#90A4AE"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPass}
                autoCapitalize="none"
              />
              <Pressable onPress={() => setShowPass(!showPass)} style={styles.eyeBtn}>
                <Ionicons
                  name={showPass ? "eye-off-outline" : "eye-outline"}
                  size={20}
                  color="#78909C"
                />
              </Pressable>
            </View>

            <Pressable
              style={({ pressed }) => [
                styles.loginBtn,
                pressed && { opacity: 0.85 },
              ]}
              onPress={handleLogin}
              disabled={loading}
            >
              <LinearGradient
                colors={["#D32F2F", "#B71C1C"]}
                style={styles.loginGrad}
              >
                <Text style={styles.loginText}>
                  {loading ? "Signing in..." : "Sign In  →"}
                </Text>
              </LinearGradient>
            </Pressable>
          </View>

          <Text style={styles.footer}>Rehoboth Kitchen © 2026</Text>
        </Animated.View>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  flex: { flex: 1 },
  inner: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 28,
  },
  logoWrap: {
    alignItems: "center",
    marginBottom: 36,
  },
  logoCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
    elevation: 8,
  },
  appName: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    color: "#FFFFFF",
    letterSpacing: 0.5,
  },
  tagline: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.75)",
    marginTop: 4,
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 28,
    elevation: 12,
  },
  cardTitle: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    color: "#0D1B2A",
    marginBottom: 24,
  },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0F4FF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#BBDEFB",
    marginBottom: 14,
    paddingHorizontal: 14,
    height: 52,
  },
  inputIcon: { marginRight: 10 },
  input: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: "#0D1B2A",
  },
  eyeBtn: { padding: 4 },
  loginBtn: { marginTop: 10, borderRadius: 12, overflow: "hidden" },
  loginGrad: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 52,
  },
  loginText: {
    fontSize: 17,
    fontFamily: "Inter_700Bold",
    color: "#FFFFFF",
    letterSpacing: 0.5,
  },
  footer: {
    textAlign: "center",
    marginTop: 32,
    color: "rgba(255,255,255,0.5)",
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
});
