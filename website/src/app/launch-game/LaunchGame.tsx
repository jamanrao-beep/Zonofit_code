"use client";

import { useEffect, useRef, useState } from "react";
import LaunchOfferForm, { type LaunchOfferSubmission } from "../udaipur/launch-offer/LaunchOfferForm";
import { mountDots } from "./dots";
import "./launch-game.css";

const API = process.env.NEXT_PUBLIC_API_URL ?? "https://api.zonofit.com";
const WHATSAPP = "919694979694";
const INSTA = "https://www.instagram.com/zonofit.app/";
const KEY = "zonofit_launch_game_v1";

const LEVELS = [
  { n: 1, name: "Beginner", reward: "5% OFF", skill: 1, boxes: 5, c: "#CFE4A9", win: false },
  { n: 2, name: "Easy", reward: "12.5% OFF", skill: 2, boxes: 7, c: "#A8CD6E", win: true },
  { n: 3, name: "Medium", reward: "25% OFF", skill: 3, boxes: 10, c: "#90BA2A", win: false },
  { n: 4, name: "Hard", reward: "50% OFF", skill: 3, boxes: 14, c: "#669C2C", win: false },
  { n: 5, name: "Expert", reward: "1 MONTH MEMBERSHIP", skill: 3, boxes: 18, c: "#35782B", win: false },
  { n: 6, name: "BOSS LEVEL", reward: "3 MONTHS FREE MEMBERSHIP", skill: 3, boxes: 25, c: "#1f4a1a", win: false },
] as const;

type Outcome = "win" | "draw" | "loss" | "abandoned";

type GameResult = {
  outcome: Outcome;
  you: number | null;
  zonofit: number | null;
  reward: string | null;
  posted?: boolean;
};

type Saved = LaunchOfferSubmission & {
  level?: number;
  started?: boolean;
  result?: GameResult;
};

type Phase = "landing" | "register" | "levels" | "ready" | "playing" | "result";

function readSaved(): Saved | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Saved) : null;
  } catch {
    return null;
  }
}

function writeSaved(value: Saved | null) {
  try {
    if (!value) sessionStorage.removeItem(KEY);
    else sessionStorage.setItem(KEY, JSON.stringify(value));
  } catch {
    /* private mode can block storage; the sheet is still the record */
  }
}

function levelOf(level?: number) {
  return LEVELS.find((item) => item.n === level) ?? LEVELS[0];
}

function resultText(entry: Saved): string {
  const level = levelOf(entry.level);
  const result = entry.result;
  const score = result?.you == null ? "" : `Score: Me ${result.you}, ZonoFit ${result.zonofit}`;
  return [
    "Hi ZonoFit, I finished the Lucky Challenge.",
    `Name: ${entry.name}`,
    `Gym: ${entry.gym || entry.customGym || "—"}`,
    `Level: ${level.n} ${level.name}`,
    `Result: ${result?.outcome === "win" ? "Win" : result?.outcome === "draw" ? "Draw" : result?.outcome === "abandoned" ? "Closed" : "Loss"}`,
    score,
    result?.reward ? `Reward: ${result.reward}` : "",
    "I am sending the screenshot of this result.",
  ].filter(Boolean).join("\n");
}

function whatsAppUrl(entry: Saved): string {
  return `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(resultText(entry))}`;
}

async function saveResult(entry: Saved): Promise<"saved" | "busy" | "failed"> {
  if (!entry.result || entry.skipSave || entry.result.posted) return "saved";
  try {
    const response = await fetch(`${API}/api/launch-game/result`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      keepalive: true,
      body: JSON.stringify({
        name: entry.name,
        phone: entry.phone,
        age: entry.age,
        sex: entry.sex,
        gym: entry.gym,
        customGym: entry.customGym,
        instagram: entry.instagram,
        level: entry.level,
        outcome: entry.result.outcome,
        you: entry.result.you,
        zonofit: entry.result.zonofit,
        website: "",
      }),
    });
    if (response.ok || response.status === 409) return "saved";
    if (response.status === 429) return "busy";
    return "failed";
  } catch {
    return "failed";
  }
}

