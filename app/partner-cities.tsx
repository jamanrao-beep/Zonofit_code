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
import * as Location from "expo-location";
import { apiFetch } from "@/lib/api";
import { useAuthStore } from "@/store/useAuthStore";

const HOME_CITY = "Udaipur";

const ACTIVE_PARTNER_CITIES = [
  { name: "Delhi NCR", state: "Delhi & NCR", centres: 15 },
  { name: "Mumbai", state: "Maharashtra", centres: 12 },
  { name: "Bengaluru", state: "Karnataka", centres: 14 },
  { name: "Jaipur", state: "Rajasthan", centres: 8 },
] as const;

const UPCOMING_PARTNER_CITIES = [
  "Ahmedabad",
  "Pune",
  "Indore",
  "Chandigarh",
  "Hyderabad",
  "Kolkata",
  "Chennai",
  "Kochi",
  "Jodhpur",
  "Kota",
  "Ajmer",
  "Bhilwara",
] as const;

type ActiveCityName = (typeof ACTIVE_PARTNER_CITIES)[number]["name"];
type UpcomingCityName = (typeof UPCOMING_PARTNER_CITIES)[number];

type SheetState =
  | { kind: "home" }
  | { kind: "soon"; city: UpcomingCityName }
  | null;

const CITY_ICONS: Record<
  string,
  { base: ImageSourcePropType; selected: ImageSourcePropType }
> = {
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
  Indore: {
    base: require("@/assets/images/cities/indore.png"),
    selected: require("@/assets/images/cities/indore-selected.png"),
  },
};

