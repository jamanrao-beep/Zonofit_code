import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, Pressable, Alert, ActivityIndicator } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as Location from "expo-location";
import { useBookingStore } from "@/store/useBookingStore";
import { useCreditsStore } from "@/store/useCreditsStore";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { apiFetch } from "@/lib/api";
import { useAuthStore } from "@/store/useAuthStore";

// Helper function to calculate distance in meters between two coordinates
function getDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371e3; // Earth radius in meters
  const p1 = lat1 * Math.PI / 180;
  const p2 = lat2 * Math.PI / 180;
  const dp = (lat2 - lat1) * Math.PI / 180;
  const dl = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(dp/2) * Math.sin(dp/2) +
            Math.cos(p1) * Math.cos(p2) *
            Math.sin(dl/2) * Math.sin(dl/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c; // returns meters
}

export default function ScanModal() {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const { bookingStatus, bookedGymId, bookingId } = useBookingStore();
  const { token } = useAuthStore();

  // Remove the block that requires an active booking to open the scanner
  // useEffect(() => {
  //   if (bookingStatus !== "Booked") {
  //     Alert.alert(...);
  //   }
  // }, [bookingStatus]);

  if (!permission) {
    return <View className="flex-1 bg-black" />;
  }

  if (!permission.granted) {
    return (
      <View className="flex-1 items-center justify-center bg-black px-5">
        <Ionicons name="camera-outline" size={64} color="white" />
        <Text className="text-white text-center mt-4 text-base font-bold">
          We need your permission to show the camera
        </Text>
        <Pressable onPress={requestPermission} className="mt-6 bg-[#6BCB77] px-6 py-3 rounded-2xl">
          <Text className="text-white font-bold">Grant Permission</Text>
        </Pressable>
        <Pressable onPress={() => router.back()} className="mt-4 px-6 py-3 rounded-2xl">
          <Text className="text-white/70 font-bold">Close</Text>
        </Pressable>
      </View>
    );
  }

  const handleBarCodeScanned = async ({ type, data }: { type: string; data: string }) => {
    if (scanned || verifying) return;
    setScanned(true);
    setVerifying(true);

    // Expected format: zonofit://checkin/{gymId}
    if (!data.startsWith("zonofit://checkin/")) {
      Alert.alert("Invalid QR Code", "This is not a valid ZonoFit gym QR code.", [
        { text: "Try Again", onPress: () => setScanned(false) }
      ]);
      setVerifying(false);
      return;
    }

    const scannedGymId = data.split("zonofit://checkin/")[1];

    if (bookingStatus === "Booked" && scannedGymId !== bookedGymId) {
      Alert.alert("Wrong Gym", "You have an active booking at a different gym. Cancel it first to check in here.", [
        { text: "Try Again", onPress: () => setScanned(false) }
      ]);
      setVerifying(false);
      return;
    }

    // Now verify location
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location is required to verify you are at the gym.');
        setScanned(false);
        setVerifying(false);
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      const userLat = location.coords.latitude;
      const userLon = location.coords.longitude;

      const gym = await apiFetch(`/api/gyms/${scannedGymId}`, { token });
      if (!gym) {
        Alert.alert("Error", "Gym not found in database.");
        setScanned(false);
        setVerifying(false);
        return;
      }

      const distanceMeters = getDistance(userLat, userLon, gym.lat, gym.lng);
      
      // We allow up to 200 meters deviation
      if (distanceMeters > 1000) {
        Alert.alert(
          "Location Verification Failed", 
          `You appear to be ${Math.round(distanceMeters)} meters away from the gym. You must be at the gym to check in.`,
          [{ text: "Try Again", onPress: () => setScanned(false) }]
        );
        setVerifying(false);
        return;
      }

      // If they are doing a walk-in, they won't have a booking ID yet.
      if (bookingStatus === "Not Booked") {
        const isCashVenue = gym.type === 'turf' || gym.type === 'sports';
        const cashCost = gym.cost * 50;
        const costLabel = isCashVenue ? `₹${cashCost} Cash` : `${gym.cost} Credits`;

        Alert.alert(
          "Book this visit",
          `Book ${gym.name} now for ${costLabel}? The front desk confirms the visit from your pass.`,
          [
            { text: "Cancel", style: "cancel", onPress: () => { setScanned(false); setVerifying(false); } },
            { text: "Book", onPress: async () => {
              try {
                const now = new Date();
                const dateStr = now.toISOString();
                const timeStr = now.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
                
                // 1. Create the booking
                let successBooking = false;
                if (isCashVenue) {
                   const successCash = useCreditsStore.getState().bookVisitWithCash(gym.name, cashCost);
                   if (successCash) {
                      successBooking = await useBookingStore.getState().bookVisit(gym.id, gym.name, dateStr, timeStr, 0);
                   } else {
                      Alert.alert("Cash visit unavailable", "This visit has to be booked and paid through your ZonoFit wallet.");
                      setScanned(false);
                      setVerifying(false);
                      return;
                   }
                } else {
                   successBooking = await useBookingStore.getState().bookVisit(gym.id, gym.name, dateStr, timeStr, gym.cost);
                }
                
                if (!successBooking) {
                   Alert.alert("Error", "Failed to create walk-in booking. Please check your credit balance.");
                   setScanned(false);
                   setVerifying(false);
                   return;
                }
                
                // Get the new booking ID from state
                const newBookingId = useBookingStore.getState().bookingId;
                
                if (!newBookingId) throw new Error("Could not find newly created booking ID.");

                setVerifying(false);
                Alert.alert(
                  "Pass ready",
                  `Your visit at ${gym.name} is booked. Show the pass to the front desk. They confirm the visit.`,
                  [{ text: "View pass", onPress: () => router.replace("/booking-pass" as any) }]
                );
              } catch (e: any) {
                Alert.alert("Error", e.message || "Walk-in check-in failed.");
                setScanned(false);
                setVerifying(false);
              }
            }}
          ]
        );
        // Wait for the alert's async action, we just return here.
        return;
      }

      if (!bookingId) {
        Alert.alert("No booking", "Book a visit first, then show the pass to the front desk.");
        setScanned(false);
        setVerifying(false);
        return;
      }

      setVerifying(false);
      Alert.alert(
        "Show your pass",
        "Show this pass to the front desk. They confirm the visit. Scanning the gym code does not check you in.",
        [{ text: "View pass", onPress: () => router.replace("/booking-pass" as any) }]
      );

    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to check in.");
      setScanned(false);
      setVerifying(false);
    }
  };

  // Developer override for emulator
  const handleMockScan = () => {
    // We can simulate scanning either the booked gym or a random valid gym if no booking
    const gymIdToScan = bookedGymId || "clx8q9q8a0000y8h3u8d5f3d3"; // a fallback ID or we can just let it fail nicely
    handleBarCodeScanned({ type: "mock", data: `zonofit://checkin/${gymIdToScan}` });
  };

  return (
    <View style={styles.container}>
      <CameraView 
        style={StyleSheet.absoluteFill} 
        facing="back"
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
      />
      
      {/* UI Overlay */}
      <View style={styles.overlay}>
        <View className="items-center mt-16 px-5">
          <Text className="text-white text-2xl font-black">Scan Gym QR</Text>
          <Text className="text-white/80 text-center mt-2 font-medium">
            Find the ZonoFit QR code at the front desk. Scanning opens your pass. Staff confirm the visit.
          </Text>
        </View>

        <View style={styles.scanBoxContainer}>
          <View style={styles.scanBox} />
        </View>

        <View className="mb-12 items-center">
          {verifying ? (
            <View className="bg-black/80 px-6 py-3 rounded-full flex-row items-center border border-white/20">
              <ActivityIndicator size="small" color="#FFFFFF" />
              <Text className="text-white font-bold ml-2.5">Verifying Location & QR...</Text>
            </View>
          ) : (
            <Pressable 
              onPress={() => router.back()}
              className="w-12 h-12 bg-white/20 rounded-full items-center justify-center border border-white/30"
            >
              <Ionicons name="close" size={24} color="white" />
            </Pressable>
          )}

          {/* Cancel Booking option if user booked a workout */}
          {bookingStatus === "Booked" && (
            <Pressable
              onPress={() => {
                Alert.alert(
                  "Cancel Workout Booking?",
                  "Are you sure you want to cancel this booking? Your visit / credits will be restored immediately.",
                  [
                    { text: "Keep Booking", style: "cancel" },
                    {
                      text: "Yes, Cancel",
                      style: "destructive",
                      onPress: async () => {
                        try {
                          await useBookingStore.getState().cancelBooking();
                          Alert.alert("Booking Cancelled", "Your booking has been cancelled and your visits / credits have been restored.");
                          router.replace("/(tabs)");
                        } catch (e: any) {
                          Alert.alert("Error", e?.message || "Could not cancel booking.");
                        }
                      }
                    }
                  ]
                );
              }}
              className="mt-3 px-4 py-2 bg-red-600/80 rounded-xl border border-white/20 active:opacity-80"
            >
              <Text className="text-white font-bold text-xs">Cancel This Booking</Text>
            </Pressable>
          )}

          {/* Dev button for local development/emulator testing only */}
          {__DEV__ && (
            <Pressable onPress={handleMockScan} className="mt-4 bg-[#1F7A3E]/90 px-4 py-2 rounded-xl border border-white/20 active:opacity-80">
              <Text className="text-white font-bold text-xs">Simulate Front-Desk Scan (Dev)</Text>
            </Pressable>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "black",
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "space-between",
  },
  scanBoxContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  scanBox: {
    width: 250,
    height: 250,
    borderWidth: 2,
    borderColor: "#6BCB77",
    backgroundColor: "transparent",
    borderRadius: 24,
  }
});