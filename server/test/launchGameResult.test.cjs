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

test("levels above 2 cannot finish ahead and a tie stays a draw", () => {
  const lead = settleChallenge(6, "win", 20, 5);
  assert.equal(lead.outcome, "loss");
  assert.equal(lead.you, 2);
  assert.equal(lead.zonofit, 3);
  assert.equal(lead.reward, "");
  const tie = settleChallenge(5, "win", 12, 12);
  assert.equal(tie.outcome, "draw");
  assert.equal(tie.you, 12);
  assert.equal(tie.zonofit, 12);
  const behind = settleChallenge(3, "win", 8, 17);
  assert.equal(behind.outcome, "loss");
  assert.equal(behind.you, 8);
  assert.equal(behind.zonofit, 17);
});

test("an abandoned attempt stays abandoned", () => {
  const left = settleChallenge(4, "abandoned", null, null);
  assert.equal(left.outcome, "abandoned");
  assert.equal(challengeResultLine(4, "abandoned", null, null, ""), "RESULT Level 4 Hard abandoned");
});
