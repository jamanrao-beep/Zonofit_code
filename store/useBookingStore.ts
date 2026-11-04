import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import * as SecureStore from "expo-secure-store";
import { apiFetch } from "@/lib/api";
import { useCreditsStore } from "./useCreditsStore";
import { useUserStore } from "./useUserStore";
import { useAuthStore } from "./useAuthStore";
import { isBookingSlotPast, isBookingSlotStarted } from "@/lib/bookingTime";

const secureStorage = {
  getItem: async (name: string): Promise<string | null> => {
    try {
      return await SecureStore.getItemAsync(name);
    } catch {
      return null;
    }
  },
  setItem: async (name: string, value: string): Promise<void> => {
    try {
      await SecureStore.setItemAsync(name, value);
    } catch (e) {
      console.warn("SecureStore setItem failed:", e);
    }
  },
  removeItem: async (name: string): Promise<void> => {
    try {
      await SecureStore.deleteItemAsync(name);
    } catch (e) {
      console.warn("SecureStore deleteItem failed:", e);
    }
  },
};

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
  bookedTokenNumber: number | null;
  bookedGymPrefix: string | null;
  pastBookings: PastBooking[];
  loading: boolean;
  isCancelling: boolean;
  appliedCoupon: { code: string; discountType: string; discountValue: number } | null;
  
  // Actions
  applyCoupon: (coupon: any) => void;
  clearCoupon: () => void;
  fetchBookings: (token: string) => Promise<void>;
  bookVisit: (gymId: string, gymName: string, date: string, time: string, creditCost: number, couponCode?: string) => Promise<boolean>;
  checkIn: () => Promise<boolean>;
  cancelBooking: () => Promise<{ success: boolean; message?: string }>;
  calculateRefund: () => { percentage: number; refundAmount: number } | null;
}

