/** Lines & Dots. Levels above 2 cannot finish ahead of ZonoFit. */

const N = 5;
const NH = N * (N + 1);
const NE = NH * 2;
const BOXES = N * N;
const TURN_SECONDS = 10;

const hE = (r: number, c: number) => r * N + c;
const vE = (r: number, c: number) => NH + r * (N + 1) + c;

const edgeB: number[][] = Array.from({ length: NE }, () => []);
for (let r = 0; r < N; r += 1) {
  for (let c = 0; c < N; c += 1) {
    const box = r * N + c;
    [hE(r, c), hE(r + 1, c), vE(r, c), vE(r, c + 1)].forEach((edge) => edgeB[edge].push(box));
  }
}

function edgeXY(edge: number): [number, number, number, number] {
  if (edge < NH) {
    const r = (edge / N) | 0;
    const c = edge % N;
    return [c, r, c + 1, r];
  }
  const k = edge - NH;
  const r = (k / (N + 1)) | 0;
  const c = k % (N + 1);
  return [c, r, c, r + 1];
}

export type DotsFinish = {
  outcome: "win" | "draw" | "loss";
  you: number;
  zonofit: number;
  reward: string | null;
};

const REWARDS = ["5% OFF", "12.5% OFF", "25% OFF", "50% OFF", "1 MONTH MEMBERSHIP", "3 MONTHS FREE MEMBERSHIP"];

