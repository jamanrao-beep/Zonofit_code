const test = require("node:test");
const assert = require("node:assert/strict");

const { normalizeIndianMobile, phonesInSheetCsv, sheetRowHasResult } = require("../dist/lib/launchSheet.js");

const csv = [
  "Time,Name ,Mobile ,Age,Sex,Gym,request gym,Source ,",
  "t,A,+919876543210,22,Male,Pro Fitness Studio,—,—,launch-udaipur",
  "t,B,9876543211,21,Female,Zoro Fitness,—,—,launch-game ZF-1",
  't,C,+91 98765 43212,30,Other,"B&H Gym, Main",RESULT Level 2 Easy win You 9 ZonoFit 7,—,launch-game-result',
].join("\n");

test("sheet phones accept +91, local, and spaced numbers once", () => {
  assert.equal(normalizeIndianMobile("+91 98765 43210"), "9876543210");
  assert.equal(normalizeIndianMobile("09876543210"), "9876543210");
  assert.equal(normalizeIndianMobile("5876543210"), null);
  const phones = phonesInSheetCsv(csv);
  assert.deepEqual(phones, ["9876543210", "9876543211", "9876543212"]);
});

test("a result row is recognized without treating a registration as a result", () => {
  assert.equal(sheetRowHasResult(csv, "9876543212"), true);
  assert.equal(sheetRowHasResult(csv, "9876543211"), false);
  assert.equal(sheetRowHasResult(csv, "9876543210"), false);
});
