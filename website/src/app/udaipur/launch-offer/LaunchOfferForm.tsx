"use client";

import { useMemo, useRef, useState, type KeyboardEvent } from "react";
import "./launch-offer.css";

const API = process.env.NEXT_PUBLIC_API_URL ?? "https://api.zonofit.com";

/** Keep this list in sync with server/src/routes/launchOffer.ts */
const GYMS = [
  "Pro Fitness Studio",
  "Mrinaal Fitness Empire",
  "Prime Fitness Studio",
  "Veer Fitness Gym",
  "Fireup Wolverinez Gym & Fitness",
  "B1 Fitness Gym and Supplement Store",
  "Zoro Fitness",
  "B&H Gym",
  "The Gym Zone",
  "The Fitness Zone Unisex Gym",
  "108 Being Fit Fitness",
  "Being Fit Fitness 2.0",
  "Dolphin Health Club",
];

const SEX = ["Male", "Female", "Other"] as const;

type Errors = Partial<Record<"name" | "phone" | "age" | "sex" | "gym", string>>;

export default function LaunchOfferForm() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [age, setAge] = useState("");
  const [sex, setSex] = useState("");
  const [query, setQuery] = useState("");
  const [gym, setGym] = useState("");
  const [custom, setCustom] = useState(false);
  const [customGym, setCustomGym] = useState("");
  const [instagram, setInstagram] = useState("");
  const [website, setWebsite] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [fail, setFail] = useState("");
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState("");
  const customRef = useRef<HTMLInputElement>(null);

  const visibleGyms = useMemo(() => {
    const q = query.trim().toLowerCase();
    return GYMS.filter((item) => item.toLowerCase().includes(q));
  }, [query]);

  function validate(): boolean {
    const next: Errors = {};
    const ageNumber = Number(age);
    if (name.trim().length < 2) next.name = "Enter your name";
    if (!/^[6-9]\d{9}$/.test(phone.trim())) next.phone = "Enter a valid 10-digit mobile number";
    if (!Number.isInteger(ageNumber) || ageNumber < 16 || ageNumber > 70) next.age = "16 to 70";
    if (!sex) next.sex = "Pick one";
    if (custom ? customGym.trim().length < 3 : !gym) next.gym = "Pick a gym or tell us yours";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function submit() {
    if (sending || done) return;
    setFail("");
    if (website.trim()) {
      setDone(custom ? customGym.trim() : gym);
      return;
    }
    if (!validate()) {
      setFail("Please fix the fields above.");
      window.setTimeout(() => {
        document.querySelector(".lu-in.bad, .lu-err:not(:empty)")?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 30);
      return;
    }

    setSending(true);
    try {
      const response = await fetch(`${API}/api/launch-offer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source: "launch-udaipur",
          name: name.trim(),
          phone: phone.trim(),
          age: Number(age),
          sex,
          gym: custom ? "" : gym,
          customGym: custom ? customGym.trim() : "",
          instagram: instagram.trim().replace(/^@+/, ""),
          website,
        }),
      });
      const payload = (await response.json().catch(() => null)) as { message?: string } | null;
      if (!response.ok) {
        setFail(payload?.message || "Could not send. Check your network and try again.");
        setSending(false);
        return;
      }
      setDone(custom ? customGym.trim() : gym);
    } catch {
      setFail("Could not send. Check your network and try again.");
      setSending(false);
    }
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const target = event.target as HTMLElement;
    if (event.key === "Enter" && target.tagName === "INPUT" && target.id !== "lu-q") {
      event.preventDefault();
      void submit();
    }
  }

  if (done) {
    return (
      <section className="lu" aria-labelledby="lu-thanks">
        <div className="lu-done">
          <div className="lu-brand">ZONO<b>FIT</b></div>
          <h2 id="lu-thanks">Thank you.</h2>
          <p>Your response has been recorded.</p>
          <div className="lu-gymline">{done}</div>
          <a className="lu-back" href="/">Back to zonofit.com</a>
        </div>
      </section>
    );
  }

  return (
    <section className="lu" aria-labelledby="lu-h">
      <div className="lu-wrap">
        <div>
          <span className="lu-eyebrow"><span className="lu-dot" />Launch offer · Udaipur</span>
          <h2 id="lu-h">Train free.<br /><em>Tell us what worked.</em></h2>
          <p className="lu-sub">
            We’re picking people in Udaipur to get a free gym membership and test Zonofit, the flexible, smarter way to train. You show up. We learn.
          </p>
          <div className="lu-steps">
            <div className="lu-step"><b>01</b><div><strong>Apply in 60 seconds</strong><span>Pick the gym you want near you.</span></div></div>
            <div className="lu-step"><b>02</b><div><strong>Get selected, train free</strong><span>Real membership. Real gym. No payment.</span></div></div>
            <div className="lu-step"><b>03</b><div><strong>Give us the honest version</strong><span>A short testimonial and what we should fix.</span></div></div>
          </div>
          <p className="lu-ask">In return, we want to hear:</p>
          <div className="lu-chips">
            <span className="lu-chip">How it helped you</span>
            <span className="lu-chip">What to improve</span>
            <span className="lu-chip">Gyms you need near you</span>
          </div>
        </div>

        <div className="lu-panel">
          <div id="lu-form" onKeyDown={onKeyDown}>
            <h3>Claim your spot</h3>
            <p className="lu-p">Free. Udaipur only. Limited seats.</p>

            <div className="lu-f">
              <label htmlFor="lu-name">Name</label>
              <input
                className={errors.name ? "lu-in bad" : "lu-in"}
                id="lu-name"
                autoComplete="name"
                placeholder="Your full name"
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
              <div className="lu-err">{errors.name}</div>
            </div>

            <div className="lu-f">
              <label htmlFor="lu-phone">Mobile number</label>
              <div className="lu-ph">
                <span>+91</span>
                <input
                  className={errors.phone ? "lu-in bad" : "lu-in"}
                  id="lu-phone"
                  type="tel"
                  inputMode="numeric"
                  maxLength={10}
                  autoComplete="tel-national"
                  placeholder="10-digit number"
                  value={phone}
                  onChange={(event) => setPhone(event.target.value.replace(/\D/g, "").slice(0, 10))}
                />
              </div>
              <div className="lu-err">{errors.phone}</div>
            </div>

            <div className="lu-f lu-row">
              <div>
                <label htmlFor="lu-age">Age</label>
                <input
                  className={errors.age ? "lu-in bad" : "lu-in"}
                  id="lu-age"
                  type="number"
                  inputMode="numeric"
                  min={16}
                  max={70}
                  placeholder="22"
                  value={age}
                  onChange={(event) => setAge(event.target.value)}
                />
                <div className="lu-err">{errors.age}</div>
              </div>
              <div>
                <span className="lu-lab">Sex</span>
                <div className="lu-seg">
                  {SEX.map((item) => (
                    <button key={item} type="button" aria-pressed={sex === item} onClick={() => setSex(item)}>
                      {item}
                    </button>
                  ))}
                </div>
                <div className="lu-err">{errors.sex}</div>
              </div>
            </div>

            <div className="lu-f">
              <span className="lu-lab">Pick your gym</span>
              <input
                className="lu-in"
                id="lu-q"
                placeholder="Search gym"
                aria-label="Search gym"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
              <div className="lu-list">
                {visibleGyms.map((item) => (
                  <button
                    key={item}
                    type="button"
                    className="lu-gym"
                    aria-pressed={!custom && gym === item}
                    onClick={() => {
                      setGym(item);
                      setCustom(false);
                    }}
                  >
                    <strong>{item}</strong>
                  </button>
                ))}
                <button
                  type="button"
                  className="lu-gym"
                  aria-pressed={custom}
                  onClick={() => {
                    setCustom(true);
                    setGym("");
                    requestAnimationFrame(() => customRef.current?.focus());
                  }}
                >
                  <strong>My gym isn’t listed</strong>
                  <small>Request it</small>
                </button>
              </div>
              {custom ? (
                <div className="lu-custom">
                  <input
                    ref={customRef}
                    className="lu-in"
                    placeholder="Gym name and area"
                    value={customGym}
                    onChange={(event) => setCustomGym(event.target.value)}
                  />
                  <p className="lu-note">Not a partner yet? Tell us. When enough people ask for the same gym, we partner with them.</p>
                </div>
              ) : null}
              <div className="lu-err">{errors.gym}</div>
            </div>

            <div className="lu-f">
              <label htmlFor="lu-ig">Your Instagram <i>(optional)</i></label>
              <input
                className="lu-in"
                id="lu-ig"
                autoCapitalize="off"
                placeholder="@yourhandle"
                value={instagram}
                onChange={(event) => setInstagram(event.target.value)}
              />
              <p className="lu-note">Already follow us? Add your handle. It improves your chances.</p>
            </div>

            <input
              className="lu-hp"
              name="website"
              tabIndex={-1}
              autoComplete="off"
              aria-hidden="true"
              value={website}
              onChange={(event) => setWebsite(event.target.value)}
            />
            <div className="lu-err lu-fail">{fail}</div>
            <button className="lu-btn lu-pri" type="button" disabled={sending} onClick={() => void submit()}>
              {sending ? "Sending…" : "Apply for free membership"}
            </button>
            <p className="lu-fine">No payment. Your details are used only for this offer.</p>
          </div>
        </div>
      </div>
    </section>
  );
}
