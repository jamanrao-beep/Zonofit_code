import { create } from "zustand";
import { apiFetch } from "@/lib/api";
import { useCreditsStore } from "./useCreditsStore";
import { useUserStore } from "./useUserStore";
import { useAuthStore } from "./useAuthStore";

export type BookingStatus = "Not Booked" | "Booked" | "Checked In";

export interface PastBooking {
  id: string;
  gymId: string;
  gymName: string;
  date: string;
  time: string;
  status: "Completed" | "Cancelled" | "Checked In";
  credits: number;
}

interface BookingState {
  bookingStatus: BookingStatus;
  bookingId: string | null;
  bookedGymId: string | null;
  bookedGymName: string | null;
  bookedDate: string | null;
  bookedVisitDateIso: string | null;
  bookedCreatedAt: string | null;
  bookedTime: string | null;
  bookedCost: number;
  pastBookings: PastBooking[];
  loading: boolean;
  appliedCoupon: { code: string; discountType: string; discountValue: number } | null;
  
  // Actions
  applyCoupon: (coupon: any) => void;
  clearCoupon: () => void;
  fetchBookings: (token: string) => Promise<void>;
  bookVisit: (gymId: string, gymName: string, date: string, time: string, creditCost: number, couponCode?: string) => Promise<boolean>;
  checkIn: () => Promise<boolean>;
  cancelBooking: () => Promise<void>;
  calculateRefund: () => { percentage: number; refundAmount: number } | null;
}

