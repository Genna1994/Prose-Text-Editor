
// ── ELEMENTS ──
const editor = document.getElementById('editor');
const savedDot = document.getElementById('saved-dot');
const savedLabel = document.getElementById('saved-label');
const docList = document.getElementById('doc-list');
const gutter = document.getElementById('gutter');
const paper = document.getElementById('paper');

// ── i18n ──
const i18n = {
  en: {
    dir: 'ltr',
    file: 'File', new: 'New File', open: 'Open File', save: 'Save', downloadAs: 'Download As',
    words: 'words', chars: 'chars', line: 'line', lines: 'lines', saved: 'Saved', unsaved: 'Unsaved',
    documents: 'Documents', newDoc: '+ New document', placeholder: 'Start writing…',
    insertImage: 'Insert Image', imageUrl: 'Image URL', fromFile: 'From File', insert: 'Insert', cancel: 'Cancel',
    insertLink: 'Insert Link', findLabel: 'Find', replaceLabel: 'Replace', replaceBtn: 'Replace', replaceAll: 'All',
    autosaved: '↺ Autosaved',
  },
  es: {
    dir: 'ltr',
    file: 'Archivo', new: 'Nuevo Archivo', open: 'Abrir Archivo', save: 'Guardar', downloadAs: 'Descargar Como',
    words: 'palabras', chars: 'caracteres', line: 'línea', lines: 'líneas', saved: 'Guardado', unsaved: 'Sin guardar',
    documents: 'Documentos', newDoc: '+ Nuevo documento', placeholder: 'Empieza a escribir…',
    insertImage: 'Insertar Imagen', imageUrl: 'URL de imagen', fromFile: 'Desde archivo', insert: 'Insertar', cancel: 'Cancelar',
    insertLink: 'Insertar enlace', findLabel: 'Buscar', replaceLabel: 'Reemplazar', replaceBtn: 'Reemplazar', replaceAll: 'Todo',
    autosaved: '↺ Autoguardado',
  },
  fr: {
    dir: 'ltr',
    file: 'Fichier', new: 'Nouveau Fichier', open: 'Ouvrir Fichier', save: 'Enregistrer', downloadAs: 'Télécharger sous',
    words: 'mots', chars: 'caractères', line: 'ligne', lines: 'lignes', saved: 'Enregistré', unsaved: 'Non enregistré',
    documents: 'Documents', newDoc: '+ Nouveau document', placeholder: 'Commencez à écrire…',
    insertImage: 'Insérer une image', imageUrl: "URL de l'image", fromFile: 'Depuis un fichier', insert: 'Insérer', cancel: 'Annuler',
    insertLink: 'Insérer un lien', findLabel: 'Chercher', replaceLabel: 'Remplacer', replaceBtn: 'Remplacer', replaceAll: 'Tout',
    autosaved: '↺ Enregistré auto',
  },
  ar: {
    dir: 'rtl',
    file: 'ملف', new: 'ملف جديد', open: 'فتح ملف', save: 'حفظ', downloadAs: 'تنزيل باسم',
    words: 'كلمات', chars: 'أحرف', line: 'سطر', lines: 'أسطر', saved: 'محفوظ', unsaved: 'غير محفوظ',
    documents: 'المستندات', newDoc: '+ مستند جديد', placeholder: 'ابدأ الكتابة…',
    insertImage: 'إدراج صورة', imageUrl: 'رابط الصورة', fromFile: 'من ملف', insert: 'إدراج', cancel: 'إلغاء',
    insertLink: 'إدراج رابط', findLabel: 'بحث', replaceLabel: 'استبدال', replaceBtn: 'استبدال', replaceAll: 'الكل',
    autosaved: '↺ حُفظ تلقائياً',
  }
};
let currentLang = 'en';

function applyLanguage(lang) {
  currentLang = lang;
  const t = i18n[lang] || i18n.en;
  document.documentElement.lang = lang;
  document.documentElement.dir = t.dir;
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.dataset.i18n;
    if (t[key] !== undefined) el.textContent = t[key];
  });
  editor.dataset.placeholder = t.placeholder;
  const isUnsaved = savedDot.classList.contains('unsaved');
  savedLabel.textContent = isUnsaved ? t.unsaved : t.saved;
  document.getElementById('autosave-toast').textContent = t.autosaved;
  updateStats();
  scheduleGutterUpdate();
}

// ── STATE ──
let docs = JSON.parse(localStorage.getItem('prose-docs') || 'null') || [
  { id: 1, name: 'untitled.txt', content: '', created: Date.now() }
];
let currentId = docs[0].id;
let saveTimer = null;
let isDark = false;
let isFocus = false;
let isCodeMode = false;
let fileHandle = null;
let renameTargetId = null;
let hasUnsavedChanges = false;
function clearUnsavedFlag() { hasUnsavedChanges = false; }

// ── UTIL ──
const $ = id => document.getElementById(id);
const genId = () => Date.now() + Math.random();

function getDoc(id) { return docs.find(d => d.id === id); }
function saveAll() {
  try {
    localStorage.setItem('prose-docs', JSON.stringify(docs));
  } catch(e) {
    console.error('Save failed:', e);
    showSaveToast('⚠ Save failed — storage full?');
  }
}

function markUnsaved() {
  const t = i18n[currentLang];
  savedDot.classList.add('unsaved');
  savedLabel.textContent = t.unsaved;
  clearTimeout(saveTimer);
  saveTimer = setTimeout(autosave, 1200);
}

function autosave() {
  const doc = getDoc(currentId);
  if (doc) { doc.content = editor.innerHTML; saveAll(); }
  const t = i18n[currentLang];
  savedDot.classList.remove('unsaved');
  savedLabel.textContent = t.saved;
  hasUnsavedChanges = false;
  renderDocList();
}

setInterval(() => {
  const doc = getDoc(currentId);
  if (doc) { doc.content = editor.innerHTML; saveAll(); }
  const toast = $('autosave-toast');
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2000);
}, 30000);

// ── STATS ──
function updateStats() {
  const t = i18n[currentLang];
  const text = editor.innerText || '';
  const words = text.trim() === '' ? 0 : text.trim().split(/\s+/).length;
  const chars = text.length;
  const lines = text === '' ? 1 : text.split('\n').length;
  $('stat-words').textContent = `${words} ${t.words}`;
  $('stat-chars').textContent = `${chars} ${t.chars}`;
  $('stat-lines').textContent = `${lines} ${lines === 1 ? t.line : t.lines}`;
}

function updateTime() {
  const now = new Date();
  $('stat-time').textContent = now.toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' });
}
setInterval(updateTime, 10000);
updateTime();

