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

test("tile prizes follow the ladder rules", () => {
  const { settleTileRun, tileResultLine } = require("../dist/lib/launchGameResult.js");
  assert.equal(settleTileRun(0, "win").reward, "1% OFF");
  assert.equal(settleTileRun(0, "loss").outcome, "win");
  assert.equal(settleTileRun(0, "loss").reward, "1% OFF");
  assert.equal(settleTileRun(1, "loss").reward, "2% OFF");
  assert.equal(settleTileRun(2, "loss").outcome, "win");
  assert.equal(settleTileRun(2, "loss").reward, "4% OFF");
  assert.equal(settleTileRun(3, "win").reward, "8% OFF");
  assert.equal(settleTileRun(4, "win").reward, "16% OFF");
  assert.equal(settleTileRun(4, "win").outcome, "win");
  assert.equal(settleTileRun(4, "loss").outcome, "loss");
  assert.equal(settleTileRun(4, "loss").reward, "12.5% OFF");
  assert.equal(settleTileRun(4, "draw"), null);
  assert.equal(settleTileRun(5, "loss").reward, "12.5% OFF");
  const past = settleTileRun(5, "win");
  assert.equal(past.outcome, "loss");
  assert.equal(past.reward, "12.5% OFF");
  assert.equal(settleTileRun(8, "win").outcome, "loss");
  assert.equal(settleTileRun(8, "win").reward, "12.5% OFF");
  assert.equal(tileResultLine(4, "win", "16% OFF", "ZONO-AB12CD"), "RESULT Tiles stage 5 claim 16% OFF ZONO-AB12CD");
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
