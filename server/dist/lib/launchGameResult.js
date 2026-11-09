"use strict";
/** Sheet-side result for the lucky challenge. Levels above 2 cannot finish ahead. */
Object.defineProperty(exports, "__esModule", { value: true });
exports.knownLevel = knownLevel;
exports.settleChallenge = settleChallenge;
exports.challengeResultLine = challengeResultLine;
const LEVELS = [
    { n: 1, name: "Beginner", reward: "5% OFF" },
    { n: 2, name: "Easy", reward: "12.5% OFF" },
    { n: 3, name: "Medium", reward: "25% OFF" },
    { n: 4, name: "Hard", reward: "50% OFF" },
    { n: 5, name: "Expert", reward: "1 MONTH MEMBERSHIP" },
    { n: 6, name: "BOSS LEVEL", reward: "3 MONTHS FREE MEMBERSHIP" },
];
function knownLevel(level) {
    return LEVELS.some((item) => item.n === level);
}
function levelName(level) {
    const meta = LEVELS.find((item) => item.n === level);
    return meta ? `${meta.n} ${meta.name}` : String(level);
}
function settleChallenge(level, outcome, you, zonofit) {
    let nextOutcome = outcome;
    let nextYou = you;
    let nextZonofit = zonofit;
    if (nextOutcome !== "abandoned" && nextYou !== null && nextZonofit !== null) {
        if (level > 2 && nextYou > nextZonofit) {
            nextYou = Math.min(nextYou, 2);
            nextZonofit = nextYou + 1;
            nextOutcome = "loss";
        }
        else if (nextYou > nextZonofit) {
            nextOutcome = "win";
        }
        else if (nextYou === nextZonofit) {
            nextOutcome = "draw";
        }
        else {
            nextOutcome = "loss";
        }
    }
    else if (level > 2 && nextOutcome === "win") {
        nextOutcome = "loss";
    }
    const reward = nextOutcome === "win" && level === 2 ? "12.5% OFF" : "";
    return { outcome: nextOutcome, you: nextYou, zonofit: nextZonofit, reward };
}
function challengeResultLine(level, outcome, you, zonofit, reward) {
    const name = levelName(level);
    if (outcome === "abandoned")
        return `RESULT Level ${name} abandoned`;
    const score = you === null || zonofit === null ? "" : ` You ${you} ZonoFit ${zonofit}`;
    return `RESULT Level ${name} ${outcome}${score}${reward ? ` ${reward}` : ""}`;
}
//# sourceMappingURL=launchGameResult.js.map