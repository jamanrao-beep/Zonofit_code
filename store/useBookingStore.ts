import { create } from "zustand";
import { useCreditsStore } from "./useCreditsStore";
import { useUserStore } from "./useUserStore";

export type BookingStatus = "Not Booked" | "Booked" | "Checked In";

interface BookingState {
  bookingStatus: BookingStatus;
  bookedGymId: string | null;
  bookedGymName: string | null;
  bookedTime: string | null;
  bookedCost: number;
  
  // Actions
  bookVisit: (gymId: string, gymName: string, time: string, creditCost: number) => boolean;
  checkIn: () => boolean;
  cancelBooking: () => void;
}

export const useBookingStore = create<BookingState>((set, get) => ({
  bookingStatus: "Not Booked",
  bookedGymId: null,
  bookedGymName: null,
  bookedTime: null,
  bookedCost: 0,

  bookVisit: (gymId, gymName, time, creditCost) => {
    // Check if user already booked today
    if (get().bookingStatus !== "Not Booked") {
      return false;
    }

    // Try to deduct credits
    const success = useCreditsStore.getState().deductCredits(
      creditCost,
      `Workout Booking - ${gymName}`
    );

    if (!success) {
      return false; // Insufficient credits
    }

    set({
      bookingStatus: "Booked",
      bookedGymId: gymId,
      bookedGymName: gymName,
      bookedTime: time,
      bookedCost: creditCost,
    });
    return true;
  },

  checkIn: () => {
    const { bookingStatus, bookedGymName } = get();
    if (bookingStatus !== "Booked") {
      return false;
    }

    set({
      bookingStatus: "Checked In",
    });

    // Record workout in user store (streak, total workouts)
    useUserStore.getState().recordWorkout(1.5); // 1.5 hours default workout length
    useUserStore.getState().decrementVisits(); // decrement visits remaining from active plan
    
    return true;
  },

  cancelBooking: () => {
    const { bookingStatus, bookedGymName, bookedCost } = get();
    if (bookingStatus !== "Booked") {
      return;
    }

    // Refund credits
    useCreditsStore.getState().addTransaction(
      "credit",
      bookedCost,
      "credits",
      `Refund - Cancelled Booking - ${bookedGymName}`
    );
    
    // Add credits back
    useCreditsStore.setState((state) => ({
      credits: state.credits + bookedCost,
    }));

    set({
      bookingStatus: "Not Booked",
      bookedGymId: null,
      bookedGymName: null,
      bookedTime: null,
      bookedCost: 0,
    });
  },
}));
