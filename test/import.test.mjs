import test from 'node:test';
import assert from 'node:assert/strict';
import { parseDocument, stringify } from 'yaml';
import { parseNote, renderMarkdown } from '../scripts/build.mjs';
import { parseMarkdownImport, validateImport, availableSlug, saveImport, readImport, IMPORT_PREFIX, MAX_IMPORT_BYTES } from '../admin/markdown-import.mjs';

const parseYaml = source => {
  const doc = parseDocument(source, { uniqueKeys: true });
  if (doc.errors.length) throw doc.errors[0];
  return doc.toJS({ maxAliasCount: 20 });
};
const options = { today: '2026-10-13', suffix: 'abc12345' };
const convert = (source, name = 'first-note.md') => parseMarkdownImport(source, name, parseYaml, options);

test('plain Markdown gets useful metadata and preserves code, tables, links and line breaks', () => {
  const source = '# 学习记录\n\n今天理解了 **注意力**。\n\n## 代码\n\n```python\nprint("你好")\n```\n\n| A | B |\n| - | - |\n| 1 | 2 |\n\n[参考](https://example.com)\n';
  const { data } = convert(source);
  assert.equal(data.title, '学习记录');
  assert.equal(data.description, '今天理解了 注意力。');
  assert.equal(data.slug, 'first-note');
  assert.equal(data.date, options.today);
  assert.equal(data.body, source);
  const { body, ...meta } = data;
  const published = parseNote(`---\n${stringify(meta)}---\n${body}`, `${data.slug}.md`);
  assert.equal(published.body, source);
  const rendered = renderMarkdown(published.body);
  assert.match(rendered.html, /<table>/);
  assert.match(rendered.html, /language-python/);
  assert.equal(rendered.toc[0].title, '代码');
});

test('frontmatter imports supported fields, preserves body and ignores arbitrary configuration', () => {
  const { data, warnings } = convert('\uFEFF---\r\ntitle: 显式标题\r\nslug: transformer-notes\r\ndescription: 自定义简介\r\ndate: 2026-08-12T10:30:00Z\r\ntags: [Attention, 深度学习]\r\ncover: /assets/uploads/cover.png\r\nexample: true\r\nbackend: {name: other}\r\n---\r\n# 正文标题\r\n\r\n内容\r\n');
  assert.equal(data.title, '显式标题');
  assert.equal(data.slug, 'transformer-notes');
  assert.equal(data.date, '2026-08-12');
  assert.deepEqual(data.tags, ['Attention', '深度学习']);
  assert.equal(data.example, true);
  assert.equal(data.cover, '/assets/uploads/cover.png');
  assert.equal(data.body, '# 正文标题\n\n内容\n');
  assert.ok(!Object.hasOwn(data, 'backend'));
  assert.ok(warnings.some(message => message.includes('自定义字段')));
});

test('Chinese filenames, code-only content, invalid dates and image paths have usable fallbacks', () => {
  const { data, warnings } = convert('---\ndate: 2026-02-30\ncover: ./cover.png\ntags: 数学, 线代\n---\n```md\n# 不应当作标题\n```\n\n![实验](./images/test.png)\n', '学习心得.md');
  assert.equal(data.title, '学习心得');
  assert.equal(data.slug, 'note-2026-10-13-abc12345');
  assert.equal(data.date, '2026-10-13');
  assert.deepEqual(data.tags, ['数学', '线代']);
  assert.equal(data.cover, '');
  assert.equal(warnings.length, 3);
  assert.match(data.description, /学习心得/);
  assert.equal(convert('正文', 'index.md').data.slug, 'note-2026-10-13-abc12345');
});

test('rejects invalid files and malformed YAML before creating a draft', () => {
  for (const [source, filename] of [
    ['', 'empty.md'], ['text', 'word.docx'], ['\0abc', 'binary.md'],
    ['---\ntitle: one\n', 'broken.md'],
    ['---\ntitle: one\ntitle: two\n---\nbody', 'duplicate.md'],
    ['---\n- array\n---\nbody', 'array.md'],
    ['---\ntitle: [array]\n---\nbody', 'title.md'],
    ['---\ntags: [one, 2]\n---\nbody', 'tags.md'],
    ['---\ntitle: only metadata\n---', 'nobody.md'],
    ['a'.repeat(MAX_IMPORT_BYTES + 1), 'large.md'],
  ]) assert.throws(() => convert(source, filename), filename);
});

test('untrusted Markdown remains text and final rendering never executes HTML', () => {
  const { data } = convert('# <img src=x onerror=alert(1)>\n\n<script>alert(1)</script>\n\n[x](javascript:alert(1))');
  assert.equal(data.body.includes('<script>'), true);
  assert.ok(!renderMarkdown(data.body).html.includes('<script>'));
  assert.ok(!renderMarkdown(data.body).html.includes('href="javascript:'));
  for (const patch of [{ slug: '../escape' }, { date: '2026-02-30' }, { body: '' }, { cover: 'javascript:alert(1)' }, { tags: 'text' }]) assert.throws(() => validateImport({ ...data, ...patch }));
});

test('same-name imports suggest a free name without replacing existing notes', () => {
  assert.equal(availableSlug('diffusion', ['diffusion', 'diffusion-2']), 'diffusion-3');
  assert.equal(availableSlug('transformer', ['diffusion']), 'transformer');
});

test('drafts stay isolated by id, expire and cannot inject CMS configuration', () => {
  const storage = new Map();
  storage.setItem = storage.set.bind(storage);
  storage.getItem = storage.get.bind(storage);
  const first = convert('第一篇正文').data;
  const second = convert('第二篇正文', 'second.md').data;
  saveImport(storage, { ...first, backend: { name: 'other' } }, 'first-id', 1000);
  saveImport(storage, second, 'second-id', 1000);
  assert.deepEqual(readImport(storage, 'first-id', 2000), first);
  assert.deepEqual(readImport(storage, 'second-id', 2000), second);
  assert.throws(() => readImport(storage, 'first-id', 86402000), /过期/);
  assert.throws(() => readImport(storage, '../other'), /无效/);
  storage.delete(IMPORT_PREFIX + 'first-id');
  assert.throws(() => readImport(storage, 'first-id', 2000), /失效/);
});
