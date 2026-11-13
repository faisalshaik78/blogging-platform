'use strict';

/* =========================================================
   Inkwell: a small blogging platform
   - Posts live in localStorage (acts as the "database")
   - Hash routing:  #/  #/new  #/edit/:id  #/post/:id
   ========================================================= */

const KEY = 'inkwellPosts';
const $ = (sel, root = document) => root.querySelector(sel);
const app = $('#app');

/* ---------- Helpers ---------- */
const uid = () => (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2, 8));
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmtDate = ts => new Date(ts).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
const words = t => (t.trim().match(/\S+/g) || []).length;
const readTime = t => Math.max(1, Math.round(words(t) / 200));
const excerpt = t => { const p = t.replace(/```[\s\S]*?```/g, ' ').replace(/[#>*`_\[\]()-]/g, '').replace(/\s+/g, ' ').trim(); return p.length > 150 ? p.slice(0, 150).trimEnd() + '…' : p; };
const parseTags = s => [...new Set(s.split(',').map(t => t.trim().toLowerCase()).filter(Boolean))].slice(0, 6);

let toastTimer;
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg; t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2400);
}

/* ---------- Storage layer ---------- */
let memoryFallback = null;
function loadPosts() {
  try { const raw = localStorage.getItem(KEY); if (raw) return JSON.parse(raw); } catch (_) {}
  return memoryFallback;
}
function savePosts() {
  memoryFallback = posts;
  try { localStorage.setItem(KEY, JSON.stringify(posts)); } catch (_) { toast('Could not save to browser storage'); }
}
const byId = id => posts.find(p => p.id === id);

function seedPosts() {
  const d = 86400000, now = Date.now();
  return [
    { id: uid(), title: 'Welcome to Inkwell', status: 'published', tags: ['welcome', 'guide'], createdAt: now - 3 * d, updatedAt: now - 3 * d, publishedAt: now - 3 * d,
      content: 'This is a **tiny blogging platform** built with plain HTML, CSS and JavaScript.\n\n## What you can do\n\n- Create, edit and delete posts\n- Save drafts and publish when ready\n- Search by text and filter by tag\n- Back up everything as a JSON file\n\nPosts support a little *Markdown*: headings, **bold**, *italic*, `code`, lists, quotes and [links](https://developer.mozilla.org).' },
    { id: uid(), title: 'Why I learn by building projects', status: 'published', tags: ['learning', 'web'], createdAt: now - 2 * d, updatedAt: now - 2 * d, publishedAt: now - 2 * d,
      content: 'Reading about code only gets you so far. Every real project forces you to meet a new problem.\n\n> The fastest way to learn is to build something slightly too hard.\n\nA good loop is: pick a small idea, build it, break it, fix it, and then share it.' },
    { id: uid(), title: 'Notes on the MERN stack (draft)', status: 'draft', tags: ['mern', 'notes'], createdAt: now - d, updatedAt: now - d, publishedAt: null,
      content: 'MERN stands for MongoDB, Express, React and Node.js.\n\n```\nclient (React)  ->  API (Express)  ->  database (MongoDB)\n```\n\nStill to write: how the pieces talk to each other.' }
  ];
}
let posts = loadPosts();
if (!Array.isArray(posts)) { posts = seedPosts(); savePosts(); }

/* ---------- Markdown-lite renderer (escapes HTML first, so it is safe) ---------- */
function inline(s) {
  const codes = [];
  s = s.replace(/`([^`]+)`/g, (_, c) => { codes.push(c); return `\u0000${codes.length - 1}\u0000`; });
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
       .replace(/(^|[^*])\*([^*\s][^*]*)\*/g, '$1<em>$2</em>')
       .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
  return s.replace(/\u0000(\d+)\u0000/g, (_, n) => `<code>${codes[n]}</code>`);
}
function markdown(src) {
  const lines = esc(src).replace(/\r/g, '').split('\n');
  let out = '', i = 0;
  while (i < lines.length) {
    const l = lines[i];
    if (/^```/.test(l)) {
      const buf = []; i++;
      while (i < lines.length && !/^```/.test(lines[i])) buf.push(lines[i++]);
      i++; out += `<pre><code>${buf.join('\n')}</code></pre>`; continue;
    }
    const h = l.match(/^(#{1,3})\s+(.*)/);
    if (h) { const n = h[1].length + 1; out += `<h${n}>${inline(h[2])}</h${n}>`; i++; continue; }
    if (/^&gt;\s?/.test(l)) {
      const buf = [];
      while (i < lines.length && /^&gt;\s?/.test(lines[i])) buf.push(lines[i++].replace(/^&gt;\s?/, ''));
      out += `<blockquote>${inline(buf.join(' '))}</blockquote>`; continue;
    }
    if (/^[-*]\s+/.test(l)) {
      const items = [];
      while (i < lines.length && /^[-*]\s+/.test(lines[i])) items.push(lines[i++].replace(/^[-*]\s+/, ''));
      out += '<ul>' + items.map(x => `<li>${inline(x)}</li>`).join('') + '</ul>'; continue;
    }
    if (!l.trim()) { i++; continue; }
    const buf = [];
    while (i < lines.length && lines[i].trim() && !/^(```|#{1,3}\s|[-*]\s|&gt;)/.test(lines[i])) buf.push(lines[i++]);
    out += `<p>${inline(buf.join(' '))}</p>`;
  }
  return out;
}

