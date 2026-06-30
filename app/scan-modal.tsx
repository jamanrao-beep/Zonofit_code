import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, Pressable, Alert } from "react-native";
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
  const { bookingStatus, bookedGymId, bookingId, checkIn } = useBookingStore();
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
      if (distanceMeters > 200) {
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
          "Walk-In Check-In",
          `Check in to ${gym.name} now for ${costLabel}?`,
          [
            { text: "Cancel", style: "cancel", onPress: () => { setScanned(false); setVerifying(false); } },
            { text: "Check In", onPress: async () => {
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
                      Alert.alert("Insufficient Cash", "You do not have enough converted cash for this venue.");
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

                // 2. Fetch pass code
                const passData = await apiFetch(`/api/checkin/pass/${newBookingId}`, { token });
                if (!passData || !passData.passCode) throw new Error("Could not retrieve pass.");

                // 3. Verify
                const verifyData = await apiFetch("/api/checkin/verify", {
                  token,
                  method: "POST",
                  body: JSON.stringify({
                    bookingId: newBookingId,
                    verificationCode: passData.passCode
                  })
                });

                // 4. Mark checked in locally
                const successCheckIn = await useBookingStore.getState().checkIn();
                if (successCheckIn) {
                  Alert.alert(
                    "Check-In Successful! 🎉", 
                    verifyData.message || "You have successfully verified your location and QR code. Have a great workout!",
                    [{ text: "Awesome!", onPress: () => { router.back(); router.push("/"); } }]
                  );
                }
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

      // --- Normal Pre-Booked Check-In Flow ---
      const passData = await apiFetch(`/api/checkin/pass/${bookingId}`, { token });
      if (!passData || !passData.passCode) {
        Alert.alert("Error", "Could not retrieve your booking pass.");
        setScanned(false);
        setVerifying(false);
        return;
      }

      const verifyData = await apiFetch("/api/checkin/verify", {
        token,
        method: "POST",
        body: JSON.stringify({
          bookingId,
          verificationCode: passData.passCode
        })
      });

      // Success!
      const success = await checkIn();
      if (success) {
        Alert.alert(
          "Check-In Successful! 🎉", 
          verifyData.message || "You have successfully verified your location and QR code. Have a great workout!",
          [{ text: "Awesome!", onPress: () => { router.back(); router.push("/"); } }]
        );
      }

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
            Find the ZonoFit QR code at the front desk and scan it to check in.
          </Text>
        </View>

        <View style={styles.scanBoxContainer}>
          <View style={styles.scanBox} />
        </View>

        <View className="mb-12 items-center">
          {verifying ? (
            <View className="bg-black/60 px-6 py-3 rounded-full flex-row items-center">
              <Text className="text-white font-bold ml-2">Verifying Location...</Text>
            </View>
          ) : (
            <Pressable 
              onPress={() => router.back()}
              className="w-12 h-12 bg-white/20 rounded-full items-center justify-center border border-white/30"
            >
              <Ionicons name="close" size={24} color="white" />
            </Pressable>
          )}

          {/* Dev button since camera won't scan easily on emulator without setup */}
          <Pressable onPress={handleMockScan} className="mt-6 bg-[#6BCB77] px-4 py-2 rounded-xl">
            <Text className="text-white font-bold text-xs">Simulate Valid Scan (Dev)</Text>
          </Pressable>
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