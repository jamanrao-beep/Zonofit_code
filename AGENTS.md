# ZonoFit Developer Rules

You are an expert React Native + Expo engineer helping build **ZonoFit** — a production-quality fitness access network mobile app.

You write clean, simple, maintainable code. You prioritize clarity over unnecessary abstraction. You think like a senior mobile engineer, but you build feature by feature, the way a real product team would ship an MVP: smallest useful version first, refactor only when repetition or complexity actually appears.

---

## 1. PRODUCT OVERVIEW

**ZonoFit is a fitness access network.** Instead of committing to one gym membership, users buy a ZonoFit membership and receive **credits**, which they spend to book visits across a network of partner gyms.

### Core Problem We're Solving

The biggest barrier to fitness isn't finding a gym — it's that people won't commit money before they've experienced consistent value.

Traditional gym memberships create:

- Upfront commitment
- Limited flexibility
- Membership wastage
- Poor utilization
- Reduced motivation after routine fatigue

Users want lower perceived risk, more flexibility, better value for money, freedom of choice, and access without long-term lock-in. ZonoFit solves this with a flexible, credit-powered fitness access network.

### What ZonoFit Is NOT

ZonoFit is not helping users become bodybuilders. **ZonoFit is helping users become consistent fitness participants.**

**Identity goal the product must reinforce:** *"I am someone who works out regularly."*

Every major feature — Home, Explore, Credits, Journey, Challenges — should ladder up to: **consistency, progress, habit formation, fitness participation.** If a feature doesn't support one of those, question whether it belongs in this app.

### Target Users (design and copy should speak to these five)

| Segment | Who they are |
| --- | --- |
| **Fitness Beginners** | Want to start, but hesitant to commit to traditional memberships |
| **Young Professionals** | Need flexibility across work, home, and travel locations |
| **College Students** | Want affordable access and flexibility |
| **Fitness Explorers** | Enjoy trying different gyms and facilities |
| **Returning Fitness Users** | Restarting fitness after previous drop-off |

---

## 2. PRODUCT GOALS & NORTH STAR

### First-Year Goals

- Onboard 100 Partner Gyms
- Achieve 1,000 Active Users
- Reach 12–15 visits per active user per month
- Maintain a 98–99% successful check-in rate
- Build strong retention through habit-building systems
- Become the default starting point for beginner gym users

### North Star Metric

Our North Star Metric is **Monthly Completed Gym Visits Per Active User**.

Supporting metrics (these should be instrumentable/trackable from the UI you build):

- Active Users
- Retention Rate
- Credits Consumed
- Credit Purchases
- Check-In Success Rate
- Referral Conversion Rate
- Partner Gym Growth

### Core Product Loop

This loop is the foundation of the entire app — every screen you build should be advancing the user along it:

```text
Buy Membership
      ↓
Receive Credits
      ↓
Discover Gym
      ↓
Book Visit
      ↓
Check-In
      ↓
Workout
      ↓
Build Consistency
      ↓
Return For Next Visit  ──→ (loops back to Discover Gym)
```

---

## 3. BUSINESS MODEL & THE CREDIT ECONOMY — READ BEFORE TOUCHING ANYTHING MONEY-RELATED

The credit economy is the core business model. Get this wrong in the UI and you create real financial bugs, not cosmetic ones.

### Revenue Sources

- Membership Fees
- Credit Purchases
- Partner Gym Revenue Share
- Future Plans

### Credit Value Rules

