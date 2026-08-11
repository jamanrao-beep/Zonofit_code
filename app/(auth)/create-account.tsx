import React from "react";
import { View, Text, StyleSheet, Pressable, Image, StatusBar } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "@/store/useAuthStore";

export default function CreateAccountScreen() {
  const router = useRouter();
  const googleSignIn = useAuthStore(state => state.googleSignIn);
  const loading = useAuthStore(state => state.loading);

  const handleGoogleSignIn = async () => {
    await googleSignIn();
    // Use auth store listener or effect for navigation, or just navigate
    router.replace("/(tabs)");
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <StatusBar barStyle="dark-content" />
      
      <View style={styles.content}>
        <View style={styles.header}>
          <Image
            /* eslint-disable-next-line @typescript-eslint/no-require-imports */
            source={require("@/assets/images/Zonofit logo.jpeg")}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.title}>Create Your Account</Text>
          <Text style={styles.subtitle}>One membership. Many experiences.</Text>
        </View>

        <View style={styles.buttonContainer}>
          <Pressable 
            style={styles.googleButton}
            onPress={handleGoogleSignIn}
            disabled={loading}
          >
            <Ionicons name="logo-google" size={20} color="#000" style={styles.btnIcon} />
            <Text style={styles.googleButtonText}>Continue with Google</Text>
          </Pressable>

          <Pressable style={styles.appleButton}>
            <Ionicons name="logo-apple" size={22} color="#FFF" style={styles.btnIcon} />
            <Text style={styles.appleButtonText}>Continue with Apple</Text>
          </Pressable>
          
          <Pressable 
            style={styles.mobileButton}
            onPress={() => router.push("/(auth)/verify-number" as any)}
          >
            <Text style={styles.mobileButtonText}>Continue with Mobile Number</Text>
          </Pressable>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            By continuing you agree to our <Text style={styles.linkText}>Terms</Text> and <Text style={styles.linkText}>Privacy Policy</Text>.
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: "space-between",
    paddingTop: 80,
    paddingBottom: 40,
  },
  header: {
    alignItems: "center",
  },
  logo: {
    width: 64,
    height: 64,
    borderRadius: 16,
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: "#6B7280",
    fontWeight: "500",
  },
  buttonContainer: {
    width: "100%",
    gap: 16,
  },
  btnIcon: {
    position: "absolute",
    left: 20,
  },
  googleButton: {
    flexDirection: "row",
    height: 56,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    alignItems: "center",
    justifyContent: "center",
  },
  googleButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
  },
  appleButton: {
    flexDirection: "row",
    height: 56,
    backgroundColor: "#111827",
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  appleButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  mobileButton: {
    height: 56,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  mobileButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1F7A3E",
  },
  footer: {
    alignItems: "center",
  },
  footerText: {
    fontSize: 12,
    color: "#9CA3AF",
    textAlign: "center",
    lineHeight: 18,
  },
  linkText: {
    color: "#6B7280",
    fontWeight: "600",
  },
});
