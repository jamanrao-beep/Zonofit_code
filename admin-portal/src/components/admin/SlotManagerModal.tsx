"use client";

import { useEffect, useState } from "react";
import { Clock, Plus, Trash2, X } from "lucide-react";

type SlotDraft = {
  slotId: string;
  startTime: string;
  endTime: string;
  capacity: string;
  isEnabled: boolean;
};

function readSlots(raw: unknown): SlotDraft[] {
  let parsed = raw;
  if (typeof raw === "string" && raw.trim()) {
    try { parsed = JSON.parse(raw); } catch { return []; }
  }
  if (!Array.isArray(parsed)) return [];
  return parsed.flatMap((row, index) => {
    if (!row || typeof row !== "object") return [];
    const slot = row as { slotId?: unknown; startTime?: unknown; endTime?: unknown; capacity?: unknown; isEnabled?: unknown };
    const startTime = typeof slot.startTime === "string" ? slot.startTime : "";
    if (!startTime.trim()) return [];
    return [{
      slotId: typeof slot.slotId === "string" && slot.slotId ? slot.slotId : `slot-${index + 1}`,
      startTime,
      endTime: typeof slot.endTime === "string" ? slot.endTime : "",
      capacity: slot.capacity === null || slot.capacity === undefined || slot.capacity === "" ? "" : String(slot.capacity),
      isEnabled: slot.isEnabled !== false,
    }];
  });
}

export default function SlotManagerModal({
  gym,
  onClose,
  onSaved,
}: {
  gym: { id: string; name: string; slotsJson?: string | null } | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [slots, setSlots] = useState<SlotDraft[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!gym) return;
    setSlots(readSlots(gym.slotsJson));
    setError("");
  }, [gym]);

  if (!gym) return null;

  const update = (index: number, patch: Partial<SlotDraft>) => {
    setSlots((current) => current.map((slot, i) => (i === index ? { ...slot, ...patch } : slot)));
  };

  const addSlot = () => {
    setSlots((current) => [
      ...current,
      {
        slotId: `slot-${Date.now().toString(36)}-${current.length + 1}`,
        startTime: "",
        endTime: "",
        capacity: "",
        isEnabled: true,
      },
    ]);
  };

  const save = async () => {
    setError("");
    if (slots.some((slot) => !slot.startTime.trim())) {
      setError("Each slot needs a start time.");
      return;
    }
    if (slots.length === 0 && !window.confirm("Save with no slots? Members will not see a schedule until you add one.")) {
      return;
    }
    setSaving(true);
    try {
      const token = localStorage.getItem("zonofit_portal_token");
      const res = await fetch(`/api/admin/gyms/${gym.id}/slots`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          slots: slots.map((slot) => ({
            slotId: slot.slotId,
            startTime: slot.startTime.trim(),
            endTime: slot.endTime.trim(),
            capacity: slot.capacity.trim() === "" ? null : Number(slot.capacity),
            isEnabled: slot.isEnabled,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Could not save slots.");
      onSaved();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not save slots.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white w-full max-w-2xl rounded-t-3xl sm:rounded-3xl shadow-2xl border border-gray-100 flex flex-col max-h-[100dvh] sm:max-h-[92vh]">
        <div className="p-4 sm:p-6 border-b border-gray-100 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 shrink-0 rounded-xl bg-[#111111] text-white flex items-center justify-center">
              <Clock size={18} />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg font-bold text-gray-900">Slots for {gym.name}</h2>
              <p className="text-xs text-gray-500">Add, edit, or remove booking times. The gym owner can view these, not change them.</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-2 rounded-xl text-gray-500 hover:bg-gray-100 shrink-0" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3 min-w-0">
          {slots.length === 0 ? (
            <p className="text-sm text-gray-600">No slots are saved for this gym. Add the times members can book.</p>
          ) : null}
          {slots.map((slot, index) => (
            <div key={slot.slotId} className="rounded-2xl border border-gray-200 p-3 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <label className="block min-w-0">
                  <span className="text-[11px] font-bold uppercase text-gray-500">Start</span>
                  <input
                    value={slot.startTime}
                    onChange={(event) => update(index, { startTime: event.target.value })}
                    placeholder="6:00 AM"
                    className="mt-1 w-full min-w-0 px-3 py-2 border border-gray-200 rounded-xl text-sm"
                  />
                </label>
                <label className="block min-w-0">
                  <span className="text-[11px] font-bold uppercase text-gray-500">End</span>
                  <input
                    value={slot.endTime}
                    onChange={(event) => update(index, { endTime: event.target.value })}
                    placeholder="7:00 AM"
                    className="mt-1 w-full min-w-0 px-3 py-2 border border-gray-200 rounded-xl text-sm"
                  />
                </label>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <label className="flex items-center gap-2 text-xs font-semibold text-gray-600">
                  Cap
                  <input
                    type="number"
                    min={1}
                    max={500}
                    value={slot.capacity}
                    onChange={(event) => update(index, { capacity: event.target.value })}
                    placeholder="Gym cap"
                    className="w-24 px-2 py-1.5 border border-gray-200 rounded-lg text-sm"
                  />
                </label>
                <label className="flex items-center gap-2 text-xs font-semibold text-gray-600">
                  <input
                    type="checkbox"
                    checked={slot.isEnabled}
                    onChange={(event) => update(index, { isEnabled: event.target.checked })}
                  />
                  Open
                </label>
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm("Remove this slot? Bookings already made stay on the books.")) {
                      setSlots((current) => current.filter((_, i) => i !== index));
                    }
                  }}
                  className="ml-auto p-2 text-red-600 hover:bg-red-50 rounded-lg"
                  aria-label="Remove slot"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
          <button
            type="button"
            onClick={addSlot}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-gray-300 text-sm font-bold text-gray-800"
          >
            <Plus size={16} /> Add slot
          </button>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
        </div>

        <div className="p-4 sm:p-6 border-t border-gray-100 flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
          <button type="button" onClick={onClose} className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold">
            Cancel
          </button>
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-black text-white text-sm font-bold disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save slots"}
          </button>
        </div>
      </div>
    </div>
  );
}
