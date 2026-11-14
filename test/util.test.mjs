// 日付と、HTML エスケープ・簡易 Markdown（md）のテスト。DB の内容は信頼できないので、エスケープを重点的に確かめる。
import { test } from "node:test";
import assert from "node:assert/strict";
import { addDays, dayLabel, esc, inline, md } from "../app/js/util.js";

test("addDays: 月・年またぎ", () => {
  assert.equal(addDays("2026-11-30", 1), "2026-12-01");
  assert.equal(addDays("2026-01-01", -1), "2025-12-31");
  assert.equal(addDays("2026-03-01", -1), "2026-02-28");
});

test("dayLabel: 月/日（曜日）", () => {
  assert.equal(dayLabel("2026-11-14"), "11/14（土）");
});

test("esc: HTML の特殊文字をエスケープし、null は空文字", () => {
  assert.equal(esc(`<img src=x onerror="a">&'`), "&lt;img src=x onerror=&quot;a&quot;&gt;&amp;&#39;");
  assert.equal(esc(null), "");
});

test("md: タグを含む本文はエスケープされ、要素にならない", () => {
  const html = md("<script>alert(1)</script>\n\n`<b>x</b>`");
  assert.ok(!html.includes("<script"));
  assert.ok(html.includes("&lt;script&gt;"));
  assert.ok(html.includes("<code>&lt;b&gt;x&lt;/b&gt;</code>"));
});

test("md: コードブロック・箇条書き・太字", () => {
  assert.equal(md("```js\n<a>\n```"), "<pre><code>&lt;a&gt;</code></pre>");
  assert.equal(md("- a\n- b"), "<ul><li>a</li><li>b</li></ul>");
  assert.equal(inline("**太字**と`コード`"), "<b>太字</b>と<code>コード</code>");
});
