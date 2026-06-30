import React, { useState, useEffect, useRef } from "react";
import { View, Text, StyleSheet, Pressable, Dimensions } from "react-native";
import MapView, { Marker } from "react-native-maps";
import * as Location from "expo-location";
import { Ionicons } from "@expo/vector-icons";
import { apiFetch } from "@/lib/api";
import { useAuthStore } from "@/store/useAuthStore";
import { router } from "expo-router";

export default function BuyCreditsMapScreen() {
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const { token } = useAuthStore();
  const [gyms, setGyms] = useState<any[]>([]);
  const [selectedGym, setSelectedGym] = useState<any>(null);
  const mapRef = useRef<MapView>(null);

  // Initial region roughly covers the mock gyms in Bengaluru
  const initialRegion = {
    latitude: 12.9352,
    longitude: 77.6245,
    latitudeDelta: 0.1,
    longitudeDelta: 0.1,
  };

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setErrorMsg('Permission to access location was denied');
        return;
      }

      let loc = await Location.getCurrentPositionAsync({});
      setLocation(loc);

      mapRef.current?.animateToRegion({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      }, 1000);
      try {
        const res = await apiFetch("/api/gyms?radius=20", { token });
        if (res.gyms && res.gyms.length > 0) {
          setGyms(res.gyms);
          setSelectedGym(res.gyms[0]);
        }
      } catch (err) {
        console.log("Failed to fetch gyms for map");
      }
    })();
  }, []);

  return (
    <View style={styles.container}>
      <MapView 
        ref={mapRef}
        style={styles.map} 
        initialRegion={initialRegion}
        showsUserLocation={true}
      >
        {gyms.map((gym) => (
          <Marker
            key={gym.id}
            coordinate={{ latitude: gym.lat, longitude: gym.lng }}
            onPress={() => setSelectedGym(gym)}
          >
            <View style={[styles.markerContainer, selectedGym?.id === gym.id && styles.selectedMarker]}>
              <Ionicons name="barbell" size={16} color={selectedGym?.id === gym.id ? "#fff" : "#059669"} />
            </View>
          </Marker>
        ))}
      </MapView>

      {/* Bottom Sheet for selected gym */}
      {selectedGym && (
      <View className="absolute bottom-0 w-full bg-white rounded-t-[36px] p-6 shadow-lg border border-black/5" style={{ paddingBottom: 40 }}>
        <View className="w-12 h-1.5 bg-[#E9EBE6] rounded-full mb-4 align-self-center mx-auto" />
        
        <View className="flex-row justify-between items-start mb-4">
          <View className="flex-1 mr-4">
            <Text className="text-xl font-bold text-[#1F2520]">{selectedGym.name}</Text>
            <Text className="text-sm text-[#6B756E] mt-1">{selectedGym.address}</Text>
          </View>
          <View className="bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-100 items-center">
            <Text className="text-emerald-700 font-bold">{selectedGym.cost}</Text>
            <Text className="text-[10px] text-emerald-600">cr / visit</Text>
          </View>
        </View>

        <Pressable
          onPress={() => router.push(`/buy-credits/${selectedGym.id}`)}
          className="w-full bg-[#1F2520] h-14 rounded-2xl items-center justify-center flex-row shadow-sm active:bg-[#323b34]"
        >
          <Text className="text-white font-bold text-base mr-2">Choose Subscription</Text>
          <Ionicons name="arrow-forward" size={20} color="#fff" />
        </Pressable>
      </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  map: {
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height,
  },
  markerContainer: {
    backgroundColor: "#EAF7EC",
    padding: 8,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: "#059669",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  selectedMarker: {
    backgroundColor: "#059669",
    borderColor: "#fff",
    transform: [{ scale: 1.2 }]
  }
});
