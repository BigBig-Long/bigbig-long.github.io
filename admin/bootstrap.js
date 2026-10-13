/* This file contains only public settings. OAuth secrets belong in the Worker. */
import { readImport, IMPORT_PREFIX, validateImport } from './markdown-import.mjs';

(async () => {
  const status = document.getElementById('status');
  const setup = document.getElementById('setup');
  try {
    const response = await fetch('settings.json', { cache: 'no-store' });
    if (!response.ok) throw new Error('无法读取编辑器配置，请刷新重试。');
    const { authBaseUrl } = await response.json();
    if (!authBaseUrl) {
      status.textContent = '笔记编辑器已准备好，等待站主完成首次登录设置。';
      setup.hidden = false;
      return;
    }
    const origin = new URL(authBaseUrl);
    if (origin.protocol !== 'https:' || origin.origin !== authBaseUrl) {
      throw new Error('登录服务地址应为完整的 HTTPS 域名，末尾不加斜杠。');
    }
    const importId = new URLSearchParams(location.search).get('import');
    let imported;
    let config = { backend: { base_url: authBaseUrl } };
    if (importId) {
      imported = readImport(sessionStorage, importId);
      if (location.hash.split('?')[0] !== '#/collections/notes/new') throw new Error('请从导入页面重新进入笔记编辑器。');
      const configResponse = await fetch('cms-config.json', { cache: 'no-store' });
      if (!configResponse.ok) throw new Error('无法读取导入配置，请刷新重试。');
      config = await configResponse.json();
      config.load_config_file = false;
      config.backend.base_url = authBaseUrl;
      const collection = config.collections.find(item => item.name === 'notes');
      collection.fields = collection.fields.map(field => ({
        ...field,
        ...(Object.hasOwn(imported, field.name) ? { default: imported[field.name] } : {}),
        // Start imported Markdown in source mode to preserve its original syntax.
        ...(field.name === 'body' ? { modes: ['raw'] } : {}),
      }));
    }
    window.CMS_MANUAL_INIT = true;
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/decap-cms@3.16.3/dist/decap-cms.js';
    script.crossOrigin = 'anonymous';
    script.integrity = 'sha384-A/Gdn928CNLufmnGWGs9RM4Q9o8bSNLeJERqBFrBjwzL7FRpoLT3MPF8Tl0+Wd2p';
    await new Promise((resolve, reject) => {
      script.onload = resolve;
      script.onerror = () => reject(new Error('编辑器加载失败，请检查网络后刷新。'));
      document.head.append(script);
    });
    if (imported) {
      const clearDraft = () => sessionStorage.removeItem(IMPORT_PREFIX + importId);
      window.CMS.registerEventListener({ name: 'preSave', handler: async ({ entry }) => {
        if (entry.get('collection') !== 'notes') return;
        const data = validateImport(entry.get('data').toJS());
        if (entry.get('newRecord') && config.backend.name === 'github') {
          // Check the current repository, including notes awaiting deployment.
          // This public read uses no token and cannot write to the repository.
          const check = await fetch(`https://api.github.com/repos/BigBig-Long/bigbig-long.github.io/contents/content/notes/${encodeURIComponent(data.slug)}.md?ref=main`, { cache: 'no-store', signal: AbortSignal.timeout(15000) });
          if (check.ok) throw new Error('这个网址名称已被其他笔记使用，请修改“网址名称”后再发布。');
          if (check.status !== 404) throw new Error('暂时无法检查笔记名称，请稍后再发布。');
        }
      } });
      window.CMS.registerEventListener({ name: 'postSave', handler: clearDraft });
      window.addEventListener('hashchange', () => {
        if (location.hash.split('?')[0] === '#/collections/notes/new') return;
        clearDraft();
        const url = new URL(location.href);
        url.searchParams.delete('import');
        // Reload only after navigation has passed the CMS unsaved-changes guard.
        // Other new entries must use normal defaults, never the imported draft.
        location.replace(url.href);
      });
    }
    window.CMS.init({ config });
    window.CMS.registerPreviewStyle('/styles.css');
    window.CMS.registerPreviewStyle('/notes.css');
    window.CMS.registerPreviewTemplate('notes', ({ entry, widgetFor, getAsset }) => {
      const h = window.h;
      const cover = entry.getIn(['data', 'cover']);
      return h('article', { className: 'note-prose markdown-body', style: { margin: '24px' } },
        h('h1', {}, entry.getIn(['data', 'title']) || '新笔记'),
        h('p', {}, entry.getIn(['data', 'description'])),
        cover ? h('img', { src: String(getAsset(cover)), alt: '' }) : null,
        widgetFor('body'));
    });
    document.getElementById('loading').hidden = true;
  } catch (error) {
    status.textContent = error.message;
    setup.hidden = false;
    if (new URLSearchParams(location.search).has('import')) {
      setup.replaceChildren();
      const link = document.createElement('a');
      link.href = 'import.html';
      link.textContent = '← 返回 Markdown 导入页面';
      setup.append(link);
    }
  }
})();
