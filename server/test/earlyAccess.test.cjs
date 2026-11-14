const test = require("node:test");
const assert = require("node:assert/strict");

test("early access votes keep a real queue spot and reject unknown chips", () => {
  const { canonicalFeature, normalizeVote, memberEntries, parseVote, ideasShared } = require("../dist/lib/earlyAccess.js");

  assert.equal(canonicalFeature("buddy-program"), "workout-buddy");
  assert.equal(canonicalFeature("find-trainer"), "trainer-program");
  assert.equal(canonicalFeature("plans"), null);

  const chipsOnly = normalizeVote({
    featureName: "ai-trainer",
    choices: ["Daily nudges", "Daily nudges"],
    idea: "",
  });
  assert.equal(chipsOnly.ok, true);
  assert.deepEqual(chipsOnly.vote.choices, ["Daily nudges"]);
  assert.equal(chipsOnly.vote.storedName, "ai-trainer");

  const ideaOnly = normalizeVote({ featureName: "meal-scan", choices: [], idea: "  Portion photos  " });
  assert.equal(ideaOnly.ok, true);
  assert.equal(ideaOnly.vote.idea, "Portion photos");

  const rejected = normalizeVote({ featureName: "ai-trainer", choices: ["Free protein"], idea: "" });
  assert.equal(rejected.ok, false);

  const empty = normalizeVote({ featureName: "ai-trainer", choices: [], idea: "   " });
  assert.equal(empty.ok, false);

  const legacy = normalizeVote({ featureName: "buddy-program", comment: "Train near campus" });
  assert.equal(legacy.ok, true);
  assert.equal(legacy.vote.storedName, "workout-buddy");
  assert.equal(parseVote(legacy.vote.comment).idea, "Train near campus");
  assert.deepEqual(parseVote("Plain older note"), { choices: [], idea: "Plain older note" });
  assert.equal(ideasShared(["A", "B"], "note"), 3);
  assert.equal(ideasShared(["A"], "  "), 1);

  const rows = [
    { userId: "a", featureName: "buddy-program", comment: '{"v":1,"choices":["Find partners nearby"],"idea":""}', createdAt: "2026-11-01T00:00:00.000Z" },
    { userId: "b", featureName: "workout-buddy", comment: '{"v":1,"choices":[],"idea":"Evening only"}', createdAt: "2026-11-02T00:00:00.000Z" },
    { userId: "b", featureName: "workout-buddy", comment: '{"v":1,"choices":["Streaks together"],"idea":"Evening only"}', createdAt: "2026-11-03T00:00:00.000Z" },
    { userId: "c", featureName: "plans", comment: "Old plan note", createdAt: "2026-11-01T00:00:00.000Z" },
  ];
  const mine = memberEntries(rows, "b");
  assert.equal(mine.length, 1);
  assert.equal(mine[0].featureKey, "workout-buddy");
  assert.equal(mine[0].spot, 2);
  assert.deepEqual(mine[0].choices, ["Streaks together"]);
  assert.equal(mine[0].idea, "Evening only");
  assert.equal(mine[0].ideasShared, 2);
  assert.equal(memberEntries(rows, "c").length, 0);
});
