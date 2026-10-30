import type { Metadata } from "next";
import { Bricolage_Grotesque, DM_Sans, Noto_Sans_Devanagari } from "next/font/google";
import { PartnerPortal } from "@/components/partner-portal/PartnerPortal";

const display = Bricolage_Grotesque({ subsets: ["latin"], weight: "700", variable: "--font-bricolage" });
const sans = DM_Sans({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-dm" });
const hindi = Noto_Sans_Devanagari({ subsets: ["devanagari"], weight: ["400", "600", "700"], variable: "--font-noto" });

export const metadata: Metadata = {
  title: "Zonofit Partner Portal",
  description: "Sign in to the ZonoFit gym partner dashboard.",
  robots: { index: false, follow: false },
};

export default function LoginPage() {
  return <PartnerPortal fontClass={`${display.variable} ${sans.variable} ${hindi.variable}`} />;
}
