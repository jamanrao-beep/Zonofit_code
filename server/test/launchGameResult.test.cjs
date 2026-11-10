const test = require("node:test");
const assert = require("node:assert/strict");

const { settleChallenge, challengeResultLine } = require("../dist/lib/launchGameResult.js");

test("level 1 can win with no reward and level 2 win keeps 12.5% OFF", () => {
  const easy = settleChallenge(1, "loss", 14, 11);
  assert.equal(easy.outcome, "win");
  assert.equal(easy.reward, "");
  assert.equal(easy.you, 14);
  const reward = settleChallenge(2, "win", 13, 12);
  assert.equal(reward.outcome, "win");
  assert.equal(reward.reward, "12.5% OFF");
});

test("levels above 2 cannot be stored as a win or a draw", () => {
  const { boxesOnLevel } = require("../dist/lib/launchGameResult.js");
  const lead = settleChallenge(6, "win", 320, 305);
  assert.equal(lead.outcome, "loss");
  assert.equal(lead.you + lead.zonofit, 625);
  assert.ok(lead.zonofit > lead.you);
  assert.equal(lead.reward, "");
  assert.equal(boxesOnLevel(6), 625);
  assert.equal(boxesOnLevel(1), 25);
  const tie = settleChallenge(5, "draw", 162, 162);
  assert.equal(tie.outcome, "loss");
  assert.equal(tie.you + tie.zonofit, 324);
  assert.ok(tie.zonofit > tie.you);
  const behind = settleChallenge(3, "win", 40, 60);
  assert.equal(behind.outcome, "loss");
  assert.equal(behind.you, 40);
  assert.equal(behind.zonofit, 60);
});

test("a tile claim stores that stage's prize and a bomb stores 12.5% OFF", () => {
  const { settleTileRun, tileResultLine } = require("../dist/lib/launchGameResult.js");
  const first = settleTileRun(0, "win");
  assert.equal(first.reward, "1% off next plan");
  assert.equal(tileResultLine(0, "win", first.reward, "ZONO-AB12CD"), "RESULT Tiles stage 1 claim 1% off next plan ZONO-AB12CD");
  const months = settleTileRun(8, "win");
  assert.equal(months.reward, "3 months free");
  const bomb = settleTileRun(4, "loss");
  assert.equal(bomb.outcome, "loss");
  assert.equal(bomb.reward, "12.5% OFF");
  assert.equal(settleTileRun(9, "win"), null);
  const left = settleTileRun(3, "abandoned");
  assert.equal(left.outcome, "abandoned");
  assert.equal(left.reward, "");
});

test("an abandoned attempt stays abandoned", () => {
  const left = settleChallenge(4, "abandoned", null, null);
  assert.equal(left.outcome, "abandoned");
  assert.equal(challengeResultLine(4, "abandoned", null, null, ""), "RESULT Level 4 Hard abandoned");
});