// ── PIXEL-PERFECT GUTTER (getBoundingClientRect — the only correct method) ──
function looksLikeCode(text) {
  if (!text || !text.trim()) return false;
  const t = text.trim();
  // JS/general-programming style
  if (/^\s{2,}/.test(text)) return true;
  if (/[{}\[\]();]/.test(t)) return true;
  if (/^(const|let|var|function|class|import|export|return|if|for|while|def|fn|pub|use)\b/.test(t)) return true;
  if (/^\s*(\/\/|\/\*|#|<!--)/.test(text)) return true;
  if (/=>|===|!==|&&|\|\|/.test(t)) return true;
  // HTML/XML — line starts with a tag, e.g. <link ...>, </div>, <svg ...>
  if (/^<\/?[a-zA-Z!][\w:-]*(\s[^<>]*)?\/?>?/.test(t)) return true;
  // A tag with a quoted attribute appearing anywhere in the line
  if (/<[a-zA-Z][^<>]*=["'][^"']*["'][^<>]*>/.test(t)) return true;
  // CSS-style "property: value;"
  if (/^[a-zA-Z-]+\s*:\s*[^;]+;\s*$/.test(t)) return true;
  // Fallback: dense use of code/markup symbols (<, >, =, ", /) relative to
  // line length — catches long attribute-heavy lines even if the above
  // specific patterns miss some edge case.
  const symbolCount = (t.match(/[<>="\/]/g) || []).length;
  if (t.length > 15 && symbolCount / t.length > 0.12) return true;
  return false;
}

// Decides whether a whole chunk of text (one or more lines) reads like
// source code rather than normal prose, by checking what share of its
// lines individually look code-like. A single pasted code line (1/1)
// still counts; a normal paragraph that happens to contain one bracket
// won't false-positive because most of its lines won't match.
function textLooksLikeCode(text) {
  if (!text || !text.trim()) return false;
  const lines = text.split('\n').filter(l => l.trim() !== '');
  if (lines.length === 0) return false;
  const codeLineCount = lines.filter(looksLikeCode).length;
  return (codeLineCount / lines.length) >= 0.4;
}

// A line "has content" (and should get a highlighted number) if it has
// text OR contains an image — an image-only line still counts.
function blockHasContent(block) {
  if ((block.innerText || '').trim() !== '') return true;
  if (block.classList && block.classList.contains('img-wrapper')) return true;
  if (block.querySelector && block.querySelector('img, .img-wrapper')) return true;
  return false;
}

// Finds which <li> (direct child of a <ul>/<ol>) currently holds the caret,
// so that specific list item's gutter number can be marked active.
function getCaretLi(listBlock) {
  const sel = window.getSelection();
  if (!sel || !sel.rangeCount) return null;
  let node = sel.getRangeAt(0).startContainer;
  while (node && node !== listBlock) {
    if (node.parentNode === listBlock) return node;
    node = node.parentNode;
  }
  return null;
}

// The browser often merges a multi-line selection into ONE <li> with <br>
// tags between the lines instead of one <li> per line. Split any such <li>
// back into separate <li> elements — one per line — so each line gets its
// own gutter number, in order, with nothing missing.
function splitListItemsByBr(listEl) {
  Array.from(listEl.children).forEach(li => {
    if (li.tagName !== 'LI' || !li.querySelector('br')) return;
    const lines = [document.createDocumentFragment()];
    Array.from(li.childNodes).forEach(node => {
      if (node.nodeName === 'BR') lines.push(document.createDocumentFragment());
      else lines[lines.length - 1].appendChild(node.cloneNode(true));
    });
    lines.forEach(frag => {
      const newLi = document.createElement('li');
      newLi.appendChild(frag);
      listEl.insertBefore(newLi, li);
    });
    listEl.removeChild(li);
  });
}

// Splits a regular (non-list) top-level block that contains <br> tags
// back into separate sibling blocks — one per line. This happens when
// toggling list formatting OFF: the browser often merges the un-listed
// lines into a single <div> with <br>s instead of separate lines, which
// is what makes the gutter numbers vanish/collapse after removing a list.
function splitBrSeparatedBlock(block) {
  if (block.classList && block.classList.contains('img-wrapper')) return;
  if (!block.querySelector || !block.querySelector('br')) return;

  const tagName = block.tagName ? block.tagName.toLowerCase() : 'div';
  const lines = [document.createDocumentFragment()];
  Array.from(block.childNodes).forEach(node => {
    if (node.nodeName === 'BR') lines.push(document.createDocumentFragment());
    else lines[lines.length - 1].appendChild(node.cloneNode(true));
  });
  lines.forEach(frag => {
    const newBlock = document.createElement(tagName);
    if (block.style && block.style.cssText) newBlock.style.cssText = block.style.cssText;
    newBlock.appendChild(frag);
    editor.insertBefore(newBlock, block);
  });
  editor.removeChild(block);
}

// Runs after ANY list-toggle (on or off) to guarantee every visual line
// is its own top-level block/li, so gutter numbers stay visible and in
// the correct order no matter which direction the toggle went.
function normalizeLists() {
  Array.from(editor.children).forEach(block => {
    if (block.tagName === 'UL' || block.tagName === 'OL') {
      splitListItemsByBr(block);
    } else {
      splitBrSeparatedBlock(block);
    }
  });
  scheduleGutterUpdate();
}

let gutterUpdateTimer = null;
function scheduleGutterUpdate() {
  clearTimeout(gutterUpdateTimer);
  gutterUpdateTimer = setTimeout(updateGutter, 60);
}

// ── ACTIVE LINE TRACKING ──
let activeBlock = null;

function getCaretBlock() {
  const sel = window.getSelection();
  if (!sel || !sel.rangeCount) return null;
  let node = sel.getRangeAt(0).startContainer;
  while (node && node !== editor) {
    if (node.parentNode === editor) return node;
    node = node.parentNode;
  }
  return null;
}

function updateActiveLineHighlight() {
  const block = getCaretBlock();
  if (block === activeBlock) return;
  if (activeBlock) activeBlock.classList.remove('editor-active-line');
  activeBlock = block;
  if (activeBlock && activeBlock !== editor) activeBlock.classList.add('editor-active-line');
  updateGutter();
}

editor.addEventListener('keyup', updateActiveLineHighlight);
editor.addEventListener('mouseup', updateActiveLineHighlight);
editor.addEventListener('focus', updateActiveLineHighlight);

function updateGutter() {
  const gutterRect = gutter.getBoundingClientRect();
  gutter.innerHTML = '';
  gutter.style.minHeight = paper.offsetHeight + 'px';

  const currentBlock = getCaretBlock();
  const blocks = Array.from(editor.children);

  if (blocks.length === 0) {
    // Empty editor — show single line 1 aligned to the editor's top
    const editorRect = editor.getBoundingClientRect();
    const cs = getComputedStyle(editor);
    const fontSize = parseFloat(cs.fontSize) || 16;
    const lineH = parseFloat(cs.lineHeight) || fontSize * 1.8;
    const top = editorRect.top - gutterRect.top;
    const el = document.createElement('div');
    el.className = 'gutter-line active-line';
    el.style.top = top + 'px';
    el.style.height = lineH + 'px';
    el.innerHTML = '<span class="gutter-num">1</span>';
    gutter.appendChild(el);
    return;
  }

  let lineNum = 1;

  // Creates one visible, correctly-styled gutter number for a given
  // block/li element and advances lineNum by however many visual lines
  // that element actually takes up.
  function addGutterLine(target, isActive) {
    const rect = target.getBoundingClientRect();
    const top = rect.top - gutterRect.top;
    const cs = getComputedStyle(target);
    const fontSize = parseFloat(cs.fontSize) || 16;
    let lineH = parseFloat(cs.lineHeight);
    if (isNaN(lineH) || lineH <= 0) lineH = fontSize * 1.2;
    // Use the block's actual rendered height for the number's box, so the
    // number sits at the top of the wrapped block instead of squashing
    // into one line-height's worth of space.
    const h = rect.height || lineH;

    const isCode = isCodeMode || blockHasContent(target);
    const el = document.createElement('div');
    el.className = 'gutter-line' + (isCode ? ' is-code' : '') + (isActive ? ' active-line' : '');
    el.style.top = top + 'px';
    el.style.height = h + 'px';
    el.innerHTML = `<span class="gutter-num">${lineNum}</span>`;
    gutter.appendChild(el);
    // Advance by exactly 1 — every block here is one real source line
    // (we split pasted content per-line earlier), so a line that visually
    // WRAPS across multiple rows should still only consume ONE number,
    // the same way VS Code numbers by source line, not by rendered row.
    // The old code advanced by the wrapped row count instead, which is
    // what made subsequent numbers (9, 10, 13…) appear to vanish — they
    // were being silently skipped, not actually hidden.
    lineNum += 1;
  }

  // Numbers every <li> in a list, in order — and recurses into any
  // nested <ul>/<ol> so sub-lists get numbered too, instead of being
  // skipped or collapsed into their parent line.
  function walkListItems(listEl, activeLi) {
    Array.from(listEl.children).forEach(li => {
      if (li.tagName !== 'LI') return;
      addGutterLine(li, li === activeLi);
      Array.from(li.children).forEach(child => {
        if (child.tagName === 'UL' || child.tagName === 'OL') {
          const nestedActiveLi = getCaretLi(child);
          walkListItems(child, nestedActiveLi);
        }
      });
    });
  }

  blocks.forEach(block => {
    if (block.tagName === 'UL' || block.tagName === 'OL') {
      const activeLi = (block === currentBlock) ? getCaretLi(block) : null;
      walkListItems(block, activeLi);
      return;
    }
    addGutterLine(block, block === currentBlock);
  });
}

// ResizeObserver — detects font size changes, editor reflow, paper resize
const resizeObserver = new ResizeObserver(() => scheduleGutterUpdate());
resizeObserver.observe(editor);
resizeObserver.observe(paper);

// MutationObserver — redraws gutter on DOM changes
const gutterObserver = new MutationObserver(() => scheduleGutterUpdate());
gutterObserver.observe(editor, { childList: true, subtree: true, characterData: true });

window.addEventListener('resize', scheduleGutterUpdate);

// ── FILE SYSTEM ACCESS API ──
async function openFileWithPicker() {
  if (!window.showOpenFilePicker) { $('open-file-input').click(); return; }
  try {
    const [handle] = await window.showOpenFilePicker({
      types: [{ description: 'Text & Code Files', accept: { 'text/*': ['.txt','.html','.md','.js','.py','.css','.json','.ts','.jsx','.tsx'] } }],
      multiple: false
    });
    const file = await handle.getFile();
    const content = await file.text();
    // Save current doc before switching
    const prev = getDoc(currentId);
    if (prev) prev.content = editor.innerHTML;
    const id = genId();
    let html = content;
    if (!file.name.endsWith('.html')) {
      html = content.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\n/g,'<br>');
    }
    docs.push({ id, name: file.name, content: html, created: Date.now() });
    switchDoc(id);
    // Attach handle AFTER switchDoc (which resets fileHandle to null)
    fileHandle = handle;
    showSaveToast(`✓ Opened: ${file.name}`);
  } catch(e) {
    if (e.name !== 'AbortError') { console.error('File open error:', e); $('open-file-input').click(); }
  }
}

async function saveToFileHandle() {
  // CRITICAL: always sync editor's current content to the doc object first
  const doc = getDoc(currentId);
  if (doc) doc.content = editor.innerHTML;
  saveAll();

  // If we have a file handle (from Open or Download As), overwrite silently
  if (fileHandle) {
    try {
      // Request permission if needed (requestPermission may not exist in all browsers)
      if (fileHandle.requestPermission) {
        const perm = await fileHandle.requestPermission({ mode: 'readwrite' });
        if (perm !== 'granted') throw new Error('Permission denied');
      }
      const writable = await fileHandle.createWritable();
      const name = doc ? doc.name : '';
      const content = name.endsWith('.html') ? editor.innerHTML : (editor.innerText || '');
      await writable.write(content);
      await writable.close();
      autosave();
      showSaveToast('✓ Saved to file');
      clearUnsavedFlag();
      return;
    } catch(e) {
      console.warn('File write failed, clearing handle:', e);
      fileHandle = null;
    }
  }
  // No file handle: save to localStorage session
  autosave();
  showSaveToast('✓ Saved to session');
}

function showSaveToast(msg) {
  const toast = $('autosave-toast');
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => {
    toast.classList.remove('show');
    // Restore original autosave text after hide
    setTimeout(() => { toast.textContent = i18n[currentLang].autosaved; }, 300);
  }, 2000);
}

// ── DOWNLOAD / EXPORT (multi-format) ──
// HTML to Markdown (basic conversion)
function htmlToMarkdown(html) {
  const div = document.createElement('div');
  div.innerHTML = html;
  function processNode(node) {
    if (node.nodeType === Node.TEXT_NODE) return node.textContent;
    const tag = node.tagName ? node.tagName.toLowerCase() : '';
    const inner = Array.from(node.childNodes).map(processNode).join('');
    switch(tag) {
      case 'h1': return `# ${inner}\n\n`;
      case 'h2': return `## ${inner}\n\n`;
      case 'h3': return `### ${inner}\n\n`;
      case 'p': return `${inner}\n\n`;
      case 'br': return '\n';
      case 'b': case 'strong': return `**${inner}**`;
      case 'i': case 'em': return `_${inner}_`;
      case 'u': return `<u>${inner}</u>`;
      case 's': return `~~${inner}~~`;
      case 'code': return `\`${inner}\``;
      case 'pre': return `\`\`\`\n${inner}\n\`\`\`\n\n`;
      case 'blockquote': return inner.split('\n').map(l => `> ${l}`).join('\n') + '\n\n';
      case 'a': return `[${inner}](${node.href || '#'})`;
      case 'img': return `![${node.alt || ''}](${node.src || ''})\n`;
      case 'ul': return Array.from(node.children).map(li => `- ${processNode(li).trim()}`).join('\n') + '\n\n';
      case 'ol': return Array.from(node.children).map((li, i) => `${i+1}. ${processNode(li).trim()}`).join('\n') + '\n\n';
      case 'li': return inner;
      case 'hr': return '---\n\n';
      default: return inner;
    }
  }
  return processNode(div).replace(/\n{3,}/g, '\n\n').trim();
}

async function downloadAs(ext) {
  // Sync editor content first
  const doc = getDoc(currentId);
  if (doc) doc.content = editor.innerHTML;

  const baseName = (doc ? doc.name : 'document').replace(/\.[^.]+$/, '');
  const name = baseName + '.' + ext;

  let content;
  if (ext === 'html') content = editor.innerHTML;
  else if (ext === 'md') content = htmlToMarkdown(editor.innerHTML);
  else content = editor.innerText;

  if (window.showSaveFilePicker) {
    const mimeMap = { txt:'text/plain', html:'text/html', md:'text/markdown' };
    const mime = mimeMap[ext] || 'text/plain';
    try {
      const handle = await window.showSaveFilePicker({
        suggestedName: name,
        types: [{ description: ext.toUpperCase() + ' File', accept: { [mime]: ['.' + ext] } }]
      });
      const writable = await handle.createWritable();
      await writable.write(content);
      await writable.close();
      // Store handle so Ctrl+S saves back to this exact file
      fileHandle = handle;
      if (doc) doc.name = handle.name || name;
      autosave();
      renderDocList();
      showSaveToast(`✓ Saved: ${handle.name || name}`);
      clearUnsavedFlag();
      return;
    } catch(e) {
      if (e.name === 'AbortError') return;
      // Fall through to blob download if picker fails
    }
  }

  // Fallback: traditional blob download (no handle, so Ctrl+S won't link to it)
  const blob = new Blob([content], { type: 'text/plain' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  URL.revokeObjectURL(a.href);
  showSaveToast(`✓ Downloaded: ${name}`);
}

// ── FILE MENU ──
const fileMenuBtn = $('file-menu-btn');
const fileMenuDropdown = $('file-menu-dropdown');

fileMenuBtn.addEventListener('click', e => {
  e.stopPropagation();
  const open = fileMenuDropdown.classList.toggle('open');
  fileMenuBtn.classList.toggle('open', open);
});

document.addEventListener('click', e => {
  if (!$('file-menu-wrap').contains(e.target)) {
    fileMenuDropdown.classList.remove('open');
    fileMenuBtn.classList.remove('open');
  }
  // Close any open doc context dropdowns
  document.querySelectorAll('.doc-ctx-dropdown.open').forEach(d => {
    if (!d.parentElement.contains(e.target)) d.classList.remove('open');
  });
});

$('fm-new').addEventListener('click', () => { newDoc(); closeFileMenu(); });
$('fm-open').addEventListener('click', () => { openFileWithPicker(); closeFileMenu(); });
$('fm-save').addEventListener('click', () => { saveToFileHandle(); closeFileMenu(); });

function closeFileMenu() {
  fileMenuDropdown.classList.remove('open');
  fileMenuBtn.classList.remove('open');
}

document.querySelectorAll('[data-dl]').forEach(item => {
  item.addEventListener('click', e => {
    e.stopPropagation();
    downloadAs(item.dataset.dl);
    closeFileMenu();
  });
});

$('custom-ext-btn').addEventListener('click', e => {
  e.stopPropagation();
  let ext = $('custom-ext-input').value.replace(/^\./, '').trim();
  if (!ext) { $('custom-ext-input').focus(); return; }
  downloadAs(ext);
  closeFileMenu();
});

$('custom-ext-input').addEventListener('keydown', e => {
  if (e.key === 'Enter') { e.stopPropagation(); $('custom-ext-btn').click(); }
  e.stopPropagation();
});

// ── DOC LIST (with 3-dot menu) ──
function renderDocList() {
  docList.innerHTML = '';
  docs.forEach(doc => {
    const item = document.createElement('div');
    item.className = 'doc-item' + (doc.id === currentId ? ' active' : '');
    item.innerHTML = `
      <svg viewBox="0 0 24 24" stroke-width="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
      <span class="doc-name">${escapeHtml(doc.name)}</span>
      <button class="doc-menu-btn" title="Options" aria-label="File options">⋮</button>
      <div class="doc-ctx-dropdown">
        <div class="doc-ctx-item doc-rename">
          <svg viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          Rename
        </div>
        <div class="doc-ctx-item doc-delete danger">
          <svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
          Delete
        </div>
      </div>
    `;

    // Click doc name → switch
    item.querySelector('.doc-name').addEventListener('click', () => switchDoc(doc.id));

    // 3-dot menu button
    const menuBtn = item.querySelector('.doc-menu-btn');
    const dropdown = item.querySelector('.doc-ctx-dropdown');
    menuBtn.addEventListener('click', e => {
      e.stopPropagation();
      // Close other dropdowns
      document.querySelectorAll('.doc-ctx-dropdown.open').forEach(d => {
        if (d !== dropdown) d.classList.remove('open');
      });
      dropdown.classList.toggle('open');
    });

    // Rename
    item.querySelector('.doc-rename').addEventListener('click', e => {
      e.stopPropagation();
      dropdown.classList.remove('open');
      openRenameOverlay(doc.id);
    });

    // Delete
    item.querySelector('.doc-delete').addEventListener('click', e => {
      e.stopPropagation();
      dropdown.classList.remove('open');
      deleteDoc(doc.id);
    });

    docList.appendChild(item);
  });
}

function escapeHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ── RENAME OVERLAY ──
function openRenameOverlay(docId) {
  const doc = getDoc(docId);
  if (!doc) return;
  renameTargetId = docId;
  $('rename-input').value = doc.name;
  $('rename-overlay').classList.add('open');
  setTimeout(() => { $('rename-input').focus(); $('rename-input').select(); }, 50);
}

function closeRenameOverlay() {
  $('rename-overlay').classList.remove('open');
  renameTargetId = null;
}

function confirmRename() {
  const newName = $('rename-input').value.trim();
  if (!newName || !renameTargetId) { closeRenameOverlay(); return; }
  const doc = getDoc(renameTargetId);
  if (doc) {
    doc.name = newName;
    // If active doc, update file handle tracking but not toolbar (no toolbar filename)
    saveAll();
    renderDocList();
  }
  closeRenameOverlay();
}

$('rename-cancel').addEventListener('click', closeRenameOverlay);
$('rename-confirm').addEventListener('click', confirmRename);
$('rename-input').addEventListener('keydown', e => {
  if (e.key === 'Enter') confirmRename();
  if (e.key === 'Escape') closeRenameOverlay();
});
$('rename-overlay').addEventListener('click', e => {
  if (e.target === $('rename-overlay')) closeRenameOverlay();
});

// ── DOC OPERATIONS ──
function switchDoc(id) {
  const prev = getDoc(currentId);
  if (prev) prev.content = editor.innerHTML;  // sync before switching
  saveAll();
  currentId = id;
  fileHandle = null; // clear stale handle
  const doc = getDoc(id);
  if (!doc) return;
  editor.innerHTML = doc.content;
  attachImageBehaviors();
  savedDot.classList.remove('unsaved');
  savedLabel.textContent = i18n[currentLang].saved;
  hasUnsavedChanges = false;
  updateStats();
  scheduleGutterUpdate();
  renderDocList();
  // Only focus on non-touch devices to avoid scroll jump on mobile
  if (window.matchMedia('(hover: hover)').matches) editor.focus();
}

function deleteDoc(id) {
  if (docs.length === 1) { alert('Cannot delete the last document.'); return; }
  docs = docs.filter(d => d.id !== id);
  if (currentId === id) switchDoc(docs[0].id);
  else { saveAll(); renderDocList(); }
}

function newDoc() {
  const prev = getDoc(currentId);
  if (prev) prev.content = editor.innerHTML;
  const id = genId();
  docs.push({ id, name: 'untitled.txt', content: '', created: Date.now() });
  fileHandle = null;
  switchDoc(id);
}

$('btn-new-doc').addEventListener('click', newDoc);

// ── FORMAT COMMANDS ──
function cmd(command, val) {
  editor.focus();
  document.execCommand(command, false, val || null);
  markUnsaved();
}

function toggleBtn(id, command) {
  document.addEventListener('selectionchange', () => {
    try { $(id).classList.toggle('active', document.queryCommandState(command)); } catch(e) {}
  });
}

$('btn-bold').addEventListener('click', () => cmd('bold'));
$('btn-italic').addEventListener('click', () => cmd('italic'));
$('btn-underline').addEventListener('click', () => cmd('underline'));
$('btn-strike').addEventListener('click', () => cmd('strikeThrough'));

function safeSurround(tagName, attrs) {
  const sel = window.getSelection();
  if (!sel || sel.isCollapsed) return;
  const range = sel.getRangeAt(0);
  const frag = range.extractContents();
  const el = document.createElement(tagName);
  if (attrs) Object.assign(el, attrs);
  el.appendChild(frag);
  range.insertNode(el);
  sel.removeAllRanges();
  const newRange = document.createRange();
  newRange.selectNodeContents(el);
  sel.addRange(newRange);
  markUnsaved();
}

$('btn-mark').addEventListener('click', () => safeSurround('mark'));
$('btn-ul').addEventListener('click', () => { cmd('insertUnorderedList'); normalizeLists(); });
$('btn-ol').addEventListener('click', () => { cmd('insertOrderedList'); normalizeLists(); });
$('btn-quote').addEventListener('click', () => cmd('formatBlock', 'blockquote'));
$('btn-undo').addEventListener('click', () => cmd('undo'));
$('btn-redo').addEventListener('click', () => cmd('redo'));

toggleBtn('btn-bold', 'bold');
toggleBtn('btn-italic', 'italic');
toggleBtn('btn-underline', 'underline');

$('sel-heading').addEventListener('change', function() {
  const tag = this.value;
  editor.focus();

  if (!tag) {
    // "Paragraph" selected — convert current block back to <p> or <div>
    const sel = window.getSelection();
    if (sel && sel.rangeCount) {
      let node = sel.getRangeAt(0).startContainer;
      // Walk up to find a direct child of editor that is a heading
      while (node && node.parentNode !== editor) node = node.parentNode;
      if (node && /^H[1-6]$/.test(node.nodeName)) {
        const p = document.createElement('p');
        // Move all children from heading into the new <p>
        while (node.firstChild) p.appendChild(node.firstChild);
        // Copy inline styles if any
        if (node.style.cssText) p.style.cssText = node.style.cssText;
        node.parentNode.replaceChild(p, node);
        // Restore cursor into the new <p>
        const range = document.createRange();
        range.selectNodeContents(p);
        range.collapse(false);
        sel.removeAllRanges();
        sel.addRange(range);
        markUnsaved();
        scheduleGutterUpdate();
      } else {
        // Already a paragraph-type element, just try formatBlock as fallback
        document.execCommand('formatBlock', false, 'p');
      }
    }
  } else {
    cmd('formatBlock', tag);
  }

  setTimeout(() => { this.value = ''; }, 50);
});

$('sel-align').addEventListener('change', function() {
  const cmds = { left:'justifyLeft', center:'justifyCenter', right:'justifyRight', justify:'justifyFull' };
  cmd(cmds[this.value]);
});

// ── FONT SIZE: works on multi-paragraph selections ──
$('sel-fontsize').addEventListener('change', function() {
  const sel = window.getSelection();
  if (!sel || sel.isCollapsed) return;

  // Save selection info
  const range = sel.getRangeAt(0).cloneRange();

  // For multi-block selections, apply to each affected block element
  const frag = range.cloneContents();
  const affectedBlocks = new Set();

  // Walk editor children to find all blocks intersecting the selection
  Array.from(editor.children).forEach(block => {
    const blockRange = document.createRange();
    blockRange.selectNodeContents(block);
    if (range.compareBoundaryPoints(Range.END_TO_START, blockRange) < 0 &&
        range.compareBoundaryPoints(Range.START_TO_END, blockRange) > 0) {
      affectedBlocks.add(block);
    }
  });

  if (affectedBlocks.size <= 1) {
    // Single block: wrap extracted contents in a span
    const frag2 = range.extractContents();
    function stripFontSizeSpans(node) {
      if (node.nodeType === Node.ELEMENT_NODE) {
        Array.from(node.childNodes).forEach(stripFontSizeSpans);
        if (node.tagName === 'SPAN' && node.style.fontSize) {
          const parent = node.parentNode;
          while (node.firstChild) parent.insertBefore(node.firstChild, node);
          parent.removeChild(node);
        }
      }
    }
    stripFontSizeSpans(frag2);
    const span = document.createElement('span');
    span.style.fontSize = this.value;
    span.appendChild(frag2);
    range.insertNode(span);
    const newRange = document.createRange();
    newRange.selectNodeContents(span);
    sel.removeAllRanges();
    sel.addRange(newRange);
  } else {
    // Multi-block: set font-size on each whole block
    affectedBlocks.forEach(block => {
      block.style.fontSize = this.value;
    });
  }
  markUnsaved();
  scheduleGutterUpdate();
});

// ── FONT FAMILY: works on multi-paragraph selections ──
$('sel-font').addEventListener('change', function() {
  if (!this.value) return;
  const sel = window.getSelection();
  if (!sel || sel.isCollapsed) return;
  const range = sel.getRangeAt(0).cloneRange();

  const affectedBlocks = new Set();
  Array.from(editor.children).forEach(block => {
    const blockRange = document.createRange();
    blockRange.selectNodeContents(block);
    if (range.compareBoundaryPoints(Range.END_TO_START, blockRange) < 0 &&
        range.compareBoundaryPoints(Range.START_TO_END, blockRange) > 0) {
      affectedBlocks.add(block);
    }
  });

  if (affectedBlocks.size <= 1) {
    const frag = range.extractContents();
    const span = document.createElement('span');
    span.style.fontFamily = `'${this.value}', sans-serif`;
    span.appendChild(frag);
    range.insertNode(span);
    const newRange = document.createRange();
    newRange.selectNodeContents(span);
    sel.removeAllRanges();
    sel.addRange(newRange);
  } else {
    affectedBlocks.forEach(block => {
      block.style.fontFamily = `'${this.value}', sans-serif`;
    });
  }
  this.value = '';
  markUnsaved();
  scheduleGutterUpdate();
});

$('txt-color').addEventListener('input', function() { cmd('foreColor', this.value); });
$('bg-color').addEventListener('input', function() { cmd('hiliteColor', this.value); });

// ── LANGUAGE SELECTOR ──
$('sel-lang').addEventListener('change', function() { applyLanguage(this.value); });

// ── LINK ──
let savedRange = null;
$('btn-link').addEventListener('click', () => {
  const sel = window.getSelection();
  savedRange = sel.rangeCount ? sel.getRangeAt(0).cloneRange() : null;
  const selText = sel.toString();
  $('link-text-input').value = selText;
  $('link-url-input').value = '';
  $('link-modal').classList.add('open');
  setTimeout(() => $('link-url-input').focus(), 50);
});
$('link-cancel').addEventListener('click', () => $('link-modal').classList.remove('open'));
$('link-confirm').addEventListener('click', insertLink);
$('link-url-input').addEventListener('keydown', e => { if (e.key === 'Enter') insertLink(); });
function insertLink() {
  const url = $('link-url-input').value.trim();
  if (!url) return;
  const fullUrl = url.startsWith('http') ? url : 'https://' + url;
  editor.focus();
  if (savedRange) {
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(savedRange);
  }
  cmd('createLink', fullUrl);
  $('link-modal').classList.remove('open');
  markUnsaved();
}

// ── IMAGE INSERTION (Base64 self-contained + 4-corner resize) ──
let imageInsertRange = null;

$('btn-image').addEventListener('click', () => {
  const sel = window.getSelection();
  imageInsertRange = sel.rangeCount ? sel.getRangeAt(0).cloneRange() : null;
  $('image-url-input').value = '';
  $('image-modal').classList.add('open');
  setTimeout(() => $('image-url-input').focus(), 50);
});

$('image-cancel').addEventListener('click', () => $('image-modal').classList.remove('open'));

document.querySelectorAll('.modal-tab').forEach(tab => {
  tab.addEventListener('click', function() {
    document.querySelectorAll('.modal-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.modal-tab-content').forEach(c => c.classList.remove('active'));
    this.classList.add('active');
    $('img-tab-' + this.dataset.tab).classList.add('active');
  });
});

$('image-file-input').addEventListener('change', function() {
  const file = this.files[0];
  if (!file) return;
  // Convert to Base64 for self-contained storage
  const reader = new FileReader();
  reader.onload = e => {
    $('image-modal').classList.remove('open');
    doInsertImage(e.target.result); // e.target.result is Base64 data URL
  };
  reader.readAsDataURL(file);
  this.value = '';
});

$('image-confirm').addEventListener('click', () => {
  const url = $('image-url-input').value.trim();
  if (!url) return;
  $('image-modal').classList.remove('open');
  // If it's a URL (not base64), fetch and convert to base64 for self-containment
  if (url.startsWith('data:')) {
    doInsertImage(url);
  } else {
    // Embed as URL reference (user can still use URLs if preferred)
    doInsertImage(url);
  }
});

$('image-url-input').addEventListener('keydown', e => {
  if (e.key === 'Enter') $('image-confirm').click();
});

function makeResizeHandle(img, corner) {
  const handle = document.createElement('div');
  handle.className = `img-resize-handle ${corner}`;
  handle.draggable = false; // never let a resize handle start a drag-move
  handle.title = 'Drag to resize';

  handle.addEventListener('mousedown', e => {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const startY = e.clientY;
    const startW = img.offsetWidth;
    const startH = img.offsetHeight;
    const aspect = startH / startW;

    const onMove = e => {
      let dx = e.clientX - startX;
      let dy = e.clientY - startY;
      // Adjust direction per corner
      if (corner === 'sw' || corner === 'nw') dx = -dx;
      if (corner === 'ne' || corner === 'nw') dy = -dy;
      const delta = (Math.abs(dx) > Math.abs(dy)) ? dx : dy;
      const newW = Math.max(60, Math.min(startW + delta, paper.offsetWidth - 160));
      img.style.width = newW + 'px';
    };
    const onUp = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      markUnsaved();
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  });
  return handle;
}

// ── IMAGE DRAG-TO-REPOSITION ──
let draggedImgWrapper = null;
let dropIndicator = null;

function ensureDropIndicator() {
  if (!dropIndicator) {
    dropIndicator = document.createElement('div');
    dropIndicator.id = 'img-drop-indicator';
  }
  return dropIndicator;
}

function makeImageDraggable(wrapper) {
  wrapper.draggable = true;
  wrapper.addEventListener('dragstart', e => {
    draggedImgWrapper = wrapper;
    wrapper.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', '');
  });
  wrapper.addEventListener('dragend', () => {
    wrapper.classList.remove('dragging');
    draggedImgWrapper = null;
    if (dropIndicator && dropIndicator.parentNode) dropIndicator.parentNode.removeChild(dropIndicator);
  });
}

editor.addEventListener('dragover', e => {
  if (!draggedImgWrapper) return;
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
  const blocks = Array.from(editor.children).filter(b => b !== draggedImgWrapper && b.id !== 'img-drop-indicator');
  let target = null, placeBefore = true;
  for (const block of blocks) {
    const r = block.getBoundingClientRect();
    if (e.clientY < r.top + r.height / 2) { target = block; placeBefore = true; break; }
    target = block; placeBefore = false;
  }
  const indicator = ensureDropIndicator();
  if (target) editor.insertBefore(indicator, placeBefore ? target : target.nextSibling);
  else editor.appendChild(indicator);
});

editor.addEventListener('drop', e => {
  if (!draggedImgWrapper) return;
  e.preventDefault();
  if (dropIndicator && dropIndicator.parentNode) {
    dropIndicator.parentNode.insertBefore(draggedImgWrapper, dropIndicator);
    dropIndicator.parentNode.removeChild(dropIndicator);
  }
  markUnsaved();
  scheduleGutterUpdate();
});

// Re-attach behaviors to images loaded from a saved document (event
// listeners don't survive being saved/reloaded as innerHTML).
function attachImageBehaviors() {
  editor.querySelectorAll('.img-wrapper').forEach(wrapper => {
    if (wrapper.dataset.behaviorsAttached) return;
    wrapper.dataset.behaviorsAttached = '1';
    const img = wrapper.querySelector('img');
    if (!img) return;
    wrapper.querySelectorAll('.img-resize-handle').forEach(h => h.remove());
    ['nw','ne','sw','se'].forEach(corner => wrapper.appendChild(makeResizeHandle(img, corner)));
    makeImageDraggable(wrapper);
  });
}

function doInsertImage(src) {
  const wrapper = document.createElement('div');
  wrapper.className = 'img-wrapper';
  wrapper.contentEditable = 'false';
  wrapper.dataset.behaviorsAttached = '1';

  const img = document.createElement('img');
  img.src = src;
  img.style.width = '300px';
  img.alt = '';
  img.draggable = false;

  wrapper.appendChild(img);
  // Add 4-corner resize handles
  ['nw','ne','sw','se'].forEach(corner => {
    wrapper.appendChild(makeResizeHandle(img, corner));
  });
  // Let the image be dragged to reposition it among the lines
  makeImageDraggable(wrapper);

  editor.focus();
  if (imageInsertRange) {
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(imageInsertRange);
  }

  // Force the image onto its own clean top-level line — split the current
  // block at the cursor (like pressing Enter) so the image can never end up
  // merged inline inside an existing text line, which is what was making
  // its gutter number disappear and throwing off the numbers after it.
  document.execCommand('insertParagraph');
  const sel = window.getSelection();
  const range = sel.getRangeAt(0);
  range.deleteContents();
  range.insertNode(wrapper);
  range.setStartAfter(wrapper);
  range.collapse(true);
  sel.removeAllRanges();
  sel.addRange(range);
  document.execCommand('insertParagraph'); // fresh line for the cursor after the image

  // Images load asynchronously — recheck the gutter once real height is known
  img.addEventListener('load', scheduleGutterUpdate);

  markUnsaved();
  scheduleGutterUpdate();
}

// ── CODE MODE ──
function setCodeMode(active) {
  if (isCodeMode === active) return;
  isCodeMode = active;
  document.body.classList.toggle('code-mode', isCodeMode);
  $('btn-codemode').classList.toggle('active', isCodeMode);
  $('code-mode-badge').classList.toggle('visible', isCodeMode);
  scheduleGutterUpdate();
}

$('btn-codemode').addEventListener('click', () => setCodeMode(!isCodeMode));

// ── AUTOMATIC CODE MODE DETECTION ──
let codeModeAutoTimer = null;
function scheduleAutoCodeModeCheck() {
  clearTimeout(codeModeAutoTimer);
  codeModeAutoTimer = setTimeout(runAutoCodeModeCheck, 250);
}

function runAutoCodeModeCheck() {
  // Sample the last few lines around where you're typing to decide if
  // you're currently writing code or normal prose, and flip Code Mode
  // to match automatically.
  const blocks = Array.from(editor.children).filter(
    b => !(b.classList && b.classList.contains('img-wrapper'))
  );
  if (blocks.length === 0) return;
  const sampleBlocks = blocks.slice(-5); // last 5 lines
  const text = sampleBlocks.map(b => b.innerText || '').join('\n');
  setCodeMode(textLooksLikeCode(text));
}

// ── OPEN FILE (legacy input fallback) ──
$('open-file-input').addEventListener('change', function() {
  const file = this.files[0]; if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    const prev = getDoc(currentId);
    if (prev) prev.content = editor.innerHTML; // sync before switch
    const id = genId();
    let content = e.target.result;
    if (!file.name.endsWith('.html')) {
      content = content
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/\n/g, '<br>');
    }
    docs.push({ id, name: file.name, content, created: Date.now() });
    fileHandle = null; // no handle for legacy input
    switchDoc(id);
    showSaveToast(`✓ Opened: ${file.name}`);
  };
  reader.readAsText(file);
  this.value = '';
});

// ── DARK MODE ──
$('btn-darkmode').addEventListener('click', () => {
  isDark = !isDark;
  document.documentElement.setAttribute('data-theme', isDark ? 'dark' : '');
  $('btn-darkmode').classList.toggle('active', isDark);
});

// ── FOCUS MODE ──
$('btn-focus').addEventListener('click', () => {
  isFocus = !isFocus;
  $('btn-focus').classList.toggle('active', isFocus);
  $('sidebar').style.display = isFocus ? 'none' : '';
  $('statusbar').style.display = isFocus ? 'none' : '';
  const header = $('sticky-header');
  header.style.opacity = isFocus ? '0' : '';
  header.style.pointerEvents = isFocus ? 'none' : '';
  $('editor-area').style.padding = isFocus ? '0' : '';
  if (isFocus) editor.focus();
  if (isFocus) document.addEventListener('mousemove', focusMouseMove);
  else document.removeEventListener('mousemove', focusMouseMove);
});

function focusMouseMove(e) {
  if (!isFocus) { document.removeEventListener('mousemove', focusMouseMove); return; }
  const header = $('sticky-header');
  const show = e.clientY < 60;
  header.style.opacity = show ? '1' : '0';
  header.style.pointerEvents = show ? '' : 'none';
}

// ── SIDEBAR ──
$('btn-sidebar').addEventListener('click', () => { $('sidebar').classList.toggle('collapsed'); });

// ── CONTEXT MENU ──
editor.addEventListener('contextmenu', e => {
  e.preventDefault();
  const menu = $('ctx-menu');
  menu.style.left = Math.min(e.clientX, window.innerWidth - 200) + 'px';
  menu.style.top = Math.min(e.clientY, window.innerHeight - 220) + 'px';
  menu.classList.add('open');
});
document.addEventListener('click', () => { $('ctx-menu').classList.remove('open'); });
$('ctx-menu').addEventListener('click', e => {
  const item = e.target.closest('.ctx-item');
  if (!item) return;
  const c = item.dataset.cmd;
  if (c === 'paste-plain') {
    navigator.clipboard.readText().then(t => document.execCommand('insertText', false, t)).catch(() => {});
  } else { cmd(c); }
});

// ── PASTE CLEANUP ──
editor.addEventListener('paste', e => {
  e.preventDefault();
  let text = e.clipboardData.getData('text/plain');
  if (!text) {
    const html = e.clipboardData.getData('text/html');
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    text = tmp.innerText || tmp.textContent || '';
  }
  if (!text) return;

  // Decide immediately, from the pasted content itself, whether to
  // switch into (or out of) Code Mode — no need to wait for the debounced
  // typing check below when we already have the full pasted text.
  setCodeMode(textLooksLikeCode(text));

  // Make sure we're inserting into a real block element first — if the
  // editor is empty, the first pasted line can otherwise land as a bare
  // text node, which the gutter (it only counts editor.children) ignores.
  if (editor.children.length === 0) {
    document.execCommand('formatBlock', false, 'div');
  }

  // Split into individual lines and insert each one followed by a real
  // paragraph break (like pressing Enter after each line). This gives
  // every pasted line its own block element, so updateGutter()'s
  // one-block-per-line-number counting lines up correctly — 1st line = 1,
  // 2nd line = 2, etc. — matching how VS Code numbers pasted code.
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  lines.forEach((line, i) => {
    document.execCommand('insertText', false, line);
    if (i < lines.length - 1) {
      document.execCommand('insertParagraph');
    }
  });
});

// ── TAB KEY ──
editor.addEventListener('keydown', e => {
  if (e.key === 'Tab') {
    e.preventDefault();
    if (isCodeMode) document.execCommand('insertText', false, '    ');
    else document.execCommand('insertHTML', false, '&nbsp;&nbsp;&nbsp;&nbsp;');
  }
});

// ── EDITOR EVENTS ──
editor.addEventListener('input', () => { updateStats(); markUnsaved(); scheduleGutterUpdate(); scheduleAutoCodeModeCheck(); hasUnsavedChanges = true; });

// ── KEYBOARD SHORTCUTS ──
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    $('find-bar').classList.remove('open');
    $('link-modal').classList.remove('open');
    $('image-modal').classList.remove('open');
    $('ctx-menu').classList.remove('open');
    closeRenameOverlay();
    clearHighlights();
  }
  const ctrl = e.ctrlKey || e.metaKey;
  if (!ctrl) return;
  if (e.key === 's') { e.preventDefault(); saveToFileHandle(); }
  if (e.key === 'n') { e.preventDefault(); newDoc(); }
  if (e.key === 'f') { e.preventDefault(); openFind(); }
  if (e.key === 'k') { e.preventDefault(); $('btn-link').click(); }
  if (e.key === 'o') { e.preventDefault(); openFileWithPicker(); }
});

