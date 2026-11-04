import { Image } from "react-native";

/** ZonoFit mark used on banners, lock cards, and sign-in headers. */
export function ZonoNoticeMark({ size = 40 }: { size?: number }) {
  return (
    <Image
      source={require("@/assets/images/Zonofit_Logo_RemovedBackground.png")}
      style={{ width: size, height: size }}
      resizeMode="contain"
      accessibilityIgnoresInvertColors
    />
  );
}
