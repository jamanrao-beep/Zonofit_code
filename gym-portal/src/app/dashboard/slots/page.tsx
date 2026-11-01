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
  const [busyId, setBusyId] = useState("");
  const [note, setNote] = useState("");
  const [toggleError, setToggleError] = useState("");

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

  const toggleSlot = async (gymId: string, slot: SlotRow) => {
    if (busyId) return;
    const next = !slot.isEnabled;
    setBusyId(slot.slotId);
    setNote("");
    setToggleError("");
    setGyms((current) => current.map((gym) => (
      gym.id !== gymId
        ? gym
        : { ...gym, slots: gym.slots.map((row) => (row.slotId === slot.slotId ? { ...row, isEnabled: next } : row)) }
    )));
    try {
      const token = localStorage.getItem("zonofit_portal_token");
      const res = await fetch(`/api/gyms/slots/${encodeURIComponent(slot.slotId)}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ gymId, isEnabled: next }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Could not update that slot.");
      setNote(typeof data.message === "string" ? data.message : "");
    } catch (err) {
      setGyms((current) => current.map((gym) => (
        gym.id !== gymId
          ? gym
          : { ...gym, slots: gym.slots.map((row) => (row.slotId === slot.slotId ? { ...row, isEnabled: slot.isEnabled } : row)) }
      )));
      setToggleError(err instanceof Error ? err.message : "Could not update that slot.");
    } finally {
      setBusyId("");
    }
  };

  return (
    <GymGuard>
      <div className="mx-auto w-full max-w-5xl min-w-0 space-y-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Slots</h1>
          <p className="mt-1 text-sm text-gray-600">
            Turn a booking time on or off. A closed time is hidden from new bookings. Visits already booked stay. To add or change a time, send an enquiry below.
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
                    <li key={slot.slotId} className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-900">
                          {slot.startTime}{slot.endTime ? ` – ${slot.endTime}` : ""}
                        </p>
                        <p className="text-xs text-gray-500">
                          {slot.capacity ? `Capacity ${slot.capacity}` : "Uses the gym visit cap"}
                        </p>
                      </div>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={slot.isEnabled}
                        aria-label={`${slot.isEnabled ? "Close" : "Open"} ${slot.startTime}`}
                        disabled={busyId === slot.slotId}
                        onClick={() => toggleSlot(gym.id, slot)}
                        className="inline-flex items-center gap-3 self-start rounded-full border border-gray-200 bg-gray-50 px-2 py-1.5 pr-3 disabled:opacity-60"
                      >
                        <span className={`relative h-7 w-12 rounded-full transition-colors ${slot.isEnabled ? "bg-emerald-600" : "bg-gray-300"}`}>
                          <span className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform ${slot.isEnabled ? "translate-x-5" : "translate-x-0.5"}`} />
                        </span>
                        <span className={`text-xs font-bold ${slot.isEnabled ? "text-emerald-800" : "text-gray-500"}`}>
                          {busyId === slot.slotId ? "Saving" : slot.isEnabled ? "Open" : "Closed"}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))
        )}

        {toggleError ? (
          <p className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">{toggleError}</p>
        ) : null}
        {note ? (
          <p className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{note}</p>
        ) : null}

        <SlotEnquiry />
      </div>
    </GymGuard>
  );
}
