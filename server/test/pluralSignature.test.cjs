const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("crypto");

const {
  readPluralOrder,
  verifyPluralReturnSignature,
  verifyPluralWebhookSignature,
} = require("../dist/services/plural.js");

const sampleSecret = "abc1234";
const sampleBody = "{\"payload\":\"payload\"}";
const sampleId = "msg_2nEfCaUDn9fynC9Kz2upo1QSydl";
const sampleTimestamp = "1728543028";
const sampleSignature = "v1,Ns46HrH+Nfu9dZtBUVvSLyrOD5JH0SAGlNo3M5yobfQ=";

test("accepts the Pine Labs webhook sample signature", () => {
  const previousWebhook = process.env.PLURAL_WEBHOOK_SECRET;
  const previousClient = process.env.PLURAL_CLIENT_SECRET;
  process.env.PLURAL_WEBHOOK_SECRET = sampleSecret;
  delete process.env.PLURAL_CLIENT_SECRET;
  try {
    const ok = verifyPluralWebhookSignature(Buffer.from(sampleBody), {
      "webhook-id": sampleId,
      "webhook-timestamp": sampleTimestamp,
      "webhook-signature": sampleSignature,
    });
    assert.equal(ok, true);
    assert.equal(
      verifyPluralWebhookSignature(Buffer.from(sampleBody), {
        "webhook-id": sampleId,
        "webhook-timestamp": sampleTimestamp,
        "webhook-signature": "v1,AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=",
      }),
      false
    );
  } finally {
    if (previousWebhook === undefined) delete process.env.PLURAL_WEBHOOK_SECRET;
    else process.env.PLURAL_WEBHOOK_SECRET = previousWebhook;
    if (previousClient === undefined) delete process.env.PLURAL_CLIENT_SECRET;
    else process.env.PLURAL_CLIENT_SECRET = previousClient;
  }
});

test("rejects a webhook when the signing secret is missing", () => {
  const previousWebhook = process.env.PLURAL_WEBHOOK_SECRET;
  const previousClient = process.env.PLURAL_CLIENT_SECRET;
  delete process.env.PLURAL_WEBHOOK_SECRET;
  delete process.env.PLURAL_CLIENT_SECRET;
  try {
    assert.equal(
      verifyPluralWebhookSignature(Buffer.from(sampleBody), {
        "webhook-id": sampleId,
        "webhook-timestamp": sampleTimestamp,
        "webhook-signature": sampleSignature,
      }),
      false
    );
  } finally {
    if (previousWebhook === undefined) delete process.env.PLURAL_WEBHOOK_SECRET;
    else process.env.PLURAL_WEBHOOK_SECRET = previousWebhook;
    if (previousClient === undefined) delete process.env.PLURAL_CLIENT_SECRET;
    else process.env.PLURAL_CLIENT_SECRET = previousClient;
  }
});

test("verifies a hosted-checkout return signature with the raw secret", () => {
  const previous = process.env.PLURAL_CLIENT_SECRET;
  process.env.PLURAL_CLIENT_SECRET = "return-secret";
  try {
    const fields = { order_id: "v1-order", status: "PROCESSED" };
    const payload = "order_id=v1-order&status=PROCESSED";
    const signature = crypto.createHmac("sha256", "return-secret").update(payload).digest("hex").toUpperCase();
    assert.equal(verifyPluralReturnSignature(fields, signature), true);
    assert.equal(verifyPluralReturnSignature(fields, "ab".repeat(32)), false);
  } finally {
    if (previous === undefined) delete process.env.PLURAL_CLIENT_SECRET;
    else process.env.PLURAL_CLIENT_SECRET = previous;
  }
});

test("reads a processed Get Order payload and ignores an authorized one", () => {
  const processed = readPluralOrder({
    data: {
      order_id: "v1-order",
      merchant_order_reference: "cr_1",
      merchant_id: "mid",
      status: "PROCESSED",
      order_amount: { value: 50000, currency: "INR" },
      payments: [{ id: "pay_1", status: "PROCESSED" }],
    },
  });
  assert.equal(processed.status, "PROCESSED");
  assert.equal(processed.amountPaise, 50000);
  assert.equal(processed.paymentId, "pay_1");

  const authorized = readPluralOrder({
    data: {
      order_id: "v1-order",
      status: "AUTHORIZED",
      order_amount: { value: 50000, currency: "INR" },
    },
  });
  assert.equal(authorized.status, "AUTHORIZED");
  assert.notEqual(authorized.status, "PROCESSED");
});
