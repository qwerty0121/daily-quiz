// 問題についての質問（sample）
import { S, KEYS, view } from './state.js';
import { esc, md } from './util.js';

export function chatHtml(q) {
  if (!S.sample) return '';
  const turns = S.chats[q.id] || [];
  const chips = [['もっと詳しく', 'この問題の内容をもう少し詳しく説明して'], ['具体例で', '具体例やコード例で説明して'], ['実務では？', '実務（Webシステム開発）ではどう関わる？使いどころや注意点は？'], ['関連知識', 'あわせて覚えておくとよい関連知識を教えて']];
  const bubbles = turns.map((t, i) => t.role === 'user'
    ? `<div class="bubble me">${esc(t.label || t.content)}</div>`
    : `<div class="bubble ai md${t.pending && !t.content ? ' thinking' : ''}" data-turn="${i}">${t.content ? md(t.content) : (t.error ? esc(t.error) : '考えています…')}</div>`).join('');
  return `<div class="chat" data-qid="${esc(q.id)}">
    <h3>AIに聞く</h3>
    <div class="chips">${chips.map(([l, p]) => `<button class="chip" data-action="ask" data-q="${esc(p)}" data-label="${esc(l)}" ${S.chatBusy ? 'disabled' : ''}>${esc(l)}</button>`).join('')}</div>
    <div class="bubbles">${bubbles}</div>
    <form class="ask" data-action="askform"><input id="ask-${esc(q.id)}" name="q" placeholder="自由に質問（任意）" autocomplete="off" ${S.chatBusy ? 'disabled' : ''}><button class="btn small" ${S.chatBusy ? 'disabled' : ''}>質問する</button></form>
    ${S.chatBusy ? '<div class="actions"><button class="btn sub small" data-action="stop">止める</button></div>' : ''}
  </div>`;
}

function chatTarget(qid) {
  if (S.current && S.current.id === qid) return { q: S.current, info: S.info };
  const q = S.qcache[qid];
  if (q && q !== 'missing') {
    const a = S.answers.find(x => x.id === S.expanded);
    return { q, info: a ? { idx: q.choices.indexOf(a.choice), correct: a.correct } : null };
  }
  return null;
}
function rerenderChat(qid) {
  const box = view.querySelector(`.chat[data-qid="${CSS.escape(qid)}"]`);
  const t = chatTarget(qid);
  if (box && t) { const tmp = document.createElement('div'); tmp.innerHTML = chatHtml(t.q); box.replaceWith(tmp.firstElementChild); }
}
export async function ask(qid, text, label) {
  if (!S.sample || S.chatBusy || !text.trim()) return;
  const t = chatTarget(qid); if (!t) return;
  const { q, info } = t;
  const turns = (S.chats[qid] ||= []);
  const history = turns.filter(x => x.content && !x.error).map(x => ({ role: x.role, content: x.content }));
  turns.push({ role: 'user', content: text, label });
  const reply = { role: 'assistant', content: '', pending: true };
  turns.push(reply);
  S.chatBusy = true; rerenderChat(qid);
  const ctx = `あなたは、日本のWebエンジニア（経験12年、TypeScript/Vue.js/Java/Spring Boot/Docker、テックリードやアーキテクトを志向）の学習を手伝う講師です。彼は今、次のクイズに答えたところです。この問題に関する質問に、日本語で、スマホで1〜2分で読める分量（目安400字以内）で答えてください。見出しは使わず、必要なら箇条書きや短いコード例を使ってください。

テーマ: ${q.theme}
問題: ${q.prompt}
選択肢:
${q.choices.map((c, i) => `${KEYS[i]}. ${c}`).join('\n')}
正解: ${KEYS[q.answer]}. ${q.choices[q.answer]}
${info && info.idx >= 0 ? `彼の回答: ${KEYS[info.idx]}. ${q.choices[info.idx]}（${info.idx === q.answer ? '正解' : '不正解'}）` : ''}
解説: ${q.explanation}`;
  const input = [{ role: 'user', content: ctx }, ...history, { role: 'user', content: text }];
  const ctl = new AbortController(); S.chatCtl = ctl;
  try {
    await S.sample(input, {
      cache: false, signal: ctl.signal,
      onText: ({ text }) => {
        reply.content = text;
        const el = view.querySelector(`.chat[data-qid="${CSS.escape(qid)}"] [data-turn="${turns.length - 1}"]`);
        if (el) { el.classList.remove('thinking'); el.innerHTML = md(text); }
      },
    });
  } catch (e) {
    reply.content = e.text || '';
    if (e.code !== 'cancelled') reply.error = {
      not_granted: 'AIの利用が許可されていないため、質問できません。',
      rate_limited: '利用上限に達したようです。少し時間をおいてから試してください。',
    }[e.code] || '回答を取得できませんでした。もう一度試してください。';
    if (!reply.content && e.code === 'cancelled') reply.error = '止めました。';
  }
  reply.pending = false; S.chatBusy = false; S.chatCtl = null;
  rerenderChat(qid);
}
