const test = require("node:test");
const assert = require("node:assert/strict");

const { challengeUrlForAmount, readPluralUpiChallenge } = require("../dist/services/plural.js");

const link = "upi://pay?mode=04&pa=pinelabs.24092@hdfcbank&pn=Pine%20Test&mc=6012&cu=INR&am=1.00&tr=68706&tn=Payment%20for%20v1";

test("keeps a Pine Labs UPI link when the amount matches the order", () => {
  assert.equal(challengeUrlForAmount(link, 100), link);
  assert.equal(challengeUrlForAmount(link, 200), null);
  assert.equal(challengeUrlForAmount(link, 99), null);
  assert.equal(challengeUrlForAmount("https://example.com/pay?am=1.00&pa=someone@bank", 100), null);
  assert.equal(challengeUrlForAmount("upi://pay?pa=someone@bank", 100), null);
});

test("rejects a UPI response whose reported paise does not match", () => {
  const body = {
    data: {
      challenge_url: link,
      order_amount: { value: 100, currency: "INR" },
      payments: [{ payment_amount: { value: 100, currency: "INR" } }],
    },
  };
  assert.equal(readPluralUpiChallenge(body, 100), link);
  assert.equal(readPluralUpiChallenge(body, 2500), null);
  assert.equal(readPluralUpiChallenge({
    data: {
      challenge_url: link,
      order_amount: { value: 100, currency: "INR" },
      payments: [{ payment_amount: { value: 2500, currency: "INR" } }],
    },
  }, 100), null);
});
