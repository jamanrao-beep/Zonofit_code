"use client";

import { Mail, MessageCircle, Phone } from "lucide-react";

const EMAIL = "zonofitofficial@gmail.com";
const PHONE = "9694979694";
const MESSAGE = "Hello ZonoFit, I want to change or edit a booking slot for my gym.";

export default function SlotEnquiry() {
  const mail = `mailto:${EMAIL}?subject=${encodeURIComponent("Slot change enquiry")}&body=${encodeURIComponent(MESSAGE)}`;
  const whatsapp = `https://wa.me/91${PHONE}?text=${encodeURIComponent(MESSAGE)}`;
  const call = `tel:+91${PHONE}`;

  return (
    <section className="rounded-3xl border border-emerald-100 bg-white p-4 sm:p-6 shadow-sm min-w-0">
      <h2 className="text-lg font-bold text-gray-900">Need a slot changed?</h2>
      <p className="mt-1 text-sm leading-6 text-gray-600">
        Gym owners can view the schedule. To add, change, or remove a slot, send an enquiry.
        The ZonoFit team will get back to you.
      </p>
      <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-2">
        <a
          href={mail}
          className="flex items-center justify-center gap-2 rounded-2xl bg-[#111111] px-4 py-3 text-sm font-semibold text-white min-h-11"
        >
          <Mail size={16} />
          Email
        </a>
        <a
          href={whatsapp}
          target="_blank"
          rel="noreferrer"
          className="flex items-center justify-center gap-2 rounded-2xl bg-emerald-700 px-4 py-3 text-sm font-semibold text-white min-h-11"
        >
          <MessageCircle size={16} />
          WhatsApp
        </a>
        <a
          href={call}
          className="flex items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-900 min-h-11"
        >
          <Phone size={16} />
          Call
        </a>
      </div>
      <p className="mt-3 text-xs leading-5 text-gray-500 break-all">
        {EMAIL} · {PHONE}
      </p>
    </section>
  );
}
