/** Rules the booking flow actually applies. Shown before and after a visit is booked. */
export const VISIT_RULES = [
  {
    icon: "time-outline" as const,
    title: "Your slot",
    summary: "A visit is valid only during the slot you booked.",
    detail:
      "Check in during the slot you booked. The slot can be longer than one hour when the gym sets it that way. When that slot ends, the visit expires. Check-in closes, and the pass moves to your history.",
  },
  {
    icon: "hourglass-outline" as const,
    title: "Missed visit",
    summary: "If the slot ends before check-in, the visit expires and what you used stays used.",
    detail:
      "If you do not check in before the slot ends, the visit expires on its own. Credits already used, or the plan visit already used, are not returned.",
  },
  {
    icon: "id-card-outline" as const,
    title: "Desk check-in",
    summary: "Show your pass and desk code at the front desk. Staff confirm the visit.",
    detail:
      "Show your booking pass and desk code at the front desk when you arrive. Gym staff confirm the visit. The visit is not checked in from your phone.",
  },
  {
    icon: "calendar-outline" as const,
    title: "One booking",
    summary: "One active booking at a gym each day.",
    detail:
      "You can hold one active booking at a gym on a day. After you cancel it, or after the slot ends, you can book that gym again.",
  },
  {
    icon: "card-outline" as const,
    title: "Cancellation",
    summary: "Cancel more than 2 hours before the visit. A flat 2 credit fee applies.",
    detail:
      "You can cancel only more than 2 hours before the visit starts. A flat 2 credit fee applies. For a credit visit, 2 credits stay with ZonoFit and the rest returns to your wallet. For a plan visit, 2 credits are taken from your wallet and the visit returns to your plan. You need at least 2 credits to cancel a plan visit.",
  },
  {
    icon: "shirt-outline" as const,
    title: "Gym protocol",
    summary: "Clean footwear and gym attire are required.",
    detail:
      "Clean workout shoes and athletic attire are required. Carry a workout towel and re-rack equipment after use.",
  },
];
