import type { Metadata } from "next";
import Link from "next/link";
import { Bricolage_Grotesque, DM_Sans, Noto_Sans_Devanagari } from "next/font/google";
import "@/components/partner-portal/partner-portal.css";

const display = Bricolage_Grotesque({ subsets: ["latin"], weight: "700", variable: "--font-bricolage" });
const sans = DM_Sans({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-dm" });
const hindi = Noto_Sans_Devanagari({ subsets: ["devanagari"], weight: ["400", "600", "700"], variable: "--font-noto" });

export const metadata: Metadata = {
  title: "Zonofit Partner Portal",
  robots: { index: false, follow: false },
};

export default function SignupPage() {
  return (
    <div className={`zf-portal ${display.variable} ${sans.variable} ${hindi.variable}`}>
      <section className="s1">
        <div className="orb o1" />
        <div className="orb o2" />
        <div className="orb o3" />
        <div className="grid" />
        <div className="top">
          <Link href="/auth/login" className="brand">
            <span className="logo" aria-hidden="true">
              <svg width="22" height="22" viewBox="0 0 40 40">
                <path d="M11 14h17c2 0 2.5 2.4.6 3H17M11 21h8" stroke="#fff" strokeWidth="3.4" strokeLinecap="round" fill="none" />
                <circle cx="14" cy="28" r="2.6" fill="#fff" />
              </svg>
            </span>
            Zonofit <small>Partner</small>
          </Link>
        </div>
        <div className="wrap">
          <div className="card">
            <h2>Partner access</h2>
            <p className="sub">ZonoFit creates this login and gives the email and password to the gym.</p>
            <p className="sub">Open signup is closed. If you already have that login, sign in and enter the code sent to the inbox.</p>
            <Link href="/auth/login" className="go">
              <span className="tx">Sign in</span>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
