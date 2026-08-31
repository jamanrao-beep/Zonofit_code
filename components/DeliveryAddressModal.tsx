import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  Modal,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { useAddressStore, Address, DeliveryInstructions } from "@/store/useAddressStore";

const INDIAN_STATES = [
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
  "Delhi",
  "Chandigarh",
  "Puducherry",
];

interface DeliveryAddressModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectAddress?: (address: Address) => void;
  initialAddress?: Address | null;
}

export default function DeliveryAddressModal({
  visible,
  onClose,
  onSelectAddress,
  initialAddress,
}: DeliveryAddressModalProps) {
  const { addAddress, updateAddress, getSelectedAddress } = useAddressStore();

  const [fullName, setFullName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [flatHouse, setFlatHouse] = useState("");
  const [areaStreet, setAreaStreet] = useState("");
  const [landmark, setLandmark] = useState("");
  const [pincode, setPincode] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [isDefault, setIsDefault] = useState(true);

  // Delivery instructions state
  const [deliveryInstructions, setDeliveryInstructions] = useState<DeliveryInstructions>({
    type: "door",
    instructionsText: "",
    avoidCalling: false,
    weekendDelivery: true,
  });

  // UI Modals / Drawers
  const [isStatePickerOpen, setIsStatePickerOpen] = useState(false);
  const [isInstructionsOpen, setIsInstructionsOpen] = useState(false);
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);

  // Load existing or default address on open
  useEffect(() => {
    if (visible) {
      const target = initialAddress || getSelectedAddress();
      if (target) {
        setFullName(target.fullName || "");
        setPhoneNumber(target.phoneNumber || "");
        setFlatHouse(target.flatHouse || "");
        setAreaStreet(target.areaStreet || "");
        setLandmark(target.landmark || "");
        setPincode(target.pincode || "");
        setCity(target.city || "");
        setState(target.state || "");
        setIsDefault(target.isDefault ?? true);
        if (target.deliveryInstructions) {
          setDeliveryInstructions(target.deliveryInstructions);
        }
      } else {
        setFullName("");
        setPhoneNumber("");
        setFlatHouse("");
        setAreaStreet("");
        setLandmark("");
        setPincode("");
        setCity("");
        setState("");
        setIsDefault(true);
      }
    }
  }, [visible, initialAddress]);

  const handleAddLocationOnMap = async () => {
    setIsDetectingLocation(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission Denied",
          "Please grant location permission to detect your address, or enter it manually."
        );
        setIsDetectingLocation(false);
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const [geocode] = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });

      if (geocode) {
        if (geocode.city || geocode.subregion) setCity(geocode.city || geocode.subregion || "");
        if (geocode.postalCode) setPincode(geocode.postalCode);
        if (geocode.region) {
          const matchedState = INDIAN_STATES.find(
            (s) => s.toLowerCase() === (geocode.region || "").toLowerCase()
          );
          if (matchedState) setState(matchedState);
        }
        if (geocode.district || geocode.street) {
          const areaParts = [geocode.name, geocode.street, geocode.district].filter(Boolean);
          if (!areaStreet && areaParts.length > 0) {
            setAreaStreet(areaParts.join(", "));
          }
        }
        Alert.alert("Location Detected", "City, Pincode and Area have been updated based on your current location.");
      }
    } catch (err: any) {
      Alert.alert("Location Error", "Could not fetch current location. Please enter address details manually.");
    } finally {
      setIsDetectingLocation(false);
    }
  };

  const handleSaveAndUse = () => {
    if (!fullName.trim()) {
      Alert.alert("Missing Name", "Please enter your full name.");
      return;
    }
    if (!phoneNumber.trim() || phoneNumber.trim().length < 10) {
      Alert.alert("Invalid Phone Number", "Please enter a valid 10-digit mobile number.");
      return;
    }
    if (!flatHouse.trim()) {
      Alert.alert("Missing Address", "Please enter flat, house no., or building details.");
      return;
    }
    if (!areaStreet.trim()) {
      Alert.alert("Missing Area", "Please enter your street, area or sector.");
      return;
    }
    if (!pincode.trim() || pincode.trim().length !== 6) {
      Alert.alert("Invalid Pincode", "Please enter a valid 6-digit Pincode.");
      return;
    }
    if (!city.trim()) {
      Alert.alert("Missing Town/City", "Please enter your town or city.");
      return;
    }
    if (!state.trim()) {
      Alert.alert("Missing State", "Please select your state from the dropdown.");
      return;
    }

    let savedAddr: Address;

    if (initialAddress?.id) {
      updateAddress(initialAddress.id, {
        fullName: fullName.trim(),
        phoneNumber: phoneNumber.trim(),
        flatHouse: flatHouse.trim(),
        areaStreet: areaStreet.trim(),
        landmark: landmark.trim(),
        pincode: pincode.trim(),
        city: city.trim(),
        state: state.trim(),
        isDefault,
        deliveryInstructions,
      });
      savedAddr = {
        ...initialAddress,
        fullName: fullName.trim(),
        phoneNumber: phoneNumber.trim(),
        flatHouse: flatHouse.trim(),
        areaStreet: areaStreet.trim(),
        landmark: landmark.trim(),
        pincode: pincode.trim(),
        city: city.trim(),
        state: state.trim(),
        isDefault,
        deliveryInstructions,
      };
    } else {
      savedAddr = addAddress({
        fullName: fullName.trim(),
        phoneNumber: phoneNumber.trim(),
        flatHouse: flatHouse.trim(),
        areaStreet: areaStreet.trim(),
        landmark: landmark.trim(),
        pincode: pincode.trim(),
        city: city.trim(),
        state: state.trim(),
        isDefault,
        deliveryInstructions,
      });
    }

    if (onSelectAddress) {
      onSelectAddress(savedAddr);
    }
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
        {/* Amazon-style header bar */}
        <View style={styles.header}>
          <Pressable onPress={onClose} style={styles.backButton} hitSlop={10}>
            <Ionicons name="arrow-back" size={24} color="#111827" />
          </Pressable>
          <Text style={styles.headerTitle}>Add delivery address</Text>
          <Pressable onPress={onClose} hitSlop={10}>
            <Text style={styles.cancelText}>CANCEL</Text>
          </Pressable>
        </View>

        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={{ flex: 1 }}
        >
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            {/* Full Name */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Full name</Text>
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.textInput}
                  placeholder="Enter full name"
                  placeholderTextColor="#9CA3AF"
                  value={fullName}
                  onChangeText={setFullName}
                />
                {fullName.length > 0 && (
                  <Pressable onPress={() => setFullName("")} style={styles.clearBtn}>
                    <Ionicons name="close" size={18} color="#6B7280" />
                  </Pressable>
                )}
              </View>
            </View>

            {/* Mobile Number */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Mobile number</Text>
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.textInput}
                  placeholder="10-digit mobile number"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="phone-pad"
                  maxLength={10}
                  value={phoneNumber}
                  onChangeText={setPhoneNumber}
                />
                {phoneNumber.length > 0 && (
                  <Pressable onPress={() => setPhoneNumber("")} style={styles.clearBtn}>
                    <Ionicons name="close" size={18} color="#6B7280" />
                  </Pressable>
                )}
              </View>
              <Text style={styles.helperText}>May be used to assist delivery</Text>
            </View>

            {/* Location Map Action */}
            <Pressable
              style={styles.mapActionRow}
              onPress={handleAddLocationOnMap}
              disabled={isDetectingLocation}
            >
              {isDetectingLocation ? (
                <ActivityIndicator size="small" color="#D97706" style={{ marginRight: 8 }} />
              ) : (
                <Ionicons name="location-sharp" size={20} color="#D97706" style={{ marginRight: 8 }} />
              )}
              <Text style={styles.mapActionText}>
                {isDetectingLocation ? "Detecting location..." : "Add location on map"}
              </Text>
            </Pressable>

            {/* Flat, House no., Building */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>
                Flat, House no., Building, Company, Apartment
              </Text>
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.textInput}
                  placeholder=""
                  placeholderTextColor="#9CA3AF"
                  value={flatHouse}
                  onChangeText={setFlatHouse}
                />
              </View>
            </View>

            {/* Area, Street, Sector, Village */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Area, Street, Sector, Village</Text>
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.textInput}
                  placeholder=""
                  placeholderTextColor="#9CA3AF"
                  value={areaStreet}
                  onChangeText={setAreaStreet}
                />
              </View>
            </View>

            {/* Landmark */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Landmark</Text>
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.textInput}
                  placeholder="E.g. near apollo hospital"
                  placeholderTextColor="#9CA3AF"
                  value={landmark}
                  onChangeText={setLandmark}
                />
              </View>
            </View>

            {/* Pincode and Town/City Side by Side */}
            <View style={styles.rowFields}>
              <View style={[styles.fieldGroup, { flex: 1, marginRight: 12 }]}>
                <Text style={styles.fieldLabel}>Pincode</Text>
                <View style={styles.inputContainer}>
                  <TextInput
                    style={styles.textInput}
                    placeholder="6-digit Pincode"
                    placeholderTextColor="#9CA3AF"
                    keyboardType="number-pad"
                    maxLength={6}
                    value={pincode}
                    onChangeText={setPincode}
                  />
                </View>
              </View>

              <View style={[styles.fieldGroup, { flex: 1 }]}>
                <Text style={styles.fieldLabel}>Town/City</Text>
                <View style={styles.inputContainer}>
                  <TextInput
                    style={styles.textInput}
                    placeholder=""
                    placeholderTextColor="#9CA3AF"
                    value={city}
                    onChangeText={setCity}
                  />
                </View>
              </View>
            </View>

            {/* State Select Dropdown */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>State</Text>
              <Pressable
                style={styles.selectDropdown}
                onPress={() => setIsStatePickerOpen(true)}
              >
                <Text style={[styles.selectDropdownText, !state && { color: "#9CA3AF" }]}>
                  {state || "Select"}
                </Text>
                <Ionicons name="chevron-down" size={18} color="#4B5563" />
              </Pressable>
            </View>

            {/* Make this my default address */}
            <Pressable
              style={styles.checkboxRow}
              onPress={() => setIsDefault(!isDefault)}
            >
              <View style={[styles.checkbox, isDefault && styles.checkboxChecked]}>
                {isDefault && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
              </View>
              <Text style={styles.checkboxLabel}>Make this my default address</Text>
            </Pressable>

            {/* Update Delivery Instructions */}
            <Pressable
              style={styles.instructionsRow}
              onPress={() => setIsInstructionsOpen(true)}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.instructionsTitle}>Update delivery instructions</Text>
                <Text style={styles.instructionsSubtitle}>
                  {deliveryInstructions.instructionsText
                    ? deliveryInstructions.instructionsText
                    : "Notes, preferences and more"}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#4B5563" />
            </Pressable>

            {/* Action CTA button */}
            <Pressable
              style={styles.useAddressButton}
              onPress={handleSaveAndUse}
            >
              <Text style={styles.useAddressText}>Use this address</Text>
            </Pressable>
          </ScrollView>
        </KeyboardAvoidingView>

        {/* State Selector Modal */}
        <Modal
          visible={isStatePickerOpen}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setIsStatePickerOpen(false)}
        >
          <View style={styles.pickerOverlay}>
            <View style={styles.pickerModal}>
              <View style={styles.pickerHeader}>
                <Text style={styles.pickerTitle}>Select State</Text>
                <Pressable onPress={() => setIsStatePickerOpen(false)}>
                  <Ionicons name="close" size={24} color="#111827" />
                </Pressable>
              </View>
              <ScrollView style={{ maxHeight: 350 }}>
                {INDIAN_STATES.map((st) => (
                  <Pressable
                    key={st}
                    style={[styles.pickerItem, state === st && styles.pickerItemActive]}
                    onPress={() => {
                      setState(st);
                      setIsStatePickerOpen(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.pickerItemText,
                        state === st && styles.pickerItemTextActive,
                      ]}
                    >
                      {st}
                    </Text>
                    {state === st && <Ionicons name="checkmark" size={20} color="#1F7A3E" />}
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* Delivery Instructions Modal */}
        <Modal
          visible={isInstructionsOpen}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setIsInstructionsOpen(false)}
        >
          <View style={styles.instructionsOverlay}>
            <View style={styles.instructionsModal}>
              <View style={styles.instructionsModalHeader}>
                <Text style={styles.pickerTitle}>Delivery Instructions</Text>
                <Pressable onPress={() => setIsInstructionsOpen(false)}>
                  <Ionicons name="close" size={24} color="#111827" />
                </Pressable>
              </View>

              <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={styles.modalSubheading}>Where should we leave your order?</Text>

                <View style={styles.optionsList}>
                  {[
                    { id: "door", label: "Leave at front door / doorstep", icon: "home-outline" },
                    { id: "security", label: "Leave with building security guard", icon: "shield-checkmark-outline" },
                    { id: "call_first", label: "Call before attempting delivery", icon: "call-outline" },
                  ].map((opt) => (
                    <Pressable
                      key={opt.id}
                      style={[
                        styles.optionCard,
                        deliveryInstructions.type === opt.id && styles.optionCardActive,
                      ]}
                      onPress={() =>
                        setDeliveryInstructions({
                          ...deliveryInstructions,
                          type: opt.id as any,
                        })
                      }
                    >
                      <Ionicons
                        name={opt.icon as any}
                        size={20}
                        color={deliveryInstructions.type === opt.id ? "#1F7A3E" : "#6B7280"}
                      />
                      <Text
                        style={[
                          styles.optionLabel,
                          deliveryInstructions.type === opt.id && styles.optionLabelActive,
                        ]}
                      >
                        {opt.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>

                <Text style={[styles.modalSubheading, { marginTop: 16 }]}>Additional notes</Text>
                <TextInput
                  style={styles.instructionsInput}
                  placeholder="e.g. Ring doorbell twice, watch out for dog..."
                  placeholderTextColor="#9CA3AF"
                  multiline
                  numberOfLines={3}
                  value={deliveryInstructions.instructionsText}
                  onChangeText={(text) =>
                    setDeliveryInstructions({ ...deliveryInstructions, instructionsText: text })
                  }
                />

                <Pressable
                  style={styles.doneInstructionsButton}
                  onPress={() => setIsInstructionsOpen(false)}
                >
                  <Text style={styles.doneInstructionsText}>Save Instructions</Text>
                </Pressable>
              </ScrollView>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    height: 54,
    backgroundColor: "#F6F6F6",
    borderBottomWidth: 1,
    borderColor: "#E5E7EB",
  },
  backButton: {
    width: 36,
    height: 36,
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
  },
  cancelText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#4B5563",
    letterSpacing: 0.5,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 40,
  },
  fieldGroup: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 6,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 12,
    height: 46,
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    color: "#111827",
    paddingVertical: 8,
  },
  clearBtn: {
    padding: 4,
  },
  helperText: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 4,
  },
  mapActionRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    marginBottom: 12,
  },
  mapActionText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#2563EB",
  },
  rowFields: {
    flexDirection: "row",
    alignItems: "center",
  },
  selectDropdown: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    backgroundColor: "#F9FAFB",
    paddingHorizontal: 12,
    height: 46,
  },
  selectDropdownText: {
    fontSize: 15,
    color: "#111827",
    fontWeight: "500",
  },
  checkboxRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 12,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: "#9CA3AF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
    backgroundColor: "#FFFFFF",
  },
  checkboxChecked: {
    backgroundColor: "#1F7A3E",
    borderColor: "#1F7A3E",
  },
  checkboxLabel: {
    fontSize: 14,
    color: "#1F2937",
    fontWeight: "500",
  },
  instructionsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    borderTopWidth: 1,
    borderColor: "#F3F4F6",
    marginVertical: 8,
  },
  instructionsTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
  },
  instructionsSubtitle: {
    fontSize: 13,
    color: "#6B7280",
    marginTop: 2,
  },
  useAddressButton: {
    backgroundColor: "#FFD814",
    borderColor: "#FCD200",
    borderWidth: 1,
    borderRadius: 100,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  useAddressText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0F1111",
  },
  pickerOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  pickerModal: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    maxHeight: "80%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 5,
  },
  pickerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderColor: "#F3F4F6",
    marginBottom: 8,
  },
  pickerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
  },
  pickerItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: "#F9FAFB",
  },
  pickerItemActive: {
    backgroundColor: "#F0FDF4",
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  pickerItemText: {
    fontSize: 15,
    color: "#374151",
    fontWeight: "500",
  },
  pickerItemTextActive: {
    color: "#1F7A3E",
    fontWeight: "700",
  },
  instructionsOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  instructionsModal: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: "80%",
  },
  instructionsModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderColor: "#F3F4F6",
    marginBottom: 16,
  },
  modalSubheading: {
    fontSize: 14,
    fontWeight: "700",
    color: "#374151",
    marginBottom: 10,
  },
  optionsList: {
    gap: 10,
  },
  optionCard: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    padding: 14,
    backgroundColor: "#FAFAFA",
  },
  optionCardActive: {
    borderColor: "#1F7A3E",
    backgroundColor: "#F0FDF4",
  },
  optionLabel: {
    fontSize: 14,
    color: "#374151",
    fontWeight: "500",
    marginLeft: 12,
    flex: 1,
  },
  optionLabelActive: {
    color: "#1F7A3E",
    fontWeight: "700",
  },
  instructionsInput: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    color: "#111827",
    backgroundColor: "#FFFFFF",
    textAlignVertical: "top",
    marginBottom: 20,
  },
  doneInstructionsButton: {
    backgroundColor: "#1F7A3E",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  doneInstructionsText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
});
