// 画面の描画（今日・履歴）
import { S, KEYS, view } from './state.js';
import { TODAY, z, addDays, dayLabel, esc, inline, md } from './util.js';
import { nextQuestion, todayCount, goal, activeThemes } from './quiz.js';
import { chatHtml } from './chat.js';

function renderMeta() {
  const n = todayCount();
  document.getElementById('meta').innerHTML = `${dayLabel(TODAY)}・今日 <b>${n}</b> 問`;
}
function goalHtml() {
  const n = todayCount(), g = goal();
  const pips = Array.from({ length: g }, (_, i) => `<span class="pip${i < n ? ' on' : ''}"></span>`).join('');
  if (n >= g) return `<div class="goal done"><span class="pips">${pips}</span>今日の目標は達成。続けて解くこともできます</div>`;
  return `<div class="goal"><span class="pips">${pips}</span>今日の目標まであと ${g - n} 問</div>`;
}

function choicesHtml(q, info) {
  const tf = q.choices.length === 2 && q.choices.every(c => /^[○×◯✕]/.test(String(c).trim()));
  const btns = q.choices.map((c, i) => {
    let cls = 'choice';
    if (info) {
      if (i === q.answer) cls += ' correct';
      else if (i === info.idx) cls += ' wrong';
      else cls += ' dim';
    }
    const key = tf ? '' : `<span class="key">${KEYS[i]}</span>`;
    return `<button class="${cls}" data-action="answer" data-idx="${i}" ${info ? 'disabled' : ''}>${key}<span class="md">${inline(esc(c))}</span></button>`;
  }).join('');
  return `<div class="choices${tf ? ' tf' : ''}">${btns}</div>`;
}
export function renderToday() {
  if (!S.db) {
    view.innerHTML = `<section class="card empty"><div class="big">データに接続できません</div><div class="note">claude.ai にログインした状態で開いてください。</div></section>`;
    return;
  }
  if (!S.dueLoaded || !S.answersLoaded) {
    view.innerHTML = `<section class="card empty"><div class="big">読み込み中…</div><div class="note">${S.slow ? '接続に時間がかかっています。電波の良い場所で開き直すと解消することがあります。' : '問題と回答記録を取得しています。'}</div></section>`;
    return;
  }
  if (!S.current) S.current = nextQuestion();
  const q = S.current;
  if (!q) {
    const canGen = S.sample && activeThemes().length;
    const n = todayCount();
    view.innerHTML = `${goalHtml()}<section class="card empty">
      <div class="big">${n ? '用意していた問題はすべて解きました' : '今日の問題はまだ届いていません'}</div>
      <div class="note">${n ? 'もっと解きたいときは、テーマに沿った問題をその場で作れます。' : '毎朝の準備で問題が追加されます。その場で作って解くこともできます。'}</div>
      ${canGen ? `<button class="btn" data-action="generate" ${S.gen.busy ? 'disabled' : ''}>${S.gen.busy ? '問題を作っています…' : '新しい問題を作る'}</button>` : ''}
      ${!activeThemes().length ? '<div class="note">有効な学習テーマがまだ同期されていません。</div>' : ''}
      ${S.gen.error ? `<div class="note err">${esc(S.gen.error)}</div>` : ''}
    </section>`;
    return;
  }
  const info = S.info;
  const kind = q.reps ? `復習・${q.reps + 1}回目` : '新しい問題';
  let after = '';
  if (info) {
    const unsureBtn = info.correct ? `<button class="unsure" data-action="unsure" aria-pressed="${info.rating === 'unsure'}">${info.rating === 'unsure' ? '✓ ' : ''}まぐれ・あやふやだった</button>` : '';
    after = `
      <div class="result">
        <span class="verdict ${info.correct ? 'ok' : 'ng'}">${info.correct ? '正解' : '不正解'}</span>
        <span class="next-due">次の出題 <b>${info.sched.interval}</b> 日後</span>
      </div>
      ${unsureBtn ? `<div>${unsureBtn}</div>` : ''}
      <div class="explain"><h3>解説</h3><div class="md">${md(q.explanation)}</div></div>
      ${info.saveError ? '<div class="note err">回答の記録に失敗しました。通信状況を確認して、もう一度開き直してください。</div>' : ''}
      ${chatHtml(q)}
      <div class="actions next-row"><button class="btn" data-action="next" ${S.gen.busy ? 'disabled' : ''}>${S.gen.busy ? '問題を作っています…' : '次の問題 →'}</button></div>
      ${S.gen.error ? `<div class="note err">${esc(S.gen.error)}</div>` : ''}`;
  }
  view.innerHTML = `${goalHtml()}<section class="card">
    <div class="qhead"><span class="theme">${esc(q.theme || 'テーマなし')}</span><span class="tag">${kind}</span></div>
    <div class="prompt md">${md(q.prompt)}</div>
    ${choicesHtml(q, info)}
    ${after}
  </section>`;
}

