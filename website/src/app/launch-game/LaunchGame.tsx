"use client";

import { useEffect, useRef, useState, type MouseEvent as ReactMouseEvent } from "react";
import LaunchOfferForm, { type LaunchOfferSubmission } from "../udaipur/launch-offer/LaunchOfferForm";
import "./launch-game.css";

const API = process.env.NEXT_PUBLIC_API_URL ?? "https://api.zonofit.com";
const INSTA = "https://www.instagram.com/zonofit.app/";
const KEY = "zonofit_launch_game_v1";

/** Keep this list in sync with TILE_LADDER in server/src/lib/launchGameResult.ts */
const LADDER = ["1%", "2%", "4%", "8%", "16%", "32%", "64%", "1 month free", "3 months free"] as const;

const MARK = '<svg viewBox="0 0 40 40"><path d="M20 4l14 16-14 16L6 20z" fill="none" stroke="currentColor" stroke-width="2"/><path d="M20 12l7 8-7 8-7-8z" fill="currentColor" opacity=".55"/></svg>';
const GEM = '<svg viewBox="0 0 40 40"><path d="M9 15l5-7h12l5 7-11 19z" fill="#fff"/><path d="M9 15h22L20 34z" fill="#059669" opacity=".35"/><path d="M14 8l-5 7h22l-5-7z" fill="#fff" opacity=".6"/></svg>';
const BOMB = '<svg viewBox="0 0 40 40"><circle cx="19" cy="24" r="12" fill="#1c1917"/><circle cx="15" cy="20" r="3" fill="#fff" opacity=".35"/><path d="M26 14q4-5 8-3" stroke="#fde68a" stroke-width="2.5" fill="none" stroke-linecap="round"/><circle cx="34" cy="11" r="3.5" fill="#fde047"/></svg>';

type Outcome = "win" | "loss" | "abandoned";
type Face = "hidden" | "safe" | "bomb";
type Tile = { flip: boolean; face: Face; ghost: boolean; locked: boolean };
type Phase = "hero" | "form" | "how" | "game" | "win" | "lose" | "closed";
type SheetAction = { label: string; primary: boolean; run: () => void };
type Sheet = { title: string; big: string; body: string; actions: SheetAction[] };
type TileResult = { outcome: Outcome; stage: number; reward: string; code: string; posted?: boolean };
type Saved = LaunchOfferSubmission & { realStarted?: boolean; result?: TileResult };

const hiddenTiles = (): Tile[] => [0, 1, 2, 3].map(() => ({ flip: false, face: "hidden", ghost: false, locked: false }));

function rewardLabel(stage: number): string {
  const label = LADDER[stage] ?? "";
  return stage < 7 ? `${label} off next plan` : label;
}

function makeCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "ZONO-";
  for (let i = 0; i < 6; i += 1) code += alphabet[Math.floor(Math.random() * alphabet.length)];
  return code;
}

function readSaved(): Saved | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Saved & { level?: number; you?: number };
    if (parsed.result && "you" in parsed.result) return null;
    if ("level" in parsed) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeSaved(value: Saved | null) {
  try {
    if (!value) sessionStorage.removeItem(KEY);
    else sessionStorage.setItem(KEY, JSON.stringify(value));
  } catch {
    /* the sheet is still the record */
  }
}

function phaseFor(saved: Saved | null): Phase {
  if (!saved?.pid && !saved?.skipSave) return "hero";
  if (saved.result?.outcome === "abandoned") return "closed";
  if (saved.result?.outcome === "win") return "win";
  if (saved.result?.outcome === "loss") return "lose";
  return "how";
}