/* ---------- Confirm dialog ---------- */
function confirmDialog(title, text, okLabel) {
  const dlg = $('#dlg');
  $('#dlgTitle').textContent = title; $('#dlgText').textContent = text; $('#dlgOk').textContent = okLabel;
  return new Promise(resolve => {
    dlg.addEventListener('close', () => resolve(dlg.returnValue === 'ok'), { once: true });
    dlg.returnValue = ''; dlg.showModal();
  });
}

/* ---------- Views ---------- */
const filter = { q: '', status: 'all', tag: '' };

function viewList() {
  document.title = 'Inkwell | Blogging Platform';
  const allTags = [...new Set(posts.flatMap(p => p.tags))].sort();
  app.innerHTML = `
    <div class="page-head">
      <div><h1>Your posts</h1><p class="sub" id="count"></p></div>
    </div>
    <div class="controls">
      <input class="search" id="q" type="search" placeholder="Search posts…" aria-label="Search posts" value="${esc(filter.q)}">
      <div class="row" role="group" aria-label="Filter by status">
        ${['all', 'published', 'draft'].map(s => `<button class="pill" data-status="${s}" aria-pressed="${filter.status === s}">${s === 'all' ? 'All' : s === 'published' ? 'Published' : 'Drafts'}</button>`).join('')}
      </div>
      ${allTags.length ? `<div class="row" role="group" aria-label="Filter by tag">${allTags.map(t => `<button class="pill tag" data-tag="${esc(t)}" aria-pressed="${filter.tag === t}">#${esc(t)}</button>`).join('')}</div>` : ''}
    </div>
    <div class="grid" id="grid"></div>`;

  const grid = $('#grid');
  function update() {
    const q = filter.q.trim().toLowerCase();
    const list = posts
      .filter(p => filter.status === 'all' || p.status === filter.status)
      .filter(p => !filter.tag || p.tags.includes(filter.tag))
      .filter(p => !q || (p.title + ' ' + p.content + ' ' + p.tags.join(' ')).toLowerCase().includes(q))
      .sort((a, b) => b.updatedAt - a.updatedAt);
    $('#count').textContent = `${list.length} of ${posts.length} post${posts.length === 1 ? '' : 's'}`;
    if (!list.length) {
      grid.innerHTML = posts.length
        ? `<div class="empty"><p>No posts match your filters.</p></div>`
        : `<div class="empty"><p>No posts yet. Write your first one.</p><a class="btn primary" href="#/new">+ New post</a></div>`;
      return;
    }
    grid.innerHTML = list.map(p => `
      <article class="card">
        <div class="meta"><span class="badge ${p.status}">${p.status}</span><span>${fmtDate(p.updatedAt)}</span><span>${readTime(p.content)} min read</span></div>
        <h2><a href="#/post/${p.id}">${esc(p.title)}</a></h2>
        <p>${esc(excerpt(p.content))}</p>
        ${p.tags.length ? `<div class="tags">${p.tags.map(t => `<span>#${esc(t)}</span>`).join('')}</div>` : ''}
      </article>`).join('');
  }
  update();

  $('#q').addEventListener('input', e => { filter.q = e.target.value; update(); });
  app.querySelectorAll('[data-status]').forEach(b => b.addEventListener('click', () => {
    filter.status = b.dataset.status;
    app.querySelectorAll('[data-status]').forEach(x => x.setAttribute('aria-pressed', x === b));
    update();
  }));
  app.querySelectorAll('[data-tag]').forEach(b => b.addEventListener('click', () => {
    filter.tag = filter.tag === b.dataset.tag ? '' : b.dataset.tag;
    app.querySelectorAll('[data-tag]').forEach(x => x.setAttribute('aria-pressed', x.dataset.tag === filter.tag));
    update();
  }));
}