function CityMark({
  name,
  selected = false,
  size = 40,
}: {
  name: string;
  selected?: boolean;
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

function knownCity(raw: string): string | null {
  const name = raw.toLowerCase();
  if (!name) return null;
  if (name.includes("udaipur")) return "Udaipur";
  const active = ACTIVE_PARTNER_CITIES.find((c) =>
    name.includes(c.name.toLowerCase())
  );
  if (active) return active.name;
  return (
    UPCOMING_PARTNER_CITIES.find((city) =>
      name.includes(city.toLowerCase())
    ) ?? null
  );
}

export default function PartnerCitiesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const user = useAuthStore((s) => s.user);

  const [search, setSearch] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [notified, setNotified] = useState<string[]>([]);
  const [sheet, setSheet] = useState<SheetState>(null);
  const [mountedSheet, setMountedSheet] = useState<SheetState>(null);
  const [gpsMessage, setGpsMessage] = useState("Find Zonofit partner gyms near you");
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
  const filteredActive = ACTIVE_PARTNER_CITIES.filter(
    (c) =>
      c.name.toLowerCase().includes(query) ||
      c.state.toLowerCase().includes(query)
  );
  const filteredUpcoming = UPCOMING_PARTNER_CITIES.filter((city) =>
    city.toLowerCase().includes(query)
  );
  const showEmpty =
    !showHome && filteredActive.length === 0 && filteredUpcoming.length === 0;

  const cardWidth = Math.floor((Math.min(width, 480) - 40 - 20) / 3);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 0.3,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  useEffect(() => {
    if (sheet) {
      setMountedSheet(sheet);
      Animated.parallel([
        Animated.timing(scrim, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
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
      Animated.timing(scrim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(sheetY, {
        toValue: 480,
        duration: 280,
        useNativeDriver: true,
      }),
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
      Animated.timing(toastOpacity, {
        toValue: 1,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.timing(toastY, {
        toValue: 0,
        duration: 220,
        useNativeDriver: true,
      }),
    ]).start();
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => {
      Animated.parallel([
        Animated.timing(toastOpacity, {
          toValue: 0,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.timing(toastY, {
          toValue: 24,
          duration: 220,
          useNativeDriver: true,
        }),
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

  const handleSelectActiveCity = (cityName: string) => {
    router.push(`/partner-gyms?city=${encodeURIComponent(cityName)}` as any);
  };

  const handleSelectHomeCity = () => {
    // Open home city modal detailing Udaipur Primary Gym restriction rules
    setSheet({ kind: "home" });
  };

  const confirmHomeViewGyms = () => {
    setSheet(null);
    // User explicitly wants to browse Udaipur gyms with the restricted banner
    router.push("/partner-gyms?city=Udaipur" as any);
  };

  const notifyCity = (city: string) => {
    if (notified.includes(city)) return;
    setNotified((current) => [...current, city]);
    recordCity(city, "Notify me when partner gyms go live here");
    showToast(`We'll notify you for ${city}`);
  };

  const recommendGym = (city: string) => {
    recordCity(city, "Member wants to recommend a partner gym");
    setSheet(null);
    showToast("Thanks! Our team will reach out.");
  };

  const requestSearchedCity = () => {
    const city = search.trim();
    if (!city) return;
    recordCity(city, "Asked us to launch partner gyms here");
    showToast("Thanks! We'll note this city.");
  };

  const useCurrentLocation = async () => {
    if (locating) return;
    setLocating(true);
    setGpsMessage("Detecting location...");
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== "granted") {
        setGpsMessage("Location permission is off");
        showToast("Allow location to find Zonofit near you.");
        return;
      }
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const places = await Location.reverseGeocodeAsync(position.coords);
      const found =
        places[0]?.city || places[0]?.subregion || places[0]?.district || "";
      setGpsMessage(found ? `Detected: ${found}` : "Could not read your city");
      const match = knownCity(found);
      if (match === "Udaipur") {
        setSheet({ kind: "home" });
      } else if (
        ACTIVE_PARTNER_CITIES.some(
          (c) => c.name.toLowerCase() === match?.toLowerCase()
        )
      ) {
        handleSelectActiveCity(match!);
      } else if (match) {
        setSheet({ kind: "soon", city: match as UpcomingCityName });
      } else {
        showToast(
          found
            ? `No partner gyms in ${found} yet.`
            : "No partner gyms in that city yet."
        );
      }
    } catch {
      setGpsMessage("Find Zonofit partner gyms near you");
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
        {
          bottom: Math.max(insets.bottom, 16) + 12,
          opacity: toastOpacity,
          transform: [{ translateY: toastY }],
        },
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
        contentContainerStyle={[
          styles.page,
          { paddingBottom: Math.max(insets.bottom, 16) + 32 },
        ]}
      >
        {/* ─── Back Button ─── */}
        <View style={styles.top}>
          <Pressable
            onPress={() => router.back()}
            style={styles.back}
            accessibilityLabel="Back"
            hitSlop={8}
          >
            <Ionicons name="chevron-back" size={22} color="#0F2417" />
          </Pressable>
        </View>

        {/* ─── Title & Subtitle ─── */}
        <Text style={styles.title}>Select city</Text>
        <Text style={styles.sub}>
          Choose where you want to workout today. Credits unlock partner gyms
          nationwide.
        </Text>

        {/* ─── Search Bar ─── */}
        <View style={[styles.search, searchFocused && styles.searchOn]}>
          <Ionicons name="search" size={20} color="#66756B" />
          <TextInput
            value={search}
            onChangeText={setSearch}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            placeholder="Search for your city (e.g. Delhi NCR, Mumbai...)"
            placeholderTextColor="#66756B"
            style={styles.searchInput}
            autoCorrect={false}
            autoCapitalize="words"
          />
          {search.length > 0 && (
            <Pressable
              onPress={() => setSearch("")}
              hitSlop={8}
              accessibilityLabel="Clear search"
            >
              <Ionicons name="close-circle" size={18} color="#66756B" />
            </Pressable>
          )}
        </View>

        {/* ─── Use Current Location ─── */}
        <Pressable
          style={styles.loc}
          onPress={useCurrentLocation}
          disabled={locating}
        >
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

        {/* ─── Live Now (Home City) ─── */}
        {showHome && (
          <View>
            <Text style={styles.sec}>Live now</Text>
            <Pressable style={styles.home} onPress={handleSelectHomeCity}>
              <View style={styles.mark}>
                <CityMark name="Udaipur" selected={true} size={44} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.homeName}>Udaipur</Text>
                <Text style={styles.homeSub}>
                  Your home city • Primary Gym visits
                </Text>
              </View>
              <View style={styles.live}>
                <Animated.View style={[styles.liveDot, { opacity: pulse }]} />
                <Text style={styles.liveText}>Live</Text>
              </View>
            </Pressable>
          </View>
        )}

        {/* ─── Partner Network Cities (Travel with Credits) ─── */}
        {filteredActive.length > 0 && (
          <View>
            <Text style={styles.sec}>Partner network (Travel with credits)</Text>
            <View style={styles.grid}>
              {filteredActive.map((city) => (
                <Pressable
                  key={city.name}
                  onPress={() => handleSelectActiveCity(city.name)}
                  style={({ pressed }) => [
                    styles.city,
                    { width: cardWidth },
                    styles.cityActiveBorder,
                    pressed && { transform: [{ scale: 0.97 }] },
                  ]}
                >
                  <View style={[styles.soonMark, styles.activeMarkBg]}>
                    <CityMark name={city.name} selected={true} size={40} />
                  </View>
                  <Text style={styles.cityName} numberOfLines={2}>
                    {city.name}
                  </Text>
                  <View style={[styles.soonChip, styles.creditsChip]}>
                    <Text style={[styles.soonChipText, styles.creditsChipText]}>
                      Credits
                    </Text>
                  </View>
                </Pressable>
              ))}
            </View>
          </View>
        )}

        {/* ─── Expanding Soon ─── */}
        {filteredUpcoming.length > 0 && (
          <View>
            <Text style={styles.sec}>Expanding soon</Text>
            <View style={styles.grid}>
              {filteredUpcoming.map((cityName) => {
                const on = notified.includes(cityName);
                return (
                  <Pressable
                    key={cityName}
                    onPress={() =>
                      setSheet({ kind: "soon", city: cityName as UpcomingCityName })
                    }
                    style={({ pressed }) => [
                      styles.city,
                      { width: cardWidth },
                      on && styles.cityOn,
                      pressed && { transform: [{ scale: 0.97 }] },
                    ]}
                  >
                    <View style={[styles.soonMark, on && styles.soonMarkOn]}>
                      <CityMark name={cityName} selected={on} size={40} />
                    </View>
                    <Text style={styles.cityName} numberOfLines={2}>
                      {cityName}
                    </Text>
                    <View style={[styles.soonChip, on && styles.soonChipOn]}>
                      <Text
                        style={[
                          styles.soonChipText,
                          on && styles.soonChipTextOn,
                        ]}
                      >
                        {on ? "Notified" : "Soon"}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}

        {/* ─── Empty Search State ─── */}
        {showEmpty && (
          <View style={styles.none}>
            <Text style={styles.noneText}>
              We don't have partner gyms in that city yet.
            </Text>
            <Pressable onPress={requestSearchedCity} hitSlop={8}>
              <Text style={styles.noneLink}>Tell us where to launch next</Text>
            </Pressable>
          </View>
        )}

        {/* ─── Information Note ─── */}
        <View style={styles.note}>
          <Text style={styles.noteMark}>i</Text>
          <Text style={styles.noteText}>
            <Text style={styles.noteStrong}>Credits are for travel. </Text>
            In Udaipur you use your primary gym visits. Credits unlock partner gyms in other cities as you travel.
          </Text>
        </View>
      </ScrollView>

      {toastNode}

      {/* ─── Bottom Sheet Modal ─── */}
      <Modal
        visible={mountedSheet !== null}
        transparent
        animationType="none"
        onRequestClose={() => setSheet(null)}
        statusBarTranslucent
      >
        <View style={styles.modalFill}>
          <Animated.View
            style={[
              StyleSheet.absoluteFill,
              styles.scrim,
              { opacity: scrim },
            ]}
          >
            <Pressable
              style={StyleSheet.absoluteFill}
              onPress={() => setSheet(null)}
              accessibilityLabel="Close"
            />
          </Animated.View>

          <Animated.View
            style={[
              styles.sheet,
              {
                paddingBottom: Math.max(insets.bottom, 16) + 12,
                transform: [{ translateY: sheetY }],
              },
            ]}
          >
            <View style={styles.grab} />

            {/* HOME CITY INFO MODAL (REINFORCING UDAIPUR RESTRICTION RULES) */}
            {mountedSheet?.kind === "home" && (
              <View>
                <View style={styles.sheetTop}>
                  <View style={styles.mark}>
                    <CityMark name="Udaipur" selected={true} size={48} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.sheetTitle}>
                      Udaipur is your home city
                    </Text>
                    <Text style={styles.sheetSubBadge}>
                      PRIMARY GYM ACCESS ONLY
                    </Text>
                  </View>
                </View>

                <Text style={styles.sheetBody}>
                  As per membership policy, network visits in your home city
                  (Udaipur) are restricted to your designated Primary Gym.
                  Network credits cannot be spent in Udaipur.
                </Text>

                <View style={styles.rule}>
                  <View style={styles.ruleMark}>
                    <Text style={styles.ruleLetter}>U</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.ruleTitle}>In Udaipur</Text>
                    <Text style={styles.ruleSub}>
                      Use your designated Primary Gym visits
                    </Text>
                  </View>
                </View>

                <View style={styles.rule}>
                  <View style={styles.ruleMark}>
                    <Ionicons name="airplane" size={18} color="#1F7A3F" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.ruleTitle}>In other cities</Text>
                    <Text style={styles.ruleSub}>
                      Spend credits at partner gyms (Delhi NCR, Mumbai, Bengaluru, Jaipur)
                    </Text>
                  </View>
                </View>

                <Pressable
                  style={styles.primary}
                  onPress={() => setSheet(null)}
                >
                  <Text style={styles.primaryText}>Select a Travel City</Text>
                </Pressable>

                <Pressable
                  onPress={confirmHomeViewGyms}
                  hitSlop={6}
                  style={styles.secondaryBtn}
                >
                  <Text style={styles.secondaryLink}>
                    View Udaipur Gyms (Restricted)
                  </Text>
                </Pressable>
              </View>
            )}

            {/* UPCOMING CITY MODAL */}
            {mountedSheet?.kind === "soon" && (
              <View>
                <View style={styles.sheetTop}>
                  <View style={styles.mark}>
                    <CityMark
                      name={mountedSheet.city}
                      selected={notified.includes(mountedSheet.city)}
                      size={48}
                    />
                  </View>
                  <Text style={styles.sheetTitle}>
                    {mountedSheet.city} is coming soon
                  </Text>
                </View>
                <Text style={styles.sheetBody}>
                  We're onboarding partner gyms in {mountedSheet.city}. Get a ping
                  the day it opens. Your ZonoFit credits will unlock access here
                  when you travel.
                </Text>
                <Pressable
                  style={[
                    styles.primary,
                    notified.includes(mountedSheet.city) && styles.primaryDone,
                  ]}
                  onPress={() => notifyCity(mountedSheet.city)}
                >
                  <Text
                    style={[
                      styles.primaryText,
                      notified.includes(mountedSheet.city) &&
                        styles.primaryDoneText,
                    ]}
                  >
                    {notified.includes(mountedSheet.city)
                      ? "You're on the list"
                      : "Notify me when live"}
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => recommendGym(mountedSheet.city)}
                  hitSlop={6}
                >
                  <Text style={styles.link}>
                    Know a gym in {mountedSheet.city}? Recommend it
                  </Text>
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
  cityActiveBorder: {
    borderColor: "#C8E6C9",
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
  activeMarkBg: {
    backgroundColor: "#E8F4EA",
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
  creditsChip: {
    backgroundColor: "#E8F4EA",
  },
  creditsChipText: {
    color: "#1F7A3F",
    fontWeight: "800",
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
    marginTop: 24,
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
    fontSize: 20,
    fontWeight: "700",
    color: "#0F2417",
    letterSpacing: -0.3,
  },
  sheetSubBadge: {
    fontSize: 10,
    fontWeight: "800",
    color: "#DC2626",
    letterSpacing: 0.8,
    marginTop: 2,
  },
  sheetBody: {
    fontSize: 14.5,
    lineHeight: 21,
    color: "#66756B",
    marginBottom: 18,
  },
  rule: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#F6F8F5",
    borderRadius: 16,
    padding: 12,
    marginBottom: 10,
  },
  ruleMark: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#E8F4EA",
    alignItems: "center",
    justifyContent: "center",
  },
  ruleLetter: {
    fontSize: 15,
    fontWeight: "800",
    color: "#1F7A3F",
  },
  ruleTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F2417",
  },
  ruleSub: {
    fontSize: 12.5,
    color: "#66756B",
    marginTop: 1,
  },
  primary: {
    backgroundColor: "#1F7A3F",
    borderRadius: 16,
    height: 50,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
  },
  primaryDone: {
    backgroundColor: "#E8F4EA",
  },
  primaryText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  primaryDoneText: {
    color: "#1F7A3F",
  },
  secondaryBtn: {
    marginTop: 14,
    alignItems: "center",
    paddingVertical: 4,
  },
  secondaryLink: {
    fontSize: 13.5,
    fontWeight: "600",
    color: "#DC2626",
  },
  link: {
    marginTop: 14,
    textAlign: "center",
    fontSize: 13.5,
    fontWeight: "600",
    color: "#1F7A3F",
  },
  toast: {
    position: "absolute",
    alignSelf: "center",
    backgroundColor: "#0F2417",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 99,
  },
  toastText: {
    color: "#FFFFFF",
    fontSize: 13.5,
    fontWeight: "600",
  },
});
