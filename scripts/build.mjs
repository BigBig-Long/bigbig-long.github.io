import { readFile, writeFile, mkdir, readdir, cp, rm } from 'node:fs/promises';
import { resolve, basename, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import MarkdownIt from 'markdown-it';
import { parse } from 'yaml';

export const escape = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const md = new MarkdownIt({ html: false, linkify: true, typographer: false });

export function parseNote(source, filename) {
  const match = source.replace(/\r\n/g, '\n').match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) throw new Error(`${filename}: missing Markdown frontmatter`);
  const data = parse(match[1]);
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error(`${filename}: invalid frontmatter`);
  for (const key of ['title', 'description', 'date', 'slug']) {
    if (typeof data[key] !== 'string' || !data[key].trim()) throw new Error(`${filename}: missing ${key}`);
  }
  if (!/^(?!index$)[a-z0-9]+(?:-[a-z0-9]+)*$/.test(data.slug)) throw new Error(`${filename}: invalid slug`);
  if (basename(filename, '.md') !== data.slug) throw new Error(`${filename}: keep the published URL name unchanged`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data.date) || !Number.isFinite(Date.parse(data.date)) || new Date(data.date).toISOString().slice(0, 10) !== data.date) throw new Error(`${filename}: invalid date`);
  data.tags ??= [];
  if (!Array.isArray(data.tags) || data.tags.some(tag => typeof tag !== 'string')) throw new Error(`${filename}: tags must be strings`);
  if (data.example !== undefined && typeof data.example !== 'boolean') throw new Error(`${filename}: example must be boolean`);
  if (data.cover && (typeof data.cover !== 'string' || !(/^\/assets\/[^\\<>]+$/.test(data.cover) || /^https:\/\/[^\s<>]+$/.test(data.cover)))) throw new Error(`${filename}: invalid cover URL`);
  if (!match[2].trim()) throw new Error(`${filename}: body is empty`);
  return { ...data, body: match[2] };
}

export function renderMarkdown(body) {
  const tokens = md.parse(body, {});
  const toc = [];
  let number = 0;
  for (let index = 0; index < tokens.length; index++) {
    if (tokens[index].type === 'heading_open') {
      const id = `section-${++number}`;
      tokens[index].attrSet('id', id);
      if (tokens[index].tag === 'h2') toc.push({ id, title: tokens[index + 1].content });
    }
  }
  return { html: md.renderer.render(tokens, md.options, {}), toc };
}

const tags = note => note.tags.map(tag => `<span>${escape(tag)}</span>`).join('');
function cover(note, index) {
  if (note.cover) return `<div class="note-image-cover"><img src="${escape(note.cover)}" alt="" loading="lazy"></div>`;
  if (note.slug === 'diffusion') return `<div class="diffusion-cover" aria-hidden="true"><div class="cover-label"><span>GENERATIVE MODELS</span><span>${index}</span></div><div class="diffusion-steps"><span class="noise-orb orb-noise"></span><i>→</i><span class="noise-orb orb-mid"></span><i>→</i><span class="noise-orb orb-clear"></span></div><div class="cover-caption"><strong>Diffusion</strong><span>FROM NOISE TO STRUCTURE</span></div></div>`;
  return `<div class="journal-cover" aria-hidden="true"><span>FIELD NOTES / ${index}</span><b>✦</b><strong>${escape(note.tags[0] || 'Learning journal')}</strong><small>STAY CURIOUS. KEEP EXPLORING.</small></div>`;
}

export function renderListing(notes, intro) {
  const cards = notes.map((note, index) => `<article class="note-card"><a class="note-card-link" href="${note.slug}.html" aria-labelledby="note-${note.slug}">${cover(note, String(index + 1).padStart(2, '0'))}<div class="note-card-body"><div class="note-meta"><time datetime="${note.date}">${note.date}</time>${note.example ? '<span class="draft-label">示例笔记</span>' : ''}</div><h3 id="note-${note.slug}">${escape(note.title)}</h3><p>${escape(note.description)}</p><div class="note-tags">${tags(note)}</div><div class="note-card-bottom"><span>LEARNING JOURNAL</span><strong><span data-zh="阅读笔记" data-en="Read note">阅读笔记</span> ↗</strong></div></div></a></article>`).join('\n');
  return `<main class="notes-main" id="main-content" tabindex="-1"><nav class="breadcrumbs" aria-label="面包屑"><a href="/" data-zh="首页" data-en="Home">首页</a><span>/</span><span aria-current="page" data-zh="学习笔记" data-en="Learning notes">学习笔记</span></nav>${intro}<div class="journal-actions"><a class="write-note" href="/admin/#/collections/notes/new"><span aria-hidden="true">＋</span> <span data-zh="新建笔记" data-en="New note">新建笔记</span></a><span data-zh="站主登录后可编辑与发布" data-en="Sign in as the owner to write and publish">站主登录后可编辑与发布</span><a href="/admin/" data-zh="管理笔记 ↗" data-en="Manage notes ↗">管理笔记 ↗</a></div><section class="notes-library" aria-labelledby="library-title"><div class="library-heading"><div><h2 id="library-title" data-zh="所有笔记" data-en="All notes">所有笔记</h2><span class="note-count">${String(notes.length).padStart(2, '0')}</span></div><p data-zh="一点点理解，一页页积累。" data-en="One idea, one page at a time.">一点点理解，一页页积累。</p></div>${cards || '<p>还没有笔记，下一次学习就是新的开始。</p>'}<p class="library-footnote">✦ 让每一次学习，都留下可以回看的痕迹。</p></section></main>`;
}

