export const MAX_IMPORT_BYTES = 1024 * 1024;
export const IMPORT_PREFIX = 'sjing:markdown-import:';
export const validSlug = value => typeof value === 'string' && /^(?!index$)[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value);
export const validDate = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
export const localDate = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};

function proseLines(body) {
  let fence = null;
  return body.split('\n').filter(line => {
    const marker = line.match(/^\s{0,3}(`{3,}|~{3,})/);
    if (marker) {
      if (!fence) fence = marker[1];
      else if (marker[1][0] === fence[0] && marker[1].length >= fence.length) fence = null;
      return false;
    }
    return !fence;
  });
}

function plainText(text) {
  return text.replace(/!\[[^\]]*\]\([^)]*\)/g, '').replace(/\[([^\]]+)\]\([^)]*\)/g, '$1').replace(/<[^>]*>/g, '').replace(/[*_`~]/g, '').replace(/\s+/g, ' ').trim();
}

export function parseMarkdownImport(source, filename, parseYaml, { today = localDate(), suffix = crypto.randomUUID().slice(0, 8) } = {}) {
  if (!/\.(md|markdown)$/i.test(filename)) throw new Error('请选择 .md 或 .markdown 文件。');
  if (new TextEncoder().encode(source).length > MAX_IMPORT_BYTES) throw new Error('文件超过 1 MB，请拆分为几篇笔记后再导入。');
  if (source.includes('\0')) throw new Error('文件不是有效的 Markdown 文本，请另存为 UTF-8 编码。');
  let body = source.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
  let meta = {};
  const warnings = [];
  if (body.startsWith('---\n')) {
    const match = body.match(/^---\n([\s\S]*?)\n(?:---|\.\.\.)[ \t]*(?:\n|$)([\s\S]*)$/);
    if (!match) throw new Error('文件开头的 YAML 信息缺少结束标记，请用单独一行 --- 结束。');
    try { meta = parseYaml(match[1]) ?? {}; }
    catch { throw new Error('文件开头的 YAML 信息格式有误，请检查缩进、冒号或重复字段。'); }
    if (typeof meta !== 'object' || Array.isArray(meta)) throw new Error('YAML 信息应为 title、date 等字段组成的对象。');
    body = match[2];
  }
  if (!body.trim()) throw new Error('文件没有笔记正文，请补充内容后再导入。');
  for (const key of ['title', 'description', 'slug', 'cover']) {
    if (meta[key] != null && typeof meta[key] !== 'string') throw new Error(`${key} 应为文字，请检查文件开头的信息。`);
  }
  const lines = proseLines(body);
  const heading = lines.find(line => /^#\s+\S/.test(line));
  const stem = filename.replace(/^.*[\\/]/, '').replace(/\.(md|markdown)$/i, '');
  const title = meta.title?.trim() || plainText(heading?.replace(/^#\s+/, '').replace(/\s+#+\s*$/, '') || stem) || '学习笔记';
  const paragraph = lines.find(line => line.trim() && !/^\s*(?:#|>|[-*+]\s|\d+\.\s|\||!\[|\[[^\]]+\]:|---|<)/.test(line));
  const description = meta.description?.trim() || plainText(paragraph || '').slice(0, 160) || `关于「${title}」的学习记录与体会。`;
  const candidate = (meta.slug?.trim() || stem).normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 100).replace(/-$/, '');
  const slug = validSlug(candidate) ? candidate : `note-${today}-${suffix}`;
  if (meta.slug && meta.slug !== slug) warnings.push('网址名称已调整为可用的英文、数字和短横线格式，可以在下方修改。');
  let date = typeof meta.date === 'string' ? meta.date.slice(0, 10) : '';
  if (!validDate(date)) {
    if (meta.date != null) warnings.push('原日期格式无效，已暂用今天的日期，请检查。');
    date = today;
  }
  let tags = meta.tags ?? [];
  if (typeof tags === 'string') tags = tags.split(/[,，]/).map(tag => tag.trim()).filter(Boolean);
  if (!Array.isArray(tags) || tags.some(tag => typeof tag !== 'string')) throw new Error('tags 应为文字列表，例如 [Diffusion, 深度学习]。');
  tags = [...new Set(tags.map(tag => tag.trim()).filter(Boolean))];
  let cover = meta.cover?.trim() || '';
  if (cover && !validCover(cover)) {
    warnings.push('原封面是本地路径或不支持的地址，请进入编辑器后重新上传封面。');
    cover = '';
  }
  if (/!\[[^\]]*\]\(\s*(?!https:\/\/|\/assets\/)[^\s)]/i.test(body) || /!\[[^\]]*\]\s*\[/.test(body)) warnings.push('正文包含本地图片或引用式图片链接，请在编辑器中检查，并上传本地图片；单个 Markdown 文件不包含图片文件。');
  if (Object.keys(meta).some(key => !['title', 'slug', 'description', 'date', 'tags', 'cover', 'example'].includes(key))) warnings.push('只导入本站支持的标题、网址名称、简介、日期、标签、封面和示例标记；其他自定义字段未导入。');
  return { data: { title, slug, description, date, tags, cover, example: meta.example === true, body }, warnings };
}

export const validCover = value => !value || typeof value === 'string' && (/^\/assets\/[^\\<>]+$/.test(value) || /^https:\/\/[^\s<>]+$/.test(value));

export function validateImport(data) {
  if (!data || typeof data !== 'object') throw new Error('导入内容无效，请重新选择文件。');
  for (const field of ['title', 'description', 'body']) if (typeof data[field] !== 'string' || !data[field].trim()) throw new Error('请填写标题、简介和正文。');
  if (!validSlug(data.slug)) throw new Error('网址名称只能使用小写英文字母、数字和短横线，且不能是 index。');
  if (!validDate(data.date)) throw new Error('请选择有效日期。');
  if (!Array.isArray(data.tags) || data.tags.some(tag => typeof tag !== 'string')) throw new Error('标签应为文字列表。');
  if (!validCover(data.cover)) throw new Error('封面请填写 /assets/ 开头的站内路径或 HTTPS 图片网址。');
  if (new TextEncoder().encode(data.body).length > MAX_IMPORT_BYTES) throw new Error('正文超过 1 MB，请拆分后再导入。');
  // Only these fields may become CMS defaults. Never merge uploaded objects into config.
  return { title: data.title.trim(), slug: data.slug, description: data.description.trim(), date: data.date, tags: data.tags, cover: data.cover || '', example: data.example === true, body: data.body };
}

export function availableSlug(slug, existing) {
  const used = new Set(existing);
  let candidate = slug;
  for (let n = 2; used.has(candidate); n++) candidate = `${slug}-${n}`;
  return candidate;
}

export function saveImport(storage, data, id = crypto.randomUUID(), now = Date.now()) {
  const draft = { data: validateImport(data), created: now };
  storage.setItem(IMPORT_PREFIX + id, JSON.stringify(draft));
  return id;
}

export function readImport(storage, id, now = Date.now()) {
  if (!/^[a-z0-9-]{1,80}$/i.test(id || '')) throw new Error('导入草稿地址无效，请重新选择 Markdown 文件。');
  const raw = storage.getItem(IMPORT_PREFIX + id);
  if (!raw) throw new Error('导入草稿已失效，请返回导入页面重新选择文件。');
  const draft = JSON.parse(raw);
  if (!Number.isFinite(draft.created) || now - draft.created > 24 * 60 * 60 * 1000) throw new Error('导入草稿已过期，请重新选择文件。');
  return validateImport(draft.data);
}