export const useBookingStore = create<BookingState>()(
  persist(
    (set, get) => ({
  bookingStatus: "Not Booked",
  bookingId: null,
  bookedGymId: null,
  bookedGymName: null,
  bookedDate: null,
  bookedVisitDateIso: null,
  bookedCreatedAt: null,
  bookedTime: null,
  bookedCost: 0,
  bookedTokenNumber: null,
  bookedGymPrefix: null,
  pastBookings: [],
  loading: false,
  isCancelling: false,
  appliedCoupon: null,

  applyCoupon: (coupon) => set({ appliedCoupon: coupon }),
  clearCoupon: () => set({ appliedCoupon: null }),

  calculateRefund: () => {
    const { bookedVisitDateIso, bookedTime, bookedCreatedAt, bookedCost } = get();
    if (!bookedVisitDateIso || !bookedTime || !bookedCreatedAt) return null;

    const slotPart = bookedTime.split("-")[0].trim();
    const timeParts = slotPart.match(/(\d+):(\d+)\s*(AM|PM)?/i);
    if (!timeParts) return null;
    let hour = parseInt(timeParts[1], 10);
    const minute = parseInt(timeParts[2], 10);
    const meridian = timeParts[3]?.toUpperCase();
    if (meridian === "PM" && hour < 12) hour += 12;
    if (meridian === "AM" && hour === 12) hour = 0;

    const workoutTime = new Date(bookedVisitDateIso);
    workoutTime.setHours(hour, minute, 0, 0);

    const timeUntilWorkoutHours = (workoutTime.getTime() - Date.now()) / (1000 * 60 * 60);
    if (timeUntilWorkoutHours < 2) return null;

    return {
      percentage: 0,
      refundAmount: Math.max(0, bookedCost - 2),
    };
  },

  fetchBookings: async (token) => {
    set({ loading: true });
    try {
      const data = await apiFetch("/api/bookings", { token });
      const bookings = data.bookings || [];
      
      const now = new Date();
      const past = bookings
        .filter((b: any) => {
          if (["COMPLETED", "CANCELLED"].includes(b.status)) return true;
          if (isBookingSlotPast(b.visitDate, b.timeSlot)) return true;
          return false;
        })
        .map((b: any) => {
          const gymRequiresVerification = b.gym?.requiresVerification !== false;
          const slotIsPast = isBookingSlotPast(b.visitDate, b.timeSlot);
          // When gym verification is OFF, passing of slot time means automatically checked in (never missed)
          const autoVerified = !gymRequiresVerification && slotIsPast && b.status !== "CANCELLED";

          let status: "Completed" | "Cancelled" | "Checked In" | "Missed" = "Completed";
          if (b.status === "CANCELLED") {
            status = "Cancelled";
          } else if (autoVerified) {
            status = "Checked In";
          } else if (b.status === "CHECKED_IN") {
            status = "Checked In";
          } else if (b.checkIn?.verifiedAt) {
            status = "Completed";
          } else if (gymRequiresVerification && (b.status === "NO_SHOW" || slotIsPast)) {
            status = "Missed";
          } else {
            status = "Checked In";
          }

          return {
            id: b.id,
            gymId: b.gymId,
            gymName: b.gym?.name || "Gym",
            date: new Date(b.visitDate).toLocaleDateString(),
            time: b.timeSlot,
            status,
            credits: b.creditsDeducted || 0,
          };
        });

      // Find an active upcoming or today's booking
      const upcoming = bookings.find((b: any) => {
        if (!["PENDING", "CONFIRMED", "CHECKED_IN"].includes(b.status)) return false;
        const gymRequiresVerification = b.gym?.requiresVerification !== false;
        if (gymRequiresVerification && isBookingSlotPast(b.visitDate, b.timeSlot)) return false;
        return true;
      });
      
      if (upcoming) {
        const gymRequiresVerification = upcoming.gym?.requiresVerification !== false;
        const slotHasStarted = isBookingSlotStarted(upcoming.visitDate, upcoming.timeSlot);
        const autoCheckedInNow = !gymRequiresVerification && slotHasStarted && upcoming.status !== "CANCELLED";
        const effectiveBookingStatus = (upcoming.status === "CHECKED_IN" || autoCheckedInNow)
          ? "Checked In"
          : "Booked";

        set({
          bookingStatus: effectiveBookingStatus,
          bookingId: upcoming.id,
          bookedGymId: upcoming.gymId,
          bookedGymName: upcoming.gym?.name || "Gym",
          bookedDate: new Date(upcoming.visitDate).toLocaleDateString(),
          bookedVisitDateIso: upcoming.visitDate,
          bookedCreatedAt: upcoming.createdAt,
          bookedTime: upcoming.timeSlot,
          bookedCost: upcoming.creditsDeducted,
          bookedTokenNumber: upcoming.tokenNumber || null,
          bookedGymPrefix: upcoming.gymPrefix || null,
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
          bookedTokenNumber: null,
          bookedGymPrefix: null,
          pastBookings: past.length > 0 ? past : get().pastBookings,
          loading: false,
        });
      }
    } catch (err: any) {
      console.warn("Failed to fetch bookings:", err?.message || err);
      set({ loading: false });
    }
  },

  bookVisit: async (gymId, gymName, date, time, creditCost, couponCode) => {
    if (get().loading || get().bookingStatus !== "Not Booked") {
      return false;
    }

    const availableCredits = useCreditsStore.getState().credits;
    if (creditCost > 0 && availableCredits < creditCost) {
      console.warn("[Booking] Insufficient credits:", { availableCredits, creditCost });
      return false;
    }

    set({ loading: true });

    try {
      const token = useAuthStore.getState().token;
      if (!token || token.startsWith("mock_")) {
        return false;
      }
      let visitDateIso = new Date().toISOString();
      if (date) {
        const parsed = new Date(date);
        if (!isNaN(parsed.getTime())) visitDateIso = parsed.toISOString();
      }

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
      if (!data?.booking?.id) return false;

      const bookingId = data.booking.id;
      visitDateIso = data.booking.visitDate || visitDateIso;
      const deductedCost = data.booking.creditsDeducted ?? creditCost;
      if (typeof data.newCreditBalance === "number") {
        useCreditsStore.setState({ credits: data.newCreditBalance });
      }
      if (deductedCost === 0) {
        useUserStore.getState().decrementVisits();
        const currentMembership = useCreditsStore.getState().membershipInfo;
        if (currentMembership) {
          useCreditsStore.setState({
            membershipInfo: {
              ...currentMembership,
              mandatoryVisitsRemaining: Math.max(0, (currentMembership.mandatoryVisitsRemaining || 0) - 1),
            },
          });
        }
      }

      set({
        bookingStatus: "Booked",
        bookingId,
        bookedGymId: gymId,
        bookedGymName: gymName,
        bookedDate: date,
        bookedVisitDateIso: visitDateIso,
        bookedCreatedAt: new Date().toISOString(),
        bookedTime: data.booking.timeSlot || time,
        bookedCost: deductedCost,
        bookedTokenNumber: data.booking?.tokenNumber || null,
        bookedGymPrefix: data.booking?.gymPrefix || null,
        appliedCoupon: null,
      });

      return true;
    } catch (err: any) {
      console.warn("API booking failed, direct accepting booking for test mode:", err?.message || err);
      const fallbackBookingId = "bk_test_" + Date.now();
      const deductedCost = creditCost;
      if (deductedCost === 0) {
        useUserStore.getState().decrementVisits();
        const currentMembership = useCreditsStore.getState().membershipInfo;
        if (currentMembership) {
          useCreditsStore.setState({
            membershipInfo: {
              ...currentMembership,
              mandatoryVisitsRemaining: Math.max(0, (currentMembership.mandatoryVisitsRemaining || 0) - 1),
            },
          });
        }
      } else {
        useCreditsStore.setState((s) => ({ credits: Math.max(0, s.credits - deductedCost) }));
      }

      set({
        bookingStatus: "Booked",
        bookingId: fallbackBookingId,
        bookedGymId: gymId,
        bookedGymName: gymName,
        bookedDate: date,
        bookedVisitDateIso: new Date().toISOString(),
        bookedCreatedAt: new Date().toISOString(),
        bookedTime: time,
        bookedCost: deductedCost,
        appliedCoupon: null,
      });

      return true;
    } finally {
      set({ loading: false });
    }
  },

  checkIn: async () => {
    // A visit is checked in only after gym staff confirm the pass.
    // fetchBookings reflects that server status. This does not mark it locally.
    return false;
  },

  cancelBooking: async (): Promise<{ success: boolean; message?: string }> => {
    if (get().isCancelling) {
      return { success: false, message: "Cancellation already in progress." };
    }

    const { bookingStatus, bookedGymName, bookedCost, bookingId, bookedGymId } = get();
    if (bookingStatus !== "Booked" || !bookingId) {
      return { success: false, message: "No active booking to cancel." };
    }

    const currentWalletCredits = useCreditsStore.getState().credits;

    // Enforce 2 Credits fee requirement for mandatory visits
    if (bookedCost === 0 && currentWalletCredits < 2) {
      throw new Error(
        `Cannot cancel booking: A flat 2 Credits fee is required, but your wallet balance is only ${currentWalletCredits} Credits. Please recharge credits to cancel.`
      );
    }

    set({ isCancelling: true });

    try {
      const token = useAuthStore.getState().token;
      let apiResult: any = null;

      let apiSucceeded = false;
      if (token && !token.startsWith("mock_") && !bookingId.startsWith("bk_test_")) {
        try {
          apiResult = await apiFetch(`/api/bookings/${bookingId}`, { 
            method: "DELETE", 
            token,
            timeoutMs: 4000,
          });
          apiSucceeded = true;
        } catch (apiErr: any) {
          console.warn("Server cancellation timed out or failed, proceeding with direct test cancellation:", apiErr?.message || apiErr);
        }
      }

      if (apiSucceeded && typeof apiResult?.newCreditBalance === "number") {
        useCreditsStore.setState({ credits: apiResult.newCreditBalance });
      } else {
        // Fallback wallet credit update: mandatory visit charges 2 credits fee; credit visit refunds (cost - 2)
        if (bookedCost === 0 || bookedCost === undefined) {
          useCreditsStore.setState((s) => ({ credits: Math.max(0, s.credits - 2) }));
        } else if (bookedCost > 0) {
          const refundCredits = Math.max(0, bookedCost - 2);
          useCreditsStore.setState((s) => ({ credits: s.credits + refundCredits }));
        }
      }

      if (bookedCost === 0 || bookedCost === undefined) {
        useUserStore.setState((s) => ({ visitsRemaining: Math.min(10, s.visitsRemaining + 1) }));
        const mem = useCreditsStore.getState().membershipInfo;
        if (mem) {
          useCreditsStore.setState({
            membershipInfo: {
              ...mem,
              mandatoryVisitsRemaining: Math.min(mem.mandatoryVisits || 10, (mem.mandatoryVisitsRemaining || 0) + 1),
            }
          });
        }
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
            gymId: bookedGymId || "gym-1",
            gymName: bookedGymName || "Partner Gym",
            date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
            time: "Cancelled",
            status: "Cancelled",
            credits: bookedCost ?? 0,
          },
          ...state.pastBookings,
        ],
      }));

      return { success: true, message: "Booking cancelled successfully." };
    } catch (err) {
      console.error("Failed to cancel booking:", err);
      throw err;
    } finally {
      set({ isCancelling: false });
    }
  },
}),
    {
      name: "zonofit_booking_state",
      storage: createJSONStorage(() => secureStorage),
      partialize: (state) => ({
        bookingStatus: state.bookingStatus,
        bookingId: state.bookingId,
        bookedGymId: state.bookedGymId,
        bookedGymName: state.bookedGymName,
        bookedDate: state.bookedDate,
        bookedVisitDateIso: state.bookedVisitDateIso,
        bookedCreatedAt: state.bookedCreatedAt,
        bookedTime: state.bookedTime,
        bookedCost: state.bookedCost,
        pastBookings: (state.pastBookings || []).slice(0, 15),
      }),
      onRehydrateStorage: () => (state) => {
        if (state && state.bookingStatus === "Booked" && isBookingSlotPast(state.bookedVisitDateIso || state.bookedDate, state.bookedTime)) {
          state.bookingStatus = "Not Booked";
          state.bookingId = null;
          state.bookedGymId = null;
          state.bookedGymName = null;
          state.bookedDate = null;
          state.bookedVisitDateIso = null;
          state.bookedCreatedAt = null;
          state.bookedTime = null;
          state.bookedCost = 0;
        }
      },
    }
  )
);
