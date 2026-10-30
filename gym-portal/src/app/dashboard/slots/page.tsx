"use client";

import GymGuard from "@/components/GymGuard";
import SlotEnquiry from "@/components/SlotEnquiry";
import { useEffect, useState } from "react";

type SlotRow = {
  slotId: string;
  startTime: string;
  endTime: string;
  capacity: number | null;
  isEnabled: boolean;
};

type GymSlots = {
  id: string;
  name: string;
  cappingMode: "DAILY_TOTAL" | "PER_SLOT";
  maxDailyVisits: number | null;
  maxSlotVisits: number | null;
  slots: SlotRow[];
};

export default function GymSlotsPage() {
  const [gyms, setGyms] = useState<GymSlots[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        const token = localStorage.getItem("zonofit_portal_token");
        const res = await fetch("/api/gyms/slots", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.message || "Could not load the schedule.");
          return;
        }
        setGyms(Array.isArray(data.gyms) ? data.gyms : []);
      } catch {
        setError("Could not reach the server.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return (
    <GymGuard>
      <div className="mx-auto w-full max-w-5xl min-w-0 space-y-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Slots</h1>
          <p className="mt-1 text-sm text-gray-600">
            The booking times ZonoFit has set for your gym. You can view them here.
          </p>
        </div>

        {loading ? (
          <p className="text-sm text-gray-500">Loading the schedule…</p>
        ) : error ? (
          <p className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
        ) : gyms.length === 0 ? (
          <p className="rounded-2xl border border-gray-100 bg-white px-4 py-6 text-sm text-gray-600">
            No active gym is linked to this login.
          </p>
        ) : (
          gyms.map((gym) => (
            <section key={gym.id} className="rounded-3xl border border-gray-100 bg-white p-4 sm:p-6 shadow-sm min-w-0">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <h2 className="text-lg font-bold text-gray-900 break-words">{gym.name}</h2>
                <p className="text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-100 rounded-full px-3 py-1 w-fit">
                  {gym.cappingMode === "PER_SLOT"
                    ? `${gym.maxSlotVisits ?? "—"} visits per slot`
                    : `${gym.maxDailyVisits ?? "—"} visits per day`}
                </p>
              </div>
              {gym.slots.length === 0 ? (
                <p className="mt-4 text-sm text-gray-600">
                  No slots are saved for this gym yet. Ask ZonoFit to add them.
                </p>
              ) : (
                <ul className="mt-4 divide-y divide-gray-100">
                  {gym.slots.map((slot) => (
                    <li key={slot.slotId} className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-900">
                          {slot.startTime}{slot.endTime ? ` – ${slot.endTime}` : ""}
                        </p>
                        <p className="text-xs text-gray-500">
                          {slot.capacity ? `Capacity ${slot.capacity}` : "Uses the gym visit cap"}
                        </p>
                      </div>
                      <span className={`text-xs font-bold w-fit rounded-full px-2.5 py-1 ${slot.isEnabled ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-500"}`}>
                        {slot.isEnabled ? "Open for booking" : "Closed"}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))
        )}

        <SlotEnquiry />
      </div>
    </GymGuard>
  );
}
