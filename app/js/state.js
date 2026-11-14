// 共有する状態と定数
export const PRI = { '高': 3, '中': 2, '低': 1 };
export const KEYS = ['A', 'B', 'C', 'D', 'E'];

export const S = {
  db: null, sample: null, config: null,
  due: [], dueLoaded: false, answers: [], answersLoaded: false, slow: false, dbError: null,
  tab: 'today', current: null, info: null, doneIds: new Set(),
  gen: { busy: false, error: null },
  chats: {}, chatBusy: false, chatCtl: null,
  range: 7, expanded: null, qcache: {},
};

export const view = document.getElementById('view');
