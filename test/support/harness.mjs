// E2E 用の道具。app/ を配信し、window.claude（db・sample）をメモリ上の偽物に差し替えてブラウザで動かす。
// Playwright は package.json の依存に入れない。見つからなければ playwrightOrNull() が null を返し、E2E は skip される。
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../app");
const MIME = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8" };

export function playwrightOrNull() {
  for (const base of [import.meta.url, "file:///opt/node-tools/"]) {
    try { return createRequire(base)("playwright"); } catch { /* 次へ */ }
  }
  return null;
}

export function serve() {
  const server = http.createServer((req, res) => {
    let p = decodeURIComponent(new URL(req.url, "http://x").pathname);
    if (p === "/") p = "/index.html";
    const file = path.join(ROOT, p);
    if (!file.startsWith(ROOT + path.sep) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404).end(); return; }
    res.writeHead(200, { "content-type": MIME[path.extname(file)] || "application/octet-stream" });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise((resolve) => server.listen(0, "127.0.0.1", () => resolve({
    url: "http://127.0.0.1:" + server.address().port + "/",
    close: () => new Promise((r) => server.close(r)),
  })));
}

// ページ内で動く偽の window.claude。window.__fake から中身の確認・操作ができる。
function installFake(seed) {
  const subs = { config: [], questions: [], answers: [] };
  const fake = {
    docs: { config: new Map(), questions: new Map(), answers: new Map() },
    writes: [], subCount: { questions: 0, answers: 0 }, autoId: 0,
    sampleCalls: [], sampleImpl: null, jsonImpl: null,
  };
  for (const [c, list] of Object.entries(seed.docs)) for (const d of list) fake.docs[c].set(d.id, Object.assign({}, d));
  const rows = (c) => [...fake.docs[c].values()];
  const snap = (c) => ({
    docs: rows(c).map((d) => ({ id: d.id, data: () => { const { id, ...rest } = d; return Object.assign({}, rest); } })),
    metadata: { fromCache: false },
  });
  const apply = (p, fields, merge) => {
    const [c, id] = p.split("/");
    fake.docs[c].set(id, Object.assign({ id }, merge ? fake.docs[c].get(id) : {}, fields));
    (subs[c] || []).forEach((cb) => cb(c === "config" ? { exists: true, data: () => fields, metadata: { fromCache: false } } : snap(c)));
  };
  const docRef = (p) => ({
    id: p.split("/")[1],
    async set(fields) { fake.writes.push({ op: "set", path: p, fields: JSON.parse(JSON.stringify(fields)) }); apply(p, fields, false); },
    async update(fields) { fake.writes.push({ op: "update", path: p, fields: JSON.parse(JSON.stringify(fields)) }); apply(p, fields, true); },
    async get() { const [c, id] = p.split("/"); const d = fake.docs[c].get(id); return { exists: !!d, id, data: () => { const { id: _i, ...rest } = d || {}; return rest; } }; },
    onSnapshot(next) {
      const c = p.split("/")[0];
      subs[c].push(next);
      const d = fake.docs[c].get(p.split("/")[1]);
      setTimeout(() => next({ exists: !!d, data: () => { const { id, ...rest } = d || {}; return rest; }, metadata: { fromCache: false } }), 0);
      return () => {};
    },
  });
  const db = {
    collection(name) {
      const q = {
        where: () => q, orderBy: () => q, limit: () => q,
        doc: (id) => docRef(name + "/" + (id || "auto" + ++fake.autoId)),
        onSnapshot(next) {
          fake.subCount[name]++;
          subs[name].push(next);
          setTimeout(() => next(snap(name)), 0);
          return () => {};
        },
      };
      return q;
    },
    doc: docRef,
  };
  async function sample(input, opts) {
    fake.sampleCalls.push(JSON.parse(JSON.stringify(input)));
    if (fake.sampleImpl) return fake.sampleImpl(input, opts);
    opts.onText({ text: "回答です" });
    return { text: "回答です" };
  }
  sample.json = async (prompt) => {
    fake.sampleCalls.push(prompt);
    if (fake.jsonImpl) return fake.jsonImpl(prompt);
    return { prompt: "生成された問題", choices: ["あ", "い", "う", "え"], answer: 0, explanation: "生成の解説" };
  };
  window.__fake = fake;
  window.claude = { use: async (name) => (name === "db" ? db : name === "sample" && seed.sample ? sample : null) };
}

export async function openApp(browser, base, { config = null, questions = [], answers = [], sample = true, fake = true } = {}) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 800 }, reducedMotion: "reduce" });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  if (fake) {
    const docs = { config: config ? [Object.assign({ id: "settings" }, config)] : [], questions, answers };
    await page.addInitScript(installFake, { docs, sample });
  }
  await page.goto(base);
  if (fake) await page.waitForFunction(() => window.__fake.subCount.questions === 1 && window.__fake.subCount.answers === 1 && !/読み込み中/.test(document.getElementById("view").textContent));
  return { page, ctx, errors, close: () => ctx.close() };
}

export const writes = (page) => page.evaluate(() => window.__fake.writes);
export const waitWrites = (page, n) => page.waitForFunction((k) => window.__fake.writes.length >= k, n);

export const THEMES = [{ name: "ダミーテーマ", priority: "高", status: "有効" }];
export const today = () => { const d = new Date(), z = (n) => String(n).padStart(2, "0"); return d.getFullYear() + "-" + z(d.getMonth() + 1) + "-" + z(d.getDate()); };

let seq = 0;
export function question(over = {}) {
  seq++;
  return Object.assign({
    id: "dummy-q" + seq, theme: "ダミーテーマ", prompt: "【ダミー】問題" + seq,
    choices: ["選択肢A", "選択肢B", "選択肢C", "選択肢D"], answer: 0, explanation: "【ダミー】解説" + seq,
    due: today(), setDate: today(), interval: 0, reps: 0, lapses: 0, source: "dummy",
  }, over);
}