// ── FIND & REPLACE ──
let findMatches = [];
let findIndex = 0;

function openFind() {
  $('find-bar').classList.add('open');
  setTimeout(() => $('find-input').focus(), 50);
  $('find-input').select();
}
$('btn-find').addEventListener('click', openFind);
$('find-close').addEventListener('click', () => { $('find-bar').classList.remove('open'); clearHighlights(); });
$('find-input').addEventListener('input', doFind);
$('find-next').addEventListener('click', () => navigateFind(1));
$('find-prev').addEventListener('click', () => navigateFind(-1));
$('find-input').addEventListener('keydown', e => {
  if (e.key === 'Enter') { e.preventDefault(); navigateFind(e.shiftKey ? -1 : 1); }
});

function clearHighlights() {
  const marks = editor.querySelectorAll('mark.find-highlight');
  marks.forEach(m => {
    const parent = m.parentNode;
    if (!parent) return;
    while (m.firstChild) parent.insertBefore(m.firstChild, m);
    parent.removeChild(m);
  });
  editor.normalize();
  findMatches = [];
  findIndex = 0;
  $('find-count').textContent = '0/0';
}

function doFind() {
  clearHighlights();
  const query = $('find-input').value;
  if (!query) return;
  const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(escapedQuery, 'gi');
  const walker = document.createTreeWalker(editor, NodeFilter.SHOW_TEXT, null);
  const textNodes = [];
  let node;
  while ((node = walker.nextNode())) {
    if (node.parentElement.closest('mark.find-highlight')) continue;
    textNodes.push(node);
  }
  const newMatches = [];
  textNodes.forEach(textNode => {
    const text = textNode.nodeValue;
    let match;
    const ranges = [];
    regex.lastIndex = 0;
    while ((match = regex.exec(text)) !== null) {
      ranges.push({ start: match.index, end: match.index + match[0].length });
    }
    if (!ranges.length) return;
    ranges.reverse().forEach(r => {
      const range = document.createRange();
      range.setStart(textNode, r.start);
      range.setEnd(textNode, r.end);
      const mark = document.createElement('mark');
      mark.className = 'find-highlight';
      range.surroundContents(mark);
      newMatches.unshift(mark);
    });
  });
  findMatches = newMatches;
  findIndex = 0;
  if (findMatches.length) highlightCurrent();
  else $('find-count').textContent = '0/0';
}

