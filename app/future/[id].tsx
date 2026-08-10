import React from "react";
import { View, Text, ScrollView, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useFeatureStore, featureBaseData } from "@/store/useFeatureStore";

export default function FeatureDetailsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { votes, notifications, toggleVote, toggleNotify } = useFeatureStore();
  
  const featureId = id as string || "recovery";
  const hasVoted = !!votes[featureId];
  const hasNotified = !!notifications[featureId];

  // Complete data for all features based on the overview screen
  const allFeatures: any = {
    "recovery": {
      title: "Recovery", icon: "heart", iconBg: "bg-rose-50", iconColor: "#F43F5E",
      status: "Coming Soon", statusBg: "bg-rose-50", statusColor: "text-rose-500",
      launch: "Q3 2026", desc: "Complete recovery solutions to help your body heal, relax and perform better.",
      themeColor: "#F43F5E", themeBg: "bg-[#F43F5E]", themeLightBg: "bg-rose-50",
      whatsComing: [
        { title: "Recovery Centers", desc: "Find recovery centers near you.", icon: "medkit-outline", iconBg: "bg-rose-50" },
        { title: "Massage Therapy", desc: "Book professional massage sessions.", icon: "body-outline", iconBg: "bg-rose-50" },
        { title: "Ice Bath & Compression", desc: "Ice baths, compression therapy and more.", icon: "snow-outline", iconBg: "bg-rose-50" },
        { title: "Mobility & Stretching", desc: "Improve flexibility and mobility.", icon: "fitness-outline", iconBg: "bg-rose-50" },
        { title: "Recovery Plans", desc: "Personalized recovery plans for you.", icon: "clipboard-outline", iconBg: "bg-rose-50" }
      ],
      whyMatters: "Recovery is 50% of your progress. We're bringing the best recovery experiences to you.",
      timeline: [
        { step: "Planning", status: "Completed", color: "text-green-600", dotColor: "bg-green-600", iconColor: "#10B981" },
        { step: "Design & Research", status: "Completed", color: "text-green-600", dotColor: "bg-green-600", iconColor: "#10B981" },
        { step: "Development", status: "In Progress", color: "text-amber-500", dotColor: "bg-amber-500", iconColor: "#F59E0B" },
        { step: "Testing", status: "Upcoming", color: "text-gray-500", dotColor: "bg-gray-200", iconColor: "#E5E7EB" },
        { step: "Launch", status: "Q3 2026 (Expected)", color: "text-gray-500", dotColor: "bg-gray-200", iconColor: "#E5E7EB" }
      ]
    },
    "workout-buddy": {
      title: "Workout Buddy", icon: "people", iconBg: "bg-amber-50", iconColor: "#F59E0B",
      status: "Coming Soon", statusBg: "bg-amber-50", statusColor: "text-amber-600",
      launch: "Q1 2027", desc: "Find gym partners working out at the same time and place.",
      themeColor: "#F59E0B", themeBg: "bg-[#F59E0B]", themeLightBg: "bg-amber-50",
      whatsComing: [
        { title: "Matchmaking", desc: "Find buddies with similar goals.", icon: "people-outline", iconBg: "bg-amber-50" },
        { title: "Schedule Sync", desc: "Coordinate workout times effortlessly.", icon: "calendar-outline", iconBg: "bg-amber-50" },
        { title: "Shared Goals", desc: "Track progress together.", icon: "trending-up-outline", iconBg: "bg-amber-50" }
      ],
      whyMatters: "Accountability is key to consistency. A workout buddy keeps you motivated.",
      timeline: [
        { step: "Planning", status: "Completed", color: "text-green-600", dotColor: "bg-green-600", iconColor: "#10B981" },
        { step: "Design & Research", status: "In Progress", color: "text-amber-500", dotColor: "bg-amber-500", iconColor: "#F59E0B" },
        { step: "Development", status: "Upcoming", color: "text-gray-500", dotColor: "bg-gray-200", iconColor: "#E5E7EB" },
        { step: "Testing", status: "Upcoming", color: "text-gray-500", dotColor: "bg-gray-200", iconColor: "#E5E7EB" },
        { step: "Launch", status: "Q1 2027 (Expected)", color: "text-gray-500", dotColor: "bg-gray-200", iconColor: "#E5E7EB" }
      ]
    },
    "community": {
      title: "Community", icon: "chatbubbles", iconBg: "bg-blue-50", iconColor: "#3B82F6",
      status: "In Development", statusBg: "bg-blue-100", statusColor: "text-blue-600",
      launch: "Q4 2026", desc: "Connect with fitness enthusiasts, share progress, and join local groups.",
      themeColor: "#3B82F6", themeBg: "bg-[#3B82F6]", themeLightBg: "bg-blue-50",
      whatsComing: [
        { title: "Local Groups", desc: "Join groups based on your gym.", icon: "location-outline", iconBg: "bg-blue-50" },
        { title: "Social Feed", desc: "Share your fitness journey.", icon: "image-outline", iconBg: "bg-blue-50" },
        { title: "Challenges", desc: "Compete with community members.", icon: "trophy-outline", iconBg: "bg-blue-50" }
      ],
      whyMatters: "A strong support system makes fitness a lifestyle rather than a chore.",
      timeline: [
        { step: "Planning", status: "Completed", color: "text-green-600", dotColor: "bg-green-600", iconColor: "#10B981" },
        { step: "Design & Research", status: "Completed", color: "text-green-600", dotColor: "bg-green-600", iconColor: "#10B981" },
        { step: "Development", status: "In Progress", color: "text-amber-500", dotColor: "bg-amber-500", iconColor: "#F59E0B" },
        { step: "Testing", status: "Upcoming", color: "text-gray-500", dotColor: "bg-gray-200", iconColor: "#E5E7EB" },
        { step: "Launch", status: "Q4 2026 (Expected)", color: "text-gray-500", dotColor: "bg-gray-200", iconColor: "#E5E7EB" }
      ]
    },
    "home-workout": {
      title: "Home Workout", icon: "home", iconBg: "bg-emerald-50", iconColor: "#10B981",
      status: "Planned", statusBg: "bg-emerald-50", statusColor: "text-emerald-600",
      launch: "Q1 2027", desc: "Premium, trainer-built workout routines you can do from your living room.",
      themeColor: "#10B981", themeBg: "bg-[#10B981]", themeLightBg: "bg-emerald-50",
      whatsComing: [
        { title: "No Equipment Plans", desc: "Bodyweight only workouts.", icon: "body-outline", iconBg: "bg-emerald-50" },
        { title: "Guided Videos", desc: "Follow along with expert trainers.", icon: "play-circle-outline", iconBg: "bg-emerald-50" },
        { title: "Progress Tracking", desc: "Log your home workouts.", icon: "bar-chart-outline", iconBg: "bg-emerald-50" }
      ],
      whyMatters: "Can't make it to the gym? Keep the momentum going from home.",
      timeline: [
        { step: "Planning", status: "In Progress", color: "text-amber-500", dotColor: "bg-amber-500", iconColor: "#F59E0B" },
        { step: "Design & Research", status: "Upcoming", color: "text-gray-500", dotColor: "bg-gray-200", iconColor: "#E5E7EB" },
        { step: "Development", status: "Upcoming", color: "text-gray-500", dotColor: "bg-gray-200", iconColor: "#E5E7EB" },
        { step: "Testing", status: "Upcoming", color: "text-gray-500", dotColor: "bg-gray-200", iconColor: "#E5E7EB" },
        { step: "Launch", status: "Q1 2027 (Expected)", color: "text-gray-500", dotColor: "bg-gray-200", iconColor: "#E5E7EB" }
      ]
    },
    "meal-scan": {
      title: "Shop / Meal Scan", icon: "cart", iconBg: "bg-rose-50", iconColor: "#F43F5E",
      status: "In Development", statusBg: "bg-rose-100", statusColor: "text-rose-600",
      launch: "Q4 2026", desc: "Buy supplements and scan meals to instantly track macros using Zono Vision.",
      themeColor: "#F43F5E", themeBg: "bg-[#F43F5E]", themeLightBg: "bg-rose-50",
      whatsComing: [
        { title: "Marketplace", desc: "Buy verified supplements.", icon: "cart-outline", iconBg: "bg-rose-50" },
        { title: "AI Meal Scan", desc: "Snap a photo to track macros.", icon: "camera-outline", iconBg: "bg-rose-50" },
        { title: "Fast Delivery", desc: "Get products delivered to your gym.", icon: "flash-outline", iconBg: "bg-rose-50" }
      ],
      whyMatters: "Fueling your workouts should be as easy as doing them.",
      timeline: [
        { step: "Planning", status: "Completed", color: "text-green-600", dotColor: "bg-green-600", iconColor: "#10B981" },
        { step: "Design & Research", status: "Completed", color: "text-green-600", dotColor: "bg-green-600", iconColor: "#10B981" },
        { step: "Development", status: "In Progress", color: "text-amber-500", dotColor: "bg-amber-500", iconColor: "#F59E0B" },
        { step: "Testing", status: "Upcoming", color: "text-gray-500", dotColor: "bg-gray-200", iconColor: "#E5E7EB" },
        { step: "Launch", status: "Q4 2026 (Expected)", color: "text-gray-500", dotColor: "bg-gray-200", iconColor: "#E5E7EB" }
      ]
    },
    "studio-classes": {
      title: "Studio Classes", icon: "fitness", iconBg: "bg-teal-50", iconColor: "#0D9488",
      status: "Coming Soon", statusBg: "bg-teal-50", statusColor: "text-teal-600",
      launch: "Q3 2026", desc: "Yoga, Zumba, Boxing & Pilates unlocking soon in your area.",
      themeColor: "#0D9488", themeBg: "bg-[#0D9488]", themeLightBg: "bg-teal-50",
      whatsComing: [
        { title: "Yoga & Pilates", desc: "Find the best local studios.", icon: "body-outline", iconBg: "bg-teal-50" },
        { title: "HIIT & Boxing", desc: "High-intensity group sessions.", icon: "flame-outline", iconBg: "bg-teal-50" },
        { title: "Zumba & Dance", desc: "Fun cardio classes for everyone.", icon: "musical-notes-outline", iconBg: "bg-teal-50" }
      ],
      whyMatters: "Variety is the spice of fitness. Classes keep workouts fresh and exciting.",
      timeline: [
        { step: "Planning", status: "Completed", color: "text-green-600", dotColor: "bg-green-600", iconColor: "#10B981" },
        { step: "Design & Research", status: "Completed", color: "text-green-600", dotColor: "bg-green-600", iconColor: "#10B981" },
        { step: "Development", status: "In Progress", color: "text-amber-500", dotColor: "bg-amber-500", iconColor: "#F59E0B" },
        { step: "Testing", status: "Upcoming", color: "text-gray-500", dotColor: "bg-gray-200", iconColor: "#E5E7EB" },
        { step: "Launch", status: "Q3 2026 (Expected)", color: "text-gray-500", dotColor: "bg-gray-200", iconColor: "#E5E7EB" }
      ]
    },
    "sports": {
      title: "Sports Booking", icon: "football", iconBg: "bg-blue-50", iconColor: "#3B82F6",
      status: "Coming Soon", statusBg: "bg-blue-50", statusColor: "text-blue-500",
      launch: "Q4 2026", desc: "Book badminton courts, football turfs, and sports classes instantly using your ZonoFit credits.",
      themeColor: "#3B82F6", themeBg: "bg-[#3B82F6]", themeLightBg: "bg-blue-50",
      whatsComing: [
        { title: "Courts & Grounds", desc: "Book top-rated courts near you.", icon: "tennisball-outline", iconBg: "bg-blue-50" },
        { title: "Classes & Activities", desc: "Join group swimming, MMA, and more.", icon: "people-outline", iconBg: "bg-blue-50" },
        { title: "Community Play", desc: "Find partners and join local matches.", icon: "walk-outline", iconBg: "bg-blue-50" }
      ],
      whyMatters: "Fitness isn't just gyms. Sports provide a fun, social way to stay incredibly active.",
      timeline: [
        { step: "Planning", status: "Completed", color: "text-green-600", dotColor: "bg-green-600", iconColor: "#10B981" },
        { step: "Design & Research", status: "Completed", color: "text-green-600", dotColor: "bg-green-600", iconColor: "#10B981" },
        { step: "Development", status: "In Progress", color: "text-amber-500", dotColor: "bg-amber-500", iconColor: "#F59E0B" },
        { step: "Testing", status: "Upcoming", color: "text-gray-500", dotColor: "bg-gray-200", iconColor: "#E5E7EB" },
        { step: "Launch", status: "Q4 2026 (Expected)", color: "text-gray-500", dotColor: "bg-gray-200", iconColor: "#E5E7EB" }
      ]
    },
    "nutrition": {
      title: "Nutrition", icon: "nutrition", iconBg: "bg-orange-50", iconColor: "#EA580C",
      status: "Coming Soon", statusBg: "bg-orange-50", statusColor: "text-orange-500",
      launch: "Q4 2026", desc: "Comprehensive nutrition planning and tracking to fuel your workouts and healthy lifestyle.",
      themeColor: "#EA580C", themeBg: "bg-[#EA580C]", themeLightBg: "bg-orange-50",
      whatsComing: [
        { title: "Nutrition Plans", desc: "Goal-based personalized diet plans.", icon: "restaurant-outline", iconBg: "bg-orange-50" },
        { title: "Meal Tracking", desc: "Scan and track your daily macros easily.", icon: "barcode-outline", iconBg: "bg-orange-50" },
        { title: "Dietician Consultation", desc: "1-on-1 virtual sessions with experts.", icon: "call-outline", iconBg: "bg-orange-50" }
      ],
      whyMatters: "You can't out-train a bad diet. Nutrition is the foundation of any fitness goal.",
      timeline: [
        { step: "Planning", status: "Completed", color: "text-green-600", dotColor: "bg-green-600", iconColor: "#10B981" },
        { step: "Design & Research", status: "Completed", color: "text-green-600", dotColor: "bg-green-600", iconColor: "#10B981" },
        { step: "Development", status: "In Progress", color: "text-amber-500", dotColor: "bg-amber-500", iconColor: "#F59E0B" },
        { step: "Testing", status: "Upcoming", color: "text-gray-500", dotColor: "bg-gray-200", iconColor: "#E5E7EB" },
        { step: "Launch", status: "Q4 2026 (Expected)", color: "text-gray-500", dotColor: "bg-gray-200", iconColor: "#E5E7EB" }
      ]
    },
    "sports-booking": {
      title: "Sports Booking", icon: "football", iconBg: "bg-blue-50", iconColor: "#3B82F6",
      status: "Coming Soon", statusBg: "bg-blue-50", statusColor: "text-blue-500",
      launch: "Q4 2026", desc: "Book badminton courts, football turfs, and sports classes instantly using your ZonoFit credits.",
      themeColor: "#3B82F6", themeBg: "bg-[#3B82F6]", themeLightBg: "bg-blue-50",
      whatsComing: [
        { title: "Courts & Grounds", desc: "Book top-rated courts near you.", icon: "tennisball-outline", iconBg: "bg-blue-50" },
        { title: "Classes & Activities", desc: "Join group swimming, MMA, and more.", icon: "people-outline", iconBg: "bg-blue-50" },
        { title: "Community Play", desc: "Find partners and join local matches.", icon: "walk-outline", iconBg: "bg-blue-50" }
      ],
      whyMatters: "Fitness isn't just gyms. Sports provide a fun, social way to stay incredibly active.",
      timeline: [
        { step: "Planning", status: "Completed", color: "text-green-600", dotColor: "bg-green-600", iconColor: "#10B981" },
        { step: "Design & Research", status: "Completed", color: "text-green-600", dotColor: "bg-green-600", iconColor: "#10B981" },
        { step: "Development", status: "In Progress", color: "text-amber-500", dotColor: "bg-amber-500", iconColor: "#F59E0B" },
        { step: "Testing", status: "Upcoming", color: "text-gray-500", dotColor: "bg-gray-200", iconColor: "#E5E7EB" },
        { step: "Launch", status: "Q4 2026 (Expected)", color: "text-gray-500", dotColor: "bg-gray-200", iconColor: "#E5E7EB" }
      ]
    },
    "ai-coach": {
      title: "AI Coach", icon: "hardware-chip", iconBg: "bg-purple-50", iconColor: "#7C3AED",
      status: "In Development", statusBg: "bg-purple-100", statusColor: "text-purple-600",
      launch: "Q1 2027", desc: "Your personal, highly intelligent AI fitness trainer available 24/7 right in your pocket.",
      themeColor: "#7C3AED", themeBg: "bg-[#7C3AED]", themeLightBg: "bg-purple-50",
      whatsComing: [
        { title: "Personal AI Trainer", desc: "Chat with an AI that knows your goals.", icon: "chatbubbles-outline", iconBg: "bg-purple-50" },
        { title: "Adaptive Workouts", desc: "Routines that adapt based on your progress.", icon: "barbell-outline", iconBg: "bg-purple-50" },
        { title: "Smart Guidance", desc: "Real-time form checking and advice.", icon: "eye-outline", iconBg: "bg-purple-50" }
      ],
      whyMatters: "Personal trainers are expensive. We're democratizing elite coaching through AI.",
      timeline: [
        { step: "Planning", status: "Completed", color: "text-green-600", dotColor: "bg-green-600", iconColor: "#10B981" },
        { step: "Design & Research", status: "Completed", color: "text-green-600", dotColor: "bg-green-600", iconColor: "#10B981" },
        { step: "Development", status: "In Progress", color: "text-amber-500", dotColor: "bg-amber-500", iconColor: "#F59E0B" },
        { step: "Testing", status: "Upcoming", color: "text-gray-500", dotColor: "bg-gray-200", iconColor: "#E5E7EB" },
        { step: "Launch", status: "Q1 2027 (Expected)", color: "text-gray-500", dotColor: "bg-gray-200", iconColor: "#E5E7EB" }
      ]
    },
    "workout-generator": {
      title: "Workout Generator", icon: "barbell", iconBg: "bg-teal-50", iconColor: "#0D9488",
      status: "In Development", statusBg: "bg-teal-100", statusColor: "text-teal-600",
      launch: "Q1 2027", desc: "Generate custom workouts in seconds based on the equipment you have available.",
      themeColor: "#0D9488", themeBg: "bg-[#0D9488]", themeLightBg: "bg-teal-50",
      whatsComing: [
        { title: "Custom Workouts", desc: "Generate workouts for any goal.", icon: "options-outline", iconBg: "bg-teal-50" },
        { title: "Goal Based Plans", desc: "Long-term periodized training programs.", icon: "trending-up-outline", iconBg: "bg-teal-50" },
        { title: "Exercise Library", desc: "1000+ exercises with video tutorials.", icon: "library-outline", iconBg: "bg-teal-50" }
      ],
      whyMatters: "Never wander the gym wondering what to do again. Instant, expert-level programming.",
      timeline: [
        { step: "Planning", status: "Completed", color: "text-green-600", dotColor: "bg-green-600", iconColor: "#10B981" },
        { step: "Design & Research", status: "Completed", color: "text-green-600", dotColor: "bg-green-600", iconColor: "#10B981" },
        { step: "Development", status: "In Progress", color: "text-amber-500", dotColor: "bg-amber-500", iconColor: "#F59E0B" },
        { step: "Testing", status: "Upcoming", color: "text-gray-500", dotColor: "bg-gray-200", iconColor: "#E5E7EB" },
        { step: "Launch", status: "Q1 2027 (Expected)", color: "text-gray-500", dotColor: "bg-gray-200", iconColor: "#E5E7EB" }
      ]
    },
    "personal-trainer": {
      title: "Personal Trainer", icon: "person", iconBg: "bg-orange-50", iconColor: "#EA580C",
      status: "In Development", statusBg: "bg-orange-100", statusColor: "text-orange-600",
      launch: "Q2 2027", desc: "Find, book, and train with certified personal trainers across our entire partner network.",
      themeColor: "#EA580C", themeBg: "bg-[#EA580C]", themeLightBg: "bg-orange-50",
      whatsComing: [
        { title: "Book Trainers", desc: "Find trainers by specialty and location.", icon: "search-outline", iconBg: "bg-orange-50" },
        { title: "1-on-1 Sessions", desc: "In-person or virtual training sessions.", icon: "people-outline", iconBg: "bg-orange-50" },
        { title: "Training Plans", desc: "Trainers can assign workouts directly.", icon: "document-text-outline", iconBg: "bg-orange-50" }
      ],
      whyMatters: "Human connection and expert guidance are irreplaceable for reaching elite levels.",
      timeline: [
        { step: "Planning", status: "Completed", color: "text-green-600", dotColor: "bg-green-600", iconColor: "#10B981" },
        { step: "Design & Research", status: "Completed", color: "text-green-600", dotColor: "bg-green-600", iconColor: "#10B981" },
        { step: "Development", status: "In Progress", color: "text-amber-500", dotColor: "bg-amber-500", iconColor: "#F59E0B" },
        { step: "Testing", status: "Upcoming", color: "text-gray-500", dotColor: "bg-gray-200", iconColor: "#E5E7EB" },
        { step: "Launch", status: "Q2 2027 (Expected)", color: "text-gray-500", dotColor: "bg-gray-200", iconColor: "#E5E7EB" }
      ]
    },
    "travel-fitness": {
      title: "Travel Fitness", icon: "airplane", iconBg: "bg-indigo-50", iconColor: "#4F46E5",
      status: "Planned", statusBg: "bg-gray-100", statusColor: "text-gray-600",
      launch: "TBD", desc: "Don't let travel ruin your streak. Access premium gym partners and bodyweight workouts anywhere.",
      themeColor: "#4F46E5", themeBg: "bg-[#4F46E5]", themeLightBg: "bg-indigo-50",
      whatsComing: [
        { title: "Workouts on the go", desc: "No-equipment hotel room workouts.", icon: "bed-outline", iconBg: "bg-indigo-50" },
        { title: "Hotel Gyms", desc: "Access premium hotel fitness centers.", icon: "business-outline", iconBg: "bg-indigo-50" },
        { title: "Travel Planner", desc: "Plan your fitness schedule around flights.", icon: "calendar-outline", iconBg: "bg-indigo-50" }
      ],
      whyMatters: "Maintaining momentum is the hardest part of fitness. We make it easy, even on the road.",
      timeline: [
        { step: "Planning", status: "In Progress", color: "text-amber-500", dotColor: "bg-amber-500", iconColor: "#F59E0B" },
        { step: "Design & Research", status: "Upcoming", color: "text-gray-500", dotColor: "bg-gray-200", iconColor: "#E5E7EB" },
        { step: "Development", status: "Upcoming", color: "text-gray-500", dotColor: "bg-gray-200", iconColor: "#E5E7EB" },
        { step: "Testing", status: "Upcoming", color: "text-gray-500", dotColor: "bg-gray-200", iconColor: "#E5E7EB" },
        { step: "Launch", status: "TBD", color: "text-gray-500", dotColor: "bg-gray-200", iconColor: "#E5E7EB" }
      ]
    },
    "corporate-wellness": {
      title: "Corporate Wellness", icon: "briefcase", iconBg: "bg-emerald-50", iconColor: "#10B981",
      status: "Planned", statusBg: "bg-gray-100", statusColor: "text-gray-600",
      launch: "TBD", desc: "Bring ZonoFit to your entire company. Compete with coworkers and earn wellness rewards.",
      themeColor: "#10B981", themeBg: "bg-[#10B981]", themeLightBg: "bg-emerald-50",
      whatsComing: [
        { title: "Corporate Plans", desc: "Discounted memberships for employees.", icon: "cash-outline", iconBg: "bg-emerald-50" },
        { title: "Employee Challenges", desc: "Step challenges and team leaderboards.", icon: "podium-outline", iconBg: "bg-emerald-50" },
        { title: "Wellness Programs", desc: "Holistic health benefits for teams.", icon: "leaf-outline", iconBg: "bg-emerald-50" }
      ],
      whyMatters: "A healthy workforce is a happy, productive workforce. Build culture through fitness.",
      timeline: [
        { step: "Planning", status: "In Progress", color: "text-amber-500", dotColor: "bg-amber-500", iconColor: "#F59E0B" },
        { step: "Design & Research", status: "Upcoming", color: "text-gray-500", dotColor: "bg-gray-200", iconColor: "#E5E7EB" },
        { step: "Development", status: "Upcoming", color: "text-gray-500", dotColor: "bg-gray-200", iconColor: "#E5E7EB" },
        { step: "Testing", status: "Upcoming", color: "text-gray-500", dotColor: "bg-gray-200", iconColor: "#E5E7EB" },
        { step: "Launch", status: "TBD", color: "text-gray-500", dotColor: "bg-gray-200", iconColor: "#E5E7EB" }
      ]
    },
    "smart-wearables": {
      title: "Smart Wearables", icon: "watch", iconBg: "bg-purple-50", iconColor: "#7C3AED",
      status: "Planned", statusBg: "bg-gray-100", statusColor: "text-gray-600",
      launch: "TBD", desc: "Connect Apple Watch, Garmin, and Fitbit to earn credits for hitting daily activity goals.",
      themeColor: "#7C3AED", themeBg: "bg-[#7C3AED]", themeLightBg: "bg-purple-50",
      whatsComing: [
        { title: "Wearable Sync", desc: "Auto-sync workouts from your watch.", icon: "sync-outline", iconBg: "bg-purple-50" },
        { title: "Health Insights", desc: "Analyze heart rate and recovery metrics.", icon: "pulse-outline", iconBg: "bg-purple-50" },
        { title: "Smart Recommendations", desc: "Workout suggestions based on readiness.", icon: "bulb-outline", iconBg: "bg-purple-50" }
      ],
      whyMatters: "Your health data shouldn't live in silos. We bring it together to reward your effort.",
      timeline: [
        { step: "Planning", status: "In Progress", color: "text-amber-500", dotColor: "bg-amber-500", iconColor: "#F59E0B" },
        { step: "Design & Research", status: "Upcoming", color: "text-gray-500", dotColor: "bg-gray-200", iconColor: "#E5E7EB" },
        { step: "Development", status: "Upcoming", color: "text-gray-500", dotColor: "bg-gray-200", iconColor: "#E5E7EB" },
        { step: "Testing", status: "Upcoming", color: "text-gray-500", dotColor: "bg-gray-200", iconColor: "#E5E7EB" },
        { step: "Launch", status: "TBD", color: "text-gray-500", dotColor: "bg-gray-200", iconColor: "#E5E7EB" }
      ]
    }
  };

  const feature = allFeatures[featureId] || allFeatures["recovery"];
  const currentWaitingCount = (featureBaseData[featureId] || 0) + (hasVoted ? 1 : 0);
  const waitingString = currentWaitingCount.toLocaleString("en-US");

  const handleVote = () => {
    toggleVote(featureId);
  };
  
  const handleNotify = () => {
    toggleNotify(featureId);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#FFFFFF" }} edges={["top"]}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View className="flex-row items-center px-5 pt-4 pb-4">
        <Pressable onPress={() => router.back()} className="p-2 -ml-2 z-10">
          <Ionicons name="chevron-back" size={26} color="#000" />
        </Pressable>
        <Text className="text-[18px] font-bold text-black flex-1 text-center -ml-6">Feature Details</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 60 }}>
        {/* Main Hero Card */}
        <View className="flex-row px-6 py-6 items-center border-b border-gray-100">
          <View className={`w-[100px] h-[100px] rounded-3xl ${feature.iconBg} items-center justify-center mr-6 shadow-sm`} style={{ shadowColor: feature.themeColor, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8 }}>
            <Ionicons name={feature.icon} size={48} color={feature.iconColor} />
          </View>
          <View className="flex-1">
            <View className="flex-row items-center mb-1.5 flex-wrap">
              <Text className="text-[22px] font-bold text-black mr-2">{feature.title}</Text>
              <View className={`${feature.statusBg} px-2 py-1 rounded-md`}>
                <Text className={`${feature.statusColor} text-[9px] font-bold uppercase tracking-wider`}>{feature.status}</Text>
              </View>
            </View>
            <View className="flex-row items-center mb-2">
              <Ionicons name="calendar-outline" size={12} color="#6B7280" />
              <Text className="text-gray-500 text-[11px] ml-1">Launch expected: {feature.launch}</Text>
            </View>
            <Text className="text-gray-600 text-[13px] leading-relaxed pr-2">{feature.desc}</Text>
          </View>
        </View>

        {/* What's Coming */}
        <View className="px-5 py-6">
          <Text className="text-[18px] font-bold text-black mb-4">What's Coming</Text>
          {feature.whatsComing.map((item: any, index: number) => (
            <View key={index} className="flex-row items-center mb-4">
              <View className={`w-10 h-10 rounded-full ${item.iconBg} items-center justify-center mr-4`}>
                <Ionicons name={item.icon} size={18} color={feature.iconColor} />
              </View>
              <View className="flex-1 border-b border-gray-50 pb-4">
                <Text className="text-[14px] font-bold text-black mb-0.5">{item.title}</Text>
                <Text className="text-[12px] text-gray-500">{item.desc}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
            </View>
          ))}
        </View>

        {/* Why it matters */}
        <View className="px-5 mb-6">
          <View className={`${feature.themeLightBg} rounded-[20px] p-5 flex-row items-center border border-gray-100/50`}>
            <View className="flex-1 pr-4">
              <Text className={`${feature.statusColor} font-bold text-[14px] mb-2`}>Why it matters?</Text>
              <Text className="text-gray-800 text-[13px] leading-relaxed">{feature.whyMatters}</Text>
            </View>
            <View className="opacity-40">
              <Ionicons name="information-circle" size={40} color={feature.iconColor} />
            </View>
          </View>
        </View>

        {/* Community Interest */}
        <View className="px-5 mb-8">
          <Text className="text-[16px] font-bold text-black mb-2">Community Interest</Text>
          <Text className={`${feature.statusColor} font-bold text-[12px] mb-4`}><Text className="font-black text-[13px]">{waitingString}</Text> members are waiting for this feature</Text>
          <View className="flex-row items-center">
            {/* Mock Avatars */}
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <View key={i} className={`w-10 h-10 rounded-full bg-gray-200 border-2 border-white items-center justify-center ${i > 1 ? '-ml-3' : ''} z-${10-i}`}>
                <Ionicons name="person" size={20} color="#9CA3AF" />
              </View>
            ))}
            <View className={`w-10 h-10 rounded-full ${feature.themeLightBg} border-2 border-white items-center justify-center -ml-3 z-0`}>
              <Text className={`text-[10px] font-bold ${feature.statusColor}`}>+8K</Text>
            </View>
          </View>
        </View>

        {/* Help Prioritize */}
        <View className="px-5 mb-8">
          <Text className="text-[16px] font-bold text-black mb-2">Help Prioritize This Feature</Text>
          <Text className="text-gray-500 text-[12px] mb-5">Your vote helps us decide what to build next.</Text>
          
          <Pressable 
            onPress={handleVote}
            className={`${hasVoted ? 'bg-white border-2 border-gray-200' : feature.themeBg} rounded-[16px] py-4 items-center justify-center flex-row mb-3 active:opacity-90 shadow-sm`}
          >
            <Ionicons name="thumbs-up" size={18} color={hasVoted ? feature.iconColor : "white"} />
            <Text className={`${hasVoted ? feature.statusColor : 'text-white'} font-bold text-[15px] ml-2`}>
              {hasVoted ? "Voted!" : `Vote for ${feature.title}`}
            </Text>
          </Pressable>
          
          <Pressable className={`border border-gray-200 ${feature.themeLightBg} rounded-[16px] py-4 items-center justify-center flex-row active:opacity-90`}>
            <Ionicons name="chatbubble-outline" size={18} color={feature.iconColor} />
            <Text className={`${feature.statusColor} font-bold text-[15px] ml-2`}>Share Feedback</Text>
          </Pressable>
        </View>

        {/* Get Notified */}
        <View className="px-5 mb-8">
          <Text className="text-[16px] font-bold text-black mb-2">Get Notified</Text>
          <Text className="text-gray-500 text-[12px] mb-5">We'll notify you as soon as this feature is available.</Text>
          
          <Pressable 
            onPress={handleNotify}
            className={`${hasNotified ? 'bg-white border-2 border-gray-200' : feature.themeBg} rounded-[16px] py-4 items-center justify-center flex-row active:opacity-90 shadow-sm`}
          >
            <Ionicons name={hasNotified ? "checkmark-circle" : "notifications"} size={18} color={hasNotified ? feature.iconColor : "white"} />
            <Text className={`${hasNotified ? feature.statusColor : 'text-white'} font-bold text-[15px] ml-2`}>
              {hasNotified ? "Notified!" : "Notify Me"}
            </Text>
          </Pressable>
        </View>

        {/* Roadmap Timeline */}
        <View className="px-5 mb-8">
          <Text className="text-[18px] font-bold text-black mb-6">Roadmap Timeline</Text>
          
          <View className="ml-2">
            {feature.timeline.map((item: any, index: number) => {
              const isLast = index === feature.timeline.length - 1;
              return (
                <View key={index} className="flex-row mb-6 relative">
                  {/* Vertical Line */}
                  {!isLast && (
                    <View className="absolute left-2.5 top-6 bottom-[-24px] w-[2px] bg-gray-100" />
                  )}
                  
                  <View className={`w-5 h-5 rounded-full ${item.dotColor} items-center justify-center mt-0.5 z-10`}>
                    {item.status === "Completed" && <Ionicons name="checkmark" size={12} color="white" />}
                    {item.status === "In Progress" && <View className="w-2 h-2 rounded-full bg-white" />}
                  </View>
                  
                  <View className="flex-row justify-between flex-1 ml-4 border-b border-gray-50 pb-2">
                    <Text className="text-[14px] font-bold text-black">{item.step}</Text>
                    <Text className={`text-[12px] font-bold ${item.color}`}>{item.status}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

