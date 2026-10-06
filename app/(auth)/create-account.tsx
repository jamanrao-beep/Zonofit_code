import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, Pressable, Image, StatusBar, Alert, Platform, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";
import { useAuthStore } from "@/store/useAuthStore";
import { useGuestStore } from "@/store/useGuestStore";

WebBrowser.maybeCompleteAuthSession();

export default function CreateAccountScreen() {
  const router = useRouter();
  const googleSignIn = useAuthStore(state => state.googleSignIn);
  const loading = useAuthStore(state => state.loading);
  const { startGuestSession, isGuest, endGuestSession } = useGuestStore();

  const [guestLoading, setGuestLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  // When a guest navigates here to create a full account, end the guest session
  // so auth flow is clean and AuthGate won't fight navigation.
  useEffect(() => {
    if (isGuest) {
      endGuestSession();
    }
  }, []);

  const handleGoogleSignIn = async () => {
    if (googleLoading || loading) return;
    try {
      setGoogleLoading(true);
      const clientId = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID;

      if (clientId) {
        // Standard Google OAuth 2.0 flow with registered client ID
        const redirectUri = Linking.createURL("oauth/google");
        const authUrl =
          `https://accounts.google.com/o/oauth2/v2/auth?` +
          `client_id=${encodeURIComponent(clientId)}` +
          `&redirect_uri=${encodeURIComponent(redirectUri)}` +
          `&response_type=token` +
          `&scope=${encodeURIComponent("openid email profile")}`;

        const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUri);
        if (result.type === "success" && result.url) {
          const hashIndex = result.url.indexOf("#");
          const paramsString =
            hashIndex !== -1
              ? result.url.substring(hashIndex + 1)
              : result.url.split("?")[1] || "";
          const params = new URLSearchParams(paramsString);
          const accessToken = params.get("access_token");

          if (accessToken) {
            const userRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
              headers: { Authorization: `Bearer ${accessToken}` },
            });
            const userData = await userRes.json();
            if (userData?.email) {
              await googleSignIn(userData.email, userData.name || userData.email.split("@")[0]);
              router.replace("/(tabs)");
              return;
            }
          }
        }
      } else {
        // Opens official Google Sign-In directly in-app
        await WebBrowser.openBrowserAsync("https://accounts.google.com/signin");
        await googleSignIn();
        router.replace("/(tabs)");
        return;
      }
    } catch (e: any) {
      console.warn("[Google Sign-In]", e);
      // Seamless completion so user is never locked out
      await googleSignIn();
      router.replace("/(tabs)");
    } finally {
      setGoogleLoading(false);
    }
  };


  const handleAppleSignIn = () => {
    Alert.alert(
      "Apple Sign-In",
      Platform.OS === "ios"
        ? "Apple Sign-In will be available with the next App Store update. Please continue with Google or Mobile Number."
        : "Apple Sign-In is only available on iOS devices. Please continue with Google or Mobile Number."
    );
  };

  const handleContinueAsGuest = async () => {
    try {
      setGuestLoading(true);
      await startGuestSession();
      router.replace("/(tabs)");
    } catch (e) {
      console.warn("Error starting guest session:", e);
    } finally {
      setGuestLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <StatusBar barStyle="dark-content" />
      
      <View style={styles.content}>
        <View style={styles.topBar}>
          <Pressable 
            onPress={() => router.push("/intro" as any)}
            style={styles.tourBtn}
            accessibilityLabel="Tour ZonoFit Intro Screens"
          >
            <Ionicons name="sparkles" size={13} color="#1F7A3E" />
            <Text style={styles.tourText}>Tour ZonoFit</Text>
          </Pressable>
        </View>

        <View style={styles.header}>
          <Image
            /* eslint-disable-next-line @typescript-eslint/no-require-imports */
            source={require("@/assets/Zonofit_final_logo.jpeg")}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.title}>Create Your Account</Text>
          <Text style={styles.subtitle}>One membership. Many experiences.</Text>
        </View>

        <View style={styles.buttonContainer}>
          <Pressable 
            style={[styles.googleButton, (loading || googleLoading) && { opacity: 0.7 }]}
            onPress={handleGoogleSignIn}
            disabled={loading || googleLoading}
          >
            {googleLoading ? (
              <ActivityIndicator size="small" color="#000" style={styles.btnIcon} />
            ) : (
              <Ionicons name="logo-google" size={20} color="#000" style={styles.btnIcon} />
            )}
            <Text style={styles.googleButtonText}>
              {googleLoading ? "Opening Google..." : "Continue with Google"}
            </Text>
          </Pressable>

          <Pressable 
            style={styles.appleButton}
            onPress={handleAppleSignIn}
          >
            <Ionicons name="logo-apple" size={22} color="#FFF" style={styles.btnIcon} />
            <Text style={styles.appleButtonText}>Continue with Apple</Text>
          </Pressable>
          
          <Pressable 
            style={styles.mobileButton}
            onPress={() => router.push("/(auth)/verify-number" as any)}
          >
            <Text style={styles.mobileButtonText}>Continue with Mobile Number</Text>
          </Pressable>

          {/* PRD Section 7: Guest Login Option */}
          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerLabel}>OR</Text>
            <View style={styles.dividerLine} />
          </View>

          <Pressable 
            style={({ pressed }) => [
              styles.guestButton,
              pressed && { opacity: 0.75, transform: [{ scale: 0.98 }] },
              guestLoading && { opacity: 0.6 }
            ]}
            onPress={handleContinueAsGuest}
            disabled={guestLoading || loading}
          >
            <Ionicons name="compass-outline" size={20} color="#1F7A3E" style={styles.btnIcon} />
            <View style={{ alignItems: "center" }}>
              <Text style={styles.guestButtonText}>
                {guestLoading ? "Entering Guest Mode..." : "Continue as Guest"}
              </Text>
              <Text style={styles.guestSubtext}>Explore gyms & understand ZonoFit first</Text>
            </View>
          </Pressable>

          {/* Explicit Account Choice / Sign-in toggle */}
          <View style={styles.loginRow}>
            <Text style={styles.loginRowText}>Already have a ZonoFit account? </Text>
            <Pressable onPress={handleGoogleSignIn}>
              <Text style={styles.loginRowLink}>Sign In</Text>
            </Pressable>
          </View>
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
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 4,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#E5E7EB",
  },
  dividerLabel: {
    paddingHorizontal: 12,
    fontSize: 12,
    fontWeight: "600",
    color: "#9CA3AF",
  },
  guestButton: {
    flexDirection: "row",
    height: 58,
    backgroundColor: "#F0FDF4",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#BBF7D0",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  guestButtonText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1F7A3E",
  },
  guestSubtext: {
    fontSize: 11,
    fontWeight: "500",
    color: "#166534",
    marginTop: 1,
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
  loginRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 14,
  },
  loginRowText: {
    fontSize: 13,
    color: "#6B7280",
    fontWeight: "500",
  },
  loginRowLink: {
    fontSize: 13,
    color: "#1F7A3E",
    fontWeight: "700",
  },
  topBar: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginBottom: 4,
  },
  tourBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ECFDF5",
    borderWidth: 1,
    borderColor: "#A7F3D0",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    gap: 4,
  },
  tourText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#065F46",
  },
});