- **1 Credit = ₹10**
- **1 Credit = ₹8** when converted into INR for usage *outside* a gym (on products or services) — note the asymmetry, it's intentional, not a bug
- Credit value is fixed (no dynamic pricing in MVP — that's a Phase 2 idea)
- Gyms can *propose* a credit requirement for a visit, but **ZonoFit retains final pricing control**. Different gyms may require different credit amounts for a visit.

### Credit Expiry Rules

- Credits remain active for the duration of an active membership
- Credits expire **15 days after membership expiration**
- Expired credits **cannot be recovered**

### Gym Network Protection

- Partner gyms cannot leave the platform while active user obligations exist
- Existing bookings and purchased access must always be honored

### ⚠️ Credit System Engineering Implications

Because credits are literally pegged to currency, **never compute credit balances, conversions, or deductions on the client and trust the result.**

- Display-only math (e.g. "420 Credits ≈ ₹4,200") is fine in the UI using the fixed constants above.
- Any **mutation** — booking a visit, converting credits to cash, purchasing credits, applying a bonus — must be confirmed by the backend. The client shows an optimistic UI state at most; it never authoritatively updates a wallet balance itself.
- Keep the ₹10 / ₹8 constants in one place (`constants/credits.ts`), not scattered across components.

### Success Objectives For The Credit System

It should be easy to understand, encourage frequent usage, create a perceived sense of savings, improve retention, and scale across cities and gym categories. Keep this in mind anywhere credits are surfaced in copy or UI (e.g. "Best Value", "Saved ₹1,450 compared to pay-per-visit").

---

## 4. HABIT ENGINE

The primary competitor is not another gym. **The primary competitor is inactivity.**

The Habit Engine exists purely to increase consistency. Building blocks (some are MVP, some are future):

- Streaks
- Workout milestones
- Monthly targets
- Achievement badges
- Fitness journey progression
- Reward credits

**Success metric:** increase in average monthly visits per user.

The **Fitness Journey** (Home screen) and **Challenges** (MVP scope) are the concrete MVP expressions of the Habit Engine — build them with this north star in mind, not as decoration.

---

## 5. GYM PARTNER SYSTEM (context, not in-scope for this mobile codebase)

Partner gyms get: new customer acquisition, increased visibility, utilization of unused capacity, additional revenue, and access to ZonoFit members. They get this through a separate **Gym Partner Dashboard** (booking management, check-in validation, visit analytics, revenue tracking) — that's a different app/surface, not part of this React Native user app.

Why it matters here: the booking/check-in API contracts this mobile app calls are shared with that dashboard, so don't assume the mobile app is the only consumer of booking/check-in state.

---

## 6. CHECK-IN SYSTEM

A visit only becomes valid after successful verification. Potential methods (design the check-in screen so any of these could be slotted in):

- QR Verification
- OTP Verification
- Staff Approval
- Time-Limited Access Codes

**Objectives:** prevent fraud, prevent duplicate check-ins, prevent booking abuse, ensure accurate revenue settlement.

**Target success rate: 98–99% successful check-ins.**

### ⚠️ Check-In System Engineering Implications

Check-in validation is a trust boundary, same as credits. The app can *generate or display* a QR code / pass, and can *scan* one, but the actual "this visit is now valid" decision is made server-side. Never mark a booking as "Checked In" locally without backend confirmation.

---

## 7. GROWTH ENGINE

Primary channels: user referrals, gym referrals, campus ambassadors, fitness communities, local partnerships. Goal: efficient acquisition with minimal paid advertising.

**Implication for this app:** referral entry points (e.g. "Invite a friend" on Profile/Home) should be considered first-class, not bolted on later, even if the full referral system is built incrementally.

---

## 8. MVP SCOPE

### User Side (this is what we're building in this codebase)

- User Authentication (Google, Phone)
- User Profile
- Membership Management
- Credit Wallet
- Credit Purchase System
- Gym Discovery
- Gym Detail Page
- Visit Booking
- QR Check-In
- Booking History
- Transaction History
- Push Notifications
- Challenges
- Journey

### Gym Side (separate dashboard, out of scope here — context only)

- Partner Gym Dashboard
- Booking Management
- Check-In Validation
- Visit Analytics
- Revenue Tracking

### Admin Side (separate console, out of scope here — context only)

- User Management
- Gym Management
- Credit Management
- Booking Monitoring
- Transaction Monitoring

---

## 9. PHASE 2 — EXPLICITLY NOT IN SCOPE YET

Do not build any of the below unless the user explicitly asks for it by name. If a request sounds like one of these, flag it ("this sounds like the Phase 2 X feature from the PRD — do you want me to build it now, or stub it?") rather than silently implementing it.

**Community Features:** Social Features, Friends, Community Feed
**Fitness Features:** Workout Tracking, Nutrition Tracking, Exercise Library
**Intelligence Features:** AI Recommendations, AI Fitness Planning, Personalized Suggestions
**Advanced Monetization:** Dynamic Pricing, Family Plans, Corporate Memberships, Loyalty Programs

The "AI Trainer," "Meal Scan," "Workout Buddy," "Workout Plans," "Calorie Tracker," and "Community" tiles in the Home screen's Fitness Tools grid (Section 6) are **locked / "Coming Soon"** placeholders for this reason — render them, don't build their backing features.

---

## 10. TECH STACK

### Core (use this, do not deviate without strong reason)

- Expo
- React Native
- TypeScript
- Expo Router
- NativeWind / Tailwind CSS
- Zustand
- AsyncStorage
- Custom JWT & SecureStore for authentication (covers Google + Phone login from MVP scope)

### Likely Needed For ZonoFit Specifically — propose and get approval before installing any of these

Per the Decision Making rules below, don't just add these — recommend them when the relevant feature comes up, explain why, and wait for a yes:

| Need | Suggested library | Used for |
| --- | --- | --- |
| Distance / "near me" | `expo-location` | Explore page "Near Me", distance-sorted cards, Home's primary gym distance |
| Map view (if needed) | `react-native-maps` | Optional visual map on Explore — confirm whether MVP needs a map or just list/cards before adding |
| QR pass generation | `react-native-qrcode-svg` | User's bookable visit pass shown at the gym |
| QR/camera scanning | `expo-camera` (with barcode scanning) | Only if staff-side scanning ever lives in this app — usually this belongs to the separate Gym Dashboard, confirm scope first |
| Push notifications | `expo-notifications` | Booking reminders, low-credit alerts, membership-expiry alerts, achievement unlocks |
| Payments | Razorpay (webview/checkout SDK) or similar | Credit Purchase System — India-first payment rails |

### Explicitly Not Needed

GetStream / Stream Vision Agents, video-based AI teacher infrastructure, and any chat-tutor AI plumbing — these belonged to an unrelated previous project and are not part of ZonoFit. Don't reintroduce them.

### Backend

Use a Node.js + PostgreSQL database stack. Use **Prisma ORM** for database schema management, relational models, and migrations. Enable the **PostGIS** extension in PostgreSQL for handling location-based queries (e.g., gym distances).

Use server-side API routes / functions for anything touching money or trust: credit balance reads/writes, credit purchase, credit↔INR conversion, booking creation, check-in validation, payment webhooks. Never expose secrets (payment keys, JWT secret key, partner API keys) in the mobile app.

---

## 11. DEVELOPMENT PHILOSOPHY

Build feature by feature. For every feature:

1. Understand the user request.
2. Check this file before coding.
3. Keep the implementation simple.
4. Avoid overengineering.
5. Prefer readable code over clever code.
6. Build the smallest useful version first.
7. Refactor only when repetition or complexity appears.
8. Make sure financial/trust-boundary logic (Section 3 & 6 above) is never faked client-side, even in a "smallest useful version."

---

## 12. DECISION MAKING & CLARIFICATIONS

If something is unclear or could be improved:

- Proactively suggest better approaches.
- If a new library would significantly simplify or improve the implementation:
  - Recommend the library.
  - Clearly explain why it is useful.
  - Ask the user for permission before adding or installing it.

Example:

> "Explore's 'Near Me' filter needs the user's live location — `expo-location` would handle permissions and distance calculation cleanly. Do you want me to add it?"

Do not install or use new libraries without user approval — this applies especially to the payments/location/QR/notifications libraries listed in Section 10.

---

## 13. ARCHITECTURE GUIDELINES

Use this structure unless there's a strong reason to change it:

```txt
app/
  (auth)/
  (tabs)/
    home.tsx
    explore.tsx
    credits.tsx
    journey.tsx        // or folded into home, see Section 14
    profile.tsx
  gym/[id]/             // Gym Detail Page
  booking/              // Visit Booking flow
  checkin/              // QR Check-In flow
components/
constants/
data/
hooks/
lib/
store/
types/
assets/
```

### app/

Routes and screens only. Screens compose components and call hooks/stores — they should not contain large reusable UI blocks or complex business logic (especially credit/booking math — that belongs in `lib/` or the backend, not in a screen file).

### components/

Create a component only when:

- it is reused in multiple places
- it makes a screen easier to read
- it represents a clear UI concept like `GymCard`, `CreditBadge`, `JourneyProgressBar`, `TransactionRow`, `LockedFeatureTile`, `PrimaryButton`

Do not create tiny one-off components too early. When unsure, ask:

> Should this UI be extracted into a reusable component, or should I keep it inside the current screen for now?

### data/

Hardcoded/mock content while the backend is being built — gyms, plans, badges, milestones. See Section 21.

### store/

Zustand stores for client state — credits, membership, today's booking, journey, streak, explore filters. See Section 22. **Caveat specific to ZonoFit:** stores that mirror financial state (credit balance, membership status) are a *cache of server truth*, refetched on screen focus / after mutations — not a local source of truth the way "completed lessons" might be in a purely local app.

### lib/

Helper functions — `api.ts`, `cn.ts`, and (pending approval) `location.ts`, `qrcode.ts`, `payments.ts`. Never expose secret keys here on the client.

---

## 14. SCREEN SPECIFICATIONS

These three screens are the MVP core. Build to this spec pixel-for-pixel when a design image is provided, and to this written spec when it isn't (see UI Implementation Rules, Section 16).

### 14.1 HOME PAGE

**Objective:** a daily fitness action center answering one question: **"Can I workout today?"**

Prioritize gym access, membership visibility, progress tracking, and a clear next action, in a premium, modern mobile style (Apple Fitness / Whoop / Oura inspired).

#### Section 1 — Hero Access Card

**Purpose:** immediately show the user's current access status.

**Content:** Visits Remaining (largest visual element) · Membership Status · Membership Expiry Date · "Book Today's Visit" CTA · Available Credits · Current Plan.

**Example:**

`
12
Visits Remaining
Active Membership
Premium Plan
Credits Available: 420
[ Book Today's Visit ]
`

**Design:** full-width card, emerald gradient background, glassmorphism styling, 24–32px border radius, strong visual hierarchy, primary action always visible.

#### Section 2 — Today

**Purpose:** answer "What should I do right now?"

**Dynamic states:**

`
Not Booked              Booked                    Checked In
TODAY                   TODAY                     TODAY
No workout booked       Workout Booked             Checked In Successfully
[ Book Visit ]          7:00 PM                    🔥 Great Work
                         [ View Pass ]
`

**Design:** compact action card, context-aware state, single primary CTA.

#### Section 3 — Fitness Journey

**Purpose:** show long-term progress and future motivation.

**Content:** Current Month of 12 · Current Identity Stage · Progress Percentage · Next Milestone · "View Journey" CTA.

**Example:**

`
Month 4 of 12
Explorer Stage
67% Complete
Next Milestone: 50 Workouts
[ View Journey ]
`

**Visual:** mountain/path progression illustration, premium milestone visualization, focus on growth rather than raw statistics.

#### Section 4 — Momentum

**Purpose:** quick performance indicators, bento layout.

**Example:**

`
Large Card           Small Cards
🔥 12                 48                  320
Day Streak            Total Workouts      Training Hours
`

**Design:** compact bento grid, high visual impact, minimal text.

#### Section 5 — Dynamic Status

**Purpose:** surface important info only when relevant.

**Examples:**

`
Low Credits                          Membership Expiring
Only 2 Visits Remaining              Membership Expires In 3 Days
[ Recharge ]                         [ Renew Now ]

Achievement Unlock                   New Feature
🏆 50 Workouts Completed              AI Trainer — Coming Soon
`

**Rules:** hidden when no alerts exist · never show empty placeholders · highest-priority alert appears first.

#### Section 6 — Fitness Tools

**Purpose:** access to ecosystem features, 2×3 premium bento grid: Meal Scan, AI Trainer, Workout Buddy, Workout Plans, Calorie Tracker, Community.

**Locked features** render as:

`
🔒 AI Trainer
Coming Soon
`

— shown, not hidden (these are Phase 2 features per Section 9 above).

**Design:** premium glass cards, large icons, minimal labels, clear locked states.

#### Section 7 — Motivation

**Purpose:** emotional reinforcement without taking excessive space.

**Example:**

`
Day 24
"Consistency beats intensity."
`

or

`
"You've already outperformed the person who stayed home."
`

**Design:** small card, full-width, rotating content, not more than 15% of screen height.

#### Home Page Style

White background · glassmorphism cards · soft shadows · large typography · premium spacing · 24–32px corner radius · clean minimal interface. Visual direction: Apple Fitness / Whoop / Oura.

#### Home Page User-Psychology Checklist

Every section must answer one of:

1. Can I workout today?
2. How many visits do I have left?
3. Am I progressing?
4. What should I do next?

Anything that doesn't answer one of these doesn't belong on Home.

---

### 14.2 EXPLORE PAGE

**Objective:** an alternative gym access surface answering: **"Where else can I workout today?"** Unlike Home (which is about the user's Primary Gym), Explore is for discovering and booking *other* network gyms with available credits.

It should help users: find nearby gyms, compare facilities, discover premium experiences, use credits outside their Primary Gym, explore additional options.

#### Section 1 — Search & Discovery

**Purpose:** quickly find alternative gyms.

**Content:** Search Bar · Current Location · Quick Filters.

**Example:**

`
Search gym, area or landmark
📍 Near Me • 5 KM Radius
Open Now   Strength   Cardio   CrossFit
`

**Design:** sticky search experience, quick-access filters, location-aware discovery.

#### Section 2 — Closest To You

**Purpose:** "What's the easiest gym I can visit right now?"

**Content:** Distance · Rating · Credits Required.

**Example:**

`
Closest To You
0.8 KM Away   ⭐ 4.8   ⚡ 8 Credits
`

**Design:** horizontal card carousel, distance-first hierarchy, fast booking decision.

#### Section 3 — Best Value

**Purpose:** help users maximize credit usage. Show gyms requiring fewer credits while still offering quality facilities.

**Example:**

`
Best Value
⚡ 6 Credits Per Visit
High Member Satisfaction
`

**Design:** green visual indicators, savings-focused messaging.

#### Section 4 — Premium Facilities

**Purpose:** show premium fitness experiences in the network (luxury gyms, advanced equipment, recovery zones, specialized facilities).

**Example:**

`
Premium Facilities
Steam Room   Recovery Zone   Performance Training
`

**Design:** premium imagery, gold accent indicators, high-end positioning.

#### Section 5 — Beginner Friendly

**Purpose:** help newer members find comfortable workout environments (trainer support, beginner programs, easy onboarding).

**Example:**

`
Beginner Friendly
Trainer Available
Beginner Programs Included
`

**Design:** friendly visual language, lower intimidation factor.

#### Section 6 — Near Your Primary Gym

**Purpose:** "What other gyms are available near my primary gym?"

**Logic:** display gyms within a 5 KM radius of the user's Primary Gym. These are shown for discovery only — **not bookable** under the user's current membership/access tier.

**Example:**

`
Near Your Primary Gym
5 gyms nearby

🏋️ Iron Paradise
1.2 KM Away
🔒 Not Available Under Current Access

🏋️ PowerHouse Elite
2.5 KM Away
🔒 Not Available Under Current Access
`

**Design:** separate visual section, lock indicator, informational only, distinct styling from bookable gyms.

**Business benefit:** increases visibility of nearby partner gyms, expands awareness of the network, encourages future upgrades/partnerships, gives transparency on nearby options.

#### Section 7 — All Available Gyms

**Purpose:** complete, bookable gym list.

**Content per card:** Gym Image · Distance · Verification Status · Facility Tags · Credit Cost · Available Slots · "View Gym" CTA · "Book Visit" CTA.

**Example:**

`
PowerHouse Fitness
📍 2.1 KM Away   Verified
Strength • Cardio • CrossFit
Visit Cost: 8 Credits
Available Slots: 12
[ View Gym ]   [ Book Visit ]
`

**Design:** large visual cards, premium imagery, clear booking actions, credit visibility *before* booking (never surprise the user with a credit cost after they tap Book).

#### Explore Page User-Psychology Checklist

Every section should answer one of:

1. What gym can I visit right now?
2. Which gym is closest?
3. Which gym gives the best value for my credits?
4. What premium facilities are available?
5. What gyms are near my primary gym?
6. Where can I spend my credits today?

**Explore must not compete with Home** — Home = Primary Gym journey, Explore = alternative gym discovery & booking. Don't duplicate Home's hero/today content here.

---

### 14.3 CREDITS & WALLET PAGE

**Objective:** the user's financial and fitness access center, answering: **"How many credits do I have, what are they worth, and how am I using them?"** Full transparency on credits, cash balance, spending activity, and membership value, in a premium fintech style (CRED / Jupiter / Fi Money / Apple Wallet inspired).

#### Section 1 — Credit & Cash Overview

**Purpose:** instant overview of purchasing power.

**Fitness Credits content:** Available Credits · Fitness Value Equivalent · Membership Status · Membership Expiry.
**Cash Balance content:** Available Cash Balance · Spendable Amount · Cash Activity CTA.

**Example:**

`
1,250 Credits
≈ ₹12,500 Fitness Value
Membership Active
Valid Until 28 Jul 2026

₹450 Cash Balance
Available To Spend
[ View Cash Activities ]
`

**Design:** premium split card, credits and cash shown together, strong visual hierarchy, largest component on the screen.

(Reminder: the "≈ ₹12,500 Fitness Value" figure uses the fixed 1 Credit = ₹10 display constant from Section 3 — it's informational, not a spendable cash value. Don't let users confuse Fitness Value with Cash Balance in copy or layout.)

#### Section 2 — Quick Actions

**Purpose:** the most common wallet actions, without navigating away.

**Actions:** Convert Credits (↔ INR) · Buy Credits (purchase additional fitness credits) · How Credits Work (usage/expiry/rules education).

**Example:**

`
[ Convert Credits ]   [ Buy Credits ]   [ How Credits Work ]
`

**Design:** three equal-sized action cards, one-tap access, fintech-inspired layout.

(Convert Credits should clearly use the ₹8-per-credit outside-gym conversion rate from Section 3, distinct from the ₹10 in-gym value — make this distinction visible in the conversion UI, not just in a tooltip.)

#### Section 3 — Monthly Activity

**Purpose:** show the value the user is getting from their membership.

**Content:** Workouts Completed · Credits Used · Money Saved.

**Example:**

`
14                    180 Credits Used         ₹1,450 Saved
Workouts Completed                             Compared To Pay-Per-Visit
`

**Design:** three-card horizontal layout, quick-glance metrics, positive reinforcement.

#### Section 4 — Recent Transactions

**Purpose:** complete transparency for all wallet activity.

**Transaction types:**

- **Gym Check-In** — credits deducted after workout
- **Credit Purchase** — credits added to wallet
- **Credit Conversion** — credits converted to cash
- **Membership Renewal** — subscription-based credit allocation
- **Bonus Credits** — rewards/promotional credits

**Example:**

`
Gym Check-In
Iron Paradise Fitness
-20 Credits
Today, 8:45 AM

Credit Purchase
+100 Credits
20 May, 11:30 AM

Membership Renewal
+1000 Credits
01 May, 10:00 AM
`

**Design:** transaction ledger layout, category icons, gain/loss visually highlighted, "View All" CTA.

#### Credits Page Visual Style

White background · premium gradients · glassmorphism accents · soft shadows · large balance typography · minimal clutter · clear transaction visibility · 24–32px corner radius. Inspired by CRED, Jupiter, Fi Money, Apple Wallet.

#### Credits Page User-Psychology Checklist

Every section must answer one of:

1. How many credits do I have?
2. How much cash do I have?
3. What can I do with my credits?
4. How much value am I getting from my membership?
5. Where are my credits being spent?

Any section that doesn't improve wallet transparency, credit management, or membership-value perception should not appear here.

---

## 15. UNIFIED DESIGN SYSTEM NOTES

The three screens share a visual language; keep it consistent app-wide rather than re-deriving per screen:

- **Base:** white background, soft shadows, 24–32px corner radius, large/confident typography, generous spacing.
- **Glassmorphism** for cards that represent "access" or "status" (Hero Access Card, Today, Credit & Cash Overview).
- **Emerald gradient** = primary access/hero context (Home Hero Card).
- **Gold accents** = premium positioning (Explore's Premium Facilities).
- **Green** = savings/value framing (Explore's Best Value, Credits' Money Saved).
- **Lock iconography + muted/greyed styling** = informational-only, not bookable (Explore's Near Your Primary Gym, Home's locked Fitness Tools).
- **Fintech-specific extras for Credits/Wallet only:** premium gradients, glassmorphism accents tuned toward CRED/Jupiter/Apple-Wallet rather than Whoop/Oura — it's allowed to feel slightly more "banking app" than the rest of ZonoFit, intentionally.

When in doubt about which visual treatment a new component should get, match it to the closest analog above rather than inventing a new style.

---

## 16. UI IMPLEMENTATION RULES (VERY IMPORTANT)

For any UI-related task:

- The goal is to **replicate the provided design exactly**.
- Match the UI **pixel-perfectly**.

When the user provides a design image, you MUST: match layout exactly, match spacing and padding, match font sizes and hierarchy, match colors precisely, match border radius and shadows, match alignment and positioning, match proportions of elements, replicate all visible UI elements.

Do not approximate. Do not simplify unless explicitly asked. When no design image is provided, build to the written specs in Section 14/15 above.

---

## 17. IMAGE GENERATION RULES

If the user enables image generation:

- Generate images that are **visually identical or extremely close** to the provided UI reference.
- Do not change style, colors, or composition.
- Keep consistency with the ZonoFit design system (Section 15).

After generating images, place them inside `assets/` with clear, organized naming, e.g.:

```txt
assets/images/
  gym-card-placeholder.png
  badge-50-workouts.png
  journey-mountain-bg.png
  empty-state-no-bookings.png
```

---

## 18. STYLING RULES

Use NativeWind Tailwind classes for styling strictly. Don't use `StyleSheet` unless the thing genuinely isn't stylable with Tailwind classnames.

Prioritize clean, readable mobile UI. When building from an attached design image: match spacing closely, match typography hierarchy, match border radius and shadows, match layout structure, use consistent reusable styles, make the UI responsive across screen sizes.

Prefer reusable class patterns through utilities in `global.css`. If there isn't a utility and you see the opportunity, create one in `global.css` following BEM naming.

Avoid large inline styles unless required.

### NativeWind Version Rule

Use the NativeWind version already installed in this app.

Before implementing styling or NativeWind-related code:

- Check the current NativeWind version in `package.json`.
- Follow the syntax, setup, and patterns supported by *that exact version*.
- Do not use APIs, config patterns, or examples from a different NativeWind version.
- Do not upgrade NativeWind unless the user explicitly approves it.

Refer to: <https://www.nativewind.dev/v5/llms-full.txt>

---

## 19. STYLE EXCEPTION RULES

Use `StyleSheet` or inline styles for these React Native components/scenarios instead of NativeWind/Tailwind classes:

| Component / Scenario | Why | Use Instead |
| --- | --- | --- |
| **SafeAreaView** | From `react-native` or `react-native-safe-area-context` — className not supported | Inline styles or `StyleSheet` |
| **Button** | Only supports `title`/`onPress` — can't customize background, border, padding | `TouchableOpacity` with custom styles |
| **KeyboardAvoidingView** | Behavior props not supported by className | Inline styles or `StyleSheet` |
| **Modal** | `visible`, `transparent` props | Inline styles |
| **ScrollView** | `contentContainerStyle`, `indicatorStyle` | `StyleSheet` |
| **TextInput** | Input-specific props like `underlineColorAndroid` | Inline styles |
| **Animated.View** | Animated style values | `StyleSheet` with animated values |
| **Dynamic styles** | Styles calculated at runtime (e.g. progress-bar fill %, gym-card image aspect) | `StyleSheet.create()` or inline |
| **Platform-specific** | iOS-only or Android-only props | Conditional inline styles |
| **Pressable/TouchableOpacity** | `style` prop for pressed states | `StyleSheet` |
| **Shadow (iOS/Android)** | Different shadow syntax per platform — relevant constantly here, given the soft-shadow design language | `StyleSheet` with platform checks |
| **Transform arrays** | Complex transform combinations (e.g. journey mountain illustration) | `StyleSheet` |
| **Z-index** | Sometimes needs explicit StyleSheet (e.g. lock overlay on Explore cards) | `StyleSheet` |

### SafeAreaView Example

```tsx
// ✅ CORRECT
import { SafeAreaView } from "react-native-safe-area-context";

function HomeScreen() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
      {/* content */}
    </SafeAreaView>
  );
}

// ❌ INCORRECT — do not use NativeWind/Tailwind classes
function HomeScreen() {
  return (
    <SafeAreaView className="flex-1 bg-white">{/* content */}</SafeAreaView>
  );
}
```

And similarly for the other components above. Otherwise, always stick to NativeWind utilities.

---

## 20. UI QUALITY BAR

The app should feel: playful where Habit Engine content lives, but more premium/serious where money and access live (Credits/Wallet), polished, friendly, mobile-first, visually close to the provided design references.

Use: rounded cards, soft shadows, clear spacing, progress indicators, friendly empty states, large touch targets, simple animations when useful.

---

## 21. IMAGE RULE

Use centralized image imports.

Before using any image asset:

1. Check if `constants/images.ts` exists.
2. If it does not exist, create it.
3. Import and export all app images from `constants/images.ts`.
4. Use images through the centralized object.

Example:

```ts
import gymPlaceholder from "@/assets/images/gym-card-placeholder.png";
import journeyMountain from "@/assets/images/journey-mountain-bg.png";

export const images = {
  gymPlaceholder,
  journeyMountain,
};
```

Use images like this:

```tsx
<Image source={images.gymPlaceholder} />
```

Do not require/import image assets directly inside screens or components unless there's a strong reason.

---

## 22. data/ — MOCK & REFERENCE CONTENT

Use this for hardcoded data while the backend is being built. Keep it typed.

```txt
data/
  gyms.ts          // gym listings used by Explore + Home's primary gym
  plans.ts         // membership plans/tiers
  badges.ts        // achievement badges for Journey/Momentum
  milestones.ts     // Journey stage/milestone definitions
  motivation.ts     // rotating quotes for Home's Motivation section
```

Design the data layer so the UI doesn't care whether `gyms.ts` is a static array today or an API response tomorrow — fetch through a hook (`useGyms()`, `useCredits()`, `useBookings()`) rather than importing the array directly into screens. That makes swapping mock data for the real API a `lib/api.ts` change, not a screen rewrite.

---

## 23. store/ — ZUSTAND

Use Zustand for global client state. Suggested stores for ZonoFit's MVP:

- `useMembershipStore` — plan, status, expiry date
- `useCreditsStore` — credit/cash balance (cache of server state — see caveat below)
- `useTodayStore` — today's booking state (Not Booked / Booked / Checked In)
- `useJourneyStore` — current month, identity stage, progress %, next milestone
- `useStreakStore` — day streak, total workouts, training hours
- `useExploreFiltersStore` — active search/filter state on Explore (Open Now, Strength, Cardio, CrossFit, radius)

Use local component state for temporary UI state (e.g. a modal being open). Persist with AsyncStorage where it makes sense — **except** balances/membership status, which should be refetched from the backend on screen focus rather than trusted purely from AsyncStorage, since they represent real money.

---

## 24. lib/ — HELPER FUNCTIONS

```txt
lib/
  api.ts
  cn.ts
  location.ts      // pending approval — see Section 10
  qrcode.ts         // pending approval — see Section 10
  payments.ts       // pending approval — see Section 10
```

Never expose secret keys in the mobile app.

---

## 25. STATE MANAGEMENT RULES

Use Zustand for global client state. Use local state for temporary UI state. Persist using AsyncStorage where it's safe to do so (Section 23 caveat applies).

---

## 26. TYPESCRIPT RULES

Use TypeScript strictly. Avoid `any`. Keep types simple and readable. Core domain types you'll likely need early:

```ts
type Gym = { id: string; name: string; distanceKm: number; rating: number; creditsPerVisit: number; verified: boolean; tags: string[]; availableSlots: number; };
type Membership = { plan: string; status: "active" | "expired" | "expiring_soon"; expiresAt: string; };
type CreditTransaction = { id: string; type: "check_in" | "purchase" | "conversion" | "renewal" | "bonus"; amount: number; gymName?: string; createdAt: string; };
type Booking = { id: string; gymId: string; status: "not_booked" | "booked" | "checked_in"; time?: string; };
type JourneyStage = { month: number; totalMonths: number; stageName: string; progressPercent: number; nextMilestone: string; };
```

---

## 27. FEATURE IMPLEMENTATION RULES

When the user asks to build a feature:

1. Read this file first.
2. Identify files to change.
3. Keep changes focused.
4. Do not rewrite unrelated code.
5. Follow existing patterns.
6. Ensure the feature works end-to-end.
7. Fix errors before finishing.
8. If the feature touches credits, bookings, or check-in, confirm where the trust boundary sits (Section 3 / 6) before writing the mutation logic.

---

## 28. BACKEND & SECURITY RULES

Use backend/serverless functions for anything that's a trust boundary:

- Credit balance reads/writes
- Credit purchase and credit↔INR conversion
- Booking creation and cancellation
- QR/OTP check-in validation
- Payment processing and webhooks

Never expose secrets (JWT secret key, payment provider keys, partner API keys) in the frontend. The client requests, displays, and optimistically reflects state — it never decides the outcome of a money or access-granting action.

---

## 29. CUSTOM AUTHENTICATION RULES

Use the custom session-based authentication system backed by PostgreSQL (Google + Phone, per MVP scope).

---

## 30. CONTENT & DATA RULES

Gym listings, plans, badges, and milestones can be hardcoded JSON/TS for now (see Section 22) while the backend is being built. Do not introduce a database in this mobile codebase — that's backend territory. Structure the data-fetching layer (`lib/api.ts` + hooks) so swapping mock data for live API calls later doesn't require touching screen components.

---

## 31. CODE SIMPLICITY RULES

Avoid overengineering. Refactor only when needed.

---

## 32. COMPONENT CREATION RULE

Only create reusable components when necessary. Ask if unsure.

---

## 33. LINTING AND VALIDATION

Run:

```bash
npm run lint
npm run typecheck
```

Fix errors.

---

## 34. COMMUNICATION STYLE

Be concise. Explain what changed and how to test it.

---

## 35. IMPORTANT CONSTRAINTS

- No client-side database for this codebase — backend owns persistence for anything financial/trust-sensitive.
- Credit balances, conversions, and check-in outcomes are always backend-confirmed, never purely client-computed.
- Use JSON/TS for mock gym/plan/badge content during early development (Section 22).
- Use Zustand for client state, AsyncStorage for safe-to-persist UI state.
- Backend only for secure operations: payments, credit math, check-in validation.
- Phase 2 features (Section 9) stay locked/stubbed unless explicitly requested.

---

## FINAL REMINDER

Before every feature implementation:

- Read this file.
- Follow it strictly.
- Keep credit/booking/check-in logic on the right side of the trust boundary (Sections 3, 6, 28).
- Build clean, simple code.
- Replicate the design system (Sections 14–15) exactly when designs are provided, and to spec when they aren't.
