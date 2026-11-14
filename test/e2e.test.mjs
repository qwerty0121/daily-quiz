// 実際の画面を Chromium（Playwright）で動かすテスト。Playwright が見つからなければ skip する。
// window.claude（db・sample）は test/support/harness.mjs の偽物。回答・書き込み・購読・画面・XSS を確かめる。
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { playwrightOrNull, serve, openApp, writes, waitWrites, question, today, THEMES } from "./support/harness.mjs";

const pw = playwrightOrNull();
const skip = pw ? false : "Playwright が見つからないため skip";
let browser, server;
before(async () => { if (!pw) return; server = await serve(); browser = await pw.chromium.launch(); });
after(async () => { await browser?.close(); await server?.close(); });

const cfg = { dailyGoal: 2, themes: THEMES };
const yesterday = () => { const d = new Date(Date.now() - 86400000), z = (n) => String(n).padStart(2, "0"); return d.getFullYear() + "-" + z(d.getMonth() + 1) + "-" + z(d.getDate()); };

test("起動: 購読は questions と answers で 1 回ずつ。問題と目標が表示される", { skip }, async () => {
  const app = await openApp(browser, server.url, { config: cfg, questions: [question({ prompt: "【ダミー】最初の問題" })] });
  try {
    assert.match(await app.page.locator(".prompt").textContent(), /最初の問題/);
    assert.match(await app.page.locator(".goal").textContent(), /あと 2 問/);
    assert.deepEqual(await app.page.evaluate(() => window.__fake.subCount), { questions: 1, answers: 1 });
    assert.deepEqual(app.errors, []);
  } finally { await app.close(); }
});

test("正解: answers に記録し、questions の復習を更新する（自信あり → 3 日後）", { skip }, async () => {
  const q = question({ answer: 1 });
  const app = await openApp(browser, server.url, { config: cfg, questions: [q] });
  try {
    await app.page.locator('[data-action="answer"][data-idx="1"]').click();
    await waitWrites(app.page, 2);
    const [a, u] = await writes(app.page);
    assert.equal(a.path.split("/")[0], "answers");
    assert.equal(a.fields.qid, q.id);
    assert.equal(a.fields.correct, true);
    assert.equal(a.fields.rating, "sure");
    assert.equal(a.fields.date, today());
    assert.equal(u.path, "questions/" + q.id);
    assert.equal(u.fields.interval, 3);
    assert.equal(u.fields.reps, 1);
    assert.equal(u.fields.lapses, 0);
    assert.match(await app.page.locator(".verdict").textContent(), /正解/);
  } finally { await app.close(); }
});

test("不正解: 1 日後、lapses が増える。「あやふや」ボタンは出ない", { skip }, async () => {
  const q = question({ answer: 0, interval: 5, reps: 2, lapses: 1 });
  const app = await openApp(browser, server.url, { config: cfg, questions: [q] });
  try {
    await app.page.locator('[data-action="answer"][data-idx="2"]').click();
    await waitWrites(app.page, 2);
    const u = (await writes(app.page))[1];
    assert.equal(u.fields.interval, 1);
    assert.equal(u.fields.lapses, 2);
    assert.equal(u.fields.reps, 3);
    assert.equal(await app.page.locator(".unsure").count(), 0);
    assert.match(await app.page.locator(".verdict").textContent(), /不正解/);
  } finally { await app.close(); }
});

test("あやふや: 評価を自信なしに切り替え、間隔を更新する。もう一度押すと戻る", { skip }, async () => {
  const app = await openApp(browser, server.url, { config: cfg, questions: [question()] });
  try {
    await app.page.locator('[data-action="answer"][data-idx="0"]').click();
    await waitWrites(app.page, 2);
    await app.page.locator('[data-action="unsure"]').click();
    await waitWrites(app.page, 4);
    const w = await writes(app.page);
    assert.equal(w[2].fields.rating, "unsure");
    assert.equal(w[3].fields.interval, 1);
    await app.page.locator('[data-action="unsure"]').click();
    await waitWrites(app.page, 6);
    assert.equal((await writes(app.page))[5].fields.interval, 3);
  } finally { await app.close(); }
});

