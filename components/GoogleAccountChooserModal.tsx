import React, { useState } from "react";
import { 
  Modal, 
  View, 
  Text, 
  Pressable, 
  StyleSheet, 
  ActivityIndicator, 
  TextInput, 
  ScrollView 
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

export interface GoogleAccount {
  id: string;
  name: string;
  email: string;
  avatarColor: string;
}

const DEFAULT_ACCOUNTS: GoogleAccount[] = [
  { id: "acc_1", name: "Aman Rao", email: "aman.rao@gmail.com", avatarColor: "#1A73E8" },
  { id: "acc_2", name: "Fitness Member", email: "member.fitness@gmail.com", avatarColor: "#34A853" },
  { id: "acc_3", name: "Personal Account", email: "alex.workout@gmail.com", avatarColor: "#EA4335" },
];

interface GoogleAccountChooserModalProps {
  visible: boolean;
  onSelectAccount: (email: string, name: string) => Promise<void>;
  onClose: () => void;
}

export default function GoogleAccountChooserModal({
  visible,
  onSelectAccount,
  onClose,
}: GoogleAccountChooserModalProps) {
  const [loadingEmail, setLoadingEmail] = useState<string | null>(null);
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customEmail, setCustomEmail] = useState("");
  const [customName, setCustomName] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handlePickAccount = async (account: GoogleAccount) => {
    try {
      setErrorMsg(null);
      setLoadingEmail(account.email);
      await onSelectAccount(account.email, account.name);
    } catch (e: any) {
      setErrorMsg(e?.message || "Failed to sign in with selected account.");
      setLoadingEmail(null);
    }
  };

  const handleCustomSubmit = async () => {
    const trimmed = customEmail.trim().toLowerCase();
    if (!trimmed || !trimmed.includes("@") || !trimmed.includes(".")) {
      setErrorMsg("Please enter a valid Google email address.");
      return;
    }
    const name = customName.trim() || trimmed.split("@")[0];
    try {
      setErrorMsg(null);
      setLoadingEmail(trimmed);
      await onSelectAccount(trimmed, name);
    } catch (e: any) {
      setErrorMsg(e?.message || "Failed to sign in with entered account.");
      setLoadingEmail(null);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={loadingEmail ? undefined : onClose} />

        <View style={styles.sheet}>
          {/* Header with Google Brand & Close */}
          <View style={styles.header}>
            <View style={styles.googleBrand}>
              {/* Google 4-color G icon simulation */}
              <View style={styles.gLogo}>
                <Text style={styles.gLetter}>G</Text>
              </View>
              <Text style={styles.googleBrandText}>Google</Text>
            </View>

            {!loadingEmail && (
              <Pressable onPress={onClose} hitSlop={12} style={styles.closeBtn}>
                <Ionicons name="close" size={22} color="#5F6368" />
              </Pressable>
            )}
          </View>

          {/* Title block */}
          <View style={styles.titleBlock}>
            <Text style={styles.headline}>Choose an account</Text>
            <Text style={styles.subheadline}>to continue to <Text style={styles.boldApp}>ZonoFit</Text></Text>
          </View>

          {errorMsg ? (
            <View style={styles.errorBanner}>
              <Ionicons name="alert-circle" size={16} color="#D93025" />
              <Text style={styles.errorText}>{errorMsg}</Text>
            </View>
          ) : null}

          <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 340 }}>
            {/* Account List */}
            {DEFAULT_ACCOUNTS.map((acc) => {
              const isThisLoading = loadingEmail === acc.email;
              return (
                <Pressable
                  key={acc.id}
                  disabled={!!loadingEmail}
                  onPress={() => handlePickAccount(acc)}
                  style={({ pressed }) => [
                    styles.accountRow,
                    pressed && styles.accountRowPressed,
                    isThisLoading && styles.accountRowActive,
                  ]}
                >
                  <View style={[styles.avatarCircle, { backgroundColor: acc.avatarColor }]}>
                    <Text style={styles.avatarInitial}>{acc.name[0].toUpperCase()}</Text>
                  </View>

                  <View style={styles.accountInfo}>
                    <Text style={styles.accountName} numberOfLines={1}>{acc.name}</Text>
                    <Text style={styles.accountEmail} numberOfLines={1}>{acc.email}</Text>
                  </View>

                  {isThisLoading ? (
                    <ActivityIndicator size="small" color="#1A73E8" />
                  ) : (
                    <Ionicons name="chevron-forward" size={18} color="#9AA0A6" />
                  )}
                </Pressable>
              );
            })}

            {/* Custom Account Toggle */}
            {!showCustomInput ? (
              <Pressable
                disabled={!!loadingEmail}
                onPress={() => setShowCustomInput(true)}
                style={({ pressed }) => [
                  styles.accountRow,
                  pressed && styles.accountRowPressed,
                ]}
              >
                <View style={styles.addIconCircle}>
                  <Ionicons name="person-add-outline" size={18} color="#1A73E8" />
                </View>
                <View style={styles.accountInfo}>
                  <Text style={styles.useAnotherText}>Use another account</Text>
                </View>
              </Pressable>
            ) : (
              <View style={styles.customInputContainer}>
                <Text style={styles.customLabel}>Enter Google Account</Text>
                <TextInput
                  placeholder="e.g. name@gmail.com"
                  placeholderTextColor="#9AA0A6"
                  value={customEmail}
                  onChangeText={setCustomEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  style={styles.inputField}
                  editable={!loadingEmail}
                />
                <TextInput
                  placeholder="Your Full Name (optional)"
                  placeholderTextColor="#9AA0A6"
                  value={customName}
                  onChangeText={setCustomName}
                  style={[styles.inputField, { marginTop: 8 }]}
                  editable={!loadingEmail}
                />
                <View style={styles.customActionRow}>
                  <Pressable
                    onPress={() => { setShowCustomInput(false); setErrorMsg(null); }}
                    style={styles.cancelCustomBtn}
                    disabled={!!loadingEmail}
                  >
                    <Text style={styles.cancelCustomText}>Back</Text>
                  </Pressable>
                  <Pressable
                    onPress={handleCustomSubmit}
                    style={styles.submitCustomBtn}
                    disabled={!!loadingEmail}
                  >
                    {loadingEmail ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text style={styles.submitCustomText}>Next</Text>
                    )}
                  </Pressable>
                </View>
              </View>
            )}
          </ScrollView>

          {/* Privacy Note */}
          <View style={styles.footerNote}>
            <Text style={styles.footerText}>
              To continue, Google will share your name, email address, language preference, and profile picture with ZonoFit.
            </Text>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  backdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  sheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 32,
    maxHeight: "85%",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  googleBrand: {
    flexDirection: "row",
    alignItems: "center",
  },
  gLogo: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    borderWidth: 1.5,
    borderColor: "#EA4335",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  gLetter: {
    fontSize: 16,
    fontWeight: "900",
    color: "#4285F4",
  },
  googleBrandText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#202124",
    letterSpacing: -0.2,
  },
  closeBtn: {
    padding: 4,
  },
  titleBlock: {
    marginBottom: 16,
  },
  headline: {
    fontSize: 22,
    fontWeight: "800",
    color: "#202124",
    letterSpacing: -0.3,
  },
  subheadline: {
    fontSize: 14,
    color: "#5F6368",
    marginTop: 2,
  },
  boldApp: {
    fontWeight: "700",
    color: "#1F7A3E",
  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FCE8E6",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    marginBottom: 12,
    gap: 8,
  },
  errorText: {
    color: "#D93025",
    fontSize: 12,
    fontWeight: "600",
    flex: 1,
  },
  accountRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F3F4",
  },
  accountRowPressed: {
    backgroundColor: "#F8F9FA",
  },
  accountRowActive: {
    backgroundColor: "#E8F0FE",
  },
  avatarCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  avatarInitial: {
    fontSize: 17,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  accountInfo: {
    flex: 1,
  },
  accountName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#202124",
  },
  accountEmail: {
    fontSize: 12,
    color: "#5F6368",
    marginTop: 1,
  },
  addIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#E8F0FE",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  useAnotherText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1A73E8",
  },
  customInputContainer: {
    backgroundColor: "#F8F9FA",
    borderRadius: 16,
    padding: 14,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: "#E8EAED",
  },
  customLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#3C4043",
    marginBottom: 8,
  },
  inputField: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#DADCE0",
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
    fontSize: 14,
    color: "#202124",
  },
  customActionRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 12,
    gap: 10,
  },
  cancelCustomBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  cancelCustomText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#5F6368",
  },
  submitCustomBtn: {
    backgroundColor: "#1A73E8",
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 8,
  },
  submitCustomText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  footerNote: {
    marginTop: 18,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F1F3F4",
  },
  footerText: {
    fontSize: 11,
    color: "#70757A",
    lineHeight: 16,
  },
});