export function renderNote(note) {
  const { html, toc } = renderMarkdown(note.body);
  return `<main class="notes-main" id="main-content" tabindex="-1"><nav class="breadcrumbs" aria-label="面包屑"><a href="/" data-zh="首页" data-en="Home">首页</a><span>/</span><a href="./" data-zh="学习笔记" data-en="Learning notes">学习笔记</a><span>/</span><span aria-current="page">${escape(note.title)}</span></nav><header class="note-header"><p class="notes-kicker">THE LEARNING JOURNAL</p><h1>${escape(note.title)}</h1><p class="notes-lead">${escape(note.description)}</p><div class="note-meta"><time datetime="${note.date}">${note.date}</time>${note.example ? '<span class="draft-label">示例笔记 · 待完善</span>' : ''}<a href="/admin/#/collections/notes/entries/${note.slug}" data-zh="编辑笔记 ↗" data-en="Edit note ↗">编辑笔记 ↗</a></div><div class="note-tags">${tags(note)}</div></header><div class="reading-layout"><aside class="note-toc"><p class="notes-kicker">ON THIS PAGE</p><h2 data-zh="本页目录" data-en="Contents">本页目录</h2><nav aria-label="笔记目录">${toc.map((heading, index) => `<a href="#${heading.id}">${String(index + 1).padStart(2, '0')} ${escape(heading.title)}</a>`).join('')}</nav><a class="toc-back" href="./" data-zh="← 全部学习笔记" data-en="← All learning notes">← 全部学习笔记</a></aside><article class="note-prose markdown-body">${note.cover ? `<img class="article-cover" src="${escape(note.cover)}" alt="">` : ''}${html}<div class="note-end"><span aria-hidden="true">✦</span><p>理解是一个持续更新的过程。</p><a href="./" data-zh="← 返回学习笔记" data-en="← Back to learning notes">← 返回学习笔记</a></div></article></div></main>`;
}

export async function build(siteRoot = root) {
  const output = join(siteRoot, '_site');
  // Output is always the literal _site directory under the selected source root.
  // Read/validate all content first: a malformed note must never replace a good deployment.
  const filenames = (await readdir(join(siteRoot, 'content/notes'))).filter(name => name.endsWith('.md'));
  const notes = await Promise.all(filenames.map(async name => parseNote(await readFile(join(siteRoot, 'content/notes', name), 'utf8'), name)));
  notes.sort((a, b) => b.date.localeCompare(a.date) || a.slug.localeCompare(b.slug));
  const shell = await readFile(join(siteRoot, 'templates/page.html'), 'utf8');
  const intro = await readFile(join(siteRoot, 'templates/intro.html'), 'utf8');
  const page = (title, description, main) => shell.replace(/\{\{(title|description|main)\}\}/g, (_, key) => ({ title: escape(title), description: escape(description), main })[key]);
  await rm(output, { recursive: true, force: true });
  await mkdir(join(output, 'notes'), { recursive: true });
  // Explicit public asset list: build scripts, OAuth source, content sources and dependencies stay out.
  for (const path of ['index.html', 'styles.css', 'notes.css', 'script.js', 'assets', 'research', 'admin']) await cp(join(siteRoot, path), join(output, path), { recursive: true });
  const homepage = await readFile(join(output, 'index.html'), 'utf8');
  await writeFile(join(output, 'index.html'), homepage.replace(/(<strong data-note-count>)[^<]*(<\/strong>)/, `$1${String(notes.length).padStart(2, '0')}$2`));
  await writeFile(join(output, '.nojekyll'), '');
  await writeFile(join(output, 'notes/index.html'), page('学习笔记', 'SJing 的学习笔记：记录概念理解、学习经历与实践体会。', renderListing(notes, intro)));
  for (const note of notes) await writeFile(join(output, 'notes', `${note.slug}.html`), page(note.title, note.description, renderNote(note)));
  return notes.length;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  console.log(`Built ${await build()} notes into _site/`);
}