function viewPost(id) {
  const p = byId(id);
  if (!p) return notFound();
  document.title = p.title + ' | Inkwell';
  app.innerHTML = `
    <a class="back" href="#/">← All posts</a>
    <article class="post">
      <header>
        <div class="meta"><span class="badge ${p.status}">${p.status}</span>
          <span>${p.status === 'published' && p.publishedAt ? 'Published ' + fmtDate(p.publishedAt) : 'Last edited ' + fmtDate(p.updatedAt)}</span>
          <span>${readTime(p.content)} min read</span></div>
        <h1>${esc(p.title)}</h1>
        ${p.tags.length ? `<div class="tags">${p.tags.map(t => `<span>#${esc(t)}</span>`).join('')}</div>` : ''}
        <div class="actions">
          <a class="btn small" href="#/edit/${p.id}">Edit</a>
          <button class="btn small" id="toggle" type="button">${p.status === 'published' ? 'Move to drafts' : 'Publish'}</button>
          <button class="btn ghost small" id="del" type="button">Delete</button>
        </div>
      </header>
      <div class="prose">${markdown(p.content)}</div>
    </article>`;

  $('#toggle').addEventListener('click', () => {
    if (p.status === 'published') { p.status = 'draft'; toast('Moved to drafts'); }
    else { p.status = 'published'; p.publishedAt = Date.now(); toast('Post published'); }
    p.updatedAt = Date.now(); savePosts(); viewPost(id);
  });
  $('#del').addEventListener('click', async () => {
    if (await confirmDialog('Delete this post?', `“${p.title}” will be removed permanently.`, 'Delete')) {
      posts = posts.filter(x => x.id !== id); savePosts(); toast('Post deleted'); location.hash = '#/';
    }
  });
}

let dirty = false;
window.addEventListener('beforeunload', e => { if (dirty) { e.preventDefault(); e.returnValue = ''; } });

