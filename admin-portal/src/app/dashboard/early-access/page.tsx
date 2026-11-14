"use client";

import { useEffect, useMemo, useState } from "react";
import { Sparkles } from "lucide-react";

type Review = {
  id: string;
  featureName: string;
  featureLabel: string;
  choices: string[];
  idea: string;
  createdAt: string;
  user: { id: string; name: string; email: string; phone: string | null } | null;
};

const FILTERS = ["All", "AI Trainer", "Workout Buddy", "Meal Scan", "Become a Trainer", "Other"] as const;
const KNOWN = new Set(["AI Trainer", "Workout Buddy", "Meal Scan", "Become a Trainer"]);

function when(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export default function EarlyAccessReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("All");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const token = localStorage.getItem("zonofit_portal_token");
      const res = await fetch("/api/admin/feature-feedback", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setReviews([]);
        setError(data?.message || "Could not load early access reviews.");
        return;
      }
      setReviews(Array.isArray(data.reviews) ? data.reviews : []);
    } catch {
      setReviews([]);
      setError("Could not load early access reviews.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const visible = useMemo(() => {
    if (filter === "All") return reviews;
    if (filter === "Other") return reviews.filter((review) => !KNOWN.has(review.featureLabel));
    return reviews.filter((review) => review.featureLabel === filter);
  }, [reviews, filter]);

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="mb-2 text-3xl font-bold text-black">Early access</h1>
          <p className="text-gray-600">Every vote and idea members send from Coming soon.</p>
        </div>
        <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3">
          <div className="text-xs font-bold uppercase tracking-wide text-emerald-800">Reviews</div>
          <div className="text-2xl font-black text-emerald-700">{reviews.length}</div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((item) => {
          const count =
            item === "All"
              ? reviews.length
              : item === "Other"
                ? reviews.filter((review) => !KNOWN.has(review.featureLabel)).length
                : reviews.filter((review) => review.featureLabel === item).length;
          const on = filter === item;
          return (
            <button
              key={item}
              type="button"
              onClick={() => setFilter(item)}
              className={`rounded-full border px-3 py-1.5 text-sm font-semibold ${
                on ? "border-[#0a3d25] bg-[#0a3d25] text-white" : "border-gray-200 bg-white text-gray-600"
              }`}
            >
              {item} {count}
            </button>
          );
        })}
      </div>

      <div className="rounded-3xl border border-gray-100 bg-white p-4 shadow-sm sm:p-6">
        {loading ? (
          <div className="py-12 text-center text-gray-500">Loading reviews...</div>
        ) : error ? (
          <div className="py-12 text-center">
            <p className="font-medium text-gray-700">{error}</p>
            <button type="button" onClick={() => void load()} className="mt-4 font-bold text-emerald-700">
              Try again
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] border-collapse text-left">
              <thead>
                <tr className="border-b border-gray-100 text-sm uppercase tracking-wider text-gray-500">
                  <th className="pb-4 font-bold">When</th>
                  <th className="pb-4 font-bold">Member</th>
                  <th className="pb-4 font-bold">Feature</th>
                  <th className="pb-4 font-bold">What they want</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {visible.map((review) => (
                  <tr key={review.id} className="align-top">
                    <td className="py-4 pr-4 text-sm text-gray-600 whitespace-nowrap">{when(review.createdAt)}</td>
                    <td className="py-4 pr-4">
                      <div className="text-sm font-bold text-black">{review.user?.name || "Unknown member"}</div>
                      <div className="text-xs text-gray-500">{review.user?.email || "No email"}</div>
                      <div className="text-xs text-gray-500">{review.user?.phone || "No phone"}</div>
                    </td>
                    <td className="py-4 pr-4">
                      <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-800">
                        <Sparkles size={12} />
                        {review.featureLabel}
                      </span>
                    </td>
                    <td className="py-4">
                      {review.choices?.length ? (
                        <div className="mb-2 flex flex-wrap gap-1.5">
                          {review.choices.map((choice) => (
                            <span key={choice} className="rounded-full bg-[#e9f6ec] px-2.5 py-1 text-xs font-semibold text-[#1f7a3a]">
                              {choice}
                            </span>
                          ))}
                        </div>
                      ) : null}
                      {review.idea ? (
                        <p className="max-w-xl whitespace-pre-wrap text-sm text-black">{review.idea}</p>
                      ) : review.choices?.length ? null : (
                        <span className="text-sm text-gray-400">No note</span>
                      )}
                    </td>
                  </tr>
                ))}
                {visible.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-12 text-center font-medium text-gray-500">
                      No early access reviews yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
