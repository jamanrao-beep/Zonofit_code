/** Lines and Dots. The player who draws the fourth side owns that box. */

export type DotsFinish = {
  outcome: "win" | "draw" | "loss";
  you: number;
  zonofit: number;
};

export function mountDots(options: {
  board: SVGSVGElement;
  hud: HTMLElement;
  boxes: number;
  skill: number;
  cannotWin: boolean;
  playerName: string;
  onFinish: (result: DotsFinish) => void;
}): () => void {
  const { board, hud, boxes, skill, cannotWin, playerName, onFinish } = options;
  const TURN_SECONDS = 10;
  const n = boxes;
  const horizontal = n * (n + 1);
  const edges = horizontal * 2;
  const total = n * n;
  const hE = (row: number, col: number) => row * n + col;
  const vE = (row: number, col: number) => horizontal + row * (n + 1) + col;
  const edgeBoxes: number[][] = Array.from({ length: edges }, () => []);
  const boxEdges: number[][] = Array.from({ length: total }, () => []);
  for (let row = 0; row < n; row += 1) {
    for (let col = 0; col < n; col += 1) {
      const box = row * n + col;
      const sides = [hE(row, col), hE(row + 1, col), vE(row, col), vE(row, col + 1)];
      boxEdges[box] = sides;
      sides.forEach((edge) => edgeBoxes[edge].push(box));
    }
  }

  function edgeXY(edge: number): [number, number, number, number] {
    if (edge < horizontal) {
      const row = (edge / n) | 0;
      const col = edge % n;
      return [col, row, col + 1, row];
    }
    const k = edge - horizontal;
    const row = (k / (n + 1)) | 0;
    const col = k % (n + 1);
    return [col, row, col, row + 1];
  }

  const used = Array(edges).fill(0);
  const count = Array(total).fill(0);
  const own = Array(total).fill(0);
  const scores: [number, number, number] = [0, 0, 0];
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
    for (let edge = 0; edge < edges; edge += 1) if (!used[edge]) open.push(edge);
    return open;
  }

  function paintScores() {
    if (youScore) youScore.textContent = String(scores[1]);
    if (themScore) themScore.textContent = String(scores[2]);
    youCard?.classList.toggle("on", turn === 1);
    themCard?.classList.toggle("on", turn === 2);
  }

  function paintClaimed(claimed: number[]) {
    const layer = board.querySelector("#zg-bx");
    if (!layer) return;
    const markFor = initial(playerName);
    for (const box of claimed) {
      const owner = own[box];
      if (!owner || layer.querySelector(`[data-b="${box}"]`)) continue;
      const row = (box / n) | 0;
      const col = box % n;
      const mark = owner === 2
        ? `<use href="#zg-lgo" x="${col + 0.22}" y="${row + 0.22}" width="0.56" height="0.56"/>`
        : `<text x="${col + 0.5}" y="${row + 0.54}" font-size="0.42" font-weight="800" fill="#9a6b00" text-anchor="middle" dominant-baseline="central">${markFor}</text>`;
      layer.insertAdjacentHTML(
        "beforeend",
        `<g data-b="${box}" class="pop"><rect x="${col + 0.08}" y="${row + 0.08}" width="0.84" height="0.84" rx="0.08" fill="${owner === 1 ? "#FFE7A8" : "#CFE4A9"}"/>${mark}</g>`,
      );
    }
  }

  function stopTimer() {
    window.clearInterval(timer);
  }

  function repaint(box: number) {
    board.querySelector(`#zg-bx [data-b="${box}"]`)?.remove();
    paintClaimed([box]);
  }

  /** Levels above 2 finish with ZonoFit strictly ahead. The box total stays the same. */
  function holdLead() {
    if (!cannotWin || scores[1] < scores[2]) return;
    const target = Math.floor(total / 2) + 1;
    while (scores[2] < target) {
      const idx = own.findIndex((owner) => owner === 1);
      if (idx < 0) break;
      own[idx] = 2;
      scores[1] -= 1;
      scores[2] += 1;
      repaint(idx);
    }
  }

  function over(): boolean {
    if (scores[1] + scores[2] !== total) return false;
    stopTimer();
    if (finished) return true;
    finished = true;
    holdLead();
    paintScores();
    const you = scores[1];
    const zonofit = scores[2];
    let outcome: DotsFinish["outcome"] = you > zonofit ? "win" : you === zonofit ? "draw" : "loss";
    if (cannotWin) outcome = "loss";
    window.setTimeout(() => {
      if (alive) onFinish({ outcome, you, zonofit });
    }, 700);
    return true;
  }

  function apply(edge: number, who: 1 | 2): { kept: number; claimed: number[] } {
    used[edge] = who;
    const claimed: number[] = [];
    for (const box of edgeBoxes[edge]) {
      count[box] += 1;
      if (count[box] !== 4) continue;
      own[box] = who;
      scores[who] += 1;
      claimed.push(box);
    }
    return { kept: claimed.length, claimed };
  }

  function renderEdge(edge: number, who: 1 | 2, claimed: number[]) {
    board.querySelector<SVGGElement>(`.edge[data-e="${edge}"]`)?.classList.add(who === 1 ? "p" : "a");
    paintClaimed(claimed);
    paintScores();
  }

  function undo(edge: number, who: 1 | 2) {
    for (const box of edgeBoxes[edge]) {
      if (count[box] === 4 && own[box] === who) {
        own[box] = 0;
        scores[who] -= 1;
      }
      count[box] -= 1;
    }
    used[edge] = 0;
  }

  function capturable(): number[] {
    const found: number[] = [];
    for (let box = 0; box < total; box += 1) {
      if (count[box] !== 3) continue;
      const edge = boxEdges[box].find((side) => !used[side]);
      if (edge !== undefined) found.push(edge);
    }
    return found;
  }

  /** How many boxes the player would take if ZonoFit plays this edge and then stops. */
  function giftSize(edge: number): number {
    const played: { edge: number; who: 1 | 2 }[] = [];
    apply(edge, 2);
    played.push({ edge, who: 2 });
    let gift = 0;
    while (played.length < total) {
      const next = capturable();
      if (!next.length) break;
      const move = apply(next[0], 1);
      played.push({ edge: next[0], who: 1 });
      gift += move.kept;
      if (!move.kept) break;
    }
    for (let i = played.length - 1; i >= 0; i -= 1) undo(played[i].edge, played[i].who);
    return gift;
  }

  function aiPick(): number {
    const open = free();
    const takes = open.filter((edge) => edgeBoxes[edge].some((box) => count[box] === 3));
    if (skill >= 1 && takes.length && (skill > 1 || Math.random() < 0.92)) {
      if (skill < 2) return takes[(Math.random() * takes.length) | 0];
      let best = takes[0];
      let most = -1;
      for (const edge of takes) {
        const closes = edgeBoxes[edge].filter((box) => count[box] === 3).length;
        if (closes > most) {
          most = closes;
          best = edge;
        }
      }
      return best;
    }
    if (skill >= 2 || (skill === 1 && Math.random() < 0.5)) {
      const safe = open.filter((edge) => edgeBoxes[edge].every((box) => count[box] < 2));
      if (safe.length) {
        if (skill < 3) return safe[(Math.random() * safe.length) | 0];
        let best = safe[0];
        let lowest = 99;
        for (const edge of safe) {
          const rank = edgeBoxes[edge].reduce((sum, box) => sum + count[box], 0);
          if (rank < lowest) {
            lowest = rank;
            best = edge;
          }
        }
        return best;
      }
      let best = open[0];
      let fewest = 9999;
      const giving = open.filter((edge) => edgeBoxes[edge].some((box) => count[box] === 2));
      const pool = giving.length ? giving : open;
      const step = Math.max(1, Math.ceil(pool.length / 24));
      for (let i = 0; i < pool.length; i += step) {
        const gift = skill >= 3 ? giftSize(pool[i]) : edgeBoxes[pool[i]].filter((box) => count[box] === 2).length;
        if (gift < fewest) {
          fewest = gift;
          best = pool[i];
        }
      }
      return best;
    }
    return open[(Math.random() * open.length) | 0];
  }

  function autoPick(): number {
    const open = free();
    const takes = open.filter((edge) => edgeBoxes[edge].some((box) => count[box] === 3));
    if (takes.length) return takes[0];
    const safe = open.filter((edge) => edgeBoxes[edge].every((box) => count[box] < 2));
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
      const move = apply(edge, 2);
      if (think) think.hidden = true;
      if (!move.kept) turn = 1;
      renderEdge(edge, 2, move.claimed);
      busy = false;
      if (over()) return;
      if (move.kept) aiTurn();
      else startTimer();
    }, 280);
  }

  function humanMove(edge: number) {
    if (busy || turn !== 1 || used[edge] || finished) return;
    stopTimer();
    const move = apply(edge, 1);
    renderEdge(edge, 1, move.claimed);
    if (over()) return;
    if (!move.kept) {
      turn = 2;
      paintScores();
      aiTurn();
    } else {
      startTimer();
    }
  }

  board.setAttribute("viewBox", `-0.5 -0.5 ${n + 1} ${n + 1}`);

  let marks = "";
  for (let edge = 0; edge < edges; edge += 1) {
    const [a, b, c, d] = edgeXY(edge);
    const along = 0.16;
    const across = 0.38;
    const x = Math.min(a, c) - (a === c ? across : along);
    const y = Math.min(b, d) - (b === d ? across : along);
    const w = a === c ? across * 2 : 1 - along * 2;
    const h = b === d ? across * 2 : 1 - along * 2;
    marks += `<g class="edge" data-e="${edge}"><line pathLength="1" x1="${a}" y1="${b}" x2="${c}" y2="${d}"></line><rect x="${x}" y="${y}" width="${w}" height="${h}"></rect></g>`;
  }
  let dots = "";
  for (let row = 0; row <= n; row += 1) {
    for (let col = 0; col <= n; col += 1) {
      dots += `<circle cx="${col}" cy="${row}" r="0.12" fill="#35782B" pointer-events="none"></circle>`;
    }
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
