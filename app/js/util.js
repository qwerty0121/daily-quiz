// 日付・文字列の小さな道具（状態には触らない）
export const z = n => String(n).padStart(2, '0');
export const ymd = d => d.getFullYear() + '-' + z(d.getMonth() + 1) + '-' + z(d.getDate());
export const addDays = (s, n) => { const [y, m, d] = s.split('-').map(Number); return ymd(new Date(y, m - 1, d + n)); };
export const TODAY = ymd(new Date());
const WD = ['日', '月', '火', '水', '木', '金', '土'];
export const dayLabel = s => { const [y, m, d] = s.split('-').map(Number); const dt = new Date(y, m - 1, d); return `${m}/${d}（${WD[dt.getDay()]}）`; };

export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export function inline(s) {
  return s.replace(/`([^`]+)`/g, '<code>$1</code>').replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>');
}
export function md(src) {
  const parts = String(src ?? '').split(/```[a-zA-Z0-9_-]*\n?/);
  let out = '';
  parts.forEach((p, i) => {
    if (i % 2 === 1) { out += '<pre><code>' + esc(p.replace(/\n$/, '')) + '</code></pre>'; return; }
    const blocks = esc(p).split(/\n{2,}/);
    for (const b of blocks) {
      const t = b.trim(); if (!t) continue;
      const lines = t.split('\n');
      if (lines.every(l => /^\s*([-*・]|\d+\.)\s+/.test(l))) {
        out += '<ul>' + lines.map(l => '<li>' + inline(l.replace(/^\s*([-*・]|\d+\.)\s+/, '')) + '</li>').join('') + '</ul>';
      } else {
        out += '<p>' + lines.map(l => inline(l.replace(/^#{1,6}\s+/, ''))).join('<br>') + '</p>';
      }
    }
  });
  return out;
}
