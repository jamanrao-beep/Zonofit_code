"use client";

import { useEffect, useState } from "react";
import { 
  ArrowUpRight, 
  CheckCircle2, 
  Clock, 
  QrCode, 
  Building2, 
  Copy, 
  Check, 
  X, 
  CreditCard,
  Phone,
  User,
  ShieldCheck,
  Calendar,
  AlertCircle
} from "lucide-react";

export default function AdminFinancePage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [selectedPayout, setSelectedPayout] = useState<any | null>(null);
  const [referenceNote, setReferenceNote] = useState("");
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [filterTab, setFilterTab] = useState<"ALL" | "UPFRONT" | "EXTRA" | "PENDING" | "PAID">("ALL");

  const fetchFinance = async () => {
    try {
      const token = localStorage.getItem("zonofit_portal_token");
      const res = await fetch("/api/admin/finance", {
        headers: { Authorization: `Bearer ${token}` }
      });
      const json = await res.json();
      setData(json);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFinance();
  }, []);

  const copyToClipboard = (text: string, fieldId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldId);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const processSinglePayout = async (payoutId: string, gymName: string, amountINR: number, note?: string) => {
    setProcessingId(payoutId);
    try {
      const token = localStorage.getItem("zonofit_portal_token");
      const res = await fetch("/api/admin/payouts/process", {
        method: "POST",
        headers: { 
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ 
          payoutId,
          referenceNote: note || referenceNote || undefined 
        })
      });
      const result = await res.json();
      alert(`Payout of ₹${amountINR.toLocaleString()} for ${gymName} marked as PAID successfully!`);
      setSelectedPayout(null);
      setReferenceNote("");
      fetchFinance();
    } catch (err) {
      console.error(err);
      alert("Failed to process payout");
    } finally {
      setProcessingId(null);
    }
  };

  const processAllPayouts = async () => {
    if (!confirm("Are you sure you want to mark ALL pending payouts as Paid?")) return;
    setProcessing(true);
    try {
      const token = localStorage.getItem("zonofit_portal_token");
      const res = await fetch("/api/admin/payouts/process", {
        method: "POST",
        headers: { 
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({})
      });
      const result = await res.json();
      alert(`Marked ${result.count} payout(s) as PAID.`);
      fetchFinance();
    } catch (err) {
      console.error(err);
      alert("Failed to process payouts");
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-gray-500 font-medium">Loading Financial Data...</div>;
  }

  const allPayouts = data?.recentPayouts || [];
  const advanceTracking = data?.gymAdvanceTracking || [];
  const totalAdvanceVisits = advanceTracking.reduce((sum: number, g: any) => sum + (g.advanceVisitsRemaining || 0), 0);
  const totalAdvanceValueINR = advanceTracking.reduce((sum: number, g: any) => sum + (g.advanceFundsBalanceINR || 0), 0);

  const pendingCount = allPayouts.filter((p: any) => p.status === "PENDING").length;
  const upfrontCount = allPayouts.filter((p: any) => p.payoutType === "UPFRONT_10_VISITS").length;
  const extraCount = allPayouts.filter((p: any) => p.payoutType === "EXTRA_VISITS").length;

  const filteredPayouts = allPayouts.filter((p: any) => {
    if (filterTab === "UPFRONT") return p.payoutType === "UPFRONT_10_VISITS";
    if (filterTab === "EXTRA") return p.payoutType === "EXTRA_VISITS";
    if (filterTab === "PENDING") return p.status === "PENDING";
    if (filterTab === "PAID") return p.status === "PAID";
    return true;
  });

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-black mb-2">Financial Center</h1>
        <p className="text-gray-600">Track GMV, revenue, upfront 10-visit settlements (48-72h window), gym advance balances, and extra visits payout workflow.</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col">
          <div className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-2">Total GMV</div>
          <div className="text-3xl font-black text-black">₹{data?.gmv?.toLocaleString() || 0}</div>
          <div className="text-emerald-500 text-sm font-bold flex items-center gap-1 mt-auto pt-4">
            <ArrowUpRight size={16} /> Member Purchases
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col">
          <div className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-2">Net Platform Margin</div>
          <div className={`text-3xl font-black ${(data?.netRevenue || 0) < 0 ? "text-amber-600" : "text-black"}`}>
            ₹{data?.netRevenue?.toLocaleString() || 0}
          </div>
          <div className="text-emerald-500 text-sm font-bold flex items-center gap-1 mt-auto pt-4">
            <ArrowUpRight size={16} /> Retained Revenue
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col">
          <div className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-2">Total Paid to Gyms</div>
          <div className="text-3xl font-black text-emerald-700">₹{data?.totalPaid?.toLocaleString() || 0}</div>
          <div className="text-gray-400 text-xs font-medium mt-auto pt-4">
            Completed Settlements
          </div>
        </div>

        <div className="bg-orange-50 p-6 rounded-3xl border border-orange-100 shadow-sm flex flex-col">
          <div className="text-sm font-bold text-orange-800 uppercase tracking-wider mb-2 flex items-center justify-between">
            <span>Pending Payouts</span>
            <span className="text-xs px-2 py-0.5 bg-orange-200 text-orange-900 rounded-full font-bold">
              {pendingCount} pending
            </span>
          </div>
          <div className="text-3xl font-black text-orange-600">₹{data?.totalPending?.toLocaleString() || 0}</div>
          <button 
            onClick={processAllPayouts}
            disabled={processing || (data?.totalPending || 0) === 0}
            className="mt-4 bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-xl text-sm font-bold transition-colors w-full disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {processing ? "Processing..." : (data?.totalPending || 0) > 0 ? "Mark All As Paid" : "No Pending Payouts"}
          </button>
        </div>
      </div>

      {/* Partner Gym Upfront Advance & Utilization Table (Audio Note 2 Requirement) */}
      <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-xl font-bold text-black">Partner Gym Upfront Advance &amp; Visit Utilization</h2>
              <span className="text-xs px-2.5 py-0.5 bg-blue-100 text-blue-800 rounded-full font-bold">
                10 Visits Upfront / Member
              </span>
            </div>
            <p className="text-xs text-gray-500">
              When a member purchases a plan, ZonoFit pays the partner gym upfront for 10 visits within 48–72 hours.
              This table tracks advance visits held by each gym vs visits completed by members (e.g. 5 members = 50 visits paid; 7 done = 43 advance visits due).
            </p>
          </div>
          <div className="flex items-center gap-3 bg-blue-50 px-4 py-2 rounded-2xl border border-blue-100">
            <div>
              <div className="text-[10px] uppercase font-bold text-blue-700 tracking-wider">Total Active Advance</div>
              <div className="text-base font-black text-blue-900">{totalAdvanceVisits} Visits Due (₹{totalAdvanceValueINR.toLocaleString()})</div>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-100 text-xs text-gray-400 uppercase tracking-wider">
                <th className="pb-3 font-bold">Partner Gym</th>
                <th className="pb-3 font-bold">Active Members</th>
                <th className="pb-3 font-bold">Upfront Paid</th>
                <th className="pb-3 font-bold">Member Visits Done</th>
                <th className="pb-3 font-bold">Advance Holding (Due)</th>
                <th className="pb-3 font-bold">Holding Value</th>
                <th className="pb-3 font-bold text-right">Payment Credentials</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 text-sm">
              {advanceTracking.length > 0 ? (
                advanceTracking.map((g: any) => (
                  <tr key={g.gymId} className="hover:bg-gray-50/70 transition-colors">
                    <td className="py-3.5 font-bold text-black">
                      <div className="flex items-center gap-2">
                        <Building2 size={16} className="text-gray-400" />
                        <div>
                          <div>{g.gymName}</div>
                          <div className="text-[11px] font-normal text-gray-500">
                            {g.city}, {g.state} {g.customGymId ? `• ID: ${g.customGymId}` : ""}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 font-bold text-gray-800">
                      <span className="px-2.5 py-1 bg-gray-100 text-gray-800 rounded-lg text-xs font-bold">
                        {g.activeMembers} {g.activeMembers === 1 ? "Member" : "Members"}
                      </span>
                    </td>
                    <td className="py-3.5 font-bold text-blue-700">
                      {g.upfrontVisitsPaid} Visits
                      <div className="text-[11px] font-normal text-gray-500">Auto-paid 10/user</div>
                    </td>
                    <td className="py-3.5 font-bold text-emerald-700">
                      {g.visitsUtilized} Visits
                      <div className="text-[11px] font-normal text-gray-500">Completed check-ins</div>
                    </td>
                    <td className="py-3.5">
                      <span className="px-2.5 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded-lg text-xs font-bold">
                        {g.advanceVisitsRemaining} Visits Active
                      </span>
                    </td>
                    <td className="py-3.5 font-black text-black">
                      ₹{g.advanceFundsBalanceINR.toLocaleString()}
                      <div className="text-[10px] font-normal text-gray-400">@ ₹{g.perVisitRateINR}/visit</div>
                    </td>
                    <td className="py-3.5 text-right">
                      <button
                        onClick={() => {
                          setSelectedPayout({
                            id: `adv_${g.gymId}`,
                            gym: g,
                            payoutType: "UPFRONT_10_VISITS",
                            visitCount: g.upfrontVisitsPaid,
                            amountPaise: g.advanceFundsBalanceINR * 100,
                            status: "PAID",
                            referenceNote: `Active advance for ${g.activeMembers} members`,
                          });
                        }}
                        className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1.5"
                      >
                        <QrCode size={13} /> View QR / Bank
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-6 text-center text-gray-400 text-xs">
                    No active gym memberships currently in progress.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Payout History & Workflow Table */}
      <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h2 className="text-xl font-bold text-black">Gym Payout Settlements</h2>
            <p className="text-xs text-gray-500 mt-1">
              Tap any gym row to open its bank details, UPI ID, or scan its QR code to execute transfer directly.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-1.5 bg-gray-100 p-1 rounded-2xl">
            <button
              onClick={() => setFilterTab("ALL")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                filterTab === "ALL" ? "bg-white text-black shadow-xs" : "text-gray-600 hover:text-black"
              }`}
            >
              All ({allPayouts.length})
            </button>
            <button
              onClick={() => setFilterTab("UPFRONT")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                filterTab === "UPFRONT" ? "bg-blue-600 text-white shadow-xs" : "text-gray-600 hover:text-black"
              }`}
            >
              Upfront 10-Visits (48–72h) ({upfrontCount})
            </button>
            <button
              onClick={() => setFilterTab("EXTRA")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                filterTab === "EXTRA" ? "bg-purple-600 text-white shadow-xs" : "text-gray-600 hover:text-black"
              }`}
            >
              Monthly Extra (1st–7th) ({extraCount})
            </button>
            <button
              onClick={() => setFilterTab("PENDING")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                filterTab === "PENDING" ? "bg-orange-500 text-white shadow-xs" : "text-gray-600 hover:text-black"
              }`}
            >
              Pending ({pendingCount})
            </button>
            <button
              onClick={() => setFilterTab("PAID")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                filterTab === "PAID" ? "bg-emerald-600 text-white shadow-xs" : "text-gray-600 hover:text-black"
              }`}
            >
              Paid ({allPayouts.length - pendingCount})
            </button>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-100 text-sm text-gray-500 uppercase tracking-wider">
                <th className="pb-4 font-bold">Partner Gym</th>
                <th className="pb-4 font-bold">Payout Type / Visits</th>
                <th className="pb-4 font-bold">Amount</th>
                <th className="pb-4 font-bold">Status</th>
                <th className="pb-4 font-bold">Window / Paid Date</th>
                <th className="pb-4 font-bold text-right">Payment Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredPayouts.length > 0 ? filteredPayouts.map((payout: any) => {
                const amountINR = (payout.amountPaise || 0) / 100;
                const isPending = payout.status === "PENDING";
                const isItemProcessing = processingId === payout.id;
                const isUpfront = payout.payoutType === "UPFRONT_10_VISITS";
                const visitCount = payout.visitCount || (isUpfront ? 10 : 1);

                return (
                  <tr 
                    key={payout.id} 
                    onClick={() => {
                      setSelectedPayout(payout);
                      setReferenceNote(payout.referenceNote || "");
                    }}
                    className="hover:bg-gray-50 transition-colors cursor-pointer group"
                  >
                    <td className="py-4 font-bold text-black">
                      <div className="flex items-center gap-2">
                        <Building2 size={16} className="text-gray-400 group-hover:text-black" />
                        <div>
                          <div>{payout.gym?.name || "Partner Gym"}</div>
                          <div className="text-[11px] font-normal text-gray-500">
                            {payout.gym?.city || "Udaipur"}, {payout.gym?.state || "Rajasthan"}
                            {payout.gym?.customGymId ? ` • ID: ${payout.gym.customGymId}` : ""}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-4">
                      {isUpfront ? (
                        <div>
                          <span className="px-2.5 py-0.5 bg-blue-50 text-blue-800 rounded-lg text-xs font-bold border border-blue-200">
                            Upfront (10 Visits)
                          </span>
                          <div className="text-[11px] text-gray-500 mt-1 font-medium">
                            {isPending ? "48–72h Initial Window" : "10 Visits Paid to Gym ✓"}
                          </div>
                        </div>
                      ) : (
                        <div>
                          <span className="px-2.5 py-0.5 bg-purple-50 text-purple-800 rounded-lg text-xs font-bold border border-purple-200">
                            Extra Visits ({visitCount} Visits)
                          </span>
                          <div className="text-[11px] text-gray-500 mt-1 font-medium">
                            11th+ / Credit Visits
                          </div>
                        </div>
                      )}
                    </td>
                    <td className="py-4 font-black text-black text-base">₹{amountINR.toLocaleString()}</td>
                    <td className="py-4">
                      {isPending ? (
                        <span className="px-3 py-1 bg-orange-50 text-orange-700 rounded-lg text-xs font-bold flex items-center gap-1 w-fit border border-orange-200">
                          <Clock size={12} /> PENDING
                        </span>
                      ) : (
                        <span className="px-3 py-1 bg-emerald-50 text-emerald-700 rounded-lg text-xs font-bold flex items-center gap-1 w-fit border border-emerald-200">
                          <CheckCircle2 size={12} /> PAID
                        </span>
                      )}
                    </td>
                    <td className="py-4 text-xs text-gray-500">
                      {payout.payoutDate ? (
                        <div>
                          <div className="font-semibold text-gray-800">{new Date(payout.payoutDate).toLocaleDateString()}</div>
                          {payout.referenceNote && (
                            <div className="text-[11px] text-gray-500 truncate max-w-[140px]">Ref: {payout.referenceNote}</div>
                          )}
                        </div>
                      ) : (
                        <div>
                          <div className="text-orange-700 font-bold">Within 72 Hours</div>
                          <div className="text-[10px] text-gray-400">Created: {new Date(payout.createdAt).toLocaleDateString()}</div>
                        </div>
                      )}
                    </td>
                    <td className="py-4 text-right">
                      {isPending ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedPayout(payout);
                            setReferenceNote(payout.referenceNote || "");
                          }}
                          disabled={isItemProcessing || processing}
                          className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm disabled:opacity-50 inline-flex items-center gap-1.5 cursor-pointer"
                        >
                          <QrCode size={13} /> View & Pay
                        </button>
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedPayout(payout);
                            setReferenceNote(payout.referenceNote || "");
                          }}
                          className="px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1"
                        >
                          View Details
                        </button>
                      )}
                    </td>
                  </tr>
                );
              }) : (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-gray-500 font-medium">No payouts found for this view.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Payout Details & QR Code Payment Modal */}
      {selectedPayout && (() => {
        const amountINR = (selectedPayout.amountPaise || 0) / 100;
        const isPending = selectedPayout.status === "PENDING";
        const isUpfront = selectedPayout.payoutType === "UPFRONT_10_VISITS";
        const visitCount = selectedPayout.visitCount || (isUpfront ? 10 : 1);
        const gym = selectedPayout.gym || {};
        
        let bank: any = {};
        try {
          if (gym.bankDetailsJson) {
            bank = typeof gym.bankDetailsJson === "string" ? JSON.parse(gym.bankDetailsJson) : gym.bankDetailsJson;
          }
        } catch {
          bank = {};
        }

        const upiId = bank.upiId || "zonofit.partner@upi";
        const upiUrl = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(gym.name || "Gym")}&am=${amountINR}&cu=INR&tn=${encodeURIComponent(`ZonoFit ${isUpfront ? "10-Visit" : "Extra"} Payout`)}`;
        const qrImgUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(upiUrl)}`;

        return (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-xl w-full shadow-2xl relative my-8 max-h-[90vh] overflow-y-auto">
              <button
                onClick={() => setSelectedPayout(null)}
                className="absolute top-6 right-6 p-2 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>

              <div className="flex items-center gap-2 mb-1">
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                  isPending ? "bg-orange-100 text-orange-800" : "bg-emerald-100 text-emerald-800"
                }`}>
                  {isPending ? "AWAITING SETTLEMENT (48-72h)" : "PAID & SETTLED ✓"}
                </span>
                <span className="text-xs text-gray-400 font-medium">
                  {isUpfront ? "Upfront 10-Day / 10-Visit Payout" : `Extra Visits (${visitCount} Visits)`}
                </span>
              </div>

              <h2 className="text-2xl font-black text-black">{gym.name || "Partner Gym"}</h2>
              <p className="text-xs text-gray-500 mb-6">
                {gym.city || "Udaipur"}, {gym.state || "Rajasthan"} {gym.customGymId ? `• ID: ${gym.customGymId}` : ""}
              </p>

              {/* Amount Highlight */}
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 mb-6 flex items-center justify-between">
                <div>
                  <div className="text-xs text-emerald-800 font-bold uppercase tracking-wider">Settlement Amount</div>
                  <div className="text-3xl font-black text-emerald-700">₹{amountINR.toLocaleString()}</div>
                  <div className="text-xs text-emerald-600 font-medium mt-0.5">
                    {isUpfront 
                      ? "Lump sum for 10 member visits (Guaranteed upfront payout)" 
                      : `Payout for ${visitCount} extra visits (11th visit onwards)`}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-gray-500 font-medium">Visits Covered</div>
                  <div className="text-2xl font-black text-gray-900">{visitCount} Visits</div>
                </div>
              </div>

              {/* Scannable UPI QR Code Card */}
              <div className="bg-gray-50 border border-gray-200 rounded-2xl p-5 mb-6 text-center">
                <div className="flex items-center justify-center gap-2 mb-2 font-bold text-gray-900 text-sm">
                  <QrCode size={18} className="text-emerald-600" />
                  Scan to Pay Directly from Phone
                </div>
                <p className="text-xs text-gray-500 mb-4">
                  Open Google Pay, PhonePe, Paytm, or any UPI app on your mobile, point camera at this QR code to transfer ₹{amountINR.toLocaleString()}.
                </p>
                <div className="inline-block p-3 bg-white rounded-2xl border border-gray-200 shadow-sm mb-3">
                  <img
                    src={qrImgUrl}
                    alt="Scan UPI QR Code"
                    className="w-44 h-44 object-contain mx-auto rounded-lg"
                  />
                </div>
                
                {/* UPI ID with Copy Button */}
                <div className="flex items-center justify-center gap-2 mt-2">
                  <span className="text-xs text-gray-500 font-medium">UPI ID:</span>
                  <span className="text-xs font-mono font-bold text-gray-900 bg-white px-3 py-1 rounded-lg border border-gray-200">
                    {upiId}
                  </span>
                  <button
                    onClick={() => copyToClipboard(upiId, "upi")}
                    className="p-1.5 bg-white border border-gray-200 rounded-lg text-gray-600 hover:text-black hover:bg-gray-100 transition-colors cursor-pointer"
                    title="Copy UPI ID"
                  >
                    {copiedField === "upi" ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                  </button>
                </div>
              </div>

              {/* Bank Account Details */}
              <div className="bg-gray-50 border border-gray-200 rounded-2xl p-5 mb-6 space-y-3">
                <div className="flex items-center gap-2 font-bold text-gray-900 text-sm border-b border-gray-200 pb-2">
                  <Building2 size={16} className="text-gray-600" />
                  Gym Bank Account Details
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-gray-500 block">Account Holder</span>
                    <span className="font-bold text-gray-900">{bank.accountHolder || gym.ownerName || gym.name || "N/A"}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block">Bank Name</span>
                    <span className="font-bold text-gray-900">{bank.bankName || "Partner Bank"}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block">Account Number</span>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="font-mono font-bold text-gray-900">{bank.accountNumber || "N/A"}</span>
                      {bank.accountNumber && (
                        <button
                          onClick={() => copyToClipboard(bank.accountNumber, "acc")}
                          className="p-1 text-gray-500 hover:text-black cursor-pointer"
                        >
                          {copiedField === "acc" ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                        </button>
                      )}
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-500 block">IFSC Code</span>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="font-mono font-bold text-gray-900">{bank.ifsc || "N/A"}</span>
                      {bank.ifsc && (
                        <button
                          onClick={() => copyToClipboard(bank.ifsc, "ifsc")}
                          className="p-1 text-gray-500 hover:text-black cursor-pointer"
                        >
                          {copiedField === "ifsc" ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {gym.contactPhone && (
                  <div className="pt-2 border-t border-gray-200 flex items-center gap-2 text-xs text-gray-600">
                    <Phone size={13} className="text-gray-400" />
                    <span>Gym Contact: <strong>{gym.contactPhone}</strong></span>
                  </div>
                )}
              </div>

              {/* Action / Mark as Paid Form */}
              {selectedPayout.id.startsWith("adv_") ? (
                <div className="pt-2">
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-900 mb-4">
                    <strong>Active Advance Holding:</strong> This gym holds an active upfront advance balance ({selectedPayout.referenceNote}). Payment credentials above can be used for any settlements.
                  </div>
                  <button
                    onClick={() => setSelectedPayout(null)}
                    className="w-full py-3 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl text-sm font-bold transition-colors cursor-pointer"
                  >
                    Close
                  </button>
                </div>
              ) : isPending ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1.5">
                      Transaction Reference / UTR Number (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. UPI Ref 4123456789 or IMPS UTR"
                      value={referenceNote}
                      onChange={(e) => setReferenceNote(e.target.value)}
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                    />
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setSelectedPayout(null)}
                      className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl text-sm font-bold transition-colors cursor-pointer"
                    >
                      Close
                    </button>
                    <button
                      onClick={() => processSinglePayout(selectedPayout.id, gym.name, amountINR, referenceNote)}
                      disabled={processingId === selectedPayout.id}
                      className="flex-2 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold transition-colors shadow-sm disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
                    >
                      <CheckCircle2 size={16} />
                      {processingId === selectedPayout.id ? "Recording Settlement..." : `Confirm & Mark as Paid (₹${amountINR.toLocaleString()})`}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-center">
                  <div className="flex items-center justify-center gap-2 text-emerald-800 font-bold text-sm mb-1">
                    <CheckCircle2 size={18} className="text-emerald-600" />
                    Settlement Completed & Recorded
                  </div>
                  <p className="text-xs text-emerald-700">
                    Paid on {new Date(selectedPayout.payoutDate || selectedPayout.updatedAt).toLocaleString()}
                    {selectedPayout.referenceNote ? ` • Ref: ${selectedPayout.referenceNote}` : ""}
                  </p>
                  <p className="text-[11px] text-emerald-600 font-medium mt-1">
                    {isUpfront 
                      ? "This gym has been recorded as PAID for the 10 member visits."
                      : `This gym has been recorded as PAID for ${visitCount} extra visits.`}
                  </p>
                  <button
                    onClick={() => setSelectedPayout(null)}
                    className="mt-4 px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold cursor-pointer"
                  >
                    Done
                  </button>
                </div>
              )}
            </div>
          </div>
        );
      })()}
    </div>
  );
}
