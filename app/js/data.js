// db と sample への接続、onSnapshot の購読
import { S } from './state.js';
import { TODAY } from './util.js';
import { render, refresh } from './render.js';

export async function boot() {
  const [db, sample] = await Promise.all([
    claude.use('db').catch(() => null),
    claude.use('sample').catch(() => null),
  ]);
  S.db = db; S.sample = sample;
  if (!db) { render(); return; }
  const timer = setTimeout(() => { S.slow = true; refresh(); }, 10000);
  const fail = err => { S.dbError = err; clearTimeout(timer); S.slow = true; S.dueLoaded = S.answersLoaded = true; refresh(); };
  db.doc('config/settings').onSnapshot(s => { S.config = s.exists ? s.data() : null; refresh(); }, () => {});
  db.collection('questions').where('due', '<=', TODAY).orderBy('due', 'asc').limit(300).onSnapshot(s => {
    S.due = s.docs.map(d => ({ id: d.id, ...d.data() }));
    if (!s.metadata.fromCache) S.dueLoaded = true;
    if (S.dueLoaded && S.answersLoaded) clearTimeout(timer);
    refresh();
  }, fail);
  db.collection('answers').orderBy('answeredAt', 'desc').limit(1000).onSnapshot(s => {
    S.answers = s.docs.map(d => ({ id: d.id, ...d.data() }));
    if (!s.metadata.fromCache) S.answersLoaded = true;
    if (S.dueLoaded && S.answersLoaded) clearTimeout(timer);
    refresh();
  }, fail);
}
