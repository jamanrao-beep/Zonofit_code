"use client";

import GymGuard from "@/components/GymGuard";
import SlotEnquiry from "@/components/SlotEnquiry";
import { useEffect, useState } from "react";

type Visitor = {
  bookingId: string;
  name: string;
  status: string;
  passCode: string;
  timeSlot: string;
};

type SlotVisitors = {
  slotId: string;
  startTime: string;
  endTime: string;
  capacity: number | null;
  isEnabled: boolean;
  booked: number;
  visitors: Visitor[];
};

type GymToday = {
  id: string;
  name: string;
  cappingMode: "DAILY_TOTAL" | "PER_SLOT";
  maxDailyVisits: number | null;
  maxSlotVisits: number | null;
  bookedToday: number;
  checkedInToday: number;
  slots: SlotVisitors[];
  otherTimes: { timeSlot: string; booked: number; visitors: Visitor[] }[];
};

const STATUS_LABEL: Record<string, string> = {
  PENDING: "Pending",
  CONFIRMED: "Booked",
  CHECKED_IN: "Checked in",
  COMPLETED: "Completed",
};

function deskCode(bookingId: string): string {
  const tail = bookingId.replace(/[^a-zA-Z0-9]/g, "").slice(-6).toUpperCase();
  return tail.length === 6 ? `ZF-${tail}` : bookingId;
}

function capLabel(gym: GymToday, slot: SlotVisitors): string | null {
  if (slot.capacity && slot.capacity > 0) return `${slot.booked} of ${slot.capacity}`;
  if (gym.cappingMode === "PER_SLOT" && gym.maxSlotVisits) return `${slot.booked} of ${gym.maxSlotVisits}`;
  return null;
}