function Logo({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <defs>
        <linearGradient id={`zg-lg-${size}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#90BA2A" />
          <stop offset="1" stopColor="#35782B" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="9" fill={`url(#zg-lg-${size})`} />
      <path d="M10 22 Q16 20 22 11M10 16 Q14 15 19 10" stroke="#fff" strokeWidth="2.6" fill="none" strokeLinecap="round" />
      <circle cx="21" cy="21" r="2.2" fill="#fff" />
    </svg>
  );
}

function phaseFor(saved: Saved | null): Phase {
  if (!saved?.pid) return "landing";
  if (saved.result) return "result";
  if (saved.started) return "result";
  if (saved.level) return "ready";
  return "levels";
}

export default function LaunchGame() {
  const [ready, setReady] = useState(false);
  const [saved, setSaved] = useState<Saved | null>(null);
  const [phase, setPhase] = useState<Phase>("landing");
  const [pick, setPick] = useState<number | null>(null);
  const [armed, setArmed] = useState(0);
  const [saveNote, setSaveNote] = useState("");
  const [howOpen, setHowOpen] = useState(false);
  const boardRef = useRef<SVGSVGElement>(null);
  const hudRef = useRef<HTMLDivElement>(null);
  const savedRef = useRef<Saved | null>(null);

  function commit(next: Saved | null, nextPhase?: Phase) {
    savedRef.current = next;
    setSaved(next);
    writeSaved(next);
    if (nextPhase) setPhase(nextPhase);
  }

  useEffect(() => {
    const stored = readSaved();
    if (stored?.started && !stored.result && stored.level) {
      commit({
        ...stored,
        result: { outcome: "abandoned", you: null, zonofit: null, reward: null, posted: false },
      }, "result");
    } else {
      commit(stored, phaseFor(stored));
    }
    setReady(true);
  }, []);

  useEffect(() => {
    savedRef.current = saved;
  }, [saved]);

  useEffect(() => {
    if (phase !== "playing" || !saved?.level || !boardRef.current || !hudRef.current) return;
    const level = levelOf(saved.level);
    const stop = mountDots({
      board: boardRef.current,
      hud: hudRef.current,
      boxes: level.boxes,
      skill: level.skill,
      cannotWin: level.n > 2,
      playerName: saved.name,
      onFinish: (finish) => {
        const current = savedRef.current;
        if (!current) return;
        const next: Saved = {
          ...current,
          result: {
            outcome: finish.outcome,
            you: finish.you,
            zonofit: finish.zonofit,
            reward: finish.outcome === "win" && level.win ? level.reward : null,
            posted: false,
          },
        };
        commit(next, "result");
      },
    });
    return stop;
  }, [phase, saved?.level, saved?.name]);

  useEffect(() => {
    if (phase !== "result" || !saved?.result || saved.result.posted || saved.skipSave) return;
    let cancel = false;
    void saveResult(saved).then((status) => {
      if (cancel || !saved.result) return;
      if (status === "saved") {
        commit({ ...saved, result: { ...saved.result, posted: true } }, "result");
        return;
      }
      if (status === "failed") {
        setSaveNote("Your result is on this screen. Send the screenshot on WhatsApp. Tap that button again if it still needs another try.");
      }
    });
    return () => {
      cancel = true;
    };
  }, [phase, saved]);

  useEffect(() => {
    if (phase !== "result" || saved?.result?.outcome !== "win") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const bits: HTMLElement[] = [];
    for (let i = 0; i < 50; i += 1) {
      const bit = document.createElement("i");
      bit.className = "zg-conf";
      bit.style.left = `${Math.random() * 100}vw`;
      bit.style.background = ["#90BA2A", "#669C2C", "#35782B", "#E0A100"][i % 4];
      bit.style.animationDuration = `${2 + Math.random() * 2}s`;
      document.body.appendChild(bit);
      bits.push(bit);
    }
    const clear = window.setTimeout(() => bits.forEach((bit) => bit.remove()), 4200);
    return () => {
      window.clearTimeout(clear);
      bits.forEach((bit) => bit.remove());
    };
  }, [phase, saved?.result?.outcome]);

  if (!ready) return <div className="zg" />;

  const level = levelOf(saved?.level);
  const result = saved?.result;

  return (
    <div className="zg">
      <main className="zg-main">
        <div className="top">
          <a className="logo" href="https://zonofit.com"><Logo />ZonoFit</a>
          <span className="badge">LIMITED FREE TESTER CAMPAIGN</span>
        </div>

        {phase === "landing" ? (
          <>
            <h1>What if your next gym membership was free?</h1>
            <p>Challenge yourself, play the game, and get a chance to unlock exciting ZonoFit rewards.</p>
            <div className="row3">
              <div className="mini">Play once</div>
              <div className="mini">One difficulty</div>
              <div className="mini">Tester rewards</div>
            </div>
            <button className="btn" type="button" onClick={() => setPhase("register")}>Play and test your luck</button>
            <button className="btn sec" type="button" onClick={() => setHowOpen(true)}>How it works</button>
            <div className="card" style={{ marginTop: 18 }}>
              <b style={{ fontSize: 13 }}>Campaign information</b>
              <p style={{ fontSize: 13, margin: "8px 0 0" }}>
                One verified mobile number and one game. Level 2 is the winning tier. Results are confirmed after you send the screenshot on WhatsApp.
              </p>
            </div>
            <details open={howOpen} onToggle={(event) => setHowOpen((event.target as HTMLDetailsElement).open)}>
              <summary>How it works and terms</summary>
              <p style={{ marginTop: 8 }}>
                Register with the same details as the Udaipur launch form. We confirm the mobile number with a code. That number can be used once, even in a new browser. Pick one difficulty. Play one Lines and Dots game against ZonoFit.
                A draw is not a win. Refreshing or leaving ends the attempt. Rewards depend on campaign conditions. Registration does not guarantee selection.
              </p>
            </details>
          </>
        ) : null}

        {phase === "register" ? (
          <>
            <button className="back" type="button" onClick={() => setPhase("landing")}>Back</button>
            <h2>First, let&apos;s get to know you.</h2>
            <p>Same form as the launch offer. We confirm your mobile number with a code. That number can register once.</p>
            <LaunchOfferForm
              embed
              verifyPhone
              endpointPath="/api/launch-game"
              source="launch-game"
              submitLabel="Continue to the game"
              panelTitle="Register to play"
              panelNote="Udaipur. One verified number. One game."
              onSuccess={(entry) => commit(entry, "levels")}
            />
          </>
        ) : null}

        {phase === "levels" ? (
          <>
            <h2>Choose your challenge.</h2>
            <p>Six levels. Different rewards. One shot.</p>
            <div className="card" style={{ marginBottom: 14, background: "var(--gl)" }}>
              Levels 1 and 2 can be won. Only a level 2 win is 12.5% OFF. Levels 3 to 6 cannot be won. Your choice is final.
            </div>
            <div className="prog">
              <span>BEGINNER</span><span>EASY</span><span>MEDIUM</span><span>HARD</span><span>EXPERT</span><span>BOSS</span>
            </div>
            {LEVELS.map((item) => (
              <button
                key={item.n}
                type="button"
                className={`lv${item.n === 6 ? " boss" : ""}${pick === item.n ? " sel" : ""}`}
                onClick={() => {
                  setPick(item.n);
                  setArmed(0);
                }}
              >
                <div className="n" style={{ background: item.c }}>{item.n}</div>
                <div>
                  <b>{item.name}</b>
                  <small>{item.boxes}×{item.boxes} board · {item.reward}</small>
                </div>
                <span className="tag">{item.win ? "WINNING TIER" : "CHALLENGE ONLY"}</span>
              </button>
            ))}
            <p className="mut">Your difficulty selection is final.</p>
            <button
              className="btn"
              type="button"
              disabled={!pick}
              onClick={() => {
                if (!pick || !saved) return;
                if (armed !== pick) {
                  setArmed(pick);
                  return;
                }
                commit({ ...saved, level: pick }, "ready");
              }}
            >
              {armed && armed === pick ? `Tap again to confirm level ${pick}` : "Lock in and start"}
            </button>
          </>
        ) : null}

        {phase === "ready" && saved ? (
          <>
            <h2>Level {level.n} · {level.name}</h2>
            <p>{level.n > 2 ? "Here is how this level works." : "Here is exactly how to win."}</p>
            <div className="card">
              <ol className="rules">
                <li><b>Goal:</b> claim more boxes than ZonoFit on a {level.boxes}×{level.boxes} board.</li>
                <li>Take turns drawing a line between two dots. Close the 4th side of a box to claim it and move again. Your boxes are gold. ZonoFit boxes carry the logo.</li>
                <li><b>You get 10 seconds per move.</b> If time runs out, a line is drawn for you.</li>
                <li>
                  {level.n > 2 ? (
                    <>Level {level.n} cannot be won. ZonoFit plays at full strength, and your result is still recorded.</>
                  ) : level.win ? (
                    <>Beat ZonoFit to unlock <b>{level.reward}</b>. A draw is not a win.</>
                  ) : (
                    <>You can beat ZonoFit here. Level 1 has no reward. A draw is not a win.</>
                  )}
                </li>
                <li>One attempt only. Refreshing or leaving ends the game.</li>
              </ol>
            </div>
            <button
              className="btn"
              type="button"
              onClick={() => commit({ ...saved, started: true }, "playing")}
            >
              Start game
            </button>
          </>
        ) : null}

        {phase === "playing" && saved ? (
          <>
            <div ref={hudRef}>
              <div className="ai">
                <Logo size={26} />
                <span>Playing against ZonoFit · Level {level.n} {level.name} · {level.boxes}×{level.boxes}</span>
                <span className="think" data-think hidden><i /><i /><i /></span>
              </div>
              <div className="hud">
                <div className="sc you on" data-you-card><b style={{ color: "#E0A100" }}>You</b><span data-you>0</span></div>
                <div className="sc" data-them-card><b style={{ color: "#35782B" }}>ZonoFit</b><span data-them>0</span></div>
              </div>
              <div className="tm" data-bar><i data-fill /></div>
            </div>
            <div className="board-scroll">
              <svg
                ref={boardRef}
                className="board"
                viewBox={`-0.5 -0.5 ${level.boxes + 1} ${level.boxes + 1}`}
                style={{ width: `max(100%, ${level.boxes * 36}px)` }}
              />
            </div>
            <p className="mut">Tap between two dots to draw a line. A box you close stays yours. Scroll when the board is larger than the screen.</p>
          </>
        ) : null}

        {phase === "result" && saved && result ? (
          <>
            <div className="card shot" id="zg-shot">
              <div style={{ display: "flex", justifyContent: "center" }}><Logo size={56} /></div>
              <h1 style={{ marginTop: 12 }}>
                {result.outcome === "win"
                  ? "You beat ZonoFit"
                  : result.outcome === "draw"
                    ? "A draw. So close."
                    : result.outcome === "abandoned"
                      ? "This attempt is closed."
                      : "ZonoFit took this one."}
              </h1>
              {result.reward ? <div className="big">{result.reward}</div> : null}
              <p style={{ margin: 0 }}>
                <b style={{ color: "var(--tx)" }}>Level {level.n} · {level.name}</b>
                {result.you != null ? <><br />You {result.you} · ZonoFit {result.zonofit}</> : null}
              </p>
              <div className="meta">
                <div><small>Player</small><b>{saved.firstName || saved.name}</b></div>
                <div><small>Gym</small><b>{saved.gym || saved.customGym || "Udaipur"}</b></div>
              </div>
            </div>
            <div className="card" style={{ marginTop: 14 }}>
              <b>Screenshot this card</b>
              <p style={{ margin: "6px 0 0", fontSize: 13 }}>
                Take a screenshot of the level and result above, then send it to ZonoFit on WhatsApp. That message is how the result is claimed.
              </p>
              <a
                className="btn"
                href={whatsAppUrl(saved)}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => {
                  const current = savedRef.current;
                  if (!current?.result || current.result.posted || current.skipSave) return;
                  void saveResult(current).then((status) => {
                    const latest = savedRef.current;
                    if (status === "saved" && latest?.result && !latest.result.posted) {
                      commit({ ...latest, result: { ...latest.result, posted: true } }, "result");
                      setSaveNote("");
                      return;
                    }
                    if (status === "failed") {
                      setSaveNote("The sheet did not take this result. Send the screenshot on WhatsApp, then tap the button again.");
                    }
                  });
                }}
              >
                Send to ZonoFit on WhatsApp
              </a>
              {saveNote ? <p className="mut">{saveNote}</p> : null}
            </div>
            <div className="card" style={{ marginTop: 16 }}>
              <b style={{ fontSize: 15 }}>{result.outcome === "win" ? "Next steps" : "Stay in the draw"}</b>
              <div className="step f">
                <div className="i">1</div>
                <div>
                  <b>Follow ZonoFit</b>
                  <p>Winner checks happen from the official Instagram too.</p>
                  <a className="btn sm" href={INSTA} target="_blank" rel="noopener noreferrer">Open Instagram</a>
                </div>
              </div>
              <div className="step">
                <div className="i">2</div>
                <div>
                  <b>Tell a friend</b>
                  <p>Share the challenge and see who beats ZonoFit.</p>
                  <button
                    className="btn sm sec"
                    type="button"
                    onClick={() => {
                      const url = "https://zonofit.com/launch-game";
                      const text = "Can you beat ZonoFit? Play the Lucky Challenge.";
                      if (navigator.share) {
                        void navigator.share({ title: "ZonoFit Lucky Challenge", text, url }).catch(() => undefined);
                        return;
                      }
                      window.open(`https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`, "_blank", "noopener,noreferrer");
                    }}
                  >
                    Share challenge
                  </button>
                </div>
              </div>
              <div className="step">
                <div className="i">3</div>
                <div>
                  <b>Get to know ZonoFit</b>
                  <p>Flexible gym access. Pay for the days you actually train.</p>
                  <a className="btn sm" href="https://zonofit.com" target="_blank" rel="noopener noreferrer">Visit zonofit.com</a>
                </div>
              </div>
            </div>
            <p style={{ textAlign: "center", fontWeight: 800, marginTop: 20 }}>18 workouts are better than zero.</p>
          </>
        ) : null}
      </main>
    </div>
  );
}
