// 復習間隔（schedule）と、次に出す問題の選び方（nextQuestion など）のテスト。DOM には依存しない。
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";

globalThis.document = { getElementById: () => null }; // state.js が読み込み時に view を探すため
const { S } = await import("../app/js/state.js");
const { TODAY, addDays } = await import("../app/js/util.js");
const { schedule, nextQuestion, todayCount, goal, activeThemes } = await import("../app/js/quiz.js");

beforeEach(() => {
  S.due = []; S.answers = []; S.config = null; S.doneIds = new Set();
});

const prev = (interval = 0, reps = 0, lapses = 0) => ({ interval, reps, lapses });

test("schedule: 不正解は 1 日後で、lapses が増える", () => {
  const s = schedule(prev(10, 3, 1), "wrong");
  assert.deepEqual(s, { interval: 1, due: addDays(TODAY, 1), reps: 4, lapses: 2 });
});

test("schedule: 正解・自信なし", () => {
  assert.equal(schedule(prev(0), "unsure").interval, 1);
  assert.equal(schedule(prev(1), "unsure").interval, 2); // max(2, round(1.3))
  assert.equal(schedule(prev(10), "unsure").interval, 13);
});

test("schedule: 正解・自信あり", () => {
  assert.equal(schedule(prev(0), "sure").interval, 3);
  assert.equal(schedule(prev(4), "sure").interval, 10);
  assert.equal(schedule(prev(100), "sure").interval, 180); // 上限
});

test("schedule: 正解では lapses が増えない", () => {
  assert.equal(schedule(prev(2, 1, 2), "sure").lapses, 2);
});

test("nextQuestion: 今日出題のものを先に、次に期限の古い順", () => {
  S.due = [
    { id: "a", setDate: addDays(TODAY, -3), due: addDays(TODAY, -2), choices: ["x", "y"] },
    { id: "b", setDate: TODAY, due: TODAY, choices: ["x", "y"] },
    { id: "c", setDate: addDays(TODAY, -5), due: addDays(TODAY, -4), choices: ["x", "y"] },
  ];
  assert.equal(nextQuestion().id, "b");
  S.doneIds.add("b");
  assert.equal(nextQuestion().id, "c");
});

test("nextQuestion: 選択肢が壊れた問題は出さない", () => {
  S.due = [{ id: "a", due: TODAY, choices: ["x"] }, { id: "b", due: TODAY }];
  assert.equal(nextQuestion(), null);
});

test("nextQuestion: 有効なテーマがあるときは、そのテーマの問題だけ出す", () => {
  S.config = { themes: [{ name: "有効", status: "有効" }, { name: "停止", status: "一時停止" }] };
  S.due = [
    { id: "a", theme: "停止", due: TODAY, choices: ["x", "y"] },
    { id: "b", theme: "有効", due: TODAY, choices: ["x", "y"] },
  ];
  assert.equal(nextQuestion().id, "b");
});

test("todayCount / goal / activeThemes", () => {
  S.answers = [{ date: TODAY }, { date: TODAY }, { date: addDays(TODAY, -1) }];
  assert.equal(todayCount(), 2);
  assert.equal(goal(), 1);
  S.config = { dailyGoal: 3, themes: [{ name: "a", status: "有効" }, { name: "b", status: "一時停止" }, null, {}] };
  assert.equal(goal(), 3);
  assert.deepEqual(activeThemes().map((t) => t.name), ["a"]);
});
