import type { Metadata } from "next";
import LaunchGame from "./LaunchGame";

export const metadata: Metadata = {
  title: "ZonoFit Lucky Challenge",
  description: "Play one Lines and Dots game, then send your level and result to ZonoFit on WhatsApp.",
};

export default function LaunchGamePage() {
  return <LaunchGame />;
}
