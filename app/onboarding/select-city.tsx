import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  ScrollView,
  StatusBar,
  Modal,
  Animated,
  Easing,
  BackHandler,
  useWindowDimensions,
  ActivityIndicator,
  Image,
  ImageSourcePropType,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Canvas, Circle, Group, Path } from "@shopify/react-native-skia";
import * as Location from "expo-location";
import { apiFetch } from "@/lib/api";
import { useAuthStore } from "@/store/useAuthStore";

const HOME_CITY = "Udaipur";
const COMING_SOON = [
  "Jaipur",
  "Ahmedabad",
  "Delhi NCR",
  "Mumbai",
  "Bengaluru",
  "Chandigarh",
  "Pune",
  "Hyderabad",
  "Jodhpur",
  "Kota",
  "Ajmer",
  "Bhilwara",
] as const;

type SoonCity = (typeof COMING_SOON)[number];
type SheetState = { kind: "home" } | { kind: "soon"; city: SoonCity } | null;

const CITY_ICONS: Record<string, { base: ImageSourcePropType; selected: ImageSourcePropType }> = {
  Udaipur: {
    base: require("@/assets/images/cities/udaipur.png"),
    selected: require("@/assets/images/cities/udaipur-selected.png"),
  },
  Jaipur: {
    base: require("@/assets/images/cities/jaip.png"),
    selected: require("@/assets/images/cities/jaip-selected.png"),
  },
  Ahmedabad: {
    base: require("@/assets/images/cities/ahd.png"),
    selected: require("@/assets/images/cities/ahd-selected.png"),
  },
  "Delhi NCR": {
    base: require("@/assets/images/cities/ncr.png"),
    selected: require("@/assets/images/cities/ncr-selected.png"),
  },
  Mumbai: {
    base: require("@/assets/images/cities/mumbai.png"),
    selected: require("@/assets/images/cities/mumbai-selected.png"),
  },
  Bengaluru: {
    base: require("@/assets/images/cities/bang.png"),
    selected: require("@/assets/images/cities/bang-selected.png"),
  },
  Chandigarh: {
    base: require("@/assets/images/cities/chd.png"),
    selected: require("@/assets/images/cities/chd-selected.png"),
  },
  Hyderabad: {
    base: require("@/assets/images/cities/hyd.png"),
    selected: require("@/assets/images/cities/hyd-selected.png"),
  },
  Pune: {
    base: require("@/assets/images/cities/pune.png"),
    selected: require("@/assets/images/cities/pune-selected.png"),
  },
  Kolkata: {
    base: require("@/assets/images/cities/kolk.png"),
    selected: require("@/assets/images/cities/kolk-selected.png"),
  },
  Kochi: {
    base: require("@/assets/images/cities/koch.png"),
    selected: require("@/assets/images/cities/koch-selected.png"),
  },
  Chennai: {
    base: require("@/assets/images/cities/chen.png"),
    selected: require("@/assets/images/cities/chen-selected.png"),
  },
  Jodhpur: {
    base: require("@/assets/images/cities/jodhpur.png"),
    selected: require("@/assets/images/cities/jodhpur-selected.png"),
  },
  Kota: {
    base: require("@/assets/images/cities/kota.png"),
    selected: require("@/assets/images/cities/kota-selected.png"),
  },
  Ajmer: {
    base: require("@/assets/images/cities/ajmer.png"),
    selected: require("@/assets/images/cities/ajmer-selected.png"),
  },
  Bhilwara: {
    base: require("@/assets/images/cities/bhilwara.png"),
    selected: require("@/assets/images/cities/bhilwara-selected.png"),
  },
};

function CityMark({
  name,
  selected = false,
  color,
  size = 40,
}: {
  name: string;
  selected?: boolean;
  color?: string;
  size?: number;
}) {
  const icon = CITY_ICONS[name] || CITY_ICONS["Udaipur"];
  const source = selected ? icon.selected : icon.base;
  return (
    <Image
      source={source}
      style={{ width: size, height: size }}
      resizeMode="contain"
    />
  );
}

function knownCity(raw: string): "Udaipur" | SoonCity | null {
  const name = raw.toLowerCase();
  if (!name) return null;
  if (name.includes("udaipur")) return "Udaipur";
  return COMING_SOON.find((city) => name.includes(city.toLowerCase())) ?? null;
}

