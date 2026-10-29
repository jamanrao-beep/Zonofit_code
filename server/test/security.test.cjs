const test = require("node:test");
const assert = require("node:assert/strict");

process.env.JWT_SECRET = "test-secret-that-is-long-enough-for-hmac";

const { signToken, verifyToken } = require("../dist/lib/jwt.js");
const { adminArea, roleCanAccess } = require("../dist/lib/adminAccess.js");
const { normalizePhone } = require("../dist/lib/phone.js");
const { normalizeAppPassword, emailOtpKey } = require("../dist/lib/mail.js");
const {
  bookingDiscountCredits,
  marketplaceDiscountPaise,
  isCancellationTooLate,
} = require("../dist/lib/couponMath.js");

test("a signed token verifies and an edited token does not", () => {
  const token = signToken({ dbUserId: "user-1", phone: "9999999999" });
  const payload = verifyToken(token);
  assert.equal(payload.dbUserId, "user-1");
  assert.ok(payload.exp > Date.now());

  const [body] = token.split(".");
  assert.equal(verifyToken(`${body}.tampered`), null);
});

test("the old public token secret is rejected", () => {
  const previous = process.env.JWT_SECRET;
  process.env.JWT_SECRET = "zonofit_super_secret_key_1234567890";
  assert.throws(() => signToken({ dbUserId: "user-1" }));
  process.env.JWT_SECRET = previous;
});

test("a gmail app password is the 16 letters Google shows", () => {
  assert.equal(normalizeAppPassword("abcd efgh ijkl mnop"), "abcdefghijklmnop");
  assert.equal(normalizeAppPassword("short"), null);
  assert.equal(normalizeAppPassword("placeholderpassx"), null);
});

test("email codes are stored under a hash of the address", () => {
  assert.equal(emailOtpKey("A@gmail.com"), emailOtpKey("a@gmail.com"));
  assert.notEqual(emailOtpKey("a@gmail.com"), emailOtpKey("b@gmail.com"));
  assert.equal(emailOtpKey("a@gmail.com").length, 64);
});

test("phone numbers collapse to the last 10 digits", () => {
  assert.equal(normalizePhone("9876543210"), "9876543210");
  assert.equal(normalizePhone("+91 98765 43210"), "9876543210");
  assert.equal(normalizePhone("919876543210"), "9876543210");
  assert.equal(normalizePhone("123456789012345"), "6789012345");
  assert.equal(normalizePhone("12345"), null);
  assert.equal(normalizePhone("1234567890123456"), null);
  assert.equal(normalizePhone(""), null);
  assert.equal(normalizePhone(9876543210), null);
});

test("booking coupons use the credit formulas", () => {
  assert.equal(bookingDiscountCredits("PERCENTAGE", 15, 8), 1);
  assert.equal(bookingDiscountCredits("CREDITS", 5, 8), 5);
  assert.equal(bookingDiscountCredits("FIXED_AMOUNT", 50, 8), 5);
  assert.equal(bookingDiscountCredits("RUPEES", 50, 8), 5);
  assert.equal(bookingDiscountCredits("PERCENTAGE", 0, 8), 0);
  assert.equal(bookingDiscountCredits("OTHER", 50, 8), null);
});

test("marketplace coupons use the paise formulas", () => {
  assert.equal(marketplaceDiscountPaise("PERCENTAGE", 10, 10000), 1000);
  assert.equal(marketplaceDiscountPaise("FIXED_AMOUNT", 50, 10000), 5000);
  assert.equal(marketplaceDiscountPaise("RUPEES", 50, 10000), 5000);
  assert.equal(marketplaceDiscountPaise("PERCENTAGE", 0, 10000), 0);
  assert.equal(marketplaceDiscountPaise("CREDITS", 5, 10000), "credits-only");
  assert.equal(marketplaceDiscountPaise("OTHER", 50, 10000), "unsupported");
});

test("a visit can be cancelled until it is under 2 hours away", () => {
  const now = new Date("2026-10-29T10:00:00.000Z");
  assert.equal(isCancellationTooLate(new Date(now.getTime() + 2 * 60 * 60 * 1000), now), false);
  assert.equal(isCancellationTooLate(new Date(now.getTime() + 2 * 60 * 60 * 1000 - 1), now), true);
});

test("admin roles can only open their own areas", () => {
  assert.equal(roleCanAccess("FINANCE_ADMIN", "/api/admin/payouts/process", "POST"), true);
  assert.equal(roleCanAccess("SUPPORT_AGENT", "/api/admin/payouts/process", "POST"), false);
  assert.equal(roleCanAccess("SUPPORT_AGENT", "/api/admin/users/abc/action", "POST"), false);
  assert.equal(roleCanAccess("SUPPORT_AGENT", "/api/admin/users", "GET"), true);
  assert.equal(roleCanAccess("SALES_REP", "/api/admin/gyms/abc", "DELETE"), false);
  assert.equal(roleCanAccess("OPS_MANAGER", "/api/admin/gyms/abc", "DELETE"), true);
  assert.equal(roleCanAccess("FOUNDER", "/api/admin/settings", "PUT"), true);
  assert.equal(roleCanAccess("MARKETING_MANAGER", "/api/admin/settings", "PUT"), false);
  assert.equal(adminArea("/api/admin/gyms/abc/plans", "POST"), "gyms");
  assert.equal(adminArea("/api/admin/plans", "GET"), "plans");
});
