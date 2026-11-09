const test = require("node:test");
const assert = require("node:assert/strict");

const { extractInclusiveGst, percentOfPaise, percentToBasisPoints } = require("../dist/lib/gst.js");
const {
  cancellationChargePreview,
  freshSupplyAllocation,
  illustrateInclusiveCharge,
  inclusiveGymPayout,
  issueLiveTaxInvoice,
  membershipDocumentPreview,
  membershipEndHaircutPreview,
  membershipExpiryCreditPolicy,
  membershipTaxBranches,
  verifiedAdvanceAllocation,
} = require("../dist/lib/taxDocuments.js");

function expectSplit(grossPaise, ratePercent, taxablePaise, taxPaise, cgstPaise, sgstPaise) {
  const tax = extractInclusiveGst(grossPaise, ratePercent, true);
  assert.equal(tax.taxablePaise, taxablePaise);
  assert.equal(tax.taxPaise, taxPaise);
  assert.equal(tax.cgstPaise, cgstPaise);
  assert.equal(tax.sgstPaise, sgstPaise);
  assert.equal(tax.igstPaise, 0);
  assert.equal(tax.taxablePaise + tax.cgstPaise + tax.sgstPaise, grossPaise);
  assert.equal(tax.customerPaysPaise, undefined);
  assert.equal(tax.grossPaise, grossPaise);
}

test("membership 5% backs out of ₹3,000 and does not add tax on top", () => {
  expectSplit(300000, 5, 285714, 14286, 7143, 7143);
  expectSplit(300000, 5.0, 285714, 14286, 7143, 7143);
});

test("₹80 at 5% keeps the odd paisa on CGST", () => {
  expectSplit(8000, 5, 7619, 381, 191, 190);
});

test("₹2,000 and ₹1,000 at 5% match the renewal and payout samples", () => {
  expectSplit(200000, 5, 190476, 9524, 4762, 4762);
  expectSplit(100000, 5, 95238, 4762, 2381, 2381);
});

test("a ₹20 charge extracts 5% or 18% from the same inclusive amount", () => {
  expectSplit(2000, 5, 1905, 95, 48, 47);
  expectSplit(2000, 18, 1695, 305, 153, 152);
});

test("a ₹200 fee extracts 18% or 5% and the 18% odd paisa goes to CGST", () => {
  expectSplit(20000, 18, 16949, 3051, 1526, 1525);
  expectSplit(20000, 5, 19048, 952, 476, 476);
});

test("2.5% as its own rate is not used twice to make 5%", () => {
  const once = extractInclusiveGst(8000, 2.5, true);
  assert.equal(once.taxablePaise + once.taxPaise, 8000);
  const membership = extractInclusiveGst(8000, 5, true);
  assert.equal(membership.taxPaise, 381);
  assert.notEqual(once.taxPaise * 2, membership.taxPaise);
});

test("other specified rates still add back to the price", () => {
  assert.equal(percentToBasisPoints(12), 1200);
  assert.equal(percentToBasisPoints(28), 2800);
  assert.equal(percentToBasisPoints(0), 0);
  for (const rate of [0, 0.01, 2.5, 3, 5, 12, 18, 28, 100]) {
    for (const gross of [0, 1, 20, 99, 100, 8000, 20000, 100000, 300000]) {
      const intra = extractInclusiveGst(gross, rate, true);
      const inter = extractInclusiveGst(gross, rate, false);
      assert.equal(intra.taxablePaise + intra.cgstPaise + intra.sgstPaise, gross);
      assert.equal(intra.cgstPaise + intra.sgstPaise, intra.taxPaise);
      assert.ok(intra.cgstPaise === intra.sgstPaise || intra.cgstPaise === intra.sgstPaise + 1);
      assert.equal(inter.igstPaise, inter.taxPaise);
      assert.equal(inter.cgstPaise, 0);
      assert.equal(inter.sgstPaise, 0);
      assert.equal(inter.taxablePaise + inter.igstPaise, gross);
      assert.ok(intra.taxPaise <= gross);
    }
  }
});

test("a fresh ₹3,000 supply paid with ₹1,000 credits and ₹2,000 cash is taxed on ₹3,000", () => {
  const allocation = freshSupplyAllocation(300000, 100000, 200000);
  assert.equal(allocation.taxPaise, 14286);
  assert.equal(allocation.supply.taxablePaise, 285714);
  assert.equal(allocation.taxFollowsCashOnly, false);
  assert.notEqual(allocation.taxPaise, extractInclusiveGst(200000, 5, true).taxPaise);
});

