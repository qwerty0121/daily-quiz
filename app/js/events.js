// クリック・送信のイベント登録
import { S } from './state.js';
import { render, renderHistory } from './render.js';
import { answer, toggleUnsure, next, generate, expand } from './actions.js';
import { ask } from './chat.js';

export function bindEvents() {
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-action]'); if (!b || b.tagName === 'FORM') return;
    const act = b.dataset.action;
    if (act === 'tab') { S.tab = b.dataset.tab; render(); }
    else if (act === 'answer') answer(Number(b.dataset.idx));
    else if (act === 'unsure') toggleUnsure();
    else if (act === 'next') next();
    else if (act === 'generate') generate();
    else if (act === 'range') { S.range = Number(b.dataset.r); S.expanded = null; renderHistory(); }
    else if (act === 'expand') expand(b.dataset.id);
    else if (act === 'ask') ask(b.closest('.chat').dataset.qid, b.dataset.q, b.dataset.label);
    else if (act === 'stop') S.chatCtl?.abort();
  });
  document.addEventListener('submit', e => {
    const f = e.target.closest('form[data-action="askform"]'); if (!f) return;
    e.preventDefault();
    const v = f.elements.q.value; f.elements.q.value = '';
    ask(f.closest('.chat').dataset.qid, v);
  });
}
