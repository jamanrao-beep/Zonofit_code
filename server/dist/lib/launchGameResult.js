"use strict";
/** Sheet-side result for the lucky challenge. Scores are stored as played. */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TILE_LADDER = void 0;
exports.knownLevel = knownLevel;
exports.boxesOnLevel = boxesOnLevel;
exports.settleChallenge = settleChallenge;
exports.tileRewardLabel = tileRewardLabel;
exports.settleTileRun = settleTileRun;
exports.tileResultLine = tileResultLine;
exports.challengeResultLine = challengeResultLine;
const LEVELS = [
    { n: 1, name: "Beginner", reward: "5% OFF" },
    { n: 2, name: "Easy", reward: "12.5% OFF" },
    { n: 3, name: "Medium", reward: "25% OFF" },
    { n: 4, name: "Hard", reward: "50% OFF" },
    { n: 5, name: "Expert", reward: "1 MONTH MEMBERSHIP" },
    { n: 6, name: "BOSS LEVEL", reward: "3 MONTHS FREE MEMBERSHIP" },
];
/** Boxes on one side. Must match the boards in the website game. */
const BOXES_ALONG = [0, 5, 7, 10, 14, 18, 25];
function knownLevel(level) {
    return LEVELS.some((item) => item.n === level);
}
function boxesOnLevel(level) {
    const along = BOXES_ALONG[level];
    return along ? along * along : null;
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
        if (level > 2 && nextYou >= nextZonofit) {
            const sum = nextYou + nextZonofit;
            nextZonofit = Math.floor(sum / 2) + 1;
            nextYou = sum - nextZonofit;
        }
        if (nextYou > nextZonofit)
            nextOutcome = "win";
        else if (nextYou === nextZonofit)
            nextOutcome = "draw";
        else
            nextOutcome = "loss";
        if (level > 2 && nextOutcome !== "loss")
            nextOutcome = "loss";
    }
    const reward = nextOutcome === "win" && level === 2 ? "12.5% OFF" : "";
    return { outcome: nextOutcome, you: nextYou, zonofit: nextZonofit, reward };
}
/** Ladder labels. Stage 0 is 1%. The last two stages are free time, not a percent. */
exports.TILE_LADDER = ["1%", "2%", "4%", "8%", "16%", "32%", "64%", "1 month free", "3 months free"];
const SCRATCH_GIFT = "12.5% OFF";
function tileRewardLabel(stage) {
    const label = exports.TILE_LADDER[stage];
    if (!label)
        return null;
    if (stage <= 4)
        return `${label} OFF`;
    return label;
}
/**
 * 1%, 2%, 4%, and 8% are kept as wins.
 * 16% can be kept. A miss there, and every stage from 32% up, is the 12.5% gift.
 */
function settleTileRun(stage, outcome) {
    if (outcome === "abandoned")
        return { outcome, stage: 0, reward: "" };
    if (outcome === "draw")
        return null;
    if (!Number.isInteger(stage) || stage < 0 || stage >= exports.TILE_LADDER.length)
        return null;
    if (stage <= 3) {
        const reward = tileRewardLabel(stage);
        return reward ? { outcome: "win", stage, reward } : null;
    }
    if (stage === 4 && outcome === "win")
        return { outcome: "win", stage, reward: "16% OFF" };
    return { outcome: "loss", stage, reward: SCRATCH_GIFT };
}
function tileResultLine(stage, outcome, reward, code) {
    const mark = code ? ` ${code}` : "";
    if (outcome === "abandoned")
        return "RESULT Tiles abandoned";
    if (outcome === "loss")
        return `RESULT Tiles bomb stage ${stage + 1} ${reward}${mark}`;
    return `RESULT Tiles stage ${stage + 1} claim ${reward}${mark}`;
}
function challengeResultLine(level, outcome, you, zonofit, reward) {
    const name = levelName(level);
    if (outcome === "abandoned")
        return `RESULT Level ${name} abandoned`;
    const score = you === null || zonofit === null ? "" : ` You ${you} ZonoFit ${zonofit}`;
    return `RESULT Level ${name} ${outcome}${score}${reward ? ` ${reward}` : ""}`;
}
//# sourceMappingURL=launchGameResult.js.map