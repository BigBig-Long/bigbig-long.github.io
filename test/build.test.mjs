import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, cp, readFile, writeFile, rm, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseNote, renderMarkdown, renderNote, build } from '../scripts/build.mjs';

const note = `---\ntitle: 测试笔记\nslug: test-note\ndescription: 学習记录\ndate: 2026-10-13\ntags: [test]\n---\n## 第一个概念\n\n正文\n`;
test('reject malformed metadata and unsafe filenames', () => {
  for (const [from, to] of [['test-note', '../escape'], ['test-note', 'index'], ['2026-10-13', '2026-02-30'], ['tags: [test]', 'tags: text'], ['title: 测试笔记', 'title: null']]) assert.throws(() => parseNote(note.replace(from, to), 'test-note.md'));
  assert.throws(() => parseNote(note, 'renamed.md'));
});
test('content cannot inject scripts through markdown, title, or links; heading ids stay unique', () => {
  const result = renderMarkdown('## 测试\n\n<script>alert(1)</script>\n\n[x](javascript:alert(1))\n\n## 测试');
  assert.ok(!result.html.includes('<script>'));
  assert.ok(!result.html.includes('href="javascript:'));
  assert.deepEqual(result.toc.map(item => item.id), ['section-1', 'section-2']);
  const parsed = parseNote(note, 'test-note.md');
  parsed.title = '<img src=x onerror=alert(1)>';
  assert.ok(renderNote(parsed).includes('&lt;img'));
});
test('publishing, updating and deleting a note regenerate index and pages; source files stay private to build', async () => {
  const fixture = await mkdtemp(join(tmpdir(), 'sjing-build-'));
  try {
    const source = fileURLToPath(new URL('..', import.meta.url));
    for (const path of ['templates', 'content', 'admin', 'assets', 'research', 'index.html', 'styles.css', 'notes.css', 'script.js']) await cp(join(source, path), join(fixture, path), { recursive: true });
    await writeFile(join(fixture, 'content/notes/test-note.md'), note);
    assert.equal(await build(fixture), 2);
    assert.match(await readFile(join(fixture, '_site/index.html'), 'utf8'), /data-note-count>02<\/strong>/);
    assert.match(await readFile(join(fixture, '_site/notes/index.html'), 'utf8'), /test-note.html/);
    assert.match(await readFile(join(fixture, '_site/notes/test-note.html'), 'utf8'), /第一个概念/);
    await writeFile(join(fixture, 'content/notes/test-note.md'), note.replace('正文', '修改后的内容'));
    await build(fixture);
    assert.match(await readFile(join(fixture, '_site/notes/test-note.html'), 'utf8'), /修改后的内容/);
    await rm(join(fixture, 'content/notes/test-note.md'));
    assert.equal(await build(fixture), 1);
    assert.deepEqual((await readdir(join(fixture, '_site/notes'))).sort(), ['diffusion.html', 'index.html']);
    assert.ok(!(await readdir(join(fixture, '_site'))).some(name => ['auth', 'test', 'node_modules', 'content'].includes(name)));
    await rm(join(fixture, 'content/notes/diffusion.md'));
    // Git removes an empty content directory when the final note is deleted.
    await rm(join(fixture, 'content/notes'), { recursive: true });
    assert.equal(await build(fixture), 0);
    assert.deepEqual(await readdir(join(fixture, '_site/notes')), ['index.html']);
    assert.match(await readFile(join(fixture, '_site/notes/index.html'), 'utf8'), /还没有笔记/);
  } finally {
    // mkdtemp provides an isolated directory under the OS temp directory.
    await rm(fixture, { recursive: true, force: true });
  }
});
