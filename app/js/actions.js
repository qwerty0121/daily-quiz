// 回答・次の問題・問題の生成・履歴の展開
import { S, PRI, view } from './state.js';
import { TODAY } from './util.js';
import { schedule, nextQuestion, activeThemes } from './quiz.js';
import { renderToday, renderHistory } from './render.js';

export async function answer(idx) {
  const q = S.current; if (!q || S.info) return;
  const correct = idx === q.answer;
  const rating = correct ? 'sure' : 'wrong';
  const prev = { interval: q.interval || 0, reps: q.reps || 0, lapses: q.lapses || 0 };
  S.info = { idx, correct, rating, prev, sched: schedule(prev, rating), ref: null };
  S.doneIds.add(q.id);
  renderToday();
  try {
    const ref = S.db.collection('answers').doc();
    await ref.set({ qid: q.id, theme: q.theme || '', prompt: q.prompt, choice: q.choices[idx], correctChoice: q.choices[q.answer], correct, rating, answeredAt: new Date().toISOString(), date: TODAY });
    S.info.ref = ref;
    await S.db.doc('questions/' + q.id).update({ ...S.info.sched, lastResult: rating, lastAnsweredAt: new Date().toISOString() });
  } catch (e) { S.info.saveError = true; renderToday(); }
}
export async function toggleUnsure() {
  const q = S.current, info = S.info; if (!q || !info || !info.correct || info.busy) return;
  info.busy = true;
  info.rating = info.rating === 'unsure' ? 'sure' : 'unsure';
  info.sched = schedule(info.prev, info.rating);
  renderToday();
  try {
    if (info.ref) await info.ref.update({ rating: info.rating });
    await S.db.doc('questions/' + q.id).update({ ...info.sched, lastResult: info.rating });
  } catch (e) { info.saveError = true; renderToday(); }
  info.busy = false;
}
export async function next() {
  S.current = null; S.info = null; S.gen.error = null;
  const q = nextQuestion();
  if (q || !S.sample || !activeThemes().length) { S.current = q; renderToday(); window.scrollTo({ top: 0 }); return; }
  await generate();
}

function pickTheme() {
  const ts = activeThemes();
  const total = ts.reduce((s, t) => s + (PRI[t.priority] || 1), 0);
  let r = Math.random() * total;
  for (const t of ts) { r -= PRI[t.priority] || 1; if (r <= 0) return t; }
  return ts[0];
}
function shuffle(q) {
  if (q.choices.length < 3) return q;
  const idx = q.choices.map((_, i) => i);
  for (let i = idx.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [idx[i], idx[j]] = [idx[j], idx[i]]; }
  return { ...q, choices: idx.map(i => q.choices[i]), answer: idx.indexOf(q.answer) };
}
export async function generate() {
  if (S.gen.busy) return;
  const t = pickTheme(); if (!t) return;
  S.gen = { busy: true, error: null }; renderToday();
  const recent = S.answers.filter(a => a.theme === t.name).slice(0, 25).map(a => '- ' + String(a.prompt).slice(0, 120).replace(/\n/g, ' '));
  const prompt = `あなたは日本のWebエンジニア（経験12年、TypeScript/Vue.js/Java/Spring Boot/Docker、テックリードやアーキテクトを志向）向けに、1〜2分で解ける学習クイズを1問作る出題者です。

テーマ: ${t.name}
出題元: ${t.source || '（指定なし）'}
出題方針: ${t.memo || '（指定なし）'}

最近出題した問題（これらと重複・酷似しないこと）:
${recent.join('\n') || '（なし）'}

条件:
- 形式は4択（choicesが4つ）か○×（choicesが ["○ 正しい", "× 誤り"]）のどちらか。4択を基本に、ときどき○×。
- 正解は1つだけ。誤答の選択肢ももっともらしくする。
- 問題文はスマホで読める長さ（200字以内目安）。コードを含める場合は短く、\`\`\`で囲む。
- explanation は正解の理由と、誤答がなぜ違うかを300字以内で。
- すべて日本語。

次のJSONオブジェクトだけを返してください:
{"prompt": string, "choices": string[], "answer": 正解のchoicesの添字(0始まり), "explanation": string}`;
  try {
    const r = await S.sample.json(prompt, { cache: false });
    const ok = r && typeof r.prompt === 'string' && Array.isArray(r.choices) && r.choices.length >= 2 && r.choices.length <= 5
      && Number.isInteger(r.answer) && r.answer >= 0 && r.answer < r.choices.length && typeof r.explanation === 'string';
    if (!ok) throw { code: 'invalid_json' };
    const base = shuffle({ prompt: r.prompt, choices: r.choices.map(String), answer: r.answer });
    const doc = { theme: t.name, ...base, explanation: r.explanation, createdAt: new Date().toISOString(), due: TODAY, interval: 0, reps: 0, lapses: 0, source: 'その場で生成' };
    const ref = S.db.collection('questions').doc();
    await ref.set(doc);
    S.current = { id: ref.id, ...doc }; S.info = null;
    S.gen = { busy: false, error: null };
  } catch (e) {
    const msg = {
      not_granted: 'AIの利用が許可されていないため、問題を作れません。',
      sampling_disabled: 'このアカウントではAIを利用できません。',
      rate_limited: '利用上限に達したようです。少し時間をおいてから試してください。',
      invalid_json: '問題の形式が崩れました。もう一度試してください。',
    }[e && e.code] || '問題を作れませんでした。もう一度試してください。';
    S.gen = { busy: false, error: msg };
  }
  renderToday(); window.scrollTo({ top: 0 });
}

export async function expand(id) {
  S.expanded = S.expanded === id ? null : id;
  renderHistory();
  const a = S.answers.find(x => x.id === id);
  if (S.expanded && a && !S.qcache[a.qid]) {
    try {
      const snap = await S.db.doc('questions/' + a.qid).get();
      S.qcache[a.qid] = snap.exists ? { id: snap.id, ...snap.data() } : 'missing';
    } catch (e) { S.qcache[a.qid] = 'missing'; }
    if (S.tab === 'history') renderHistory();
  }
}