const snd = {
  on: true,
  ctx: null as AudioContext | null,
  init() {
    if (!this.ctx) {
      const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctx) return;
      try { this.ctx = new Ctx(); } catch { return; }
    }
    if (this.ctx.state === "suspended") void this.ctx.resume();
  },
  tone(freq: number, duration: number, type: OscillatorType, volume: number, slide?: number, delay = 0) {
    if (!this.on || !this.ctx) return;
    const context = this.ctx;
    const osc = context.createOscillator();
    const gain = context.createGain();
    const start = context.currentTime + delay;
    osc.type = type;
    osc.frequency.setValueAtTime(freq, start);
    if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(1, slide), start + duration);
    gain.gain.setValueAtTime(volume, start);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    osc.connect(gain);
    gain.connect(context.destination);
    osc.start(start);
    osc.stop(start + duration);
  },
  noise(duration: number, volume: number, cutoff: number) {
    if (!this.on || !this.ctx) return;
    const context = this.ctx;
    const length = Math.floor(context.sampleRate * duration);
    const buffer = context.createBuffer(1, length, context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
    const source = context.createBufferSource();
    const filter = context.createBiquadFilter();
    const gain = context.createGain();
    source.buffer = buffer;
    filter.type = "lowpass";
    filter.frequency.value = cutoff;
    gain.gain.value = volume;
    source.connect(filter);
    filter.connect(gain);
    gain.connect(context.destination);
    source.start();
  },
};

function tap() { snd.tone(520, 0.07, "triangle", 0.12); }
function sFlip() { snd.noise(0.12, 0.12, 3500); snd.tone(300, 0.12, "triangle", 0.08, 700); }
function sSafe() { [523, 659, 784, 1047].forEach((freq, index) => snd.tone(freq, 0.28, "sine", 0.14, undefined, index * 0.07)); }
function sBoom() { snd.noise(0.9, 0.5, 500); snd.tone(140, 0.7, "sawtooth", 0.3, 30); snd.tone(70, 0.9, "sine", 0.4, 25); }
function sWin() { [523, 659, 784, 1047, 1319, 1568].forEach((freq, index) => snd.tone(freq, 0.4, "triangle", 0.14, undefined, index * 0.09)); }

type Bit = { x: number; y: number; vx: number; vy: number; s: number; c: string; l: number; g: number; r: number };
const bits: Bit[] = [];
let painting = false;

function burst(x: number, y: number, colors: string[], count: number, speed: number, gravity: number) {
  for (let i = 0; i < count; i += 1) {
    const angle = Math.random() * 6.28;
    const velocity = Math.random() * speed;
    bits.push({
      x, y,
      vx: Math.cos(angle) * velocity,
      vy: Math.sin(angle) * velocity - speed * 0.3,
      s: 3 + Math.random() * 5,
      c: colors[i % colors.length],
      l: 1,
      g: gravity,
      r: Math.random() * 6,
    });
  }
  if (!painting) {
    painting = true;
    requestAnimationFrame(paintBits);
  }
}

function paintBits() {
  const canvas = document.getElementById("zg-fx") as HTMLCanvasElement | null;
  const context = canvas?.getContext("2d");
  if (!canvas || !context) {
    painting = false;
    bits.length = 0;
    return;
  }
  context.clearRect(0, 0, canvas.width, canvas.height);
  for (let i = bits.length - 1; i >= 0; i -= 1) {
    const bit = bits[i];
    bit.x += bit.vx;
    bit.y += bit.vy;
    bit.vy += bit.g;
    bit.vx *= 0.985;
    bit.l -= 0.011;
    bit.r += 0.2;
    if (bit.l <= 0) {
      bits.splice(i, 1);
      continue;
    }
    context.globalAlpha = Math.min(1, bit.l * 1.5);
    context.fillStyle = bit.c;
    context.save();
    context.translate(bit.x, bit.y);
    context.rotate(bit.r);
    context.fillRect(-bit.s / 2, -bit.s / 2, bit.s, bit.s * 0.6);
    context.restore();
  }
  context.globalAlpha = 1;
  if (bits.length) requestAnimationFrame(paintBits);
  else painting = false;
}