test("a verified ₹1,000 advance books only the new ₹95.24", () => {
  const allocation = verifiedAdvanceAllocation(300000, 100000, 200000);
  assert.equal(allocation.advanceAlreadyTaxed.taxablePaise, 95238);
  assert.equal(allocation.advanceAlreadyTaxed.taxPaise, 4762);
  assert.equal(allocation.advanceAlreadyTaxed.cgstPaise, 2381);
  assert.equal(allocation.advanceAlreadyTaxed.sgstPaise, 2381);
  assert.equal(allocation.incremental.taxablePaise, 190476);
  assert.equal(allocation.incremental.taxPaise, 9524);
  assert.equal(allocation.incremental.cgstPaise, 4762);
  assert.equal(allocation.incremental.sgstPaise, 4762);
  assert.equal(allocation.totalTaxPaise, 14286);
});

test("unknown credit history is not treated as an already-taxed advance", () => {
  const branches = membershipTaxBranches({ grossPaise: 300000, gymGstRegistered: true });
  assert.equal(branches.supplierMode, "UNCONFIRMED");
  assert.equal(branches.issuable, false);
  assert.equal(branches.customerPaysPaise, 300000);
  assert.equal(branches.liveInvoicesEnabled, false);
  assert.equal(branches.registeredGymSupplies.taxPaise, 14286);
  assert.equal(branches.registeredGymSupplies.issuable, false);
  assert.equal(branches.unregisteredGymSupplies.gstCharged, false);
  assert.equal(branches.unregisteredGymSupplies.taxPaise, 0);
  assert.equal(branches.unregisteredGymSupplies.customerPaysPaise, 300000);
  assert.equal(branches.zonoFitSupplies.taxPaise, 14286);
  assert.equal(branches.zonoFitSupplies.gstCharged, true);
});

test("an unconfirmed supplier does not become an invoice", () => {
  const blocked = membershipDocumentPreview({ grossPaise: 300000, gymGstRegistered: true });
  assert.equal(blocked.document, "BLOCKED");
  assert.equal(blocked.issuable, false);
  assert.equal(blocked.gstCharged, false);
  assert.equal(blocked.customerPaysPaise, 300000);
  assert.throws(() => issueLiveTaxInvoice(), /blocked/i);
});

test("cancellation keeps the credits and does not post a rupee tax", () => {
  const preview = cancellationChargePreview(2);
  assert.equal(preview.creditsRetained, 2);
  assert.equal(preview.rupeeValueConfirmed, false);
  assert.equal(preview.posted, false);
  assert.equal(preview.issuable, false);
  const atFive = illustrateInclusiveCharge(2000, 5);
  const atEighteen = illustrateInclusiveCharge(2000, 18);
  assert.equal(atFive.taxablePaise, 1905);
  assert.equal(atFive.taxPaise, 95);
  assert.equal(atEighteen.taxablePaise, 1695);
  assert.equal(atEighteen.taxPaise, 305);
  assert.equal(atFive.posted, false);
});

test("a 20% haircut on ₹1,000 carries ₹800 and does not post GST", () => {
  const preview = membershipEndHaircutPreview(100000);
  assert.equal(percentOfPaise(100000, 20), 20000);
  assert.equal(preview.haircutPaise, 20000);
  assert.equal(preview.carriedForwardPaise, 80000);
  assert.equal(preview.posted, false);
  assert.equal(preview.haircutApplied, false);
  assert.equal(preview.ifIndependentFee.taxablePaise, 16949);
  assert.equal(preview.ifIndependentFee.taxPaise, 3051);
  assert.equal(preview.ifIndependentFee.cgstPaise, 1526);
  assert.equal(preview.ifIndependentFee.sgstPaise, 1525);
  assert.equal(preview.ifAncillaryToMembership.taxablePaise, 19048);
  assert.equal(preview.ifAncillaryToMembership.taxPaise, 952);
});

test("a gym payout stays the inclusive contract amount", () => {
  const registered = inclusiveGymPayout(200000, true);
  assert.equal(registered.payablePaise, 200000);
  assert.equal(registered.taxablePaise, 190476);
  assert.equal(registered.cgstPaise, 4762);
  assert.equal(registered.sgstPaise, 4762);
  const unregistered = inclusiveGymPayout(200000, false);
  assert.equal(unregistered.payablePaise, 200000);
  assert.equal(unregistered.gstCharged, false);
  assert.equal(unregistered.taxPaise, 0);
  const perVisit = inclusiveGymPayout(8000, true);
  assert.equal(perVisit.taxablePaise, 7619);
  assert.equal(perVisit.taxPaise, 381);
  assert.equal(perVisit.payablePaise, 8000);
});

test("membership expiry does not cash out credits or post the haircut", () => {
  const policy = membershipExpiryCreditPolicy();
  assert.equal(policy.convertToCash, false);
  assert.equal(policy.postHaircut, false);
});

test("bad money and bad rates are rejected", () => {
  assert.throws(() => extractInclusiveGst(10.5, 5));
  assert.throws(() => extractInclusiveGst(-1, 5));
  assert.throws(() => extractInclusiveGst(300000, 5.005));
  assert.throws(() => extractInclusiveGst(300000, -1));
  assert.throws(() => freshSupplyAllocation(300000, 100000, 100000));
  assert.throws(() => percentOfPaise(100000, 20.5));
});
