const test = require("node:test");
const assert = require("node:assert/strict");

test("challenge rewards map to the stored percent", () => {
  const { rewardPercentTenths, percentFromTenths } = require("../dist/lib/launchReferral.js");
  assert.equal(rewardPercentTenths("1% OFF"), 10);
  assert.equal(rewardPercentTenths("2% OFF"), 20);
  assert.equal(rewardPercentTenths("4% OFF"), 40);
  assert.equal(rewardPercentTenths("8% OFF"), 80);
  assert.equal(rewardPercentTenths("12.5% OFF"), 125);
  assert.equal(rewardPercentTenths("16% OFF"), 160);
  assert.equal(percentFromTenths(125), 12.5);
  assert.equal(percentFromTenths(40), 4);
  assert.equal(rewardPercentTenths("32% OFF"), null);
  assert.equal(rewardPercentTenths("1 month free"), null);
  assert.equal(rewardPercentTenths(""), null);
});