function VisitorList({
  visitors,
  onUndo,
  onConfirm,
  busyId,
  isToday = true,
}: {
  visitors: Visitor[];
  onUndo: (bookingId: string) => void;
  onConfirm: (bookingId: string) => void;
  busyId: string | null;
  isToday?: boolean;
}) {
  if (visitors.length === 0) {
    return <p className="text-sm text-gray-500">Nobody is booked for this time.</p>;
  }
  return (
    <ul className="mt-3 space-y-2">
      {visitors.map((visitor) => (
        <li key={visitor.bookingId} className="rounded-2xl bg-gray-50 px-3.5 py-3 min-w-0">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-semibold text-gray-900 break-words">{visitor.name}</p>
              <p className="mt-0.5 text-xs font-semibold text-gray-500">Code: {deskCode(visitor.bookingId)}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ${
                visitor.status === "CHECKED_IN" || visitor.status === "COMPLETED"
                  ? "bg-emerald-100 text-emerald-800"
                  : "bg-amber-50 text-amber-800"
              }`}>
                {STATUS_LABEL[visitor.status] || visitor.status}
              </span>
              {visitor.status === "CHECKED_IN" ? (
                <button
                  type="button"
                  onClick={() => onUndo(visitor.bookingId)}
                  disabled={busyId === visitor.bookingId}
                  className="text-[11px] font-semibold text-gray-600 hover:text-red-700 hover:bg-red-50 px-2.5 py-1 rounded-lg border border-gray-200 hover:border-red-200 transition-colors disabled:opacity-50 cursor-pointer"
                  title="Undo this check-in"
                >
                  {busyId === visitor.bookingId ? "Undoing…" : "Undo"}
                </button>
              ) : visitor.status === "CONFIRMED" ? (
                isToday ? (
                  <button
                    type="button"
                    onClick={() => onConfirm(visitor.bookingId)}
                    disabled={busyId === visitor.bookingId}
                    className="text-[11px] font-semibold text-white bg-emerald-700 hover:bg-emerald-800 px-3 py-1 rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    {busyId === visitor.bookingId ? "Checking…" : "Check In"}
                  </button>
                ) : (
                  <span className="text-[11px] font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-lg">
                    Scheduled
                  </span>
                )
              ) : null}
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}

export default function TodayVisitorsPage() {
  const [selectedOffset, setSelectedOffset] = useState<number>(0);
  const [isToday, setIsToday] = useState(true);
  const [dateLabel, setDateLabel] = useState("");
  const [gyms, setGyms] = useState<GymToday[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const load = async (offset = selectedOffset) => {
    setLoading(true);
    try {
      const token = localStorage.getItem("zonofit_portal_token");
      const res = await fetch(`/api/gyms/today-visitors?offset=${offset}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || "Could not load visitors.");
        return;
      }
      setDateLabel(typeof data.date === "string" ? data.date : "");
      setIsToday(data.isToday ?? (offset === 0));
      setGyms(Array.isArray(data.gyms) ? data.gyms : []);
    } catch {
      setError("Could not reach the server.");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectOffset = (offset: number) => {
    setSelectedOffset(offset);
    load(offset);
  };

  useEffect(() => {
    load(0);
  }, []);

  const handleConfirm = async (bookingId: string) => {
    setBusyId(bookingId);
    setFeedback(null);
    try {
      const token = localStorage.getItem("zonofit_portal_token");
      const res = await fetch("/api/checkin/staff", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ passCode: bookingId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFeedback({ type: "error", text: data.message || "Could not check in." });
      } else {
        setFeedback({ type: "success", text: data.message || "Checked in successfully." });
        load();
      }
    } catch {
      setFeedback({ type: "error", text: "Could not reach the server." });
    } finally {
      setBusyId(null);
    }
  };

  const handleUndo = async (bookingId: string) => {
    setBusyId(bookingId);
    setFeedback(null);
    try {
      const token = localStorage.getItem("zonofit_portal_token");
      const res = await fetch("/api/checkin/undo", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ bookingId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFeedback({ type: "error", text: data.message || "Could not undo check-in." });
      } else {
        setFeedback({ type: "success", text: data.message || "Check-in undone successfully." });
        load();
      }
    } catch {
      setFeedback({ type: "error", text: "Could not reach the server." });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <GymGuard>
      <div className="mx-auto w-full max-w-5xl min-w-0 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
              {selectedOffset === 0
                ? "Today's visitors"
                : selectedOffset === 1
                ? "Tomorrow's visitors"
                : "Day after tomorrow's visitors"}
            </h1>
            <p className="mt-1 text-sm text-gray-600">
              {dateLabel ? dateLabel : "Visitors"} · booked visits by slot, for you to verify at the desk.
            </p>
          </div>

          {/* Top Right Date Switcher */}
          <div className="inline-flex items-center p-1 bg-gray-100/90 rounded-2xl border border-gray-200 self-start sm:self-auto shrink-0 shadow-xs">
            <button
              type="button"
              onClick={() => handleSelectOffset(0)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                selectedOffset === 0
                  ? "bg-white text-emerald-800 shadow-xs"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => handleSelectOffset(1)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                selectedOffset === 1
                  ? "bg-white text-emerald-800 shadow-xs"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Tomorrow
            </button>
            <button
              type="button"
              onClick={() => handleSelectOffset(2)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                selectedOffset === 2
                  ? "bg-white text-emerald-800 shadow-xs"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Day After
            </button>
          </div>
        </div>

        {feedback ? (
          <p
            className={`rounded-2xl border px-4 py-3 text-sm font-semibold ${
              feedback.type === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                : "border-red-200 bg-red-50 text-red-900"
            }`}
          >
            {feedback.text}
          </p>
        ) : null}

        {loading ? (
          <p className="text-sm text-gray-500">Loading bookings…</p>
        ) : error ? (
          <p className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
        ) : (
          gyms.map((gym) => (
            <section key={gym.id} className="space-y-3 min-w-0">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-3xl bg-white border border-gray-100 p-4 shadow-sm min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                    {selectedOffset === 0 ? "Booked today" : selectedOffset === 1 ? "Booked tomorrow" : "Booked visits"}
                  </p>
                  <p className="mt-1 text-3xl font-bold text-gray-900">{gym.bookedToday}</p>
                  <p className="text-xs text-gray-500 truncate">{gym.name}</p>
                </div>
                <div className="rounded-3xl bg-white border border-gray-100 p-4 shadow-sm min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Checked in</p>
                  <p className="mt-1 text-3xl font-bold text-emerald-700">{gym.checkedInToday}</p>
                  {gym.maxDailyVisits && gym.cappingMode === "DAILY_TOTAL" ? (
                    <p className="text-xs text-gray-500">Day cap {gym.maxDailyVisits}</p>
                  ) : (
                    <p className="text-xs text-gray-500">Verified at the gym</p>
                  )}
                </div>
              </div>

              {gym.slots.length === 0 && gym.otherTimes.length === 0 ? (
                <p className="rounded-3xl border border-gray-100 bg-white px-4 py-6 text-sm text-gray-600">
                  {selectedOffset === 0
                    ? "No visits are booked today, and no slots are saved for this gym yet."
                    : selectedOffset === 1
                    ? "No visits are booked for tomorrow yet."
                    : "No visits are booked for this day yet."}
                </p>
              ) : null}

              {gym.slots.map((slot) => {
                const fill = capLabel(gym, slot);
                return (
                  <article key={slot.slotId} className="rounded-3xl border border-gray-100 bg-white p-4 sm:p-5 shadow-sm min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h2 className="text-base font-bold text-gray-900 break-words">
                          {slot.startTime}{slot.endTime ? ` – ${slot.endTime}` : ""}
                        </h2>
                        <p className="text-xs text-gray-500">
                          <span className={`font-semibold ${slot.isEnabled ? "text-emerald-700" : "text-red-600"}`}>
                            {slot.isEnabled ? "Open" : "Closed"}
                          </span>
                          {fill ? ` · ${fill}` : ""}
                        </p>
                      </div>
                      <p className="text-2xl font-bold text-gray-900 shrink-0">{slot.booked}</p>
                    </div>
                    <VisitorList
                      visitors={slot.visitors}
                      onUndo={handleUndo}
                      onConfirm={handleConfirm}
                      busyId={busyId}
                      isToday={isToday}
                    />
                  </article>
                );
              })}

              {gym.otherTimes.map((group) => (
                <article key={group.timeSlot} className="rounded-3xl border border-amber-100 bg-white p-4 sm:p-5 shadow-sm min-w-0">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="text-base font-bold text-gray-900 break-words">{group.timeSlot}</h2>
                      <p className="text-xs text-amber-800">Booked outside the saved slot list</p>
                    </div>
                    <p className="text-2xl font-bold text-gray-900 shrink-0">{group.booked}</p>
                  </div>
                  <VisitorList
                    visitors={group.visitors}
                    onUndo={handleUndo}
                    onConfirm={handleConfirm}
                    busyId={busyId}
                    isToday={isToday}
                  />
                </article>
              ))}
            </section>
          ))
        )}

        <SlotEnquiry />
      </div>
    </GymGuard>
  );
}
