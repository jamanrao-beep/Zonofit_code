import React from "react";
import Link from "next/link";
import { ArrowLeft, Shield, Mail, MapPin } from "lucide-react";

export const metadata = {
  title: "Privacy Policy | ZonoFit",
  description: "Official Privacy Policy of ZonoFit operated by FLEX LIFESTYLE VENTURES.",
};

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      {/* Top Navbar */}
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700 hover:text-slate-950 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-600 flex items-center justify-center text-white font-black text-xs">
              Z
            </div>
            <span className="font-bold text-slate-900">ZonoFit</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
        <div className="bg-white rounded-3xl p-6 sm:p-12 shadow-sm border border-slate-200">
          <div className="border-b border-slate-100 pb-8 mb-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold mb-4">
              <Shield className="w-3.5 h-3.5" />
              Official Legal Document
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-950 tracking-tight">
              ZONOFIT PRIVACY POLICY
            </h1>
            <div className="mt-4 flex flex-wrap gap-4 text-xs sm:text-sm text-slate-500 font-medium">
              <div><strong className="text-slate-700">Effective Date:</strong> 8 October 2026</div>
              <div>•</div>
              <div><strong className="text-slate-700">Last Updated:</strong> 8 October 2026</div>
            </div>
            <p className="mt-4 text-sm text-slate-600 leading-relaxed">
              ZonoFit is operated by <strong>FLEX LIFESTYLE VENTURES</strong>, a sole proprietorship based in Banswara, Rajasthan, India (“ZonoFit”, “we”, “us”, or “our”).
            </p>
          </div>

          <div className="prose prose-slate max-w-none text-slate-700 text-sm sm:text-base leading-relaxed space-y-8">
            <p>
              This Privacy Policy explains how we collect, use, store, share and protect information when you use the ZonoFit mobile application, website, gym-access services, wallet/credit services, marketplace and related services.
            </p>
            <p>
              By using ZonoFit, you acknowledge this Privacy Policy and the processing described in it.
            </p>

            <section className="space-y-4">
              <h2 className="text-xl font-bold text-slate-950 border-b border-slate-100 pb-2">
                1. Information We Collect
              </h2>
              <p>We collect only information reasonably required to provide and improve our services.</p>
              
              <div className="pl-4 space-y-4 border-l-2 border-emerald-500">
                <div>
                  <h3 className="font-bold text-slate-900">A. Account Information</h3>
                  <p className="text-sm">This may include:</p>
                  <ul className="list-disc list-inside text-sm space-y-1 text-slate-600">
                    <li>Name</li>
                    <li>Mobile number</li>
                    <li>Email address</li>
                    <li>Information required to create and maintain your account</li>
                    <li>Profile information you voluntarily provide</li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-bold text-slate-900">B. Location Information</h3>
                  <p className="text-sm">Where required for a specific feature, we may process location information to:</p>
                  <ul className="list-disc list-inside text-sm space-y-1 text-slate-600">
                    <li>Show relevant gyms or services near you</li>
                    <li>Facilitate or validate a gym booking/check-in</li>
                    <li>Prevent misuse, fraud or false activity</li>
                    <li>Improve location-based functionality</li>
                  </ul>
                  <p className="text-xs text-slate-500 mt-1">We do not intend to continuously track your location merely because you use ZonoFit.</p>
                </div>

                <div>
                  <h3 className="font-bold text-slate-900">C. Transaction Information</h3>
                  <p className="text-sm">We may process information relating to plans purchased, credits/wallet balances, bookings, refunds, payments and transaction status, coupons, promotions or referral activity.</p>
                  <p className="text-xs text-slate-500 mt-1">Payment card, UPI or banking credentials may be processed by third-party payment service providers. We do not intend to store complete payment credentials unless expressly required and lawfully permitted.</p>
                </div>

                <div>
                  <h3 className="font-bold text-slate-900">D. Gym and Usage Information</h3>
                  <p className="text-sm">We may collect selected gym, booking information, visit/check-in information, credit usage, membership status relevant to eligibility, and support or dispute records.</p>
                </div>

                <div>
                  <h3 className="font-bold text-slate-900">E. Marketplace Information</h3>
                  <p className="text-sm">If you use our marketplace, we may collect information necessary to process orders, delivery, billing, returns/refunds, seller communication, and customer support.</p>
                </div>

                <div>
                  <h3 className="font-bold text-slate-900">F. Device and Technical Information</h3>
                  <p className="text-sm">We may receive device type, operating system, app version, IP address, crash/error information, and security information.</p>
                </div>
              </div>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-bold text-slate-950 border-b border-slate-100 pb-2">
                2. Why We Use Your Information
              </h2>
              <p>We use your information to create and manage your account, provide ZonoFit plans and wallet/credit services, process gym bookings and payments, determine gym-access eligibility, prevent fraud, provide customer support, communicate service updates, improve services, and comply with legal obligations.</p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-bold text-slate-950 border-b border-slate-100 pb-2">
                3. Location Permissions
              </h2>
              <p>Some ZonoFit features may require location access. You may disable location permission through device settings. We will not request continuous location access where not reasonably necessary.</p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-bold text-slate-950 border-b border-slate-100 pb-2">
                4. Sharing Information
              </h2>
              <p>We may share relevant information with Gym Partners, Payment Providers, Technology and Service Providers, Marketplace Sellers/Fulfilment Partners, Legal/Regulatory Authorities, or Business Transfers as lawfully required. We do not sell your personal information.</p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-bold text-slate-950 border-b border-slate-100 pb-2">
                5. Marketing Communications
              </h2>
              <p>We send transactional communications relating to accounts, bookings, credits and security. You may opt out of promotional communications where permitted by law.</p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-bold text-slate-950 border-b border-slate-100 pb-2">
                6. Data Retention &amp; 7. Security
              </h2>
              <p>We retain information only as long as reasonably necessary for services, accounting, dispute resolution, and legal compliance. We use reasonable technical and organizational security measures to protect your information.</p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-bold text-slate-950 border-b border-slate-100 pb-2">
                8. Your Rights &amp; 9. Account Deletion
              </h2>
              <p>Subject to applicable law, you may request access, correction, deletion of your data, or deletion of your ZonoFit account by contacting our grievance email.</p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-bold text-slate-950 border-b border-slate-100 pb-2">
                10. Children &amp; 11. Third-Party Services
              </h2>
              <p>ZonoFit is not intended for unsupervised children. Third-party partner gyms and external service links operate under their own independent terms and privacy practices.</p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-bold text-slate-950 border-b border-slate-100 pb-2">
                12. Third-Party Gyms &amp; 13. Changes
              </h2>
              <p>When you visit a partner gym, that gym may process visitor records for safety or facility operations. We may update this Privacy Policy from time to time, noting the effective date.</p>
            </section>

            {/* Grievance section */}
            <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200 mt-10">
              <h2 className="text-lg font-bold text-slate-950 mb-3">
                14. Contact and Grievance
              </h2>
              <p className="font-bold text-slate-900">FLEX LIFESTYLE VENTURES</p>
              <div className="flex items-center gap-2 text-sm text-slate-600 mt-2">
                <MapPin className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Shastri Colony, Partapur, Banswara, Rajasthan, India</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-600 mt-2">
                <Mail className="w-4 h-4 text-emerald-600 shrink-0" />
                <a href="mailto:zonofitofficial@gmail.com" className="text-emerald-700 font-semibold hover:underline">
                  zonofitofficial@gmail.com
                </a>
              </div>
              <p className="text-xs text-slate-500 mt-3">
                ZonoFit handles privacy requests and complaints in accordance with applicable Indian laws.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
