const test = require("node:test");
const assert = require("node:assert/strict");

test("a referred friend counts toward one free month", () => {
  const { friendQualifies, waiverPaise, referralProgressView, REFERRAL_GOAL } = require("../dist/lib/referralRewards.js");

  assert.equal(friendQualifies(3000, 3000), true);
  assert.equal(friendQualifies(3001, 3000), true);
  assert.equal(friendQualifies(2999, 3000), false);
  assert.equal(friendQualifies(0, 3000), false);
  assert.equal(friendQualifies(3000, 0), false);

  assert.equal(waiverPaise(2500, 250000), 250000);
  assert.equal(waiverPaise(2500, 400000), 250000);
  assert.equal(waiverPaise(0, 250000), 0);
  assert.equal(waiverPaise(2500, 0), 0);
  assert.equal(waiverPaise(1.5, 250000), 0);

  const empty = referralProgressView({
    qualified: 0,
    openMonths: 0,
    redeemedMonths: 0,
    creditsGranted: 0,
    openWorthRupees: 0,
    gymMonthlyRupees: 2500,
  });
  assert.equal(empty.joined, 0);
  assert.equal(empty.toUnlock, 4);
  assert.equal(empty.worthRupees, 2500);
  assert.equal(empty.monthReady, false);

  const three = referralProgressView({
    qualified: 3,
    openMonths: 0,
    redeemedMonths: 0,
    creditsGranted: 20,
    openWorthRupees: 0,
    gymMonthlyRupees: 2500,
  });
  assert.equal(three.joined, 3);
  assert.equal(three.toUnlock, 1);
  assert.equal(three.creditsEarned, 20);

  const unlocked = referralProgressView({
    qualified: 4,
    openMonths: 1,
    redeemedMonths: 0,
    creditsGranted: 20,
    openWorthRupees: 2500,
    gymMonthlyRupees: 3000,
  });
  assert.equal(unlocked.joined, 4);
  assert.equal(unlocked.toUnlock, 0);
  assert.equal(unlocked.monthReady, true);
  assert.equal(unlocked.nextCycleStarted, false);
  assert.equal(unlocked.worthRupees, 2500);

  const next = referralProgressView({
    qualified: 5,
    openMonths: 1,
    redeemedMonths: 0,
    creditsGranted: 25,
    openWorthRupees: 2500,
    gymMonthlyRupees: 3000,
  });
  assert.equal(next.joined, 1);
  assert.equal(next.toUnlock, 3);
  assert.equal(next.nextCycleStarted, true);
  assert.equal(next.monthReady, true);

  const used = referralProgressView({
    qualified: 4,
    openMonths: 0,
    redeemedMonths: 1,
    creditsGranted: 20,
    openWorthRupees: 0,
    gymMonthlyRupees: 2500,
  });
  assert.equal(used.joined, 0);
  assert.equal(used.monthReady, false);
  assert.equal(used.worthRupees, 2500);

  const second = referralProgressView({
    qualified: 8,
    openMonths: 1,
    redeemedMonths: 1,
    creditsGranted: 45,
    openWorthRupees: 1800,
    gymMonthlyRupees: 2500,
  });
  assert.equal(second.joined, REFERRAL_GOAL);
  assert.equal(second.monthReady, true);
  assert.equal(second.worthRupees, 1800);
  assert.equal(second.creditsEarned, 45);
});