function confetti() {
  const colors = ["#bef264", "#34d399", "#fde047", "#fff", "#06b6d4"];
  for (let wave = 0; wave < 6; wave += 1) {
    window.setTimeout(() => burst(Math.random() * window.innerWidth, -10, colors, 40, 6, 0.18), wave * 160);
  }
  burst(window.innerWidth / 2, window.innerHeight * 0.4, colors, 70, 11, 0.3);
}

function TileFace({ tile, onClick }: { tile: Tile; onClick?: () => void }) {
  const face = tile.face === "bomb" ? "bomb" : tile.face === "safe" ? "safe" : "";
  return (
    <button
      type="button"
      className={`tile${tile.flip ? " flip" : ""}${face ? ` ${face}` : ""}${tile.ghost ? " ghost" : ""}${tile.locked ? " lock" : ""}`}
      onClick={onClick}
      disabled={tile.locked || !onClick}
    >
      <div className="in">
        <div className="f front" dangerouslySetInnerHTML={{ __html: MARK }} />
        <div className="f back" dangerouslySetInnerHTML={{ __html: tile.face === "bomb" ? BOMB : GEM }} />
      </div>
    </button>
  );
}

function ScratchCard({ code, onClear }: { code: string; onClear: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const onClearRef = useRef(onClear);
  onClearRef.current = onClear;

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const width = wrap.clientWidth;
    const height = 150;
    const ratio = window.devicePixelRatio || 1;
    canvas.width = width * ratio;
    canvas.height = height * ratio;
    const context = canvas.getContext("2d");
    if (!context) return;
    context.scale(ratio, ratio);
    const shine = context.createLinearGradient(0, 0, width, height);
    shine.addColorStop(0, "#a7f3d0");
    shine.addColorStop(0.3, "#f0fdf4");
    shine.addColorStop(0.55, "#6ee7b7");
    shine.addColorStop(0.8, "#ecfccb");
    shine.addColorStop(1, "#34d399");
    context.fillStyle = shine;
    context.fillRect(0, 0, width, height);
    context.fillStyle = "rgba(6,78,59,.14)";
    context.font = "800 12px sans-serif";
    for (let row = 0; row < 8; row += 1) {
      for (let col = 0; col < 6; col += 1) context.fillText("ZONOFIT", col * 70 - (row % 2) * 35, row * 22 + 14);
    }
    context.fillStyle = "#065f46";
    context.font = "800 15px sans-serif";
    context.textAlign = "center";
    context.fillText("SCRATCH HERE", width / 2, height / 2 + 5);
    context.globalCompositeOperation = "destination-out";
    let drawing = false;
    let done = false;
    let last = 0;
    const paint = (event: PointerEvent) => {
      const box = canvas.getBoundingClientRect();
      context.beginPath();
      context.arc(event.clientX - box.left, event.clientY - box.top, 22, 0, 7);
      context.fill();
      const now = Date.now();
      if (now - last > 60) {
        last = now;
        snd.noise(0.08, 0.18, 5000);
      }
    };
    const check = () => {
      if (done) return;
      const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
      let clear = 0;
      let total = 0;
      for (let i = 3; i < pixels.length; i += 80) {
        total += 1;
        if (pixels[i] === 0) clear += 1;
      }
      if (total > 0 && clear / total > 0.42) {
        done = true;
        canvas.style.transition = "opacity .6s";
        canvas.style.opacity = "0";
        canvas.style.pointerEvents = "none";
        onClearRef.current();
      }
    };
    const down = (event: PointerEvent) => {
      snd.init();
      drawing = true;
      canvas.setPointerCapture(event.pointerId);
      paint(event);
    };
    const move = (event: PointerEvent) => { if (drawing) paint(event); };
    const up = () => { drawing = false; check(); };
    canvas.addEventListener("pointerdown", down);
    canvas.addEventListener("pointermove", move);
    canvas.addEventListener("pointerup", up);
    return () => {
      canvas.removeEventListener("pointerdown", down);
      canvas.removeEventListener("pointermove", move);
      canvas.removeEventListener("pointerup", up);
    };
  }, []);

  return (
    <div className="zg-scr" ref={wrapRef}>
      <div className="u"><div><span>ZONOFIT GIFT</span><b>12.5% OFF</b><span>{code}</span></div></div>
      <canvas ref={canvasRef} />
    </div>
  );
}