function viewEditor(id) {
  const existing = id ? byId(id) : null;
  if (id && !existing) return notFound();
  document.title = (existing ? 'Edit post' : 'New post') + ' | Inkwell';
  dirty = false;
  const isPub = existing && existing.status === 'published';

  app.innerHTML = `
    <a class="back" href="${existing ? '#/post/' + existing.id : '#/'}">← Back</a>
    <h1>${existing ? 'Edit post' : 'New post'}</h1>
    <form class="editor" id="ed" novalidate>
      <div class="field" id="f-title">
        <label for="title">Title</label>
        <input class="input title" id="title" maxlength="120" placeholder="Post title" value="${existing ? esc(existing.title) : ''}" aria-describedby="title-err">
        <small class="err" id="title-err"></small>
      </div>
      <div class="field">
        <label for="tags">Tags</label>
        <input class="input" id="tags" placeholder="e.g. web, learning, notes" value="${existing ? esc(existing.tags.join(', ')) : ''}" aria-describedby="tags-hint">
        <small class="hint" id="tags-hint">Separate with commas. Up to 6 tags.</small>
      </div>
      <div class="field" id="f-content">
        <div class="tabs" role="tablist">
          <button type="button" class="tab" role="tab" id="tab-w" aria-selected="true">Write</button>
          <button type="button" class="tab" role="tab" id="tab-p" aria-selected="false">Preview</button>
        </div>
        <div id="write">
          <div class="toolbar" aria-label="Formatting">
            <button type="button" data-fmt="bold" title="Bold" aria-label="Bold">B</button>
            <button type="button" data-fmt="italic" title="Italic" aria-label="Italic"><i>I</i></button>
            <button type="button" data-fmt="h" title="Heading" aria-label="Heading">H</button>
            <button type="button" data-fmt="list" title="List" aria-label="List">•</button>
            <button type="button" data-fmt="quote" title="Quote" aria-label="Quote">❝</button>
            <button type="button" data-fmt="code" title="Code" aria-label="Code">&lt;/&gt;</button>
            <button type="button" data-fmt="link" title="Link" aria-label="Link">🔗</button>
          </div>
          <textarea id="content" placeholder="Write your post… Markdown is supported." aria-describedby="content-err">${existing ? esc(existing.content) : ''}</textarea>
        </div>
        <div id="preview" class="preview prose" hidden></div>
        <small class="err" id="content-err"></small>
      </div>
      <div class="form-actions">
        <button class="btn primary" type="submit" data-action="${isPub ? 'update' : 'publish'}">${isPub ? 'Update post' : 'Publish'}</button>
        <button class="btn" type="submit" data-action="draft">${isPub ? 'Move to drafts' : 'Save draft'}</button>
        <button class="btn ghost" type="button" id="cancel">Cancel</button>
        <span class="counter" id="counter"></span>
      </div>
    </form>`;

  const form = $('#ed'), title = $('#title'), tags = $('#tags'), content = $('#content');
  let action = 'draft';

  const counter = () => { const w = words(content.value); $('#counter').textContent = `${w} word${w === 1 ? '' : 's'} · ${readTime(content.value)} min read`; };
  counter();
  [title, tags, content].forEach(el => el.addEventListener('input', () => { dirty = true; if (el === content) counter(); }));

  /* Tabs */
  const setTab = preview => {
    $('#tab-w').setAttribute('aria-selected', !preview); $('#tab-p').setAttribute('aria-selected', preview);
    $('#write').hidden = preview; $('#preview').hidden = !preview;
    if (preview) $('#preview').innerHTML = content.value.trim() ? markdown(content.value) : '<p class="muted">Nothing to preview yet.</p>';
  };
  $('#tab-w').addEventListener('click', () => setTab(false));
  $('#tab-p').addEventListener('click', () => setTab(true));

  /* Toolbar */
  const wrap = (a, b, ph) => {
    const s = content.selectionStart, e = content.selectionEnd, sel = content.value.slice(s, e) || ph;
    content.setRangeText(a + sel + b, s, e, 'select'); content.focus(); content.dispatchEvent(new Event('input'));
  };
  const linePrefix = pre => {
    const s = content.selectionStart, start = content.value.lastIndexOf('\n', s - 1) + 1;
    content.setRangeText(pre, start, start, 'end'); content.focus(); content.dispatchEvent(new Event('input'));
  };
  const fmt = {
    bold: () => wrap('**', '**', 'bold text'), italic: () => wrap('*', '*', 'italic text'),
    code: () => wrap('`', '`', 'code'), link: () => wrap('[', '](https://)', 'link text'),
    h: () => linePrefix('## '), list: () => linePrefix('- '), quote: () => linePrefix('> ')
  };
  form.querySelectorAll('[data-fmt]').forEach(b => b.addEventListener('click', () => fmt[b.dataset.fmt]()));

  /* Submit */
  form.querySelectorAll('button[type="submit"]').forEach(b => b.addEventListener('click', () => { action = b.dataset.action; }));
  form.addEventListener('submit', e => {
    e.preventDefault();
    const t = title.value.trim(), c = content.value.trim();
    const tErr = t.length < 3 ? 'Title must be at least 3 characters.' : '';
    const cErr = c.length < 20 && action !== 'draft' ? 'Write at least 20 characters before publishing.' : (!c ? 'Content can’t be empty.' : '');
    $('#title-err').textContent = tErr; $('#f-title').classList.toggle('invalid', !!tErr);
    $('#content-err').textContent = cErr; $('#f-content').classList.toggle('invalid', !!cErr);
    if (tErr) { title.focus(); return; }
    if (cErr) { setTab(false); content.focus(); return; }

    const now = Date.now();
    const status = action === 'draft' ? 'draft' : 'published';
    let post = existing;
    if (post) {
      if (status === 'published' && post.status !== 'published') post.publishedAt = now;
      Object.assign(post, { title: t, content: c, tags: parseTags(tags.value), status, updatedAt: now });
    } else {
      post = { id: uid(), title: t, content: c, tags: parseTags(tags.value), status, createdAt: now, updatedAt: now, publishedAt: status === 'published' ? now : null };
      posts.push(post);
    }
    savePosts(); dirty = false;
    toast(status === 'published' ? (existing ? 'Post updated' : 'Post published') : 'Draft saved');
    location.hash = '#/post/' + post.id;
  });

  $('#cancel').addEventListener('click', () => {
    if (dirty && !confirm('Discard your unsaved changes?')) return;
    dirty = false; location.hash = existing ? '#/post/' + existing.id : '#/';
  });
}