function highlightCurrent() {
  findMatches.forEach((m, i) => m.classList.toggle('current', i === findIndex));
  if (findMatches[findIndex]) findMatches[findIndex].scrollIntoView({ behavior: 'smooth', block: 'center' });
  $('find-count').textContent = findMatches.length ? `${findIndex + 1}/${findMatches.length}` : '0/0';
}

function navigateFind(dir) {
  if (!findMatches.length) { doFind(); return; }
  findIndex = (findIndex + dir + findMatches.length) % findMatches.length;
  highlightCurrent();
}

$('find-replace').addEventListener('click', () => {
  const current = findMatches[findIndex];
  if (!current) return;
  const textNode = document.createTextNode($('replace-input').value);
  current.parentNode.replaceChild(textNode, current);
  findMatches.splice(findIndex, 1);
  if (findMatches.length === 0) $('find-count').textContent = '0/0';
  else { findIndex = Math.min(findIndex, findMatches.length - 1); highlightCurrent(); }
  editor.normalize();
  markUnsaved();
});

$('find-replace-all').addEventListener('click', () => {
  const repText = $('replace-input').value;
  findMatches.forEach(m => {
    const textNode = document.createTextNode(repText);
    if (m.parentNode) m.parentNode.replaceChild(textNode, m);
  });
  findMatches = [];
  $('find-count').textContent = '0/0';
  editor.normalize();
  markUnsaved();
});