export default function SelectCityScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const user = useAuthStore((s) => s.user);

  const [search, setSearch] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [notified, setNotified] = useState<string[]>([]);
  const [sheet, setSheet] = useState<SheetState>(null);
  const [mountedSheet, setMountedSheet] = useState<SheetState>(null);
  const [gpsMessage, setGpsMessage] = useState("Find Zonofit near you");
  const [locating, setLocating] = useState(false);
  const [toastText, setToastText] = useState("");
  const [toastOn, setToastOn] = useState(false);

  const sheetY = useRef(new Animated.Value(480)).current;
  const scrim = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(1)).current;
  const toastY = useRef(new Animated.Value(30)).current;
  const toastOpacity = useRef(new Animated.Value(0)).current;
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const query = search.trim().toLowerCase();
  const showHome = !query || "udaipur".includes(query);
  const soonCities = COMING_SOON.filter((city) => city.toLowerCase().includes(query));
  const showEmpty = !showHome && soonCities.length === 0;
  const cardWidth = Math.floor((Math.min(width, 480) - 40 - 20) / 3);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 0.3, duration: 900, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 900, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  useEffect(() => {
    if (sheet) {
      setMountedSheet(sheet);
      Animated.parallel([
        Animated.timing(scrim, { toValue: 1, duration: 220, useNativeDriver: true }),
        Animated.timing(sheetY, {
          toValue: 0,
          duration: 400,
          easing: Easing.bezier(0.2, 0.8, 0.2, 1),
          useNativeDriver: true,
        }),
      ]).start();
      return;
    }
    Animated.parallel([
      Animated.timing(scrim, { toValue: 0, duration: 200, useNativeDriver: true }),
      Animated.timing(sheetY, { toValue: 480, duration: 280, useNativeDriver: true }),
    ]).start(({ finished }) => {
      if (finished) setMountedSheet(null);
    });
  }, [sheet, scrim, sheetY]);

  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      if (sheet) {
        setSheet(null);
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [sheet]);

  useEffect(() => {
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, []);

  const showToast = (message: string) => {
    setToastText(message);
    setToastOn(true);
    toastY.setValue(24);
    toastOpacity.setValue(0);
    Animated.parallel([
      Animated.timing(toastOpacity, { toValue: 1, duration: 220, useNativeDriver: true }),
      Animated.timing(toastY, { toValue: 0, duration: 220, useNativeDriver: true }),
    ]).start();
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => {
      Animated.parallel([
        Animated.timing(toastOpacity, { toValue: 0, duration: 220, useNativeDriver: true }),
        Animated.timing(toastY, { toValue: 24, duration: 220, useNativeDriver: true }),
      ]).start(() => setToastOn(false));
    }, 2200);
  };

  const recordCity = (city: string, note?: string) => {
    const contact = user?.phone || user?.email;
    apiFetch("/api/feedback/city-vote", {
      method: "POST",
      silent: true,
      body: JSON.stringify({
        city,
        contact: contact || undefined,
        note,
      }),
    }).catch(() => {});
  };

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace("/(auth)/create-account");
  };

  const confirmHome = () => {
    setSheet(null);
    router.push("/onboarding/choose-gym");
  };

  const notifyCity = (city: string) => {
    if (notified.includes(city)) return;
    setNotified((current) => [...current, city]);
    recordCity(city, "Notify me when this city is live");
    showToast(`We'll notify you for ${city}`);
  };

  const recommendGym = (city: string) => {
    recordCity(city, "Member wants to recommend a gym");
    setSheet(null);
    showToast("Thanks! Our team will reach out.");
  };

  const requestSearchedCity = () => {
    const city = search.trim();
    if (!city) return;
    recordCity(city, "Asked us to launch here");
    showToast("Thanks! We'll note this city.");
  };

  const useCurrentLocation = async () => {
    if (locating) return;
    setLocating(true);
    setGpsMessage("Detecting");
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== "granted") {
        setGpsMessage("Location is off");
        showToast("Allow location to find Zonofit near you.");
        return;
      }
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const places = await Location.reverseGeocodeAsync(position.coords);
      const found = places[0]?.city || places[0]?.subregion || places[0]?.district || "";
      setGpsMessage(found ? `Detected: ${found}` : "Could not read your city");
      const match = knownCity(found);
      if (match === "Udaipur") setSheet({ kind: "home" });
      else if (match) setSheet({ kind: "soon", city: match });
      else showToast(found ? `We're not in ${found} yet.` : "We're not in that city yet.");
    } catch {
      setGpsMessage("Find Zonofit near you");
      showToast("Could not read your location.");
    } finally {
      setLocating(false);
    }
  };

  const toastNode = toastOn ? (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.toast,
        { bottom: Math.max(insets.bottom, 16) + 12, opacity: toastOpacity, transform: [{ translateY: toastY }] },
      ]}
    >
      <Text style={styles.toastText}>{toastText}</Text>
    </Animated.View>
  ) : null;

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <StatusBar barStyle="dark-content" />
      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.page, { paddingBottom: Math.max(insets.bottom, 16) + 28 }]}
      >
        <View style={styles.top}>
          <Pressable onPress={goBack} style={styles.back} accessibilityLabel="Back" hitSlop={8}>
            <Ionicons name="chevron-back" size={22} color="#0F2417" />
          </Pressable>
        </View>

        <Text style={styles.title}>Select city</Text>
        <Text style={styles.sub}>Zonofit is live in Udaipur. More cities are on the way.</Text>

        <View style={[styles.search, searchFocused && styles.searchOn]}>
          <Ionicons name="search" size={20} color="#66756B" />
          <TextInput
            value={search}
            onChangeText={setSearch}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            placeholder="Search for your city"
            placeholderTextColor="#66756B"
            style={styles.searchInput}
            autoCorrect={false}
            autoCapitalize="words"
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch("")} hitSlop={8} accessibilityLabel="Clear search">
              <Ionicons name="close-circle" size={18} color="#66756B" />
            </Pressable>
          )}
        </View>

        <Pressable style={styles.loc} onPress={useCurrentLocation} disabled={locating}>
          <View style={styles.locIcon}>
            {locating ? (
              <ActivityIndicator color="#1F7A3F" size="small" />
            ) : (
              <Ionicons name="locate" size={20} color="#1F7A3F" />
            )}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.locTitle}>Use current location</Text>
            <Text style={styles.locSub}>{gpsMessage}</Text>
          </View>
        </Pressable>

        {showHome && (
          <View>
            <Text style={styles.sec}>Live now</Text>
            <Pressable style={styles.home} onPress={() => setSheet({ kind: "home" })}>
              <View style={styles.mark}>
                <CityMark name="Udaipur" selected={true} size={44} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.homeName}>Udaipur</Text>
                <Text style={styles.homeSub}>Your home city</Text>
              </View>
              <View style={styles.live}>
                <Animated.View style={[styles.liveDot, { opacity: pulse }]} />
                <Text style={styles.liveText}>Live</Text>
              </View>
            </Pressable>
          </View>
        )}

        {soonCities.length > 0 && (
          <View>
            <Text style={styles.sec}>Coming soon</Text>
            <View style={styles.grid}>
              {soonCities.map((city) => {
                const on = notified.includes(city);
                return (
                  <Pressable
                    key={city}
                    onPress={() => setSheet({ kind: "soon", city })}
                    style={({ pressed }) => [
                      styles.city,
                      { width: cardWidth },
                      on && styles.cityOn,
                      pressed && { transform: [{ scale: 0.97 }] },
                    ]}
                  >
                    <View style={[styles.soonMark, on && styles.soonMarkOn]}>
                      <CityMark name={city} selected={on} size={40} />
                    </View>
                    <Text style={styles.cityName} numberOfLines={2}>{city}</Text>
                    <View style={[styles.soonChip, on && styles.soonChipOn]}>
                      <Text style={[styles.soonChipText, on && styles.soonChipTextOn]}>
                        {on ? "Notified" : "Soon"}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}

        {showEmpty && (
          <View style={styles.none}>
            <Text style={styles.noneText}>We're not in that city yet.</Text>
            <Pressable onPress={requestSearchedCity} hitSlop={8}>
              <Text style={styles.noneLink}>Tell us where to launch next</Text>
            </Pressable>
          </View>
        )}

        <View style={styles.note}>
          <Text style={styles.noteMark}>i</Text>
          <Text style={styles.noteText}>
            <Text style={styles.noteStrong}>Credits are for travel. </Text>
            In Udaipur you use your primary gym visits. Credits unlock partner gyms in other cities as they go live.
          </Text>
        </View>
      </ScrollView>

      {toastNode}

      <Modal visible={mountedSheet !== null} transparent animationType="none" onRequestClose={() => setSheet(null)} statusBarTranslucent>
        <View style={styles.modalFill}>
          <Animated.View style={[StyleSheet.absoluteFill, styles.scrim, { opacity: scrim }]}>
            <Pressable style={StyleSheet.absoluteFill} onPress={() => setSheet(null)} accessibilityLabel="Close" />
          </Animated.View>
          <Animated.View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) + 12, transform: [{ translateY: sheetY }] }]}>
            <View style={styles.grab} />
            {mountedSheet?.kind === "home" && (
              <View>
                <View style={styles.sheetTop}>
                  <View style={styles.mark}>
                    <CityMark name="Udaipur" selected={true} size={48} />
                  </View>
                  <Text style={styles.sheetTitle}>Udaipur is your home city</Text>
                </View>
                <Text style={styles.sheetBody}>
                  Zonofit is live here. Credits work in other cities, so they unlock as we launch.
                </Text>
                <View style={styles.rule}>
                  <View style={styles.ruleMark}>
                    <Text style={styles.ruleLetter}>U</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.ruleTitle}>In Udaipur</Text>
                    <Text style={styles.ruleSub}>Use your primary gym visits</Text>
                  </View>
                </View>
                <View style={styles.rule}>
                  <View style={styles.ruleMark}>
                    <Ionicons name="airplane-outline" size={18} color="#1F7A3F" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.ruleTitle}>In other cities</Text>
                    <Text style={styles.ruleSub}>Spend credits at any partner gym</Text>
                  </View>
                </View>
                <Pressable style={styles.primary} onPress={confirmHome}>
                  <Text style={styles.primaryText}>Got it</Text>
                </Pressable>
              </View>
            )}
            {mountedSheet?.kind === "soon" && (
              <View>
                <View style={styles.sheetTop}>
                  <View style={styles.mark}>
                    <CityMark name={mountedSheet.city} selected={notified.includes(mountedSheet.city)} size={48} />
                  </View>
                  <Text style={styles.sheetTitle}>{mountedSheet.city} is coming soon</Text>
                </View>
                <Text style={styles.sheetBody}>
                  We're setting up partner gyms in {mountedSheet.city}. Get a ping the day it opens. Your credits will work here when you travel.
                </Text>
                <Pressable
                  style={[styles.primary, notified.includes(mountedSheet.city) && styles.primaryDone]}
                  onPress={() => notifyCity(mountedSheet.city)}
                >
                  <Text style={[styles.primaryText, notified.includes(mountedSheet.city) && styles.primaryDoneText]}>
                    {notified.includes(mountedSheet.city) ? "You're on the list" : "Notify me when live"}
                  </Text>
                </Pressable>
                <Pressable onPress={() => recommendGym(mountedSheet.city)} hitSlop={6}>
                  <Text style={styles.link}>Know a gym in {mountedSheet.city}? Recommend it</Text>
                </Pressable>
              </View>
            )}
          </Animated.View>
          {toastNode}
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F6F8F5",
  },
  page: {
    paddingHorizontal: 20,
    paddingTop: 8,
    maxWidth: 480,
    width: "100%",
    alignSelf: "center",
  },
  top: {
    height: 44,
    justifyContent: "center",
  },
  back: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E1E8DE",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    marginTop: 14,
    fontSize: 30,
    lineHeight: 33,
    fontWeight: "700",
    letterSpacing: -0.8,
    color: "#0F2417",
  },
  sub: {
    marginTop: 4,
    marginBottom: 16,
    color: "#66756B",
    fontSize: 15,
    lineHeight: 21,
  },
  search: {
    height: 52,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "#E1E8DE",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  searchOn: {
    borderColor: "#1F7A3F",
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: "#0F2417",
    paddingVertical: 0,
  },
  loc: {
    marginTop: 12,
    borderRadius: 16,
    backgroundColor: "#E8F4EA",
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  locIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  locTitle: {
    color: "#1F7A3F",
    fontWeight: "700",
    fontSize: 15,
  },
  locSub: {
    color: "#66756B",
    fontSize: 13,
    marginTop: 1,
  },
  sec: {
    marginTop: 24,
    marginBottom: 10,
    marginLeft: 2,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1.2,
    textTransform: "uppercase",
    color: "#66756B",
  },
  home: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: "#1F7A3F",
    padding: 14,
    shadowColor: "#1F7A3F",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 2,
  },
  mark: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: "#E8F4EA",
    alignItems: "center",
    justifyContent: "center",
  },
  homeName: {
    fontSize: 20,
    fontWeight: "700",
    color: "#0F2417",
    letterSpacing: -0.3,
  },
  homeSub: {
    color: "#66756B",
    marginTop: 2,
    fontSize: 14,
  },
  live: {
    marginLeft: "auto",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#E8F4EA",
    borderRadius: 99,
    paddingHorizontal: 11,
    paddingVertical: 6,
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#1F7A3F",
  },
  liveText: {
    color: "#1F7A3F",
    fontWeight: "700",
    fontSize: 12,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  city: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1.5,
    borderColor: "#E1E8DE",
    borderRadius: 22,
    paddingTop: 14,
    paddingBottom: 12,
    paddingHorizontal: 6,
    alignItems: "center",
  },
  cityOn: {
    borderColor: "#1F7A3F",
  },
  soonMark: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: "#F6F8F5",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  soonMarkOn: {
    backgroundColor: "#E8F4EA",
  },
  cityName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F2417",
    textAlign: "center",
    lineHeight: 18,
    minHeight: 36,
  },
  soonChip: {
    marginTop: 6,
    backgroundColor: "#FFF4D9",
    borderRadius: 99,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  soonChipOn: {
    backgroundColor: "#E8F4EA",
  },
  soonChipText: {
    color: "#8A5A00",
    fontSize: 11,
    fontWeight: "700",
  },
  soonChipTextOn: {
    color: "#1F7A3F",
  },
  none: {
    alignItems: "center",
    paddingVertical: 28,
    paddingHorizontal: 10,
  },
  noneText: {
    color: "#66756B",
    textAlign: "center",
    fontSize: 15,
    lineHeight: 21,
  },
  noneLink: {
    marginTop: 8,
    color: "#1F7A3F",
    fontWeight: "700",
    fontSize: 15,
  },
  note: {
    marginTop: 22,
    backgroundColor: "#E8F4EA",
    borderRadius: 16,
    padding: 14,
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-start",
  },
  noteMark: {
    width: 18,
    textAlign: "center",
    color: "#1F7A3F",
    fontWeight: "700",
    fontSize: 14,
  },
  noteText: {
    flex: 1,
    color: "#0F2417",
    fontSize: 13.5,
    lineHeight: 19,
  },
  noteStrong: {
    fontWeight: "700",
  },
  modalFill: {
    flex: 1,
    justifyContent: "flex-end",
  },
  scrim: {
    backgroundColor: "rgba(8,16,11,0.5)",
  },
  sheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 12,
  },
  grab: {
    width: 40,
    height: 4,
    borderRadius: 4,
    backgroundColor: "#E1E8DE",
    alignSelf: "center",
    marginBottom: 18,
  },
  sheetTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginBottom: 12,
  },
  sheetTitle: {
    flex: 1,
    fontSize: 25,
    lineHeight: 28,
    fontWeight: "700",
    letterSpacing: -0.4,
    color: "#0F2417",
  },
  sheetBody: {
    color: "#66756B",
    fontSize: 15,
    lineHeight: 21,
    marginBottom: 14,
  },
  rule: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#F6F8F5",
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 8,
  },
  ruleMark: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#E8F4EA",
    alignItems: "center",
    justifyContent: "center",
  },
  ruleLetter: {
    color: "#1F7A3F",
    fontWeight: "700",
    fontSize: 16,
  },
  ruleTitle: {
    color: "#0F2417",
    fontWeight: "700",
    fontSize: 15,
  },
  ruleSub: {
    color: "#66756B",
    fontSize: 13,
    marginTop: 1,
  },
  primary: {
    height: 54,
    borderRadius: 99,
    backgroundColor: "#1F7A3F",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  primaryText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  primaryDone: {
    backgroundColor: "#E8F4EA",
  },
  primaryDoneText: {
    color: "#1F7A3F",
  },
  link: {
    textAlign: "center",
    color: "#66756B",
    fontWeight: "600",
    fontSize: 15,
    paddingTop: 12,
  },
  toast: {
    position: "absolute",
    left: 20,
    right: 20,
    backgroundColor: "#0F2417",
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 18,
    alignItems: "center",
    zIndex: 20,
  },
  toastText: {
    color: "#F6F8F5",
    fontWeight: "600",
    fontSize: 14,
    textAlign: "center",
  },
});
