import { Alert } from "react-native";
import { ackWork } from "@/lib/tapAck";

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
        ackWork("Opening…", async () => {
          await endGuestSession();
          router.replace("/(auth)/create-account");
        });
      },
    },
  ]);
}
