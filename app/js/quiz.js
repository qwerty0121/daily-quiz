// 復習間隔の計算と、次に出す問題の選び方
import { S } from './state.js';
import { TODAY, addDays } from './util.js';

// ---- spaced repetition ----
export function schedule(prev, rating) {
  const iv = prev.interval || 0;
  let interval;
  if (rating === 'wrong') interval = 1;
  else if (rating === 'unsure') interval = iv < 1 ? 1 : Math.max(2, Math.round(iv * 1.3));
  else interval = iv < 1 ? 3 : Math.min(180, Math.round(iv * 2.5));
  return {
    interval, due: addDays(TODAY, interval),
    reps: (prev.reps || 0) + 1,
    lapses: (prev.lapses || 0) + (rating === 'wrong' ? 1 : 0),
  };
}

// ---- picking ----
export function nextQuestion() {
  const names = new Set(activeThemes().map(t => t.name));
  const cands = S.due.filter(q => !S.doneIds.has(q.id) && Array.isArray(q.choices) && q.choices.length >= 2 && (!names.size || names.has(q.theme)));
  cands.sort((a, b) => {
    const at = a.setDate === TODAY ? 0 : 1, bt = b.setDate === TODAY ? 0 : 1;
    if (at !== bt) return at - bt;
    return String(a.due).localeCompare(String(b.due));
  });
  return cands[0] || null;
}
export const todayCount = () => S.answers.filter(a => a.date === TODAY).length;
export const goal = () => Math.max(1, Number(S.config?.dailyGoal) || 1);
export const activeThemes = () => (S.config?.themes || []).filter(t => t && t.name && t.status !== '一時停止');