function notFound() {
  document.title = 'Not found | Inkwell';
  app.innerHTML = `<div class="empty"><h1>Post not found</h1><p>It may have been deleted.</p><a class="btn primary" href="#/">Back to all posts</a></div>`;
}

/* ---------- Router ---------- */
function route() {
  dirty = false;
  const [, a = '', b = ''] = (location.hash.slice(1) || '/').split('/');
  if (a === 'new') viewEditor();
  else if (a === 'edit') viewEditor(b);
  else if (a === 'post') viewPost(b);
  else viewList();
  window.scrollTo(0, 0);
  const h1 = app.querySelector('h1'); if (h1) { h1.tabIndex = -1; h1.focus({ preventScroll: true }); }
}
window.addEventListener('hashchange', route);

/* ---------- Backup: export / import ---------- */
$('#exportBtn').addEventListener('click', () => {
  const blob = new Blob([JSON.stringify(posts, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'inkwell-backup.json';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast('Backup downloaded');
});
$('#importBtn').addEventListener('click', () => $('#importFile').click());
$('#importFile').addEventListener('change', async e => {
  const file = e.target.files[0]; e.target.value = '';
  if (!file) return;
  try {
    const data = JSON.parse(await file.text());
    if (!Array.isArray(data)) throw new Error('bad');
    const valid = data.filter(p => p && typeof p.id === 'string' && p.id.trim() && typeof p.title === 'string' && p.title.trim() && typeof p.content === 'string' && p.content.trim())
      .map(p => ({ id: p.id, title: p.title.slice(0, 120), content: p.content, tags: Array.isArray(p.tags) ? [...new Set(p.tags.map(t => String(t).trim().toLowerCase()).filter(Boolean))].slice(0, 6) : [],
        status: p.status === 'published' ? 'published' : 'draft', createdAt: +p.createdAt || Date.now(), updatedAt: +p.updatedAt || Date.now(), publishedAt: +p.publishedAt || null }));
    if (!valid.length) throw new Error('empty');
    valid.forEach(v => { const i = posts.findIndex(p => p.id === v.id); i >= 0 ? posts[i] = v : posts.push(v); });
    savePosts(); toast(`Imported ${valid.length} post${valid.length === 1 ? '' : 's'}`); route();
  } catch (_) { toast('That file isn’t a valid backup'); }
});

route();
