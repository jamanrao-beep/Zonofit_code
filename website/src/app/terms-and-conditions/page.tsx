import React from "react";
import Link from "next/link";
import { ArrowLeft, FileText, Mail, MapPin } from "lucide-react";

export const metadata = {
  title: "Terms & Conditions | ZonoFit",
  description: "Official Terms & Conditions of ZonoFit operated by FLEX LIFESTYLE VENTURES.",
};

export default function TermsAndConditionsPage() {
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
              <FileText className="w-3.5 h-3.5" />
              Official Terms &amp; Conditions
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-950 tracking-tight">
              ZONOFIT TERMS &amp; CONDITIONS
            </h1>
            <div className="mt-4 flex flex-wrap gap-4 text-xs sm:text-sm text-slate-500 font-medium">
              <div><strong className="text-slate-700">Effective Date:</strong> 8 October 2026</div>
              <div>•</div>
              <div><strong className="text-slate-700">Last Updated:</strong> 8 October 2026</div>
            </div>
            <p className="mt-4 text-sm text-slate-600 leading-relaxed">
              These Terms &amp; Conditions (“Terms”) govern your use of ZonoFit, operated by <strong>FLEX LIFESTYLE VENTURES</strong>, a sole proprietorship based in Banswara, Rajasthan, India.
            </p>
          </div>

          <div className="prose prose-slate max-w-none text-slate-700 text-sm sm:text-base leading-relaxed space-y-6">
            <p>
              By creating an account or using ZonoFit, you agree to these Terms.
            </p>

            <section className="space-y-2">
              <h2 className="text-lg font-bold text-slate-950">1. What ZonoFit Is</h2>
              <p>ZonoFit provides a platform through which eligible users can access participating gyms and other services through ZonoFit plans, bookings and credits. ZonoFit does not own or operate participating third-party gyms unless expressly stated. Gyms remain independently responsible for their premises, equipment, trainers, employees, facilities, safety and day-to-day operations.</p>
            </section>

            <section className="space-y-2">
              <h2 className="text-lg font-bold text-slate-950">2. Your ZonoFit Plan</h2>
              <p>A ZonoFit gym plan is purchased for the gym selected by you as your primary gym. Plans operate on a monthly basis and may be renewed according to the applicable plan and payment terms shown at checkout. The exact plan price, included benefits, minimum monthly access requirement and available wallet credits will be shown before purchase.</p>
            </section>

            <section className="space-y-2">
              <h2 className="text-lg font-bold text-slate-950">3. Minimum Monthly Gym Access</h2>
              <p>For the initial four months of a qualifying plan, the applicable minimum monthly gym-access requirement is 10 visits. From the fifth month onward, the applicable minimum monthly gym-access requirement is 15 visits, unless a different requirement is clearly displayed for your plan. The minimum-access component is part of the monthly plan structure. If you do not use all applicable minimum visits during the relevant month, unused minimum visits do not become a cash refund.</p>
            </section>

            <section className="space-y-2">
              <h2 className="text-lg font-bold text-slate-950">4. Wallet and Credits</h2>
              <p>Your plan may provide wallet value in the form of ZonoFit credits after the applicable plan allocation. Unless otherwise stated: <strong>1 ZonoFit credit represents ₹10 of eligible gym-service value</strong>. Credits may be used only for eligible ZonoFit services shown in the app. Credits are not cash, are not bank deposits, cannot be withdrawn for cash, cannot be transferred to another user, and cannot be sold or exchanged outside ZonoFit.</p>
            </section>

            <section className="space-y-2">
              <h2 className="text-lg font-bold text-slate-950">5. Credit Expiry</h2>
              <p>Credits associated with a monthly plan remain available according to the applicable plan period and expire 15 days after the end of the relevant monthly membership period, unless otherwise stated at purchase or required by applicable law. Expired credits cannot ordinarily be restored.</p>
            </section>

            <section className="space-y-2">
              <h2 className="text-lg font-bold text-slate-950">6. Gym Eligibility</h2>
              <p>ZonoFit access at a particular participating gym is generally available to new customers of that gym; customers who previously had a membership but stopped at least one year before; or customers who currently belong to a non-partner gym. An existing active member of a gym may not use ZonoFit to bypass that gym&apos;s normal membership arrangements.</p>
            </section>

            <section className="space-y-2">
              <h2 className="text-lg font-bold text-slate-950">7. Gym Booking &amp; 8. Cancellation Policy</h2>
              <p>A booking is required before visiting a gym. Credits are deducted upon booking.</p>
              <ul className="list-disc list-inside text-sm space-y-1 text-slate-600 pl-2">
                <li><strong>More than 6 hours before:</strong> Cancel and receive 80% credit value refund.</li>
                <li><strong>Within 6 hours:</strong> Non-refundable.</li>
                <li><strong>No-show:</strong> Credits may be forfeited.</li>
              </ul>
            </section>

            <section className="space-y-2">
              <h2 className="text-lg font-bold text-slate-950">9. Technical Problems &amp; 10. Gym Refusal</h2>
              <p>If a genuine technical issue affects a booking, or if an eligible user is wrongly refused access despite a valid booking, ZonoFit investigates and may refund the affected booking.</p>
            </section>

            <section className="space-y-2">
              <h2 className="text-lg font-bold text-slate-950">11. Gym Rules &amp; 12. Additional Visits</h2>
              <p>You must follow the participating gym&apos;s reasonable safety rules, conduct requirements, equipment rules, dress and hygiene standards. Additional visits may be booked using available ZonoFit credits.</p>
            </section>

            <section className="space-y-2">
              <h2 className="text-lg font-bold text-slate-950">13. Payments, Renewal &amp; 14. Marketplace</h2>
              <p>Where recurring monthly renewal is enabled, you authorize charges according to terms. For Marketplace purchases using credits: <strong>10 credits provide ₹80 of marketplace purchase value</strong>.</p>
            </section>

            <section className="space-y-2">
              <h2 className="text-lg font-bold text-slate-950">15. Marketplace Responsibility &amp; 16. Supplements</h2>
              <p>Third-party sellers remain responsible for product quality, warranty, delivery, and returns. ZonoFit does not provide medical or dietary advice through product listings.</p>
            </section>

            <section className="space-y-2">
              <h2 className="text-lg font-bold text-slate-950">17. Fraud, Misuse &amp; 18. Account Responsibility</h2>
              <p>Manipulated bookings, false eligibility, multiple accounts, coupon abuse, or chargeback abuse will result in credit penalties, suspension, or termination.</p>
            </section>

            <section className="space-y-2">
              <h2 className="text-lg font-bold text-slate-950">19. Refunds &amp; 20. Safety and Injuries</h2>
              <p>Refunds are governed by the ZonoFit Refund Policy. Physical exercise involves inherent risks; participating gyms are responsible for equipment and safety.</p>
            </section>

            <section className="space-y-2">
              <h2 className="text-lg font-bold text-slate-950">21. Availability, 22. IP &amp; 23. User Content</h2>
              <p>ZonoFit branding and app content belong to ZonoFit. User reviews must not be defamatory or misleading.</p>
            </section>

            <section className="space-y-2">
              <h2 className="text-lg font-bold text-slate-950">24. Limitation of Liability, 25. Indemnity, 26. Termination</h2>
              <p>ZonoFit&apos;s responsibility is limited to matters within its reasonable control as permitted by law. You may stop using ZonoFit at any time.</p>
            </section>

            <section className="space-y-2">
              <h2 className="text-lg font-bold text-slate-950">27. Changes &amp; 28. Governing Law</h2>
              <p>These Terms are governed by the laws of India, subject to the jurisdiction of competent courts applicable to ZonoFit&apos;s business location.</p>
            </section>

            {/* Grievance section */}
            <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200 mt-10">
              <h2 className="text-lg font-bold text-slate-950 mb-3">
                29. Contact and Grievance
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
                For support, complaints, refunds, or legal notices, contact us at the above address or email.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
