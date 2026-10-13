import { MAX_IMPORT_BYTES, parseMarkdownImport, validateImport, availableSlug, saveImport } from './markdown-import.mjs';

const input = document.getElementById('markdown-file');
const form = document.getElementById('import-form');
const status = document.getElementById('status');
const error = document.getElementById('error');
const warnings = document.getElementById('warnings');
const submit = form.querySelector('button[type="submit"]');
const showError = message => { error.textContent = message; error.hidden = false; };
let imported = false;
let parseDocument;
let selection = 0;

try {
  ({ parseDocument } = await import('./vendor/yaml/index.js'));
  input.disabled = false;
  status.textContent = '普通 Markdown 或带 YAML 信息的笔记都可以导入。';
} catch {
  status.textContent = '';
  showError('导入工具加载失败，请刷新页面重试。');
}

input.addEventListener('change', async () => {
  const version = ++selection;
  const file = input.files[0];
  if (!file) return;
  imported = false;
  form.hidden = true;
  error.hidden = true;
  status.textContent = '正在读取文件……';
  try {
    if (file.size > MAX_IMPORT_BYTES) throw new Error('文件超过 1 MB，请拆分为几篇笔记后再导入。');
    let source;
    try { source = new TextDecoder('utf-8', { fatal: true }).decode(await file.arrayBuffer()); }
    catch { throw new Error('文件编码无法识别，请另存为 UTF-8 编码后重试。'); }
    if (version !== selection) return;
    const parsed = parseMarkdownImport(source, file.name, yaml => {
      const doc = parseDocument(yaml, { uniqueKeys: true });
      if (doc.errors.length) throw doc.errors[0];
      return doc.toJS({ maxAliasCount: 20 });
    });
    for (const name of ['title', 'slug', 'description', 'date', 'cover', 'body']) form.elements[name].value = parsed.data[name];
    form.elements.tags.value = parsed.data.tags.join(', ');
    form.elements.example.checked = parsed.data.example;
    warnings.replaceChildren(...parsed.warnings.map(message => {
      const item = document.createElement('li'); item.textContent = message; return item;
    }));
    warnings.hidden = parsed.warnings.length === 0;
    document.getElementById('filename').textContent = file.name;
    form.hidden = false;
    imported = true;
    status.textContent = '文件已读取。检查下方信息后，进入编辑器继续。';
    form.elements.title.focus();
  } catch (err) { status.textContent = ''; showError(err.message); }
  finally { input.value = ''; }
});

form.addEventListener('submit', async event => {
  event.preventDefault();
  if (!imported) return;
  error.hidden = true;
  submit.disabled = true;
  input.disabled = true;
  try {
    const data = validateImport({
      ...Object.fromEntries(new FormData(form)),
      tags: form.elements.tags.value.split(/[,，]/).map(tag => tag.trim()).filter(Boolean),
      example: form.elements.example.checked,
    });
    const response = await fetch('note-slugs.json', { cache: 'no-store' });
    if (!response.ok) throw new Error('暂时无法检查笔记名称，请稍后重试。');
    const existing = await response.json();
    if (!Array.isArray(existing) || existing.some(slug => typeof slug !== 'string')) throw new Error('笔记列表无法读取，请刷新后重试。');
    const unique = availableSlug(data.slug, existing);
    if (unique !== data.slug) {
      form.elements.slug.value = unique;
      showError(`“${data.slug}”已存在，已为你改为“${unique}”。确认名称后再次点击“进入编辑器”。`);
      form.elements.slug.focus();
      return;
    }
    let id;
    try { id = saveImport(sessionStorage, data); }
    catch { throw new Error('浏览器无法暂存导入内容，请允许网站存储或减小文件后重试。'); }
    location.assign(`./?import=${encodeURIComponent(id)}#/collections/notes/new`);
  } catch (err) { showError(err.message); error.scrollIntoView({ block: 'center', behavior: 'smooth' }); }
  finally { submit.disabled = false; input.disabled = false; }
});
