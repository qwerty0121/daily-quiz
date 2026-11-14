import { S } from './state.js';
import { render } from './render.js';
import { bindEvents } from './events.js';
import { boot } from './data.js';

bindEvents();
render();
if (window.claude && claude.use) boot(); else { S.db = null; setTimeout(render, 0); }
