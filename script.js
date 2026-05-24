
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
function saveAll() { try { localStorage.setItem('prose-docs', JSON.stringify(docs)); } catch(e) {} }

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
  if (/^\s{2,}/.test(text)) return true;
  if (/[{}\[\]();]/.test(t)) return true;
  if (/^(const|let|var|function|class|import|export|return|if|for|while|def|fn|pub|use)\b/.test(t)) return true;
  if (/^\s*(\/\/|\/\*|#|<!--)/.test(text)) return true;
  if (/=>|===|!==|&&|\|\|/.test(t)) return true;
  return false;
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
  const editorAreaRect = document.getElementById('editor-area').getBoundingClientRect();
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
    // top relative to gutter top (both inside the same scroll container)
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
  blocks.forEach(block => {
    const blockRect = block.getBoundingClientRect();
    const top = blockRect.top - gutterRect.top;

    // Get accurate line height from the block itself
    const cs = getComputedStyle(block);
    const fontSize = parseFloat(cs.fontSize) || 16;
    let lineH = parseFloat(cs.lineHeight);
    // If lineHeight is 'normal' (NaN), approximate from font-size
    if (isNaN(lineH) || lineH <= 0) lineH = fontSize * 1.2;

    // Count visual lines by actual block height, with a minimum of 1
    // Use Math.round with a tolerance to avoid off-by-one at large font sizes
    const blockH = block.getBoundingClientRect().height;
    const blockLines = Math.max(1, Math.round(blockH / lineH));

    const isCode = isCodeMode || looksLikeCode(block.innerText || '');
    const isActive = block === currentBlock;
    const el = document.createElement('div');
    el.className = 'gutter-line' + (isCode ? ' is-code' : '') + (isActive ? ' active-line' : '');
    el.style.top = top + 'px';
    el.style.height = lineH + 'px';
    el.innerHTML = `<span class="gutter-num">${lineNum}</span>`;
    gutter.appendChild(el);

    lineNum += blockLines;
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
$('btn-ul').addEventListener('click', () => cmd('insertUnorderedList'));
$('btn-ol').addEventListener('click', () => cmd('insertOrderedList'));
$('btn-quote').addEventListener('click', () => cmd('formatBlock', 'blockquote'));
$('btn-hr').addEventListener('click', () => cmd('insertHorizontalRule'));
$('btn-code').addEventListener('click', () => { if (!window.getSelection().isCollapsed) safeSurround('code'); });
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

function doInsertImage(src) {
  const wrapper = document.createElement('div');
  wrapper.className = 'img-wrapper';
  wrapper.contentEditable = 'false';

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

  editor.focus();
  if (imageInsertRange) {
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(imageInsertRange);
    const range = sel.getRangeAt(0);
    range.deleteContents();
    range.insertNode(wrapper);
    range.setStartAfter(wrapper);
    range.collapse(true);
    sel.removeAllRanges();
    sel.addRange(range);
  } else {
    editor.appendChild(wrapper);
  }

  markUnsaved();
  scheduleGutterUpdate();
}

// ── CODE MODE ──
$('btn-codemode').addEventListener('click', () => {
  isCodeMode = !isCodeMode;
  document.body.classList.toggle('code-mode', isCodeMode);
  $('btn-codemode').classList.toggle('active', isCodeMode);
  $('code-mode-badge').classList.toggle('visible', isCodeMode);
});

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
  document.execCommand('insertText', false, text);
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
editor.addEventListener('input', () => { updateStats(); markUnsaved(); scheduleGutterUpdate(); });
editor.addEventListener('paste', () => setTimeout(() => { updateStats(); scheduleGutterUpdate(); }, 100));

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

// ── UNSAVED CHANGES WARNING (beforeunload) ──
editor.addEventListener('input', () => { hasUnsavedChanges = true; });

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

    // Check if toolbar is overflowing
    const tbWidth = toolbar.clientWidth;
    let childrenWidth = 0;
    Array.from(toolbar.children).forEach(c => {
      if (c !== overflowBtn && c !== drawer) childrenWidth += c.offsetWidth + 2;
    });

    if (childrenWidth > tbWidth - 10) {
      // Move right-side candidates to drawer
      overflowCandidates.forEach(el => {
        if (el) drawer.appendChild(el);
      });
      overflowBtn.style.display = 'flex';
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