export function mountDots(options: {
  board: SVGSVGElement;
  hud: HTMLElement;
  level: number;
  skill: number;
  playerName: string;
  onFinish: (result: DotsFinish) => void;
}): () => void {
  const { board, hud, level, skill, playerName, onFinish } = options;
  const used = Array(NE).fill(0);
  const cnt = Array(BOXES).fill(0);
  const own = Array(BOXES).fill(0);
  const sc: [number, number, number] = [0, 0, 0];
  let turn = 1;
  let busy = false;
  let finished = false;
  let timer = 0;
  let alive = true;

  const youScore = hud.querySelector<HTMLElement>("[data-you]");
  const themScore = hud.querySelector<HTMLElement>("[data-them]");
  const youCard = hud.querySelector<HTMLElement>("[data-you-card]");
  const themCard = hud.querySelector<HTMLElement>("[data-them-card]");
  const think = hud.querySelector<HTMLElement>("[data-think]");
  const bar = hud.querySelector<HTMLElement>("[data-bar]");
  const fill = hud.querySelector<HTMLElement>("[data-fill]");

  function initial(name: string): string {
    const letter = name.trim().match(/[A-Za-z0-9]/)?.[0] || name.trim()[0] || "U";
    return letter.toUpperCase();
  }

  function free(): number[] {
    const open: number[] = [];
    for (let edge = 0; edge < NE; edge += 1) if (!used[edge]) open.push(edge);
    return open;
  }

  function paintScores() {
    if (youScore) youScore.textContent = String(sc[1]);
    if (themScore) themScore.textContent = String(sc[2]);
    youCard?.classList.toggle("on", turn === 1);
    themCard?.classList.toggle("on", turn === 2);
  }

  function paintBoxes() {
    let layer = board.querySelector("#zg-bx");
    if (!layer) return;
    own.forEach((owner, box) => {
      const existing = layer?.querySelector(`[data-b="${box}"]`);
      if (!owner) {
        existing?.remove();
        return;
      }
      const r = (box / N) | 0;
      const c = box % N;
      const mark = owner === 2
        ? `<use href="#zg-lgo" x="${c + 0.24}" y="${r + 0.24}" width="0.52" height="0.52"/>`
        : `<text x="${c + 0.5}" y="${r + 0.52}" font-size="0.44" font-weight="800" fill="#9a6b00" text-anchor="middle" dominant-baseline="central">${initial(playerName)}</text>`;
      const html = `<g data-b="${box}" class="pop" style="transform-origin:${c + 0.5}px ${r + 0.5}px"><rect x="${c + 0.06}" y="${r + 0.06}" width="0.88" height="0.88" rx="0.1" fill="${owner === 1 ? "#FFE7A8" : "#CFE4A9"}"/>${mark}</g>`;
      if (existing) existing.outerHTML = html;
      else layer?.insertAdjacentHTML("beforeend", html);
      layer = board.querySelector("#zg-bx");
    });
  }

  function enforceCeiling() {
    if (level <= 2) return;
    while (sc[1] > sc[2]) {
      const idx = own.findIndex((owner) => owner === 1);
      if (idx < 0) break;
      own[idx] = 2;
      sc[1] -= 1;
      sc[2] += 1;
    }
    paintBoxes();
    paintScores();
  }

  function stopTimer() {
    window.clearInterval(timer);
  }

  function over(): boolean {
    if (sc[1] + sc[2] !== BOXES) return false;
    stopTimer();
    if (finished) return true;
    finished = true;
    enforceCeiling();
    const you = sc[1];
    const zonofit = sc[2];
    let outcome: DotsFinish["outcome"] = you > zonofit ? "win" : you === zonofit ? "draw" : "loss";
    if (level > 2 && outcome === "win") outcome = "loss";
    const reward = outcome === "win" && level === 2 ? REWARDS[1] : null;
    window.setTimeout(() => {
      if (alive) onFinish({ outcome, you: sc[1], zonofit: sc[2], reward });
    }, 700);
    return true;
  }

  function apply(edge: number, who: 1 | 2): number {
    used[edge] = who;
    let kept = 0;
    for (const box of edgeB[edge]) {
      cnt[box] += 1;
      if (cnt[box] === 4) {
        let owner: 1 | 2 = who;
        if (who === 1 && level > 2 && sc[1] >= 2 && sc[1] + 1 > sc[2]) owner = 2;
        own[box] = owner;
        sc[owner] += 1;
        if (owner === who) kept += 1;
      }
    }
    return kept;
  }

  function renderEdge(edge: number, who: 1 | 2) {
    const node = board.querySelector<SVGGElement>(`.edge[data-e="${edge}"]`);
    node?.classList.add(who === 1 ? "p" : "a");
    paintBoxes();
    paintScores();
  }

  function aiPick(): number {
    const open = free();
    const takes = open.filter((edge) => edgeB[edge].some((box) => cnt[box] === 3));
    if (skill >= 1 && takes.length && (skill > 1 || Math.random() < 0.92)) {
      return takes[(Math.random() * takes.length) | 0];
    }
    if (skill >= 2 || (skill === 1 && Math.random() < 0.5)) {
      const safe = open.filter((edge) => edgeB[edge].every((box) => cnt[box] < 2));
      if (safe.length) return safe[(Math.random() * safe.length) | 0];
      let best = open[0];
      let fewest = 99;
      for (const edge of open) {
        const gives = edgeB[edge].filter((box) => cnt[box] === 2).length;
        if (gives < fewest) {
          fewest = gives;
          best = edge;
        }
      }
      return best;
    }
    return open[(Math.random() * open.length) | 0];
  }

  function autoPick(): number {
    const open = free();
    const takes = open.filter((edge) => edgeB[edge].some((box) => cnt[box] === 3));
    if (takes.length) return takes[0];
    const safe = open.filter((edge) => edgeB[edge].every((box) => cnt[box] < 2));
    const pool = safe.length ? safe : open;
    return pool[(Math.random() * pool.length) | 0];
  }

  function startTimer() {
    stopTimer();
    if (!fill || !bar) return;
    bar.classList.remove("lo");
    fill.style.transition = "none";
    fill.style.transform = "scaleX(1)";
    void fill.offsetWidth;
    fill.style.transition = `transform ${TURN_SECONDS}s linear`;
    fill.style.transform = "scaleX(0)";
    let left = TURN_SECONDS;
    timer = window.setInterval(() => {
      left -= 1;
      if (left <= 3) bar.classList.add("lo");
      if (left <= 0) {
        stopTimer();
        if (turn === 1 && !busy && !finished) humanMove(autoPick());
      }
    }, 1000);
  }

  function aiTurn() {
    busy = true;
    if (think) think.hidden = false;
    window.setTimeout(() => {
      if (!alive || finished) return;
      const edge = aiPick();
      const kept = apply(edge, 2);
      if (think) think.hidden = true;
      if (!kept) turn = 1;
      renderEdge(edge, 2);
      busy = false;
      if (over()) return;
      if (kept) aiTurn();
      else startTimer();
    }, 550);
  }

  function humanMove(edge: number) {
    if (busy || turn !== 1 || used[edge] || finished) return;
    stopTimer();
    const kept = apply(edge, 1);
    renderEdge(edge, 1);
    if (over()) return;
    if (!kept) {
      turn = 2;
      paintScores();
      aiTurn();
    } else {
      startTimer();
    }
  }

  let marks = "";
  for (let edge = 0; edge < NE; edge += 1) {
    const [a, b, c, d] = edgeXY(edge);
    const pad = 0.18;
    const x = Math.min(a, c) - (a === c ? 0.22 : pad);
    const y = Math.min(b, d) - (b === d ? 0.22 : pad);
    const w = a === c ? 0.44 : 1 - 2 * pad;
    const h = b === d ? 0.44 : 1 - 2 * pad;
    marks += `<g class="edge" data-e="${edge}"><line pathLength="1" x1="${a}" y1="${b}" x2="${c}" y2="${d}"></line><rect x="${x}" y="${y}" width="${w}" height="${h}"></rect></g>`;
  }
  let dots = "";
  for (let r = 0; r <= N; r += 1) {
    for (let c = 0; c <= N; c += 1) dots += `<circle cx="${c}" cy="${r}" r="0.07" fill="#35782B" pointer-events="none"></circle>`;
  }
  board.innerHTML = `<defs><symbol id="zg-lgo" viewBox="0 0 32 32"><rect width="32" height="32" rx="9" fill="#90BA2A"/><path d="M10 22 Q16 20 22 11M10 16 Q14 15 19 10" stroke="#fff" stroke-width="2.6" fill="none" stroke-linecap="round"/><circle cx="21" cy="21" r="2.2" fill="#fff"/></symbol></defs><g id="zg-bx"></g>${marks}${dots}`;
  board.querySelectorAll<SVGGElement>(".edge").forEach((node) => {
    node.addEventListener("click", () => humanMove(Number(node.dataset.e)));
  });
  paintScores();
  startTimer();

  return () => {
    alive = false;
    finished = true;
    stopTimer();
  };
}