export const useBookingStore = create<BookingState>((set, get) => ({
  bookingStatus: "Not Booked",
  bookingId: null,
  bookedGymId: null,
  bookedGymName: null,
  bookedDate: null,
  bookedVisitDateIso: null,
  bookedCreatedAt: null,
  bookedTime: null,
  bookedCost: 0,
  pastBookings: [],
  loading: false,
  appliedCoupon: null,

  applyCoupon: (coupon) => set({ appliedCoupon: coupon }),
  clearCoupon: () => set({ appliedCoupon: null }),

  calculateRefund: () => {
    const { bookedVisitDateIso, bookedTime, bookedCreatedAt, bookedCost } = get();
    if (!bookedVisitDateIso || !bookedTime || !bookedCreatedAt) return null;

    const [startHour, startMinute] = bookedTime.split('-')[0].split(':').map(Number);
    const workoutTime = new Date(bookedVisitDateIso);
    workoutTime.setHours(startHour, startMinute, 0, 0);

    const now = new Date();
    const timeUntilWorkoutHours = (workoutTime.getTime() - now.getTime()) / (1000 * 60 * 60);
    const timeSinceBookingHours = (now.getTime() - new Date(bookedCreatedAt).getTime()) / (1000 * 60 * 60);

    let refundPercentage = 0;
    if (timeUntilWorkoutHours > 6) {
      // PRD Section 4 & 5: Early cancellation before 6 hours -> 80% credits refunded
      refundPercentage = 80;
    } else {
      // PRD Section 4 & 6: Late cancellation within 6 hours -> 0% credits refunded
      refundPercentage = 0;
    }

    return {
      percentage: refundPercentage,
      refundAmount: Math.floor(bookedCost * (refundPercentage / 100))
    };
  },

  fetchBookings: async (token) => {
    set({ loading: true });
    try {
      const data = await apiFetch("/api/bookings", { token });
      const bookings = data.bookings || [];
      
      const past = bookings
        .filter((b: any) => ["COMPLETED", "CHECKED_IN", "CANCELLED"].includes(b.status))
        .map((b: any) => ({
          id: b.id,
          gymId: b.gymId,
          gymName: b.gym.name,
          date: new Date(b.visitDate).toLocaleDateString(),
          time: b.timeSlot,
          status: b.status === "CANCELLED" ? "Cancelled" : (b.status === "COMPLETED" ? "Completed" : "Checked In"),
          credits: b.creditsDeducted
        }));

      const upcoming = bookings.find((b: any) => b.status === "PENDING" || b.status === "CONFIRMED");
      
      if (upcoming) {
        set({
          bookingStatus: "Booked",
          bookingId: upcoming.id,
          bookedGymId: upcoming.gymId,
          bookedGymName: upcoming.gym.name,
          bookedDate: new Date(upcoming.visitDate).toLocaleDateString(),
          bookedVisitDateIso: upcoming.visitDate,
          bookedCreatedAt: upcoming.createdAt,
          bookedTime: upcoming.timeSlot,
          bookedCost: upcoming.creditsDeducted,
          pastBookings: past,
          loading: false
        });
      } else {
        set({
          bookingStatus: "Not Booked",
          bookingId: null,
          bookedGymId: null,
          bookedGymName: null,
          bookedDate: null,
          bookedVisitDateIso: null,
          bookedCreatedAt: null,
          bookedTime: null,
          bookedCost: 0,
          pastBookings: past,
          loading: false
        });
      }
    } catch (err: any) {
      console.warn("Failed to fetch bookings:", err?.message || err);
      set({ loading: false });
    }
  },

  bookVisit: async (gymId, gymName, date, time, creditCost, couponCode) => {
    if (get().bookingStatus !== "Not Booked") {
      return false;
    }

    const availableCredits = useCreditsStore.getState().credits;
    if (availableCredits < creditCost) {
      console.warn("[Booking] Insufficient credits:", { availableCredits, creditCost });
      return false;
    }

    try {
      const token = useAuthStore.getState().token;
      let bookingId = "bk_" + Date.now();
      let visitDateIso = new Date(date).toISOString();
      let deductedCost = creditCost;

      if (token) {
        try {
          const data = await apiFetch("/api/bookings", {
            method: "POST",
            token,
            body: JSON.stringify({
              gymId,
              visitDate: visitDateIso,
              timeSlot: time,
              couponCode,
            }),
          });
          if (data?.booking?.id) {
            bookingId = data.booking.id;
            visitDateIso = data.booking.visitDate;
            deductedCost = data.booking.creditsDeducted ?? creditCost;
          }
        } catch (apiErr: any) {
          console.warn("[Booking] Remote API notice, processing local authoritative booking & credit deduction:", apiErr?.message);
        }
      }

      // CRITICAL: Always cut credits from wallet immediately
      await useCreditsStore.getState().deductCredits(
        deductedCost,
        `Workout Booking - ${gymName}`
      );

      set({
        bookingStatus: "Booked",
        bookingId,
        bookedGymId: gymId,
        bookedGymName: gymName,
        bookedDate: date,
        bookedVisitDateIso: visitDateIso,
        bookedCreatedAt: new Date().toISOString(),
        bookedTime: time,
        bookedCost: deductedCost,
        appliedCoupon: null,
      });

      return true;
    } catch (err) {
      console.error("Failed to book visit:", err);
      return false;
    }
  },

  checkIn: async () => {
    // The actual API call is done in scan-modal.tsx to /api/checkin/verify.
    // This just updates the local state post-verification.
    const { bookingStatus, bookedGymId, bookedGymName, pastBookings } = get();
    if (bookingStatus !== "Booked" || !bookedGymId || !bookedGymName) {
      return false;
    }

    set({
      bookingStatus: "Checked In",
      pastBookings: [
        {
          id: Date.now().toString(),
          gymId: bookedGymId,
          gymName: bookedGymName,
          date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
          time: new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }),
          status: "Completed",
          credits: get().bookedCost,
        },
        ...pastBookings,
      ],
    });

    // Record workout in user store (streak, total workouts)
    useUserStore.getState().recordWorkout(1.5); // 1.5 hours default workout length
    useUserStore.getState().decrementVisits(); // decrement visits remaining from active plan
    
    // Update membership completed visits in credits store for instant Journey sync
    const currentMembership = useCreditsStore.getState().membershipInfo;
    if (currentMembership) {
      useCreditsStore.setState({
        membershipInfo: {
          ...currentMembership,
          completedVisits: (currentMembership.completedVisits || 0) + 1,
          mandatoryVisitsRemaining: Math.max(0, (currentMembership.mandatoryVisitsRemaining || 0) - 1),
        }
      });
    }
    
    return true;
  },

  cancelBooking: async () => {
    const { bookingStatus, bookedGymName, bookedCost, bookingId, bookedGymId } = get();
    if (bookingStatus !== "Booked" || !bookingId) {
      return;
    }

    try {
      const token = useAuthStore.getState().token;
      const response = await apiFetch(`/api/bookings/${bookingId}`, { method: "DELETE", token });
      
      const refundedCredits = response.refundedCredits ?? 0;

      // Refund credits
      if (refundedCredits > 0) {
        useCreditsStore.getState().addTransaction(
          "credit",
          refundedCredits,
          "credits",
          `Refund - Cancelled Booking - ${bookedGymName}`
        );
        
        // Add credits back
        useCreditsStore.setState((state) => ({
          credits: state.credits + refundedCredits,
        }));
      }

      set((state) => ({
        bookingStatus: "Not Booked",
        bookingId: null,
        bookedGymId: null,
        bookedGymName: null,
        bookedDate: null,
        bookedTime: null,
        bookedCost: 0,
        pastBookings: [
          {
            id: Date.now().toString(),
            gymId: bookedGymId!,
            gymName: bookedGymName!,
            date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
            time: "Cancelled",
            status: "Cancelled",
            credits: bookedCost, // Store original cost in history, or maybe refundedCredits. Usually original cost is kept for display.
          },
          ...state.pastBookings,
        ],
      }));
    } catch (err) {
      console.error("Failed to cancel booking:", err);
    }
  },
}));
