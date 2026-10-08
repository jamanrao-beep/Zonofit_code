import React from "react";
import Link from "next/link";
import { ArrowLeft, RefreshCw, Mail, MapPin } from "lucide-react";

export const metadata = {
  title: "Refund & Cancellation Policy | ZonoFit",
  description: "Official Refund & Cancellation Policy of ZonoFit operated by FLEX LIFESTYLE VENTURES.",
};

export default function RefundPolicyPage() {
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
              <RefreshCw className="w-3.5 h-3.5" />
              Official Legal Document
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-950 tracking-tight">
              ZONOFIT REFUND &amp; CANCELLATION POLICY
            </h1>
            <div className="mt-4 flex flex-wrap gap-4 text-xs sm:text-sm text-slate-500 font-medium">
              <div><strong className="text-slate-700">Effective Date:</strong> 8 October 2026</div>
              <div>•</div>
              <div><strong className="text-slate-700">Last Updated:</strong> 8 October 2026</div>
            </div>
            <p className="mt-4 text-sm text-slate-600 leading-relaxed">
              This Refund &amp; Cancellation Policy applies to purchases and bookings made through ZonoFit, operated by <strong>FLEX LIFESTYLE VENTURES</strong>, Banswara, Rajasthan, India.
            </p>
          </div>

          <div className="prose prose-slate max-w-none text-slate-700 text-sm sm:text-base leading-relaxed space-y-6">
            <section className="space-y-2">
              <h2 className="text-lg font-bold text-slate-950">1. Monthly Plan</h2>
              <p>ZonoFit monthly plans provide access to the benefits, minimum monthly gym access and wallet credits shown at purchase. Once active, monthly plans are generally non-refundable except where provided at checkout, where ZonoFit is unable to provide service, where verified technical errors occurred, or as required by law. Unused minimum monthly visits do not automatically become cash refunds.</p>
            </section>

            <section className="space-y-2">
              <h2 className="text-lg font-bold text-slate-950">2. Monthly Renewal</h2>
              <p>If automatic renewal is enabled, you may cancel future renewal anytime through the app. Cancelling future renewal stops upcoming charges but does not automatically refund the current active period.</p>
            </section>

            <section className="space-y-2">
              <h2 className="text-lg font-bold text-slate-950">3. Gym Booking Cancellation Rules</h2>
              <p>When you book a gym visit, the applicable credits are deducted. Cancellations are processed as follows:</p>
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2 text-sm">
                <p><strong>• More than 6 hours before booking:</strong> You receive <strong>80% of the booking credit value back</strong>.</p>
                <p><strong>• Within 6 hours of booking:</strong> Non-refundable (0% credit refund).</p>
                <p><strong>• No-show:</strong> If you do not attend a confirmed booking, the booking credits may be forfeited.</p>
              </div>
            </section>

            <section className="space-y-2">
              <h2 className="text-lg font-bold text-slate-950">4. Gym Refuses Valid Booking &amp; 5. Gym Closure</h2>
              <p>If an eligible user with a valid booking is wrongly refused entry by a gym, contact ZonoFit Support promptly. Verified refusals will be refunded/restored. If a participating gym closes or becomes unavailable, ZonoFit will cancel affected bookings and restore credits or provide alternative participating gym options.</p>
            </section>

            <section className="space-y-2">
              <h2 className="text-lg font-bold text-slate-950">6. Technical Errors &amp; 7. Duplicate Payments</h2>
              <p>If payments succeed without credits being added, or duplicate deductions occur due to a payment glitch, ZonoFit investigates transaction records and corrects verified technical errors or provides duplicate payment refunds.</p>
            </section>

            <section className="space-y-2">
              <h2 className="text-lg font-bold text-slate-950">8. Credits</h2>
              <p>Credits represent fitness access value (1 Credit = ₹10 gym value) and are not bank deposits or cash. Credits expire according to applicable plan rules and unused credits do not qualify for cash redemption.</p>
            </section>

            <section className="space-y-2">
              <h2 className="text-lg font-bold text-slate-950">9. Marketplace Purchases &amp; 10. Non-Returnable Products</h2>
              <p>Marketplace returns depend on product condition and seller policies. Products damaged in transit, defective, or materially different will receive remedies under consumer protection laws. Consumable items, opened hygiene products, and unsealed supplements cannot normally be returned once opened.</p>
            </section>

            <section className="space-y-2">
              <h2 className="text-lg font-bold text-slate-950">11. Supplements and Consumables</h2>
              <p>Users must verify product return terms before unsealing. Opened supplements cannot be refunded unless proven defective or unlawfully supplied.</p>
            </section>

            <section className="space-y-2">
              <h2 className="text-lg font-bold text-slate-950">12. Fraud, Abuse &amp; 13. Chargebacks</h2>
              <p>Refunds may be withheld if there is reasonable evidence of fraud, manipulated bookings, multiple account misuse, or payment abuse. Legitimate transaction records will be provided to payment gateways in case of chargeback disputes.</p>
            </section>

            <section className="space-y-2">
              <h2 className="text-lg font-bold text-slate-950">14. Refund Method &amp; 15. Taxes</h2>
              <p>Approved monetary refunds are processed back to the original payment method (bank account / UPI / card). Processing timelines depend on the banking network. Applicable taxes are handled per statutory requirements.</p>
            </section>

            {/* Grievance & Contact section */}
            <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200 mt-10">
              <h2 className="text-lg font-bold text-slate-950 mb-3">
                16. How to Request Support &amp; Grievance
              </h2>
              <p className="text-sm text-slate-600 mb-3">
                To request support or report a cancellation/refund issue, email us with your registered mobile/email and booking details:
              </p>
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
                ZonoFit resolves consumer refund complaints and disputes strictly in accordance with applicable Indian consumer protection laws.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