test("次の問題: 期限切れの問題を順に出し、尽きたら生成する（sample.json）", { skip }, async () => {
  const app = await openApp(browser, server.url, { config: cfg, questions: [question({ prompt: "【ダミー】一問目" })] });
  try {
    await app.page.locator('[data-action="answer"][data-idx="0"]').click();
    await waitWrites(app.page, 2);
    await app.page.locator('[data-action="next"]').click();
    await app.page.waitForFunction(() => /生成された問題/.test(document.querySelector(".prompt")?.textContent || ""));
    const w = await writes(app.page);
    const gen = w[w.length - 1];
    assert.equal(gen.op, "set");
    assert.equal(gen.path.split("/")[0], "questions");
    assert.equal(gen.fields.source, "その場で生成");
    assert.equal(gen.fields.theme, "ダミーテーマ");
  } finally { await app.close(); }
});

test("sample が使えないとき: 質問欄と生成ボタンは出ない", { skip }, async () => {
  const app = await openApp(browser, server.url, { config: cfg, questions: [question()], sample: false });
  try {
    await app.page.locator('[data-action="answer"][data-idx="0"]').click();
    await app.page.locator(".verdict").waitFor();
    assert.equal(await app.page.locator(".chat").count(), 0);
  } finally { await app.close(); }
});

test("質問: 回答後に AI へ問題の内容を渡す。回答は HTML として挿入されない", { skip }, async () => {
  const app = await openApp(browser, server.url, { config: cfg, questions: [question({ prompt: "【ダミー】質問される問題" })] });
  try {
    await app.page.evaluate(() => { window.__fake.sampleImpl = async (_i, o) => { o.onText({ text: "<img src=x onerror=\"window.__xss=1\">安全" }); return {}; }; });
    await app.page.locator('[data-action="answer"][data-idx="0"]').click();
    await app.page.locator('[data-action="ask"]').first().click();
    await app.page.locator(".bubble.ai").waitFor();
    await app.page.waitForFunction(() => /安全/.test(document.querySelector(".bubble.ai").textContent));
    assert.equal(await app.page.evaluate(() => window.__xss), undefined);
    assert.equal(await app.page.locator(".bubble.ai img").count(), 0);
    const input = await app.page.evaluate(() => window.__fake.sampleCalls[0]);
    assert.match(input[0].content, /質問される問題/);
    assert.deepEqual(app.errors, []);
  } finally { await app.close(); }
});

test("XSS: 問題文・選択肢・解説・テーマのタグは要素にならない", { skip }, async () => {
  const evil = '<img src=x onerror="window.__xss=1">';
  const q = question({ theme: evil, prompt: evil, choices: [evil, "b"], explanation: evil });
  const app = await openApp(browser, server.url, { config: { dailyGoal: 1, themes: [{ name: evil, status: "有効" }] }, questions: [q] });
  try {
    await app.page.locator('[data-action="answer"][data-idx="0"]').click();
    await app.page.locator(".explain").waitFor();
    await app.page.locator('#tab-history').click();
    assert.equal(await app.page.evaluate(() => window.__xss), undefined);
    assert.equal(await app.page.locator("#view img").count(), 0);
  } finally { await app.close(); }
});

test("履歴: 期間内の回答を集計し、行を開くと解説が出る", { skip }, async () => {
  const q = question({ id: "dummy-hist", prompt: "【ダミー】履歴の問題", explanation: "【ダミー】履歴の解説", due: "2099-01-01" });
  const mk = (id, date, correct) => ({ id, qid: "dummy-hist", theme: "ダミーテーマ", prompt: "【ダミー】履歴の問題", choice: "選択肢A", correctChoice: "選択肢A", correct, rating: correct ? "sure" : "wrong", answeredAt: date + "T03:00:00.000Z", date });
  const app = await openApp(browser, server.url, { config: cfg, questions: [q], answers: [mk("a1", today(), true), mk("a2", yesterday(), false), mk("a3", yesterday(), true)] });
  try {
    await app.page.locator("#tab-history").click();
    const stats = await app.page.locator(".summary").textContent();
    assert.match(stats, /3\s*問/);
    assert.match(stats, /67\s*%/);
    assert.equal(await app.page.locator(".row").count(), 3);
    await app.page.locator('.row [data-action="expand"]').first().click();
    await app.page.waitForFunction(() => /履歴の解説/.test(document.querySelector(".row .detail")?.textContent || ""));
  } finally { await app.close(); }
});

test("db がないとき: 接続できない旨を表示し、エラーを出さない", { skip }, async () => {
  const app = await openApp(browser, server.url, { fake: false });
  try {
    await app.page.waitForFunction(() => /データに接続できません/.test(document.getElementById("view").textContent));
    assert.deepEqual(app.errors, []);
  } finally { await app.close(); }
});
