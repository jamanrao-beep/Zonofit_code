import { Alert } from "react-native";

type ReplaceRouter = {
  replace: (href: "/(auth)/create-account") => void;
};

/** Guest tapped something that needs a real account. Does not create credits or a booking. */
export function promptGuestAccount(
  router: ReplaceRouter,
  endGuestSession: () => Promise<void>,
  message: string,
) {
  Alert.alert("Account required", message, [
    { text: "Not now", style: "cancel" },
    {
      text: "Create Account",
      onPress: () => {
        void (async () => {
          await endGuestSession();
          router.replace("/(auth)/create-account");
        })();
      },
    },
  ]);
}
