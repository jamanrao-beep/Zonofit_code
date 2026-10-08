import React from "react";
import Link from "next/link";
import { ArrowLeft, Handshake, Mail, MapPin, Building2, CheckCircle2 } from "lucide-react";

export const metadata = {
  title: "Gym Partner Agreement | ZonoFit",
  description: "Official Gym Partner Agreement for fitness centers partnering with ZonoFit.",
};

export default function PartnerAgreementPage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      {/* Top Navbar */}
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700 hover:text-slate-950 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>
          <div className="flex items-center gap-3">
            <Link 
              href="/partners/apply" 
              className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-1.5 rounded-lg transition-colors"
            >
              Apply as Partner
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
        <div className="bg-white rounded-3xl p-6 sm:p-12 shadow-sm border border-slate-200">
          <div className="border-b border-slate-100 pb-8 mb-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold mb-4">
              <Handshake className="w-3.5 h-3.5 text-emerald-600" />
              Partnership Contract
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-950 tracking-tight">
              ZONOFIT GYM PARTNER AGREEMENT
            </h1>
            <p className="mt-4 text-sm text-slate-600 leading-relaxed">
              This Gym Partner Agreement (“Agreement”) is between:
            </p>

            {/* Parties Box */}
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-sm">
                <p className="font-bold text-slate-900 text-xs uppercase tracking-wider text-emerald-800 mb-1">Platform Operator</p>
                <p className="font-extrabold text-slate-950 text-base">FLEX LIFESTYLE VENTURES</p>
                <p className="text-xs text-slate-500 mt-1">Operating ZonoFit</p>
                <p className="text-xs text-slate-600 mt-1">Shastri Colony, Partapur, Banswara, Rajasthan, India</p>
                <p className="text-xs text-emerald-700 font-semibold mt-1">zonofitofficial@gmail.com</p>
              </div>

              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-sm">
                <p className="font-bold text-slate-900 text-xs uppercase tracking-wider text-slate-500 mb-1">Partner Gym</p>
                <p className="text-xs text-slate-600">Gym Name: <span className="border-b border-dotted border-slate-400 font-semibold text-slate-900">Partner Gym Center</span></p>
                <p className="text-xs text-slate-600 mt-1">Authorized Person: <span className="border-b border-dotted border-slate-400">Gym Owner / Director</span></p>
                <p className="text-xs text-slate-600 mt-1">Registered Address: <span className="border-b border-dotted border-slate-400">Facility Location</span></p>
                <p className="text-xs text-slate-600 mt-1">Contact / Email: <span className="border-b border-dotted border-slate-400">Verified Contact Info</span></p>
              </div>
            </div>
          </div>

          <div className="prose prose-slate max-w-none text-slate-700 text-sm sm:text-base leading-relaxed space-y-6">
            <section className="space-y-2">
              <h2 className="text-lg font-bold text-slate-950">1. Purpose</h2>
              <p>The Gym agrees to participate as a ZonoFit Partner Gym. ZonoFit may introduce eligible customers to the Gym through its platform, plans and booking system.</p>
            </section>

            <section className="space-y-2">
              <h2 className="text-lg font-bold text-slate-950">2. Eligible ZonoFit Customers</h2>
              <p>ZonoFit may send customers who meet the applicable ZonoFit eligibility criteria. The Gym agrees not to reject a valid ZonoFit customer solely because the customer is using ZonoFit. The Gym may refuse access for legitimate reasons including: safety concerns, misconduct, invalid or cancelled booking, fraud or suspected misuse, or violation of reasonable gym rules.</p>
            </section>

            <section className="space-y-2">
              <h2 className="text-lg font-bold text-slate-950">3. Existing Members</h2>
              <p>The Gym should inform ZonoFit if a customer appears to be an existing active member contrary to the applicable eligibility requirements. The Gym should not independently charge or convert a ZonoFit customer without appropriate communication where the matter concerns ZonoFit access.</p>
            </section>

            <section className="space-y-2">
              <h2 className="text-lg font-bold text-slate-950">4. Booking &amp; 5. Customer Experience</h2>
              <p>ZonoFit customers will normally be required to make a valid booking before visiting. The Gym agrees to honour valid ZonoFit bookings during applicable operating hours and provide ZonoFit users with the same reasonable standard of service, equipment access, and safety applicable to comparable customers.</p>
            </section>

            <section className="space-y-2">
              <h2 className="text-lg font-bold text-slate-950">6. Commercial Terms &amp; 7. Settlement</h2>
              <p>The commercial terms applicable to the Gym will be separately agreed and recorded by ZonoFit. ZonoFit will make settlements according to the agreed commercial arrangement and settlement cycle. ZonoFit may reasonably adjust settlements for verified refunds, duplicate transactions, fraudulent activity, or administrative errors.</p>
            </section>

            <section className="space-y-2">
              <h2 className="text-lg font-bold text-slate-950">8. No Upfront Hardware Requirement</h2>
              <p>Unless separately agreed, the Gym is not required to purchase or install special hardware or proprietary equipment solely to participate in ZonoFit.</p>
            </section>

            <section className="space-y-2">
              <h2 className="text-lg font-bold text-slate-950">9. Gym Operations, Safety &amp; 10. Incidents</h2>
              <p>The Gym remains responsible for premises, equipment, staff, trainers, safety, hygiene, licences, statutory compliances, and insurance applicable to its operations. The Gym should promptly inform ZonoFit about material incidents involving users, including serious injury, fraud, or access disputes.</p>
            </section>

            <section className="space-y-2">
              <h2 className="text-lg font-bold text-slate-950">11. Customer Data &amp; 12. Direct Marketing</h2>
              <p>The Gym will use ZonoFit customer information only for legitimate purposes connected with the service and applicable law, and must not misuse, sell, or unlawfully disclose customer data. The Gym must not represent itself as ZonoFit or falsely suggest ZonoFit endorsement of unrelated offers.</p>
            </section>

            <section className="space-y-2">
              <h2 className="text-lg font-bold text-slate-950">13. Branding &amp; 14. Fraud Prevention</h2>
              <p>The Gym may display approved ZonoFit branding. The Gym must not create fake bookings, manipulate attendance records, or attempt to obtain improper settlement disbursements.</p>
            </section>

            <section className="space-y-2">
              <h2 className="text-lg font-bold text-slate-950">15. Independent Businesses &amp; 16. Confidentiality</h2>
              <p>The Parties are independent commercial businesses. Neither Party is an employee, partner, or franchisee of the other. Commercial terms and proprietary operational data shall remain strictly confidential.</p>
            </section>

            <section className="space-y-2">
              <h2 className="text-lg font-bold text-slate-950">17. Term and Termination &amp; 18. Liability</h2>
              <p>This Agreement begins on the Effective Date and continues until terminated by either Party upon written notice. Each Party remains responsible for matters within its own respective control.</p>
            </section>

            <section className="space-y-2">
              <h2 className="text-lg font-bold text-slate-950">19. Disputes &amp; 20. Entire Agreement</h2>
              <p>The Parties will first attempt to resolve disputes through good-faith discussion, failing which disputes may be referred to competent courts under Indian law. This Agreement represents the understanding between the Parties regarding the ZonoFit partnership.</p>
            </section>

            {/* Signatures block */}
            <div className="mt-10 pt-8 border-t border-slate-200">
              <h3 className="font-bold text-slate-950 text-base mb-4">SIGNATURES &amp; EXECUTION</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 p-6 rounded-2xl border border-slate-200">
                <div>
                  <p className="font-bold text-xs uppercase tracking-wider text-emerald-800 mb-2">For FLEX LIFESTYLE VENTURES / ZonoFit</p>
                  <p className="text-xs text-slate-600">Name: <span className="font-semibold text-slate-900">Authorized Signatory</span></p>
                  <p className="text-xs text-slate-600 mt-1">Designation: <span className="font-semibold text-slate-900">Operations Lead</span></p>
                  <div className="mt-4 border-b border-dashed border-slate-400 w-3/4 pb-1">
                    <span className="text-[11px] font-mono text-emerald-700">[Digitally Authorized]</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">Date: 8 October 2026</p>
                </div>

                <div>
                  <p className="font-bold text-xs uppercase tracking-wider text-slate-700 mb-2">For Gym Partner</p>
                  <p className="text-xs text-slate-600">Name: <span className="text-slate-400">___________________________</span></p>
                  <p className="text-xs text-slate-600 mt-1">Signature: <span className="text-slate-400">______________________</span></p>
                  <div className="mt-4 border-b border-dashed border-slate-400 w-3/4 pb-1">
                    <span className="text-[11px] text-slate-400">Signature / Seal</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">Date: 8 October 2026</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
