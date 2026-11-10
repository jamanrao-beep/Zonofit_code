import type { Metadata } from "next";
import LaunchGame from "./LaunchGame";

export const metadata: Metadata = {
  title: "ZonoFit Lucky Challenge",
  description: "Flip the tiles, dodge the bomb, and climb the ZonoFit Lucky Challenge.",
};

export default function LaunchGamePage() {
  return <LaunchGame />;
}