export function renderHistory() {
  const from = addDays(TODAY, -(S.range - 1));
  const list = S.answers.filter(a => a.date >= from && a.date <= TODAY);
  const days = Array.from({ length: S.range }, (_, i) => addDays(from, i));
  const per = Object.fromEntries(days.map(d => [d, 0]));
  list.forEach(a => { if (a.date in per) per[a.date]++; });
  const max = Math.max(1, ...Object.values(per));
  const correct = list.filter(a => a.correct).length;
  const active = days.filter(d => per[d] > 0).length;
  const bars = days.map(d => `<div class="bar" title="${dayLabel(d)} ${per[d]}問">${per[d] ? `<span class="n">${per[d]}</span>` : ''}<i class="${per[d] ? '' : 'zero'}" style="height:${Math.round(per[d] / max * 64)}px"></i></div>`).join('');
  const labels = days.map((d, i) => { const dd = Number(d.slice(8)); const show = S.range === 7 || i % 5 === 0 || i === days.length - 1; return `<span>${show ? dd : ''}</span>`; }).join('');

  const byDay = {};
  list.forEach(a => (byDay[a.date] ||= []).push(a));
  const rows = Object.keys(byDay).sort().reverse().map(d => `<div class="day"><h2>${dayLabel(d)}・${byDay[d].length}問</h2>${byDay[d].map(rowHtml).join('')}</div>`).join('');

  view.innerHTML = `
    <div class="range">
      <button class="btn small ${S.range === 7 ? '' : 'sub'}" data-action="range" data-r="7">1週間</button>
      <button class="btn small ${S.range === 30 ? '' : 'sub'}" data-action="range" data-r="30">30日</button>
    </div>
    <div class="summary">
      <div class="stat"><div class="k">解いた問題</div><div class="v">${list.length}<small> 問</small></div></div>
      <div class="stat"><div class="k">正答率</div><div class="v">${list.length ? Math.round(correct / list.length * 100) : '–'}<small>${list.length ? ' %' : ''}</small></div></div>
      <div class="stat"><div class="k">取り組んだ日</div><div class="v">${active}<small> / ${S.range}日</small></div></div>
    </div>
    <div class="strip"><div class="bars">${bars}</div><div class="labels">${labels}</div></div>
    ${rows || '<section class="card empty"><div class="big">この期間の記録はまだありません</div><div class="note">「今日」タブで問題に答えると、ここに残ります。</div></section>'}`;
}

function rowHtml(a) {
  const open = S.expanded === a.id;
  const q = S.qcache[a.qid];
  let detail = '';
  if (open) {
    if (!q) detail = '<div class="note">読み込み中…</div>';
    else if (q === 'missing') detail = `<div class="note">あなたの回答：${esc(a.choice)}<br>正解：${esc(a.correctChoice)}</div>`;
    else detail = `${choicesHtml(q, { idx: q.choices.indexOf(a.choice) })}
      <div class="explain"><h3>解説</h3><div class="md">${md(q.explanation)}</div></div>
      <div class="next-due">次の出題予定 <b>${esc(q.due || '–')}</b></div>
      ${chatHtml(q)}`;
  }
  const t = new Date(a.answeredAt);
  const rating = a.correct ? (a.rating === 'unsure' ? '正解（あやふや）' : '正解') : '不正解';
  return `<div class="row"><button data-action="expand" data-id="${esc(a.id)}" aria-expanded="${open}">
    <span class="mark ${a.correct ? 'ok' : 'ng'}">${a.correct ? '○' : '×'}</span>
    <span class="body"><span class="p">${inline(esc(String(a.prompt || '').replace(/```[\s\S]*?```/g, '［コード］').replace(/\n/g, ' ')))}</span>
    <span class="meta"><span>${esc(a.theme)}</span><span>${rating}</span><span>${isNaN(t) ? '' : z(t.getHours()) + ':' + z(t.getMinutes())}</span></span></span>
  </button>${open ? `<div class="detail">${detail}</div>` : ''}</div>`;
}

export function render() {
  renderMeta();
  document.getElementById('tab-today').setAttribute('aria-selected', S.tab === 'today');
  document.getElementById('tab-history').setAttribute('aria-selected', S.tab === 'history');
  if (S.tab === 'today') renderToday(); else renderHistory();
}
// Snapshot updates must not wipe out a card the viewer is working on.
export function refresh() {
  renderMeta();
  if (S.tab === 'history') { if (!S.chatBusy) renderHistory(); return; }
  if (!S.current || !S.dueLoaded || !S.answersLoaded) renderToday();
  else { const g = view.querySelector('.goal'); if (g) g.outerHTML = goalHtml(); }
}
