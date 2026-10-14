import React, { useEffect, useState, useMemo } from "react";
import { 
  View, 
  Text, 
  ScrollView, 
  ActivityIndicator, 
  Pressable, 
  TextInput, 
  Linking, 
  LayoutAnimation, 
  Platform, 
  UIManager,
  StatusBar 
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { apiFetch } from "../lib/api";
import { 
  ZONOFIT_PRIVACY_POLICY, 
  ZONOFIT_TERMS_AND_CONDITIONS,
  ZONOFIT_REFUND_POLICY,
  ZONOFIT_DISCLAIMER,
  ZONOFIT_GYM_PARTNER_AGREEMENT,
  ZONOFIT_FAQ
} from "@/constants/legalContent";

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export interface FAQItem {
  id: number;
  category: string;
  question: string;
  answer: string;
}

export const FAQ_CATEGORIES = [
  "All",
  "About ZonoFit",
  "Plans & Gym",
  "Visits & Check-in",
  "Credits & Bookings",
  "Shop & Marketplace",
  "Renewals & Refunds",
  "Support & Rules"
];

export const FAQ_LIST: FAQItem[] = [
  // 1. About ZonoFit
  {
    id: 1,
    category: "About ZonoFit",
    question: "What is ZonoFit?",
    answer: "ZonoFit makes gym access more flexible. Choose your primary gym, follow your monthly plan, and use your remaining credits for eligible gym visits and other available benefits across our fitness network."
  },
  {
    id: 2,
    category: "About ZonoFit",
    question: "How does ZonoFit work?",
    answer: "Choose your primary gym, purchase a one-month plan, complete your included mandatory visits, and use your remaining credits for additional eligible gym bookings and marketplace purchases."
  },
  {
    id: 3,
    category: "About ZonoFit",
    question: "Can I use ZonoFit if I already have a gym membership?",
    answer: "Yes. Existing gym members can also use ZonoFit, subject to the applicable plan eligibility criteria and booking rules."
  },
  {
    id: 4,
    category: "About ZonoFit",
    question: "Is ZonoFit a gym?",
    answer: "No. ZonoFit is a flexible fitness access network connecting members with verified partner gyms and health benefits through its platform."
  },

  // 2. Plans and Primary Gym
  {
    id: 5,
    category: "Plans & Gym",
    question: "What is a Primary Gym?",
    answer: "Your Primary Gym is the partner fitness center you choose as your workout home base for your monthly plan. A fixed portion of your plan value is allocated toward mandatory visits at this gym."
  },
  {
    id: 6,
    category: "Plans & Gym",
    question: "Why isn't my entire membership amount adjustable at the primary gym?",
    answer: "Part of your plan is dedicated to your primary gym visits to build consistent workout habits, while the remaining value is provided as credits for flexible use across other network gyms and shop benefits."
  },
  {
    id: 7,
    category: "Plans & Gym",
    question: "How long is a membership plan valid?",
    answer: "Standard plans are valid for one month (30 days) from the date of activation."
  },
  {
    id: 8,
    category: "Plans & Gym",
    question: "Can I change my primary gym during an active month?",
    answer: "Primary gym commitments cannot be changed mid-cycle during an active 30-day month. You can select a new primary gym upon your next monthly renewal."
  },
  {
    id: 9,
    category: "Plans & Gym",
    question: "What happens if my primary gym is temporarily closed?",
    answer: "If access is unavailable due to circumstances beyond your control (maintenance, renovations), please contact ZonoFit support immediately for eligible resolution or temporary network access."
  },

  // 3. Mandatory Visits and Check-ins
  {
    id: 10,
    category: "Visits & Check-in",
    question: "What are mandatory visits?",
    answer: "Mandatory visits are the primary gym visits included with your monthly membership (10 visits per month in Foundation Phase, 15 visits per month in Progression Phase)."
  },
  {
    id: 11,
    category: "Visits & Check-in",
    question: "Why do I need to complete mandatory visits first?",
    answer: "Mandatory visits help build a consistent workout habit and discipline at your primary gym before you unlock broader flexible visits across the network."
  },
  {
    id: 12,
    category: "Visits & Check-in",
    question: "How do I check in at the gym?",
    answer: "Check-ins are completed easily using the ZonoFit app through your digital pass QR scan or one-time verification code shown at the gym front desk."
  },
  {
    id: 13,
    category: "Visits & Check-in",
    question: "Can someone else use my check-in or visit?",
    answer: "No. Plans and check-in passes are personal and non-transferable. Only the registered account holder is permitted to check in."
  },
  {
    id: 14,
    category: "Visits & Check-in",
    question: "What if I forget to check in?",
    answer: "A visit is only valid and counted if recorded through the app during check-in. Always remember to check in upon arrival."
  },

  // 4. Credits and Bookings
  {
    id: 15,
    category: "Credits & Bookings",
    question: "What are credits?",
    answer: "Credits are the flexible fitness currency you receive with your plan to book eligible network gym visits, classes, or access marketplace items."
  },
  {
    id: 16,
    category: "Credits & Bookings",
    question: "What is the value of 1 credit?",
    answer: "For eligible gym bookings, 1 Credit = ₹10 in platform value. For products or non-gym services, 1 Credit converts to ₹8 in INR value."
  },
  {
    id: 17,
    category: "Credits & Bookings",
    question: "Can I book visits at other partner gyms?",
    answer: "Yes! After completing your included mandatory visits, you can use your remaining credits to book workouts at any other verified partner gym in the network."
  },
  {
    id: 18,
    category: "Credits & Bookings",
    question: "Can I buy additional credits?",
    answer: "Yes, you can top up additional credits anytime directly from the Credits & Wallet tab while your membership is active."
  },
  {
    id: 19,
    category: "Credits & Bookings",
    question: "Do credits expire?",
    answer: "Credits remain active for the duration of your membership cycle. If not renewed, unused credits convert to spendable INR cash valid for an additional 15 days, after which unspent balances expire to ₹0."
  },
  {
    id: 20,
    category: "Credits & Bookings",
    question: "Can I cancel a gym booking?",
    answer: "Yes, bookings can be cancelled before the session time slot. A flat 2 Credits cancellation fee applies, and your visit or credits are restored."
  },
  {
    id: 21,
    category: "Credits & Bookings",
    question: "What happens if I miss a booked workout?",
    answer: "Missed bookings without prior cancellation are forfeited to respect gym capacity commitments."
  },

  // 5. Marketplace and Non-Gym Usage
  {
    id: 22,
    category: "Shop & Marketplace",
    question: "Can I use credits to buy supplements & gear?",
    answer: "Yes! You can apply your available credits or converted wallet balances toward genuine supplements, apparel, and fitness gear in the ZonoFit shop."
  },
  {
    id: 23,
    category: "Shop & Marketplace",
    question: "What is the credit value for products?",
    answer: "For non-gym product purchases, credits are converted at the transparent rate of 1 Credit = ₹8 at checkout."
  },
  {
    id: 24,
    category: "Shop & Marketplace",
    question: "Where are marketplace orders delivered?",
    answer: "Orders are shipped directly to your provided delivery address. You can manage saved addresses in the checkout flow."
  },
  {
    id: 25,
    category: "Shop & Marketplace",
    question: "Can I return a marketplace order?",
    answer: "Returns are subject to the applicable brand return policy shown at the time of purchase (typically 7 days for eligible sealed items)."
  },

  // 6. Renewals and Cancellations
  {
    id: 26,
    category: "Renewals & Refunds",
    question: "Does my plan renew automatically?",
    answer: "You can renew your plan monthly directly with 1 tap in the app. Converted wallet credits can also be applied for repurchase discounts."
  },
  {
    id: 27,
    category: "Renewals & Refunds",
    question: "What happens if I don't renew my plan?",
    answer: "Unused credits automatically convert into an INR wallet balance valid for 15 days, allowing you to repurchase or order products with saved value."
  },
  {
    id: 28,
    category: "Renewals & Refunds",
    question: "Can I pause my membership?",
    answer: "Temporary membership pause is supported for medical emergencies or travel, subject to verification by support."
  },
  {
    id: 29,
    category: "Renewals & Refunds",
    question: "Can I get a refund if I stop using ZonoFit?",
    answer: "Refunds are governed by our Refund Policy. Once activated and used, memberships are generally non-refundable. If inaccurate prior gym membership info was submitted, up to 50% may be refunded within 3 to 5 business days upon review."
  },

  // 7. Support & Rules
  {
    id: 30,
    category: "Support & Rules",
    question: "Is there an age requirement to use ZonoFit?",
    answer: "Users must be at least 18 years of age (or minimum partner gym entry age with parent/guardian consent)."
  },
  {
    id: 31,
    category: "Support & Rules",
    question: "What should I do if a gym denies access?",
    answer: "Show your valid active ZonoFit Booking Pass. If there is still an issue, contact our support team immediately for prompt assistance."
  },
  {
    id: 32,
    category: "Support & Rules",
    question: "How can a gym become a ZonoFit partner?",
    answer: "Gym owners can apply via our partner portal or reach our gym onboarding team at partners@zonofit.com."
  },
  {
    id: 33,
    category: "Support & Rules",
    question: "How do I contact customer support?",
    answer: "You can email us directly at zonofitofficial@gmail.com or contact us via WhatsApp support. We usually respond within 2 to 4 hours."
  },
  {
    id: 34,
    category: "Support & Rules",
    question: "Where can I read the full terms?",
    answer: "Our complete Terms & Conditions, Privacy Policy, and Refund Policy are accessible anytime under Profile > Legal & Policies."
  }
];

const STATIC_LEGAL_CONTENT: Record<string, string> = {
  privacy_policy: ZONOFIT_PRIVACY_POLICY,
  privacy: ZONOFIT_PRIVACY_POLICY,
  terms_and_conditions: ZONOFIT_TERMS_AND_CONDITIONS,
  terms: ZONOFIT_TERMS_AND_CONDITIONS,
  refund_policy: ZONOFIT_REFUND_POLICY,
  refund: ZONOFIT_REFUND_POLICY,
  cancellation_policy: ZONOFIT_REFUND_POLICY,
  disclaimer: ZONOFIT_DISCLAIMER,
  health_disclaimer: ZONOFIT_DISCLAIMER,
  gym_partner_agreement: ZONOFIT_GYM_PARTNER_AGREEMENT,
  partner_agreement: ZONOFIT_GYM_PARTNER_AGREEMENT,
  faq_general: ZONOFIT_FAQ,
  faq: ZONOFIT_FAQ,
  faq_all: ZONOFIT_FAQ,
  general_faq: ZONOFIT_FAQ,
};

export default function ContentScreen() {
  const router = useRouter();
  const { type, title } = useLocalSearchParams<{ type: string; title: string }>();
  
  const isFAQ = type ? (type.includes("faq") || type === "faq_general" || type === "general_faq") : false;

  const staticFallback = type ? STATIC_LEGAL_CONTENT[type] : null;
  const [content, setContent] = useState<string | null>(staticFallback || null);
  const [loading, setLoading] = useState(!staticFallback);
  const [error, setError] = useState<string | null>(null);

  // FAQ Interactive State
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [expandedIds, setExpandedIds] = useState<Record<number, boolean>>({ 1: true });

  const toggleExpand = (id: number) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedIds(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  useEffect(() => {
    if (!type) {
      setError("Invalid content type");
      setLoading(false);
      return;
    }
    fetchContent();
  }, [type]);

  const fetchContent = async () => {
    if (!staticFallback) {
      setLoading(true);
    }
    setError(null);
    try {
      const data = await apiFetch(`/api/content/${type}`);
      if (data?.success && data?.content?.value) {
        setContent(data.content.value);
      } else if (!staticFallback) {
        setError("Content not found");
      }
    } catch (err: any) {
      if (!staticFallback) {
        setError("Failed to load content. Please try again later.");
      }
    } finally {
      setLoading(false);
    }
  };

  // Filtered FAQ Items
  const filteredFAQs = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return FAQ_LIST.filter(item => {
      const matchesCat = selectedCategory === "All" || item.category === selectedCategory;
      const matchesSearch = !q || 
        item.question.toLowerCase().includes(q) || 
        item.answer.toLowerCase().includes(q);
      return matchesCat && matchesSearch;
    });
  }, [searchQuery, selectedCategory]);

  const displayTitle = title || (
    type === "privacy_policy" ? "Privacy Policy" :
    type === "terms_and_conditions" ? "Terms & Conditions" :
    (type === "refund_policy" || type === "refund") ? "Refund Policy" :
    (type === "gym_partner_agreement" || type === "partner_agreement") ? "Partner Agreement" :
    isFAQ ? "Frequently Asked Questions" : "Information"
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F9FAFB" }} edges={["top", "bottom"]}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View className="px-5 py-3.5 flex-row items-center justify-between border-b border-gray-100 bg-white">
        <View className="flex-row items-center flex-1 pr-3">
          <Pressable 
            onPress={() => router.back()} 
            hitSlop={12}
            className="w-10 h-10 rounded-full bg-gray-50 border border-gray-200 items-center justify-center mr-3 active:bg-gray-100"
          >
            <Ionicons name="arrow-back" size={20} color="#111827" />
          </Pressable>
          <View className="flex-1">
            <Text className="text-[17px] font-black text-gray-900" numberOfLines={1}>
              {displayTitle}
            </Text>
            {isFAQ && (
              <Text className="text-[11px] font-medium text-gray-500">
                Quick answers to common questions
              </Text>
            )}
          </View>
        </View>

        {/* Operator badge */}
        <View className="bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
          <Text className="text-[10px] font-extrabold text-[#1F7A3E] uppercase tracking-wider">
            ZONOFIT
          </Text>
        </View>
      </View>

      {/* Content Area */}
      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#1F7A3E" />
        </View>
      ) : error ? (
        <View className="flex-1 items-center justify-center px-6">
          <Ionicons name="alert-circle-outline" size={48} color="#EF4444" style={{ marginBottom: 16 }} />
          <Text className="text-lg font-bold text-gray-900 mb-2 text-center">{error}</Text>
          <Pressable 
            onPress={fetchContent}
            className="mt-4 bg-[#1F7A3E] px-6 py-3 rounded-2xl active:opacity-90"
          >
            <Text className="text-white font-bold text-sm">Retry</Text>
          </Pressable>
        </View>
      ) : isFAQ ? (
        /* ======================================================== */
        /* RICH INTERACTIVE FAQ PRESENTATION                        */
        /* ======================================================== */
        <ScrollView 
          className="flex-1" 
          contentContainerStyle={{ paddingBottom: 60 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Search Box */}
          <View className="px-5 pt-4 pb-2 bg-white border-b border-gray-100">
            <View className="flex-row items-center bg-[#F3F4F6] rounded-2xl px-3.5 h-11 border border-black/5">
              <Ionicons name="search-outline" size={18} color="#6B7280" />
              <TextInput
                placeholder="Search questions or keywords..."
                placeholderTextColor="#9CA3AF"
                value={searchQuery}
                onChangeText={setSearchQuery}
                className="flex-1 ml-2 text-[13px] font-medium text-gray-900 h-full"
              />
              {searchQuery.length > 0 && (
                <Pressable onPress={() => setSearchQuery("")} hitSlop={8}>
                  <Ionicons name="close-circle" size={16} color="#9CA3AF" />
                </Pressable>
              )}
            </View>

            {/* Category Filter Pills */}
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false} 
              className="mt-3 mb-2"
              contentContainerStyle={{ paddingRight: 20 }}
            >
              {FAQ_CATEGORIES.map((cat) => {
                const isSelected = selectedCategory === cat;
                return (
                  <Pressable
                    key={cat}
                    onPress={() => setSelectedCategory(cat)}
                    className={`px-3.5 py-1.5 rounded-full mr-2 border ${
                      isSelected 
                        ? "bg-[#1F7A3E] border-[#1F7A3E]" 
                        : "bg-white border-gray-200"
                    }`}
                  >
                    <Text className={`text-[11.5px] font-bold ${
                      isSelected ? "text-white" : "text-gray-600"
                    }`}>
                      {cat}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

          {/* FAQ Accordion List */}
          <View className="px-5 pt-4">
            <View className="flex-row justify-between items-center mb-3">
              <Text className="text-xs font-black text-gray-500 uppercase tracking-wider">
                {selectedCategory === "All" ? "All Questions" : selectedCategory} ({filteredFAQs.length})
              </Text>
              {searchQuery.length > 0 && (
                <Pressable onPress={() => setSearchQuery("")}>
                  <Text className="text-xs font-bold text-[#1F7A3E]">Clear search</Text>
                </Pressable>
              )}
            </View>

            <View style={{ gap: 10 }}>
              {filteredFAQs.map((faq) => {
                const isExpanded = !!expandedIds[faq.id];
                return (
                  <View 
                    key={faq.id}
                    className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden"
                  >
                    <Pressable
                      onPress={() => toggleExpand(faq.id)}
                      className="p-4 flex-row items-center justify-between active:bg-gray-50"
                    >
                      <View className="flex-row items-start flex-1 mr-3">
                        <View className="w-6 h-6 rounded-lg bg-emerald-50 border border-emerald-200 items-center justify-center mr-2.5 mt-0.5">
                          <Text className="text-[10px] font-black text-[#1F7A3E]">
                            Q{faq.id}
                          </Text>
                        </View>
                        <Text className="text-[14px] font-bold text-[#111827] flex-1 leading-snug">
                          {faq.question}
                        </Text>
                      </View>
                      <View className={`w-7 h-7 rounded-full items-center justify-center ${
                        isExpanded ? "bg-emerald-100" : "bg-gray-100"
                      }`}>
                        <Ionicons 
                          name={isExpanded ? "chevron-up" : "chevron-down"} 
                          size={15} 
                          color={isExpanded ? "#1F7A3E" : "#6B7280"} 
                        />
                      </View>
                    </Pressable>

                    {isExpanded && (
                      <View className="px-4 pb-4 pt-1 bg-[#F9FBFA] border-t border-gray-100">
                        <View className="border-l-2 border-[#1F7A3E] pl-3 py-1">
                          <Text className="text-[13px] text-gray-700 leading-relaxed font-normal">
                            {faq.answer}
                          </Text>
                          <View className="mt-2.5 flex-row items-center">
                            <View className="bg-gray-100 px-2 py-0.5 rounded-md">
                              <Text className="text-[9.5px] font-bold text-gray-500 uppercase">
                                {faq.category}
                              </Text>
                            </View>
                          </View>
                        </View>
                      </View>
                    )}
                  </View>
                );
              })}

              {filteredFAQs.length === 0 && (
                <View className="bg-white rounded-2xl p-8 items-center justify-center border border-gray-200 mt-2">
                  <Ionicons name="search-outline" size={36} color="#9CA3AF" />
                  <Text className="text-sm font-bold text-gray-800 mt-2">No matching questions</Text>
                  <Text className="text-xs text-gray-500 mt-1 text-center">
                    Try searching with other keywords or choose "All" categories.
                  </Text>
                  <Pressable 
                    onPress={() => { setSearchQuery(""); setSelectedCategory("All"); }}
                    className="mt-3 bg-emerald-50 border border-emerald-200 px-4 py-2 rounded-xl"
                  >
                    <Text className="text-xs font-bold text-[#1F7A3E]">Reset filters</Text>
                  </Pressable>
                </View>
              )}
            </View>

            {/* Need More Help Card */}
            <View className="mt-6 p-5 rounded-2xl bg-emerald-50 border border-emerald-200">
              <View className="flex-row items-center mb-2">
                <View className="w-8 h-8 rounded-full bg-[#1F7A3E] items-center justify-center mr-2.5">
                  <Ionicons name="headset" size={16} color="#FFFFFF" />
                </View>
                <Text className="text-sm font-bold text-gray-900">Still have questions?</Text>
              </View>
              <Text className="text-xs text-gray-600 leading-relaxed mb-3">
                Our support team is here to help with your gym bookings, memberships, or wallet questions.
              </Text>
              <Pressable 
                onPress={() => Linking.openURL("mailto:zonofitofficial@gmail.com?subject=ZonoFit Support Request")}
                className="bg-[#1F7A3E] py-2.5 px-4 rounded-xl flex-row items-center justify-center active:opacity-90 self-start"
              >
                <Ionicons name="mail-outline" size={15} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text className="text-white font-bold text-xs">Contact Support</Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      ) : (
        /* ======================================================== */
        /* STANDARD LEGAL DOCUMENT PRESENTATION                    */
        /* ======================================================== */
        <ScrollView 
          className="flex-1" 
          contentContainerStyle={{ padding: 20, paddingBottom: 60 }}
          showsVerticalScrollIndicator={false}
        >
          <View className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm">
            <Text className="text-gray-800 text-sm leading-relaxed whitespace-pre-wrap font-normal selection:bg-emerald-100">
              {content || "No content available yet."}
            </Text>
          </View>

          {/* Footer Contact Info */}
          <View className="mt-5 p-4 rounded-2xl bg-gray-50 border border-gray-100 items-center">
            <Text className="text-xs font-bold text-gray-700">FLEX LIFESTYLE VENTURES</Text>
            <Text className="text-[11px] text-gray-500 mt-0.5">Shastri Colony, Partapur, Banswara, Rajasthan, India</Text>
            <Text className="text-[11px] text-[#16A34A] font-semibold mt-1">zonofitofficial@gmail.com</Text>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