window.addEventListener('beforeunload', e => {
  if (!hasUnsavedChanges) return;
  const msg = 'Prose — You have unsaved changes. Your edits will be lost if you close this tab.';
  e.preventDefault();
  e.returnValue = msg;
  return msg;
});

// ── TOOLBAR OVERFLOW (responsive) ──
(function() {
  const toolbar = document.getElementById('toolbar');
  const overflowBtn = document.getElementById('tb-overflow-btn');
  const drawer = document.getElementById('tb-overflow-drawer');

  // Groups that can move to overflow drawer (right-side items)
  const overflowCandidates = [
    document.getElementById('btn-darkmode'),
    document.getElementById('btn-focus'),
    document.getElementById('btn-find'),
  ];

  function checkOverflow() {
    // Reset: move all candidates back to toolbar
    overflowCandidates.forEach(el => {
      if (el && el.parentNode === drawer) {
        toolbar.insertBefore(el, overflowBtn);
      }
    });
    overflowBtn.style.display = 'none';
    drawer.classList.remove('open');

    // Use scrollWidth vs clientWidth — the real, exact overflow measurement
    // (immune to zoom-level rounding errors, unlike manually summing offsetWidths)
    const isOverflowing = () => toolbar.scrollWidth > toolbar.clientWidth + 1;

    if (isOverflowing()) {
      overflowBtn.style.display = 'flex';
      // Move candidates into the drawer one at a time, rechecking after each
      // move so we always reserve room for the ⋯ button itself
      for (const el of overflowCandidates) {
        if (!el) continue;
        if (!isOverflowing()) break;
        drawer.appendChild(el);
      }
    }
  }

  overflowBtn.addEventListener('click', e => {
    e.stopPropagation();
    drawer.classList.toggle('open');
  });

  document.addEventListener('click', e => {
    if (!toolbar.contains(e.target)) drawer.classList.remove('open');
  });

  window.addEventListener('resize', checkOverflow);
  // Zoom changes don't always fire a clean 'resize' event in every browser,
  // so also watch the toolbar's own box directly.
  const toolbarResizeObserver = new ResizeObserver(() => checkOverflow());
  toolbarResizeObserver.observe(toolbar);
  // Run after fonts load
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(checkOverflow);
  } else {
    setTimeout(checkOverflow, 500);
  }
  checkOverflow();
})();

// ── INIT ──
renderDocList();
switchDoc(currentId);
applyLanguage('en');