export default function LaunchGame() {
  const [ready, setReady] = useState(false);
  const [phase, setPhase] = useState<Phase>("hero");
  const [saved, setSaved] = useState<Saved | null>(null);
  const [soundOn, setSoundOn] = useState(true);
  const [practice, setPractice] = useState(false);
  const [stage, setStageIndex] = useState(0);
  const [tiles, setTiles] = useState<Tile[]>(hiddenTiles);
  const [demoTiles, setDemoTiles] = useState<Tile[]>(hiddenTiles);
  const [shake, setShake] = useState(false);
  const [pop, setPop] = useState(true);
  const [sheet, setSheet] = useState<Sheet | null>(null);
  const [toast, setToast] = useState("");
  const [handle, setHandle] = useState("");
  const [handleError, setHandleError] = useState("");
  const [scratchOpen, setScratchOpen] = useState(false);
  const [restoredLoss, setRestoredLoss] = useState(false);
  const savedRef = useRef<Saved | null>(null);
  const stageRef = useRef(0);
  const practiceRef = useRef(false);
  const bombRef = useRef(0);
  const busyRef = useRef(false);
  const roundRef = useRef(0);
  const ladderRef = useRef<HTMLDivElement>(null);

  function commit(next: Saved | null, nextPhase?: Phase) {
    savedRef.current = next;
    setSaved(next);
    writeSaved(next);
    if (nextPhase) setPhase(nextPhase);
  }

  function showToast(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(""), 1800);
  }

  function finish(outcome: "win" | "loss") {
    roundRef.current += 1;
    busyRef.current = false;
    setSheet(null);
    const current = savedRef.current;
    if (!current) {
      setPhase(outcome === "win" ? "win" : "lose");
      return;
    }
    const stageNow = stageRef.current;
    const next: Saved = {
      ...current,
      result: {
        outcome,
        stage: stageNow,
        reward: outcome === "loss" ? "12.5% OFF" : rewardLabel(stageNow),
        code: outcome === "loss" ? "ZONO125" : makeCode(),
        posted: false,
      },
    };
    commit(next, outcome === "win" ? "win" : "lose");
    if (outcome === "win") {
      confetti();
      sWin();
    }
  }

  function deal() {
    roundRef.current += 1;
    busyRef.current = false;
    setShake(false);
    bombRef.current = Math.floor(Math.random() * 4);
    setTiles(hiddenTiles());
    setPop(false);
    window.setTimeout(() => setPop(true), 30);
    const chip = ladderRef.current?.querySelector(".cur");
    chip?.scrollIntoView({ inline: "center", block: "nearest" });
  }

  function openNext() {
    tap();
    setSheet(null);
    stageRef.current += 1;
    setStageIndex(stageRef.current);
    deal();
  }

  function afterSafe() {
    const stageNow = stageRef.current;
    if (practiceRef.current) {
      if (stageNow === 0) {
        setSheet({
          title: "Nice flip!",
          big: "Gem found",
          body: "Next, you'll see the double or nothing choice.",
          actions: [{ label: "Next round", primary: true, run: openNext }],
        });
      } else {
        setSheet({
          title: "You're ready",
          big: "Let's go",
          body: "In the real game, a bomb ends your run. Claim or double after every safe tile.",
          actions: [{ label: "Start real game", primary: true, run: startReal }],
        });
      }
      return;
    }
    if (stageNow === LADDER.length - 1) {
      confetti();
      sWin();
      setSheet({
        title: "Jackpot cleared",
        big: LADDER[stageNow],
        body: "You beat all 9 stages. Take it.",
        actions: [{ label: `Claim ${LADDER[stageNow]}`, primary: true, run: () => finish("win") }],
      });
      return;
    }
    setSheet({
      title: `Stage ${stageNow + 1} cleared`,
      big: LADDER[stageNow],
      body: `Next stage: ${LADDER[stageNow + 1]}. 1 in 4 tiles is a bomb. A bomb ends the run and opens a scratch card.`,
      actions: [
        { label: `Claim ${LADDER[stageNow]}`, primary: false, run: () => finish("win") },
        { label: `Double or nothing · ${LADDER[stageNow + 1]}`, primary: true, run: openNext },
      ],
    });
  }

  function pick(index: number) {
    if (busyRef.current) return;
    busyRef.current = true;
    snd.init();
    sFlip();
    const bomb = bombRef.current;
    const isBomb = index === bomb;
    const round = roundRef.current;
    setTiles((current) => current.map((tile, tileIndex) => {
      if (tileIndex === index) return { flip: true, face: isBomb ? "bomb" : "safe", ghost: false, locked: true };
      return { ...tile, locked: true };
    }));
    window.setTimeout(() => {
      if (round !== roundRef.current) return;
      setTiles((current) => current.map((tile, tileIndex) => {
        if (tileIndex === index) return tile;
        return { flip: true, face: tileIndex === bomb ? "bomb" : "safe", ghost: true, locked: true };
      }));
      if (isBomb) {
        sBoom();
        setShake(true);
        burst(window.innerWidth / 2, window.innerHeight * 0.45, ["#fb923c", "#ef4444", "#fde047", "#7f1d1d"], 90, 12, 0.3);
        window.setTimeout(() => {
          if (round !== roundRef.current) return;
          if (practiceRef.current) {
            showToast("Boom! No stress, it's practice.");
            deal();
            return;
          }
          finish("loss");
        }, 1100);
        return;
      }
      sSafe();
      burst(window.innerWidth / 2, window.innerHeight * 0.45, ["#bef264", "#34d399", "#fff", "#fde047"], 55, 8, 0.22);
      window.setTimeout(() => {
        if (round !== roundRef.current) return;
        afterSafe();
      }, 900);
    }, 560);
  }

  function startPractice() {
    snd.init();
    tap();
    practiceRef.current = true;
    setPractice(true);
    stageRef.current = 0;
    setStageIndex(0);
    setSheet(null);
    setPhase("game");
    deal();
  }

  function startReal() {
    snd.init();
    tap();
    practiceRef.current = false;
    setPractice(false);
    stageRef.current = 0;
    setStageIndex(0);
    setSheet(null);
    const current = savedRef.current;
    if (current && !current.realStarted) commit({ ...current, realStarted: true });
    setPhase("game");
    deal();
  }

  useEffect(() => {
    const stored = readSaved();
    if (stored?.realStarted && !stored.result && !stored.skipSave) {
      commit({
        ...stored,
        result: { outcome: "abandoned", stage: 0, reward: "", code: "", posted: false },
      }, "closed");
    } else {
      commit(stored, phaseFor(stored));
      if (stored?.result?.outcome === "loss") setRestoredLoss(true);
    }
    setReady(true);
  }, []);

  useEffect(() => {
    const canvas = document.getElementById("zg-fx") as HTMLCanvasElement | null;
    if (!canvas) return;
    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, [ready]);

  useEffect(() => {
    if (phase !== "how") return;
    let alive = true;
    let wait = 0;
    const cycle = () => {
      if (!alive) return;
      const order = [0, 1, 2, 3].sort(() => Math.random() - 0.5);
      const bomb = order[3];
      setDemoTiles(hiddenTiles());
      order.forEach((index, step) => {
        window.setTimeout(() => {
          if (!alive) return;
          setDemoTiles((current) => current.map((tile, tileIndex) => (
            tileIndex === index ? { flip: true, face: tileIndex === bomb ? "bomb" : "safe", ghost: false, locked: true } : tile
          )));
          if (index === bomb) sBoom();
          else sFlip();
        }, 700 + step * 900);
      });
      wait = window.setTimeout(cycle, 700 + 4 * 900 + 1400);
    };
    wait = window.setTimeout(cycle, 600);
    return () => {
      alive = false;
      window.clearTimeout(wait);
    };
  }, [phase]);

  useEffect(() => {
    const result = saved?.result;
    if (!ready || !saved || !result || result.posted || saved.skipSave) return;
    let cancel = false;
    void fetch(`${API}/api/launch-game/result`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      keepalive: true,
      body: JSON.stringify({
        game: "tiles",
        name: saved.name,
        phone: saved.phone,
        age: saved.age,
        sex: saved.sex,
        gym: saved.gym,
        customGym: saved.customGym,
        instagram: saved.instagram,
        stage: result.stage,
        outcome: result.outcome,
        code: result.code,
        website: "",
      }),
    }).then(async (response) => {
      if (cancel) return;
      if (response.ok || response.status === 409) {
        const latest = savedRef.current;
        if (latest?.result && !latest.result.posted) commit({ ...latest, result: { ...latest.result, posted: true } });
      }
    }).catch(() => undefined);
    return () => { cancel = true; };
  }, [ready, saved]);

  function follow(event: ReactMouseEvent<HTMLAnchorElement>) {
    const value = handle.trim().replace(/^@+/, "");
    if (!/^[A-Za-z0-9._]{1,30}$/.test(value)) {
      event.preventDefault();
      setHandleError("Enter your Instagram username first.");
      return;
    }
    setHandleError("");
    showToast("Opening Instagram");
  }

  function copyCode(code: string) {
    void navigator.clipboard?.writeText(code).then(
      () => showToast("Code copied"),
      () => showToast(code),
    );
  }

  function share() {
    const data = {
      title: "ZonoFit Lucky Challenge",
      text: "I just played the ZonoFit Lucky Challenge. Try your luck for free gym months!",
      url: "https://zonofit.com/launch-game",
    };
    if (navigator.share) {
      void navigator.share(data).catch(() => undefined);
      return;
    }
    window.open(`https://wa.me/?text=${encodeURIComponent(`${data.text} ${data.url}`)}`, "_blank", "noopener,noreferrer");
  }

  if (!ready) return <div className="zg" />;

  const result = saved?.result;
  const playingFor = practice ? "Practice" : LADDER[stage];

  return (
    <div className="zg">
      <div className="zg-mesh" aria-hidden="true">
        <div className="zg-orb zg-o1" />
        <div className="zg-orb zg-o2" />
        <div className="zg-orb zg-o3" />
      </div>
      <canvas id="zg-fx" className="zg-fx" aria-hidden="true" />
      <div className={`zg-toast${toast ? " on" : ""}`}>{toast}</div>
      <div className="zg-wrap">
        <div className="zg-top">
          <a className="zg-brand" href="https://zonofit.com"><span className="zg-logo">Z</span>ZonoFit</a>
          <button
            className="zg-snd"
            type="button"
            onClick={() => {
              snd.on = !snd.on;
              setSoundOn(snd.on);
              snd.init();
              tap();
            }}
          >
            {soundOn ? "Sound on" : "Sound off"}
          </button>
        </div>

        {phase === "hero" ? (
          <section className="zg-screen">
            <div className="zg-pill"><i />Lucky Challenge · Free to play</div>
            <h1 className="zg-h1">Win a <span className="zg-gt">free month</span> at your gym.</h1>
            <p className="zg-lead">Flip the tiles, dodge the bomb, and climb to 3 months free. Everyone walks away with something.</p>
            <div className="zg-float">
              <div className="zg-fc"><div><span>Jackpot</span><br /><b>3 months free</b></div><span>Stage 9</span></div>
              <div className="zg-fc"><div><span>Big win</span><br /><b>1 month free</b></div><span>Stage 8</span></div>
              <div className="zg-fc"><div><span>Warm up</span><br /><b>1%–64% off</b></div><span>Stages 1–7</span></div>
            </div>
            <button className="zg-btn" type="button" onClick={() => { snd.init(); tap(); setPhase("form"); }}>Play free</button>
            <div className="zg-hint">60 seconds · No payment needed</div>
          </section>
        ) : null}

        {phase === "form" ? (
          <section className="zg-screen">
            <button className="zg-back" type="button" onClick={() => setPhase("hero")}>Back</button>
            <div className="zg-pill"><i />Step 1 of 2</div>
            <h2 className="zg-h2">Let&apos;s get to <span className="zg-gt">know you</span></h2>
            <p className="zg-lead">Same details as the Udaipur launch form. We confirm your mobile number with a code. That number can play once.</p>
            <LaunchOfferForm
              embed
              verifyPhone
              endpointPath="/api/launch-game"
              source="launch-game"
              submitLabel="Continue"
              panelTitle="Register to play"
              panelNote="Udaipur. One verified number. One game."
              onSuccess={(entry) => commit(entry, "how")}
            />
          </section>
        ) : null}

        {phase === "how" ? (
          <section className="zg-screen">
            <div className="zg-pill"><i />Step 2 of 2 · Quick demo</div>
            <h2 className="zg-h2">How to <span className="zg-gt">play</span></h2>
            <p className="zg-lead">Watch once, then try a practice round. No prizes, no pressure.</p>
            <div className="zg-board"><div className="zg-tiles">{demoTiles.map((tile, index) => <TileFace key={index} tile={tile} />)}</div></div>
            <div className="zg-steps">
              <div className="zg-st"><div className="n">1</div><div><b>Pick a tile</b><span>3 are safe, 1 hides a bomb. It moves every round.</span></div></div>
              <div className="zg-st"><div className="n">2</div><div><b>Climb the ladder</b><span>1% · 2% · 4% · 8% · 16% · 32% · 64% · 1 month · 3 months.</span></div></div>
              <div className="zg-st"><div className="n">3</div><div><b>Claim or double</b><span>After each safe tile, take your prize or risk it for the next.</span></div></div>
            </div>
            <button className="zg-btn" type="button" onClick={startPractice}>Try a practice round</button>
            <div className="zg-row"><button className="zg-btn alt" type="button" onClick={startReal}>Skip, play for real</button></div>
          </section>
        ) : null}

        {phase === "game" ? (
          <section className="zg-screen">
            <div className="zg-hud">
              <div>
                <small>{practice ? "Practice round" : "Playing for"}</small>
                <div className={`zg-pf zg-gt${pop ? " pop" : ""}`}>{playingFor}</div>
              </div>
              <div className="zg-risk">{practice ? `Practice · ${Math.min(stage + 1, 2)} of 2` : `Stage ${stage + 1} · 1 in 4 is a bomb`}</div>
            </div>
            <div className="zg-ladder" ref={ladderRef}>
              {LADDER.map((label, index) => {
                const className = [
                  "zg-lp",
                  index === 8 ? "top" : "",
                  !practice && index < stage ? "done" : "",
                  !practice && index === stage ? "cur" : "",
                ].filter(Boolean).join(" ");
                return <div key={label} className={className}>{label}</div>;
              })}
            </div>
            <div className={`zg-board${shake ? " shake" : ""}`}>
              <div className="zg-tiles">
                {tiles.map((tile, index) => <TileFace key={`${roundRef.current}-${index}`} tile={tile} onClick={() => pick(index)} />)}
              </div>
            </div>
            <div className="zg-hint">{practice ? "Safe tiles are gems. The bomb costs nothing here." : "Tap a tile to flip it"}</div>
          </section>
        ) : null}

        {phase === "win" && result ? (
          <section className="zg-screen">
            <div className="zg-pill"><i />You won</div>
            <h2 className="zg-h2">Congrats <span className="zg-gt">{saved?.name}</span></h2>
            <div className="zg-tkt">
              <small>YOUR REWARD</small>
              <div className="zg-big">{result.reward}</div>
              <div className="zg-code">{result.code}</div>
              <div className="zg-note">Works when the ZonoFit app launches</div>
            </div>
            <div className="zg-glass">
              <label className="zg-label" htmlFor="zg-ig">Instagram username</label>
              <input id="zg-ig" className="zg-in" placeholder="@yourhandle" value={handle} onChange={(event) => setHandle(event.target.value)} />
              <div className="zg-err">{handleError}</div>
              <a className="zg-btn" href={INSTA} target="_blank" rel="noopener noreferrer" onClick={follow}>Follow @zonofit.app &amp; lock reward</a>
              <div className="zg-row">
                <a className="zg-btn alt" href="https://zonofit.com" target="_blank" rel="noopener noreferrer">Visit website</a>
                <button className="zg-btn alt" type="button" onClick={share}>Share</button>
              </div>
              <div className="zg-row"><button className="zg-btn alt" type="button" onClick={() => copyCode(result.code)}>Copy code</button></div>
            </div>
          </section>
        ) : null}

        {phase === "lose" && result ? (
          <section className="zg-screen">
            <div className="zg-pill"><i />Plot twist</div>
            <h2 className="zg-h2">Boom. But you&apos;re <span className="zg-gt">not leaving empty</span>.</h2>
            <p className="zg-lead">Scratch your card to reveal a gift.</p>
            {restoredLoss || scratchOpen ? (
              <div className="zg-scr"><div className="u"><div><span>ZONOFIT GIFT</span><b>12.5% OFF</b><span>{result.code || "ZONO125"}</span></div></div></div>
            ) : (
              <ScratchCard
                code={result.code || "ZONO125"}
                onClear={() => {
                  setScratchOpen(true);
                  sWin();
                  confetti();
                }}
              />
            )}
            <div className="zg-hint">{restoredLoss || scratchOpen ? "Unlocked. Claim below." : "Scratch with your finger"}</div>
            <div className={`zg-glass${restoredLoss || scratchOpen ? "" : " lockd"}`}>
              <label className="zg-label" htmlFor="zg-ig2">Instagram handle to claim</label>
              <input id="zg-ig2" className="zg-in" placeholder="@yourhandle" value={handle} onChange={(event) => setHandle(event.target.value)} />
              <div className="zg-err">{handleError}</div>
              <a className="zg-btn" href={INSTA} target="_blank" rel="noopener noreferrer" onClick={follow}>Follow @zonofit.app &amp; claim</a>
              <div className="zg-row">
                <a className="zg-btn alt" href="https://zonofit.com" target="_blank" rel="noopener noreferrer">Visit website</a>
                <button className="zg-btn alt" type="button" onClick={share}>Share</button>
              </div>
            </div>
          </section>
        ) : null}

        {phase === "closed" ? (
          <section className="zg-screen">
            <div className="zg-pill"><i />One game</div>
            <h2 className="zg-h2">This attempt is <span className="zg-gt">closed</span>.</h2>
            <p className="zg-lead">This number already started its game. A refresh does not open a second one.</p>
            <a className="zg-btn" href="https://zonofit.com">Visit zonofit.com</a>
          </section>
        ) : null}
      </div>

      {sheet ? (
        <div className="zg-shw">
          <div className="zg-sheet">
            <div className="zg-kicker">{sheet.title}</div>
            <div className="zg-big zg-gt pop">{sheet.big}</div>
            <p className="zg-lead">{sheet.body}</p>
            {sheet.actions.map((action) => (
              <button key={action.label} className={`zg-btn${action.primary ? "" : " alt"}`} style={{ marginTop: 10 }} type="button" onClick={action.run}>
                {action.label}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
