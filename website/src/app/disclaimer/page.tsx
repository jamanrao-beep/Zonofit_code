import React from "react";
import Link from "next/link";
import { ArrowLeft, AlertCircle, Mail, MapPin } from "lucide-react";

export const metadata = {
  title: "Disclaimer | ZonoFit",
  description: "Official Disclaimer of ZonoFit operated by FLEX LIFESTYLE VENTURES.",
};

export default function DisclaimerPage() {
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
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-xs font-semibold mb-4">
              <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
              Official Legal Notice
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-950 tracking-tight">
              ZONOFIT DISCLAIMER
            </h1>
            <div className="mt-4 flex flex-wrap gap-4 text-xs sm:text-sm text-slate-500 font-medium">
              <div><strong className="text-slate-700">Effective Date:</strong> 8 October 2026</div>
              <div>•</div>
              <div><strong className="text-slate-700">Last Updated:</strong> 8 October 2026</div>
            </div>
            <p className="mt-4 text-sm text-slate-600 leading-relaxed">
              ZonoFit is operated by <strong>FLEX LIFESTYLE VENTURES</strong>, Shastri Colony, Partapur, Banswara, Rajasthan, India.
            </p>
          </div>

          <div className="prose prose-slate max-w-none text-slate-700 text-sm sm:text-base leading-relaxed space-y-6">
            <section className="space-y-2">
              <h2 className="text-lg font-bold text-slate-950">1. General Information</h2>
              <p>ZonoFit provides access to fitness-related services, participating gyms, products and information. Information provided through ZonoFit is for general informational and service purposes and should not be treated as professional medical advice.</p>
            </section>

            <section className="space-y-2">
              <h2 className="text-lg font-bold text-slate-950">2. Exercise Risk</h2>
              <p>Physical exercise involves inherent risks. Before starting or changing an exercise programme, users should consider their individual circumstances and seek appropriate professional medical advice where necessary. You are responsible for exercising within your own abilities and following appropriate safety instructions.</p>
            </section>

            <section className="space-y-2">
              <h2 className="text-lg font-bold text-slate-950">3. No Guaranteed Fitness Results</h2>
              <p>ZonoFit does not guarantee weight loss, muscle gain, strength improvement, fat loss, body-composition changes, athletic performance, or any specific fitness result. Results depend on individual factors including exercise, nutrition, recovery, consistency and other circumstances.</p>
            </section>

            <section className="space-y-2">
              <h2 className="text-lg font-bold text-slate-950">4. Third-Party Gyms</h2>
              <p>Participating gyms are independent businesses unless expressly stated otherwise. Gyms are responsible for their premises, equipment, trainers, employees, operating conditions, safety procedures, gym rules, licenses, and regulatory requirements applicable to their operations.</p>
            </section>

            <section className="space-y-2">
              <h2 className="text-lg font-bold text-slate-950">5. Equipment and Training</h2>
              <p>Users must follow gym instructions and use equipment responsibly. ZonoFit does not guarantee that every gym, machine, trainer or fitness facility will be suitable for every user.</p>
            </section>

            <section className="space-y-2">
              <h2 className="text-lg font-bold text-slate-950">6. Injuries and Emergencies</h2>
              <p>If you experience an injury, illness or emergency while exercising, seek appropriate medical or emergency assistance. ZonoFit does not replace emergency services, medical professionals, physiotherapists or qualified healthcare providers.</p>
            </section>

            <section className="space-y-2">
              <h2 className="text-lg font-bold text-slate-950">7. Products and Supplements</h2>
              <p>Product information displayed through the marketplace may originate from manufacturers, sellers or suppliers. Users should review product labels, ingredients, warnings, directions and other information before purchasing or using a product. ZonoFit does not provide medical advice or guarantee health outcomes from any product.</p>
            </section>

            <section className="space-y-2">
              <h2 className="text-lg font-bold text-slate-950">8. Third-Party Sellers &amp; 9. Availability</h2>
              <p>Where products are sold by third-party sellers, those sellers remain responsible for manufacturing, quality, warranties, and legal compliance. Gym availability, opening hours, classes, trainers, and equipment may change from time to time.</p>
            </section>

            <section className="space-y-2">
              <h2 className="text-lg font-bold text-slate-950">10. Information Accuracy &amp; 11. No Professional Relationship</h2>
              <p>ZonoFit aims to keep information accurate but may rely on third-party submissions. Use of ZonoFit does not create a doctor-patient, physiotherapist-patient, or other healthcare provider relationship.</p>
            </section>

            <section className="space-y-2">
              <h2 className="text-lg font-bold text-slate-950">12. Third-Party Links &amp; 13. Limitation</h2>
              <p>ZonoFit is primarily responsible for services under its direct control, while independent partner gyms and marketplace sellers remain responsible for matters under their own management and premises.</p>
            </section>

            {/* Contact section */}
            <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200 mt-10">
              <h2 className="text-lg font-bold text-slate-950 mb-3">
                14. Contact
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
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
